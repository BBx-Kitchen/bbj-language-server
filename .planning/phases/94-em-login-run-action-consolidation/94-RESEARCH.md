# Phase 94: EM Login & Run Action Consolidation - Research

**Researched:** 2026-09-18
**Domain:** IntelliJ plugin action wiring (AnAction enablement, EDT/BGT threading), IntelliJ-platform-free Java refactor of a credential-validation code path, source-guard test maintenance
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** `BbjEMLoginAction` gains `update()` gating on **`project != null` only**, plus
  `getActionUpdateThread()` returning `ActionUpdateThread.BGT`. Deliberately **not** gated on BBj
  Home and **not** gated on language-server readiness. EM login never talks to the language
  server — it authenticates by running the bundled `em-login.bbj` through the BBj interpreter
  directly. Not BBj-Home-gated either: disabling the item there would silently swallow the one
  thing that tells a new user what to fix (the "Please configure BBj Home..." dialog). A
  project-only gate reads no settings in `update()`, so nothing in it is BGT-unsafe.
- **D-02:** The gate is applied with **`setEnabledAndVisible`** — the item hides rather than
  greys out — matching all six siblings that declare `update()`. ROADMAP criterion 2's wording
  "enabled and greyed out ... its ten sibling actions" is self-contradictory (the siblings all
  hide) and is corrected to *enabled and visible in exactly the states its siblings are*.
- **D-03:** `validateTokenServerSide` **and** `validateTokenTrusted` both move off
  `BbjRunActionBase` into a **new class beside `BbjEMTokenStore`** (not onto it). Moving the pair
  together keeps them adjacent, which `EmTokenTrustWindowSourceGuardTest:138-148` deliberately
  asserts, and leaves no half of the token-validation story behind in the run-action base.
  Reversibility: costly (re-points two security-relevant source guards).
- **D-04:** The new class **takes the BBj executable path and the `em-validate-token.bbj` path
  as parameters**. It reads no settings and performs no plugin lookup of its own.
  `BbjRunActionBase.getBbjExecutablePath()` stays where it is; the script path is resolved
  through EM-05's shared helper at the call site. Consequence: `buildWebRunCommandLine`'s call
  site grows from `validateTokenTrusted(project, token)` to an explicit multi-argument call, so
  `EmTokenTrustWindowSourceGuardTest:112-116,129-135`'s pinned literal changes with it. The
  5-minute `TokenValidationCache.TRUST_WINDOW_MS` semantics are preserved exactly.
