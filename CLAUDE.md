# CLAUDE.md

투자 원장 (Investment Journal) — 빌드 없는 정적 사이트. GitHub Pages 배포.

- 라이브: https://rollingsnowball.github.io/investment-journal/
- 저장소: https://github.com/RollingSnowBall/investment-journal (public, Pages = main 브랜치 루트)
- 배포 = `git push` 하면 끝. 1~2분 뒤 반영.

## 콘텐츠 규칙

- 태그는 **5개 고정**: `리밸런싱` `관점정리` `관망` `리서치` `회고`. 새 태그를 만들지 말 것.
- AI와의 대화는 원문 그대로 올리지 않는다 — 리포트/문서로 정리해서 위 태그 중 하나로 포스팅.
- 계좌 금액·총자산·개인정보는 올리지 않는다 (public 저장소).

## 글 추가 방법

1. `posts/<id>.md` 생성 (id 예: `2026-07-nvda-review`)
2. `posts/index.json` 맨 위에 메타 한 줄 추가 — `id`는 파일명과 정확히 일치, `date`는 `YYYY-MM`, `tickers`는 배열
3. push

대화를 글로 옮길 때는 `POSTING-PROMPT.md`를 쓴다 — 기존 글들의 양식(결론 먼저 → 근거 →
자기 검증 절 → 조건부 다음 행동)을 규칙으로 정리해 둔 프롬프트. 본문과 index.json 한 줄을
같이 뽑아준다.

## 구조

```
index.html        홈 — 원장 인덱스 + 검색/태그/티커 필터
entry.html        글 한 편 렌더링 (marked.js CDN)
principles.html   원칙 페이지 — principles.md 렌더링
principles.md     투자 원칙 (원장과 별개, 계속 고쳐 쓰는 문서)
assets/app.js     렌더링 + 필터 로직 (필터 상태는 URL 쿼리 ?q=&tag=&tk=)
assets/style.css  디자인 (paper/ink 팔레트 + 한글 Noto Serif/Sans KR)
posts/index.json  글 목록 메타데이터 — 홈의 티커 줄·태그 바는 여기서 자동 생성
posts/*.md        글 본문
```

## 원칙 페이지

`principles.md`는 **원장 글이 아니다.** `posts/index.json`에 넣지 말 것.
원장 글은 그때의 판단을 얼려 두는 스냅샷이라 고치지 않고, 원칙은 배우면서 고쳐 쓰는
문서라서 분리했다. 고칠 때는 `principles.md`만 수정하면 된다.

원칙에 적용 사례를 붙이려면 해당 항목 끝에 마크다운 링크 한 줄을 추가한다:
`→ 적용: [글 제목](entry.html?id=<posts/index.json의 id>)`

- 로컬 미리보기: `python -m http.server 8000` (fetch를 쓰므로 파일 더블클릭으로는 안 뜸)
- 홈 노출 차단: `noindex` 메타 적용됨. 검색 노출을 원하면 제거.

## gstack

gstack 스킬 팩 설치됨 (`~/.claude/skills/gstack`). 이 프로젝트에서 유용한 것:
`/design-review` (UI/UX 검증+수정), `/qa` (브라우저 기능 테스트), `/ship`, `/investigate`.
