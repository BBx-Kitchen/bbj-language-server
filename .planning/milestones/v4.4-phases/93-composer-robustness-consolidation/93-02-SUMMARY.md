---
phase: 93-composer-robustness-consolidation
plan: 02
subsystem: composer-setopts-validation
tags: [setopts, validation, wire-contract, intellij, vscode, language-server]
dependency-graph:
  requires: []
  provides:
    - "SetOptsPreview.valid / SetOptsPreview.rawTailError (bbj-vscode/src/setopts-catalog.ts, bbj-intellij ComposerModels.SetoptsPreview)"
    - "ComposeSetOptsBlockResult.valid / SetOptsComposeTriStateResult.valid (bbj-vscode/src/setopts-catalog.ts + setopts-in-code-request.ts, bbj-intellij ComposerModels.SetoptsComposeTriStateResult)"
    - "MAX_RAW_TAIL_DIGITS + the single raw-tail regex (bbj-vscode/src/setopts-catalog.ts)"
  affects:
    - "Plan 93-08: deletes SetoptsComposerDialog's client-side raw-tail regex/message and gates both SETOPTS dialogs on `p.valid` using these fields"
tech-stack:
  added: []
  patterns:
    - "Server owns validation; dialogs/webviews render its verdict (extended to SETOPTS)"
    - "Fail-closed Java boolean default: a response missing `valid` parses as `false`"
key-files:
  created: []
  modified:
    - bbj-vscode/src/setopts-catalog.ts
    - bbj-vscode/src/setopts-composer-webview.ts
    - bbj-vscode/src/language/setopts-in-code-request.ts
    - bbj-vscode/test/setopts-catalog.test.ts
    - bbj-vscode/test/composer-commands.test.ts
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerModels.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerModelsJsonBoundaryTest.java
decisions:
  - "MAX_RAW_TAIL_DIGITS=14 and the single RAW_TAIL_PATTERN regex live in setopts-catalog.ts, evaluated once per setoptsPreview call and reused for both the apply-gate and the returned valid/rawTailError fields."
  - "composeSetOptsBlock's valid is fail-closed response-integrity semantics (true whenever a composition was actually produced), not a new selection-level rejection rule -- an all-Leave selection stays valid:true in both scopes, including the empty-text 'reassignments' case."
metrics:
  duration: ~35min
  completed: 2026-09-18
actuals:
  tokens: 4267
  tasks: 3
  commits: 3
status: complete
---

# Phase 93 Plan 02: SETOPTS Raw-Tail Server-Side Validation Summary

Moved the SETOPTS raw-tail validity rule (`[0-9A-Fa-f]{0,14}`) to the language server as the single
source of truth, and put the resulting `valid`/`rawTailError` verdict on the wire for both VS Code
and IntelliJ — plus a parallel fail-closed `valid` verdict on the tri-state compose result — so
plan 93-08 can delete the duplicated Java copy in `SetoptsComposerDialog` and gate both SETOPTS
dialogs the same way the other four already do.

## What Was Built

**Task 1 — Server-computed raw-tail verdict, proven end-to-end in VS Code** (commit `53d26948`):
`setoptsPreview` (`bbj-vscode/src/setopts-catalog.ts`) now evaluates a single module-level
`RAW_TAIL_PATTERN = /^[0-9A-Fa-f]{0,14}$/` (bound to `MAX_RAW_TAIL_DIGITS = 14`) exactly once per
call, and reuses that one boolean both to decide whether the tail is applied (unchanged behaviour:
an invalid tail leaves `hexDigits` untouched) and to populate two new `SetOptsPreview` fields:
`valid: boolean` and `rawTailError?: string`. The VS Code SETOPTS webview
(`setopts-composer-webview.ts`) now disables its Apply button from `!m.valid` and renders
`m.rawTailError` in a dedicated error element next to the raw-tail input, clearing it when the key
is absent — styled via a new `.note.error` class using `var(--vscode-errorForeground)`. Six new
vitest cases cover valid/empty/invalid/15-digit-over-bound/14-digit-boundary/lower-case tails.

**Task 2 — Tri-state compose verdict on the same wire** (commit `dec3bdc1`): `composeSetOptsBlock`
now returns `valid: true` alongside its existing `lines`/`text` — the same fail-closed
response-integrity semantics `AddWindowPreview.valid` already documents, not a new rejection rule.
An all-Leave selection is a legitimate composition in both `'block'` and `'reassignments'` scope
(including the empty-text `'reassignments'` case — "clear my overrides" is real, not an error) and
stays `valid: true`, pinned by three new tests. `composer-commands.ts`'s handler body was left
untouched (see Deviations — the real handler lives elsewhere).

**Task 3 — Java DTO mirrors and JSON-boundary coverage** (commit `a1e54154`):
`ComposerModels.SetoptsPreview` gained `public boolean valid;` and `public String rawTailError;`;
`ComposerModels.SetoptsComposeTriStateResult` gained `public boolean valid;`. Both default
fail-closed (`false`/`null`) when the response carries no such key — a Java primitive Gson never
sees stays at its default, matching `AddWindowPreview`'s documented convention. Five new
`ComposerModelsJsonBoundaryTest` cases cover: SETOPTS preview `valid:true`, `valid:false` +
`rawTailError`, and the no-key fail-closed envelope; composeTriState `valid:true` and its own
no-key fail-closed envelope. `composer-commands.test.ts`'s existing invalid-tail assertion
(`hexDigits` unchanged) is extended, unmodified in spirit, with `valid`/`rawTailError` checks, plus
a new matching valid-tail case.

