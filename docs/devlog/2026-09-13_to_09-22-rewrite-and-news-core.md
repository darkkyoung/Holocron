# 2026-09-13 ~ 2026-09-22 — Rewrite와 News Core

## 문서부터 고정한 이유

V1에서 가장 크게 느낀 문제는 기능을 빨리 붙이는 과정에서 “현재 제품 규칙이 무엇인지”가 코드 속에만 흩어진다는 점이었다. V2에서는 coding agent가 바뀌어도 같은 기준을 유지하도록 문서를 source of truth에 가깝게 만들었다.

09-16:

- `472fd602 — docs: add Holocron product specification`
- `e5d568d7 — docs: add Holocron implementation roadmap`
- `9935daa8 — docs: add legacy migration guide`

세 문서는 각각 다른 문제를 해결했다.

- Product Spec: 사용자가 실제로 보게 될 행동
- Roadmap: 어떤 순서로 구현할지
- Legacy Migration: V1에서 무엇을 가져오고 무엇을 버릴지

이 시점부터 “이전 실행에서 했다고 가정하지 말고 canonical을 다시 확인한다”는 작업 방식도 강해졌다.

## 09-17 — News card interaction과 read-only Story projection

`9c2f43e1 — Implement Phase 1 news card interactions and read-only story projection`

첫 핵심 구현은 Story 자체를 durable table로 새로 만들기보다 현재 Article의 persisted topic을 이용해 public Story를 projection하는 방식이었다.

이 선택은 중요했다.

- 기사 자체가 source of truth
- grouping은 persisted topic으로 표현
- public UI는 Article들을 Story로 projection
- 대표 기사는 가장 이른 확인 publication

즉 “표시를 위해 별도의 두 번째 뉴스 데이터베이스를 만들지 않는다”는 방향이었다.

## 09-19 — 실제 카드처럼 펼쳐지는 UI

`cd08ed98 — Refine physical news-card fan and validate responsive interactions`

중복 보도의 시각적 표현은 단순 source badge보다 실제로 포개진 카드가 더 적절하다고 판단했다.

사용자가 보게 되는 의미는 명확했다.

> “이 사건은 하나지만 여러 매체가 보도했다.”

desktop hover에만 의존하면 mobile에서 깨지므로 responsive interaction도 함께 고려했다. 이후 mobile에서는 compact source strips 방식으로 정착한다.

## 09-20 — 관리자 override를 단순 UI state가 아니라 데이터 규칙으로

`5d6cdb1e — Harden administrator workflow overrides`

자동 topic matching이 이후 collection 때 다시 실행되더라도 관리자가 수정한 결과를 덮어쓰면 안 됐다.

그래서 merge/split/exclude/restore는 “현재 화면 모양”이 아니라 **persistent override**로 다뤘다.

이후 HOLOCRON 전반의 자동화 원칙은 다음과 같이 정리된다.

```text
Automation first
→ administrator review/correction
→ manual decision persists
→ later automation must not silently overwrite it
```

같은 날:

`b58a173a — Harden collection pipeline reliability`

source 한 곳의 실패가 다른 source까지 중단시키지 않도록 collection pipeline도 강화했다.

## 09-21 — 관리자 인증을 실제 server-side session으로

초기에는 소유자 한 명이 운영하는 프로젝트였기 때문에 복잡한 계정 시스템보다 single-owner admin 모델이 적합했다.

관련 흐름:

- `905cefb2 — Fix administrator identity and editorial cleanup timing`
- `4c1641bd — Simplify single-owner administrator authorization`
- `e9c8cb39 — Implement HOLOCRON session-based administrator login`

결론은 환경변수 기반 ID/PW + server-side 검증 + signed HttpOnly session이었다.

중요한 보안 원칙:

- client에서 “관리자처럼 보이게” 하는 것은 인증이 아님
- mutation/API는 server에서 session 검증
- secret은 D1의 일반 setting이나 client bundle에 넣지 않음
- missing config는 fail closed

Phase 3 production verification은:

`0cfde7b3 — Close out Phase 3 production verification`

으로 남았다.

당시 build 과정에서는 Sites Vite plugin 관련 기존 환경 문제가 있었고, “테스트가 통과했다”와 “Production에서 실제 확인했다”를 구분해 보고하는 습관도 이 시기부터 강해졌다.

## Legacy localization recovery

`e3ce5bee — Backfill legacy article localization during collection`

V1/초기 데이터에는 현재 규칙에 맞지 않는 title/summary가 섞일 수 있었다. 새 기사만 올바르게 처리하는 것으로는 archive 전체가 일관되지 않기 때문에 collection 중 legacy localization recovery를 추가했다.

여기서도 기존 manual override는 보호하는 방향이 유지됐다.

## 09-22 — Admin Mode를 뉴스 카드 중심으로 다시 설계

`b070b8ad — Redesign administrator mode around news cards`

관리자 화면을 public archive와 완전히 다른 별도 목록 UI로 만들면 “사용자가 실제로 무엇을 보게 되는지”를 판단하기 어렵다.

그래서 admin도 shared Story/card semantics를 재사용하는 방향으로 바꿨다.

관리자가 확인해야 하는 것은 단순 DB row가 아니라:

- 어떤 Story로 보이는가
- 어떤 source가 묶였는가
- 대표가 무엇인가
- 무엇이 excluded/review인가

였다.

## 이 시기의 결과

09-22까지 HOLOCRON의 News core는 다음 형태로 굳어졌다.

```text
Source adapters
→ bounded collection
→ relevance/editorial filtering
→ Korean title/summary
→ topic matching
→ D1 Article
→ Story projection
→ public cards

                 ↘ admin review/override
```

그리고 “AI가 처리하되 AI가 source of truth는 아니다”라는 원칙이 실제 데이터 구조와 workflow에 들어갔다.
