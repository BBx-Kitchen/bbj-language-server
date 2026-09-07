---
phase: 86-intellij-interop-settings-targeted-refresh
reviewed: 2026-09-07T00:00:00Z
depth: standard
files_reviewed: 28
files_reviewed_list:
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRefreshJavaClassesAction.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjInteropPortCache.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjInteropPortDetector.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsConfigurable.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettings.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/BbjComposerServer.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/InteropPortPresentation.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/InteropPortSettings.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/refresh/JavaClassesRefreshFlow.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/refresh/JavaClassesRefreshPresenter.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/refresh/RefreshInFlightGuard.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropService.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/BbjInteropPortCacheTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/BbjInteropPortDetectorTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerFlowTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerRequestContractTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/InteropPortPresentationTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/InteropPortSettingsTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjSettingsComponentSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/EffectiveInteropPortSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/refresh/BbjRefreshJavaClassesActionSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/refresh/JavaClassesRefreshFlowTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/refresh/JavaClassesRefreshPresenterTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/refresh/RefreshInFlightGuardTest.java
  - documentation/docs/intellij/configuration.md
  - QA/FULL-TEST-CHECKLIST.md
findings:
  critical: 1
  warning: 2
  info: 1
  total: 4
status: issues_found
---

# Phase 86: Code Review Report

**Reviewed:** 2026-09-07T00:00:00Z
**Depth:** standard
**Files Reviewed:** 28
**Status:** issues_found

## Summary

Reviewed the targeted `bbj/refreshJavaClasses` refresh flow (action, single-flight guard, outcome
classification/presentation) and the java-interop port auto-detection stack (detector, stat-keyed
cache, `InteropPortSettings` decision functions, `BbjSettings` persistence/migration, the settings
UI and its `Configurable`), plus the accompanying tests and documentation.

The refresh flow itself is solid: the in-flight guard is acquired/released correctly on every exit
path (including exceptions, via `finally`), all UI writes happen inside `invokeLater`, and the
background task explicitly asserts it is off the EDT. The port detector and its cache are
well-tested for the stat-keyed race-safety property they claim.

The one serious defect is in the auto-detect **migration** logic (`InteropPortSettings
.migratedAutoDetect`, wired unconditionally into `BbjSettings.loadState`): it is re-derived from
the persisted port on every IDE restart rather than gated to run once, and it misreads the
port field's own documented "stale value retained while auto-detect is on" behavior as evidence of
a deliberate explicit choice. This silently turns auto-detect back off for a real, non-contrived
user flow (turn auto-detect on after having had a non-default explicit port) on the very next IDE
restart — precisely the kind of persistence bug the phase's own `InteropPortSettingsTest` encodes
as intended behavior. Two further quality issues (a doubled refresh timeout budget, and EDT
filesystem I/O left in `Configurable.reset()`) round out the findings.

## Critical Issues

