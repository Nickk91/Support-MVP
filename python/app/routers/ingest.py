from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List

from app.rag.core import ingest_files, answer_query

router = APIRouter(tags=["ingest"])

class IngestBody(BaseModel):
    bot_id: str
    paths: List[str]

@router.post("/ingest")
def ingest_endpoint(body: IngestBody):
    try:
        added = ingest_files(body.bot_id, body.paths)
        return {"ok": True, "chunks_added": added}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

class AskBody(BaseModel):
    bot_id: str
    question: str

@router.post("/ask")
def ask_endpoint(body: AskBody):
    try:
        answer = answer_query(body.bot_id, body.question)
        return {"ok": True, "answer": answer}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
