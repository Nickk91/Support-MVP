# python/app/rag/vectorstore.py - ENHANCED DELETION WITH MULTIPLE STRATEGIES
from __future__ import annotations

import os
import logging
import shutil
import time
import gc
import subprocess
import platform
from pathlib import Path
from typing import Callable, Optional, List

from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma, FAISS
from langchain_core.documents import Document

# Add logger definition
logger = logging.getLogger(__name__)

# ---------- Paths ----------
REPO_ROOT = Path(__file__).resolve().parents[2]
VECTORDIR = (REPO_ROOT / "data" / "vectordb").resolve()
VECTORDIR.mkdir(parents=True, exist_ok=True)

# ---------- Embeddings ----------
def _embeddings():
    return HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2",
        model_kwargs={'device': 'cpu'},
        encode_kwargs={'normalize_embeddings': False},
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

# ---------- Enhanced Vector Store Deletion ----------
def delete_vectorstore(bot_id: str) -> bool:
    """Delete all vector store data for a specific bot - aggressive Windows compatibility"""
    try:
        backend_name = _resolve_backend_name()
        
        if backend_name == "chroma":
            chroma_dir = VECTORDIR / bot_id / "chroma"
            if not chroma_dir.exists():
                logger.info(f"ℹ️ No ChromaDB directory found for bot {bot_id}")
                return True
            
            # Strategy 1: Try graceful ChromaDB cleanup first
            if _try_graceful_chroma_cleanup(bot_id, chroma_dir):
                return True
            
            # Strategy 2: Forceful deletion with multiple approaches
            return _force_delete_chroma_directory(bot_id, chroma_dir)
                
        elif backend_name == "faiss":
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
        _mark_for_deletion(bot_id)
        return False

def _try_graceful_chroma_cleanup(bot_id: str, chroma_dir: Path) -> bool:
    """Try to gracefully close ChromaDB connections and delete"""
    try:
        # Get the store instance and try to close it properly
        store = get_chroma_store(bot_id)
        
        # Try various methods to release file handles
        if hasattr(store, '_client'):
            try:
                store._client.clear_system_cache()
            except:
                pass
        
        # Try to delete the collection directly if possible
        if hasattr(store, '_collection') and store._collection:
            try:
                store._collection.delete()
                logger.info(f"✅ Deleted ChromaDB collection for bot {bot_id}")
                return True
            except Exception as e:
                logger.debug(f"Collection deletion failed: {e}")
        
        # If store has any close/clear methods, call them
        for attr_name in ['close', 'clear', 'delete_collection']:
            if hasattr(store, attr_name):
                try:
                    getattr(store, attr_name)()
                    logger.debug(f"✅ Called {attr_name} on Chroma store")
                except Exception as e:
                    logger.debug(f"Could not call {attr_name}: {e}")
                    
    except Exception as e:
        logger.debug(f"Could not cleanly close Chroma store: {e}")
    
    return False

def _force_delete_chroma_directory(bot_id: str, chroma_dir: Path) -> bool:
    """Use multiple aggressive strategies to delete Chroma directory"""
    
    # Force garbage collection to release any remaining references
    gc.collect()
    time.sleep(1)
    
    # Strategy 1: Standard shutil deletion with retries
    max_retries = 3
    for attempt in range(max_retries):
        try:
            shutil.rmtree(chroma_dir)
            logger.info(f"✅ Deleted ChromaDB directory: {chroma_dir}")
            return True
        except (PermissionError, OSError) as e:
            if attempt < max_retries - 1:
                wait_time = (attempt + 1) * 2
                logger.warning(f"⚠️ Standard deletion failed, retrying in {wait_time}s... (attempt {attempt + 1})")
                time.sleep(wait_time)
                gc.collect()
    
    # Strategy 2: Windows-specific forceful deletion
    if platform.system() == "Windows":
        if _windows_force_delete(chroma_dir):
            return True
    
    # Strategy 3: Individual file deletion (more granular)
    if _delete_files_individually(chroma_dir):
        return True
    
    # Strategy 4: Mark for deletion and try on next startup
    logger.error(f"❌ All deletion strategies failed for bot {bot_id}")
    _mark_for_deletion(bot_id)
    return False

