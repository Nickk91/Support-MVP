import { connectMongoose } from "../src/lib/mongo.js";
import Bot from "../src/models/Bot.js";
import User from "../src/models/User.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function migrate() {
  try {
    console.log("🔄 Starting migration to MongoDB...");

    // Connect to MongoDB using your lib function
    await connectMongoose();
    console.log("✅ Connected to MongoDB");

    // Read existing JSON files
    const botsPath = join(__dirname, "../data/bots.json");
    const usersPath = join(__dirname, "../data/users.json");

    let botsMigrated = 0;
    let usersMigrated = 0;

    // Migrate bots
    if (require("fs").existsSync(botsPath)) {
      console.log("📁 Found bots.json, migrating bots...");
      const botsData = JSON.parse(readFileSync(botsPath, "utf8"));

      for (const bot of botsData.bots) {
        // Ensure the bot has required fields
        const botData = {
          id: bot.id,
          botName: bot.botName,
          model: bot.model,
          systemMessage: bot.systemMessage || "",
          fallback: bot.fallback || "",
          greeting: bot.greeting || "",
          guardrails: bot.guardrails || "",
          temperature: bot.temperature || 0.7,
          escalation: bot.escalation || {
            enabled: false,
            escalation_email: "",
          },
          files: bot.files || [],
          tenantId: bot.tenantId,
          ownerId: bot.ownerId,
          createdAt: new Date(bot.createdAt),
          updatedAt: new Date(bot.updatedAt),
        };

        await Bot.findOneAndUpdate({ id: bot.id }, botData, {
          upsert: true,
          new: true,
        });
        botsMigrated++;
      }
      console.log(`✅ Migrated ${botsMigrated} bots to MongoDB`);
    } else {
      console.log("⚠️  bots.json not found, skipping bots migration");
    }

    // Migrate users
    if (require("fs").existsSync(usersPath)) {
      console.log("📁 Found users.json, migrating users...");
      const usersData = JSON.parse(readFileSync(usersPath, "utf8"));

      for (const user of usersData.users) {
        const userData = {
          userId: user.userId,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          tenantId: user.tenantId,
          createdAt: new Date(user.createdAt),
          updatedAt: new Date(user.updatedAt),
        };

        await User.findOneAndUpdate({ userId: user.userId }, userData, {
          upsert: true,
          new: true,
        });
        usersMigrated++;
      }
      console.log(`✅ Migrated ${usersMigrated} users to MongoDB`);
    } else {
      console.log("⚠️  users.json not found, skipping users migration");
    }

    console.log("🎉 Migration completed successfully!");
    console.log(
      `📊 Summary: ${botsMigrated} bots, ${usersMigrated} users migrated`
    );
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrate();
}

export default migrate;
