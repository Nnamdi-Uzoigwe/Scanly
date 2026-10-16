import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

import { copyIntoScans, deleteFileSafe } from "./fileStorage";
import { newId } from "./ids";

/**
 * Rotates an image by 90/180/270 degrees and writes the result as a new
 * file in the scans directory. Returns the new URI and dimensions.
 *
 * Uses the current expo-image-manipulator context API. If your SDK version
 * complains about `ImageManipulator.manipulate`, fall back to the legacy
 * `manipulateAsync(uri, [{ rotate: degrees }], ...)` call.
 */
export async function rotateImage(
  sourceUri: string,
  degrees: 90 | 180 | 270,
): Promise<{ uri: string; width: number; height: number }> {
  const context = ImageManipulator.manipulate(sourceUri);
  context.rotate(degrees);

  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({
    format: SaveFormat.JPEG,
    compress: 0.92,
  });

  const filename = `${newId("page")}.jpg`;
  const finalUri = await copyIntoScans(saved.uri, filename);

  // The intermediate file written by the manipulator lives in cache.
  if (saved.uri !== finalUri) {
    await deleteFileSafe(saved.uri);
  }

  return {
    uri: finalUri,
    width: saved.width,
    height: saved.height,
  };
}
