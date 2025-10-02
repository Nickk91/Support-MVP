# app/rag/loaders.py
from typing import List
from langchain_community.document_loaders import TextLoader, PyPDFLoader
from langchain_core.documents import Document
import os

def _load_one(path: str) -> List[Document]:
    p = os.path.abspath(path)
    if not os.path.exists(p):
        raise FileNotFoundError(f"Path does not exist: {p}")

    ext = os.path.splitext(p)[1].lower()
    if ext == ".pdf":
        return PyPDFLoader(p).load()
    else:
        # Handles .txt, .md, .csv, .docx etc if you add more loaders later
        return TextLoader(p, encoding="utf-8").load()

def load_paths(paths: List[str]) -> List[Document]:
    docs: List[Document] = []
    for raw in paths:
        docs.extend(_load_one(raw))
    return docs
