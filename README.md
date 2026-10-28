# tinytools

[![Live site](https://img.shields.io/badge/live-lilwan345.github.io%2Ftinytools-4f46e5)](https://lilwan345.github.io/tinytools/)
![No server](https://img.shields.io/badge/server-none-16a34a)
![Vanilla JS](https://img.shields.io/badge/vanilla%20JS-no%20build%20step-f7df1e)
[![MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

Four free tools that run **completely in your browser**. No upload, no sign-up,
no tracking, because there isn't a server at all. It's just static files on
GitHub Pages, so your files never leave your device.

**[Open tinytools →](https://lilwan345.github.io/tinytools/)**

[![The tinytools hub: PicPress, ScrubShot, PageStack and HueProof](assets/hub.png)](https://lilwan345.github.io/tinytools/)

## The tools

| Tool | What it does | How it works |
|---|---|---|
| [**PicPress**](https://lilwan345.github.io/tinytools/picpress/) | HEIC → JPG, shrink any photo to fit under a size limit ("max 200 KB"), batch resize, download as a zip | It tries different JPEG quality levels, narrowing in like a binary search, until the file fits. If even the lowest quality is still too big, it makes the image smaller and tries again. HEIC files get decoded by a WASM build of heic2any that only loads when you need it. |
| [**ScrubShot**](https://lilwan345.github.io/tinytools/scrubshot/) | Shows what your photos give away (GPS location, camera, timestamps), then strips it | It walks through the file's parts and only drops the metadata ones (JPEG EXIF/XMP, IPTC and comments; PNG text and EXIF chunks; WebP EXIF/XMP). Not a single pixel gets re-encoded. |
| [**PageStack**](https://lilwan345.github.io/tinytools/pagestack/) | Merge, split, reorder, rotate and delete PDF pages in one place | pdf.js draws the page thumbnails, and pdf-lib copies the pages you picked, in your order and rotation, into a new PDF. |
| [**HueProof**](https://lilwan345.github.io/tinytools/hueproof/) | Build a color palette with a live WCAG 2.1 contrast check, then export it to CSS variables, Tailwind, SCSS or JSON | It works out the contrast ratio for every pair of colors and grades it against AA and AAA, for normal and large text. |

## Why these four

Each one is something people search for over and over ("compress photo to 200
KB", "remove location from photo", "merge PDF"), and the usual answer is some
site full of ads that uploads your files. Doing it in the browser is faster and
it's actually private.

The first version had a different fourth tool, TableShot (pretty table images
from a CSV). Honestly it was competing with just taking a screenshot, so I
swapped it for PicPress, which fixes a problem people run into every week.
TableShot and two older experiments (`badgeforge/` and `ogforge/`, which went
head to head with shields.io and Canva) are still in the repo for reference but
they're not on the hub anymore.

## Run it locally

```bash
./serve.sh        # http://localhost:8000
```

Any static file server works, there's no build step.

## Structure

```
index.html          the hub
picpress/ scrubshot/ pagestack/ hueproof/
                    one self-contained folder per tool (index.html landing page,
                    app.html + app.js + style.css for the tool itself)
shared/             design tokens (theme.css), small helpers (app.js), self-hosted fonts
*/vendor/           pinned third-party libraries, served locally (no CDN calls)
```

## License

MIT, see [LICENSE](LICENSE).
