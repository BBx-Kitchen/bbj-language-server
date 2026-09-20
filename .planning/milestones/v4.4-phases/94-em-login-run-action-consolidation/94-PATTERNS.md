# Phase 94: EM Login & Run Action Consolidation - Pattern Map

**Mapped:** 2026-09-18
**Files analyzed:** 9 (2 new src, 2 modified src, 5 new/re-pointed test files)
**Analogs found:** 9 / 9

All analog paths below were verified git-tracked via `git ls-files` before being cited.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `actions/<EmTokenValidator>.java` (NEW, EM-03) | service (credential validation) | request-response (subprocess spawn) | `actions/TokenValidationCache.java` (memo shape) + `BbjInteropPortCache.java` (seam shape) | role-match, composite |
| `actions/<BbjToolScriptResolver>.java` (NEW, EM-05) | utility (path resolution) | CRUD-like lookup (resolve-or-null) | `BbjInteropPortCache.java` / `BbjNodeVersionCache.java` | exact (seam convention) |
| `actions/BbjRunActionBase.java` (MODIFIED) | controller/action base | request-response | itself (pre-existing) — no external analog needed, this is the extraction source | n/a — source of truth |
| `actions/BbjEMLoginAction.java` (MODIFIED) | controller/action | request-response | `actions/BbjRefreshJavaClassesAction.java` (for `update()`/BGT shape only) | role-match (partial — only enablement) |
| `actions/<EmLoginCleanup>SourceGuardTest.java` (NEW, EM-01) | test (source guard) | transform (static text assertion) | `lsp/BbjSecretArgvSourceGuardTest.java` (positional ordering idiom) | exact |
| `actions/<EmLoginEnablement>SourceGuardTest.java` (NEW, EM-02) | test (source guard) | transform | `lsp/OffEdtDispatchSourceGuardTest.java` (presence/absence assertion idiom) | role-match |
| `<EmTokenValidator>Test.java` (NEW, EM-03 unit test) | test (plain JUnit 5) | request-response (fake collaborator) | `BbjInteropPortCacheTest.java` / `BbjNodeVersionCacheTest.java` | exact |
| `<BbjToolScriptResolver>Test.java` (NEW, EM-05 unit test) | test (plain JUnit 5) | CRUD-like lookup | `BbjInteropPortCacheTest.java` | exact |
| `lsp/BbjSecretArgvSourceGuardTest.java` (MODIFIED — re-point) | test (source guard) | transform | itself, prior shape (`OWNER_ONLY_FILE_CALLERS`, `:53,57,116,191,272-299`) | exact — in-place re-point |
| `actions/EmTokenTrustWindowSourceGuardTest.java` (MODIFIED — re-point) | test (source guard) | transform | itself, prior shape (`:96-148`) | exact — in-place re-point |

## Pattern Assignments

### `actions/<EmTokenValidator>.java` (NEW — EM-03)

**Analogs:** `actions/TokenValidationCache.java` (plain-Java memo shape, no `com.intellij` import) and `com/basis/bbj/intellij/BbjInteropPortCache.java` (the `@FunctionalInterface` + package-private-constructor seam convention).

**Class-level doc/no-platform-import pattern** (`TokenValidationCache.java:1-28`):
```java
package com.basis.bbj.intellij.actions;

import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;
// ... only java.* and org.jetbrains.annotations — no com.intellij import ...

/**
 * ... plain static memo with no com.intellij import of any kind, so it runs on the plain
 * JUnit 5 test classpath.
 */
public final class TokenValidationCache {
```
D-04 requires the same property for the new validation class: it must compile and run on the plain JUnit 5 classpath (no `com.intellij.*` import), taking `bbjPath`/`scriptPath` as parameters rather than resolving them itself.

**Seam + package-private constructor pattern** (`BbjInteropPortCache.java:16-58`, quoted in RESEARCH.md Pattern 2):
```java
public final class BbjInteropPortCache {

    @FunctionalInterface
    interface PortReader {
        BbjInteropPortDetector.PortLookup readFrom(java.nio.file.Path propertiesFile);
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
}
```
Apply this shape to isolate the subprocess-spawning collaborator (`GeneralCommandLine` + `CapturingProcessHandler`) behind a `@FunctionalInterface`, so a fake can be injected in the unit test without a live BBj install (RESEARCH.md Assumption A1).

