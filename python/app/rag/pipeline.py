import os
from typing import Tuple
from rag.config import VECTOR_ROOT
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings

def embeddings_model():
    # Local, no-API embedding model
    return HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

def bot_store_paths(bot_id: str) -> Tuple[str, str]:
    """
    Where to persist vector data for a bot.
    """
    base = os.path.abspath(os.path.join(VECTOR_ROOT, bot_id))
    os.makedirs(base, exist_ok=True)
    return base, base  # (persist_directory, collection_name)

def get_vectorstore(bot_id: str) -> Chroma:
    persist_dir, collection = bot_store_paths(bot_id)
    return Chroma(
        collection_name=collection,
        persist_directory=persist_dir,
        embedding_function=embeddings_model(),
    )
