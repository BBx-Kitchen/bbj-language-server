# Phase 93: Composer Robustness & Consolidation - Research

**Researched:** 2026-09-18
**Domain:** IntelliJ plugin internals (Swing dialogs, `AnAction`/`IntentionAction` registration, source-guard test pattern) + one shared-language-server DTO change (TypeScript/Java parity)
**Confidence:** HIGH — every claim below with a `[VERIFIED: path:lines]` tag was read directly this session; no external library research was needed because this phase adds zero new dependencies.

## Summary

Phase 93 is pure in-repo consolidation and hardening of code that already exists and is already
tested (22 test files under `bbj-intellij/src/test/java/.../composer/`, 10 more under `.../actions/`
that touch the launch path). There is no new library to select and no external API to learn — the
entire research task is: (1) confirm the exact literal/line-number claims CONTEXT.md's 12 decisions
rest on, (2) fully expose the source-guard mechanics the planner must reproduce for four new shared
homes, and (3) catalog every near-duplicate precisely enough that the planner can write "extract
verbatim" vs. "extract-and-reconcile" tasks correctly.

All CONTEXT.md line-number citations this session verified against the live source matched exactly
(§Package/File verification below lists each). Two additional findings CONTEXT.md did not call out:
`AddWindowComposerDialog`/`AddChildWindowComposerDialog` also duplicate a `labeledWithError(...)`
helper (not just `labeled`/`errorLabel`), and three of the "identical" duplicate pairs the roadmap
treats as one shape are only **behaviorally** identical, not **textually** identical — a naive
extract-move will fail a byte-for-byte diff and needs reconciliation, not a blind cut-paste. Both are
folded into Common Pitfalls and the Don't Hand-Roll table below.

**Primary recommendation:** Do the extraction work file-by-file using the `BbjRunActionBase` precedent
exactly (`git -C` diff-verified below), re-point each named source guard using the same
`extractMethodBody`/`countOccurrences`/`withoutCommentLines` pattern already living in eight guards,
and land COMP-06 (addWindow-family base) before touching COMP-04's per-dialog validation, per the
roadmap's fixed ordering.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Malformed-catalogs guard (COMP-03) | IDE plugin (`bbj-intellij` dialogs + `ComposerLauncher`) | — | Sub-list null-safety is a Swing-rendering concern; the server already returns whatever shape it has, correct or not |
| Syntax-safe write validation (COMP-04) | Language server (`bbj-vscode/src/setopts-catalog.ts`) owns the rule; IDE plugin renders the verdict | — | Standing convention: "the server owns validation; dialogs render its verdict" `[VERIFIED: bbj-intellij/src/test/java/.../ComposerFieldValidationSourceGuardTest.java:14-21]` |
| Range-array crash guard (COMP-05) | IDE plugin (`ComposerLauncher`, `ComposerNotices`) | — | Purely a Java-side defensive check on an LSP response shape; no server change |
| addWindow-family shared base (COMP-06) | IDE plugin (`bbj-intellij/.../composer/`) | — | Swing dialog composition, entirely IDE-local |
| Swing helper consolidation (COMP-07) | IDE plugin | — | `clip`/`labeled`/`setEnabledRecursive` are pure Swing rendering helpers |
| Intention consolidation (COMP-08) | IDE plugin (`<intentionAction>` extension point) | — | Platform-forced by IntelliJ's no-arg-constructor extension point contract |
| Launch-action consolidation (COMP-09) | IDE plugin (`<action>` extension point) | — | Same platform constraint as COMP-08 |
| SETOPTS `valid` verdict (D-08, folds into COMP-04) | Language server (`bbj-vscode/src/setopts-catalog.ts`) | IDE plugin + VS Code webview consume it | Host-neutral rule per the standing v4.4 constraint — anything both IDEs need is a language-server request, never IntelliJ-only |

## User Constraints

<user_constraints>
### Locked Decisions (from 93-CONTEXT.md, verbatim intent — see full text at `.planning/phases/93-composer-robustness-consolidation/93-CONTEXT.md`)

- **D-01 (scope):** Work to the whole present-day family — 6 dialogs, 5 intentions, 6 launch actions,
  every `labeled()`/`clip()`/`setEnabledRecursive()` site, not the stale counts in the GitHub issues.
  The three dialogs #609 does not name (`SetoptsComposerDialog:129,133`,
  `SetoptsTriStateComposerDialog:126,130`, `CvsComposerDialog:141`) are in scope for COMP-03.
- **D-02:** `errorLabel()` (5×, each with its own `new Color(0xC0392B)`) becomes one shared,
  theme-aware helper (`NamedColorUtil.getErrorForeground()` or `JBColor.namedColor`). Observable
  change — call out at UAT, not a no-observable-delta claim.
- **D-03:** All 6 launch actions collapse onto one shared shape carrying `Kind` plus an availability
  predicate; `SetoptsInCodeActionAvailability` is the model. `BbjOpenComposerAtAction` stays separate
  (extends `LSPCommandAction`, dispatched by id with a positional target).
- **D-04:** `previewUnavailable(String)` becomes one shared helper taking the target label as a
  parameter, routed through the same theme-aware error styling as D-02. Observable change — call out
  at UAT.
- **D-05:** COMP-08 ships as an abstract base + 5 thin no-arg subclasses (not one data-driven class) —
  platform-forced: `<intentionAction>` takes only `<className>`, instantiates no-arg, gives the
  instance no way to learn which registration produced it. Record this as a deliberate deviation from
  #618's wording when closing it.
- **D-06:** COMP-09 ships the same way — base + 6 thin no-arg subclasses — even though `AnAction`
  could read its own id via `ActionManager.getId(this)`. Rejected: a renamed/mistyped action id would
  become a silent no-op at click time instead of a compile error.
