# Galactic Racing Phase 2-A 실측 및 전달 기록

## 소스와 범위

- 시작: `fb600e51d9c8022b82f867511d915793770d9a9a` / Tree `988b51fb946baed708fa7bb1579774fd47568792`.
- 데모 실행 코드: `0ec46413dbd4fad2a8f7af9fb43997c355a17e5e` / Tree `a34af7e831032840d7b10d0d6c9bfbca48649972`.
- 작업 브랜치: `feature/galactic-racing-phase2a-performance`. main `93646c066aaf8a33f1a7c062f8404dd7cd7b211e` 보존.
- 최종 보고·증거 전용 커밋은 실행 코드 이후다. 실행 파일 변경은 없다. ZIP 내부 `build-info.json`은 실제 CI 빌드 SHA를 표시한다.
- 시뮬레이터 `galactic-racing-0.4.0`, 250ms Tick, 결과·이벤트·Seed 불변. Production, Sites 게시, DB, Migration, Credit, AI 호출 모두 0건.

## 실측 환경과 해석

- Linux Xvfb headed Chromium / software SwiftShader; NOT hardware Windows GPU; Chromium 156.0.8078.4; 1440×900, DPR 1.
- 같은 브라우저 프로세스에서 고정 Phase 1 빌드와 후보 빌드를 순서대로 측정. 장면별 1.2초 워밍업 + 8초 샘플.
- FPS는 WebGL 렌더 제출 간격이다. 디스플레이 패널 실제 표시/광학 측정이 아니다. p05 FPS는 프레임 간격 p95의 역수.
- 33.3ms 초과율은 요청된 원시 지표다. 정상 30FPS 간격도 33.333ms이므로 이 비율 자체를 프레임 손실률이라고 해석하지 않는다. 50ms 초과율을 함께 제공한다.
- CPU는 CDP 메인 스레드 TaskDuration. GPU 드로콜/삼각형 수는 측정했으나 GPU 실행시간·VRAM 및 물리 Windows GPU는 NOT VERIFIED.
- 최초 headless 실측도 보존했다: `evidence/phase2a/preliminary-headless-2604ae9.json`. 개선 중 빌드에서 5.42–11.58FPS였으며 이를 숨기거나 30FPS PASS로 취급하지 않는다.
- 개선 중 9f369995 빌드의 별도 cloud Chrome 155 SVG 대체 렌더러 관찰(최종 후보 실측과 구분): 최근 900프레임 평균 28.34, 중앙값 30.03, p05 20.04FPS, 간격 p95 49.9ms. WebGL/Windows 증거가 아니다. 자동 JSON 다운로드는 cloud 도구 타임아웃으로 미확인.

## Before / After

|장면|렌더 제출 FPS 전→후|RAF 콜백/s 전→후|p50 / p95 / p99 ms 후|p05 FPS 후|Task ms/s 전→후|드로콜 전→후|>33.3 / >50ms 후|
|---|---:|---:|---:|---:|---:|---:|---:|
|start-8|12.50 → 18.29|8.12 → 18.50|53.6 / 68.1 / 90.8|14.68|108.2 → 61.2|64 → 60|97.9% / 71.2%|
|normal-corner|12.50 → 17.95|7.75 → 17.88|53.2 / 72.8 / 91.4|13.74|84.4 → 57.8|95 → 33|95.1% / 76.1%|
|draft-boost|12.50 → 18.47|13.50 → 18.50|52.9 / 67.0 / 75.0|14.93|88.4 → 59.8|56 → 46|98.0% / 76.9%|
|ultimate|12.50 → 18.15|11.62 → 18.12|52.7 / 74.6 / 104.7|13.40|81.3 → 57.9|91 → 34|93.8% / 79.9%|
|incident|12.50 → 18.36|11.50 → 18.38|52.1 / 63.6 / 69.2|15.72|83.8 → 56.3|92 → 34|99.3% / 88.4%|
|auto-cuts|12.50 → 17.44|9.62 → 18.12|54.5 / 75.5 / 94.1|13.25|79.0 → 49.9|93 → 41|97.1% / 86.3%|
|manual-side|12.50 → 18.40|16.38 → 18.75|51.7 / 77.4 / 89.5|12.92|69.5 → 57.9|28 → 24|93.2% / 81.0%|
|fullscreen-large|12.50 → 11.59|1.38 → 11.75|84.4 / 98.2 / 148.1|10.18|81.9 → 39.0|161 → 48|97.8% / 96.7%|
|qualifying-overlap|12.50 → 20.65|26.75 → 20.88|46.3 / 63.3 / 79.3|15.80|51.8 → 47.6|61 → 14|95.8% / 27.9%|

