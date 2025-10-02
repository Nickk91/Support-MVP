from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
import os

# Persist per-bot under python/data/vectordb/<bot_id>
BASE_DIR = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "..", "data", "vectordb"
)
BASE_DIR = os.path.abspath(BASE_DIR)

def get_vectorstore(bot_id: str) -> Chroma:
    persist_dir = os.path.join(BASE_DIR, bot_id)
    os.makedirs(persist_dir, exist_ok=True)
    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2"
    )
    return Chroma(
        collection_name=f"bot_{bot_id}",
        embedding_function=embeddings,
        persist_directory=persist_dir,
    )
