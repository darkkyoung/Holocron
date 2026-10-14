# HOLOCRON Development Chronicle

> 기록 범위: 2026-06 ~ 2026-10-14  
> 기준 canonical: `b105cabdf43b1cf29b101b0cde7107c5e3ee1f44` (`Design grounded HOLOCRON AI Assistant`)  
> 목적: 커밋만으로는 남기 어려운 **문제 인식 → 대안 검토 → 결정 → 구현 → 검증 → 후속 영향**을 보존한다.

이 문서는 단순한 changelog가 아니다. HOLOCRON을 만들면서 어떤 생각을 했고, 어디서 막혔으며, 왜 지금의 구조를 선택했는지를 복원하는 개발 연대기다.

HOLOCRON의 시작은 현재 repository가 만들어진 9월이 아니다. 6월 데이터베이스 과제에서 만든 StarTrack이 오픈소스SW 과제로 확장되고, 아주빌드 AI 해커톤에서 실제 서비스에 가까운 기능을 빠르게 추가한 뒤, 첫 번째 코드베이스의 구조적 한계를 겪으면서 9월 Astra 기반 V2 rewrite로 이어졌다. 이 **과제 → 해커톤 → V1 → V2**의 계보를 프롤로그부터 기록한다.

6~9월 초 일부 맥락은 당시 대화와 이전 repository history를 함께 바탕으로 복원했다. 9월 13일 이후는 대화 기록과 canonical commit history, 현재 제품/운영 문서를 함께 대조했다. 정확한 commit으로 확인할 수 없는 판단은 상세 문서에서 구현 사실과 구분한다.

## Repository lineage

