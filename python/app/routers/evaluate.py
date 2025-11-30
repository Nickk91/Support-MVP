# python/app/routers/evaluate.py - UPDATED TO USE MONGODB DIRECTLY
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import logging
from pymongo import MongoClient
from bson import ObjectId
from app.config import MONGODB_URI, MONGODB_DB_NAME
import asyncio 

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

# MongoDB connection
def get_bots_collection():
    """Get bots collection from MongoDB"""
    client = MongoClient(MONGODB_URI)
    db = client[MONGODB_DB_NAME]
    return db.bots

async def get_bot_config_from_mongodb(bot_id: str):
    """Fetch bot configuration from MongoDB using _id"""
    try:
        bots_collection = get_bots_collection()
        
        # 🎯 CRITICAL FIX: Try both _id and bot_id fields
        bot_data = None
        
        # First try: Use _id (the actual MongoDB ID from Express)
        try:
            bot_data = bots_collection.find_one({"_id": ObjectId(bot_id)})
            if bot_data:
                logger.info(f"✅ Found bot by _id: {bot_id}")
        except Exception as e:
            logger.info(f"🔍 Invalid ObjectId format, trying bot_id: {bot_id}")
            pass  # Invalid ObjectId format
        
        # Second try: Use bot_id field (if _id didn't work)
        if not bot_data:
            bot_data = bots_collection.find_one({"bot_id": bot_id})
            if bot_data:
                logger.info(f"✅ Found bot by bot_id: {bot_id}")
        
        if not bot_data:
            logger.warning(f"❌ Bot {bot_id} not found in MongoDB (tried _id and bot_id)")
            return None
        
        logger.info(f"✅ Bot details: {bot_data.get('bot_name', 'Unknown')}")
        logger.info(f"🎯 Personality: {bot_data.get('personality_type', 'professional')}")
        logger.info(f"🎯 Safety: {bot_data.get('safety_level', 'standard')}")
        
        # Convert to the format expected by the rest of the system
        return {
            'id': str(bot_data['_id']),  # Convert ObjectId to string
            'botName': bot_data.get('bot_name', 'Unknown Bot'),
            'systemMessage': bot_data.get('system_message', ''),
            'model': bot_data.get('model', 'gpt-4o-mini'),
            'temperature': bot_data.get('temperature', 0.7),
            'fallback': bot_data.get('fallback', ''),
            'greeting': bot_data.get('greeting', ''),
            'guardrails': bot_data.get('guardrails', ''),
            'companyReference': bot_data.get('company_reference', bot_data.get('bot_name', 'Unknown')),
            'personalityType': bot_data.get('personality_type', 'professional'),
            'safetyLevel': bot_data.get('safety_level', 'standard'),
            'files': [],
            'ownerId': bot_data.get('owner_id', 'unknown')
        }
    except Exception as e:
        logger.error(f"❌ Error fetching bot from MongoDB: {e}")
        return None

