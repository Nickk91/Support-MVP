# app/rag/loaders.py - UPDATED with proper AWS credential handling
from typing import List
import boto3
from botocore.exceptions import ClientError
import tempfile
import os
import logging
from langchain_community.document_loaders import TextLoader, PyPDFLoader, Docx2txtLoader
from langchain_core.documents import Document
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

log = logging.getLogger(__name__)

# Initialize S3 client with explicit credentials
s3_client = boto3.client(
    's3',
    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
    region_name=os.getenv('AWS_DEFAULT_REGION')
)

def _download_from_s3(s3_url: str) -> str:
    """Download file from S3 to temporary location and return local path"""
    try:
        # Parse S3 URL: https://bucket-name.s3.region.amazonaws.com/key
        if s3_url.startswith('https://'):
            # Extract bucket and key from URL
            parts = s3_url.replace('https://', '').split('.s3.')
            bucket_name = parts[0]
            key = parts[1].split('/', 1)[1] if '/' in parts[1] else parts[1]
            
            log.info(f"🔧 S3 Details - Bucket: {bucket_name}, Key: {key}")
        else:
            # If it's not a full URL, assume it's already a local path
            return s3_url
        
        # Create temporary file
        file_ext = os.path.splitext(key)[1] or '.tmp'
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as temp_file:
            s3_client.download_fileobj(bucket_name, key, temp_file)
            log.info(f"✅ Downloaded from S3: {s3_url} -> {temp_file.name}")
            return temp_file.name
            
    except Exception as e:
        log.error(f"❌ Failed to download from S3 {s3_url}: {e}")
        raise

def _load_one(path: str) -> List[Document]:
    # Check if it's an S3 URL
    if path.startswith('https://') and 'amazonaws.com' in path:
        log.info(f"🔍 Loading from S3: {path}")
        local_path = _download_from_s3(path)
        try:
            return _load_local_file(local_path)
        finally:
            # Clean up temporary file
            try:
                if os.path.exists(local_path):
                    os.unlink(local_path)
                    log.info(f"🧹 Cleaned up temp file: {local_path}")
            except Exception as e:
                log.warning(f"⚠️ Could not clean up temp file {local_path}: {e}")
    else:
        # Local file path
        return _load_local_file(path)

def _load_local_file(file_path: str) -> List[Document]:
    """Load a local file using existing loader logic"""
    p = os.path.abspath(file_path)
    if not os.path.exists(p):
        raise FileNotFoundError(f"Path does not exist: {p}")

    ext = os.path.splitext(p)[1].lower()
    
    if ext == ".pdf":
        log.info(f"📄 Loading PDF: {p}")
        return PyPDFLoader(p).load()
    elif ext in [".docx", ".doc"]:
        log.info(f"📝 Loading Word document: {p}")
        return Docx2txtLoader(p).load()
    else:
        # Handles .txt, .md, .csv, etc.
        log.info(f"📋 Loading text file: {p}")
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
            log.info(f"🚀 Processing file: {raw}")
            docs.extend(_load_one(raw))
            log.info(f"✅ Successfully loaded: {raw}")
        except Exception as e:
            log.error(f"❌ Failed to load {raw}: {e}")
            # Continue with other files even if one fails
            continue
    return docs