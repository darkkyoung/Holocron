# Galactic Racing v0.10 Final Acceptance — measured record

검증일: 2026-11-05. **로컬/격리 프로토타입과 Phase 3 설계만 해당한다. 운영 출시 승인이 아니다.**

## 1. Source, exact build, isolation

- Fresh-fetch 시작 main: `93646c066aaf8a33f1a7c062f8404dd7cd7b211e`.
- 시작 Racing: `0f73784bcd23e9d9b80a7e0bae8c75696094fd8e`, tree `9ca3af76c0bfd804b644a6ddf809d826774edddc`.
- 작업 브랜치: `feature/galactic-racing-phase2d-v010-acceptance`.
- v0.10 엔진·방송 구현 commit: `c2b38185f917b532c85f00e1152b941b5fa4831d`.
- 최종 실행/검증 candidate: `8a975b3fc28f0ec6b78f47ae405734db1b00d1e1`, tree `4308014f3467b570111f066ed1cd7e682073c93e`. 엔진은 최초 구현 commit과 동일하다. 중간 검증·설계 commit `7eab9b7` 이후 실제 캡처에서 발견한 진입 카메라 프레이밍을312a449에서 수정했다. 233e161은 Windows 동적 표본 수집을 실제 렌더링 MutationObserver로 바꾼 테스트 전용 변경이다. 7120c14는 모바일 자막의 차량 가림을 제거하고 동일 엔진 감사의 검증된 재사용을 명시한다. 4670cc1은 수동 선택 후 실제 RAF 프레임의 대상 변경을 기다리도록 검사 순서를 수정했다. 4670cc1의 실행 앱은 7120c14와 동일했다. 최종8a975b3은 세로 전체화면에서 출구 차량을 따라 카메라 시선을 회전시키고, 그 구간의 동적 프레이밍 검사와 v0.9의 표시 자막 선택자 검사를 보완했다.
- 최종 보고·증거 commit은 위 실행 commit의 후속 documentation-only commit이다. ZIP의 SHA를 최종 보고 commit과 혼동하지 않는다.
- 기존 검증 v0.9 `a157afa17705c3fa837e294e01638157eeb60f9d`를 성능 비교 기준으로 별도 빌드했다.

Canonical main/Production/Sites/D1/Migration/Credit/Wallet/Ledger/AI Provider/실제 시즌·시장·방송 변경 **0건**. 이번 작업은 Production 상태를 조회하지 않았다. v97/환경66/0020/v10/AI OFF/MAINTENANCE는 마지막 사용자 보고값이며 새 실측값이 아니다.

## 2. Gate 판정

| Gate | 결과 | 근거 / 한계 |
|---|---|---|
| A — v0.10 엔진 | **PASS** | bounded wormhole, 40,000경기 full-frame 감사, 기존v1~v9 및1/3/5/10/15/30랩 회귀. Hyper 단독 조건부 KPI는 아래 미달값 그대로 보고 |
| B — 방송·UI | **PASS / BROWSER VERIFIED** | 전체 지속시간 대상 잠금, 수동 override/자동 복귀, entry/exit 프레이밍, R1~R3 최고 기록, v9/v10 DSQ 재시상식 |
| C — 통합 | **PARTIAL** | Linux+Windows 실제 Chromium 기능/CI/정확한 ZIP PASS. 소프트웨어30FPS FAIL; Windows 하드웨어 GPU 및 실제 모바일OS NOT VERIFIED; 장기Heap상한 미검증 |
| D — Phase 3 설계 | **PASS — 문서만** | 도메인/DB/API/상태/공개/정산/개발순서/승인 게이트. 실제 운영 구현0 |

**최종 Actions run41974491149는 success**: Linux job127070086611, Windows job127077393034 모두 success. CI 기능 검증 성공과 안정적30FPS 성공은 다르다. 후속 격리 Phase3-A 설계 준비는 GO, Production·공개 방송·실제 Credit 운영은 NO-GO.

## 3. Hyper 규칙과 Gold 보존

공식 버전은 `galactic-racing-0.10.0`. 기존 v0.1~v0.9 실행기·Golden·기록을 덮어쓰지 않았다. 새 namespace 때문에 동일 문자열 Seed의 결과가 v0.9와 다른 것은 의도된 버전 차이다.

