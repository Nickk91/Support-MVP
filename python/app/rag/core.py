# app/rag/core.py

from typing import List, Optional, Dict, Any
import logging
from langchain.schema import Document, HumanMessage, SystemMessage

from app.rag.vectorstore import get_vectorstore
from app.rag.loaders import load_paths
from app.rag.retriever import make_retriever
from app.rag.pipeline import build_prompt, build_chain
from app.rag.llm import make_llm
from app.rag.inspection_store import InspectionStore

logger = logging.getLogger(__name__)

def is_s3_url(path: str) -> bool:
    """Check if the path is an S3 URL that should be skipped."""
    s3_indicators = [
        'https://', 
        '.s3.amazonaws.com',
        '.s3.',
        's3://'
    ]
    return any(indicator in path for indicator in s3_indicators)

def ingest_files(
    bot_id: str,
    paths: List[str],
    *,
    user_id: Optional[str] = None,
    tenant_id: Optional[str] = None,
    chunk_size: int = 800,
    chunk_overlap: int = 120,
) -> int:
    # DEBUG: Log what paths we received
    logger.info(f"🔍 DEBUG ingest_files called with paths: {paths}")
    logger.info(f"🔍 DEBUG bot_id: {bot_id}, user_id: {user_id}")
    
    # REMOVE the S3 filtering - let load_paths handle both local and S3
    # Initialize inspection store
    inspection_store = InspectionStore()
    
    # Load documents - this will handle both local paths and S3 URLs
    docs = load_paths(paths)
    
    # DEBUG: Log what documents were loaded and their metadata
    logger.info(f"🔍 DEBUG Loaded {len(docs)} documents")
    for i, doc in enumerate(docs):
        logger.info(f"🔍 DEBUG Doc {i}: source={doc.metadata.get('source')}, metadata={doc.metadata}")
    
    # Create splitter
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ". ", " ", ""]
    )
        
    chunks = splitter.split_documents(docs)

    # Scope metadata
    scope = f"user:{user_id}" if user_id else "global"
    for ch in chunks:
        md = ch.metadata or {}
        md.setdefault("bot_id", bot_id)
        md.setdefault("user_scope", scope)
        md.setdefault("source", md.get("source", "uploaded"))
        if tenant_id:
            md.setdefault("tenant_id", tenant_id)
        ch.metadata = md

    # Group chunks by their source document
    chunks_by_source = {}
    for chunk in chunks:
        source = chunk.metadata.get("source", "unknown")
        if source not in chunks_by_source:
            chunks_by_source[source] = []
        chunks_by_source[source].append(chunk)
    
    # DEBUG: Log what sources we found
    logger.info(f"🔍 DEBUG Found chunks from sources: {list(chunks_by_source.keys())}")
    
    # Save inspection data for each document
    for source_path, document_chunks in chunks_by_source.items():
        logger.info(f"🔍 DEBUG Saving inspection data for: {source_path} with {len(document_chunks)} chunks")
        
        chunks_data = []
        for i, chunk in enumerate(document_chunks):
            chunks_data.append({
                "chunk_id": f"{source_path}_{i}",
                "content": chunk.page_content,
                "metadata": chunk.metadata,
                "token_count": len(chunk.page_content.split()),
                "char_count": len(chunk.page_content),
                "chunk_index": i,
                "page_number": chunk.metadata.get("page", None),
                "source": source_path
            })
        
        # Save to inspection store
        inspection_store.save_inspection_data(
            bot_id=bot_id,
            document_path=source_path,  # Use the actual source path from metadata
            chunks_data=chunks_data,
            user_id=user_id,
            tenant_id=tenant_id
        )

    # Upsert to vector store
    vs = get_vectorstore(bot_id)
    vs.add_documents(chunks)
    
    return len(chunks)

# UPDATE answer_query function to accept tenant_id
async def answer_query(
    bot_id: str,
    question: str,
    *,
    user_id: Optional[str] = None,
    tenant_id: Optional[str] = None,  # ADD tenant_id parameter
    system_message: Optional[str] = None,
    fallback_to_llm: bool = True,
    include_sources: bool = False
) -> Dict[str, Any]:
    """Answer a question using RAG, with optional fallback to pure LLM"""
    
    system_message = system_message or (
        "You are a concise support assistant. Use ONLY the provided context. "
        "If the answer is not in the context, say you don't know."
    )

    # Build components - PASS tenant_id to retriever
    retriever = make_retriever(bot_id, user_id=user_id, tenant_id=tenant_id)
    llm = make_llm()
    
    # Try to retrieve relevant documents
    try:
        # Get documents for source tracking (regardless of fallback)
        if callable(retriever):
            documents = retriever(question)
        else:
            documents = retriever.get_relevant_documents(question)
            
        logger.info(f"Retrieved {len(documents)} documents")
        
        # TEMPORARY: Bypass the guardrail completely for testing - REMOVE THIS LATER
        if fallback_to_llm:
            print("🔍 DEBUG: Using pure LLM fallback for testing")
            result = _answer_with_llm_only(llm, question, system_message)
            return {
                "answer": result,
                "sources": ["general_knowledge"],
                "source_details": [],
                "document_count": 0,
                "fallback_used": True
            }
        
        # Normal RAG flow
        prompt = build_prompt(system_message)
        chain = build_chain(llm, prompt, retriever)
        answer = chain.invoke({"question": question})
        
        # Source information
        sources = []
        source_details = []
        
        if documents:
            # Get unique source files
            source_files = list(set([
                doc.metadata.get("source", "unknown") 
                for doc in documents 
                if doc.metadata.get("source")
            ]))
            sources = source_files
            
            # Detailed source information - INCLUDE tenant_id in response
            source_details = [
                {
                    "source": doc.metadata.get("source", "unknown"),
                    "user_scope": doc.metadata.get("user_scope", "unknown"),
                    "tenant_id": doc.metadata.get("tenant_id", "unknown"),  # ADD tenant_id to source details
                    "content_preview": doc.page_content[:100] + "..." if len(doc.page_content) > 100 else doc.page_content,
                    "relevance_score": getattr(doc, 'score', None)  # If available
                }
                for doc in documents
            ]
        
        return {
            "answer": answer,
            "sources": sources,
            "source_details": source_details,
            "document_count": len(documents),
            "fallback_used": False
        }
        
    except Exception as e:
        logger.error(f"Error in answer_query: {e}")
        if fallback_to_llm:
            return {
                "answer": _answer_with_llm_only(llm, question, system_message),
                "sources": ["general_knowledge"],
                "source_details": [],
                "document_count": 0,
                "fallback_used": True
            }
        raise

# KEEP _answer_with_llm_only but update return handling
def _answer_with_llm_only(llm, question: str, system_message: Optional[str] = None):
    """Answer using LLM only without RAG context"""
    # Use a DIFFERENT system message for fallback mode
    fallback_system_message = "You are a helpful assistant. Answer the user's question based on your general knowledge."
    
    messages = [
        SystemMessage(content=fallback_system_message),
        HumanMessage(content=question)
    ]
    
    try:
        # Use sync invoke instead of async ainvoke
        response = llm.invoke(messages)
        return response.content
    except Exception as e:
        logger.error(f"Error in _answer_with_llm_only: {e}")
        return f"Error: {e}"

# KEEP _is_context_insufficient function as is
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