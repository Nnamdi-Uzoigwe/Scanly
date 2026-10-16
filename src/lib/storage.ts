import * as FileSystem from "expo-file-system/legacy";

import { getDatabase } from "../database/client";

export type StorageReport = {
  documentCount: number;
  imageBytes: number;
  pdfBytes: number;
  totalBytes: number;
};

async function directorySize(dir: string): Promise<number> {
  try {
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists || !info.isDirectory) return 0;

    const entries = await FileSystem.readDirectoryAsync(dir);
    let total = 0;

    for (const entry of entries) {
      const child = dir.endsWith("/") ? `${dir}${entry}` : `${dir}/${entry}`;
      const childInfo = await FileSystem.getInfoAsync(child);
      if (!childInfo.exists) continue;

      if (childInfo.isDirectory) {
        total += await directorySize(`${child}/`);
      } else if (typeof childInfo.size === "number") {
        total += childInfo.size;
      }
    }

    return total;
  } catch {
    return 0;
  }
}

export async function measureStorage(): Promise<StorageReport> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) AS count FROM documents",
  );
  const documentCount = row?.count ?? 0;

  const imageBytes = await directorySize(
    `${FileSystem.documentDirectory}scans/`,
  );
  const pdfBytes = await directorySize(`${FileSystem.documentDirectory}pdfs/`);

  return {
    documentCount,
    imageBytes,
    pdfBytes,
    totalBytes: imageBytes + pdfBytes,
  };
}

export async function clearAllData(): Promise<void> {
  const db = await getDatabase();

  // ON DELETE CASCADE on pages and document_tags handles the child rows.
  // Tags themselves are independent, so they are cleared explicitly.
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM documents");
    await db.runAsync("DELETE FROM tags");
  });

  // Files are best-effort. A leftover file is preferable to a half-deleted
  // state if the OS denies a delete.
  const scansDir = `${FileSystem.documentDirectory}scans/`;
  const pdfsDir = `${FileSystem.documentDirectory}pdfs/`;
  await FileSystem.deleteAsync(scansDir, { idempotent: true }).catch(() => {});
  await FileSystem.deleteAsync(pdfsDir, { idempotent: true }).catch(() => {});
}
