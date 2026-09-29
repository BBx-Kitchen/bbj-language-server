---
phase: 113-composer-webview-hardening-consolidation
reviewed: 2026-09-27T13:34:41Z
depth: standard
files_reviewed: 38
files_reviewed_list:
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddWindowComposerDialog.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerModels.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/CvsComposerDialog.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/MsgboxComposerDialog.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerAssignToSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerModelsJsonBoundaryTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerRequestContractTest.java
  - bbj-vscode/src/addchildwindow-composer.ts
  - bbj-vscode/src/addchildwindow-composer-ui.ts
  - bbj-vscode/src/addchildwindow-composer-webview.ts
  - bbj-vscode/src/addwindow-composer.ts
  - bbj-vscode/src/addwindow-composer-ui.ts
  - bbj-vscode/src/addwindow-composer-webview.ts
  - bbj-vscode/src/composer-call-scanner.ts
  - bbj-vscode/src/composer-commands.ts
  - bbj-vscode/src/cvs-composer.ts
  - bbj-vscode/src/cvs-composer-webview.ts
  - bbj-vscode/src/language/main.ts
  - bbj-vscode/src/msgbox-composer.ts
  - bbj-vscode/src/msgbox-composer-webview.ts
  - bbj-vscode/src/setopts-composer-webview.ts
  - bbj-vscode/src/setopts-tristate-webview.ts
  - bbj-vscode/src/webview-csp.ts
  - bbj-vscode/src/webview-message-guard.ts
  - bbj-vscode/src/window-composer-ui.ts
  - bbj-vscode/test/addchildwindow-composer-ui.test.ts
  - bbj-vscode/test/addwindow-composer-ui.test.ts
  - bbj-vscode/test/composer-assign-to.test.ts
  - bbj-vscode/test/composer-call-scanner.test.ts
  - bbj-vscode/test/composer-commands.test.ts
  - bbj-vscode/test/composer-webview-message-shape.test.ts
  - bbj-vscode/test/cvs-composer-ui.test.ts
  - bbj-vscode/test/setopts-composer-ui.test.ts
  - bbj-vscode/test/setopts-in-code-request.test.ts
  - bbj-vscode/test/webview-csp.test.ts
  - bbj-vscode/test/webview-message-guard.test.ts
  - bbj-vscode/test/window-composer-ui.test.ts
findings:
  critical: 0
  warning: 2
  info: 1
  total: 3
status: issues_found
---

# Phase 113: Code Review Report

**Reviewed:** 2026-09-27T13:34:41Z
**Depth:** standard
**Files Reviewed:** 38
**Status:** issues_found

## Summary

Reviewed the full VS Code + IntelliJ composer consolidation: the shared `composer-call-scanner.ts`
locator, the shared `webview-csp.ts` CSP/nonce helper, the shared `webview-message-guard.ts`
primitives and every consumer's `isXxxPanelMessage` guard, the shared `window-composer-ui.ts`
Code Action helper, the `assignTo` validation added to MSGBOX/CVS, the `composer-commands.ts`
relocation out of `src/language`, and the IntelliJ-side `ComposerModels`/`ComposerLauncher`/dialog
classes plus their JSON-boundary, request-contract and assign-to source-guard tests.

Adversarial focus was on (a) behavioral drift where a shared helper's edge-case handling differs
from the copy it replaced, and (b) bypasses of the new postMessage shape guards. I traced
`scanArgs`/`findCalls`/`findCallAt` against all three call sites (MSGBOX, addWindow/addChildWindow,
CVS) and confirmed the documented boundary differences (`notAfterIdentifierOrDot` for CVS vs. the
looser match for MSGBOX/addWindow/addChildWindow) are deliberate and covered by an explicit
"boundary difference survives the consolidation" test. I traced `windowPanelArgAt`'s generic
`Extra`-merge and `requireFlagsSlot` branch against both the addWindow and addChildWindow specs and
found no field collision or silently-dropped behavior. I attempted to actually exploit the one
guard gap I found (below) by hand-tracing `setopts-catalog.ts`'s `setBit`/`growTo`/`encodeVector`
with an attacker-supplied `NaN` byte/mask, and confirmed it does **not** corrupt output today,
because `setoptsPreview` only ever calls `setBit` with catalog-supplied values and merely tests
membership against the attacker's `sel.bits` array (a `NaN` entry can never satisfy `===` and is
silently dropped) — so this is a real but currently-inert gap, not a live bug.

No Critical-tier findings. Two Warning-tier findings (a guard-rigor inconsistency across sibling
panels, and duplicated-but-diverging boundary semantics worth a shared assertion) and one Info-tier
finding (a misleading ordering comment carried over from a per-editor-model difference that no
longer applies to the code it now sits next to).

## Warnings

### WR-01: `setopts-composer-webview.ts`'s message guard validates array-of-strings but not each entry's shape

**File:** `bbj-vscode/src/setopts-composer-webview.ts:69-76` (guard), `:161-171` (`toSelection`)
**Issue:** `isSetOptsSelection` checks `checked` with `isStringArray`, which only proves every
element is *a* string — it never checks that each element matches the `"<byte>:<mask>"` shape
`toSelection` assumes:

```ts
function toSelection(sel: PanelSelection): SetOptsSelection {
    return {
        bits: sel.checked.map(id => {
            const [byte, mask] = id.split(':').map(Number);
            return { byte, mask };
        }),
        ...
    };
}
```

