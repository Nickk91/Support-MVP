import { MongoClient } from "mongodb";
import mongoose from "mongoose";

let cachedClient = null;
let cachedDb = null;

export async function connectMongoose() {
  // Use environment variable for connection string
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    console.error("❌ MONGODB_URI environment variable is required");
    console.log("💡 Please add MONGODB_URI to your .env file");
    console.log(
      "💡 Format: mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/database?retryWrites=true&w=majority"
    );
    process.exit(1);
  }

  console.log("🔧 Attempting to connect to MongoDB...");

  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Mongoose connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    console.log("🔧 Please check:");
    console.log("   - MongoDB Atlas connection string format");
    console.log("   - Network connectivity");
    console.log("   - IP whitelisting in MongoDB Atlas");
    console.log("   - Database user credentials");
    process.exit(1);
  }
}

export async function connectMongo(uri) {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = await MongoClient.connect(uri);
  const db = client.db("rag-platform");

  cachedClient = client;
  cachedDb = db;

  console.log("✅ Connected to MongoDB");
  return { client, db };
}

export function getDb() {
  if (!cachedDb) {
    throw new Error("Database not initialized. Call connectMongo first.");
  }
  return cachedDb;
}
