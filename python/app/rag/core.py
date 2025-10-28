# app/rag/core.py

from typing import List, Optional, Dict, Any
import logging
import os
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

def extract_s3_key_from_url(s3_url: str) -> str:
    """Extract the S3 key from an S3 URL"""
    if s3_url.startswith('https://'):
        # Format: https://bucket-name.s3.region.amazonaws.com/key
        parts = s3_url.replace('https://', '').split('/')
        if len(parts) > 1:
            return '/'.join(parts[1:])  # Return everything after bucket name
    return s3_url  # Fallback to original

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
    
    # 🎯 CRITICAL: Track original S3 URLs to S3 key mapping
    s3_url_to_key = {}
    for path in paths:
        if path.startswith('https://') and 'amazonaws.com' in path:
            s3_key = extract_s3_key_from_url(path)
            s3_url_to_key[path] = s3_key
            logger.info(f"🔍 DEBUG Mapped S3 URL to key: {path} -> {s3_key}")
    
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
        
        # 🎯 CRITICAL FIX: Update source to use S3 key if available
        current_source = md.get("source", "uploaded")
        if current_source in s3_url_to_key:
            # If source is an S3 URL, replace it with the S3 key
            md["source"] = s3_url_to_key[current_source]
            md["s3_key"] = s3_url_to_key[current_source]
            logger.info(f"🔍 DEBUG Updated source from {current_source} to {s3_url_to_key[current_source]}")
        elif any(s3_url in current_source for s3_url in s3_url_to_key.keys()):
            # If source contains an S3 URL (like a temp path derived from S3), use the S3 key
            for s3_url, s3_key in s3_url_to_key.items():
                if s3_url in current_source:
                    md["source"] = s3_key
                    md["s3_key"] = s3_key
                    logger.info(f"🔍 DEBUG Replaced S3 URL in source: {current_source} -> {s3_key}")
                    break
        else:
            # For local files, use filename as source
            md.setdefault("source", os.path.basename(current_source) if current_source != "uploaded" else "uploaded")
        
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
                "source": source_path  # This will now be the S3 key!
            })
        
        # Save to inspection store
        inspection_store.save_inspection_data(
            bot_id=bot_id,
            document_path=source_path,  # 🚨 This will now be the S3 key instead of local path
            chunks_data=chunks_data,
            user_id=user_id,
            tenant_id=tenant_id
        )

    # Upsert to vector store
    vs = get_vectorstore(bot_id)
    vs.add_documents(chunks)
    
    return len(chunks)



