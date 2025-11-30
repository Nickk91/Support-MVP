# app/rag/ingest.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
import logging

from app.rag.core import ingest_files

router = APIRouter(tags=["ingest"])
log = logging.getLogger(__name__)

class IngestBody(BaseModel):
    bot_id: str = Field(min_length=1)
    paths: List[str]  # ← API stays as "paths"
    user_id: Optional[str] = None
    chunk_size: int = 800
    chunk_overlap: int = 120

@router.post("/ingest")
async def ingest(body: IngestBody):
    try:
        count = ingest_files(
            body.bot_id,
            body.paths,  # ← Still body.paths
            user_id=body.user_id,
            chunk_size=body.chunk_size,
            chunk_overlap=body.chunk_overlap,
        )
        return {"ok": True, "chunks_added": count}
    except Exception as e:
        log.exception("ingest() failed for bot_id=%s", body.bot_id)
        raise HTTPException(status_code=400, detail=str(e))
    

@router.post("/debug/test-pinecone")
async def test_pinecone_upload(bot_id: str):
    """Test Pinecone upload with a simple document"""
    try:
        from app.rag.vectorstore import get_vectorstore
        from langchain_core.documents import Document
        
        print(f"🔍 DEBUG PINECONE - Testing Pinecone for bot: {bot_id}")
        
        # Create a simple test document
        test_doc = Document(
            page_content="This is a test document about certificates and authentication for quality assurance.",
            metadata={
                "source": "test_certificate_document.pdf",
                "bot_id": bot_id,
                "test": True,
                "user_scope": "test"
            }
        )
        
        # Get vector store and add document
        vs = get_vectorstore(bot_id)
        print(f"🔍 DEBUG PINECONE - Vector store type: {type(vs)}")
        
        result = vs.add_documents([test_doc])
        print(f"✅ DEBUG PINECONE - Document added successfully")
        
        # Try to search for it
        results = vs.similarity_search("certificate quality", k=5)
        print(f"🔍 DEBUG PINECONE - Search found {len(results)} documents")
        
        search_preview = []
        for doc in results:
            search_preview.append({
                "content_preview": doc.page_content[:50],
                "source": doc.metadata.get("source", "unknown"),
                "bot_id": doc.metadata.get("bot_id", "unknown")
            })
        
        return {
            "upload_success": True,
            "documents_added": 1,
            "search_results": len(results),
            "search_preview": search_preview,
            "vector_store_type": str(type(vs))
        }
        
    except Exception as e:
        print(f"❌ DEBUG PINECONE - Error: {e}")
        import traceback
        print(f"❌ DEBUG PINECONE - Traceback: {traceback.format_exc()}")
        return {"error": str(e), "upload_success": False}