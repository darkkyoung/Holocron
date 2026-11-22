# Phase 3-E · 운영 QA 인계 (2026-11-22 KST)

12월 3일 통합 QA에 격리 결과를 제출한다. 실제 방송 승인에는 별도 스테이징 및 운영 감사 증빙이 필요하다. 12월 4일 의사결정자는 아래 미결 항목을 검토한다.

## 기준선과 권한

|원격 ref|확인 HEAD|확인한 Actions run|
|---|---|---|
|main|93646c066aaf8a33f1a7c062f8404dd7cd7b211e|44995845692 성공 (뉴스 수집)|
|PR 4|aa25e02b8055302bab3a39461e4967ca87784679|44445182819 성공|
|PR 5|c761cc1cf7a02f32500e0548c7acadaa1a724087|44452421685 성공|
|PR 6|edd322ab91a9f0e2ad24ba469b85fd2c107129dd|44523362096 성공|
|PR 7, 이번 분기점|c94ad47abeb772f1549ae4cbe8ea28e94fe2f5cc|45010896235 성공|

Sites 소유·편집 가능 목록과 기존 프로젝트를 읽기 전용으로 조회했다. 식별한 관련 사이트는 holocron-korea(최신 버전 97) 하나다. 저장소 hosting.json은 해당 프로젝트, D1 DB, R2 null을 선언한다. 별도 스테이징 URL, 바인딩 ID, 실행 권한, CDN 정책, Worker 사용량 대시보드, 운영자가 승인한 독립 서명 공급원의 증빙은 확보하지 못했다. 목록 밖 인프라의 존재 여부는 미확인이다. Scheduled news collection은 레이싱 Cron 증빙으로 사용할 수 없다.

## 실행 및 지표 정의

Node 24 Linux Work 환경, 고정 lockfile, 테스트 전용 D1/R2/KV, 매 실행 임시 키. 3-C/D 문서, v0.14 엔진/QA 및 기존 회귀를 재사용했다. GitHub Actions는 Node 22 Ubuntu/Windows를 사용한다. 다음 명령은 저장소 루트에서 실행한다.

```sh
pnpm install --frozen-lockfile
npm ci --prefix prototypes/galactic-racing-v2 --ignore-scripts
node scripts/test-racing-phase3c-http.mjs
node scripts/test-racing-phase3c-http.mjs --browser
node scripts/racing/measure-start.mjs --browser
node --import ./scripts/sites-env.mjs scripts/test-racing-phase3c-runner.mjs
node --import ./scripts/sites-env.mjs scripts/test-racing-phase3c-workerd.mjs
```

workflow racing-phase3c.yml에 TS/Lint/Build, v0.1~0.14, 3-A/B, 빌드 HTML/RSC/정적 자산 검사와 브라우저 단계가 있다. 실제 시간 흐름으로 수동 리허설하려면 preview-phase3c.mjs를 --qualifying으로 실행하고 출력된 loopback /racing을 연다. 자동화는 통제된 KST 방송 시각을 순서대로 진행한다. 한 시간 무중단 실시간 시청은 별도 항목이다.

