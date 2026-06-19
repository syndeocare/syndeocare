import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { schema } from "./schema.js";

const DEFAULT_DATABASE_URL =
  "postgresql://syndeocare:syndeocare@127.0.0.1:5432/syndeocare";

let pool: Pool | undefined;

export function getDatabaseUrl() {
  return process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
}

function shouldUseSsl(databaseUrl: string) {
  if (process.env.DATABASE_SSL === "false") {
    return false;
  }

  try {
    const url = new URL(databaseUrl);
    const sslMode = url.searchParams.get("sslmode");

    if (sslMode === "disable") {
      return false;
    }

    if (sslMode === "require") {
      return true;
    }

    return !["127.0.0.1", "localhost", "postgres", "db"].includes(url.hostname);
  } catch {
    return false;
  }
}

export function getPool() {
  if (!pool) {
    const databaseUrl = getDatabaseUrl();

    pool = new Pool({
      connectionString: databaseUrl,
      max: 10,
      ...(shouldUseSsl(databaseUrl)
        ? {
            ssl: {
              rejectUnauthorized: false,
            },
          }
        : {}),
    });
  }

  return pool;
}

export function getDb() {
  return drizzle(getPool(), { schema });
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
