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
  try {
    const url = new URL(databaseUrl);

    if (url.searchParams.get("sslmode") === "require") {
      return true;
    }

    return !["127.0.0.1", "localhost"].includes(url.hostname);
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