|검증|판정 및 범위|
|---|---|
|방송 순서|PASS 격리. 특별 DSQ 고정 경기에서 20:00 예선, 20:58 프리쇼, 21:00 본경기, 1초마다 HTTP 조회로 1~10랩, 포디엄, 조사·증거·재분류·재입장, FINAL 순위 일치. 생성부터 최종 DB 기록 및 아카이브 일치는 별도의 workerd 12쌍에서 확인.|
|21:00 공개 전후|PASS 격리. 시작 1ms 전 생성 거절, 미커밋 WAITING. 21시까지 프리쇼, 이후 커밋 대기 중 ‘공식 기록을 준비하고 있습니다’, 첫 정상 응답에서 서버 경과 시각으로 합류하는 UX를 권고한다. 지연 시 순위·가상 출발·미리 생성한 결과를 표시하지 않는다.|
|노출 및 캐시|PASS 격리. 빌드 HTML/hydration/RSC/prefetch 및 JS 검사, gateway allowlist, 공개 API 오류·seek, 다른 미래 결과의 같은 시점 응답 일치, 재접속 및 특별 DSQ 공개 경계. 같은 URL의 로컬 캐시 모형에서 공개 이후→이전 조회 시 DSQ 재사용 방지. 실제 CDN MISS/HIT/PoP는 BLOCKED.|
|부하·복구|PARTIAL. warm HTTP fixture에서 1/16/64개 동시 요청을 두 시점에 재발행. 새 TCP 연결/서로 다른 사용자 계정이나 지속 RPS 부하는 별도. 실제 Miniflare 바인딩을 감싼 R2 지연 25ms와 일시 오류, 콜드 리더 32개 동시 재시도에서 읽기 1회 공유, D1 읽기 예외 시 503 후 정상화. 생성 write 실패, durable restart, 동일 hash, 결과 1건, 만료 lease takeover 및 오래된 소유자 거절은 3-A에서 검증. 관리형 장애·지역별 지연·Worker CPU/RSS는 BLOCKED.|
|시간·렌더|PARTIAL. 호스트 단조시계로 최초 정상 HTTP 본문 수신 및 브라우저 본경기 프레임 관찰까지 측정. 실제 Cron 발송/큐/콜드 프로세스 지연은 BLOCKED. 두 브라우저 wall clock 불일치와 재접속은 기존 테스트 사용. Windows/Linux Chrome은 SwiftShader. 모바일은 viewport 에뮬레이션. 하드웨어 GPU·휴대폰 실측 BLOCKED.|
|엔트로피·키|PARTIAL. synthetic P-256 서명/검증, ref 및 변조 거부. 서비스는 단일 AES-GCM 키를 가져오며 역사적 키 ID를 선택하는 keyring 경로가 없다. 키 교체 후 과거 경기 읽기·백업 복원, 공급원의 독립성/라운드 확정/권한 분리 실증 BLOCKED.|
|운영 D1|BLOCKED 별도 감사. v10/0020 과거 백업과 v12/0022 소스 포맷, 신규 로컬 격리 DB를 구별한다. 설치 Journal, 최신 전체 백업 원본/해시, 복원 후 Wallet/Ledger·제약조건 및 Racing private objects/키 정합성까지 확인할 책임자와 보고서가 필요하다.|

### 105경기 원본 대조

각 ZIP SHA-256을 GitHub artifact digest와 대조하고 압축을 푼 뒤 scripts/racing/reconcile-latency.mjs에 JSON을 전달해 모든 지표의 p50/p95/p99를 105개 원시 행에서 재계산했다. 단위 ms, nearest rank, 정수 반올림. 시작은 정시에 주입한 wake. cold total은 첫 공개 DTO의 본문 파싱까지 누적한 애플리케이션 시간이다. read는 해당 리더 호출만의 시간이다. 실제 네트워크·렌더·Cron은 포함되지 않는다.

|실행|artifact ID|cold total p50 / p95 / p99|cold read p50 / p95 / p99|
|---|---:|---|---|
|3-C QA 문서, 초기 **로컬** Node 24|해당 로컬 원본 미확보|1812 / 2498 / 2958|523 / 800 / 836|
|같은 초기 6361c595 CI 44522147782|14527979572|1087 / 1209 / 1607|309 / 368 / 403|
|3-C 최종 edd322ab CI 44523362096|14529826404|1273 / 1423 / 1451|362 / 421 / 443|
|3-D 최종 c94ad47a CI 45010896235|14749878216|1697 / 1913 / 1957|487 / 565 / 620|
|이번 Work 105경기 재실행|로컬|1393 / 1674 / 1741|410 / 572 / 601|

동일 SHA에서도 로컬과 CI는 다른 실행이다. 문서 수치를 최종 CI 결과로 덮어쓰거나 차이를 코드 효과로 귀속하지 않는다. cold read는 D1 조회·복호화·무결성 검사·파싱·투영의 합이다. 12쌍 workerd 결과는 예선 후 첫 본경기 및 다음날 본경기를 독립 집계한다. 두 경우 모두 새 main artifact다.