이전 80ms 타이머는 RAF보다 많은 렌더 명령을 제출할 수 있다. 기존판의 12.5 제출 FPS를 실제 표시 FPS로 간주하지 않으며, RAF 콜백도 화면에 실제 표시된 프레임 수를 직접 증명하지는 않는다.
모든 중앙값 FPS, 전후 p50/p95/p99, ScriptDuration, heap, GPU 문자열, RAF 횟수와 캔버스 픽셀 수는 원본 JSON에 보존한다.

## 반복 재생·메모리

- before: 120초; 기록 JSON 1,101,138 bytes; 최대 동시 예선 8명. GC 후 heap 최초 13,741,416, 첫 교체 14,971,960, 마지막 15,464,296 bytes.
  - 첫/마지막 교체 리소스: `{'contexts': 1, 'buffers': 1447, 'textures': 13, 'canvas': 1, 'badges': 8}` → `{'contexts': 1, 'buffers': 1447, 'textures': 13, 'canvas': 1, 'badges': 8}`.
- after: 360초; 기록 JSON 1,101,138 bytes; 최대 동시 예선 8명. GC 후 heap 최초 9,132,504, 첫 교체 10,411,644, 마지막 11,402,036 bytes.
  - 첫/마지막 교체 리소스: `{'contexts': 1, 'buffers': 256, 'textures': 12, 'canvas': 1, 'badges': 8}` → `{'contexts': 1, 'buffers': 256, 'textures': 12, 'canvas': 1, 'badges': 8}`.

- 6분 검사는 기존 3랩 기록을 반복하고 30초마다 기본/특별 DSQ 기록을 교체한 검사다. 미래 10랩 시뮬레이터 검증이라고 주장하지 않는다.
- GC 후 JS heap 증가가 관찰되었다. 워밍업·캐시·측정의 영향 가능성이 있으나 원인을 분리해 확정하지 않았다. 리소스 개수 단언 PASS가 JS heap 누수 없음이나 무한 반복 안정성을 증명하지 않는다. 원시 checkpoint를 그대로 제공한다.
- 기록 JSON/시뮬레이션 프레임 저장량은 경기 길이에 비례한다. 렌더러의 측정 이력과 테스트 관측 이력은 각각 최대 900개로 제한한다.
- 초기 이벤트 카운터 증가를 실제 GPU 누수로 확정하지 않는다. WeakRef로 다시 검사한 대조 실행에서는 이전판도 살아 있는 context 1개/texture 13개였다. Three.js 내부 fallback texture는 context 폐기 시 정리된다. 이벤트만 세는 초기 계수는 detached canvas/GC 후 과대 집계할 수 있어 실제 누수라고 단정하지 않는다. 최종 계수는 WeakRef 및 isContextLost()로 확인하고, 앱은 폐기 context를 명시적으로 해제한다.

## 실제 변경

- `render-loop.ts`: RAF 소유권, 30Hz 슬롯 기반 제한, 벽시계 보간 재생, 5Hz HUD, 숨김 탭 복귀, 고정 크기 진단. 75Hz→25FPS / 144Hz→28.8FPS / 165Hz→27.5FPS로 내려가던 상대 시각 재설정 문제도 수정. 60/75/90/120/144/165Hz 스케줄러 테스트는 평균 30FPS를 확인했으나 GPU 성능 검증이 아니다.
- `watch.tsx`: React 80ms→렌더 호출 의존 제거. HUD·조작과 scene 수명 분리.
- `scene.ts`, `track.ts`: untextured 그레이박스에 vertex-lit Lambert 적용, 정적 mesh 배치, 평면 삼각형 감소, 재사용 벡터, 이벤트 조회/DOM 변경 축소, 명시적 리소스 폐기.
- `lib/racing/playback.ts`, `lib/racing/v2/playback.ts`: 화면에 필요 없는 과거 이벤트 전체 스캔 제거, 카메라 binary search. 기존 전체 재생 API와 보간 결과 보존.
- `performance-panel.tsx`: 기본 접힌 실측 패널. 상한/실제 FPS 구분, GPU 식별, JSON 다운로드.
- Windows 실행기·빌드 표시: Phase 2-A / player 2.0 / 정확한 SHA. 기존 포트 충돌 차단 및 대체 포트 보존.
- CI/benchmark/테스트/설계 문서: 전후 실측, 실제 캡처, 회귀 및 Phase 2-B~D의 확정 기획만 기록.

## 검증

