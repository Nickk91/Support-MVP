#app\rag\inspection_store.py

import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from pymongo import MongoClient
import os

# Remove the duplicate load_dotenv() call and import from config
from app.config import MONGODB_URI, MONGODB_DB_NAME, APP_ENV

class InspectionStore:
    def __init__(self, db_name: Optional[str] = None):
        # Use provided db_name or fall back to config
        self.db_name = db_name or MONGODB_DB_NAME
        print(f"🔍 INSPECTION STORE - Initializing")
        print(f"🔍 INSPECTION STORE - APP_ENV: {APP_ENV}")
        print(f"🔍 INSPECTION STORE - MONGODB_DB_NAME: {MONGODB_DB_NAME}")
        print(f"🔍 INSPECTION STORE - Using database: {self.db_name}")
        self._init_mongodb()
    
    def _init_mongodb(self):
        """Initialize MongoDB collections"""
        try:
            mongo_uri = MONGODB_URI
            if not mongo_uri:
                print("⚠️ INSPECTION STORE - MONGODB_URI not found in environment variables")
                self.mongo_client = None
                return
                
            self.mongo_client = MongoClient(mongo_uri)
            self.mongo_db = self.mongo_client[self.db_name]
            
            # Test the connection
            db_names = self.mongo_client.list_database_names()
            rag_dbs = [db for db in db_names if 'rag_platform' in db]
            print(f"🔍 INSPECTION STORE - Available RAG databases: {rag_dbs}")
            print(f"🔍 INSPECTION STORE - Using database: {self.db_name}")
            print(f"🔍 INSPECTION STORE - Database exists: {self.db_name in db_names}")
            
            # Create collections if they don't exist
            self.mongo_db.documents.create_index([("bot_id", 1), ("document_path", 1)])
            self.mongo_db.chunks.create_index([("bot_id", 1), ("document_path", 1)])
            self.mongo_db.chunks.create_index([("chunk_index", 1)])
            
            print(f"✅ INSPECTION STORE - MongoDB initialized for database: {self.db_name}")
        except Exception as e:
            print(f"⚠️ INSPECTION STORE - MongoDB initialization failed: {e}")
            self.mongo_client = None
    
    def save_inspection_data(
        self, 
        bot_id: str, 
        document_path: str, 
        chunks_data: List[Dict[str, Any]],
        user_id: Optional[str] = None,
        tenant_id: Optional[str] = None,
        limit_info: Optional[Dict] = None  # 🎯 NEW: Add limit_info parameter
    ):
        """Save inspection data to MongoDB only (no SQLite)"""
        print(f"🔍 INSPECTION STORE - Saving inspection data for bot: {bot_id}")
        print(f"🔍 INSPECTION STORE - Document: {document_path}")
        print(f"🔍 INSPECTION STORE - Chunks to save: {len(chunks_data)}")
        print(f"🔍 INSPECTION STORE - Using database: {self.db_name}")
        
        # 🎯 NEW: Log limit info if provided
        if limit_info:
            print(f"🎯 INSPECTION STORE - Limit info: {limit_info}")
        
        if not self.mongo_client:
            print("❌ INSPECTION STORE - MongoDB client not available, skipping save")
            return
        
        try:
            self._save_to_mongodb(bot_id, document_path, chunks_data, user_id, tenant_id, limit_info)
            print(f"✅ INSPECTION STORE - Saved {len(chunks_data)} chunks to MongoDB for {document_path}")
        except Exception as e:
            print(f"❌ INSPECTION STORE - Failed to save to MongoDB: {e}")
    
    def _save_to_mongodb(self, bot_id: str, document_path: str, chunks_data: List[Dict], user_id: str = None, tenant_id: str = None, limit_info: Dict = None):
        """Save inspection data to MongoDB with limit info"""
        print(f"🔍 INSPECTION STORE - Starting MongoDB save for bot: {bot_id}")
        
        # 🎯 UPDATED: Include limit_info in document metadata
        document_update_data = {
            "bot_id": bot_id,
            "document_path": document_path,
            "file_name": document_path.split("/")[-1],
            "user_id": user_id,
            "tenant_id": tenant_id,
            "chunk_count": len(chunks_data),
            "processed_at": datetime.utcnow(),
            "status": "processed"
        }
        
        # 🎯 NEW: Add limit info if provided
        if limit_info:
            document_update_data["limit_info"] = limit_info
            print(f"🎯 INSPECTION STORE - Adding limit info to document: {limit_info}")
        
        # Save document metadata
        result = self.mongo_db.documents.update_one(
            {"bot_id": bot_id, "document_path": document_path},
            {
                "$set": document_update_data
            },
            upsert=True
        )
        
        print(f"🔍 INSPECTION STORE - Documents collection updated: {result.upserted_id or 'existing doc updated'}")
        
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
        delete_result = self.mongo_db.chunks.delete_many({
            "bot_id": bot_id,
            "document_path": document_path
        })
        
        print(f"🔍 INSPECTION STORE - Deleted {delete_result.deleted_count} existing chunks")
        
        if mongo_chunks:
            insert_result = self.mongo_db.chunks.insert_many(mongo_chunks)
            print(f"✅ INSPECTION STORE - Inserted {len(insert_result.inserted_ids)} new chunks")
        else:
            print("⚠️ INSPECTION STORE - No chunks to insert")
    
    def get_inspection_data(self, bot_id: str, document_path: str) -> Optional[Dict[str, Any]]:
        """Get inspection data from MongoDB"""
        print(f"🔍 INSPECTION STORE - Getting data for bot: {bot_id}, document: {document_path}")
        print(f"🔍 INSPECTION STORE - Using database: {self.db_name}")
        
        if not self.mongo_client:
            print("❌ INSPECTION STORE - MongoDB client not available")
            return None
            
        return self._get_from_mongodb(bot_id, document_path)
    
    def _get_from_mongodb(self, bot_id: str, document_path: str) -> Optional[Dict[str, Any]]:
        """Get inspection data from MongoDB"""
        print(f"🔍 INSPECTION STORE - Querying MongoDB for bot: {bot_id}, document: {document_path}")
        
        document = self.mongo_db.documents.find_one({
            "bot_id": bot_id, 
            "document_path": document_path
        })
        
        if not document:
            print(f"❌ INSPECTION STORE - Document not found for bot: {bot_id}, path: {document_path}")
            return None
            
        print(f"✅ INSPECTION STORE - Found document metadata")
        
        chunks = list(self.mongo_db.chunks.find({
            "bot_id": bot_id,
            "document_path": document_path
        }).sort("chunk_index", 1))
        
        if not chunks:
            print(f"❌ INSPECTION STORE - No chunks found for bot: {bot_id}, path: {document_path}")
            return None
        
        print(f"✅ INSPECTION STORE - Found {len(chunks)} chunks for bot: {bot_id}")
        
        # 🎯 UPDATED: Include limit_info in response if available
        response_data = {
            "bot_id": bot_id,
            "document_path": document_path,
            "parsing_result": chunks,
            "user_id": document.get("user_id"),
            "tenant_id": document.get("tenant_id"),
            "created_at": document.get("processed_at")
        }
        
        # 🎯 NEW: Add limit_info to response if it exists
        if "limit_info" in document:
            response_data["limit_info"] = document["limit_info"]
            print(f"🎯 INSPECTION STORE - Including limit info in response: {document['limit_info']}")
        
        return response_data
    
    def list_documents(self, bot_id: str) -> List[Dict[str, Any]]:
        """List documents from MongoDB"""
        print(f"🔍 INSPECTION STORE - Listing documents for bot: {bot_id}")
        print(f"🔍 INSPECTION STORE - Using database: {self.db_name}")
        
        if not self.mongo_client:
            print("❌ INSPECTION STORE - MongoDB client not available")
            return []
            
        return self._list_from_mongodb(bot_id)
    
    def _list_from_mongodb(self, bot_id: str) -> List[Dict[str, Any]]:
        """List documents from MongoDB"""
        print(f"🔍 INSPECTION STORE - Querying documents for bot: {bot_id}")
        
        documents = list(self.mongo_db.documents.find(
            {"bot_id": bot_id}
        ).sort("processed_at", -1))
        
        print(f"✅ INSPECTION STORE - Found {len(documents)} documents for bot: {bot_id}")
        
        return [
            {
                "document_path": doc["document_path"],
                "last_processed": doc["processed_at"],
                "user_id": doc.get("user_id"),
                "file_size": doc.get("file_size", 0),
                "status": doc.get("status", "processed"),
                "chunk_count": doc.get("chunk_count", 0),
                # 🎯 NEW: Include limit info in document listing
                "limit_info": doc.get("limit_info")
            }
            for doc in documents
        ]