### CR-01: Auto-detect silently turns itself back off on the next IDE restart after a legitimate "re-enable" flow

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/InteropPortSettings.java:56-59` (also `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettings.java:64-70`)

**Issue:**

`migratedAutoDetect` is documented as "the one-time upgrade migration" but is invoked
unconditionally, with no persisted "already migrated" flag, from every `loadState` call — i.e. on
every IDE restart, not once per installation:

```java
// BbjSettings.java
public void loadState(@NotNull State state) {
    state.javaInteropPortAutoDetect =
            InteropPortSettings.migratedAutoDetect(state.javaInteropPortAutoDetect, state.javaInteropPort);
    myState = state;
}
```

```java
// InteropPortSettings.java
public static boolean migratedAutoDetect(boolean savedAutoDetect, int savedPort) {
    boolean savedPortCarriesNoSignal = savedPort == BbjInteropPortDetector.DEFAULT_PORT || !isValidPort(savedPort);
    return savedAutoDetect && savedPortCarriesNoSignal;
}
```

This treats a stored port other than 5008 as proof the *flag* was a deliberate choice — but
`portToPersist` (same class, documented two methods above) guarantees the stored `javaInteropPort`
field is **never overwritten while auto-detect is on**; it simply carries over whatever was last
explicitly persisted before auto-detect was turned on. That stale value is exactly the kind of
signal `migratedAutoDetect` treats as "the user's choice."

Concrete reproduction, entirely inside the shipped code paths:

1. User has auto-detect **off**, explicit port `6001` (e.g. `state.javaInteropPortAutoDetect=false`,
   `state.javaInteropPort=6001`, both persisted).
2. User opens Settings, checks "Auto-detect", clicks Apply.
   `BbjSettingsConfigurable.apply()` (line 82-84) calls
   `InteropPortSettings.portToPersist(true, uiPort, storedJavaInteropPort=6001)`, which — because
   `autoDetect` is now `true` — returns `storedPort` **unchanged**: `6001`. Persisted state is now
   `javaInteropPortAutoDetect=true`, `javaInteropPort=6001`.
3. IDE restarts. `loadState` is invoked with that persisted state:
   `migratedAutoDetect(true, 6001)` → `savedPortCarriesNoSignal = (6001==5008)||!isValidPort(6001)
   = false` → returns `true && false = false`.
   The flag the user just turned **on** is silently flipped back to **off**, with no notification,
   no console line, no balloon — the Settings page will simply show "Auto-detect" unchecked again
   the next time it is opened, and the language server initializes with whatever `6001` happens to
   resolve to via `sanitizePort`, ignoring live detection entirely.

The phase's own `InteropPortSettingsTest.migrationInferenceCoversAllFiveCombinations` (lines 80-81)
asserts exactly this outcome as intended:
```java
assertFalse(InteropPortSettings.migratedAutoDetect(true, 6000),
        "a saved non-default port is evidence of a deliberate choice, overriding a saved-true flag");
```
— i.e. the flawed inference is pinned by a test rather than caught by one. `QA/FULL-TEST-CHECKLIST.md`
Test 17 does not exercise an actual IDE process restart (only a dialog reopen), so it cannot catch
this regression either — `BbjSettingsConfigurable.reset()` never calls `loadState`.

**Fix:** Make the migration genuinely one-time, gated by a persisted flag, rather than a pure
function re-derived from data that the class's own `portToPersist` contract already declares
unreliable once auto-detect has ever been toggled:

```java
// BbjSettings.State
public boolean javaInteropSettingsMigrated = false;

// BbjSettings.loadState
@Override
public void loadState(@NotNull State state) {
    if (!state.javaInteropSettingsMigrated) {
        state.javaInteropPortAutoDetect =
                InteropPortSettings.migratedAutoDetect(state.javaInteropPortAutoDetect, state.javaInteropPort);
        state.javaInteropSettingsMigrated = true;
    }
    myState = state;
}
```

## Warnings

### WR-01: Refresh Java Classes' bounded wait can take up to ~2x its documented timeout

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRefreshJavaClassesAction.java:58-64`

**Issue:** `JavaClassesRefreshFlow.REFRESH_TIMEOUT_SECONDS` (60s) is passed as `seconds` into a
lambda that performs **two** sequential blocking waits, each independently budgeted at the full 60
seconds:

```java
JavaClassesRefreshFlow.Result result = JavaClassesRefreshFlow.run(seconds -> {
    BbjComposerServer server = BbjComposerService.server(project).get(seconds, TimeUnit.SECONDS);
    if (server == null) {
        return null;
    }
    return server.refreshJavaClasses().get(seconds, TimeUnit.SECONDS);
}, JavaClassesRefreshFlow.REFRESH_TIMEOUT_SECONDS);
```

