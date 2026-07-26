/* Renders the ledger index (index.html) and single entries (entry.html).
   Posts are plain markdown files in /posts, described by /posts/index.json.
   Adding a post = drop a .md file + add one row to index.json. Nothing else. */

const esc = (s) => String(s).replace(/[&<>"]/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* Shorthand emphasis in post markdown:
     !!텍스트!!  -> 빨간 글씨
     ==텍스트==  -> 형광펜
   There is no build step — marked renders the .md in the browser — so these
   are registered as inline extensions instead. Raw HTML still works too.
   Nesting is fine (!!**굵은 빨강**!!) because the inner text is re-tokenized,
   and marked never runs inline rules inside code, so `!!x!!` stays literal. */
function inlineWrap(name, delim, open, close) {
  const re = new RegExp(`^${delim}(?=\\S)([\\s\\S]*?\\S)${delim}`);
  return {
    name,
    level: "inline",
    start: (src) => src.indexOf(delim.replace(/\\/g, "")),
    tokenizer(src) {
      const m = re.exec(src);
      if (m) return { type: name, raw: m[0], tokens: this.lexer.inlineTokens(m[1]) };
    },
    renderer(token) {
      return open + this.parser.parseInline(token.tokens) + close;
    },
  };
}

if (typeof marked !== "undefined") {
  marked.use({
    extensions: [
      inlineWrap("hl", "!!", '<span class="hl">', "</span>"),
      inlineWrap("hlmark", "==", "<mark>", "</mark>"),
    ],
  });
}

/* Labels inside a ledger row — no data-tk, so the delegated filter handler
   ignores them and the click falls through to the row link. */
function tickerChips(tks = []) {
  return tks.map((t) => `<span class="tk">${esc(t)}</span>`).join("");
}

async function loadIndex() {
  const res = await fetch("./posts/index.json", { cache: "no-cache" });
  const data = await res.json();
  // Newest first. Dates are YYYY-MM, so several posts share a month; the
  // comparator has to return 0 for those or the sort reorders them and
  // index.json stops controlling within-month order.
  return data.slice().sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1));
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

/* The entrance animation is for arriving at the ledger, not for re-filtering
   it. Re-running it per keystroke made the whole list flash on every letter. */
let firstPaint = true;

function renderRows(mount, entries, total) {
  if (!entries.length) {
    mount.innerHTML = `<p class="empty">조건에 맞는 기록이 없어요.</p>`;
    return;
  }
  const animate = firstPaint;
  firstPaint = false;
  const head = `<div class="ledger-head"><span>날짜</span><span>기록</span><span>티커 · 태그</span></div>`;
  const rows = entries.map((e, i) => `
    <a class="entry-row${animate ? " fade" : ""}" style="--i:${i}" href="entry.html?id=${encodeURIComponent(e.id)}">
      <span class="date">${esc(e.date)}</span>
      <div class="rec">
        <h2 class="title">${esc(e.title)}</h2>
        ${e.summary ? `<p class="summary">${esc(e.summary)}</p>` : ""}
      </div>
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
      `<button type="button" class="tk${state.tk === t ? " on" : ""}" aria-pressed="${state.tk === t}" data-tk="${esc(t)}">${esc(t)}</button>`
    ).join("");
  }
  const tagbar = document.getElementById("tagbar");
  if (tagbar) {
    tagbar.innerHTML = tags.map((t) =>
      `<button type="button" class="tag${state.tag === t ? " on" : ""}" aria-pressed="${state.tag === t}" data-k="${esc(t)}" data-tag="${esc(t)}">${esc(t)}</button>`
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

  // one delegated handler, buttons only: the tape and the tag bar
  document.addEventListener("click", (ev) => {
    const tkEl = ev.target.closest("button[data-tk]");
    const tagEl = ev.target.closest("button[data-tag]");
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
