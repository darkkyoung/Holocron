# Homepage announcement popup — independent of the network hotfix

Starting canonical for the combined task: `1f955e16a10cfdce34213c953b62dd0545b473ca`.
Part A was independently published as `f99c4ccb8581652b3d9b0581af292e66854bfb29`
(tree `1fdfbdeb45d346f8c4ee86a6f20151770c944627`) before Part B.
This record belongs to the separate popup commit; its final SHA/tree is reported after
GitHub publication and fresh fetch, rather than embedding a self-referential SHA.

## Behavior and boundaries

`/admin/announcement` uses the existing administrator session. Control Room links to
it. One `settings.homepage_announcement_v1` record atomically holds plain title/body,
publication UUID, revision, enabled flag, crop and bounded image. Default/absent state
is OFF. Save preserves publication ID; explicit new publication creates a new ID.
CAS on the previous whole record rejects concurrent saves with 409. There are no
schema/migration, R2, account, Credit, collection or Scheduler changes.

JPG/PNG/WebP files are selected locally (8 MiB/24 MP/8192 px source limits), resized
in the browser to at most 1600 px and encoded to a single-frame WebP of at most
160 KiB. The total administrator JSON body is bounded to 240 KiB. Chromium canvas
adds an ICC profile even when the source has no metadata: real browser QA found the
initial strict parser rejected it. The browser now strips encoder metadata and
repairs the RIFF length/flags before validation; the server still rejects metadata,
animation, unsupported chunks, bad dimensions, truncation, MIME/base64 mismatch,
SVG/HTML and oversized payloads. Tests preserve decoded pixels across profile removal.
This is bounded container/header validation, **not a complete WebP codec verifier**.

The separate active-only image Route serves WebP with nosniff, CSP, same-origin CORP
and no-store. Public metadata/HTML never embeds image base64. Admin requests require
session + same origin; public requests never mutate settings. No filename is treated
as a path. Plain text is validated and React-escaped. Invalid stored state fails closed.

The actual banner remains 4:1 with object-fit cover, X/Y (0–100%) and zoom (100–300%).
Saved images can be recropped without uploading again. Decorative images have empty
alt; information images require descriptive alt. Image decode/loading failure leaves
a neutral banner with the same geometry. No proxy or external image URL input exists.

Only `app/page.tsx` mounts the popup. Native modal dialog, labelled title, focus on close,
explicit forward/backward Tab loop, Escape close, focus restoration, background scroll
lock, internal long-content scroll and reduced-motion rules protect interaction.
Close stores nothing. The 168-hour action stores only publication ID/expiry in localStorage;
new publication IDs bypass old snoozes, malformed/expired state is removed, storage
failure still allows closing. Storage events synchronize already-open documents.
No new analytics, tracking or account connection is introduced.

## Backup

Canonical export becomes **v8 / 0019 / 16 datasets**. Only the new settings allowlist
key is added. v1–v7 keep their exact old settings allowlist, dataset/marker and Credit
rules; the new key is rejected in old-version artifacts. v8 validates and round-trips
the image-bearing setting. The read-only plan explains absent historical announcement
state and future re-publication requirements. No restore/migration is executed.
See `docs/BACKUP_RESTORE.md` for fresh v7 pre-deployment and v8 post-deployment gates.

## Verification

- `test:announcement`: isolated Miniflare D1; atomic save/publish/CAS race; authorization,
  same-origin, body/field/image bounds; active-only metadata/image response; crop
  persistence; old image revision/disabled 404; malicious inputs rejected; v8 export
  and plan; old-version rejection; 168-hour expiry/new-ID/blocked-storage behavior;
  actual React SSR text escaping, file input and decorative/informative alt. External
  Provider outbound ZERO.
- `test:backup`: 936 assertions, versions 1–8, graph/Credit audits and official CLI
  validation/read-only plans. No real Production backup was read or rewritten here.
- Related UI/domain regression: admin-auth (28), admin-ux (17), news-explorer (25),
  Works (74), Quiz (63), Guest Credit UI (35), Assistant UI (35), workspace (117) PASS.
- Part A current-runtime retrieval/admission/refund/headroom/generation/provider/
  Credit-policy regressions remain PASS. Final combined edge-network tests repeat the
  original Node failure and patched Node + workerd success with blocked outbound.
- TypeScript, lint (0 errors, 1 pre-existing refund-test unused-variable warning),
  production build and diff-check PASS.
- No hosted GitHub Actions run is claimed for this new commit. Existing manually
  dispatched workflow discovers the new `test:*` commands automatically.

### Chromium observations and limits

Managed local Sites preview, actual production React components, synthetic image and
isolated component transport; actual API/security/D1 is independently exercised above.
No Production administrator login was attempted. The temporary browser fixture was
removed before final build/commit. It is not a production authentication bypass.

Observed: actual PNG file chooser/canvas WebP compression, X/Y/zoom keyboard changes,
nonpublic save, explicit publish, saved image/crop reload, desktop/mobile preview,
line breaks, centered modal, close/Escape, Tab/Shift-Tab containment and focus restoration.
At 360/375/390 px iframe viewports, banners measured 326/81.5, 341/85.25 and 356/89 px:
exactly 4:1. Buttons stayed inside each viewport. A 360×740 long-body fixture produced
708px modal height, 637px scroll viewport / 2202px content, with footer still visible.
Snooze closed other open documents and survived reload; a new publication appeared.
Broken image retained its 4:1 neutral area. Expiry/storage denial are deterministic
unit checks, not 168 hours of elapsed browser observation. Physical mobile devices,
assistive-technology speech, full authenticated browser-to-D1 workflow and hosted
acceptance remain NOT VERIFIED; no synthetic UI transport is represented as Production.

## Release handoff

**Implementation/local verification complete; Production not changed.** Owner baseline
remains v86 / environment 51 / 0019 / AI OFF. No real Provider call, paid approval,
secret change or Production data access/write occurred. Existing evaluation manifests,
approvals, journals and results are untouched; new lib files change broad runtime
fingerprints and must not be rebound to historical live approvals.

Request separate approval for either hotfix-only `f99c4cc` (v7) or the combined final
popup tree (v8, popup OFF). Recheck fresh backup/validate/plan and actual environment;
deploy OFF, verify News/Account/Credit/Quiz, then separately authorized ON redeploy and
free Cloudflare retrieval. If NETWORK_UNAVAILABLE persists, revert OFF using the normal
redeploy path; do not weaken edge trust. Paid Q&A/Guide tests still need their own
small-spend approval. Popup requires explicit owner publication after release.
