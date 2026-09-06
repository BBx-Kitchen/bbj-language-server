# Phase 80: EM Token Security - Pattern Map

**Mapped:** 2026-09-04
**Files analyzed:** 12 (4 new seams + 4 new test classes + 4 edited production files; source-guard tests counted with each edit site)
**Analogs found:** 12 / 12

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|-----------------|---------------|
| `actions/JwtValidity.java` (new, D-03) | utility (pure classifier) | transform | `actions/BbjEMTokenStore.java` `isTokenExpired()` (57-89) — the method being extracted from | exact (extraction of existing logic) |
| `actions/BbjEMTokenStore.java` (edit, D-03/D-11/D-16) | service/facade over PasswordSafe | CRUD (credential store) | itself (pre-image); `BbjNodeVersionCache.java` for the static-memo/injected-collaborator shape used by the new `resolveBackend()` | exact / role-match |
| `actions/BbjEMLoginAction.java` (edit, D-05) | controller (action, spawns process) | request-response (subprocess) | itself (pre-image) `performLogin()` 90-167 | exact |
| `lsp/BbjProcessSecretEnv.java` (edit, D-07/D-08) | utility (file/env builder) | file-I/O | itself (pre-image) `createOwnerOnlyFile()` 114-125 | exact |
| `lsp/OwnerOnlyAcl.java` or `lsp/AclEntries.java` (new, D-07) — pure ACL-entry builder, name at planner's discretion | utility (pure builder) | transform | `concurrency/RestartGate.java` for the small-single-purpose-class shape; JDK `AclEntry` value type itself has no in-repo precedent, so this is judged role-match not exact | role-match |
| `actions/BackendNoticePolicy.java` (new, D-12) | service (decision policy with injected collaborators) | event-driven (evaluate-on-read) | `concurrency/RestartGate.java` (injected `Scheduler` + `Runnable` collaborators, synchronized decision method) | role-match |
| `actions/TokenBackend.java` (new, D-11) | model (enum) | transform | none in-repo (first plain classification enum in `actions/`) — no analog | no analog |
| `actions/TokenValidationCache.java` (new, D-14) | service (static memo/cache) | CRUD (read-through cache) | `BbjNodeVersionCache.java` (static `SESSION` instance, injected clock/collaborator, `compute`-based memo, package-private `clear()` for tests) | exact |
| `actions/BbjRunActionBase.java` (edit, D-17) | controller (action base class) | request-response (subprocess) | itself (pre-image) `validateTokenServerSide()` 288-327 | exact |
| `actions/BbjRunBuiAction.java`, `actions/BbjRunDwcAction.java` (edit, D-17) | controller (action) | request-response | themselves (pre-image), identical token-flow blocks 56-104 | exact |
| `test/.../actions/JwtValidityTest.java` (new) | test (behavioural, parameterized) | — | `test/.../lsp/BbjProcessSecretEnvTest.java` (plain JUnit 5, `assertAll`, table-style parameterized cases) | role-match |
| `test/.../actions/TokenValidationCacheTest.java` (new) | test (behavioural, counting double + fixed clock) | — | `test/.../BbjNodeVersionCacheTest.java`, `test/.../concurrency/RestartGateTest.java` (counting spawner/collaborator, package-private access) | exact |
| `test/.../actions/BackendNoticePolicyTest.java` (new) | test (behavioural, counting notifier double) | — | `test/.../concurrency/RestartGateTest.java` (injected fake collaborators, assert call counts) | role-match |
| `test/.../lsp/OwnerOnlyAclTest.java` or similar (new) | test (behavioural, pure value assertions) | — | `test/.../lsp/BbjProcessSecretEnvTest.java` lines 246-262 (POSIX permission-set assertions on a returned value) | role-match |
| `test/.../lsp/BbjSecretArgvSourceGuardTest.java` (extend, D-10c) | test (source-guard) | — | itself (pre-image), `countOccurrences`/`readGuardedSource`/`indexOf`-ordering helpers 200-286 | exact |
| new `*TokenSecuritySourceGuardTest.java` (D-06, D-13, D-17 guards) | test (source-guard) | — | `test/.../lsp/BbjSecretArgvSourceGuardTest.java` and `OffEdtDispatchSourceGuardTest.java` (helper shape: `readGuardedSource`, `countOccurrences`, `indexOf` ordering, `assertAll` over a `List<Path>`) | exact |

