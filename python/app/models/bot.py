# python/app/models/bot.py
import os
from typing import Optional, Dict, Any, List
import requests
import logging
from enum import Enum

logger = logging.getLogger(__name__)

class PersonalityType(str, Enum):
    FRIENDLY = "friendly"
    PROFESSIONAL = "professional" 
    TECHNICAL = "technical"
    CUSTOM = "custom"

class SafetyLevel(str, Enum):
    LENIENT = "lenient"
    STANDARD = "standard"
    STRICT = "strict"
    CUSTOM = "custom"

class BrandTier(str, Enum):
    BASIC = "basic"
    PRO = "pro"
    ENTERPRISE = "enterprise"

class VerificationStatus(str, Enum):
    UNVERIFIED = "unverified"
    PENDING = "pending"
    VERIFIED = "verified"

class BotConfig:
    """Bot configuration fetched from Express server with template system support"""
    
    def __init__(self, bot_data: Dict[str, Any]):
        self.id = bot_data.get('_id') or bot_data.get('id')
        self.bot_name = bot_data.get('botName')
        self.model = bot_data.get('model', 'gpt-4o-mini')
        self.system_message = bot_data.get('systemMessage')
        self.fallback = bot_data.get('fallback')
        self.greeting = bot_data.get('greeting') 
        self.guardrails = bot_data.get('guardrails')
        self.temperature = bot_data.get('temperature', 0.7)
        self.files = bot_data.get('files', [])
        self.owner_id = bot_data.get('ownerId')
        
        # 🎯 NEW TEMPLATE SYSTEM FIELDS
        self.company_reference = bot_data.get('companyReference', self.bot_name)
        self.personality_type = bot_data.get('personalityType', 'professional')
        self.safety_level = bot_data.get('safetyLevel', 'standard')
        
        # 🎯 BRAND SYSTEM
        self.brand_context = bot_data.get('brandContext', {})
        self.current_brand = bot_data.get('currentBrand', {})
        
        # 🎯 ENSURE BACKWARD COMPATIBILITY
        if not self.brand_context:
            self.brand_context = {
                'primaryCompany': self.company_reference,
                'verifiedBrands': [],
                'customBrands': [],
                'tier': 'basic',
                'verificationStatus': 'unverified'
            }
        
        if not self.current_brand:
            self.current_brand = {
                'type': 'primary',
                'reference': self.company_reference
            }
        
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
            "guardrails": self.guardrails,
            # 🎯 NEW TEMPLATE FIELDS
            "company_reference": self.company_reference,
            "personality_type": self.personality_type,
            "safety_level": self.safety_level,
            "brand_context": self.brand_context,
            "current_brand": self.current_brand
        }
    
    def get_template_info(self) -> Dict[str, str]:
        """Get template information for logging and debugging"""
        return {
            "personality": self.personality_type,
            "safety": self.safety_level,
            "company": self.company_reference,
            "is_custom_personality": self.personality_type == "custom",
            "is_custom_safety": self.safety_level == "custom"
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
            if bot_data.get('ok'):
                bot_config = BotConfig(bot_data['bot'])
                template_info = bot_config.get_template_info()
                logger.info(f"✅ Successfully fetched bot: {bot_config.bot_name}")
                logger.info(f"🎯 Template config: {template_info}")
                return bot_config
            else:
                logger.warning(f"❌ Response not OK: {bot_data}")
                return None
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
    
    # Fallback configuration with template system defaults
    logger.warning(f"⚠️ Using fallback bot config for {bot_id}")
    return BotConfig({
        'id': bot_id,
        'botName': f'Bot {bot_id}',
        'systemMessage': 'You are a helpful AI assistant. Answer questions based on the provided documentation.',
        'model': 'gpt-4o-mini',
        'temperature': 0.7,
        'companyReference': f'Bot {bot_id}',
        'personalityType': 'professional',
        'safetyLevel': 'standard'
    })

# python/app/models/bot.py - UPDATE get_bot_by_jwt function
async def get_bot_by_jwt(bot_id: str, jwt_token: str, tenant_id: str) -> Optional[BotConfig]:
    """
    Fetch bot configuration from Express server using user's JWT
    """
    try:
        express_url = os.getenv('EXPRESS_SERVER_URL', 'http://localhost:4000')
        
        logger.info(f"🔍 Fetching bot config with JWT: {express_url}/api/bots/{bot_id}")
        logger.info(f"   JWT token present: {jwt_token is not None}")
        if jwt_token:
            logger.info(f"   JWT token format: {'Bearer' in jwt_token}")
        
        headers = {
            'X-Tenant-ID': tenant_id,
            'Content-Type': 'application/json',
        }
        
        # 🎯 CRITICAL FIX: Add the full Authorization header as received
        if jwt_token:
            headers['Authorization'] = jwt_token
        
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
                bot_config = BotConfig(bot_data)
                template_info = bot_config.get_template_info()
                logger.info(f"✅ Successfully fetched bot: {bot_config.bot_name}")
                logger.info(f"🎯 Template config: {template_info}")
                return bot_config
            else:
                logger.warning(f"❌ Response not OK: {response_data}")
                return None
        elif response.status_code == 401:
            logger.warning(f"❌ Authentication failed (401) for bot {bot_id}")
            logger.warning(f"   Headers sent: { {k: v for k, v in headers.items() if k != 'Authorization'} }")
            logger.warning(f"   Response: {response.text[:200]}")
            return None
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
    
    # Fallback configuration with template system defaults
    logger.warning(f"⚠️ Using fallback bot config for {bot_id}")
    return BotConfig({
        'id': bot_id,
        'botName': f'Bot {bot_id}',
        'systemMessage': 'You are a helpful AI assistant. Answer questions based on the provided documentation.',
        'model': 'gpt-4o-mini',
        'temperature': 0.7,
        'companyReference': f'Bot {bot_id}',
        'personalityType': 'professional',
        'safetyLevel': 'standard'
    })