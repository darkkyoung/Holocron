# Galactic Racing v0.12 Hyper Phantom Warp — 최종 검증

검증일: 2026-11-06 KST. 격리 데모의 구현·밸런스·기능 검증이며, Production 출시 승인이 아니다.

## 판정과 정확한 코드

| 구분 | 판정 |
|---|---|
| Hyper 강화·Phantom Warp·Gold 보호 | PASS |
| 새 독립 40,000경기 / Hyper 조건부 70% | PASS |
| 모든 정상 참가자 대비 효과 중 한 바퀴 선행 방지 | 관측 표본 PASS |
| 기존 v0.1~v0.11 회귀·TypeScript·Lint·Build | PASS |
| Linux Chromium / Windows Chrome 기능 검증 | PASS — 소프트웨어 GPU |
| Windows 실행기·CI와 동일한 ZIP | PASS |
| 실제 Windows 하드웨어 GPU 안정적 30FPS | NOT VERIFIED |
| 시험한 뷰포트·배속에서 Phantom 단계 관측 | PASS — 느린 GPU에서의 일반화 한계는 아래 참고 |
| 소프트웨어 GPU 안정적 30FPS | FAIL — 기능 PASS와 분리 |
| Production / Phase 3 운영 통합 | 범위 밖, 수행 0건 |

