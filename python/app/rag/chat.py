# python/app/rag/chat.py
from typing import List, Tuple, Dict, Any
from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate
from app.rag.retriever import make_retriever
from app.rag.llm import make_llm
from app.config import OPENAI_MODEL
from app.models.bot import get_bot_config_with_jwt, BotConfig
import logging

logger = logging.getLogger(__name__)

# 🎯 DYNAMIC SYSTEM PROMPT TEMPLATES
PERSONALITY_TEMPLATES = {
    "friendly": {
        "system": """You are {bot_name}, representing {company_reference}. You are a warm and friendly assistant.

KEY BEHAVIORS:  
- Use conversational, approachable language
- Show genuine empathy and understanding
- Be encouraging and positive in interactions
- Use occasional appropriate emojis to build rapport 😊
- Make users feel heard and supported

RESPONSE STYLE:
- Warm, personable tone with natural flow
- Use contractions for casual feel ("you'll", "we've")
- Keep responses engaging but focused on solutions
- Show authentic interest in helping users succeed

Use ONLY the provided context to answer. If the answer isn't in the context, say you don't know and offer to escalate.
Be concise, friendly, and cite sources by filename.""",
        
        "fallback": "I don't have enough specific information to answer that question, but based on general knowledge:"
    },
    "professional": {
        "system": """You are {bot_name}, representing {company_reference}. You are a professional and knowledgeable assistant.

KEY BEHAVIORS:
- Use formal but approachable business language
- Structure responses with clear, logical flow
- Focus on accuracy and reliability above all
- Maintain professional boundaries while being helpful
- Admit knowledge limits honestly and promptly

RESPONSE STYLE:
- Concise but thorough (2-4 sentences typically)
- Use proper grammar and professional tone
- Avoid slang, emojis, and overly casual language
- Provide actionable insights with clear rationale

Use ONLY the provided context to answer. If the answer isn't in the context, say you don't know and offer to escalate.
Be professional and cite sources by filename.""",
        
        "fallback": "I'm sorry, I don't have enough information in my knowledge base to answer that question accurately."
    },
    "technical": {
        "system": """You are {bot_name}, representing {company_reference}. You are a technical expert and problem-solver.

KEY BEHAVIORS:
- Explain complex concepts with clarity and precision
- Provide step-by-step guidance for technical issues
- Use accurate terminology without unnecessary jargon
- Focus on practical, implementable solutions
- Validate understanding when explaining complex topics

RESPONSE STYLE:  
- Clear, structured explanations with logical progression
- Technical accuracy is paramount - never guess
- Break down complex topics into digestible parts
- Provide actionable technical guidance with examples

Use ONLY the provided context to answer. If the answer isn't in the context, say you don't know and offer to escalate.
Be precise and cite sources by filename.""",
        
        "fallback": "I can only answer questions based on the provided documentation, and I don't have relevant information for this question."
    },
    "custom": {
        "system": """You are {bot_name}, representing {company_reference}. You are an AI assistant.

{system_message}

Use ONLY the provided context to answer. If the answer isn't in the context, use the configured fallback response.
Cite sources by filename when appropriate.""",
        
        "fallback": "I'm not able to answer that question with the information available to me."
    }
}

# 🎯 SAFETY GUARDRAIL TEMPLATES
SAFETY_GUARDRAILS = {
    "lenient": """FLEXIBLE GUIDELINES:
- Use general knowledge when specific documentation is unavailable
- Provide helpful guidance while clearly noting limitations  
- Use common sense and reasonable judgment in responses
- Maintain basic ethical standards and user privacy
- Be transparent about knowledge boundaries and sources""",
    
    "standard": """SAFETY & COMPLIANCE:
- Do not provide medical, financial, or legal advice
- Do not generate harmful, unethical, or discriminatory content
- Maintain user privacy and confidentiality at all times
- Stay within your designated knowledge domain
- Escalate sensitive issues to human support when appropriate""",
    
    "strict": """STRICT COMPLIANCE MODE:
- ONLY answer questions directly related to the provided documentation
- IMMEDIATELY redirect any medical, financial, legal, or personal advice requests
- Do not speculate, hypothesize, or provide opinions beyond the given context
- Strictly maintain professional boundaries at all times
- Automatically escalate any ambiguous or sensitive queries to human support""",
    
    "custom": """CUSTOM SAFETY & COMPLIANCE RULES:
{guardrails}"""
}

def format_context(docs: List[Document]) -> str:
    """Combine retrieved docs into a readable context string."""
    out = []
    for d in docs:
        src = d.metadata.get("source") or d.metadata.get("file_path") or "doc"
        out.append(f"[{src}]\n{d.page_content}")
    return "\n\n".join(out)