**Core logic to relocate verbatim (parameterized), from `BbjRunActionBase.java:291-347`:**
```java
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
            CapturingProcessHandler handler = new CapturingProcessHandler(cmd);
            ProcessOutput output = handler.runProcess(10000);
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
Per D-04, the new class's signatures take `bbjPath`/`scriptPath` as explicit parameters instead of calling `getBbjExecutablePath()`/`getEmValidateBbjPath()` internally — the `Project` parameter itself may become unnecessary once nothing inside reads project state (verify at implementation time; keep only what the security-argv secret path needs).

**Security invariant to preserve exactly** (do not touch `BbjProcessSecretEnv` mechanism): secrets travel via `cmd.withEnvironment(invocation.environment())`, never `addParameter(token)`. This is the GHSA-pinned pattern in `BbjSecretArgvSourceGuardTest`.

---

### `actions/<BbjToolScriptResolver>.java` (NEW — EM-05)

**Analog:** `com/basis/bbj/intellij/BbjInteropPortCache.java` / `BbjNodeVersionCache.java` — identical `@FunctionalInterface` seam + `public static final SESSION` + package-private constructor idiom.

**The three lookups to fold into one, verified identical in shape across:**
- `BbjRunActionBase.java:240-257` (`getWebBbjPath`, `protected`)
- `BbjRunActionBase.java:259-281` (`getEmValidateBbjPath`, `private`)
- `BbjEMLoginAction.java:220-234` (`getEMLoginBbjPath`, `private static`)

```java
// Common body shape (BbjRunActionBase.java:240-257), the filename is the only variable:
@Nullable
protected String getWebBbjPath() {
    try {
        IdeaPluginDescriptor plugin = PluginManager.getInstance().findEnabledPlugin(
            PluginId.getId("com.basis.bbj")
        );
        if (plugin == null) { return null; }
        Path webBbjPath = plugin.getPluginPath().resolve("lib/tools/web.bbj");
        if (!Files.exists(webBbjPath)) { return null; }
        return webBbjPath.toString();
    } catch (Exception e) {
        return null;
    }
}
```

**Seam interface to introduce** (mirrors `BbjInteropPortCache.PortReader`):
```java
@FunctionalInterface
interface PluginPathResolver {
    @Nullable java.nio.file.Path resolve(String relativePath);
}
```
Production `SESSION` wires this to the real `PluginId.getId("com.basis.bbj")` → `findEnabledPlugin` → `getPluginPath().resolve(...)` → `Files.exists` chain (verified identical logic in all three call sites above); the resolver method itself takes the script filename as its sole parameter (`resolveToolScript("web.bbj")`, etc.), matching D-06's "three tool scripts only" scope. Keep the resolved relative path as `lib/tools/<script>` exactly — this must match `build.gradle.kts:215-220`'s `prepareSandbox` `into(...)` target verbatim (no test needed for this, just don't drift the string).

---

### `actions/BbjEMLoginAction.java` (MODIFIED — EM-02 `update()`)

**Analog:** `actions/BbjRefreshJavaClassesAction.java:120-134`

```java
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
Per D-01, `BbjEMLoginAction`'s version drops the `ServerStatus` gate entirely:
```java
@Override
public void update(@NotNull AnActionEvent e) {
    e.getPresentation().setEnabledAndVisible(e.getProject() != null);
}

@Override
public @NotNull ActionUpdateThread getActionUpdateThread() {
    return ActionUpdateThread.BGT;
}
```
No `Lsp4ijImportAllowlistTest` entry is needed for `BbjEMLoginAction.java` — confirmed no such entry currently exists and none of the added code touches an LSP4IJ symbol.

---

### `actions/<EmLoginCleanup>SourceGuardTest.java` (NEW — EM-01)

**Analog:** `lsp/BbjSecretArgvSourceGuardTest.java:282-299` — the positional/ordering idiom (`indexOf` comparison, not mere presence).

