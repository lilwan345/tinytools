# PicPress — Design Spec

Replaces **TableShot** in the live suite (TableShot is delisted from the hub but kept on disk, like badgeforge/ogforge). Status: approved (Leo pre-authorized the swap: "你直接自己做一个把原本的切换了吧", 2026-06-11). Pipeline: this spec → ui-ux-pro-max → build → webapp-testing → hub swap → push live.

## One-liner
Convert, compress & resize images — HEIC included — right in your browser. Hit any "max file size" limit without uploading your photos anywhere.

## Why TableShot goes, why PicPress comes
TableShot is the least *useful* of the four live tools: occasional need ("twice a month, I'll re-Google it"), dead-PNG output, and its real competitor is a free screenshot. PicPress targets the most *recurring* normie pains in the file-utility space:
- "iPhone HEIC photo won't open / the website won't accept it" (rising, unsolved for normies)
- "The form says max 200 KB" (visa/job/school portals — everyone hits this repeatedly)
- "Email/LMS rejects my attachment" (batch shrink)
Incumbents are ad-stuffed upload sites; Squoosh is semi-abandoned, single-image, no batch, no target-size. Suite coherence after the swap: photos-privacy (ScrubShot) · PDF (PageStack) · images (PicPress) · color→code (HueProof) — a clean "your files, your device" story, all engineering, zero visual-art turf.

## Hard constraints (unchanged)
100% client-side, static, $0, no AI, no backend; English market; vendored libs only; works offline.

## Features (v1)
1. **Intake**: drag/drop or pick a batch — HEIC/HEIF, JPG, PNG, WebP. Per-file card: thumbnail, name, original size.
2. **Global settings panel**:
   - Output format: JPG / WebP / PNG (PNG = no quality knob; target-size mode disabled for PNG with a note).
   - **Mode A — "Fit under ___ KB"** (the killer feature): binary-search the encode quality (~7 iterations of `canvas.toBlob`) until the output ≤ target; if even q=0.05 overshoots, progressively downscale dimensions (×0.8 steps, floor 320px) and warn on the card. Normies think in "the form wants ≤200 KB", not "quality 80".
   - **Mode B — quality slider** (50–95, default 82).
   - Resize: none / max dimension (px) / 50% / 25% (applies in both modes).
3. **Convert all** → per card: before → after sizes + a green "−87%" badge; status spinner per file; total-saved line in the toolbar.
4. **Output**: per-card download; "Download all → .zip" (JSZip). Output filenames keep the stem, new extension (collision-suffixed).
5. **HEIC**: decoded via vendored **heic2any** (libheif WASM). Loaded lazily ONLY when a HEIC file arrives (it's ~1 MB+ — don't tax the common path). Failure → per-card error state, no crash.
6. **Privacy line**: canvas re-encode strips all metadata automatically — stated in the UI ("metadata removed, photos never uploaded — works offline").
7. **Not doing** (honest scope): AI upscaling, lossless PNG crunching (heavy WASM, weak results), animated formats (GIF/animated-WebP pass-through is out of scope v1 — reject with a clear toast).

## Engineering notes
- Decode: `createImageBitmap(file)` (fallback `Image` + objectURL). HEIC: heic2any → Blob(JPEG) → same path.
- Encode: draw to canvas (resize applied) → `canvas.toBlob(type, q)`.
- Target-size search: q ∈ [0.05, 0.97], 7 bisection rounds; cache best-under-target; dimension fallback loop.
- EXIF stripping is inherent to canvas re-encode (verify in tests with piexif).
- Orientation: createImageBitmap honors EXIF orientation in modern Chromium (`imageOrientation: "from-image"` default); acceptable v1.
- File cards processed sequentially with UI updates (avoid memory spikes on big batches).

## Files
`picpress/app.html` · `picpress/index.html` (landing: hero on the two pains — HEIC + "max 200 KB") · `picpress/style.css` · `picpress/app.js` · `picpress/vendor/heic2any.min.js` (+ reuse shared JSZip copy). Hub: TableShot card out, PicPress card in (folder `tableshot/` stays). README table updated.

## Success criteria (webapp-testing; Pillow fixtures + PIL/piexif independent verification)
- Load JPG+PNG batch → cards with original sizes; 0 console/page errors.
- Convert to WebP (quality mode) → downloads are valid WebP (PIL opens), smaller than originals.
- **Target-size mode 100 KB on a noisy 2000×1500 JPEG → output ≤ 100 KB and valid JPEG.**
- Resize max-dim 800 → PIL: max(w,h) == 800, aspect preserved.
- EXIF-laden input (piexif fixture) → output has zero EXIF tags.
- Batch zip → N files, all valid images.
- HEIC fixture (pillow-heif, if installable) → converts to JPG; else HEIC path covered by a graceful-error check.
- Landing renders; CTA → app. Hub shows 4 cards: scrubshot/pagestack/hueproof/picpress, no tableshot link.
- Live smoke after push: all URLs 200, 0 console errors, a real conversion works on the live origin.

## UI design
Via ui-ux-pro-max next. Identity must be distinct from siblings (ScrubShot dark-navy/green, PageStack paper/scan-blue, HueProof mono-ink); TableShot's violet leaves with it. Reuse shared tokens + vendored fonts.
