# Phase 89: CVS() Composer, MSGBOX Expressions & Composer Discoverability - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-12
**Phase:** 89-cvs-composer-msgbox-expressions-composer-discoverability
**Areas discussed:** Cue rollout scope, Cue visual design & IntelliJ fallback, MSGBOX expression replace safety, CVS() composer layout & chars field

---

## Cue rollout scope

| Option | Description | Selected |
|--------|-------------|----------|
| Retire old triggers | Remove VS Code's SETOPTS CodeLens and the MSGBOX/addWindow/addChildWindow lightbulb-only Code Actions in favor of one shared lens | ✓ |
| Keep both | New shared cue adds ambient visibility; existing triggers stay for muscle memory | |

| Option | Description | Selected |
|--------|-------------|----------|
| Retrofit SETOPTS too | DISC-01 names SETOPTS explicitly; ship its cue in this phase | ✓ |
| Leave SETOPTS's existing CodeLens as-is | Treat VS Code's half as already satisfied; only add IntelliJ's | |

| Option | Description | Selected |
|--------|-------------|----------|
| Lightbulb stays everywhere | CodeLens is ambient, lightbulb (Ctrl+.) stays as a different, caret-triggered affordance | ✓ |
| Remove the lightbulb too | Drop CodeAction-based lightbulb entirely for one entry point | |

| Option | Description | Selected |
|--------|-------------|----------|
| One shared implementation now | Build the codeLens handler and switch all 5 composers onto it in this phase | ✓ |
| Add new cue alongside, migrate later | Ship for 3 composers now, unify the rest in a later cleanup phase | |

**User's choice:** Retire old client-side mechanisms, build one shared server-side codeLens handler
covering all 5 composers in this phase, keep the VS Code lightbulb as a separate caret-triggered
affordance alongside it.
**Notes:** None.

---

## Cue visual design & IntelliJ fallback

| Option | Description | Selected |
|--------|-------------|----------|
| Type-specific label | "Compose MSGBOX", "Compose CVS()", etc. | ✓ |
| One generic label | Single "⚡ Composer" label everywhere | |

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, LineMarkerProvider fallback is fine | Acceptable permanent answer if fed by the same server-side codeLens data | ✓ |
| No — must be Code Vision or the phase re-scopes | Treat a failed spike as a blocker | |

| Option | Description | Selected |
|--------|-------------|----------|
| Always visible on every eligible line | Matches DISC-01's "without placing the caret" wording | ✓ |
| Only near the caret/selection | Reduce visual clutter in files with many eligible lines | |

| Option | Description | Selected |
|--------|-------------|----------|
| Text-only label, no icon | Matches existing lightbulb/CodeLens convention | ✓ |
| Icon + text per composer type | Distinguishing glyph per composer | |

**User's choice:** Composer-type-specific text labels, no icons, always-on (not caret-gated); a
LineMarkerProvider fallback on IntelliJ is acceptable if Code Vision's spike fails, as long as it
renders the same server-computed data.
**Notes:** None.

---

## MSGBOX expression replace safety

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, show it in the dialog | Display the original expression text before replace | ✓ |
| No extra display needed | Editor context behind the dialog is enough signal | |

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit banner | Distinguish compose-and-replace from decode-and-prefill visibly | ✓ |
| No banner, empty-state is enough | All-unchecked state is itself the signal | |

| Option | Description | Selected |
|--------|-------------|----------|
| No extra confirmation | Banner + original-expression display already surface the risk | ✓ |
| Yes, add a confirmation step | Require a distinct "Replace expression?" step | |

| Option | Description | Selected |
|--------|-------------|----------|
| Treat like editing a literal — no extra display | Pre-filled checkboxes represent the decoded value, consistent with other composers | ✓ |
| Still show the original expression text | Keep raw text visible even when successfully decoded | |

**User's choice:** Show the original expression and an explicit banner only in the undecodable
(compose-and-replace) case; no second confirmation dialog; the successfully-decoded constant-sum
case behaves like editing any other existing literal value with no extra display.
**Notes:** None.

---

## CVS() composer layout & chars field

| Option | Description | Selected |
|--------|-------------|----------|
| Simple flat layout | Single checkbox list, no byte-group headers/scroll pane | ✓ |
| Reuse SETOPTS's exact panel skeleton | Same JBScrollPane + byte-group structure | |

| Option | Description | Selected |
|--------|-------------|----------|
| One shared text field, shown once | Single `chars` input, greyed out when no customizable bit is checked | ✓ |
| Per-bit chars field | Separate input next to each customizable bit | |

| Option | Description | Selected |
|--------|-------------|----------|
| Accept any string, no client-side version gate | No configured target-BBj-version state exists; rely on compile/runtime error path | ✓ |
| Add a length warning without a version setting | Inline note on multi-character input | |

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — literal integer mask is the only requirement | Mirrors SETOPTS's "absolute literal" tier | (superseded by free-text answer below) |
| Require the whole call to match a stricter literal shape | Every argument must be literal | |

**User's choice (free text):** "the numeric argument in practice can be anything resolving to an
int. literal 3 or 1+2 etc." — clarified via follow-up question into: edit-in-place recognizes a
mask argument that is a **constant-sum of integer literals** (e.g. `5`, `1+4`, `1+2+128`), mirroring
DISC-02's MSGBOX constant-sum recognition. Follow-up asked whether this should also resolve named
constants/Java static fields; user selected **integer literals only, no named constants**, since
CVS() bits have no documented named-constant catalog.
**Notes:** The fourth question's original two options didn't match what the user wanted (a bare
literal vs. a fully-literal whole call); the user's free-text answer superseded both, and a
follow-up question pinned down the exact scope (literals-only sum, no java-interop resolution).

---

## Claude's Discretion

- Exact new `bbj/composer/cvs/*` request names — follow existing `bbj/composer/{msgbox,setopts}/*`
  naming convention.
- Internal structure of the new shared `textDocument/codeLens` handler (new module vs. extending
  `composer-commands.ts`) and how it aggregates the five composers' existing per-line detectors.
- `ConfigureCvsIntention.java`/CVS CodeAction class names and exact label wording; the new CVS
  dialog's class name.
- Exact wording of the MSGBOX compose-and-replace banner and where in the dialog the
  original-expression text renders.

## Deferred Ideas

- Composer robustness (malformed free-text rejection, MSGBOX QuickPick edit-window safety, listener
  leak fixes, IntelliJ debounce/cache) — DISC-07..11, Phase 90.
- General constant expression evaluation beyond a literal sum for MSGBOX/CVS() options — explicit
  anti-feature per FEATURES.md.
- A configured target-BBj-version setting for CVS()'s `chars` single/multi-char version gate —
  declined for this phase (D-13); would need a broader justification to add later.
- Four todo matches (Node path/Windows check/gradle wrapper/getAllClassNames) surfaced by
  `todo.match-phase` on bare keyword matches — reviewed and declined to fold, same as Phases 87/88.