Gold 및 발동 정책은 v0.9의 `ULTIMATE_POLICY`를 그대로 참조한다. Gold 2.2–3.2×, 6–11초, 0.75초 ramp, 기존 감속 저항, 선수당 최대 1회, 경기당 최대 2회, 18초 발동 간격, Hyper 비중 10% 설정을 유지했다. 확률을 줄이거나 우승자를 사후 배정하지 않았다.

Hyper는 기존 3.4–4.2× 장시간 가속을 사용하지 않는다.

| 단계 | 공식/시각 계약 |
|---|---|
| Entry | 약 1초 정상 이동, 청백색 포털 접근. 지름길 이용 중이면 정상 합류까지 대기 |
| Transit | 도약 직전 0.5초의 광선/숨김 연출. 공식 위치는 Tick 경계까지 정상 진행 |
| Jump / Exit | 해당 Tick의 정상 이동 후 1랩의 10–20% 공식 거리 증가. 0.5초 출구 효과 |
| Afterburn | 1.8–2.2× 후속 가속 3초. 이후 정상 주행 |
| 안전 종료 | 지름길 대기 최대 8초, 일반 완주/리타이어 시 기록된 취소·종료 정책. 무제한 대기 가속 없음 |

3.6km 기본 트랙의 요청 도약량은 360–720m다. 결승선을 넘는 경우 트랙 끝에서 clamp하고 정확한 해당 Tick으로 완주 처리한다. 그 Tick의 일반 이동 중 랩 경계를 지났다면 일반 이동 보간 시각을, 도약으로 경계를 넘었다면 도약 Tick 시각을 사용한다. 랩 수나 순위를 나중에 보정하지 않는다.

`ProgressJump`를 일반 이동과 분리해 기록한다. 도약 직전 프레임은 `from`, 도약 Tick부터 `to`다. 일반 보간으로 두 지점을 가로질러 차량을 날리지 않는다. 카메라는 진입 중 실제 선수를 따라가 포털 접근을 보여준 뒤 공식 도약 순간 출구 포털로 의도된 컷을 한다. 과거 시청 순서에 따른 누적 카메라 상태를 쓰지 않는다.

공식 metadata: 선수, 유형, 시작/종료 Tick, 진입 진행거리, 요청·실제 도약거리, 도약 전후 진행거리, 도약 Tick, 후속 가속 시작·종료/파워, 취소 여부, 실제 동일-step 추가 이동량. 시각효과는 이 기록과 재생 시각으로 계산한다. 두 포털과 12개 스트릭을 재사용하며 효과 자체 RAF/광원/후처리는 추가하지 않았다. reduced-motion에서는 스트릭과 과도한 반짝임을 줄인다.

## 4. 40,000경기 결과

Seed `10rw-0..39999`, 기본 10랩. 전체 프레임을 순회한 로컬 감사와 CI run41968816248의 Linux job이 동일 결과를 냈다. 반복 실행을 추가 표본으로 합산하지 않는다. 최종 UI-only CI는 `lib/racing`의 Git tree와 생성 스크립트가 이 감사 SHA와 동일한지 확인하고, 고정 SHA-256의 감사 원본을 재사용한다. 엔진이나 스크립트가 달라지면 이 게이트는 실패하며 새 40,000회 검증이 필요하다. 원본과 provenance를 저장해 Actions 보존기간 만료에 의존하지 않는다. 원본 집계는 `evidence/phase2d-v010-balance.json`.

### 조건부 KPI

분모는 **발동 직전 P5~P8, 자기 진행률 35~80%, 잔여 2랩 이상, RACING 상태에서 실제 발동한 사례**다. 최종 공식 DSQ 재분류를 포함하며 DSQ 포디움/우승은 실패로 센다. 임의 선수의 기본 우승 확률이 아니다.

| 집계 | 표본 | 최종 포디움 | 최종 우승 | 평균 최종 순위 상승 |
|---|---:|---:|---:|---:|
| v0.9 이전 전체 조건부 | 51,270 | 82.9881% | 47.4664% | 4.6077 |
| v0.10 전체 조건부 | 50,972 | 79.2494% | 43.8849% | 4.4292 |
| v0.10 Gold 조건부 | 45,713 | 81.4014% | 46.5994% | 4.5378 |
| v0.10 Hyper 조건부 | 5,259 | 60.5438% | 20.2890% | 3.4849 |

