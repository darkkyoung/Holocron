# Prologue — 데이터베이스 과제가 HOLOCRON이 되기까지

> 범위: 2026-06 ~ 2026-09-13  
> 성격: 프로젝트 기원 / 과제 → 해커톤 → V2 rewrite  
> 이 문서는 현재 HOLOCRON의 직접적인 코드 history만이 아니라, 그 이전 프로젝트들이 왜 다음 단계로 이어졌는지를 기록한다.

HOLOCRON은 처음부터 “서비스를 만들자”는 계획으로 시작한 프로젝트가 아니다.

출발은 아주대학교 **데이터베이스 과제**였다. 그 과제가 오픈소스SW 입문 기말 프로젝트로 다시 쓰이면서 기능이 늘었고, 이후 **아주빌드 AI 해커톤**을 준비하면서 “실제로 내가 쓰고 싶은 Star Wars 정보 서비스” 쪽으로 빠르게 커졌다.

그리고 기능이 많아질수록 첫 번째 코드베이스는 점점 수정하기 어려워졌다. 9월에는 “계속 기능을 덧붙이는 것이 정말 빠른 개발인가?”라는 질문에 도달했고, Astra를 이용해 기존 기능을 보존하면서 구조는 새로 만드는 **HOLOCRON V2**로 넘어갔다.

이 전환이 현재 HOLOCRON의 진짜 시작점이다.

---

## Repository lineage

