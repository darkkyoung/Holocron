# 2026-10-13 — Account, Credit, Notification Concept

> 상태: **Concept / NOT IMPLEMENTED**  
> 이 문서는 현재 제품 계약이 아니다. Phase 9C 이후 비용·abuse·계정 UX를 논의하며 나온 아이디어와 폐기된 대안을 보존한다.

## 1. 시작점 — AI Assistant 비용이 정말 감당 가능한가

Phase 9C 이후 “개발 agent에 쓰는 강한 모델”과 “실제 HOLOCRON 방문자 요청마다 호출되는 runtime model”을 구분해야 한다는 문제를 다시 확인했다.

고가 reasoning model을 public endpoint의 기본값으로 쓰면 방문자가 늘수록 운영자 비용이 직접 증가한다.

HOLOCRON의 AI는 server가 이미 relevant Stories를 좁힌 뒤 정리/생성을 맡기므로, runtime에는 cost-sensitive model을 먼저 평가하는 방향이 적절하다고 판단했다.

또한 model 선택보다 더 중요한 것은:

- request quota
- context/output cap
- abuse protection
- global monthly spend ceiling

이다.

## 2. 실제 Beta traffic에서 비용 걱정이 현실적인 문제가 됨

사용자가 공유한 Beta 7일 방문 값:

```text
22
29
18
47
74
108
209
```

합계 507.

당시 홍보는 YouTube 게시글 중심이었고 영상 홍보는 하지 않았다. 사용자는 실제 영상으로 홍보하면 대략 2배 수준의 방문을 예상했다.

이 숫자를 보면서 “정상 traffic 비용은 저가 model이면 관리 가능하더라도, 한 명의 bot/abuse가 지갑을 더 위험하게 할 수 있다”는 쪽으로 논의가 이동했다.

## 3. HOLOCRON Credit 발상

처음 아이디어:

> 사용자가 사이트에 오래 있거나 뉴스 기사를 많이 클릭하면 Credit을 얻고, Credit이 있어야 AI Q&A/대본 생성을 한다.

비용 방어에는 직관적이었지만 그대로 구현하면 문제가 있었다.

### 폐기한 보상 방식
- 체류시간에 비례해 지급
- 기사 클릭 1회마다 무제한 지급

이유:

1. 사용자가 콘텐츠를 즐기는 대신 Credit을 파밍하게 됨
2. 클릭/체류 analytics가 왜곡됨
3. 탭을 켜두거나 auto-click으로 쉽게 악용
4. 실제 engagement를 판별하려다 scroll/mouse/activity tracking이 늘어 개인정보 최소화 원칙과 충돌

따라서 Credit은 “사이트에 오래 붙잡아두는 장치”보다 **비용이 있는 AI 자원을 공정하게 나누는 이용권**으로 정의하는 방향이 더 적절하다고 판단했다.

## 4. 자연스러운 활동 보상

좋다고 본 후보:

- 하루 첫 방문
- 오늘의 퀴즈 참여
- 서로 다른 News Story 일정 수 열람
- 3일/7일 등 연속 출석

뉴스는 “클릭할 때마다”가 아니라 예를 들어:

> 서로 다른 Story 3개 열람 → 하루 1회 +1

같은 capped mission 형태가 더 적절하다.

Quiz도 “정답을 맞히면”보다 **참여하면** 지급하는 편이 낫다. 정답 보상은 검색해서 답만 제출하는 파밍을 유도할 수 있기 때문이다.

논의 중 예시 값은 있었지만 아직 확정된 pricing table은 아니다.

## 5. 로그인 없이도 Credit을 기억할 수 있는가

가능하다. 다만 사용자를 기억한다기보다 **현재 browser identity를 기억하는 것**이다.

```text
browser
→ random anonymous cookie
→ server-side hash/HMAC identity
→ D1 guest state
```

이 방식이면 같은 browser에서는:

