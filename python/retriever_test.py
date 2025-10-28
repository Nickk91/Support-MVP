# Quick test in Python shell
from app.rag.retriever import debug_retrieval

result = debug_retrieval(
    bot_id="1qzPt_u9iX2-4g3GgR5vT",
    query="What are Nikolai Kaploon skills?",
    user_id="68fbd1d4331dcbb0701c7ec7",
    tenant_id="default_tenant"
)

print(f"Success: {result['success']}")
print(f"Documents found: {result['documents_found']}")
for doc in result['documents']:
    print(f"- {doc['content_preview']}")