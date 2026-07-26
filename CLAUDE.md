# CLAUDE.md

투자 원장 (Investment Journal) — 빌드 없는 정적 사이트. GitHub Pages 배포.

- 라이브: https://rollingsnowball.github.io/investment-journal/
- 저장소: https://github.com/RollingSnowBall/investment-journal (public, Pages = main 브랜치 루트)
- 배포 = `git push` 하면 끝. 1~2분 뒤 반영.

## 콘텐츠 규칙

- 태그는 **6개 고정**: `리밸런싱` `관점정리` `관망` `리서치` `회고` `되새김`. 새 태그를 만들지 말 것.
  - `되새김`은 종목과 무관하게 얻은 것. 특정 판단을 되짚는 `회고`와 구분한다.
    티커 없이(`"tickers": []`) 올려도 된다.
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
assets/app.js     렌더링 + 필터 로직 (필터 상태는 URL 쿼리 ?q=&tag=&tk=)
assets/style.css  디자인 (paper/ink 팔레트 + 한글 Noto Serif/Sans KR)
posts/index.json  글 목록 메타데이터 — 홈의 티커 줄·태그 바는 여기서 자동 생성
posts/*.md        글 본문
```

글 안에서 다른 글을 링크할 때는 `[글 제목](entry.html?id=<posts/index.json의 id>)`.
`되새김` 글에서 그 생각을 실제로 써먹은 판단 글로 거는 데 쓴다.

- 로컬 미리보기: `python -m http.server 8000` (fetch를 쓰므로 파일 더블클릭으로는 안 뜸)
- 홈 노출 차단: `noindex` 메타 적용됨. 검색 노출을 원하면 제거.

## gstack

gstack 스킬 팩 설치됨 (`~/.claude/skills/gstack`). 이 프로젝트에서 유용한 것:
`/design-review` (UI/UX 검증+수정), `/qa` (브라우저 기능 테스트), `/ship`, `/investigate`.