- Canonical main: `93646c066aaf8a33f1a7c062f8404dd7cd7b211e` (변경 없음).
- 시작 v0.11: `1a4032964b2c97472b05dce32d81d2f635d4e5af`.
- 최종 엔진 및 Windows 실행 코드: `0f8802e2c994e0c445d8a7021f75cefba7af13b2`.
- 실행 Tree: `1724cdcd33559b63a0fdbdaa927518a75b3c19af`.
- 최종 보고 커밋은 이 파일의 Git history로 확인한다. 보고 커밋은 검증 실행 파일을 재빌드하거나 SHA를 바꾸지 않는다.
- 작업 브랜치: `feature/galactic-racing-v012-hyper-phantom-warp`.
- 공식 시뮬레이터: `galactic-racing-0.12.0`.
- [최종 Actions 실행](https://github.com/darkkyoung/Holocron/actions/runs/42056503130).

## 후보 탐색과 실패 공개

초기 2,000 Pilot에서 A/B/C의 조건부 Hyper 우승률은 70.39/77.63/80.26%였다.
중간 강도 B를 8,000 Pilot에서 확인한 뒤 첫 40,000 `12final-` 집합을 실행했다.
그때 81.90%였으나, 초기 안전 지표는 가장 앞선 다른 참가자만 비교했다.
모든 정상 참가자로 범위를 넓히자 **13 /3,336 Hyper에서 한 바퀴 선행**이 발견됐다
(최대 4,112.87m, 발동 전 이미 벌어진 사례 0). 이 후보는 최종 승인에서 제외했다.
실패 자료는 `v012-rejected-unbounded-balance.json`, `v012-rejected-all-live-leads.json`에 보존한다.

현재 위치만 이용하는 Hyper 안전 제한을 추가했다. 수정 Pilot 8,000경기는
487/597 =81.57%, 모든 정상 참가자 대비 한 바퀴 선행 0건이었다.
이 후보를 위 엔진 커밋에서 고정한 뒤 **새로운 `12verify-0..39999`**로 검증했다.
`12pilot-`, 이미 안전 디버깅에 사용한 `12final-`과 겹치지 않는다.
최종 결과를 보고 엔진 파라미터를 다시 바꾸지 않았다. 같은 Seed 집합의 로컬·CI
재실행은 재현성 확인이며, 통계 표본을 80,000개로 늘려 계산하지 않는다.
권장 72~75%보다 강한 결과는 그대로 공개하며, 그 좁은 목표를 달성했다고 표현하지 않는다.

## 공식 이동과 시각 연출

| 단계 | 실제 시간 / 동작 |
|---|---|
| 안전한 발동 지점 대기 | 기존 지름길을 정상 합류한 뒤 시작; 최대 8초, 초과 시 취소 |
| 폭발적 가속 | 250ms; 공식 한 Tick에 6× 물리 이동 |
| 투명화 | 125ms; 차량과 2D 빌보드의 opacity 1→0 |
| 초고속 이동 | 375ms; 보이지 않는 효과 위치가 공식 도약 양 끝을 트랙 경로로 연결 |
| 재출현 | 250ms; opacity 0→1, 청백색 충격파 |
| 후속 가속 | 2.5~3.0×, 최대 5초; 완주·DNF·DSQ·안전 제한으로 일찍 종료 가능 |

공식 도약은 1랩의 20~30% (720~1080m) 범위에서 Seed로 정하고 결승선 및 안전
상한으로 제한한다. Burst·일반 이동·도약을 중복 가산하지 않는다.
공식 도약은 기록 Tick 끝에서 한 번만 반영한다. 도약 이전 GAP·순위를 조기 변경하지 않는다.
완전히 투명한 동안의 효과 위치 보간은 별도 공식 주행거리가 아니다.
코너를 직선으로 가로지르지 않으며, Seek·되감기·일시정지·배속은 같은 시간의 순수 함수다.

**안전 제한:** 모든 RACING/FINISHED 상대의 공통 pre-step 위치에서 가장 뒤의
상대를 기준으로 `상대 진행거리 +0.85랩`을 계산한다. Hyper 도약 목적지를 그 아래로
제한하고, 한계에 도달하면 남은 Hyper 가속을 종료한다. 15% 여유가 최대 한 Tick의
이동보다 큰지 설정 검증도 수행한다. 차량을 뒤로 이동시키거나 완주 시각·순위를
사후 변경하지 않는다. 미래 결과·특별 DSQ·선택할 우승자는 입력으로 쓰지 않는다.
`leadLimited`, `endReason`과 실제 종료 Tick을 기록하므로 카메라 잠금도 그때 해제된다.

Gold는 2.2~3.2×, 6~11초, 기존 ramp·저항·금빛 효과를 보존했다.
발동은 자신의 70~95% 구간, 선수당 최대 1회, 경기당 최대 2회, 18초 간격,
Hyper 추첨 약 10%, 미발동 경기 허용 정책을 그대로 재사용한다.

## 새 40,000경기 통계

40,000경기는 기본 10랩이며, 1/3/5/10/15/30랩은 별도 계약 회귀에서 검사했다.
조건부 분모: 발동 직전 P5~P8, 자신의 진행률 70% 이상 95% 미만, RACING에서 발동.
취소·DNF·DSQ·패배도 분모에 포함하고 특별 DSQ 이후 공식 최종 순위로 승리를 판정한다.
Wilson 95%는 관측 발동 사례에 대한 구간이며 개별 경기 승리 보장이 아니다.

| 지표 | Gold | Hyper |
|---|---:|---:|
| 조건부 표본 | 25,672 | 2,807 |
| 공식 우승 | 14,322 / 55.79% | 2,249 / **80.12%** |
| 공식 포디움 | 21,347 / 83.15% | 2,627 / 93.59% |
| 최종 평균 순위 상승 | 4.668 | 5.331 |
| 효과 종료 시 평균 순위 상승 | 4.923 | 5.446 |
| Hyper 우승 Wilson 95% | — | **78.60~81.56%** |

v0.11 보관 기준: Gold 우승 56.99% /포디움 82.92%, Hyper 우승 27.51% /포디움 61.33%.
이는 보관된 v0.11 40k 결과이며 새로 재실행했다고 주장하지 않는다.
Gold 정책은 같지만 버전별 Seed 및 강화된 Hyper와의 경쟁으로 관측 승률은 달라질 수 있다.

| 전체 지표 | 결과 |
|---|---:|
| 궁극기 0 /1 /2회 경기 | 14,208 / 18,832 / 6,960 |
| 미발동 경기 | 35.52% |
| Gold /Hyper 발동 | 29,508 /3,244 (Hyper 9.90%) |
| 8 /9 /10랩 발동 | 5,407 / 22,792 / 4,553 |
| 1~7랩 또는 95% 이후 불법 신규 발동 | 0 |
| 실제 최대 도약 | 1079.96m |
| 도약 평균 (취소 포함) | 867.49m |
| 후속 가속 추가 물리거리 평균 /최대 | 777.47m /1036.45m |
| Burst 추가 물리거리 평균 /최대 | 113.40m /134.14m |
| 전체 추가 이동의 보수적 상한 최대 | 2578.58m <3600m |
| 모든 정상 참가자 중 최대 선행 거리 | 3130.24m |
| 한 바퀴 이상 선행한 Hyper | 0 |
| 안전 제한 적용 /가속 조기 종료 | 154 /154 |
| 도약 취소 | 129 |
| 궁극기 미사용 우승자 | 49.07% |
| 평균 경기 /p05 /p95 | 362.287s /356.00s /369.50s |
| 평균 선두 변경 | 39.720 |
| 일반 DNF /DSQ (320,000 출전) | 11,591 /3,434 |
| 특별 DSQ (40,000경기) | 380 (0.9500%) |
| 랩·완주·지름길·비정상 수치 오류 | {'illegal': 0, 'lapErrors': 0, 'qualErrors': 0, 'finishErrors': 0, 'branchErrors': 0, 'nonfinite': 0} |

그리드 P1→P8 우승률: 12.807%, 12.955%, 12.748%, 12.467%, 12.738%, 12.342%, 12.070%, 11.873%.
선수 r1→r8 우승률: 12.570%, 12.348%, 12.488%, 12.650%, 12.455%, 12.245%, 12.515%, 12.730%.
모든 선수 기본 능력치는 동일하다. 특정 ID나 베팅·프로필·선택한 우승자는 엔진 입력이 아니다.
추가 물리거리는 동일 Tick의 pace/noise/damage에서 배율 유무를 비교한 값이다.
전체 경기를 다시 돌린 반사실 결과와 혼동하지 않는다. 관측 0건은 모든 가능한 Seed의 증명이 아니다.
공식 결과·이벤트·랩·이동 digest: `f305a8f2f1aad7a17f676b0ee9dbe0016c637a85cdd728b159ad40c7af7afcfa`.
최종 40k JSON SHA-256: `110b24075b9c91374c972a4076ca665f331906a9e650e372c80c525a83b48008`.
로컬과 최종 CI의 이 파일이 바이트 단위로 같음을 확인했다.

## 회귀·브라우저 검증

기존 v0.1~v0.11 회귀, 20개 v0.11 전체 Meeting hash, v12 결정론·compact/full 결과,
1/3/5/10/15/30랩, 11,064 lock/Seek 표본, 34,304 GAP 표본,
65 phase 단언과 기존 실패 Seed 안전 회귀를 통과했다.
`integrator.ts`의 추가 hook은 선택적 read-only pre-step 전달뿐이며 과거 엔진에는 비활성이다.
기존 Golden 기대값을 새 결과로 덮어쓰지 않았다.

Linux Chromium 156.0.8078.4 및 Windows Chrome 156.0.8078.80에서 1440×900,
390×844, 360×800, fullscreen/큰 HUD를 실제 렌더링했다. GPU는 SwiftShader다.
새 Phantom, Gold, 0.5×/1×/2×, manual/AUTO, Seek, pause, reduced-motion,
프로필, GAP, 3라운드 결과, 연속 방송, 정상 포디엄·특별 DSQ를 검사했다.
공식 도약 전후 HUD는 확정된 통과 시각 인덱스와 비교했다. +1 LAP·DSQ 표시의
명시적 synthetic fixture는 실제 경기 결과라고 주장하지 않는다.
Hyper 취소·지름길·완주·발동 순간 DNF·afterburn 중 DSQ는 실제 Seed로 확인했다.
도약으로 건너뛴 통과 지점은 모두 도약 Tick의 같은 시각을 갖는다. 따라서 도약 직후
일부 상대의 GAP가 일시적으로 +0.00s인 것은 속도를 거리로 나눈 추정치가 아니라
해당 특수 이동의 공식 통과 시각 계약이다. 이후 일반 통과 기록으로 계속 갱신된다.
외부 네트워크 요청은 0건이었다.

캡처를 직접 확인하고, 실제 렌더링 위치·투명도·카메라 대상의 동적 기록과 함께 판단했다.
정지 이미지나 opacity 코드의 존재만으로 PASS 처리하지 않았다. 전체 WebM과 motion JSON은
Actions screenshot artifact에 있다. 전달 MP4는 147.32초 실제 데스크톱 QA 영상 전체의 변환본이며 scripted Seek와
배속 검사를 포함한다. 연속 운영 방송이나 실제 사용자 GPU 영상으로 표현하지 않는다.
일반 데스크톱의 작은 tower는 스크롤 가능하고 모바일 상세 순위는 영상 아래 펼침 영역에 있다.

## 성능과 남은 한계

Linux Xvfb headed Chromium / software SwiftShader; NOT hardware Windows GPU. 최대30FPS 구조와 실제 달성 FPS는 구분한다.
동일 CI 호스트·1440×900에서 v0.11 실행 SHA100df3dd와 현재 후보를 비교했지만,
버전별 경기 Seed/장면 내용은 달라 엄밀히 동일 프레임을 비교한 microbenchmark는 아니다.
각 장면8초, 짧은 Phantom 단계의 p99는 표본이 적어 일반화할 수 없다.

| 버전 /장면 | 평균 FPS | 중앙 FPS | 하위5% FPS | p50/p95/p99 ms | >50ms | draw calls |
|---|---:|---:|---:|---|---:|---:|
| before /normal-corner | 26.59 | 28.49 | 19.27 | 35.1/51.9/60.2 | 9.0% | 35 |
| before /ultimate | 25.84 | 27.32 | 18.55 | 36.6/53.9/71.4 | 12.7% | 28 |
| before /fullscreen-large | 17.16 | 17.33 | 13.59 | 57.7/73.6/95.3 | 83.9% | 60 |
| after /normal-corner | 27.29 | 29.07 | 19.57 | 34.4/51.1/57.0 | 6.0% | 46 |
| after /ultimate | 25.91 | 27.40 | 17.57 | 36.5/56.9/62.9 | 11.7% | 39 |
| after /fullscreen-large | 17.73 | 18.38 | 13.19 | 54.4/75.8/90.5 | 82.3% | 50 |
| after /phantom-burst-fade-return | 26.51 | 28.65 | 18.32 | 34.9/54.6/72.6 | 11.8% | 25 |
| after /phantom-afterburn | 26.86 | 29.07 | 19.34 | 34.4/51.7/63.9 | 7.9% | 25 |

| v12 장면 | canvas | main-thread task / script ms/s | triangles | live buffer / texture | >33.3ms |
|---|---|---:|---:|---:|---:|
| normal-corner | 1023×575 | 84.55 /45.00 | 8328 | 394 /12 | 64.22% |
| fullscreen-large | 1440×900 | 61.76 /34.00 | 8208 | 449 /12 | 97.16% |
| phantom-burst-fade-return | 1023×575 | 105.75 /67.89 | 7072 | 391 /12 | 70.14% |
| phantom-afterburn | 1023×575 | 80.14 /42.76 | 7072 | 391 /12 | 68.69% |

before: 120초 반복, record 파일 1,693,202bytes, GC 후 heap 13.74→15.97MiB. 마지막 자원 {'contexts': 1, 'contextIds': [6], 'generation': 6, 'buffers': 358, 'textures': 12, 'canvas': 1, 'badges': 8}.

after: 360초 반복, record 파일 1,721,094bytes, GC 후 heap 14.09→16.71MiB. 마지막 자원 {'contexts': 1, 'contextIds': [16], 'generation': 16, 'buffers': 358, 'textures': 12, 'canvas': 1, 'badges': 8}.

동일 case 시작점에서 반복 교체 후 buffer/texture 수가 일정하고 live WebGL context1개를
검증했다. Heap 변화는 그대로 보고하며 무제한 장시간 leak-free를 보장하지 않는다.
소프트웨어 GPU에서 안정적30FPS는 달성하지 못했다. 사용자 Windows 하드웨어 GPU의
일반/전체화면·큰 HUD 성능은 **NOT VERIFIED**다. 데모 성능 패널로 최소30초씩 별도 측정해야 한다.
2×에서는125ms fade가 실제62.5ms라 느린 렌더링에서 중간 프레임이 빠질 수 있다.
최종 Linux와 Windows 각각의 세 뷰포트×세 배속에서 다섯 phase를 모두 관측했다.
활성 구간의 촬영 대상은 r7로 유지됐고 body/billboard alpha 불일치는0,
보이는 차량 중심은 화면 NDC |x|≤0.122, |y|≤0.362였다. 이는 전체 차체의 가림까지
보증하지 않는다. 각 배속의 관측 phase 목록은 Linux/Windows browser JSON에 보존한다.

## 파일·실행·운영 경계

- 최종 ZIP: `Galactic-Racing-v0.12-0f8802e-Windows.zip`
- SHA-256: `478c38f56d0203baf7d7b483bba2322c9aae3ea9076055af5e64c1050ea98e56`
- Actions artifact ID: `13432685992`; digest와 전달 바이트 일치.
- [Actions 대체 다운로드](https://github.com/darkkyoung/Holocron/actions/runs/42056503130/artifacts/13432685992)

새 폴더에 ZIP 전체를 풀고 `START-RACING.bat`을 실행한다. Node/Python 설치 없이
Windows PowerShell로 로컬 파일만 제공한다. 포트43874가 사용 중이면 기존 서버를
열거나 종료하지 않고 실패한다. `START-RACING.bat -Port 43875`로 다른 포트를 쓴다.
화면 상단 SHA와 `build-info.json`을 확인한다. 로컬 경기 설정의 Hyper Phantom Warp를
선택하고 주요 장면 ULTIMATE로 이동한다. 1~8 수동, `/` AUTO, 0.5×로 짧은 효과를 관찰할 수 있다.

재현 사례와 발동 시각·선수·당시/최종 순위는 `evidence/v012-demo-cases.json`에 있다.
Gold12pilot-2, Hyper역전12pilot-6, Hyper패배12pilot-4, 미발동12pilot-0,
지름길12pilot-72, 취소12pilot-19, 마지막랩12pilot-79, 효과중완주12pilot-81,
발동DNF12final-15329, afterburnDSQ12final-38475, 특별DSQ12pilot-88을 제공한다.
이 Seed 선택 메뉴는 로컬 테스트 도구이며 실제 방송의 미래 결과 공개 기능이 아니다.

Phase3 설계 문서는 보존했다. Canonical main, Production Site, D1, Migration,
Credit/Wallet/Ledger, AI/Provider, 실제 시즌·시장·방송 서버 변경은 **0건**이다.
하드웨어 성능과 최종 사용자 관람 승인은 남아 있다. Phase3 운영 구현은 시작하지 않았다.


## 증거 파일과 다운로드 위치

- [Linux 캡처·전체 WebM·동적 위치 기록](https://github.com/darkkyoung/Holocron/actions/runs/42056503130/artifacts/13431960388)
- [Windows Chrome 캡처·전체 WebM·동적 위치 기록](https://github.com/darkkyoung/Holocron/actions/runs/42056503130/artifacts/13432104288)
- [실측 성능 JSON·장면 캡처](https://github.com/darkkyoung/Holocron/actions/runs/42056503130/artifacts/13431797801)
- [CI 독립 40,000경기·계약 결과](https://github.com/darkkyoung/Holocron/actions/runs/42056503130/artifacts/13432671126)

저장소의 `evidence/v012-ci.json`은 최종 두 job의 success와 모든 artifact digest를 보존한다.
`v012-delivery.json`은 실행 SHA·ZIP digest·로컬/CI 결과 동일성을 기록한다.
`v012-visual-review.json`과 `v012-dynamic-framing.json`은 직접 확인한 이미지 및 실제
재생 위치·투명도·카메라 자료를 구분한다. `v012-scope.json`은 Gold·발동 정책·GAP·
Phase 3 설계의 원본 blob 동일성과 변경 파일 범위를 기록한다.
Actions artifact는 30일 보존 설정이므로 사용자에게 전달한 동일 ZIP·영상·캡처도 함께 제공한다.
