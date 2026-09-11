---
phase: 88-setopts-in-code-hovers-tri-state-composer
fixed_at: 2026-09-11T16:40:00Z
review_path: .planning/phases/88-setopts-in-code-hovers-tri-state-composer/88-REVIEW.md
iteration: 1
findings_in_scope: 2
fixed: 2
skipped: 3
status: all_in_scope_fixed
---

# Phase 88: Code Review Fix Report

**Fixed at:** 2026-09-11T16:40:00Z
**Source review:** .planning/phases/88-setopts-in-code-hovers-tri-state-composer/88-REVIEW.md (round: 88-15 gap closure — VS Code stale-edit guard)
**Iteration:** 1

**Summary:**
- Findings in scope: 2 (the Critical, plus the one Warning inside the newly-added file)
- Fixed: 2
- Skipped: 3 (WR-01, IN-01, IN-02 — see below)

Fixed directly on `main` (no isolated worktree needed — a small, self-contained diff to the
single new file plus its test file, verified in the primary checkout).

## Fixed Issues

### CR-01: `applyIfUnchanged` ignores whether `vscode.workspace.applyEdit` actually succeeded

**Files modified:** `bbj-vscode/src/setopts-stale-edit-guard.ts`, `bbj-vscode/test/setopts-stale-edit-guard.test.ts`
**Commit:** 1a6bdd42

**Applied fix:** Narrowed `applyIfUnchanged`'s `applyEdit` parameter from `() => Thenable<unknown>`
to `() => Thenable<boolean>` (both call sites already pass `() => vscode.workspace.applyEdit(edit)`,
so this is a safe tightening). Both branches now surface the real result instead of assuming
success:
- The unguarded early return (`guard === undefined`) now `return await applyEdit();` instead of
  discarding the result and returning a hardcoded `true`.
- The guarded path's final step captures `const applied = await applyEdit();`, shows
  `STALE_CHECK_FAILED_MESSAGE` when `applied` is falsy, and returns `applied` rather than a
  hardcoded `true`.

This closes the exact class of hole the plan exists to prevent: previously, even after every
pre-apply check passed (snapshot, re-decode, field-wise compare, version re-check), a write that
VS Code itself could not apply (closed editor, read-only document, out-of-range position) was
silently reported as success.

Two pre-existing tests (`no guard supplied...`, `happy path: unchanged document applies once...`)
mocked `applyEdit` to resolve `undefined` — harmless before this fix since the return value was
discarded, but incompatible with the tightened type and the new pass-through behavior. Updated
both to `mockResolvedValue(true)`, matching what the real VS Code API returns on a successful
apply. Added two new tests: `applyEdit` resolving `false` on the guarded path (asserts
`STALE_CHECK_FAILED_MESSAGE` and `result === false`), and on the unguarded path (asserts
`result === false` with no warning shown — unguarded callers keep their "no message" contract).

**Status: fixed**

### WR-02: `sameEntries`' parameter type widens `state` from `SetOptsTriState` to `string`

**Files modified:** `bbj-vscode/src/setopts-stale-edit-guard.ts`
**Commit:** 1a6bdd42 (same commit as CR-01 — both are in the one file this round touched)

**Applied fix:** Imported `SetOptsTriState` from `./setopts-catalog.js` and retyped
`sameEntries`'s two parameters from `ReadonlyArray<{ byte: number; mask: number; state: string }>`
to `ReadonlyArray<{ byte: number; mask: number; state: SetOptsTriState }>`. Verified the type lines
up with the actual call sites: `SetOptsInCodeDecodeResult['initial']` is
`SetOptsTriStateSelection`, whose `entries[].state` is already `SetOptsTriState` — no cast or
widening needed at either caller.

**Status: fixed**

**Verification performed (both fixes above, same commit):**
- `npx vitest run test/setopts-stale-edit-guard.test.ts test/setopts-in-code-ui.test.ts` — 78/78 passing (76 pre-existing + 2 new).
- `npm run build` (tsc -b + esbuild) — clean, no errors.
- `npm run lint` (eslint src test) — clean, no errors/warnings.
- `npx vitest run test/setopts-code-scanner.test.ts test/setopts-in-code-request.test.ts test/hover.test.ts test/setopts-catalog.test.ts test/setopts-in-code-ui.test.ts test/functional/installed-extension-e2e.test.ts test/bbj-code-action-handler.test.ts test/setopts-stale-edit-guard.test.ts` — 271 passed, 1 skipped, 0 failed (271 > the 235 pre-fix baseline).
- Register-check grep over the tracked diff (`bbj-vscode/src`, `bbj-vscode/test`) for `(CR|WR)-[0-9A-Z]+` or `G-88-[0-9]` — no matches.

## Skipped Issues

### WR-01: No error handling around the webviews' RPC-driven `compose()` calls in `change`/`apply`

**Reason skipped:** Pre-existing, not introduced by plan 88-15's diff. `git blame` traces both
`onDidReceiveMessage` handler bodies (`setopts-tristate-webview.ts`, `setopts-composer-webview.ts`)
to plan 88-06 (2026-09-07), three rounds before this one. Plan 88-15's own scope boundary is
explicit: only the `apply` case's final `applyEdit` call is in scope for this round; the review
findings this round's plan lists as out-of-scope (hover branch try/catch placement, etc.) establish
the same pattern of leaving pre-existing findings for a future round rather than expanding this
gap-closure plan's diff. Filed as a candidate for a future quick task alongside the phase's other
accumulated advisory findings in `STATE.md`.

### IN-01: CSP nonce generated with `Math.random()`, not a CSPRNG

**Reason skipped:** Informational severity; both `getNonce()` copies pre-date this round (same
88-06 origin as WR-01) and are unchanged by this plan's diff. Low practical exploitability per the
review's own assessment (fully static, extension-authored HTML). Left for a future consolidation
pass alongside its duplication note (IN-02 below).

### IN-02: comparison helpers' duplicated `undefined`-guard pattern

**Reason skipped:** Informational, purely stylistic (no behavioral risk, explicitly flagged
"not blocking" by the reviewer). A `sameOrBothUndefined` extraction is a reasonable follow-up but
not warranted as an unplanned addition to a gap-closure plan whose scope was fixing the guard's
own defects, not refactoring already-correct comparison logic.

---

_Fixed: 2026-09-11T16:40:00Z_
_Fixer: Claude (orchestrator, inline — no gsd-code-fixer subagent needed for a two-finding,
one-file fix)_
_Iteration: 1_
