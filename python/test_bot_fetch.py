import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'python'))

from app.models.bot import get_bot_by_id, get_bot_config_with_fallback
import asyncio
import requests

async def test_express_connection():
    """Test if we can connect to Express server with internal token"""
    print("=== TESTING EXPRESS SERVER CONNECTION ===")
    
    express_url = "http://localhost:4000"
    jwt_secret = "your-super-secret-jwt-key-change-in-production"
    
    try:
        headers = {
            'X-Internal-Token': jwt_secret,
            'Content-Type': 'application/json'
        }
        
        response = requests.get(f"{express_url}/api/bots", headers=headers, timeout=5)
        print(f"Express server status: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ Express server authenticated with internal token!")
        else:
            print(f"ℹ️ Express server returned: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Cannot connect to Express server: {e}")
        return False
    
    return True

async def test_bot_fetch():
    """Test fetching bot configuration with internal token"""
    print("\n=== TESTING BOT CONFIGURATION FETCH ===")
    
    bot_id = "JYxatIg6DeokeweCPulno"  
    tenant_id = "default_tenant"
    
    # Test direct fetch
    print(f"Fetching bot: {bot_id}")
    bot_config = await get_bot_by_id(bot_id, tenant_id)
    
    if bot_config:
        print("✅ SUCCESS: Bot configuration fetched!")
        print(f"Bot Name: {bot_config.bot_name}")
        print(f"System Message: {bot_config.system_message}")
        print(f"Model: {bot_config.model}")
        print(f"Temperature: {bot_config.temperature}")
        if bot_config.guardrails:
            print(f"Guardrails: {bot_config.guardrails[:100]}...")
    else:
        print("❌ FAILED: Could not fetch bot configuration")
        print("Trying with fallback...")
        
        # Test fallback
        fallback_config = await get_bot_config_with_fallback(bot_id, tenant_id)
        print(f"Fallback Bot Name: {fallback_config.bot_name}")
        print(f"Fallback System Message: {fallback_config.system_message}")

async def main():
    """Run all tests"""
    # Test connection first
    connected = await test_express_connection()
    
    if connected:
        # Test bot fetch
        await test_bot_fetch()
    else:
        print("\n⚠️  Cannot test bot fetch without Express connection")

if __name__ == "__main__":
    asyncio.run(main())