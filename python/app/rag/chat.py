# app/rag/chat.py
from typing import List, Tuple
from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate
from app.rag.retriever import make_retriever
from app.rag.llm import make_llm
from app.config import OPENAI_MODEL

SYSTEM = """You are Ragmate, a helpful support assistant.
Use ONLY the provided context to answer. If the answer isn’t in the context, say you don’t know and offer to escalate.
Be concise, friendly, and cite sources by filename.
"""

PROMPT = ChatPromptTemplate.from_messages([
    ("system", SYSTEM),
    ("human", "Question: {question}\n\nContext:\n{context}\n\nAnswer:")
])


def format_context(docs: List[Document]) -> str:
    """Combine retrieved docs into a readable context string."""
    out = []
    for d in docs:
        src = d.metadata.get("source") or d.metadata.get("file_path") or "doc"
        out.append(f"[{src}]\n{d.page_content}")
    return "\n\n".join(out)


def chat_for_bot(bot_id: str, message: str, top_k: int = 4) -> Tuple[str, List[str]]:
    """Retrieve context and query the LLM for an answer."""
    retriever = make_retriever(bot_id, user_id=None)
    docs = retriever(message)
    ctx = format_context(docs)

    llm = make_llm()
    prompt = PROMPT.format_messages(question=message, context=ctx)
    resp = llm.invoke(prompt)

    # Extract simple source names
    sources = [
        d.metadata.get("source") or d.metadata.get("file_path") or "doc"
        for d in docs
    ]

    return resp.content if hasattr(resp, "content") else str(resp), sources
