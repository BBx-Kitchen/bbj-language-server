---
status: diagnosed
trigger: "G-81-5: NoSuchMethodError on Diagnostic.getMessage() in CompileResultPresenter.renderOne when compiling a syntax-error .bbj file in the rebuilt IntelliJ plugin"
created: 2026-09-05T00:00:00Z
updated: 2026-09-05T00:30:00Z
audit_acknowledged:
  milestone: v4.2
  at: 2026-09-06
  status: diagnosed
---

## Current Focus

reasoning_checkpoint:
  hypothesis: "bbj-intellij's plugin.xml declares `<depends>com.redhat.devtools.lsp4ij</depends>` with no version pin, so a live IDE resolves that dependency plugin to whatever LSP4IJ build is currently installed/marketplace-updated -- completely independent of the `plugin(\"com.redhat.devtools.lsp4ij:0.19.0\")` pin used only for the Gradle compile/test classpath. LSP4IJ vendors its own copy of org.eclipse.lsp4j inside its plugin jar (confirmed: org.eclipse.lsp4j-0.21.1.jar under LSP4IJ 0.19.0's lib/) and loads it in its own classloader, so if the live IDE's LSP4IJ resolves to a build bundling lsp4j >= 0.24.0 (which changed Diagnostic.message from String to Either<String,MarkupContent> as part of LSP 3.18 beta support -- a confirmed upstream breaking change), CompileResultPresenter.renderOne's `diagnostic.getMessage()` call site -- compiled against the 0.19.0-bundled lsp4j 0.21.1's `String getMessage()` -- fails to resolve against the runtime class's different method descriptor, throwing exactly `NoSuchMethodError: 'java.lang.String org.eclipse.lsp4j.Diagnostic.getMessage()'` (return type is part of the JVM method descriptor)."
  confirming_evidence:
    - "`./gradlew dependencies --configuration compileClasspath` shows lsp4j is NOT a separate declared dependency anywhere in bbj-intellij/build.gradle.kts; it reaches the classpath only transitively via `com.jetbrains.plugins:com.redhat.devtools.lsp4ij:0.19.0`."
    - "The LSP4IJ 0.19.0 plugin distribution (extracted at /home/coder/.gradle/caches/8.14.5/transforms/bca29e24af8e7fe074988738a0c3ce63/transformed/com.redhat.devtools.lsp4ij-0.19.0/lsp4ij/lib/) bundles org.eclipse.lsp4j-0.21.1.jar, org.eclipse.lsp4j.jsonrpc-0.21.1.jar, and their .debug siblings at 0.21.0 -- lsp4j is vendored inside the plugin, not a top-level Maven coordinate."
    - "`javap -p` on that exact jar's org.eclipse.lsp4j.Diagnostic shows `public java.lang.String getMessage();` / `public void setMessage(java.lang.String);` -- matching bbj-intellij's source exactly. The code is 100% correct against the API surface it is compiled and packaged against."
    - "plugin.xml (bbj-intellij/src/main/resources/META-INF/plugin.xml line 8) declares `<depends>com.redhat.devtools.lsp4ij</depends>` with NO version attribute -- IntelliJ plugin dependency declarations of this form resolve to whatever compatible version is installed/updated in the target IDE at run time, not to the Gradle-time compile pin."
    - "Direct precedent already observed in this exact UAT session: G-81-3 recorded IntelliJ auto-updating the BBj plugin itself from the Marketplace mid-session, silently replacing a locally-installed disk build. The same auto-update mechanism applies to LSP4IJ as a dependency plugin."
    - "Upstream confirmation (github.com/eclipse-lsp4j/lsp4j and microsoft/language-server-protocol 3.18 spec): lsp4j 0.24.0 (released ~Jan 2025) changed `Diagnostic.message` from `String` to `Either<String, MarkupContent>` as beta support for LSP 3.18's `Diagnostic.message: string | MarkupContent`, an explicitly acknowledged API-breaking change. LSP4IJ vendors its own lsp4j per its own DeveloperGuide (\"provides its own version of LSP4J with its classes loaded in the LSP4IJ plugin class loader\"), and LSP4IJ has shipped multiple releases after 0.19.0 (0.19.1 Dec 2025, 0.19.2 Feb 2026, 0.19.3 Apr 2026, and likely newer minors by Sept 2026) -- any of which bundling lsp4j >= 0.24.0 reproduces this exact NoSuchMethodError."
    - "CompileResultPresenterTest.java and CompileResultJsonBoundaryTest.java construct/consume `org.eclipse.lsp4j.Diagnostic` from the SAME compile/test classpath (the 0.19.0-pinned lsp4j 0.21.1), so the test suite can never observe a runtime-vs-compile-time skew that only exists when a live IDE's independently-resolved LSP4IJ install diverges from the pin -- explaining why 12/12 CompileResultPresenterTest passed while this broke live."
    - "grep across bbj-intellij/src/main/java confirms `Diagnostic.getMessage()` is called only at CompileResultPresenter.java:152 and :156 -- the exact two lines named in the reported stack trace, and the only call site of this API in the whole plugin."
  falsification_test: "If the live IDE's installed LSP4IJ build were confirmed (via its own Help > About / plugin list, or its bundled lsp4j jar) to still ship lsp4j < 0.24.0 (i.e. still `String getMessage()`), this hypothesis would be refuted and the NoSuchMethodError would have to come from a different loaded class entirely (e.g. duplicate lsp4j jars from a second, unrelated plugin's classloader) -- not obtainable from this sandboxed dev container since no live IDE install exists here; this is the one fact left unconfirmed (see blind_spots)."
  fix_rationale: "N/A for this diagnose-only session -- root cause is a compile-time/runtime API contract that the build cannot enforce because the dependency-plugin version is unpinned at the plugin.xml level. Any fix must make the message-access version-tolerant (reflection/Either-aware accessor) and/or pin+verify the runtime LSP4IJ version against what bbj-intellij compiles against, per the investigation_hints' suggested fix direction."
  blind_spots: "Cannot directly inspect the reporter's live IDE to confirm which exact LSP4IJ version (and therefore which exact lsp4j version) was actually loaded at the time of the crash -- the dev container has no installed IntelliJ instance. The exact lsp4j version boundary inside LSP4IJ's own release history where the bundled lsp4j crossed 0.24.0 was not pinned down (LSP4IJ vendors lsp4j from its own build.gradle.kts `lsp4jVersion` property, not confirmed for any specific 0.19.x/0.20.x+ tag). The 'subsequent compiles stay silent' half of the symptom is inferred to be IntelliJ's own platform-level deduplication of repeated identical background-task Errors (Task.Backgroundable.run() throws the Error as an argument to render(), before render() -- and therefore the notification -- ever executes; nothing in BbjCompileAction's own code sets any state that would suppress later attempts), not independently confirmed against idea.log from a live session."
  candidate_causes:
    - "config: bbj-intellij's plugin.xml `<depends>com.redhat.devtools.lsp4ij</depends>` carries no version constraint, so IntelliJ's plugin resolution/auto-update is free to install any newer, API-incompatible LSP4IJ build in a real IDE, decoupled from Gradle's compile-time pin of exactly 0.19.0."
    - "environment: the live IDE's Marketplace auto-update (already directly observed once in this same UAT session for a different plugin, G-81-3) most likely replaced the locally-resolvable LSP4IJ version with a newer one bundling a post-3.18-beta lsp4j (>= 0.24.0) whose Diagnostic.message field/accessor changed shape."
  and_gate: "no -- a single condition is sufficient: ANY live LSP4IJ build bundling lsp4j >= 0.24.0 triggers the failure on its own, regardless of how it got installed (fresh install, auto-update, or a developer's IDE that simply already had a newer LSP4IJ before this plugin was installed). The config gap (unpinned dependency) is what PERMITS the environment condition to arise silently; the environment condition (version actually present at runtime) is what triggers the crash. Both categories are recorded because the fix must address the permitting condition (pin/verify) as well as the triggering one (version-tolerant accessor), but only the environment condition needs to be true for the bug to manifest -- it is not an AND of two independently-necessary runtime facts."

