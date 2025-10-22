import json
import sqlite3
from datetime import datetime
from typing import List, Dict, Any, Optional
from pathlib import Path

class InspectionStore:
    def __init__(self, db_path: str = "rag_platform.db"):
        self.db_path = db_path
        self._init_db()
    
    def _init_db(self):
        """Initialize database for storing document inspection data"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS document_inspections (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    bot_id TEXT NOT NULL,
                    document_path TEXT NOT NULL,
                    parsing_result TEXT NOT NULL,  -- JSON of chunks with metadata
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    user_id TEXT,
                    tenant_id TEXT
                )
            """)
    
    def save_inspection_data(
        self, 
        bot_id: str, 
        document_path: str, 
        chunks_data: List[Dict[str, Any]],
        user_id: Optional[str] = None,
        tenant_id: Optional[str] = None
    ):
        """Save document parsing results for inspection"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO document_inspections 
                (bot_id, document_path, parsing_result, user_id, tenant_id)
                VALUES (?, ?, ?, ?, ?)
            """, (
                bot_id, 
                document_path, 
                json.dumps(chunks_data), 
                user_id, 
                tenant_id
            ))
    
    def get_inspection_data(self, bot_id: str, document_path: str) -> Optional[Dict[str, Any]]:
        """Get parsing results for a specific document"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
                SELECT * FROM document_inspections 
                WHERE bot_id = ? AND document_path = ?
                ORDER BY created_at DESC LIMIT 1
            """, (bot_id, document_path))
            
            row = cursor.fetchone()
            if row:
                return {
                    "id": row[0],
                    "bot_id": row[1],
                    "document_path": row[2],
                    "parsing_result": json.loads(row[3]),
                    "created_at": row[4],
                    "user_id": row[5],
                    "tenant_id": row[6]
                }
            return None
    
    def list_documents(self, bot_id: str) -> List[Dict[str, Any]]:
        """List all documents for a bot that have inspection data"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
                SELECT DISTINCT document_path, created_at, user_id
                FROM document_inspections 
                WHERE bot_id = ?
                ORDER BY created_at DESC
            """, (bot_id,))
            
            return [
                {
                    "document_path": row[0],
                    "last_processed": row[1],
                    "user_id": row[2]
                }
                for row in cursor.fetchall()
            ]