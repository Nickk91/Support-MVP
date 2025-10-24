import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from pymongo import MongoClient
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

class InspectionStore:
    def __init__(self):
        self._init_mongodb()
    
    def _init_mongodb(self):
        """Initialize MongoDB collections"""
        try:
            # Use the same cloud MongoDB as Node.js
            mongo_uri = os.getenv("MONGODB_URI")
            if not mongo_uri:
                print("⚠️ MONGODB_URI not found in environment variables")
                self.mongo_client = None
                return
                
            self.mongo_client = MongoClient(mongo_uidri)
            self.mongo_db = self.mongo_client.rag_platform
            
            # Create collections if they don't exist
            self.mongo_db.documents.create_index([("bot_id", 1), ("document_path", 1)])
            self.mongo_db.chunks.create_index([("bot_id", 1), ("document_path", 1)])
            self.mongo_db.chunks.create_index([("chunk_index", 1)])
            
            print("✅ MongoDB cloud inspection store initialized")
        except Exception as e:
            print(f"⚠️ MongoDB cloud initialization failed: {e}")
            self.mongo_client = None
    
    def save_inspection_data(
        self, 
        bot_id: str, 
        document_path: str, 
        chunks_data: List[Dict[str, Any]],
        user_id: Optional[str] = None,
        tenant_id: Optional[str] = None
    ):
        """Save inspection data to MongoDB only (no SQLite)"""
        if not self.mongo_client:
            print("❌ MongoDB client not available, skipping save")
            return
        
        try:
            self._save_to_mongodb(bot_id, document_path, chunks_data, user_id, tenant_id)
            print(f"✅ Saved {len(chunks_data)} chunks to MongoDB for {document_path}")
        except Exception as e:
            print(f"❌ Failed to save to MongoDB: {e}")
    
    def _save_to_mongodb(self, bot_id: str, document_path: str, chunks_data: List[Dict], user_id: str = None, tenant_id: str = None):
        """Save inspection data to MongoDB"""
        
        # Save document metadata
        self.mongo_db.documents.update_one(
            {"bot_id": bot_id, "document_path": document_path},
            {
                "$set": {
                    "bot_id": bot_id,
                    "document_path": document_path,
                    "file_name": document_path.split("/")[-1],
                    "user_id": user_id,
                    "tenant_id": tenant_id,
                    "chunk_count": len(chunks_data),
                    "processed_at": datetime.utcnow(),
                    "status": "processed"
                }
            },
            upsert=True
        )
        
        # Prepare and save chunks
        mongo_chunks = []
        for i, chunk_data in enumerate(chunks_data):
            mongo_chunk = {
                "bot_id": bot_id,
                "document_path": document_path,
                "chunk_id": chunk_data.get("chunk_id", f"chunk_{i}"),
                "chunk_index": i,
                "content": chunk_data.get("content", ""),
                "char_count": chunk_data.get("char_count", len(chunk_data.get("content", ""))),
                "token_count": chunk_data.get("token_count", 0),
                "page_number": chunk_data.get("page_number"),
                "metadata": chunk_data.get("metadata", {}),
                "created_at": datetime.utcnow()
            }
            mongo_chunks.append(mongo_chunk)
        
        # Delete existing chunks and insert new ones
        self.mongo_db.chunks.delete_many({
            "bot_id": bot_id,
            "document_path": document_path
        })
        
        if mongo_chunks:
            self.mongo_db.chunks.insert_many(mongo_chunks)
    
    def get_inspection_data(self, bot_id: str, document_path: str) -> Optional[Dict[str, Any]]:
        """Get inspection data from MongoDB"""
        if not self.mongo_client:
            return None
            
        return self._get_from_mongodb(bot_id, document_path)
    
    def _get_from_mongodb(self, bot_id: str, document_path: str) -> Optional[Dict[str, Any]]:
        """Get inspection data from MongoDB"""
        document = self.mongo_db.documents.find_one({
            "bot_id": bot_id, 
            "document_path": document_path
        })
        
        if not document:
            return None
            
        chunks = list(self.mongo_db.chunks.find({
            "bot_id": bot_id,
            "document_path": document_path
        }).sort("chunk_index", 1))
        
        if not chunks:
            return None
        
        return {
            "bot_id": bot_id,
            "document_path": document_path,
            "parsing_result": chunks,
            "user_id": document.get("user_id"),
            "tenant_id": document.get("tenant_id"),
            "created_at": document.get("processed_at")
        }
    
    def list_documents(self, bot_id: str) -> List[Dict[str, Any]]:
        """List documents from MongoDB"""
        if not self.mongo_client:
            return []
            
        return self._list_from_mongodb(bot_id)
    
    def _list_from_mongodb(self, bot_id: str) -> List[Dict[str, Any]]:
        """List documents from MongoDB"""
        documents = list(self.mongo_db.documents.find(
            {"bot_id": bot_id}
        ).sort("processed_at", -1))
        
        return [
            {
                "document_path": doc["document_path"],
                "last_processed": doc["processed_at"],
                "user_id": doc.get("user_id"),
                "file_size": doc.get("file_size", 0),
                "status": doc.get("status", "processed"),
                "chunk_count": doc.get("chunk_count", 0)
            }
            for doc in documents
        ]