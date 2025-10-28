# python/app/models/bot.py
import os
from typing import Optional, Dict, Any
import requests
import logging

logger = logging.getLogger(__name__)

class BotConfig:
    """Bot configuration fetched from Express server"""
    
    def __init__(self, bot_data: Dict[str, Any]):
        self.id = bot_data.get('_id') or bot_data.get('id')
        self.bot_name = bot_data.get('botName')
        self.model = bot_data.get('model', 'gpt-4o-mini')
        self.system_message = bot_data.get('systemMessage')
        self.fallback = bot_data.get('fallback')
        self.greeting = bot_data.get('greeting') 
        self.guardrails = bot_data.get('guardrails')
        self.temperature = bot_data.get('temperature', 0.1)
        self.files = bot_data.get('files', [])
        self.owner_id = bot_data.get('ownerId')
        
    def to_dict(self):
        """Convert to dictionary for compatibility"""
        return {
            "id": self.id,
            "botName": self.bot_name,
            "system_message": self.system_message,
            "model": self.model,
            "temperature": self.temperature,
            "fallback": self.fallback,
            "greeting": self.greeting,
            "guardrails": self.guardrails
        }

async def get_bot_by_id(bot_id: str, tenant_id: str, user_id: str = None) -> Optional[BotConfig]:
    """
    Fetch bot configuration from Express server using shared JWT secret
    """
    try:
        express_url = os.getenv('EXPRESS_SERVER_URL', 'http://localhost:4000')
        jwt_secret = os.getenv('EXPRESS_JWT_SECRET', 'your-super-secret-jwt-key-change-in-production')
        
        logger.info(f"🔍 Fetching bot config from: {express_url}/api/bots/{bot_id}")
        logger.info(f"   Tenant: {tenant_id}, Bot: {bot_id}, User: {user_id}")
        
        headers = {
            'X-Tenant-ID': tenant_id,
            'Content-Type': 'application/json',
            'X-Internal-Token': jwt_secret
        }
        
        # Send the actual user ID so the service can act on their behalf
        if user_id:
            headers['X-Target-User-ID'] = user_id  # Use this header for service accounts
            headers['X-User-ID'] = user_id
        
        response = requests.get(
            f"{express_url}/api/bots/{bot_id}",
            headers=headers,
            timeout=10
        )
        
        logger.info(f"Response status: {response.status_code}")
        
        if response.status_code == 200:
            bot_data = response.json()
            logger.info(f"✅ Successfully fetched bot: {bot_data.get('botName')}")
            return BotConfig(bot_data)
        else:
            logger.warning(f"❌ Failed to fetch bot config: {response.status_code}")
            try:
                error_data = response.json()
                logger.warning(f"Error details: {error_data}")
            except:
                logger.warning(f"Response text: {response.text[:200]}...")
            return None
            
    except Exception as e:
        logger.error(f"💥 Error fetching bot config: {e}")
        return None
    

async def get_bot_config_with_fallback(bot_id: str, tenant_id: str, user_id: str = None) -> BotConfig:
    """
    Get bot config with fallback to minimal config
    """
    bot_config = await get_bot_by_id(bot_id, tenant_id, user_id)
    
    if bot_config:
        return bot_config
    
    # Fallback configuration
    logger.warning(f"⚠️ Using fallback bot config for {bot_id}")
    return BotConfig({
        'id': bot_id,
        'botName': f'Bot {bot_id}',
        'systemMessage': 'You are a helpful AI assistant. Answer questions based on the provided documentation.',
        'model': 'gpt-4o-mini',
        'temperature': 0.1
    })

async def get_bot_by_jwt(bot_id: str, jwt_token: str, tenant_id: str) -> Optional[BotConfig]:
    """
    Fetch bot configuration from Express server using user's JWT
    """
    try:
        express_url = os.getenv('EXPRESS_SERVER_URL', 'http://localhost:4000')
        
        logger.info(f"🔍 Fetching bot config with JWT: {express_url}/api/bots/{bot_id}")
        logger.info(f"   JWT token present: {jwt_token is not None}")
        if jwt_token:
            logger.info(f"   JWT token: {jwt_token[:50]}...")
        
        headers = {
            'X-Tenant-ID': tenant_id,
            'Content-Type': 'application/json',
        }
        
        # Add the full Authorization header as received
        if jwt_token:
            headers['Authorization'] = jwt_token  # This should be "Bearer <token>"
        
        response = requests.get(
            f"{express_url}/api/bots/{bot_id}",
            headers=headers,
            timeout=10
        )
        
        logger.info(f"Response status: {response.status_code}")
        
        if response.status_code == 200:
            response_data = response.json()
            if response_data.get('ok'):
                bot_data = response_data['bot']
                logger.info(f"✅ Successfully fetched bot: {bot_data.get('botName')}")
                return BotConfig(bot_data)
            else:
                logger.warning(f"❌ Response not OK: {response_data}")
        else:
            logger.warning(f"❌ Failed to fetch bot config: {response.status_code}")
            try:
                error_data = response.json()
                logger.warning(f"Error details: {error_data}")
            except:
                logger.warning(f"Response text: {response.text[:200]}...")
            return None
            
    except Exception as e:
        logger.error(f"💥 Error fetching bot config: {e}")
        return None
async def get_bot_config_with_jwt(bot_id: str, jwt_token: str, tenant_id: str) -> BotConfig:
    """
    Get bot config with JWT authentication
    """
    bot_config = await get_bot_by_jwt(bot_id, jwt_token, tenant_id)
    
    if bot_config:
        return bot_config
    
    # Fallback configuration
    logger.warning(f"⚠️ Using fallback bot config for {bot_id}")
    return BotConfig({
        'id': bot_id,
        'botName': f'Bot {bot_id}',
        'systemMessage': 'You are a helpful AI assistant. Answer questions based on the provided documentation.',
        'model': 'gpt-4o-mini',
        'temperature': 0.1
    })