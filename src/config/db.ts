// db.ts
import mongoose from "mongoose";
import { config } from "./config";
 
const connectDB = async () => {
  const uri = config.databaseUrl?.trim();
  if (!uri) throw new Error("Missing MONGO_CONNECTION_STRING");

  // Attach listeners BEFORE connecting so you don't miss early events
  const conn = mongoose.connection;

  // Use .once('open') for first successful open, .on for continuous events
  conn.once("open", () => {
    console.log("🟢 [mongoose] connection open");
  });
  conn.on("connected", () => {
    console.log("✅ [mongoose] connected");
  });
  conn.on("error", (err) => {
    console.error("🔴 [mongoose] connection error:", err);
  });
  conn.on("disconnected", () => {
    console.warn("🟠 [mongoose] disconnected");
  });

  // Now actually connect
  await mongoose.connect(uri);

  // Always have a post-await confirmation so you see *something* even if events fired earlier
  console.log("📌 connectDB(): connected (post-await)");
};

export default connectDB;
