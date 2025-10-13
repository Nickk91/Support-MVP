// server/scripts/migrateUsers.js
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { connectMongo } from "../src/lib/mongo.js";
import { User } from "../src/models/User.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USERS_FILE = path.join(__dirname, "../data/users/users.json");

async function migrateUsers() {
  try {
    await connectMongo(process.env.MONGODB_URI);

    const mongoUsers = await User.find({});
    console.log(`📦 Found ${mongoUsers.length} users in MongoDB`);

    const usersData = {
      users: mongoUsers.map((user) => ({
        id: user._id.toString(),
        email: user.email,
        passwordHash: user.passwordHash,
        firstName: user.firstName,
        lastName: user.lastName,
        companyName: user.companyName,
        tenantId: user.tenantId,
        role: user.role,
        isActive: user.isActive,
        plan: user.plan,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      })),
      lastId: mongoUsers.length,
    };

    await fs.writeFile(USERS_FILE, JSON.stringify(usersData, null, 2));
    console.log("✅ Users migrated to JSON file");

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

migrateUsers();
