---
phase: 126-ls-denum
reviewed: 2026-10-02T00:00:00Z
depth: standard
files_reviewed: 21
files_reviewed_list:
  - bbj-vscode/src/denum-diagnostics-output.ts
  - bbj-vscode/src/extension.ts
  - bbj-vscode/src/language/bbj-denum-service.ts
  - bbj-vscode/src/language/bbj-format-service.ts
  - bbj-vscode/src/language/bbj-module.ts
  - bbj-vscode/src/language/bbj-notifications.ts
  - bbj-vscode/src/language/denum-command.ts
  - bbj-vscode/src/language/denum-notifications.ts
  - bbj-vscode/src/language/main.ts
  - bbj-vscode/test/activation-command-coverage.test.ts
  - bbj-vscode/test/bbj-denum-offer.test.ts
  - bbj-vscode/test/bbj-denum-outcomes.test.ts
  - bbj-vscode/test/bbj-denum-service.test.ts
  - bbj-vscode/test/bbj-format-notices.test.ts
  - bbj-vscode/test/bbj-test-module.ts
  - bbj-vscode/test/denum-command.test.ts
  - bbj-vscode/test/denum-diagnostics-output.test.ts
  - bbj-vscode/test/denum-test-harness.ts
  - bbj-vscode/test/extension-activation.test.ts
  - bbj-vscode/test/fake-server-connection.ts
  - bbj-vscode/test/functional/program-live.test.ts
findings:
  critical: 0
  warning: 2
  info: 4
  total: 6
status: issues_found
---

# Phase 126: Code Review Report

**Reviewed:** 2026-10-02
**Depth:** standard
**Files Reviewed:** 21
**Status:** issues_found

## Summary

The DENUM orchestration is carefully built: capture-then-recheck of the buffer version, a single
core for `run` and `runDenumAndFormat`, fixed message texts only, a never-throwing handler, and a
payload renderer that validates every field. I traced the stale-buffer, claim/release, cancellation
and not-applied paths and found them correct. The VS Code client (`vscode-languageclient`
`validateWorkspaceEdit`) does refuse a versioned edit whose version no longer matches the open
document, so D-07/D-14 hold on VS Code. Behaviour that matches a locked decision (never-deduplicated
DENUM messages, server-applied edits, `Warning` on any failure, Format-on-save offer) was not
treated as a finding. No security issues found: payload text is rendered as plain lines, nothing in
a payload becomes a command, path or jump target.

Two robustness warnings and four minor items follow.

## Warnings

### WR-01: A hung `workspace/applyEdit` holds the per-document claim forever

**File:** `bbj-vscode/src/language/bbj-denum-service.ts:320-322, 346, 358, 368-372` (and `bbj-vscode/src/language/bbj-notifications.ts` `applyDocumentEdit`)
**Issue:** `running.add(claimed)` is released only in `finally`, and the run awaits
`messenger.applyEdit(...)` with no deadline and no cancellation. Every other await in the run is
bounded (the peer calls carry 15 s / 25 s deadlines), but a client that never answers
`workspace/applyEdit` (a client that does not implement it, a dropped response, or a modal prompt
the editor never resolves) leaves the promise pending. From then on every `bbj/denum` and every
offer click for that document ends with `DENUM_IN_PROGRESS_MESSAGE` until the server restarts,
which is exactly the "a DENUM run always gets its answer" guarantee (D-12) broken. The CONTEXT
interface comment says "Every method is fire and forget or never rejects", but never-rejects is not
never-hangs.
**Fix:** Bound the apply in `applyDocumentEdit` (or at the call sites) with a timeout that resolves
`false`, so the run ends with `not-applied` and the claim is released:
```ts
const APPLY_EDIT_TIMEOUT_MS = 30_000;
function withDeadline(p: Promise<boolean>, ms: number): Promise<boolean> {
    return new Promise(resolve => {
        const timer = setTimeout(() => resolve(false), ms);
        p.then(v => { clearTimeout(timer); resolve(v); }, () => { clearTimeout(timer); resolve(false); });
    });
}
// in applyDocumentEdit: return withDeadline(apply(), APPLY_EDIT_TIMEOUT_MS);
```
Add a test with an `applyEdit` mock that never settles (fake timers) asserting a second run is not
`in-progress` afterwards.

