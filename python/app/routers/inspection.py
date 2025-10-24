# python\app\routers\inspection.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import logging

from app.rag.inspection_store import InspectionStore

router = APIRouter(prefix="/inspect", tags=["document-inspection"])
log = logging.getLogger(__name__)

class TestQueryRequest(BaseModel):
    query: str

@router.get("/documents/{bot_id}")
async def list_documents(bot_id: str):
    """Get list of all processed documents for a bot"""
    try:
        store = InspectionStore()
        documents = store.list_documents(bot_id)
        return {
            "bot_id": bot_id, 
            "documents": documents,
            "count": len(documents)
        }
    except Exception as e:
        log.exception("Failed to list documents for bot_id=%s", bot_id)
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/documents/{bot_id}/{document_path:path}")
async def inspect_document(bot_id: str, document_path: str):
    """Get parsing results for a specific document"""
    try:
        store = InspectionStore()
        inspection_data = store.get_inspection_data(bot_id, document_path)
        
        if not inspection_data:
            raise HTTPException(status_code=404, detail="Document not found or not processed")
        
        # Add some summary statistics for the UI
        chunks = inspection_data["parsing_result"]
        total_chunks = len(chunks)
        total_chars = sum(chunk["char_count"] for chunk in chunks)
        pages = list(set(chunk["metadata"].get("page") for chunk in chunks if chunk["metadata"].get("page")))
        
        inspection_data["summary"] = {
            "total_chunks": total_chunks,
            "total_characters": total_chars,
            "pages_processed": len(pages),
            "average_chunk_size": total_chars // total_chunks if total_chunks > 0 else 0
        }
        
        return inspection_data
    except HTTPException:
        raise
    except Exception as e:
        log.exception("Failed to inspect document bot_id=%s, path=%s", bot_id, document_path)
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/documents/{bot_id}/{document_path:path}/test-query")
async def test_document_query(bot_id: str, document_path: str, request: TestQueryRequest):
    """Test a query against a specific document"""
    try:
        # For now, return basic functionality - we can enhance this later
        # to actually test retrieval against this specific document
        store = InspectionStore()
        inspection_data = store.get_inspection_data(bot_id, document_path)
        
        if not inspection_data:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Simple keyword matching for demo purposes
        query_lower = request.query.lower()
        matching_chunks = []
        
        for chunk in inspection_data["parsing_result"]:
            content_lower = chunk["content"].lower()
            if query_lower in content_lower:
                matching_chunks.append({
                    "chunk_id": chunk["chunk_id"],
                    "content_preview": chunk["content"][:200] + "..." if len(chunk["content"]) > 200 else chunk["content"],
                    "page": chunk.get("page_number"),
                    "char_count": chunk["char_count"],
                    "relevance_score": "keyword_match"  # Simple scoring for now
                })
        
        return {
            "query": request.query,
            "document": document_path,
            "matching_chunks": matching_chunks,
            "matches_found": len(matching_chunks),
            "message": f"Found {len(matching_chunks)} chunks containing your query terms"
        }
    except Exception as e:
        log.exception("Test query failed for bot_id=%s, path=%s", bot_id, document_path)
        raise HTTPException(status_code=400, detail=str(e))