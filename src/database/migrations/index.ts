import type { SQLiteDatabase } from "expo-sqlite";

export type Migration = {
  version: number;
  up: (db: SQLiteDatabase) => Promise<void>;
};

async function tableExists(db: SQLiteDatabase, name: string): Promise<boolean> {
  const row = await db.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
    name,
  );
  return row !== null;
}

async function tableHasColumn(
  db: SQLiteDatabase,
  table: string,
  column: string,
): Promise<boolean> {
  const cols = await db.getAllAsync<{ name: string }>(
    `PRAGMA table_info(${table})`,
  );
  return cols.some((c) => c.name === column);
}

export const migrations: Migration[] = [
  {
    version: 1,
    up: async (db) => {
      // If a legacy `documents` table with the old single-image shape exists,
      // rename it so we can create the new schema cleanly. The data is moved
      // into the new schema by migration 2.
      if (await tableExists(db, "documents")) {
        const isLegacy = await tableHasColumn(db, "documents", "image_uri");
        if (isLegacy) {
          await db.execAsync(
            "ALTER TABLE documents RENAME TO documents_legacy",
          );
        }
      }

      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS documents (
          id TEXT PRIMARY KEY NOT NULL,
          title TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          thumbnail_uri TEXT,
          pdf_uri TEXT,
          ocr_status TEXT NOT NULL DEFAULT 'pending'
        );

        CREATE TABLE IF NOT EXISTS pages (
          id TEXT PRIMARY KEY NOT NULL,
          document_id TEXT NOT NULL,
          position INTEGER NOT NULL,
          image_uri TEXT NOT NULL,
          original_uri TEXT,
          ocr_text TEXT,
          width INTEGER,
          height INTEGER,
          FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_pages_document_id
          ON pages (document_id, position);

        CREATE TABLE IF NOT EXISTS tags (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL UNIQUE,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS document_tags (
          document_id TEXT NOT NULL,
          tag_id TEXT NOT NULL,
          PRIMARY KEY (document_id, tag_id),
          FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
          FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
        );
      `);
    },
  },
  {
    version: 2,
    up: async (db) => {
      if (!(await tableExists(db, "documents_legacy"))) return;

      const rows = await db.getAllAsync<{
        id: string;
        title: string;
        image_uri: string;
        created_at: string;
      }>("SELECT id, title, image_uri, created_at FROM documents_legacy");

      for (const row of rows) {
        await db.runAsync(
          `INSERT INTO documents
             (id, title, created_at, updated_at, thumbnail_uri, pdf_uri, ocr_status)
           VALUES (?, ?, ?, ?, ?, NULL, 'pending')`,
          row.id,
          row.title,
          row.created_at,
          row.created_at,
          row.image_uri,
        );
        await db.runAsync(
          `INSERT INTO pages (id, document_id, position, image_uri)
           VALUES (?, ?, 0, ?)`,
          `${row.id}_p1`,
          row.id,
          row.image_uri,
        );
      }

      await db.execAsync("DROP TABLE documents_legacy");
    },
  },
];
