# 투자 원장 (Investment Journal)

Claude와 나눈 투자 판단을 다시 꺼내 보기 위한 개인 기록 사이트.
빌드 과정이 필요 없는 정적 사이트라, GitHub Pages에 파일만 올리면 바로 열립니다.

---

## GitHub Pages에 올리기 (약 3분)

1. GitHub에 새 저장소(repository)를 만든다.
   - 저장소 이름을 `내아이디.github.io` 로 하면 주소가 `https://내아이디.github.io` 가 된다.
   - 아무 이름(`journal` 등)으로 만들면 주소는 `https://내아이디.github.io/journal/` 가 된다. 둘 다 동작한다.
2. 이 폴더 안의 파일 전부(`index.html`, `entry.html`, `assets/`, `posts/`)를 저장소에 올린다.
   - 웹에서 드래그&드롭으로 업로드해도 되고, git으로 push해도 된다.
3. 저장소 → **Settings → Pages** → Source를 `main` 브랜치 `/ (root)` 로 지정하고 저장.
   - 1~2분 뒤 위 주소로 접속하면 사이트가 뜬다.

> ⚠️ **공개 범위:** 무료 GitHub Pages는 링크를 아는 사람이면 열람 가능합니다(검색 노출은 `noindex`로 막아둠). 계좌·총자산·개인정보 등은 올리지 않는 걸 권합니다.

---

## 새 글 추가하기

글 하나 = 파일 두 곳만 건드리면 끝. 이 구조가 자동화(예: Claude가 대신 커밋)하기에도 편합니다.

1. `posts/` 폴더에 마크다운 파일을 하나 만든다. 예: `posts/2026-07-nvda-review.md`
2. `posts/index.json` 배열 맨 위에 한 줄 추가한다:

```json
{
  "id": "2026-07-nvda-review",
  "title": "NVDA 실적 후 메모",
  "date": "2026-07",
  "tag": "리서치",
  "tickers": ["NVDA"],
  "summary": "한 줄 요약."
}
```

- `id` 는 `.md` 파일명(확장자 제외)과 **정확히 같아야** 한다.
- `tag` 는 색으로 구분된다: `리밸런싱` `관점정리` `관망` `리서치` `회고`.
- `tickers` 는 원하는 만큼. 없으면 `[]`.

저장하고 다시 push하면 홈 원장에 자동으로 나타납니다.

홈의 검색창(제목·요약·티커), 태그 필터, Tracking 티커 필터는 전부 `index.json`에서
자동 생성·동작하므로 따로 손댈 것이 없습니다. 필터 상태는 URL에 남아
(`?tk=PLTR&tag=리서치` 식) 링크로 공유할 수 있습니다.

---

## 로컬에서 미리 보기

`fetch`로 파일을 읽기 때문에 `index.html`을 그냥 더블클릭하면 글이 안 뜬다.
폴더에서 아래를 실행한 뒤 브라우저로 `http://localhost:8000` 접속:

```bash
python3 -m http.server 8000
```

---

## 구조

```
index.html        홈 — 원장 인덱스
entry.html        글 한 편 렌더링
assets/style.css  디자인
assets/app.js     마크다운 → 화면
posts/
  index.json      글 목록(메타데이터)
  *.md            글 본문
```
