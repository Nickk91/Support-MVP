// server/scripts/test-python-integration.js
import pythonService from "../src/services/pythonService.js";

async function testIntegration() {
  console.log("🧪 Testing Python RAG integration...");

  // Test health check
  const health = await pythonService.healthCheck();
  console.log("Health check:", health.ok ? "✅ Connected" : "❌ Failed");

  if (health.ok) {
    // Test bot creation
    const botResult = await pythonService.createBot({
      botId: "test-bot-123",
      botName: "Test Bot",
      systemMessage: "You are a helpful assistant",
      model: "gpt-4o-mini",
      fallback: "I cannot answer that question",
      tenantId: "test-tenant",
      ownerId: "test-user",
    });

    console.log("Bot creation:", botResult.ok ? "✅ Success" : "❌ Failed");
  }
}

testIntegration();
