# Scanly

A local-first document scanner for iOS and Android. Capture pages with the
camera, import images, organize documents, and export real PDFs.

Everything stays on the device. No account, no backend, no telemetry.

## Status

Early preview. Runs in **Expo Go** on iOS and Android.

### Working

- Multi-page camera capture with filmstrip review
- Import from photo library and file picker (images)
- Document detail: carousel, rotate, delete page, reorder
- Rename, tags (add / remove), delete document
- PDF export via `pdf-lib`, native share sheet
- Search across titles and tags
- Settings: haptics toggle, storage size, clear all data
- SQLite persistence with schema migrations

### Not yet

- **OCR / text recognition** — service interface exists at `src/lib/ocr/`.
  No engine is bundled, so it reports itself as unavailable. Requires a
  development build; cannot run in Expo Go.
- Manual crop
- Image enhancement (grayscale / black and white)
- PDF import
- Automated tests

## Requirements

- Node 20+
- Expo SDK 57
- A physical device with Expo Go (iOS 15+ or Android 12+)

## Setup

```bash
npm install
npx expo start
```
