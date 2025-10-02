from typing import Tuple, List
from langchain_openai import ChatOpenAI
from langchain.schema import Document
from langchain.prompts import ChatPromptTemplate
from .retriever import get_retriever
from .config import CHAT_MODEL

SYSTEM = """You are Ragmate, a helpful support assistant.
Use ONLY the provided context to answer. If the answer isn’t in context, say you don’t know and offer to escalate.
Be concise, friendly, and cite sources by filename.
"""

PROMPT = ChatPromptTemplate.from_messages([
    ("system", SYSTEM),
    ("human", "Question: {question}\n\nContext:\n{context}\n\nAnswer:")
])

def format_context(docs: List[Document]) -> str:
    out = []
    for d in docs:
        src = d.metadata.get("source") or d.metadata.get("file_path") or "doc"
        out.append(f"[{src}]\n{d.page_content}")
    return "\n\n".join(out)

def chat_for_bot(bot_id: str, message: str, top_k: int = 4) -> Tuple[str, List[str]]:
    retriever = get_retriever(bot_id, k=top_k)
    if retriever is None:
        return ("No knowledge base is available for this bot yet.", [])

    docs = retriever.get_relevant_documents(message)
    ctx = format_context(docs)
    llm = ChatOpenAI(model=CHAT_MODEL, temperature=0.2)
    prompt = PROMPT.format_messages(question=message, context=ctx)
    resp = llm.invoke(prompt)
    # Collect simple source names
    sources = []
    for d in docs:
        src = d.metadata.get("source") or d.metadata.get("file_path") or "doc"
        sources.append(src)
    return resp.content, sources
