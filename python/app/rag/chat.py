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
        "system": "{system_message}",
        "fallback": "{fallback_message}"
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
    
    "custom": "{guardrails}"  # This template will be replaced with actual bot guardrails
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
    
    # 🎯 BUILD PERSONALITY SYSTEM PROMPT
    if personality_type == "custom":
        # Use bot's custom system message directly from database
        system_prompt = bot_config.system_message
        logger.info(f"🎯 Using CUSTOM system message for {bot_config.bot_name}")
        logger.info(f"   Custom system message length: {len(system_prompt)}")
    else:
        # Use template system message with bot-specific variables
        system_prompt = template["system"].format(
            bot_name=bot_config.bot_name,
            company_reference=bot_config.company_reference
        )
        logger.info(f"🎯 Using {personality_type.upper()} template system message for {bot_config.bot_name}")
    
    # 🎯 BUILD SAFETY GUARDRAILS - CRITICAL: Use bot's custom guardrails from database
    if safety_level == "custom":
        # Use bot's custom guardrails directly from database
        if bot_config.guardrails:
            guardrails = bot_config.guardrails
            logger.info(f"🛡️ Using CUSTOM guardrails from database for {bot_config.bot_name}")
            logger.info(f"   Custom guardrails length: {len(guardrails)}")
            logger.info(f"   Custom guardrails preview: {guardrails[:100]}...")
        else:
            # Fallback if custom safety level but no guardrails defined
            guardrails = "No custom safety rules defined. Please use standard safety guidelines."
            logger.warning(f"🛡️ CUSTOM safety level but NO guardrails defined for {bot_config.bot_name}")
    else:
        # Use template guardrails
        guardrails = guardrail_template
        logger.info(f"🛡️ Using {safety_level.upper()} template guardrails for {bot_config.bot_name}")
    
    # 🎯 COMBINE PERSONALITY AND SAFETY
    complete_system_prompt = f"{system_prompt}\n\nSAFETY & COMPLIANCE RULES:\n{guardrails}"
    
    logger.info(f"🎯 Generated complete system prompt for {bot_config.bot_name}")
    logger.info(f"   Personality: {personality_type}, Safety: {safety_level}")
    logger.info(f"   Company: {bot_config.company_reference}")
    logger.info(f"   System prompt length: {len(system_prompt)}")
    logger.info(f"   Guardrails length: {len(guardrails)}")
    logger.info(f"   Total prompt length: {len(complete_system_prompt)}")
    
    return complete_system_prompt


def get_fallback_response(bot_config: BotConfig) -> str:
    """Get appropriate fallback response based on personality and safety configuration"""
    personality_type = bot_config.personality_type or "professional"
    template = PERSONALITY_TEMPLATES.get(personality_type, PERSONALITY_TEMPLATES["professional"])
    
    # Use bot's custom fallback if personality is custom OR if bot has custom fallback
    if personality_type == "custom" or bot_config.fallback:
        fallback_response = bot_config.fallback or "I'm not able to answer that question with the information available to me."
        logger.info(f"🎯 Using CUSTOM fallback from database for {bot_config.bot_name}")
        if bot_config.fallback:
            logger.info(f"   Custom fallback length: {len(bot_config.fallback)}")
            logger.info(f"   Custom fallback preview: {bot_config.fallback[:100]}...")
    else:
        # Use template fallback
        fallback_response = template["fallback"]
        logger.info(f"🎯 Using {personality_type.upper()} template fallback for {bot_config.bot_name}")
    
    return fallback_response


def get_greeting_message(bot_config: BotConfig) -> str:
    """Get appropriate greeting message based on bot configuration"""
    # Always use bot's custom greeting from database if available
    if bot_config.greeting:
        logger.info(f"👋 Using CUSTOM greeting from database for {bot_config.bot_name}")
        logger.info(f"   Custom greeting length: {len(bot_config.greeting)}")
        logger.info(f"   Custom greeting preview: {bot_config.greeting[:100]}...")
        return bot_config.greeting
    else:
        # Fallback to a simple greeting (could be enhanced with templates)
        default_greeting = f"Hello! I'm {bot_config.bot_name}, representing {bot_config.company_reference}. How can I help you today?"
        logger.info(f"👋 Using DEFAULT greeting for {bot_config.bot_name}")
        return default_greeting


