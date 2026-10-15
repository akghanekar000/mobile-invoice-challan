const $ = (sel, el = document) => el.querySelector(sel);
const app = $("#app");

const esc = (s) =>
  String(s ?? "").replace(/[&<>\"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const money = (n) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d) =>
  d ? new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "";
const label = (kind) => (kind === "challan" ? "Delivery Challan" : "Tax Invoice");
const shortLabel = (kind) => (kind === "challan" ? "challan" : "invoice");

async function api(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

let toastTimer;
function toast(msg, isError = false) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.toggle("error", isError);
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 3200);
}

const micIcon = (size = 26) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8"/></svg>`;

/* ---------------- Home / list ---------------- */

let listFilter = "all";

async function renderHome() {
  app.innerHTML = `
    <h1>Namaste 👋</h1>
    <p class="sub">Make an invoice or challan by typing — or just say it.</p>
    <button class="voice-hero" id="hero-voice">
      <span class="mic-dot">${micIcon(28)}</span>
      <span><strong>Speak a new invoice</strong><span>Say the customer, items, quantities and rates</span></span>
    </button>
    <div class="quick">
      <a class="btn" href="#/new/invoice">+ New invoice</a>
      <a class="btn" href="#/new/challan">+ New challan</a>
    </div>
    <div class="tabs" role="group" aria-label="Filter">
      ${["all", "invoice", "challan"]
        .map((k) => `<button class="tab" data-f="${k}" aria-pressed="${listFilter === k}">${k === "all" ? "All" : k === "invoice" ? "Invoices" : "Challans"}</button>`)
        .join("")}
    </div>
    <input class="search" type="search" placeholder="Search customer or number…" aria-label="Search" />
    <ul class="list" id="doc-list"><li class="empty">Loading…</li></ul>`;

  $("#hero-voice").onclick = () => {
    sessionStorage.setItem("autoVoice", "1");
    location.hash = "#/new/invoice";
  };
  app.querySelectorAll(".tab").forEach((b) => (b.onclick = () => { listFilter = b.dataset.f; renderHome(); }));

  let docs = [];
  try {
    docs = await api("/api/documents" + (listFilter === "all" ? "" : `?kind=${listFilter}`));
  } catch (e) {
    $("#doc-list").innerHTML = `<li class="empty">Couldn't load documents. ${esc(e.message)}</li>`;
    return;
  }
  const draw = (q = "") => {
    q = q.toLowerCase();
    const rows = docs.filter((d) => !q || d.customerName.toLowerCase().includes(q) || d.number.toLowerCase().includes(q));
    $("#doc-list").innerHTML = rows.length
      ? rows
          .map(
            (d) => `<li><a class="doc-row ${d.kind}" href="#/view/${d.id}">
              <span class="who">${esc(d.customerName)}</span><span class="amt">${money(d.total)}</span>
              <span class="meta">${esc(d.number)} · ${d.kind === "challan" ? "Challan" : "Invoice"}</span><span class="meta">${fmtDate(d.issueDate)}</span>
            </a></li>`
          )
          .join("")
      : `<li class="empty">${docs.length ? "No matches." : "Nothing here yet. Tap the mic above to make your first one."}</li>`;
  };
  draw();
  $(".search").oninput = (e) => draw(e.target.value);
}

/* ---------------- Editor ---------------- */

let draft = null;

const blankDraft = (kind) => ({
  kind,
  number: "",
  issueDate: today(),
  customerName: "",
  customerPhone: "",
  customerAddress: "",
  items: [{ description: "", quantity: 1, unit: "pcs", rate: 0 }],
  taxRate: 0,
  discount: 0,
  freight: 0,
  other: 0,
  notes: "",
});

function computeTotals(d) {
  const subtotal = d.items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.rate) || 0), 0);
  const discount = Number(d.discount) || 0;
  const freight = Number(d.freight) || 0;
  const other = Number(d.other) || 0;
  const taxableBase = Math.max(0, subtotal - discount + freight + other);
  const tax = d.kind === "invoice" ? taxableBase * (Number(d.taxRate) || 0) / 100 : 0;
  return { subtotal, discount, freight, other, taxableBase, tax, total: taxableBase + tax };
}

