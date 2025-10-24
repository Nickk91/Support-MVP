import mongoose from "mongoose";
import { connectMongoose } from "../lib/mongo.js";

async function checkModels() {
  try {
    await connectMongoose();

    console.log("🔍 Checking available models and collections...\n");

    // Get all collection names
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();
    console.log("📊 Collections in database:");
    collections.forEach((collection) => {
      console.log(`  - ${collection.name}`);
    });

    console.log("\n📝 Registered Mongoose models:");
    console.log(Object.keys(mongoose.models));

    // Check if we have any documents in relevant collections
    const sampleCollections = ["documents", "chunks", "bots", "uploads"];

    for (const collName of sampleCollections) {
      if (collections.some((c) => c.name === collName)) {
        const count = await mongoose.connection.db
          .collection(collName)
          .countDocuments();
        console.log(`\n📦 ${collName}: ${count} documents`);

        if (count > 0) {
          const sample = await mongoose.connection.db
            .collection(collName)
            .findOne();
          console.log(
            `   Sample:`,
            JSON.stringify(sample, null, 2).substring(0, 200) + "..."
          );
        }
      }
    }
  } catch (error) {
    console.error("Error checking models:", error);
  } finally {
    await mongoose.connection.close();
  }
}

checkModels();
