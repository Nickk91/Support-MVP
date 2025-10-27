# python/app/routers/evaluate.py - FIX the chat request model
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import uuid
from datetime import datetime, timezone

router = APIRouter()

# Request models
class StartEvaluationRequest(BaseModel):
    bot_id: str
    tenant_id: str
    user_id: str

# FIX: Update the chat request model to match Express structure
class ChatMessageRequest(BaseModel):
    message: str
    bot_id: str

class EvaluateChatRequest(BaseModel):
    session_id: str
    message: ChatMessageRequest  # This should be an object, not a string

class EvaluationSession(BaseModel):
    id: str
    bot_id: str
    tenant_id: str
    user_id: str
    created_at: str
    messages: List[dict] = []

# In-memory storage for evaluation sessions
evaluation_sessions = {}

@router.post("/evaluate/start")
async def start_evaluation(request: StartEvaluationRequest):
    """Start a new evaluation session for a bot"""
    session_id = str(uuid.uuid4())
    
    evaluation_sessions[session_id] = EvaluationSession(
        id=session_id,
        bot_id=request.bot_id,
        tenant_id=request.tenant_id,
        user_id=request.user_id,
        created_at=datetime.now(timezone.utc).isoformat(),
        messages=[]
    )
    
    return {
        "session_id": session_id,
        "message": "Evaluation session started"
    }

@router.post("/evaluate/chat")
async def evaluate_chat(request: EvaluateChatRequest):
    """Send a message in evaluation session"""
    if request.session_id not in evaluation_sessions:
        raise HTTPException(status_code=404, detail="Evaluation session not found")
    
    session = evaluation_sessions[request.session_id]
    
    try:
        # Use your actual RAG system
        from app.rag.core import answer_query
        
        # Get bot configuration
        bot_config = await get_bot_config(request.message.bot_id, session.tenant_id)
        
        # Process through actual RAG system
        rag_result = await answer_query(
            bot_id=request.message.bot_id,
            question=request.message.message,  # Access message from the nested object
            user_id=session.user_id,
            tenant_id=session.tenant_id,
            system_message=bot_config.get("system_message", "You are a helpful AI assistant."),
            fallback_to_llm=True,
            include_sources=True
        )
        
        # Store messages in session
        user_msg = {
            "id": str(uuid.uuid4()),
            "type": "user",
            "content": request.message.message,  # Access message from nested object
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
            "session_id": request.session_id
        }
        
    except Exception as e:
        print(f"Error in evaluate_chat: {e}")
        # Return a fallback response instead of raising an exception
        return {
            "response": "I'm experiencing technical difficulties. Please try again later.",
            "sources": [],
            "session_id": request.session_id
        }

async def get_bot_config(bot_id: str, tenant_id: str):
    """Get bot configuration"""
    try:
        # If you have a bot management system, use it here
        from app.models.bot import get_bot_by_id
        return await get_bot_by_id(bot_id, tenant_id)
    except ImportError:
        # Fallback for testing
        return {
            "id": bot_id,
            "tenant_id": tenant_id,
            "system_message": "You are a helpful AI assistant. Answer questions based on the provided documentation.",
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