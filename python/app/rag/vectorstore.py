# python/app/rag/vectorstore.py - UPDATED FOR PINECONE COMPATIBILITY
from __future__ import annotations

import os
import logging
import shutil
from typing import Callable, Optional, List
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_core.documents import Document
from langchain_core.vectorstores import VectorStore


from __future__ import annotations

import os
import logging
import shutil
from typing import Callable, Optional, List

# Use the community embeddings (the warning is just a deprecation notice)
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_core.documents import Document
from langchain_core.vectorstores import VectorStore

# Conditional imports for Pinecone
try:
    from pinecone import Pinecone, ServerlessSpec
    from langchain_pinecone import PineconeVectorStore
    PINECONE_AVAILABLE = True
except ImportError:
    PINECONE_AVAILABLE = False
    PineconeVectorStore = None

# Add logger definition
logger = logging.getLogger(__name__)


# ---------- Pinecone Configuration ----------
def get_pinecone_client():
    """Initialize Pinecone client"""
    if not PINECONE_AVAILABLE:
        raise ImportError("Pinecone packages not installed. Run: pip install pinecone-client langchain-pinecone")
    
    api_key = os.getenv("PINECONE_API_KEY")
    if not api_key:
        raise ValueError("PINECONE_API_KEY environment variable is required")
    
    return Pinecone(api_key=api_key)

def get_pinecone_index_name(bot_id: str) -> str:
    """Generate Pinecone index name for a bot"""
    # Pinecone index names must be lowercase and alphanumeric, 45 chars max
    index_name = f"bot-{bot_id}".lower().replace('_', '-')
    # Remove any invalid characters and truncate
    index_name = ''.join(c for c in index_name if c.isalnum() or c == '-')[:45]
    return index_name

def ensure_pinecone_index(bot_id: str) -> str:
    """Ensure Pinecone index exists, create if not"""
    pc = get_pinecone_client()
    index_name = get_pinecone_index_name(bot_id)
    
    # Check if index exists
    existing_indexes = [index.name for index in pc.list_indexes()]
    
    if index_name not in existing_indexes:
        # Create new index with HuggingFace dimension (384)
        pc.create_index(
            name=index_name,
            dimension=384,  # 🎯 all-MiniLM-L6-v2 dimension
            metric="cosine",
            spec=ServerlessSpec(
                cloud="aws",
                region="us-east-1"
            )
        )
        logger.info(f"✅ Created Pinecone index: {index_name}")
        # Wait for index to be ready
        import time
        time.sleep(10)
    
    return index_name

def get_pinecone_store(bot_id: str) -> PineconeVectorStore:
    """Get Pinecone vector store for a bot"""
    if not PINECONE_AVAILABLE:
        raise ImportError("Pinecone not available")
    
    index_name = ensure_pinecone_index(bot_id)
    
    return PineconeVectorStore(
        index_name=index_name,
        embedding=get_embeddings(),
        pinecone_api_key=os.getenv("PINECONE_API_KEY")
    )

# ---------- Embeddings (USE HUGGINGFACE) ----------
def get_embeddings():
    """Get the embeddings model"""
    return HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2",
        model_kwargs={'device': 'cpu'},
        encode_kwargs={'normalize_embeddings': False}
    )

# ---------- Local backends (keep for compatibility) ----------
def get_chroma_store(bot_id: str):
    """Fallback to Chroma if Pinecone not available"""
    from langchain_community.vectorstores import Chroma
    from pathlib import Path
    
    REPO_ROOT = Path(__file__).resolve().parents[2]
    VECTORDIR = (REPO_ROOT / "data" / "vectordb").resolve()
    VECTORDIR.mkdir(parents=True, exist_ok=True)
    
    persist_dir = (VECTORDIR / bot_id / "chroma")
    persist_dir.mkdir(parents=True, exist_ok=True)
    return Chroma(
        collection_name=f"bot_{bot_id}",
        embedding_function=get_embeddings(),
        persist_directory=persist_dir.as_posix(),
    )

class LazyFaissStore:
    """Fallback FAISS store"""
    def __init__(self, bot_id: str):
        self.bot_id = bot_id
        self._store = None

    def add_documents(self, docs: List[Document]):
        from langchain_community.vectorstores import FAISS
        from pathlib import Path
        
        if not docs:
            return
            
        if self._store is None:
            self._store = FAISS.from_documents(docs, get_embeddings())
        else:
            self._store.add_documents(docs)
        self.persist()

    def persist(self):
        if self._store is None:
            return
        from pathlib import Path
        
        REPO_ROOT = Path(__file__).resolve().parents[2]
        VECTORDIR = (REPO_ROOT / "data" / "vectordb").resolve()
        out_dir = VECTORDIR / self.bot_id / "faiss"
        out_dir.mkdir(parents=True, exist_ok=True)
        self._store.save_local(out_dir.as_posix())

    def as_retriever(self, **kwargs):
        if self._store is None:
            # Try to load existing
            from langchain_community.vectorstores import FAISS
            from pathlib import Path
            
            REPO_ROOT = Path(__file__).resolve().parents[2]
            VECTORDIR = (REPO_ROOT / "data" / "vectordb").resolve()
            out_dir = VECTORDIR / self.bot_id / "faiss"
            
            if (out_dir / "index.faiss").exists():
                self._store = FAISS.load_local(
                    out_dir.as_posix(),
                    get_embeddings(),
                    allow_dangerous_deserialization=True,
                )
        
        if self._store is None:
            from langchain_core.documents import Document
            class EmptyRetriever:
                def invoke(self, _q: str) -> List[Document]:
                    return []
                def get_relevant_documents(self, _q: str) -> List[Document]:
                    return []
            return EmptyRetriever()
            
        return self._store.as_retriever(**kwargs)

