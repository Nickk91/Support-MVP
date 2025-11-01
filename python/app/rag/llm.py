# python/app/rag/llm.py - UPDATE to support template parameters
import os
from app.config import LLM_PROVIDER, OPENAI_API_KEY, OPENAI_MODEL
import logging

logger = logging.getLogger(__name__)

def make_llm(model: str = None, temperature: float = None):
    """
    Create LLM instance with support for template system parameters
    """
    provider = LLM_PROVIDER
    
    # 🎯 USE TEMPLATE PARAMETERS OR DEFAULTS
    effective_model = model or OPENAI_MODEL
    effective_temperature = temperature if temperature is not None else 0.0
    
    logger.info(f"🎯 Creating LLM with template params: model={effective_model}, temp={effective_temperature}")

    if provider == "fake":
        from langchain_community.chat_models.fake import FakeListChatModel
        return FakeListChatModel(responses=["(placeholder) Real LLM will answer here."])

    if provider == "openai":
        if not OPENAI_API_KEY:
            logger.warning("⚠️ OPENAI_API_KEY not found, reverting to FakeListChatModel.")
            from langchain_community.chat_models.fake import FakeListChatModel
            return FakeListChatModel(responses=["(missing API key)"])
        
        from langchain_openai import ChatOpenAI
        logger.info(f"✅ Using OpenAI model: {effective_model} with temperature: {effective_temperature}")
        
        return ChatOpenAI(
            model=effective_model, 
            temperature=effective_temperature,  # 🎯 Use template temperature
            streaming=False
        )

    raise ValueError(f"Unsupported LLM_PROVIDER: {provider}")