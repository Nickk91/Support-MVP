# app/rag/core.py
from typing import List, Optional

from app.rag.stores import get_vectorstore
from app.rag.loaders import load_paths
from app.rag.retriever import make_retriever
from app.rag.pipeline import build_prompt, build_chain
from app.rag.llm import make_llm
from app.rag.splitters import make_default_splitter


def ingest_files(
    bot_id: str,
    file_paths: List[str],
    *,
    user_id: Optional[str] = None,
    chunk_size: int = 800,
    chunk_overlap: int = 120,
) -> int:
    # Load
    docs = load_paths(file_paths)

    # Split (shared splitter)
    splitter = make_default_splitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
    chunks = splitter.split_documents(docs)

    # Scope metadata
    scope = f"user:{user_id}" if user_id else "global"
    for ch in chunks:
        md = ch.metadata or {}
        md.setdefault("bot_id", bot_id)
        md.setdefault("user_scope", scope)
        md.setdefault("source", md.get("source", "uploaded"))
        ch.metadata = md

    # Upsert to vector store
    vs = get_vectorstore(bot_id)
    vs.add_documents(chunks)
    if hasattr(vs, "persist"):
        # FAISS: save_local happens inside our vectorstore; Chroma: persist() is a no-op if managed
        try:
            vs.persist()
        except Exception:
            pass

    return len(chunks)


def answer_query(
    bot_id: str,
    question: str,
    *,
    user_id: Optional[str] = None,
    system_message: Optional[str] = None,
) -> str:
    system_message = system_message or (
        "You are a concise support assistant. Use ONLY the provided context. "
        "If the answer is not in the context, say you don't know."
    )

    retriever = make_retriever(bot_id, user_id=user_id)
    llm = make_llm()
    prompt = build_prompt(system_message)
    chain = build_chain(llm, prompt, retriever)
    return chain.invoke({"question": question})
