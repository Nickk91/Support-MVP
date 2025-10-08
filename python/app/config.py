# app/config.py
import os
from pathlib import Path
from typing import List
from dotenv import load_dotenv

# Load once at process start
load_dotenv()

# ---- App / Server ----
APP_ENV: str = os.getenv("APP_ENV", "development")
APP_PORT: int = int(os.getenv("APP_PORT", "8000"))

def _parse_csv(value: str, *, default: str = "*") -> List[str]:
    raw = (value or default).split(",")
    return [x.strip() for x in raw if x.strip()]

CORS_ORIGINS: List[str] = _parse_csv(os.getenv("CORS_ORIGINS", "*"))

# ---- Data / Vector stores ----
# Base data dir (default keeps your current layout: python/data)
DATA_DIR = Path(os.getenv("DATA_DIR", "python/data")).resolve()

# Where RAG vector DBs live: python/data/vectordb/<bot_id>/<backend>
VECTOR_ROOT = DATA_DIR / "vectordb"
RAG_VECTOR_BACKEND: str = os.getenv("RAG_VECTOR_BACKEND", "chroma").lower()  # "chroma" | "faiss"

# ---- LLM / Providers ----
LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "fake").lower()  # "fake" | "openai" | ...
OPENAI_API_KEY: str | None = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

# ---- Helpers (optional) ----
def ensure_dirs() -> None:
    VECTOR_ROOT.mkdir(parents=True, exist_ok=True)
