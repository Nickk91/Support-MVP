import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'python'))

from app.rag.retriever import debug_retrieval

# Test retrieval directly
result = debug_retrieval(
    bot_id="67a14c1e9ac7c07b72a77f32",  # Replace with your actual bot ID
    query="What are Nikolai Kaploon skills?",
    user_id="68fbd1d4331dcbb0701c7ec7",
    tenant_id="default_tenant"
)

print("=== RETRIEVAL DEBUG RESULTS ===")
print(f"Success: {result['success']}")
if not result['success']:
    print(f"Error: {result['error']}")
else:
    print(f"Documents found: {result['documents_found']}")
    print(f"Retriever info: {result['retriever_info']}")
    print("\n=== DOCUMENTS ===")
    for i, doc in enumerate(result['documents']):
        print(f"Document {i+1}:")
        print(f"  Content: {doc['content_preview']}")
        print(f"  Source: {doc['source']}")
        print(f"  User Scope: {doc['user_scope']}")
        print(f"  Tenant: {doc['tenant_id']}")
        print(f"  Bot ID: {doc['bot_id']}")
        print()