async def get_bot_config_with_fallback(bot_id: str, tenant_id: str, user_id: str = None):
    """Get bot config from MongoDB with fallback"""
    bot_data = await get_bot_config_from_mongodb(bot_id)
    
    if bot_data:
        # Create a simple BotConfig-like object
        class SimpleBotConfig:
            def __init__(self, data):
                self.bot_name = data['botName']
                self.system_message = data['systemMessage']
                self.model = data['model']
                self.temperature = data['temperature']
                self.fallback = data['fallback']
                self.greeting = data['greeting']
                self.guardrails = data['guardrails']
                self.company_reference = data['companyReference']
                self.personality_type = data['personalityType']
                self.safety_level = data['safetyLevel']
                self.files = data['files']
                self.owner_id = data['ownerId']
            
            def get_template_info(self):
                return {
                    "personality": self.personality_type,
                    "safety": self.safety_level,
                    "company": self.company_reference,
                    "is_custom_personality": self.personality_type == "custom",
                    "is_custom_safety": self.safety_level == "custom"
                }
        
        bot_config = SimpleBotConfig(bot_data)
        template_info = bot_config.get_template_info()
        logger.info(f"✅ Bot config fetched from MongoDB: {bot_config.bot_name}")
        logger.info(f"🎯 Template config: {template_info}")
        return bot_config
    
    # Fallback configuration
    logger.warning(f"⚠️ Using fallback bot config for {bot_id}")
    
    class FallbackBotConfig:
        def __init__(self, bot_id):
            self.bot_name = f'Bot {bot_id}'
            self.system_message = 'You are a helpful AI assistant. Answer questions based on the provided documentation.'
            self.model = 'gpt-4o-mini'
            self.temperature = 0.7
            self.fallback = 'I apologize, but I cannot answer that question based on my current knowledge.'
            self.greeting = 'Hello! How can I help you today?'
            self.guardrails = 'Please ensure all responses are accurate and appropriate.'
            self.company_reference = f'Bot {bot_id}'
            self.personality_type = 'professional'
            self.safety_level = 'standard'
            self.files = []
            self.owner_id = 'unknown'
        
        def get_template_info(self):
            return {
                "personality": self.personality_type,
                "safety": self.safety_level,
                "company": self.company_reference,
                "is_custom_personality": self.personality_type == "custom",
                "is_custom_safety": self.safety_level == "custom"
            }
    
    return FallbackBotConfig(bot_id)

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
        messages=[]  # 🎯 Start with empty messages - greeting will be first
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
    """Send a message in evaluation session with MongoDB bot config"""
    if request.session_id not in evaluation_sessions:
        raise HTTPException(status_code=404, detail="Evaluation session not found")
    
    session = evaluation_sessions[request.session_id]
    
    # Use headers if provided, otherwise use session data
    user_id = x_user_id or session.user_id
    tenant_id = x_tenant_id or session.tenant_id
    
    logger.info(f"🎯 Evaluation chat - Bot ID: {request.message.bot_id}, User ID: {user_id}, Tenant: {tenant_id}")
    logger.info(f"   Session messages count: {len(session.messages)}")
    
    try:
        from app.rag.core import answer_query
        
        # 🎯 CRITICAL FIX: Use MongoDB directly instead of Express server
        bot_config = await get_bot_config_with_fallback(
            request.message.bot_id,
            tenant_id,
            user_id
        )
        
        logger.info(f"✅ Bot config: {bot_config.bot_name}")
        logger.info(f"🎯 Personality: {bot_config.personality_type}, Safety: {bot_config.safety_level}")
        logger.info(f"🎯 Company: {bot_config.company_reference}")
        logger.info(f"🎯 Greeting: '{bot_config.greeting}'")
        
        # 🎯 CHECK IF THIS IS THE FIRST MESSAGE AND RETURN GREETING
        if not session.messages:
            logger.info(f"🎯 FIRST MESSAGE DETECTED - Applying 4-second delay for greeting")
            logger.info(f"   User message: '{request.message.message}'")
            
            # 🎯 ADD HUMAN-LIKE DELAY FOR GREETING
            start_time = datetime.now(timezone.utc)
            logger.info(f"⏳ Starting 4-second delay at {start_time.isoformat()}")
            await asyncio.sleep(4)
            end_time = datetime.now(timezone.utc)
            delay_duration = (end_time - start_time).total_seconds()
            logger.info(f"✅ Delay completed after {delay_duration:.2f} seconds at {end_time.isoformat()}")
            
            # Create greeting message
            greeting_msg = {
                "id": str(uuid.uuid4()),
                "type": "bot",
                "content": bot_config.greeting,
                "sources": [],
                "template_info": {
                    "personality_type": bot_config.personality_type,
                    "safety_level": bot_config.safety_level,
                    "company_reference": bot_config.company_reference,
                    "model": bot_config.model,
                    "is_greeting": True,
                    "had_delay": True,
                    "response_time_ms": int(delay_duration * 1000),
                    "user_message": request.message.message  # 🎯 Track what triggered this
                },
                "timestamp": end_time.isoformat()
            }
            
            session.messages.append(greeting_msg)
            
            logger.info(f"✅ Returning greeting after delay: '{bot_config.greeting}'")
            
            return {
                "response": bot_config.greeting,
                "sources": [],
                "session_id": request.session_id,
                "template_info": greeting_msg["template_info"],
                "is_greeting": True
            }
        
        # 🎯 REGULAR MESSAGE PROCESSING (existing code)
        logger.info(f"🎯 REGULAR MESSAGE PROCESSING - No delay applied")
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


# =============================================================================
# DEBUG ENDPOINTS
# =============================================================================

@router.get("/debug/vectorstore-status")
async def debug_vectorstore_status(bot_id: str = "692c1d5b940b144ec2a916ee"):
    """Debug endpoint to check vector store status"""
    try:
        from app.rag.vectorstore import get_vectorstore
        from app.config import MONGODB_URI, MONGODB_DB_NAME
        from pymongo import MongoClient
        
        # Check MongoDB connection
        client = MongoClient(MONGODB_URI)
        db = client[MONGODB_DB_NAME]
        collections = db.list_collection_names()
        
        # Check vector store
        vectorstore = get_vectorstore(bot_id)
        test_docs = vectorstore.similarity_search("test", k=1)
        
        # Check total documents
        all_docs = vectorstore.similarity_search("", k=2)
        
        return {
            "status": "success",
            "database": MONGODB_DB_NAME,
            "collections": collections,
            "vectorstore_test_docs": len(test_docs),
            "vectorstore_total_docs": len(all_docs),
            "bot_id": bot_id
        }
    except Exception as e:
        return {"status": "error", "error": str(e)}

@router.get("/debug/search-test")
async def debug_search_test(
    bot_id: str = "692c1d5b940b144ec2a916ee",
    query: str = "certificate"
):
    """Test search functionality"""
    try:
        from app.rag.vectorstore import get_vectorstore
        vectorstore = get_vectorstore(bot_id)
        documents = vectorstore.similarity_search(query, k=5)
        
        results = []
        for i, doc in enumerate(documents):
            results.append({
                "rank": i + 1,
                "source": doc.metadata.get("source", "unknown"),
                "content_preview": doc.page_content[:200] + "..." if len(doc.page_content) > 200 else doc.page_content,
            })
        
        return {
            "status": "success",
            "query": query,
            "results_found": len(documents),
            "results": results
        }
    except Exception as e:
        return {"status": "error", "error": str(e)}