# python/app/routers/chat.py - UPDATED with template system
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import logging

from app.models.bot import get_bot_config_with_jwt, BotConfig

router = APIRouter()
logger = logging.getLogger(__name__)

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
    template_info: Optional[Dict[str, Any]] = None  # 🎯 NEW: Template info

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
    template_info: Optional[Dict[str, Any]] = None  # 🎯 NEW: Template info

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

async def process_chat_query_with_template(bot_config: BotConfig, question: str, user_id: str, tenant_id: str) -> Dict[str, Any]:
    """
    Process chat using template system with enhanced bot configuration
    """
    try:
        # Import your actual RAG function
        from app.rag.core import answer_query
        
        # 🎯 USE BOT CONFIG FROM TEMPLATE SYSTEM
        system_message = bot_config.system_message
        model = bot_config.model
        temperature = bot_config.temperature
        
        logger.info(f"🎯 Processing chat with template system:")
        logger.info(f"   Bot: {bot_config.bot_name}")
        logger.info(f"   Personality: {bot_config.personality_type}")
        logger.info(f"   Safety: {bot_config.safety_level}")
        logger.info(f"   Company: {bot_config.company_reference}")
        
        # Call your existing answer_query function with template-enhanced config
        result = await answer_query(
            bot_id=bot_config.id,
            question=question,
            user_id=user_id,
            tenant_id=tenant_id,
            system_message=system_message,
            model=model,  # 🎯 Pass model from template
            temperature=temperature,  # 🎯 Pass temperature from template
            fallback_to_llm=True,
            include_sources=True
        )
        
        return {
            "answer": result.get("answer", "I couldn't process your question."),
            "sources": result.get("sources", []),
            "fallback_used": result.get("fallback_used", False),
            "document_count": result.get("document_count", 0),
            "template_info": {  # 🎯 ADD TEMPLATE INFO
                "personality_type": bot_config.personality_type,
                "safety_level": bot_config.safety_level,
                "company_reference": bot_config.company_reference,
                "model": bot_config.model,
                "temperature": bot_config.temperature
            }
        }
        
    except Exception as e:
        logger.error(f"Error in template chat processing: {e}")
        # Fallback response with template info
        return {
            "answer": f"I received your question: '{question}'. The AI assistant is processing your request.",
            "sources": ["system_processing"],
            "fallback_used": True,
            "template_info": {
                "personality_type": bot_config.personality_type,
                "safety_level": bot_config.safety_level,
                "company_reference": bot_config.company_reference,
                "error": str(e)
            }
        }

@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(
    request: ChatRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Process chat message using template system with JWT authentication
    """
    try:
        # 🎯 EXTRACT JWT TOKEN FOR TEMPLATE SYSTEM
        jwt_token = None
        if authorization and authorization.startswith("Bearer "):
            jwt_token = authorization
        
        # 🎯 GET BOT CONFIG WITH TEMPLATE SYSTEM USING JWT
        bot_config = await get_bot_config_with_jwt(
            request.bot_id, 
            jwt_token,
            request.tenant_id
        )
        
        if not bot_config:
            raise HTTPException(status_code=404, detail="Bot not found")
        
        logger.info(f"🎯 Chat request for bot: {bot_config.bot_name}")
        logger.info(f"📋 Template config: {bot_config.get_template_info()}")
        
        # Process through template-aware RAG system
        rag_result = await process_chat_query_with_template(
            bot_config=bot_config,
            question=request.message,
            user_id=request.user_id,
            tenant_id=request.tenant_id
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
        
        # 🎯 INCLUDE TEMPLATE INFO IN BOT RESPONSE
        template_info = rag_result.get("template_info", {})
        
        bot_message = ChatMessage(
            id=str(uuid.uuid4()),
            type="bot",
            content=rag_result.get("answer", "I'm sorry, I couldn't process your question."),
            sources=sources,
            template_info=template_info,  # 🎯 STORE TEMPLATE INFO
            timestamp=format_iso_with_timezone(current_time)
        )
        
        chat_sessions[session_key].extend([user_message, bot_message])
        
        # Keep only last 100 messages per session
        if len(chat_sessions[session_key]) > 100:
            chat_sessions[session_key] = chat_sessions[session_key][-100:]
        
        logger.info(f"✅ Chat completed with template system")
        logger.info(f"   Response length: {len(bot_message.content)}")
        logger.info(f"   Sources: {len(sources)}")
        logger.info(f"   Template: {template_info.get('personality_type', 'unknown')}")
        
        return ChatResponse(
            response=bot_message.content,
            sources=bot_message.sources or [],
            message_id=bot_message.id,
            timestamp=bot_message.timestamp,
            template_info=template_info  # 🎯 RETURN TEMPLATE INFO
        )
        
    except Exception as e:
        logger.error(f"Chat processing error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Chat processing failed: {str(e)}")

@router.get("/chat/history", response_model=ChatHistoryResponse)
async def get_chat_history(
    bot_id: str, 
    tenant_id: str, 
    user_id: str, 
    limit: int = 50
):
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
        logger.error(f"Chat history error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve history: {str(e)}")

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