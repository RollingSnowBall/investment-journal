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

초고를 `_drafts/`에 떨어뜨리고 컴파일한다.

```bash
python tools/compile.py --dry-run   # 검증만
python tools/compile.py             # posts/ 로 넘기고 index.json 갱신
```

`_drafts/`는 컴파일 전 자리다. Jekyll이 `_` 디렉토리를 배포에서 빼기 때문에
저장소에는 남지만 웹에는 뜨지 않는다. 초고는 frontmatter + 본문 형식이고,
컴파일이 검증한 뒤 frontmatter를 떼서 `posts/<id>.md`로 옮기고 `index.json`에
날짜 순서대로 끼워 넣는다. 처리한 초고는 `_drafts/published/`로 치운다.

**`posts/*.md`에는 frontmatter를 넣지 말 것.** Jekyll이 frontmatter 붙은 파일을
HTML로 변환해 버리는데, 사이트는 원본 마크다운을 fetch해서 marked.js에 넘긴다.
컴파일이 이걸 보장하므로 손으로 만들지 말고 `_drafts/`를 거친다.

형식과 검증 항목은 `_drafts/README.md`에 있다.

대화를 글로 옮길 때는 **`investment-journal` 스킬**을 쓴다. 원본은
`skills/investment-journal/SKILL.md`, 설치 위치는 `~/.claude/skills/investment-journal/`.
투자 대화를 나눈 그 창에서 발동하면 본문과 index.json 한 줄을 같이 뽑아준다.
스킬을 고치면 저장소 쪽 원본을 고치고 설치 위치로 복사한다.

## 구조

```
index.html        홈 — 원장 인덱스 + 검색/태그/티커 필터
entry.html        글 한 편 렌더링 (marked.js CDN)
assets/app.js     렌더링 + 필터 로직 + !!빨강!! ==형광펜== 확장
assets/style.css  디자인 (paper/ink 팔레트 + 한글 Noto Serif/Sans KR)
posts/index.json  글 목록 메타데이터 — 홈의 티커 줄·태그 바는 여기서 자동 생성
posts/*.md        글 본문 (컴파일 결과, frontmatter 없음)
_drafts/          컴파일 전 초고 — 배포 안 됨
tools/compile.py  _drafts/ → posts/ 검증·이동
skills/           investment-journal 스킬 원본
```

글 안에서 다른 글을 링크할 때는 `[글 제목](entry.html?id=<posts/index.json의 id>)`.
`되새김` 글에서 그 생각을 실제로 써먹은 판단 글로 거는 데 쓴다.

## 본문 강조

| 쓰는 법 | 결과 |
|---|---|
| `**텍스트**` | 볼드 — 판단·기준·결정에 |
| `!!텍스트!!` | 빨간 글씨(brick) — 제일 센 강조 |
| `==텍스트==` | 형광펜(연노랑) — 나중에 다시 찾아볼 곳 |

`!!`와 `==`는 `assets/app.js`의 marked 인라인 확장이 변환한다. 빌드 단계가 없어서
브라우저가 렌더링할 때 처리된다. 겹쳐 쓸 수 있다 — `!!**굵은 빨강**!!`.
코드 블록과 인라인 코드 안에서는 문자 그대로 남는다.

`<span class="hl">` / `<mark>` 처럼 HTML로 직접 써도 그대로 작동한다.

강조는 아껴 쓴다. 한 글에 빨강과 형광펜을 합쳐 한두 번이면 충분하고, 다 강조하면
아무것도 강조되지 않는다. 볼드가 기본이고 나머지 둘은 예외적으로 쓴다.

- 로컬 미리보기: `python -m http.server 8000` (fetch를 쓰므로 파일 더블클릭으로는 안 뜸)
- 홈 노출 차단: `noindex` 메타 적용됨. 검색 노출을 원하면 제거.

## gstack

gstack 스킬 팩 설치됨 (`~/.claude/skills/gstack`). 이 프로젝트에서 유용한 것:
`/design-review` (UI/UX 검증+수정), `/qa` (브라우저 기능 테스트), `/ship`, `/investigate`.