- **D-07:** The single `new IntentionPreviewInfo.Html(...)` construction moves to the intention base;
  each subclass supplies only its description sentence. Popup output must stay byte-identical. The
  inline HTML preview stays (added in Phase 82 so the popup never falls back to the description
  resource — where #433's crash lived).
- **D-08:** Add `valid` (plus `rawTailError` string) to `SetOptsPreview`
  (`bbj-vscode/src/setopts-catalog.ts:329`; `ComposerModels.java:417`). Gate both SETOPTS dialogs on
  it; delete the client-side regex/message at `SetoptsComposerDialog:213-218`. Widens the phase into
  shared LS code by the standing host-neutral-feature constraint; VS Code's SETOPTS webview gets the
  same verdict.
- **D-09:** No second validation gate at `ComposerLauncher`'s write path, despite #607's literal
  wording. #607 closes on the dialog-side server verdict (all six dialogs after D-08) plus the
  existing empty-value guards in `openMsgbox`, `applyHexEdit`, `openSetopts`. A second gate would
  either re-run a server round trip near the EDT inside a `WriteCommandAction` (forbidden by Phase 79
  EDT-01) or re-implement the rule in Java (the exact duplication D-08 deletes). Write the rejection
  reasoning into code/summary so #607 can close as done.
- **D-10:** COMP-05 raises a new 4th `ComposerNotices.Reason`, `MALFORMED_EDIT` (`WARNING`, own
  wording). `ComposerNoticesTest.everyReasonHasADistinctSeverityAndOnlyTheStaleOneHasARemedy()`
  (asserts `EnumSet.of(...).size() == 3`) must be deliberately re-pointed to an explicit per-reason
  severity table; the remedy-count assertion widens. Per D-01, guard **every** LS-supplied range
  array — `flagsRange`/`eventMaskRange` AND `hexRange` (`ComposerLauncher.java:499-502` and `:601`).
- **D-11:** Re-point broken guards using the `BbjRunActionBase` precedent: assert each pin exactly
  once inside the base's extracted method body (brace-balanced `extractMethodBody()`), add a
  delegation pin per subclass, keep every negative/zero assertion sweeping all subclass files at full
  breadth. `OffEdtDispatchSourceGuardTest:110-123` is the model for the abstract-declaration edge case.
- **D-12:** Each of the four new shared homes gets its own source guard; every guard keeps its own
  private copy of `countOccurrences`/`extractMethodBody`/`withoutCommentLines`/`readSource` — no
  shared test helper, by design (isolation: a shared helper could be silently weakened for every guard
  at once by a single edit).

### Claude's Discretion
- Plan sequencing within the phase, beyond the roadmap's fixed ordering (COMP-06 before COMP-04's
  dialog-side work; COMP-03 and COMP-05 before COMP-09 consolidates the launch path).
- Where the four new shared homes live (package and class names).
- Exact wording of the `MALFORMED_EDIT` notice body, within D-10's meaning.

### Deferred Ideas (OUT OF SCOPE)
- 82-UI-REVIEW priority fix #3 (`ComposerNotices.detailOf()` raw exception text) — own decision needed
  about balloon vs. console content.
- `ComposerNotices.shortReason()`'s 80-char truncation with no ellipsis — copywriting, out of the
  seven requirements.
- `ComposerFlow.once()`'s one-balloon-per-dialog-session rate limit — interacts with D-04, revisit
  once the failure label is visually distinct.
