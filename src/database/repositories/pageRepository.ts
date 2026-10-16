import { getDatabase } from "../client";

export type ScanPage = {
  id: string;
  documentId: string;
  position: number;
  imageUri: string;
  originalUri: string | null;
  ocrText: string | null;
  width: number | null;
  height: number | null;
};

type PageRow = {
  id: string;
  document_id: string;
  position: number;
  image_uri: string;
  original_uri: string | null;
  ocr_text: string | null;
  width: number | null;
  height: number | null;
};

function toPage(row: PageRow): ScanPage {
  return {
    id: row.id,
    documentId: row.document_id,
    position: row.position,
    imageUri: row.image_uri,
    originalUri: row.original_uri,
    ocrText: row.ocr_text,
    width: row.width,
    height: row.height,
  };
}

export async function listPages(documentId: string): Promise<ScanPage[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<PageRow>(
    "SELECT * FROM pages WHERE document_id = ? ORDER BY position ASC",
    documentId,
  );
  return rows.map(toPage);
}

export async function insertPage(input: {
  id: string;
  documentId: string;
  position: number;
  imageUri: string;
  originalUri?: string | null;
  width?: number | null;
  height?: number | null;
}): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO pages
       (id, document_id, position, image_uri, original_uri, ocr_text, width, height)
     VALUES (?, ?, ?, ?, ?, NULL, ?, ?)`,
    input.id,
    input.documentId,
    input.position,
    input.imageUri,
    input.originalUri ?? null,
    input.width ?? null,
    input.height ?? null,
  );
}

export async function setPageOcrText(
  pageId: string,
  text: string | null,
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("UPDATE pages SET ocr_text = ? WHERE id = ?", text, pageId);
}

export async function deletePageRow(pageId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM pages WHERE id = ?", pageId);
}

export async function replacePageOrder(
  documentId: string,
  orderedPageIds: string[],
): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < orderedPageIds.length; i++) {
      await db.runAsync(
        "UPDATE pages SET position = ? WHERE id = ? AND document_id = ?",
        i,
        orderedPageIds[i],
        documentId,
      );
    }
  });
}

export async function updatePageImageUri(
  pageId: string,
  imageUri: string,
  originalUri?: string | null,
): Promise<void> {
  const db = await getDatabase();
  if (originalUri !== undefined) {
    await db.runAsync(
      "UPDATE pages SET image_uri = ?, original_uri = ? WHERE id = ?",
      imageUri,
      originalUri,
      pageId,
    );
  } else {
    await db.runAsync(
      "UPDATE pages SET image_uri = ? WHERE id = ?",
      imageUri,
      pageId,
    );
  }
}
