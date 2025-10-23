// server/src/scripts/checkUsers.js
import mongoose from "mongoose";
import { User } from "../models/User.js";

async function checkUsers() {
  await mongoose.connect(process.env.MONGODB_URI);

  const users = await User.find({});
  console.log("📊 Users in database:");
  users.forEach((user) => {
    console.log(`- ID: ${user._id} (type: ${typeof user._id})`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Tenant: ${user.tenantId}`);
  });

  process.exit(0);
}

checkUsers().catch(console.error);