전체 조건부 포디움 40,395건, 우승 22,369건, 공식 DSQ 388건 포함. 전체는 종전 70–90% / 40–60% 목표 범위다. **Hyper 단독은 그 범위 미달**이며 Gold보다 큰 승률을 보장하지 않는다. 이번 목표인 과도한 장거리 이득 제한을 위해 Gold나 전체 발동률을 바꾸어 수치를 맞추지 않았다.

전체 단순 Wilson 95% 구간: 포디움 78.8951–79.5992%, 우승 43.4545–44.3161%. 한 경기의 발동 사례들은 상관될 수 있으므로 군집 보정 또는 인과적 효과 추정이 아니다. v0.9와는 namespace/표본이 달라 직접 짝지은 반사실 비교가 아니다.

### 발동·경기 통계

- 총 58,466회, 평균 **1.46165회/경기**. 0/1/2회 경기: **4,568 / 12,398 / 23,034** (11.42% / 30.995% / 57.585%). 최소 1회 발동은 88.58%다. 선수별 제한은 있으나 경기 전체 기준으로 극히 드문 이벤트라고 표현하지 않는다.
- Gold 52,452회, Hyper 6,014회(**10.2863%**). 이전 v0.9 평균 1.466475회, Hyper10.2695%와 유사하다.
- 발동 당시 P1~P8 수: 247 / 784 / 2,110 / 4,353 / 7,434 / 11,268 / 15,717 / 16,553. 이는 기회당 확률이 아닌 순위별 관측 건수다.
- 모든 Gold 발동자: 포디움83.2780%, 우승50.3641%. 모든 Hyper 발동자: 포디움64.5328%, 우승24.4762%.
- 궁극기 없이 우승 **30.2775%** (v0.9 25.8425%). 성공 지름길과 같은 선수/시간에 겹친 궁극기 19,468회.
- 평균 본경기 **361.8328초**, p05/중앙/p95=355.5/361.75/369초, 범위348–381.5초. 평균 선두 변경32.5776회.
- 일반 DNF11,714건(참가320,000건 대비3.6606%), 일반 DSQ3,442건(참가 대비1.0756%). 일반 탈락 최대2명 규칙 유지. 특별 DSQ423/40,000=**1.0575%**. 특별 DSQ는 별도 규칙이다.
- 완주 랩/마지막 랩 시각 오류0, 예선 24기록·라운드 순서 오류0.

| 출발 그리드 | v0.9 우승률 | v0.10 우승률 |
|---|---:|---:|
| P1 |12.0950%|12.3350%|
| P2 |12.4000%|12.5675%|
| P3 |12.5975%|12.7000%|
| P4 |12.3975%|12.2200%|
| P5 |12.1850%|12.6525%|
| P6 |12.6025%|12.4600%|
| P7 |12.8475%|12.7400%|
| P8 |12.8750%|12.3250%|

선수 ID별 우승률 12.1325–12.7475%, 기본 능력치는 동일하다.

### 실제 도약·선두 격차 감사

- Hyper6,014건 중 실제 도약6,012건, 안전 취소2건.
- 실제 도약 평균539.7802m, 최대**719.86m**. 평균에는 취소0m가 포함된다.
- 후속 가속의 동일-step 추가 물리 이동 평균286.5066m, 최대376.61m. 같은 step의 비가속 이동과 비교한 값이며, 다른 선수의 후속 행동까지 다시 계산한 반사실 경기 결과가 아니다.
- 지름길의 짧은 경로까지 고려한 **도약+후속 가속 추가 이득 보수적 상한 최대1,199.42m**. 1랩3,600m 미만, 한도 위반0.
- 모든 Hyper의 발동~종료 사이 Tick을 직접 순회: 실제 최대 선두 격차 **1,292.63m**, 한 바퀴 이상 선행한 발동 사례 **0건**. 비교 대상은 다른 RACING/FINISHED 선수이며 DNF/DSQ는 제외했다. 이 관측은 모든 가능한 Seed나 종료 후 장기 사고 상황의 수학적 보장이 아니다.
- 효과 중 총 이동(정상 이동 포함) 최대2,190.06m. 이것을 궁극기 순이득이라고 부르지 않는다.
- 효과 종료 직후 평균 순위 상승 Hyper4.2258계단; 최종까지 일부 재추월/탈락이 발생해 최종 평균은3.2388계단(전체 Hyper)이다.

## 5. 방송·결과표 계약

