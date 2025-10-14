# app/routers/ingest.py
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