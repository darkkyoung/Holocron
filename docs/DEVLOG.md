# HOLOCRON Development Chronicle

> 기록 범위: 2026-09-01 ~ 2026-10-13  
> 기준 canonical: `b105cabdf43b1cf29b101b0cde7107c5e3ee1f44` (`Design grounded HOLOCRON AI Assistant`)  
> 목적: 커밋만으로는 남기 어려운 **문제 인식 → 대안 검토 → 결정 → 구현 → 검증 → 후속 영향**을 보존한다.

이 문서는 단순한 changelog가 아니다. HOLOCRON을 만들면서 어떤 생각을 했고, 어디서 막혔으며, 왜 지금의 구조를 선택했는지를 복원하는 개발 연대기다.

초기 9월의 일부 내용은 canonical GitHub가 정착되기 전 대화를 바탕으로 복원했다. 9월 13일 이후는 대화 기록과 canonical commit history, 현재 제품/운영 문서를 함께 대조했다. 정확한 커밋으로 확인할 수 없는 초기 사실은 상세 문서에서 명시적으로 구분한다.

## 기록 상태

- **Implemented** — canonical 코드에 반영됨
- **Production verified** — 실제 배포/Production에서 확인됨
- **Design** — 설계는 확정되었으나 구현 전
- **Concept** — 대화에서 검토 중이며 제품 규칙으로 확정되지 않음
- **Pending** — 구현되었지만 실제 환경 검증이 남음

## 전체 흐름

| 기간 | 핵심 전환 | 상세 기록 |
| --- | --- | --- |
| 09-01 ~ 09-13 | 초기 prototype의 한계, 모바일/CSS, SWNN, 개발 방식 병목, V2 재설계 | [Origin](devlog/2026-09-01_to_09-13-origin.md) |
| 09-13 ~ 09-22 | Product/engineering 규칙 확정, News core, Story stack, 관리자 override, 인증 | [Rewrite & News Core](devlog/2026-09-13_to_09-22-rewrite-and-news-core.md) |
| 09-23 ~ 09-30 | Works, TMDB 보조, scheduler, feedback/analytics, Quiz, Roadmap, beta-ready UX | [Beta Build](devlog/2026-09-23_to_09-30-beta-build.md) |
| 10-01 ~ 10-11 | Public Beta 운영, 수집 공백/복구, Collection Health, SWNN image incident, D1 backup | [Beta Operations](devlog/2026-10-01_to_10-11-beta-operations.md) |
| 10-12 ~ 10-13 | Phase 9A Works↔News, Phase 9B Featured Hero, Phase 9C grounded AI 설계 | [Phase 9](devlog/2026-10-12_to_10-13-phase9.md) |
| 10-13 | AI 비용 우려에서 Account/Credit/Notification 개념으로 확장 | [Account & Credit Concept](devlog/2026-10-13-account-credit-notification-concepts.md) |

## 프로젝트를 바꾼 주요 결정

### 1. Prototype을 계속 덧대지 않고 V2로 다시 설계
초기 구현은 빠르게 기능을 확인하는 데는 좋았지만 Flask/JSON/subprocess/큰 `app.py` 중심으로 책임이 뒤섞이기 시작했다. 기능을 하나 추가할 때 다른 부분이 같이 흔들리는 문제가 보이자, 기존 코드를 계속 수선하는 대신 새 HOLOCRON을 V2 rewrite로 만들었다.

이후의 핵심 원칙은 `AGENTS.md`의 한 문장으로 정리됐다.

> **Move fast without making the next change slower.**

### 2. “뉴스 기사 목록”이 아니라 “같은 사건을 묶는 Story archive”
여러 매체가 같은 사건을 반복 보도하는 Star Wars 뉴스의 특성 때문에 URL별 카드 목록만으로는 사용자 경험이 좋지 않았다. 따라서 substantially same event만 같은 topic으로 묶고, 가장 이른 게시물을 대표로 두며, 나머지 매체를 physical card stack으로 보여주는 방향을 택했다.

### 3. 자동화보다 관리자 판단이 우선
AI 요약, topic matching, source filtering은 운영을 빠르게 하지만 오판할 수 있다. 그래서 merge/split/exclude/restore/title override 등 관리자의 의사결정은 영속적으로 남고, 이후 자동화가 덮어쓰지 않는다는 원칙을 프로젝트 전반에 적용했다.

### 4. 호스팅 제약은 우회하되 기존 시스템을 갈아엎지 않음
Sites native Cron이 원하는 형태로 동작하지 않자 scheduler 전체를 새 플랫폼으로 옮기지 않았다. GitHub Actions가 기존 authenticated endpoint를 호출하고, 기존 collection service와 D1을 그대로 사용하는 구조로 바꿨다.

### 5. Beta 운영 문제를 “일회성 수동 수정”으로 끝내지 않음
StarWars.com/SWNN discovery, 오래된 기사 공백, 이미지 누락, zero-discovery health 등 Production 이슈가 발생할 때마다 단순 재수집보다 recovery/backfill/health 관측과 같은 재사용 가능한 운영 도구를 추가했다.

### 6. AI Assistant는 일반 Star Wars chatbot이 아님
Phase 9C에서 AI Assistant는 HOLOCRON의 현재 public archive를 근거로 답하는 도구로 정의했다. runtime scraping, embeddings, vector DB, model-memory 기반 사실 답변은 MVP에서 제외했다. 대본 작성도 사용자가 Story를 직접 선택한 뒤에만 생성한다.

## 현재 상태 — 2026-10-13

- Phase 9A Works ↔ News: **완료**
- Phase 9B Featured Work Final Hero: **구현/배포 완료**, 일부 실제 browser acceptance는 별도 확인 필요
- Phase 9C Grounded AI Assistant: **설계 완료, 구현 전**
- 현재 AI launcher: 여전히 **COMING SOON**
- Account/Credit/Notification: **Concept 단계**, 아직 schema/API/UI에 반영하지 않음
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
