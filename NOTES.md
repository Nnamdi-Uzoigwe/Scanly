# Scanly — Project Notes

## Current state (paused)

Working end-to-end in **Expo Go** on iPhone 12 and Motorola Android 12.

## What works

- Multi-page camera capture with filmstrip
- Import from photo library and file picker (images only)
- Document detail: horizontal carousel, rotate, delete page, reorder
- Rename, tags (add/remove), delete document
- PDF export with exact page count and clean filename, native share sheet
- Search across titles + tags + OCR text (OCR column always empty right now)
- Settings: haptics toggle, storage measurement, clear-all-data with two-step confirm
- SQLite persistence with schema migrations

## What is NOT done

- **OCR** — paused. Interface exists at `src/lib/ocr/`. Engine returns
  `unavailable` honestly. Requires a dev client. Cannot work in Expo Go.
  Reason: ML Kit native modules are not in Expo Go, and RN 0.86 / new arch
  support in popular wrappers is not reliable yet. Revisit with EAS Build.
- **Crop** — not implemented. Biggest remaining gap in scan flow.
- **Image enhancement** (grayscale / BW) — not implemented. No native deps needed.
- **Haptics wiring** — toggle exists, but actions (rotate/delete/save) do
  not call `tapLight()` / `notifySuccess()` yet.
- **Tests** — none. Jest not configured.
- **app.json** — missing camera/photo permission strings, and
  `userInterfaceStyle` should be `"dark"` to force dark theme.
- **Home** — uses ScrollView + map. Fine for now, should be FlatList for
  large libraries.
- **README** — not written. Needs OCR caveat documented.

## Architecture (do not drift from this)

- Feature-first layout under `src/`
- SQLite for metadata, file system for image/PDF assets
- Repository layer in `src/database/repositories/`
- Services in `src/lib/` (pdf, ocr, import, storage, fileStorage, imageOperations, haptics)
- Zustand only for the haptics preference — everything else is local state
- No NativeWind. StyleSheet API only.
- No TanStack Query. No backend. No auth. Local-first.

## Rules we agreed on

- Never fake OCR, PDF, or scan results
- Never claim native flows are tested without testing on device
- Confirmation required for destructive actions
- `updated_at` only changes on real content edits — PDF generation,
  rename, and tag changes do NOT bump it
- Never store base64 images in SQLite — files on disk, URIs in DB

## Known package notes

- `expo-dev-client` was uninstalled (unused in Expo Go)
- `expo-print` was uninstalled (broken page breaks on iOS; replaced with `pdf-lib`)
- Using `pdf-lib` + `base64-js` for PDF generation
- `expo-file-system/legacy` for file ops (SDK 57 stable path)

## Next steps (in order)

1. Crop feature (manual, uses `expo-image-manipulator`)
2. Image enhancement (grayscale / BW)
3. Wire haptics into `[id].tsx` actions
4. Jest setup + repository/service tests
5. `app.json` config fixes + README
6. Home FlatList migration
7. Accessibility pass
8. OCR — only after a dev client is set up
