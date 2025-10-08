from typing import List, Optional
import logging
from langchain.schema import Document, HumanMessage, SystemMessage

# This should import from your vectorstore module
from app.rag.vectorstore import get_vectorstore
from app.rag.loaders import load_paths
from app.rag.retriever import make_retriever
from app.rag.pipeline import build_prompt, build_chain
from app.rag.llm import make_llm

logger = logging.getLogger(__name__)

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

    # Split - Create splitter directly
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ". ", " ", ""]  # Default separators
    )
        
    chunks = splitter.split_documents(docs)

    # Scope metadata
    scope = f"user:{user_id}" if user_id else "global"
    for ch in chunks:
        md = ch.metadata or {}
        md.setdefault("bot_id", bot_id)
        md.setdefault("user_scope", scope)
        md.setdefault("source", md.get("source", "uploaded"))
        ch.metadata = md

    # Upsert to vector store - FIX: Use the correct function signature
    vs = get_vectorstore(bot_id)
    vs.add_documents(chunks)
    
    # Persist if available
    if hasattr(vs, "persist"):
        try:
            vs.persist()
        except Exception:
            pass

    return len(chunks)

async def answer_query(
    bot_id: str,
    question: str,
    *,
    user_id: Optional[str] = None,
    system_message: Optional[str] = None,
    fallback_to_llm: bool = True
) -> str:
    """Answer a question using RAG, with optional fallback to pure LLM"""
    
    system_message = system_message or (
        "You are a concise support assistant. Use ONLY the provided context. "
        "If the answer is not in the context, say you don't know."
    )

    # Build components
    retriever = make_retriever(bot_id, user_id=user_id)
    llm = make_llm()
    
    # DEBUG: More detailed logging
    print(f"🔍 DEBUG: Using LLM: {type(llm)}")
    print(f"🔍 DEBUG: Original system_message: {system_message}")
    print(f"🔍 DEBUG: Fallback enabled: {fallback_to_llm}")
    
    # Try to retrieve relevant documents
    try:
        # FIX: Check if retriever is callable (function) or already a retriever object
        if callable(retriever):
            documents = retriever(question)  # It's a function
        else:
            documents = retriever.get_relevant_documents(question)  # It's an object
            
        print(f"🔍 DEBUG: Retrieved {len(documents)} documents")
        
        # TEMPORARY: Bypass the guardrail completely for testing
        if fallback_to_llm:
             print("🔍 DEBUG: Bypassing guardrail, using pure LLM")
             result = _answer_with_llm_only(llm, question, system_message)  # Remove await
             print(f"🔍 DEBUG: LLM response: {result}")
             return result
        
        # Proceed with normal RAG flow
        prompt = build_prompt(system_message)
        chain = build_chain(llm, prompt, retriever)
        result = chain.invoke({"question": question})
        return result
        
    except Exception as e:
        print(f"🔍 DEBUG: Error occurred: {e}")
        # Fallback to LLM on error too
        if fallback_to_llm:
            print("🔍 DEBUG: Error fallback to LLM")
            return await _answer_with_llm_only(llm, question, system_message)
        raise

def _answer_with_llm_only(llm, question: str, system_message: Optional[str] = None):
    """Answer using LLM only without RAG context"""
    # Use a DIFFERENT system message for fallback mode
    fallback_system_message = "You are a helpful assistant. Answer the user's question based on your general knowledge."
    
    print(f"🔍 DEBUG: Fallback system_message: {fallback_system_message}")
    print(f"🔍 DEBUG: Fallback question: {question}")
    
    messages = [
        SystemMessage(content=fallback_system_message),
        HumanMessage(content=question)
    ]
    
    try:
        # Use sync invoke instead of async ainvoke
        response = llm.invoke(messages)
        print(f"🔍 DEBUG: OpenAI raw response type: {type(response)}")
        print(f"🔍 DEBUG: OpenAI raw response: {response}")
        return response.content
    except Exception as e:
        print(f"🔍 DEBUG: Error in _answer_with_llm_only: {e}")
        import traceback
        traceback.print_exc()
        return f"Error: {e}"

def _is_context_insufficient(documents: List[Document], question: str) -> bool:
    """Determine if retrieved context is insufficient for the question"""
    if not documents:
        return True
        
    # Simple heuristic: if all documents are very short or don't contain question keywords
    total_content = " ".join([doc.page_content for doc in documents])
    question_keywords = set(question.lower().split())
    content_keywords = set(total_content.lower().split())
    
    # If less than 30% of question keywords appear in context, consider it insufficient
    matching_keywords = question_keywords.intersection(content_keywords)
    match_ratio = len(matching_keywords) / len(question_keywords) if question_keywords else 0
    
    return match_ratio < 0.3