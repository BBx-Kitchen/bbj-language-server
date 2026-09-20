# Phase 93: Composer Robustness & Consolidation - Pattern Map

**Mapped:** 2026-09-18
**Files analyzed:** 25 (new/modified across COMP-03..COMP-09 + D-08)
**Analogs found:** 25 / 25 (all files inside `bbj-intellij` or `bbj-vscode`, tracked source; verified with `git -C ... ls-files`)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `composer/ComposerDialogSwingHelpers.java` (NEW, COMP-07) | utility | transform (pure Swing rendering helpers) | `composer/AddWindowComposerDialog.java` (`labeled`/`labeledWithError`/`errorLabel`/`setEnabledRecursive` private statics) + `composer/MsgboxSchematicPanel.java` (`clip`) | role-match (extracting statics that already exist in-file into a shared home) |
| `composer/ComposerDialogSwingHelpersSourceGuardTest.java` (NEW, D-12) | test | transform (literal-count/brace-balanced source assertions) | `actions/EmTokenTrustWindowSourceGuardTest.java` | exact (same base+subclass guard shape) |
| `composer/AddWindowComposerDialogBase.java` (NEW, COMP-06) | component (dialog base) | request-response (preview round trip) | `actions/BbjRunActionBase.java` | exact (abstract base + concrete shared method + abstract hook) |
| `composer/AddWindowComposerDialog.java` (MODIFIED — becomes thin subclass) | component | request-response | `actions/BbjRunBuiAction.java` (not read directly, but its shape mirrors `BbjRunDwcAction`; both are the thin-subclass precedent for `BbjRunActionBase`) | role-match |
| `composer/AddChildWindowComposerDialog.java` (MODIFIED — becomes thin subclass) | component | request-response | same as above | role-match |
| `composer/AddWindowComposerDialogBaseSourceGuardTest.java` (NEW, D-12) | test | transform | `actions/EmTokenTrustWindowSourceGuardTest.java` | exact |
| `composer/ConfigureComposerIntentionBase.java` (NEW, COMP-08) | component (intention base) | request-response | `actions/BbjRunActionBase.java` (structural precedent) + `composer/ConfigureCvsIntention.java` (concrete `IntentionAction` shape to slim down) | role-match |
| `composer/Configure{Cvs,Msgbox,AddWindow,AddChildWindow,SetoptsInCode}Intention.java` (MODIFIED — 5 thin no-arg subclasses) | component | request-response | `composer/ConfigureCvsIntention.java` (itself, pre-refactor — the full un-slimmed shape) | exact (self-analog: same class shrunk) |
| `composer/ComposerIntentionPreviewSourceGuardTest.java` (MODIFIED — re-pointed) | test | transform | already exists; re-point per `EmTokenTrustWindowSourceGuardTest.java`'s `extractMethodBody`/delegation-pin pattern | exact |
| `actions/BbjComposeActionBase.java` (NEW, COMP-09) | component (action base) | event-driven (`AnAction.actionPerformed`) | `actions/BbjRunActionBase.java` | exact |
| `actions/BbjCompose{Msgbox,AddWindow,AddChildWindow,Cvs,Setopts,SetoptsInCode}Action.java` (MODIFIED — 6 thin no-arg subclasses) | component | event-driven | `actions/BbjComposeCvsAction.java` (itself, pre-refactor) | exact (self-analog) |
| `actions/BbjComposeActionBaseSourceGuardTest.java` (NEW, D-12) | test | transform | `actions/EmTokenTrustWindowSourceGuardTest.java` + `actions/OffEdtDispatchSourceGuardTest.java` (abstract-declaration edge case) | exact |
| `actions/BbjCompose{Cvs,Setopts,SetoptsInCode}ActionSourceGuardTest.java` (MODIFIED — 3 existing guards re-pointed) | test | transform | `actions/EmTokenTrustWindowSourceGuardTest.java` | exact |
| `actions/*AvailabilityPredicate` for the 2 SETOPTS launch actions (reused, not new — D-03 wires `SetoptsInCodeActionAvailability` into the base's availability param) | service (pure predicate) | transform | `actions/SetoptsInCodeActionAvailability.java` | exact (already the model; may need a sibling for the non-in-code SETOPTS action if it also gets a predicate) |
| `composer/ComposerNotices.java` (MODIFIED — 4th `Reason.MALFORMED_EDIT`) | model/service | transform | itself (existing `notReady`/`requestFailed`/`staleDocument` factories) | exact (self-analog: add a 4th factory of the same shape) |
| `composer/ComposerNoticesTest.java` (MODIFIED — re-point severity/remedy assertions) | test | transform | itself, `everyReasonHasADistinctSeverityAndOnlyTheStaleOneHasARemedy()` | exact (self-analog) |
| `composer/ComposerLauncher.java` (MODIFIED — length guards on `flagsRange`/`eventMaskRange`/`hexRange`) | controller (write-path orchestration) | event-driven / file-I/O (document mutation) | itself, `ed.hexRange != null` guard at `:499` (existing null-check to extend into a length-check) | exact (self-analog) |
| `bbj-vscode/src/setopts-catalog.ts` — `SetOptsPreview` interface + `setoptsPreview()` (MODIFIED, D-08) | service (pure transform) | transform | itself — `unknownByBytes`/`maskInputsEnabled` fields already computed inline in the same return object | exact (self-analog: add `valid`/`rawTailError` alongside existing computed fields) |
| `ComposerModels.java` — `SetoptsPreview` (MODIFIED, D-08) | model (DTO mirror) | transform | itself, plus the other 4 dialogs' `p.valid` consumption (`ComposerFieldValidationSourceGuardTest.java:80-83`) | exact |
| `composer/SetoptsComposerDialog.java` (MODIFIED — gate on `p.valid`, delete client regex `:213-218`) | component | request-response | `composer/AddWindowComposerDialog.java`'s `apply()` (`setOKActionEnabled(p.valid)` at line 323) | exact |
| `composer/SetoptsTriStateComposerDialog.java` (MODIFIED — same gate) | component | request-response | same as above | exact |

## Pattern Assignments

### `composer/AddWindowComposerDialogBase.java` (NEW, COMP-06) + `AddWindowComposerDialog.java` / `AddChildWindowComposerDialog.java` (thin subclasses)

**Analog:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java` — the repo's one working base+thin-subclass precedent.

**Base shape** (`BbjRunActionBase.java:40-44` + `:427-428`):
```java
public abstract class BbjRunActionBase extends AnAction {
    protected BbjRunActionBase(String text, String description, Icon icon) {
        super(text, description, icon);
    }
    // ... shared actionPerformed/update live here, unchanged for all subclasses ...
    @Nullable
    protected abstract GeneralCommandLine buildCommandLine(@NotNull VirtualFile file, @NotNull Project project);
}
```
For the dialog base, apply the same shape to `DialogWrapper`: constructor takes the shared `Project`/`BbjComposerServer`/catalogs-shaped params, `createCenterPanel()`/`scheduleRefresh()`/`refresh()`/`apply(...)`/`previewUnavailable(...)` live on the base exactly once, and only what genuinely differs between `AddWindowComposerDialog` and `AddChildWindowComposerDialog` (their catalogs type, their preview DTO type, their field set) stays in the subclass via abstract hooks — mirroring `buildCommandLine`.

**Shared-body extraction precedent** (`BbjRunActionBase.java:447-552`, the `buildWebRunCommandLine` method both `BbjRunBuiAction`/`BbjRunDwcAction` delegate to, differing only by one string literal `clientType`):
```java
@Nullable
protected GeneralCommandLine buildWebRunCommandLine(@NotNull VirtualFile file, @NotNull Project project, @NotNull String clientType) {
    // ... one shared body ...
}
```
This is the exact shape for `AddWindowComposerDialogBase`'s shared `addGroupedChecks(...)`/`setEnabledRecursive(...)`/`labeled(...)`/`labeledWithError(...)`/`errorLabel()` methods — today duplicated byte-identically between `AddWindowComposerDialog.java` (lines 215-222 `setEnabledRecursive`, 225-242 `addGroupedChecks`, 349-370 `labeled`/`errorLabel`/`labeledWithError`) and `AddChildWindowComposerDialog.java`'s matching private statics.

**Abstract-declaration edge case** — if the base declares an abstract hook (e.g. `protected abstract AddWindowPreviewParams buildPreviewParams();`), no source guard may assert anything "inside" it; see `OffEdtDispatchSourceGuardTest.java:110-123` below for the exact test shape that instead pins the declaration line ends in `;`.

**Reconciliation note (Pitfall 2, from RESEARCH.md):** `labeledWithError(...)` (`AddWindowComposerDialog.java:364-370`) is a 4th helper beyond `clip`/`labeled`/`setEnabledRecursive` that CONTEXT.md's illustrative list omits — it is byte-identical between the two addWindow-family dialogs and must move to whichever shared home (COMP-06 base or COMP-07 Swing-helper home) the plan picks; do not drop it.

---

### `composer/ComposerDialogSwingHelpers.java` (NEW, COMP-07)

**Analog for `clip()`:** `composer/MsgboxSchematicPanel.java` — its `clip(Graphics2D, String, int)` is the **canonical copy to keep** (per RESEARCH.md's explicit recommendation): it caches `g.getFontMetrics()` into a local `FontMetrics fm` variable and reuses it, unlike `ChildWindowSchematicPanel.java`/`WindowSchematicPanel.java`'s copies which call `g.getFontMetrics()` fresh on every reference. All three are behaviorally identical but NOT byte-identical — extraction must pick `MsgboxSchematicPanel`'s variant deliberately, not whichever the extraction tool happens to keep first.

**Analog for `errorLabel()` (5 copies, one needs D-02's theme-aware rewrite):**
```java
// Source: bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/MsgboxComposerDialog.java:338-343
// (imported UIUtil style — MsgboxComposerDialog/SetoptsComposerDialog/CvsComposerDialog use this)
private static JBLabel errorLabel() {
    JBLabel label = new JBLabel(" ");
    label.setComponentStyle(UIUtil.ComponentStyle.SMALL);
    label.setForeground(new Color(0xC0392B));
    return label;
}
```
```java
// Source: bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddWindowComposerDialog.java:356-361
// (fully-qualified style — AddWindowComposerDialog/AddChildWindowComposerDialog use this)
private static JBLabel errorLabel() {
    JBLabel label = new JBLabel(" ");
    label.setComponentStyle(com.intellij.util.ui.UIUtil.ComponentStyle.SMALL);
    label.setForeground(new Color(0xC0392B));
    return label;
}
```
D-02 requires the shared version to replace `new Color(0xC0392B)` with `NamedColorUtil.getErrorForeground()` or `JBColor.namedColor` — neither existing copy is the final shape; both are starting points to reconcile into one theme-aware helper, with the import style normalized to the plain `UIUtil` form (already imported in 3 of 5 files).

**Analog for `previewUnavailable(String)` (6 copies, 3 different target fields):**
```java
// Source: bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddWindowComposerDialog.java:298-306
private void previewUnavailable(String reason) {
    flagsSummary.setText("Preview unavailable — " + reason);
    setOKActionEnabled(false);
}
```
```java
// Source: bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/MsgboxComposerDialog.java:295-303
private void previewUnavailable(String reason) {
    summary.setText("Preview unavailable — " + reason);
    setOKActionEnabled(false);
}
```
D-04 makes the shared version take the target `JBLabel` (or its setter) as a parameter — `previewUnavailable(JBLabel target, String reason)` — and route the text through the same theme-aware error styling as `errorLabel()`, replacing the plain `"Preview unavailable — " + reason` text with red rendering.

**Analog for `labeled()`/`setEnabledRecursive()`:** byte-identical across all instances (verified in RESEARCH.md) — safe cut-paste from `AddWindowComposerDialog.java:349-354` (`labeled`) and `:215-222` (`setEnabledRecursive`) into the shared home unmodified.

---

### `composer/ComposerDialogSwingHelpersSourceGuardTest.java`, `composer/AddWindowComposerDialogBaseSourceGuardTest.java`, `composer/ConfigureComposerIntentionBaseSourceGuardTest.java` (or wherever COMP-08's guard lands), `actions/BbjComposeActionBaseSourceGuardTest.java` (all NEW, D-12)

**Analog:** `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmTokenTrustWindowSourceGuardTest.java` — the exact base-aware guard shape to reproduce four times, once per new shared home, **each with its own private copies** of the helper methods (D-12 forbids a shared test utility).

**`extractMethodBody` — copy this verbatim into each new guard** (`EmTokenTrustWindowSourceGuardTest.java:36-56`):
```java
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

**`countOccurrences` — copy this verbatim into each new guard** (`EmTokenTrustWindowSourceGuardTest.java:85-93`):
```java
private static int countOccurrences(String text, String literal) {
    int count = 0;
    int index = 0;
    while ((index = text.indexOf(literal, index)) != -1) {
        count++;
        index += literal.length();
    }
    return count;
}
```

**`readSource`/`readGuardedSource` + the file-not-found guard — copy verbatim** (`EmTokenTrustWindowSourceGuardTest.java:62-83`, or `OffEdtDispatchSourceGuardTest.java:30-45` for the simpler single-arg form):
```java
private static Path guardedActionSource(String fileName) {
    return Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "actions", fileName)
            .toAbsolutePath();
}
private static String readGuardedSource(Path resolved) {
    if (!Files.exists(resolved)) {
        fail("Guarded source file not found at " + resolved);
    }
    try {
        return Files.readString(resolved);
    } catch (IOException e) {
        throw new UncheckedIOExceptionForTest(resolved, e);
    }
}
```
(Adjust the path-segment array for `composer/` vs `actions/` per new home; `withoutCommentLines` — needed only if the new guard runs count-based assertions over a file that may carry rationale comments mentioning a counted literal — copy from `ComposerApplyGuardSourceGuardTest.java:88-98`, quoted in RESEARCH.md's Pattern 2.)

**The one-pin-per-body assertion** (`EmTokenTrustWindowSourceGuardTest.java:58-60`, `:111-116`) — assert the pinned literal appears exactly once **inside the extracted shared-method body**, not just once in the whole file:
```java
private static String sharedWebRunHelperBody() {
    return extractMethodBody(readGuardedSource(RUN_ACTION_BASE), "protected GeneralCommandLine buildWebRunCommandLine(");
}
@Test
void theSharedWebRunHelperCallsValidateTokenTrustedExactlyOnce() {
    String body = sharedWebRunHelperBody();
    assertEquals(1, countOccurrences(body, "validateTokenTrusted(project, token)"),
            "buildWebRunCommandLine must call validateTokenTrusted(project, token) exactly once");
}
```

**The delegation pin, scoped to each subclass file** (`EmTokenTrustWindowSourceGuardTest.java:95-101`) — the shape every subclass-side assertion in the four new guards should take:
```java
@Test
void bothRunActionsDelegateToTheSharedWebRunHelper() {
    assertEquals(1, countOccurrences(readGuardedSource(RUN_BUI_ACTION), "buildWebRunCommandLine(file, project, \"BUI\")"),
            RUN_BUI_ACTION + " must delegate to buildWebRunCommandLine with client type \"BUI\"");
    assertEquals(1, countOccurrences(readGuardedSource(RUN_DWC_ACTION), "buildWebRunCommandLine(file, project, \"DWC\")"),
            RUN_DWC_ACTION + " must delegate to buildWebRunCommandLine with client type \"DWC\"");
}
```
For `BbjComposeActionBaseSourceGuardTest.java` this scales from 2 subclasses to 6 — one assertion block per `BbjCompose*Action.java`, sweeping all 6 files, per D-11's "negative/zero assertion sweeping all subclass files at full breadth."

**The abstract-declaration edge case** (`OffEdtDispatchSourceGuardTest.java:110-123`) — use this exact shape whenever a new base declares an abstract hook method with no body:
```java
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

---

### `actions/BbjComposeActionBase.java` (NEW, COMP-09) + 6 thin `BbjCompose*Action.java` subclasses

**Analog:** `actions/BbjRunActionBase.java`'s `AnAction` extension shape (constructor takes `(text, description, icon)`, `actionPerformed`/`update`/`getActionUpdateThread` overridden once on the base) — apply the same structural shape, but the shared body is much smaller than `BbjRunActionBase`'s: today's uniform action is just:
```java
// Source: bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjComposeCvsAction.java:18-39 (full file, self-analog for what the 6 subclasses shrink FROM)
public final class BbjComposeCvsAction extends AnAction {
    @Override
    public void actionPerformed(@NotNull AnActionEvent e) {
        Project project = e.getProject();
        Editor editor = e.getData(CommonDataKeys.EDITOR);
        if (project == null || editor == null) {
            return;
        }
        ComposerLauncher.launch(project, editor, ComposerLauncher.Kind.CVS);
    }
    @Override
    public void update(@NotNull AnActionEvent e) {
        e.getPresentation().setEnabledAndVisible(e.getProject() != null && e.getData(CommonDataKeys.EDITOR) != null);
    }
    @Override
    public @NotNull ActionUpdateThread getActionUpdateThread() {
        return ActionUpdateThread.BGT;
    }
}
```
Per D-03: the base owns `actionPerformed` (calling `ComposerLauncher.launch(project, editor, kind())`) and `getActionUpdateThread`; `update` on the base defaults to the project+editor gate shown above, and is overridden only by the 2 SETOPTS actions to instead call their availability predicate (model: `SetoptsInCodeActionAvailability.isAvailable(extension, isConfigFile)`, full file below). Each of the 6 subclasses supplies only `Kind` (and, for the 2 SETOPTS ones, the predicate).

**Availability-predicate model** (full file, 36 lines):
```java
// Source: bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/SetoptsInCodeActionAvailability.java
public final class SetoptsInCodeActionAvailability {
    private static final Set<String> BBJ_SOURCE_EXTENSIONS = Set.of("bbj", "bbjt", "src", "bbx");
    private SetoptsInCodeActionAvailability() {}
    public static boolean isAvailable(String extension, boolean isConfigFile) {
        return !isConfigFile && extension != null && BBJ_SOURCE_EXTENSIONS.contains(extension);
    }
}
```
This is a plain-Java, platform-free seam (no `com.intellij` import) — the established pattern (RESEARCH.md's "Established Patterns") for any new predicate D-03's base needs.

---

### `composer/ConfigureComposerIntentionBase.java` (NEW, COMP-08) + 5 thin `Configure*Intention.java` subclasses

**Analog:** `composer/ConfigureCvsIntention.java` (full file, self-analog for what the 5 subclasses shrink FROM):
```java
// Source: bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ConfigureCvsIntention.java (full file)
public final class ConfigureCvsIntention implements IntentionAction {
    @Override
    public @NotNull String getText() { return "Configure CVS() options…"; }
    @Override
    public @NotNull String getFamilyName() { return "BBj visual composer"; }
    @Override
    public boolean isAvailable(@NotNull Project project, @Nullable Editor editor, @Nullable PsiFile file) {
        return editor != null && ComposerLauncher.isCaretOnCall(editor, "cvs(");
    }
    @Override
    public void invoke(@NotNull Project project, @Nullable Editor editor, @Nullable PsiFile file) throws IncorrectOperationException {
        if (editor != null) {
            ComposerLauncher.launch(project, editor, ComposerLauncher.Kind.CVS);
        }
    }
    @Override
    public boolean startInWriteAction() { return false; }
    @Override
    public @NotNull IntentionPreviewInfo generatePreview(@NotNull Project project, @NotNull Editor editor, @NotNull PsiFile file) {
        return new IntentionPreviewInfo.Html("<p>...</p>");
    }
}
```
Per the design note in CONTEXT.md: `getFamilyName()` ("BBj visual composer") is identical across all 5 and belongs on the base; `startInWriteAction()` (always `false`) belongs on the base; `invoke(...)` (always `ComposerLauncher.launch(project, editor, kind())`) belongs on the base, parameterized by an abstract `Kind getKind()`; `generatePreview(...)`'s `new IntentionPreviewInfo.Html(...)` construction moves to the base per D-07, taking the description sentence from an abstract hook. Each subclass supplies only `getText()`, `isAvailable(...)` (a predicate — note `ConfigureSetoptsInCodeIntention` must keep its own three-keyword gate, not the simple `isCaretOnCall(editor, keyword)` shown here), `getKind()`, and the preview sentence — exactly the "4 things that differ" CONTEXT.md's design note lists.

**Re-pointing target:** `composer/ComposerIntentionPreviewSourceGuardTest.java` (existing, hard-codes 5 file paths and asserts exactly `5` `<intentionAction>` occurrences per RESEARCH.md) — re-point its `new IntentionPreviewInfo.Html(...)` construction-count assertion to the base's extracted method body using the same `extractMethodBody` pattern shown above, and add a delegation pin per subclass asserting each calls the base's preview method with its own sentence argument.

---

### `bbj-vscode/src/setopts-catalog.ts` — `SetOptsPreview` + `setoptsPreview()` (MODIFIED, D-08)

**Analog:** itself — the existing return-object shape already computes several derived fields inline; `valid`/`rawTailError` join them the same way.

**Current shape** (`setopts-catalog.ts:329-337`):
```typescript
export interface SetOptsPreview {
    hexDigits: string;
    line: string;
    summary: string;
    maskInputsEnabled: boolean;
    unknownByBytes: Array<{ byte: number; mask: number }>;
}
```

**The discarded check to thread through** (`setopts-catalog.ts:357`, inside `setoptsPreview()`, `:344-369`):
```typescript
if (/^[0-9A-Fa-f]*$/.test(sel.rawTail) && sel.rawTail !== rawTail(v)) {
    setRawTail(v, sel.rawTail);
}
```
The regex result today only gates whether `sel.rawTail` gets applied; D-08 additionally threads it (or an equivalent freshly-computed check against the final `rawTail`) into the returned object as `valid: boolean` plus `rawTailError: string` (e.g. `"must be 0-9 or A-F"` when the test fails), following the same "compute inline, add to the returned literal" shape as `unknownByBytes` (`:365-367`) and `maskInputsEnabled` (`:364`).

**Java mirror** (`ComposerModels.java:417-423`, add `public boolean valid;` and `public String rawTailError;` alongside the existing fields, matching every other `*Preview` class's shape — e.g. `AddWindowPreview` already carries `valid`, consumed at `AddWindowComposerDialog.java:323`: `setOKActionEnabled(p.valid);`).

**Dialog-side gate to copy** (`AddWindowComposerDialog.java:308-324`, `apply(AddWindowPreview p)`):
```java
private void apply(AddWindowPreview p) {
    // ... field assignments ...
    setOKActionEnabled(p.valid);
}
```
`SetoptsComposerDialog.java:291`'s `setOKActionEnabled(true)` (unconditional) becomes `setOKActionEnabled(p.valid)`, matching this pattern; the client-side regex block at `SetoptsComposerDialog.java:213-218` is deleted entirely (its error text moves server-side into `rawTailError`).

---

### `composer/ComposerNotices.java` — 4th `Reason.MALFORMED_EDIT` (D-10)

**Analog:** itself — the existing 3 factory methods are the exact shape to add a 4th to.

```java
// Source: bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerNotices.java:19-23, 58-63
public enum Reason { NOT_READY, REQUEST_FAILED, STALE_DOCUMENT }         // add MALFORMED_EDIT
public enum Severity { INFORMATION, WARNING, ERROR }                     // unchanged, MALFORMED_EDIT reuses WARNING

/** The captured line changed underneath an open composer dialog; the edit was aborted. */
public static Notice staleDocument(String kindLabel) {
    return new Notice(Reason.STALE_DOCUMENT, kindLabel + " not updated",
            "The line changed while the composer was open. Nothing was changed.",
            Severity.WARNING, REOPEN_COMPOSER);
}
```
Add a `malformedEdit(String kindLabel)` factory of the same shape, `Severity.WARNING`, no remedy action id (own wording per D-10, e.g. "the language server sent an unusable edit range; nothing was changed").

**Re-pointing target — the assertion that must be deliberately rewritten** (`ComposerNoticesTest.java:62-76`):
```java
@Test
void everyReasonHasADistinctSeverityAndOnlyTheStaleOneHasARemedy() {
    // ...
    EnumSet<ComposerNotices.Severity> severities = EnumSet.of(
            notReady.severity, requestFailed.severity, staleDocument.severity);
    assertEquals(3, severities.size(), "no two of the three reasons may share a severity");
    long remedyCount = List.of(notReady, requestFailed, staleDocument).stream()
            .filter(n -> n.remedyActionId != null)
            .count();
    assertEquals(1, remedyCount, "exactly one notice (STALE_DOCUMENT) may carry a remedy action");
}
```
Per D-10/Pitfall 3 in RESEARCH.md: replace the `EnumSet.of(...).size() == 3` uniqueness check with an explicit `Map<Reason, Severity>` table (`NOT_READY→INFORMATION`, `REQUEST_FAILED→ERROR`, `STALE_DOCUMENT→WARNING`, `MALFORMED_EDIT→WARNING`) asserted per-entry, and widen the remedy-count assertion from `1` to whatever the new count is (still `1`, since `MALFORMED_EDIT` carries no remedy per D-10) — but reasoned explicitly, not by blindly bumping the literal.

### `composer/ComposerLauncher.java` — range-array length guards (COMP-05, D-10)

**Analog:** itself — the existing null-check at `:499` (`if (ed.hexRange != null) { start = ed.hexRange[0]; end = ed.hexRange[1]; ... }`) is null-safe but not length-safe; extend it (and add the same at `:440`, `:446`, `:601`) to also check `ed.hexRange.length == 2` (etc.), routing the failure path through `ComposerNotices.malformedEdit(kindLabel)` via the existing `ComposerNoticeRenderer.render(...)` call already used at `:468` for the `NOT_READY` case:
```java
// Source: bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java:467-469 (existing render call, the model for the new malformed-edit branch)
if (catalogs == null) {
    ComposerNoticeRenderer.render(project, ComposerNotices.notReady(labelOf(Kind.SETOPTS)), null);
    return;
}
```

## Shared Patterns

### Base + thin-subclass extraction (COMP-06/08/09)
**Source:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java` (whole file — constructor, one shared concrete method mirroring the varying-by-one-literal case, one abstract hook mirroring the varying-by-everything case)
**Apply to:** `AddWindowComposerDialogBase`, `ConfigureComposerIntentionBase`, `BbjComposeActionBase`

### Source-guard re-pointing (D-11, D-12)
**Source:** `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmTokenTrustWindowSourceGuardTest.java` (whole file) + `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/OffEdtDispatchSourceGuardTest.java` (abstract-declaration edge case, `:110-123`)
**Apply to:** every new/re-pointed guard: `ComposerDialogSwingHelpersSourceGuardTest`, `AddWindowComposerDialogBaseSourceGuardTest`, `ComposerIntentionPreviewSourceGuardTest` (re-pointed), `ComposerFieldValidationSourceGuardTest` (re-pointed), `ComposerDialogRefreshSourceGuardTest` (re-pointed), `BbjComposeActionBaseSourceGuardTest`, `BbjCompose{Cvs,Setopts,SetoptsInCode}ActionSourceGuardTest` (re-pointed)
**Rule:** each guard keeps its own private `extractMethodBody`/`countOccurrences`/`withoutCommentLines`/`readSource` — never a shared test helper.

### Server-owns-validation / dialog-renders-verdict
**Source:** `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerFieldValidationSourceGuardTest.java:80-83` (pins `setOKActionEnabled(p.valid)` exactly once, `setOKActionEnabled(true)` exactly zero times) + `AddWindowComposerDialog.java:323`
**Apply to:** `SetoptsComposerDialog.java`, `SetoptsTriStateComposerDialog.java` (D-08), and the widened `ComposerFieldValidationSourceGuardTest` covering both.

### Machine-readable-reason notice factories, never message-prose classification
**Source:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerNotices.java` (whole file) + `ComposerNoticesTest.java:121-134` (`noNoticeIsChosenByReadingMessageProse`)
**Apply to:** the new `malformedEdit(...)` factory and its call sites in `ComposerLauncher.java`.

## No Analog Found

None — every file this phase touches or creates has a direct, git-tracked, same-repository analog (either an existing sibling file of the same shape, or the file's own pre-refactor self).

## Metadata

**Analog search scope:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/`, `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/`, `bbj-intellij/src/test/java/com/basis/bbj/intellij/{composer,actions,lsp}/`, `bbj-vscode/src/setopts-catalog.ts`
**Files scanned/read this session:** `BbjRunActionBase.java`, `EmTokenTrustWindowSourceGuardTest.java`, `OffEdtDispatchSourceGuardTest.java`, `SetoptsInCodeActionAvailability.java`, `BbjComposeCvsAction.java`, `ConfigureCvsIntention.java`, `AddWindowComposerDialog.java`, `MsgboxComposerDialog.java` (grep excerpts), `MsgboxSchematicPanel.java` (grep excerpts), `ComposerNotices.java`, `ComposerNoticesTest.java`, `setopts-catalog.ts` (lines 320-389), `ComposerLauncher.java` (lines 430-504)
**Pattern extraction date:** 2026-09-18
