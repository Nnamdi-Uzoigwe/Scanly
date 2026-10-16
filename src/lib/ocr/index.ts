import type { OcrEngine, OcrResult } from "./types";
import { OcrError } from "./types";
import { unavailableEngine } from "./unavailableEngine";

export { OcrError } from "./types";
export type { OcrEngine, OcrResult } from "./types";

let engineOverride: OcrEngine | null = null;

/**
 * Resolve the active OCR engine.
 *
 * Until a native engine (for example ML Kit text recognition) is wired in,
 * this returns a fallback that throws `engine_unavailable`. That is intentional:
 * the app must never fabricate OCR text. Once a real engine module is added,
 * set it here.
 */
function resolveEngine(): OcrEngine {
  if (engineOverride) return engineOverride;
  return unavailableEngine;
}

/** Used by the concrete engine module once it is installed. */
export function registerOcrEngine(engine: OcrEngine): void {
  engineOverride = engine;
}

export async function isOcrAvailable(): Promise<boolean> {
  return resolveEngine().isAvailable();
}

export async function recognizeText(imageUri: string): Promise<OcrResult> {
  if (!imageUri) {
    throw new OcrError("invalid_input", "No image URI provided for OCR.");
  }
  return resolveEngine().recognize(imageUri);
}
