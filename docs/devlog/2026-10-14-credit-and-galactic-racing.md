# 2026-10-14 — Credit Economy and Galactic Racing

> 상태: **Design / NOT IMPLEMENTED**
> 시작 canonical: 66f6b7ef2c368c40633aa4b077e9bb317afa4ac7
> 오늘의 핵심: Account/Credit의 숫자를 제품 규칙으로 좁히는 과정에서, 남는 Credit을 재미있게 소비하는 장기 기능으로 Galactic Racing의 시즌/예측/시뮬레이션/미술 방향까지 설계했다.

## 1. Credit 가격을 먼저 고정하려 한 이유

Phase 9C AI Assistant 설계는 완료됐지만 공개 AI에는 비용이 발생한다. Phase 9D 전에 “누가 얼마나 AI를 사용할 수 있는가”를 Credit 단위로 설명할 필요가 생겼다.

Credit을 단순 AI 이용권으로만 두면 출석/Quiz를 꾸준히 사용하는 사람이 balance를 빠르게 쌓고, AI를 적게 쓰는 사람은 cap 이후 보상이 의미 없어지는 문제가 생긴다.

이 문제를 단순한 balance cap으로 누르기보다 **재미있는 Credit sink를 만든다**는 방향으로 전환했다.

## 2. 2026-10-14 Credit 결정

- Guest 최초 방문 +1
- Account 최초 로그인 +3
- Opening/최초 방문 기념 보너스 +1, 일일 반복 아님
- 주간 출석 Day 1~6 매일 +1
- 주간 출석 Day 7 +5
- Daily Quiz 첫 제출 정답 +3 / 오답 0
- Web Push 최초 활성화 account당 +1
- AI Q&A -5
- Script Planner/구성/Outline -7
- Full Draft -15
- 기존 결과 수정 -3
- Guest cap 10
- Account product cap 없음
- 기술적 AI 실패 전액 환불
- 정상 결과 뒤 재생성은 새 요청으로 과금

Quiz는 **첫 제출만** Credit을 판정한다.

별도의 일반 활동 총량 cap은 두지 않고 각 reward 자체가 일/계정/Quiz 단위 idempotency를 가진다.

## 3. Account cap 제거

초기에는 account cap 100을 고려했다.

하지만 활동적인 사용자는 출석/Quiz로 100에 도달할 수 있고 AI를 자주 쓰지 않으면 그 뒤 Credit이 의미 없어질 수 있다.

Galactic Racing이 account-only Credit sink라면 오래 쌓은 Credit이 사용자 참여 자산이 된다.

결론:
- Guest 10 CR cap 유지
- Account cap 제거
- 각 Racing market stake 최대 30 CR

## 4. Galactic Racing

HOLOCRON 안에 하루 한 번 열리는 scheduled racing broadcast를 구상했다.

핵심:

> 서버가 한 번 계산한 랜덤 레이스를 모든 사용자가 같은 시간에 3D 스포츠 중계처럼 본다.

직접 조작 멀티플레이가 아니므로 재방문 동기는 만들면서 물리/네트워크 게임의 무게는 피할 수 있다.

## 5. Season / schedule

- 8 racers
- 1주 = 1 season
- 7일 = 7 races
- 각 race winner + season points
- Race 7 뒤 최고 점수 racer가 champion
- 00:00 daily prediction open
- 20:00 qualifying
- 20:55 prediction close
- 21:00 race start
- season champion prediction은 첫 3일만
- 한 account는 market당 한 racer
- 최대 stake 30 CR
- 종료 후 result + Replay

## 6. Pari-mutuel odds

고정 능력치 odds보다 **사람들이 건 Credit 분포**를 이용한다.

인기 racer는 정배가 되어 payout이 낮고, 적게 선택된 racer는 역배가 되어 payout이 높아진다.

20:00 qualifying 이후에도 20:55까지 crowd expectation이 바뀌면서 provisional odds가 움직일 수 있다.

정확한 pool retention/Credit sink 비율은 구현 전 simulation으로 정한다.

## 7. Qualifying

