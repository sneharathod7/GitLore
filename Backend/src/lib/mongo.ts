import { MongoClient, Db, ObjectId } from "mongodb";

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectDB(): Promise<Db> {
  if (db) {
    return db;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI environment variable is not set");
  }

  client = new MongoClient(uri);
  await client.connect();
  db = client.db("gitlore");

  // Create indexes
  await createIndexes(db);

  console.log("Connected to MongoDB");
  return db;
}

async function createIndexes(database: Db) {
  try {
    // Users collection index
    await database
      .collection("users")
      .createIndex({ github_id: 1 }, { unique: true });

    // Comment patterns collection indexes
    await database
      .collection("comment_patterns")
      .createIndex({ trigger_keywords: 1 });

    // Cache collections indexes
    await database.collection("commit_cache").createIndex({ repo: 1, sha: 1 });
    await database
      .collection("explanations_cache")
      .createIndex({ repo: 1, file_path: 1, line: 1 });

    console.log("Database indexes created");
  } catch (error) {
    console.error("Error creating indexes:", error);
    throw error;
  }
}

export function getDB(): Db {
  if (!db) {
    throw new Error("Database not connected. Call connectDB() first.");
  }
  return db;
}

export async function disconnectDB(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log("Disconnected from MongoDB");
  }
}

export { ObjectId };
