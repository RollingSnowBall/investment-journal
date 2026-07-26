#!/usr/bin/env python3
"""_drafts/ 의 초고를 검증해서 posts/ 로 넘긴다.

초고는 frontmatter + 본문이고, posts/ 의 결과물은 본문만 남는다.
frontmatter 를 떼는 건 취향이 아니라 필수다 — GitHub Pages 의 Jekyll 은
frontmatter 가 붙은 파일을 HTML 로 변환해 버리는데, 사이트는 fetch 로
원본 마크다운을 받아 marked.js 에 넘기기 때문이다.

    python tools/compile.py            # 컴파일
    python tools/compile.py --dry-run  # 검증만
"""

import json
import os
import re
import shutil
import sys

# 윈도우 콘솔 기본 코드페이지(cp949)로는 한글 메시지에서 죽는다
for _s in (sys.stdout, sys.stderr):
    if hasattr(_s, "reconfigure"):
        try:
            _s.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DRAFTS = os.path.join(ROOT, "_drafts")
DONE = os.path.join(DRAFTS, "published")
POSTS = os.path.join(ROOT, "posts")
INDEX = os.path.join(POSTS, "index.json")

TAGS = ["리밸런싱", "관점정리", "관망", "리서치", "회고", "되새김"]
FIELDS = ["id", "title", "date", "tag", "tickers", "summary"]

ID_RE = re.compile(r"^\d{4}-\d{2}-[a-z0-9][a-z0-9-]*$")
DATE_RE = re.compile(r"^\d{4}-\d{2}$")
# 닫는 ** 앞이 구두점이고 뒤가 글자면 CommonMark 가 볼드로 안 읽는다
BOLD_RE = re.compile(r"\*\*[^*\n]*[\".,)'\]]\*\*(?=[^\s.,!?)\]\"'])")
MONEY_RE = re.compile(r"\d[\d,]*\s*(원|달러|만원|억)")


def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def write(path, text):
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)


def split_front(text):
    """--- ... --- 프론트매터와 본문을 가른다."""
    m = re.match(r"^﻿?---\s*\n(.*?)\n---\s*\n?(.*)$", text, re.S)
    if not m:
        return None, text
    return m.group(1), m.group(2).lstrip("\n")


def parse_front(block):
    """필드가 정해져 있어서 최소 파서로 충분하다. PyYAML 의존을 만들지 않는다."""
    meta = {}
    for line in block.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if ":" not in line:
            continue
        key, val = line.split(":", 1)
        key, val = key.strip(), val.strip()
        if val[:1] in "\"'" and val[-1:] == val[:1] and len(val) > 1:
            val = val[1:-1]
        if key == "tickers":
            inner = val.strip()
            if inner.startswith("[") and inner.endswith("]"):
                inner = inner[1:-1]
            parts = [p.strip().strip("\"'") for p in inner.split(",")]
            meta[key] = [p for p in parts if p]
        else:
            meta[key] = val
    return meta


def dump_index(entries):
    """손으로 쓴 기존 서식을 그대로 유지한다 (tickers 는 한 줄)."""
    j = lambda v: json.dumps(v, ensure_ascii=False)
    out = ["["]
    for i, e in enumerate(entries):
        out.append("  {")
        out.append('    "id": %s,' % j(e["id"]))
        out.append('    "title": %s,' % j(e["title"]))
        out.append('    "date": %s,' % j(e["date"]))
        out.append('    "tag": %s,' % j(e["tag"]))
        out.append('    "tickers": [%s],' % ", ".join(j(t) for t in e["tickers"]))
        out.append('    "summary": %s' % j(e["summary"]))
        out.append("  }" + ("," if i < len(entries) - 1 else ""))
    out.append("]")
    return "\n".join(out) + "\n"


