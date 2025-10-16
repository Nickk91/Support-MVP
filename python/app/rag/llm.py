# python\app\rag\llm.py
import os
from app.config import LLM_PROVIDER, OPENAI_API_KEY, OPENAI_MODEL


def make_llm():
    provider = LLM_PROVIDER
    print(f"[llm] Provider={provider}")

    if provider == "fake":
        from langchain_community.chat_models.fake import FakeListChatModel
        return FakeListChatModel(responses=["(placeholder) Real LLM will answer here."])

    if provider == "openai":
        if not OPENAI_API_KEY:
            print("[llm] ⚠️  OPENAI_API_KEY not found, reverting to FakeListChatModel.")
            from langchain_community.chat_models.fake import FakeListChatModel
            return FakeListChatModel(responses=["(missing API key)"])
        from langchain_openai import ChatOpenAI
        print(f"[llm] ✅ Using OpenAI model: {OPENAI_MODEL}")
        return ChatOpenAI(
            model=OPENAI_MODEL, 
            temperature=0,
            streaming=False  # Explicitly disable streaming for better async compatibility
        )

    raise ValueError(f"Unsupported LLM_PROVIDER: {provider}")