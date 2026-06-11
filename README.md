# tinytools

A small set of fast, free web tools that run **100% in your browser**. No upload, no sign-up, no tracking — there is no server. Everything is static files, deployable to GitHub Pages for $0.

Each tool is built around a simple idea: the kind of thing people search for ("do X online free") or that produces something they'll *share* — optimized to be cleaner, faster, and more private than the ad-stuffed incumbents.

## The tools

| Tool | What it does | Status |
|------|--------------|--------|
| [**PicPress**](picpress/) | HEIC → JPG, compress under any KB limit, batch resize — photos never uploaded | ✅ Live |
| [**ScrubShot**](scrubshot/) | See what your photos leak (GPS, serial…) & strip it losslessly — works offline | ✅ Live |
| [**PageStack**](pagestack/) | Merge, split, reorder & rotate PDFs in one visual workspace — no upload | ✅ Live |
| [**HueProof**](hueproof/) | Palettes with a WCAG contrast matrix + export to CSS/Tailwind/tokens | ✅ Live |

Retired from the hub (kept in the repo for reference): `badgeforge/`, `ogforge/`, `tableshot/` — both competed head-on with free incumbents (shields.io, Canva) on their home turf; the suite now plays only to its strengths: byte-level engineering + privacy.

## Run locally

```bash
./serve.sh        # http://localhost:8000
```

## Design system

Shared design tokens and components live in [`shared/`](shared/) (`theme.css`, `app.js`). Each tool is a self-contained folder of static files and reuses the shared system. No framework, no build step.

## License

MIT
