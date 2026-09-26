import app from "./src/app.js";
import {
  PORT,
  validateConfig,
} from "./src/config/config.js";
import { connectDB } from "./src/config/db.js";

validateConfig();
await connectDB();

app.listen(PORT,"0.0.0.0",()=>{
    console.log("Servidor en el puerto ",PORT)
})