완전 자동 상태에서 Gold/Hyper의 공식 시작부터 종료까지 해당 선수 잠금. 매 프레임 경쟁 후보를 다시 평가하지 않고 기존 선수별 사전 계산 카메라 계획을 사용한다. Gold/afterburn은 후방·정면·TV 등을 전환할 수 있고 Hyper 진입·출구는 전용 컷이다. **대상 잠금은 카메라 위치 잠금이 아니다.**

수동 선수 선택은 잠금보다 우선한다. `/` 또는 AUTO 복귀 시 활성 궁극기를 즉시 선택한다. 종료/DNF/DSQ/완주로 실제 활성 구간이 끝나면 해제된다. 가상 동시 발동에서는 먼저 시작한 발동, 같은 Tick이면 stable ID 순으로 결정한다. 모든 판단은 공식 재생 시각 기반이며 Seek로 복원된다. 2,012개의 반-Tick 잠금/수동/Seek 표본과 실제 브라우저 동적 기록으로 검증한다.

결과표는 `순위 | 선수 | R1 | R2 | R3`만 표시한다. 별도 BEST 열을 삭제했다. 현재 시각까지 완료된 유효 기록 중 최솟값인 **해당 셀을 노란색 굵은 글씨**로 표시한다. 동률 최고 기록은 모두 강조한다. 미래 기록은`—`, 무효는`무효`; 무효는 최고 기록에서 제외한다. 중앙/모바일은 동일한 컴포넌트·공식 기록을 사용한다. R1→R2→R3의 강조 이동과 미래 비공개를 확인했다.

## 6. 특별 DSQ / 기존 기록

v0.9 `9ru-59`를 기존 엔진으로 다시 빌드해 실제 브라우저 검증했다. 추가로 원본 a157afa detached worktree와 새 브랜치에서 `9ru-2`, `9ru-7`, `9ru-59`의 전체 meeting JSON(프레임·예선·이벤트·랩·공식 결과 포함)을 각각 생성했고 세 SHA-256이 모두 일치했다. 증거: `evidence/phase2d-v010-v9-preserved-cases.json`. v0.10은 `10rw-14`로 별도 검증한다. DSQ 규칙/포디엄 로직은 재구현하지 않았다.

시상식 상대 시각: 잠정 포디엄 →30초 조사 알림 →34초 증거 →40초 재분류 →44초 재등장 →74초 최종 시상식. 특별 DSQ 선수0점, 재분류 이후 화면/공식 순위 일치, 발표 이전 이유 비노출, Seek전후 복원을 검사했다. 360px·390px·desktop·fullscreen 캡처와 실제 포디엄 이동 기록을 보존했다.

**보안 범위:** 로컬 데모 전체 JSON에는 미래 결과·DSQ가 들어 있다. 화면의 조기 노출 방지만 검증한 것이며 최초 공개 서비스의 비밀성은 아직 구현되지 않았다. Phase 3의 서버 구간별 공개가 필수다.

## 7. 구현 책임

| 파일 | 역할 |
|---|---|
| `lib/racing/v10/ultimate.ts`, `simulator.ts` | 새 namespace, Gold 정책 재사용, bounded jump와 후속 가속, 종료 기록 |
| `lib/racing/travel.ts`, `integrator.ts`, `playback.ts` | 명시적 불연속 이동, 일반 이동/도약 경계 시각, 안전한 보간 |
| `lib/racing/v6/lap-times.ts`, `simulator.ts` | 선택적인 travel wrapper 및 lap crossing; 기존 버전 hook 없을 때 동작 유지 |
| `lib/racing/v10/presentation.ts`, `v2/playback.ts` | 순수 재생 시각 기반 Ultimate 대상 잠금, 기존 자동 각도 재사용 |
| `wormhole-effects.ts`, `scene.ts`, `ultimate-banner.tsx` | 재사용 포털/스트릭, entry/exit 컷, 차량 숨김·복귀, phase 안내 |
| `qualifying-panel.tsx` | BEST 제거, 완료된 최고 유효 기록의 직접 강조 |
| `race-worker.ts`, `build-watch.mjs`, `serve-watch-v10.mjs` | 격리 v10 경기 생성·예제·실행 SHA·Windows 패키지 |
| 테스트·benchmark·전용 workflow | 역사 회귀,40k,실제 브라우저/Windows/리소스/ZIP 검증 |

