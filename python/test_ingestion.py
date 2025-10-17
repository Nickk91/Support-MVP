# python/test_ingestion.py
from app.rag.vectorstore import get_vectorstore

def check_bot_chunks(bot_id):
    try:
        vs = get_vectorstore(bot_id)
        # Try to get some documents
        docs = vs.similarity_search("", k=10)  # Empty query to get random chunks
        print(f"✅ Bot {bot_id} has {len(docs)} chunks in vector store")
        
        if docs:
            print("📊 Files found:")
            sources = {}
            for doc in docs:
                source = doc.metadata.get('source', 'unknown')
                if source not in sources:
                    sources[source] = 0
                sources[source] += 1
            
            for source, count in sources.items():
                print(f"  📄 {source}: {count} chunks")
                
            print("\nSample chunk:")
            if docs:
                doc = docs[0]
                print(f"  Source: {doc.metadata.get('source', 'unknown')}")
                print(f"  Content: {doc.page_content[:200]}...")
        else:
            print("❌ No chunks found for this bot")
            
    except Exception as e:
        print(f"❌ Error checking bot {bot_id}: {e}")

if __name__ == "__main__":
    check_bot_chunks("1")