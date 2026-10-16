import { fromByteArray, toByteArray } from "base64-js";
import * as FileSystem from "expo-file-system/legacy";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { PDFDocument } from "pdf-lib";
import { Image } from "react-native";

import {
    getDocumentById,
    setDocumentPdfUri,
} from "../../database/repositories/documentRepository";
import { listPages } from "../../database/repositories/pageRepository";
import { deleteFileSafe, fileExists, getFileSize } from "../fileStorage";

const MAX_IMAGE_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;
const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;

export type PdfExportResult = {
  uri: string;
  pageCount: number;
  byteSize: number;
  regenerated: boolean;
};

export async function exportDocumentPdf(
  documentId: string,
  options: { regenerate?: boolean } = {},
): Promise<PdfExportResult> {
  const document = await getDocumentById(documentId);
  if (!document) {
    throw new Error("Document not found");
  }

  if (
    !options.regenerate &&
    document.pdfUri &&
    (await fileExists(document.pdfUri))
  ) {
    return {
      uri: document.pdfUri,
      pageCount: document.pageCount,
      byteSize: await getFileSize(document.pdfUri),
      regenerated: false,
    };
  }

  const pages = await listPages(documentId);
  if (pages.length === 0) {
    throw new Error("Cannot export a document with no pages");
  }

  const pdfDoc = await PDFDocument.create();
  const tempFiles: string[] = [];

  try {
    for (const page of pages) {
      const prepared = await preparePageImage(page.imageUri);
      tempFiles.push(prepared.uri);

      const base64 = await FileSystem.readAsStringAsync(prepared.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const bytes = toByteArray(base64);

      const embedded = await pdfDoc.embedJpg(bytes);

      const pdfPage = pdfDoc.addPage([A4_WIDTH_PT, A4_HEIGHT_PT]);

      const scale = Math.min(
        A4_WIDTH_PT / embedded.width,
        A4_HEIGHT_PT / embedded.height,
      );
      const drawW = embedded.width * scale;
      const drawH = embedded.height * scale;

      pdfPage.drawImage(embedded, {
        x: (A4_WIDTH_PT - drawW) / 2,
        y: (A4_HEIGHT_PT - drawH) / 2,
        width: drawW,
        height: drawH,
      });
    }

    const pdfBytes = await pdfDoc.save();
    const base64Pdf = bytesToBase64(pdfBytes);

    // Write to a per-document folder so the shared filename stays clean.
    const folder = `${FileSystem.documentDirectory}pdfs/${document.id}/`;
    await FileSystem.makeDirectoryAsync(folder, { intermediates: true });

    const finalUri = `${folder}${buildFilename(document.title)}.pdf`;

    await FileSystem.writeAsStringAsync(finalUri, base64Pdf, {
      encoding: FileSystem.EncodingType.Base64,
    });

    if (document.pdfUri && document.pdfUri !== finalUri) {
      await deleteFileSafe(document.pdfUri);
    }

    await setDocumentPdfUri(document.id, finalUri);

    return {
      uri: finalUri,
      pageCount: pages.length,
      byteSize: await getFileSize(finalUri),
      regenerated: true,
    };
  } finally {
    for (const uri of tempFiles) {
      await deleteFileSafe(uri);
    }
  }
}

async function preparePageImage(
  imageUri: string,
): Promise<{ uri: string; width: number; height: number }> {
  const size = await tryGetImageSize(imageUri);
  const context = ImageManipulator.manipulate(imageUri);

  if (size && size.width > 0 && size.height > 0) {
    const longest = Math.max(size.width, size.height);
    if (longest > MAX_IMAGE_DIMENSION) {
      if (size.width >= size.height) {
        context.resize({ width: MAX_IMAGE_DIMENSION });
      } else {
        context.resize({ height: MAX_IMAGE_DIMENSION });
      }
    }
  }

  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({
    format: SaveFormat.JPEG,
    compress: JPEG_QUALITY,
  });

  return { uri: saved.uri, width: saved.width, height: saved.height };
}

function tryGetImageSize(
  uri: string,
): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    try {
      Image.getSize(
        uri,
        (width, height) => resolve({ width, height }),
        () => resolve(null),
      );
    } catch {
      resolve(null);
    }
  });
}

function bytesToBase64(bytes: Uint8Array): string {
  return fromByteArray(bytes);
}

function buildFilename(title: string): string {
  const cleaned = title
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
  return cleaned.length > 0 ? cleaned : "document";
}
