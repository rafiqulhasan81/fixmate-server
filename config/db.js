
import "dotenv/config";
import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.mongodb_url);

const db = client.db("fixmateDB");

let connectionPromise;

const connectDB = async () => {
  if (!connectionPromise) {
    connectionPromise = client.connect().catch((error) => {
      connectionPromise = null;
      throw error;
    });
  }

  await connectionPromise;

  return db;
};

export { client, db, connectDB };
