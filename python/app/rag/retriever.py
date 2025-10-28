# app/rag/retriever.py
from typing import Optional, List, Dict, Any
from langchain_core.documents import Document
from app.rag.vectorstore import get_vectorstore
import logging

logger = logging.getLogger(__name__)

class SecureScopedRetriever:
    """
    Secure retriever that enforces user scoping AND tenant isolation at the database level when possible.
    This is a simple class without Pydantic inheritance to avoid field issues.
    """
    
    def __init__(self, bot_id: str, user_id: Optional[str] = None, tenant_id: Optional[str] = None, k_global: int = 4, k_user: int = 2):
        self.bot_id = bot_id
        self.user_id = user_id
        self.tenant_id = tenant_id
        self.k_global = k_global
        self.k_user = k_user
        self.vectorstore = get_vectorstore(bot_id)
        self.user_scope = f"user:{user_id}" if user_id else None
        
    def get_relevant_documents(self, query: str) -> List[Document]:
        """Retrieve documents with secure user scoping AND tenant isolation"""
        logger.info(f"Retrieving documents for bot {self.bot_id}, tenant {self.tenant_id}, user {self.user_id}")
        
        # Try database-level filtering first (more secure and efficient)
        if self._supports_native_filtering():
            return self._retrieve_with_native_filtering(query)
        else:
            # Fallback to post-filtering for backends without native filtering
            return self._retrieve_with_post_filtering(query)
    
    def _supports_native_filtering(self) -> bool:
        """Check if the vectorstore supports native metadata filtering"""
        # Chroma supports native filtering, FAISS typically doesn't
        backend_type = type(self.vectorstore).__name__.lower()
        return 'chroma' in backend_type
    
    def _retrieve_with_native_filtering(self, query: str) -> List[Document]:
        """Use database-level filtering for maximum security with tenant isolation"""
        try:
            # BASE FILTER: Always filter by tenant_id if provided
            base_filter = {}
            if self.tenant_id:
                base_filter["tenant_id"] = self.tenant_id
                logger.info(f"Applying tenant filter: {self.tenant_id}")
            
            if self.user_scope:
                # For authenticated users: get user docs + global docs (within same tenant)
                user_filter = {**base_filter, "user_scope": self.user_scope}
                global_filter = {**base_filter, "user_scope": "global"}
                
                user_docs = self.vectorstore.similarity_search(
                    query, k=self.k_user, filter=user_filter
                )
                global_docs = self.vectorstore.similarity_search(
                    query, k=self.k_global, filter=global_filter
                )
                
                logger.info(f"Native filtering: Found {len(user_docs)} user docs, {len(global_docs)} global docs for tenant: {self.tenant_id}, user: {self.user_id}")
                return user_docs + global_docs
            else:
                # For unauthenticated users: only global docs (within same tenant)
                global_filter = {**base_filter, "user_scope": "global"}
                global_docs = self.vectorstore.similarity_search(
                    query, k=self.k_global, filter=global_filter
                )
                logger.info(f"Native filtering: Found {len(global_docs)} global docs for tenant: {self.tenant_id}, anonymous user")
                return global_docs
                
        except Exception as e:
            logger.warning(f"Native filtering failed, falling back to post-filtering: {e}")
            return self._retrieve_with_post_filtering(query)
    
    def _fallback_retrieval(self, query: str, base_filter: Dict[str, Any]) -> List[Document]:
        """Simplified fallback retrieval when complex filtering fails"""
        try:
            logger.info("Using fallback retrieval with bot_id only")
            # Try with just bot_id filter
            simple_filter = {"bot_id": self.bot_id}
            docs = self.vectorstore.similarity_search(
                query, k=self.k_global + self.k_user, filter=simple_filter
            )
            
            # Apply post-filtering manually
            filtered_docs = []
            for doc in docs:
                # Check tenant match
                if self.tenant_id and doc.metadata.get("tenant_id") != self.tenant_id:
                    continue
                
                # Check scope match
                if self.user_scope:
                    if doc.metadata.get("user_scope") in [self.user_scope, "global"]:
                        filtered_docs.append(doc)
                else:
                    if doc.metadata.get("user_scope") == "global":
                        filtered_docs.append(doc)
            
            logger.info(f"Fallback retrieval found {len(filtered_docs)} docs after filtering")
            return filtered_docs
            
        except Exception as e:
            logger.error(f"Fallback retrieval also failed: {e}")
            return []
    
    def _retrieve_with_post_filtering(self, query: str) -> List[Document]:
        """Fallback method for backends without native filtering - with tenant isolation"""
        logger.info("Using post-filtering retrieval")
        
        try:
            # Get larger set then filter locally
            search_k = max(self.k_global, self.k_user) * 3
            raw_retriever = self.vectorstore.as_retriever(
                search_kwargs={"k": search_k}
            )
            
            docs = raw_retriever.invoke(query)
            logger.info(f"Raw retrieval found {len(docs)} documents before filtering")
            
            # Apply bot_id filtering FIRST
            docs = [d for d in docs if d.metadata.get("bot_id") == self.bot_id]
            logger.info(f"After bot filtering: {len(docs)} docs")
            
            # Apply tenant filtering SECOND
            if self.tenant_id:
                docs = [d for d in docs if d.metadata.get("tenant_id") == self.tenant_id]
                logger.info(f"After tenant filtering: {len(docs)} docs for tenant: {self.tenant_id}")
            
            # Apply scope filtering THIRD
            if not self.user_scope:
                # Anonymous user: only global docs (within tenant)
                filtered_docs = [d for d in docs if d.metadata.get("user_scope") == "global"]
                logger.info(f"Anonymous user - after scope filtering: {len(filtered_docs)} global docs")
            else:
                # Authenticated user: user docs + global docs (within tenant)
                allowed_scopes = {"global", self.user_scope}
                filtered_docs = [d for d in docs if d.metadata.get("user_scope") in allowed_scopes]
                logger.info(f"Authenticated user - after scope filtering: {len(filtered_docs)} docs")
            
            # Prioritize user docs, then global docs
            user_docs = [d for d in filtered_docs if d.metadata.get("user_scope") == self.user_scope]
            global_docs = [d for d in filtered_docs if d.metadata.get("user_scope") == "global"]
            
            logger.info(f"Post-filtering: Found {len(user_docs)} user docs, {len(global_docs)} global docs")
            
            # Return combined results, prioritizing user docs
            result = user_docs[:self.k_user] + global_docs[:self.k_global]
            logger.info(f"Final result: {len(result)} documents")
            
            return result
            
        except Exception as e:
            logger.error(f"Post-filtering retrieval failed: {e}")
            return []
    
    def invoke(self, query: str) -> List[Document]:
        """Alias for get_relevant_documents for compatibility"""
        return self.get_relevant_documents(query)
    
    def get_retrieval_info(self) -> Dict[str, Any]:
        """Return information about the retriever configuration for debugging"""
        return {
            "bot_id": self.bot_id,
            "user_id": self.user_id,
            "tenant_id": self.tenant_id,
            "user_scope": self.user_scope,
            "k_global": self.k_global,
            "k_user": self.k_user,
            "supports_native_filtering": self._supports_native_filtering(),
            "vectorstore_type": type(self.vectorstore).__name__
        }

