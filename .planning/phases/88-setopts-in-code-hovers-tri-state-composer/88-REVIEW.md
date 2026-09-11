---
phase: 88-setopts-in-code-hovers-tri-state-composer
reviewed: 2026-09-11T00:00:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - bbj-vscode/src/setopts-stale-edit-guard.ts
  - bbj-vscode/src/setopts-tristate-webview.ts
  - bbj-vscode/src/setopts-composer-webview.ts
  - bbj-vscode/src/setopts-in-code-ui.ts
  - bbj-vscode/test/setopts-stale-edit-guard.test.ts
  - bbj-vscode/test/setopts-in-code-ui.test.ts
findings:
  critical: 1
  warning: 2
  info: 2
  total: 5
status: fixed
fix_report: 88-REVIEW-FIX.md
---

# Phase 88: Code Review Report (round: 88-15 gap closure — VS Code stale-edit guard)

**Reviewed:** 2026-09-11T00:00:00Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** fixed — see [88-REVIEW-FIX.md](./88-REVIEW-FIX.md) (CR-01 and WR-02 fixed in commit
1a6bdd42; WR-01/IN-01/IN-02 deferred as pre-existing/informational, not introduced this round)

## Summary

This round ports IntelliJ's `StaleEditGuard`/`DecodeEquality` contract into VS Code as
`setopts-stale-edit-guard.ts`, and wires it into both SETOPTS-in-code edit-in-place writers
(`setopts-tristate-webview.ts`'s chain-replace apply, `setopts-composer-webview.ts`'s
absolute-literal apply). The field-wise decode comparison (`sameSetOptsInCodeDecode` and its
helpers) is complete and correctly covers every field of `SetOptsInCodeDecodeResult`,
`SetOptsInCodeAbsoluteEdit` and `SetOptsInCodeChainEdit` (verified against
`src/language/setopts-in-code-request.ts`), is order-sensitive on `initial.entries` as intended,
and compares arrays element-wise rather than by reference. The version-snapshot / re-decode /
version-recheck sequencing in `applyIfUnchanged` matches its own documented contract, and the
"unguarded caller" path (compose-new, config.bbx) is correctly untouched.

However, the guard's own final step — the actual `vscode.workspace.applyEdit()` call — silently
discards the success/failure signal VS Code's API gives it, which reopens exactly the kind of
silent-write hole this whole phase exists to close (see CR-01). Two further robustness gaps
(missing error handling around the webviews' RPC-driven `compose()` calls, and non-crypto nonce
generation) are documented below as warnings/info.

## Critical Issues

### CR-01: `applyIfUnchanged` ignores whether `vscode.workspace.applyEdit` actually succeeded

**File:** `bbj-vscode/src/setopts-stale-edit-guard.ts:165-167` and `:194-195`
**Issue:**
`vscode.workspace.applyEdit(edit): Thenable<boolean>` resolves `false` whenever the edit could
not be applied (invalid/out-of-range positions, a document that became read-only, an editor that
closed between the check and the write, etc. — see `@types/vscode`'s own doc comment: "A thenable
that resolves when the edit **could be applied**"). Both branches of `applyIfUnchanged` —
the unguarded early-return at lines 165-167 and the guarded path's final step at lines 194-195 —
`await` this call and then unconditionally `return true`, without ever inspecting the resolved
boolean:

```ts
if (guard === undefined) {
    await applyEdit();
    return true;
}
...
await applyEdit();
return true;
```

This means that even after every one of the guard's pre-apply checks passes (snapshot, re-decode,
field-wise compare, version re-check), the write itself can still silently fail — and the caller
(both webview modules) treats that identically to success: no warning is shown, `panel.dispose()`
runs immediately afterward, and the user is left believing the edit was applied when nothing was
actually written. This is precisely the "silent stale write" failure mode plan 88-15 exists to
close (module header: "Every branch is fail-closed") — the very last branch is not. No test in
`setopts-stale-edit-guard.test.ts` exercises this path: every `applyEditMock` in both test files
is `vi.fn().mockResolvedValue(true)`, so a `false` resolution is untested and the gap is invisible
to the current suite.

**Fix:**
```ts
export async function applyIfUnchanged(
    guard: SetOptsStaleEditGuard | undefined,
    applyEdit: () => Thenable<boolean>,
    timeoutMs: number = STALE_EDIT_REDECODE_TIMEOUT_MS,
): Promise<boolean> {
    if (guard === undefined) {
        return await applyEdit();
    }
    ...
    const applied = await applyEdit();
    if (!applied) {
        vscode.window.showWarningMessage(STALE_CHECK_FAILED_MESSAGE);
    }
    return applied;
}
```
(Narrowing the `applyEdit` parameter type from `() => Thenable<unknown>` to
`() => Thenable<boolean>` — both call sites already pass `() => vscode.workspace.applyEdit(edit)`,
so this is a safe tightening, not a breaking change.) Add a test that mocks
`applyEditMock.mockResolvedValueOnce(false)` and asserts a warning is shown and `false` is
returned, for both the guarded and unguarded paths.

## Warnings

