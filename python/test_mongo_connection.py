import os
from dotenv import load_dotenv
from pymongo import MongoClient

# Load .env file
load_dotenv()

mongo_uri = os.getenv("MONGODB_URI")
print(f"MongoDB URI: {mongo_uri}")

if mongo_uri:
    try:
        client = MongoClient(mongo_uri)
        # Test the connection
        client.admin.command('ping')
        print("✅ Successfully connected to MongoDB Atlas!")
        
        db = client.rag_platform
        print("✅ Connected to rag_platform database")
        
    except Exception as e:
        print(f"❌ Failed to connect to MongoDB Atlas: {e}")
else:
    print("❌ MONGODB_URI not found in .env file")
