# app/rag/retriever.py
from typing import Optional, List
from langchain_core.documents import Document
from app.rag.vectorstore import get_vectorstore

def _filter_by_scope(docs: List[Document], user_scope: Optional[str]) -> List[Document]:
    if not user_scope:
        return [d for d in docs if d.metadata.get("user_scope") == "global"]
    allowed = {"global", user_scope}
    return [d for d in docs if d.metadata.get("user_scope") in allowed]

def make_retriever(bot_id: str, user_id: Optional[str], *, k_global=4, k_user=2):
    """
    Returns a callable: lambda question -> List[Document]
    Works for both Chroma (native filters) and FAISS (post-filter).
    """
    vs = get_vectorstore(bot_id)
    raw = vs.as_retriever(search_kwargs={"k": max(k_global, k_user)})

    user_scope = f"user:{user_id}" if user_id else None

    def retrieve(q: str) -> List[Document]:
        # pull a superset then filter/sort locally for FAISS compatibility
        docs = raw.invoke(q)
        scoped = _filter_by_scope(docs, user_scope)
        # crude prioritization: user docs first, then global
        user_docs = [d for d in scoped if d.metadata.get("user_scope") == user_scope]
        global_docs = [d for d in scoped if d.metadata.get("user_scope") == "global"]
        return user_docs[:k_user] + global_docs[:k_global]

    return retrieve
