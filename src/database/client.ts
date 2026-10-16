import * as SQLite from "expo-sqlite";
import { migrations } from "./migrations";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openAndMigrate().catch((error) => {
      // Allow a later call to retry if init failed.
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}

async function openAndMigrate(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync("scanly.db");
  await db.execAsync("PRAGMA journal_mode = WAL;");
  await db.execAsync("PRAGMA foreign_keys = ON;");
  await runMigrations(db);
  return db;
}

async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const applied = new Set(
    (
      await db.getAllAsync<{ version: number }>(
        "SELECT version FROM schema_migrations",
      )
    ).map((row) => row.version),
  );

  for (const migration of migrations) {
    if (applied.has(migration.version)) continue;
    await db.withTransactionAsync(async () => {
      await migration.up(db);
      await db.runAsync(
        "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)",
        migration.version,
        new Date().toISOString(),
      );
    });
  }
}
