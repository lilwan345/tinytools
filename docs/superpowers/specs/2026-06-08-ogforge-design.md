# OGForge — Design Spec

Tool #5 (final) in **viral-tools**. Status: design approved (brainstorming, 2026-06-08). Next: ui-ux-pro-max UI design → build → webapp-testing.

## One-liner
Make a beautiful social card — Open Graph preview, quote, or announcement — entirely in your browser, then download the PNG.

## Positioning (honest)
This is the most competitive of the five (opengraph.xyz, brandbird, Canva all overlap); "100% in-browser" is a weaker end-user hook than ScrubShot's privacy or HueProof's a11y matrix, so its viral ceiling is the lowest. It still earns its place: completes the suite, has long-tail SEO ("og image generator free / no sign-up"), and the **broad social-card framing** (quote/announcement cards you post directly) gives a stronger direct-share loop than og:image alone. Win on **template quality + zero friction**.

## Scope decision (de-risk the template×size matrix)
5 templates × 4 sizes = 20 combos. **OG 1200×630 is the hero size — make it excellent.** Other sizes must **reflow gracefully (never break)**, not be individually gold-plated. Templates use a centered/auto-scaling content box so they adapt.

## Hard constraints
- 100% client-side, static, $0, GitHub Pages. No backend, no AI.
- og:image must live at a hosted URL — we generate the PNG; the user hosts it (commit / CDN) and references it. We do NOT build the "paste a URL to preview/check" feature (needs a server/CORS proxy) — generator only. Stated in the UI.
- English market. Fits shared design system; own personality via ui-ux-pro-max.

## Card model = template × size × background × branding × text
- **Templates (5):** Centered (eyebrow + big centered title + subtitle), Article (left title + bottom author avatar/@handle/site·logo), Quote (big quotation mark + quote + attribution), Statement (huge minimal headline), Announce (NEW/version tag + title + subtitle + logo).
- **Sizes:** OG 1200×630 (hero), Wide 16:9 1280×720, Square 1:1 1080, Story 9:16 1080×1920. Content box scales; font auto-fits.
- **Backgrounds:** gradient presets + custom 2-stop+angle + solid + mesh (layered radials) + **image upload with auto dark scrim** (readability) + optional texture overlay (dots/grid/noise).
- **Branding:** logo (corner), author avatar + name + @handle, site name — shown per template.
- **Text/style:** title, subtitle, eyebrow/tag, attribution; accent color; title size (auto-fit + manual nudge); a couple of display font choices.

## Output
- **Download PNG** at the selected size (2× / retina).
- **Copy meta tags** — a ready `<meta property="og:image" …>` + Twitter card block with a placeholder URL and a note to host the image and replace the URL.
- (No live preview-checker.)

## Rendering / export
Card is a fixed-size DOM node (e.g., 1200×630), shown scaled-to-fit in the editor (CSS transform), exported at full resolution. **Export via html-to-image (pixelRatio for the size)** with the src-less-img filter. **Risk:** html-to-image has choked on images before (BadgeForge) — if webapp-testing shows it failing with an uploaded background image / logo, fall back to **canvas composition** (draw bg/scrim/text/logo manually). Decide based on the test.

## File structure (mirrors siblings)
- `ogforge/app.html` (tool), `ogforge/index.html` (landing), `ogforge/style.css`, `ogforge/app.js`
- reuse `../shared/theme.css` + `../shared/app.js` + `../shared/vendor/html-to-image.js`. Update root hub: OGForge → Live.

## Success criteria (webapp-testing)
- Loads, 0 console/page errors.
- Switching templates changes the card layout; editing title/subtitle updates the live preview.
- Background: gradient + solid + custom + uploaded image (with scrim) all render.
- Size switch changes card aspect ratio + reported px dimensions.
- **Download PNG works** (real download; for OG size the PNG is ~1200×630-ish at 2×) — including a card WITH an uploaded background image + logo (the html-to-image risk case).
- Copy meta tags puts an `og:image` block on the clipboard.
- Landing renders; CTA → app.html.

## UI design
Produced via **ui-ux-pro-max** before build. Distinct from the four done (TableShot violet/light, ScrubShot dark-navy, BadgeForge dark-amber, HueProof mono-neutral) — likely a creative/studio feel. Reuse shared tokens + Inter.
