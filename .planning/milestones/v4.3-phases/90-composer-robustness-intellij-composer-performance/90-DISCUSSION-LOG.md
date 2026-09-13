# Phase 90: Composer Robustness & IntelliJ Composer Performance - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-12
**Phase:** 90-composer-robustness-intellij-composer-performance
**Areas discussed:** MSGBOX picker's future, addWindow input validation, Fix scope vs. the issues, IntelliJ cache lifecycle

---

## Todo cross-reference

| Option | Description | Selected |
|--------|-------------|----------|
| MSGBOX nests in unfinished call | `x = MSGBOX(` decodes not-found; compose-new nests a statement inside it (score 0.9) | ✓ |
| Configured Node path fallback | Unusable configured Node.js path suppresses cached-download fallback (score 0.6) | ✓ (later deferred) |
| Live Windows Node install check | Human attestation of Node.js auto-install on Windows (score 0.6) | ✓ (later deferred) |

**Follow-up — how to record the two Node.js todos:**

| Option | Description | Selected |
|--------|-------------|----------|
| Keep them as deferred | List under Deferred Ideas; not in Phase 90 plans | ✓ |
| Fold the Node path fix only | Extra plan for the configured-path fallback; Windows check deferred | |
| Fold both as requested | Both in scope; Windows check becomes an unclosable human UAT item | |

**User's choice:** MSGBOX todo folded; both Node.js todos deferred.
**Notes:** The Node.js todos are outside the composer scope, and REQUIREMENTS.md lists the Windows
check as maintainer-owned.

---

## MSGBOX picker's future

| Option | Description | Selected |
|--------|-------------|----------|
| Keep it, add re-check | Both edit/insert branches re-find the call and abort on mismatch | ✓ |
| Drop its edit/insert branches | Unreachable from the UI; keep the picker for compose-new only | |
| Retire the picker entirely | `bbj.composeMsgbox` opens the visual panel; removes the duplicate menu entry | |

| Option | Description | Selected |
|--------|-------------|----------|
| Abort with a warning | Fail-closed like every other composer's stale guard | ✓ |
| Follow the call if it's unambiguous | Relocate when the identical call text appears exactly once nearby | |

| Option | Description | Selected |
|--------|-------------|----------|
| Span-exact, shared by both | Text matches AND a MSGBOX call still spans exactly that range; used by picker and panel | ✓ |
| Picker only, text comparison | Add today's slice comparison to the picker; panel unchanged | |

| Option | Description | Selected |
|--------|-------------|----------|
| Complete the call in place | Unfinished-call decode outcome, prefill, guarded replace of the partial span (both IDEs) | ✓ |
| Refuse with a notice | "Finish or remove the unfinished MSGBOX( call first" | |

| Option | Description | Selected |
|--------|-------------|----------|
| No banner | Nothing hand-written is discarded; assign-to row hidden | ✓ |
| Short informational banner | "Completing an unfinished MSGBOX( call" | |

**User's choice:** All recommended options.

---

## addWindow input validation

| Option | Description | Selected |
|--------|-------------|----------|
| Checks by field type | Structural everywhere; title must be a String; geometry/id reject a bare string literal | ✓ |
| Structure only | Only unterminated strings and unbalanced parentheses rejected | |
| Stricter shape rules | Plus numeric-looking geometry and `!`-suffixed receiver/sysgui/window | |

| Option | Description | Selected |
|--------|-------------|----------|
| Blank keeps the default | Unchanged; only typed text is validated | ✓ |
| Blank required fields block Insert | Geometry and title become required | |

| Option | Description | Selected |
|--------|-------------|----------|
| Same as MSGBOX | Per-field errors + `valid`; inline errors; Insert/OK disabled; server-side guard stays | ✓ |
| One summary line only | Single "N fields invalid" line; Insert/OK disabled | |

| Option | Description | Selected |
|--------|-------------|----------|
| Skip checks in edit mode | Fields aren't written in edit mode (as CVS does) | ✓ |
| Check them anyway | Validate displayed fields even though they aren't written | |

**User's choice:** All recommended options.

---

## Fix scope vs. the issues

| Option | Description | Selected |
|--------|-------------|----------|
| All six, one shared helper | Helper scopes the message handler to the panel; test discovers panel files itself | ✓ |
| All six, fixed in each file | Inline cleanup repeated six times | |
| Only the four #530 names | CVS and tri-state keep the leak | |

| Option | Description | Selected |
|--------|-------------|----------|
| Every input, like SETOPTS/CVS | Typing, checkboxes, combos via `scheduleRefresh()`; debounced dialogs untouched | ✓ |
| Text typing only | Clicks still refresh immediately | |

**User's choice:** All recommended options.

---

## IntelliJ cache lifecycle

| Option | Description | Selected |
|--------|-------------|----------|
| One cache for all callers | Per-project cache in BbjComposerService for composers, compile and refresh | ✓ |
| Composers only | Cache in the composer launcher; other callers keep resolving | |

| Option | Description | Selected |
|--------|-------------|----------|
| On any status change | Cleared via the existing server-status topic | ✓ |
| Only on a fresh start | Cleared only when a new server reports started | |

| Option | Description | Selected |
|--------|-------------|----------|
| Clear cache, show balloon | Existing not-ready/request-failed balloon; Retry re-resolves | ✓ |
| Clear cache, retry once silently | One hidden retry within the 30 s deadline | |

| Option | Description | Selected |
|--------|-------------|----------|
| On first composer open | Lazy; first open after each start pays once | ✓ |
| Right after server start | Prefetch on every start/restart | |

**User's choice:** All recommended options.

---

## Claude's Discretion

- Picker abort warning wording; names/locations of the shared panel-listener helper and the MSGBOX
  span-exact check.
- Exact bare-string-literal rule for numeric fields and all validation message wording.
- Name of the MSGBOX unfinished-call flag and the IntelliJ completing-mode signal.
- Debounce interval (reuse existing constant).
- Cache seam shape and where a failed request clears it.
- Whether the picker's compose-new branch needs any extra guard.

## Deferred Ideas

- Configured-but-unusable Node.js path suppresses the cached-download fallback (todo 2026-09-06).
- Live Windows check for the Node.js auto-install failure (todo 2026-09-06, maintainer attestation).
