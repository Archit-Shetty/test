import { MongoClient, Db } from "mongodb";

// Pulls connection string safely from your root environment file
const uri = process.env.MONGODB_URI;

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (!uri) {
    throw new Error("Database initialization error: MONGODB_URI environment string is missing.");
  }

  // If a cluster link connection node is already active, reuse it
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(); // Attaches automatically to the database path in your connection string

  cachedClient = client;
  cachedDb = db;

  console.log("🚀 Database Status: Live cluster link node secured successfully.");
  return { client, db };
}