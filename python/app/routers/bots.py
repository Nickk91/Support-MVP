# python/app/routers/bots.py 
from fastapi import APIRouter, HTTPException, Header
from typing import Optional
import logging
from datetime import datetime, timezone 

logger = logging.getLogger(__name__)
router = APIRouter()

# In-memory store for bots (you might want to use a database later)
bots_store = {}

@router.post("/bots")
async def create_bot(
    bot_data: dict,
    x_user_id: Optional[str] = Header(None),
    x_tenant_id: Optional[str] = Header(None)
):
    """Create a new bot in the Python RAG service"""
    try:
        bot_id = bot_data.get("bot_id")
        bot_name = bot_data.get("bot_name")
        
        if not bot_id or not bot_name:
            raise HTTPException(status_code=400, detail="bot_id and bot_name are required")
        
        # Store bot configuration
        bots_store[bot_id] = {
            "bot_id": bot_id,
            "bot_name": bot_name,
            "system_message": bot_data.get("system_message", ""),
            "model": bot_data.get("model", "gpt-4o-mini"),
            "fallback": bot_data.get("fallback", ""),
            "tenant_id": x_tenant_id,
            "owner_id": x_user_id,
            "created_at": "2025-01-15T00:00:00Z"
        }
        
        logger.info(f"✅ Bot created in Python RAG: {bot_name} (ID: {bot_id})")
        
        return {
            "ok": True,
            "message": "Bot created successfully",
            "bot_id": bot_id
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to create bot: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create bot: {str(e)}")

# python/app/routers/bots.py - UPDATE put_bot function
@router.put("/bots/{bot_id}")
async def update_bot(
    bot_id: str,
    bot_data: dict,
    x_user_id: Optional[str] = Header(None),
    x_tenant_id: Optional[str] = Header(None)
):
    """Update an existing bot in the Python RAG service - ROBUST VERSION"""
    try:
        # 🎯 FIX: Check if bot exists, if not create it
        bot_exists = bot_id in bots_store
        
        if not bot_exists:
            logger.info(f"🆕 Bot {bot_id} not found in Python store, creating it...")
            # Create the bot with the provided data
            bots_store[bot_id] = {
                "bot_id": bot_id,
                "bot_name": bot_data.get("bot_name", f"Bot {bot_id}"),
                "system_message": bot_data.get("system_message", ""),
                "model": bot_data.get("model", "gpt-4o-mini"),
                "fallback": bot_data.get("fallback", ""),
                "temperature": bot_data.get("temperature", 0.7),
                # 🎯 NEW TEMPLATE FIELDS
                "company_reference": bot_data.get("company_reference", bot_data.get("bot_name", f"Bot {bot_id}")),
                "personality_type": bot_data.get("personality_type", "professional"),
                "safety_level": bot_data.get("safety_level", "standard"),
                "guardrails": bot_data.get("guardrails", ""),
                "greeting": bot_data.get("greeting", ""),
                # Metadata
                "tenant_id": x_tenant_id,
                "owner_id": x_user_id,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            logger.info(f"✅ Auto-created bot in Python store: {bots_store[bot_id]['bot_name']} (ID: {bot_id})")
        
        # 🎯 UPDATE BOT CONFIGURATION
        update_fields = {}
        
        # Basic fields
        if "bot_name" in bot_data:
            update_fields["bot_name"] = bot_data["bot_name"]
        if "system_message" in bot_data:
            update_fields["system_message"] = bot_data["system_message"]
        if "model" in bot_data:
            update_fields["model"] = bot_data["model"]
        if "fallback" in bot_data:
            update_fields["fallback"] = bot_data["fallback"]
        if "temperature" in bot_data:
            update_fields["temperature"] = bot_data["temperature"]
            
        # 🎯 TEMPLATE SYSTEM FIELDS
        if "company_reference" in bot_data:
            update_fields["company_reference"] = bot_data["company_reference"]
        if "personality_type" in bot_data:
            update_fields["personality_type"] = bot_data["personality_type"]
        if "safety_level" in bot_data:
            update_fields["safety_level"] = bot_data["safety_level"]
        if "guardrails" in bot_data:
            update_fields["guardrails"] = bot_data["guardrails"]
        if "greeting" in bot_data:
            update_fields["greeting"] = bot_data["greeting"]
        
        # Apply updates
        if update_fields:
            bots_store[bot_id].update(update_fields)
            bots_store[bot_id]["updated_at"] = datetime.now(timezone.utc).isoformat()
            logger.info(f"✅ Bot updated in Python RAG: {bots_store[bot_id]['bot_name']} (ID: {bot_id})")
            logger.info(f"📋 Updated fields: {list(update_fields.keys())}")
        else:
            logger.info(f"ℹ️ No fields to update for bot {bot_id}")
        
        return {
            "ok": True,
            "message": "Bot updated successfully",
            "bot_id": bot_id,
            "bot_created": not bot_exists,
            "fields_updated": list(update_fields.keys()) if update_fields else []
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to update bot: {str(e)}")
        # 🎯 STILL RETURN SUCCESS TO AVOID BLOCKING NODE.JS OPERATION
        return {
            "ok": True,
            "message": "Bot update attempted (Python store may be out of sync)",
            "bot_id": bot_id,
            "warning": str(e)
        }

# python/app/routers/bots.py - UPDATED delete_bot function
@router.delete("/bots/{bot_id}")
async def delete_bot(
    bot_id: str,
    x_user_id: Optional[str] = Header(None),
    x_tenant_id: Optional[str] = Header(None)
):
    """Delete a bot from the Python RAG service and clean up vector store - ROBUST VERSION"""
    try:
        # 🎯 FIX: Check if bot exists in store, but proceed with cleanup anyway
        bot_exists = bot_id in bots_store
        bot_name = bots_store[bot_id]["bot_name"] if bot_exists else f"Bot {bot_id}"
        
        logger.info(f"🗑️ Starting bot deletion process for: {bot_name} (ID: {bot_id})")
        logger.info(f"   Bot found in Python store: {bot_exists}")
        
        # 🎯 ALWAYS CLEAN UP VECTOR STORE EVEN IF BOT NOT IN STORE
        vectorstore_cleaned = False
        try:
            from app.rag.vectorstore import delete_vectorstore
            vectorstore_cleaned = delete_vectorstore(bot_id)
            if vectorstore_cleaned:
                logger.info(f"✅ Vector store cleaned up for bot: {bot_name} (ID: {bot_id})")
            else:
                logger.info(f"ℹ️ Vector store already deleted or not found for bot {bot_id}")
        except Exception as e:
            logger.warning(f"⚠️ Vector store cleanup had issues for bot {bot_id}: {e}")
            # Continue with deletion - don't fail the whole operation
        
        # 🎯 REMOVE BOT FROM MEMORY STORE IF IT EXISTS
        if bot_exists:
            del bots_store[bot_id]
            logger.info(f"✅ Bot removed from Python store: {bot_name} (ID: {bot_id})")
        else:
            logger.info(f"ℹ️ Bot {bot_id} not found in Python store, but vector store was cleaned up")
        
        return {
            "ok": True,
            "message": "Bot and vector store cleaned up successfully",
            "bot_id": bot_id,
            "bot_found_in_store": bot_exists,
            "vectorstore_cleaned": vectorstore_cleaned
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to delete bot: {str(e)}")
        # 🎯 STILL RETURN SUCCESS TO AVOID BLOCKING NODE.JS DELETION
        return {
            "ok": True,
            "message": "Bot deletion attempted (some operations may have failed)",
            "bot_id": bot_id,
            "warning": str(e),
            "vectorstore_cleaned": False
        }
    
# python/app/routers/bots.py - UPDATE get_bot function
@router.get("/bots/{bot_id}")
async def get_bot(
    bot_id: str,
    x_user_id: Optional[str] = Header(None),
    x_tenant_id: Optional[str] = Header(None)
):
    """Get bot configuration from Python RAG service - ROBUST VERSION"""
    try:
        # 🎯 FIX: If bot not found, return a default configuration
        if bot_id not in bots_store:
            logger.info(f"ℹ️ Bot {bot_id} not found in Python store, returning default config")
            return {
                "ok": True,
                "bot": {
                    "bot_id": bot_id,
                    "bot_name": f"Bot {bot_id}",
                    "system_message": "You are a helpful AI assistant. Answer questions based on the provided documentation.",
                    "model": "gpt-4o-mini",
                    "fallback": "",
                    "temperature": 0.7,
                    # 🎯 TEMPLATE FIELDS
                    "company_reference": f"Bot {bot_id}",
                    "personality_type": "professional",
                    "safety_level": "standard",
                    "guardrails": "",
                    "greeting": "",
                    "tenant_id": x_tenant_id,
                    "owner_id": x_user_id,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        
        return {
            "ok": True,
            "bot": bots_store[bot_id]
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to get bot: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get bot: {str(e)}")

@router.get("/bots")
async def list_bots(
    x_user_id: Optional[str] = Header(None),
    x_tenant_id: Optional[str] = Header(None)
):
    """List all bots for the current tenant"""
    try:
        # Filter bots by tenant_id if provided
        tenant_bots = {}
        if x_tenant_id:
            tenant_bots = {bot_id: bot_data for bot_id, bot_data in bots_store.items() 
                          if bot_data.get("tenant_id") == x_tenant_id}
        else:
            tenant_bots = bots_store
        
        return {
            "ok": True,
            "bots": list(tenant_bots.values()),
            "total": len(tenant_bots)
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to list bots: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to list bots: {str(e)}")