- Database assignment — [darkkyoung/starwarsArchive](https://github.com/darkkyoung/starwarsArchive)
- Open Source SW assignment — [darkkyoung/HolocronArchive_FOSS](https://github.com/darkkyoung/HolocronArchive_FOSS)
- V1 / hackathon expansion — [darkkyoung/HolocronArchive_Latest](https://github.com/darkkyoung/HolocronArchive_Latest)
- V2 / current canonical — [darkkyoung/Holocron](https://github.com/darkkyoung/Holocron)

## 기록 상태

- **Implemented** — canonical 코드에 반영됨
- **Production verified** — 실제 배포/Production에서 확인됨
- **Design** — 설계는 확정되었으나 구현 전
- **Concept** — 대화에서 검토 중이며 제품 규칙으로 확정되지 않음
- **Pending** — 구현되었지만 실제 환경 검증이 남음

## 전체 흐름

| 기간 | 핵심 전환 | 상세 기록 |
| --- | --- | --- |
| 06 ~ 09-13 | DB 과제 StarTrack → 오픈소스SW → 아주빌드 AI 해커톤 → V1 구조 한계 → Astra V2 rewrite | [Prologue](devlog/2026-06_to_09-prologue.md) |
| 09-01 ~ 09-13 | V1 후반부 모바일/CSS, SWNN, 개발 방식 병목, V2 전환 직전 | [Origin](devlog/2026-09-01_to_09-13-origin.md) |
| 09-13 ~ 09-22 | Product/engineering 규칙 확정, News core, Story stack, 관리자 override, 인증 | [Rewrite & News Core](devlog/2026-09-13_to_09-22-rewrite-and-news-core.md) |
| 09-23 ~ 09-30 | Works, TMDB 보조, scheduler, feedback/analytics, Quiz, Roadmap, beta-ready UX | [Beta Build](devlog/2026-09-23_to_09-30-beta-build.md) |
| 10-01 ~ 10-11 | Public Beta 운영, 수집 공백/복구, Collection Health, SWNN image incident, D1 backup | [Beta Operations](devlog/2026-10-01_to_10-11-beta-operations.md) |
| 10-12 ~ 10-13 | Phase 9A Works↔News, Phase 9B Featured Hero, Phase 9C grounded AI 설계 | [Phase 9](devlog/2026-10-12_to_10-13-phase9.md) |
| 10-13 | AI 비용 우려에서 Account/Credit/Notification 개념으로 확장 | [Account & Credit Concept](devlog/2026-10-13-account-credit-notification-concepts.md) |
| 10-14 | Credit 가격/보상 확정, Account cap 제거, Galactic Racing 시즌/예측/시뮬레이션/미술 구조 설계 | [Credit & Galactic Racing](devlog/2026-10-14-credit-and-galactic-racing.md) |
| 10-14 | 별도 Guest identity, Account/Credit ledger 기반과 백업 v4 구현; 보상·로그인은 후속 단계 | [Account/Credit Foundation](devlog/2026-10-14-account-credit-foundation.md) |
| 10-14 | Guest 방문·KST 출석·Quiz 첫 제출 보상과 잔액 UI 구현; atomic batch와 동시성 검증 | [Guest Credit Rewards](devlog/2026-10-14-guest-credit-rewards.md) |

## 프로젝트를 바꾼 주요 결정

### 1. 과제를 버리지 않고 다음 과제와 해커톤의 기반으로 재사용
데이터베이스 과제의 PostgreSQL/Flask StarTrack은 오픈소스SW 입문 과제에서 JSON/Ollama 기반으로 변형됐고, 다시 아주빌드 AI 해커톤에서 자동 수집·topic grouping·admin이 있는 V1으로 발전했다. 현재 HOLOCRON의 핵심 기능 대부분은 이 반복적인 재해석 속에서 생겼다.

### 2. Prototype을 계속 덧대지 않고 V2로 다시 설계
V1은 빠르게 기능을 확인하는 데는 좋았지만 Flask/JSON/subprocess/큰 `app.py` 중심으로 책임이 뒤섞이기 시작했다. 기능을 하나 추가할 때 다른 부분이 같이 흔들리는 문제가 보이자, 기존 코드를 계속 수선하는 대신 Astra를 이용해 새 HOLOCRON을 V2 rewrite로 만들었다.

이후의 핵심 원칙은 `AGENTS.md`의 한 문장으로 정리됐다.

> **Move fast without making the next change slower.**

### 3. “뉴스 기사 목록”이 아니라 “같은 사건을 묶는 Story archive”
여러 매체가 같은 사건을 반복 보도하는 Star Wars 뉴스의 특성 때문에 URL별 카드 목록만으로는 사용자 경험이 좋지 않았다. 따라서 substantially same event만 같은 topic으로 묶고, 가장 이른 게시물을 대표로 두며, 나머지 매체를 physical card stack으로 보여주는 방향을 택했다.

### 4. 자동화보다 관리자 판단이 우선
AI 요약, topic matching, source filtering은 운영을 빠르게 하지만 오판할 수 있다. 그래서 merge/split/exclude/restore/title override 등 관리자의 의사결정은 영속적으로 남고, 이후 자동화가 덮어쓰지 않는다는 원칙을 프로젝트 전반에 적용했다.

### 5. 호스팅 제약은 우회하되 기존 시스템을 갈아엎지 않음
Sites native Cron이 원하는 형태로 동작하지 않자 scheduler 전체를 새 플랫폼으로 옮기지 않았다. GitHub Actions가 기존 authenticated endpoint를 호출하고, 기존 collection service와 D1을 그대로 사용하는 구조로 바꿨다.

### 6. Beta 운영 문제를 “일회성 수동 수정”으로 끝내지 않음
StarWars.com/SWNN discovery, 오래된 기사 공백, 이미지 누락, zero-discovery health 등 Production 이슈가 발생할 때마다 단순 재수집보다 recovery/backfill/health 관측과 같은 재사용 가능한 운영 도구를 추가했다.

### 7. AI Assistant는 일반 Star Wars chatbot이 아님
Phase 9C에서 AI Assistant는 HOLOCRON의 현재 public archive를 근거로 답하는 도구로 정의했다. runtime scraping, embeddings, vector DB, model-memory 기반 사실 답변은 MVP에서 제외했다. 대본 작성도 사용자가 Story를 직접 선택한 뒤에만 생성한다.

### 8. Credit을 제한만 하지 않고 재미있는 sink로 순환
AI 사용량을 제한하기 위해 시작한 Credit이 출석/Quiz 보상으로 쌓이면 단순 100 CR cap은 적극적인 사용자에게 더 이상 보상이 없는 상태를 만든다. 그래서 logged-in account cap을 없애고 하루 한 번 열리는 Galactic Racing의 우승/시즌 예측을 장기 Credit sink로 설계했다. Racing은 real-money 기능이 아니라 HOLOCRON 내부 non-cash Credit 참여 기능이며 market당 최대 30 CR로 bounded된다.

### 9. 3D 레이스를 물리게임이 아니라 동기화된 방송으로 정의
8대 차량의 결과를 viewer마다 실시간 물리 계산하지 않는다. 서버가 race 시작 시 seed 기반 simulation을 한 번 실행해 result/event timeline/camera cues를 만들고, 모든 browser가 같은 timeline을 현재 시각에 맞춰 3D로 재생한다. 이 결정 덕분에 Replay가 자연스럽게 생기고, 2D billboard racer + low-poly 3D track + map-specific event table 같은 저비용 미술/연출 전략도 가능해졌다.

## 현재 상태 — 2026-10-14

- Phase 9A Works ↔ News: **완료**
- Phase 9B Featured Work Final Hero: **구현/배포 완료**, 일부 실제 browser acceptance는 별도 확인 필요
- Phase 9C Grounded AI Assistant: **설계 완료, 구현 전**
- 현재 AI launcher: 여전히 **COMING SOON**
- Account/Credit: **9C.2-A 기반 및 B Guest 보상 구현·로컬 검증 완료 / private 배포·migration·실제 browser 검증 대기**. 다음 C 로그인/이전은 구현 전. docs/ACCOUNT_CREDIT_DESIGN.md
- Galactic Racing: **설계 완료 / 구현 전**, docs/RACING_DESIGN.md
- Notification: Web Push 최초 활성화 +1 CR만 현재 Credit 규칙에 포함; delivery/pass 정책은 별도 구현 전
- Site: Final Launch 준비를 위해 owner-only/private 상태

## 이 문서의 유지 방법

앞으로 큰 Phase 또는 중요한 운영 사고가 끝날 때 다음 항목을 추가한다.

1. 당시 상황
2. 문제
3. 처음 고려한 방법
4. 발견한 결함/제약
5. 최종 결정과 이유
6. 실제 구현
7. 검증
8. 보류한 것
9. 다음 Phase에 미친 영향

Commit message는 “무엇이 변했는가”를 남기고, 이 연대기는 “왜 그렇게 변했는가”를 남긴다.
