/* Renders the ledger index (index.html) and single entries (entry.html).
   Posts are plain markdown files in /posts, described by /posts/index.json.
   Adding a post = drop a .md file + add one row to index.json. Nothing else. */

const esc = (s) => String(s).replace(/[&<>"]/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function tickerChips(tks = []) {
  return tks.map((t) => `<span class="tk">${esc(t)}</span>`).join("");
}

async function loadIndex() {
  const res = await fetch("./posts/index.json", { cache: "no-cache" });
  const data = await res.json();
  // newest first
  return data.slice().sort((a, b) => (a.date < b.date ? 1 : -1));
}

/* ---- Home: ledger ---- */
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
      ${meta.tag ? `<span class="dot">·</span><span class="tag" data-k="${esc(meta.tag)}">${esc(meta.tag)}</span>` : ""}
      ${(meta.tickers && meta.tickers.length) ? `<span class="dot">·</span>${tickerChips(meta.tickers)}` : ""}
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