원본 ZIP SHA-256은 순서대로 다음과 같다.

```
14527979572 700f21e6857fc57fb934aa51e76e62d542cc6eb35ad722114cb02b50477883dc
14529826404 f8ab3c10138d8b6c030864a193c4b8809f4ec8ffeaded3515f483d714237314f
14749878216 b3c39978a692651198a78bcf67fc38facbb2661f0b0d1d06c5ae3fa20c075bcf
```

### 재현 자료

[evidence/phase3e](evidence/phase3e) 아래에 105경기 버전별 단계 요약, Work 12쌍 원시값, 동시 요청별 원시값과 복구 결과, 5회 독립 리허설의 이벤트 시각을 보존했다. 5회 데이터에서 p95/p99는 최댓값이다. 500ms 타이머로 due 시각을 확인하고 250ms 간격으로 HTTP를 관측하므로 polling 비용이 포함된다. CI isolated-operational-start는 예선 후 새 경기에서 시작→본경기 HTTP 및 첫 확인된 3D 프레임까지 같은 호스트 시계로 계측한다. viewer 아티팩트의 render 값은 이미 방송 중인 페이지에 새 브라우저 컨텍스트로 접속한 navigation 기준이다. 서로 다른 분포의 백분위를 더하지 않는다.

## 12월 3일 리허설 승인 요청 및 12월 4일 증빙

1. 인프라 책임자가 별도 스테이징 project/hostname, 테스트 시간대, 대상 커밋, 최대 동시 시청자와 중단 조건을 승인한다. prod와 다른 D1·R2·KV ID, 사설 reader와 generator, 테스트 전용 키 ID를 값 없이 확인한다. 승인 범위에 스테이징 배포, 테스트 데이터 작성, 스테이징 Cron 설치·해제 및 부하 발생 각각을 명시한다.
2. 공급자·서명 라운드 선정 규칙, 서명자와 앱 운영자의 권한 분리, 누락/지연·오서명 때 WAITING 및 재시도, 한 라운드의 상충 값 차단을 리허설한다. 보관 담당자는 버전별 복호화 및 복구 권한, 이전 키 보존 기간과 폐기 승인자를 지정한다. 테스트 키 v1으로 기록→v2로 새 기록→분리 환경에 복원해 두 버전을 모두 검증한다.
3. 승인된 별도 호스트에서 KST 20:00부터 실제 경과로 시청한다. 요청 ID별로 scheduledTime, handler 도착, job claim/시작, seed/engine/encrypt/put/readback/commit, 첫 HTTP RACE, 최초 본경기 WebGL frame을 매핑한다. 서버 시계 오차, 클라이언트 RTT, poll 간격, 분모·에러 수·최댓값과 p50/95/99를 보관한다. 실제 Cron 날짜 표본이 적으면 횟수를 공개한다.
4. 두 CDN 지역·두 독립 클라이언트로 공개 경계 직전/직후 같은 URL의 HTML/Flight/API, prefetch, seek, reconnect, 오류 응답을 비교한다. 헤더·Age/cache-status·서버 시각·DTO allowlist 결과만 보관한다. 새로 접속/일제 복귀 그룹을 1→16→64(승인 상한 이내)로 분리하고 sustained poll 구간 및 동시 콜드 복호화에서 Worker CPU/메모리, D1/R2 지연·오류, read 수와 503 회복을 기록한다. 다른 사람의 트래픽·원본·키·서명 입력을 수집하지 않는다.
5. 장애 리허설은 해당 테스트 자원에만 적용한다. D1/R2 응답 지연과 쓰기/커밋 응답 유실, lease 만료 후 재기동, readback 불일치, 캐시 폐기를 재현한다. 미완성·상충 결과 공개, 해시 변경 또는 결과 중복이면 중단하고 해당 release gate를 연다. 실제 Windows/Linux GPU 및 Android/iOS에서 첫 프레임, 재접속, 장시간 유지, 컨텍스트 손실 후 2D 폴백을 기록한다.
6. 운영 감사 담당자의 Journal·최신 전체 백업 복원 증빙을 별도로 연결한다. 12월 4일 책임자가 각 미결 게이트와 완화책, 잔여 위험 수용 여부를 서명한다. 이 PR은 12월 7일 출시 승인 권한을 행사하지 않는다.

