# Phase 93: Composer Robustness & Consolidation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-18
**Phase:** 93-Composer Robustness & Consolidation
**Areas discussed:** Consolidation scope, Intention/action shape, Write-path validation, Source-guard re-pointing

---

## Consolidation scope

### Q1 — Scope the phase works to

| Option | Description | Selected |
|--------|-------------|----------|
| Whole present-day family | Guard all 6 dialogs, consolidate all 5 intentions / 6 actions / every helper site; only reading under which criterion 4 is true | ✓ |
| Exactly what each issue names | Closes the issues literally, smallest diff; leaves 3 dialogs NPE-prone and criterion 4 false | |
| Family for fixes, named-only for consolidations | All 6 dialogs get the crash guards; consolidations stay at three files each | |

**User's choice:** Whole present-day family
**Notes:** Driven by the finding that the issues' counts are stale — 5 intentions, 6 actions, 6 `labeled()` sites, 6 dialogs with the unguarded sub-list iteration.

### Q2 — `errorLabel()` and its hardcoded color

| Option | Description | Selected |
|--------|-------------|----------|
| Join shared home, theme-aware color | One definition + `NamedColorUtil.getErrorForeground()`; closes 82-UI-REVIEW fix #2; observable in dark theme | ✓ |
| Join shared home, keep exact color | One definition, pixel-identical rendering, hardcoded RGB ships in 0.16.0 | |
| Leave `errorLabel()` alone | Only the three helpers #619 names; walks past an identical 5× duplication in the same files | |

**User's choice:** Join shared home, theme-aware color
**Notes:** Accepted as an observable change requiring explicit UAT call-out.

### Q3 — Which launch actions collapse

| Option | Description | Selected |
|--------|-------------|----------|
| All 6, availability as a parameter | One shape; SETOPTS pair supplies its own predicates; cue dispatcher stays separate | ✓ |
| Only the 4 uniform actions | Closes #616 exactly; leaves 3 action files and two shapes | |
| All 7, including the cue dispatcher | Maximum consolidation; risks the v4.3 DISC-01 cue click-through | |

**User's choice:** All 6 launch actions, availability as a parameter
**Notes:** Prompted by finding that the two SETOPTS actions carry their own `update()` logic and `BbjOpenComposerAtAction` extends `LSPCommandAction` with a positional argument contract.

### Q4 — `previewUnavailable()` and the failure state

| Option | Description | Selected |
|--------|-------------|----------|
| Shared helper + red failure styling | One definition; closes 82-UI-REVIEW fix #1; stalled preview becomes visibly red | ✓ |
| Shared helper, keep gray styling | One definition, pixel-identical; leaves the visual-weakness finding open | |
| Leave `previewUnavailable` alone | Out of #619's literal scope; keeps six copies | |

**User's choice:** Shared helper + red failure styling

---

## Intention/action shape

### Q1 — How the five intentions collapse

| Option | Description | Selected |
|--------|-------------|----------|
| Abstract base + 5 thin no-arg subclasses | Body collapses once; 5 lightbulb entries and 5 description dirs unchanged | ✓ |
| One class, one dynamic lightbulb entry | Literally one registration; collapses 5 user-visible entries into 1, breaking criterion 5 | |
| One class + 5 `descriptionDirectoryName` registrations | Presented for completeness; cannot vary text/Kind per registration, so it does not work | |

**User's choice:** Abstract base + 5 thin no-arg subclasses
**Notes:** #618's proposed constructor-arg registration is not available on IntelliJ's `<intentionAction>` extension point. Recorded as a platform-forced deviation.

### Q2 — Mechanism for the action collapse

| Option | Description | Selected |
|--------|-------------|----------|
| Base + 6 thin no-arg subclasses | Mirrors the intention decision; no runtime dependency on action-id strings | ✓ |
| One class, Kind from the registered action id | Strictly one class; a renamed id becomes a silent click-time no-op | |
| Hybrid: base for the 4 uniform, id-keyed for the SETOPTS pair | Least churn on the two files with real logic; leaves two shapes | |

**User's choice:** Base + 6 thin no-arg subclasses

### Q3 — Where the per-kind preview HTML lives

| Option | Description | Selected |
|--------|-------------|----------|
| Base builds it from a per-kind sentence | One construction site; popup output byte-identical; stronger guard invariant | ✓ |
| Each subclass keeps its full `generatePreview()` | Zero guard re-pointing; preserves five construction sites | |
| Move prose into the description resources | Least Java; risks reopening #433's lightbulb crash path | |

