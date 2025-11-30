# app/rag/core.py - FIXED IMPORTS
from typing import List, Optional, Dict, Any
import logging
import os

# FIXED: Updated imports for newer LangChain versions
from langchain_core.documents import Document
from langchain_core.messages import HumanMessage, SystemMessage

from app.rag.vectorstore import get_vectorstore
from app.rag.loaders import load_paths
from app.rag.retriever import make_retriever
from app.rag.pipeline import build_prompt, build_chain
from app.rag.llm import make_llm
from app.rag.inspection_store import InspectionStore

# ADD DEBUG IMPORTS
from app.config import MONGODB_URI, MONGODB_DB_NAME, APP_ENV
from pymongo import MongoClient

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
    max_chunks_per_bot: int = 100,  # 🎯 NEW: Chunk limit parameter
) -> int:
    # ADD COMPREHENSIVE DEBUG LOGGING FOR DATABASE
    print(f"🔍 INGEST PROCESS - Starting ingest for bot: {bot_id}")
    print(f"🔍 INGEST PROCESS - APP_ENV: {APP_ENV}")
    print(f"🔍 INGEST PROCESS - MONGODB_DB_NAME: {MONGODB_DB_NAME}")
    print(f"🎯 CHUNK LIMIT - Max chunks allowed: {max_chunks_per_bot}")  # 🎯 NEW: Log limit
    
    # Debug: list available databases
    client = MongoClient(MONGODB_URI)
    db_names = client.list_database_names()
    rag_dbs = [db_name for db_name in db_names if 'rag_platform' in db_name]
    print(f"🔍 INGEST PROCESS - Available RAG databases: {rag_dbs}")
    print(f"🔍 INGEST PROCESS - Using database: {MONGODB_DB_NAME}")
    client.close()
    
    # DEBUG: Log what paths we received
    logger.info(f"🔍 DEBUG ingest_files called with paths: {paths}")
    logger.info(f"🔍 DEBUG bot_id: {bot_id}, user_id: {user_id}")
    
    # REMOVE the S3 filtering - let load_paths handle both local and S3
    # Initialize inspection store
    print(f"🔍 INGEST PROCESS - Initializing InspectionStore...")
    inspection_store = InspectionStore()
    print(f"🔍 INGEST PROCESS - InspectionStore using database: {inspection_store.db_name}")
    
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
    print(f"🔍 INGEST PROCESS - Created {len(chunks)} chunks from {len(docs)} documents")

    # 🎯 NEW: Apply chunk limit before processing
    original_chunk_count = len(chunks)
    chunks_truncated = 0
    
    if len(chunks) > max_chunks_per_bot:
        chunks_truncated = len(chunks) - max_chunks_per_bot
        print(f"⚠️ CHUNK LIMIT - Truncating {len(chunks)} chunks to {max_chunks_per_bot} (removed {chunks_truncated} chunks)")
        chunks = chunks[:max_chunks_per_bot]
    else:
        print(f"✅ CHUNK LIMIT - Within limit: {len(chunks)}/{max_chunks_per_bot} chunks")

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
    print(f"🔍 INGEST PROCESS - Saving inspection data for {len(chunks_by_source)} documents")
    for source_path, document_chunks in chunks_by_source.items():
        logger.info(f"🔍 DEBUG Saving inspection data for: {source_path} with {len(document_chunks)} chunks")
        print(f"🔍 INGEST PROCESS - Saving to inspection store: {source_path} ({len(document_chunks)} chunks)")
        
        chunks_data = []
        for i, chunk in enumerate(document_chunks):
            # FIX: Start page numbers from 1 instead of 0
            page_number = chunk.metadata.get("page", None)
            if page_number is not None:
                # If page number exists, ensure it starts from 1
                # Some PDF loaders might return 0-based page numbers
                page_number = page_number + 1 if isinstance(page_number, int) and page_number >= 0 else 1
            else:
                # If no page number, use chunk index + 1
                page_number = i + 1
            
            chunks_data.append({
                "chunk_id": f"{source_path}_{i}",
                "content": chunk.page_content,
                "metadata": chunk.metadata,
                "token_count": len(chunk.page_content.split()),
                "char_count": len(chunk.page_content),
                "chunk_index": i,
                "page_number": page_number,  # FIXED: Now starts from 1
                "source": source_path  # This will now be the S3 key!
            })
        
        # Save to inspection store
        inspection_store.save_inspection_data(
            bot_id=bot_id,
            document_path=source_path,  # 🚨 This will now be the S3 key instead of local path
            chunks_data=chunks_data,
            user_id=user_id,
            tenant_id=tenant_id,
            # 🎯 NEW: Add limit information
            limit_info={
                "max_chunks_per_bot": max_chunks_per_bot,
                "original_chunk_count": original_chunk_count,
                "chunks_after_limiting": len(chunks),
                "chunks_truncated": chunks_truncated
            }
        )

    # Upsert to vector store
    print(f"🔍 INGEST PROCESS - Adding {len(chunks)} chunks to vector store (after limiting)")
    vs = get_vectorstore(bot_id)
    vs.add_documents(chunks)
    
    # 🎯 NEW: Final summary with limit info
    if chunks_truncated > 0:
        print(f"⚠️ INGEST SUMMARY - Limited to {len(chunks)}/{original_chunk_count} chunks ({chunks_truncated} truncated)")
    else:
        print(f"✅ INGEST SUMMARY - Processed all {len(chunks)} chunks (within limit)")
    
    print(f"✅ INGEST PROCESS - Completed successfully for bot: {bot_id}")
    return len(chunks)

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