## Wire Contract for Plan 93-08

- `bbj/composer/setopts/preview` result now carries `valid: boolean` and `rawTailError?: string`
  (present only when `valid` is `false` and the raw tail is the reason).
- The exact `rawTailError` wording is **`"must be 0-9 or A-F, up to 14 digits"`** — byte-identical
  to what `SetoptsComposerDialog:219` shows today, so deleting the Java copy in plan 93-08 changes
  no user-visible text.
- `bbj/composer/setopts/composeTriState` result now carries `valid: boolean` — always `true` for
  any successfully-produced composition (this handler never produces a `false` result itself; a
  Java client only sees `false` from a genuinely malformed/partial wire response).
- Both Java DTOs (`ComposerModels.SetoptsPreview`, `ComposerModels.SetoptsComposeTriStateResult`)
  default `valid` to `false` and `rawTailError` to `null` when the key is absent from the response
  — the fail-closed convention plan 93-08 can rely on when it wires `setOKActionEnabled(p.valid)`
  into both SETOPTS dialogs.
- The mask-replacement-character rule (`isValidMaskChar`) deliberately stayed client-side in this
  plan, per D-08's flagged scope — only the raw-tail regex moved.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - blocking issue] `composeTriState` handler is not in `composer-commands.ts`**
- **Found during:** Task 2 (read_first step)
- **Issue:** The plan's `<interface_context>` states `'bbj/composer/setopts/composeTriState' is
  registered in the same map` as `composer-commands.ts`'s `setopts/preview` handler. That is
  factually incorrect: `composer-commands.ts` never registers `composeTriState` at all. The real
  handler (`createComposeTriStateHandler`, a thin pass-through to `composeSetOptsBlock`) lives in
  `bbj-vscode/src/language/setopts-in-code-request.ts`, which is architecturally separate because
  it is registered AFTER `createBBjServices` runs (per that file's own header comment) while
  `composer-commands.ts`'s handlers are registered before. `bbj-intellij`'s own
  `ComposerRequestContractTest` independently confirms this — it already reads
  `setopts-in-code-request.ts` as a separate source, not `composer-commands.ts`, to find the
  `composeTriState` request-name literal.
- **Fix:** Added `valid: boolean` to `SetOptsComposeTriStateResult` in
  `bbj-vscode/src/language/setopts-in-code-request.ts` instead of `composer-commands.ts`. The
  underlying `ComposeSetOptsBlockResult` change in `setopts-catalog.ts` (Task 2's actual
  construction site, per the plan's own instruction to change it "in the one place the response is
  constructed") flows through the pass-through handler unchanged; only the interface declaration in
  `setopts-in-code-request.ts` needed a matching field so the type stays honest.
  `composer-commands.ts` itself required no code change and was not touched.
- **Files modified:** `bbj-vscode/src/language/setopts-in-code-request.ts` (not in the plan's
  declared `files_modified` list; `bbj-vscode/src/language/composer-commands.ts`, which WAS
  declared, ended up untouched).
- **Commit:** `dec3bdc1`

### Notes (not deviations)

- D-09's rejection reasoning (no second validation gate at `ComposerLauncher`'s write path) is
  plan 93-08 territory (IntelliJ dialog wiring), not this plan's — nothing to write here.

## Known Stubs

None.

## Self-Check: PASSED

- `bbj-vscode/src/setopts-catalog.ts` — FOUND, contains `MAX_RAW_TAIL_DIGITS`, `RAW_TAIL_PATTERN`,
  `valid`/`rawTailError` on `SetOptsPreview`, `valid` on `ComposeSetOptsBlockResult`.
- `bbj-vscode/src/setopts-composer-webview.ts` — FOUND, Apply button and error element wired.
- `bbj-vscode/src/language/setopts-in-code-request.ts` — FOUND, `valid` added to
  `SetOptsComposeTriStateResult`.
- `bbj-intellij/.../ComposerModels.java` — FOUND, `valid`/`rawTailError` on `SetoptsPreview`,
  `valid` on `SetoptsComposeTriStateResult`.
- Commit `53d26948` — FOUND in `git log --oneline --all`.
- Commit `dec3bdc1` — FOUND in `git log --oneline --all`.
- Commit `a1e54154` — FOUND in `git log --oneline --all`.
- `cd bbj-vscode && npx vitest run test/setopts-catalog.test.ts test/composer-commands.test.ts` —
  85 tests passed, 0 failed.
- `cd bbj-intellij && ./gradlew test` — 889 tests, 0 failures, 0 errors (full suite; includes the
  standing local `bbj-vscode` interop-drift baseline being out of scope for this Java-only run).
- Register-check: `git diff` across all three commits for `COMP-0[0-9]|D-0[0-9]|C-0[0-9]|CR-[0-9]|plan 93|93-02` — zero hits.