- balance
- daily mission claim
- streak
- quiz participation

등을 이어갈 수 있다.

하지만:

- cookie 삭제
- 시크릿 창
- 다른 browser
- 다른 device

에서는 같은 사람임을 알 수 없다.

즉 Guest Credit은 의도적으로 **browser-bound**다.

## 6. Login의 제품 가치

로그인을 AI 사용의 입장료로 강제하기보다:

> “현재 browser에만 있는 기록을 보존하고 다른 환경과 동기화하는 기능”

으로 포지셔닝하는 것이 좋다고 판단했다.

Login 사용자에게 가능한 것:

- Credit 장기 보존
- 출석/streak 보존
- PC ↔ mobile sync
- 향후 notification preference
- 즐겨찾기
- 생성 대본 저장 같은 account 기능

Google OAuth가 특히 자연스러운 후보로 논의됐다. YouTube를 통해 유입되는 사용자와 친숙하고, 향후 creator 기능과 연결하기 쉽기 때문이다.

다만 **Google login과 YouTube API 권한은 별개**다. 처음부터 YouTube 권한을 과하게 요구하지 않고 실제 기능이 필요할 때 incremental authorization을 받는 방향이 적절하다.

## 7. Guest welcome Credit 이관에서 발견한 허점

처음에는:

```text
Guest Welcome +10
→ Google login
→ guest balance account로 이관
```

같은 흐름을 생각했다.

그러나 바로 다음 abuse가 발견됐다.

```text
Guest A 생성 + welcome
→ account login / 이관
→ cookie 삭제
→ Guest B 생성 + welcome
→ 같은 account login / 또 이관
```

그래서 단순 “guest 잔액을 로그인할 때 더함”은 안전하지 않다.

### 검토한 방어
- `guest_migration_completed`
- `welcome_credit_claimed`
- ledger reward key uniqueness
- network HMAC abuse limit
- global API spend ceiling

하지만 더 단순한 제품 정책이 나왔다.

## 8. 현재 더 선호하는 Guest / Account 구분

### Guest
- 큰 Welcome Credit 없음
- HOLOCRON 활동을 해야 Credit 획득
- 낮은 balance cap 가능
- browser-bound
- cookie를 지우면 기존 accumulated state에 다시 접근하기 어려움
- AI는 사용 가능하되 활동 없이 즉시 많이 사용하기는 어려움

### Logged-in account
- 최초 login/account Welcome bonus 가능
- balance/streak 영구 보존
- 기기간 sync
- 더 높은 balance cap 가능
- 고비용 AI 기능에 더 넓은 access 가능

이 구조에서는 cookie reset으로 새 Guest를 만들어도 새 Guest는 다시 활동부터 해야 하므로 welcome farming의 가치가 낮아진다.

Guest → account migration을 허용할 경우에도 계정당 최초 1회만 인정하는 ledger가 필요하다.

## 9. Credit Ledger를 단순 balance보다 선호한 이유

단순히:

`balance = 12`

만 저장하면 왜 12가 되었는지 알기 어렵다.

개념적으로:

```text
credit_ledger
- owner/account id
- reward key
- amount
- reason
- created_at
```

형태를 두고 `owner + reward_key`를 unique하게 하면:

- 하루 첫 방문 중복 claim
- welcome bonus 중복
- quiz reward 중복
- guest migration 반복

을 DB 수준에서 방지하기 쉽다.

예시 reward key:

- `welcome_account_v1`
- `daily_visit:2026-10-13`
- `quiz:<quiz-id>`
- `news_daily:2026-10-13`
- `streak:7:<date>`

정확한 schema는 아직 설계하지 않았다.

## 10. YouTube 구독 인증 보상 아이디어와 폐기

아이디어:

> Google/YouTube account를 연결해서 운영자 채널을 구독했는지 인증하면 Credit 지급.

