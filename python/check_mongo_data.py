import os
from dotenv import load_dotenv
from pymongo import MongoClient

# Load .env file
load_dotenv()

mongo_uri = os.getenv("MONGODB_URI")
client = MongoClient(mongo_uri)
db = client.rag_platform

# Count documents
doc_count = db.documents.count_documents({})
chunk_count = db.chunks.count_documents({})

print(f"Current MongoDB Stats:")
print(f"   Documents: {doc_count}")
print(f"   Chunks: {chunk_count}")

# Show all documents
print(f"\nAll documents:")
docs = list(db.documents.find().sort("processed_at", -1))
for doc in docs:
    print(f"   - Bot: {doc['bot_id']}")
    print(f"     Path: {doc['document_path']}")
    print(f"     Chunks: {doc.get('chunk_count', 0)}")
    print(f"     User: {doc.get('user_id', 'unknown')}")
    print()

# Show chunk samples
print(f"\nSample chunks:")
chunks = list(db.chunks.find().limit(3))
for chunk in chunks:
    print(f"   - Bot: {chunk['bot_id']}")
    print(f"     Content: {chunk['content'][:100]}...")
    print()
