# python/app/routers/evaluate.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import uuid
from datetime import datetime, timezone

router = APIRouter()

class EvaluationSession(BaseModel):
    id: str
    bot_id: str
    tenant_id: str
    user_id: str
    created_at: str
    messages: List[dict] = []

class EvaluationMessage(BaseModel):
    message: str
    bot_id: str

# In-memory storage for evaluation sessions
evaluation_sessions = {}

@router.post("/evaluate/start")
async def start_evaluation(bot_id: str, tenant_id: str, user_id: str):
    """Start a new evaluation session for a bot"""
    session_id = str(uuid.uuid4())
    
    evaluation_sessions[session_id] = EvaluationSession(
        id=session_id,
        bot_id=bot_id,
        tenant_id=tenant_id,
        user_id=user_id,
        created_at=datetime.now(timezone.utc).isoformat(),
        messages=[]
    )
    
    return {
        "session_id": session_id,
        "message": "Evaluation session started"
    }

@router.post("/evaluate/chat")
async def evaluate_chat(session_id: str, message: EvaluationMessage):
    """Send a message in evaluation session"""
    if session_id not in evaluation_sessions:
        raise HTTPException(status_code=404, detail="Evaluation session not found")
    
    session = evaluation_sessions[session_id]
    
    # Use existing chat functionality
    from app.routers.chat import process_chat_query, get_bot_config
    
    bot = await get_bot_config(message.bot_id, session.tenant_id)
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    # Process through RAG system
    rag_result = await process_chat_query(
        bot_id=message.bot_id,
        question=message.message,
        user_id=session.user_id,
        tenant_id=session.tenant_id,
        system_message=bot.get("system_message", "You are a helpful AI assistant.")
    )
    
    # Store messages in session
    user_msg = {
        "id": str(uuid.uuid4()),
        "type": "user",
        "content": message.message,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    bot_msg = {
        "id": str(uuid.uuid4()),
        "type": "bot",
        "content": rag_result.get("answer", "I'm sorry, I couldn't process your question."),
        "sources": rag_result.get("sources", []),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    session.messages.extend([user_msg, bot_msg])
    
    return {
        "response": bot_msg["content"],
        "sources": bot_msg["sources"],
        "session_id": session_id
    }

@router.get("/evaluate/session/{session_id}")
async def get_evaluation_session(session_id: str):
    """Get evaluation session with full history"""
    if session_id not in evaluation_sessions:
        raise HTTPException(status_code=404, detail="Evaluation session not found")
    
    return evaluation_sessions[session_id]

@router.delete("/evaluate/session/{session_id}")
async def end_evaluation(session_id: str):
    """End an evaluation session"""
    if session_id in evaluation_sessions:
        del evaluation_sessions[session_id]
    
    return {"message": "Evaluation session ended"}