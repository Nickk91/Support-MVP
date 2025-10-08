from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
import logging
from typing import Optional

from app.rag.core import answer_query

router = APIRouter(tags=["query"])
log = logging.getLogger(__name__)

class AskBody(BaseModel):
    bot_id: str = Field(min_length=1)
    question: str = Field(min_length=1)
    system_message: Optional[str] = None
    user_id: Optional[str] = None
    fallback_to_llm: bool = True  # NEW: Client can control fallback

@router.post("/ask")
async def ask(body: AskBody):
    try:
        answer = await answer_query(  # Changed to await since it's now async
            body.bot_id,
            body.question,
            user_id=body.user_id,
            system_message=body.system_message,
            fallback_to_llm=body.fallback_to_llm  # NEW: Pass the fallback parameter
        )
        return {"ok": True, "answer": answer}
    except Exception:
        log.exception("ask() failed for bot_id=%s", body.bot_id)
        raise HTTPException(status_code=400, detail="Failed to answer query.")