// server/src/test-user-model.js
import mongoose from "mongoose";
import { User } from "./models/User.js";
import dotenv from "dotenv";

dotenv.config();

async function checkUserModel() {
  await mongoose.connect(process.env.MONGODB_URI);

  console.log("=== USER MODEL ANALYSIS ===");
  console.log("User schema paths:", Object.keys(User.schema.paths));
  console.log("_id field config:", User.schema.paths._id);
  console.log("_id instance type:", User.schema.paths._id?.instance);
  console.log("Schema options:", User.schema.options);

  process.exit(0);
}

checkUserModel().catch(console.error);