def _windows_force_delete(directory: Path) -> bool:
    """Windows-specific forceful directory deletion"""
    try:
        # Use rmdir with /s /q for silent forced deletion
        cmd = f'rmdir /s /q "{directory}"'
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0 or not directory.exists():
            logger.info(f"✅ Windows force-deleted directory: {directory}")
            return True
        else:
            logger.warning(f"⚠️ Windows deletion command failed: {result.stderr}")
            return False
            
    except subprocess.TimeoutExpired:
        logger.error(f"❌ Windows deletion timed out for {directory}")
        return False
    except Exception as e:
        logger.error(f"❌ Windows deletion failed: {e}")
        return False

def _delete_files_individually(directory: Path) -> bool:
    """Delete files individually, which can sometimes work when rmtree fails"""
    try:
        if not directory.exists():
            return True
            
        # Delete all files first
        for file_path in directory.rglob('*'):
            if file_path.is_file():
                try:
                    file_path.unlink()
                except (PermissionError, OSError) as e:
                    logger.debug(f"Could not delete file {file_path}: {e}")
                    # Try with different permissions
                    try:
                        file_path.chmod(0o666)  # Make writable
                        file_path.unlink()
                    except:
                        pass
        
        # Then try to delete empty directories
        for root, dirs, files in os.walk(directory, topdown=False):
            for dir_name in dirs:
                dir_path = Path(root) / dir_name
                try:
                    dir_path.rmdir()
                except:
                    pass
        
        # Final attempt to remove the main directory
        try:
            directory.rmdir()
            logger.info(f"✅ Individual file deletion succeeded: {directory}")
            return True
        except:
            # If we still can't delete the directory, but all files are gone, that's acceptable
            if not any(directory.rglob('*')):
                logger.info(f"✅ All files removed from directory (empty directory remains): {directory}")
                return True
            return False
            
    except Exception as e:
        logger.debug(f"Individual file deletion failed: {e}")
        return False

def _mark_for_deletion(bot_id: str):
    """Mark a bot's vector store for deletion on next startup"""
    try:
        deletion_file = VECTORDIR / "pending_deletions.txt"
        with open(deletion_file, "a") as f:
            f.write(f"{bot_id}\n")
        logger.info(f"📝 Marked bot {bot_id} for deletion on next startup")
    except Exception as e:
        logger.error(f"❌ Failed to mark bot {bot_id} for deletion: {e}")

def cleanup_pending_deletions():
    """Clean up any vector stores marked for deletion from previous runs"""
    try:
        deletion_file = VECTORDIR / "pending_deletions.txt"
        if not deletion_file.exists():
            return
            
        logger.info("🧹 Cleaning up pending vector store deletions...")
        with open(deletion_file, "r") as f:
            bot_ids = [line.strip() for line in f.readlines() if line.strip()]
        
        success_count = 0
        remaining_bots = []
        
        for bot_id in bot_ids:
            try:
                chroma_dir = VECTORDIR / bot_id / "chroma"
                if chroma_dir.exists():
                    # Use the same aggressive deletion for pending cleanups
                    if _force_delete_chroma_directory(bot_id, chroma_dir):
                        success_count += 1
                    else:
                        remaining_bots.append(bot_id)
                else:
                    success_count += 1  # Directory already gone, count as success
            except Exception as e:
                logger.warning(f"⚠️ Could not clean up pending deletion for {bot_id}: {e}")
                remaining_bots.append(bot_id)
        
        # Update or remove the deletion file
        if remaining_bots:
            with open(deletion_file, "w") as f:
                for bot_id in remaining_bots:
                    f.write(f"{bot_id}\n")
            logger.info(f"⚠️ Some deletions pending for next startup ({success_count}/{len(bot_ids)} completed)")
        else:
            deletion_file.unlink()
            logger.info(f"✅ Completed all pending deletions ({success_count} bots)")
            
    except Exception as e:
        logger.error(f"❌ Failed to cleanup pending deletions: {e}")