def validate(meta, body, index, taken, name):
    errs, warns = [], []

    for f in FIELDS:
        if f not in meta or (f != "tickers" and not str(meta.get(f, "")).strip()):
            errs.append("frontmatter 에 %s 가 없다" % f)
    if errs:
        return errs, warns

    pid = meta["id"]
    if not ID_RE.match(pid):
        errs.append("id 형식이 틀렸다: %r (YYYY-MM-소문자-하이픈)" % pid)
    if pid in taken:
        errs.append("id 가 이미 있다: %s" % pid)
    if not DATE_RE.match(meta["date"]):
        errs.append("date 형식이 틀렸다: %r (YYYY-MM)" % meta["date"])
    elif ID_RE.match(pid) and not pid.startswith(meta["date"] + "-"):
        errs.append("id 앞자리와 date 가 다르다: %s vs %s" % (pid, meta["date"]))
    if meta["tag"] not in TAGS:
        errs.append("태그가 6개 밖이다: %r (%s)" % (meta["tag"], " ".join(TAGS)))
    for t in meta["tickers"]:
        if not re.match(r"^[A-Z0-9.\-]+$", t):
            errs.append("티커가 대문자가 아니다: %r" % t)

    if not body.strip():
        errs.append("본문이 비어 있다")
    if re.search(r"^#\s", body, re.M):
        errs.append("본문에 H1 이 있다 — 제목은 메타데이터에서 온다")

    for m in BOLD_RE.finditer(body):
        warns.append("볼드가 깨질 자리: %s" % m.group(0)[:44])
    for m in MONEY_RE.finditer(body):
        warns.append("금액처럼 보이는 표현: %s (공개 저장소다)" % m.group(0))
    if not re.search(r"^##\s", body, re.M):
        warns.append("H2 가 하나도 없다")

    return errs, warns


def main():
    dry = "--dry-run" in sys.argv

    if not os.path.isdir(DRAFTS):
        print("_drafts/ 가 없다.")
        return 1

    drafts = sorted(
        os.path.join(DRAFTS, f)
        for f in os.listdir(DRAFTS)
        if f.endswith(".md") and not f.startswith("README")
    )
    if not drafts:
        print("_drafts/ 에 초고가 없다.")
        return 0

    index = json.loads(read(INDEX))
    taken = {e["id"] for e in index}
    taken |= {f[:-3] for f in os.listdir(POSTS) if f.endswith(".md")}

    staged, failed = [], 0

    for path in drafts:
        name = os.path.basename(path)
        front, body = split_front(read(path))
        if front is None:
            print("  [실패] %s — frontmatter 가 없다 (--- 로 감싼 메타)" % name)
            failed += 1
            continue

        meta = parse_front(front)
        errs, warns = validate(meta, body, index, taken, name)

        if errs:
            print("  [실패] %s" % name)
            for e in errs:
                print("         %s" % e)
            failed += 1
            continue

        print("  [통과] %s → posts/%s.md" % (name, meta["id"]))
        for w in warns:
            print("         경고: %s" % w)

        taken.add(meta["id"])
        staged.append((path, meta, body))

    if dry:
        print("\n--dry-run: %d편 통과, %d편 실패. 옮기지 않았다." % (len(staged), failed))
        return 1 if failed else 0

    if not staged:
        print("\n%d편 실패. 통과한 글이 없어 아무것도 옮기지 않았다." % failed)
        return 1

    os.makedirs(DONE, exist_ok=True)
    for path, meta, body in staged:
        write(os.path.join(POSTS, meta["id"] + ".md"), body.rstrip() + "\n")
        entry = {k: meta[k] for k in FIELDS}
        # 날짜 내림차순을 지키되, 같은 달이면 새 글이 위로 간다
        pos = next((i for i, e in enumerate(index) if e["date"] <= entry["date"]), len(index))
        index.insert(pos, entry)
        shutil.move(path, os.path.join(DONE, os.path.basename(path)))

    write(INDEX, dump_index(index))
    print("\n%d편 컴파일했다. 초고는 _drafts/published/ 로 옮겼다." % len(staged))
    if failed:
        print("%d편은 실패해서 _drafts/ 에 그대로 남아 있다." % failed)
    print("확인: python -m http.server 8848 → http://localhost:8848")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
