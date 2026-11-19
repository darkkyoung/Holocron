# 3-C isolated acceptance evidence

Measured in Linux/Node 24 with local workerd D1, encrypted private R2 and signed KV contributions. 105 independent sealed ten-lap races, one new main artifact per race; no production network or keys. Initial implementation run 6361c595. Values below are cumulative elapsed milliseconds from an on-time scheduler wake except the labeled read durations. CI publishes the exact final tree's raw samples. No inference about real Cron dispatch delay, process cold starts or Cloudflare PoP capacity.

| Milestone | p50 | p95 | p99 |
|---|---:|---:|---:|
| Verified seed |75|146|203|
| Simulation complete |136|249|306|
| Encrypted |548|810|1006|
| Stored |692|966|1153|
| Readback verified |1203|1705|2156|
| D1 commit |1230|1752|2214|
| First public response (cold artifact cache) |1812|2498|2958|
| Next viewer's response (cumulative, after first viewer) |1852|2540|3030|
| First reader duration alone |523|800|836|
| Warm reader duration alone |28|64|125|

Linux and Windows Chrome test the same HTTP gateway, reader and React viewer with private fixture races. 1440×900, 390×844, and 360×800; two viewers, differing wall clocks, disconnect/reload, current position changes, qualifying-to-grid timing, Hyper/Gold, investigation and completed replay. These are desktop browsers with mobile viewport emulation. The fixtures select authoritative v0.14 cases broadcast-qa-0 (Hyper), broadcast-qa-1 (Gold), broadcast-qa-36 (special DSQ); neither private seeds nor raw artifacts are in the user-facing bundle. Browser checks of individual scenes are not an uninterrupted hour-long viewing session. The integration smoke uses real scheduling, sealed inputs, private storage and HTTP; the built-shell check covers real app HTML, flight/prefetch, maintenance and binding dispatch. No live CDN test or client hardware performance certification.

Independent checks include T−3001/T−3000, same-time response equality under different undisclosed future podium outcomes, 30/34/40/44s ceremony boundaries, disallowed live seek, out-of-range completed seek, caller identity/clock isolation, private-cache separation across stage hashes, cache-control and generic failures. Historical v1–v14, 3-A/3-B, static asset checks, TypeScript, lint and build run in the PR workflow. No new balance run or physics change.

For 12-03: rehearse staged operator login and recovery; verify server clock, scheduler cold/warm and queue jitter, key custody, beacon independence and immutable object retention, publication boundaries through actual CDN and reconnect under load. Verify genuine installed DB journal and isolated restore against current approved backup. For 12-04: release authority reviews these gates. Absent evidence, NO-GO for live 12-07; a separately approved finalized-only channel is available behind the reader mode. No production authorization is implied.

A second benchmark executes the actual generation code and private reader inside separate local workerd isolates sharing emulated D1/R2. It measures first-main vs second-main in each of twelve fresh runtime pairs after qualifying, checks release denial before closure, advances the persisted state to FINAL, then compares the public finishing order/points to the stored private classification and opens archived replay. It measures no real Cron or production latency. See the isolated-workerd-pairs CI artifact for those separate percentiles; n=12 per group means p95 and p99 both select the maximum. Do not pool these samples with the 105-race application benchmark.
