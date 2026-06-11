/* ============================================================
   PicPress — convert / compress / resize images, 100% local.
   The killer feature: "fit under N KB" via quality bisection
   (+ dimension fallback). HEIC via lazy-loaded heic2any WASM.
   ============================================================ */
(function () {
  "use strict";
  const { $, toast, downloadBlob, ICON } = window.VT;

  const I = {
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    img: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/></svg>',
    zap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  };

  const settings = { format: "jpeg", mode: "target", targetKB: 200, quality: 82, resize: "none", maxDim: 1600 };
  let files = []; // {id, file, name, origSize, bitmap, thumb, status, outBlob, outSize, outName, note, err}
  let uid = 0;

  const grid = $("#fileGrid"), dropwrap = $("#dropwrap");

  /* ---------- Helpers ---------- */
  const fmtBytes = (n) => n >= 1048576 ? (n / 1048576).toFixed(1) + " MB" : n >= 1024 ? Math.round(n / 1024) + " KB" : n + " B";
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const stem = (name) => name.replace(/\.[^.]+$/, "");
  const extFor = (fmt) => (fmt === "jpeg" ? "jpg" : fmt);
  const toBlob = (canvas, type, q) => new Promise((res) => canvas.toBlob(res, type, q));

  /* ---------- HEIC (lazy) ---------- */
  let heicLoader = null;
  function loadHeic() {
    if (window.heic2any) return Promise.resolve();
    if (!heicLoader) heicLoader = new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "vendor/heic2any.min.js"; s.onload = res; s.onerror = () => rej(new Error("heic2any load failed"));
      document.head.appendChild(s);
    });
    return heicLoader;
  }
  const isHeic = (f) => /heic|heif/i.test(f.type) || /\.hei[cf]$/i.test(f.name);

  /* ---------- Intake ---------- */
  async function addFiles(list) {
    const incoming = Array.from(list || []).filter((f) => isHeic(f) || ["image/jpeg", "image/png", "image/webp"].includes(f.type));
    const rejected = Array.from(list || []).length - incoming.length;
    if (rejected) toast(rejected + " unsupported file" + (rejected > 1 ? "s" : "") + " skipped (HEIC/JPG/PNG/WebP only)", "err");
    for (const file of incoming) {
      const entry = { id: ++uid, file, name: file.name, origSize: file.size, status: "loading", note: "", thumb: "" };
      files.push(entry); render();
      try {
        let blob = file;
        if (isHeic(file)) {
          entry.note = "decoding HEIC…"; render();
          await loadHeic();
          blob = await window.heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
          if (Array.isArray(blob)) blob = blob[0];
        }
        entry.bitmap = await createImageBitmap(blob);
        const t = document.createElement("canvas");
        const sc = Math.min(1, 220 / entry.bitmap.width);
        t.width = Math.max(1, Math.round(entry.bitmap.width * sc)); t.height = Math.max(1, Math.round(entry.bitmap.height * sc));
        t.getContext("2d").drawImage(entry.bitmap, 0, 0, t.width, t.height);
        entry.thumb = t.toDataURL("image/jpeg", 0.75);
        entry.status = "ready"; entry.note = entry.bitmap.width + "×" + entry.bitmap.height;
      } catch (e) {
        entry.status = "error"; entry.err = isHeic(file) ? "Couldn't decode this HEIC file" : "Couldn't read this image";
      }
      render();
    }
  }

  /* ---------- Conversion core ---------- */
  function targetDims(bm) {
    let w = bm.width, h = bm.height, f = 1;
    if (settings.resize === "half") f = 0.5;
    else if (settings.resize === "quarter") f = 0.25;
    else if (settings.resize === "maxdim") { const m = Math.max(w, h); f = m > settings.maxDim ? settings.maxDim / m : 1; }
    return { w: Math.max(1, Math.round(w * f)), h: Math.max(1, Math.round(h * f)) };
  }
  function drawCanvas(bm, w, h) {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    if (settings.format === "jpeg") { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h); } // flatten alpha for JPG
    ctx.drawImage(bm, 0, 0, w, h);
    return c;
  }
  async function encodeUnderTarget(bm, mime, budget) {
    // try at each scale: bisect quality; if even q=0.05 overshoots, shrink dimensions and retry
    let { w, h } = targetDims(bm);
    let best = null, note = "";
    for (let pass = 0; pass < 6; pass++) {
      const c = drawCanvas(bm, w, h);
      let lo = 0.05, hi = 0.97, fit = null;
      const floor = await toBlob(c, mime, lo);
      if (floor && floor.size <= budget) {
        fit = floor;
        for (let i = 0; i < 7; i++) {
          const q = (lo + hi) / 2;
          const b = await toBlob(c, mime, q);
          if (b && b.size <= budget) { fit = b; lo = q; } else { hi = q; }
        }
        best = fit;
        if (pass > 0) note = "downscaled to " + w + "×" + h + " to fit";
        break;
      }
      best = floor; // keep smallest so far in case we never fit
      if (Math.max(w, h) <= 320) { note = "couldn't reach target — smallest is " + fmtBytes(floor.size); break; }
      w = Math.max(1, Math.round(w * 0.8)); h = Math.max(1, Math.round(h * 0.8));
      note = "couldn't reach target — smallest is " + fmtBytes(best.size);
    }
    return { blob: best, note };
  }
  async function convertOne(entry) {
    if (!entry.bitmap) return;
    entry.status = "working"; entry.note = ""; render();
    try {
      let mime = "image/" + settings.format, blob, note = "";
      const { w, h } = targetDims(entry.bitmap);
      if (settings.format === "png") {
        blob = await toBlob(drawCanvas(entry.bitmap, w, h), "image/png");
      } else if (settings.mode === "target") {
        const r = await encodeUnderTarget(entry.bitmap, mime, settings.targetKB * 1024);
        blob = r.blob; note = r.note;
      } else {
        blob = await toBlob(drawCanvas(entry.bitmap, w, h), mime, settings.quality / 100);
      }
      if (!blob) throw new Error("encode failed");
      if (blob.type !== mime && settings.format === "webp") { // Safari can't encode WebP
        blob = await toBlob(drawCanvas(entry.bitmap, w, h), "image/jpeg", (settings.mode === "quality" ? settings.quality : 82) / 100);
        mime = "image/jpeg"; note = "browser can't encode WebP — made a JPG instead";
      }
      entry.outBlob = blob; entry.outSize = blob.size;
      entry.outName = stem(entry.name) + "." + (mime === "image/jpeg" ? "jpg" : mime.split("/")[1]);
      entry.status = "done"; entry.note = note;
    } catch (e) {
      entry.status = "error"; entry.err = "Conversion failed for this file";
    }
    render();
  }
  async function convertAll(btn) {
    btn.disabled = true; btn.style.opacity = ".7";
    try { for (const f of files) if (f.bitmap) await convertOne(f); toast("Converted " + files.filter((f) => f.status === "done").length + " image" + (files.length > 1 ? "s" : "")); }
    finally { btn.disabled = false; btn.style.opacity = ""; render(); }
  }

  /* ---------- Render ---------- */
  function render() {
    const has = files.length > 0;
    dropwrap.hidden = has; grid.hidden = !has;
    $("#btnClear").hidden = !has; $("#btnConvert").hidden = !has; $("#btnZip").hidden = !has;
    $("#btnConvert").innerHTML = I.zap + "Convert all";
    const done = files.filter((f) => f.status === "done");
    $("#btnZip").innerHTML = ICON.download + "Download .zip";
    $("#btnZip").disabled = done.length === 0;
    const sIn = done.reduce((a, f) => a + f.origSize, 0), sOut = done.reduce((a, f) => a + f.outSize, 0);
    $("#savedLine").textContent = done.length && sIn > sOut ? "Saved " + fmtBytes(sIn - sOut) + " (−" + Math.round((1 - sOut / sIn) * 100) + "%)" : "";
    if (!has) return;
    grid.innerHTML = files.map((f) => {
      const pct = f.status === "done" ? Math.round((1 - f.outSize / f.origSize) * 100) : null;
      return '<div class="fc' + (f.status === "working" || f.status === "loading" ? " working" : "") + '" data-id="' + f.id + '">' +
        '<button class="rm" data-rm="' + f.id + '" aria-label="Remove">' + I.x + "</button>" +
        '<div class="fc-thumb">' + (f.thumb ? '<img src="' + f.thumb + '" alt="" />' : "") + "</div>" +
        '<div class="fc-body"><div class="fc-name" title="' + esc(f.name) + '">' + esc(f.name) + "</div>" +
        '<div class="fc-sizes"><span>' + fmtBytes(f.origSize) + "</span>" +
        (f.status === "done" ? '<span class="arrow">→</span><span><b>' + fmtBytes(f.outSize) + '</b></span><span class="pct' + (pct < 0 ? " bad" : "") + '">' + (pct < 0 ? "+" + -pct : "−" + pct) + "%</span>" : "") + "</div>" +
        (f.err ? '<div class="fc-note err">' + esc(f.err) + "</div>" : f.note ? '<div class="fc-note">' + esc(f.note) + "</div>" : "") +
        (f.status === "done" ? '<div class="fc-actions"><button class="btn" data-dl="' + f.id + '">' + ICON.download + esc(f.outName) + "</button></div>" : "") +
        "</div></div>";
    }).join("");
  }

  /* ---------- Wiring ---------- */
  function press(sel, val) { document.querySelectorAll(sel + " button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === val))); }
  function syncRows() {
    const png = settings.format === "png";
    $("#pngNote").hidden = !png;
    $("#targetRow").hidden = png || settings.mode !== "target";
    $("#qualityRow").hidden = png || settings.mode !== "quality";
    $("#modeSeg").parentElement.style.display = png ? "none" : "";
    $("#maxdimRow").hidden = settings.resize !== "maxdim";
  }
  function init() {
    $("#btnAdd").innerHTML = I.plus + "Add images";
    $("#dropzone .dz-ic").innerHTML = I.img;

    $("#fileInput").addEventListener("change", (e) => { addFiles(e.target.files); e.target.value = ""; });
    const dz = $("#dropzone");
    dz.addEventListener("click", () => $("#fileInput").click());
    dz.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); $("#fileInput").click(); } });
    ["dragenter", "dragover"].forEach((ev) => document.addEventListener(ev, (e) => { e.preventDefault(); document.body.classList.add("dragover"); }));
    ["dragleave", "drop"].forEach((ev) => document.addEventListener(ev, (e) => { e.preventDefault(); if (ev === "drop" || e.target === document.documentElement) document.body.classList.remove("dragover"); }));
    document.addEventListener("drop", (e) => { if (e.dataTransfer && e.dataTransfer.files.length) addFiles(e.dataTransfer.files); });

    $("#fmtSeg").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; settings.format = b.dataset.v; press("#fmtSeg", settings.format); syncRows(); });
    $("#modeSeg").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; settings.mode = b.dataset.v; press("#modeSeg", settings.mode); syncRows(); });
    $("#resizeSeg").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; settings.resize = b.dataset.v; press("#resizeSeg", settings.resize); syncRows(); });
    $("#targetKB").addEventListener("input", (e) => { const v = parseInt(e.target.value, 10); if (v > 0) settings.targetKB = v; });
    $("#quality").addEventListener("input", (e) => { settings.quality = +e.target.value; $("#qualityOut").textContent = e.target.value; });
    $("#maxDim").addEventListener("input", (e) => { const v = parseInt(e.target.value, 10); if (v >= 320) settings.maxDim = v; });

    $("#btnConvert").addEventListener("click", (e) => convertAll(e.currentTarget));
    $("#btnZip").addEventListener("click", async (e) => {
      const btn = e.currentTarget; btn.disabled = true;
      try {
        const zip = new JSZip(); const seen = {};
        for (const f of files) if (f.status === "done") {
          let n = f.outName; if (seen[n]) n = stem(f.outName) + "-" + (++seen[f.outName]) + "." + n.split(".").pop(); else seen[n] = 1;
          zip.file(n, f.outBlob);
        }
        downloadBlob(await zip.generateAsync({ type: "blob" }), "picpress.zip");
        toast("Zip downloaded");
      } catch (x) { toast("Zip failed", "err"); } finally { btn.disabled = false; render(); }
    });
    $("#btnClear").addEventListener("click", () => { files.forEach((f) => f.bitmap && f.bitmap.close && f.bitmap.close()); files = []; render(); });

    grid.addEventListener("click", (e) => {
      const dl = e.target.closest("[data-dl]"), rm = e.target.closest("[data-rm]");
      if (dl) { const f = files.find((x) => x.id === +dl.dataset.dl); if (f && f.outBlob) { downloadBlob(f.outBlob, f.outName); } return; }
      if (rm) { const i = files.findIndex((x) => x.id === +rm.dataset.rm); if (i >= 0) { files[i].bitmap && files[i].bitmap.close && files[i].bitmap.close(); files.splice(i, 1); render(); } }
    });

    syncRows(); render();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