트랙 길이·구조, Gold FX, 프로필·LOCAL DEMO ADMIN, 10랩/2열 그리드/프리쇼/운영 시간 계약은 그대로다. 신규 Migration 파일0개.

## 8. 실행한 테스트와 브라우저 범위

각 실행 범위와 실패 이력을 구분해 기록한다.

- 기존 v0.1~v0.9 Golden/결정론/기록 해시, 플레이어·코너·TV·방송·프로필·시상식·단일 RAF 회귀 18개 suite + 새 v10 suite를 실행했다.
- v10 상세: 100 full/summary 쌍, 20 동일 Seed 전체 payload 재생성, 1,157,128 일반 이동 구간, 15 도약 및 지름길 합류 대기 사례, 2,012 잠금/수동/Seek 표본. 1/3/5/10/15/30랩 각각 3 Seed(18경기) 추가 검사.
- 임의 주입한 결승선 도약도 실제 integrator/lapRecorder/renderer frameAt 경로에서 8명의 마지막 랩과 finishMs가 일치했다. 이는 경계 테스트이며 밸런스 표본에는 넣지 않았다.
- v0.9의 20개 frozen official-payload 해시와 기존 버전 suites를 유지했다. `lib/racing/v9/`, `drizzle/`, `lib/credit/`, `app/api/assistant/`는 시작 commit 대비 변경0.
- TypeScript / Lint / application Build / standalone v9·v10 Build / diff-check 실행. 기존 무관한 AI 테스트의 unused `debit` Lint warning과 standalone Vite chunk-size advisory는 남아 있다.
- 현재 로컬 호스트의 Chromium156은 process-singleton socket 생성 권한 오류로 실행 BLOCKED였다. 해당 제한을 우회하지 않고 GitHub의 격리 Linux/Windows 러너에서 실제 브라우저를 실행했다.

첫 candidate(c2b3818)의 Linux 테스트는 통과했으나, 실제 이미지를 직접 검사하면서 Hyper 진입 카메라가 미래 포털을 너무 일찍 바라봐 발동 선수가 화면 뒤로 벗어나는 결함을 찾았다. 312a449에서 진입/Transit 동안 실제 선수 위치 기반으로 촬영하고 도약 때만 출구로 컷한다. 진입/출구의 실제 선수 화면 좌표를 검사하는 브라우저 assertion을 추가했다. 이 수정은 physics/Seed 결과를 변경하지 않는다.

첫 Windows candidate에서 실행 SHA/점유 포트 차단/대체 포트 검사는 통과했지만 Hyper 동적 표본 수가 부족해 UI 검사가 실패했다. 이 결과는 PASS로 세지 않는다. 최종 harness는 여러 번의 프로세스 간 조회 대신 실제 `data-pose` 갱신을 브라우저 안에서 원자적으로 관찰한다. 궁극기 종료까지 실제 시간으로 재생하고 프레임/대상/phase를 함께 기록한다. Seed나 브라우저 시간을 조작하지 않는다.

추가로 7120c14의 CI는 수동 선택 키 입력 직후 RAF의 대상 업데이트 전에 단언해 실패했다. 1~8 키의 기존 검증처럼 실제 렌더 대상이 바뀔 때까지 제한 시간 내 기다리도록 4670cc1에서 통일했다. 대상이 바뀌지 않으면 여전히 실패하며, 엔진/카메라 동작을 테스트에 맞추어 변경하지 않았다.

4670cc1의 v0.10 Chromium 검사는 세 뷰포트 모두 PASS였으나, 뒤이어 실행한 v0.9 검사에서 숨겨진 모바일용 자막까지 두 개를 선택하는 strict-locator 오류가 있었다. 8a975b3에서 실제 표시 자막만 선택하도록 수정했다. 시각 검토에서 세로 전체화면의 출구 선수가 오른쪽 가장자리로 밀리는 것도 발견해, 출구 포털 옆의 고정 카메라가 재등장한 선수를 향해 회전하도록 수정하고 실제 exit 프레임의 화면 좌표 검사를 추가했다. 공식 엔진·경기 결과 변경은 없다.

모바일 16:9 영상의 공간 부족으로 기존 안내 배너가 차량 일부를 가리는 문제도 실제 캡처에서 확인했다. 최종 빌드는 일반 모바일 화면에서 자막을 영상 바로 아래로 옮기고, 모바일 전체화면에서는 상단의 별도 공간을 사용한다. 선수 이름·유형·순위 상승 안내를 유지하며, 자막이 영상과 겹치지 않는지 검사한다.