- **D-05:** **EM-01 (#590) closes with a new source guard**; **EM-04 (#615) closes on cited
  evidence with no new test.** #615's invariant is already pinned twice
  (`EmTokenTrustWindowSourceGuardTest:96-101`, `BbjRunActionConfigPathSourceGuardTest:127-130`).
  #590 has nothing pinning the `finally` scope today; the nearest existing analogue is
  `BbjSecretArgvSourceGuardTest:282-299` (an adjacent but different invariant — precedence of
  `createOwnerOnlyFile` before `CapturingProcessHandler(`, not "cleanup covers the whole
  launch"). Neither requirement is to be reported as newly implemented.
- **D-06:** One shared helper resolves **the three tool scripts only** — `web.bbj`,
  `em-login.bbj`, `em-validate-token.bbj` — and takes an **injected plugin-path resolver seam**
  (a `@FunctionalInterface`, following the `BbjNodeVersionCache` / `JavaClassesRefreshFlow` /
  `BbjInteropPortCache` convention already in this tree). The seam is what lets plain JUnit 5
  exercise "script present → path" and "script missing → null". Call sites retired:
  `BbjRunActionBase.getWebBbjPath():241`, `BbjRunActionBase.getEmValidateBbjPath():266`,
  `BbjEMLoginAction.getEMLoginBbjPath():224`. Reversibility: reversible.
- **D-07:** **`BbjLanguageServer.resolveServerPath():97-106` is deliberately left alone** —
  different shape (resolves `lib/language-server/main.cjs`, falls back to classloader
  extraction in dev mode, throws rather than returning null). Folding it in would change
  language-server startup behaviour, beyond #614's scope.
- **D-08:** Every guard the moves break is re-pointed using **Phase 93's D-11 precedent**:
  assert each pin exactly once inside the *new* home's extracted method body via a
  brace-balanced `extractMethodBody()`, keep a delegation pin at each call site, and keep
  negative/zero assertions sweeping all affected files at full breadth. Each guard keeps its own
  private copy of `countOccurrences`/`extractMethodBody`/`readSource` (D-12 precedent — no
  shared test helper). Guards known to break: `BbjSecretArgvSourceGuardTest` (`OWNER_ONLY_FILE_CALLERS`,
  `ALL_GUARDED_ACTION_FILES`, `:272-299`'s precedence assertion, `:116`/`:191`'s data-flow
  assertion) and `EmTokenTrustWindowSourceGuardTest:138-148`. `OffEdtDispatchSourceGuardTest` and
  `Lsp4ijImportAllowlistTest:45` are **not** expected to break but must be re-run.
- **D-09:** Plan order is **EM-05 → EM-03 → EM-02 / EM-01 / EM-04**. EM-05's helper is what
  EM-03's new class consumes for its `em-validate-token.bbj` path. EM-02 is file-disjoint from
  both and can land anywhere; EM-01's pin and EM-04's evidence come last.

### Claude's Discretion

- Names of the new validation class and the new path helper, their packages, and the names of
  the new and re-pointed guard tests.
- The exact form of the EM-01 guard's assertion, within D-05's meaning (that the cleanup covers
  the launch, not merely that a `finally` exists).
- Javadoc wording throughout, and whether the new validation class is a static utility or an
  instantiable seam holder — provided D-04's "no settings read, no plugin lookup" property holds.
- Whether EM-02's tiny `update()` warrants its own guard or rides along in an existing action
  guard.
- Plan sequencing details not fixed by D-09.
- Package/class names for the two new EM-05/EM-03 homes.

### Deferred Ideas (OUT OF SCOPE)

- **`BbjEMLoginAction:90-99`'s own BBj-executable resolution** (differs from
  `BbjRunActionBase.getBbjExecutablePath():187-210` — `os.name` string test + `toRealPath()` +
  `isExecutable` vs. `SystemInfo.isWindows` + `bin/` with no-`bin/` fallback, no symlink
  resolution). A fourth duplication, no issue filed, not folded in — unifying is a behaviour
  change needing its own verification.
- **`BbjLanguageServer.resolveServerPath():97-106`** — the fourth plugin-path lookup, excluded
  by D-07.
- **`79-REVIEW` IN-02** is retired by EM-05 — confirm at phase close it can be marked resolved.
- Four reviewed todos matched by keyword scan, none belong to this phase (PLAT-05, PLAT-06,
  a fixed gradle-wrapper item, and unrelated env drift in vitest).

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EM-01 (#590) | EM login temp file deleted even when the launch throws | Already fixed by `06eb1a7c`; verified at `BbjEMLoginAction.java:106-180` (Code Examples, Pitfall 1). Research defines the new source-guard's assertion shape. |
| EM-02 (#589) | "Login to Enterprise Manager" gates enablement + `ActionUpdateThread.BGT` | Verified sibling shape at `BbjRefreshJavaClassesAction.java:120-134` (Code Examples). Research supplies the exact `update()`/`getActionUpdateThread()` skeleton per D-01/D-02. |
| EM-03 (#617) | Server-side EM token validation moves beside `BbjEMTokenStore` | Verified `BbjRunActionBase.java:291-347` (methods to move) and `TokenValidationCache.java` (seam pattern to imitate) and `BbjEMTokenStore.java` (destination file). Research maps every guard assertion that must move with the code. |
| EM-04 (#615) | BUI/DWC run flow shares one base | Already satisfied by `6a55b854`; verified `BbjRunBuiAction.java`/`BbjRunDwcAction.java` (31 lines, 7 differ) and `BbjRunActionBase.buildWebRunCommandLine():448-552`. Research confirms the two pinning guards need no new test. |
| EM-05 (#614) | Three tool-script paths resolve through one shared helper | Verified the three duplicated lookups (`BbjRunActionBase.java:241-281`, `BbjEMLoginAction.java:224-234`) and the `@FunctionalInterface` seam convention (`BbjInteropPortCache.java`, `BbjNodeVersionCache.java`). Research supplies the skeleton and the `prepareSandbox` script list to keep in sync (`build.gradle.kts:215-220`). |

</phase_requirements>

## Summary

This phase touches no new frameworks, no new third-party packages, and no cross-IDE surface —
it is a pure IntelliJ-plugin-internal Java refactor plus one enablement fix, entirely inside
`bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/`. Two of the five requirements
(EM-01, EM-04) are already implemented in the tree by prior commits and close on cited evidence;
the research need for them is narrow (confirm the evidence, define what the new EM-01 guard must
assert). The three requirements with real work — EM-02 (enablement), EM-03 (move two methods to
a new class beside `BbjEMTokenStore`), EM-05 (one shared tool-script-path helper) — all have a
directly-reusable in-repo pattern to imitate: `BbjRefreshJavaClassesAction` for the `update()`/
`ActionUpdateThread.BGT` shape (EM-02), and `BbjNodeVersionCache`/`BbjInteropPortCache`'s
`@FunctionalInterface`-seam-plus-package-private-constructor convention for both the new
validation class (EM-03) and the new path-resolver helper (EM-05).

The dominant risk in this phase is not implementation difficulty — the moves are small and the
target shapes are established precedent — it is **source-guard blast radius**. Three guard files
(`BbjSecretArgvSourceGuardTest`, `EmTokenTrustWindowSourceGuardTest`,
`BbjRunActionConfigPathSourceGuardTest`) currently pin invariants against `BbjRunActionBase`'s
present shape by literal-count and ordering assertions over the *whole file* or over
`buildWebRunCommandLine`'s extracted body. Two of those guards contain assertions that will start
failing the moment `validateTokenServerSide`/`validateTokenTrusted` leave the base class, and one
of the two — `BbjSecretArgvSourceGuardTest` — is an explicit GHSA-33x9-cpwv-xcv2/GHSA-xxp5-vv2w-42q8
pin that must be re-pointed with the same rigor, never weakened. This research traces every
assertion in every affected guard file to its exact line range and states, for each one, whether
it moves, is re-scoped, or is untouched — the list the orchestrator notes calls "what makes the
plan executable."

**Primary recommendation:** Sequence exactly as D-09 fixes (EM-05 → EM-03 → EM-02/EM-01/EM-04),
follow the `BbjNodeVersionCache` seam convention verbatim for both new classes, and re-point guard
assertions using the Phase 93 D-11/D-12 precedent (assert inside the new home's extracted method
body, keep per-caller delegation pins, keep negative assertions at full file breadth, no shared
test-helper code between guards).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| EM login action enablement (EM-02) | IntelliJ plugin action layer (`AnAction.update`) | — | Presentation-only gate; no data layer involved |
| EM login temp-file lifecycle (EM-01) | IntelliJ plugin action layer (`BbjEMLoginAction`) | Local filesystem (owner-only temp file) | Runs a subprocess and manages a temp file entirely inside the plugin process; no server/API tier exists in this phase |
| EM token server-side validation (EM-03) | IntelliJ plugin action layer, new class beside `BbjEMTokenStore` | BBj interpreter subprocess (`em-validate-token.bbj`) | Credential-lifecycle logic belongs with `BbjEMTokenStore`/`TokenValidationCache`, not with the run-action base that merely triggers a run |
| BUI/DWC run command construction (EM-04) | IntelliJ plugin action layer (`BbjRunActionBase.buildWebRunCommandLine`) | BBj interpreter subprocess (`web.bbj`) | Already-consolidated shared body; subclasses supply only the client-type literal |
| Tool-script path resolution (EM-05) | IntelliJ plugin action layer, new shared helper class | Plugin descriptor / filesystem (`IdeaPluginDescriptor.getPluginPath()`) | Pure path-lookup logic with an injected seam so the resolution algorithm is testable without the platform |

There is no browser, SSR, backend-API, CDN, or database tier in scope for this phase — everything
lives in a single IntelliJ plugin process, consistent with the standing v4.4 constraint that
"v4.4 is IntelliJ-only" (`.planning/STATE.md` Active Constraints).

## Standard Stack

No new external library, framework, or package is introduced by this phase. All five
requirements are refactors and one enablement fix within the plugin's existing Java codebase,
using only:

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| IntelliJ Platform SDK (`com.intellij.*`) | 2024.2 (existing project pin — unchanged by this phase) | `AnAction`, `ActionUpdateThread`, `PluginManager`/`IdeaPluginDescriptor`, `GeneralCommandLine`, `CapturingProcessHandler` | Already the platform this plugin is built on; no alternative applies |
| JUnit Jupiter (JUnit 5) | 6.1.3 (`junit-bom`, `bbj-intellij/build.gradle.kts:39-41`) [VERIFIED: bbj-intellij/build.gradle.kts:39-41] | Source-guard tests and plain-Java unit tests for the two new seam classes | Already the test framework (`useJUnitPlatform()`, `build.gradle.kts:45`) [VERIFIED: bbj-intellij/build.gradle.kts:45] |

**Installation:** None required — no `build.gradle.kts` dependency changes are needed for this
phase.

**Version verification:** Not applicable — no new packages. The JUnit BOM version above was read
directly from `build.gradle.kts` in this session rather than assumed from training data.

## Package Legitimacy Audit

**Not applicable.** This phase installs no new external packages in any ecosystem (npm, Maven/
Gradle, PyPI). All work is internal Java code movement within `bbj-intellij/src/main/java/com/
basis/bbj/intellij/actions/`. The Package Legitimacy Gate protocol is skipped by design — there
is nothing to run it against.

## Architecture Patterns

### System Architecture Diagram

```
IntelliJ Tools Menu / Editor Popup Menu / Keyboard Shortcut
        |
        v
  AnAction.update() (BGT)                AnAction.actionPerformed() (EDT)
   - project != null?                          |
   - setEnabledAndVisible(...)                 v
                                    ApplicationManager.executeOnPooledThread()
                                                |
                                                v
                                   assertIsNonDispatchThread()  [tripwire]
                                                |
                          +---------------------+----------------------+
                          |                                            |
                 BbjEMLoginAction.performLogin()          BbjRunActionBase.buildCommandLine()
                 (Tools > Login to EM, or a               (GUI / BUI / DWC subclass)
                  BUI/DWC re-prompt callback)                          |
                          |                                +-----------+-----------+
             createOwnerOnlyFile() [owner-only temp file]  |                       |
                          |                          GUI: build args        BUI/DWC: buildWebRunCommandLine()
             try { GeneralCommandLine + CapturingProcessHandler.runProcess(15000) }  |
                          |  finally { deleteIfExists(tmpFile) }     token = BbjEMTokenStore.getToken()
                          |                                          |  (auto-prompt login if absent)
             read temp file -> JwtValidity.check() -> BbjEMTokenStore.storeToken()
                                                                      |
                                                        isTokenExpired(token)? -> delete + re-prompt
                                                                      |
                                                    validateTokenTrusted(project, bbjPath, scriptPath, token)
                                                    [NEW HOME beside BbjEMTokenStore, post EM-03]
                                                          |                    |
                                              TokenValidationCache.isTrusted?  no -> validateTokenServerSide()
                                              (5-min window, digest-keyed)          (spawns em-validate-token.bbj
                                                                                      via getEmValidateBbjPath(),
                                                                                      NEW: through EM-05's shared
                                                                                      tool-script-path helper)
                                                                      |
                                                     GeneralCommandLine(bbjPath) + web.bbj / em-login.bbj / em-validate-token.bbj
                                                     path all resolved through the ONE shared helper (EM-05)
                                                                      |
                                                                      v
                                                          OSProcessHandler.startNotify()
                                                          (BUI/DWC launch, or EM login subprocess)
```

Reading the diagram top to bottom traces both use cases end to end: menu/shortcut click → BGT
enablement check → EDT dispatch to a pooled thread → (EM login path) owner-only temp file →
subprocess → decode/validate → store; or (BUI/DWC run path) token lookup → expiry/trust-window
check → server-side validation (only on a cache miss) → command-line assembly → process launch.
The EM-03 and EM-05 boxes are annotated with where the code moves to after this phase.

### Recommended Project Structure

No new directories. Two new files land in the existing package:

```
bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/
├── BbjRunActionBase.java       # loses validateTokenServerSide/validateTokenTrusted (EM-03);
│                                 loses getWebBbjPath/getEmValidateBbjPath (EM-05); gets a
│                                 multi-arg call to the new EM-03 class
├── BbjEMLoginAction.java       # gets update()/getActionUpdateThread() (EM-02); loses
│                                 getEMLoginBbjPath (EM-05); EM-01's cleanup scope is unchanged
├── BbjEMTokenStore.java        # unchanged; the new EM-03 class sits BESIDE it, not on it (D-03)
├── TokenValidationCache.java   # unchanged; model for the new EM-03 class's plain-Java shape
├── <NewEmTokenValidator>.java  # NEW (EM-03) — validateTokenServerSide + validateTokenTrusted,
│                                 taking bbjPath/scriptPath as parameters (D-04); naming is
│                                 Claude's discretion
└── BbjRunBuiAction.java / BbjRunDwcAction.java   # unchanged (EM-04 already satisfied)

bbj-intellij/src/main/java/com/basis/bbj/intellij/            # or a subpackage — discretion
└── <NewToolScriptPathResolver>.java   # NEW (EM-05) — resolves web.bbj / em-login.bbj /
                                          em-validate-token.bbj through one @FunctionalInterface
                                          plugin-path-resolver seam
```

### Pattern 1: `update()` / `ActionUpdateThread.BGT` sibling shape (for EM-02)

**What:** Every action with real gating logic in this codebase overrides `update()` to compute a
boolean off a nullable `Project`/state check, then calls `e.getPresentation().setEnabledAndVisible(...)`,
and overrides `getActionUpdateThread()` to return `ActionUpdateThread.BGT`.

**When to use:** EM-02's `BbjEMLoginAction` — gate on `project != null` only (D-01), nothing else.

**Example (verified against the live sibling this phase's D-01 note names as background, and
the shape `BbjRefreshJavaClassesAction` already uses):**
```java
// Source: bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRefreshJavaClassesAction.java:120-134
@Override
public void update(@NotNull AnActionEvent e) {
    Project project = e.getProject();
    boolean enabled = false;
    if (project != null) {
        ServerStatus status = BbjServerService.getInstance(project).getCurrentStatus();
        enabled = status == ServerStatus.started;
    }
    e.getPresentation().setEnabledAndVisible(enabled);
}

@Override
public @NotNull ActionUpdateThread getActionUpdateThread() {
    return ActionUpdateThread.BGT;
}
```

Per D-01, `BbjEMLoginAction`'s version drops the `ServerStatus` check entirely — it gates on
`project != null` only:
```java
// Sketch for BbjEMLoginAction (D-01) — not yet in the tree; no ServerStatus import needed
@Override
public void update(@NotNull AnActionEvent e) {
    e.getPresentation().setEnabledAndVisible(e.getProject() != null);
}

@Override
public @NotNull ActionUpdateThread getActionUpdateThread() {
    return ActionUpdateThread.BGT;
}
```
Because this gate reads no LSP4IJ symbol, `Lsp4ijImportAllowlistTest`'s `ALLOWLIST` map
[VERIFIED: bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijImportAllowlistTest.java:44-63 — quoted verbatim: `Map.entry("com/basis/bbj/intellij/actions/BbjRunActionBase.java", Set.of("ServerStatus"))` is present; no entry exists for `BbjEMLoginAction.java`] needs **no new entry** for `BbjEMLoginAction.java` — confirming D-08's expectation that this guard is unaffected.

### Pattern 2: `@FunctionalInterface` seam + package-private constructor (for EM-03 and EM-05)

**What:** A plain-Java class (no `com.intellij` import) exposes one or two `@FunctionalInterface`
collaborator types, a `public static final` `SESSION` instance wired to the real collaborators,
and a **package-private constructor** so tests can inject fakes.

**When to use:** Both new classes in this phase — the EM-03 validation class (needs `bbjPath`/
`scriptPath` as call-site parameters per D-04, so it may not need the cache-style stat/spawner
split, but should still isolate the subprocess-spawning collaborator behind an interface so a
JUnit 5 test can fake "process ran, produced VALID" without a real BBj install) and the EM-05
path-resolver helper (needs exactly this shape — a plugin-path-resolver seam).

**Example:**
```java
// Source: bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjInteropPortCache.java:16-58
public final class BbjInteropPortCache {

    @FunctionalInterface
    interface PortReader {
        BbjInteropPortDetector.PortLookup readFrom(java.nio.file.Path propertiesFile);
    }

    @FunctionalInterface
    interface FileStat {
        @Nullable String stampOf(java.nio.file.Path propertiesFile);
    }

    public static final BbjInteropPortCache SESSION =
            new BbjInteropPortCache(BbjInteropPortCache::defaultStamp, BbjInteropPortDetector::readFrom);

    private final FileStat stat;
    private final PortReader reader;

    /** Package-private so tests can inject a fake stat and a counting reader. */
    BbjInteropPortCache(FileStat stat, PortReader reader) {
        this.stat = stat;
        this.reader = reader;
    }
    // ...
}
```

For EM-05, the seam should be a `@FunctionalInterface PluginPathResolver { @Nullable Path
resolve(String relativePath); }` (or equivalent), with the production `SESSION`/static entry
point wired to the existing `PluginManager.getInstance().findEnabledPlugin(PluginId.getId(
"com.basis.bbj")).getPluginPath().resolve(...)` lookup — verified identical across all three
current call sites:
```java
// Source: bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java:241-281
// (getWebBbjPath, getEmValidateBbjPath — both use PluginId.getId("com.basis.bbj") then
//  findEnabledPlugin then .getPluginPath().resolve("lib/tools/<script>") then Files.exists)
```
```java
// Source: bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java:224-234
// (getEMLoginBbjPath — identical shape, third copy)
```

### Pattern 3: source-guard re-pointing (Phase 93 D-11/D-12 precedent, applies to EM-03/EM-04's guards)

**What:** When a method is extracted or moved, the guard that pins it stops asserting file-wide
literal counts and instead extracts the *declaring method's* brace-balanced body first, then
asserts inside that substring. Delegation is pinned separately, once per caller.

**When to use:** Re-pointing `BbjSecretArgvSourceGuardTest` and `EmTokenTrustWindowSourceGuardTest`
after EM-03 moves `validateTokenServerSide`/`validateTokenTrusted` off `BbjRunActionBase`.

**Example (the exact idiom already used by three guards in this repo):**
```java
// Source: bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmTokenTrustWindowSourceGuardTest.java:36-56
private static String extractMethodBody(String text, String signatureFragment) {
    int sigIndex = text.indexOf(signatureFragment);
    assertTrue(sigIndex >= 0, "method signature not found: " + signatureFragment);
    int braceStart = text.indexOf('{', sigIndex);
    assertTrue(braceStart >= 0, "opening brace not found for: " + signatureFragment);
    int depth = 0;
    for (int i = braceStart; i < text.length(); i++) {
        char c = text.charAt(i);
        if (c == '{') { depth++; }
        else if (c == '}') { depth--; if (depth == 0) { return text.substring(braceStart, i + 1); } }
    }
    fail("unbalanced braces for: " + signatureFragment);
    return "";
}
```
Every guard keeps its **own private copy** of this helper (D-12) — do not extract a shared test
utility.

### Anti-Patterns to Avoid

- **Weakening `BbjSecretArgvSourceGuardTest` during the EM-03 move:** this test is an explicit
  GHSA-33x9-cpwv-xcv2/GHSA-xxp5-vv2w-42q8 pin (`BbjSecretArgvSourceGuardTest.java:19-27`, class
  Javadoc). Re-point every assertion that moves to the new class's file; never delete an
  assertion because "it moved" without an equivalent assertion in the new location.
- **Reaching for `BbjEMLoginAction`'s own BBj-executable resolution as a model:** it differs
  from `BbjRunActionBase.getBbjExecutablePath()` (no `bin/`-less fallback, does resolve
  symlinks via `toRealPath()`) — do not silently unify these as a side effect of EM-02/EM-03/
  EM-05; it is explicitly deferred (see `<user_constraints>` Deferred Ideas).
  [VERIFIED: bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java:90-99 —
  quoted: `String os = System.getProperty("os.name", "").toLowerCase();` ... `Path bbjPath = Path.of(bbjBin); try { bbjPath = bbjPath.toRealPath(); } catch (Exception ignored) {}`]
- **Extracting a shared test-helper class for the guard tests:** deliberately rejected by the
  Phase 93 D-12 precedent this phase inherits — each guard keeps its own private
  `countOccurrences`/`extractMethodBody`/`readSource`.
- **Gating `BbjEMLoginAction`'s enablement on `ServerStatus.started` or BBj Home presence:**
  explicitly rejected by D-01 with a stated rationale (see User Constraints above) — do not
  "improve" this in the plan beyond what D-01 fixes.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Injectable, testable path/subprocess seam for EM-03/EM-05 | A bespoke interface shape per new class | The exact `@FunctionalInterface` + `public static final SESSION` + package-private constructor idiom from `BbjNodeVersionCache`/`BbjInteropPortCache`/`JavaClassesRefreshFlow` | Three existing classes already establish this convention; a fourth shape would be an unnecessary inconsistency the codebase has no other example of |
| Source-guard test infrastructure (brace-balanced method-body extraction, balanced-paren argument extraction) | A new parsing utility | Copy the existing `extractMethodBody`/`extractBalancedCallArgument`/`countOccurrences` idiom into each new/re-pointed guard's own private copy | These are already hand-tuned, comment-line-safe idioms proven across 5+ guard files; reinventing risks a subtly different (and untested) parsing edge case |
| JWT decode/expiry classification | A new decode routine inside the EM-03 class | `JwtValidity.check(...)` (already the sole decode path, pinned by `EmTokenFailClosedSourceGuardTest`) | EM-03 must not duplicate or bypass the existing fail-closed JWT classification; it is out of scope and separately guarded |

**Key insight:** Every piece of infrastructure this phase needs — the seam pattern, the
guard-test idiom, the JWT classification — already exists once in this codebase. The work is
disciplined imitation and precise re-pointing, not net-new design.

## Runtime State Inventory

> Included because EM-03 and EM-05 are code-consolidation refactors (methods/lookups moving
> between files) and EM-02 changes an action's registered enablement behaviour.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | PasswordSafe credential entry keyed by `SERVICE_NAME = "BBj Enterprise Manager"` [VERIFIED: bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMTokenStore.java:24 — quoted: `private static final String SERVICE_NAME = "BBj Enterprise Manager";`]. No rename touches this key. | None — the key is untouched by EM-01/02/03/05 |
| Live service config | None — this phase does not touch EM server-side configuration, n8n-style external workflows, or any dashboard/tag registration | None |
| OS-registered state | None — no Task Scheduler entry, pm2 process, launchd/systemd unit is created or renamed by this phase | None |
| Secrets/env vars | The EM token still travels on the process environment via `BbjProcessSecretEnv` (unchanged mechanism); EM-03 relocates the *caller* of that mechanism but not the mechanism itself or any env-var name | Code edit only — no secret name changes |
| Build artifacts | `bbj-intellij/build.gradle.kts:215-220`'s `prepareSandbox` task copies `web.bbj`, `em-login.bbj`, `em-validate-token.bbj` from `bbj-vscode/tools/` into `lib/tools` [VERIFIED: bbj-intellij/build.gradle.kts:215-220 — quoted: `from("${projectDir}/../bbj-vscode/tools/") { include("web.bbj") include("em-login.bbj") include("em-validate-token.bbj") into("${pluginName.get()}/lib/tools") }`]. EM-05's helper must keep resolving `lib/tools/<name>` relative to the plugin path — the three script filenames and their destination directory are unchanged by this phase. | None — verify the new helper's resolved relative path (`lib/tools/<script>`) matches this task's `into` target exactly |

**Nothing found requiring migration:** this phase moves Java method bodies and one lookup helper
between files in the same module; it renames no credential-store key, config key, script
filename, or OS-registered identifier. Verified by reading `BbjEMTokenStore.java`,
`build.gradle.kts`, and `plugin.xml` directly in this session — no other item in any category.

## Common Pitfalls

### Pitfall 1: EM-01's temp-file cleanup — asserting the wrong thing

**What goes wrong:** A guard that merely asserts a `finally { Files.deleteIfExists(tmpFile); }`
block exists would pass even on a regression that re-narrows the `try` scope to wrap only the
file *read* (the exact WR-02 regression this code comment already documents having fixed once).

**Why it happens:** `finally` presence is trivial to assert; "the try covers the whole launch"
requires asserting that the `try` opens *before* `runProcess(15000)` and that nothing between
`tmpFile = createOwnerOnlyFile(...)` and the `finally` can exit the method without passing
through it.

**How to avoid:** Model the new guard on the *positional* idiom `BbjSecretArgvSourceGuardTest`
already uses (`indexOf` ordering: `createOwnerOnlyFile` before `CapturingProcessHandler(`), but
extend it to also assert `runProcess(15000)`'s index is between the `try {` that follows
`tmpFile = ...` and the `finally {` that contains `deleteIfExists`. Verified exact ordering in
the current file:
```java
// Source: bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java:106-180
Path tmpFile;
try {
    tmpFile = BbjProcessSecretEnv.createOwnerOnlyFile("bbj-em-login-", ".tmp");
} catch (Exception ex) {
    showErrorOnEdt("Login failed: " + ex.getMessage(), "EM Login Failed");
    return false;
}
try {
    // ... GeneralCommandLine cmd = ...
    CapturingProcessHandler handler = new CapturingProcessHandler(cmd);
    ProcessOutput output = handler.runProcess(15000); // 15s timeout
    // ... read tmpFile, classify, store token ...
    return true;
} catch (Exception ex) {
    // ...
    return false;
} finally {
    try { Files.deleteIfExists(tmpFile); } catch (Exception ignored) {}
}
```
[VERIFIED: bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java:106-180]
The new guard should assert (a) `createOwnerOnlyFile` precedes the *second* `try {` (the one
containing `runProcess`), (b) `runProcess(15000)` occurs inside that `try` (before its matching
`finally`), and (c) exactly one `deleteIfExists(tmpFile)` exists inside that `finally`.

**Warning signs:** A future edit that adds a new early `return` between `tmpFile = ...` and the
`try {` that spawns the process, or that moves any blocking call above the `try`, would defeat
the invariant without a compile error.

### Pitfall 2: Re-pointing `EmTokenTrustWindowSourceGuardTest` — the ordering assertion, not just presence

**What goes wrong:** After EM-03 moves `validateTokenServerSide`/`validateTokenTrusted` to the
new class, a guard that only checks "the new class contains `validateTokenServerSide` and
`validateTokenTrusted`" loses the ordering invariant the current test enforces: that
`validateTokenTrusted` is declared **after** `validateTokenServerSide` (`EmTokenTrustWindowSourceGuardTest.java:138-148`,
verified above) "so the pair reads as one unit."

**Why it happens:** It's easy to move both methods and re-verify only "both exist," dropping the
positional pin as collateral simplification.

**How to avoid:** The re-pointed guard must reproduce
`assertTrue(serverSideIndex >= 0 && trustedIndex >= 0 && trustedIndex > serverSideIndex, ...)`
against the *new* file, not the old one, and must also carry over
`theSharedWebRunHelperCallsValidateTokenTrustedExactlyOnce` and
`theExpiryCheckPrecedesTheTrustedValidationInTheSharedWebRunHelper`'s call-site literal —
which changes shape per D-04 (multi-argument call instead of `validateTokenTrusted(project,
token)`), so the literal itself must be updated, not merely re-pointed to a new file.

**Warning signs:** A guard-file diff that deletes more assertions than it adds during the EM-03
plan is a signal an invariant was dropped rather than moved.

### Pitfall 3: `BbjSecretArgvSourceGuardTest`'s data-flow assertion after the move

**What goes wrong:** `BbjSecretArgvSourceGuardTest:116,191` extract the *first*
`BbjProcessSecretEnv.Invocation <var> = ...` declaration and the *first* `withEnvironment(` call
in `BbjRunActionBase.java` to prove the two are connected. After EM-03 removes
`validateTokenServerSide` (which currently contains the file's *first* such pair), the base's
first remaining pair becomes `buildWebRunCommandLine`'s own `invocation` variable — the
assertion's textual target silently shifts.

**Why it happens:** The regex `BbjProcessSecretEnv\.Invocation\s+(\w+)\s*=` matches the *first*
occurrence in the file (`Matcher m = ...; return m.find() ? m.group(1) : null;`
[VERIFIED: bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjSecretArgvSourceGuardTest.java:224-227]),
so removing an earlier occurrence changes which one the guard checks without changing the guard's
code at all.

**How to avoid:** CONTEXT.md's D-08 flags this exact risk and calls for verifying rather than
assuming the data-flow assertion still holds after the move — confirm
`buildWebRunCommandLine`'s own `BbjProcessSecretEnv.Invocation invocation = BbjProcessSecretEnv.webRun(...)`
(verified at `BbjRunActionBase.java:543`, variable name `invocation`) still satisfies
`invocationVar + ".environment()" equals extractBalancedCallArgument(text, "withEnvironment(")`
once it becomes the first such declaration in the file.

**Warning signs:** The guard passing without modification after the move would actually be
suspicious here, not reassuring — confirm by manually tracing which declaration becomes "first"
post-edit rather than trusting a green run alone.

### Pitfall 4: `getEmValidateBbjPath` is currently `private`, the other two are `protected`

**What goes wrong:** `BbjRunActionBase.getWebBbjPath()` and `BbjEMLoginAction.getEMLoginBbjPath()`
are `protected`/package-visible-static respectively, but `getEmValidateBbjPath()` is `private`
[VERIFIED: bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java:266 —
quoted: `private String getEmValidateBbjPath() {`]. If EM-05's consolidation assumes uniform
visibility across all three call sites when deciding what the new helper's call signature should
look like, a naive refactor could accidentally widen or narrow visibility unexpectedly at one of
the three call sites.

**Why it happens:** Skimming the three lookups as "identical" (they are, in body) can miss that
their surrounding declarations are not identical in modifiers.

**How to avoid:** Since EM-05 retires all three methods entirely (replacing them with calls to
the new shared helper), this is moot for the methods themselves — but the new helper's own
visibility should be `public`/package-visible as needed by all three call sites
(`BbjRunActionBase`, `BbjEMLoginAction`, and any others), not copied from one of the three
existing (inconsistent) modifiers.

**Warning signs:** A compile error at one of the three call sites after EM-05 lands is the
concrete signal.

## Code Examples

### The three current tool-script-path lookups EM-05 must fold into one helper

```java
// Source: bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java:240-257
@Nullable
protected String getWebBbjPath() {
    try {
        com.intellij.ide.plugins.IdeaPluginDescriptor plugin = com.intellij.ide.plugins.PluginManager.getInstance().findEnabledPlugin(
            com.intellij.openapi.extensions.PluginId.getId("com.basis.bbj")
        );
        if (plugin == null) {
            return null;
        }
        java.nio.file.Path webBbjPath = plugin.getPluginPath().resolve("lib/tools/web.bbj");
        if (!java.nio.file.Files.exists(webBbjPath)) {
            return null;
        }
        return webBbjPath.toString();
    } catch (Exception e) {
        return null;
    }
}
```

```java
// Source: bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java:259-281
@Nullable
private String getEmValidateBbjPath() {
    try {
        com.intellij.openapi.extensions.PluginId pluginId = com.intellij.openapi.extensions.PluginId.getId("com.basis.bbj");
        if (pluginId == null) {
            return null;
        }
        com.intellij.ide.plugins.IdeaPluginDescriptor plugin = com.intellij.ide.plugins.PluginManager.getInstance().findEnabledPlugin(pluginId);
        if (plugin == null) {
            return null;
        }
        java.nio.file.Path emValidatePath = plugin.getPluginPath().resolve("lib/tools/em-validate-token.bbj");
        return java.nio.file.Files.exists(emValidatePath) ? emValidatePath.toString() : null;
    } catch (Exception e) {
        return null;
    }
}
```

```java
// Source: bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java:220-234
private static String getEMLoginBbjPath() {
    try {
        var pluginId = PluginId.getId("com.basis.bbj");
        var plugin = PluginManager.getInstance().findEnabledPlugin(pluginId);
        if (plugin == null) return null;
        Path emLogin = plugin.getPluginPath().resolve("lib/tools/em-login.bbj");
        return Files.exists(emLogin) ? emLogin.toString() : null;
    } catch (Exception e) {
        return null;
    }
}
```

All three: same `PluginId.getId("com.basis.bbj")`, same `findEnabledPlugin`, same
`.getPluginPath().resolve("lib/tools/<name>")`, same `Files.exists` check, same "return null on
any exception" shape. The only variable is the script filename. A single helper taking the
filename as its parameter (`resolveToolScript("web.bbj")`, `resolveToolScript("em-login.bbj")`,
`resolveToolScript("em-validate-token.bbj")`) behind the injected plugin-path-resolver seam
(D-06) satisfies all three call sites.

### The current validation methods EM-03 must relocate

```java
// Source: bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java:291-347
protected boolean validateTokenServerSide(@NotNull Project project, @NotNull String token) {
    try {
        String bbjPath = getBbjExecutablePath();
        if (bbjPath == null) { return false; }
        String emValidatePath = getEmValidateBbjPath();
        if (emValidatePath == null) { return false; }
        Path tmpFile = BbjProcessSecretEnv.createOwnerOnlyFile("bbj-em-validate-", ".tmp");
        try {
            BbjProcessSecretEnv.Invocation invocation =
                    BbjProcessSecretEnv.emValidateToken(emValidatePath, token, tmpFile.toString());
            GeneralCommandLine cmd = new GeneralCommandLine(bbjPath);
            cmd.addParameters(invocation.parameters());
            cmd.withEnvironment(invocation.environment());
            com.intellij.execution.process.CapturingProcessHandler handler =
                new com.intellij.execution.process.CapturingProcessHandler(cmd);
            com.intellij.execution.process.ProcessOutput output = handler.runProcess(10000);
            String result = Files.readString(tmpFile).trim();
            return "VALID".equals(result);
        } finally {
            try { Files.deleteIfExists(tmpFile); } catch (Exception ignored) {}
        }
    } catch (Exception e) {
        return false;
    }
}

protected boolean validateTokenTrusted(@NotNull Project project, @NotNull String token) {
    return TokenValidationCache.SESSION.validateThrough(token, () -> validateTokenServerSide(project, token));
}
```
Per D-04, the new class's signatures take `bbjPath`/`scriptPath` as parameters instead of
resolving them internally — the caller (`buildWebRunCommandLine`) already has `bbjPath` in scope
(`getBbjExecutablePath()`) and resolves `scriptPath` through EM-05's new helper before calling
in.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `validateTokenServerSide`/`validateTokenTrusted` living on `BbjRunActionBase` | Move beside `BbjEMTokenStore` (EM-03, this phase) | This phase | Credential-lifecycle logic consolidates with its sibling `BbjEMTokenStore`/`TokenValidationCache`; the run-action base returns to being about launching processes, not validating tokens |
| Three independent `PluginId`→`findEnabledPlugin`→`resolve`→`exists` lookups | One shared helper with an injected seam (EM-05, this phase) | This phase | Removes the duplicated `79-REVIEW` IN-02 advisory finding; makes the resolution testable under plain JUnit 5 |
| `BbjEMLoginAction` with no `update()` override (defaults to always-enabled) | `update()` gating on `project != null`, `ActionUpdateThread.BGT` (EM-02, this phase) | This phase | One observable UX change: with no project open, the action disappears from the Tools menu (previously stayed visible) |

**Deprecated/outdated:** None — no library or API this phase touches has a newer replacement;
this is purely internal code organization.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The new EM-03 validation class's own unit test can fake the subprocess-spawning collaborator the same way `TokenValidationCacheTest` fakes the clock — i.e., that a plain-Java seam is achievable for `validateTokenServerSide` without a live BBj install. Not yet verified by writing the test. | Validation Architecture / Don't Hand-Roll | If the subprocess call cannot be cleanly seamed (e.g., `GeneralCommandLine`/`CapturingProcessHandler` resist injection), the new class may need to stay IntelliJ-platform-coupled for its process-spawning half, weakening D-04's "reachable from plain JUnit 5" premise to only the trust-window/parameter-shape half |
| A2 | EM-02's `update()` guard needs no new source guard test of its own and can ride along in a small new or existing guard file — left to Claude's discretion per CONTEXT.md, but this research recommends a **new small guard** (e.g., `EmLoginEnablementSourceGuardTest`) rather than folding into an unrelated file, to keep guard-file-to-concern mapping 1:1 as every other guard in this repo does | Validation Architecture | If folded into an existing file instead, no functional risk — purely an organizational preference not enforced by CONTEXT.md |

**If this table is empty:** N/A — two low-risk assumptions logged above; both are implementation-detail choices within CONTEXT.md's explicitly delegated discretion, not open questions about behavior.

## Discretion Areas (with recommendations) — RESOLVED

Neither item below is an open research gap. Both are Claude's Discretion grants in CONTEXT.md, both
carry a recommendation, and both were resolved when the phase plans were written — the resolution
taken is recorded inline under each.

1. **Exact class/package names for the two new EM-03/EM-05 classes**
   - What we know: CONTEXT.md explicitly delegates naming to Claude's discretion; the
     `actions/` package is the natural home for the EM-03 class (beside `BbjEMTokenStore`); the
     EM-05 helper could live in `actions/` (beside its three current callers) or in the
     `com.basis.bbj.intellij` root package (beside `BbjNodeVersionCache`/`BbjInteropPortCache`,
     its closest analogues).
   - What's unclear: no signal in CONTEXT.md prefers one package over the other for EM-05.
   - Recommendation: place the EM-05 helper in `actions/` since all three current callers (and
     the scripts they resolve) are action-layer concerns, not general plugin infrastructure like
     Node/interop detection; name it something like `BbjToolScriptResolver` to parallel
     `BbjNodeVersionCache`/`BbjInteropPortCache`'s naming convention. Final call is the planner's/
     executor's per CONTEXT.md's explicit discretion grant.
   - RESOLVED: the recommendation was taken. The EM-05 helper is `BbjToolScriptResolver` in
     `com.basis.bbj.intellij.actions` (plan 01), and the EM-03 class is `EmTokenValidator` in the
     same package, beside `BbjEMTokenStore` and `TokenValidationCache` (plan 02). Both names and
     packages are fixed by the plans; no question remains open.

2. **Whether EM-02's guard should assert `setEnabledAndVisible` argument shape, or just presence**
   - What we know: The five other `update()`-overriding actions all end in
     `e.getPresentation().setEnabledAndVisible(<expr>)`, verified at
     `BbjRefreshJavaClassesAction.java:128` (`setEnabledAndVisible(enabled)`).
   - What's unclear: whether the new EM-02 guard should assert the literal call
     `setEnabledAndVisible(e.getProject() != null)` (brittle to variable naming) or a looser
     "calls `setEnabledAndVisible` exactly once, and does not call `setEnabled(` alone" shape
     (matching the D-02 intent without over-constraining implementation).
   - Recommendation: assert presence of `setEnabledAndVisible(` and absence of a bare
     `setEnabled(` call (the greying-out anti-pattern D-02 explicitly rejects), rather than
     pinning the exact boolean expression — this is the least brittle formulation that still
     enforces D-02's substance.
   - RESOLVED: the recommendation was taken. `EmLoginEnablementSourceGuardTest` (plan 03, Task 1)
     asserts presence of `setEnabledAndVisible(` and file-wide absence of a bare `setEnabled(`, and
     explicitly does not pin the boolean expression — the plan states that pinning it is brittle to
     variable naming and is not what the requirement is about.

## Environment Availability

Not applicable — this phase adds no new external tool, service, runtime, or CLI dependency.
Existing dependencies (JDK 17 via Gradle toolchain, Gradle wrapper, JUnit 5) are already
established project-wide and unchanged by this phase's scope.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | JUnit Jupiter (JUnit 5), `junit-bom` 6.1.3 [VERIFIED: bbj-intellij/build.gradle.kts:39-41] |
| Config file | `bbj-intellij/build.gradle.kts` (`tasks.test { useJUnitPlatform() }`, `:44-46`) [VERIFIED: bbj-intellij/build.gradle.kts:45 — quoted: `useJUnitPlatform()`] |
| Quick run command | `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test --tests "com.basis.bbj.intellij.actions.*"` |
| Full suite command | `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EM-01 | Login temp file deleted even when launch throws | source guard (positional/ordering assertion, see Pitfall 1) | `./gradlew test --tests "*EmLoginCleanup*SourceGuardTest"` (new file name, discretion) | ❌ Wave 0 — new guard file |
| EM-02 | `update()` gates on `project != null`; `ActionUpdateThread.BGT` | source guard (presence of `setEnabledAndVisible`/`BGT`, absence of `setEnabled(` alone) | `./gradlew test --tests "*EmLoginEnablement*SourceGuardTest"` (new file name, discretion) | ❌ Wave 0 — new guard file, or folded into an existing one per discretion |
| EM-03 | Server-side validation moves beside `BbjEMTokenStore`; trust window preserved | source guard (re-pointed `BbjSecretArgvSourceGuardTest`, `EmTokenTrustWindowSourceGuardTest`) + new plain-JUnit-5 unit test on the new class | `./gradlew test --tests "*BbjSecretArgvSourceGuardTest" --tests "*EmTokenTrustWindowSourceGuardTest" --tests "*<NewValidationClass>*Test"` | Existing guards ✅ (re-point in place); new unit test ❌ Wave 0 |
| EM-04 | BUI/DWC share the run flow (already true) | existing guards only — no new test (D-05) | `./gradlew test --tests "*EmTokenTrustWindowSourceGuardTest" --tests "*BbjRunActionConfigPathSourceGuardTest"` | ✅ both exist |
| EM-05 | One shared tool-script path helper, injected seam | new plain-JUnit-5 unit test ("script present → path", "script missing → null") modeled on `BbjInteropPortCacheTest`/`BbjNodeVersionCacheTest` | `./gradlew test --tests "*<NewToolScriptResolver>*Test"` | ❌ Wave 0 — new test file |

### Sampling Rate

- **Per task commit:** targeted `./gradlew test --tests "<affected guard/unit test class>"` for
  whatever file(s) that task's diff touches.
- **Per wave merge:** `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test`
  (full IntelliJ-side suite — this phase touches no `bbj-vscode` code, so the VS Code/language-
  server test suite is out of scope for this phase's gate).
- **Phase gate:** Full `bbj-intellij` suite green (per the standing project constraint: whole-
  suite `numFailedTests: 0`, `.planning/STATE.md` Active Constraints) before `/gsd-verify-work`;
  plus a hand UAT pass per CONTEXT.md's Specific Ideas (both login entry points; BUI and DWC from
  toolbar, menu, and `alt B`/`alt D`; no-token run; expired-token run; within-trust-window
  second run) covering both a freshly built VSIX/plugin zip and — per the standing "build both
  distributables... and again from the final tree after code-review fixes" constraint — a second
  build after any code-review fixes land.

### Wave 0 Gaps

- [ ] New EM-01 guard test file — covers EM-01 (the invariant "cleanup covers the whole launch,"
      per D-05's meaning, not merely "a finally exists")
- [ ] New EM-02 guard test (own file or folded into an existing action guard, per discretion) —
      covers EM-02
- [ ] New plain-JUnit-5 unit test for the EM-03 validation class — covers the trust-window/
      parameter-shape half of EM-03 (subprocess-spawning half's testability is Assumption A1,
      above)
- [ ] New plain-JUnit-5 unit test for the EM-05 tool-script-path helper — covers "script present
      → path" and "script missing → null" against the injected seam, modeled on
      `BbjInteropPortCacheTest`/`BbjNodeVersionCacheTest`
- [ ] No framework install needed — JUnit Jupiter is already wired via `build.gradle.kts:39-45`

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | EM login flow (`BbjEMLoginAction`) — credential prompt + `em-login.bbj` subprocess; unchanged by this phase except for enablement (EM-02) |
| V3 Session Management | yes | JWT token lifecycle via `BbjEMTokenStore` + `TokenValidationCache`'s 5-minute trust window; EM-03 relocates but does not change this logic |
| V4 Access Control | no | No new access-control surface; action enablement (EM-02) is a UX gate, not a security boundary |
| V5 Input Validation | no | No new user-facing input parsing in this phase |
| V6 Cryptography | yes | `TokenValidationCache` digests tokens with `MessageDigest.getInstance("SHA-256")` (never plaintext) — unchanged by EM-03; `BbjProcessSecretEnv`'s owner-only temp files and environment-channel (never argv) secret transport — unchanged by EM-01/EM-03 |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Secret (token/username/password) appearing in process argv, visible to other users via `ps`/Task Manager | Information Disclosure | `BbjProcessSecretEnv.Invocation` + `withEnvironment(invocation.environment())` — never `addParameter(token/username/password)`; pinned by `BbjSecretArgvSourceGuardTest` (GHSA-33x9-cpwv-xcv2/GHSA-xxp5-vv2w-42q8). EM-03 must preserve this exactly at the new call site — the guard re-pointing in Pitfall 3 is the mechanism that keeps this true. |
| Partially-written secret-bearing temp file surviving an exception mid-launch | Information Disclosure | Owner-only temp file (`createOwnerOnlyFile`) + a `try/finally` whose `try` covers the entire launch, not just the read — this is EM-01's exact subject; the new guard (Pitfall 1) is what keeps this true going forward |
| A stale/expired/malformed JWT silently treated as valid ("fail open") | Spoofing / Tampering | `JwtValidity.check(...)` classifies anything not positively decoded as an unexpired JWT as expired (`isTokenExpired`, `BbjEMTokenStore.java:79-81`) — untouched by this phase, pinned by `EmTokenFailClosedSourceGuardTest` (confirmed still passing, no assertion in that file references `validateTokenServerSide`/`validateTokenTrusted`, so EM-03 does not disturb it) |
| A refactor accidentally reordering the expiry-check-before-trust-check sequence, letting a malformed token populate the trust cache | Tampering | `EmTokenTrustWindowSourceGuardTest`'s explicit ordering assertions (`isTokenExpired` before `validateTokenTrusted`, `validateTokenTrusted` before the re-prompt literal) — these assertions live in `buildWebRunCommandLine`'s body, which EM-03 does **not** move (only the two validation methods move), so this particular guard set should require no change to its ordering logic beyond D-04's call-site literal update |

## Sources

### Primary (HIGH confidence — read directly in this session)

- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java` — full file read; `update()`/`getActionUpdateThread()`, `getWebBbjPath`/`getEmValidateBbjPath`, `validateTokenServerSide`/`validateTokenTrusted`, `buildWebRunCommandLine`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java` — full file read; temp-file cleanup scope, `getEMLoginBbjPath`, its own BBj-executable resolution
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMTokenStore.java` — full file read
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/TokenValidationCache.java` — full file read
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunBuiAction.java` / `BbjRunDwcAction.java` — full files read (31 lines each, confirmed)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRefreshJavaClassesAction.java` — full file read; the `update()`/BGT sibling model
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjInteropPortCache.java` / `BbjNodeVersionCache.java` — read for the `@FunctionalInterface` seam convention
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServer.java:85-114` — read for D-07's excluded fourth site
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjSecretArgvSourceGuardTest.java` — full file read
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmTokenTrustWindowSourceGuardTest.java` — full file read
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BbjRunActionConfigPathSourceGuardTest.java` — full file read
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/OffEdtDispatchSourceGuardTest.java` — full file read
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijImportAllowlistTest.java:1-63` — read; confirmed `BbjEMLoginAction.java` has no ALLOWLIST entry
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmTokenFailClosedSourceGuardTest.java` — full file read
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmTokenBackendNoticeSourceGuardTest.java:1-40,176-183` — grepped and read for import-guard scope
- `bbj-intellij/src/main/resources/META-INF/plugin.xml` — grepped for action registrations (`bbj.loginEM`, `bbj.runBui`, `bbj.runDwc`)
- `bbj-intellij/build.gradle.kts:39-46,205-227` — read for JUnit config and `prepareSandbox` script list
- `.planning/phases/94-em-login-run-action-consolidation/94-CONTEXT.md` — full file read (authoritative, all D-01..D-09 locked)
- `.planning/phases/93-composer-robustness-consolidation/93-CONTEXT.md:115-160` — read for D-11/D-12 precedent text
- `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, `.planning/config.json` — full files read

### Secondary (MEDIUM confidence)

None — no web/docs research was performed for this phase. Every technical claim above traces to
a file read directly in this session; there is no external framework, library, or API surface
in scope that would require Context7/WebSearch verification.

### Tertiary (LOW confidence)

None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; existing JUnit/IntelliJ-SDK versions read directly from `build.gradle.kts`
- Architecture: HIGH — every pattern cited is an existing, already-shipped convention in this exact codebase, read directly
- Pitfalls: HIGH — each pitfall traces to a specific guard-test assertion read directly, with exact line ranges and verbatim quotes
- Security: HIGH — all threat patterns and mitigations trace to already-shipped, already-guarded code (GHSA-pinned) read directly this session

**Research date:** 2026-09-18
**Valid until:** Until the next phase touches `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/` or its guard tests — this research is tied to the exact current shape of those files, not a time-based external dependency, so there is no natural expiry beyond "before the next edit to these files."
