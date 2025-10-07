# app/rag/splitters.py
from langchain_text_splitters import RecursiveCharacterTextSplitter

def make_default_splitter(chunk_size=800, overlap=120):
    return RecursiveCharacterTextSplitter(
        chunk_size=chunk_size, chunk_overlap=overlap
    )