### WR-02: A run that reports diagnostics but yields no edit drops them silently

**File:** `bbj-vscode/src/language/bbj-denum-service.ts:353-357`
**Issue:** When `denumbered === true` and `minimalLineEdit` returns no edits, the code sends the
plain `base` message and returns, never calling `denumDiagnostics` / `presentSuccess`. D-03 says a
run with diagnostics > 0 shows the counts and [Show], and D-01 says the list is the one source for
every path. Here the diagnostics are copied into the result (`diagnostics` is returned) but the user
and the output channel never see them, so a caller sees diagnostics in the result that the client
never rendered. This is reachable when the peer answers `denumbered: true` with text that equals the
buffer (for example a buffer the user already denumbered by hand while the version stayed equal is
not possible, but a peer that reports diagnostics for an already-clean text is). The branch also has
no test.
**Fix:** Route the no-edit success through `presentSuccess` so diagnostics are always surfaced:
```ts
if (edits.length === 0) {
    const message = this.presentSuccess(live.uri, diagnostics, base);
    return { status: 'denumbered', message, version, edits, diagnostics, applied: false };
}
```

## Info

### IN-01: Combined run on a file that turned out unnumbered reports "Nothing to denumber" although it reformatted the file

**File:** `bbj-vscode/src/language/bbj-denum-service.ts:340-351`
**Issue:** With `denumbered: false` and a non-empty format edit, the edit is applied and then
`DENUM_NOTHING_TO_DO_MESSAGE` is shown, with `status: 'not-line-numbered'` and `applied: true`. The
user who clicked "Denumber and Format" gets a message that says nothing was done while their buffer
changed (one extra undo step). Also any diagnostics on that answer are ignored. A test asserts this
deliberately, so it is a wording gap rather than a logic error.
**Fix:** Use a distinct text for the applied case, for example `'This file has no line numbers. It was formatted.'`, and keep `DENUM_NOTHING_TO_DO_MESSAGE` for the no-edit case.

### IN-02: `flatten` only handles CR and LF

**File:** `bbj-vscode/src/denum-diagnostics-output.ts:76-78`
**Issue:** The header docs promise "one entry is always one output line", but only `\r` and `\n`
are replaced. U+2028, U+2029, U+0085 and other C0 controls pass through in `message`,
`originalLineNumber` and the uri. The DTO comment says the interop guard already strips control
characters from `message`, but `originalLineNumber` and `uri` rely on that being true for fields the
guard may not cover, and this function is documented as the trust boundary.
**Fix:** Replace every C0/C1 control character and the Unicode line and paragraph separators (U+2028, U+2029) with a space, not only CR and LF.

### IN-03: Duplicated "run only if the user picked X" logic

**File:** `bbj-vscode/src/language/bbj-denum-service.ts:166-176, 184-194`
**Issue:** `runOnPick` and the inline `warnWithActions` handler both implement the same
then/try/catch/ignore pattern, with differing guards (`picked === actionTitle` versus
`picked !== undefined && actionTitles.includes(picked)`).
**Fix:** Make `runOnPick` take a predicate/callback `(picked: string) => void` and implement the
single-button variants on top of it.

### IN-04: Handler mixes the module-level channel with the injected one

**File:** `bbj-vscode/src/extension.ts:637-645`
**Issue:** `registerDenumDiagnosticsOutput` receives `outputChannel` in `deps` and uses it for
`show(true)`, but writes through the module-level `appendOutputLine`, which targets the module
global `outputChannel`. They are the same object today; if they ever diverge, the list is written to
one channel and revealed on another.
**Fix:** Write through the injected channel (`deps.outputChannel.appendLine`, wrapped in the same
try/catch) or reveal through the module global, not a mix of both.

---

_Reviewed: 2026-10-02_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
