# HueProof — Design Spec

Tool #4 in **viral-tools**. Status: design approved (brainstorming, 2026-06-08). Next: ui-ux-pro-max UI design → build → webapp-testing.

## One-liner
Build a palette, then see — and prove — which color pairings actually pass WCAG contrast. 100% in your browser.

## Positioning (the wedge)
Palette tools are a red ocean (Coolors, Adobe Color, Realtime Colors, WebAIM). HueProof's only viable differentiation is **accessibility as the hero**: not "another palette generator" but "see at a glance which of your colors are accessible together, and share the proof." The unique, screenshot-able hook is the **accessible-pairings matrix**.

## Hard constraints
- 100% client-side, static files, $0, GitHub Pages. No backend, no AI.
- Pure-math color science, **no external library** (no chroma.js): hex↔rgb↔hsl, WCAG 2.1 relative luminance + contrast ratio, HSL harmony rotations, image quantization.
- English market. Fits the shared design system; expected light/neutral personality (the user's colors are the stars) — confirmed via ui-ux-pro-max.

## Modules (4, forming one loop: get a palette → check accessibility → share the proof)
1. **Palette builder + harmony** — N swatches (add/remove, up to ~8); per-swatch hex input + native color picker + **EyeDropper** (Chromium screen pick); lock a swatch; one-click harmonies (complementary / analogous / triadic / tetradic / monochrome) generated via HSL rotation from a base; "randomize unlocked".
2. **Extract from image** — drag an image → Canvas + median-cut/quantize → dominant palette (client-side, no upload). The "wow" + shareable angle.
3. **★ Accessible-pairings matrix (hero)** — every ordered pair of palette colors → contrast ratio + AA/AAA pass/fail badges (normal text 4.5:1 / AAA 7:1 / large text 3:1). A grid users screenshot to prove (or fix) their palette. This is the differentiator + share hook.
4. **Contrast checker** — pick foreground/background → big ratio number + AA/AAA (normal + large) pass/fail + live sample text. Targets the high-volume "contrast checker" intent.

## Color science (WCAG 2.1)
- `relLuminance(rgb)` per WCAG (sRGB linearization). `contrast(a,b) = (L1+0.05)/(L2+0.05)`.
- Thresholds: AA normal ≥4.5, AA large ≥3, AAA normal ≥7, AAA large ≥4.5.
- HSL conversions for harmony + adjustment. Median-cut (or popularity histogram) for image quantize.

## Share
- **URL hash**: palette (+ selected fg/bg) encoded in `#…` (compact hex join), shared link reconstructs state. No backend = backlink loop.
- **PNG card**: export a "palette + accessibility summary" card (swatches + hexes + the matrix or a pass-count) as PNG for socials. Render via html-to-image (with the src-less-img filter) or canvas composition — pick whichever proves robust in webapp-testing (BadgeForge lesson: html-to-image can choke; canvas-compose is the reliable fallback).

## File structure (mirrors siblings)
- `hueproof/app.html` (tool), `hueproof/index.html` (landing), `hueproof/style.css`, `hueproof/app.js`
- reuse `../shared/theme.css` + `../shared/app.js` + `../shared/vendor/html-to-image.js` (+ lz-string if needed). Update root hub: HueProof → Live.

## Success criteria (webapp-testing)
- Loads, 0 console/page errors.
- Contrast math correct: assert known pairs (e.g. #000 on #fff = 21:1 AAA pass; #777 on #fff ≈ 4.48 → AA-normal fail/borderline; #767676 on #fff ≈ 4.54 AA pass) — verify the computed ratio against a tolerance.
- Palette builder: add/remove swatch, edit hex updates state; a harmony button changes unlocked swatches.
- Matrix renders an N×N grid with pass/fail badges matching the math.
- Contrast checker updates ratio + AA/AAA badges on fg/bg change.
- Image extract: load a test image → produces ≥3 swatches.
- URL hash round-trips: setting a palette updates `location.hash`; reloading that hash restores the palette.
- PNG card export produces a real download (> a few KB).
- Landing renders; CTA → app.html.

## UI design
Produced via **ui-ux-pro-max** before build. Likely clean/light/neutral so the user's colors dominate — distinct from ScrubShot (dark navy) and BadgeForge (dark amber) and TableShot (violet). Reuse shared tokens + Inter.