## Symptoms

expected: The syntax-error file shows an error balloon whose body lists the compiler's errors as `line:col message`, with the same text in the language-server console. The valid file still shows `Compiled "<file>"`.
actual: First compile with a syntax error produced a NoSuchMethodError; subsequent syntax-error compiles produced nothing visible. Valid-file compile works (success path sends `diagnostics: []`, so no Diagnostic is ever touched).
errors: |
  java.lang.NoSuchMethodError: 'java.lang.String org.eclipse.lsp4j.Diagnostic.getMessage()'
      at com.basis.bbj.intellij.compile.CompileResultPresenter.renderOne(CompileResultPresenter.java:156)
      at com.basis.bbj.intellij.compile.CompileResultPresenter.renderDiagnostics(CompileResultPresenter.java:143)
      at com.basis.bbj.intellij.compile.CompileResultPresenter.present(CompileResultPresenter.java:83)
      at com.basis.bbj.intellij.actions.BbjCompileAction$1.run(BbjCompileAction.java:108)
      at com.intellij.openapi.progress.impl.CoreProgressManager.startTask(CoreProgressManager.java:569)
      ... (ProgressManager.runProcessWithProgressAsynchronously background task)
reproduction: Test 5 in UAT (.planning/phases/81-feature-parity-and-correctness/81-UAT.md). Plugin built from current main via `npm run build` in bbj-vscode then `./gradlew buildPlugin` in bbj-intellij, installed from disk into a live IntelliJ.
started: Discovered during UAT, right after gap-closure plan 81-06 fixed the previous G-81-4 failure (Position.character int overflow -> MessageIssueException). With that fixed, the response now deserializes and the code reaches renderOne for the first time in a live IDE.

