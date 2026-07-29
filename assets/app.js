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
  const tags = [];                      // first-seen order
  for (const e of entries) {
    if (e.tag && !tags.includes(e.tag)) tags.push(e.tag);
  }
  const tagbar = document.getElementById("tagbar");
  if (tagbar) {
    tagbar.innerHTML = tags.map((t) =>
      `<button type="button" class="tag${state.tag === t ? " on" : ""}" aria-pressed="${state.tag === t}" data-k="${esc(t)}" data-tag="${esc(t)}">${esc(t)}</button>`
    ).join("");
  }
}

/* Ticker filtering used to be a strip of every ticker ever mentioned, sitting
   in the masthead. That grows one chip per ticker with no ceiling, and a name
   written about once looked exactly as important as a core holding. Tickers
   are reached by typing into the search box instead — same keystrokes, and the
   masthead stays one line at any number of posts. Focusing the empty box lists
   the most-written ones so the universe is still browsable without knowing it. */
const SUGGEST_MAX = 7;

function tickerUniverse(entries) {
  const n = new Map();
  for (const e of entries) for (const t of e.tickers || []) n.set(t, (n.get(t) || 0) + 1);
  return [...n.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([t, count]) => ({ t, count }));
}

function matchTickers(universe, q) {
  const s = q.trim().toUpperCase();
  if (!s) return universe.slice(0, SUGGEST_MAX);
  // prefix before substring, so typing "MS" offers MSFT/MSTR ahead of anything
  // that merely contains the letters
  const pre = universe.filter((u) => u.t.startsWith(s));
  const mid = universe.filter((u) => !u.t.startsWith(s) && u.t.includes(s));
  return [...pre, ...mid].slice(0, SUGGEST_MAX);
}

/* Combobox over the search input. onPick receives the chosen ticker. */
function wireTickerSuggest(input, entries, onPick) {
  const list = document.getElementById("tksuggest");
  if (!input || !list) return;
  const universe = tickerUniverse(entries);
  let items = [];
  let active = -1;

  const close = () => {
    list.hidden = true;
    list.innerHTML = "";
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    items = [];
    active = -1;
  };

  const paint = () => {
    list.innerHTML = items.map((u, i) =>
      `<li class="sugg-opt${i === active ? " on" : ""}" role="option" id="sg-${i}" aria-selected="${i === active}" data-pick="${esc(u.t)}"><span class="sg-tk">${esc(u.t)}</span><span class="sg-n">${u.count}건</span></li>`
    ).join("");
    if (active >= 0) input.setAttribute("aria-activedescendant", `sg-${active}`);
    else input.removeAttribute("aria-activedescendant");
  };

  const open = () => {
    items = matchTickers(universe, input.value);
    if (!items.length) return close();
    active = -1;
    paint();
    list.hidden = false;
    input.setAttribute("aria-expanded", "true");
  };

  input.addEventListener("input", open);
  input.addEventListener("focus", open);
  input.addEventListener("blur", close);
  input.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") return close();
    if (list.hidden) {
      if (ev.key === "ArrowDown") open();
      return;
    }
    if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
      ev.preventDefault();
      active = ev.key === "ArrowDown"
        ? (active < 0 ? 0 : (active + 1) % items.length)
        : (active <= 0 ? items.length - 1 : active - 1);
      paint();
    } else if (ev.key === "Enter" && active >= 0) {
      ev.preventDefault();
      const t = items[active].t;
      close();
      onPick(t);
    } else if (ev.key === "Tab") {
      close();
    }
  });
  // mousedown, not click: blur would tear the list down before click landed.
  // preventDefault keeps focus in the input so no blur fires at all.
  list.addEventListener("mousedown", (ev) => {
    const li = ev.target.closest("li[data-pick]");
    if (!li) return;
    ev.preventDefault();
    const t = li.dataset.pick;
    close();
    onPick(t);
  });
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
    // What was typed was a way of reaching the ticker, not a text query — swap
    // the text for the exact filter so the two don't stack and fight.
    wireTickerSuggest(searchEl, entries, (t) => {
      state.tk = t;
      state.q = "";
      searchEl.value = "";
      update();
    });
  }
  const clearEl = document.getElementById("fclear");
  if (clearEl) {
    clearEl.addEventListener("click", () => {
      state.q = ""; state.tag = ""; state.tk = "";
      if (searchEl) searchEl.value = "";
      update();
    });
  }

  // one delegated handler for the tag bar; tickers come from the search box
  document.addEventListener("click", (ev) => {
    const tagEl = ev.target.closest("button[data-tag]");
    if (tagEl) {
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
