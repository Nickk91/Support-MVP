# python\app\main.py
# app/main.py
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

# Debug: Check environment variables
print(f"🔍 Main - OPENAI_API_KEY loaded: {bool(os.getenv('OPENAI_API_KEY'))}")
print(f"🔍 Main - LLM_PROVIDER: {os.getenv('LLM_PROVIDER')}")

from fastapi import FastAPI
from app.routers import health, ingest, query

app = FastAPI(title="Support MVP")

app.include_router(health.router, prefix="/api")
app.include_router(ingest.router, prefix="/api") 
app.include_router(query.router, prefix="/api")
