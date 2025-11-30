# python/app/main.py - UPDATED CORS TO MATCH EXPRESS SETUP
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv, find_dotenv

# Load environment variables
load_dotenv(find_dotenv(), override=False)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import health, ingest, query, auth, chat, cleanup, inspection, evaluate
from app.api import bots  # 🎯 CHANGE: Import from app.api instead of app.routers
from app.rag.vectorstore import cleanup_pending_deletions

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup code
    cleanup_pending_deletions()
    yield
    # Shutdown code (if any)

app = FastAPI(
    title="Support MVP - RAG API",
    lifespan=lifespan
)

# CORS configuration that matches your Express setup
def get_cors_origins():
    """Get CORS origins based on environment - matches your Express config"""
    if os.getenv("APP_ENV") == "production":
        return [
            "https://support-mvp-client.onrender.com",  # Production frontend
            "https://support-mvp-server.onrender.com",  # Production Express server
        ]
    else:
        return [
            "http://localhost:3000",   # React dev server
            "http://localhost:5173",   # Vite dev server (if you use it)
            "http://localhost:4000",   # Express server (from your .env)
        ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(health.router, prefix="/api")
app.include_router(ingest.router, prefix="/api")
app.include_router(query.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(bots.router, prefix="/api")  # 🎯 CHANGE: This now uses the MongoDB version
app.include_router(inspection.router, prefix="/api")
app.include_router(cleanup.router, prefix="/api") 
app.include_router(evaluate.router, prefix="/api")
app.include_router(debug.router, prefix="/api")

@app.get("/")
def root():
    return {"ok": True, "message": "RAG API is running 🚀"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "python-rag-api"}

# Add this for Render.com compatibility
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=False)