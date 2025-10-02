from typing import List
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain.chains import RetrievalQA
from langchain_community.llms.fake import FakeListLLM
from app.rag.loaders import load_paths
from app.rag.stores import get_vectorstore

def ingest_files(bot_id: str, file_paths: List[str], *, chunk_size=800, chunk_overlap=120) -> int:
    docs = load_paths(file_paths)
    chunks = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size, chunk_overlap=chunk_overlap
    ).split_documents(docs)
    vs = get_vectorstore(bot_id)
    vs.add_documents(chunks)
    vs.persist()
    return len(chunks)

def answer_query(bot_id: str, question: str, *, k=4) -> str:
    retriever = get_vectorstore(bot_id).as_retriever(search_kwargs={"k": k})
    llm = FakeListLLM(responses=["(placeholder) Real LLM will answer here."])
    qa = RetrievalQA.from_chain_type(llm=llm, retriever=retriever, chain_type="stuff")
    return qa.invoke({"query": question})["result"]
