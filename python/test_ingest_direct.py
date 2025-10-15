# test_ingest_direct.py
import sys
import os
sys.path.append('app')

from app.rag.core import ingest_files

try:
    # Test with absolute path
    test_file = os.path.abspath("test_support.txt")
    print(f"Testing with file: {test_file}")
    
    result = ingest_files(
        bot_id="test-bot-1",
        file_paths=[test_file],
        tenant_id="test-tenant",
        user_id="test-user"
    )
    
    print(f"✅ SUCCESS: Ingested {result} chunks")
    print("Python ingest is working correctly!")
    
except Exception as e:
    print(f"❌ ERROR: {e}")
    print("Python ingest has issues")