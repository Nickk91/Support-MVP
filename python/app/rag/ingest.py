from pathlib import Path
from typing import List
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
from .config import PERSIST_ROOT, EMBEDDINGS_MODEL
from .loaders import load_docs

def persist_dir_for_bot(bot_id: str) -> str:
    d = Path(PERSIST_ROOT) / bot_id / "chroma"
    d.mkdir(parents=True, exist_ok=True)
    return str(d)

def ingest_files_for_bot(bot_id: str, file_paths: List[str]):
    docs = load_docs(file_paths)
    if not docs:
        return True, 0

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1200, chunk_overlap=150, separators=["\n\n", "\n", " ", ""]
    )
    chunks = splitter.split_documents(docs)
    embeddings = OpenAIEmbeddings(model=EMBEDDINGS_MODEL)

    persist_dir = persist_dir_for_bot(bot_id)
    Chroma.from_documents(chunks, embedding=embeddings, persist_directory=persist_dir)
    return True, len(chunks)


def ingest_files(
    bot_id: str,
    file_paths: List[str],
    *,
    user_id: Optional[str] = None,
    chunk_size: int = 800,
    chunk_overlap: int = 120,
) -> int:
    docs = load_paths(file_paths)
    chunks = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size, chunk_overlap=chunk_overlap
    ).split_documents(docs)

    # Tag scope: "user:<id>" or "global"
    scope = f"user:{user_id}" if user_id else "global"
    for d in chunks:
        d.metadata = {**(d.metadata or {}), "user_scope": scope}

    vs = get_vectorstore(bot_id)
    vs.add_documents(chunks)
    # For Chroma this persists internally; for FAISS your vectorstore wrapper handles saving.
    if hasattr(vs, "persist"):
        vs.persist()
    return len(chunks)