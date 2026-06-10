/* ============================================================
   TableShot — paste a table/CSV, get a beautiful shareable image.
   100% client-side. No upload, no backend.
   ============================================================ */
(function () {
  "use strict";
  const { $, debounce, ICON, injectFavicon, toast, copyText, copyBlob, downloadBlob } = window.VT;
  injectFavicon("▦", "#6d28d9");

  const BLANK = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"; // 1x1 transparent (avoids html-to-image empty-src reject)
  const EYE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
  const EYEOFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 2 20 20"/><path d="M6.7 6.7C3.6 8.6 2 12 2 12s3.5 7 10 7c2 0 3.7-.6 5.2-1.5M9.9 5.2A9.7 9.7 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-2.2 3"/></svg>';

  /* ---------- Definitions ---------- */
  const THEMES = [
    { id: "aurora",   name: "Aurora",   fam: "Bold",  accent: "#6d28d9", chip: "#ffffff", bars: ["#6d28d9", "#1a2233", "#1a2233"] },
    { id: "sunset",   name: "Sunset",   fam: "Bold",  accent: "#e11d48", chip: "#fffdfb", bars: ["#e11d48", "#2a1f24", "#2a1f24"] },
    { id: "glass",    name: "Glass",    fam: "Bold",  accent: "#047857", chip: "#bfead8", bars: ["#0b3a2c", "#0d2620", "#0d2620"] },
    { id: "neon",     name: "Neon",     fam: "Bold",  accent: "#e635c5", chip: "#0d0b1a", bars: ["#f0abfc", "#ede9ff", "#9d8fc7"] },
    { id: "pastel",   name: "Pastel",   fam: "Bold",  accent: "#a78bfa", chip: "#fffdff", bars: ["#a78bfa", "#43385c", "#43385c"] },
    { id: "midnight", name: "Midnight", fam: "Sleek", accent: "#3b82f6", chip: "#0e1525", bars: ["#3b82f6", "#e7eefb", "#8a97b0"] },
    { id: "graphite", name: "Graphite", fam: "Sleek", accent: "#22d3ee", chip: "#15181e", bars: ["#22d3ee", "#e8ebf0", "#8b939f"] },
    { id: "terminal", name: "Terminal", fam: "Sleek", accent: "#3fb950", chip: "#0c1117", bars: ["#3fb950", "#c9d1d9", "#7d8893"] },
    { id: "minimal",  name: "Minimal",  fam: "Clean", accent: "#2563eb", chip: "#ffffff", bars: ["#2563eb", "#1b2230", "#1b2230"] },
    { id: "stripe",   name: "Stripe",   fam: "Clean", accent: "#4f46e5", chip: "#ffffff", bars: ["#4f46e5", "#1e293b", "#1e293b"] },
    { id: "slack",    name: "Slack",    fam: "Clean", accent: "#4a154b", chip: "#ffffff", bars: ["#4a154b", "#1d1c1d", "#1d1c1d"] },
    { id: "notion",   name: "Notion",   fam: "Clean", accent: "#cf8a3b", chip: "#ffffff", bars: ["#7a756a", "#37352f", "#37352f"] },
    { id: "paper",    name: "Paper",    fam: "Clean", accent: "#9a7b4f", chip: "#fdfbf5", bars: ["#9a7b4f", "#322d24", "#322d24"] },
    { id: "newspaper",name: "Newspaper",fam: "Clean", accent: "#1a1a1a", chip: "#fbfaf7", bars: ["#1a1a1a", "#1a1a1a", "#6b6b6b"] },
    { id: "mono",     name: "Mono",     fam: "Clean", accent: "#171717", chip: "#ffffff", bars: ["#404040", "#171717", "#171717"] },
  ];
  const THEME_ACCENT = Object.fromEntries(THEMES.map((t) => [t.id, t.accent]));

  const BGS = [
    { id: "auto", label: "Auto" },
    { id: "g1", css: "linear-gradient(135deg,#667eea,#764ba2)" },
    { id: "g2", css: "linear-gradient(135deg,#11998e,#38ef7d)" },
    { id: "g3", css: "linear-gradient(135deg,#f093fb,#f5576c)" },
    { id: "g4", css: "linear-gradient(135deg,#fa709a,#fee140)" },
    { id: "g5", css: "linear-gradient(135deg,#0f2027,#203a43,#2c5364)" },
    { id: "g6", css: "linear-gradient(135deg,#e0eafc,#cfdef3)" },
    { id: "g7", css: "linear-gradient(135deg,#1e3c72,#2a5298)" },
    { id: "gradient", label: "Custom" },
    { id: "solid", label: "Solid" },
    { id: "image", label: "Image" },
    { id: "transparent", label: "None" },
  ];
  const BG_CSS = Object.fromEntries(BGS.filter((b) => b.css).map((b) => [b.id, b.css]));
  const FONT = { sans: "var(--font-sans)", serif: "var(--font-serif)", mono: "var(--font-mono)" };
  const SIZES = { fit: null, "1:1": [760, 760], "4:5": [760, 950], "16:9": [840, 472], "1.91:1": [840, 440], "9:16": [560, 996] };
  const SAMPLE = "Plan,Customers,MRR,Churn\nFree,4210,$0,4.1%\nStarter,1820,$9100,2.3%\nPro,940,$28200,1.1%\nEnterprise,76,$45600,0.4%";

  /* ---------- State ---------- */
  const state = {
    data: "", header: true,
    theme: "aurora",
    bg: "auto", bgColor: "#0f172a", gradC1: "#6d28d9", gradC2: "#2563eb", gradAngle: 135, bgImage: null, bgImageFit: "cover",
    size: "fit",
    chrome: true, font: "", accent: "#6d28d9",
    density: 12, radius: 16, pad: 48, fsize: 15,
    zebra: true, firstcol: false, autonum: true, headerUpper: false, rowNumbers: false, wrapCells: false, colMax: 280,
    thousands: false, decimals: "auto",
    sortCol: "", sortDir: "asc",
    aligns: {}, hidden: {}, hlRows: [],
    title: "", subtitle: "", titleAlign: "left", caption: "", mark: true, markText: "", logo: null,
    scale: 2,
  };

  /* ---------- Elements ---------- */
  const shot = $("#shot"), tbl = $("#tbl");
  const shotHead = $("#shotHead"), shotTitle = $("#shotTitle"), shotSubtitle = $("#shotSubtitle");
  const shotCaption = $("#shotCaption"), shotMark = $("#shotMark"), barTitle = $("#barTitle"), shotLogo = $("#shotLogo");
  const emptyState = $("#emptyState"), dataEl = $("#data"), dimsEl = $("#dims");
  const themeGrid = $("#themeGrid"), bgGrid = $("#bgGrid"), colsCtl = $("#colsCtl"), sortColSel = $("#sortCol");

  /* ---------- Helpers ---------- */
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  function isNumberish(v) { const s = String(v).replace(/[\s,$€£¥%()]/g, ""); if (s === "" || s === "-") return false; return /^-?\d+(\.\d+)?$/.test(s); }
  function parseNum(v) { const s = String(v).replace(/[\s,$€£¥%()]/g, ""); const n = parseFloat(s); return isNaN(n) ? 0 : n; }
  function fmtNum(raw) {
    const s = String(raw); const m = s.match(/^(\D*?)(-?[\d,]*\.?\d+)(.*)$/);
    if (!m) return s;
    const pre = m[1] || "", body = m[2].replace(/,/g, ""), suf = m[3] || "";
    const n = parseFloat(body); if (isNaN(n)) return s;
    const opts = { useGrouping: !!state.thousands };
    if (state.decimals !== "auto") { opts.minimumFractionDigits = +state.decimals; opts.maximumFractionDigits = +state.decimals; }
    return pre + new Intl.NumberFormat("en-US", opts).format(n) + suf;
  }
  function fmtCell(raw, isNum) { if (!isNum) return String(raw); if (!state.thousands && state.decimals === "auto") return String(raw); return fmtNum(raw); }

  /* ---------- Parsing ---------- */
  function parseData() {
    const text = (state.data || "").trim(); if (!text) return null;
    const res = Papa.parse(text, { skipEmptyLines: "greedy" });
    let rows = (res.data || []).filter((r) => Array.isArray(r) && r.some((c) => String(c).trim() !== ""));
    if (!rows.length) return null;
    const ncol = Math.max.apply(null, rows.map((r) => r.length));
    rows = rows.map((r) => { const a = r.map((c) => String(c)); while (a.length < ncol) a.push(""); return a; });
    let headers = null, body = rows;
    if (state.header) { headers = rows[0]; body = rows.slice(1); }
    if (!body.length) body = headers ? [] : rows;
    const numCols = new Set();
    for (let c = 0; c < ncol; c++) { let any = false, all = true; for (const r of body) { const v = String(r[c]).trim(); if (v === "") continue; any = true; if (!isNumberish(v)) { all = false; break; } } if (any && all) numCols.add(c); }
    return { headers, rows: body, numCols, ncol };
  }
  function colNames(p) { return p.headers || Array.from({ length: p.ncol }, (_, i) => "Column " + (i + 1)); }
  function alignClass(c, p) { const a = state.aligns[c] || (p.numCols.has(c) && state.autonum ? "r" : "l"); return a === "r" ? "al-r" : a === "c" ? "al-c" : ""; }

  /* ---------- Render table ---------- */
  function buildTable(p) {
    tbl.innerHTML = "";
    const visible = []; for (let c = 0; c < p.ncol; c++) if (!state.hidden[c]) visible.push(c);
    let order = p.rows.map((_, i) => i);
    if (state.sortCol !== "" && state.sortCol != null) {
      const sc = +state.sortCol, isNum = p.numCols.has(sc), dir = state.sortDir === "desc" ? -1 : 1;
      order.sort((a, b) => { const va = p.rows[a][sc] ?? "", vb = p.rows[b][sc] ?? ""; return (isNum ? (parseNum(va) - parseNum(vb)) : String(va).localeCompare(String(vb))) * dir; });
    }
    if (p.headers) {
      const thead = document.createElement("thead"), tr = document.createElement("tr");
      if (state.rowNumbers) { const th = document.createElement("th"); th.className = "rownum"; th.textContent = "#"; tr.appendChild(th); }
      visible.forEach((c) => { const th = document.createElement("th"); th.textContent = p.headers[c]; th.className = alignClass(c, p); th.contentEditable = "true"; th.spellcheck = false; th.dataset.col = c; tr.appendChild(th); });
      thead.appendChild(tr); tbl.appendChild(thead);
    }
    const tbody = document.createElement("tbody");
    order.forEach((oi, di) => {
      const r = p.rows[oi], tr = document.createElement("tr"); tr.dataset.oi = oi;
      if (state.hlRows.indexOf(oi) >= 0) tr.className = "hl";
      if (state.rowNumbers) { const td = document.createElement("td"); td.className = "rownum"; td.textContent = String(di + 1); tr.appendChild(td); }
      visible.forEach((c) => { const td = document.createElement("td"); td.textContent = fmtCell(r[c], p.numCols.has(c)); td.className = alignClass(c, p); td.contentEditable = "true"; td.spellcheck = false; td.dataset.oi = oi; td.dataset.col = c; tr.appendChild(td); });
      tbody.appendChild(tr);
    });
    tbl.appendChild(tbody);
  }

  /* ---------- Background / size / style ---------- */
  function bgValue() {
    switch (state.bg) {
      case "auto": return "";
      case "solid": return state.bgColor;
      case "transparent": return "transparent";
      case "gradient": return "linear-gradient(" + state.gradAngle + "deg, " + state.gradC1 + ", " + state.gradC2 + ")";
      case "image": return "";
      default: return BG_CSS[state.bg] || "";
    }
  }
  function applyBackground() {
    if (state.bg === "image" && state.bgImage) {
      shot.style.background = "#1b1f27";
      shot.style.backgroundImage = 'url("' + state.bgImage + '")';
      shot.style.backgroundSize = state.bgImageFit; shot.style.backgroundPosition = "center"; shot.style.backgroundRepeat = "no-repeat";
    } else {
      shot.style.background = bgValue();
    }
  }
  function applyStyle() {
    const s = state;
    shot.className = "shot " + (s.chrome ? "chrome " : "") + "t-" + s.theme +
      (s.zebra ? " zebra" : "") + (s.firstcol ? " firstcol" : "") + (s.headerUpper ? " upper" : "") +
      (s.wrapCells ? " wrap" : "") + (s.size !== "fit" ? " sized" : "");
    shot.style.setProperty("--accent", s.accent);
    if (s.font) shot.style.setProperty("--tbl-font", FONT[s.font]); else shot.style.removeProperty("--tbl-font");
    shot.style.setProperty("--cpy", s.density + "px");
    shot.style.setProperty("--cpx", Math.round(s.density * 1.45) + "px");
    shot.style.setProperty("--pr", s.radius + "px");
    shot.style.setProperty("--sp", s.pad + "px");
    shot.style.setProperty("--tfs", s.fsize + "px");
    shot.style.setProperty("--colmax", s.colMax + "px");
    const dim = SIZES[s.size];
    if (dim) { shot.style.setProperty("--fw", dim[0] + "px"); shot.style.setProperty("--fh", dim[1] + "px"); }
    else { shot.style.removeProperty("--fw"); shot.style.removeProperty("--fh"); }
    applyBackground();
    // titles
    barTitle.textContent = s.title;
    shotTitle.textContent = s.title; shotTitle.hidden = !(!s.chrome && s.title);
    shotSubtitle.textContent = s.subtitle; shotSubtitle.hidden = !s.subtitle;
    shotHead.hidden = !(s.subtitle || (!s.chrome && s.title));
    shotHead.classList.toggle("center", s.titleAlign === "center");
    // caption / mark / logo
    shotCaption.textContent = s.caption; shotCaption.hidden = !s.caption;
    shotMark.hidden = !s.mark;
    if (s.markText) shotMark.textContent = s.markText; else shotMark.innerHTML = "made with <b>TableShot</b>";
    if (s.logo) { shotLogo.src = s.logo; shotLogo.hidden = false; } else { shotLogo.src = BLANK; shotLogo.hidden = true; }
  }

  /* ---------- Main render ---------- */
  let lastParsed = null, lastSig = "";
  function colSig(p) { return p ? p.ncol + "|" + (p.headers ? p.headers.join("") : "nohdr") : ""; }
  function maybeBuildColumnsUI(p) {
    const sig = colSig(p); if (sig === lastSig) return; const firstBuild = lastSig === ""; lastSig = sig;
    if (!firstBuild) { state.aligns = {}; state.hidden = {}; state.hlRows = []; state.sortCol = ""; }
    const names = colNames(p);
    sortColSel.innerHTML = '<option value="">— none —</option>' + names.map((n, i) => '<option value="' + i + '">' + esc(n) + "</option>").join("");
    sortColSel.value = state.sortCol == null ? "" : String(state.sortCol);
    colsCtl.innerHTML = names.map((n, i) => {
      const a = state.aligns[i] || (p.numCols.has(i) && state.autonum ? "r" : "l");
      return '<div class="col-row' + (state.hidden[i] ? " hidden-col" : "") + '" data-c="' + i + '">' +
        '<span class="cname" title="' + esc(n) + '">' + esc(n) + "</span>" +
        '<div class="seg" role="group">' +
        '<button data-al="l" aria-pressed="' + (a === "l") + '">L</button>' +
        '<button data-al="c" aria-pressed="' + (a === "c") + '">C</button>' +
        '<button data-al="r" aria-pressed="' + (a === "r") + '">R</button></div>' +
        '<button class="eye" data-eye="' + i + '" title="Show / hide column">' + (state.hidden[i] ? EYEOFF : EYE) + "</button></div>";
    }).join("");
  }
  function render() {
    const p = parseData(); lastParsed = p;
    const has = !!(p && (p.rows.length || (p.headers && p.headers.length)));
    shot.hidden = !has; emptyState.hidden = has;
    if (has) { maybeBuildColumnsUI(p); buildTable(p); applyStyle(); updateDims(); }
    setActionsEnabled(has);
  }
  function updateDims() { const w = Math.round(shot.offsetWidth * state.scale), h = Math.round(shot.offsetHeight * state.scale); dimsEl.textContent = w && h ? w + " × " + h + " px" : ""; }

  /* ---------- Markdown / export / share ---------- */
  function syncDataFromParsed() {
    if (!lastParsed) return;
    const rows = lastParsed.headers ? [lastParsed.headers].concat(lastParsed.rows) : lastParsed.rows;
    try { state.data = Papa.unparse(rows); dataEl.value = state.data; debouncedHash(); } catch (e) {}
  }

  function toMarkdown() {
    const p = lastParsed; if (!p) return "";
    const visible = []; for (let c = 0; c < p.ncol; c++) if (!state.hidden[c]) visible.push(c);
    const names = colNames(p);
    const e = (s) => String(s).replace(/\|/g, "\\|").replace(/\n+/g, " ");
    const out = [];
    out.push("| " + visible.map((c) => e(names[c])).join(" | ") + " |");
    out.push("| " + visible.map(() => "---").join(" | ") + " |");
    p.rows.forEach((r) => out.push("| " + visible.map((c) => e(fmtCell(r[c], p.numCols.has(c)))).join(" | ") + " |"));
    return out.join("\n");
  }
  async function exportBlob() { return await htmlToImage.toBlob(shot, { pixelRatio: state.scale, cacheBust: true, filter: (n) => !(n.tagName === "IMG" && !n.getAttribute("src")) }); }
  function serializable() { const c = Object.assign({}, state); delete c.bgImage; delete c.logo; return c; }
  function updateHash() { try { history.replaceState(null, "", "#s=" + LZString.compressToEncodedURIComponent(JSON.stringify(serializable()))); } catch (e) {} }
  function loadHash() {
    const m = location.hash.match(/^#s=(.+)$/); if (!m) return false;
    try { const o = JSON.parse(LZString.decompressFromEncodedURIComponent(m[1])); if (o && typeof o === "object") { Object.assign(state, o); state.aligns = state.aligns || {}; state.hidden = state.hidden || {}; state.hlRows = state.hlRows || []; return true; } } catch (e) {}
    return false;
  }

  /* ---------- HTML-table paste ---------- */
  function htmlTableToText(html) {
    const doc = new DOMParser().parseFromString(html, "text/html"); const table = doc.querySelector("table"); if (!table) return null;
    const rows = Array.from(table.querySelectorAll("tr")); if (!rows.length) return null;
    const lines = rows.map((tr) => Array.from(tr.querySelectorAll("th,td")).map((c) => (c.textContent || "").replace(/\s+/g, " ").trim()).join("\t"));
    return { text: lines.join("\n"), header: !!rows[0].querySelector("th") };
  }

  /* ---------- UI rendering ---------- */
  function renderThemeChips() {
    let html = "", lastFam = "";
    THEMES.forEach((t) => {
      if (t.fam !== lastFam) { html += '<div class="fam-label" style="grid-column:1/-1">' + t.fam + "</div>"; lastFam = t.fam; }
      html += '<button class="theme-chip" data-id="' + t.id + '" aria-pressed="false" title="' + t.name + '">' +
        '<span class="swatch" style="background:' + t.chip + '">' +
        '<span class="wbar"><b style="background:#ff5f57"></b><b style="background:#febc2e"></b><b style="background:#28c840"></b></span>' +
        '<i style="background:' + t.bars[0] + ';margin-top:8px"></i><i style="background:' + t.bars[1] + ';opacity:.5"></i><i style="background:' + t.bars[2] + ';opacity:.28"></i>' +
        '</span><span class="name">' + t.name + "</span></button>";
    });
    themeGrid.innerHTML = html;
  }
  function renderBgChips() {
    bgGrid.innerHTML = BGS.map((b) => {
      if (b.css) return '<button class="bg-chip" data-id="' + b.id + '" aria-pressed="false" title="background" style="background:' + b.css + '"></button>';
      if (b.id === "transparent") return '<button class="bg-chip checker" data-id="transparent" aria-pressed="false" title="Transparent"></button>';
      if (b.id === "solid") return '<button class="bg-chip" data-id="solid" aria-pressed="false" title="Solid" style="background:' + state.bgColor + '"><span class="bg-tag">Solid</span></button>';
      if (b.id === "gradient") return '<button class="bg-chip" data-id="gradient" aria-pressed="false" title="Custom gradient" style="background:linear-gradient(' + state.gradAngle + 'deg,' + state.gradC1 + ',' + state.gradC2 + ')"></button>';
      if (b.id === "image") return '<button class="bg-chip" data-id="image" aria-pressed="false" title="Image" style="background:var(--surface-3)"><span class="bg-tag" style="color:var(--muted);text-shadow:none">IMG</span></button>';
      return '<button class="bg-chip" data-id="auto" aria-pressed="false" title="Auto (theme)" style="background:var(--surface-3)"><span class="bg-tag" style="color:var(--muted);text-shadow:none">Auto</span></button>';
    }).join("");
  }
  function pressGroup(container, sel, attr, val) { container.querySelectorAll(sel).forEach((b) => b.setAttribute("aria-pressed", String(b.getAttribute(attr) === String(val)))); }
  function setActionsEnabled(on) { ["#btnCopy", "#btnPng", "#btnMd", "#btnShare"].forEach((s) => { $(s).disabled = !on; }); }
  function setRange(id, v) { $("#" + id).value = v; $("#" + id + "Out").textContent = v; }

  const debouncedHash = debounce(updateHash, 350);
  function changed(re) { if (re !== false) render(); debouncedHash(); }

  function toggleBgRows() {
    $("#bgSolidRow").hidden = state.bg !== "solid";
    $("#gradRow").hidden = state.bg !== "gradient";
    $("#imgRow").hidden = state.bg !== "image";
  }

  function syncUI() {
    dataEl.value = state.data;
    $("#optHeader").checked = state.header; $("#optChrome").checked = state.chrome;
    $("#optZebra").checked = state.zebra; $("#optFirstcol").checked = state.firstcol;
    $("#optHeaderUpper").checked = state.headerUpper; $("#optRownum").checked = state.rowNumbers;
    $("#optWrap").checked = state.wrapCells; $("#colMaxRow").hidden = !state.wrapCells;
    $("#optAutonum").checked = state.autonum; $("#optThousands").checked = state.thousands;
    $("#optMark").checked = state.mark; $("#markRow").hidden = !state.mark;
    $("#accentColor").value = state.accent; $("#bgColor").value = state.bgColor;
    $("#gradC1").value = state.gradC1; $("#gradC2").value = state.gradC2;
    $("#titleInput").value = state.title; $("#subtitleInput").value = state.subtitle;
    $("#captionInput").value = state.caption; $("#markInput").value = state.markText;
    setRange("density", state.density); setRange("radius", state.radius); setRange("pad", state.pad);
    setRange("fsize", state.fsize); setRange("colMax", state.colMax); setRange("gradAngle", state.gradAngle);
    pressGroup(themeGrid, ".theme-chip", "data-id", state.theme);
    pressGroup(bgGrid, ".bg-chip", "data-id", state.bg);
    pressGroup($("#fontSeg"), "button", "data-v", state.font);
    pressGroup($("#sizeSeg"), "button", "data-v", state.size);
    pressGroup($("#scaleSeg"), "button", "data-v", state.scale);
    pressGroup($("#decimalsSeg"), "button", "data-v", state.decimals);
    pressGroup($("#titleAlignSeg"), "button", "data-v", state.titleAlign);
    pressGroup($("#sortDirSeg"), "button", "data-v", state.sortDir);
    pressGroup($("#bgFitSeg"), "button", "data-v", state.bgImageFit);
    toggleBgRows();
  }

  function readImage(file, cb) { if (!file) return; const r = new FileReader(); r.onload = () => cb(r.result); r.readAsDataURL(file); }

  function init() {
    renderThemeChips(); renderBgChips();
    $("#btnMd").innerHTML = ICON.copy + "Markdown";
    $("#btnCopy").innerHTML = ICON.image + "Copy image";
    $("#btnShare").innerHTML = ICON.link + "Share link";
    $("#btnPng").innerHTML = ICON.download + "PNG";

    if (!loadHash()) state.data = SAMPLE;
    syncUI(); render();

    /* Data */
    dataEl.addEventListener("input", () => { state.data = dataEl.value; changed(); });
    $("#btnSample").addEventListener("click", () => { state.data = SAMPLE; state.header = true; syncUI(); changed(); });
    $("#btnClear").addEventListener("click", () => { state.data = ""; dataEl.value = ""; changed(); dataEl.focus(); });
    $("#optHeader").addEventListener("change", (e) => { state.header = e.target.checked; changed(); });

    /* Theme */
    themeGrid.addEventListener("click", (e) => { const b = e.target.closest(".theme-chip"); if (!b) return; state.theme = b.dataset.id; state.accent = THEME_ACCENT[state.theme] || state.accent; $("#accentColor").value = state.accent; pressGroup(themeGrid, ".theme-chip", "data-id", state.theme); changed(); });

    /* Background */
    bgGrid.addEventListener("click", (e) => { const b = e.target.closest(".bg-chip"); if (!b) return; state.bg = b.dataset.id; pressGroup(bgGrid, ".bg-chip", "data-id", state.bg); toggleBgRows(); changed(); });
    $("#bgColor").addEventListener("input", (e) => { state.bgColor = e.target.value; state.bg = "solid"; renderBgChips(); pressGroup(bgGrid, ".bg-chip", "data-id", state.bg); toggleBgRows(); changed(); });
    $("#gradC1").addEventListener("input", (e) => { state.gradC1 = e.target.value; state.bg = "gradient"; renderBgChips(); pressGroup(bgGrid, ".bg-chip", "data-id", "gradient"); toggleBgRows(); changed(); });
    $("#gradC2").addEventListener("input", (e) => { state.gradC2 = e.target.value; state.bg = "gradient"; renderBgChips(); pressGroup(bgGrid, ".bg-chip", "data-id", "gradient"); toggleBgRows(); changed(); });
    $("#gradAngle").addEventListener("input", (e) => { state.gradAngle = +e.target.value; $("#gradAngleOut").textContent = e.target.value; state.bg = "gradient"; changed(); });
    $("#bgImageFile").addEventListener("change", (e) => { readImage(e.target.files[0], (d) => { state.bgImage = d; state.bg = "image"; pressGroup(bgGrid, ".bg-chip", "data-id", "image"); toggleBgRows(); changed(); }); });
    $("#bgImageClear").addEventListener("click", () => { state.bgImage = null; state.bg = "auto"; pressGroup(bgGrid, ".bg-chip", "data-id", "auto"); toggleBgRows(); changed(); });
    $("#bgFitSeg").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; state.bgImageFit = b.dataset.v; pressGroup($("#bgFitSeg"), "button", "data-v", state.bgImageFit); changed(); });

    /* Size */
    $("#sizeSeg").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; state.size = b.dataset.v; pressGroup($("#sizeSeg"), "button", "data-v", state.size); changed(); });

    /* Style */
    $("#optChrome").addEventListener("change", (e) => { state.chrome = e.target.checked; changed(); });
    $("#fontSeg").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; state.font = b.dataset.v; pressGroup($("#fontSeg"), "button", "data-v", state.font); changed(); });
    $("#accentColor").addEventListener("input", (e) => { state.accent = e.target.value; changed(); });
    [["density", "density"], ["radius", "radius"], ["pad", "pad"], ["fsize", "fsize"], ["colMax", "colMax"]].forEach(([id, key]) => { $("#" + id).addEventListener("input", (e) => { state[key] = +e.target.value; $("#" + id + "Out").textContent = e.target.value; changed(); }); });
    $("#optZebra").addEventListener("change", (e) => { state.zebra = e.target.checked; changed(); });
    $("#optFirstcol").addEventListener("change", (e) => { state.firstcol = e.target.checked; changed(); });
    $("#optHeaderUpper").addEventListener("change", (e) => { state.headerUpper = e.target.checked; changed(); });
    $("#optRownum").addEventListener("change", (e) => { state.rowNumbers = e.target.checked; changed(); });
    $("#optWrap").addEventListener("change", (e) => { state.wrapCells = e.target.checked; $("#colMaxRow").hidden = !state.wrapCells; changed(); });

    /* Columns & sort */
    sortColSel.addEventListener("change", (e) => { state.sortCol = e.target.value; changed(); });
    $("#sortDirSeg").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; state.sortDir = b.dataset.v; pressGroup($("#sortDirSeg"), "button", "data-v", state.sortDir); changed(); });
    colsCtl.addEventListener("click", (e) => {
      const al = e.target.closest("button[data-al]"); const eye = e.target.closest("button[data-eye]");
      if (al) { const c = +al.closest(".col-row").dataset.c; state.aligns[c] = al.dataset.al; pressGroup(al.parentElement, "button", "data-al", al.dataset.al); changed(); }
      else if (eye) { const c = +eye.dataset.eye; state.hidden[c] = !state.hidden[c]; const row = eye.closest(".col-row"); row.classList.toggle("hidden-col", !!state.hidden[c]); eye.innerHTML = state.hidden[c] ? EYEOFF : EYE; changed(); }
    });

    /* Numbers */
    $("#optAutonum").addEventListener("change", (e) => { state.autonum = e.target.checked; changed(); });
    $("#optThousands").addEventListener("change", (e) => { state.thousands = e.target.checked; changed(); });
    $("#decimalsSeg").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; state.decimals = b.dataset.v; pressGroup($("#decimalsSeg"), "button", "data-v", state.decimals); changed(); });

    /* Labels & brand */
    $("#titleInput").addEventListener("input", (e) => { state.title = e.target.value; changed(); });
    $("#subtitleInput").addEventListener("input", (e) => { state.subtitle = e.target.value; changed(); });
    $("#captionInput").addEventListener("input", (e) => { state.caption = e.target.value; changed(); });
    $("#markInput").addEventListener("input", (e) => { state.markText = e.target.value; changed(); });
    $("#titleAlignSeg").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; state.titleAlign = b.dataset.v; pressGroup($("#titleAlignSeg"), "button", "data-v", state.titleAlign); changed(); });
    $("#optMark").addEventListener("change", (e) => { state.mark = e.target.checked; $("#markRow").hidden = !state.mark; changed(); });
    $("#logoFile").addEventListener("change", (e) => { readImage(e.target.files[0], (d) => { state.logo = d; changed(); }); });
    $("#logoClear").addEventListener("click", () => { state.logo = null; changed(); });

    /* Scale */
    $("#scaleSeg").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; state.scale = +b.dataset.v; pressGroup($("#scaleSeg"), "button", "data-v", state.scale); updateDims(); debouncedHash(); });

    /* Edit cells in place (click a cell, type) — writes back to the data so export/markdown/share stay in sync */
    tbl.addEventListener("input", (e) => {
      const cell = e.target.closest("[data-col]"); if (!cell || !lastParsed) return;
      const col = +cell.dataset.col, val = cell.textContent;
      if (cell.tagName === "TH") { if (lastParsed.headers) lastParsed.headers[col] = val; }
      else { const oi = +cell.dataset.oi; if (lastParsed.rows[oi]) lastParsed.rows[oi][col] = val; }
      syncDataFromParsed();
    });
    /* Row highlight: click the row-number cell (keeps cell clicks free for editing) */
    tbl.addEventListener("click", (e) => { const num = e.target.closest("td.rownum"); if (!num) return; const tr = num.closest("tr"); const oi = +tr.dataset.oi; const i = state.hlRows.indexOf(oi); if (i >= 0) state.hlRows.splice(i, 1); else state.hlRows.push(oi); tr.classList.toggle("hl"); debouncedHash(); });

    /* Actions */
    $("#btnPng").addEventListener("click", withBusy(async () => { const b = await exportBlob(); if (!b) throw 0; downloadBlob(b, "tableshot.png"); toast("PNG downloaded"); }, "Could not export image"));
    $("#btnCopy").addEventListener("click", withBusy(async () => { const b = await exportBlob(); if (!b) throw 0; await copyBlob(b); toast("Image copied to clipboard"); }, "Copy not supported here — use Download"));
    $("#btnMd").addEventListener("click", async () => { const md = toMarkdown(); if (!md) return; (await copyText(md)) ? toast("Markdown copied") : toast("Copy failed", "err"); });
    $("#btnShare").addEventListener("click", async () => { updateHash(); (await copyText(location.href)) ? toast("Share link copied") : toast("Copy failed", "err"); });

    /* Paste anywhere */
    document.addEventListener("paste", (e) => {
      const tag = (document.activeElement && document.activeElement.tagName) || "";
      if (tag === "TEXTAREA" || tag === "INPUT") return;
      const cd = e.clipboardData; if (!cd) return;
      const html = cd.getData("text/html"), parsed = html && htmlTableToText(html), text = cd.getData("text/plain");
      if (parsed) { state.data = parsed.text; state.header = parsed.header; } else if (text) { state.data = text; } else return;
      e.preventDefault(); syncUI(); changed(); toast("Pasted");
    });
  }

  function withBusy(fn, err) {
    return async function (e) { const btn = e.currentTarget, html = btn.innerHTML; btn.disabled = true; btn.style.opacity = ".7"; try { await fn(); } catch (x) { toast(err, "err"); } finally { btn.disabled = false; btn.style.opacity = ""; btn.innerHTML = html; } };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
