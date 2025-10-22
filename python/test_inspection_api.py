import requests
import urllib.parse

def test_inspection_api():
    base_url = "http://localhost:8000/api/inspect"
    
    # Test 1: List documents for bot 12
    print("🔍 Testing: List documents for bot 12")
    response = requests.get(f"{base_url}/documents/12")
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        print("Response:", response.json())
    else:
        print("Error:", response.text)
    print()
    
    # Test 2: Inspect specific document with URL encoding
    document_path = r"C:\Users\nickk\OneDrive\מסמכים\Programming Projects\support-mvp\server\uploads\2TSKK-Du3Km4QZiIeNYpk__CV_-_Nikolai_Kaploon.pdf"
    encoded_path = urllib.parse.quote(document_path, safe='')
    
    print(f"🔍 Testing: Inspect document for bot 12")
    print(f"Original path: {document_path}")
    print(f"Encoded path: {encoded_path}")
    
    response = requests.get(f"{base_url}/documents/12/{encoded_path}")
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print("✅ SUCCESS! Document inspection data:")
        print(f"   - Document: {data['document_path']}")
        print(f"   - Chunks: {len(data['parsing_result'])}")
        print(f"   - Created: {data['created_at']}")
        
        # Show first chunk as sample
        if data['parsing_result']:
            first_chunk = data['parsing_result'][0]
            print(f"   - First chunk preview: {first_chunk['content'][:100]}...")
    else:
        print("❌ Error:", response.text)
    print()
    
    # Test 3: Test query on the document
    print("🔍 Testing: Query on document")
    test_query = {"query": "experience skills"}
    response = requests.post(
        f"{base_url}/documents/12/{encoded_path}/test-query",
        json=test_query
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        print("Query response:", response.json())
    else:
        print("Error:", response.text)

if __name__ == "__main__":
    test_inspection_api()