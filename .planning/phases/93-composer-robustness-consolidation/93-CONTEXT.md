# Phase 93: Composer Robustness & Consolidation - Context

**Gathered:** 2026-09-18
**Status:** Ready for planning

<domain>
## Phase Boundary

The IntelliJ composer surface never raises an IDE-internal error and never writes syntax-breaking
text into a developer's source file, and its duplicated dialogs, intentions, launch actions and
Swing helpers each exist exactly once.

Covers COMP-03 (#609), COMP-04 (#607), COMP-05 (#591), COMP-06 (#630), COMP-07 (#619),
COMP-08 (#618), COMP-09 (#616). Files: `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/`
(28 files), the six `actions/BbjCompose*Action` classes, and — by D-08 only — the SETOPTS preview
producer in the shared language server.

**Two corrections to the issue text that planning must carry:**

1. **Every acceptance criterion's coverage caveat is obsolete.** All seven issues say regression
   coverage "depends on that gap being closed first, or on a recorded manual verification step,"
   because no `bbj-intellij` test source set existed when they were filed. That gap closed in v4.2:
   the suite is at 865 tests with ~23 composer test classes. Real tests are available; the
   manual-verification fallback in each criterion is moot.
2. **The counts in the issues are stale.** They were written against a three-of-everything tree.
   Today: **5** `Configure*Intention` classes, **6** `BbjCompose*Action` classes (+
   `BbjOpenComposerAtAction`), `labeled()` in **6** dialogs, `errorLabel()` in **5**,
   `previewUnavailable()` in **6**, `clip()` in 3 panels, `setEnabledRecursive()` in 2, and the
   COMP-03 unguarded-sub-list bug class in **6** dialogs, not the 3 named.

</domain>

<decisions>
## Implementation Decisions

### Consolidation scope

- **D-01:** Work to the **whole present-day family**, not the counts the issues name. Null-guard all
  6 dialogs against malformed `catalogs` sub-lists; consolidate all 5 intentions, all 6 launch
  actions, and every `labeled()`/`clip()`/`setEnabledRecursive()` site. This is the only reading
  under which roadmap criterion 4 ("exactly one definition in the source tree") is true at phase
  end. The three dialogs #609 does not name — `SetoptsComposerDialog:129,133`,
  `SetoptsTriStateComposerDialog:126,130`, `CvsComposerDialog:141` — iterate catalogs sub-lists with
  the same missing guard and are in scope.
- **D-02:** `errorLabel()` (duplicated 5×, each with its own `new Color(0xC0392B)`) joins the shared
  Swing home, and its red becomes theme-aware (`NamedColorUtil.getErrorForeground()` or
  `JBColor.namedColor`). Closes 82-UI-REVIEW priority fix #2. **This is an observable change** —
  error text renders a different red in Light and a correct red in Darcula — and must be called out
  at UAT, never claimed as no-observable-delta. — **Reversibility:** reversible — one helper body.
- **D-03:** All 6 launch actions collapse onto one shared shape carrying `Kind` **plus an
  availability predicate**: the 4 uniform ones use the default project+editor gate, the 2 SETOPTS
  ones supply their config-file and BBj-source predicates (`SetoptsInCodeActionAvailability` already
  exists as a pure, platform-free predicate seam and should be the model).
  `BbjOpenComposerAtAction` stays separate — it extends `LSPCommandAction`, is dispatched by LSP4IJ
  by action id with a positional `ComposerLensTarget`, and is pinned by
  `BbjOpenComposerAtActionSourceGuardTest` and `ComposerLensCommandContractTest`.
- **D-04:** `previewUnavailable(String)` becomes one shared helper taking the target label as a
  parameter (the six dialogs set three different fields: `summary`, `flagsSummary`, `blockPreview`),
  and routes its text through the same theme-aware error styling as D-02. Closes 82-UI-REVIEW
  priority fix #1. **Observable:** a stalled preview becomes visibly red rather than gray — call out
  at UAT. — **Reversibility:** reversible.

### Intention and action shape

- **D-05:** COMP-08 ships as an **abstract base + 5 thin no-arg subclasses**, not #618's proposed
  "single data-driven registration". IntelliJ's `<intentionAction>` extension point accepts only
  `<className>`, instantiates via a no-arg constructor, and gives the instance no way to learn which
  registration produced it — so one class registered 5× cannot vary its text, `Kind` or keyword.
  The five lightbulb entries stay exactly as users see them, and the five
  `intentionDescriptions/<SimpleClassName>/` directories keep resolving unchanged. **Record this as a
  deliberate, platform-forced deviation from the issue's wording when closing #618.**
  — **Reversibility:** costly — undo touches 5 classes plus their plugin.xml entries.
- **D-06:** COMP-09 ships the same way — **base + 6 thin no-arg subclasses** — even though an
  `AnAction` *could* read its own registered id via `ActionManager.getId(this)` and map id → `Kind`.
  Rejected because it makes a renamed or mistyped action id a silent no-op at click time rather than
  a compile error. Mirrors D-05 so both consolidations have one shape and one review story.
  — **Reversibility:** costly.
- **D-07:** The single `new IntentionPreviewInfo.Html(...)` construction moves to the intention base;
  each subclass supplies only its own description sentence. Popup output must stay byte-identical.
  The inline HTML preview is retained deliberately — Phase 82 added it so the popup never falls back
  to the description resource, which is where #433's crash lived.
- **Design note for the planner:** the five intentions differ in exactly four things — `getText()`,
  the availability check, the `Kind`, and the preview sentence. `getFamilyName()` is identical
  ("BBj visual composer") in all five. The availability check must be a **predicate, not a keyword
  string**: `ConfigureSetoptsInCodeIntention` calls `isCaretOnSetoptsInCode(editor)` (a three-keyword
  gate), not `isCaretOnCall(editor, keyword)`.

### Write-path validation

- **D-08:** COMP-04's real remaining gap is the SETOPTS pair. `SetOptsPreview`
  (`ComposerModels.java:417`; `setopts-catalog.ts:329`) carries no `valid` verdict, which is why
  `SetoptsComposerDialog:291` and `SetoptsTriStateComposerDialog:262` call
  `setOKActionEnabled(true)` — the other four dialogs already gate on `setOKActionEnabled(p.valid)`.
  **Add `valid` (plus a `rawTailError` string) to `SetOptsPreview` server-side** — `setoptsPreview`
  already runs the `/^[0-9A-Fa-f]*$/` test at `setopts-catalog.ts:356` and discards the result —
  gate both SETOPTS dialogs on it, and **delete the client-side regex and message** at
  `SetoptsComposerDialog:213-218`, which today duplicates a server-owned rule in Java and violates
  the locked "dialogs hold no validation rule or message of their own" convention. This widens the
  phase beyond `bbj-intellij/` into shared, host-neutral language-server code, which the standing
  constraint permits for anything both IDEs need; VS Code's SETOPTS webview gets the same verdict.
  — **Reversibility:** costly — a shared wire DTO both hosts consume; undo means re-adding the Java
  rule and touching the VS Code webview.
- **D-09:** **No second validation gate at `ComposerLauncher`'s write path**, despite #607's literal
  wording. #607 is closed on the dialog-side server verdict (all six dialogs after D-08) plus the
  existing empty-value guards in `openMsgbox`, `applyHexEdit` and `openSetopts`. Rejected because it
  would either re-run a server round trip on or near the EDT inside a `WriteCommandAction` —
  forbidden by the Phase 79 EDT-01 convention — or re-implement the rule in Java, the exact
  duplication D-08 deletes. Note the capability exists and was not the blocker:
  `bbj/composer/msgbox/validateString` (`composer-commands.ts:106`) already exposes
  `validateStringField` over the wire. **Write the rejection reasoning into the code or the summary**
  so #607 can be closed as done rather than skipped.
- **D-10:** COMP-05 raises a **new 4th `ComposerNotices.Reason`, `MALFORMED_EDIT`**, carrying
  `WARNING` and its own wording ("the language server sent an unusable edit range; nothing was
  changed"). `ComposerNoticesTest.everyReasonHasADistinctSeverityAndOnlyTheStaleOneHasARemedy()`
  asserts `EnumSet.of(...).size() == 3` over a hardcoded three-notice list and all three `Severity`
  values are already taken, so that assertion must be **deliberately re-pointed** to an explicit
  per-reason severity table, and the remedy-count assertion widened. Per D-01 the length guard covers
  **every** LS-supplied range array, not only `flagsRange`/`eventMaskRange`: `hexRange` at
  `ComposerLauncher.java:499-502` and `:601` is the same bug class.
  — **Reversibility:** costly — changes a pinned test contract.

### Source-guard re-pointing

- **D-11:** Re-point the broken guards using the **`BbjRunActionBase` precedent already in this
  repo** (`EmTokenTrustWindowSourceGuardTest`, `BbjRunActionConfigPathSourceGuardTest`,
  `OffEdtDispatchSourceGuardTest`): assert each pin **exactly once inside the base's extracted method
  body** via a brace-balanced `extractMethodBody()`, add a **delegation pin per subclass**, and keep
  every **negative/zero assertion sweeping all subclass files** at full breadth. The resulting
  invariants are stronger than today's per-file counts — a pin can no longer satisfy the guard by
  existing in the wrong file. `OffEdtDispatchSourceGuardTest:110-123` is the model for the
  abstract-declaration edge case. — **Reversibility:** costly.
- **D-12:** Each of the four new shared homes gets **its own source guard**, and every guard keeps
  **its own private copy** of `countOccurrences`/`extractMethodBody`/`withoutCommentLines`/
  `readSource`, exactly as the eight existing guards do. The test-helper duplication is deliberate
  isolation: a guard importing a shared `extractMethodBody` could be silently weakened for every
  guard at once by a single edit. Phase 93's deduplication applies to `main/`, not to the guards.

### Claude's Discretion

- Plan sequencing within the phase, beyond the ordering the roadmap already fixes (COMP-06 before
  COMP-04's dialog-side work; COMP-03 and COMP-05 before COMP-09 consolidates the launch path).
- Where the four new shared homes live (package and class names).
- Exact wording of the `MALFORMED_EDIT` notice body, within D-10's meaning.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase and requirement definition
- `.planning/ROADMAP.md` — Phase 93 goal, the five success criteria, and the ordering note
  (COMP-06 → COMP-04; COMP-03/COMP-05 → COMP-09)
- `.planning/REQUIREMENTS.md` — COMP-03..COMP-09 statements and the v4.4 subsystem grouping
- `.planning/STATE.md` — Active Constraints and the standing decisions this phase must preserve

### Prior-phase review findings this phase closes
- `.planning/milestones/v4.2-phases/82-composer-robustness/82-UI-REVIEW.md` — priority fixes #1
  (gray `previewUnavailable`, D-04) and #2 (hardcoded `0xC0392B`, D-02); priority fix #3
  (`detailOf()` raw exception text) and the un-ellipsized `shortReason()` truncation are **not**
  taken in this phase — see Deferred

### Code the decisions bind to
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java` — the write
  paths (D-09), the unchecked range indexing at `:440`, `:446`, `:499-502`, `:601` (D-10)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerNotices.java` — the 3-Reason
  enum D-10 extends
- `bbj-intellij/src/main/resources/META-INF/plugin.xml` — the 5 `<intentionAction>` and 7 `<action>`
  registrations (D-05, D-06)
- `bbj-vscode/src/setopts-catalog.ts` — `SetOptsPreview` (`:329`) and `setoptsPreview` (`:344`,
  regex at `:356`) that D-08 changes
- `bbj-vscode/src/language/composer-commands.ts` — the shared `bbj/composer/*` request surface both
  hosts use

### Test contracts that constrain the work
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmTokenTrustWindowSourceGuardTest.java`
  and `.../BbjRunActionConfigPathSourceGuardTest.java` — the base-aware guard pattern D-11 adopts
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/OffEdtDispatchSourceGuardTest.java` — the
  abstract-declaration edge case
- `.../composer/ComposerApplyGuardSourceGuardTest.java` — pins exactly 6 `applyIfUnchanged(`, 6
  `replaceString(`, 1 `insertString(`, one comparator per kind, 2 of each `*DecodeCall(`, and
  extracts method bodies **by name** (`openMsgbox(`, `openCvs(`, `documentViewOf(`, `insertAt(`)
- `.../composer/ComposerDialogRefreshSourceGuardTest.java`, `.../ComposerFieldValidationSourceGuardTest.java`,
  `.../ComposerIntentionPreviewSourceGuardTest.java`, `.../IntentionDescriptionResourcesTest.java`,
  `.../ComposerNoticesTest.java` — the guards D-10/D-11 re-point

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SetoptsInCodeActionAvailability` — a 36-line, platform-free pure predicate. The model for D-03's
  availability parameter.
- `ComposerLensKinds` — an existing wire-kind → `Kind` map with no IntelliJ import. Relevant to
  D-06's rejected id-keyed option; leave it owning only the cue contract.
- `ComposerFlow` / `StaleEditGuard` / `ComposerNotices` / `PreviewDebouncer` + `AlarmScheduler` —
  the Phase 82/87/90 seams every dialog already routes through. The bases must preserve them, not
  re-implement them.
- `BbjRunActionBase` + `BbjRunBuiAction`/`BbjRunDwcAction` — a working base + thin-subclass pair with
  matching guards. The structural model for both new bases.

### Established Patterns
- **The server owns validation; dialogs render its verdict.** Pinned by
  `ComposerFieldValidationSourceGuardTest`. D-08 extends this to SETOPTS; D-09 refuses to break it.
- **Plain-Java seams carry no `com.intellij` import** so plain JUnit 5 can exercise them
  (`ComposerFlow`, `ComposerNotices`, `TokenValidationCache`, `SetoptsInCodeActionAvailability`).
  Any new predicate or helper holding logic should follow this.
- **Source guards pin IDE-only wiring by whole-file literal counts**, with comment lines stripped
  before every count-based assertion.
- **Blocking work stays off the EDT** (Phase 79 EDT-01) — the direct basis for D-09.

### Integration Points
- `plugin.xml`: 5 `<intentionAction>` entries and 7 `<action>` entries; `IntentionDescriptionResourcesTest`
  derives its subject list *from plugin.xml* and honours an optional `descriptionDirectoryName`, so it
  tolerates redirection — but `ComposerIntentionPreviewSourceGuardTest` hard-codes five file paths and
  asserts exactly `5` `<intentionAction>` occurrences.
- `intentionDescriptions/<SimpleClassName>/` — five directories, each with `description.html`
  (needing the `<!-- tooltip end -->` marker), `before.bbj.template` and `after.bbj.template`. D-05
  keeps all five class names, so all five keep resolving.
- The `bbj/composer/*` request namespace is the only channel between the dialogs and the server.

</code_context>

<specifics>
## Specific Ideas

- Criterion 5's "behaves identically after the consolidation" is **not** literally true of this
  phase as decided: D-02 and D-04 deliberately change two visual states (error red becomes
  theme-aware; a stalled preview becomes red instead of gray). Both were accepted with the explicit
  condition that they are **called out at UAT as intended changes**, not reported as no-observable-delta.
- The UAT round must cover all six composer kinds reached three ways each — lightbulb (5 intentions),
  editor context menu (6 actions), and composer cue click-through (`BbjOpenComposerAtAction`) —
  because D-03/D-05/D-06 touch every one of those entry points.

</specifics>

<deferred>
## Deferred Ideas

- **82-UI-REVIEW priority fix #3** — `ComposerNotices.detailOf()` puts raw exception text into the
  balloon body. Not taken: it changes user-facing error content across every composer failure path
  and deserves its own decision about what the balloon says versus what the console mirrors.
- **`ComposerNotices.shortReason()`'s 80-char truncation with no ellipsis** (82-UI-REVIEW Pillar 1) —
  a one-line fix, but it is a copywriting change outside the seven requirements.
- **`ComposerFlow.once()`'s one-balloon-per-dialog-session rate limit** (82-UI-REVIEW Pillar 6) —
  a second, unrelated failure in one dialog session raises no balloon. Interacts with D-04; revisit
  once the failure label is visually distinct.
- **`90-SECURITY` T-90-11** — `ComposerHandleCache` has no source guard forbidding a static map.
  Adjacent to this phase's files but is a security-control gap, not one of the seven requirements.

### Reviewed Todos (not folded)

`todo.match-phase 93` returned four keyword matches; none belong to this phase:
- `2026-09-06-configured-node-path-suppresses-cached-download-fallback` — is **PLAT-05, Phase 96**
- `2026-09-06-live-windows-check-for-node-auto-install-failure` — is **PLAT-06, Phase 96**
- `2026-09-05-gradle-wrapper-hygiene-fixture-declares-stale-gradle-version` — fixed 2026-09-06;
  needs close-out, not work
- `2026-09-03-update-live-interop-tests-for-getallclassnames-backend` — environment drift in the
  local vitest baseline, unrelated to the IntelliJ composer

</deferred>

---

*Phase: 93-Composer Robustness & Consolidation*
*Context gathered: 2026-09-18*
