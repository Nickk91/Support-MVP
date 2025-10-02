# python\app\main.py
from fastapi import FastAPI
from app.routers import health, ingest, query

app = FastAPI(title="Support MVP - RAG API")

# Register routers
app.include_router(health.router, prefix="/api")
app.include_router(ingest.router, prefix="/api")
app.include_router(query.router, prefix="/api")

@app.get("/")
def root():
    return {"ok": True, "message": "RAG API is running 🚀"}
