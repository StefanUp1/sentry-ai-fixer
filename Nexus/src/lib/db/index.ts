import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { getServerEnv } from "../env";

export type Database = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  db: Database | undefined;
  sql: ReturnType<typeof postgres> | undefined;
};

/**
 * Postgres + Drizzle client (Node.js only). Safe to call from Server Components,
 * Route Handlers, and scripts — not from Edge runtime.
 */
export function getDb(): Database {
  if (!globalForDb.db) {
    const url = getServerEnv().DATABASE_URL;
    globalForDb.sql = postgres(url, { max: 10 });
    globalForDb.db = drizzle(globalForDb.sql, { schema });
  }
  return globalForDb.db;
}

export { schema };
