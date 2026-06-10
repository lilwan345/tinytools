# TableShot

**Paste a table or CSV → get a beautiful, shareable image.** 100% in your browser. Nothing is uploaded, no sign-up, no limits.

![TableShot preview](og.png)

Carbon made code screenshots beautiful. TableShot does the same for **tables** — the thing people constantly screenshot for Slack, X/Twitter, decks, and docs, but which always looks ugly.

## Features

- **Paste anything** — copy cells from Excel / Google Sheets / Notion / a web page and paste (`⌘V` / `Ctrl+V`) anywhere on the page, or type CSV/TSV. Delimiters and HTML tables are detected automatically.
- **6 hand-tuned themes** — Minimal, Striped, Dark, Notion, Terminal, Paper.
- **Full styling** — backgrounds (gradients / solid / transparent), accent color, font (sans / serif / mono), density, corner radius, outer padding, font size, zebra stripes, first-column emphasis.
- **Smart number columns** — numeric columns are detected and right-aligned automatically.
- **Title + caption** for context.
- **Export** — download PNG (1× / 2× / 3× for retina-crisp output), copy the image straight to your clipboard, or copy the data back as a Markdown table.
- **Shareable link** — the entire table + styling is encoded in the URL (`#s=…`), so a link reconstructs the exact image. No database, no backend.

## Privacy

Everything runs locally in your browser. Your data is never sent to a server — there is no server.

## Tech

Framework-free vanilla JS + a shared design system. Static files, zero build step, deployable to GitHub Pages.

Vendored libraries (all MIT): [PapaParse](https://www.papaparse.com/) (CSV parsing), [html-to-image](https://github.com/bubkoo/html-to-image) (DOM → PNG), [lz-string](https://github.com/pieroxy/lz-string) (URL-hash compression).

## Run locally

From the repo root:

```bash
./serve.sh        # serves at http://localhost:8000
```

Then open <http://localhost:8000/tableshot/> for the landing page, or go straight to the tool at <http://localhost:8000/tableshot/app.html>. (Opening the files directly via `file://` also works; a server just enables clipboard-image copy in the tool.)
