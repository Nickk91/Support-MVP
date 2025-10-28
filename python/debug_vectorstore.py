import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'python'))

from app.rag.vectorstore import get_vectorstore
import asyncio

def debug_vectorstore(bot_id: str):
    """Debug what's actually in the vector store for a bot"""
    try:
        print(f"=== DEBUG VECTORSTORE FOR BOT: {bot_id} ===")
        
        vectorstore = get_vectorstore(bot_id)
        
        # Try to get all documents from the vectorstore
        if hasattr(vectorstore, '_collection'):
            # For Chroma
            collection = vectorstore._collection
            results = collection.get()
            
            print(f"Total documents in vectorstore: {len(results['documents'])}")
            print(f"Metadata keys: {list(results['metadatas'][0].keys()) if results['metadatas'] else 'No metadata'}")
            
            print("\n=== DOCUMENTS ===")
            for i, (doc, metadata) in enumerate(zip(results['documents'], results['metadatas'])):
                print(f"\n--- Document {i+1} ---")
                print(f"Content preview: {doc[:200]}...")
                print(f"Metadata: {metadata}")
                print(f"Bot ID in metadata: {metadata.get('bot_id')}")
                print(f"Source: {metadata.get('source')}")
        else:
            print("Vectorstore doesn't have direct collection access")
            
    except Exception as e:
        print(f"Error accessing vectorstore: {e}")

if __name__ == "__main__":
    bot_id = "1qzPt_u9iX2-4g3GgR5vT"  # Your bot ID
    debug_vectorstore(bot_id)