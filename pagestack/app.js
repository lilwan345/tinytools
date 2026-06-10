/* ============================================================
   PageStack — one visual workspace for PDF pages.
   Merge / split / reorder / rotate / delete — 100% client-side.
   pdf.js renders thumbnails; pdf-lib does the byte surgery.
   ============================================================ */
(function () {
  "use strict";
  const { $, toast, downloadBlob, ICON } = window.VT;

  pdfjsLib.GlobalWorkerOptions.workerSrc = "vendor/pdf.worker.min.js";

  const I = {
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5l-8-3Z"/></svg>',
    rotate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"/><path d="M21 8a9 9 0 1 0 2.4 8"/></svg>',
    left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>',
    right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/></svg>',
  };

  /* ---------- State ---------- */
  let pages = [];                 // ordered: {id, kind:'pdf'|'image', srcId, pageIndex, rot, selected, thumb, mime}
  const sources = new Map();      // srcId -> {buf, name, lib?}
  let uid = 0, srcUid = 0;

  const grid = $("#pageGrid"), dropwrap = $("#dropwrap"), gridScroll = $("#gridScroll");

  /* ---------- Intake ---------- */
  const THUMB_W = 360; // render width (px) for crisp thumbs

  async function addFiles(list) {
    const files = Array.from(list || []);
    let added = 0, locked = 0, failed = 0;
    for (const file of files) {
      const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
      const isImg = file.type === "image/jpeg" || file.type === "image/png";
      if (!isPdf && !isImg) continue;
      try {
        const buf = await file.arrayBuffer();
        const srcId = ++srcUid;
        if (isPdf) {
          // pdf.js neuters the buffer it receives — give it a copy, keep the original for pdf-lib
          const jsDoc = await pdfjsLib.getDocument({ data: buf.slice(0) }).promise;
          sources.set(srcId, { buf, name: file.name });
          for (let i = 1; i <= jsDoc.numPages; i++) {
            const pg = await jsDoc.getPage(i);
            const vp1 = pg.getViewport({ scale: 1 });
            const vp = pg.getViewport({ scale: THUMB_W / vp1.width });
            const c = document.createElement("canvas");
            c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
            await pg.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise;
            pages.push({ id: ++uid, kind: "pdf", srcId, pageIndex: i - 1, rot: 0, selected: false, thumb: c.toDataURL("image/jpeg", 0.82), src: file.name, pno: i });
            added++;
          }
          jsDoc.destroy();
        } else {
          sources.set(srcId, { buf, name: file.name });
          const url = URL.createObjectURL(file);
          pages.push({ id: ++uid, kind: "image", srcId, pageIndex: 0, rot: 0, selected: false, thumb: url, src: file.name, pno: 1, mime: file.type });
          added++;
        }
      } catch (e) {
        if (e && (e.name === "PasswordException" || /password/i.test(String(e.message || "")))) { locked++; }
        else { failed++; }
      }
    }
    if (locked) toast(locked + " password-protected PDF" + (locked > 1 ? "s" : "") + " skipped — encrypted files aren't supported yet", "err", 3400);
    if (failed) toast(failed + " file" + (failed > 1 ? "s" : "") + " couldn't be read", "err");
    if (added) { render(); toast("Added " + added + " page" + (added > 1 ? "s" : "")); }
  }

  /* ---------- Assembly (pdf-lib) ---------- */
  async function libFor(srcId) {
    const s = sources.get(srcId);
    if (!s.lib) s.lib = await PDFLib.PDFDocument.load(s.buf, { ignoreEncryption: true });
    return s.lib;
  }
  async function buildPdf(entries) {
    const out = await PDFLib.PDFDocument.create();
    for (const e of entries) {
      if (e.kind === "pdf") {
        const srcDoc = await libFor(e.srcId);
        const [p] = await out.copyPages(srcDoc, [e.pageIndex]);
        if (e.rot) {
          const base = (p.getRotation() && p.getRotation().angle) || 0;
          p.setRotation(PDFLib.degrees((((base + e.rot) % 360) + 360) % 360));
        }
        out.addPage(p);
      } else {
        const s = sources.get(e.srcId);
        const img = e.mime === "image/png" ? await out.embedPng(s.buf) : await out.embedJpg(s.buf);
        const pg = out.addPage([img.width, img.height]);
        pg.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
        if (e.rot) pg.setRotation(PDFLib.degrees(((e.rot % 360) + 360) % 360));
      }
    }
    return new Blob([await out.save()], { type: "application/pdf" });
  }

  /* ---------- Render ---------- */
  function render() {
    const has = pages.length > 0;
    dropwrap.hidden = has; grid.hidden = !has;
    $("#btnClear").hidden = !has; $("#btnSplit").hidden = !has; $("#btnExtract").hidden = !has; $("#btnDownload").hidden = !has;
    const nSel = pages.filter((p) => p.selected).length;
    $("#counts").textContent = has ? pages.length + " page" + (pages.length > 1 ? "s" : "") + " · " + sources.size + " file" + (sources.size > 1 ? "s" : "") : "";
    $("#btnExtract").innerHTML = ICON.download + "Extract selected (" + nSel + ")";
    $("#btnExtract").disabled = nSel === 0;
    $("#btnSplit").innerHTML = ICON.copy + "Split into files";
    $("#btnDownload").innerHTML = ICON.download + "Download PDF";
    if (!has) return;

    const st = gridScroll.scrollTop;
    grid.innerHTML = pages.map((p, i) =>
      '<div class="pg' + (p.selected ? " sel" : "") + (p.rot % 180 !== 0 ? " rot-odd" : "") + '" data-i="' + i + '" tabindex="0" role="button" aria-pressed="' + p.selected + '" title="' + esc(p.src) + " · page " + p.pno + '">' +
      '<span class="ck">' + I.check + "</span>" +
      '<div class="pg-actions">' +
      '<button data-act="left" title="Move earlier"' + (i === 0 ? " disabled" : "") + ">" + I.left + "</button>" +
      '<button data-act="right" title="Move later"' + (i === pages.length - 1 ? " disabled" : "") + ">" + I.right + "</button>" +
      '<button data-act="rot" title="Rotate 90°">' + I.rotate + "</button>" +
      '<button data-act="del" class="del" title="Delete page">' + I.x + "</button>" +
      "</div>" +
      '<div class="pg-thumb"><img src="' + p.thumb + '" alt="page ' + (i + 1) + '" style="transform:rotate(' + p.rot + 'deg)" /></div>' +
      '<div class="pg-foot"><span class="num">' + (i + 1) + '</span><span class="src">' + esc(p.src) + "</span></div>" +
      "</div>"
    ).join("");
    gridScroll.scrollTop = st;
  }
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  /* ---------- Page ops ---------- */
  function move(i, delta) {
    const j = i + delta; if (j < 0 || j >= pages.length) return;
    const [e] = pages.splice(i, 1); pages.splice(j, 0, e); render();
  }
  function moveTo(from, to) {
    if (to > from) to--;
    if (to === from) { render(); return; }
    const [e] = pages.splice(from, 1); pages.splice(Math.max(0, Math.min(to, pages.length)), 0, e); render();
  }

  /* ---------- Pointer drag (custom, Playwright/touch friendly) ---------- */
  let drag = null; // {from, ghost, started}
  function onPointerDown(e) {
    const card = e.target.closest(".pg"); if (!card || e.target.closest("button")) return;
    if (e.button !== undefined && e.button !== 0) return;
    drag = { from: +card.dataset.i, x0: e.clientX, y0: e.clientY, started: false, ghost: null };
    card.setPointerCapture && card.setPointerCapture(e.pointerId);
  }
  function dropIndexAt(x, y) {
    const cards = Array.from(grid.querySelectorAll(".pg"));
    for (let k = 0; k < cards.length; k++) {
      const r = cards[k].getBoundingClientRect();
      if (y < r.top - 7) return k;                                    // above this row entirely
      if (y <= r.bottom + 7 && x < r.left + r.width / 2) return k;    // same row, left half
    }
    return cards.length;
  }
  function onPointerMove(e) {
    if (!drag) return;
    if (!drag.started) {
      if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 6) return;
      drag.started = true;
      const src = grid.querySelector('.pg[data-i="' + drag.from + '"]');
      if (src) src.classList.add("dragging");
      const g = document.createElement("div"); g.className = "drag-ghost";
      g.innerHTML = '<img src="' + pages[drag.from].thumb + '" alt="" />';
      document.body.appendChild(g); drag.ghost = g;
    }
    drag.ghost.style.left = e.clientX + "px"; drag.ghost.style.top = e.clientY + "px";
    const idx = dropIndexAt(e.clientX, e.clientY);
    grid.querySelectorAll(".pg").forEach((c, k) => c.style.boxShadow = "");
    const cards = grid.querySelectorAll(".pg");
    const mark = (el, side) => { if (el) el.style.boxShadow = "inset " + (side === "l" ? "3px" : "-3px") + " 0 0 var(--accent)"; };
    if (idx < cards.length) mark(cards[idx], "l"); else mark(cards[cards.length - 1], "r");
    drag.to = idx;
  }
  function onPointerUp(e) {
    if (!drag) return;
    const d = drag; drag = null;
    grid.querySelectorAll(".pg").forEach((c) => { c.classList.remove("dragging"); c.style.boxShadow = ""; });
    if (d.ghost) d.ghost.remove();
    if (d.started) { moveTo(d.from, d.to == null ? pages.length : d.to); }
    else { const p = pages[d.from]; if (p) { p.selected = !p.selected; render(); } }
  }

  /* ---------- Export actions ---------- */
  async function withBusy(btn, fn, err) {
    btn.disabled = true; btn.style.opacity = ".7";
    try { await fn(); } catch (e) { toast(err || "Something went wrong", "err"); }
    finally { btn.disabled = false; btn.style.opacity = ""; render(); }
  }
  async function downloadAll() {
    const blob = await buildPdf(pages);
    downloadBlob(blob, "pagestack.pdf");
    toast("PDF downloaded — " + pages.length + " page" + (pages.length > 1 ? "s" : ""));
  }
  async function extractSelected() {
    const sel = pages.filter((p) => p.selected); if (!sel.length) return;
    const blob = await buildPdf(sel);
    downloadBlob(blob, "pagestack-extract.pdf");
    toast("Extracted " + sel.length + " page" + (sel.length > 1 ? "s" : ""));
  }
  async function splitAll() {
    const zip = new JSZip();
    for (let i = 0; i < pages.length; i++) {
      const blob = await buildPdf([pages[i]]);
      zip.file("page-" + String(i + 1).padStart(3, "0") + ".pdf", blob);
    }
    const out = await zip.generateAsync({ type: "blob" });
    downloadBlob(out, "pagestack-split.zip");
    toast("Split into " + pages.length + " files → .zip");
  }

  /* ---------- Wiring ---------- */
  function init() {
    $("#btnAdd").innerHTML = I.plus + "Add PDFs";
    $("#trustline").innerHTML = I.shield + "Files never leave your browser — try it offline";
    $("#dropzone .dz-ic").innerHTML = I.file;

    $("#fileInput").addEventListener("change", (e) => { addFiles(e.target.files); e.target.value = ""; });
    const dz = $("#dropzone");
    dz.addEventListener("click", () => $("#fileInput").click());
    dz.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); $("#fileInput").click(); } });

    ["dragenter", "dragover"].forEach((ev) => document.addEventListener(ev, (e) => { e.preventDefault(); document.body.classList.add("dragover"); }));
    ["dragleave", "drop"].forEach((ev) => document.addEventListener(ev, (e) => { e.preventDefault(); if (ev === "drop" || e.target === document.documentElement) document.body.classList.remove("dragover"); }));
    document.addEventListener("drop", (e) => { if (e.dataTransfer && e.dataTransfer.files.length) addFiles(e.dataTransfer.files); });

    grid.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-act]"); if (!btn) return;
      const i = +btn.closest(".pg").dataset.i; const p = pages[i]; if (!p) return;
      if (btn.dataset.act === "left") move(i, -1);
      else if (btn.dataset.act === "right") move(i, +1);
      else if (btn.dataset.act === "rot") { p.rot = (p.rot + 90) % 360; render(); }
      else if (btn.dataset.act === "del") { pages.splice(i, 1); render(); }
    });
    grid.addEventListener("keydown", (e) => {
      const card = e.target.closest(".pg"); if (!card) return;
      const i = +card.dataset.i;
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pages[i].selected = !pages[i].selected; render(); }
      else if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); pages.splice(i, 1); render(); }
      else if (e.key === "ArrowLeft" && e.shiftKey) { e.preventDefault(); move(i, -1); }
      else if (e.key === "ArrowRight" && e.shiftKey) { e.preventDefault(); move(i, +1); }
    });
    grid.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);

    $("#btnDownload").addEventListener("click", (e) => withBusy(e.currentTarget, downloadAll, "Could not build the PDF"));
    $("#btnExtract").addEventListener("click", (e) => withBusy(e.currentTarget, extractSelected, "Could not extract pages"));
    $("#btnSplit").addEventListener("click", (e) => withBusy(e.currentTarget, splitAll, "Could not split"));
    $("#btnClear").addEventListener("click", () => { pages = []; sources.clear(); render(); });

    render();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
