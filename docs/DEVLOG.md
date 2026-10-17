# HOLOCRON Development Chronicle

## 2026-10-17 — Mobile News-first UI polish (canonical-only)

모바일 News 첫 화면에서 소개·대형 안내·Feedback 선행 영역을 압축/재배치하고, 공통 Header의 단일 Credit 상태를 로고 옆 배지로 표시한다. 기존 검색·Work·카테고리 상태는 한 explorer에 유지한 채 우상단 아이콘으로 접어 사용한다. PC와 Credit 정책·뉴스 데이터·AI는 유지한다. 격리된 D1 합성 기사와 실제 Playwright 검증을 위한 Actions 경로를 추가했다. [구현·검증 상태](devlog/2026-10-17-mobile-news-first.md). Production 배포는 수행하지 않았다.


## 2026-10-17 — E.2 실제 운영 화면·Account 확인, 최종 증거 일부 대기

정상 방문의 자동 보상·Analytics 부수효과를 사용자가 승인한 뒤 기존 Google Account 브라우저 세션으로 News 검색/기사 펼침, Works 필터, Quiz 공개 콘텐츠, Roadmap, 관리자 로그인 보호 및 실제 COMING SOON을 확인했다. Account는 정상 출석 +1로 6→7 CR이 되었으며 기존 73개 원장 행 보존·신규 1건·총 74건/25개 지갑 정합성을 읽기 전용으로 확인했다. AI spend/admissions는 0이다. Quiz 대표 이미지 미로드와 일부 선택지 placeholder는 원인 미확정의 콘텐츠 표시 이슈로 기록했다.

