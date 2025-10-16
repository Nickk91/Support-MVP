# python/app/api/bots.py
from fastapi import APIRouter, HTTPException, Header
from typing import Optional
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

# In-memory store for bots (you might want to use a database later)
bots_store = {}

@router.post("/api/bots")
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
            "created_at": "2025-01-15T00:00:00Z"  # You might want to use actual timestamp
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

@router.put("/api/bots/{bot_id}")
async def update_bot(
    bot_id: str,
    bot_data: dict,
    x_user_id: Optional[str] = Header(None),
    x_tenant_id: Optional[str] = Header(None)
):
    """Update an existing bot in the Python RAG service"""
    try:
        if bot_id not in bots_store:
            raise HTTPException(status_code=404, detail="Bot not found")
        
        # Update bot configuration
        bots_store[bot_id].update({
            "bot_name": bot_data.get("bot_name", bots_store[bot_id]["bot_name"]),
            "system_message": bot_data.get("system_message", bots_store[bot_id]["system_message"]),
            "model": bot_data.get("model", bots_store[bot_id]["model"]),
            "fallback": bot_data.get("fallback", bots_store[bot_id]["fallback"]),
            "updated_at": "2025-01-15T00:00:00Z"  # You might want to use actual timestamp
        })
        
        logger.info(f"✅ Bot updated in Python RAG: {bot_data.get('bot_name')} (ID: {bot_id})")
        
        return {
            "ok": True,
            "message": "Bot updated successfully",
            "bot_id": bot_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to update bot: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update bot: {str(e)}")

@router.delete("/api/bots/{bot_id}")
async def delete_bot(
    bot_id: str,
    x_user_id: Optional[str] = Header(None),
    x_tenant_id: Optional[str] = Header(None)
):
    """Delete a bot from the Python RAG service"""
    try:
        if bot_id not in bots_store:
            raise HTTPException(status_code=404, detail="Bot not found")
        
        bot_name = bots_store[bot_id]["bot_name"]
        del bots_store[bot_id]
        
        logger.info(f"🗑️ Bot deleted from Python RAG: {bot_name} (ID: {bot_id})")
        
        return {
            "ok": True,
            "message": "Bot deleted successfully",
            "bot_id": bot_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to delete bot: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete bot: {str(e)}")

@router.get("/api/bots/{bot_id}")
async def get_bot(
    bot_id: str,
    x_user_id: Optional[str] = Header(None),
    x_tenant_id: Optional[str] = Header(None)
):
    """Get bot configuration from Python RAG service"""
    try:
        if bot_id not in bots_store:
            raise HTTPException(status_code=404, detail="Bot not found")
        
        return {
            "ok": True,
            "bot": bots_store[bot_id]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to get bot: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get bot: {str(e)}")

@router.get("/api/bots")
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