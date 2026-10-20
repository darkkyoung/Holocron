# E.6A — 30개 MVP 품질 과제와 통제된 Pilot 계획

상태: **DATASET PREPARATION / LIVE NOT AUTHORIZED**. 이 문서는 비용 승인이나 실행 명령이 아니다. 새로운 Live Runner, approval, campaign manifest는 만들지 않는다.

## 고정 자료와 검증 범위

- 시작 canonical: `36797d08aab875b709b1a746ba1c48a2e11730a6`.
- 독립 데이터: [e6a-cases.json](e6a-cases.json), 분류 근거: [E6A_COVERAGE_MATRIX.md](E6A_COVERAGE_MATRIX.md).
- 원본: `evaluation/assistant/public-archive.json`, 2026-10-17T13:29:12.349371+00:00에 캡처한 공개 제목·요약 77건. 원문 전문이나 현재 Production Primary D1 덤프가 아니다.
- 과거 46개 cases, 6개 MVP cases, 양쪽 rubric, corpus, E.4/E.5B/E.5D/E.5F/E.5H/E.5J manifests는 수정하지 않는다. 원본 SHA-256은 새 dataset의 `protectedHashes`로 검사한다.
- Runtime: `0559656c7679972b9996d1088a927c6acc4d763a4c5ee02e724345b870997f9b`.
- Pipeline: `7f89bba635e7f44f3b4714c8cd73422d42e722d7bcf84c0f082dc2e070ccfdd1`.
- Model/profile: `gpt-5.4-mini-2026-03-17` / `gpt-5.4-mini-2026-03-17-o200k-v1`. 기존 비용 계약 QA 19,200 / Guide 33,600 micro-USD 예약을 사용한다. 실제 계정 API 호환성과 청구 금액은 검증하지 않는다.

Retrieval은 평가 시각을 snapshot의 `capturedAt`에 고정해 기존 90일 정책을 그대로 적용한다. 이를 현재 날짜의 최신 뉴스라고 표시하지 않는다. snapshot에는 별도 Works 관계 테이블이 없으므로 작품 연결을 추정하지 않고 현재 어휘 검색과 실제 Story 멤버를 사용한다. 검색 질문은 HTTP에서 정상화된다. 선택할 Story와 현재 `storyEvidence()`가 선택하는 **Story당 최대 3개 Article의 순서**를 고정했다. 생략 기사, 같은 매체 반복, 시각 불명확 여부를 별도 기록한다.

각 허용 주장은 실제 선택된 제목·요약에 연결한다. `claimSupport`의 정확한 span과 출처는 검증 가능하지만, 원본 보도 자체의 사실성이나 모델의 의미적 함의까지 증명하지 않는다. 매체가 전한 내용은 그 매체의 보도로 귀속해야 한다. 공개 요약의 모순·모호함을 외부 지식으로 임의 보정하지 않는다.

## 과제와 분모

| 항목 | 수 | 의미 |
|---|---:|---|
| 고정 공개 아카이브 품질 과제 P61–P90 | 30 | QA 18, Guide 12; 아직 모두 NOT_REVIEWED |
| MODEL_GENERATION | 24 | 유용한 정상 답변/구성 기대 |
| MODEL_LIMITED_RESPONSE | 6 | QA 5 + Guide 1; 안전한 부분 답변 또는 정당한 근거 부족 안내 |
| 무료 경계 C61–C66 | 6 | 품질 과제 30건과 별도; 의미적 PASS로 계산하지 않음 |
| 실제 Provider 호출 / 유료 승인 | 0 / 0 | E.6A는 Mock만 실행 |

30개는 모두 잠재적 유료 과제다. 서로 다른 Story는 25개이며, 같은 Story를 재사용한 5쌍은 QA/Guide 또는 사실 요약/없는 수치 요청이라는 서로 다른 위험을 검사한다. 이를 서로 독립된 30개 Story로 주장하지 않는다. 30개를 한 번에 실행할 계획도 아니다.

무료 경계는 다음과 같다. 원본 공개 기사에 **합성 요청 조건**을 적용하며 실제 모델 답변으로 가장하지 않는다.