def get_faiss_store(bot_id: str) -> LazyFaissStore:
    return LazyFaissStore(bot_id)

# ---------- Updated Backend Registry ----------
_BACKENDS: dict[str, Callable[[str], object]] = {
    "chroma": get_chroma_store,
    "faiss": get_faiss_store,
}

# Add Pinecone to backends if available
if PINECONE_AVAILABLE:
    _BACKENDS["pinecone"] = get_pinecone_store
else:
    logger.warning("Pinecone not available. Install with: pip install pinecone-client langchain-pinecone")

def _resolve_backend_name(override: Optional[str] = None) -> str:
    name = (override or os.getenv("RAG_VECTOR_BACKEND") or "pinecone" if PINECONE_AVAILABLE else "chroma").strip().lower()
    if name not in _BACKENDS:
        raise ValueError(f"Unknown vector backend '{name}'. Supported: {', '.join(_BACKENDS)}")
    return name

def get_vectorstore(bot_id: str, backend: str = None) -> object:
    """Get vector store for a specific bot using the backend registry"""
    backend_name = _resolve_backend_name(backend)
    store_factory = _BACKENDS[backend_name]
    return store_factory(bot_id)

# ---------- Simplified Deletion for Pinecone ----------
def delete_vectorstore(bot_id: str) -> bool:
    """
    Delete vector store for a bot
    """
    try:
        backend_name = _resolve_backend_name()
        
        if backend_name == "pinecone" and PINECONE_AVAILABLE:
            pc = get_pinecone_client()
            index_name = get_pinecone_index_name(bot_id)
            
            # Check if index exists
            existing_indexes = [index.name for index in pc.list_indexes()]
            
            if index_name in existing_indexes:
                # Delete the entire index
                pc.delete_index(index_name)
                logger.info(f"✅ Deleted Pinecone index: {index_name}")
            else:
                logger.info(f"ℹ️ No Pinecone index found for bot {bot_id}")
            
            return True
            
        else:
            # Fallback to local deletion for Chroma/FAISS
            from pathlib import Path
            REPO_ROOT = Path(__file__).resolve().parents[2]
            VECTORDIR = (REPO_ROOT / "data" / "vectordb").resolve()
            
            if backend_name == "chroma":
                chroma_dir = VECTORDIR / bot_id / "chroma"
                if chroma_dir.exists():
                    shutil.rmtree(chroma_dir)
                    logger.info(f"✅ Deleted ChromaDB directory: {chroma_dir}")
                return True
                
            elif backend_name == "faiss":
                faiss_dir = VECTORDIR / bot_id / "faiss"
                if faiss_dir.exists():
                    shutil.rmtree(faiss_dir)
                    logger.info(f"✅ Deleted FAISS directory: {faiss_dir}")
                return True
            else:
                logger.warning(f"⚠️ Unknown backend {backend_name}")
                return True
            
    except Exception as e:
        logger.error(f"❌ Failed to delete vector store for bot {bot_id}: {e}")
        return True

# ---------- File-specific deletion ----------
def delete_files_from_vectorstore(vectorstore, file_paths: List[str]) -> int:
    """
    Delete specific files from vector store by their source metadata
    """
    try:
        deleted_count = 0
        
        # For Pinecone
        if PINECONE_AVAILABLE and isinstance(vectorstore, PineconeVectorStore):
            # Pinecone deletion by metadata filter
            for file_path in file_paths:
                try:
                    # Get all documents with matching source
                    results = vectorstore.similarity_search(
                        query=" ",  # Empty query
                        filter={"source": file_path},
                        k=1000  # Large number to get all matches
                    )
                    
                    if results:
                        # Extract IDs and delete
                        ids_to_delete = []
                        for doc in results:
                            if hasattr(doc, 'metadata') and 'id' in doc.metadata:
                                ids_to_delete.append(doc.metadata['id'])
                        
                        if ids_to_delete:
                            vectorstore.delete(ids=ids_to_delete)
                            deleted_count += len(ids_to_delete)
                            logger.info(f"✅ Deleted {len(ids_to_delete)} documents for file: {file_path}")
                            
                except Exception as e:
                    logger.warning(f"⚠️ Error deleting file {file_path}: {e}")
                    continue
                    
        else:
            # Local vector store deletion (Chroma/FAISS)
            all_docs = vectorstore.get()
            
            if not all_docs or 'metadatas' not in all_docs:
                return 0
            
            ids_to_delete = []
            for i, metadata in enumerate(all_docs['metadatas']):
                if metadata and 'source' in metadata:
                    source_path = metadata['source']
                    
                    for file_path in file_paths:
                        source_filename = source_path.split('/')[-1] if '/' in source_path else source_path
                        target_filename = file_path.split('/')[-1] if '/' in file_path else file_path
                        
                        if (source_path == file_path or
                            source_filename == target_filename or
                            source_path.endswith(file_path) or
                            file_path in source_path):
                            
                            ids_to_delete.append(all_docs['ids'][i])
                            deleted_count += 1
                            break
            
            if ids_to_delete:
                vectorstore.delete(ids=ids_to_delete)
                logger.info(f"✅ Deleted {len(ids_to_delete)} documents from vector store")
        
        return deleted_count
        
    except Exception as e:
        logger.error(f"❌ Error deleting files from vector store: {e}")
        return 0

# Remove cleanup functions that are not needed for Pinecone
def cleanup_pending_deletions():
    """No-op for Pinecone, kept for API compatibility"""
    logger.info("✅ Pinecone vector store - no pending deletions to cleanup")