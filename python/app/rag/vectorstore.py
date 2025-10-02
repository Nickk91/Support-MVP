# app/rag/vectorstore.py
from __future__ import annotations

import os
from pathlib import Path
from typing import Callable, Optional

from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings


# --- Paths -------------------------------------------------------------

# <repo>/python/data/vectordb
REPO_ROOT = Path(__file__).resolve().parents[2]
VECTORDIR = (REPO_ROOT / "data" / "vectordb").resolve()
VECTORDIR.mkdir(parents=True, exist_ok=True)


# --- Embeddings --------------------------------------------------------

# If you later want to swap embeddings (OpenAI, Voyage, etc.),
# centralize that here so all backends reuse the same function.
def _default_embeddings():
    # NOTE: LangChain warns to prefer `langchain-huggingface` in newer versions.
    # For now this works fine; we can migrate later without touching callers.
    return HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")


# --- Chroma backend ----------------------------------------------------

def get_chroma_store(bot_id: str) -> Chroma:
    persist_dir = (VECTORDIR / bot_id).as_posix()
    os.makedirs(persist_dir, exist_ok=True)

    embeddings = _default_embeddings()
    return Chroma(
        collection_name=f"bot_{bot_id}",
        embedding_function=embeddings,
        persist_directory=persist_dir,
    )


# --- Backend registry & selector --------------------------------------

# Register backends here as you add them
_BACKENDS: dict[str, Callable[[str], object]] = {
    "chroma": get_chroma_store,
    # "faiss": get_faiss_store,      # example (to add later)
    # "weaviate": get_weaviate_store,
    # "pinecone": get_pinecone_store,
}

def _resolve_backend_name(override: Optional[str] = None) -> str:
    name = (override or os.getenv("RAG_VECTOR_BACKEND") or "chroma").strip().lower()
    if name not in _BACKENDS:
        raise ValueError(
            f"Unknown vector backend '{name}'. Supported: {', '.join(_BACKENDS)}"
        )
    return name

def get_vectorstore(bot_id: str, *, backend: Optional[str] = None):
    """
    Main entrypoint used by the rest of the app.
    Chooses a backend via:
      1) explicit `backend` arg, or
      2) env var RAG_VECTOR_BACKEND, or
      3) default 'chroma'
    """
    name = _resolve_backend_name(backend)
    return _BACKENDS[name](bot_id)
