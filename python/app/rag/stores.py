# app/rag/stores.py
from __future__ import annotations
from app.rag.vectorstore import get_vectorstore  # re-export

__all__ = ["get_vectorstore"]
