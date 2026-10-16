import * as Sharing from "expo-sharing";

export type ShareOutcome = "shared" | "cancelled" | "unavailable";

export async function sharePdf(
  uri: string,
  dialogTitle: string,
): Promise<ShareOutcome> {
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    return "unavailable";
  }

  try {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle,
      UTI: "com.adobe.pdf",
    });
    return "shared";
  } catch (error) {
    // The share sheet rejects when the user dismisses it without choosing an
    // action on some platforms. Treat that as a normal cancellation.
    const message = error instanceof Error ? error.message : String(error);
    if (/cancel/i.test(message)) {
      return "cancelled";
    }
    throw error;
  }
}