## Eliminated

(none -- leading hypothesis confirmed on first pass; no competing hypothesis needed testing once the compile-classpath jar and its javap output matched the source exactly, ruling out "the code itself is wrong against what it's compiled against.")

## Evidence

- timestamp: 2026-09-05T00:05:00Z
  checked: "`cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew dependencies --configuration compileClasspath --console=plain`"
  found: "compileClasspath resolves to exactly three entries: `bundledPlugin:org.jetbrains.plugins.textmate:IC-242.20224.300`, `idea:ideaIC:2024.2`, `com.jetbrains.plugins:com.redhat.devtools.lsp4ij:0.19.0`. No `org.eclipse.lsp4j` Maven coordinate appears anywhere in the tree."
  implication: "lsp4j is not a first-class dependency of bbj-intellij at all -- it reaches the classpath solely as whatever jars are packaged inside the LSP4IJ 0.19.0 plugin distribution zip that the IntelliJ Platform Gradle plugin extracts."

- timestamp: 2026-09-05T00:08:00Z
  checked: "Contents of the extracted LSP4IJ 0.19.0 plugin distribution at /home/coder/.gradle/caches/8.14.5/transforms/bca29e24af8e7fe074988738a0c3ce63/transformed/com.redhat.devtools.lsp4ij-0.19.0/lsp4ij/lib/"
  found: "Bundled jars include org.eclipse.lsp4j-0.21.1.jar, org.eclipse.lsp4j.jsonrpc-0.21.1.jar, org.eclipse.lsp4j.debug-0.21.0.jar, org.eclipse.lsp4j.jsonrpc.debug-0.21.0.jar, alongside lsp4ij-0.19.0.jar itself and flexmark/annotations transitives."
  implication: "Confirms lsp4j is vendored inside LSP4IJ's own plugin lib/ directory (its own private copy), not obtained from Maven Central independently."

- timestamp: 2026-09-05T00:10:00Z
  checked: "`javap -p -classpath .../org.eclipse.lsp4j-0.21.1.jar org.eclipse.lsp4j.Diagnostic` (the exact jar on bbj-intellij's compile classpath)"
  found: "`private java.lang.String message;` / `public java.lang.String getMessage();` / `public void setMessage(java.lang.String);` -- a plain String-typed message field and accessor, matching CompileResultPresenter.java's usage exactly."
  implication: "The plugin's source code is unambiguously correct against the exact lsp4j jar it is compiled, tested, and packaged with. The bug cannot be a mistake in bbj-intellij's Java code as written -- it must be a runtime environment/version mismatch, confirming the leading hypothesis over any 'code is simply wrong' alternative."

- timestamp: 2026-09-05T00:15:00Z
  checked: "bbj-intellij/src/main/resources/META-INF/plugin.xml line 8"
  found: "`<depends>com.redhat.devtools.lsp4ij</depends>` -- a plain plugin-id dependency declaration with no `version` or `since-build` constraint tying it to 0.19.0."
  implication: "IntelliJ's plugin-dependency resolution mechanism installs/updates this dependency independently of the Gradle-time compile pin; a live IDE can and will run a different (newer) LSP4IJ build than 0.19.0 whenever the Marketplace has published one, with zero enforcement from this plugin.xml."

- timestamp: 2026-09-05T00:18:00Z
  checked: "81-UAT.md gap G-81-3 note and this same debug investigation's required_reading of 81-UAT.md"
  found: "G-81-3 was WITHDRAWN with the explicit finding: 'IntelliJ auto-updated the plugin from the Marketplace during the UAT session; re-test with the local build shows the row' -- for the BBj plugin itself, in this exact UAT session."
  implication: "Marketplace auto-update silently replacing an installed plugin build is not a theoretical risk here -- it is a directly observed, already-confirmed behavior of the exact IDE session used for this UAT run. The same mechanism applying to the LSP4IJ dependency plugin (rather than the BBj plugin itself) is the most parsimonious explanation, not a stretch."

