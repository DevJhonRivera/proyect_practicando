import app from "./src/app.js";
import { PORT } from "./src/config/config.js";

app.listen(PORT,"0.0.0.0",()=>{
    console.log("Servidor en el puerto ",PORT)
})