처음에는 P1 +3%, P2 +2%, P3 +1%, P4 +0.5% 같은 win-probability buff도 검토했다.

하지만 collision, damage, Ultimate 같은 강한 random event가 있으므로 hidden stat buff보다 **grid advantage 자체**가 더 자연스럽다.

- baseline performance 동일
- qualifying random
- qualifying은 starting grid만 결정
- 별도 성능 buff 없음

## 8. Ultimate

Ultimate는 유지한다.

- 하위권일수록 activation chance가 조금 높음
- guaranteed activation 없음
- duration random
- power random
- 강한 comeback/P1 도전 가능
- 무조건 승리하지 않음
- ordinary bad event에 상당한 resistance
- Major 사고는 여전히 위험

“궁을 썼는데도 왜 1등을 못 했지?”도 가능한 것이 의도다.

## 9. Events

Bad event:

**Minor**
- small contact
- driving mistake
- launch/mechanical failure

**Medium**
- external attack
- body contact
- side/slow wall collision
- spin
- light damage → pit repair

**Major**
- frontal wall impact
- accumulated damage
- large random vehicle failure
- shortcut failure
- severe penalty
- DNF/DSQ

Critical은 Major에 합친다.

8명 중 DNF/DSQ는 보통 0~1, 2명은 드문 상한으로 둔다.

Good event와 Ultimate는 lower-rank mild weighting을 사용하지만 예측 가능한 comeback 공식이 될 정도로 강하게 보정하지 않는다.

## 10. Map variety

한 season만 해도 7개 map이 필요하고 반복감을 줄이려면 14~20개 체감 variant가 필요하다.

해결:

> Base geometry × environment skin × Normal/Reverse/Mirror

Reverse가 원래 불가능한 일방향 구간에는 ramp/block/slope/bridge overlay를 추가한다.

14~20개의 다른 느낌을 만들되 14~20개의 완전 독립 고비용 geometry를 만들 필요는 없다.

각 environment는 별도 event table을 가질 수 있다.

## 11. 2D racer + 3D world

- simple low-poly 3D vehicle
- low-poly 3D track/world
- hand-drawn 2D racer billboard
- billboard는 broadcast camera를 항상 바라봄

넓은 화면에서도 racer identity가 읽히고 close-up에서도 종이 옆면이 노출되지 않는다.

## 12. 실시간을 가볍게 만드는 방식

8대 real physics collision을 viewer마다 계산하지 않는다.

21:00에:

~~~text
seed
→ bounded simulation
→ result
→ timed event/state timeline
→ camera cues
~~~

를 한 번 생성한다.

모든 browser는 같은 timeline을 현재 시각에 맞춰 render한다.

충돌도 rigid-body physics가 아니라 authoritative event이며, client가 밀침/스파크/spin을 연출한다.

Replay는 동일 timeline을 처음부터 재생한다.

## 13. IP 방향

공식 Star Wars 행성/레이서/차량을 그대로 게임 자산으로 쓰는 대신 **오리지널 racer/planet/track**을 만든다.

사막/얼음/산업 행성 같은 genre grammar는 활용할 수 있지만 이름/설정/아트는 독립적으로 만든다. Dunooine 같은 명칭은 방향 예시일 뿐 최종 이름이 아니다.

비영리 팬 사이트라는 사실을 권리 허가로 가정하지 않는다.

## 14. 오늘의 결론

Credit은 “AI 비용 통제용 point”에서 더 큰 제품 시스템이 됐다.

~~~text
Activity
  ↓
HOLOCRON Credit
  ├─ Grounded AI
  ├─ Script creation
  ├─ Web Push onboarding reward
  └─ Galactic Racing prediction
~~~

Galactic Racing은 구현 범위가 크므로 Account/AI patch에 섞지 않는다.

먼저 Account/Credit ledger가 race stake/payout까지 수용하게 설계하고, Racing은 별도 implementation track으로 진행한다.

상세 문서:
- [Account & Credit Design](../ACCOUNT_CREDIT_DESIGN.md)
- [Galactic Racing Design](../RACING_DESIGN.md)