**데이터 acceptance PASS 유지, 전체 E.2는 실제 Assistant POST disabled 응답과 Production 모바일 폭 확인이 없어 BLOCKED다.** 현재 브라우저 도구에는 임의 same-origin POST와 viewport 조정 기능이 없다. 기존 로컬 QA나 GET 응답을 대체 증거로 쓰지 않는다. 추가 배포/migration·Provider 호출·AI 활성화는 없으며 문서만 갱신한다. [실제 관측과 남은 확인](devlog/2026-10-17-controlled-production-migration.md#2026-10-17-final-service-continuation--authorized-normal-visits). 아래 기록은 당시 승인 범위와 결과를 보존한다.


## 2026-10-17 — E.2 post-v82 backup·데이터·Credit 감사 PASS

새 관리자 원본 v6/0018의 validate/plan과 14개 데이터셋 행 단위 비교를 통과했다. 기존 행의 변경·삭제는 0이며 원장 58건이 모두 동일하다. 신규 Guest 지갑 5개와 정상 보상 15건으로 지갑 25개·원장 73건이 되었고 Account는 6 CR 그대로다. public v82·환경 revision 40·AI OFF·비어 있는 admissions를 확인했다. 실제 브라우저에서 관리자 로그인 보호와 Assistant GET 메서드 거부도 확인했다.

**전체 E.2는 운영 화면 검증 한계로 BLOCKED 유지다.** 최신 지시는 Production 데이터 변경을 금지하므로 자동 방문 보상/Analytics POST를 유발하는 화면을 열지 않았다. 읽기 전용 HTTP 경로는 Cloudflare 403/1010이고, 현재 브라우저에는 요청 차단 기능이 없다. COMING SOON 실제 렌더링·POST disabled·Google 재로그인 등은 미검증으로 남긴다. 백업 시각은 배포 약 2시간 45분 뒤이며 즉시 snapshot이라고 주장하지 않는다. 추가 배포·migration·Production 데이터 변경·Provider 호출·AI 활성화는 없다. [증거와 남은 gate](devlog/2026-10-17-controlled-production-migration.md).


## 2026-10-17 — Phase 9D-E.2 controlled deployment, post-backup gate pending

사용자가 새로 제공한 v4/0016 원본의 validate/plan·원장 감사·이전 백업 행 단위 비교를 통과했다. 51개 회귀 suite와 lint/tsc/build/diff-check를 재실행한 뒤 canonical tree를 최신 Sites 이력 위에 동일하게 반영했고, 승인된 한 번의 정상 배포가 공개 v82에서 성공했다. 0017/0018 패키지 해시를 확인했으며 배포 후 assistant_admissions가 나타났다. AI OFF·환경 revision 40·접근 정책은 그대로다. **즉시 v6/0018 관리자 백업 첨부와 데이터 보존 감사가 아직 필요하므로 전체 E.2 acceptance는 BLOCKED다.** 실제 Provider 호출·임의 SQL·restore·추가 배포는 없다. [배포 증거와 남은 검증](devlog/2026-10-17-controlled-production-migration.md).

> 기록 범위: 2026-06 ~ 2026-10-14  
> 기준 canonical: `b105cabdf43b1cf29b101b0cde7107c5e3ee1f44` (`Design grounded HOLOCRON AI Assistant`)  
> 목적: 커밋만으로는 남기 어려운 **문제 인식 → 대안 검토 → 결정 → 구현 → 검증 → 후속 영향**을 보존한다.

이 문서는 단순한 changelog가 아니다. HOLOCRON을 만들면서 어떤 생각을 했고, 어디서 막혔으며, 왜 지금의 구조를 선택했는지를 복원하는 개발 연대기다.

HOLOCRON의 시작은 현재 repository가 만들어진 9월이 아니다. 6월 데이터베이스 과제에서 만든 StarTrack이 오픈소스SW 과제로 확장되고, 아주빌드 AI 해커톤에서 실제 서비스에 가까운 기능을 빠르게 추가한 뒤, 첫 번째 코드베이스의 구조적 한계를 겪으면서 9월 Astra 기반 V2 rewrite로 이어졌다. 이 **과제 → 해커톤 → V1 → V2**의 계보를 프롤로그부터 기록한다.

6~9월 초 일부 맥락은 당시 대화와 이전 repository history를 함께 바탕으로 복원했다. 9월 13일 이후는 대화 기록과 canonical commit history, 현재 제품/운영 문서를 함께 대조했다. 정확한 commit으로 확인할 수 없는 판단은 상세 문서에서 구현 사실과 구분한다.

## 2026-10-15 — Phase 9C.2 private acceptance completed

CASE-free 0016의 한 번의 controlled retry가 v79에서 성공했다. 이후 실제 Google callback 실패를 workerd의 `fetch redirect:error` 미지원으로 재현하고, canonical에서 manual redirect + 3xx 거부 및 실제 Miniflare Worker regression을 추가했다. v81에서 Google 로그인, Guest 3 CR 이전, 첫 로그인 +3, 같은 날 중복 방지 및 logout/relogin 후 6 CR 유지를 확인했다. 전체 42 test:*와 lint/tsc/build/diff-check PASS. 즉시/최종 v4 백업 validate/plan PASS, 기존 legacy row 전부 보존, 최종 Production export 원장 read-only audit PASS. 모바일·독립 다중 기기·날짜 경계 live 검증은 미실시다. 지원된 desktop 범위의 9C.2 private acceptance를 완료했으며 다음 Phase 9D는 미시작이다. [상세 운영 증거](devlog/2026-10-15-private-account-acceptance.md).

## 2026-10-16 — Phase 9D-A grounding/retrieval foundation

현재 공개 90일 D1 스냅샷과 deterministic Story 검색, 최대 3개 Article 근거, 변경 감지 fingerprint 및 10분 opaque receipt를 구현했다. 기존 Story/Work/source projection을 재사용하고 seed fallback·쓰기·provider·Credit 지출은 연결하지 않았다. 별도 7일 cookie는 receipt의 브라우저 바인딩일 뿐 Account/Guest identity를 대체하지 않는다. API는 기본 비활성, launcher는 COMING SOON이다. 사용자에 따르면 Site 접근은 전체 공개로 변경됐으며, 이번 작업은 canonical 구현/테스트만 수행한다. [구현·검증·제한](devlog/2026-10-16-assistant-retrieval-foundation.md).

## 2026-10-16 — Phase 9D-B atomic admission foundation (acceptance BLOCKED)

운영 admission과 기존 Credit prepared mutation을 한 D1 batch로 결합하고 SQL invariant로 부분 커밋을 거부했다. session/network/global quota, 비용 예약, lease, 재전송 방어와 보상 환불, additive 0017 및 v5/14 durable dataset 호환성을 구현했다. 실제 D1에서 Guest cap 및 이전 후 retired wallet의 전액 환불 충돌이 재현되어 해당 acceptance와 미해결 행의 48시간 retention은 BLOCKED다. 기존 Credit 규칙은 바꾸지 않았고 부분 환불을 성공으로 기록하지 않는다. provider 호출·Production 배포·AI 활성화·9D-C 착수는 없다. [구현·증거·정책 결정 필요 사항](devlog/2026-10-16-assistant-admission-foundation.md).

## 2026-10-16 — Phase 9D-B.1 refund safety (acceptance BLOCKED)

승인된 초기 Account-only AI 지출 정책을 service와 원자적 D1 admission/debit 양쪽에 적용했다. Guest는 로그인 필요 오류로 차단되며 보상·무료 검색·기존 이전 규칙은 유지된다. 잘못된 사용량 메타데이터도 환불을 막지 않게 했고, 실패 완료 및 cleanup은 원래 차감의 전액 환불 원장 증거를 확인한다. 실제 D1에서 일반 Account 환불·중복·실패 복구·보존·원장 정합성을 검증했다. 다만 `MAX_SAFE_INTEGER` 근처에서 정상 보상 또는 Guest 이전이 환불 여유를 소진하는 사례가 재현되어 **9D-B는 BLOCKED 유지**다. 미해결 의무는 48시간 후에도 보존한다. 0017/v5·Credit 기반·Production·COMING SOON은 변경하지 않았다. [상세 검증과 남은 제품 결정](devlog/2026-10-16-assistant-refund-safety.md).

## 2026-10-16 — Phase 9D-B.2 numeric refund headroom (reward-policy BLOCKED)

공통 Credit prepared mutation에 미정산 AI 환불 잔액과 원장 sequence 슬롯 예약을 추가했다. 모든 보상·일반 credit·첫 로그인·Guest 이전이 같은 SQL 검사를 거치며, 자기 요청의 전액 환불만 해당 예약을 소비한다. 잘못된 failed 표시만으로 예약을 해제하지 않고 기존 durable 환불 증거를 재사용한다. 실제 D1 잔액 경계와 SQL sequence 모의 경계, 다중 미정산·복구·이전 경합·원장 감사를 검증했다. 0016/0017 및 v5는 그대로이며 신규 runtime은 0017을 전제로 한다. 다만 예약 때문에 거절된 출석/Quiz는 claim을 소비하지 않아도 날짜·공개 상태가 바뀌면 원래 보상을 다시 청구할 수 없어 **9D-B는 BLOCKED 유지**다. 소급/이연 보상 정책을 임의로 만들지 않았다. [수치 불변식·검증·최소 제품 결정](devlog/2026-10-16-assistant-numeric-headroom.md).

## 2026-10-16 — Phase 9D-B.3 capacity-first refunds (Account migration BLOCKED)

승인된 정책에 따라 일반 보상을 우선하는 capacity-first 환불로 전환했다. B.2의 잔액 예약을 제거하고, 기존 0016이 허용하는 Guest 부분/0 환불은 요청액 전체를 소진한 terminal 결과로 정산한다. 적용액·포기액·전액 여부를 구분하며 나중에 공간이 생겨도 재환불하지 않는다. Account-only AI 지출과 별도 sequence 슬롯 보호는 유지했다. Account 부분 환불은 0016의 applied=requested 및 v4/v5 원장 감사 규칙과 충돌하므로 승인되지 않은 migration을 만들지 않고 **9D-B BLOCKED**를 유지한다. 과거 B/B.1/B.2 실패 기록은 그대로 보존했다. [검증 결과·최소 migration 제안](devlog/2026-10-16-assistant-capacity-first-refunds.md).

## 2026-10-16 — Phase 9D-B.4 Account partial refunds (local acceptance COMPLETE)

별도 승인된 additive 0018로 Credit INSERT audit trigger의 Account refund 적용액 규칙만 변경했다. 0016/0017은 그대로이며, 임시 쓰기 차단 guard와 D1 batch rollback으로 교체 중 안전성을 검증했다. Account 전액·부분·0 환불은 요청액 전체를 소진하고 적용액/영구 포기액을 구분하는 terminal 결과로 처리한다. 일반 보상·Guest cap·Account-only AI·sequence 슬롯 보호는 유지했다. 백업 v6/0018만 새 Account 환불 효과를 허용하며 역사적 v1–v5 검증은 그대로다. 실제 로컬 D1 migration/경합/복구/원장 감사와 **47/47 test:* 및 lint/tsc/build/diff-check PASS**로 승인된 정책의 **9D-B 로컬 구현 acceptance를 COMPLETE**로 기록한다. Production acceptance는 주장하지 않는다. Provider 호출·Production 배포·AI 활성화는 없고 COMING SOON 및 기존 공개 Site 접근을 유지하며 9D-C는 미시작이다. [B.4 migration·환불·백업·검증 상세](devlog/2026-10-16-account-partial-refund-acceptance.md).

## 2026-10-16 — Phase 9D-C grounded generation (local acceptance COMPLETE)

기존 A의 receipt/primary snapshot과 B의 Account-only 원자 차감·capacity-first 환불 위에 엄격한 generate API, 전용 provider profile, 단일 Responses 요청, 실제 o200k tokenizer와 구조·인용·support 검사 및 최종 D1 freshness를 연결했다. 실제 provider 호출 없이 로컬 D1과 workerd에서 5/7/15 CR, 중복·실패·부분/0 환불·응답 유실·복구를 검증했다. **49/49 test:* 및 lint/tsc/build/diff-check PASS**, 새 generation 1,422개/provider 84개 assertion PASS로 9D-C 로컬 구현 acceptance를 COMPLETE로 기록한다. 의미적 사실 보장과 브라우저 전달 원자성은 주장하지 않는다. 0016–0018/백업 v6는 그대로이며 Production·공개 Site·COMING SOON은 유지하고 9D-D는 시작하지 않았다. [공식 모델 조사·구현·최종 검증 및 한계](devlog/2026-10-16-assistant-generation-foundation.md).

## 2026-10-16 — Phase 9D-D assistant workspace (canonical-only local checkpoint)

서버 기능 플래그가 켜진 환경에 한해 `/assistant`의 질문/영상 구성 두 모드와 News launcher 연결을 구현했다. 무료 검색 후 명시적 Story 선택, 실제 근거 기사 확인, Account-only 5/7/15 CR 비용 고지와 단일 생성 요청, D1 기반 인용과 확실성 표시, 취소·근거 변경·환불 정산 상태를 화면에 연결했다. 플래그 기본 OFF의 COMING SOON과 기존 공개 Site 코드는 유지한다. 스키마·백업·Credit·provider profile 변경, 실제 provider 호출, Production 배포는 없다. [구현·검증·미검증 범위](devlog/2026-10-16-assistant-workspace.md).

## 2026-10-16 — Phase 9D-D.1 assistant UI state consistency

생성 당시 입력과 현재 폼이 달라지면 이전 결과임을 표시하고 복사를 숨긴다. 질문/필터는 기존 dirty gate로 재검색을 요구하지만 문체/초안 옵션만 바뀌면 유효한 receipt와 선택을 유지해 별도 명시적 생성이 가능하다. visibility 숨김 기록은 한 번의 hidden→visible 전환에서 소비해 새 검색 후 잘못된 stale 판정을 막는다. [상세 회귀 증거](devlog/2026-10-16-assistant-workspace.md).

## 2026-10-16 — Phase 9D-E.1 Production preflight (NO-GO)

최신 canonical `c272f1e`와 실제 성공한 Chromium 실행을 대조하고, 읽기 전용 Sites 도구로 public v81·성공 deployment·Account/Credit 테이블 존재·assistant_admissions 부재를 확인했다. 최근 scheduled collection도 success로 확인했다. 0017/0018의 CASE-free parser·trigger 교체·Credit/backup 계약을 재검토했지만 fresh 관리자 백업 접근은 자동 승인 검토에 차단되어 운영 원장 감사와 데이터 보존 baseline은 미확인이다. **migration 승인 요청 및 실행은 NO-GO**다. 임시 guard 중단 시 Credit 쓰기 차단, 코드 rollback과 DB 복구의 차이, 공개 Site에서 global AI flag를 켤 때의 노출 범위를 문서화했다. Production 변경·provider 호출·AI 활성화는 없다. [E.1 증거·중단 조건·향후 승인 계획](devlog/2026-10-16-production-migration-preflight.md).

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
| 10-15 | Google 최소 OIDC 로그인, Account session, 원자적 Guest 이전과 기기 간 동시성·보상 연속성 | [Google Login & Migration](devlog/2026-10-15-google-login-account-migration.md) |

| 10-15 | Production pre-backup·secret 준비, SQL splitter 회귀 수정; hosted migration v77/v78 실패로 acceptance 중단 | [Private Acceptance Checkpoint](devlog/2026-10-15-private-account-acceptance.md) |

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

## 현재 상태 — 2026-10-15

- Phase 9A Works ↔ News: **완료**
- Phase 9B Featured Work Final Hero: **구현/배포 완료**, 일부 실제 browser acceptance는 별도 확인 필요
- Phase 9C Grounded AI Assistant: **설계 완료, 구현 전**
- 현재 AI launcher: 여전히 **COMING SOON**
- Account/Credit: **9C.2-A/B/C 구현·로컬 검증 완료 / pre-backup·secret 준비 완료 / hosted migration v77·v78 실패로 STOP**. 실제 Google/browser 검증 및 v4 백업은 미실시. Phase 9D 미시작. docs/ACCOUNT_CREDIT_DESIGN.md
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


## 2026-10-15 — v79 migration success; Google callback diagnosis

The single CASE-free controlled retry succeeded. Immediate v4 validate/plan and exact old-row preservation passed. Guest first visit/reload showed 3 CR. Real Google acceptance then exposed a callback failure within a fresh OAuth lifetime; fixed-stage, secret-free diagnostics and regression coverage were added canonically rather than guessing at Production-only changes. Phase 9C.2 remains incomplete; Phase 9D is unstarted. See [operational evidence](devlog/2026-10-15-private-account-acceptance.md#v79-controlled-retry-and-real-google-acceptance--2026-10-15).


### Google OAuth runtime compatibility correction

v80 diagnostics narrowed failure to provider_exchange. Real local Miniflare/workerd then reproduced TypeError for redirect:error, which the injected-fetch protocol mocks had missed. The canonical fix uses redirect:manual with explicit 3xx rejection, preserving the no-redirect credential boundary. A real Worker-fetch/RS256 regression now covers success, token/JWKS redirect rejection and fixed provider errors. Applied migration 0016 and its invariants remain unchanged.
## 2026-10-16 — Phase 9D-D.2 browser QA runner preparation

Manual GitHub Actions Chromium QA now has an isolated local D1 and synthetic API fixtures. Browser acceptance remains pending an actual workflow execution and reviewed artifacts; no Production or public AI change. [Detailed recovery record](devlog/2026-10-16-assistant-browser-qa.md).
