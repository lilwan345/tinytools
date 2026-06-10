/* ============================================================
   HueProof — palette + WCAG 2.1 contrast, proven & shareable.
   100% client-side. Pure-math color science, no libraries.
   ============================================================ */
(function () {
  "use strict";
  const { $, $$, debounce, toast, copyText, downloadBlob, ICON } = window.VT;

  const LK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
  const UNLK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-1.5"/></svg>';
  const EYE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 22 1-1h3l9-9"/><path d="M3 21v-3l9-9"/><path d="m15 6 3-3a2.8 2.8 0 1 1 4 4l-3 3-1-1-3 3-3-3 3-3-1-1Z"/></svg>';
  const XI = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  const CK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px"><path d="M20 6 9 17l-5-5"/></svg>';
  const CR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

  /* ---------- Color math ---------- */
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  function hexToRgb(hex) {
    let h = hex.replace("#", "");
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    const n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function rgbToHex(c) { return "#" + [c.r, c.g, c.b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0")).join(""); }
  function rgbToHsl({ r, g, b }) {
    r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0, l = (mx + mn) / 2;
    if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
    return [h, s * 100, l * 100];
  }
  function hslToHex(h, s, l) {
    h = ((h % 360) + 360) % 360; s = clamp(s, 0, 100) / 100; l = clamp(l, 0, 100) / 100;
    const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; } else if (h < 180) { g = c; b = x; } else if (h < 240) { g = x; b = c; } else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
    return rgbToHex({ r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 });
  }
  function relLum({ r, g, b }) {
    const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  }
  function contrast(h1, h2) { const a = relLum(hexToRgb(h1)), b = relLum(hexToRgb(h2)); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); }
  const fmtBig = (r) => (Math.round(r * 100) / 100).toString();

  /* ---------- State ---------- */
  const state = { palette: [], fg: "#18181B", bg: "#FFFFFF", codeFmt: "css" };
  const DEFAULT = ["#2563EB", "#10B981", "#F59E0B", "#EF4444", "#111827"];

  /* ---------- Hidden color picker (shared) ---------- */
  const picker = document.createElement("input"); picker.type = "color"; picker.style.cssText = "position:fixed;left:-9999px;top:0"; document.body.appendChild(picker);
  let pickTarget = null;
  picker.addEventListener("input", () => {
    if (pickTarget == null) return;
    if (pickTarget === "fg") state.fg = picker.value.toUpperCase();
    else if (pickTarget === "bg") state.bg = picker.value.toUpperCase();
    else state.palette[pickTarget].hex = picker.value.toUpperCase();
    render();
  });
  function openPicker(t) { pickTarget = t; picker.value = (t === "fg" ? state.fg : t === "bg" ? state.bg : state.palette[t].hex); picker.click(); }

  /* ---------- Render ---------- */
  // Semantic token names (hue family + Tailwind-style lightness step) — no lazy --color-1.
  function semanticName(hex) {
    const [h, s, l] = rgbToHsl(hexToRgb(hex));
    let fam;
    if (s < 12) fam = l >= 97 ? "white" : l <= 8 ? "black" : "gray";
    else if (h < 14) fam = "red"; else if (h < 36) fam = "orange"; else if (h < 52) fam = "amber";
    else if (h < 66) fam = "yellow"; else if (h < 84) fam = "lime"; else if (h < 146) fam = "green";
    else if (h < 168) fam = "teal"; else if (h < 190) fam = "cyan"; else if (h < 212) fam = "sky";
    else if (h < 248) fam = "blue"; else if (h < 268) fam = "indigo"; else if (h < 288) fam = "violet";
    else if (h < 310) fam = "purple"; else if (h < 332) fam = "fuchsia"; else if (h < 350) fam = "pink"; else fam = "red";
    if (fam === "white" || fam === "black") return fam;
    const step = l >= 93 ? 50 : l >= 85 ? 100 : l >= 76 ? 200 : l >= 67 ? 300 : l >= 58 ? 400 : l >= 49 ? 500 : l >= 40 ? 600 : l >= 31 ? 700 : l >= 23 ? 800 : l >= 14 ? 900 : 950;
    return fam + "-" + step;
  }
  function tokenNames() {
    const seen = {}, out = [];
    state.palette.forEach((s) => {
      let n = semanticName(s.hex);
      if (seen[n]) { seen[n]++; n = n + "-" + seen[n]; } else seen[n] = 1;
      out.push(n);
    });
    return out;
  }
  function genCode(fmt) {
    const cols = state.palette.map((s) => s.hex.toUpperCase()), names = tokenNames();
    if (fmt === "tailwind") return "// tailwind.config.js\ntheme: {\n  extend: {\n    colors: {\n" + cols.map((c, i) => "      '" + names[i] + "': \"" + c + '",').join("\n") + "\n    },\n  },\n},";
    if (fmt === "scss") return cols.map((c, i) => "$" + names[i] + ": " + c + ";").join("\n");
    if (fmt === "json") return JSON.stringify(Object.fromEntries(cols.map((c, i) => [names[i], c])), null, 2);
    if (fmt === "hex") return cols.join("\n");
    return ":root {\n" + cols.map((c, i) => "  --" + names[i] + ": " + c + ";").join("\n") + "\n}";
  }
  function renderCode() { const el = document.getElementById("codeOut"); if (el) el.textContent = genCode(state.codeFmt); }
  function render() { renderPalette(); renderMatrix(); renderChecker(); renderCode(); debouncedHash(); }

  function renderPalette() {
    const wrap = $("#palette");
    wrap.innerHTML = state.palette.map((s, i) =>
      '<div class="swatch" data-i="' + i + '"><div class="chip" data-chip="' + i + '" style="background:' + s.hex + '">' +
      '<button class="lock" data-lock="' + i + '" title="lock">' + (s.locked ? LK : UNLK) + "</button>" +
      '<button class="eyed" data-eyed="' + i + '" title="pick from screen">' + EYE + "</button></div>" +
      '<div class="meta"><input type="text" data-hex="' + i + '" value="' + s.hex.toUpperCase() + '" maxlength="7" aria-label="hex" />' +
      (state.palette.length > 2 ? '<button class="rm" data-rm="' + i + '" aria-label="remove">' + XI + "</button>" : "") + "</div></div>"
    ).join("") + (state.palette.length < 8 ? '<button class="swatch-add" id="addSwatch">+ Add</button>' : "");
  }

  function renderMatrix() {
    const cols = state.palette.map((s) => s.hex), n = cols.length, grid = $("#matrix");
    grid.style.gridTemplateColumns = "auto repeat(" + n + ", minmax(46px,1fr))";
    let html = '<div class="cell head"></div>';
    cols.forEach((c) => (html += '<div class="cell head"><span class="swatch-dot" style="background:' + c + '"></span></div>'));
    cols.forEach((rc, ri) => {
      html += '<div class="cell head"><span class="swatch-dot" style="background:' + rc + '"></span></div>';
      cols.forEach((cc, ci) => {
        if (ri === ci) { html += '<div class="cell diag">—</div>'; return; }
        const ratio = contrast(rc, cc), lvl = ratio >= 4.5 ? "pass" : ratio >= 3 ? "warn" : "fail";
        const col = lvl === "pass" ? "var(--pass)" : lvl === "warn" ? "var(--warn)" : "var(--fail)";
        html += '<div class="cell" data-fg="' + rc + '" data-bg="' + cc + '" style="background:' + cc + ";color:" + rc + '"><span class="r">' + ratio.toFixed(1) + '</span><span class="m" style="color:' + col + '">' + (lvl === "pass" ? "AA" : lvl === "warn" ? "AA·lg" : "✗") + "</span></div>";
      });
    });
    grid.innerHTML = html;
  }

  function renderChecker() {
    const r = contrast(state.fg, state.bg);
    $("#swFg").style.background = state.fg; $("#swBg").style.background = state.bg;
    $("#fgHex").textContent = state.fg.toUpperCase(); $("#bgHex").textContent = state.bg.toUpperCase();
    $("#ccNum").textContent = fmtBig(r);
    const defs = [["AA", "Normal", 4.5], ["AAA", "Normal", 7], ["AA", "Large", 3], ["AAA", "Large", 4.5]];
    $("#ccBadges").innerHTML = defs.map(([lvl, size, thr]) => { const ok = r >= thr; return '<div class="badge ' + (ok ? "pass" : "fail") + '"><span class="tag">' + (ok ? CK : CR) + lvl + " " + size + '</span><span class="res">' + (ok ? "Pass" : "Fail") + "</span></div>"; }).join("");
    const s = $("#ccSample"); s.style.background = state.bg; s.style.color = state.fg; s.style.borderColor = "color-mix(in srgb," + state.fg + " 22%, transparent)";
  }

  /* ---------- Harmony ---------- */
  function harmonize(type) {
    const base = state.palette.find((s) => !s.locked) || state.palette[0];
    const [h, s, l] = rgbToHsl(hexToRgb(base.hex)); const n = state.palette.length; const out = [];
    const rot = (dh, dl) => hslToHex(h + dh, s, clamp(l + (dl || 0), 8, 92));
    if (type === "complementary") { const set = [rot(0), rot(180), rot(0, 14), rot(180, -14), rot(0, -20)]; for (let i = 0; i < n; i++) out.push(set[i % set.length]); }
    else if (type === "analogous") { for (let i = 0; i < n; i++) out.push(rot((i - Math.floor(n / 2)) * 28)); }
    else if (type === "triadic") { for (let i = 0; i < n; i++) out.push(rot((i % 3) * 120, Math.floor(i / 3) * -14)); }
    else if (type === "tetradic") { for (let i = 0; i < n; i++) out.push(rot((i % 4) * 90, Math.floor(i / 4) * -14)); }
    else if (type === "monochrome") { for (let i = 0; i < n; i++) out.push(hslToHex(h, s, clamp(18 + i * (64 / Math.max(1, n - 1)), 8, 92))); }
    let k = 0; state.palette.forEach((sw) => { if (!sw.locked) { sw.hex = out[k] || sw.hex; k++; } });
    render();
  }
  function randomize() {
    state.palette.forEach((sw) => { if (!sw.locked) sw.hex = hslToHex(Math.random() * 360, 45 + Math.random() * 45, 30 + Math.random() * 45); });
    render();
  }

  /* ---------- Image extract ---------- */
  function blobToImage(blob) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(blob); }); }
  async function extractFromImage(file) {
    try {
      const img = await blobToImage(file);
      const W = Math.min(120, img.naturalWidth || 120), c = document.createElement("canvas");
      c.width = W; c.height = Math.max(1, Math.round((img.naturalHeight || W) * (W / (img.naturalWidth || W))));
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data, map = new Map();
      for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 200) continue; const key = (d[i] >> 4 << 8) | (d[i + 1] >> 4 << 4) | (d[i + 2] >> 4); const e = map.get(key) || { n: 0, r: 0, g: 0, b: 0 }; e.n++; e.r += d[i]; e.g += d[i + 1]; e.b += d[i + 2]; map.set(key, e); }
      const buckets = [...map.values()].map((e) => ({ n: e.n, r: e.r / e.n, g: e.g / e.n, b: e.b / e.n })).sort((a, b) => b.n - a.n);
      const dist = (a, b) => Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b), picked = [];
      for (const b of buckets) { if (picked.length >= 6) break; if (picked.every((p) => dist(p, b) > 46)) picked.push(b); }
      if (picked.length >= 2) { state.palette = picked.map((b) => ({ hex: rgbToHex(b).toUpperCase(), locked: false })); render(); toast("Extracted " + picked.length + " colors"); }
      else toast("Couldn't extract a palette", "err");
    } catch (e) { toast("Image read failed", "err"); }
  }

  /* ---------- Share / URL hash ---------- */
  const debouncedHash = debounce(updateHash, 300);
  function updateHash() {
    try { const p = state.palette.map((s) => s.hex.replace("#", "")).join("-"); history.replaceState(null, "", "#p=" + p + "&fg=" + state.fg.replace("#", "") + "&bg=" + state.bg.replace("#", "")); } catch (e) {}
  }
  const HEX = /^[0-9a-f]{3,6}$/i;
  function loadHash() {
    const h = location.hash.slice(1); if (!h) return false;
    const q = new URLSearchParams(h), p = q.get("p");
    if (p) { const arr = p.split("-").filter((x) => HEX.test(x)).slice(0, 8); if (arr.length) state.palette = arr.map((x) => ({ hex: "#" + x.toUpperCase(), locked: false })); }
    const fg = q.get("fg"), bg = q.get("bg");
    if (fg && HEX.test(fg)) state.fg = "#" + fg.toUpperCase();
    if (bg && HEX.test(bg)) state.bg = "#" + bg.toUpperCase();
    return !!p;
  }

  /* ---------- Share card PNG ---------- */
  function buildCard() {
    const cols = state.palette.map((s) => s.hex);
    let pass = 0, total = 0;
    for (let i = 0; i < cols.length; i++) for (let j = i + 1; j < cols.length; j++) { total++; if (contrast(cols[i], cols[j]) >= 4.5) pass++; }
    const sw = cols.map((c) => { const txt = contrast("#ffffff", c) >= contrast("#000000", c) ? "#fff" : "#000"; return '<div class="s" style="background:' + c + ";color:" + txt + '">' + c.toUpperCase() + "</div>"; }).join("");
    return '<h3>Palette · accessibility</h3><div class="sc-sub">WCAG 2.1 contrast check</div><div class="sc-swatches">' + sw + "</div>" +
      '<div class="sc-foot"><span><b>' + pass + "/" + total + "</b> pairs pass AA (≥4.5:1)</span><span>made with <b>HueProof</b></span></div>";
  }
  async function exportCard() {
    $("#shareCard").innerHTML = buildCard();
    try {
      const blob = await htmlToImage.toBlob($("#shareCard"), { pixelRatio: 2, cacheBust: true, backgroundColor: "#ffffff", filter: (n) => !(n.tagName === "IMG" && !n.getAttribute("src")) });
      if (!blob) throw 0; downloadBlob(blob, "hueproof-palette.png"); toast("Palette card downloaded");
    } catch (e) { toast("Card export failed", "err"); }
  }

  /* ---------- Wiring ---------- */
  function init() {
    $("#btnShare").innerHTML = ICON.link + "Share link"; $("#btnCard").innerHTML = ICON.image + "Export card";
    $("#btnCopyCode").innerHTML = ICON.copy + "Copy code";
    if (!loadHash()) state.palette = DEFAULT.map((h) => ({ hex: h, locked: false }));
    if (!state.palette.length) state.palette = DEFAULT.map((h) => ({ hex: h, locked: false }));
    render();

    $("#palette").addEventListener("click", (e) => {
      const chip = e.target.closest("[data-chip]"), lock = e.target.closest("[data-lock]"), eyed = e.target.closest("[data-eyed]"), rm = e.target.closest("[data-rm]"), add = e.target.closest("#addSwatch");
      if (lock) { e.stopPropagation(); const i = +lock.dataset.lock; state.palette[i].locked = !state.palette[i].locked; renderPalette(); return; }
      if (eyed) { e.stopPropagation(); eyedrop(+eyed.dataset.eyed); return; }
      if (rm) { e.stopPropagation(); state.palette.splice(+rm.dataset.rm, 1); render(); return; }
      if (add) { const base = state.palette[state.palette.length - 1]; state.palette.push({ hex: base ? base.hex : "#888888", locked: false }); render(); return; }
      if (chip) openPicker(+chip.dataset.chip);
    });
    $("#palette").addEventListener("input", (e) => {
      const hx = e.target.closest("[data-hex]"); if (!hx) return;
      let v = e.target.value.trim(); if (!v.startsWith("#")) v = "#" + v;
      if (HEX.test(v.slice(1))) { state.palette[+hx.dataset.hex].hex = v.toUpperCase(); e.target.closest(".swatch").querySelector(".chip").style.background = v; renderMatrix(); renderChecker(); debouncedHash(); }
    });

    $("#harmony").addEventListener("change", (e) => { if (e.target.value) { harmonize(e.target.value); e.target.value = ""; } });
    $("#btnRandom").addEventListener("click", randomize);
    $("#imgInput").addEventListener("change", (e) => { if (e.target.files[0]) extractFromImage(e.target.files[0]); e.target.value = ""; });
    $("#btnShare").addEventListener("click", async () => { updateHash(); (await copyText(location.href)) ? toast("Share link copied") : toast("Copy failed", "err"); });
    $("#btnCard").addEventListener("click", exportCard);

    $("#slotFg").addEventListener("click", () => openPicker("fg"));
    $("#slotBg").addEventListener("click", () => openPicker("bg"));
    $("#slotFg").addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openPicker("fg"); } });
    $("#slotBg").addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openPicker("bg"); } });
    $("#matrix").addEventListener("click", (e) => { const c = e.target.closest(".cell[data-fg]"); if (!c) return; state.fg = c.dataset.fg.toUpperCase(); state.bg = c.dataset.bg.toUpperCase(); renderChecker(); debouncedHash(); $("#ccPanel").scrollIntoView({ behavior: "smooth", block: "nearest" }); });

    $("#codeSeg").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; state.codeFmt = b.dataset.v; $$("#codeSeg button").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.v === state.codeFmt))); renderCode(); });
    $("#btnCopyCode").addEventListener("click", async () => { (await copyText(genCode(state.codeFmt))) ? toast(state.codeFmt.toUpperCase() + " copied") : toast("Copy failed", "err"); });

    // restore state if a shared hash is pasted into an already-open page (our own updates use replaceState, which doesn't fire hashchange)
    window.addEventListener("hashchange", () => { if (loadHash()) render(); });
  }
  async function eyedrop(i) {
    if (!window.EyeDropper) { toast("Your browser has no screen color picker", "err"); return; }
    try { const r = await new window.EyeDropper().open(); state.palette[i].hex = r.sRGBHex.toUpperCase(); render(); } catch (e) {}
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