async def chat_for_bot_with_jwt(bot_id: str, message: str, jwt_token: str, tenant_id: str, top_k: int = 4) -> Tuple[str, List[str], Dict[str, Any]]:
    """Enhanced chat with template system support using JWT authentication"""
    try:
        # 🎯 GET BOT CONFIG WITH TEMPLATE SYSTEM
        bot_config = await get_bot_config_with_jwt(bot_id, jwt_token, tenant_id)
        
        logger.info(f"🎯 Chat request for bot: {bot_config.bot_name}")
        logger.info(f"📋 Template config - Personality: {bot_config.personality_type}, Safety: {bot_config.safety_level}")
        logger.info(f"📋 Model: {bot_config.model}, Temperature: {bot_config.temperature}")
        logger.info(f"📋 Company: {bot_config.company_reference}")
        
        # Log custom content availability
        logger.info(f"📋 Custom content available:")
        logger.info(f"   - System Message: {'YES' if bot_config.system_message else 'NO'} (length: {len(bot_config.system_message) if bot_config.system_message else 0})")
        logger.info(f"   - Guardrails: {'YES' if bot_config.guardrails else 'NO'} (length: {len(bot_config.guardrails) if bot_config.guardrails else 0})")
        logger.info(f"   - Fallback: {'YES' if bot_config.fallback else 'NO'} (length: {len(bot_config.fallback) if bot_config.fallback else 0})")
        logger.info(f"   - Greeting: {'YES' if bot_config.greeting else 'NO'} (length: {len(bot_config.greeting) if bot_config.greeting else 0})")
        
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
            logger.info(f"📝 Applied fallback response for {bot_config.bot_name}")
        
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
            "temperature": bot_config.temperature,
            "used_custom_system": bot_config.personality_type == "custom" and bool(bot_config.system_message),
            "used_custom_guardrails": bot_config.safety_level == "custom" and bool(bot_config.guardrails),
            "used_custom_fallback": (bot_config.personality_type == "custom" or bool(bot_config.fallback)) and bool(bot_config.fallback),
            "used_custom_greeting": bool(bot_config.greeting),
            "custom_system_length": len(bot_config.system_message) if bot_config.system_message else 0,
            "custom_guardrails_length": len(bot_config.guardrails) if bot_config.guardrails else 0,
            "custom_fallback_length": len(bot_config.fallback) if bot_config.fallback else 0,
            "custom_greeting_length": len(bot_config.greeting) if bot_config.greeting else 0
        }
        
        logger.info(f"✅ Chat completed for {bot_config.bot_name}")
        logger.info(f"   Response length: {len(response_content)}")
        logger.info(f"   Sources found: {len(sources)}")
        logger.info(f"   Custom content used:")
        logger.info(f"     - System: {template_info['used_custom_system']} ({template_info['custom_system_length']} chars)")
        logger.info(f"     - Guardrails: {template_info['used_custom_guardrails']} ({template_info['custom_guardrails_length']} chars)")
        logger.info(f"     - Fallback: {template_info['used_custom_fallback']} ({template_info['custom_fallback_length']} chars)")
        logger.info(f"     - Greeting: {template_info['used_custom_greeting']} ({template_info['custom_greeting_length']} chars)")
        
        return response_content, sources, template_info
        
    except Exception as e:
        logger.error(f"💥 Chat error for bot {bot_id}: {e}")
        raise


# 🎯 NEW FUNCTION TO GET BOT GREETING
async def get_bot_greeting_with_jwt(bot_id: str, jwt_token: str, tenant_id: str) -> Dict[str, Any]:
    """Get bot's greeting message with template info"""
    try:
        bot_config = await get_bot_config_with_jwt(bot_id, jwt_token, tenant_id)
        greeting = get_greeting_message(bot_config)
        
        return {
            "greeting": greeting,
            "bot_name": bot_config.bot_name,
            "company_reference": bot_config.company_reference,
            "personality_type": bot_config.personality_type,
            "safety_level": bot_config.safety_level,
            "is_custom_greeting": bool(bot_config.greeting),
            "custom_greeting_length": len(bot_config.greeting) if bot_config.greeting else 0
        }
    except Exception as e:
        logger.error(f"💥 Error getting greeting for bot {bot_id}: {e}")
        return {
            "greeting": "Hello! How can I help you today?",
            "bot_name": "Assistant",
            "company_reference": "our company",
            "personality_type": "professional",
            "safety_level": "standard",
            "is_custom_greeting": False,
            "custom_greeting_length": 0
        }


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