### WR-01: No error handling around the webviews' RPC-driven `compose()` calls in `change`/`apply`

**File:** `bbj-vscode/src/setopts-tristate-webview.ts:120-128`, `bbj-vscode/src/setopts-composer-webview.ts:102-107`
**Issue:** `panel.webview.onDidReceiveMessage(async (msg) => { switch (msg.type) { ... } })` has no
`try`/`catch` anywhere in its body. In `setopts-tristate-webview.ts`, `case 'change'` and
`case 'apply'` both `await compose(msg.payload)`, which round-trips
`bbj/composer/setopts/composeTriState` to the language server — a call that can reject (server
unreachable, request cancelled, thrown validation error). If it does, the `async` callback's
returned promise rejects with no attached handler (`onDidReceiveMessage` discards the listener's
return value), producing an unhandled rejection; worse, on the `apply` path the rejection happens
*before* `edit`, `applyIfUnchanged`, and `panel.dispose()` ever run, so the panel is left open with
no `WorkspaceEdit` applied and no feedback to the user — indistinguishable from a hang.
`setopts-composer-webview.ts`'s `build()` in `case 'apply'` (line 107) is synchronous rather than
RPC-driven, but the same missing-try/catch structure means a thrown exception there has the
identical effect (panel stuck open, `panel.dispose()` never reached).
**Fix:** Wrap each case body (or the whole handler) in try/catch; on failure, show a message via
`vscode.window.showWarningMessage` (or reuse `STALE_CHECK_FAILED_MESSAGE`-style wording) and still
`panel.dispose()` so the user isn't left with a silently-stuck panel:
```ts
panel.webview.onDidReceiveMessage(async (msg) => {
    try {
        switch (msg.type) { ... }
    } catch (error) {
        vscode.window.showWarningMessage(`SETOPTS composer failed: ${error instanceof Error ? error.message : String(error)}`);
        panel.dispose();
    }
}, undefined, context.subscriptions);
```

### WR-02: `sameEntries`' parameter type widens `state` from `SetOptsTriState` to `string`

**File:** `bbj-vscode/src/setopts-stale-edit-guard.ts:77-80`
**Issue:** `sameEntries` (and therefore `sameInitial`) types its inputs as
`ReadonlyArray<{ byte: number; mask: number; state: string }>` rather than reusing the actual
`SetOptsTriState` union (`'set' | 'clear' | 'leave'`) that `SetOptsTriStateSelection.entries`
declares. This loses type-checking against typos or future enum-value drift at this comparison
boundary — TypeScript would not flag e.g. a caller accidentally comparing against `'Set'` or a
renamed state literal, since `string` accepts anything.
**Fix:** Import and use the concrete type:
```ts
import type { SetOptsTriState } from './setopts-catalog.js';
...
function sameEntries(
    a: ReadonlyArray<{ byte: number; mask: number; state: SetOptsTriState }>,
    b: ReadonlyArray<{ byte: number; mask: number; state: SetOptsTriState }>,
): boolean { ... }
```

## Info

### IN-01: CSP nonce generated with `Math.random()`, not a CSPRNG

**File:** `bbj-vscode/src/setopts-tristate-webview.ts:338-345`, `bbj-vscode/src/setopts-composer-webview.ts:340-347`
**Issue:** Both webview modules' `getNonce()` builds the per-load CSP nonce with
`Math.floor(Math.random() * chars.length)`. `Math.random()` is not cryptographically secure
(CWE-330); a predictable nonce weakens the CSP's guarantee that only the extension's own
`<script nonce="...">` block executes. The practical exploitability here is low (the HTML is
generated entirely from static, extension-authored content — the identical pattern is what
Microsoft's own `vscode-extension-samples` webview boilerplate uses), so this is informational
rather than a real vulnerability today, but it's worth tightening opportunistically since both
copies of `getNonce()` are already duplicated verbatim across the two files.
**Fix:** Use Node's `crypto.randomBytes`/`randomInt` (available in the extension host) instead of
`Math.random()`, and consider factoring the now-identical `getNonce()` into one shared helper
instead of two duplicate copies.

### IN-02: `sameSetOptsInCodeDecode`'s exported comparison helpers are not the tightest reasonable API surface

**File:** `bbj-vscode/src/setopts-stale-edit-guard.ts:51-99`
**Issue:** `sameAbsolute`, `sameChain`, `sameEntries`, and `sameInitial` are internal
(non-exported) helpers, which is good encapsulation, but their duplicated
`if (a === undefined || b === undefined) { return a === b; }` guard is repeated three times
verbatim (lines 54-56, 65-67, 95-97) rather than factored into one small `bothOrNeitherUndefined`
helper. Purely a minor duplication/readability nit — no behavioral risk — noted for completeness
at standard-depth review, not blocking.
**Fix (optional):**
```ts
function sameOrBothUndefined<T>(a: T | undefined, b: T | undefined, eq: (a: T, b: T) => boolean): boolean {
    if (a === undefined || b === undefined) return a === b;
    return eq(a, b);
}
```

---

_Reviewed: 2026-09-11T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
