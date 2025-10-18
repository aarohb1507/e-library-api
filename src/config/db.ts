import { config } from "./config";
import mongoose from "mongoose";

const connectDB = async ()=>{
  
  try{

   await mongoose.connect(config.databaseUrl as string)

   mongoose.connection.on("connected", ()=>{
    console.log("Connected to database successfully")
   })


   mongoose.connection.on("error", (err)=>{
    console.log("Failed to connect to the database", err)
   })
  }catch(err){

    console.error("Failed to connect database", err)
    process.exit(1)

  }
}

export default connectDB