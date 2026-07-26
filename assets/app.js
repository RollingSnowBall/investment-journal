/* Renders the ledger index (index.html) and single entries (entry.html).
   Posts are plain markdown files in /posts, described by /posts/index.json.
   Adding a post = drop a .md file + add one row to index.json. Nothing else. */

const esc = (s) => String(s).replace(/[&<>"]/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function tickerChips(tks = []) {
  return tks.map((t) => `<span class="tk" data-tk="${esc(t)}">${esc(t)}</span>`).join("");
}

async function loadIndex() {
  const res = await fetch("./posts/index.json", { cache: "no-cache" });
  const data = await res.json();
  // newest first
  return data.slice().sort((a, b) => (a.date < b.date ? 1 : -1));
}

/* ---- Home: ledger + search/filter ---- */
const state = { q: "", tag: "", tk: "" };

function readStateFromURL() {
  const p = new URLSearchParams(location.search);
  state.q = p.get("q") || "";
  state.tag = p.get("tag") || "";
  state.tk = p.get("tk") || "";
}

function writeStateToURL() {
  const p = new URLSearchParams();
  if (state.q) p.set("q", state.q);
  if (state.tag) p.set("tag", state.tag);
  if (state.tk) p.set("tk", state.tk);
  const qs = p.toString();
  history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
}

function applyFilters(entries) {
  const q = state.q.trim().toLowerCase();
  return entries.filter((e) => {
    if (state.tag && e.tag !== state.tag) return false;
    if (state.tk && !(e.tickers || []).includes(state.tk)) return false;
    if (q) {
      const hay = [e.title, e.summary, e.tag, (e.tickers || []).join(" ")]
        .join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function renderRows(mount, entries, total) {
  if (!entries.length) {
    mount.innerHTML = `<p class="empty">조건에 맞는 기록이 없어요.</p>`;
    return;
  }
  const head = `<div class="ledger-head"><span>날짜</span><span>기록</span><span>티커 · 태그</span></div>`;
  const rows = entries.map((e) => `
    <a class="entry-row fade" href="entry.html?id=${encodeURIComponent(e.id)}">
      <span class="date">${esc(e.date)}</span>
      <span>
        <span class="title">${esc(e.title)}</span>
        ${e.summary ? `<span class="summary">${esc(e.summary)}</span>` : ""}
      </span>
      <span class="meta-right">
        <span class="tag" data-k="${esc(e.tag || "")}">${esc(e.tag || "")}</span>
        <span class="tks">${tickerChips(e.tickers)}</span>
      </span>
    </a>`).join("");
  mount.innerHTML = head + rows;
}

function renderControls(entries) {
  // tickers by frequency, tags in first-seen order
  const tkCount = new Map();
  const tags = [];
  for (const e of entries) {
    for (const t of e.tickers || []) tkCount.set(t, (tkCount.get(t) || 0) + 1);
    if (e.tag && !tags.includes(e.tag)) tags.push(e.tag);
  }
  const tickers = [...tkCount.keys()].sort((a, b) => tkCount.get(b) - tkCount.get(a));

  const tape = document.getElementById("tape");
  if (tape) {
    tape.innerHTML = `<span class="lead">Tracking</span>` + tickers.map((t) =>
      `<button type="button" class="tk${state.tk === t ? " on" : ""}" data-tk="${esc(t)}">${esc(t)}</button>`
    ).join("");
  }
  const tagbar = document.getElementById("tagbar");
  if (tagbar) {
    tagbar.innerHTML = tags.map((t) =>
      `<button type="button" class="tag${state.tag === t ? " on" : ""}" data-k="${esc(t)}" data-tag="${esc(t)}">${esc(t)}</button>`
    ).join("");
  }
}

function renderStatus(shown, total) {
  const box = document.getElementById("fstatus");
  if (!box) return;
  const active = state.q.trim() || state.tag || state.tk;
  box.hidden = !active;
  if (active) {
    const parts = [];
    if (state.tk) parts.push(state.tk);
    if (state.tag) parts.push(state.tag);
    if (state.q.trim()) parts.push(`“${state.q.trim()}”`);
    document.getElementById("fcount").textContent =
      `${parts.join(" · ")} — ${shown}건 / 전체 ${total}건`;
  }
}

async function renderHome(mount) {
  let entries;
  try {
    entries = await loadIndex();
  } catch (e) {
    mount.innerHTML = `<p class="empty">아직 기록을 불러올 수 없어요. posts/index.json을 확인해 주세요.</p>`;
    return;
  }
  if (!entries.length) {
    mount.innerHTML = `<p class="empty">첫 기록을 기다리는 중.</p>`;
    return;
  }

  readStateFromURL();
  const searchEl = document.getElementById("q");
  if (searchEl) searchEl.value = state.q;

  const update = () => {
    writeStateToURL();
    renderControls(entries);
    const shown = applyFilters(entries);
    renderRows(mount, shown, entries.length);
    renderStatus(shown.length, entries.length);
  };

  if (searchEl) {
    searchEl.addEventListener("input", () => { state.q = searchEl.value; update(); });
  }
  const clearEl = document.getElementById("fclear");
  if (clearEl) {
    clearEl.addEventListener("click", () => {
      state.q = ""; state.tag = ""; state.tk = "";
      if (searchEl) searchEl.value = "";
      update();
    });
  }

  // one delegated handler: tape buttons, tag bar buttons, chips inside rows
  document.addEventListener("click", (ev) => {
    const tkEl = ev.target.closest("[data-tk]");
    const tagEl = ev.target.closest("[data-tag], .entry-row .tag");
    if (tkEl) {
      ev.preventDefault();
      const v = tkEl.dataset.tk;
      state.tk = state.tk === v ? "" : v;
      update();
    } else if (tagEl) {
      ev.preventDefault();
      const v = tagEl.dataset.tag || tagEl.dataset.k;
      state.tag = state.tag === v ? "" : v;
      update();
    }
  });

  update();
}

/* ---- Entry ---- */
async function renderEntry(mount) {
  const id = new URLSearchParams(location.search).get("id");
  if (!id) { mount.innerHTML = `<p class="empty">기록을 찾을 수 없어요.</p>`; return; }

  let meta;
  try {
    const idx = await loadIndex();
    meta = idx.find((e) => e.id === id);
  } catch (e) { /* index optional for rendering body */ }

  let md = "";
  try {
    const res = await fetch(`./posts/${encodeURIComponent(id)}.md`, { cache: "no-cache" });
    if (!res.ok) throw new Error("not found");
    md = await res.text();
  } catch (e) {
    mount.innerHTML = `<a class="back" href="index.html">← 원장으로</a>
      <p class="empty">이 기록(${esc(id)})을 불러오지 못했어요.</p>`;
    return;
  }

  document.title = (meta?.title ? meta.title + " · " : "") + "투자 원장";
  const metaLine = meta ? `
    <div class="entry-meta">
      <span>${esc(meta.date)}</span>
      ${meta.tag ? `<span class="dot">·</span><a class="tag" data-k="${esc(meta.tag)}" href="index.html?tag=${encodeURIComponent(meta.tag)}">${esc(meta.tag)}</a>` : ""}
      ${(meta.tickers && meta.tickers.length) ? `<span class="dot">·</span>` + meta.tickers.map((t) =>
        `<a class="tk" href="index.html?tk=${encodeURIComponent(t)}">${esc(t)}</a>`).join("") : ""}
    </div>` : "";

  mount.innerHTML = `
    <a class="back" href="index.html">← 원장으로</a>
    <header class="entry-header">
      <h1>${esc(meta?.title || id)}</h1>
      ${metaLine}
    </header>
    <article>${marked.parse(md)}</article>`;
}

document.addEventListener("DOMContentLoaded", () => {
  const home = document.getElementById("ledger");
  const entry = document.getElementById("entry");
  if (home) renderHome(home);
  if (entry) renderEntry(entry);
});