def make_retriever(bot_id: str, user_id: Optional[str] = None, tenant_id: Optional[str] = None, *, k_global: int = 4, k_user: int = 2):
    """
    Factory function that returns a SecureScopedRetriever instance.
    Maintains backward compatibility with the callable interface.
    """
    retriever = SecureScopedRetriever(
        bot_id=bot_id, 
        user_id=user_id,
        tenant_id=tenant_id,
        k_global=k_global, 
        k_user=k_user
    )
    
    # Log retriever configuration for debugging
    logger.info(f"Created retriever: {retriever.get_retrieval_info()}")
    
    # Return a callable for backward compatibility
    def retrieve(query: str) -> List[Document]:
        return retriever.get_relevant_documents(query)
    
    # Also attach the retriever instance for debugging
    retrieve.retriever_instance = retriever
    
    return retrieve

# Utility function for debugging retrieval
def debug_retrieval(bot_id: str, query: str, user_id: Optional[str] = None, tenant_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Debug function to test retrieval and return detailed information
    """
    try:
        retriever = make_retriever(bot_id, user_id=user_id, tenant_id=tenant_id)
        documents = retriever(query)
        
        return {
            "success": True,
            "bot_id": bot_id,
            "query": query,
            "user_id": user_id,
            "tenant_id": tenant_id,
            "documents_found": len(documents),
            "retriever_info": retriever.retriever_instance.get_retrieval_info(),
            "documents": [
                {
                    "content_preview": doc.page_content[:200] + "..." if len(doc.page_content) > 200 else doc.page_content,
                    "metadata": doc.metadata,
                    "source": doc.metadata.get("source", "unknown"),
                    "user_scope": doc.metadata.get("user_scope", "unknown"),
                    "tenant_id": doc.metadata.get("tenant_id", "unknown"),
                    "bot_id": doc.metadata.get("bot_id", "unknown")
                }
                for doc in documents
            ]
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "bot_id": bot_id,
            "query": query,
            "user_id": user_id,
            "tenant_id": tenant_id
        }