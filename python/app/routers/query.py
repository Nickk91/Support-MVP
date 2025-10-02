# app/routers/query.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
import logging

from app.rag.core import answer_query

router = APIRouter(tags=["query"])
log = logging.getLogger(__name__)

class AskBody(BaseModel):
    bot_id: str = Field(min_length=1)
    question: str = Field(min_length=1)

@router.post("/ask")
async def ask(body: AskBody):
    bot_id = body.bot_id.strip()
    question = body.question.strip()

    if not bot_id or not question:
        raise HTTPException(status_code=422, detail="bot_id and question are required.")

    try:
        # If answer_query ever becomes CPU/IO heavy, offload:
        # from anyio import to_thread
        # answer = await to_thread.run_sync(answer_query, bot_id, question)
        answer = answer_query(bot_id, question)
        return {"ok": True, "answer": answer}
    except Exception as e:
        # Log the internal error, return a safe message to clients
        log.exception("ask() failed for bot_id=%s", bot_id)
        raise HTTPException(status_code=400, detail="Failed to answer query.")
