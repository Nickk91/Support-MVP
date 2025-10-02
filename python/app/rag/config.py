import os
from dotenv import load_dotenv

load_dotenv()

VECTOR_ROOT = os.getenv("VECTOR_ROOT", "./data")
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",")]
