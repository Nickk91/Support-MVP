from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import List, Optional
import logging
from app.rag.vectorstore import get_vectorstore, delete_files_from_vectorstore

router = APIRouter(tags=["cleanup"])
log = logging.getLogger(__name__)

class CleanupFilesRequest(BaseModel):
    bot_id: str
    file_paths: List[str]

class CleanupBotRequest(BaseModel):
    bot_id: str

@router.post("/cleanup/files")
async def cleanup_files(
    request: CleanupFilesRequest,
    x_user_id: str = Header(None, alias="X-User-ID"),
    x_tenant_id: str = Header(None, alias="X-Tenant-ID")
):
    """
    Clean up specific files from vector store
    """
    try:
        log.info(f"🧹 Cleaning up files from vector store: bot_id={request.bot_id}, files={request.file_paths}")
        
        # Get vector store for the bot
        vectorstore = get_vectorstore(request.bot_id)
        
        # Delete files from vector store
        deleted_count = delete_files_from_vectorstore(vectorstore, request.file_paths)
        
        log.info(f"✅ Cleaned up {deleted_count} files from vector store for bot {request.bot_id}")
        
        return {
            "ok": True,
            "message": f"Cleaned up {deleted_count} files from vector store",
            "deleted_count": deleted_count
        }
        
    except Exception as e:
        log.error(f"❌ Failed to cleanup files from vector store: {e}")
        raise HTTPException(status_code=500, detail=f"Cleanup failed: {str(e)}")

@router.delete("/cleanup/bot/{bot_id}")
async def cleanup_bot(
    bot_id: str,
    x_user_id: str = Header(None, alias="X-User-ID"),
    x_tenant_id: str = Header(None, alias="X-Tenant-ID")
):
    """
    Clean up entire bot from vector store (for bot deletion)
    """
    try:
        log.info(f"🧹 Cleaning up entire bot from vector store: bot_id={bot_id}")
        
        # This would typically delete the entire vector store collection for the bot
        # Implementation depends on your vector store (Chroma, etc.)
        
        # For ChromaDB, we might delete the entire collection
        vectorstore = get_vectorstore(bot_id)
        
        # Get all documents to find what to delete, or reset the collection
        # This is a simplified implementation - you might need to adjust based on your vector store
        try:
            # Try to get the collection to see if it exists
            all_docs = vectorstore.get()  # This might vary by vector store implementation
            if all_docs and 'documents' in all_docs and all_docs['documents']:
                # Delete all documents for this bot
                vectorstore.delete(ids=all_docs['ids'])
                log.info(f"✅ Cleaned up vector store for bot {bot_id}")
                return {
                    "ok": True,
                    "message": "Vector store cleaned up successfully",
                    "deleted_count": len(all_docs['ids'])
                }
            else:
                log.info(f"ℹ️ No vector store data found for bot {bot_id}")
                return {
                    "ok": True,
                    "message": "No vector store data found to cleanup"
                }
        except Exception as collection_error:
            log.warning(f"⚠️ Vector store collection might not exist for bot {bot_id}: {collection_error}")
            return {
                "ok": True,
                "message": "Vector store cleanup completed (no collection found)"
            }
        
    except Exception as e:
        log.error(f"❌ Failed to cleanup bot from vector store: {e}")
        raise HTTPException(status_code=500, detail=f"Bot cleanup failed: {str(e)}")

@router.delete("/ingest/{bot_id}")
async def cleanup_bot_ingest(
    bot_id: str,
    x_user_id: str = Header(None, alias="X-User-ID"),
    x_tenant_id: str = Header(None, alias="X-Tenant-ID")
):
    """
    Alternative endpoint for cleaning up bot ingest data
    """
    # This could be an alias for the cleanup/bot endpoint or have different logic
    return await cleanup_bot(bot_id, x_user_id, x_tenant_id)