## Pattern Assignments

### `actions/JwtValidity.java` (utility, transform) — TOKEN-01, D-03/D-04/D-06

**Analog:** the pre-image logic inside `actions/BbjEMTokenStore.java` `isTokenExpired()` (lines 57-89), which this class replaces the internals of.

**Current four-branch logic to collapse into one `MALFORMED` classification** (lines 57-89):
```java
public static boolean isTokenExpired(@Nullable String token) {
    if (token == null || token.isEmpty()) {
        return false;
    }
    try {
        String[] parts = token.split("\\.");
        if (parts.length != 3) {
            return false; // Not a JWT, let server decide
        }
        byte[] decodedBytes = Base64.getUrlDecoder().decode(parts[1]);
        String payload = new String(decodedBytes, StandardCharsets.UTF_8);
        Pattern expPattern = Pattern.compile("\"exp\"\\s*:\\s*(\\d+)");
        Matcher matcher = expPattern.matcher(payload);
        if (!matcher.find()) {
            return false; // No exp claim, can't determine
        }
        long exp = Long.parseLong(matcher.group(1));
        long now = System.currentTimeMillis() / 1000;
        return exp <= now;
    } catch (Exception e) {
        return false; // If any parsing fails, let server validate
    }
}
```

**Target shape (D-03):** `JwtValidity.check(String token, long nowEpochSeconds)` returns a three-valued enum result (`VALID`/`EXPIRED`/`MALFORMED`), clock passed as a parameter (mirrors `BbjNodeVersionCache`'s injected `FileStat`/`VersionSpawner` collaborators and `TokenValidationCache`'s injected `LongSupplier` — clock-as-parameter is the established idiom in this codebase, see `concurrency/Scheduler`/`ManualScheduler`). Keep the same regex `Pattern.compile("\"exp\"\\s*:\\s*(\\d+)")` and Base64 url-decode call — D-04 requires reuse verbatim, not reimplementation.

**Delegate shape for `BbjEMTokenStore.isTokenExpired`:**
```java
public static boolean isTokenExpired(@Nullable String token) {
    return JwtValidity.check(token, System.currentTimeMillis() / 1000) != JwtValidity.Result.VALID;
}
```

