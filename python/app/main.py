# python\app\main.py
# app/main.py
from dotenv import load_dotenv, find_dotenv
load_dotenv(find_dotenv(), override=False)

from fastapi import FastAPI
from app.routers import health, ingest, query, auth  # Add auth import

app = FastAPI(title="Support MVP - RAG API")

# Register routers
app.include_router(health.router, prefix="/api")
app.include_router(ingest.router, prefix="/api")
app.include_router(query.router, prefix="/api")
app.include_router(auth.router, prefix="/api")  # Add auth router

@app.get("/")
def root():
    return {"ok": True, "message": "RAG API is running 🚀"}