# python/app/rag/core.py - UPDATE answer_query function
async def answer_query(
    bot_id: str,
    question: str,
    *,
    user_id: Optional[str] = None,
    tenant_id: Optional[str] = None,
    system_message: Optional[str] = None,
    model: Optional[str] = None,
    temperature: Optional[float] = None,
    fallback_to_llm: bool = True,
    include_sources: bool = False
) -> Dict[str, Any]:
    
    logger.info(f"🔍 CORE RAG - Starting query for bot {bot_id}")
    logger.info(f"🎯 Question: {question}")
    
    system_message = system_message or (
        "You are a concise support assistant. Use ONLY the provided context. "
        "If the answer is not in the context, say you don't know."
    )

    # Create LLM
    from app.rag.llm import make_llm
    llm = make_llm(model=model, temperature=temperature)
    
    # SIMPLIFIED: Use direct vector store search to avoid retriever issues
    try:
        logger.info("🔍 CORE RAG - Retrieving documents via direct vector store...")
        
        # Direct vector store search - bypass all retriever complexity
        from app.rag.vectorstore import get_vectorstore
        vectorstore = get_vectorstore(bot_id)
        documents = vectorstore.similarity_search(question, k=5)
        
        logger.info(f"🔍 CORE RAG - Retrieved {len(documents)} documents via direct search")
        
        # DEBUG: Log what was actually retrieved
        for i, doc in enumerate(documents):
            source = doc.metadata.get("source", "unknown")
            content_preview = doc.page_content[:100] + "..." if len(doc.page_content) > 100 else doc.page_content
            logger.info(f"🔍 RETRIEVED Doc {i}: source={source}, content='{content_preview}'")
        
        # Check if we have any documents at all
        if not documents:
            logger.warning(f"🔍 CORE RAG - NO documents retrieved for question: {question}")
            if fallback_to_llm:
                logger.info("🔍 CORE RAG - Falling back to general knowledge")
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
        
        # Check if documents are actually relevant
        is_relevant = _check_document_relevance(documents, question)
        
        if not is_relevant:
            logger.warning(f"🔍 CORE RAG - Documents found but not relevant to question: {question}")
            if fallback_to_llm:
                logger.info("🔍 CORE RAG - Falling back to general knowledge due to irrelevance")
                result = _answer_with_llm_only(llm, question, system_message)
                return {
                    "answer": result,
                    "sources": ["general_knowledge"],
                    "source_details": [],
                    "document_count": len(documents),
                    "fallback_used": True
                }
            else:
                return {
                    "answer": "I found some documents but they don't contain relevant information to answer your question.",
                    "sources": [],
                    "source_details": [],
                    "document_count": len(documents),
                    "fallback_used": False
                }
        
        # SIMPLIFIED RAG flow: Build context manually instead of using chain
        logger.info("🔍 CORE RAG - Proceeding with simplified RAG flow")
        
        # Build context from documents
        context = "\n\n".join([doc.page_content for doc in documents])
        
        # Create messages for LLM
        from langchain_core.messages import HumanMessage, SystemMessage
        messages = [
            SystemMessage(content=system_message),
            HumanMessage(content=f"Context:\n{context}\n\nQuestion: {question}")
        ]
        
        # Get answer directly from LLM
        response = llm.invoke(messages)
        answer = response.content
        
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
        
        logger.info(f"🔍 CORE RAG - RAG flow completed successfully with {len(documents)} documents")
        
        return {
            "answer": answer,
            "sources": sources,
            "source_details": source_details,
            "document_count": len(documents),
            "fallback_used": False
        }
        
    except Exception as e:
        logger.error(f"🔍 CORE RAG - Error in answer_query: {e}")
        import traceback
        logger.error(f"🔍 CORE RAG - Traceback: {traceback.format_exc()}")
        
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