기술적으로 subscription 확인 API를 검토할 수 있지만, YouTube 행동(구독/좋아요/시청 등)을 보상과 연결하는 것은 플랫폼 정책 리스크가 커서 **Credit reward로 사용하지 않는 방향**을 택했다.

향후 YouTube 연동이 있다면 보상 수단보다 기능적 연결:

- creator workspace
- channel identity 표시
- 대본 workflow

등을 위한 별도 opt-in permission으로 검토한다.

구현 전에는 항상 최신 공식 YouTube 정책을 다시 확인해야 한다.

## 11. Notification 아이디어

Google login을 생각하면서 “Star Wars 소식을 사용자에게 직접 알려주는 기능”도 자연스럽게 이어졌다.

후보:

- 주요 뉴스 알림
- 하루 digest
- 관심 Work 뉴스
- Quiz 알림

Phase 9A의 Article↔Work relation이 이미 있기 때문에:

```text
user follows Work
→ new public Story linked to Work
→ notification candidate
```

구조를 만들기 쉽다.

또한 같은 사건을 여러 outlet이 보도해도 Article 3건이 아니라 **Story 1건**으로 알림을 만들어야 spam을 줄일 수 있다.

## 12. Notification channel 우선순위 아이디어

### Web Push
첫 후보로 가장 적합하다고 판단했다.

- browser permission 기반
- email 없이 가능
- 메시지당 AI API처럼 직접적인 고비용 호출이 없음
- desktop/Android web과 잘 맞음

### Email Digest
login account에 email이 있고 사용자가 별도 opt-in했을 때 가능.

Google login 자체를 “뉴스 메일 동의”로 간주하면 안 된다.

### KakaoTalk
장기 아이디어로 유지하되:

- 비즈니스 채널
- consent
- template
- provider/approval
- 건당 비용

등 정책/비용 확인이 필요하므로 후순위.

## 13. Notification에 Credit을 받을 것인가

“알림 한 건마다 Credit 차감”은 부적절하다고 판단했다.

뉴스가 많은 날과 없는 날의 비용/사용자 경험이 너무 달라지고 사용자가 알림을 받을 때마다 잔액을 신경 써야 하기 때문이다.

대안으로 **기간권(Notification Pass)** 아이디어를 검토했다.

예:

- 7일 Pass
- 30일 Pass

Credit 하나로 AI와 지속형 convenience feature를 모두 이용하게 하는 구조다.

다만 Web Push 자체 원가가 매우 낮다면 notification pass는 “원가 회수”보다 premium convenience/gamification의 성격이 강해진다. 너무 인색하게 느껴지지 않도록 실제 제품 정책은 별도 검토가 필요하다.

**현재 확정 사항이 아니다.**

## 14. 현재 결론과 다음 설계 질문

Phase 9C는 이미 AI Assistant 자체의 grounding/security를 설계했다.

하지만 public AI를 실제 구현하기 전에 account/credit이 들어간다면 순서를 다시 생각할 필요가 있다.

현재 논의상 자연스러운 후보:

```text
9C     Grounded AI Assistant Design        COMPLETE

9C.1   Account + Credit Product Design     NEXT CANDIDATE
9C.2   Guest/Login/Credit Implementation   candidate

9D     AI Assistant Implementation
       + Credit consumption integration

Later  Web Push / Email Notification
```

아직 이 번호 체계와 기능 범위 자체도 **Concept**이며 `PRODUCT_SPEC.md`에 확정 반영하지 않았다.

다음 설계에서는 최소한 다음을 결정해야 한다.

1. Guest와 account의 정확한 Credit 획득/보유 한도
2. Login provider 범위
3. Guest → account merge 규칙
4. Credit ledger schema
5. AI Q&A / outline / draft의 정확한 소비량
6. daily/streak mission anti-abuse
7. global API budget ceiling
8. notification을 Credit과 연결할지 여부
9. Web Push와 email의 launch scope
10. backup에서 account durable state와 operational abuse state를 어떻게 구분할지
