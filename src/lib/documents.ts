import { getDatabase } from "@/database/client";
import {
  deleteDocumentRow,
  getDocumentById,
  insertDocument,
  listDocuments,
  renameDocument,
  type OcrStatus,
  type ScanDocument,
} from "@/database/repositories/documentRepository";
import {
  insertPage,
  listPages,
  type ScanPage,
} from "@/database/repositories/pageRepository";
import { copyIntoScans, deleteFileSafe } from "./fileStorage";
import { newId } from "./ids";

export type { OcrStatus, ScanDocument, ScanPage };

export async function getDocuments(): Promise<ScanDocument[]> {
  return listDocuments();
}

export async function getDocument(id: string): Promise<ScanDocument | null> {
  return getDocumentById(id);
}

export async function getDocumentPages(
  documentId: string,
): Promise<ScanPage[]> {
  return listPages(documentId);
}

export async function saveDocument(input: {
  title: string;
  sourceUris: string[];
}): Promise<ScanDocument> {
  if (input.sourceUris.length === 0) {
    throw new Error("Cannot save a document with no pages");
  }

  const title = input.title.trim() || "Untitled scan";
  const documentId = newId("doc");
  const createdAt = new Date().toISOString();

  // Copy files first. If any copy fails, remove the ones already copied and
  // abort before touching the database.
  const copied: { pageId: string; imageUri: string }[] = [];
  try {
    for (const sourceUri of input.sourceUris) {
      const pageId = newId("page");
      const imageUri = await copyIntoScans(sourceUri, `${pageId}.jpg`);
      copied.push({ pageId, imageUri });
    }
  } catch (error) {
    for (const item of copied) {
      await deleteFileSafe(item.imageUri);
    }
    throw error;
  }

  // Insert metadata atomically. If the DB write fails, remove the files so we
  // do not leave orphaned images behind.
  const db = await getDatabase();
  try {
    await db.withTransactionAsync(async () => {
      await insertDocument({
        id: documentId,
        title,
        thumbnailUri: copied[0].imageUri,
        createdAt,
      });
      for (let i = 0; i < copied.length; i++) {
        await insertPage({
          id: copied[i].pageId,
          documentId,
          position: i,
          imageUri: copied[i].imageUri,
        });
      }
    });
  } catch (error) {
    for (const item of copied) {
      await deleteFileSafe(item.imageUri);
    }
    throw error;
  }

  return {
    id: documentId,
    title,
    createdAt,
    updatedAt: createdAt,
    thumbnailUri: copied[0].imageUri,
    pdfUri: null,
    pageCount: copied.length,
    ocrStatus: "pending",
  };
}

export async function renameDocumentById(
  id: string,
  title: string,
): Promise<void> {
  const trimmed = title.trim();
  if (!trimmed) return;
  await renameDocument(id, trimmed);
}

export async function deleteDocument(id: string): Promise<void> {
  const db = await getDatabase();

  const document = await db.getFirstAsync<{
    pdf_uri: string | null;
  }>("SELECT pdf_uri FROM documents WHERE id = ?", id);
  if (!document) return;

  const pages = await db.getAllAsync<{
    image_uri: string;
    original_uri: string | null;
  }>("SELECT image_uri, original_uri FROM pages WHERE document_id = ?", id);

  // Delete DB rows first. ON DELETE CASCADE removes pages and tag links.
  await db.withTransactionAsync(async () => {
    await deleteDocumentRow(id);
  });

  // Now clean up files. Best effort: a leftover file is safer than a
  // half-deleted document.
  for (const page of pages) {
    await deleteFileSafe(page.image_uri);
    if (page.original_uri) {
      await deleteFileSafe(page.original_uri);
    }
  }
  if (document.pdf_uri) {
    await deleteFileSafe(document.pdf_uri);
  }
}
