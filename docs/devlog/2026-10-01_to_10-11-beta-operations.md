# 2026-10-01 ~ 2026-10-11 — Public Beta와 운영 문제

## Public Beta

10월 초 HOLOCRON은 `holocron.kr`에서 Public Beta로 실제 사용자에게 공개됐다.

Beta의 가치는 단순한 방문자 수보다 “Production에서만 드러나는 문제”를 찾았다는 데 있었다.

대표적으로:

- source discovery가 성공했다고 생각했지만 오래된 공백이 존재
- RSS metadata가 부족한 기사
- 이미지가 비어 있는 row
- source별 discovery 0을 failure로 잘못 취급
- SWNN에서 새 기사 image enrichment가 기대와 다르게 동작

같은 문제가 드러났다.

## 10-02 — RSS metadata와 image recovery

- `3e1ed690 — Fix RSS metadata recovery`
- `e3935ba9 — Add missing news image recovery`

수집 당시 metadata가 부족해서 review/empty 상태가 된 Article을 “그냥 다시 전체 수집”하지 않고, 이미 저장된 row를 대상으로 recovery할 수 있게 했다.

운영에서 중요한 차이는 다음과 같다.

```text
새 기사 discovery
!=
기존 row metadata recovery
```

둘은 목적과 위험이 다르므로 분리했다.

## Beta analytics start 분리

`db23556d — Add configurable beta analytics start`

개발/QA 중 발생한 traffic과 실제 Public Beta traffic을 섞으면 beta 성과를 해석하기 어렵다.

그래서 beta analytics 시작점을 별도 설정으로 두어 QA 기록을 삭제하지 않고도 beta baseline을 새로 시작할 수 있게 했다.

## 10-02 ~ 10-03 — “최근 90일”과 “90일 전체 발견”은 다르다

`ae6bbcd1 — Improve news source discovery reliability`

운영 중 중요한 착각이 드러났다.

HOLOCRON이 “최근 90일 Article만 보관한다”고 해서 현재 RSS/index가 **과거 90일 전체를 제공하는 것은 아니다**.

실제로 9월 중순 구간의 historical gap이 발견됐고, source에 따라 RSS에서 이미 밀려난 기사도 있었다.

그래서:

`03bae308 — Add resilient news backfill and metadata recovery`

에서 다음을 분리했다.

- normal incremental collection
- rolling backfill
- manual historical backfill
- metadata recovery

source별 discovery 방식도 다르게 가져갔다.

- StarWars.com: embedded/semantic cards/visible metadata/OG fallback
- SWNN: monthly RSS
- Collider: monthly sitemap
- THR/Deadline/Variety: sitemap
- Forbes: news sitemap + author RSS

목표는 anti-bot을 우회하는 것이 아니라 source가 공개하는 structured metadata를 가능한 범위에서 활용하는 것이었다.

## 10-04 — Collection Health

`21c89964 — Add collection health monitoring`

“마지막 수집 성공” 하나만으로는 source 상태를 알 수 없었다.

source별로 다음을 기록하도록 했다.

- checked / healthy time
- discovered / inserted
- primary / backfill
- failure streak
- metadata/headline/backfill failures

상태는 healthy / warning / danger / disabled / unknown으로 표현했다.

### zero-discovery bug
초기 health 구현에는 no-candidate run이 성공했어도 stats가 제대로 만들어지지 않아 상태가 잘못 보이는 문제가 있었다.

`e05dff25 — Fix zero-discovery collection health`

에서 “새 기사가 0개”와 “source가 실패함”을 구분했다.

예를 들어 inserted=0 자체는 실패가 아니다. 이미 저장된 URL뿐일 수 있기 때문이다.

## Admin brute-force 방어

`b94c6189 — Add admin login rate limiting`

관리자 URL을 public header에서 숨겨도 직접 접근은 가능하다. 따라서 로그인 자체에 server-side brute-force protection이 필요했다.

raw IP를 D1에 저장하지 않고 secret HMAC hash를 사용했다.

정책:

