# python/app/main.py - UPDATED with modern lifespan events
from contextlib import asynccontextmanager
from dotenv import load_dotenv, find_dotenv
load_dotenv(find_dotenv(), override=False)

from fastapi import FastAPI
from app.routers import health, ingest, query, auth, chat, bots
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

# Register routers
app.include_router(health.router, prefix="/api")
app.include_router(ingest.router, prefix="/api")
app.include_router(query.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(bots.router, prefix="/api")

@app.get("/")
def root():
    return {"ok": True, "message": "RAG API is running 🚀"}