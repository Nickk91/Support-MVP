# python/app/rag/prompts.py
class PromptManager:
    def __init__(self, bot_config):
        self.bot_config = bot_config
    
    def build_chat_prompt(self, question, context):
        return f"""
# Role: {self.bot_config.bot_name}
# System Instructions: {self.bot_config.system_message}
# Safety Guidelines: {self.bot_config.guardrails}

# Context from knowledge base:
{context}

# User Question: {question}

# Instructions:
- Answer based on the context above
- If context doesn't contain answer, say: "{self.bot_config.fallback}"
- Follow: {self.bot_config.guardrails}
- Tone: {self.bot_config.greeting or 'professional and helpful'}

Answer:"""