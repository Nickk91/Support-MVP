# python/app/routers/evaluate.py - UPDATE imports and chat function
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import logging
from app.models.bot import get_bot_config_with_jwt, get_bot_config_with_fallback  # Ensure these imports

router = APIRouter()
logger = logging.getLogger(__name__)

# Request models
class StartEvaluationRequest(BaseModel):
    bot_id: str
    tenant_id: str
    user_id: str

class ChatMessageRequest(BaseModel):
    message: str
    bot_id: str

class EvaluateChatRequest(BaseModel):
    session_id: str
    message: ChatMessageRequest

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
    
    logger.info(f"Started evaluation session: {session_id} for bot: {request.bot_id}")
    
    return {
        "session_id": session_id,
        "message": "Evaluation session started"
    }

@router.post("/evaluate/chat")
async def evaluate_chat(
    request: EvaluateChatRequest,
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
    x_tenant_id: Optional[str] = Header(None)
):
    """Send a message in evaluation session with proper JWT handling"""
    if request.session_id not in evaluation_sessions:
        raise HTTPException(status_code=404, detail="Evaluation session not found")
    
    session = evaluation_sessions[request.session_id]
    
    # Use headers if provided, otherwise use session data
    user_id = x_user_id or session.user_id
    tenant_id = x_tenant_id or session.tenant_id
    
    # 🎯 CRITICAL FIX: Extract JWT token properly
    jwt_token = None
    if authorization:
        if authorization.startswith("Bearer "):
            jwt_token = authorization  # Keep the full "Bearer <token>" format
        else:
            jwt_token = f"Bearer {authorization}"  # Add Bearer prefix if missing
    
    logger.info(f"🎯 Evaluation chat - JWT present: {jwt_token is not None}")
    logger.info(f"   Bot ID: {request.message.bot_id}, User ID: {user_id}, Tenant: {tenant_id}")
    
    try:
        from app.rag.core import answer_query
        
        # 🎯 GET BOT CONFIG WITH JWT AUTHENTICATION
        bot_config = None
        if jwt_token:
            try:
                bot_config = await get_bot_config_with_jwt(
                    request.message.bot_id, 
                    jwt_token,
                    tenant_id
                )
                logger.info(f"✅ Bot config fetched via JWT: {bot_config.bot_name}")
            except Exception as jwt_error:
                logger.warning(f"⚠️ JWT auth failed, falling back to internal token: {jwt_error}")
        
        # 🎯 FALLBACK: Use internal token if JWT fails
        if not bot_config:
            try:
                bot_config = await get_bot_config_with_fallback(
                    request.message.bot_id,
                    tenant_id,
                    user_id
                )
                logger.info(f"✅ Bot config fetched via internal token: {bot_config.bot_name}")
            except Exception as fallback_error:
                logger.error(f"❌ All bot config methods failed: {fallback_error}")
                raise HTTPException(status_code=500, detail="Could not fetch bot configuration")
        
        # Process through template-aware RAG system
        rag_result = await answer_query(
            bot_id=request.message.bot_id,
            question=request.message.message,
            user_id=user_id,
            tenant_id=tenant_id,
            system_message=bot_config.system_message,
            model=bot_config.model,
            temperature=bot_config.temperature,
            fallback_to_llm=True,
            include_sources=True
        )
        
        # Store messages in session with template info
        user_msg = {
            "id": str(uuid.uuid4()),
            "type": "user",
            "content": request.message.message,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        bot_msg = {
            "id": str(uuid.uuid4()),
            "type": "bot", 
            "content": rag_result.get("answer", "I'm sorry, I couldn't process your question."),
            "sources": rag_result.get("sources", []),
            "template_info": {
                "personality_type": bot_config.personality_type,
                "safety_level": bot_config.safety_level,
                "company_reference": bot_config.company_reference,
                "model": bot_config.model
            },
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        session.messages.extend([user_msg, bot_msg])
        
        logger.info(f"✅ Evaluation chat completed for {bot_config.bot_name}")
        
        return {
            "response": bot_msg["content"],
            "sources": bot_msg["sources"],
            "session_id": request.session_id,
            "template_info": bot_msg["template_info"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error in evaluate_chat: {e}")
        return {
            "response": "I'm experiencing technical difficulties. Please try again later.",
            "sources": [],
            "session_id": request.session_id,
            "error": str(e)
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
        logger.info(f"Ended evaluation session: {session_id}")
    
    return {"message": "Evaluation session ended"}