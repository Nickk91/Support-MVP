import sqlite3
import json
import sys
import os
from dotenv import load_dotenv

# Load environment variables from .env file FIRST
load_dotenv()

# Add the app directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

try:
    from app.rag.inspection_store import InspectionStore
except ImportError as e:
    print(f"Import error: {e}")
    print("Trying alternative import...")
    # Try alternative import path
    sys.path.insert(0, os.path.dirname(__file__))
    from app.rag.inspection_store import InspectionStore

def migrate_existing_data():
    store = InspectionStore()
    
    # Read all data from SQLite and then save each record to both the SQLite database and the MongoDB
    with sqlite3.connect("rag_platform.db") as conn:
        cursor = conn.execute("SELECT * FROM document_inspections")
        rows = cursor.fetchall()
    
    print(f"Migrating {len(rows)} inspection records to MongoDB...")
    
    for i, row in enumerate(rows):
        bot_id = row[1]
        document_path = row[2]
        chunks_data = json.loads(row[3])
        user_id = row[5]
        tenant_id = row[6]
        
        # This will save to both SQLite and MongoDB via the dual-write
        store.save_inspection_data(bot_id, document_path, chunks_data, user_id, tenant_id)
        print(f"Migrated {i+1}/{len(rows)}: {document_path}")
    
    print("✅ Migration completed!")

if __name__ == "__main__":
    migrate_existing_data()