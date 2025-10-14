# python/app/routers/chat.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import uuid
from datetime import datetime, timezone

router = APIRouter()

# Request/Response models
class ChatRequest(BaseModel):
    message: str
    bot_id: str
    tenant_id: str
    user_id: str

class ChatResponse(BaseModel):
    response: str
    sources: List[str]
    message_id: str
    timestamp: str

class ChatHistoryRequest(BaseModel):
    bot_id: str
    tenant_id: str
    user_id: str
    limit: int = 50

class ChatMessage(BaseModel):
    id: str
    type: str  # 'user' or 'bot'
    content: str
    timestamp: str
    sources: Optional[List[str]] = None

class ChatHistoryResponse(BaseModel):
    messages: List[ChatMessage]

# In-memory storage for demo
chat_sessions = {}

def get_current_utc_time():
    """Get current timezone-aware UTC datetime"""
    return datetime.now(timezone.utc)

def format_iso_with_timezone(dt: datetime) -> str:
    """Format datetime as ISO string with timezone info"""
    return dt.isoformat()

async def process_chat_query(bot_id: str, question: str, user_id: str, tenant_id: str, system_message: str):
    """
    Process chat using your actual answer_query function
    """
    try:
        # Import your actual RAG function
        from app.rag.core import answer_query
        
        # Call your existing answer_query function
        result = await answer_query(
            bot_id=bot_id,
            question=question,
            user_id=user_id,
            tenant_id=tenant_id,  # Your core.py now supports tenant_id
            system_message=system_message,
            fallback_to_llm=True,
            include_sources=True
        )
        
        return {
            "answer": result.get("answer", "I couldn't process your question."),
            "sources": result.get("sources", []),
            "fallback_used": result.get("fallback_used", False),
            "document_count": result.get("document_count", 0)
        }
        
    except Exception as e:
        print(f"Error calling answer_query: {e}")
        # Fallback response
        return {
            "answer": f"I received your question: '{question}'. The AI assistant is processing your request.",
            "sources": ["system_processing"],
            "fallback_used": True
        }

@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    Process chat message using your actual RAG system
    """
    try:
        # Get bot configuration
        bot = await get_bot_config(request.bot_id, request.tenant_id)
        if not bot:
            raise HTTPException(status_code=404, detail="Bot not found")
        
        # Process through your actual RAG system
        rag_result = await process_chat_query(
            bot_id=request.bot_id,
            question=request.message,
            user_id=request.user_id,
            tenant_id=request.tenant_id,
            system_message=bot.get("system_message", "You are a helpful AI assistant.")
        )
        
        # Store message in history
        session_key = f"{request.tenant_id}_{request.bot_id}_{request.user_id}"
        if session_key not in chat_sessions:
            chat_sessions[session_key] = []
        
        current_time = get_current_utc_time()
        
        user_message = ChatMessage(
            id=str(uuid.uuid4()),
            type="user",
            content=request.message,
            timestamp=format_iso_with_timezone(current_time)
        )
        
        # Extract sources from RAG response
        sources = rag_result.get("sources", [])
        if not sources and rag_result.get("fallback_used"):
            sources = ["general_knowledge"]
        
        bot_message = ChatMessage(
            id=str(uuid.uuid4()),
            type="bot",
            content=rag_result.get("answer", "I'm sorry, I couldn't process your question."),
            sources=sources,
            timestamp=format_iso_with_timezone(current_time)
        )
        
        chat_sessions[session_key].extend([user_message, bot_message])
        
        # Keep only last 100 messages per session
        if len(chat_sessions[session_key]) > 100:
            chat_sessions[session_key] = chat_sessions[session_key][-100:]
        
        return ChatResponse(
            response=bot_message.content,
            sources=bot_message.sources or [],
            message_id=bot_message.id,
            timestamp=bot_message.timestamp
        )
        
    except Exception as e:
        print(f"Chat processing error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Chat processing failed: {str(e)}")

@router.get("/chat/history", response_model=ChatHistoryResponse)
async def get_chat_history(bot_id: str, tenant_id: str, user_id: str, limit: int = 50):
    """
    Retrieve chat history for a user/bot combination
    """
    try:
        session_key = f"{tenant_id}_{bot_id}_{user_id}"
        messages = chat_sessions.get(session_key, [])
        
        # Return most recent messages
        recent_messages = messages[-limit:] if messages else []
        
        return ChatHistoryResponse(messages=recent_messages)
        
    except Exception as e:
        print(f"Chat history error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve history: {str(e)}")

async def get_bot_config(bot_id: str, tenant_id: str):
    """
    Retrieve bot configuration
    """
    try:
        # Try to import your actual bot management
        from app.models.bot import get_bot_by_id
        bot = await get_bot_by_id(bot_id, tenant_id)
        return bot
    except ImportError:
        # Mock bot config for testing
        print(f"Using mock bot config for {bot_id}")
        
        system_messages = {
            "support-bot": "You are a helpful customer support assistant. Answer questions based on the provided documentation.",
            "sales-bot": "You are a friendly sales assistant. Help users with product information and purchasing decisions.",
            "hr-bot": "You are an HR assistant. Help with company policies, benefits, and employee questions."
        }
        
        return {
            "id": bot_id,
            "tenant_id": tenant_id,
            "name": f"Bot {bot_id}",
            "system_message": system_messages.get(bot_id, "You are a helpful AI assistant."),
        }

# Health check endpoint
@router.get("/health")
async def chat_health():
    return {
        "status": "healthy",
        "service": "chat",
        "active_sessions": len(chat_sessions),
        "timestamp": format_iso_with_timezone(get_current_utc_time())
    }

@router.delete("/chat/history")
async def clear_chat_history(bot_id: str, tenant_id: str, user_id: str):
    try:
        session_key = f"{tenant_id}_{bot_id}_{user_id}"
        if session_key in chat_sessions:
            del chat_sessions[session_key]
        return {"status": "success", "message": "Chat history cleared"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear history: {str(e)}")