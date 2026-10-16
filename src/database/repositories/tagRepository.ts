import { newId } from "../../lib/ids";
import { getDatabase } from "../client";

export type ScanTag = {
  id: string;
  name: string;
  createdAt: string;
};

type TagRow = {
  id: string;
  name: string;
  created_at: string;
};

function toTag(row: TagRow): ScanTag {
  return { id: row.id, name: row.name, createdAt: row.created_at };
}

export async function listAllTags(): Promise<ScanTag[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<TagRow>(
    "SELECT id, name, created_at FROM tags ORDER BY name COLLATE NOCASE ASC",
  );
  return rows.map(toTag);
}

export async function listTagsForDocument(
  documentId: string,
): Promise<ScanTag[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<TagRow>(
    `SELECT t.id, t.name, t.created_at
     FROM tags t
     JOIN document_tags dt ON dt.tag_id = t.id
     WHERE dt.document_id = ?
     ORDER BY t.name COLLATE NOCASE ASC`,
    documentId,
  );
  return rows.map(toTag);
}

export async function addTagToDocument(
  documentId: string,
  rawName: string,
): Promise<ScanTag> {
  const name = rawName.trim().slice(0, 40);
  if (!name) {
    throw new Error("Tag name cannot be empty");
  }

  const db = await getDatabase();

  // Case-insensitive lookup so "Work" and "work" resolve to the same tag.
  let existing = await db.getFirstAsync<TagRow>(
    "SELECT id, name, created_at FROM tags WHERE name = ? COLLATE NOCASE",
    name,
  );

  if (!existing) {
    const id = newId("tag");
    const createdAt = new Date().toISOString();
    await db.runAsync(
      "INSERT INTO tags (id, name, created_at) VALUES (?, ?, ?)",
      id,
      name,
      createdAt,
    );
    existing = { id, name, created_at: createdAt };
  }

  await db.runAsync(
    "INSERT OR IGNORE INTO document_tags (document_id, tag_id) VALUES (?, ?)",
    documentId,
    existing.id,
  );

  return toTag(existing);
}

export async function removeTagFromDocument(
  documentId: string,
  tagId: string,
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    "DELETE FROM document_tags WHERE document_id = ? AND tag_id = ?",
    documentId,
    tagId,
  );
}
