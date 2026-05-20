import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPool, closePool } from "../client.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(currentDir, "../../migrations");

async function ensureMigrationTable() {
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getExecutedMigrationIds() {
  const pool = getPool();
  const result = await pool.query<{ id: string }>(
    "SELECT id FROM schema_migrations",
  );

  return new Set(result.rows.map((row) => row.id));
}

async function run() {
  await ensureMigrationTable();
  const executedMigrationIds = await getExecutedMigrationIds();
  const migrationFiles = (await readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const migrationFile of migrationFiles) {
    if (executedMigrationIds.has(migrationFile)) {
      continue;
    }

    const sql = await readFile(path.join(migrationsDir, migrationFile), "utf8");
    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (id) VALUES ($1)", [
        migrationFile,
      ]);
      await client.query("COMMIT");
      console.log(`Applied migration ${migrationFile}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

run()
  .catch((error) => {
    console.error("Migration failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
