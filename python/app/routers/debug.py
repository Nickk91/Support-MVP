# python/app/routers/debug.py
from fastapi import APIRouter
from app.rag.vectorstore import get_vectorstore

router = APIRouter()

@router.get("/debug/vectorstore/{bot_id}")
async def debug_vectorstore(bot_id: str):
    """Debug endpoint to check vector store contents"""
    try:
        vs = get_vectorstore(bot_id)
        
        # Try to get some documents
        sample_docs = vs.similarity_search("", k=10)  # Empty query to get random docs
        
        return {
            "bot_id": bot_id,
            "total_documents": len(sample_docs),
            "documents": [
                {
                    "content_preview": doc.page_content[:100] + "..." if len(doc.page_content) > 100 else doc.page_content,
                    "metadata": doc.metadata,
                    "source": doc.metadata.get("source", "unknown")
                }
                for doc in sample_docs
            ]
        }
    except Exception as e:
        return {"error": str(e), "bot_id": bot_id}

@router.get("/debug/retrieval/{bot_id}")
async def debug_retrieval(bot_id: str, query: str = "test"):
    """Test document retrieval for a bot"""
    try:
        from app.rag.retriever import make_retriever
        
        retriever = make_retriever(bot_id)
        documents = retriever(query)
        
        return {
            "bot_id": bot_id,
            "query": query,
            "documents_found": len(documents),
            "documents": [
                {
                    "content": doc.page_content[:200] + "..." if len(doc.page_content) > 200 else doc.page_content,
                    "metadata": doc.metadata,
                    "source": doc.metadata.get("source", "unknown"),
                    "user_scope": doc.metadata.get("user_scope", "unknown"),
                    "tenant_id": doc.metadata.get("tenant_id", "unknown")
                }
                for doc in documents
            ]
        }
    except Exception as e:
        return {"error": str(e), "bot_id": bot_id}