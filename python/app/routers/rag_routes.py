# rag_routes.py
from fastapi import APIRouter, Depends, HTTPException
from auth import get_current_user, TokenData

router = APIRouter(prefix="/api/rag", tags=["rag"])

@router.post("/ask")
async def ask_question(
    question_data: dict,
    current_user: TokenData = Depends(get_current_user),
    db = Depends(get_db)
):
    """Ask a question to a specific chatbot with user scoping"""
    from models import Chatbot
    
    bot_id = question_data.get("bot_id")
    if not bot_id:
        raise HTTPException(status_code=400, detail="bot_id required")
    
    # Verify the user has access to this chatbot
    chatbot = db.query(Chatbot).filter(
        Chatbot.bot_id == bot_id,
        Chatbot.tenant_id == current_user.tenant_id,
        Chatbot.is_active == True
    ).first()
    
    if not chatbot:
        raise HTTPException(status_code=404, detail="Chatbot not found")
    
    # Call your existing RAG system with user context
    # This integrates with your existing /api/ask endpoint
    rag_response = await call_rag_system(
        bot_id=bot_id,
        question=question_data["question"],
        user_id=current_user.user_id,  # For user-scoped data
        tenant_id=current_user.tenant_id
    )
    
    return rag_response

@router.post("/admin/ask")
async def admin_ask_question(
    question_data: dict,
    current_user: TokenData = Depends(require_client_admin),
    db = Depends(get_db)
):
    """Admin endpoint with detailed sources"""
    # Similar to above but calls your /api/admin/ask endpoint
    pass