# python/app/rag/core.py - FIX the answer_query function
async def answer_query(
    bot_id: str,
    question: str,
    *,
    user_id: Optional[str] = None,
    tenant_id: Optional[str] = None,
    system_message: Optional[str] = None,
    fallback_to_llm: bool = True,
    include_sources: bool = False
) -> Dict[str, Any]:
    
    logger.info(f"🔍 CORE RAG - Starting query for bot {bot_id}, user {user_id}, tenant {tenant_id}")
    
    system_message = system_message or (
        "You are a concise support assistant. Use ONLY the provided context. "
        "If the answer is not in the context, say you don't know."
    )

    # Build components with DEBUGGING
    from app.rag.retriever import make_retriever, debug_retrieval
    
    # Test retrieval directly first to see if it works
    logger.info("🔍 CORE RAG - Testing retrieval directly...")
    retrieval_test = debug_retrieval(
        bot_id=bot_id,
        query=question,
        user_id=user_id,
        tenant_id=tenant_id
    )
    logger.info(f"🔍 CORE RAG - Direct retrieval test result:")
    logger.info(f"   Success: {retrieval_test['success']}")
    logger.info(f"   Documents found: {retrieval_test['documents_found']}")
    logger.info(f"   Retriever info: {retrieval_test.get('retriever_info', {})}")
    
    if retrieval_test['success'] and retrieval_test['documents_found'] > 0:
        for i, doc in enumerate(retrieval_test['documents']):
            logger.info(f"   Doc {i+1}: {doc['content_preview'][:100]}...")
            logger.info(f"   Metadata: {doc['metadata']}")

    # Now create the actual retriever
    logger.info("🔍 CORE RAG - Creating retriever for main flow...")
    retriever = make_retriever(bot_id, user_id=user_id, tenant_id=tenant_id)
    
    # Log retriever configuration
    retriever_info = retriever.retriever_instance.get_retrieval_info()
    logger.info(f"🔍 CORE RAG - Retriever configuration:")
    logger.info(f"   Bot ID: {retriever_info['bot_id']}")
    logger.info(f"   User ID: {retriever_info['user_id']}")
    logger.info(f"   User Scope: {retriever_info['user_scope']}")
    logger.info(f"   Tenant ID: {retriever_info['tenant_id']}")
    logger.info(f"   Supports native filtering: {retriever_info['supports_native_filtering']}")
    
    llm = make_llm()
    
    # Try to retrieve relevant documents
    try:
        # Get documents for source tracking
        logger.info("🔍 CORE RAG - Retrieving documents...")
        if callable(retriever):
            documents = retriever(question)
        else:
            documents = retriever.get_relevant_documents(question)
            
        logger.info(f"🔍 CORE RAG - Retrieved {len(documents)} documents")
        
        # Log each document found
        for i, doc in enumerate(documents):
            logger.info(f"🔍 CORE RAG - Document {i+1}:")
            logger.info(f"   Content: {doc.page_content[:200]}...")
            logger.info(f"   Metadata: {doc.metadata}")
            logger.info(f"   Bot ID in metadata: {doc.metadata.get('bot_id')}")
            logger.info(f"   User Scope in metadata: {doc.metadata.get('user_scope')}")
        
        # Check if we have sufficient context
        context_sufficient = documents and not _is_context_insufficient(documents, question)
        logger.info(f"🔍 CORE RAG - Context sufficient: {context_sufficient}")
        
        if not context_sufficient:
            logger.warning(f"🔍 CORE RAG - Insufficient context for question: {question}")
            logger.info(f"   Documents available: {len(documents)}")
            if documents:
                logger.info(f"   Document content samples:")
                for i, doc in enumerate(documents):
                    logger.info(f"     Doc {i}: {doc.page_content[:100]}...")
            
            if fallback_to_llm:
                logger.info("🔍 CORE RAG - Falling back to general knowledge due to insufficient context")
                result = _answer_with_llm_only(llm, question, system_message)
                return {
                    "answer": result,
                    "sources": ["general_knowledge"],
                    "source_details": [],
                    "document_count": 0,
                    "fallback_used": True
                }
            else:
                return {
                    "answer": "I don't have enough information in my knowledge base to answer this question.",
                    "sources": [],
                    "source_details": [],
                    "document_count": 0,
                    "fallback_used": False
                }
        
        # Normal RAG flow with actual documents
        logger.info("🔍 CORE RAG - Proceeding with RAG flow using retrieved documents")
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
            
            # Detailed source information
            source_details = [
                {
                    "source": doc.metadata.get("source", "unknown"),
                    "user_scope": doc.metadata.get("user_scope", "unknown"),
                    "tenant_id": doc.metadata.get("tenant_id", "unknown"),
                    "content_preview": doc.page_content[:100] + "..." if len(doc.page_content) > 100 else doc.page_content,
                    "relevance_score": getattr(doc, 'score', None)
                }
                for doc in documents
            ]
        
        logger.info(f"🔍 CORE RAG - RAG flow completed successfully")
        logger.info(f"   Answer length: {len(answer)}")
        logger.info(f"   Sources: {sources}")
        logger.info(f"   Document count: {len(documents)}")
        
        return {
            "answer": answer,
            "sources": sources,
            "source_details": source_details,
            "document_count": len(documents),
            "fallback_used": False
        }
        
    except Exception as e:
        logger.error(f"🔍 CORE RAG - Error in answer_query: {e}")
        if fallback_to_llm:
            logger.info("🔍 CORE RAG - Falling back to LLM due to error")
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
        logger.info("🔍 CONTEXT CHECK - No documents found")
        return True
    
    logger.info(f"🔍 CONTEXT CHECK - Found {len(documents)} documents, using them")
    
    # For debugging
    for i, doc in enumerate(documents):
        logger.info(f"🔍 CONTEXT CHECK - Doc {i} preview: {doc.page_content[:100]}...")
    
    # Always try to use the documents we found
    # Let the LLM decide if they're relevant
    return False