import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";

import { saveDocument } from "./documents";
import { formatBytes } from "./format";

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_PAGES = 40;

export type ImportSource = "photos" | "files";

export type ImportOutcome =
  | { status: "cancelled" }
  | { status: "saved"; documentId: string; pageCount: number }
  | { status: "error"; message: string };

type PickedFile = {
  uri: string;
  size: number | null;
};

export async function runImport(source: ImportSource): Promise<ImportOutcome> {
  let picked: PickedFile[] | null;
  try {
    picked = source === "photos" ? await pickImages() : await pickFiles();
  } catch (error) {
    console.error("Picker failed:", error);
    return { status: "error", message: "Could not open the picker." };
  }

  if (!picked || picked.length === 0) {
    return { status: "cancelled" };
  }

  if (picked.length > MAX_PAGES) {
    return {
      status: "error",
      message: `You can import up to ${MAX_PAGES} pages at a time.`,
    };
  }

  const oversized = picked.find(
    (f) => f.size !== null && f.size > MAX_FILE_BYTES,
  );
  if (oversized) {
    return {
      status: "error",
      message: `One or more files exceed ${formatBytes(MAX_FILE_BYTES)}.`,
    };
  }

  try {
    const document = await saveDocument({
      title: defaultTitle(picked.length),
      sourceUris: picked.map((f) => f.uri),
    });
    return {
      status: "saved",
      documentId: document.id,
      pageCount: document.pageCount,
    };
  } catch (error) {
    console.error("Import save failed:", error);
    return { status: "error", message: "Could not save the imported pages." };
  }
}

async function pickImages(): Promise<PickedFile[] | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsMultipleSelection: true,
    quality: 1,
    selectionLimit: MAX_PAGES,
  });
  if (result.canceled) return null;
  return result.assets.map((asset) => ({
    uri: asset.uri,
    size: typeof asset.fileSize === "number" ? asset.fileSize : null,
  }));
}

async function pickFiles(): Promise<PickedFile[] | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["image/*"],
    multiple: true,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;
  return result.assets.map((asset) => ({
    uri: asset.uri,
    size: typeof asset.size === "number" ? asset.size : null,
  }));
}

function defaultTitle(pageCount: number): string {
  const date = new Date().toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  return pageCount === 1
    ? `Imported ${date}`
    : `Imported ${date} (${pageCount} pages)`;
}