Target text to assert against, `BbjEMLoginAction.java:106-180`:
```java
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
Required assertion shape (per D-05 and RESEARCH.md Pitfall 1) — NOT "a `finally` with `deleteIfExists` exists" (too weak, passes even on the WR-02 regression), but:
1. `createOwnerOnlyFile` precedes the *second* `try {` (the one containing `runProcess`).
2. `runProcess(15000)`'s index falls between that `try {` and its matching `finally {`.
3. Exactly one `deleteIfExists(tmpFile)` occurs inside that `finally` block.

Copy the guard's own private `extractMethodBody`/`countOccurrences`/`readSource` helpers (do not share with other guards — D-12 precedent), modeled on:
```java
// bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmTokenTrustWindowSourceGuardTest.java:36-56
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

---

### `actions/<EmLoginEnablement>SourceGuardTest.java` (NEW — EM-02)

**Analog:** `lsp/OffEdtDispatchSourceGuardTest.java:110-123` (presence/absence-inside-body idiom).

Assertion shape recommended by RESEARCH.md Open Question 2 (least brittle, still enforces D-02):
- Assert `BbjEMLoginAction.java` contains `setEnabledAndVisible(` at least once, and contains `getActionUpdateThread` returning `ActionUpdateThread.BGT`.
- Assert it does NOT contain a bare `setEnabled(` call (the greying-out anti-pattern D-02 rejects) — sweep the whole file, not just inside `update()`, since a bare `setEnabled(` anywhere would reintroduce the anti-pattern.
- Do not pin the literal boolean expression `e.getProject() != null` — this is brittle to variable naming and not required by D-01/D-02's substance.

---

### `<EmTokenValidator>Test.java` (NEW — EM-03 unit test)

**Analog:** `BbjInteropPortCacheTest.java:1-55` (fake-collaborator-injection idiom via package-private constructor).

```java
package com.basis.bbj.intellij; // adapt to actions package

import org.junit.jupiter.api.Test;
import java.util.concurrent.atomic.AtomicInteger;
import static org.junit.jupiter.api.Assertions.*;

class BbjInteropPortCacheTest {
    private static BbjInteropPortCache cacheWith(BbjInteropPortCache.FileStat stat, AtomicInteger reads,
            BbjInteropPortDetector.PortLookup result) {
        return new BbjInteropPortCache(stat, propertiesFile -> {
            reads.incrementAndGet();
            return result;
        });
    }

    @Test
    void anUnchangedStatInvokesTheReaderExactlyOnceAcrossTwoLookups() {
        AtomicInteger reads = new AtomicInteger();
        BbjInteropPortDetector.PortLookup detected = new BbjInteropPortDetector.PortLookup(6000, true, false);
        BbjInteropPortCache cache = cacheWith(path -> "stamp-1", reads, detected);

        BbjInteropPortDetector.PortLookup first = cache.lookup("/opt/bbx");
        BbjInteropPortDetector.PortLookup second = cache.lookup("/opt/bbx");

        assertEquals(1, reads.get());
        assertSame(first, second);
    }
}
```
For the new EM-03 class, the equivalent tests are "trust window: within window skips the fake subprocess collaborator entirely," "outside window / cache miss: fake subprocess collaborator invoked exactly once," and "fake collaborator returns non-VALID: not recorded, next call invokes again" — mirroring `TokenValidationCache`'s own `validateThrough` contract (already covered by `TokenValidationCacheTest`, 242 lines, as the semantic model to imitate for expected-behavior phrasing, not to duplicate).

---

### `<BbjToolScriptResolver>Test.java` (NEW — EM-05 unit test)

**Analog:** same `BbjInteropPortCacheTest` idiom. Two cases per RESEARCH.md Wave 0 gaps:
1. Fake `PluginPathResolver` returns a path that exists on a `@TempDir` filesystem → resolver returns that path's string.
2. Fake `PluginPathResolver` returns null, or a path that does not exist → resolver returns null.

Use `@TempDir` the same way `BbjInteropPortCacheTest`'s sibling tests exercise real filesystem stamps (see imports at `BbjInteropPortCacheTest.java:1-16`: `org.junit.jupiter.api.io.TempDir`).

---

### `lsp/BbjSecretArgvSourceGuardTest.java` (MODIFIED — re-point, EM-03 fallout)

**This is the file itself — re-point in place, do not treat as an analog for a new file.**

Assertions to move from asserting against `BbjRunActionBase.java` to asserting against the new EM-03 class's file:
- `OWNER_ONLY_FILE_CALLERS` (`:57`) and `ALL_GUARDED_ACTION_FILES` (`:53`) — both currently list `BbjRunActionBase`; add/replace with the new class's file, since `createOwnerOnlyFile` now lives there for the EM-validate path (note `BbjRunActionBase` still has other `createOwnerOnlyFile` callers for GUI-run secret env — verify what remains before removing the base file from these lists rather than assuming a full removal).
- `:272-299`'s precedence assertion (`createOwnerOnlyFile` precedes `CapturingProcessHandler(`) — re-point to the new class's body.
- `:116,191`'s data-flow assertion (first `BbjProcessSecretEnv.Invocation <var> =` / first `withEnvironment(` in the file) — **do not assume unaffected**. After the move, `BbjRunActionBase`'s first such pair becomes `buildWebRunCommandLine`'s own `invocation` variable (verified at `BbjRunActionBase.java:543`) — confirm this pair still satisfies the assertion in the base file, and add the equivalent pair-check against the new class's file for its own `invocation`.

This is the GHSA-33x9-cpwv-xcv2 / GHSA-xxp5-vv2w-42q8 pin — re-point every assertion that moves; never delete one because "it moved" without an equivalent assertion in the new location.

---

### `actions/EmTokenTrustWindowSourceGuardTest.java` (MODIFIED — re-point, EM-03 fallout)

**This is the file itself — re-point in place.**

`:138-148` currently asserts `BbjRunActionBase.java` declares `validateTokenServerSide` exactly once and calls `TokenValidationCache.SESSION.validateThrough(` exactly once, in that order, and that `validateTokenTrusted` is declared *after* `validateTokenServerSide` ("so the pair reads as one unit" — RESEARCH.md Pitfall 2). Re-point both the presence/ordering assertions to the new class's file.

`:96-101` and `:104-135`'s call-site literal changes shape per D-04: `validateTokenTrusted(project, token)` becomes an explicit multi-argument call once `buildWebRunCommandLine` passes `bbjPath`/`scriptPath` explicitly — update the pinned literal string, do not merely re-point the file reference.

## Shared Patterns

### `@FunctionalInterface` seam + package-private constructor
**Source:** `com/basis/bbj/intellij/BbjInteropPortCache.java:16-58`, `BbjNodeVersionCache.java`
**Apply to:** both new EM-03 and EM-05 classes — the sole convention this codebase uses for testable, IntelliJ-decoupled collaborators; do not invent a new shape.

### Plain-Java, no-`com.intellij`-import testability
**Source:** `actions/TokenValidationCache.java:1-28`
**Apply to:** the new EM-03 class's non-subprocess half (trust-window/parameter-shape logic) and the entire EM-05 resolver — both must be reachable from plain JUnit 5.

### Source-guard re-pointing (brace-balanced extraction, own-private-helpers)
**Source:** `actions/EmTokenTrustWindowSourceGuardTest.java:36-56`
**Apply to:** all three guards affected by the EM-03 move (`BbjSecretArgvSourceGuardTest`, `EmTokenTrustWindowSourceGuardTest`) and both new guards (EM-01, EM-02). Each guard keeps its own private `extractMethodBody`/`countOccurrences`/`readSource` — no shared test utility (D-12).

### `update()` / `ActionUpdateThread.BGT` sibling shape
**Source:** `actions/BbjRefreshJavaClassesAction.java:120-134`
**Apply to:** `BbjEMLoginAction.java`'s new `update()` override (EM-02), with the `ServerStatus` check dropped per D-01.

### Secrets on environment, never argv
**Source:** `BbjProcessSecretEnv.Invocation` + `cmd.withEnvironment(invocation.environment())`, pinned by `BbjSecretArgvSourceGuardTest`
**Apply to:** the relocated `validateTokenServerSide` body in the new EM-03 class — must preserve this exactly at its new call site.

## No Analog Found

None — every file in scope has a directly-reusable in-repo analog (RESEARCH.md's core finding: "every piece of infrastructure this phase needs already exists once in this codebase").

## Metadata

**Analog search scope:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/` and `bbj-intellij/src/test/java/com/basis/bbj/intellij/` (actions/ and lsp/ subpackages)
**Files scanned:** `BbjRunActionBase.java`, `BbjEMLoginAction.java`, `BbjEMTokenStore.java`, `TokenValidationCache.java`, `BbjRefreshJavaClassesAction.java`, `BbjInteropPortCache.java`, `BbjNodeVersionCache.java`, `BbjRunBuiAction.java`, `BbjRunDwcAction.java`, `BbjSecretArgvSourceGuardTest.java`, `EmTokenTrustWindowSourceGuardTest.java`, `BbjRunActionConfigPathSourceGuardTest.java`, `OffEdtDispatchSourceGuardTest.java`, `BbjInteropPortCacheTest.java`, `Lsp4ijImportAllowlistTest.java`
**Pattern extraction date:** 2026-09-18
**Note:** RESEARCH.md (94-RESEARCH.md) already contains verified, line-cited excerpts for nearly every pattern above; this file is a role/data-flow-indexed restructuring of that evidence for the planner's direct consumption, plus git-tracked-path verification.
