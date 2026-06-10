/* ============================================================
   OGForge — make social cards / Open Graph images in-browser.
   100% client-side. No backend, no AI.
   ============================================================ */
(function () {
  "use strict";
  const { $, $$, toast, copyText, downloadBlob, ICON } = window.VT;
  const BLANK = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

  const SIZES = { og: [1200, 630], wide: [1280, 720], square: [1080, 1080], story: [1080, 1920] };
  const TEMPLATES = [
    { id: "centered", name: "Centered", bars: [40, 80, 60] },
    { id: "article", name: "Article", bars: [70, 50, 30] },
    { id: "quote", name: "Quote", bars: [30, 75, 45] },
    { id: "statement", name: "Statement", bars: [85] },
    { id: "announce", name: "Announce", bars: [30, 70, 50] },
  ];
  const TPL = {
    centered:  { eyebrow: 1, title: 1, subtitle: 1, quote: 0, attr: 0, brand: 1 },
    article:   { eyebrow: 1, title: 1, subtitle: 1, quote: 0, attr: 0, brand: 1 },
    quote:     { eyebrow: 0, title: 1, subtitle: 0, quote: 1, attr: 1, brand: 1 },
    statement: { eyebrow: 0, title: 1, subtitle: 0, quote: 0, attr: 0, brand: 1 },
    announce:  { eyebrow: 1, title: 1, subtitle: 1, quote: 0, attr: 0, brand: 0 },
  };
  const BGS = [
    { id: "g1", css: "linear-gradient(135deg,#667eea,#764ba2)" },
    { id: "g2", css: "linear-gradient(135deg,#f093fb,#f5576c)" },
    { id: "g3", css: "linear-gradient(135deg,#4facfe,#00f2fe)" },
    { id: "g4", css: "linear-gradient(135deg,#43e97b,#38f9d7)" },
    { id: "g5", css: "linear-gradient(135deg,#fa709a,#fee140)" },
    { id: "g6", css: "linear-gradient(135deg,#30cfd0,#330867)" },
    { id: "g7", css: "linear-gradient(135deg,#1e3c72,#2a5298)" },
    { id: "g8", css: "linear-gradient(135deg,#0f2027,#203a43,#2c5364)" },
    { id: "m1", css: "radial-gradient(at 18% 20%,#e11d48,transparent 55%),radial-gradient(at 82% 28%,#2563eb,transparent 55%),radial-gradient(at 50% 95%,#7c3aed,transparent 55%),#111827" },
    { id: "m2", css: "radial-gradient(at 15% 20%,#f59e0b,transparent 55%),radial-gradient(at 85% 25%,#ec4899,transparent 55%),#0f172a" },
    { id: "d1", css: "#0f172a" },
    { id: "d2", css: "#111827" },
  ];
  const BG_CSS = Object.fromEntries(BGS.map((b) => [b.id, b.css]));

  const state = {
    tpl: "centered", size: "og",
    title: "", subtitle: "", eyebrow: "", attr: "",
    bg: "m1", gc1: "#e11d48", gc2: "#2563eb", gAngle: 135, solid: "#0f172a", bgImage: null, scrim: 38, texture: "",
    logo: null, avatar: null, name: "", handle: "", site: "",
    accent: "#ffffff", font: "'Inter',sans-serif", titleSize: 66,
  };

  const card = $("#card"), cardScale = $("#cardScale");

  /* ---------- Background ---------- */
  function applyBg() {
    const bgEl = $("#ogBg"); bgEl.style.background = ""; bgEl.style.backgroundImage = "";
    if (state.bg === "image" && state.bgImage) { bgEl.style.backgroundImage = 'url("' + state.bgImage + '")'; bgEl.style.backgroundSize = "cover"; bgEl.style.backgroundPosition = "center"; }
    else if (state.bg === "gradient") bgEl.style.background = "linear-gradient(" + state.gAngle + "deg," + state.gc1 + "," + state.gc2 + ")";
    else if (state.bg === "solid") bgEl.style.background = state.solid;
    else bgEl.style.background = BG_CSS[state.bg] || "#111827";
    $("#ogScrim").style.background = (state.bg === "image" && state.bgImage) ? "rgba(0,0,0," + state.scrim / 100 + ")" : "rgba(0,0,0,0)";
  }

  /* ---------- Render ---------- */
  function fit() {
    const s = $("#stageScroll"), [cw, ch] = SIZES[state.size];
    const sc = Math.min((s.clientWidth - 76) / cw, (s.clientHeight - 76) / ch, 1);
    cardScale.style.setProperty("--scale", sc > 0 ? sc : 0.1);
  }
  function show(el, on) { el.hidden = !on; }
  function render() {
    const t = state.tpl, rule = TPL[t], [cw, ch] = SIZES[state.size];
    card.className = "tpl-" + t;
    card.style.setProperty("--cw", cw + "px"); card.style.setProperty("--ch", ch + "px");
    card.style.setProperty("--card-font", state.font);
    card.style.setProperty("--card-accent", state.accent);
    card.style.setProperty("--title-size", state.titleSize);
    $("#dims").textContent = cw + " × " + ch;

    applyBg();
    $("#ogTexture").className = "og-texture " + (state.texture || "");

    const eyebrowOn = rule.eyebrow && state.eyebrow.trim();
    show($("#ogEyebrow"), eyebrowOn); $("#ogEyebrowT").textContent = state.eyebrow;
    show($("#ogQuote"), rule.quote);
    const title = $("#ogTitle"); title.textContent = state.title; title.style.whiteSpace = "pre-wrap"; show(title, rule.title && state.title.trim());
    show($("#ogSubtitle"), rule.subtitle && state.subtitle.trim()); $("#ogSubtitle").textContent = state.subtitle;
    show($("#ogAttr"), rule.attr && state.attr.trim()); $("#ogAttr").textContent = state.attr;

    // logo (any template)
    const logo = $("#ogLogo"); if (state.logo) { logo.src = state.logo; logo.hidden = false; } else { logo.src = BLANK; logo.hidden = true; }

    // brand row
    const hasBrand = rule.brand && (state.name || state.handle || state.site || state.avatar);
    show($("#ogBrand"), hasBrand);
    const av = $("#ogAvatar"); if (state.avatar) { av.src = state.avatar; av.hidden = false; } else { av.src = BLANK; av.hidden = true; }
    $("#ogName").textContent = state.name; show($("#ogName"), !!state.name);
    $("#ogHandle").textContent = state.handle; show($("#ogHandle"), !!state.handle);
    $("#ogSite").textContent = state.site; show($("#ogSite"), !!state.site);

    fit();
  }

  /* ---------- Export ---------- */
  async function exportPng() {
    const [cw, ch] = SIZES[state.size];
    return await htmlToImage.toBlob(card, { pixelRatio: 2, cacheBust: true, width: cw, height: ch, filter: (n) => !(n.tagName === "IMG" && !n.getAttribute("src")) });
  }
  function metaTags() {
    const [w, h] = SIZES[state.size], url = "https://your-site.com/og-" + state.size + ".png";
    return '<meta property="og:image" content="' + url + '">\n<meta property="og:image:width" content="' + w + '">\n<meta property="og:image:height" content="' + h + '">\n<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:image" content="' + url + '">';
  }

  /* ---------- UI helpers ---------- */
  function press(group, attr, val) { $$(group + " button").forEach((b) => b.setAttribute("aria-pressed", String(b.getAttribute(attr) === String(val)))); }
  function readImg(file, cb) { if (!file) return; const r = new FileReader(); r.onload = () => cb(r.result); r.readAsDataURL(file); }

  // Brand kit — remember logo/avatar/handle/colors on this device so repeat use needs no re-typing.
  const KIT_KEYS = ["logo", "avatar", "name", "handle", "site", "accent", "font"];
  function saveKit() { try { const k = {}; KIT_KEYS.forEach((x) => (k[x] = state[x])); localStorage.setItem("ogforge.kit", JSON.stringify(k)); } catch (e) {} }
  function loadKit() { try { const s = localStorage.getItem("ogforge.kit"); if (!s) return false; const k = JSON.parse(s); KIT_KEYS.forEach((x) => { if (k[x] != null) state[x] = k[x]; }); return true; } catch (e) { return false; } }

  function init() {
    $("#btnMeta").innerHTML = ICON.copy + "Copy meta tags";
    $("#btnPng").innerHTML = ICON.download + "Download PNG";
    // template chips
    $("#tplGrid").innerHTML = TEMPLATES.map((t) =>
      '<button class="tpl-chip" data-tpl="' + t.id + '" aria-pressed="' + (state.tpl === t.id) + '" title="' + t.name + '"><span class="mini">' + t.bars.map((w) => '<i style="width:' + w + '%"></i>').join("") + '</span><span class="name">' + t.name + "</span></button>"
    ).join("");
    // bg presets
    $("#bgGrid").innerHTML = BGS.map((b) => '<button class="bg-chip" data-bg="' + b.id + '" aria-pressed="' + (state.bg === b.id) + '" style="background:' + b.css + '"></button>').join("");

    // seed state from default inputs
    state.title = $("#tTitle").value; state.subtitle = $("#tSub").value; state.eyebrow = $("#tEye").value; state.attr = $("#tAttr").value;
    if (loadKit()) { $("#tName").value = state.name || ""; $("#tHandle").value = state.handle || ""; $("#tSite").value = state.site || ""; $("#accent").value = state.accent; $("#fontSel").value = state.font; }
    render();

    /* template + size */
    $("#tplGrid").addEventListener("click", (e) => { const b = e.target.closest("[data-tpl]"); if (!b) return; state.tpl = b.dataset.tpl; press("#tplGrid", "data-tpl", state.tpl); $("#attrRow").hidden = state.tpl !== "quote"; render(); });
    $("#sizeSeg").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; state.size = b.dataset.v; press("#sizeSeg", "data-v", state.size); render(); });

    /* content */
    $("#tTitle").addEventListener("input", (e) => { state.title = e.target.value; render(); });
    $("#tSub").addEventListener("input", (e) => { state.subtitle = e.target.value; render(); });
    $("#tEye").addEventListener("input", (e) => { state.eyebrow = e.target.value; render(); });
    $("#tAttr").addEventListener("input", (e) => { state.attr = e.target.value; render(); });

    /* background */
    $("#bgGrid").addEventListener("click", (e) => { const b = e.target.closest("[data-bg]"); if (!b) return; state.bg = b.dataset.bg; press("#bgGrid", "data-bg", state.bg); render(); });
    $("#gc1").addEventListener("input", (e) => { state.gc1 = e.target.value; state.bg = "gradient"; press("#bgGrid", "data-bg", ""); render(); });
    $("#gc2").addEventListener("input", (e) => { state.gc2 = e.target.value; state.bg = "gradient"; press("#bgGrid", "data-bg", ""); render(); });
    $("#gAngle").addEventListener("input", (e) => { state.gAngle = +e.target.value; $("#gAngleOut").textContent = e.target.value; if (state.bg !== "gradient") { state.bg = "gradient"; press("#bgGrid", "data-bg", ""); } render(); });
    $("#solidColor").addEventListener("input", (e) => { state.solid = e.target.value; state.bg = "solid"; press("#bgGrid", "data-bg", ""); render(); });
    $("#bgImg").addEventListener("change", (e) => { readImg(e.target.files[0], (d) => { state.bgImage = d; state.bg = "image"; press("#bgGrid", "data-bg", ""); render(); }); });
    $("#bgImgClear").addEventListener("click", () => { state.bgImage = null; state.bg = "m1"; press("#bgGrid", "data-bg", "m1"); render(); });
    $("#scrim").addEventListener("input", (e) => { state.scrim = +e.target.value; $("#scrimOut").textContent = e.target.value; render(); });
    $("#texSeg").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; state.texture = b.dataset.v; press("#texSeg", "data-v", state.texture); render(); });

    /* branding (auto-remembered as a brand kit on this device) */
    $("#logoImg").addEventListener("change", (e) => { readImg(e.target.files[0], (d) => { state.logo = d; render(); saveKit(); }); });
    $("#logoClear").addEventListener("click", () => { state.logo = null; render(); saveKit(); });
    $("#avatarImg").addEventListener("change", (e) => { readImg(e.target.files[0], (d) => { state.avatar = d; render(); saveKit(); }); });
    $("#avatarClear").addEventListener("click", () => { state.avatar = null; render(); saveKit(); });
    $("#tName").addEventListener("input", (e) => { state.name = e.target.value; render(); saveKit(); });
    $("#tHandle").addEventListener("input", (e) => { state.handle = e.target.value; render(); saveKit(); });
    $("#tSite").addEventListener("input", (e) => { state.site = e.target.value; render(); saveKit(); });
    $("#kitClear").addEventListener("click", () => { try { localStorage.removeItem("ogforge.kit"); } catch (e) {} state.logo = null; state.avatar = null; state.name = ""; state.handle = ""; state.site = ""; $("#tName").value = ""; $("#tHandle").value = ""; $("#tSite").value = ""; render(); toast("Brand kit forgotten"); });

    /* style */
    $("#accent").addEventListener("input", (e) => { state.accent = e.target.value; render(); saveKit(); });
    $("#fontSel").addEventListener("change", (e) => { state.font = e.target.value; render(); saveKit(); });
    $("#titleSize").addEventListener("input", (e) => { state.titleSize = +e.target.value; $("#titleSizeOut").textContent = e.target.value; render(); });

    /* actions */
    $("#btnMeta").addEventListener("click", async () => { (await copyText(metaTags())) ? toast("Meta tags copied — host your image, replace the URL") : toast("Copy failed", "err"); });
    $("#btnPng").addEventListener("click", async (e) => {
      const b = e.currentTarget; b.disabled = true; b.style.opacity = ".7";
      try { const blob = await exportPng(); if (!blob) throw 0; downloadBlob(blob, "ogforge-" + state.size + ".png"); toast("PNG downloaded"); }
      catch (x) { toast("Export failed", "err"); } finally { b.disabled = false; b.style.opacity = ""; }
    });

    window.addEventListener("resize", fit);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
