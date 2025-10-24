// server\src\lib\mongo.js
import { MongoClient } from "mongodb";
import mongoose from "mongoose";

let cachedClient = null;
let cachedDb = null;

export async function connectMongoose() {
  const MONGODB_URI = process.env.MONGODB_URI;
  const APP_ENV = process.env.APP_ENV || "development";
  const DB_NAME = `rag_platform_${APP_ENV}`;

  if (!MONGODB_URI) {
    console.error("❌ MONGODB_URI environment variable is required");
    process.exit(1);
  }

  console.log(`🔧 Attempting to connect to MongoDB database: ${DB_NAME}...`);

  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME, // This should set the database name
    });
    console.log(`✅ Mongoose connected to MongoDB database: ${DB_NAME}`);
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
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