| 단계 | 저장소 | 역할 |
| --- | --- | --- |
| Database Assignment / StarTrack | [darkkyoung/starwarsArchive](https://github.com/darkkyoung/starwarsArchive) | PostgreSQL 기반 Star Wars DB 웹서비스 프로토타입 |
| Open Source SW Assignment | [darkkyoung/HolocronArchive_FOSS](https://github.com/darkkyoung/HolocronArchive_FOSS) | JSON + Flask + Ollama로 실행 편의성과 AI 기능을 확장한 과제형 버전 |
| V1 / Hackathon expansion | [darkkyoung/HolocronArchive_Latest](https://github.com/darkkyoung/HolocronArchive_Latest) | 기사 자동 수집, topic grouping, admin 등 서비스형 기능이 빠르게 누적된 1차 HOLOCRON |
| V2 / Current canonical | [darkkyoung/Holocron](https://github.com/darkkyoung/Holocron) | Astra를 활용해 architecture를 다시 설계한 현재 HOLOCRON |

> `HolocronArchive_FOSS` 경로는 V1의 imported Git history에도 `Merge branch 'main' of https://github.com/darkkyoung/HolocronArchive_FOSS`로 남아 있다. 현재 개발의 canonical source는 `darkkyoung/Holocron`이다.

---

# 1. Database Assignment — StarTrack

## “Star Wars로 데이터베이스 과제를 해보자”

2026년 6월, 프로젝트의 시작은 데이터베이스 수업 과제였다.

GitHub `darkkyoung/starwarsArchive`의 history는 6월 3일 `Initial commit`부터 이어지고, 6월 9일에는 `Restore and finalize working StarTrack version`이라는 commit도 남아 있다.

당시 목표는 분명히 **database를 사용하는 웹서비스 prototype**이었다.

기술 구성:

- PostgreSQL
- Flask
- HTML / CSS
- CSV import
- SQL schema
- Works / Articles 관계

초기 README의 핵심은 이미 현재 HOLOCRON과 닮아 있었다.

### News
- 최신 Star Wars 기사
- 제목 / 한국어 제목
- source
- category
- summary
- image
- 원문 URL
- 검색 및 category filter

### Works
- 영화 / 시리즈 / 애니메이션
- 공개일
- 상태
- 설명
- 이미지
- 관련 링크

### Database
- `works`
- `articles`
- `work_articles`
- tags
- bookmarks
- notes

또한 `franchise` column을 두어 Marvel 같은 다른 프랜차이즈로 확장할 수 있게 설계했다.

즉 지금의 HOLOCRON에서 중요한 두 축인 **News Archive**와 **Works Archive**, 그리고 **Works ↔ News 관계**의 원형이 이미 데이터베이스 과제에 있었다.

## 당시의 목적

이 시기에는 Production 운영이나 자동 수집보다:

> “관계형 데이터베이스를 실제 웹 화면에서 사용해보는 것”

이 우선이었다.

`data/articles.csv`, `data/works.csv`를 PostgreSQL에 import하고 Flask가 이를 조회하는 구조였다.

현재처럼 D1을 runtime source of truth로 두는 구조와는 다르지만, “데이터를 먼저 정리하고 UI는 그 데이터를 보여준다”는 사고방식은 여기서 시작됐다.

---

# 2. Open Source SW Assignment — 과제를 재활용하며 첫 번째 변형

데이터베이스 과제가 끝난 뒤 프로젝트를 버리지 않고 **오픈소스SW 입문 과제**로 발전시키기로 했다.

V1 history에는 다음 전환이 그대로 남아 있다.

- `12575633 — Initial FOSS final project`
- `9da18fc0 — Merge ... foss-2026-1-final`
- `1b4bd0c4 — Merge ... HolocronArchive_FOSS`
- `1aef89d2 — Replace PostgreSQL with JSON data loading`
- `0230ef9a — Add JSON data loading and Ollama AI assistant`

## PostgreSQL을 버리고 JSON으로 간 이유

데이터베이스 과제에서는 PostgreSQL이 핵심이었지만, 오픈소스SW 과제에서는 다른 PC에서 쉽게 실행되는 것이 더 중요했다.

PostgreSQL 버전은 실행 전에:

- DB server 설치
- database 생성
- SQL 실행
- 환경 설정

이 필요했다.

과제 제출물로는 이 setup 비용이 부담이었다.

그래서 실행 편의성을 위해:

```text
PostgreSQL
→ JSON files
```

로 바꿨다.

당시에는 좋은 선택이었다. 목표가 “production-grade persistence”가 아니라 **교수자/다른 사용자가 쉽게 실행할 수 있는 과제**였기 때문이다.

이 결정은 나중에 V1의 구조적 한계 중 하나가 되지만, 그 시점의 목적에는 맞는 trade-off였다.

## Ollama AI Assistant

오픈소스SW 과제에서는 Ollama 기반 local AI assistant도 들어갔다.

중요한 점은 처음부터 AI에게 모든 것을 맡기지 않았다는 것이다.

```text
사용자 질문
→ JSON에서 관련 기사/작품 검색
→ 관련 context만 Ollama에 전달
→ 한국어 답변
```

AI가 잘못된 정보를 섞는 문제가 있었기 때문에, code가 먼저 relevant data를 찾고 모델은 그것을 바탕으로 답하게 했다.

이 구조는 훗날 Phase 9C의 **Grounded AI Assistant**와 놀랍도록 비슷하다.

기술은:

```text
JSON + Ollama
```

에서

```text
D1 + deterministic retrieval + hosted model
```

로 바뀌었지만,

> **AI의 기억보다 archive data를 먼저 찾는다**

는 생각은 초기 과제 때부터 있었다.

---

# 3. “과제”에서 “내가 실제로 쓰는 도구”로

오픈소스SW 과제를 진행하며 프로젝트의 목적이 조금씩 달라졌다.

단순히 Star Wars 팬을 위한 페이지뿐 아니라, 사용자가 실제로 운영하던 Star Wars 콘텐츠 제작 workflow에도 도움이 될 수 있다는 생각이 강해졌다.

새 영상 주제를 잡을 때 반복되는 작업은:

- 해외 기사 찾기
- 같은 사건을 다룬 여러 기사 비교
- 어떤 것이 최초 보도인지 확인
- 한국어로 핵심 정리
- 관련 작품 정보 다시 찾기

였다.

그래서 프로젝트는 자연스럽게:

> “기사와 작품을 보여주는 과제”

에서

> **“Star Wars 정보를 수집하고 정리하는 개인적인 조사 도구”**

로 방향이 이동했다.

이 변화가 이후 Hackathon 확장의 동기가 됐다.

---

# 4. AjouBuild AI Hackathon — 기능을 실제 서비스 수준으로 밀어붙이기

2026년 7월 아주빌드 AI 해커톤을 준비하면서 기존 `HolocronArchive_FOSS`를 더 크게 확장하기로 했다.

당시 논의된 우선순위는 다음과 같았다.

1. 웹서비스로 배포
2. 기사 데이터 자동/반자동 수집
3. 같은 사건 기사 묶기
4. card stack UI
5. 더 나은 AI 요약/분류
6. 추천
7. franchise 확장
8. 콘텐츠 제작자 모드

로그인, bookmark, note 같은 사용자 계정 기능은 후순위였다. 먼저 **뉴스를 모으고 정리하는 핵심 경험**을 완성하는 것이 더 중요했다.

## 실제 코드가 따라오기 시작함

V1 Git history에는 7월 중순부터 변화가 보인다.

- `da124989 — Add SWNN article metadata fetcher`
- `1d7e5033 — Add article fetching and topic grouping`
- `efad882a — Add automated topic-based news curation`
- `145ce35b — Add admin mode and incremental news update`

즉 원래 README에서 “향후 RSS/API 자동 수집을 추가할 수 있다”고 썼던 아이디어가 실제 기능이 되기 시작했다.

여기서 현재 HOLOCRON의 핵심 개념이 대부분 처음 나타났다.

### Automated collection
수동 JSON 기사 입력에서 벗어나 source를 직접 읽기 시작했다.

### Topic grouping
같은 사건을 여러 매체가 보도했을 때 “기사 N개”보다 “사건 1개 + 여러 source”로 보여주는 방향.

### Incremental update
매번 전체 데이터를 갈아엎지 않고 새 기사만 추가.

### Admin mode
자동화가 틀렸을 때 사람이 직접 고칠 수 있는 surface.

이 네 가지는 현재 V2에서도 핵심이다.

---

# 5. 1차 HOLOCRON의 성공과 동시에 생긴 문제

Hackathon 개발에서는 기능을 빠르게 만드는 것이 우선이었다.

문제가 보이면 바로 고치고, 새 요구가 생기면 기존 Flask app에 기능을 추가했다.

이 방식 덕분에 짧은 시간에 많은 기능을 만들 수 있었다.

하지만 시간이 지나면서 반대 효과가 생겼다.

- `app.py`가 많은 책임을 가짐
- JSON이 runtime mutable database 역할까지 맡음
- collection / AI / topic / admin / UI logic이 서로 가까워짐
- source별 예외가 central logic에 붙음
- subprocess/local-server 의존
- CSS override와 patch가 누적
- 기능 하나를 고치면 다른 기능에 영향이 갈 가능성이 커짐

사용자 입장에서는 점점 **“slop coding처럼 되고 있다”**는 느낌이 들기 시작했다.

중요한 점은 기능이 안 됐던 것이 아니다.

오히려 기능이 빠르게 늘어났기 때문에 구조 문제가 눈에 띄기 시작했다.

```text
빠른 기능 추가
→ patch 증가
→ coupling 증가
→ 다음 기능의 수정 비용 증가
→ 더 많은 patch 필요
```

이라는 악순환이었다.

---

# 6. 2026년 9월 — “고치는 것보다 다시 만드는 게 빠르다”

9월 초에도 V1에서는 모바일 CSS, SWNN, source reliability 같은 문제를 계속 고쳤다.

하지만 이 시점에는 개별 bug보다 구조 문제가 더 중요해졌다.

“이 파일 하나만 더 수정하면 된다”가 반복되면서, 다음 기능을 넣을 때마다 기존 코드의 여러 위치를 확인해야 했다.

그래서 기준을 바꿨다.

> **기존 프로젝트의 기능과 아이디어는 자산이지만, 기존 architecture까지 보존할 필요는 없다.**

이 판단이 V2 rewrite의 출발점이었다.

---

# 7. Astra와 HOLOCRON V2

2026년 9월 13~14일, Astra를 이용해 기존 `HolocronArchive_Latest`의 기능을 분석하고 새 repository `darkkyoung/Holocron`으로 옮겼다.

목표는 “V1을 깨끗하게 정리”가 아니었다.

**기능 요구를 다시 해석해서 새 architecture로 구현하는 것**이었다.

V2의 주요 변화:

```text
Flask                         → TypeScript / React
JSON mutable runtime data     → Cloudflare D1
ad-hoc SQL/data access        → Drizzle + migrations
local/subprocess assumptions  → hosted Worker runtime
large mixed app.py            → UI / API / Service / Domain / Repository boundaries
AI added as feature           → AI is a bounded processing component
patch-based rules             → persistent AGENTS.md engineering rules
```

그리고 이때 가장 중요한 문서가 생겼다.

`AGENTS.md`

그 Prime Directive는 V1을 겪고 난 뒤의 결론에 가깝다.

> **Move fast without making the next change slower.**

V2의 목표는 “천천히 완벽하게 만들자”가 아니었다.

오히려:

> **AI를 이용해 계속 빠르게 만들되, 다음 기능이 지금보다 더 어려워지지 않게 하자.**

였다.

---

# 8. 왜 이 프롤로그가 필요한가

현재 HOLOCRON만 보면:

- 왜 Article과 Work가 중요한가
- 왜 Story grouping에 집착하는가
- 왜 admin override를 자동화보다 보호하는가
- 왜 AI가 archive evidence를 먼저 읽는가
- 왜 D1을 source of truth로 고집하는가
- 왜 `AGENTS.md`가 이렇게 구체적인가

가 다소 과한 engineering처럼 보일 수 있다.

하지만 이 규칙 대부분은 이론적으로 처음부터 설계한 것이 아니다.

**이전 버전에서 실제로 불편을 겪고 생긴 규칙**이다.

프로젝트의 흐름은 다음과 같다.

```text
Database Assignment
StarTrack / PostgreSQL
        ↓
Open Source SW Assignment
Flask / JSON / Ollama
        ↓
AjouBuild AI Hackathon
자동 수집 / Topic / Admin / 서비스 확장
        ↓
V1 grows fast
기능 증가 + 구조적 부채 증가
        ↓
Astra V2 rewrite
        ↓
Current HOLOCRON
Cloudflare / D1 / modular pipeline / production operations
```

따라서 현재 HOLOCRON은 완전히 별개의 새 프로젝트라기보다, **같은 아이디어가 과제 → 실험 → 해커톤 → 실제 서비스로 네 번 재해석된 결과**라고 보는 편이 정확하다.

다음 기록부터는 현재 canonical V2가 만들어지기 직전의 9월 초 이야기로 이어진다.

→ [2026-09-01 ~ 09-13 — Prototype에서 V2로](2026-09-01_to_09-13-origin.md)
