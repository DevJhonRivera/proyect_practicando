import mongoose from "mongoose"
import {MONGO_URI} from "./config.js"

(async()=>{
    try {
        mongoose.set("strictQuery", false);
        await mongoose.connect(MONGO_URI);
    } catch (error) {
        console.error("Error Mongo DB:", error.message);
        
    }
})();
