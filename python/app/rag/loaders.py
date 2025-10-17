# app/rag/loaders.py - UPDATED
from typing import List
from langchain_community.document_loaders import TextLoader, PyPDFLoader, Docx2txtLoader
from langchain_core.documents import Document
import os
import logging

log = logging.getLogger(__name__)

def _load_one(path: str) -> List[Document]:
    p = os.path.abspath(path)
    if not os.path.exists(p):
        raise FileNotFoundError(f"Path does not exist: {p}")

    ext = os.path.splitext(p)[1].lower()
    
    if ext == ".pdf":
        log.info(f"Loading PDF: {p}")
        return PyPDFLoader(p).load()
    elif ext in [".docx", ".doc"]:
        log.info(f"Loading Word document: {p}")
        return Docx2txtLoader(p).load()
    else:
        # Handles .txt, .md, .csv, etc.
        log.info(f"Loading text file: {p}")
        try:
            return TextLoader(p, encoding="utf-8").load()
        except UnicodeDecodeError:
            log.warning(f"UTF-8 failed for {p}, trying latin-1")
            # Fallback to latin-1 encoding if UTF-8 fails
            return TextLoader(p, encoding="latin-1").load()

def load_paths(paths: List[str]) -> List[Document]:
    docs: List[Document] = []
    for raw in paths:
        try:
            docs.extend(_load_one(raw))
        except Exception as e:
            log.error(f"Failed to load {raw}: {e}")
            # Continue with other files even if one fails
            continue
    return docs