# ADD THIS NEW FUNCTION for better relevance checking
def _check_document_relevance(documents: List[Document], question: str) -> bool:
    """Check if retrieved documents are actually relevant to the question"""
    if not documents:
        return False
    
    question_lower = question.lower()
    
    # Check if any document contains keywords from the question
    relevant_keywords = []
    for keyword in question_lower.split():
        if len(keyword) > 3:  # Only check meaningful words
            relevant_keywords.append(keyword)
    
    for doc in documents:
        content_lower = doc.page_content.lower()
        
        # Check if document contains question keywords
        keyword_matches = sum(1 for keyword in relevant_keywords if keyword in content_lower)
        
        # If at least 2 keywords match, consider it relevant
        if keyword_matches >= 2:
            logger.info(f"🔍 RELEVANCE CHECK - Document relevant: {keyword_matches} keyword matches")
            return True
        
        # Check for specific patterns in financial documents
        financial_terms = ['trade', 'market', 'stock', 'price', 'volume', 'option', 'sell', 'buy']
        if any(term in content_lower for term in financial_terms) and any(term in question_lower for term in financial_terms):
            logger.info("🔍 RELEVANCE CHECK - Document relevant: financial terms match")
            return True
    
    logger.warning("🔍 RELEVANCE CHECK - No documents found to be relevant")
    return False


# Add to your app/rag/core.py or create a debug route
@app.route("/api/debug/vectorstore-status")
def debug_vectorstore_status():
    from app.rag.vectorstore import get_vectorstore
    from pymongo import MongoClient
    
    bot_id = request.args.get("bot_id", "6929da21940b144ec2a916c6")  # Your bot ID
    
    try:
        # Check MongoDB connection
        client = MongoClient(MONGODB_URI)
        db = client[MONGODB_DB_NAME]
        collections = db.list_collection_names()
        
        # Check vector store
        vectorstore = get_vectorstore(bot_id)
        test_docs = vectorstore.similarity_search("test", k=1)
        
        return jsonify({
            "status": "success",
            "database": MONGODB_DB_NAME,
            "collections": collections,
            "vectorstore_documents": len(test_docs),
            "bot_id": bot_id
        })
    except Exception as e:
        return jsonify({"status": "error", "error": str(e)})