### 로컬 workerd 자원 사용량 (12개 프로세스 × 본경기 2개)

Linux에서 test-racing-phase3c-workerd.mjs에 --resources를 추가하면 테스트 프로세스의 workerd 자식 하나를 확인하고 /proc CPU 및 RSS를 기록한다. 24회 nearest-rank 결과이며 원시값은 3e-workerd-resources.json에 있다. 동작마다 기록된 high-water는 해당 프로세스가 시작된 후의 누적 최댓값이다. 생성·읽기·계측 isolate와 에뮬레이터가 같은 프로세스를 사용한다. 클라우드 isolate별 CPU 과금 또는 메모리 한도 판정에는 제공자 계측이 필요하다.

|동작|벽시계 ms p50 / p95 / p99|프로세스 CPU ms p50 / p95 / p99|
|---|---|---|
|생성|680 / 893 / 899|870 / 1100 / 1170|
|첫 공개 본경기 읽기|346 / 431 / 580|400 / 490 / 630|
|같은 기록 다음 읽기|4 / 7 / 12|0 / 10 / 20|
|별도 isolate에 ciphertext와 키를 미리 적재한 후 decrypt 함수 호출|349 / 527 / 543|430 / 600 / 640|

decrypt 호출은 로컬 RPC, hex 디코딩·AES-GCM·텍스트 복원을 포함한다. 0ms CPU는 OS tick 해상도 내의 값이다. 첫 공개 읽기 직후 프로세스 peak RSS의 p95는 798952 KiB였다. 키 교체/복호화 및 Worker 자원 한도를 실제 환경에서 승인하기 전 동시 콜드 리더에서 한도 초과 여부를 우선 확인한다. D1은 정상 바인딩의 각 읽기에 지연 20ms를 주입한 경우와 읽기 예외 후 복구한 경우를 각각 확인했다.

로컬 타이머는 due 직전에 콜백이 도착하고 due 시각 이후 DB 조회가 끝날 수도 있다. 트리거와 실제 생성 진입을 별도로 기록하며 main job 시작이 0ms 이전이면 실패한다. 실 Cron에는 이 타이머 측정값을 적용할 수 없다.

### FINAL 전환 시 경과값 역행 · PARTIAL

비가속 loopback 관찰에서 PODIUM final 다음 응답의 offset이 감소해 단조 증가 검사가 실패했다. 별도의 동일 경기 경계 시험은 scheduler가 final_at을 지나 늦게 FINAL을 기록하는 상황을 고정한다. 전환 전 final_at+1200ms 응답과 전환 후 final_at+1300ms 응답을 비교하면 서버 시계는 100ms 전진하지만 공개 offset은 1200ms 감소한다. 최종 상태 전에는 실시간 경과값을, 최종 상태에서는 replayEnd로 제한한 값을 사용하기 때문이다. 공식 결과·서버 시계 손상은 관측되지 않았다. 증거는 3e-http.json의 finalBoundary다.

12월 3일에는 실제 Cron 지연 중 같은 경계를 연속 기록하고 사용자에게 보이는 초 단위 역행 및 화면 전환을 확인한다. 출시 책임자는 허용할 표시 규칙을 정하거나 수정 후 재시험해야 한다. 개선안은 실시간 방송 시계와 확정된 다시보기 커서의 의미를 분리하는 것이다. 최종 공개 전에 비공개 종료 시각을 전달하면 안 된다.

`python scripts/racing/observe-broadcast.py`는 20:58 직전부터 무가속으로 실제 격리 서버를 열고 FINAL까지 0.5초 간격으로 HTTP를 관측한다. `--qualifying`은 20:00부터 시작하는 전체 길이 리허설이다. out/3e-wall-clock.json에 실제 단계, lap 집합, 오류 수, offset 감소 이벤트를 기록한다. 이 실행의 자연 발생 DSQ 여부와 특별 DSQ 고정 fixture의 경계 검증을 구분한다.
