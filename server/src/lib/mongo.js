// server/src/lib/mongo.js
import mongoose from "mongoose";

let cached = global._mongoose; // so hot reloads don't create new connections

if (!cached) {
  cached = global._mongoose = { conn: null, promise: null };
}

export async function connectMongo(uri) {
  if (cached.conn) return cached.conn;
  if (!uri) throw new Error("MONGODB_URI is not set");

  mongoose.set("strictQuery", true);

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(uri, {
        bufferCommands: false, // disable mongoose buffering if server down
      })
      .then((m) => m.connection);
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

// Optional: graceful shutdown
process.on("SIGINT", async () => {
  if (cached.conn) {
    await mongoose.disconnect();
    console.log("🔌 MongoDB connection closed (SIGINT)");
  }
  process.exit(0);
});
