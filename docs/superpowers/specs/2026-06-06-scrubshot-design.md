# ScrubShot — Design Spec

Tool #2 in **viral-tools**. Status: design approved (brainstorming, 2026-06-06). Next: ui-ux-pro-max UI design → build → webapp-testing.

## One-liner
See what your photos secretly reveal (GPS, camera, time, serial number) — then strip the metadata in one click. 100% in your browser; nothing is uploaded.

## Why (positioning)
From market research: privacy/EXIF tools have real, durable demand, but most incumbents are ad-heavy and — ironically — **upload your private photo to a server**. ScrubShot's wedge: the "nothing leaves your browser" promise is *literally true and provable* (works offline), and the **"what your photo reveals" reveal is the shareable hook** (the viral loop).

## Hard constraints
- 100% client-side, static files, $0, GitHub Pages deployable.
- **ZERO network requests at runtime** — this is the whole pitch. No map tiles, no fonts from CDN (Inter is vendored locally), no analytics, no reverse-geocoding. Must work with wifi off.
- No AI. English market.

## Framing (approved)
**Privacy reveal + one-click scrub.** Lead with the scary reveal, then strip. The reveal is the share hook.

## Components
1. **Dropzone + photo list** — drag/drop or pick multiple images. Read to memory via FileReader/ArrayBuffer. Accept JPEG/PNG/WebP. Per-file status chip (N items found / clean).
2. **Metadata reader** — `exifr` (client-side, MIT). Extract: GPS lat/long, camera make/model, lens, capture datetime, software, **camera serial number**, **artist/owner**, dimensions, orientation; plus which metadata blocks exist (EXIF/XMP/IPTC).
3. **Reveal panel (per selected photo)**:
   - Thumbnail (object URL).
   - GPS present → prominent warning + **offline static world map with a plotted dot** (equirectangular: `x=(lon+180)/360*W`, `y=(90-lat)/180*H`) + coordinates.
   - Camera/lens, capture time, software, serial number, artist.
   - Summary risk line. If nothing found → "Clean — nothing to remove."
4. **Scrub engine (lossless-first)**:
   - JPEG: surgically drop APP1 (EXIF), APP1/XMP, APP13 (IPTC/Photoshop), COM segments; **pixel scan data untouched = lossless**. (Custom JPEG marker walker.)
   - PNG: drop `tEXt`/`iTXt`/`zTXt`/`eXIf` chunks (chunk walker; fix nothing else).
   - WebP: drop `EXIF`/`XMP ` chunks from the RIFF container.
   - Optional **"Re-encode (max safety)"** toggle → canvas re-encode (drops everything, slight quality loss). Default OFF (lossless).
   - Output cleaned Blob → download; batch → JSZip `.zip`.
5. **Privacy report card (share loop)** — one-click generated image (html-to-image) reading "This photo was leaking: 📍 location · 📷 Canon EOS R5 · 🕐 2024-… · 🔢 serial". **Redacted by default** (shows leaked *categories* + a map dot, NOT exact coordinates) so users don't self-dox when sharing; a toggle can un-redact. Branded "scrubbed with ScrubShot".
6. **Batch bar** — "Scrub all & download .zip".

## Offline world map
Bundle a compact public-domain equirectangular world map (SVG or small PNG) as a local asset. Plot points with linear projection in an overlay. No tiles, no network. Trade-off accepted: country/continent-level only (no street zoom) — fine, and on-brand for privacy.

## Formats / HEIC
v1 supports **JPEG / PNG / WebP** (lossless strip). **HEIC not supported in v1** — detect and show "Please convert to JPEG first" (HEIC needs a heavy WASM decoder and can't be stripped losslessly). Note as a known v1 limitation.

## File structure (mirrors TableShot)
- `scrubshot/app.html` — the tool
- `scrubshot/index.html` — landing page (reuse TableShot's approved landing pattern)
- `scrubshot/style.css`, `scrubshot/app.js`
- `scrubshot/vendor/` — exifr, jszip; reuse `../shared/vendor/` for html-to-image + Inter + the world map if shared
- Reuse `../shared/theme.css` + `../shared/app.js` (VT helpers)
- Update root `index.html` hub card: ScrubShot → Live

## Dependencies (all MIT, vendored locally)
exifr (read metadata) · JSZip (batch) · html-to-image (report card, already vendored) · a public-domain world map asset · Inter (already vendored). Lossless scrub = hand-written byte processing (no lib).

## Success criteria (for webapp-testing)
- Loads, 0 console/page errors.
- Reading a JPEG with GPS+camera shows the reveal (GPS dot on map, camera model, time).
- Scrub produces a downloadable file whose re-read metadata is empty (GPS/camera gone).
- Lossless: scrubbed JPEG pixel dimensions unchanged; file is a valid JPEG.
- Batch: multiple files → a .zip download.
- Report card generates a real PNG.
- HEIC file → graceful "convert first" message (no crash).
- **No network requests** beyond the initial static asset loads (verify via Playwright request interception).
- Landing page renders; CTA opens app.html.

## UI design
Frontend visual design to be produced via **ui-ux-pro-max** before build (Leo's flow). Must fit the existing viral-tools shared design system / Inter / window-chrome aesthetic family, while having its own privacy-forward personality.
