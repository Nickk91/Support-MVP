# chatbot_routes.py
from fastapi import APIRouter, Depends, HTTPException
from models import Chatbot, Tenant
from auth import get_current_user, require_client_admin, TokenData

router = APIRouter(prefix="/api/chatbots", tags=["chatbots"])

@router.post("")
async def create_chatbot(
    chatbot_data: dict,
    current_user: TokenData = Depends(require_client_admin),
    db = Depends(get_db)
):
    """Create a new chatbot for the client's tenant"""
    # Generate a unique bot_id for the RAG system
    bot_id = f"bot_{current_user.tenant_id}_{uuid.uuid4().hex[:8]}"
    
    chatbot = Chatbot(
        name=chatbot_data["name"],
        description=chatbot_data.get("description", ""),
        bot_id=bot_id,
        tenant_id=current_user.tenant_id,
        config=chatbot_data.get("config", "{}")
    )
    
    db.add(chatbot)
    db.commit()
    db.refresh(chatbot)
    
    return {
        "id": chatbot.id,
        "name": chatbot.name,
        "bot_id": chatbot.bot_id,
        "status": "created"
    }

@router.get("")
async def list_chatbots(
    current_user: TokenData = Depends(get_current_user),
    db = Depends(get_db)
):
    """List all chatbots for the current tenant"""
    chatbots = db.query(Chatbot).filter(
        Chatbot.tenant_id == current_user.tenant_id,
        Chatbot.is_active == True
    ).all()
    
    return [
        {
            "id": chatbot.id,
            "name": chatbot.name,
            "description": chatbot.description,
            "bot_id": chatbot.bot_id,
            "created_at": chatbot.created_at
        }
        for chatbot in chatbots
    ]