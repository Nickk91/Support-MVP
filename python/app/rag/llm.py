# app/rag/llm.py
import os

def make_llm():
    provider = os.getenv("LLM_PROVIDER", "fake").lower()

    # Log provider/model info for debugging
    print(f"[llm] provider={provider} model={os.getenv('OPENAI_MODEL', 'gpt-4o-mini')}")

    if provider == "fake":
        from langchain_community.chat_models.fake import FakeListChatModel
        return FakeListChatModel(responses=["(placeholder) Real LLM will answer here."])

    if provider == "openai":
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            temperature=float(os.getenv("OPENAI_TEMPERATURE", "0")),
            api_key=os.getenv("OPENAI_API_KEY"),
        )

    raise ValueError(f"Unsupported LLM_PROVIDER: {provider}")