If the proxy lookup (`BbjComposerService.server(project)`) is itself slow (e.g. 59s) but eventually
resolves, and the subsequent `refreshJavaClasses()` request is then also slow, the "Refreshing Java
classes…" progress task can stay visible for close to 120 seconds before `TIMED_OUT` is ever
reported — double the value the `REFRESH_TIMEOUT_SECONDS` javadoc implies ("Bounds both the proxy
lookup and the request", read naturally as one combined bound). This is exactly the stacking-timeout
pattern `ComposerFlow` was hardened against in this same phase area (see
`ComposerFlowTest.threeMerelySlowStagesShareOneDeadlineRatherThanEachGettingTheFullWait`, which
explicitly tests that composer requests share one deadline rather than each getting the full wait)
— but `JavaClassesRefreshFlow` was not given the same treatment, and no test here exercises the
combined-stage timing the way the composer test does.

**Fix:** Compute a single deadline up front and pass the remaining budget to each stage, e.g.:
```java
long deadlineNanos = System.nanoTime() + TimeUnit.SECONDS.toNanos(seconds);
BbjComposerServer server = BbjComposerService.server(project)
        .get(remainingSeconds(deadlineNanos), TimeUnit.SECONDS);
...
return server.refreshJavaClasses().get(remainingSeconds(deadlineNanos), TimeUnit.SECONDS);
```

### WR-02: `Configurable.reset()` performs synchronous filesystem I/O on the EDT

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsConfigurable.java:146-151`

**Issue:** `Configurable.reset()` runs on the EDT (it is invoked when the Settings dialog opens).
This phase's `reset()` performs a synchronous stat-and-possibly-read of `BBj.properties` directly
on that thread:

```java
BbjInteropPortDetector.PortLookup javaInteropPortLookup =
        BbjInteropPortCache.SESSION.lookup(state.bbjHomePath);
myComponent.setJavaInteropPortDetection(
        InteropPortSettings.effectivePort(true, state.javaInteropPort, javaInteropPortLookup),
        javaInteropPortLookup);
myComponent.setJavaInteropPort(BbjSettings.getInstance().getEffectiveJavaInteropPort());
```

`BbjInteropPortCache.SESSION.lookup()` calls `File.isFile()` + `lastModified()` + `length()`
unconditionally, and a full `Properties#load` read whenever the stat has changed since the last
lookup — real filesystem I/O executed inline on the dispatch thread. This directly contradicts the
design principle this exact phase enforces everywhere else in the settings UI: `BbjSettingsComponent`
is source-guarded (`BbjSettingsComponentSourceGuardTest.theComponentResolvesNoInteropPortDetectionItself`)
to perform *zero* filesystem work itself, specifically so that "every settings path" stays "free of
dispatch-thread filesystem work" (the component's own javadoc, line 501-503) — yet the `Configurable`
one layer up still does exactly that. (This was already true before this phase via the now-removed
`detectJavaInteropPort`, so it is not a new regression in absolute terms, but the phase invested
heavily in eliminating this exact anti-pattern elsewhere and left this call in place.)

**Fix:** Resolve the lookup on a background thread before `reset()` populates the UI (e.g. via the
same `AlarmScheduler`/`Scheduler` seam `BbjSettingsComponent` already uses for its debounced
lookups), or explicitly document why this one stat is considered acceptable to run inline (it is a
single cached stat per dialog open, not a scan, so the cost is low — but the principle is broken).

## Info

### IN-01: `getJavaInteropPort()`'s fallback duplicates the `DEFAULT_PORT` literal instead of referencing the constant

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java:461,466`

**Issue:**
```java
public int getJavaInteropPort() {
    String text = javaInteropPortField.getText().trim();
    if (text.isEmpty()) {
        return 5008; // Default when empty
    }
    try {
        return Integer.parseInt(text);
    } catch (NumberFormatException e) {
        return 5008; // Default when invalid
    }
}
```
This phase introduced `BbjInteropPortDetector.DEFAULT_PORT` specifically so "a change there cannot
leave stale copy" (per `InteropPortPresentation`'s own javadoc), and `InteropPortSettings
.sanitizePort`/`effectivePort` consistently reference it. This pre-existing method (untouched by
this diff) still hardcodes `5008` twice, working against that same stated goal.

**Fix:**
```java
return text.isEmpty() ? BbjInteropPortDetector.DEFAULT_PORT : parseOrDefault(text);
```
or simply replace both literals with `BbjInteropPortDetector.DEFAULT_PORT`.

---

_Reviewed: 2026-09-07T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