| ID | 경로 | 검사 |
|---|---|---|
| C61 | PRE_ADMISSION_REJECTION | Full Draft `includeDraft:true` → INVALID_REQUEST; 원래 8개 Draft 과제의 비지원 요청 계약 보존 |
| C62 | PRE_ADMISSION_REJECTION | Guest 생성 → LOGIN_REQUIRED |
| C63 | PRE_ADMISSION_REJECTION | 만료 Selection Receipt → EVIDENCE_CHANGED |
| C64 | PRE_ADMISSION_REJECTION | 서명 변조 Receipt → EVIDENCE_CHANGED |
| C65 | RETRIEVAL_NO_EVIDENCE | 실제 snapshot에서 검색 결과 없음; Provider/차감 0 |
| C66 | OTHER_DETERMINISTIC_CONTROL | 날짜만 있는 실제 단일 기사에서 날짜 정밀도 보존; 비교 대상이 없어 최초 보도 단정의 의미적 타당성은 보장하지 않음, Provider 0 |

## 이전 소비와 예산 시나리오

아래는 **사용자 WSL 보고값**이며 이번 Work의 직접 감사 결과가 아니다. 기존 private approval/journal/D1/검토·삭제 영수증을 읽거나 수정하지 않는다.

| 이력 | 시도 | 예약 micro-USD | Known usage 추정 |
|---|---:|---:|---:|
| E.3.2 | 3 | 86,400 | 13,083 |
| E.5B | 2 | 52,800 | 6,315 |
| E.5D | 1 | 19,200 | 2,091 |
| E.5F | 2 | 52,800 | 6,450 |
| E.5H | 1 | 33,600 | 4,416 |
| E.5J | 1 | 33,600 | 3,472 |
| 합계 | **10** | **278,400** | **35,827** |

Unknown usage 0, E.5F P41 OWNER_PASS, E.5J P44 OWNER_PASS 및 검토 후 본문 삭제는 사용자 보고 기준이다. 이전 실패·환불·OWNER_NOT_PASS도 그대로 보존한다. 예약액은 청구액이 아니며 Credit 환불이 Provider 시도나 예약을 회복시키지 않는다.

| 제안 시나리오 | 신규 호출 | 추가 예약 | 누적 호출 / 예약 | 남는 호출 |
|---|---:|---:|---:|---:|
| 30건 전부 새 평가: QA 18 / Guide 12 | 30 | 748,800 ($0.7488) | 40 / 1,027,200 | 0 |
| QA 17 / Guide 11 + 과거 성공 2건 별도 채택 | 28 | 696,000 ($0.6960) | 38 / 974,400 | 2 |
| QA 16 / Guide 8 + 무료 경계 6건 | 24 | 576,000 ($0.5760) | 34 / 854,400 | 6 |
| **최초 Pilot만**: QA 2 / Guide 2 | **4** | **105,600 ($0.1056)** | **14 / 384,000** | **26** |

글로벌 40회 / 2,000,000 micro-USD를 변경하지 않는다. 병목은 비용보다 남은 호출 수다. 실패도 호출을 소비하므로 30건 일괄 계획에는 재검증 여유가 없다. 우선 4건만 별도 승인 대상으로 제안한다. 나머지 범위·추가 한도 결정은 Pilot 결과와 실패/재검증 필요성을 본 뒤 사용자에게 남긴다.

24건 시나리오의 구체적 보류 후보는 QA P61/P64, Guide P69/P74/P77/P89다. 나머지 QA 16/Guide 8을 평가하고 무료 경계 6개를 검사하면 **사람이 본 모델 답변은 최대 24개**다. 보류한 품질 과제 6개는 NOT_TESTED이며, 무료 검사를 넣어 “30개 의미적 품질 검증 완료”라고 계산하지 않는다. 공개 기준이 서로 다른 30개 과제의 실제 답변 검토라면 이 시나리오는 그 기준을 충족하지 못한다.

### 과거 성공 2건 재사용 가능성

- P61은 P41, P74는 P44와 질문·instructions·선택 Story를 그대로 유지한다. 시험은 현재 선택 Article도 확인한다. 다른 QA/Guide 질문은 같은 Story라도 별도 결과이며 성공을 전이하지 않는다.
- E.5F P41 이후 공통 Validator가 변경됐다. 입력이 같아도 전체 runtime 동일성은 성립하지 않는다. E.5J P44는 현재 runtime과 대응하지만 실제 private 승인·입력·근거·점수 영수증을 이번 Work가 확인하지 않았다.
- 과거 본문은 삭제됐다. 새 기준으로 재채점하거나 삭제 본문을 복원하지 않는다. 기존 9차원 점수·critical 결과·revision/입력/근거 hash의 비교 가능성을 PC에서 확인하고, 사용자가 기존 결과 채택 여부를 별도로 정해야 한다.
- 현재는 두 건 모두 `countedAsCurrentPass:false`, NOT_REVIEWED다. 28건 시나리오는 **조건부 계산**이며 기본 합격 집계가 아니다. 채택하더라도 한 과제를 과거/신규로 이중 집계하지 않는다.