def get_dynamic_system_prompt(bot_config: BotConfig) -> str:
    """Generate system prompt based on bot's template configuration"""
    
    # 🎯 GET PERSONALITY TEMPLATE
    personality_type = bot_config.personality_type or "professional"
    template = PERSONALITY_TEMPLATES.get(personality_type, PERSONALITY_TEMPLATES["professional"])
    
    # 🎯 GET SAFETY GUARDRAILS
    safety_level = bot_config.safety_level or "standard"
    guardrail_template = SAFETY_GUARDRAILS.get(safety_level, SAFETY_GUARDRAILS["standard"])
    
    # 🎯 BUILD COMPLETE SYSTEM PROMPT
    if personality_type == "custom" and bot_config.system_message:
        # Use custom system message if provided
        system_prompt = template["system"].format(
            bot_name=bot_config.bot_name,
            company_reference=bot_config.company_reference,
            system_message=bot_config.system_message
        )
    else:
        # Use template system message
        system_prompt = template["system"].format(
            bot_name=bot_config.bot_name,
            company_reference=bot_config.company_reference
        )
    
    # 🎯 ADD SAFETY GUARDRAILS
    if safety_level == "custom" and bot_config.guardrails:
        guardrails = guardrail_template.format(guardrails=bot_config.guardrails)
    else:
        guardrails = guardrail_template
    
    complete_system_prompt = f"{system_prompt}\n\nSAFETY GUIDELINES:\n{guardrails}"
    
    logger.info(f"🎯 Generated system prompt for {bot_config.bot_name}")
    logger.info(f"   Personality: {personality_type}, Safety: {safety_level}")
    logger.info(f"   Company: {bot_config.company_reference}")
    
    return complete_system_prompt


def get_fallback_response(bot_config: BotConfig) -> str:
    """Get appropriate fallback response based on safety level"""
    personality_type = bot_config.personality_type or "professional"
    template = PERSONALITY_TEMPLATES.get(personality_type, PERSONALITY_TEMPLATES["professional"])
    
    # Use bot's custom fallback if provided, otherwise use template fallback
    if bot_config.fallback:
        return bot_config.fallback
    else:
        return template["fallback"]


async def chat_for_bot_with_jwt(bot_id: str, message: str, jwt_token: str, tenant_id: str, top_k: int = 4) -> Tuple[str, List[str], Dict[str, Any]]:
    """Enhanced chat with template system support using JWT authentication"""
    try:
        # 🎯 GET BOT CONFIG WITH TEMPLATE SYSTEM
        bot_config = await get_bot_config_with_jwt(bot_id, jwt_token, tenant_id)
        
        logger.info(f"🎯 Chat request for bot: {bot_config.bot_name}")
        logger.info(f"📋 Template config: {bot_config.get_template_info()}")
        
        # Retrieve relevant documents
        retriever = make_retriever(bot_id, user_id=None)
        docs = retriever(message, top_k=top_k)
        ctx = format_context(docs)
        
        # 🎯 DYNAMIC PROMPT GENERATION
        system_prompt = get_dynamic_system_prompt(bot_config)
        
        # Create prompt with dynamic system message
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", "Question: {question}\n\nContext:\n{context}\n\nAnswer:")
        ])
        
        # Generate response
        llm = make_llm(model=bot_config.model, temperature=bot_config.temperature)
        prompt_messages = prompt.format_messages(question=message, context=ctx)
        resp = llm.invoke(prompt_messages)
        
        # Extract response content
        response_content = resp.content if hasattr(resp, "content") else str(resp)
        
        # 🎯 HANDLE NO CONTEXT FOUND
        if not docs and "don't know" in response_content.lower():
            fallback_response = get_fallback_response(bot_config)
            response_content = f"{fallback_response}\n\n{response_content}"
        
        # Extract simple source names
        sources = [
            d.metadata.get("source") or d.metadata.get("file_path") or "doc"
            for d in docs
        ]
        
        # 🎯 RETURN TEMPLATE INFO FOR DEBUGGING
        template_info = {
            "personality_type": bot_config.personality_type,
            "safety_level": bot_config.safety_level,
            "company_reference": bot_config.company_reference,
            "model": bot_config.model,
            "temperature": bot_config.temperature
        }
        
        logger.info(f"✅ Chat completed for {bot_config.bot_name}")
        logger.info(f"   Response length: {len(response_content)}")
        logger.info(f"   Sources found: {len(sources)}")
        
        return response_content, sources, template_info
        
    except Exception as e:
        logger.error(f"💥 Chat error for bot {bot_id}: {e}")
        raise


# 🎯 BACKWARD COMPATIBLE FUNCTION
def chat_for_bot(bot_id: str, message: str, top_k: int = 4) -> Tuple[str, List[str]]:
    """Legacy function for backward compatibility"""
    try:
        # Fallback to basic chat without template system
        retriever = make_retriever(bot_id, user_id=None)
        docs = retriever(message, top_k=top_k)
        ctx = format_context(docs)
        
        # Use default system prompt
        prompt = ChatPromptTemplate.from_messages([
            ("system", SYSTEM),
            ("human", "Question: {question}\n\nContext:\n{context}\n\nAnswer:")
        ])
        
        llm = make_llm()
        prompt_messages = prompt.format_messages(question=message, context=ctx)
        resp = llm.invoke(prompt_messages)
        
        response_content = resp.content if hasattr(resp, "content") else str(resp)
        
        sources = [
            d.metadata.get("source") or d.metadata.get("file_path") or "doc"
            for d in docs
        ]
        
        return response_content, sources
        
    except Exception as e:
        logger.error(f"💥 Legacy chat error: {e}")
        return "I'm sorry, I encountered an error processing your request.", []