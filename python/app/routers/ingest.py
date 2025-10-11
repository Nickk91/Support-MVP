# app/routers/ingest.py
from fastapi import APIRouter, HTTPException, Header
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
async def ingest(
    body: IngestBody,
    x_user_id: str = Header(None, alias="X-User-ID"),
    x_tenant_id: str = Header(None, alias="X-Tenant-ID"), 
    x_user_role: str = Header(None, alias="X-User-Role"),
    x_bot_id: str = Header(None, alias="X-Bot-ID")
):
    try:
        # Use header values if provided, otherwise use body values
        effective_user_id = x_user_id or body.user_id
        effective_bot_id = x_bot_id or body.bot_id
        
        count = ingest_files(
            bot_id=effective_bot_id, 
            paths=body.paths, 
            user_id=effective_user_id,
            tenant_id=x_tenant_id  # Pass tenant_id to core function
        )
        return {"ok": True, "chunks_added": count}
    except Exception as e:
        log.exception("ingest() failed for bot_id=%s", body.bot_id)
        raise HTTPException(status_code=400, detail=str(e))