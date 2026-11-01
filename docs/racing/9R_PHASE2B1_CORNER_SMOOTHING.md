# Galactic Racing Phase 2-B.1 — 코너 방향 및 추적 카메라 안정화

**상태:** 로컬 구현·회귀·Chromium·Windows 실행기 PASS / 실제 Windows 사용자 GPU 관람 확인 대기. Production 미배포.

## 소스 경계

- 시작 브랜치: `feature/galactic-racing-phase2b-shortcut-qualifying`
- 시작 코드: `017270506fbd313b1b4258943710d95aff421e1b`
- 최종 실행 코드·Windows ZIP: `af6b71c7e406c95f099e451c32ce30899db7b162`
- 수정 브랜치: `fix/galactic-racing-phase2b1-corner-smoothing`
- 시뮬레이터: `galactic-racing-0.5.0` 그대로. v0.1~v0.4 Golden 및 v0.5 Seed·결과·이벤트·진입 확률·250ms Tick 변경 없음.
- main `93646c066aaf8a33f1a7c062f8404dd7cd7b211e` 및 Production, D1, Migration, Credit, AI 호출 변경 0.

## 원인과 수정

v0.5는 본선 601점 및 지름길 161점의 고정된 샘플을 직선으로 연결해 `routePoint()`에서 현재 구간의 두 점으로 차량·카메라 방향을 계산했다. 본선의 특정 고곡률 코너에서 직선 구간이 바뀌는 순간 계산된 헤딩이 최대 23.986° 달라져 차량 회전·추적 카메라 떨림을 유발할 수 있었다.

`lib/racing/v5/track.ts`의 **렌더링 경로만** 다음처럼 수정했다.

- 메인 도로와 분기 도로에 사전 계산한 정점 접선을 사용하여 cubic Hermite 위치·미분을 평가. 각 샘플을 정확히 통과하고 모든 샘플 경계에서 위치와 방향이 C1 연속.
- 닫힌 본선 시작/끝의 접선 일치.
- 분기 진입·합류 접선을 본선 방향에 맞춤. 기존 단축 경로 비율을 고려해 **물리적 순간 속도**에도 큰 불연속이 생기지 않도록 경계 접선 크기를 조절.
- 차량의 회전과 자동/수동 추적 카메라는 기존 `spatialPointInto()` 경로로 동일한 부드러운 접선을 사용.
- 추가 게임 상태, 신규 PRNG, 매 프레임 배열 할당, 이벤트 재생성 없음. v0.5의 거리 보너스 제거·경로 분기 규칙은 그대로.

## 정량 검증

전용 `scripts/test-racing-corner-smoothing.mjs`는 모든 본선·분기 샘플의 경계 양측과 경로 이탈, 합류 방향을 검사한다.

| 항목 | 결과 |
| --- | --- |
| 기존 인접 본선 샘플 최대 방향 차이 | **23.986°** |
| 수정 후 본선의 샘플 경계 근접 방향 차이 | **최대 0.0063°** |
| 수정 후 분기 샘플 경계 근접 방향 차이 | **최대 0.0006°** |
| 기존 폴리라인 대비 본선 위치 차이 | **최대 0.1206 렌더 단위** |
| 기존 분기 경로 대비 위치 차이 | **최대 0.0099 렌더 단위** |
| 분기 진입·합류 | 위치·접선·물리 속도 연속성 PASS |
| v0.5 Seed 결과 | 동일 입력에 결과·이벤트·shortcutPassages 재현 PASS |

수정 코드는 `scripts/racing/screenshot-v5.mjs`로 1440×900, 390×844, 360×800의 실제 Chromium WebGL에서 고곡률 코너 **진입·정점·탈출**을 각각 캡처했다. 총 91개 ZIP 항목(90 PNG + 브라우저 리포트)이 있다.

최종 GitHub Actions: https://github.com/darkkyoung/Holocron/actions/runs/41277832878

- Historical v0.1~v0.4, v0.5 회귀·렌더 클록·Phase 1 UI / polish PASS.
- TypeScript, Lint, Build, standalone Vite, diff-check PASS (기존 비관련 Lint 경고가 발생할 수 있음).
- 3개 Chromium 뷰포트: WebGL, 예선/본경기/시상식/특별 DSQ/수동 진행/분기 진입·합류/카메라/전체화면 PASS.
- Windows PowerShell 실행기: 실행 코드 SHA, 2-B.1 식별 표시, 점유 포트 차단 및 대체 포트 PASS.
- `galactic-racing-phase2b1-corner-demo`와 `galactic-racing-phase2b1-corner-screenshots`가 동일 Actions run에서 생성됐다.

## 사용자 검수

다운로드 ZIP을 **새 폴더**에 풀고 `START-RACING.bat` 실행, 또는 `START-RACING.bat -Port 43875`로 포트 분리. 상단 빌드 식별은 `PHASE 2-B.1 · CORNER SMOOTHING` / SHA `af6b71c7...`, 시뮬레이터 `v0.5`.

수동 카메라로 레이서 한 명을 추적해 **일반 코너, 가장 급한 헤어핀, 분기 진입·합류**를 1×로 관람한다. 자동 카메라도 관람하고 코너에서 방향이 튀는지 확인한다. 30FPS 개발자 패널은 기존 기능을 유지하며, 실제 Windows GPU의 새로운 빌드 FPS는 사용자 측 실측 전까지 **NOT VERIFIED**다. 단순 정지 이미지·방향 수치 테스트는 실제 시간 흐름의 모든 화면 떨림을 입증하지 않는다. 충돌 시 `DAMAGED`/일부 `STOPPED` 상태에서 의도적인 차량 흔들림 효과는 그대로 유지된다.

시뮬레이터 로직을 변경하지 않았으므로 새로운 40,000회 밸런스 분석을 수행하지 않았다. Phase 2-C(10랩·차량 속도·그리드·프리쇼)는 미시작이다. 사용자가 코너 주행과 FPS를 확인한 후 다음 Phase GO를 판단한다.
