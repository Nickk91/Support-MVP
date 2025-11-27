# python/app/rag/vectorstore.py - FIXED VERSION
from __future__ import annotations

import os
import logging
import shutil
import time
from typing import Callable, Optional, List

# Switch to OpenAI embeddings for memory efficiency
from langchain_openai import OpenAIEmbeddings
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
# In app/rag/vectorstore.py - update the Pinecone functions

def get_pinecone_client():
    """Initialize Pinecone client with new SDK"""
    if not PINECONE_AVAILABLE:
        raise ImportError("Pinecone packages not installed. Run: pip install pinecone-client langchain-pinecone")
    
    api_key = os.getenv("PINECONE_API_KEY")
    if not api_key:
        raise ValueError("PINECONE_API_KEY environment variable is required")
    
    return Pinecone(api_key=api_key)

def ensure_pinecone_index(index_name: str = "rag-platform"):
    """Ensure Pinecone index exists with correct dimensions for OpenAI"""
    pc = get_pinecone_client()
    
    # Check if index exists - new SDK format
    existing_indexes = pc.list_indexes()
    index_names = [index.name for index in existing_indexes.indexes] if hasattr(existing_indexes, 'indexes') else []
    
    if index_name not in index_names:
        # Create new index with OpenAI dimension (1536)
        pc.create_index(
            name=index_name,
            dimension=1536,  # 🎯 OpenAI embedding dimension
            metric="cosine",
            spec=ServerlessSpec(
                cloud="aws",
                region="us-east-1"
            )
        )
        logger.info(f"✅ Created Pinecone index: {index_name}")
        # Wait for index to be ready
        while True:
            try:
                index_description = pc.describe_index(index_name)
                if hasattr(index_description, 'status') and index_description.status.ready:
                    break
                time.sleep(1)
            except Exception:
                time.sleep(1)
        logger.info(f"✅ Pinecone index '{index_name}' is ready")
    
    return index_name
def get_pinecone_store(bot_id: str):
    """Get Pinecone vector store for a bot using namespaces"""
    index_name = "rag-platform"  # 🎯 SINGLE index for all bots
    namespace = f"bot_{bot_id}"  # 🎯 Use namespace to separate bot data
    
    # Ensure the single index exists with correct dimensions
    ensure_pinecone_index(index_name)
    
    # Initialize with namespace
    embeddings = get_embeddings()
    vector_store = PineconeVectorStore(
        index_name=index_name,
        embedding=embeddings,
        namespace=namespace  # 🎯 CRITICAL: Separate data by bot
    )
    return vector_store

# ---------- Embeddings (SWITCHED TO OPENAI) ----------
def get_embeddings():
    """Get the embeddings model - using OpenAI for memory efficiency"""
    return OpenAIEmbeddings(
        model="text-embedding-3-small",  # Cost-effective and fast
        openai_api_key=os.getenv("OPENAI_API_KEY")
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
    Delete vector store for a bot - for Pinecone, we delete the namespace data
    """
    try:
        backend_name = _resolve_backend_name()
        
        if backend_name == "pinecone" and PINECONE_AVAILABLE:
            # For Pinecone with single index, we delete all vectors in the bot's namespace
            index_name = "rag-platform"
            namespace = f"bot_{bot_id}"
            
            pc = get_pinecone_client()
            index = pc.Index(index_name)
            
            # Delete all vectors in the bot's namespace
            index.delete(delete_all=True, namespace=namespace)
            logger.info(f"✅ Deleted all vectors in namespace '{namespace}' from Pinecone index '{index_name}'")
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

# Remove cleanup functions that are not needed for Pinecone
def cleanup_pending_deletions():
    """No-op for Pinecone, kept for API compatibility"""
    logger.info("✅ Pinecone vector store - no pending deletions to cleanup")

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
            # Note: This might need adjustment based on your specific vector store implementation
            try:
                # Try to get documents using the vector store's internal method
                if hasattr(vectorstore, '_collection'):
                    # ChromaDB approach
                    collection = vectorstore._collection
                    if hasattr(collection, 'get'):
                        all_docs = collection.get()
                        
                        if all_docs and 'metadatas' in all_docs:
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
                                collection.delete(ids=ids_to_delete)
                                logger.info(f"✅ Deleted {len(ids_to_delete)} documents from vector store")
                
                elif hasattr(vectorstore, 'delete'):
                    # Direct deletion method
                    for file_path in file_paths:
                        try:
                            # This is a simplified approach - you might need to adjust based on your vector store
                            vectorstore.delete(filter={"source": file_path})
                            deleted_count += 1
                            logger.info(f"✅ Deleted documents for file: {file_path}")
                        except Exception as e:
                            logger.warning(f"⚠️ Could not delete file {file_path}: {e}")
                            continue
                            
            except Exception as e:
                logger.error(f"❌ Error in file deletion for local vector store: {e}")
        
        return deleted_count
        
    except Exception as e:
        logger.error(f"❌ Error deleting files from vector store: {e}")
        return 0