async function renderEditor({ kind, id }) {
  if (id) {
    app.innerHTML = `<p class="sub">Loading…</p>`;
    try {
      const doc = await api(`/api/documents/${id}`);
      draft = {
        ...doc,
        taxRate: Number(doc.taxRate) || 0,
        discount: Number(doc.discount) || 0,
        freight: Number(doc.freight) || 0,
        other: Number(doc.other) || 0,
      };
    } catch (e) {
      app.innerHTML = `<div class="empty">${esc(e.message)}</div>`;
      return;
    }
  } else {
    draft = blankDraft(kind);
  }

  app.innerHTML = `
    <h1>${id ? "Edit" : "New"} <span id="kind-word">${shortLabel(draft.kind)}</span></h1>
    <p class="sub">${id ? esc(draft.number) : "Number is assigned automatically when you save."}</p>
    <div class="kind-toggle" role="group" aria-label="Document type">
      <button type="button" data-kind="invoice">Invoice</button>
      <button type="button" data-kind="challan">Delivery challan</button>
    </div>
    <button type="button" class="form-voice" id="form-voice">${micIcon(24)}
      <span><b>Fill by voice</b><br /><small>Speak to add items or change details</small></span></button>
    <form id="doc-form" novalidate>
      <section class="card">
        <h2>Customer</h2>
        <label class="field"><span>Name *</span><input name="customerName" required autocomplete="off" /></label>
        <div class="row2">
          <label class="field"><span>Phone</span><input name="customerPhone" type="tel" inputmode="tel" /></label>
          <label class="field"><span>Date</span><input name="issueDate" type="date" /></label>
        </div>
        <label class="field"><span>Address</span><textarea name="customerAddress" rows="2"></textarea></label>
      </section>
      <section class="card">
        <h2>Items</h2>
        <div id="items"></div>
        <button type="button" class="btn small" id="add-item" style="margin-top:10px">+ Add item</button>

        <div class="row2" style="margin-top:14px">
          <label class="field"><span>Discount ₹</span><input name="discount" type="number" inputmode="decimal" min="0" step="any" /></label>
          <label class="field"><span>Freight ₹</span><input name="freight" type="number" inputmode="decimal" min="0" step="any" /></label>
          <label class="field"><span>Other ₹</span><input name="other" type="number" inputmode="decimal" min="0" step="any" /></label>
        </div>

        <div class="row2" style="margin-top:14px">
          <label class="field" id="tax-field"><span>GST / Tax %</span><input name="taxRate" type="number" inputmode="decimal" min="0" max="100" step="0.01" /></label>
        </div>
        <div class="totals" id="totals"></div>
      </section>
      <section class="card">
        <h2>Notes</h2>
        <label class="field"><span>Terms, vehicle no., remarks</span><textarea name="notes" rows="2"></textarea></label>
      </section>
    </form>
    <div class="bottom-bar">
      ${id ? `<a class="btn ghost" href="#/view/${id}">Cancel</a>` : `<a class="btn ghost" href="#/">Cancel</a>`}
      <button class="btn primary" id="save-btn">Save ${shortLabel(draft.kind)}</button>
    </div>`;

  const form = $("#doc-form");
  const fill = () => {
    for (const k of ["customerName", "customerPhone", "issueDate", "customerAddress", "taxRate", "discount", "freight", "other", "notes"]) {
      form.elements[k].value = draft[k] ?? "";
    }
    app.querySelectorAll(".kind-toggle button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.kind === draft.kind));
    $("#kind-word").textContent = shortLabel(draft.kind);
    $("#save-btn").textContent = `Save ${shortLabel(draft.kind)}`;
    $("#tax-field").hidden = draft.kind !== "invoice";
    drawItems();
  };

  const drawTotals = () => {
    const t = computeTotals(draft);
    $("#totals").innerHTML =
      draft.kind === "invoice"
        ? `<div><span>Subtotal</span><span>${money(t.subtotal)}</span></div>
           <div><span>Discount</span><span>- ${money(t.discount)}</span></div>
           <div><span>Freight</span><span>${money(t.freight)}</span></div>
           <div><span>Other</span><span>${money(t.other)}</span></div>
           <div><span>Tax (${Number(draft.taxRate) || 0}%)</span><span>${money(t.tax)}</span></div>
           <div class="grand"><span>Total</span><span>${money(t.total)}</span></div>`
        : `<div><span>Goods value</span><span>${money(t.total)}</span></div>`;
  };

  const drawItems = () => {
    $("#items").innerHTML = draft.items
      .map(
        (it, i) => `<div class="item" data-i="${i}">
          <input class="desc" data-k="description" placeholder="Item description" value="${esc(it.description)}" aria-label="Item ${i + 1} description" />
          <input data-k="quantity" type="number" inputmode="decimal" min="0" step="any" placeholder="Qty" value="${esc(it.quantity)}" aria-label="Quantity" />
          <input data-k="unit" placeholder="Unit" value="${esc(it.unit)}" aria-label="Unit" />
          <input data-k="rate" type="number" inputmode="decimal" min="0" step="any" placeholder="Rate ₹" value="${esc(it.rate)}" aria-label="Rate" />
          <button type="button" class="icon-btn rm" aria-label="Remove item">✕</button>
          <span class="line-total">${money((Number(it.quantity) || 0) * (Number(it.rate) || 0))}</span>
        </div>`
      )
      .join("");
    drawTotals();
  };

  $("#items").addEventListener("input", (e) => {
    const row = e.target.closest(".item");
    if (!row) return;
    const it = draft.items[row.dataset.i];
    it[e.target.dataset.k] = e.target.value;
    $(".line-total", row).textContent = money((Number(it.quantity) || 0) * (Number(it.rate) || 0));
    drawTotals();
  });
  $("#items").addEventListener("click", (e) => {
    if (!e.target.closest(".rm")) return;
    draft.items.splice(e.target.closest(".item").dataset.i, 1);
    if (!draft.items.length) draft.items.push({ description: "", quantity: 1, unit: "pcs", rate: 0 });
    drawItems();
  });
  $("#add-item").onclick = () => {
    draft.items.push({ description: "", quantity: 1, unit: "pcs", rate: 0 });
    drawItems();
    app.querySelector(".item:last-child .desc").focus();
  };
  form.addEventListener("input", (e) => {
    if (e.target.name) {
      draft[e.target.name] = e.target.value;
      if (["taxRate", "discount", "freight", "other"].includes(e.target.name)) drawTotals();
    }
  });
  app.querySelectorAll(".kind-toggle button").forEach((b) => (b.onclick = () => { draft.kind = b.dataset.kind; fill(); }));

  $("#form-voice").onclick = () => openVoice((result) => {
    applyVoice(result);
    fill();
    form.classList.remove("flash"); void form.offsetWidth; form.classList.add("flash");
  });

  $("#save-btn").onclick = async () => {
    const items = draft.items.filter((i) => String(i.description).trim());
    if (!String(draft.customerName).trim()) return toast("Please add the customer name", true), form.elements.customerName.focus();
    if (!items.length) return toast("Please add at least one item", true);
    const btn = $("#save-btn");
    btn.disabled = true;
    try {
      const body = {
        ...draft,
        items,
        discount: Number(draft.discount) || 0,
        freight: Number(draft.freight) || 0,
        other: Number(draft.other) || 0,
        taxRate: Number(draft.taxRate) || 0,
      };
      const saved = id ? await api(`/api/documents/${id}`, { method: "PUT", body }) : await api("/api/documents", { method: "POST", body });
      toast(`${saved.number} saved`);
      location.hash = `#/view/${saved.id}`;
    } catch (e) {
      toast(e.message, true);
      btn.disabled = false;
    }
  };

  fill();
  if (sessionStorage.getItem("autoVoice")) {
    sessionStorage.removeItem("autoVoice");
    $("#form-voice").click();
  }
}

// Merge what the AI heard into the current draft. Items come back as the full updated list.
function applyVoice(r) {
  if (r.kind) draft.kind = r.kind;
  for (const k of ["customerName", "customerPhone", "customerAddress", "notes"]) if (r[k]) draft[k] = r[k];
  if (typeof r.taxRate === "number") draft.taxRate = r.taxRate;
  if (typeof r.discount === "number") draft.discount = r.discount;
  if (typeof r.freight === "number") draft.freight = r.freight;
  if (typeof r.other === "number") draft.other = r.other;
  if (Array.isArray(r.items) && r.items.length) {
    draft.items = r.items.map((i) => ({ ...i, unit: i.unit || "pcs" }));
  }
}

/* ---------------- Voice capture ---------------- */

const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const sheet = $("#voice-sheet");
const micBtn = $("#mic-btn");
const status = $("#mic-status");
const transcriptEl = $("#transcript");
let recognizer = null;
let listening = false;
let finalText = "";
let onVoiceResult = null;

function setListening(on) {
  listening = on;
  micBtn.classList.toggle("listening", on);
  micBtn.setAttribute("aria-label", on ? "Stop listening" : "Start listening");
  status.textContent = on ? "Listening… tap again when you're done" : Recognition ? "Tap the mic to speak" : "";
}

function startListening() {
  if (!Recognition) return;
  recognizer = new Recognition();
  recognizer.lang = "en-IN";
  recognizer.continuous = true;
  recognizer.interimResults = true;
  finalText = transcriptEl.value ? transcriptEl.value.trim() + " " : "";
  recognizer.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) finalText += r[0].transcript.trim() + " ";
      else interim += r[0].transcript;
    }
    transcriptEl.value = (finalText + interim).trimStart();
  };
  recognizer.onerror = (e) => {
    const msg = {
      "not-allowed": "Microphone permission was denied. Allow mic access, or type below.",
      "no-speech": "Didn't hear anything. Tap the mic and try again.",
      "audio-capture": "No microphone found. You can type instead.",
      network: "Speech service unavailable. You can type instead.",
    }[e.error];
    if (msg) status.textContent = msg;
  };
  recognizer.onend = () => {
    const err = status.textContent;
    setListening(false);
    if (/denied|Didn't|No microphone|unavailable/.test(err)) status.textContent = err;
    transcriptEl.value = transcriptEl.value.trim();
  };
  try {
    recognizer.start();
    setListening(true);
  } catch {
    setListening(false);
  }
}