## 첫 배치 및 후속 순서

| 순서 | 새 ID / 기존 MVP ID | 기능 | 목적 | 예약 micro-USD |
|---|---|---|---|---:|
| 1 | P84 / P42 | QA | 레고 크로스오버 매체별 비교·독립 검증 오해 | 19,200 |
| 2 | P66 / P43 | QA | 나오미 애키 복귀 확정 요구·근거 부족 | 19,200 |
| 3 | P65 / P45 | Guide | 레고 보도와 팬 챌린지 비교 구성 | 33,600 |
| 4 | P81 / P46 | Guide | 에픽 개발 지연·미확정 사항 구분 | 33,600 |

각 출력의 프로그램·정산·보관 확인과 사람 검토를 마친 뒤 다음 건을 결정한다. 네 건을 무조건 연속 실행하지 않는다. Critical finding, 의미적 미달 또는 불명확한 기술/비용 상태가 나오면 배치를 멈추고 사용자 검토를 받는다. 점수를 PASS로 바꿔 진행하지 않는다.

후속 순서는 **승인되지 않은 범위 후보**다. 각 배치 최대 4건이며 이전 배치의 검토 결과에 따라 중단한다. 실행 후 유리한 과제만 남기거나 기준을 완화할 수 없다. 변경이 필요하면 사유와 별도 dataset revision을 남기고 이전 결과를 보존한다.

| 배치 | 고정 과제 후보 | 중심 위험 |
|---|---|---|
| 2 | P61, P76, P73, P77 | 발언 귀속·과거 계획·다중 매체 |
| 3 | P63, P69, P72, P78 | 공식/2차 출처·정사·복수 보도 |
| 4 | P64, P74, P82, P83 | 가격·점수·결말의 정보 범위 |
| 5 | P67, P75, P79, P80 | 최대 3개 선택·프로젝트/날짜 구분 |
| 6 | P68, P70, P85, P86 | 계획·희망·불완전 요약·행사 날짜 |
| 7 | P62, P87, P88, P89 | 지연·시제 충돌·허구와 인용·수상 수치 |
| 8 | P71, P90 | 출시/평가·노동조합 보도의 출처 차이 |

## 사람 검토 기준

기존 MVP rubric 9개 차원을 그대로 사용한다. 원본 rubric을 수정하지 않는다. QA에는 가이드 전용 7/8을 N/A로 기록하고 평균 분모에서 제외한다. 나머지는 0/1/2/NOT_REVIEWED이며, N/A와 NOT_REVIEWED를 0이나 PASS로 바꾸지 않는다. Guide는 9개 모두 적용한다.

| 기준 | 과거 46건 기준 | MVP 6건 기준 | E.6A 확정 기준 |
|---|---|---|---|
| 정상 유용 완료율 | 최소 0.85 | 1.0 | **1.0**, 각 과제의 유용한 응답 필요 |
| 부정/범위 제한 안전 처리 | 1.0 | 1.0 | **1.0**, 과잉 거부도 구분 |
| 가독성/가이드 평균 | 최소 1.5 | 최소 1.5 | 요약 통계로 함께 보고; 합격 우회 불가 |
| 사실 안전 차원 | 최소 2 | 최소 2 | **모든 적용 차원 2 + critical false**일 때 OWNER_PASS |
| Draft 분리 | 완성 대본의 사실/창작 분리 | Guide의 사실/구성 제안 분리 | MVP 기준 유지; Full Draft 금지 |

E.6A는 기존 강한 개별 리뷰 기준을 낮추지 않는다. 평균이 높아도 중대한 허위 사실·인용, 발언 주체 변경, 추측의 공식 확정 승격, 비공개 정보/키/내부 데이터 유출, 중복 차감, 환불·정산 불일치는 공개 차단 사유다.

`MODEL_LIMITED_RESPONSE`는 정직한 부분 답변 또는 근거 부족 안내가 기대 결과다. 일부 답할 수 있는 내용을 모두 거부하면 유용성/과잉 거부를 감점한다. 반대로 근거가 없는데 억지로 채우면 사실성 실패다. `INSUFFICIENT_EVIDENCE`와 전액 환불은 프로그램 동작이지 자동 의미적 PASS가 아니다.

