# app/routers/query.py

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
import logging
from typing import Optional, List, Dict, Any

from app.rag.core import answer_query

router = APIRouter(tags=["query"])
log = logging.getLogger(__name__)

# Request model - shared by both endpoints
class AskBody(BaseModel):
    bot_id: str = Field(min_length=1)
    question: str = Field(min_length=1)
    system_message: Optional[str] = None
    user_id: Optional[str] = None
    fallback_to_llm: bool = True

# Regular user response - clean without source details
class QueryResponse(BaseModel):
    ok: bool
    answer: str

# Admin response - with full source transparency
class AdminQueryResponse(BaseModel):
    ok: bool
    answer: str
    sources: List[str]
    source_details: List[Dict[str, Any]]
    document_count: int
    fallback_used: bool

# Simple auth stub for now - replace with your real auth system
def get_current_user(admin_mode: bool = False):
    """Stub for authentication - replace with your real auth system"""
    return {"is_admin": admin_mode}

@router.post("/ask", response_model=QueryResponse)
async def ask(
    body: AskBody,
    user: dict = Depends(lambda: get_current_user(False))  # Regular user
):
    """
    Regular user endpoint - returns clean answers without source details
    """
    try:
        result = await answer_query(
            body.bot_id,
            body.question,
            user_id=body.user_id,
            system_message=body.system_message,
            fallback_to_llm=body.fallback_to_llm,
            include_sources=False  # Always false for regular users
        )
        
        # Log sources internally for debugging (but don't return to user)
        if result.get("sources"):
            log.info(f"User query answered using {result['document_count']} documents: {result['sources']}")
        
        return {
            "ok": True,
            "answer": result["answer"]
        }
        
    except Exception:
        log.exception("ask() failed for bot_id=%s", body.bot_id)
        raise HTTPException(status_code=400, detail="Failed to answer query.")

@router.post("/admin/ask", response_model=AdminQueryResponse)
async def admin_ask(
    body: AskBody,
    user: dict = Depends(lambda: get_current_user(True))  # Admin user
):
    """
    Admin-only endpoint with full source transparency and debugging information
    """
    try:
        result = await answer_query(
            body.bot_id,
            body.question,
            user_id=body.user_id,
            system_message=body.system_message,
            fallback_to_llm=body.fallback_to_llm,
            include_sources=True  # Always include sources for admin
        )
        
        return {
            "ok": True,
            "answer": result["answer"],
            "sources": result.get("sources", []),
            "source_details": result.get("source_details", []),
            "document_count": result.get("document_count", 0),
            "fallback_used": result.get("fallback_used", False)
        }
        
    except Exception:
        log.exception("Admin ask() failed for bot_id=%s", body.bot_id)
        raise HTTPException(status_code=400, detail="Failed to answer query.")