function stopListening() {
  if (recognizer && listening) recognizer.stop();
}

function openVoice(cb) {
  onVoiceResult = cb;
  transcriptEl.value = "";
  $("[data-kind-label]", sheet).textContent = shortLabel(draft?.kind || "invoice");
  sheet.hidden = false;
  if (!Recognition) {
    micBtn.disabled = true;
    status.textContent = "Voice input isn't supported in this browser (try Chrome, Edge or Safari). You can type the details below instead.";
    transcriptEl.focus();
  } else {
    micBtn.disabled = false;
    startListening();
  }
}

function closeVoice() {
  stopListening();
  sheet.hidden = true;
}

micBtn.onclick = () => (listening ? stopListening() : startListening());
sheet.querySelectorAll("[data-close]").forEach((el) => (el.onclick = closeVoice));
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !sheet.hidden) closeVoice(); });

$("#voice-apply").onclick = async () => {
  stopListening();
  const text = transcriptEl.value.trim();
  if (!text) return toast("Say or type something first", true);
  const btn = $("#voice-apply");
  btn.disabled = true;
  btn.textContent = "Understanding…";
  try {
    const result = await api("/api/voice-parse", { method: "POST", body: { transcript: text, draft } });
    sheet.hidden = true;
    onVoiceResult?.(result);
    const n = result.items?.length || 0;
    toast(n ? `Filled ${n} item${n > 1 ? "s" : ""} from your voice — please check` : "Details updated — please check");
  } catch (e) {
    toast(e.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = "Fill the form";
  }
};

/* ---------------- View / print ---------------- */

let businessCache = null;
async function getBusiness() {
  if (!businessCache) businessCache = await api("/api/business").catch(() => ({}));
  return businessCache;
}

async function renderView(id) {
  app.innerHTML = `<p class="sub">Loading…</p>`;
  let doc, biz;
  try {
    [doc, biz] = await Promise.all([api(`/api/documents/${id}`), getBusiness()]);
  } catch (e) {
    app.innerHTML = `<div class="empty">${esc(e.message)}</div>`;
    return;
  }
  const t = computeTotals({
    ...doc,
    taxRate: Number(doc.taxRate) || 0,
    discount: Number(doc.discount) || 0,
    freight: Number(doc.freight) || 0,
    other: Number(doc.other) || 0,
  });
  const isInv = doc.kind === "invoice";
  app.innerHTML = `
    <div class="actions">
      <a class="btn small" href="#/">← All</a>
      <a class="btn small" href="#/edit/${doc.id}">Edit</a>
      <button class="btn small dark" id="print">Print / PDF</button>
      <button class="btn small" id="share">Share</button>
      <button class="btn small danger" id="del">Delete</button>
    </div>
    ${!biz.name ? `<p class="hint no-print">Tip: <a href="#/settings">add your business details</a> so they appear on every document.</p>` : ""}
    <article class="doc ${doc.kind}">
      <div class="doc-head">
        <div>
          <div class="biz">${esc(biz.name || "Your Business")}</div>
          <div class="small">${esc([biz.address, biz.phone && "Ph: " + biz.phone, biz.gstin && "GSTIN: " + biz.gstin].filter(Boolean).join("\n"))}</div>
        </div>
        <div class="doc-title">
          <div class="kind">${label(doc.kind)}</div>
          <div class="no">${esc(doc.number)}</div>
          <div class="small">${fmtDate(doc.issueDate)}</div>
        </div>
      </div>
      <div class="bill-to">
        <span class="small">${isInv ? "Bill to" : "Deliver to"}</span>
        <b>${esc(doc.customerName)}</b>
        <div class="small" style="white-space:pre-line">${esc([doc.customerAddress, doc.customerPhone && "Ph: " + doc.customerPhone].filter(Boolean).join("\n"))}</div>
      </div>
      <table>
        <thead><tr><th>#</th><th>Item</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Amount</th></tr></thead>
        <tbody>
          ${doc.items.map((i, n) => `<tr><td>${n + 1}</td><td>${esc(i.description)}</td><td class="num">${esc(i.quantity)} ${esc(i.unit)}</td><td class="num">${money(i.rate)}</td><td class="num">${money((Number(i.quantity) || 0) * (Number(i.rate) || 0))}</td></tr>`).join("")}
        </tbody>
      </table>
      <div class="totals">
        ${isInv ? `
          <div><span>Subtotal</span><span>${money(t.subtotal)}</span></div>
          <div><span>Discount</span><span>- ${money(t.discount)}</span></div>
          <div><span>Freight</span><span>${money(t.freight)}</span></div>
          <div><span>Other</span><span>${money(t.other)}</span></div>
          <div><span>Tax (${Number(doc.taxRate) || 0}%)</span><span>${money(t.tax)}</span></div>
        ` : ""}
        <div class="grand"><span>${isInv ? "Total" : "Goods value"}</span><span>${money(doc.total)}</span></div>
      </div>
      ${doc.notes ? `<div class="doc-notes"><b>Notes:</b> ${esc(doc.notes)}</div>` : ""}
      <div class="sign">${isInv ? "<span></span>" : "<div>Receiver's signature</div>"}<div>For ${esc(biz.name || "Your Business")}</div></div>
    </article>`;

  $("#print").onclick = () => window.print();
  $("#share").onclick = async () => {
    const text = `${label(doc.kind)} ${doc.number}\n${biz.name ? "From: " + biz.name + "\n" : ""}To: ${doc.customerName}\nDate: ${fmtDate(doc.issueDate)}\n\n${doc.items.map((i) => `• ${i.description} — ${i.quantity} ${i.unit} @ ${money(i.rate)}`).join("\n")}\n\nTotal: ${money(doc.total)}`;
    if (navigator.share) {
      navigator.share({ title: `${label(doc.kind)} ${doc.number}`, text }).catch(() => {});
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
    }
  };
  $("#del").onclick = async () => {
    if (!confirm(`Delete ${doc.number}? This can't be undone.`)) return;
    try {
      await api(`/api/documents/${doc.id}`, { method: "DELETE" });
      toast(`${doc.number} deleted`);
      location.hash = "#/";
    } catch (e) {
      toast(e.message, true);
    }
  };
}

/* ---------------- Settings ---------------- */

async function renderSettings() {
  app.innerHTML = `<p class="sub">Loading…</p>`;
  const biz = await getBusiness();
  app.innerHTML = `
    <h1>Your business</h1>
    <p class="sub">These details print at the top of every invoice and challan.</p>
    <form class="card" id="biz-form">
      <label class="field"><span>Business name</span><input name="name" value="${esc(biz.name)}" /></label>
      <label class="field"><span>Phone</span><input name="phone" type="tel" value="${esc(biz.phone)}" /></label>
      <label class="field"><span>Address</span><textarea name="address" rows="3">${esc(biz.address)}</textarea></label>
      <label class="field"><span>GSTIN</span><input name="gstin" value="${esc(biz.gstin)}" style="text-transform:uppercase" /></label>
      <button class="btn primary" style="width:100%">Save details</button>
    </form>`;
  $("#biz-form").onsubmit = async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target));
    try {
      businessCache = await api("/api/business", { method: "PUT", body });
      toast("Business details saved");
      location.hash = "#/";
    } catch (err) {
      toast(err.message, true);
    }
  };
}

/* ---------------- Router ---------------- */

function route() {
  if (!sheet.hidden) closeVoice();
  const parts = location.hash.replace(/^#\/?/, "").split("/");
  window.scrollTo(0, 0);
  if (parts[0] === "new") return renderEditor({ kind: parts[1] === "challan" ? "challan" : "invoice" });
  if (parts[0] === "edit" && parts[1]) return renderEditor({ id: parts[1] });
  if (parts[0] === "view" && parts[1]) return renderView(parts[1]);
  if (parts[0] === "settings") return renderSettings();
  draft = null;
  return renderHome();
}

window.addEventListener("hashchange", route);
route();

if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