**Test pattern to copy — parameterized case table style** (from `test/.../lsp/BbjProcessSecretEnvTest.java` lines 28-55, table-driven `@Test` methods with named scenario methods rather than `@ParameterizedTest` — this repo's convention is one `@Test` per named scenario, not JUnit 5 `@ParameterizedTest` annotations; follow suit unless `@ParameterizedTest` is already used elsewhere — it is not, per this scan):
```java
@Test
void emValidateTokenPlacesTheTokenInTheEnvironmentUnderTheAgreedKey() {
    String token = "tok-abc-123";
    BbjProcessSecretEnv.Invocation invocation =
            BbjProcessSecretEnv.emValidateToken(SCRIPT_PATH, token, OUTPUT_FILE);
    assertEquals(token, invocation.environment().get(BbjProcessSecretEnv.TOKEN_VAR));
}
```
Apply this shape per D-06 case: `aTwoPartTokenIsMalformed()`, `anExpLessPayloadIsMalformed()`, `aDecodeThrowingPayloadIsMalformed()`, `aNullOrEmptyTokenIsMalformed()`, `expOnEitherSideOfNowDiscriminatesValidFromExpired()`.

---

### `actions/BbjEMLoginAction.java` (controller, request-response) — D-05

**Analog:** itself, `performLogin()` lines 136-157 (result-handling block, right before `storeToken`).

**Current shape to insert the check into** (lines 138-157):
```java
if (stdout.startsWith("ERROR:")) {
    showErrorOnEdt(stdout.substring(6), "EM Login Failed");
    return false;
}
if (stdout.isEmpty()) {
    showErrorOnEdt(
        "No token received from EM login",
        "EM Login Failed"
    );
    return false;
}
// Store JWT securely
BbjEMTokenStore.storeToken(stdout);
showInfoOnEdt(
    "Successfully logged in to Enterprise Manager",
    "EM Login"
);
return true;
```
D-05 inserts a `JwtValidity.check(stdout, now) == MALFORMED || == EXPIRED` gate between the empty-check and `storeToken`, reusing `showErrorOnEdt` (already imported/used at line 139) — same call shape, new message "Enterprise Manager returned an unusable token".

---

### `lsp/BbjProcessSecretEnv.java` (utility, file-I/O) — TOKEN-02, D-07/D-08

**Analog:** itself, `createOwnerOnlyFile()` lines 114-125 — POSIX branch (115-119) is the pattern to mirror for the new ACL branch; non-POSIX branch (120-124) is what gets replaced.

**POSIX branch to mirror structurally** (lines 115-119):
```java
if (FileSystems.getDefault().supportedFileAttributeViews().contains("posix")) {
    FileAttribute<Set<PosixFilePermission>> ownerOnly = PosixFilePermissions.asFileAttribute(
            Set.of(PosixFilePermission.OWNER_READ, PosixFilePermission.OWNER_WRITE));
    return Files.createTempFile(prefix, suffix, ownerOnly);
}
```
Replace the non-POSIX fallback (lines 120-124, currently a bare `Files.createTempFile(prefix, suffix)`) with an `else if (...contains("acl"))` branch building `FileAttribute<List<AclEntry>>` via a new pure builder (`ownerOnlyAcl(UserPrincipal)`), then `Files.createTempFile(prefix, suffix, aclAttr)`; D-08 requires a final `else` that throws `IOException` naming the temp directory and missing capability, matching this class's existing checked-exception signature (`throws IOException` already on the method).

**Pure builder to extract** — follow `concurrency/RestartGate.java`'s single-purpose, no-collaborators class shape (constructor-free, one static method is fine here since there is no state):
```java
// RestartGate.java shows the "one small class, one clear javadoc contract" idiom to copy:
public final class RestartGate {
    private final Scheduler scheduler;
    private final Runnable restartAction;
    public RestartGate(Scheduler scheduler, Runnable restartAction) { ... }
    public synchronized void request(long delayMs) { ... }
}
```
`ownerOnlyAcl(UserPrincipal)` should be a pure static method (testable without a real filesystem, per D-07's own text: "unit-testable on Linux because `AclEntry` is a plain value class"), living either as a package-private static method on `BbjProcessSecretEnv` itself or a small sibling class in `lsp/` — planner's discretion, but keep it dependency-free like `defaultStamp` in `BbjNodeVersionCache.java` lines 39-45.

**Test pattern to copy — `Assumptions.assumeTrue` gating style** (from `test/.../lsp/BbjProcessSecretEnvTest.java` lines 246-262, POSIX tests that must stay green):
```java
@Test
void createOwnerOnlyFilesPermissionSetIsExactlyOwnerReadPlusOwnerWriteOnPosix() throws IOException {
    boolean posixSupported = FileSystems.getDefault().supportedFileAttributeViews().contains("posix");
    Assumptions.assumeTrue(posixSupported,
            "this filesystem does not support POSIX file attribute views — permission bits do not apply");
    Path created = BbjProcessSecretEnv.createOwnerOnlyFile("bbj-em-login-", ".tmp");
    try {
        Set<PosixFilePermission> permissions = java.nio.file.Files.getPosixFilePermissions(created);
        assertEquals(
                Set.of(PosixFilePermission.OWNER_READ, PosixFilePermission.OWNER_WRITE),
                permissions, "...");
    } finally {
        java.nio.file.Files.deleteIfExists(created);
    }
}
```
The new `ownerOnlyAcl(principal)` test runs unconditionally on Linux (no `Assumptions` gate needed — it is a pure value-object assertion, not a filesystem probe), asserting one `AclEntry`, `ALLOW` type, the given principal, no inherit flags.

---

### `actions/BbjEMTokenStore.java` — resolveBackend() / TokenBackend (utility+model) — TOKEN-03, D-11

**Analog:** `BbjNodeVersionCache.java` for the "isolate the one internal-API touch behind a single static memo/lookup method" idiom (SESSION instance pattern), though `resolveBackend()` itself is not cached — it is called on every `storeToken`/`getToken`.

**Enum shape (D-11)** — no analog in-repo; follow standard Java enum convention consistent with this codebase's plain-enum style (see `com.intellij.credentialStore.ProviderType` as the source enum being mapped, not a repo pattern):
```java
public enum TokenBackend { NATIVE_KEYCHAIN, KEEPASS_FILE, MEMORY_ONLY, UNKNOWN }
```

**Isolation-of-internal-API method placement** — mirror `createAttributes()`'s role as the single private helper other public methods call through (`actions/BbjEMTokenStore.java` lines 26-30):
```java
private static CredentialAttributes createAttributes() {
    return new CredentialAttributes(
        CredentialAttributesKt.generateServiceName(SERVICE_NAME, "jwt-token")
    );
}
```
`resolveBackend()` should be a similarly-scoped private (or package-private, for the source-guard to target) static method, the *only* place `PasswordSafeSettings`/`ProviderType` are imported — D-13's source-guard asserts this via `countOccurrences` (see below).

---

### `actions/BackendNoticePolicy.java` (service, event-driven) — D-12/D-13

**Analog:** `concurrency/RestartGate.java` — injected collaborators, synchronized decision method, no static state of its own.

```java
public final class RestartGate {
    private final Scheduler scheduler;
    private final Runnable restartAction;
    public RestartGate(Scheduler scheduler, Runnable restartAction) {
        this.scheduler = scheduler;
        this.restartAction = restartAction;
    }
    public synchronized void request(long delayMs) {
        scheduler.cancelAll();
        scheduler.schedule(restartAction, delayMs);
    }
}
```
`BackendNoticePolicy` follows the same shape: constructor takes a last-warned-backend store (string holder interface, production = `PropertiesComponent`) and a notifier callback (production = `Notifications.Bus`), one public method `evaluate(TokenBackend backend)` that reads the store, compares, and calls the notifier at most once per distinct non-`NATIVE_KEYCHAIN` value — same "hold minimal injected collaborators, one clear entry point" idiom as `RestartGate`.

**Notification-construction pattern to copy** (from `BbjWelcomeNotification.java` lines 33-58, the one-time-balloon shape referenced by D-13):
```java
Notification notification = new Notification(
        "BBj Language Server",
        "BBj Language Support Installed",
        "Configure your BBj Home path and Node.js to enable all language features.",
        NotificationType.INFORMATION
);
notification.addAction(new NotificationAction("Open Settings") {
    @Override
    public void actionPerformed(@NotNull AnActionEvent e, @NotNull Notification notification) {
        ShowSettingsUtil.getInstance().showSettingsDialog(project, BbjSettingsConfigurable.class);
        notification.expire();
    }
});
notification.addAction(new NotificationAction("Dismiss") {
    @Override
    public void actionPerformed(@NotNull AnActionEvent e, @NotNull Notification notification) {
        notification.expire();
    }
});
Notifications.Bus.notify(notification, project);
properties.setValue(WELCOME_SHOWN_KEY, true);
```
D-13 swaps `NotificationType.INFORMATION` for `WARNING`, the "Open Settings" action's target for the IDE's Passwords configurable, and the `PropertiesComponent` key for `com.basis.bbj.intellij.emTokenBackendWarned` (holding the last-warned backend string, not a boolean — D-12 requires per-value tracking, not a one-shot flag, so this is a variant of the pattern, not a literal copy).

**Test pattern to copy — injected counting collaborators** (`concurrency/RestartGateTest.java` / `BbjNodeVersionCacheTest.java` style: fake `VersionSpawner`/`Scheduler` doubles that count invocations). Drive `storeToken`-then-`getToken` twice under `KEEPASS_FILE`, assert one notifier call; flip to `NATIVE_KEYCHAIN` and back, assert a second.

---

### `actions/TokenValidationCache.java` (service, read-through cache) — TOKEN-04, D-14/D-15/D-16/D-17

**Analog:** `BbjNodeVersionCache.java` in full — static `SESSION` instance over injected collaborators, `ConcurrentHashMap`/`compute`-based entry replacement, package-private `clear()` for tests. This is the strongest analog in the phase.

**Structure to copy (lines 17-97 of `BbjNodeVersionCache.java`):**
```java
public final class BbjNodeVersionCache {
    @FunctionalInterface
    interface VersionSpawner { @Nullable String versionOf(String nodePath); }

    public static final BbjNodeVersionCache SESSION =
            new BbjNodeVersionCache(BbjNodeDetector::getNodeVersion, BbjNodeVersionCache::defaultStamp);

    private record Entry(String stamp, @Nullable String version) {}

    private final VersionSpawner spawner;
    private final FileStat stat;
    private final ConcurrentHashMap<String, Entry> cache = new ConcurrentHashMap<>();

    BbjNodeVersionCache(VersionSpawner spawner, FileStat stat) { ... } // package-private for test injection

    public @Nullable String getVersion(@NotNull String nodePath) {
        String currentStamp = stat.stampOf(nodePath);
        if (currentStamp == null) return null;
        return cache.compute(nodePath, (path, existing) ->
                existing != null && existing.stamp().equals(currentStamp)
                        ? existing
                        : new Entry(currentStamp, spawner.versionOf(path))
        ).version();
    }

    void clear() { cache.clear(); }       // test-only
    int size() { return cache.size(); }   // test-only
}
```
Map for `TokenValidationCache`: `Entry(String sha256Hash, long validatedAtMillis)`; injected `LongSupplier` clock instead of `FileStat`; single static field (an `AtomicReference<Entry>` per D-14, not a `ConcurrentHashMap`, since there is exactly one token of interest at a time — D-14 explicitly asks for "a synchronized or `AtomicReference` to an immutable entry", a simpler variant of this map-based cache); `isTrusted(token)` hashes the token's UTF-8 bytes with SHA-256, compares against the stored hash, and checks `now - validatedAt <= TRUST_WINDOW_MS`; `invalidate()` clears the reference (mirrors `clear()`).

**Test pattern to copy** (`test/.../BbjNodeVersionCacheTest.java` and `concurrency/RestartGateTest.java` — counting double + fixed clock):
```java
// Shape: pass a counting BooleanSupplier as "server check", fixed-clock LongSupplier,
// call trusted path twice with same token -> assert one invocation;
// advance clock past window -> assert second invocation;
// invalidate() -> assert third invocation.
```

---

### `actions/BbjRunActionBase.java` / `BbjRunBuiAction.java` / `BbjRunDwcAction.java` (controller) — D-17

**Analog:** itself (pre-image). `validateTokenServerSide()` (`BbjRunActionBase.java` lines 288-327) stays as the low-level subprocess call; the two identical blocks in `BbjRunBuiAction.java`/`BbjRunDwcAction.java` lines 75-85 (shown below) collapse into one new base-class method (e.g. `validateTokenTrusted(project, token)`).

**Current duplicated block to collapse** (`BbjRunBuiAction.java` lines 75-85, identical in `BbjRunDwcAction.java`):
```java
// Client-side JWT expiry check (fast path)
if (BbjEMTokenStore.isTokenExpired(token)) {
    BbjEMTokenStore.deleteToken();
    token = null;
}

// Server-side validation (catches revoked tokens too)
if (token != null && !validateTokenServerSide(project, token)) {
    BbjEMTokenStore.deleteToken();
    token = null;
}
```
New `validateTokenTrusted(project, token)` in `BbjRunActionBase.java` (placed adjacent to `validateTokenServerSide()`, same protected-method visibility, lines 288-327 as its neighbor) consults `TokenValidationCache`, calls `validateTokenServerSide` only on a cache miss, and records success into the cache.

---

## Shared Patterns

### Source-guard test helper shape
**Source:** `test/.../lsp/BbjSecretArgvSourceGuardTest.java` lines 1-40, 200-286 (`readGuardedSource`, `countOccurrences`, `indexOf`-ordering, `guardedActionSource(name)` path builder, `assertAll` over a `List<Path>`)
**Apply to:** every new source-guard test in this phase (D-06 "let server decide"/"can't determine" branch absence + `performLogin` ordering; D-10c `acl:acl`/`AclEntry` presence + bare-`createTempFile` absence; D-13 `PasswordSafeSettings` single-method isolation; D-17 `validateTokenServerSide` no-longer-called-directly-from-Bui/Dwc)
```java
private static final Path RUN_ACTION_BASE = guardedActionSource("BbjRunActionBase.java");
// ...
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

### Injected-clock / counting-double behavioural test style
**Source:** `test/.../BbjNodeVersionCacheTest.java`, `test/.../concurrency/RestartGateTest.java` + `concurrency/ManualScheduler.java`
**Apply to:** `JwtValidityTest` (fixed `now`), `TokenValidationCacheTest` (fixed clock + counting `BooleanSupplier`), `BackendNoticePolicyTest` (counting notifier double)

### Static-memo-with-injected-collaborators + package-private test hooks
**Source:** `BbjNodeVersionCache.java` (`SESSION` static field, package-private constructor for test doubles, package-private `clear()`/`size()`)
**Apply to:** `TokenValidationCache` (D-14 "single static instance")

### One-time / evaluate-on-read notification via `PropertiesComponent` + `Notifications.Bus`
**Source:** `BbjWelcomeNotification.java` lines 21-62
**Apply to:** `BackendNoticePolicy` (D-12/D-13), with the boolean flag generalized to a last-warned-backend string per D-12

### Internal-platform-API isolation behind one private method
**Source:** `actions/BbjEMTokenStore.java` `createAttributes()` lines 26-30 (existing precedent for wrapping a platform call behind one small private method that all public methods route through)
**Apply to:** `resolveBackend()` (D-11) — the isolation the D-13 source-guard checks for

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `actions/TokenBackend.java` | model (enum) | transform | First plain classification enum in `actions/`; RESEARCH.md/CONTEXT.md gives the exact shape (`NATIVE_KEYCHAIN`, `KEEPASS_FILE`, `MEMORY_ONLY`, `UNKNOWN`) so no in-repo analog is needed — use standard Java enum conventions |
| `lsp/` ACL-entry pure builder (`ownerOnlyAcl`) | utility (pure builder) | transform | No prior use of `java.nio.file.attribute.AclEntry` anywhere in the repo; `RestartGate.java` supplies the "small single-purpose class" shape but not the domain content — follow the JDK API directly per D-07's own spec |

## Metadata

**Analog search scope:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/` (`actions/`, `lsp/`, `concurrency/`, root package) and `bbj-intellij/src/test/java/com/basis/bbj/intellij/` (`lsp/`, `concurrency/`, root package)
**Files scanned:** `BbjEMTokenStore.java`, `BbjProcessSecretEnv.java`, `BbjRunActionBase.java`, `BbjEMLoginAction.java`, `BbjRunBuiAction.java`, `RestartGate.java`, `BbjNodeVersionCache.java`, `BbjWelcomeNotification.java`, `BbjSecretArgvSourceGuardTest.java`, `BbjProcessSecretEnvTest.java` (12 files read; DownloadGuard.java and OffEdtDispatchSourceGuardTest.java confirmed present but not re-read past the earlier phase's established shape already captured via RestartGate/BbjSecretArgvSourceGuardTest)
**Pattern extraction date:** 2026-09-04
