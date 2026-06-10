# BadgeForge — Design Spec

Tool #3 in **viral-tools**. Status: design approved (brainstorming, 2026-06-07). Next: ui-ux-pro-max UI design → build → webapp-testing.

## One-liner
Design beautiful static badges and status cards for your README, site, or socials — own the file, no service required. 100% in your browser.

## Positioning (honest)
shields.io / github-readme-stats win via a **hosted, live-updating URL** — which a pure client-side tool cannot provide, and GitHub markdown won't render data-URI images. So BadgeForge is NOT a live badge service. It is a **design tool for static badges/cards you own**: generate the SVG/PNG, then commit it to your repo (GitHub renders committed `.svg`) or paste inline SVG into sites/Notion/email. The embed loop is weaker than shields.io; we compensate with a **"export the whole board as one PNG"** share loop (post your badge set to X / 小红书).

## Hard constraints
- 100% client-side, static files, $0, GitHub Pages deployable. No backend, no AI, no live data.
- Badges/cards output **plain SVG** (rects/text/image only — NO `foreignObject`/HTML) so committed SVGs render on GitHub and scale crisply.
- English market. Fits the viral-tools shared design system (Inter, window-chrome family) with its own personality (ui-ux-pro-max to define).

## Components
1. **Badge generator** — shields-style flat badge: `label | message`. Precise sizing via canvas `measureText` (Verdana/DejaVu 11px metrics). Options: message color (preset palette + custom hex), **label color**, **style** (flat with gradient + 3px radius / flat-square / for-the-badge uppercase-bold-taller), optional **logo** (white-tinted, embedded as data-URI `<image>`). Returns plain SVG string.
2. **Status/stat card generator** — a titled box: title + optional subtitle + up to ~6 `label : value` stat rows + theme (bg/accent/text). Plain SVG, computed layout. Committable + crisp.
3. **Icon set** — curated ~60 popular tech/brand icons baked locally from simple-icons (slug → {path, hex}); searchable picker; also accept a pasted custom SVG or an emoji. (Full simple-icons set is multi-MB — excluded.)
4. **Board (preview + share loop)** — created items pin to a board; board background toggles **light / dark** (mimic README). Per-item: live SVG preview + copy/download actions + remove. Whole board **exports to one PNG** via html-to-image.
5. **Per-item output** (honest, no hosting): Copy inline **SVG** · Copy **`<img src="data:…">`** · Download **.svg** (to commit) · Download **.png**. No "Markdown + live URL" (we can't host; GitHub won't render data-URI) — stated in the UI.

## File structure (mirrors siblings)
- `badgeforge/app.html` (tool), `badgeforge/index.html` (landing), `badgeforge/style.css`, `badgeforge/app.js`
- `badgeforge/vendor/icons.js` (curated icon data), reuse `../shared/vendor/html-to-image.js` + Inter + `../shared/theme.css` + `../shared/app.js`
- Update root hub `index.html`: BadgeForge → Live

## Dependencies
html-to-image (board → PNG, already vendored) · curated icon data (built from simple-icons at build time) · badge/card SVG hand-written (no lib) · canvas measureText for sizing (native).

## Success criteria (webapp-testing)
- Loads, 0 console/page errors.
- Build a badge (label/message/color/style/logo) → preview shows a valid `<svg>`; the SVG parses and contains the label + message text.
- Style variants change the output (for-the-badge uppercases; flat-square has no radius).
- Logo picker embeds an `<image>`/path into the SVG.
- Build a stat card → valid plain SVG with title + rows (no `foreignObject`).
- Copy actions populate clipboard (SVG / img data-URI); Download .svg and .png produce real files (PNG download > a few KB).
- Board: add 2 items, toggle dark/light bg, **export board → one PNG** (real download).
- Landing renders; CTA → app.html.
- Plain-SVG check: generated badge/card SVG contains NO `foreignObject`.

## UI design
Produced via **ui-ux-pro-max** before build. Distinct personality from TableShot (light/violet) and ScrubShot (dark/shield-green); likely a crafted "maker/forge" feel. Must reuse shared tokens + Inter.
