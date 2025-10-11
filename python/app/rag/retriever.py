# app/rag/retriever.py
from typing import Optional, List
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
        self.tenant_id = tenant_id  # ADD tenant_id
        self.k_global = k_global
        self.k_user = k_user
        self.vectorstore = get_vectorstore(bot_id)
        self.user_scope = f"user:{user_id}" if user_id else None
        
    def get_relevant_documents(self, query: str) -> List[Document]:
        """Retrieve documents with secure user scoping AND tenant isolation"""
        
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
    
    def _retrieve_with_post_filtering(self, query: str) -> List[Document]:
        """Fallback method for backends without native filtering - with tenant isolation"""
        # Get larger set then filter locally
        raw_retriever = self.vectorstore.as_retriever(
            search_kwargs={"k": max(self.k_global, self.k_user) * 3}  # Get extra for tenant + scope filtering
        )
        
        docs = raw_retriever.invoke(query)
        
        # Apply tenant filtering FIRST (most important)
        if self.tenant_id:
            docs = [d for d in docs if d.metadata.get("tenant_id") == self.tenant_id]
            logger.info(f"Post-filtering: {len(docs)} docs after tenant filtering for tenant: {self.tenant_id}")
        
        # Apply scope filtering SECOND
        if not self.user_scope:
            # Anonymous user: only global docs (within tenant)
            filtered_docs = [d for d in docs if d.metadata.get("user_scope") == "global"]
        else:
            # Authenticated user: user docs + global docs (within tenant)
            allowed_scopes = {"global", self.user_scope}
            filtered_docs = [d for d in docs if d.metadata.get("user_scope") in allowed_scopes]
        
        # Prioritize user docs, then global docs
        user_docs = [d for d in filtered_docs if d.metadata.get("user_scope") == self.user_scope]
        global_docs = [d for d in filtered_docs if d.metadata.get("user_scope") == "global"]
        
        logger.info(f"Post-filtering: Found {len(user_docs)} user docs, {len(global_docs)} global docs for tenant: {self.tenant_id}, user: {self.user_id}")
        return user_docs[:self.k_user] + global_docs[:self.k_global]
    
    def invoke(self, query: str) -> List[Document]:
        """Alias for get_relevant_documents for compatibility"""
        return self.get_relevant_documents(query)

def make_retriever(bot_id: str, user_id: Optional[str] = None, tenant_id: Optional[str] = None, *, k_global: int = 4, k_user: int = 2):
    """
    Factory function that returns a SecureScopedRetriever instance.
    Maintains backward compatibility with the callable interface.
    """
    retriever = SecureScopedRetriever(
        bot_id=bot_id, 
        user_id=user_id,
        tenant_id=tenant_id,  # ADD tenant_id parameter
        k_global=k_global, 
        k_user=k_user
    )
    
    # Return a callable for backward compatibility
    def retrieve(query: str) -> List[Document]:
        return retriever.get_relevant_documents(query)
    
    return retrieve