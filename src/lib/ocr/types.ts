export type OcrBlock = {
  text: string;
  /** Top-left origin, normalized 0..1, in the coordinate space of the source image. */
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** Engine-provided confidence, 0..1, when available. */
  confidence?: number;
};

export type OcrResult = {
  /** Full recognized text for the page, newline-joined across blocks. */
  text: string;
  /** Per-block detail. May be empty if the engine does not return layout. */
  blocks: OcrBlock[];
  /** Which engine produced this result, for diagnostics. */
  engine: string;
  /** Milliseconds spent recognizing. */
  durationMs: number;
};

export type OcrFailureReason =
  | "engine_unavailable"
  | "no_text_found"
  | "invalid_input"
  | "unknown";

export class OcrError extends Error {
  readonly reason: OcrFailureReason;

  constructor(reason: OcrFailureReason, message: string) {
    super(message);
    this.name = "OcrError";
    this.reason = reason;
  }
}

export interface OcrEngine {
  readonly name: string;
  /** Whether the engine's native dependency is present and usable. */
  isAvailable(): Promise<boolean>;
  recognize(imageUri: string): Promise<OcrResult>;
}
