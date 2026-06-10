/* ============================================================
   BadgeForge — design static badges & status cards (plain SVG).
   100% client-side. No backend, no live data.
   ============================================================ */
(function () {
  "use strict";
  const { $, $$, toast, copyText, downloadBlob, ICON } = window.VT;
  const ICONS = window.BF_ICONS || {};
  const mctx = document.createElement("canvas").getContext("2d");
  let GEN = 0;

  const MSG_COLORS = ["#22c55e", "#4c1", "#007ec6", "#e05d44", "#fe7d37", "#dfb317", "#9f4dbb", "#ec4899", "#555555", "#2b2b2b"];
  const ACCENTS = ["#f59e0b", "#22c55e", "#3b82f6", "#a855f7", "#ec4899", "#ef4444", "#14b8a6", "#eab308"];

  const state = {
    tab: "badge",
    badge: { label: "build", message: "passing", color: "#22c55e", labelColor: "#555555", style: "flat", logoSlug: null, customLogo: null },
    card: { title: "Project Stats", subtitle: "", accent: "#f59e0b", theme: "dark", rows: [{ label: "Stars", value: "1.2k" }, { label: "Version", value: "v2.1.0" }, { label: "License", value: "MIT" }] },
    board: [], boardBg: "dark",
  };

  const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const measure = (t, font) => { mctx.font = font; return mctx.measureText(t).width; };
  const svgDataUri = (svg) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  const fname = (s) => (s || "badge").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "badge";

  function logoDataUri(b) {
    if (b.customLogo) return svgDataUri(b.customLogo);
    if (b.logoSlug && ICONS[b.logoSlug]) return svgDataUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#fff" d="' + ICONS[b.logoSlug].path + '"/></svg>');
    return null;
  }

  /* ---------- Badge SVG ---------- */
  function badgeSVG(b) {
    const id = ++GEN;
    const FB = b.style === "for-the-badge";
    const fs = 11, font = (FB ? "700 " : "") + fs + 'px Verdana,"DejaVu Sans",sans-serif';
    const h = FB ? 28 : 20, pad = FB ? 12 : 9, gap = 5;
    const label = FB ? (b.label || "").toUpperCase() : (b.label || "");
    const message = FB ? (b.message || "").toUpperCase() : (b.message || "");
    const hasLogo = !!logoDataUri(b), logoW = hasLogo ? (FB ? 15 : 14) : 0;
    const lw = label ? Math.ceil(measure(label, font)) : 0, mw = Math.ceil(measure(message, font));
    const hasLeft = !!(label || hasLogo);
    let leftW = 0, labelCx = 0;
    if (hasLeft) { leftW = pad + (hasLogo ? logoW + (label ? gap : 0) : 0) + lw + pad; labelCx = pad + (hasLogo ? logoW + gap : 0) + lw / 2; }
    const rightW = pad + mw + pad, total = leftW + rightW, msgCx = leftW + pad + mw / 2;
    const rx = b.style === "flat" ? 3 : 0;
    const labelColor = b.labelColor || "#555", color = b.color || "#4c1";
    const logoY = (h - logoW) / 2;
    const txt = (x, t) => '<text x="' + x + '" y="' + h / 2 + '" dominant-baseline="central" fill="#010101" fill-opacity=".3">' + esc(t) + '</text><text x="' + x + '" y="' + h / 2 + '" dominant-baseline="central">' + esc(t) + "</text>";
    let s = '<svg xmlns="http://www.w3.org/2000/svg" width="' + total + '" height="' + h + '" role="img" aria-label="' + esc((label ? label + ": " : "") + message) + '">';
    s += "<title>" + esc((label ? label + ": " : "") + message) + "</title>";
    if (b.style === "flat") s += '<linearGradient id="bfg' + id + '" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>';
    s += '<clipPath id="bfr' + id + '"><rect width="' + total + '" height="' + h + '" rx="' + rx + '" fill="#fff"/></clipPath>';
    s += '<g clip-path="url(#bfr' + id + ')">';
    if (hasLeft) s += '<rect width="' + leftW + '" height="' + h + '" fill="' + labelColor + '"/>';
    s += '<rect x="' + leftW + '" width="' + rightW + '" height="' + h + '" fill="' + color + '"/>';
    if (b.style === "flat") s += '<rect width="' + total + '" height="' + h + '" fill="url(#bfg' + id + ')"/>';
    s += "</g>";
    if (hasLogo) s += '<image x="' + pad + '" y="' + logoY + '" width="' + logoW + '" height="' + logoW + '" href="' + logoDataUri(b) + '"/>';
    s += '<g fill="#fff" text-anchor="middle" font-family="Verdana,DejaVu Sans,sans-serif" font-size="' + fs + '"' + (FB ? ' font-weight="bold" letter-spacing="1"' : "") + ">";
    if (label && hasLeft) s += txt(labelCx, label);
    s += txt(msgCx, message);
    s += "</g></svg>";
    return s;
  }

  /* ---------- Card SVG (plain) ---------- */
  function cardSVG(c) {
    const id = ++GEN, dark = c.theme === "dark", W = 440, pad = 22;
    const bg = dark ? "#0d1117" : "#ffffff", border = dark ? "#30363d" : "#d0d7de", fg = dark ? "#e6edf3" : "#1f2328", mut = dark ? "#8b949e" : "#656d76";
    const rows = c.rows.filter((r) => (r.label || r.value));
    const FF = "'Segoe UI',Ubuntu,Helvetica,Arial,sans-serif", FFA = '"' + FF + '"';
    let y = pad + 17, blocks = "";
    blocks += '<text x="' + (pad + 6) + '" y="' + y + '" font-family=' + FFA + ' font-size="16" font-weight="700" fill="' + fg + '">' + esc(c.title) + "</text>";
    if (c.subtitle) { y += 19; blocks += '<text x="' + (pad + 6) + '" y="' + y + '" font-family=' + FFA + ' font-size="12" fill="' + mut + '">' + esc(c.subtitle) + "</text>"; }
    let ry = y + 24; const rowH = 28;
    rows.forEach((r) => {
      blocks += '<text x="' + (pad + 6) + '" y="' + ry + '" font-family=' + FFA + ' font-size="13" fill="' + mut + '">' + esc(r.label) + "</text>";
      blocks += '<text x="' + (W - pad) + '" y="' + ry + '" text-anchor="end" font-family=' + FFA + ' font-size="13" font-weight="700" fill="' + c.accent + '">' + esc(r.value) + "</text>";
      ry += rowH;
    });
    const H = ry - 18 + pad;
    let s = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" role="img" aria-label="' + esc(c.title) + '">';
    s += '<clipPath id="cc' + id + '"><rect width="' + W + '" height="' + H + '" rx="10"/></clipPath>';
    s += '<g clip-path="url(#cc' + id + ')"><rect width="' + W + '" height="' + H + '" fill="' + bg + '"/><rect width="5" height="' + H + '" fill="' + c.accent + '"/></g>';
    s += '<rect x="0.5" y="0.5" width="' + (W - 1) + '" height="' + (H - 1) + '" rx="10" fill="none" stroke="' + border + '"/>';
    s += blocks + "</svg>";
    return s;
  }

  const currentSVG = () => (state.tab === "badge" ? badgeSVG(state.badge) : cardSVG(state.card));
  const currentName = () => (state.tab === "badge" ? fname(state.badge.label + "-" + state.badge.message) : fname(state.card.title) + "-card");

  // A LIVE, hosted badge URL via shields.io — solves the README self-hosting problem (our logos are simple-icons slugs shields accepts).
  function shieldsUrl(b) {
    const enc = (s) => encodeURIComponent(String(s || "").replace(/-/g, "--").replace(/_/g, "__").replace(/ /g, "_"));
    const color = (b.color || "#4c1").replace("#", "");
    let u = "https://img.shields.io/badge/" + (b.label ? enc(b.label) + "-" : "") + enc(b.message || " ") + "-" + color;
    const ps = []; const sm = { flat: "flat", "flat-square": "flat-square", "for-the-badge": "for-the-badge" };
    if (sm[b.style]) ps.push("style=" + sm[b.style]);
    if (b.labelColor) ps.push("labelColor=" + b.labelColor.replace("#", ""));
    if (b.logoSlug) ps.push("logo=" + b.logoSlug, "logoColor=white");
    return u + (ps.length ? "?" + ps.join("&") : "");
  }
  function toggleBadgeOnly() { const on = state.tab === "badge"; $("#copyShields").hidden = !on; $("#copyMd").hidden = !on; }

  /* ---------- SVG → PNG ---------- */
  function svgToPng(svg, scale) {
    scale = scale || 3;
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = (img.naturalWidth || img.width) * scale; c.height = (img.naturalHeight || img.height) * scale;
        const x = c.getContext("2d"); x.scale(scale, scale); x.drawImage(img, 0, 0);
        c.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/png");
      };
      img.onerror = rej; img.src = svgDataUri(svg);
    });
  }

  function loadImg(svg) { return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = svgDataUri(svg); }); }
  async function exportBoardPng() {
    const scale = 2, pad = 28, gap = 12, maxW = 920, contentW = maxW - pad * 2;
    const imgs = await Promise.all(state.board.map((it) => loadImg(it.svg)));
    let x = 0, y = 0, rowH = 0; const placed = [];
    imgs.forEach((im) => {
      const w = im.naturalWidth || im.width, h = im.naturalHeight || im.height;
      if (x > 0 && x + w > contentW) { x = 0; y += rowH + gap; rowH = 0; }
      placed.push({ im, x, y, w, h }); x += w + gap; rowH = Math.max(rowH, h);
    });
    const totalH = y + rowH + pad * 2;
    const c = document.createElement("canvas"); c.width = maxW * scale; c.height = totalH * scale;
    const ctx = c.getContext("2d"); ctx.scale(scale, scale);
    ctx.fillStyle = state.boardBg === "dark" ? "#0d1117" : "#ffffff"; ctx.fillRect(0, 0, maxW, totalH);
    placed.forEach((p) => ctx.drawImage(p.im, pad + p.x, pad + p.y, p.w, p.h));
    return await new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/png"));
  }

  /* ---------- Render preview + board ---------- */
  function renderPreview() {
    $("#previewLive").innerHTML = '<span class="pv-svg">' + currentSVG() + "</span>";
  }
  function renderBoard() {
    const board = $("#board"); board.className = "board bg-" + state.boardBg;
    $("#boardCount").textContent = state.board.length ? "(" + state.board.length + ")" : "";
    $("#exportBoard").disabled = !state.board.length;
    if (!state.board.length) { board.innerHTML = '<div class="board-empty">Pin badges & cards here, then export the whole set as one PNG to share.</div>'; return; }
    board.innerHTML = state.board.map((it, i) =>
      '<div class="board-item" data-i="' + i + '"><span class="bi-svg">' + it.svg + "</span>" +
      '<div class="bi-actions"><button data-act="svg" title="Copy SVG">' + ICON.copy + '</button><button data-act="png" title="Download PNG">' + ICON.download + '</button><button data-act="rm" title="Remove">' + ICON.x + "</button></div></div>"
    ).join("");
  }

  /* ---------- Icon grid ---------- */
  function renderIcons(q) {
    q = (q || "").toLowerCase().trim();
    const slugs = Object.keys(ICONS).filter((s) => !q || s.includes(q) || ICONS[s].title.toLowerCase().includes(q)).sort();
    $("#iconGrid").innerHTML = slugs.map((s) =>
      '<button data-slug="' + s + '" title="' + esc(ICONS[s].title) + '" aria-pressed="' + (state.badge.logoSlug === s) + '"><svg viewBox="0 0 24 24"><path d="' + ICONS[s].path + '"/></svg></button>'
    ).join("") || '<div class="board-empty" style="grid-column:1/-1">no match</div>';
    const cur = $("#logoCurrent");
    if (state.badge.customLogo) cur.innerHTML = "★";
    else if (state.badge.logoSlug && ICONS[state.badge.logoSlug]) cur.innerHTML = '<svg viewBox="0 0 24 24"><path d="' + ICONS[state.badge.logoSlug].path + '"/></svg>';
    else cur.innerHTML = "—";
  }

  /* ---------- Stat rows ---------- */
  function renderStats() {
    $("#statRows").innerHTML = state.card.rows.map((r, i) =>
      '<div class="stat-row" data-i="' + i + '"><input type="text" data-k="label" value="' + esc(r.label) + '" placeholder="label" /><input type="text" data-k="value" value="' + esc(r.value) + '" placeholder="value" /><button class="rm" data-rm="' + i + '" aria-label="remove">' + ICON.x + "</button></div>"
    ).join("");
  }

  function press(group, attr, val) { $$(group + " button").forEach((b) => b.setAttribute("aria-pressed", String(b.getAttribute(attr) === String(val)))); }
  function renderPalettes() {
    $("#msgPalette").innerHTML = MSG_COLORS.map((c) => '<button class="sw" data-c="' + c + '" style="background:' + c + '" aria-pressed="' + (state.badge.color === c) + '" title="' + c + '"></button>').join("");
    $("#cardPalette").innerHTML = ACCENTS.map((c) => '<button class="sw" data-c="' + c + '" style="background:' + c + '" aria-pressed="' + (state.card.accent === c) + '" title="' + c + '"></button>').join("");
  }

  /* ---------- Wiring ---------- */
  function init() {
    $("#btnPin").innerHTML = ICON.check + "Pin to board";
    $("#copyShields").innerHTML = ICON.link + "Live URL"; $("#copyMd").innerHTML = ICON.copy + "Markdown";
    $("#copySvg").innerHTML = ICON.copy + "SVG"; $("#copyImg").innerHTML = ICON.copy + "&lt;img&gt;";
    $("#dlSvg").innerHTML = ICON.download + ".svg"; $("#dlPng").innerHTML = ICON.download + ".png";
    $("#exportBoard").innerHTML = ICON.image + "Export PNG";
    renderPalettes(); renderIcons(""); renderStats(); renderPreview(); renderBoard();

    // tabs
    $("#tabs").addEventListener("click", (e) => { const b = e.target.closest("button[data-tab]"); if (!b) return; state.tab = b.dataset.tab; $$("#tabs button").forEach((x) => x.setAttribute("aria-selected", String(x.dataset.tab === state.tab))); $("#panelBadge").hidden = state.tab !== "badge"; $("#panelCard").hidden = state.tab !== "card"; toggleBadgeOnly(); renderPreview(); });

    // badge inputs
    $("#bLabel").addEventListener("input", (e) => { state.badge.label = e.target.value; renderPreview(); });
    $("#bMsg").addEventListener("input", (e) => { state.badge.message = e.target.value; renderPreview(); });
    $("#bColor").addEventListener("input", (e) => { state.badge.color = e.target.value; press("#msgPalette", "data-c", e.target.value); renderPreview(); });
    $("#bLabelColor").addEventListener("input", (e) => { state.badge.labelColor = e.target.value; renderPreview(); });
    $("#msgPalette").addEventListener("click", (e) => { const b = e.target.closest("[data-c]"); if (!b) return; state.badge.color = b.dataset.c; $("#bColor").value = b.dataset.c; press("#msgPalette", "data-c", b.dataset.c); renderPreview(); });
    $("#styleSeg").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; state.badge.style = b.dataset.v; press("#styleSeg", "data-v", b.dataset.v); renderPreview(); });
    $("#iconSearch").addEventListener("input", (e) => renderIcons(e.target.value));
    $("#iconGrid").addEventListener("click", (e) => { const b = e.target.closest("button[data-slug]"); if (!b) return; state.badge.logoSlug = state.badge.logoSlug === b.dataset.slug ? null : b.dataset.slug; state.badge.customLogo = null; renderIcons($("#iconSearch").value); renderPreview(); });
    $("#logoNone").addEventListener("click", () => { state.badge.logoSlug = null; state.badge.customLogo = null; renderIcons($("#iconSearch").value); renderPreview(); });
    $("#logoPaste").addEventListener("click", () => { const v = prompt("Paste an SVG (e.g. <svg …>…</svg>):"); if (v && /<svg/i.test(v)) { state.badge.customLogo = v; state.badge.logoSlug = null; renderIcons($("#iconSearch").value); renderPreview(); } else if (v) toast("That doesn't look like an SVG", "err"); });

    // card inputs
    $("#cTitle").addEventListener("input", (e) => { state.card.title = e.target.value; renderPreview(); });
    $("#cSub").addEventListener("input", (e) => { state.card.subtitle = e.target.value; renderPreview(); });
    $("#cAccent").addEventListener("input", (e) => { state.card.accent = e.target.value; press("#cardPalette", "data-c", e.target.value); renderPreview(); });
    $("#cardPalette").addEventListener("click", (e) => { const b = e.target.closest("[data-c]"); if (!b) return; state.card.accent = b.dataset.c; $("#cAccent").value = b.dataset.c; press("#cardPalette", "data-c", b.dataset.c); renderPreview(); });
    $("#cardThemeSeg").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; state.card.theme = b.dataset.v; press("#cardThemeSeg", "data-v", b.dataset.v); renderPreview(); });
    $("#addStat").addEventListener("click", () => { if (state.card.rows.length < 8) { state.card.rows.push({ label: "Label", value: "value" }); renderStats(); renderPreview(); } });
    $("#statRows").addEventListener("input", (e) => { const row = e.target.closest(".stat-row"); if (!row) return; state.card.rows[+row.dataset.i][e.target.dataset.k] = e.target.value; renderPreview(); });
    $("#statRows").addEventListener("click", (e) => { const b = e.target.closest("[data-rm]"); if (!b) return; state.card.rows.splice(+b.dataset.rm, 1); renderStats(); renderPreview(); });

    // preview actions
    $("#copyShields").addEventListener("click", async () => { const u = shieldsUrl(state.badge); (await copyText(u)) ? toast("Live shields.io URL copied" + (state.badge.customLogo ? " (custom logo not in URL)" : "")) : toast("Copy failed", "err"); });
    $("#copyMd").addEventListener("click", async () => { const u = shieldsUrl(state.badge); (await copyText("![" + (state.badge.label || state.badge.message || "badge") + "](" + u + ")")) ? toast("Markdown copied") : toast("Copy failed", "err"); });
    toggleBadgeOnly();
    $("#copySvg").addEventListener("click", async () => { (await copyText(currentSVG())) ? toast("SVG code copied") : toast("Copy failed", "err"); });
    $("#copyImg").addEventListener("click", async () => { (await copyText('<img src="' + svgDataUri(currentSVG()) + '" alt="" />')) ? toast("<img> tag copied") : toast("Copy failed", "err"); });
    $("#dlSvg").addEventListener("click", () => { downloadBlob(new Blob([currentSVG()], { type: "image/svg+xml" }), currentName() + ".svg"); toast(".svg downloaded"); });
    $("#dlPng").addEventListener("click", async () => { try { downloadBlob(await svgToPng(currentSVG(), 3), currentName() + ".png"); toast(".png downloaded"); } catch (e) { toast("PNG failed", "err"); } });
    $("#btnPin").addEventListener("click", () => { state.board.push({ svg: currentSVG() }); renderBoard(); toast("Pinned to board"); });

    // board
    $("#bgSeg").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; state.boardBg = b.dataset.v; press("#bgSeg", "data-v", b.dataset.v); renderBoard(); });
    $("#clearBoard").addEventListener("click", () => { state.board = []; renderBoard(); });
    $("#board").addEventListener("click", async (e) => {
      const btn = e.target.closest("button[data-act]"); if (!btn) return;
      const i = +btn.closest(".board-item").dataset.i, it = state.board[i]; if (!it) return;
      if (btn.dataset.act === "svg") { (await copyText(it.svg)) ? toast("SVG copied") : toast("Copy failed", "err"); }
      else if (btn.dataset.act === "png") { try { downloadBlob(await svgToPng(it.svg, 3), "badge-" + (i + 1) + ".png"); toast(".png downloaded"); } catch (x) { toast("PNG failed", "err"); } }
      else if (btn.dataset.act === "rm") { state.board.splice(i, 1); renderBoard(); }
    });
    $("#exportBoard").addEventListener("click", async (e) => {
      const btn = e.currentTarget; btn.disabled = true; btn.style.opacity = ".7";
      try { const blob = await exportBoardPng(); if (!blob) throw 0; downloadBlob(blob, "badgeforge-board.png"); toast("Board exported as PNG"); }
      catch (x) { toast("Export failed", "err"); } finally { btn.disabled = false; btn.style.opacity = ""; }
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
