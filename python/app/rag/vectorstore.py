# app/rag/vectorstore.py
from __future__ import annotations

import os
from pathlib import Path
from typing import Callable, Optional

from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma, FAISS
from langchain_core.documents import Document

# ---------- Paths ----------
REPO_ROOT = Path(__file__).resolve().parents[2]  # <repo>/python
VECTORDIR = (REPO_ROOT / "data" / "vectordb").resolve()
VECTORDIR.mkdir(parents=True, exist_ok=True)

# ---------- Embeddings ----------
def _embeddings():
    # Using community embeddings to stay compatible with your LC 0.2.x pins
    return HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2"
    )

# ---------- Chroma backend ----------
def get_chroma_store(bot_id: str) -> Chroma:
    persist_dir = (VECTORDIR / bot_id / "chroma").as_posix()
    os.makedirs(persist_dir, exist_ok=True)
    return Chroma(
        collection_name=f"bot_{bot_id}",
        embedding_function=_embeddings(),
        persist_directory=persist_dir,
    )

# ---------- FAISS backend (with persistence) ----------
def _faiss_dir(bot_id: str) -> Path:
    d = VECTORDIR / bot_id / "faiss"
    d.mkdir(parents=True, exist_ok=True)
    return d

def _faiss_try_load(bot_id: str) -> Optional[FAISS]:
    d = _faiss_dir(bot_id)
    # FAISS saves index + store under this directory
    index_file = d / "index.faiss"
    store_file = d / "index.pkl"
    if index_file.exists() and store_file.exists():
        # allow_dangerous_deserialization is required by LC to unpickle doc store
        return FAISS.load_local(
            d.as_posix(),
            _embeddings(),
            allow_dangerous_deserialization=True,
        )
    return None

class LazyFaissStore:
    """
    Creates/loads a FAISS store on demand and persists to disk.
    API surface matches what the rest of your app uses:
      - add_documents(...)
      - persist()
      - as_retriever(...)
    """
    def __init__(self, bot_id: str):
        self.bot_id = bot_id
        self._store: Optional[FAISS] = _faiss_try_load(bot_id)

    def _ensure(self):
        if self._store is None:
            # Create an empty store by adding at least one doc then deleting it,
            # or just wait until first real add. We'll do it on first add.
            pass

    def add_documents(self, docs: list[Document]):
        if not docs:
            return
        if self._store is None:
            # first add creates the index
            self._store = FAISS.from_documents(docs, _embeddings())
        else:
            self._store.add_documents(docs)
        # auto-persist after add to keep disk in sync
        self.persist()

    def persist(self):
        if self._store is None:
            return
        self._store.save_local(_faiss_dir(self.bot_id).as_posix())

    def as_retriever(self, **kwargs):
        if self._store is None:
            # no data yet: create an empty index with a tiny placeholder that we remove
            placeholder = [Document(page_content="__init__ placeholder__")]
            self._store = FAISS.from_documents(placeholder, _embeddings())
            # remove the placeholder vector by rebuilding from empty list
            self._store = FAISS.from_texts([], _embeddings())
            self.persist()
        return self._store.as_retriever(**kwargs)

def get_faiss_store(bot_id: str) -> LazyFaissStore:
    return LazyFaissStore(bot_id)

# ---------- Backend registry ----------
_BACKENDS: dict[str, Callable[[str], object]] = {
    "chroma": get_chroma_store,
    "faiss": get_faiss_store,
}

def _resolve_backend_name(override: Optional[str] = None) -> str:
    name = (override or os.getenv("RAG_VECTOR_BACKEND") or "chroma").strip().lower()
    if name not in _BACKENDS:
        raise ValueError(f"Unknown vector backend '{name}'. Supported: {', '.join(_BACKENDS)}")
    return name

def get_vectorstore(bot_id: str, *, backend: Optional[str] = None):
    """Main entrypoint; choose backend via arg or RAG_VECTOR_BACKEND env (default 'chroma')."""
    return _BACKENDS[_resolve_backend_name(backend)](bot_id)
