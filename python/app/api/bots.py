# python/app/api/bots.py
from fastapi import APIRouter, HTTPException, Header
from typing import Optional
import logging
from datetime import datetime
from pymongo import MongoClient
from app.config import MONGODB_URI, MONGODB_DB_NAME, APP_ENV  # Add APP_ENV import

logger = logging.getLogger(__name__)
router = APIRouter()


# MongoDB connection
client = MongoClient(MONGODB_URI)
db = client[MONGODB_DB_NAME]
bots_collection = db.bots


# ADD DEBUG LOGGING AT MODULE LEVEL
print(f"🔍 BOTS API - Module loaded")
print(f"🔍 BOTS API - APP_ENV: {APP_ENV}")
print(f"🔍 BOTS API - MONGODB_DB_NAME: {MONGODB_DB_NAME}")
print(f"🔍 BOTS API - Database being used: {db.name}")

@router.post("/api/bots")
async def create_bot(
    bot_data: dict,
    x_user_id: Optional[str] = Header(None),
    x_tenant_id: Optional[str] = Header(None)
):
    """Create a new bot in the Python RAG service"""
    try:
        # ADD DETAILED DEBUG LOGGING
        print(f"🎯 CREATE BOT ENDPOINT CALLED")
        print(f"🔍 BOT CREATION - APP_ENV: {APP_ENV}")
        print(f"🔍 BOT CREATION - MONGODB_DB_NAME: {MONGODB_DB_NAME}")
        print(f"🔍 BOT CREATION - Database name: {db.name}")
        
        # Debug: list available databases
        db_names = client.list_database_names()
        rag_dbs = [db_name for db_name in db_names if 'rag_platform' in db_name]
        print(f"🔍 BOT CREATION - Available RAG databases: {rag_dbs}")
        print(f"🔍 BOT CREATION - Using database: {db.name}")
        
        bot_id = bot_data.get("bot_id")
        bot_name = bot_data.get("bot_name")
        
        if not bot_id or not bot_name:
            raise HTTPException(status_code=400, detail="bot_id and bot_name are required")
        
        # Check if bot already exists
        existing_bot = bots_collection.find_one({"bot_id": bot_id})
        if existing_bot:
            raise HTTPException(status_code=409, detail="Bot with this ID already exists")
        
        # Store bot configuration in MongoDB
        bot_document = {
            "bot_id": bot_id,
            "bot_name": bot_name,
            "system_message": bot_data.get("system_message", ""),
            "model": bot_data.get("model", "gpt-4o-mini"),
            "fallback": bot_data.get("fallback", ""),
            "tenant_id": x_tenant_id,
            "owner_id": x_user_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = bots_collection.insert_one(bot_document)
        
        # ADD CONFIRMATION LOGGING
        print(f"✅ SUCCESS: Bot '{bot_name}' (ID: {bot_id}) saved to MongoDB")
        print(f"✅ Database: {db.name}")
        print(f"✅ Collection: {bots_collection.name}")
        print(f"✅ Inserted ID: {result.inserted_id}")
        
        logger.info(f"✅ Bot created in MongoDB: {bot_name} (ID: {bot_id}) in database: {MONGODB_DB_NAME}")
        
        return {
            "ok": True,
            "message": "Bot created successfully",
            "bot_id": bot_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to create bot: {str(e)}")
        print(f"❌ ERROR creating bot: {str(e)}")
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
        # Check if bot exists
        existing_bot = bots_collection.find_one({"bot_id": bot_id})
        if not existing_bot:
            raise HTTPException(status_code=404, detail="Bot not found")
        
        # Update bot configuration in MongoDB
        update_data = {
            "bot_name": bot_data.get("bot_name", existing_bot["bot_name"]),
            "system_message": bot_data.get("system_message", existing_bot["system_message"]),
            "model": bot_data.get("model", existing_bot["model"]),
            "fallback": bot_data.get("fallback", existing_bot["fallback"]),
            "updated_at": datetime.utcnow()
        }
        
        # Remove None values
        update_data = {k: v for k, v in update_data.items() if v is not None}
        
        bots_collection.update_one(
            {"bot_id": bot_id},
            {"$set": update_data}
        )
        
        logger.info(f"✅ Bot updated in MongoDB: {bot_data.get('bot_name')} (ID: {bot_id})")
        
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
        # Check if bot exists
        existing_bot = bots_collection.find_one({"bot_id": bot_id})
        if not existing_bot:
            raise HTTPException(status_code=404, detail="Bot not found")
        
        bot_name = existing_bot["bot_name"]
        
        # Delete bot from MongoDB
        result = bots_collection.delete_one({"bot_id": bot_id})
        
        # Optional: Also delete associated documents and chunks
        db.documents.delete_many({"bot_id": bot_id})
        db.chunks.delete_many({"bot_id": bot_id})
        
        logger.info(f"🗑️ Bot deleted from MongoDB: {bot_name} (ID: {bot_id})")
        
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
        bot = bots_collection.find_one({"bot_id": bot_id})
        if not bot:
            raise HTTPException(status_code=404, detail="Bot not found")
        
        # Convert ObjectId to string for JSON serialization
        bot["_id"] = str(bot["_id"])
        
        return {
            "ok": True,
            "bot": bot
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
        # Build query based on tenant_id
        query = {}
        if x_tenant_id:
            query["tenant_id"] = x_tenant_id
        
        # Get bots from MongoDB
        bots_cursor = bots_collection.find(query)
        bots_list = []
        
        for bot in bots_cursor:
            bot["_id"] = str(bot["_id"])
            bots_list.append(bot)
        
        return {
            "ok": True,
            "bots": bots_list,
            "total": len(bots_list)
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to list bots: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to list bots: {str(e)}")