- 15분 window
- 8회 실패
- 15분 block
- temporary state cleanup

이 패턴은 훗날 AI Assistant abuse-control 설계에도 참고 사례가 된다.

## 10-11 — SWNN image incident

### 첫 번째 해결
`557504ec — Fix SWNN initial image collection`

SWNN RSS에는 이미지가 없는 경우가 있어 source adapter에서:

1. RSS image
2. WordPress REST의 Yoast/Jetpack/embedded metadata
3. optional article HTML

등으로 enrichment하는 방향을 추가했다.

같은 시기:

`b76948b7 — Refactor news source adapters`

source-specific parsing이 central collector의 if/else로 계속 쌓이지 않도록 adapters로 정리했다. 이는 `AGENTS.md`의 “세 번째/네 번째 special case가 나오면 abstraction을 재검토한다”는 원칙의 실제 적용이다.

### 그런데 Production 새 기사에서 또 실패
새 SWNN Article 하나가 image가 비어 있는 상태로 저장됐다.

실제 Production row와 WordPress API를 대조하니:

- post 자체에는 featured_media ID가 존재
- Yoast image도 확인 가능
- 그러나 stored Article image는 empty

즉 “SWNN이 이미지를 제공하지 않는다”가 아니라 **우리 enrichment path가 실제 Production case를 놓친 것**이었다.

그래서 broad refactor나 전체 재수집 대신 실제 기사 한 건을 trace했다.

두 번째 fix:

`be9bb3f1 — Fix SWNN production image enrichment`

fallback은 더 명확해졌다.

1. RSS image
2. post REST Yoast/Jetpack/embedded
3. `featured_media` ID → media REST
4. media parent lookup
5. optional article HTML

추가 lookup은 image-less candidate에만 bounded하게 수행했다.

### 기존 row는 왜 자동으로 안 고쳐졌나
정상 collection은 URL이 이미 존재하면 candidate를 early skip한다. 따라서 enrichment가 개선돼도 기존 image-empty row가 normal collection을 다시 통과하지 않는다.

이것은 버그라기보다 incremental collection의 중요한 특성이다.

결론:

- 새 기사부터 개선된 enrichment 적용
- 기존 row는 admin image recovery 사용
- “새 SWNN 기사에서 실제로 이미지가 들어오는지”가 최종 운영 acceptance

이 사건은 Production 이슈를 추측으로 고치기보다 concrete row를 따라가는 방식의 좋은 사례다.

## 10-11 — D1 Backup Foundation

Beta를 지나면서 D1에는 더 이상 쉽게 재생성할 수 없는 데이터가 쌓였다.

- collected Articles
- Works catalog
- Quiz responses
- analytics
- feedback session state
- administrator-edited settings

그래서:

`d36c4129 — Add safe D1 backup foundation`

을 추가했다.

### Backup 원칙
백업은 durable state만 포함한다.

포함:

- articles
- works
- quizzes / options / responses
- beta analytics
- feedback sessions
- allowlisted public settings

제외:

- collection locks
- login/feedback rate-limit state
- scheduler execution state
- recovery cursor
- source health
- admin auth configuration
- environment secrets

### 왜 restore executor를 만들지 않았나
첫 단계의 목표는 “백업이 있다는 안도감”보다 **무엇을 복원하게 될지 정확히 검증할 수 있는 것**이었다.

그래서:

- export
- validator
- dry-run restore plan

까지만 만들고 실제 restore 실행 기능은 넣지 않았다.

historical v1 artifact는 `0013_loving_silver_fox.sql` 기준으로 실제 row count와 허용 settings, secret/operational exclusion을 검증했다.

## 이 시기의 교훈

Public Beta에서 가장 중요한 성과는 기능 추가가 아니라 운영 방식의 변화였다.

```text
문제 발견
→ 실제 Production data로 재현
→ 영향 범위 제한
→ recovery/backfill/health 도구로 일반화
→ 기존 override와 durable state 보호
```

“수집 성공”을 믿는 대신, 실제 archive coverage와 recovery 가능성을 운영 기능으로 만들기 시작했다.
