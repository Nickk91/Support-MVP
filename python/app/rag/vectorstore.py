
from __future__ import annotations

import os
from pathlib import Path
from typing import Callable, Optional, List

from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma, FAISS
from langchain_core.documents import Document


import logging
import shutil


# Add logger definition
logger = logging.getLogger(__name__)


# ---------- Paths ----------
REPO_ROOT = Path(__file__).resolve().parents[2]
VECTORDIR = (REPO_ROOT / "data" / "vectordb").resolve()
VECTORDIR.mkdir(parents=True, exist_ok=True)


# ---------- Embeddings ----------
def _embeddings():
    # Add timeout and local files only to avoid download issues
    return HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2",
        model_kwargs={'device': 'cpu'},
        encode_kwargs={'normalize_embeddings': False},
        # Prevent timeouts by using local cache only
    )

def get_embeddings():
    """Get the embeddings model"""
    return HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2",
        model_kwargs={'device': 'cpu'},
        encode_kwargs={'normalize_embeddings': False}
    )


# ---------- Chroma backend ----------
def get_chroma_store(bot_id: str) -> Chroma:
    persist_dir = (VECTORDIR / bot_id / "chroma")
    persist_dir.mkdir(parents=True, exist_ok=True)
    return Chroma(
        collection_name=f"bot_{bot_id}",
        embedding_function=_embeddings(),
        persist_directory=persist_dir.as_posix(),
    )


# ---------- FAISS helpers ----------
def _faiss_dir(bot_id: str) -> Path:
    d = VECTORDIR / bot_id / "faiss"
    d.mkdir(parents=True, exist_ok=True)
    return d

def _faiss_try_load(bot_id: str) -> Optional[FAISS]:
    d = _faiss_dir(bot_id)
    if (d / "index.faiss").exists() and (d / "index.pkl").exists():
        return FAISS.load_local(
            d.as_posix(),
            _embeddings(),
            allow_dangerous_deserialization=True,
        )
    return None

class _EmptyRetriever:
    def invoke(self, _q: str) -> List[Document]:
        return []
    def get_relevant_documents(self, _q: str) -> List[Document]:
        return []

class LazyFaissStore:
    def __init__(self, bot_id: str):
        self.bot_id = bot_id
        self._store: Optional[FAISS] = _faiss_try_load(bot_id)

    def add_documents(self, docs: List[Document]):
        if not docs:
            return
        if self._store is None:
            self._store = FAISS.from_documents(docs, _embeddings())
        else:
            self._store.add_documents(docs)
        self.persist()

    def persist(self):
        if self._store is None:
            return
        out_dir = _faiss_dir(self.bot_id)
        self._store.save_local(out_dir.as_posix())

    def as_retriever(self, **kwargs):
        if self._store is None:
            self._store = _faiss_try_load(self.bot_id)
        if self._store is None:
            return _EmptyRetriever()
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

def get_vectorstore(bot_id: str, backend: str = None) -> object:
    """Get vector store for a specific bot using the backend registry"""
    backend_name = _resolve_backend_name(backend)
    store_factory = _BACKENDS[backend_name]
    return store_factory(bot_id)


# python/app/rag/vectorstore.py - ADD this function
def delete_vectorstore(bot_id: str) -> bool:
    """Delete all vector store data for a specific bot"""
    try:
        # Get the backend type to know which cleanup method to use
        backend_name = _resolve_backend_name()
        
        if backend_name == "chroma":
            # First, try to get the store and close any connections
            try:
                store = get_chroma_store(bot_id)
                # Try to close any open connections
                if hasattr(store, '_client'):
                    store._client.clear_system_cache()
                if hasattr(store, 'persist_directory'):
                    # Force close any open file handles
                    import gc
                    gc.collect()
            except Exception as e:
                logger.warning(f"⚠️ Could not cleanly close Chroma store: {e}")
            
            # Now delete the directory
            chroma_dir = VECTORDIR / bot_id / "chroma"
            if chroma_dir.exists():
                # Use a retry mechanism for file locks
                import time
                max_retries = 3
                for attempt in range(max_retries):
                    try:
                        shutil.rmtree(chroma_dir)
                        logger.info(f"✅ Deleted ChromaDB directory: {chroma_dir}")
                        return True
                    except PermissionError as e:
                        if attempt < max_retries - 1:
                            logger.warning(f"⚠️ File locked, retrying... (attempt {attempt + 1})")
                            time.sleep(1)  # Wait 1 second before retry
                        else:
                            logger.error(f"❌ Failed to delete ChromaDB directory after {max_retries} attempts: {e}")
                            return False
            else:
                logger.info(f"ℹ️ No ChromaDB directory found for bot {bot_id}")
                return True
                
        elif backend_name == "faiss":
            # Delete FAISS persistence directory
            faiss_dir = VECTORDIR / bot_id / "faiss"
            if faiss_dir.exists():
                shutil.rmtree(faiss_dir)
                logger.info(f"✅ Deleted FAISS directory: {faiss_dir}")
                return True
            else:
                logger.info(f"ℹ️ No FAISS directory found for bot {bot_id}")
                return True
        else:
            logger.warning(f"⚠️ Unknown backend {backend_name}, cannot cleanup vector store")
            return False
            
    except Exception as e:
        logger.error(f"❌ Failed to delete vector store for bot {bot_id}: {e}")
        return False