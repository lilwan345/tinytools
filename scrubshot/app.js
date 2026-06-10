/* ============================================================
   ScrubShot — see what your photos leak, then erase it.
   100% client-side. ZERO network requests. No upload, no backend.
   ============================================================ */
(function () {
  "use strict";
  const { $, $$, toast, copyBlob, downloadBlob } = window.VT;

  // Verifiable privacy: count any request that sends data OFF this origin. Stays 0 — the photo never leaves.
  let EXT = 0;
  const isCross = (u) => { try { u = String(u); if (/^(data:|blob:|#)/.test(u)) return false; return new URL(u, location.href).origin !== location.origin; } catch (e) { return false; } };
  (function () {
    const f = window.fetch; if (f) window.fetch = function (a) { try { if (isCross(a && a.url ? a.url : a)) EXT++; } catch (e) {} trust(); return f.apply(this, arguments); };
    const o = XMLHttpRequest.prototype.open; XMLHttpRequest.prototype.open = function (m, u) { if (isCross(u)) EXT++; trust(); return o.apply(this, arguments); };
    if (navigator.sendBeacon) { const b = navigator.sendBeacon.bind(navigator); navigator.sendBeacon = function (u) { if (isCross(u)) EXT++; trust(); return b.apply(navigator, arguments); }; }
  })();
  function trust() { const el = document.getElementById("trustBar"); if (!el) return; el.className = "trust" + (EXT ? " warn" : ""); el.innerHTML = '<span class="ic">' + (EXT ? I.alert : I.shield) + "</span><span>" + (EXT ? "Off-device request detected!" : "Nothing leaves your device") + '</span><span class="cnt">' + EXT + " uploads</span>"; }

  const I = {
    upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 9 12 4 17 9"/><line x1="12" y1="4" x2="12" y2="16"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5l-8-3Z"/></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
    camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z"/><circle cx="12" cy="13" r="4"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    hash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    chip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="5" width="14" height="14" rx="2"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/></svg>',
  };
  const CAT = {
    location: { icon: I.pin, label: "Location", sensitive: true },
    camera:   { icon: I.camera, label: "Camera", sensitive: false },
    lens:     { icon: I.camera, label: "Lens", sensitive: false },
    time:     { icon: I.clock, label: "Time taken", sensitive: false },
    software: { icon: I.chip, label: "Software", sensitive: false },
    serial:   { icon: I.hash, label: "Serial number", sensitive: true },
    artist:   { icon: I.user, label: "Author", sensitive: true },
  };

  const WHY = {
    location: "Anyone you send this to can see <b>exactly where</b> it was taken.",
    serial: "Your camera's <b>unique ID</b> — it links every photo you've ever shot back to you.",
    artist: "Your <b>name</b>, baked into the file.",
    time: "The <b>exact date &amp; second</b> you took it.",
    camera: "Your exact <b>camera &amp; lens</b> model.",
  };
  function whyHTML(keys) { const r = keys.filter((k) => WHY[k]).map((k) => "<div>" + WHY[k] + "</div>"); return r.length ? '<div class="threat-why">' + r.join("") + "</div>" : ""; }

  const state = { files: [], selected: null, reencode: false };
  let uid = 0;

  const fileList = $("#fileList"), inspectInner = $("#inspectInner"), emptyState = $("#emptyState");
  const batchBar = $("#batchBar"), reportCard = $("#reportCard");

  /* ---------- Metadata ---------- */
  async function readMeta(src) {
    try { return (await exifr.parse(src, { tiff: true, ifd0: true, exif: true, gps: true, xmp: true, iptc: true, mergeOutput: true })) || {}; }
    catch (e) { return {}; }
  }
  function fmtDate(dt) {
    if (!dt) return "";
    const d = dt instanceof Date ? dt : new Date(dt);
    if (isNaN(d)) return String(dt);
    const p = (n) => String(n).padStart(2, "0");
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes());
  }
  function extractFindings(m) {
    const f = {};
    if (m.latitude != null && m.longitude != null) f.location = { lat: m.latitude, lng: m.longitude };
    const make = m.Make ? String(m.Make).trim() : "", model = m.Model ? String(m.Model).trim() : "";
    const cam = model && make && model.toLowerCase().startsWith(make.toLowerCase()) ? model : [make, model].filter(Boolean).join(" ").trim();
    if (cam) f.camera = cam;
    if (m.LensModel || m.Lens) f.lens = m.LensModel || m.Lens;
    const dt = m.DateTimeOriginal || m.CreateDate || m.DateTime;
    if (dt) f.time = fmtDate(dt);
    if (m.Software) f.software = String(m.Software);
    const serial = m.SerialNumber || m.BodySerialNumber || m.InternalSerialNumber || m.CameraSerialNumber;
    if (serial) f.serial = String(serial);
    const artist = m.Artist || m.Creator || m.byline;
    if (artist) f.artist = String(artist);
    return f;
  }

  /* ---------- Scrub engines (lossless byte surgery) ---------- */
  function buildBlob(u, ranges, type) {
    let total = 0; ranges.forEach((r) => (total += r[1] - r[0]));
    const out = new Uint8Array(total); let off = 0;
    ranges.forEach(([a, b]) => { out.set(u.subarray(a, b), off); off += b - a; });
    return new Blob([out], { type });
  }
  function scrubJPEG(buf) {
    const u = new Uint8Array(buf); if (u[0] !== 0xFF || u[1] !== 0xD8) return null;
    const keep = [[0, 2]]; let i = 2; const n = u.length;
    while (i < n) {
      if (u[i] !== 0xFF) { keep.push([i, n]); break; }
      const marker = u[i + 1];
      if (marker === 0xFF) { i++; continue; }
      if (marker === 0xDA) { keep.push([i, n]); break; }            // SOS → copy rest
      if (marker === 0xD9) { keep.push([i, i + 2]); i += 2; continue; }
      if (marker === 0x01 || (marker >= 0xD0 && marker <= 0xD7)) { keep.push([i, i + 2]); i += 2; continue; }
      const len = (u[i + 2] << 8) | u[i + 3]; const segEnd = i + 2 + len;
      if (segEnd > n || len < 2) { keep.push([i, n]); break; }
      const drop = marker === 0xE1 || marker === 0xED || marker === 0xFE; // EXIF/XMP, IPTC, COM
      if (!drop) keep.push([i, segEnd]);
      i = segEnd;
    }
    return buildBlob(u, keep, "image/jpeg");
  }
  function scrubPNG(buf) {
    const u = new Uint8Array(buf), dv = new DataView(buf), sig = [137, 80, 78, 71, 13, 10, 26, 10];
    for (let k = 0; k < 8; k++) if (u[k] !== sig[k]) return null;
    const keep = [[0, 8]]; let i = 8; const drop = new Set(["tEXt", "zTXt", "iTXt", "eXIf", "tIME"]);
    while (i + 12 <= u.length) {
      const len = dv.getUint32(i);
      const type = String.fromCharCode(u[i + 4], u[i + 5], u[i + 6], u[i + 7]);
      const end = i + 12 + len; if (end > u.length) break;
      if (!drop.has(type)) keep.push([i, end]);
      i = end; if (type === "IEND") break;
    }
    return buildBlob(u, keep, "image/png");
  }
  function scrubWEBP(buf) {
    const u = new Uint8Array(buf), dv = new DataView(buf);
    const f4 = (o) => String.fromCharCode(u[o], u[o + 1], u[o + 2], u[o + 3]);
    if (f4(0) !== "RIFF" || f4(8) !== "WEBP") return null;
    const drop = new Set(["EXIF", "XMP "]); const chunks = []; let i = 12;
    while (i + 8 <= u.length) {
      const cc = f4(i); let size = dv.getUint32(i + 4, true);
      let end = i + 8 + size + (size & 1); if (end > u.length) end = u.length;
      if (!drop.has(cc)) chunks.push([i, end]);
      i = end;
    }
    let body = 0; chunks.forEach((c) => (body += c[1] - c[0]));
    const out = new Uint8Array(12 + body); out.set(u.subarray(0, 12), 0);
    new DataView(out.buffer).setUint32(4, 4 + body, true);
    let off = 12; chunks.forEach(([a, b]) => { out.set(u.subarray(a, b), off); off += b - a; });
    return new Blob([out], { type: "image/webp" });
  }
  function blobToImage(blob) {
    return new Promise((res, rej) => { const img = new Image(); img.onload = () => res(img); img.onerror = rej; img.src = URL.createObjectURL(blob); });
  }
  async function reencode(file) {
    const img = await blobToImage(file);
    const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
    c.getContext("2d").drawImage(img, 0, 0);
    const type = file.type === "image/png" ? "image/png" : "image/jpeg";
    return await new Promise((res) => c.toBlob(res, type, 0.95));
  }
  async function scrubFile(e) {
    if (state.reencode) return await reencode(e.file);
    const buf = await e.file.arrayBuffer();
    let blob = e.type === "image/jpeg" ? scrubJPEG(buf) : e.type === "image/png" ? scrubPNG(buf) : e.type === "image/webp" ? scrubWEBP(buf) : null;
    if (!blob) blob = await reencode(e.file);
    return blob;
  }

  /* ---------- File intake ---------- */
  const OK = ["image/jpeg", "image/png", "image/webp"];
  function addFiles(list) {
    let added = 0, heic = 0;
    Array.from(list).forEach((file) => {
      if (/heic|heif/i.test(file.type) || /\.he(ic|if)$/i.test(file.name)) { heic++; return; }
      if (!OK.includes(file.type)) return;
      const e = { id: ++uid, file, name: file.name, type: file.type, url: URL.createObjectURL(file), findings: null, status: "wait", verified: false };
      state.files.push(e); added++;
      scan(e);
    });
    if (heic) toast("HEIC isn't supported yet — convert to JPEG first", "err", 3200);
    if (added) { if (!state.selected) state.selected = state.files[state.files.length - added].id; renderList(); renderInspect(); }
  }
  async function scan(e) {
    const m = await readMeta(e.file);
    e.meta = m; e.findings = extractFindings(m);
    e.status = Object.keys(e.findings).length ? "leak" : "clean";
    renderList(); if (state.selected === e.id) renderInspect();
  }

  /* ---------- Render: file list ---------- */
  function renderList() {
    batchBar.hidden = state.files.length < 1;
    $("#btnBatch").innerHTML = I.shield + "Scrub all " + state.files.length + " → .zip";
    fileList.innerHTML = "";
    state.files.forEach((e) => {
      const div = document.createElement("div");
      div.className = "file-item"; div.setAttribute("aria-selected", String(state.selected === e.id)); div.dataset.id = e.id;
      const n = e.findings ? Object.keys(e.findings).length : 0;
      const status = e.verified ? '<span class="fi-status clean">✓ scrubbed clean</span>'
        : e.status === "wait" ? '<span class="fi-status wait">scanning…</span>'
        : e.status === "leak" ? '<span class="fi-status leak">⚠ ' + n + " leak" + (n > 1 ? "s" : "") + "</span>"
        : '<span class="fi-status clean">✓ clean</span>';
      div.innerHTML = '<img class="fi-thumb" src="' + e.url + '" alt="" /><div class="fi-meta"><div class="fi-name">' + esc(e.name) + "</div>" + status + '</div><button class="fi-x" data-x="' + e.id + '" aria-label="Remove">' + I.x + "</button>";
      fileList.appendChild(div);
    });
  }

  /* ---------- Render: inspect ---------- */
  function radarHTML(loc, withCoords) {
    if (!loc) return "";
    const left = ((loc.lng + 180) / 360 * 100).toFixed(2);
    const top = ((90 - loc.lat) / 180 * 100).toFixed(2);
    const coords = loc.lat.toFixed(5) + ", " + loc.lng.toFixed(5);
    return '<div class="radar-wrap"><div class="radar-label"><span>◎ GEO-LOCATION FOUND</span>' + (withCoords ? "<span>" + coords + "</span>" : "<span>•••••• , ••••••</span>") + "</div>" +
      '<div class="radar"><div class="equator"></div><div class="meridian"></div>' +
      '<div class="crosshair-h" style="top:' + top + '%"></div><div class="crosshair-v" style="left:' + left + '%"></div>' +
      '<div class="marker" style="left:' + left + "%;top:" + top + '%"><div class="ring"></div><div class="dot"></div></div></div></div>';
  }
  function renderInspect() {
    const e = state.files.find((x) => x.id === state.selected);
    if (!e) { inspectInner.hidden = true; emptyState.hidden = false; return; }
    emptyState.hidden = true; inspectInner.hidden = false;
    if (!e.findings) { inspectInner.innerHTML = '<div class="scanning"><div class="scan-line"></div><p class="tech muted">Scanning ' + esc(e.name) + " …</p></div>"; return; }
    const f = e.findings; const keys = Object.keys(f); const n = keys.length;
    const dim = e.meta && e.meta.ImageWidth && e.meta.ImageHeight ? e.meta.ImageWidth + "×" + e.meta.ImageHeight : "";

    let html = '<div class="inspect-head"><span class="ih-name">' + esc(e.name) + '</span><span class="ih-dim">' + (e.type.split("/")[1] || "").toUpperCase() + (dim ? " · " + dim : "") + "</span></div>";

    if (e.verified) {
      html += '<div class="threat clean"><div class="threat-line"><span class="ic">' + I.check + "</span> Scrubbed & verified clean</div><div class=\"threat-sub\">Re-scanned the output — no metadata remains. The download is in your folder.</div></div>";
    } else if (n === 0) {
      html += '<div class="threat clean"><div class="threat-line"><span class="ic">' + I.check + "</span> Clean — nothing to remove</div><div class=\"threat-sub\">No EXIF / GPS / XMP metadata found in this photo.</div></div>";
    } else {
      html += '<div class="threat leak"><div class="threat-line"><span class="ic">' + I.alert + "</span> This photo is leaking " + n + " thing" + (n > 1 ? "s" : "") + '</div><div class="threat-sub">Anyone you send the original to can read the items below.</div>';
      html += '<div class="chips">' + keys.map((k) => {
        const c = CAT[k]; const val = k === "location" ? f.location.lat.toFixed(3) + ", " + f.location.lng.toFixed(3) : f[k];
        return '<span class="chip"><span class="ic">' + (c ? c.icon : I.alert) + '</span><span class="k">' + (c ? c.label : k) + ':</span> <span class="v">' + esc(String(val)) + "</span></span>";
      }).join("") + "</div>" + whyHTML(keys) + "</div>";
      if (f.location) html += radarHTML(f.location, true);
    }

    // raw readout
    const entries = e.meta ? Object.entries(e.meta).filter(([k, v]) => v != null && typeof v !== "object").slice(0, 60) : [];
    if (entries.length) {
      html += '<details class="readout"><summary>Full metadata readout (' + entries.length + " fields)</summary><div class=\"readout-body\">" +
        entries.map(([k, v]) => '<div class="kv"><span class="k">' + esc(k) + '</span><span class="v">' + esc(String(v)) + "</span></div>").join("") + "</div></details>";
    }

    // actions
    html += '<div class="actions">' +
      '<button class="btn btn-primary" id="btnScrub">' + I.shield + (n ? "Scrub & download" : "Download (already clean)") + "</button>" +
      (n ? '<button class="btn" id="btnCard">' + I.image + "Privacy card</button>" : "") +
      '<label class="switch"><input type="checkbox" id="optReencode"' + (state.reencode ? " checked" : "") + ' /><span class="track"></span> Re-encode (max safety)</label>' +
      "</div>";

    inspectInner.innerHTML = html;
    $("#btnScrub").addEventListener("click", onScrub);
    if ($("#btnCard")) $("#btnCard").addEventListener("click", onCard);
    $("#optReencode").addEventListener("change", (ev) => { state.reencode = ev.target.checked; });
  }

  async function onScrub(ev) {
    const e = state.files.find((x) => x.id === state.selected); if (!e) return;
    const btn = ev.currentTarget; btn.disabled = true; btn.style.opacity = ".7";
    try {
      const blob = await scrubFile(e);
      const after = extractFindings(await readMeta(blob));
      e.verified = Object.keys(after).length === 0;
      downloadBlob(blob, "scrubbed-" + e.name);
      toast(e.verified ? "Scrubbed & verified clean — downloaded" : "Scrubbed — downloaded", e.verified ? "ok" : "ok");
      renderList(); renderInspect();
    } catch (x) { toast("Could not process this file", "err"); }
    finally { btn.disabled = false; btn.style.opacity = ""; }
  }

  /* ---------- Report card ---------- */
  function buildCardHTML(e) {
    const f = e.findings; const keys = Object.keys(f); const n = keys.length;
    const rows = keys.map((k) => {
      const c = CAT[k] || { icon: I.alert, label: k, sensitive: true };
      let v;
      if (k === "location") v = "Exact GPS coordinates";
      else if (k === "serial") v = "•••• " + String(f[k]).slice(-3);
      else v = String(f[k]);
      return '<div class="rc-row"><span class="ic">' + c.icon + '</span><span>' + c.label + ': <span class="v">' + esc(v) + "</span></span></div>";
    }).join("");
    return '<div class="rc-head"><span class="shield">' + I.shield + "</span> SCRUBSHOT · PRIVACY SCAN</div>" +
      '<div class="rc-title">This photo was leaking <span class="lk">' + n + " thing" + (n > 1 ? "s" : "") + "</span></div>" +
      '<div class="rc-list">' + rows + "</div>" +
      '<div class="rc-foot"><span class="scrubbed">✓ Scrubbed clean</span><span class="brand">scrubbed with <b>ScrubShot</b></span></div>';
  }
  async function onCard() {
    const e = state.files.find((x) => x.id === state.selected); if (!e || !e.findings) return;
    reportCard.innerHTML = buildCardHTML(e);
    try {
      const blob = await htmlToImage.toBlob(reportCard, { pixelRatio: 2, cacheBust: true, filter: (nd) => !(nd.tagName === "IMG" && !nd.getAttribute("src")) });
      if (!blob) throw 0;
      downloadBlob(blob, "scrubshot-privacy-card.png");
      try { await copyBlob(blob); toast("Privacy card downloaded + copied"); } catch (_) { toast("Privacy card downloaded"); }
    } catch (x) { toast("Could not make the card", "err"); }
  }

  /* ---------- Batch ---------- */
  async function batchZip(ev) {
    const btn = ev.currentTarget; btn.disabled = true; btn.style.opacity = ".7";
    try {
      const zip = new JSZip();
      for (const e of state.files) { const b = await scrubFile(e); zip.file("scrubbed-" + e.name, b); }
      const blob = await zip.generateAsync({ type: "blob" });
      downloadBlob(blob, "scrubshot-cleaned.zip");
      toast("Scrubbed " + state.files.length + " photos → .zip");
    } catch (x) { toast("Batch failed", "err"); }
    finally { btn.disabled = false; btn.style.opacity = ""; }
  }

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

  /* ---------- Wiring ---------- */
  function init() {
    $("#dropzone .dz-ic").innerHTML = I.upload;
    $("#emptyState .ic").innerHTML = I.shield;
    const dz = $("#dropzone"), input = $("#fileInput");
    dz.addEventListener("click", () => input.click());
    dz.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); } });
    input.addEventListener("change", (e) => { addFiles(e.target.files); input.value = ""; });
    ["dragenter", "dragover"].forEach((ev) => document.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add("drag"); }));
    ["dragleave", "drop"].forEach((ev) => document.addEventListener(ev, (e) => { e.preventDefault(); if (ev !== "dragover") dz.classList.remove("drag"); }));
    document.addEventListener("drop", (e) => { if (e.dataTransfer && e.dataTransfer.files.length) addFiles(e.dataTransfer.files); });

    fileList.addEventListener("click", (e) => {
      const x = e.target.closest("button[data-x]");
      if (x) { const id = +x.dataset.x; const idx = state.files.findIndex((f) => f.id === id); if (idx >= 0) { URL.revokeObjectURL(state.files[idx].url); state.files.splice(idx, 1); if (state.selected === id) state.selected = state.files.length ? state.files[0].id : null; renderList(); renderInspect(); } return; }
      const item = e.target.closest(".file-item"); if (item) { state.selected = +item.dataset.id; renderList(); renderInspect(); }
    });
    $("#btnBatch").addEventListener("click", batchZip);
    trust();
    renderList();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