|항목|결과|
|---|---|
|v0.1 Golden|PASS · 512 pairs|
|v0.2|PASS · 1,492,455 assertions / 200 pairs|
|v0.3|PASS · 2,197 checks / 200 pairs|
|v0.4|PASS · 240 deterministic meetings|
|Phase 1 UI / polish|PASS · 100 record integrity checks 및 시청 기능|
|Render clock|PASS · 30FPS cap, 5Hz HUD, 단일 RAF, pause/seek/rate/end/hidden/dispose, 900개 상한, 기록 불변|
|1440×900 / 390×844 / 360×800 Chromium 자동 회귀|PASS · WebGL 2, 오류/외부 요청 0, 가로 overflow 0; 42개 실제 캡처|
|수동 시각 검토|PARTIAL · 일반 크기 데스크톱의 예선·완주 장면에서 순위표 하단과 미니맵이 일부 겹침. 전체화면 중간/큰 HUD는 측정상 비중첩. 자동 assertion PASS를 전체 시각 품질 PASS로 확장하지 않음|
|Windows 실행기|PASS · CI PowerShell 시작·정확한 SHA·포트 충돌·대체 포트 확인; 물리 GPU 테스트 아님|
|TypeScript / Lint / Build / standalone / diff-check|PASS. Lint에 기존 unrelated unused debit 경고 1건, standalone chunk >500KB 경고|
|실제 Windows Chrome GPU / 모바일 OS|NOT VERIFIED|

- 회귀: 3개 리플레이, 8명/퀄리파잉, 특별 DSQ, 세 카메라 각도, 자동/수동, 이벤트 배지, 미니맵, HUD 크기, 키보드/탐색/배속, 배경 탭 시간 및 격리 미니 플레이어.
- 최초 CI에서 RAF 함수 this binding 문제를 발견해 수정했다. v0.4 테스트의 오래된 timelineClock 문자열 단언은 새 clock 책임과 실제 동작 테스트에 맞춰 갱신했으며 Golden 데이터를 바꾸지 않았다.
- v0.4 결과 JSON SHA-256: `5de4a6177242ccee9d0e26753b79303a1b9f5f11aaabdda3fddd9f43915b2138`. 엔진 변경이 없어 새 40,000회 밸런스 평가는 실행하지 않았다. 기존 평균 220.514초, P1 13.1275%, P8 11.2075%는 기존 평가 기록이다.

## 최종 판정

**Phase 2-B 진입을 위한 30FPS 성능 Acceptance: NO-GO.** 최종 SwiftShader 일반 장면은 17.44–18.47FPS, 중첩 예선 20.65FPS, 전체화면 11.59FPS로 30FPS 목표에 미달한다. 이는 소프트웨어 GPU 결과이며 Windows 하드웨어 실패를 증명하지도, 하드웨어 성공을 보장하지도 않는다. 물리 Windows GPU 결과는 NOT VERIFIED다. 코드·회귀·실행기 검증 PASS와 성능 목표 미달을 구분한다.

새 데모를 동일 Windows 장치에서 실행하여 보이는 영상의 평균/중앙값/p05 FPS와 p95/p99 간격, GPU 문자열을 저장하는 것이 남은 최소 확인이다. 일반·사고·자동/수동·전체화면에서 약 30FPS가 확인되기 전에는 성능 완료나 Phase 2-B 자동 진행을 선언하지 않는다.

## 남은 제약 및 다음 단계

- 실제 Windows GPU에서 일반/전체화면 모두 안정적인 약 30FPS인지 확인 전에는 성능 완료를 보장할 수 없다.
- SVG fallback과 SwiftShader는 하드웨어 GPU와 다르다. 소프트웨어 환경의 낮은 FPS도 유효한 제한 사항으로 기록한다.
- 기존 SHORTCUT 순간 진행 변화는 시뮬레이터 데이터다. 렌더링 최적화로 결과를 몰래 바꾸지 않았다.
- 실제 HOLOCRON 공통 App Shell 통합/21시 운영 방송/10랩 엔진/베팅은 이번 범위가 아니다.
- Windows ZIP을 새 폴더에 풀고 `Demo/START-RACING.bat` 실행. 포트 충돌이면 `START-RACING.bat -Port 43875`. Build Info의 실행 SHA를 확인하고 성능 패널에서 30–60초 측정한다.

CI 실행: https://github.com/darkkyoung/Holocron/actions/runs/41225515467
아티팩트: galactic-racing-v4-demo / galactic-racing-v4-screenshots / galactic-racing-phase2a-performance.

## CI 아티팩트 무결성

- CI 데모 ZIP SHA-256: `ee01e38c9c2078c441116f7469ece3400326ec3ba1123c1435bf93e890bbeeca`.
- CI 화면 ZIP SHA-256: `76819344f99b252deba19a2f5f3423481d7b7f3224bfbe7acbd1ffc56e229ba4`.
- CI 성능 ZIP SHA-256: `c6551776e3107e21d1e6c774791e209961727ca3a54e36f7218df852447afe8b`.
- 다운로드한 세 ZIP 모두 GitHub API의 artifact digest와 일치. 전달 묶음의 Demo 파일들은 원본 CI 데모와 전 파일 바이트 비교한다.
- 최종 CI의 replay-and-ui 및 windows-launcher job 모두 success. 보고서 전용 후속 커밋은 `[skip ci]`이며 재빌드된 데모가 아니다.
