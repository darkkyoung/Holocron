# Chat UI and Responses compatibility

Base: 408b8a28dc8a6065a1fa265a0d4689ac39bf8739.

The overlay and direct workspace now use top tabs, a scrollable conversation,
right-aligned submitted question, natural answer text, compact server-owned
citation links and a bottom composer. Filters and manual evidence selection
remain collapsed. Enter submits (except IME composition); Shift+Enter inserts a
newline. Existing explicit price/consent, duplicate-request guard and uncertainty
lock remain. The submitted question is a request-local UI snapshot, cleared on
mode changes, not persistent or multi-turn model memory. Planner structure and
7 CR price are unchanged. Copy includes the answer/plan and server references.

Official reference:
https://developers.openai.com/api/docs/guides/prompt-engineering
https://developers.openai.com/api/reference/python/resources/responses/methods/create

Official Responses output is not guaranteed to contain exactly one item or a
message at index zero. Parser now permits bounded reasoning metadata alongside
exactly one completed assistant message. Reasoning is never rendered, logged or
stored. A message still requires one unannotated output_text containing valid
JSON. Tools/unknown items, refusals, duplicate messages, multiple text parts,
malformed reasoning summary, incomplete responses, wrong model and invalid usage
remain rejected. Existing body/time limits and usage accounting remain. This
confirms an incompatibility in the old assumption, NOT the historical Production
INVALID_OUTPUT cause (still UNKNOWN). Output Validator is unchanged.

Validation:
- Provider: 84 assertions, reasoning before/after message, malformed/tool/refusal/
  multiple-answer rejection; native workerd transport and deadlines.
- Generation: 1628; workspace: 155; UI SSR: 35; Admission: 265;
  refund safety: 586; Backup: 939; Credit policy: 262; admin diagnostics PASS.
- Packaged Worker with reasoning+answer Mock responses: QA/Planner, signed admin
  diagnostic headers, WARN, refund, Replay and ledger audit PASS.
- TypeScript, lint, build, diff-check PASS. Existing unused debit lint warning
  remains in test-assistant-refund-safety.mjs.
- Cloud Chrome via managed Sites preview: 1440x900 and 360x800 iframe viewports;
  Q&A natural multi-paragraph answer, compact citations, Planner sections, Enter,
  Shift+Enter, Esc/focus return, reopen with result preserved verified. Captures
  displayed in the work conversation. Extension browser was unavailable.
- Physical mobile soft keyboard, screen reader speech and OS clipboard delivery
  were not tested; existing copy serializer and accessibility contracts remain.

Production untouched (v96 / env64 last confirmed OFF / MAINTENANCE). Real
Provider calls 0; real Credit use 0. No Migration, Backup, profile, price, budget,
collection or diagnostic contract changes. Separate approval required for any
Production release and paid Acceptance. No past failure reason recovered.