- timestamp: 2026-09-05T00:22:00Z
  checked: "Web research: eclipse-lsp4j/lsp4j CHANGELOG/releases and the LSP 3.18 specification's Diagnostic.message field"
  found: "LSP 3.18 (proposed/beta) changed `Diagnostic.message` from `string` to `string | MarkupContent`. lsp4j 0.24.0 (released ~2025-01-31 per download.eclipse.org staging index) implements this as changing `Diagnostic.message` from `String` to `Either<String, MarkupContent>`, explicitly documented as an API-breaking change. LSP4IJ's own DeveloperGuide states it 'provides its own version of LSP4J with its classes loaded in the LSP4IJ plugin class loader.' LSP4IJ has shipped 0.19.1 (2025-12-17), 0.19.2 (2026-02-13), 0.19.3 (2026-04-15) since the 0.19.0 pin (2025-12-04), with the marketplace almost certainly further ahead by the 2026-09-05 UAT date."
  implication: "A concrete, named upstream change exists that produces exactly this symptom shape (String-returning getter replaced by an Either-returning getter, differing only in return type, which the JVM encodes in the method descriptor -- hence NoSuchMethodError rather than a compile error or silent behavior change). This confirms the mechanism is real and dated plausibly before this UAT run, not merely hypothetically possible."

- timestamp: 2026-09-05T00:25:00Z
  checked: "bbj-intellij/src/test/java/com/basis/bbj/intellij/compile/CompileResultPresenterTest.java (12/12 passing) and grep for `getMessage()` / `org.eclipse.lsp4j` across bbj-intellij/src/main/java"
  found: "The test constructs `org.eclipse.lsp4j.Diagnostic` from the identical 0.19.0-pinned compile/test classpath, so it can only ever exercise the String-returning getMessage() and can never see a runtime skew. `grep -rn \"getMessage()\"` across bbj-intellij/src/main/java shows the lsp4j Diagnostic.getMessage() call exists at exactly two lines -- CompileResultPresenter.java:152 and :156 -- the exact two lines named in the reported stack trace, and the only call site of this API anywhere in the plugin."
  implication: "Explains why the existing test suite (and every other part of the plugin) never caught this: it is structurally invisible to any test that shares the same pinned build-time classpath as the code under test. The defect is isolated to CompileResultPresenter's two getMessage() calls; no other code path is at risk today, though any future lsp4j-Either-typed field access anywhere else in the plugin would carry the identical hazard."

## Resolution

root_cause: "CompileResultPresenter.renderOne (CompileResultPresenter.java:152 and :156) calls `Diagnostic.getMessage()` compiled against the `String`-returning signature from lsp4j 0.21.1 -- the version vendored inside the LSP4IJ 0.19.0 plugin distribution that bbj-intellij's build.gradle.kts pins ONLY for its compile/test classpath (`plugin(\"com.redhat.devtools.lsp4ij:0.19.0\")`; there is no separate/explicit org.eclipse.lsp4j Maven dependency anywhere in the build). At runtime, bbj-intellij's plugin.xml declares its LSP4IJ dependency with no version pin (`<depends>com.redhat.devtools.lsp4ij</depends>`), so a live IDE resolves and can auto-update that dependency plugin to whatever build the JetBrains Marketplace currently serves -- completely decoupled from the Gradle-time pin. LSP4IJ vendors its own private copy of lsp4j inside its plugin jar and loads it in its own classloader. Once the live IDE's LSP4IJ build bundles lsp4j >= 0.24.0 -- which implements LSP 3.18's (beta) `Diagnostic.message: string | MarkupContent` by changing the Java-side field/accessor from `String getMessage()` to `Either<String, MarkupContent> getMessage()`, an upstream change explicitly documented as API-breaking -- the runtime class no longer has a method matching the descriptor `()Ljava/lang/String;` that CompileResultPresenter.class was compiled against. Because return type is part of the JVM method descriptor (not just the method name), this produces exactly `NoSuchMethodError: 'java.lang.String org.eclipse.lsp4j.Diagnostic.getMessage()'` the instant a compile-errors result reaches renderOne -- i.e. the first time any diagnostic actually needs rendering (the success path never touches Diagnostic at all, which is why the happy path worked). The existing test suite cannot catch this because CompileResultPresenterTest is compiled and run against the identical 0.19.0-pinned lsp4j jar, so it only ever exercises the String-typed getter. This exact live-IDE-vs-Gradle-pin divergence mechanism (Marketplace auto-update silently overriding a version a build assumed was fixed) was already directly observed once earlier in this same UAT session for the BBj plugin itself (G-81-3), making it the most parsimonious explanation rather than a stretch."
fix: ""
verification: ""
files_changed: []
</content>