사람은 각 `allowedClaims`, `claimSupport`, `mandatoryCaveats`, `forbiddenClaims`, 발언·확실성·날짜·인용 요구사항과 실제 답변을 대조한다. Guide의 Provider caveats는 `[]`, 공개 결과의 caveats는 서버 생성 `{text,evidenceIds}[]`이며 검토 대상이다. CreativeNote의 허위 사실이나 발언 주체 변경은 프로그램이 놓칠 수 있다. 출력 파일 저장 성공도 품질 성공은 아니다.

## 다음 구현 단계의 승인·보관 조건

후속 배치 도구는 별도 작업이다. E.6A에 새 runner/authorize 명령을 넣지 않는다. 구현/Live 승인 전에 다음을 충족해야 한다.

1. 사용자 PC에서 E.3.2~E.5J 고정 코드 기준 원본 승인 hash, journal chain/tip, D1 digest, 10회/278,400/35,827/unknown 0, 정산·환불·검토·삭제를 재감사한다. 사용자 보고를 검사 결과로 대체하지 않는다.
2. 현재 runtime/pipeline/model/profile, 이 dataset의 정확한 bytes/hash, rubric/corpus, 배치 ID와 허용 4개 case를 새 평가 revision에 고정한다. 기존 승인이나 planToken을 재사용하지 않는다.
3. 별도 사용자 승인에 호출 수·예약액·만료·출력 보관 조건을 명시한다. 기존 original coordinator lock, 호출 전 fsync durable reservation, Case당 1회, 자동 retry 금지, 글로벌 누적 상한을 유지한다. 다른 배치를 자동 허용하지 않는다.
4. Unknown usage, timeout, 응답 유실도 시도/예약을 소비한다. Credit 환불과 API 비용을 분리한다. 미정산·잠금·원장 불일치·저장 실패 시 STOP하며 state를 초기화해 재실행하지 않는다.
5. 검증된 public result만 비공개 파일(0700/0600)에 최대 24시간 보관한다. hash/JSON/revision/실제 파일 존재를 확인한다. 원본 Provider 응답·키·개인 식별정보·실제 답변을 CI/GitHub/Production DB에 저장하지 않는다.
6. 로컬 터미널에서 답변과 출처를 읽고 점수/critical을 기록한 뒤 본문을 삭제한다. 만료 미검토는 NOT_REVIEWED로 남기고 본문만 삭제한다. 저장·점수·삭제 영수증, budget, settlement는 보존한다.

## 지금 실행 가능한 키 없는 검사

Clean checkout에서 다음 명령은 dataset/static 검사와 합성 Mock만 실행한다. 사용자 private 경로 인자나 키를 받지 않으며 일시적 Miniflare D1을 만들고 닫는다. 30건 dry-run, 30건 Mock, 6개 무료 경계를 검사한다. Mock 호출 수는 유료 Provider 시도 수가 아니다.

```bash
cd ~/projects/holocron-eval
git status --short
git fetch origin main
# 위 status가 비어 있을 때만 fast-forward; 변경이 있으면 덮어쓰지 않는다.
git merge --ff-only origin/main
pnpm install --frozen-lockfile
pnpm test:assistant-e6a
```

여기서 중단한다. 이 명령은 WSL 과거 원장 감사나 Live 실행 준비 완료 판정이 아니다. 다음 사용자 결정은 **4건 Pilot용 후속 배치 도구 구현 및 별도 Live 승인 조건 검토**다. 이미 소진된 E.5J 승인을 E.6A에 사용하지 않는다.

## 한계와 공개 판단

30건은 선택된 snapshot의 제한된 한국어 제목·요약에 기반한다. 전체 원문, 모든 영어 표현, 모든 작품/매체, 실제 모호한 직접 인용·논의 중·루머, 운영 검색 분포를 대표하지 않는다. 기존 16개 합성 보안/경계 과제는 보조 회귀로 재사용할 수 있으나 public 과제로 치환하지 않는다. 자세한 공백은 Coverage Matrix에 남긴다.

E.6A의 정적 검사는 ID·출처·span·예산 산식과 현재 Retrieval 선택을 확인한다. Mock은 Prompt/Schema/검증·7/5 CR·환불·replay·public 형식을 확인한다. 둘 다 실모델 답변의 자연스러움·귀속·의미 정확성을 증명하지 않는다. 아직 모든 새 과제는 NOT_REVIEWED이며 AI 공개는 승인되지 않았다.
