from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
from .config import PERSIST_ROOT, EMBEDDINGS_MODEL
from pathlib import Path

def get_retriever(bot_id: str, k: int = 4):
    persist_dir = Path(PERSIST_ROOT) / bot_id / "chroma"
    if not persist_dir.exists():
        return None
    embeddings = OpenAIEmbeddings(model=EMBEDDINGS_MODEL)
    vs = Chroma(persist_directory=str(persist_dir), embedding_function=embeddings)
    return vs.as_retriever(search_kwargs={"k": k})
