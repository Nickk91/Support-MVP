from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
import logging
from typing import List, Optional

from app.rag.core import ingest_files

router = APIRouter(tags=["ingest"])
log = logging.getLogger(__name__)

class IngestBody(BaseModel):
    bot_id: str = Field(min_length=1)
    paths: List[str] = Field(min_items=1)
    user_id: Optional[str] = None

@router.post("/ingest")
async def ingest(body: IngestBody):
    try:
        count = ingest_files(body.bot_id, body.paths, user_id=body.user_id)
        return {"ok": True, "chunks_added": count}
    except Exception as e:
        log.exception("ingest() failed for bot_id=%s", body.bot_id)
        raise HTTPException(status_code=400, detail=str(e))
