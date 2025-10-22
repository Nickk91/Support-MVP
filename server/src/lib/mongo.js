import { MongoClient } from "mongodb";
import mongoose from "mongoose";

let cachedClient = null;
let cachedDb = null;

// Your existing function
export async function connectMongo(uri) {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = await MongoClient.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const db = client.db("rag-platform");

  cachedClient = client;
  cachedDb = db;

  console.log("✅ Connected to MongoDB");
  return { client, db };
}

// Add Mongoose connection function
export async function connectMongoose() {
  const MONGODB_URI = `mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@cluster0.mongodb.net/rag-platform?retryWrites=true&w=majority`;

  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Mongoose connected to MongoDB");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
}

// Helper function to get database instance
export function getDb() {
  if (!cachedDb) {
    throw new Error("Database not initialized. Call connectMongo first.");
  }
  return cachedDb;
}