- `90-SECURITY` T-90-11 (`ComposerHandleCache` static-map guard) — security-control gap, not one of
  the seven requirements.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| COMP-03 (#609) | Malformed/partial `bbj/composer/catalogs` response degrades gracefully, no IDE Internal Error | §Malformed-Catalogs Inventory below enumerates every unguarded sub-list site across all 6 dialogs, verified by direct read/grep this session |
| COMP-04 (#607) | Dialog text that would break BBj syntax is rejected/escaped before write | §D-08 SETOPTS Gap verified line-for-line; §Write-Path Empty-Value Guards catalogs the four existing guards D-09 relies on |
| COMP-05 (#591) | `applyHexEdit` range-array bugs fail gracefully, not `ArrayIndexOutOfBoundsException` | §ComposerLauncher Range-Array Inventory gives exact line numbers for `flagsRange`/`eventMaskRange`/`hexRange`; §ComposerNotices Reason Enum gives the exact assertion to re-point |
| COMP-06 (#630) | addWindow/addChildWindow dialogs share one base | §addWindow-Family Duplicate Inventory: field-by-field diff of both dialogs' catalogs-consuming code, `setEnabledRecursive`, `labeledWithError` |
| COMP-07 (#619) | `clip`/`labeled`/`setEnabledRecursive` exist exactly once | §Swing Helper Duplicate Inventory: full-body diffs of all instances, flags the two near-duplicates (behaviorally not textually identical) |
| COMP-08 (#618) | 5 `Configure*Intention` classes become one data-driven registration (base + subclasses per D-05) | §Intention Consolidation Mechanics: exact `ComposerIntentionPreviewSourceGuardTest` assertions that move to the base |
| COMP-09 (#616) | 6 launch actions become one data-driven registration (base + subclasses per D-06) | §Launch-Action Consolidation Mechanics: exact per-action guard assertions (3 of 6 actions have their own `SourceGuardTest` today) that move to the base |
</phase_requirements>

## Standard Stack

No new external dependency is introduced by this phase. Every capability (Swing UI, IntelliJ
extension points, plain JUnit 5, LSP4IJ command dispatch) is already in the project's dependency
graph and already used by the exact files this phase touches.

### Core (already in use, unchanged)
| Library | Version | Purpose | Evidence |
|---------|---------|---------|----------|
| `org.junit.jupiter:junit-jupiter` via `org.junit:junit-bom` | 6.1.3 | Plain-JUnit 5 tests for all source guards and plain-Java seams | `[VERIFIED: bbj-intellij/build.gradle.kts:39-41]` `testImplementation(platform("org.junit:junit-bom:6.1.3"))` |
| Gradle wrapper | 9.7.1 | Build/test runner for `bbj-intellij` | `[VERIFIED: bbj-intellij/gradle/wrapper/gradle-wrapper.properties:4]` |
| vitest | ^4.1.10 | `bbj-vscode` test runner (relevant only for the D-08 shared-LS change) | `[VERIFIED: bbj-vscode/package.json:713]` |

### Alternatives Considered
Not applicable — no library selection decision exists in this phase; every "alternative" this phase
considers is an architectural shape decision (D-05/D-06's data-driven-registration-vs-base-class
question), which CONTEXT.md has already locked in favor of base+subclasses and is not to be
re-litigated.

**Installation:** None required.

## Package Legitimacy Audit

**Not applicable.** This phase adds, upgrades, or removes zero external packages in either
`bbj-intellij/build.gradle.kts` or `bbj-vscode/package.json`. All seven requirements are pure
in-repo consolidation/hardening. No `npm view`/`pip index`/`cargo search` verification is needed.

## Package/File Verification (CONTEXT.md citations confirmed this session)

Every line-number claim below was opened with `Read` this session and quoted verbatim; the planner
can treat these as ground truth rather than re-verifying them.

| Claim | File:Lines | Verbatim confirmation |
|-------|-----------|----------------------|
| Unguarded `SetoptsComposerDialog` sub-list iteration | `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/SetoptsComposerDialog.java:129,133` | `for (SetoptsByteGroup group : catalogs.byteGroups) {` (129); `for (SetoptsBit bit : catalogs.bits) {` (133) — no null guard on either sub-list, only the top-level `catalogs == null` is guarded upstream in `ComposerLauncher` |
| Unguarded `SetoptsTriStateComposerDialog` sub-list iteration | `:126,130` | `for (SetoptsByteGroup group : catalogs.byteGroups) {` (126); `for (SetoptsBit bit : catalogs.bits) {` (130) |
| Unguarded `CvsComposerDialog` sub-list iteration | `:141` | `for (CvsBit bit : catalogs.bits) {` (141) |
| Also unguarded (not named in #609, in scope per D-01): `MsgboxComposerDialog` | `:197` | `for (CatalogItem it : catalogs.flags) {` |
| Also unguarded (not named in #609, in scope per D-01): `AddWindowComposerDialog`/`AddChildWindowComposerDialog` | `AddWindowComposerDialog.java:185,195`; `AddChildWindowComposerDialog.java:192,202` | `addGroupedChecks(flags, catalogs.flags, flagChecks)` / `addGroupedChecks(eventPanel, catalogs.eventBits, eventChecks)` — null-unsafety lives inside `addGroupedChecks`'s iteration over its 2nd argument, which is exactly the method COMP-06's shared base should own |
| `flagsRange`/`eventMaskRange` unchecked indexing | `ComposerLauncher.java:440,446` | `ops.add(new Op(ls + ed.flagsRange[0], ls + ed.flagsRange[1], flagsHex));` (440); `ops.add(new Op(ls + ed.eventMaskRange[0], ls + ed.eventMaskRange[1], eventHex));` (446) — both index `[0]`/`[1]` with no length check |
| `hexRange` unchecked indexing (openSetopts path) | `ComposerLauncher.java:500-501` | `start = ed.hexRange[0]; end = ed.hexRange[1];` inside the `if (ed.hexRange != null)` branch at line 499 — null-checked but not length-checked |
| `hexRange` unchecked indexing (SETOPTS-in-code absolute path) | `ComposerLauncher.java:601` | `doc.replaceString(ls + ed.hexRange[0], ls + ed.hexRange[1], BbjHexLiteral.of(hex));` — no null or length check at all here |
| `ComposerNotices` 3-reason enum + the assertion D-10 must re-point | `ComposerNotices.java:20`; `ComposerNoticesTest.java:68-75` | `public enum Reason { NOT_READY, REQUEST_FAILED, STALE_DOCUMENT }`; test asserts `EnumSet.of(notReady.severity, requestFailed.severity, staleDocument.severity)` has `size() == 3` and exactly 1 of the 3 notices carries a `remedyActionId` — adding a 4th `Reason`/`Notice` factory needs a 4th severity slot reasoned into this same test, not just an enum entry |
| SETOPTS `SetOptsPreview` has no `valid` field | `bbj-vscode/src/setopts-catalog.ts:329-337` | `export interface SetOptsPreview { hexDigits: string; line: string; summary: string; maskInputsEnabled: boolean; unknownByBytes: Array<{ byte: number; mask: number }>; }` — no `valid`, no `rawTailError` |
| The regex result is computed then discarded | `setopts-catalog.ts:357` | `if (/^[0-9A-Fa-f]*$/.test(sel.rawTail) && sel.rawTail !== rawTail(v)) { setRawTail(v, sel.rawTail); }` — the boolean only gates whether to apply `sel.rawTail`; it never reaches the returned `SetOptsPreview` object |
| Java-side `SetoptsPreview` mirrors the same gap | `ComposerModels.java:417-423` | `public static final class SetoptsPreview { public String hexDigits; public String line; public String summary; public boolean maskInputsEnabled; public List<SetoptsUnknownBits> unknownByBytes; }` — no `valid`, no `rawTailError` |
| SETOPTS dialog's own client-side regex duplicate | `SetoptsComposerDialog.java:213-218` | `rawTailError.setText(" "); String rawTail = rawTailField.getText(); if (!rawTail.matches("[0-9A-Fa-f]{0," + MAX_RAW_TAIL_DIGITS + "}")) { rawTailError.setText("must be 0-9 or A-F, up to " + MAX_RAW_TAIL_DIGITS + " digits"); previewUnavailable("raw hex is invalid"); return; }` |
| SETOPTS dialog's unconditional OK-enable (the bug D-08 fixes) | `SetoptsComposerDialog.java:291` | `setOKActionEnabled(true);` inside `apply(SetoptsPreview p)`, unconditional — the other four dialogs gate this on `p.valid` (confirmed by `ComposerFieldValidationSourceGuardTest.java:80-83`, which pins `setOKActionEnabled(p.valid)` exactly once and `setOKActionEnabled(true)` exactly zero times for `AddWindowComposerDialog`/`AddChildWindowComposerDialog`) |
| `validateStringField` capability exists but is unused as a 2nd gate | `bbj-vscode/src/language/composer-commands.ts:106-107` | `'bbj/composer/msgbox/validateString': (p: { text: string; required?: boolean }) => validateStringField(p.text, { required: p.required }),` — confirms D-09's claim that the capability exists; the decision is not to add a second call site for it |
| plugin.xml action/intentionAction counts | `bbj-intellij/src/main/resources/META-INF/plugin.xml` | Confirmed exactly 7 `<action>` ids in the composer/run family (`bbj.composeMsgbox`, `bbj.composeAddWindow`, `bbj.composeAddChildWindow`, `bbj.composeSetopts`, `bbj.composeSetoptsInCode`, `bbj.composeCvs`, `bbj.openComposerAt`) and exactly 5 `<intentionAction>` entries, matching D-03/D-05/D-06's counts |

## Architecture Patterns

### System Architecture Diagram

```
Editor caret / lightbulb click / cue click
        │
        ▼
BbjCompose*Action.actionPerformed()  /  Configure*Intention.invoke()  /  BbjOpenComposerAtAction (LSP4IJ command)
        │  (D-03/D-05/D-06: all route through one shared launch call, differing only by Kind)
        ▼
ComposerLauncher.launch(project, editor, Kind)  /  .launchAt(..., fromCue=true)
        │
        ▼
ComposerFlow.launch(): handles.server() → handles.catalogs(server) → decodeCall  (one bounded chain, #538)
        │                       │
        │            catalogs == null? ──► ComposerNotices.notReady()  [existing guard]
        │            catalogs non-null but catalogs.byteGroups/bits/flags/eventBits == null?
        │                       └──► UNGUARDED today ──► NPE inside dialog constructor (COMP-03 gap)
        ▼
open<Kind>(...) in ComposerLauncher — constructs the dialog (edit-in-place / compose-new / complete-call)
        │
        ▼
<Kind>ComposerDialog (Swing modal) — live preview via ComposerFlow.observe() + PreviewDebouncer
        │  field edits → scheduleRefresh() → server bbj/composer/<kind>/preview round trip
        │  server verdict → apply(preview): setOKActionEnabled(p.valid)   [D-08 makes this true for ALL 6]
        ▼
dialog.showAndGet() == true → getStatement()/getFlagsHex()/getHexDigits()
        │
        ▼
StaleEditGuard.applyIfUnchanged(...) — re-decodes, compares via DecodeEquality, then:
        │
        ▼
WriteCommandAction.runWriteCommandAction(...) { doc.replaceString(ls + ed.flagsRange[0], ls + ed.flagsRange[1], ...) }
        │                                                           ▲
        │                                          UNGUARDED array length today (COMP-05 gap):
        │                                          flagsRange/eventMaskRange (ComposerLauncher.java:440,446)
        │                                          hexRange (ComposerLauncher.java:499-501, 601)
        ▼
Live BBj source file mutated
```

### Recommended Project Structure

The four new shared homes (package/class names are Claude's Discretion per CONTEXT.md) should live
alongside the family they consolidate, matching the existing flat-package convention (everything in
`com.basis.bbj.intellij.composer` or `com.basis.bbj.intellij.actions` — there is no sub-package
nesting anywhere in either directory today):

```
bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/
├── AddWindowComposerDialogBase.java        # NEW (COMP-06) — shared addWindow-family base
├── AddWindowComposerDialog.java            # thin subclass over the new base
├── AddChildWindowComposerDialog.java       # thin subclass over the new base
├── ComposerDialogSwingHelpers.java         # NEW (COMP-07) — clip/labeled/labeledWithError/
│                                            #   setEnabledRecursive/errorLabel/previewUnavailable
├── ConfigureComposerIntentionBase.java     # NEW (COMP-08) — abstract base, 5 thin no-arg subclasses stay in place
└── (5 unchanged Configure*Intention.java files, now thin)

bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/
├── BbjComposeActionBase.java               # NEW (COMP-09) — abstract base, 6 thin no-arg subclasses stay in place
└── (6 unchanged BbjCompose*Action.java files, now thin)
```

### Pattern 1: Base-class extraction with a re-pointed source guard (the mandatory pattern for all four COMP-06/07/08/09 homes)

**What:** Move the shared body into an abstract base's concrete (non-abstract) method; leave each
subclass with only the ≤4 things that actually differ (per the design note: `getText()`, the
availability predicate, `Kind`, the preview sentence — for intentions). Then re-point every source
guard that used to assert "this literal appears exactly once in THIS file" so it instead asserts
"this literal appears exactly once inside the base's extracted method body" plus "this subclass
delegates to the base exactly once with its own distinguishing argument."

**When to use:** Every one of COMP-06/07/08/09's four new shared homes, and every existing guard that
currently does a per-file literal count over files about to gain a shared base
(`ComposerDialogRefreshSourceGuardTest`, `ComposerFieldValidationSourceGuardTest`,
`ComposerIntentionPreviewSourceGuardTest`, plus `BbjComposeCvsActionSourceGuardTest` /
`BbjComposeSetoptsActionSourceGuardTest` / `BbjComposeSetoptsInCodeActionSourceGuardTest` if COMP-09
moves their pinned literals into the new base).

**Example — the exact `extractMethodBody` helper every existing guard reimplements privately (per
D-12, do not import a shared one):**
```java
// Source: bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmTokenTrustWindowSourceGuardTest.java:36-56
/** Extracts a brace-balanced method body starting from the first '{' after {@code signatureFragment}. */
private static String extractMethodBody(String text, String signatureFragment) {
    int sigIndex = text.indexOf(signatureFragment);
    assertTrue(sigIndex >= 0, "method signature not found: " + signatureFragment);
    int braceStart = text.indexOf('{', sigIndex);
    assertTrue(braceStart >= 0, "opening brace not found for: " + signatureFragment);
    int depth = 0;
    for (int i = braceStart; i < text.length(); i++) {
        char c = text.charAt(i);
        if (c == '{') {
            depth++;
        } else if (c == '}') {
            depth--;
            if (depth == 0) {
                return text.substring(braceStart, i + 1);
            }
        }
    }
    fail("unbalanced braces for: " + signatureFragment);
    return "";
}
```

**Example — the delegation pin, scoped to the SUBCLASS file, asserting it calls the shared body with
its own distinguishing literal exactly once (this is the shape every re-pointed guard's subclass-side
assertion should take):**
```java
// Source: bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmTokenTrustWindowSourceGuardTest.java:96-101
@Test
void bothRunActionsDelegateToTheSharedWebRunHelper() {
    assertEquals(1, countOccurrences(readGuardedSource(RUN_BUI_ACTION), "buildWebRunCommandLine(file, project, \"BUI\")"),
            RUN_BUI_ACTION + " must delegate to buildWebRunCommandLine with client type \"BUI\"");
    assertEquals(1, countOccurrences(readGuardedSource(RUN_DWC_ACTION), "buildWebRunCommandLine(file, project, \"DWC\")"),
            RUN_DWC_ACTION + " must delegate to buildWebRunCommandLine with client type \"DWC\"");
}
```

**Example — the abstract-declaration edge case (a base's `abstract` method has no body, so a guard
that expects to find an assertion/literal inside it must instead assert the declaration line ends in
`;` and carries no body — this is the model for any of COMP-06/08/09's abstract hook methods):**
```java
// Source: bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/OffEdtDispatchSourceGuardTest.java:110-123
@Test
void theAbstractBuildCommandLineDeclarationCarriesNoAssertion() {
    String text = readSource(RUN_ACTION_BASE_SOURCE);
    int abstractDeclarationIndex = text.indexOf(
            "protected abstract GeneralCommandLine buildCommandLine(");
    assertTrue(abstractDeclarationIndex >= 0, "...");
    String abstractDeclarationLine = text.substring(
            text.lastIndexOf('\n', abstractDeclarationIndex) + 1,
            text.indexOf('\n', abstractDeclarationIndex));
    assertTrue(abstractDeclarationLine.trim().endsWith(";"),
            "the abstract declaration has no body, so it cannot and must not carry the assertion");
}
```

### Pattern 2: `withoutCommentLines` before every zero/count-based assertion

**What:** Every existing source guard strips `*`/`//`/`/*`-prefixed lines before running a
count-based assertion, so a rationale comment that happens to mention a forbidden or counted literal
(including the guard's own javadoc, if it were ever co-located) can never skew the count.
**When to use:** Any new guard the planner writes for the four new shared homes.
**Example:**
```java
// Source: bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerApplyGuardSourceGuardTest.java:88-98
private static String withoutCommentLines(String text) {
    StringBuilder result = new StringBuilder();
    for (String line : text.split("\n", -1)) {
        String trimmed = line.trim();
        if (trimmed.startsWith("*") || trimmed.startsWith("//") || trimmed.startsWith("/*")) {
            continue;
        }
        result.append(line).append('\n');
    }
    return result.toString();
}
```

### Anti-Patterns to Avoid
- **Textually diffing near-duplicates instead of behaviorally reconciling them:** two of the four
  "duplicate" families this phase consolidates are NOT byte-identical across their current copies
  (see Common Pitfalls). A mechanical extract-move that assumes identical text will fail to compile
  or silently pick one copy's behavior over another's without anyone noticing which.
- **A shared `extractMethodBody`/`countOccurrences` test helper.** D-12 explicitly forbids this —
  each of the (up to) four new guards must keep its own private copy, exactly like the eight existing
  guards do, so a single bad edit to a shared helper can never silently weaken every guard at once.
- **Re-running server validation near the EDT inside `WriteCommandAction`** to "double-check" COMP-04
  — D-09 explicitly rejects this as a Phase 79 EDT-01 violation.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| BBj-syntax-safe write validation | A second Java-side regex/parser for SETOPTS hex, MSGBOX strings, etc. | The server's existing per-composer `preview`/`decodeCall` verdict (`p.valid`) | Standing convention pinned by `ComposerFieldValidationSourceGuardTest`: "dialogs hold no validation rule or message of their own." D-08 extends this to SETOPTS; a second Java rule is the exact class of drift `SetoptsComposerDialog:213-218`'s existing bug already demonstrates (its regex silently diverged from the server's is-it-hex check — the server tests `/^[0-9A-Fa-f]*$/` too, but only to decide whether to apply the tail, not to report validity) |
| One-shot vs. rate-limited error balloons | A custom debounce/rate-limiter per dialog | `ComposerFlow.once(delegate)` (`AtomicBoolean.compareAndSet`) | Already the shared seam every one of the 6 dialogs routes through; re-implementing it per-dialog is exactly the duplication COMP-07 is meant to remove |
| Preview debouncing | A per-dialog `Timer`/`Alarm` | The shared `AlarmScheduler` + `PreviewDebouncer` seam (`PREVIEW_DEBOUNCE_MS = 300L`) | Pinned by `ComposerDialogRefreshSourceGuardTest.everyDebouncedDialogSharesTheOneDebounceSeamWithTheSameDelay()`, which explicitly forbids `new Alarm(` outside `AlarmScheduler` |
| Stale-edit protection on a guarded write | A custom "did the line change" check per dialog | `StaleEditGuard.applyIfUnchanged(...)` + a `DecodeEquality::same<Kind>` comparator | Existing seam; #567's silent-rewrite bug was exactly what this guards against, and it is pinned by `ComposerApplyGuardSourceGuardTest` |

**Key insight:** Every "don't hand-roll" item in this phase is really "don't re-diverge from the
shared seam that already exists" — this phase's whole purpose is consolidation, so the correct answer
to nearly every "how should this be built" question is "reuse the seam the other 5 dialogs already
use," not "introduce a new pattern."

## Runtime State Inventory

Not applicable — this is a code-shape/robustness phase, not a rename/refactor/migration phase. No
renamed identifiers cross a stored-data, live-service-config, OS-registration, secret, or build-artifact
boundary. The one cross-cutting change (D-08's `SetOptsPreview.valid` field addition) is an additive
DTO field, not a rename, and both consumers (Java `ComposerModels.SetoptsPreview`, TypeScript
`setopts-catalog.ts`) are edited in the same phase, so there is no runtime-state drift window.

## Common Pitfalls

### Pitfall 1: "Identical" helper duplicates are sometimes only behaviorally identical

**What goes wrong:** A mechanical "extract this method verbatim from all N files" step either fails
to compile (surprise) or silently picks one file's copy over another's (worse — no compile error, no
diff, just a subtly different runtime behavior in the files whose copy was discarded).

**Why it happens:** Verified this session by diffing all instances:
- `clip(Graphics2D, String, int)` in `ChildWindowSchematicPanel.java`, `WindowSchematicPanel.java`,
  and `MsgboxSchematicPanel.java` are behaviorally identical but NOT textually identical —
  `MsgboxSchematicPanel`'s copy caches `g.getFontMetrics()` into a local `FontMetrics fm` variable and
  reuses it three times; the other two call `g.getFontMetrics()` fresh on every reference. `[VERIFIED:
  bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/MsgboxSchematicPanel.java` clip() body
  vs. `ChildWindowSchematicPanel.java`/`WindowSchematicPanel.java` clip() bodies, read and diffed this
  session]`
- `errorLabel()` in `AddWindowComposerDialog.java`/`AddChildWindowComposerDialog.java` calls
  `com.intellij.util.ui.UIUtil.ComponentStyle.SMALL` by fully-qualified name, while
  `MsgboxComposerDialog.java`/`SetoptsComposerDialog.java`/`CvsComposerDialog.java` call the imported
  `UIUtil.ComponentStyle.SMALL`. `[VERIFIED: same five files, errorLabel() bodies read and diffed this
  session]`
- `labeled()` IS byte-identical across all 6 dialogs `[VERIFIED: labeled() bodies read and diffed this
  session across MsgboxComposerDialog/AddWindowComposerDialog/AddChildWindowComposerDialog/
  SetoptsComposerDialog/SetoptsTriStateComposerDialog/CvsComposerDialog.java]` — so this one is a safe
  cut-paste.
- `setEnabledRecursive()` IS byte-identical between `AddWindowComposerDialog.java` and
  `AddChildWindowComposerDialog.java` `[VERIFIED: both bodies read and diffed this session]` — safe
  cut-paste.

**How to avoid:** Diff every instance before extraction, not just grep for its presence. For the two
non-identical pairs above, either pick the more efficient version (`MsgboxSchematicPanel`'s cached
`FontMetrics`) and verify no visible difference in clipping behavior, or normalize the import style —
either is a one-line reconciliation, not a blocker, but it must be a deliberate choice, not an
accidental side effect of which file's copy the extraction tool happened to keep.

**Warning signs:** A source guard for the new shared home passing on one dialog's inherited behavior
but a hand-UAT screenshot showing a visually different font metric or an import-organizer warning
about an unnecessary FQN.

### Pitfall 2: `AddWindowComposerDialog`/`AddChildWindowComposerDialog` also duplicate `labeledWithError(...)`, not named in CONTEXT.md

**What goes wrong:** A planner following CONTEXT.md's exact list of "the three helpers" (`clip`,
`labeled`, `setEnabledRecursive`) misses a fourth, adjacent duplicate that D-01's "whole present-day
family" language actually covers.

**Why it happens:** `[VERIFIED: AddWindowComposerDialog.java` and `AddChildWindowComposerDialog.java`,
both declare a second helper immediately after `labeled(...)`:
`private static JPanel labeledWithError(String label, JComponent field, JBLabel error) { ... }`, byte-
identical between the two files, read and diffed this session]`. This is scoped to only these two
dialogs (the addWindow family), so it is naturally covered if COMP-06's shared base absorbs it
alongside `labeled`, or it can move to COMP-07's shared Swing-helper home — either placement is
consistent with D-01, and the choice is squarely inside "where the four new shared homes live," which
CONTEXT.md leaves to Claude's Discretion.

**How to avoid:** When writing COMP-06/COMP-07 tasks, explicitly include `labeledWithError` in the
extraction scope rather than relying on CONTEXT.md's illustrative (not necessarily exhaustive) helper
list.

### Pitfall 3: `ComposerNoticesTest`'s severity-uniqueness assertion is EnumSet-based and will silently pass wrong

**What goes wrong:** Adding `MALFORMED_EDIT` with severity `WARNING` (per D-10) means two of the four
reasons (`STALE_DOCUMENT` and `MALFORMED_EDIT`) now share `Severity.WARNING`. The existing assertion
`assertEquals(3, severities.size())` was written when there were only 3 reasons and each had a
distinct severity; naively bumping the literal `3` to `4` without reasoning about severity uniqueness
would either fail loudly (good) or, if someone instead widens the assertion to `>= 3`, silently stop
verifying uniqueness at all (bad — exactly the failure mode D-10 warns about: "that assertion must be
deliberately re-pointed to an explicit per-reason severity table").

**How to avoid:** Replace the `EnumSet.of(...).size() == 3` uniqueness check with an explicit
`Map<Reason, Severity>` table asserted per-entry (or an assertion that documents which pairs are now
allowed to share a severity and why), not a blind count bump. `[VERIFIED:
ComposerNoticesTest.java:63-76]`

### Pitfall 4: Five of the six action files have no existing `SourceGuardTest` to re-point

**What goes wrong:** Assuming COMP-09's consolidation only needs to re-point 3 existing guards
(`BbjComposeCvsActionSourceGuardTest`, `BbjComposeSetoptsActionSourceGuardTest`,
`BbjComposeSetoptsInCodeActionSourceGuardTest` — confirmed the only 3 action-level source guards that
exist today `[VERIFIED: directory listing of bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/,
grep'd this session]`) undercounts the work: `BbjComposeMsgboxAction`, `BbjComposeAddWindowAction`,
and `BbjComposeAddChildWindowAction` have NO existing per-file source guard at all. Per D-12, the new
shared base needs its OWN guard (one of the "four new shared homes"), and that new guard's coverage
must include all 6 subclasses, not just the 3 that happened to already have one.

**How to avoid:** Write one new guard for the shared `BbjCompose*Action` base that covers all 6
subclasses' delegation pins (mirroring `EmTokenTrustWindowSourceGuardTest`'s two-subclass pattern,
scaled to 6), rather than treating "re-point the 3 existing guards" as the complete task.

## Code Examples

### The full existing precedent this phase's base classes must mirror

```java
// Source: bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java:40-44, 427-428
public abstract class BbjRunActionBase extends AnAction {
    protected BbjRunActionBase(String text, String description, Icon icon) {
        super(text, description, icon);
    }
    // ...
    @Nullable
    protected abstract GeneralCommandLine buildCommandLine(@NotNull VirtualFile file, @NotNull Project project);
}
```
`BbjRunGuiAction`, `BbjRunBuiAction`, `BbjRunDwcAction` each implement only `buildCommandLine` (and
`BbjRunBuiAction`/`BbjRunDwcAction` both delegate to one shared `buildWebRunCommandLine(file, project,
clientType)` body on the base, differing only in the `clientType` string literal — this is the exact
shape D-03/D-06 want for the 4 uniform launch actions vs. the 2 SETOPTS ones with their own
availability predicate).

### `SetOptsPreview` shape today, and what D-08 adds (both hosts)

```typescript
// Source: bbj-vscode/src/setopts-catalog.ts:329-337 (current — no `valid`)
export interface SetOptsPreview {
    hexDigits: string;
    line: string;
    summary: string;
    maskInputsEnabled: boolean;
    unknownByBytes: Array<{ byte: number; mask: number }>;
}
```
```java
// Source: bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerModels.java:417-423 (current — no `valid`)
public static final class SetoptsPreview {
    public String hexDigits;
    public String line;
    public String summary;
    public boolean maskInputsEnabled;
    public List<SetoptsUnknownBits> unknownByBytes;
}
```
D-08 adds `valid: boolean` (and `rawTailError: string`) to both, computed server-side from the same
`/^[0-9A-Fa-f]*$/.test(sel.rawTail)` check that already runs at `setopts-catalog.ts:357` but today only
gates whether to apply the tail — it must additionally be threaded into the returned object.

## State of the Art

Not applicable in the "library evolved" sense — no external library is involved. The relevant "state
of the art" is entirely this project's own prior-phase conventions, already summarized in
`## Established Patterns` in CONTEXT.md's `<code_context>` and reproduced in `## Don't Hand-Roll`
above: server-owns-validation (Phase 87ish), `ComposerFlow`/`StaleEditGuard`/`PreviewDebouncer`
(Phases 82/87/90), off-EDT dispatch (Phase 79 EDT-01), and the `BbjRunActionBase` base+subclass shape
(established for run actions, not yet applied to composer dialogs/intentions/launch actions — this
phase is the first time that shape is applied to the composer family).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The four new shared homes' package/class names proposed in "Recommended Project Structure" (`AddWindowComposerDialogBase`, `ComposerDialogSwingHelpers`, `ConfigureComposerIntentionBase`, `BbjComposeActionBase`) are illustrative, not prescribed — CONTEXT.md explicitly leaves naming to Claude's Discretion | Architecture Patterns / Recommended Project Structure | None if the planner picks different names — flagged here only so the planner does not mistake the example names for a locked decision |
| A2 | `labeledWithError(...)`'s correct new home (COMP-06's dialog base vs. COMP-07's Swing-helper home) is left as a planner choice, since it is only used by the addWindow family (2 of 6 dialogs) unlike `labeled`/`clip`/`setEnabledRecursive`/`errorLabel` which span more dialogs | Common Pitfalls #2 | Low — either placement satisfies "exists exactly once"; a wrong guess only costs a later file move |

**If this table is empty:** N/A — two assumptions logged above, both low-risk placement choices
explicitly left to the planner's discretion by CONTEXT.md itself, not open factual questions.

## Open Questions

1. **Does `MsgboxSchematicPanel`'s cached-`FontMetrics` variant of `clip()` change visible output vs. the other two panels' repeated-call variant?**
   - What we know: Both compute character-by-character width against the same `Graphics2D`'s font
     metrics; `getFontMetrics()` is a cheap accessor on an already-constructed `Graphics2D`, not a
     recomputation, so behavior should be identical.
   - What's unclear: Whether `Graphics2D.getFontMetrics()` can return a different object across calls
     within the same paint cycle (it should not, but this session did not execute the code to confirm).
   - Recommendation: When COMP-07 extracts `clip()` to the shared home, keep the cached-`FontMetrics`
     variant (marginally more efficient, called once per glyph in a tight loop) and add a one-line note
     in the commit/plan that this is a deliberate pick between two behaviorally-equivalent copies, not
     an accidental one.

2. **Exact severity table for the widened `ComposerNoticesTest` assertion (D-10).**
   - What we know: `MALFORMED_EDIT` must carry `Severity.WARNING` per D-10's own text.
     `STALE_DOCUMENT` already carries `WARNING`. `NOT_READY` carries `INFORMATION`, `REQUEST_FAILED`
     carries `ERROR`.
   - What's unclear: Whether the re-pointed test should assert "no MORE than 2 reasons share the same
     severity" (permissive) or an exact `Map<Reason, Severity>` (exact, more brittle but more honest
     about intent) — CONTEXT.md's wording ("deliberately re-pointed to an explicit per-reason severity
     table") reads as favoring the exact map, but the final test shape is an implementation detail for
     the planner/executor, not something this research needs to prescribe further.
   - Recommendation: Use the exact `Map<Reason, Severity>` form — it is the only shape that keeps the
     test meaningfully asserting something after `MALFORMED_EDIT` breaks severity-per-reason uniqueness.

## Environment Availability

Skipped — this phase has no external tool/service/runtime dependency beyond what the repo's existing
`bbj-intellij` Gradle build and `bbj-vscode` npm toolchain already provide, both of which are already
verified working per `.planning/STATE.md`'s standing constraints (JDK 17 auto-provisioned, Gradle
9.7.1 pinned wrapper, no live IntelliJ UI test coverage in CI — hand UAT required per the standing
v4.4 verification pattern).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | JUnit Jupiter 5 via `org.junit:junit-bom:6.1.3` `[VERIFIED: bbj-intellij/build.gradle.kts:39-41]` |
| Config file | `bbj-intellij/build.gradle.kts` (Gradle `test { useJUnitPlatform() }` convention — no separate JUnit config file in this project) |
| Quick run command | `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test --tests "com.basis.bbj.intellij.composer.*" --tests "com.basis.bbj.intellij.actions.*"` |
| Full suite command | `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test` |

For the D-08 shared-LS change only, `bbj-vscode` vitest also applies:
| Property | Value |
|----------|-------|
| Framework | vitest ^4.1.10 `[VERIFIED: bbj-vscode/package.json:713]` |
| Quick run command | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/setopts-catalog.test.ts` (or the appropriate SETOPTS test file — confirm the exact filename during planning; vitest requires cwd = `bbj-vscode`, per project memory) |
| Full suite command | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npm test` |

**Known-failing local baseline — do not treat as a regression introduced by this phase:** the project's
standing local whole-suite baseline for `bbj-vscode` is 12 failures (`linking.test.ts` interop tests +
1 `issue447` capability-test drift), documented in `.planning/DEBT.md` and `.planning/STATE.md`'s
Blockers/Concerns. Green baseline requires `RUN_BBJ_TESTS=0`. This phase does not touch any file in
that failure set.

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COMP-03 | Malformed catalogs sub-list (null `byteGroups`/`bits`/`flags`/`eventBits`) shows the same "not ready" message as a fully-null response, no NPE | unit (plain construction test, no BasePlatformTestCase — see `noPlatformTestFrameworkCreptIn` pattern) | `./gradlew test --tests "com.basis.bbj.intellij.composer.*"` | ❌ Wave 0 — no existing test constructs a dialog with a non-null `catalogs` whose sub-lists are null; new test class needed per dialog or one parameterized test across all 6 |
| COMP-04 | SETOPTS `valid`/`rawTailError` gate `setOKActionEnabled` identically to the other 4 dialogs; client regex deleted | source guard (`ComposerFieldValidationSourceGuardTest`, extended to SETOPTS) + vitest for `setoptsPreview()`'s new `valid` computation | `./gradlew test --tests "*.ComposerFieldValidationSourceGuardTest"` + `cd bbj-vscode && npx vitest run <setopts test file>` | ✅ Java guard exists (needs extension), ❌ vitest coverage of the new `valid` field — Wave 0 |
| COMP-05 | `flagsRange`/`eventMaskRange`/`hexRange` with ≠2 elements aborts with `MALFORMED_EDIT`, not `AIOOBE` | unit (behavioral test on `ComposerLauncher`'s `applyHexEdit`/`openSetopts`/`openSetoptsInCodeAbsolute` paths) + `ComposerNoticesTest` (re-pointed) | `./gradlew test --tests "*.ComposerNoticesTest" --tests "*.ComposerLauncher*"` | ❌ Wave 0 — no existing test constructs a malformed range array; `ComposerNoticesTest` exists but needs the 4th-reason coverage added |
| COMP-06 | addWindow/addChildWindow share one base, no regression in field validation or preview refresh | source guard (`ComposerDialogRefreshSourceGuardTest`, `ComposerFieldValidationSourceGuardTest`, both re-pointed) + new base-level guard | `./gradlew test --tests "*.ComposerDialogRefreshSourceGuardTest" --tests "*.ComposerFieldValidationSourceGuardTest"` | ✅ both exist, re-pointing is the work |
| COMP-07 | `clip`/`labeled`/`labeledWithError`/`setEnabledRecursive`/`errorLabel`/`previewUnavailable` each exist exactly once | new source guard for the shared Swing-helper home | `./gradlew test --tests "*.<NewSwingHelperSourceGuardTest>"` | ❌ Wave 0 — new guard, per D-12 |
| COMP-08 | 5 intentions → base + 5 thin subclasses, popup preview byte-identical | source guard (`ComposerIntentionPreviewSourceGuardTest`, re-pointed) + `IntentionDescriptionResourcesTest` (already tolerant via `descriptionDirectoryName`, should pass unmodified) | `./gradlew test --tests "*.ComposerIntentionPreviewSourceGuardTest" --tests "*.IntentionDescriptionResourcesTest"` | ✅ both exist |
| COMP-09 | 6 launch actions → base + 6 thin subclasses | 3 existing per-action guards (re-pointed) + 1 new base-covering guard for the 3 actions with no existing guard (D-12) | `./gradlew test --tests "*.BbjCompose*ActionSourceGuardTest"` (existing) + new test class | ⚠️ 3/6 exist, re-pointed; 1 new guard needed to cover all 6, Wave 0 |
| All 7 (UAT) | Every one of MSGBOX/addWindow/addChildWindow/CVS/SETOPTS/SETOPTS-in-code behaves identically after consolidation, reached via lightbulb + editor popup + cue click-through | manual-only (hand UAT — no live IntelliJ UI test coverage in CI, standing project constraint) | Build both distributables (VSIX + IntelliJ zip) from the final tree, run through all six kinds × three entry points per the CONTEXT.md `<specifics>` UAT note | N/A — manual per standing pattern |

### Sampling Rate
- **Per task commit:** targeted `./gradlew test --tests "com.basis.bbj.intellij.composer.*"` (composer
  package only, fast — the whole-suite run is `865` tests per CONTEXT.md's own count, so scope to the
  touched package during iteration)
- **Per wave merge:** full `./gradlew test` (whole IntelliJ suite) + `cd bbj-vscode && npm test` if
  D-08's shared-LS change landed in that wave
- **Phase gate:** Full suite green before `/gsd-verify-work`, plus the hand UAT round covering all six
  composer kinds × three entry points (lightbulb, editor context menu, cue click-through) per
  CONTEXT.md's `<specifics>` section — D-02/D-04's visual changes (theme-aware red, stalled-preview-now-
  red) must be called out explicitly during UAT, never reported as no-observable-delta

### Wave 0 Gaps
- [ ] A test (or parameterized test) constructing each of the 6 dialogs with a non-null `catalogs`
      whose relevant sub-list(s) are null — proves COMP-03's fix without needing a live IDE
- [ ] vitest coverage of `setoptsPreview()`'s new `valid`/`rawTailError` computation in
      `bbj-vscode/test/` (exact existing test file for `setopts-catalog.ts` to be located/created
      during planning)
- [ ] A behavioral test feeding a malformed (length ≠ 2) `flagsRange`/`eventMaskRange`/`hexRange` into
      `ComposerLauncher`'s apply paths, proving `MALFORMED_EDIT` fires instead of `AIOOBE`
- [ ] New source guard for the COMP-07 shared Swing-helper home (per D-12, cannot reuse an existing
      guard's structure — must be its own file with its own private test-helper copies)
- [ ] New source guard covering all 6 `BbjCompose*Action` subclasses' delegation to the COMP-09 base
      (3 of 6 actions currently have zero guard coverage — `BbjComposeMsgboxAction`,
      `BbjComposeAddWindowAction`, `BbjComposeAddChildWindowAction`)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Composer surface has no auth boundary of its own — it writes to the local file already open in the editor |
| V3 Session Management | No | N/A |
| V4 Access Control | No | N/A — local IDE plugin, no multi-user boundary |
| V5 Input Validation | Yes | Server-owned verdict pattern (`p.valid`), never a client-side regex — this is exactly COMP-04's fix. The malformed-response handling (COMP-03) and the range-array bounds checking (COMP-05) are also V5-adjacent: an LSP response is untrusted input from the plugin's perspective, and both gaps are "crash on malformed untrusted input," not injection risks |
| V6 Cryptography | No | N/A — no crypto in this phase's file set |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malformed/partial LSP response causing a client-side crash (COMP-03) | Denial of Service (local) | Explicit null/shape checks on every sub-list before iteration, with a graceful degrade path (`ComposerNotices.notReady`), rather than trusting the wire shape |
| Unbounded array-index access on server-supplied ranges (COMP-05) | Denial of Service (local) | Length-check every LS-supplied range array before indexing; `MALFORMED_EDIT` notice on failure, per D-10 |
| Client-side re-implementation of a server-owned validation rule silently drifting from the server's rule (the exact SETOPTS bug D-08 fixes) | Tampering (a written-but-invalid statement corrupts the user's source) | Single source of truth for validation — the server computes `valid`, the client only renders it, never re-derives it |

Note: none of this phase's threat surface crosses a network or multi-tenant boundary — every "attacker"
here is a malformed same-process LSP response, not a remote actor. The risk is data corruption in the
developer's own source file, not confidentiality/integrity/availability of a shared system, which is
why V2/V3/V4/V6 are correctly "No" above.

## Sources

### Primary (HIGH confidence — read directly this session)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java` — full read, all write paths and range-array sites
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerNotices.java` — full read
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerFlow.java` — full read
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java` — full read, the base-class precedent
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/SetoptsInCodeActionAvailability.java` — full read, the availability-predicate model
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjComposeCvsAction.java` — full read, a uniform launch-action example
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerNoticesTest.java`,
  `ComposerApplyGuardSourceGuardTest.java`, `ComposerDialogRefreshSourceGuardTest.java`,
  `ComposerFieldValidationSourceGuardTest.java`, `ComposerIntentionPreviewSourceGuardTest.java`,
  `IntentionDescriptionResourcesTest.java` — full reads
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmTokenTrustWindowSourceGuardTest.java`,
  `BbjRunActionConfigPathSourceGuardTest.java`,
  `BbjComposeCvsActionSourceGuardTest.java`, `BbjComposeSetoptsActionSourceGuardTest.java`,
  `BbjOpenComposerAtActionSourceGuardTest.java` — full reads
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/OffEdtDispatchSourceGuardTest.java` — full read
- `bbj-intellij/src/main/resources/META-INF/plugin.xml` — grepped for `<action>`/`<intentionAction>` counts
- `bbj-vscode/src/setopts-catalog.ts` — `SetOptsPreview` interface and `setoptsPreview()` function, lines 320-389 read
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerModels.java` — `SetoptsPreview`/`SetoptsPreviewParams`, lines 405-448 read
- `bbj-vscode/src/language/composer-commands.ts` — grepped for `validateStringField` wiring
- `bbj-intellij/build.gradle.kts`, `bbj-intellij/gradle/wrapper/gradle-wrapper.properties`, `bbj-vscode/package.json` — version verification
- Direct `sed`/`grep` diffs of `clip()` (3 files), `labeled()` (6 files), `errorLabel()` (5 files),
  `setEnabledRecursive()` (2 files) bodies across the composer directory

### Secondary (MEDIUM confidence)
- None used — this phase required no web search or documentation lookup; everything needed was in
  the repo itself.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependency, versions confirmed from build files directly
- Architecture: HIGH — every pattern claim backed by a direct file read this session, not paraphrase
- Pitfalls: HIGH — both near-duplicate findings are diff-verified, not assumed from CONTEXT.md's summary

**Research date:** 2026-09-18
**Valid until:** Until this phase's plans are executed — the underlying files are actively being
consolidated by this very phase, so this research has a very short useful shelf life (days, not the
usual 30) and should not be reused for a later phase without re-verification.
