import { OcrError, type OcrEngine, type OcrResult } from "./types";

/**
 * Fallback engine used when no on-device OCR native module is installed.
 * It never returns fabricated text. It throws an explicit "engine_unavailable"
 * error so callers and the UI can surface an honest message and the user
 * still keeps their scan.
 */
export const unavailableEngine: OcrEngine = {
  name: "unavailable",
  async isAvailable(): Promise<boolean> {
    return false;
  },
  async recognize(_imageUri: string): Promise<OcrResult> {
    throw new OcrError(
      "engine_unavailable",
      "No on-device OCR engine is configured in this build.",
    );
  },
};