최종 실행8a975b3의 Linux Chromium156.0.8078.4 / SwiftShader: **1440×900,390×844,360×800 모두 PASS**. 각 화면의 native fullscreen/큰 HUD, 수동1~8·`/`, 재생/정지 Seek, profile/ESC/저장, 연속 전환, reduced-motion, 외부 요청0을 확인했다. 동일 빌드의 v0.9 `9ru-59` 재시상식도 세 뷰포트 모두 PASS다.

실제 v0.10 렌더 프레임 중 활성 구간 표본: Gold497개, Hyper339개, 잘못된 촬영 대상0개. Gold 중 다른 선수의 LEAD/BOOST/지름길 이벤트8건, Hyper 중 BOOST/MINOR/지름길 등7건이 있어도 잠금을 유지했다. Hyper는 entry/transit/exit/afterburn 모두 실제 관측했다. 별도 fullscreen exit25프레임에서 선수 중심의 수평 좌표가 화면 중앙에 유지됐다. 원시 motion JSON은 캡처 artifact에, 요약은 `evidence/phase2d-v010-linux-browser.json`에 있다. 특정 Seed 표본이며 전 Seed에 대한 브라우저 전수검사는 아니다.

Windows 최종 결과: **PASS**. Windows runner의 실제 설치 Chrome156.0.8078.80 / SwiftShader로 세 뷰포트·fullscreen·큰 HUD·실제 동적 궁극기 잠금·수동/자동 전환·DSQ·프로필·연속 전환을 실행했다. 외부 요청0, 브라우저 오류0. SHA/기본포트 충돌 차단/대체포트 검사도 PASS. `evidence/phase2d-v010-windows-browser.json`, [Windows 캡처·motion·영상](https://github.com/darkkyoung/Holocron/actions/runs/41974491149/artifacts/13392038651). 다운로드 로그에서도 동일 ZIP의SHA-256`a71569520de56cf2282022c7a67c49ec83cf3106565dadae5f1104c36e908551`이 확인됐다.

수정 후 실제 PNG를 직접 확인했다: desktop entry/exit, 세로 fullscreen exit,360px R3 결과표, desktop/mobile DSQ 재시상식. 모바일 일반 화면의 자막은 영상 밖에 있으며, 세로 전체화면에서는 상단 자막과 차량이 겹치지 않는다. 데스크톱 실제 QA 영상은55.12초/1440×900/VP9다.

동적 검증은 실제 WebGL 렌더링의 pose/target/phase 기록과 브라우저 WebM이다. 합성 이미지가 아니다. 연속 방송은 각 구간 종료 callback을 실제로 통과시켜 확인했으며, 전체 예선부터 시상식까지 단 한 번의 무중단1× 녹화라고 주장하지 않는다. 모바일은 Chromium viewport/touch 에뮬레이션이지 실제 Android/iOS 기기 테스트가 아니다. 영상25fps 인코딩은 3D 렌더링 FPS 측정과 다르다.

## 9. 성능과 리소스

Linux Xvfb headed Chromium156.0.8078.4, **ANGLE SwiftShader 소프트웨어 WebGL**. 일반 canvas1023×575, native fullscreen1440×900. 장면마다8초 실제 draw-frame 표본, v0.9 a157afa와 최종v0.10을 같은 runner에서 측정했다. 단일 RAF·30FPS 상한·HUD5Hz 계약은 회귀 PASS지만, **이 소프트웨어 환경의 안정적인30FPS는 FAIL**이다. Windows 하드웨어 GPU30FPS는 **NOT VERIFIED**다. CI의 기능/자원 검사가 성공한 것을30FPS 성공이라고 표현하지 않는다.

| 장면 | v0.9 평균FPS | v0.10 평균FPS | 차이 |
|---|---:|---:|---:|
|normal-corner|15.23|13.05|-14.3%|
|ultimate|14.81|14.16|-4.4%|
|fullscreen-large|9.74|9.53|-2.1%|

장면 이름은 같지만 버전/Seed/카메라 구간이 다르므로 순수한 코드 비용만 분리한 인과 비교가 아니다. 특히 normal-corner의 저하는 실제 측정값으로 남기며 무시하지 않는다. 실제 지원 GPU에서 동일 해상도·Seed·카메라 구간의 추가 측정이 필요하다.

| 최종 장면 | 평균/중앙/하위5% FPS | 프레임 p50/p95/p99 ms | >50ms | draw/triangles 중앙값 | main-thread ms/s |
|---|---:|---:|---:|---:|---:|
|preshow-grid|17.50/17.67/11.48|56.6/87.1/112.2|89.21%|100/9018|51.37|
|start-8|14.90/16.78/10.81|59.6/92.5/110.3|94.92%|33/8036|74.42|
|normal-corner|13.05/14.16/9.78|70.6/102.2/114.0|95.19%|62/8318|63.55|
|draft-boost|14.88/16.45/10.45|60.8/95.7/108.6|94.12%|17/7948|55.82|
|ultimate|14.16/15.53/10.55|64.4/94.8/98.8|96.40%|69/8030|64.30|
|incident|14.80/16.50/10.85|60.6/92.2/95.8|99.15%|17/7948|52.28|
|auto-cuts|14.30/15.80/10.74|63.3/93.1/110.7|96.49%|58/7502|66.53|
|manual-side|14.37/16.13/10.45|62.0/95.7/99.0|94.74%|34/8132|48.53|
|last-lap|16.31/17.51/11.20|57.1/89.3/94.0|80.77%|25/6992|51.22|
|finisher-spotlight|14.48/16.05/10.89|62.3/91.8/98.3|97.39%|49/9934|47.18|
|fullscreen-large|9.53/9.59/6.58|104.3/151.9/179.2|93.33%|43/8134|40.04|
|branch-route|14.63/16.21/10.55|61.7/94.8/106.9|97.39%|52/8326|61.79|
|qualifying-overlap|14.72/16.56/11.03|60.4/90.7/117.7|95.73%|49/7434|49.19|
|qualifying-results|15.13/16.98/11.19|58.9/89.4/114.2|95.04%|100/9018|56.87|
|trackside-pan|13.97/15.36/10.11|65.1/98.9/124.3|93.69%|53/8340|65.29|
|hyper-entry|14.88/16.34/10.35|61.2/96.6/99.2|97.46%|50/8012|65.48|
|hyper-exit|14.36/15.70/10.45|63.7/95.7/104.0|98.25%|32/8012|60.69|
|podium-celebration|25.23/25.45/19.65|39.3/50.9/65.8|5.97%|21/292|56.89|
|special-dsq|25.54/25.91/20.96|38.6/47.7/60.5|3.92%|19/164|57.27|

Hyper entry/exit 행은 해당 효과 전후를 포함한8초 창이다. 원본 JSON의`phaseSamples`에는 실제 entry/transit/exit/afterburn 내부의 별도 표본 수와p50/p95/p99가 있다. 짧은 phase 표본만으로 안정적FPS를 보장하지 않는다. 전체 >33.3ms 비율/CPU script 시간/heap/renderer도 `evidence/phase2d-v010-performance.json`에 보존했다.

반복 재생: before120초, after360초 실제 재생; after12회 경기 교체. 모든 교체 후 live WebGL context1, canvas1, badge8, 동일 시작 장면 buffers358/textures12가 유지되고 이전 context는 해제/수거됐다. GPU 자원 누적 검사는 PASS다.

GC 후 JS Heap: 시작13.200MiB →120초15.283MiB →360초15.881MiB. 초기 warm-up 이후에도0.598MiB 증가했으므로 장기 무누수를 보장하지 않는다. 원본 경기 JSON1,683,955bytes는 파일 저장량이며 Heap 수치와 별개다. 6분 검사는 Seek와 경기 교체를 포함하며 단일 경기 무중단1× 전체 관람과 구분한다.


## 10. Windows ZIP / 실제 증거

- 실행 코드 **`8a975b3fc28f0ec6b78f47ae405734db1b00d1e1`**, simulator`galactic-racing-0.10.0`, build-info dirty=false. 기본Seed10rw-8/본경기358.25초.
- [최종 Actions run](https://github.com/darkkyoung/Holocron/actions/runs/41974491149).
- [정확한 Windows 데모 artifact](https://github.com/darkkyoung/Holocron/actions/runs/41974491149/artifacts/13391374254): **574,975bytes**. 재압축하지 않고 `Galactic-Racing-v0.10-8a975b3-Windows.zip`으로 전달한다.
- Artifact digest와 직접 다운로드 bytes SHA-256 모두 **`a71569520de56cf2282022c7a67c49ec83cf3106565dadae5f1104c36e908551`**.
- [실제 Chromium 캡처·motion JSON·영상](https://github.com/darkkyoung/Holocron/actions/runs/41974491149/artifacts/13390903937): SHA-256`947b5ed320e699a8bd9e36353f663c48bba94200eeed6ad0197d39b9254f6ac5`,49,224,113bytes. v9/v10 증거가 각각 별도 폴더에 있다.
- [성능 원본 artifact](https://github.com/darkkyoung/Holocron/actions/runs/41974491149/artifacts/13391394205): SHA-256`737e07f435b220c15568341e08385c339bf9915bf34c7da2ae3f99f0281280c0`.
- GitHub artifact 보존기간은2026-12-05까지다. 전달 ZIP은 같은 원본 bytes다. 원본 실행/결과 해시와 SHA-256 목록은`evidence/phase2d-v010-delivery.json`에 보존한다.

실행: **전체 압축을 새 폴더에 해제 → `START-RACING.bat` 실행 → 상단v0.10/8a975b3 확인**. 기본43874포트가 이미 사용 중이면 기존 서버를 열거나 종료하지 않고 실패한다. 같은 폴더의 터미널에서 `START-RACING.bat -Port 43875`로 새 포트를 사용한다. Node/npm 설치는 필요 없다.

기본10rw-8에는 Gold와Hyper가 모두 있다. 로컬 경기 설정의10rw-1은 Gold 역전,10rw-8/10은Hyper 사례다. 특별DSQ버튼은10rw-14를 사용한다. 영상 아래 개발자 성능 패널에서30초 이상 관람 후JSON을 받을 수 있다. 실제 하드웨어 확인은 일반/전체화면 각각 canvas 해상도·GPU·FPS를 함께 제출해야 한다.

Windows CI는 제공 artifact의`serve-demo.ps1`을 실행해 SHA·포트·대체 포트를 검사하고, 동일 추출 디렉터리를 실제 Chrome으로 렌더링한다. BAT는 동일 서버를 호출하는 포함된 진입점이다. 사용자의 실물PC에서 탐색기 더블클릭/OS 보안 정책까지 직접 조작한 것은 아니다.

## 11. Phase 3 설계 결과와 남은 조건

- [아키텍처](9R_PHASE3_ARCHITECTURE.md): immutable 시즌/경기/엔진/트랙/로스터, CAS 상태전이·lease·멱등성, 재추첨 방지, 구간별 공개와 DSQ 비밀성, server clock/재접속, Account 예측·정산, DB/API 초안, backup/rollback 계약.
- [구현 순서](9R_PHASE3_IMPLEMENTATION_PLAN.md): 3-A 데이터·도메인 →3-B 관리자 →3-C 서버 방송 →3-D Credit 예측. 각 단계 의존성·실패 주입 테스트·승인 게이트.
- 20:00/20:55/20:58/21:00 KST는 고정. Cron은 깨우기 수단이며 시작 시각을 결정하지 않는다. 수동 예선 대기는 본경기 출발·예측 마감을 바꾸지 못한다.
- 구 문서의 ‘21시 Seed 생성’과 사전 비공개 생성 준비의 충돌은 숨기지 않았다. 분리된 예선/본경기 entropy와20:55 이후 sealed generation 제안을 적었으며, 실제 구현 전 정책 승인 및 독립 entropy 선택이 필요하다.
- 기존 `race_stake/race_payout` enum만으로 정산이 완성되지 않는다. 현재 Assistant 전용 refund-headroom, cap/sequence 소진, 기존 환불 책임과 Racing 책임의 합산을 해결하기 전 시장을 열 수 없다.
- 실제 Production Migration Journal/Trigger/FK/CHECK·승인된 백업 원본이 재확인되지 않았다. branch의0022/v12를 Production 설치 증거로 사용하지 않는다. Migration 번호·backup새버전도 실제 baseline 확인 후 결정한다.
- 약관·연령·관할 법적 검토, 정산 경제정책, 서버 권한/비밀 저장소·감사 운영은 후속 승인 대상이다.

**Phase 3-A 격리 구현의 설계 준비는 가능하지만, Production·실거래·공개 방송은 NO-GO다.** 이번 작업에서 어떤 Phase 3 운영 코드·DB·Credit도 실행하지 않았다.
