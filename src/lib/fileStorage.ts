import * as FileSystem from "expo-file-system/legacy";

const SCANS_DIR = `${FileSystem.documentDirectory}scans/`;
const PDFS_DIR = `${FileSystem.documentDirectory}pdfs/`;

export async function ensureScansDir(): Promise<void> {
  await FileSystem.makeDirectoryAsync(SCANS_DIR, { intermediates: true });
}

export async function ensurePdfsDir(): Promise<void> {
  await FileSystem.makeDirectoryAsync(PDFS_DIR, { intermediates: true });
}

export async function copyIntoScans(
  sourceUri: string,
  filename: string,
): Promise<string> {
  await ensureScansDir();
  const dest = `${SCANS_DIR}${filename}`;
  await FileSystem.copyAsync({ from: sourceUri, to: dest });
  return dest;
}

export async function deleteFileSafe(
  uri: string | null | undefined,
): Promise<void> {
  if (!uri) return;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch (error) {
    // Best-effort cleanup. A leftover file is not worth crashing the app over.
    console.warn("Failed to delete file", uri, error);
  }
}

export async function fileExists(uri: string): Promise<boolean> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return info.exists;
  } catch {
    return false;
  }
}

export async function copyIntoPdfs(
  sourceUri: string,
  filename: string,
): Promise<string> {
  await ensurePdfsDir();
  const dest = `${PDFS_DIR}${filename}`;
  await FileSystem.copyAsync({ from: sourceUri, to: dest });
  return dest;
}

export async function getFileSize(uri: string): Promise<number> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) return 0;
    return typeof info.size === "number" ? info.size : 0;
  } catch {
    return 0;
  }
}
