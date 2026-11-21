import "dotenv/config";
import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.mongodb_url);

const db = client.db("fixmateDB");

export { client, db };