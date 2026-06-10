# PageStack — Design Spec

Replacement tool in **viral-tools** (supersedes BadgeForge + OGForge, which are delisted from the hub but kept on disk). Status: design approved (brainstorming, 2026-06-10). Pipeline: this spec → ui-ux-pro-max → build → webapp-testing.

## One-liner
Merge, split, reorder, and rotate PDFs in one visual workspace — files never leave your browser.

## Why this replaces the two weakest tools
Simulated-user rounds + Leo's "play to strengths" call: BadgeForge (no moat vs shields.io) and OGForge (visual-design turf = Canva's home field, our weak side) are structurally weak. PageStack plays to the suite's proven strengths — **byte-level engineering + privacy** — and targets the single biggest evergreen search demand found in the original market research ("merge pdf", "split pdf"), where incumbents (iLovePDF/Smallpdf) are actively alienating users with paywalls, task caps, and server uploads. It is also **normie-friendly** (fixes the "4 of 5 fixes aimed at developers" skew — the teacher persona would use this).

## The UX wedge (vs incumbents' one-tool-per-task model)
ONE unified **page workspace**, not separate merge/split/rotate tools:
1. Drop **any number of PDFs** (and JPG/PNG images — they become pages).
2. Every page renders as a **thumbnail in one grid** (pdf.js). Drag to reorder across documents; hover actions per page: rotate 90°, delete, select (checkbox). Nudge ◀ ▶ buttons as keyboard/test-friendly fallback.
3. Outputs: **Download PDF** (whole workspace bound into one file) · **Extract selected (n)** (chosen pages → new PDF) · **Split into files** (every page → its own PDF, zipped).
4. **Zero upload** — pdf-lib byte surgery, works offline. The trust line is the identity, same family as ScrubShot.

## Scope guardrails (from research)
- Structural ops only: merge / reorder / rotate / delete / extract / split. **No OCR, no "compression" promises** (both are weak client-side; don't promise what WASM can't deliver).
- Encrypted/password PDFs: detect (pdf.js PasswordException) → clear toast "password-protected PDFs aren't supported yet"; file skipped, no crash.
- Images: JPG/PNG accepted as pages (embedJpg/embedPng at export, page sized to the image).

## Tech (all vendored, no build step)
- **pdf-lib** (UMD, `PDFLib` global) — assembly: `copyPages` preserving source rotation, `setRotation(degrees((orig+delta)%360))`, `embedJpg/embedPng` for image pages, `save()` → Blob download.
- **pdf.js legacy build** (`pdfjsLib` global + vendored worker, `GlobalWorkerOptions.workerSrc` → local file) — thumbnails at small scale.
- **JSZip** (copy of the vendored one) — split-to-files zip.
- Buffer gotcha: pdf.js neuters the ArrayBuffer it's given — pass a **copy** (`buf.slice(0)`) to pdf.js, keep the original for pdf-lib.
- Reorder = **pointer-event drag** (not HTML5 DnD): ghost + drop indicator, 5px threshold distinguishes click(=select) from drag; robust in Playwright and on touch.

## File structure (mirrors siblings)
`pagestack/app.html` (tool) · `pagestack/index.html` (landing: hero "Merge & split PDFs without uploading them", 3 benefits, how-it-works, CTA) · `pagestack/style.css` · `pagestack/app.js` · `pagestack/vendor/{pdf-lib,pdf.js,pdf.worker,jszip}`. Root hub: remove BadgeForge/OGForge cards (folders stay on disk), add PageStack. Root README table updated.

## Companion changes in this round (keeper strengthening)
- **HueProof**: export names go semantic — hue-bucket + lightness step (`--blue-500`, `$amber-600`, `'teal-300'`), dedupe with `-2` suffix; replaces lazy `--color-1`/`brand1` (the thing designers said blocks their top score). Tests updated to assert semantic names.
- **ScrubShot**: under the trust bar, an honest verification hint — "Don't take our word for it: turn off your wifi, everything keeps working" — replacing pure self-vouching with a user-verifiable claim.

## Success criteria (webapp-testing, with Pillow-generated fixtures + pypdf independent verification)
- Load a 3-page + a 2-page PDF → 5 thumbnails; 0 console/page errors.
- Download → pypdf reads exactly 5 pages, **in workspace order** (fixture pages have distinct mediabox widths so order is byte-verifiable).
- Delete page → 4 thumbs → output has 4 pages. Rotate page 1 → output `/Rotate == 90`.
- Nudge/reorder → order change visible in output mediabox sequence.
- Select 2 → Extract → 2-page PDF. Split → zip containing one PDF per page.
- Add a PNG image → becomes a page; export includes it.
- Encrypted PDF fixture (pypdf-encrypted) → toast, skipped, no crash.
- Landing renders; CTA → app.html.