**User's choice:** Base builds it from per-kind text supplied by the subclass

---

## Write-path validation

### Q1 — Closing COMP-04's SETOPTS gap

| Option | Description | Selected |
|--------|-------------|----------|
| Add `valid` to `SetOptsPreview` server-side, delete the client copy | Server already runs the regex and discards it; all 6 dialogs align; VS Code benefits | ✓ |
| Gate on the existing client-side check | Stays inside `bbj-intellij/`; entrenches the same rule in two languages | |
| Declare SETOPTS out of COMP-04 scope | Zero risk; leaves two dialogs inconsistent and the client-side message in place | |

**User's choice:** Add `valid` to `SetOptsPreview` server-side, delete the client copy
**Notes:** Accepted that this widens the phase beyond `bbj-intellij/` into shared host-neutral LS code.

### Q2 — Whether to build #607's write-path gate

| Option | Description | Selected |
|--------|-------------|----------|
| No second gate — close #607 on the dialog gate | Dialog verdict + SETOPTS fix + existing empty-value guards suffice; record the rejection reasoning | ✓ |
| Blocking revalidation call at the write path | Literally what #607 asks; EDT-blocking pattern forbidden by EDT-01 | |
| Cheap Java structural sanity check | No round trip; is a client-side validation rule the convention forbids | |

**User's choice:** No second gate — close #607 on the dialog gate
**Notes:** Capability was never the blocker — `bbj/composer/msgbox/validateString` already exposes the validator over the wire.

### Q3 — COMP-05's named notice

| Option | Description | Selected |
|--------|-------------|----------|
| New `MALFORMED_EDIT` reason, re-point the severity test | Satisfies "named notice" literally; honest classification; re-points a pinned assertion | ✓ |
| Reuse `requestFailed()` with a fixed sentence | Zero test churn; misclassifies a successful chain returning bad data | |
| Reuse `staleDocument()` | Zero new code; tells the user the line changed when it did not | |

**User's choice:** New `MALFORMED_EDIT` reason, re-point the severity test
**Notes:** All three `Severity` values are already taken, so a 4th reason cannot get a distinct severity — the re-point is unavoidable and deliberate.

---

## Source-guard re-pointing

### Q1 — How the broken guards get re-pointed

| Option | Description | Selected |
|--------|-------------|----------|
| Follow the `BbjRunActionBase` precedent | Pin once in the base's extracted body, delegation pin per subclass, negative assertions keep full breadth | ✓ |
| Union-of-files counting | Smallest test edit; guard can no longer tell base from subclass | |
| Keep guarded members in the concrete classes | Zero test churn; reduces COMP-06 to a cosmetic extraction | |

**User's choice:** Follow the `BbjRunActionBase` precedent
**Notes:** Not a new convention — `EmTokenTrustWindowSourceGuardTest` and `BbjRunActionConfigPathSourceGuardTest` already do exactly this for the BUI/DWC pair.

### Q2 — Guards for the new shared homes, and the duplicated test helpers

| Option | Description | Selected |
|--------|-------------|----------|
| New guards per shared home; helpers stay self-contained | Matches all eight existing guards; isolation is deliberate | ✓ |
| New guards + consolidate the test helpers | Consistent with the phase's deduplication thesis; couples 8+ guards to one file | |
| No new guards | Smallest test diff; leaves the brand-new shared helper unguarded | |

**User's choice:** New guards per shared home; keep test helpers self-contained

---

## Claude's Discretion

- Plan sequencing beyond the ordering the roadmap already fixes.
- Package and class names for the four new shared homes.
- Exact wording of the `MALFORMED_EDIT` notice body.

## Deferred Ideas

- 82-UI-REVIEW priority fix #3 — `detailOf()` raw exception text in the balloon body.
- `shortReason()`'s 80-char truncation with no ellipsis.
- `ComposerFlow.once()`'s one-balloon-per-session rate limit interacting with the new failure styling.
- `90-SECURITY` T-90-11 — no source guard forbidding a static map in `ComposerHandleCache`.
- Four keyword-matched todos reviewed and not folded (two are Phase 96's PLAT-05/PLAT-06, one is
  already fixed, one is local environment drift).
