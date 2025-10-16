# python/app/main.py - UPDATED (safe update)
from dotenv import load_dotenv, find_dotenv
load_dotenv(find_dotenv(), override=False)

from fastapi import FastAPI
from app.routers import health, ingest, query, auth, chat, bots  # Add bots import

app = FastAPI(title="Support MVP - RAG API")

# Register routers
app.include_router(health.router, prefix="/api")
app.include_router(ingest.router, prefix="/api")
app.include_router(query.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(bots.router, prefix="/api")  # Add bots router

@app.get("/")
def root():
    return {"ok": True, "message": "RAG API is running 🚀"}