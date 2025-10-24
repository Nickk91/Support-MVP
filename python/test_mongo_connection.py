# python\test_mongo_connection.py
import os
from dotenv import load_dotenv
from pymongo import MongoClient
from app.config import MONGODB_URI, MONGODB_DB_NAME

# Load .env file
load_dotenv()

mongo_uri = MONGODB_URI
print(f"MongoDB URI: {mongo_uri}")
print(f"Database Name: {MONGODB_DB_NAME}")

if mongo_uri:
    try:
        client = MongoClient(mongo_uri)
        # Test the connection
        client.admin.command('ping')
        print("✅ Successfully connected to MongoDB Atlas!")
        
        db = client[MONGODB_DB_NAME]
        print(f"✅ Connected to {MONGODB_DB_NAME} database")
        
    except Exception as e:
        print(f"❌ Failed to connect to MongoDB Atlas: {e}")
else:
    print("❌ MONGODB_URI not found in .env file")