A malformed entry (e.g. `"abc"`, `"1"`, or `"1:2:3"`) parses to `{ byte: NaN, mask: undefined }` (or
similar) with no error and no dropped message — the guard's whole stated purpose (file header:
"a broken or compromised webview script must not be able to push a wrongly typed value" into a
`WorkspaceEdit`) is only partially met here. Contrast this with the sibling panel added in the same
plan wave, `setopts-tristate-webview.ts`, whose `isTriStateEntry` validates every field explicitly:

```ts
function isTriStateEntry(value: unknown): value is { byte: number; mask: number; state: SetOptsTriState } {
    return isPlainObject(value)
        && isFiniteInt(value.byte)
        && isFiniteInt(value.mask)
        && isOneOf(value.state, TRI_STATE_VALUES);
}
```

I hand-traced the actual impact through `setopts-catalog.ts`: `setoptsPreview` iterates the fixed
`SETOPTS_BITS` catalog and calls `setBit(v, bit.byte, bit.mask, sel.bits.some(b => b.byte ===
bit.byte && b.mask === bit.mask))` — it never passes an attacker-supplied byte/mask into `setBit`
directly, only tests membership by strict equality, so a `NaN`/malformed entry can never match and
is silently (harmlessly) ignored today. This makes the gap currently inert, but it is a real
divergence from the "hardening" the phase's own test suite claims for all six panels
(`composer-webview-message-shape.test.ts`'s generic battery never exercises a malformed *string
content* inside `checked`, only wrong container types), and it would become live the moment any
future change threads `sel.bits` values more directly into byte-array indexing.
**Fix:** Validate each `checked` entry's shape before use, e.g.:
```ts
const BIT_ID_PATTERN = /^\d+:\d+$/;
function isSetOptsSelection(value: unknown): value is PanelSelection {
    return isPlainObject(value)
        && isStringArray(value.checked) && value.checked.every(id => BIT_ID_PATTERN.test(id))
        && isString(value.maskComma)
        && isString(value.maskDot)
        && isString(value.rawTail);
}
```

### WR-02: `findCalls`'s two boundary modes are exercised only by hand-picked fixtures, not a shared property test across every real caller

**File:** `bbj-vscode/src/composer-call-scanner.ts:61-88`, cross-referenced against
`bbj-vscode/src/msgbox-composer.ts:651`, `bbj-vscode/src/addwindow-composer.ts:416`,
`bbj-vscode/src/addchildwindow-composer.ts:340`, `bbj-vscode/src/cvs-composer.ts:157-159`
**Issue:** The shared locator now offers two matching modes selected per call site
(`notAfterIdentifierOrDot` true only for CVS), but nothing in the consolidated module enforces that
each of the four real call sites still asks for the *same* mode it asked for before the
consolidation — only `composer-call-scanner.test.ts`'s one `describe('per-composer boundary
difference survives the consolidation')` block pins this, and only for MSGBOX vs. CVS (it never
exercises `findAddWindowCalls`/`findAddChildWindowCalls`, which also default to the looser mode).
A future edit to `addwindow-composer.ts`/`addchildwindow-composer.ts` that flips or drops the
`options` argument on their `findCalls(...)` call (there is no compile-time enforcement — the
parameter is optional and defaults silently to the looser behavior) would pass every other test in
this phase silently, since no test asserts addWindow/addChildWindow's own boundary mode the way the
CVS/MSGBOX pair is asserted.
**Fix:** Extend the existing `composer-call-scanner.test.ts` "per-composer boundary difference
survives the consolidation" block (or add a sibling one) to also assert
`findAddWindowCalls`/`findAddChildWindowCalls` keep the looser (`xaddwindow(`-matching) behavior
explicitly, the way MSGBOX and CVS already are, so a future accidental flip of either composer's
`findCalls` options argument fails a test instead of only changing runtime behavior silently.

## Info

### IN-01: Misleading "apply right-to-left" comment carried into the VS Code addChildWindow edit path

**File:** `bbj-vscode/src/addchildwindow-composer-webview.ts:184-198`
**Issue:** `applyEdit`'s comment claims edits must be applied "right-to-left" ("Apply insertions
right-to-left so the flags insert doesn't shift the event-mask offset") and the function is
ordered event-mask-then-flags to match. This rationale is true for the *IntelliJ* counterpart
(`ComposerLauncher.applyHexEdit`, which mutates one shared `Document` via sequential
`doc.replaceString()` calls and genuinely must sort by descending offset — see
`ComposerLauncher.java:474-478`), but it does not apply to a VS Code `vscode.WorkspaceEdit`: all
`edit.replace`/`edit.insert` calls added to one `WorkspaceEdit` are computed against the
document's original (pre-edit) offsets and applied together, not sequentially in call order, so the
call order here has no actual effect on correctness. The sibling `addwindow-composer-webview.ts`'s
own `applyEdit` (flags-then-event-mask, the opposite order) is equally correct for the same reason.
This is not a functional bug, but the comment misattributes an ordering *requirement* to code that
has none, which risks a future contributor "fixing" an imagined offset bug, or copying the
rationale into a context (e.g. a future single-`Document`-mutation refactor) where it would then
need to be true but isn't derived from anything enforced today.
**Fix:** Reword the comment to note that `WorkspaceEdit` edits are order-independent (computed
against the original offsets), or drop the ordering rationale entirely and rely on the shared
`AddWindowEdit`/`ComposerLauncher.applyHexEdit` precedent only where it's actually required
(the IntelliJ side).

---

_Reviewed: 2026-09-27T13:34:41Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
