# test_evaluation_flow.py
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'python'))

from app.rag.core import answer_query
import asyncio

async def test_evaluation_flow():
    """Test the exact same flow as evaluation chat"""
    bot_id = "1qzPt_u9iX2-4g3GgR5vT"
    user_id = "68fbd1d4331dcbb0701c7ec7"
    tenant_id = "default_tenant"
    query = "What are Nikolai Kaploon's skills?"
    
    print("=== TESTING EVALUATION FLOW ===")
    
    result = await answer_query(
        bot_id=bot_id,
        question=query,
        user_id=user_id,
        tenant_id=tenant_id,
        system_message="You are a Technical Support Assistant. Your role is to help users with technical issues...",
        fallback_to_llm=True,
        include_sources=True
    )
    
    print(f"Answer: {result.get('answer')}")
    print(f"Sources: {result.get('sources')}")
    print(f"Document count: {result.get('document_count')}")
    print(f"Fallback used: {result.get('fallback_used')}")

if __name__ == "__main__":
    asyncio.run(test_evaluation_flow())