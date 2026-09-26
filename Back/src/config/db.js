import mongoose from "mongoose"
import {MONGO_URI} from "./config.js"

export const connectDB = async () => {
    try {
        mongoose.set("strictQuery", false);
        await mongoose.connect(MONGO_URI, {
            serverSelectionTimeoutMS: 10000,
            retryWrites: false,
        });
        console.log(
            "Mongo conectado:",
            mongoose.connection.name
        );
    } catch (error) {
        console.error("Error Mongo DB:", error.message);
        process.exit(1);
    }
};

export const mongoSoportaTransacciones = () => {
    const topologyType =
        mongoose.connection.client?.topology
            ?.description?.type;

    return [
        "ReplicaSetWithPrimary",
        "Sharded",
    ].includes(topologyType);
};
