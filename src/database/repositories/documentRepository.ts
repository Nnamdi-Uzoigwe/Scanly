import { getDatabase } from "../client";

export type OcrStatus = "pending" | "processing" | "done" | "failed" | "empty";

export type ScanDocument = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  thumbnailUri: string | null;
  pdfUri: string | null;
  pageCount: number;
  ocrStatus: OcrStatus;
};

type DocumentRow = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  thumbnail_uri: string | null;
  pdf_uri: string | null;
  ocr_status: string;
  page_count: number;
};

const SELECT_DOCUMENT = `
  SELECT d.id, d.title, d.created_at, d.updated_at,
         d.thumbnail_uri, d.pdf_uri, d.ocr_status,
         (SELECT COUNT(*) FROM pages p WHERE p.document_id = d.id) AS page_count
  FROM documents d
`;

function toDocument(row: DocumentRow): ScanDocument {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    thumbnailUri: row.thumbnail_uri,
    pdfUri: row.pdf_uri,
    pageCount: row.page_count,
    ocrStatus: normalizeOcrStatus(row.ocr_status),
  };
}

function normalizeOcrStatus(value: string): OcrStatus {
  switch (value) {
    case "pending":
    case "processing":
    case "done":
    case "failed":
    case "empty":
      return value;
    default:
      return "pending";
  }
}

export async function listDocuments(): Promise<ScanDocument[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<DocumentRow>(
    `${SELECT_DOCUMENT} ORDER BY d.updated_at DESC`,
  );
  return rows.map(toDocument);
}

export async function getDocumentById(
  id: string,
): Promise<ScanDocument | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<DocumentRow>(
    `${SELECT_DOCUMENT} WHERE d.id = ?`,
    id,
  );
  return row ? toDocument(row) : null;
}

export async function insertDocument(input: {
  id: string;
  title: string;
  thumbnailUri: string | null;
  createdAt: string;
}): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO documents
       (id, title, created_at, updated_at, thumbnail_uri, pdf_uri, ocr_status)
     VALUES (?, ?, ?, ?, ?, NULL, 'pending')`,
    input.id,
    input.title,
    input.createdAt,
    input.createdAt,
    input.thumbnailUri,
  );
}

export async function renameDocument(id: string, title: string): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    "UPDATE documents SET title = ?, updated_at = ? WHERE id = ?",
    title,
    now,
    id,
  );
}

export async function setDocumentThumbnail(
  id: string,
  thumbnailUri: string | null,
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    "UPDATE documents SET thumbnail_uri = ?, updated_at = ? WHERE id = ?",
    thumbnailUri,
    new Date().toISOString(),
    id,
  );
}

export async function setDocumentPdfUri(
  id: string,
  pdfUri: string | null,
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    "UPDATE documents SET pdf_uri = ? WHERE id = ?",
    pdfUri,
    id,
  );
}

export async function setDocumentOcrStatus(
  id: string,
  status: OcrStatus,
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    "UPDATE documents SET ocr_status = ?, updated_at = ? WHERE id = ?",
    status,
    new Date().toISOString(),
    id,
  );
}

export async function touchDocument(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    "UPDATE documents SET updated_at = ? WHERE id = ?",
    new Date().toISOString(),
    id,
  );
}

export async function deleteDocumentRow(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM documents WHERE id = ?", id);
}

export async function searchDocuments(query: string): Promise<ScanDocument[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const db = await getDatabase();
  const like = `%${escapeLike(trimmed)}%`;

  const rows = await db.getAllAsync<DocumentRow>(
    `${SELECT_DOCUMENT}
     WHERE d.title LIKE ? ESCAPE '\\'
        OR EXISTS (
          SELECT 1 FROM pages p
          WHERE p.document_id = d.id
            AND p.ocr_text IS NOT NULL
            AND p.ocr_text LIKE ? ESCAPE '\\'
        )
        OR EXISTS (
          SELECT 1 FROM document_tags dt
          JOIN tags t ON t.id = dt.tag_id
          WHERE dt.document_id = d.id
            AND t.name LIKE ? ESCAPE '\\'
        )
     ORDER BY d.updated_at DESC`,
    like,
    like,
    like,
  );

  return rows.map(toDocument);
}

// Escape user input so `%` and `_` are treated as literal characters.
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}
