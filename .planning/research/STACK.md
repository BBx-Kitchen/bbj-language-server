# Stack Research — v4.2 IntelliJ Burn-down

**Domain:** IntelliJ Platform plugin (Java/Kotlin-hosted Gradle build), LSP4IJ client, JDK-only security hardening
**Researched:** 2026-09-03
**Confidence:** HIGH (all versions/APIs cross-checked against JetBrains/Gradle/redhat-developer source or official docs; two items are MEDIUM — see notes)

This is a **subsequent-milestone, narrow-scope** research pass. It intentionally does not
re-litigate LSP4IJ 0.19.0, Java 17, IntelliJ Platform SDK 2024.2+, or the existing test source
set — those are validated per `PROJECT.md`. It answers only: what has to be *added or changed* in
`bbj-intellij/build.gradle.kts` and its source tree to close the 21 open PRIO 1/2 issues, and what
should deliberately **not** be added.

**Headline finding:** almost none of this milestone needs a new third-party library. Every
threading fix uses IntelliJ Platform SDK classes already present via the `intellijIdeaCommunity`
dependency; every security fix uses JDK 17 classes already on the classpath; the one new LSP
capability (#571, `bbj/compile`) extends a proxy-interface pattern (`BbjComposerServer`) the
codebase already ships for `bbj/composer/*` (#433). The actual *stack* changes are three: a Gradle
toolchain block + auto-provisioning resolver plugin, a Gradle wrapper refresh, and one Gradle
test-framework dependency block (`testFramework(TestFrameworkType.Platform)` + JUnit Vintage) to
let `BasePlatformTestCase`-style tests run in the JUnit 5 suite that already exists.

## Recommended Stack

### Core Technologies (build/toolchain)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `org.gradle.toolchains.foojay-resolver-convention` (settings plugin) | 1.0.0 (only stable release, 2025-05-19) | Lets Gradle auto-*download* a JDK 17 toolchain when the invoking machine has none | #570's fix is a `toolchain { languageVersion = JavaLanguageVersion.of(17) }` block in `build.gradle.kts`, but Gradle's built-in toolchain auto-*detection* only finds JDKs that are already installed — auto-*provisioning* (downloading one) requires a configured toolchain resolver, or the build fails with the same opaque error #570 reports, just one JDK later. This environment itself has only JDK 25 available, which is the exact failure #570 documents — adding the resolver is what makes the toolchain pin actually self-heal instead of just relocating the failure. Verified against `docs.gradle.org/current/userguide/toolchains.html`. |
| Gradle 8.14.5 (wrapper bump, same 8.x line) | 8.14.5 (released 2026-05-07) | Refresh the ~18-months-stale, unverifiable wrapper (#503, #576) | Bump *within* the 8.x line rather than to Gradle 9.x. Verified: newer `intellij-platform-gradle-plugin` releases raise their **minimum** supported Gradle to 9.0.0 (dropping 8.13 support and relocating the sandbox dir to `.intellijPlatform/sandbox`), while the currently pinned plugin version, 2.11.0, only requires Gradle 8.13+. Jumping to Gradle 9 today would force an unplanned `intellij-platform-gradle-plugin` bump and sandbox-path migration this milestone does not ask for. 8.14.5 satisfies #576's "stale/unpinned" complaint (current, checksummed, transitive tree enumerable) with zero blast radius on the rest of the build. Regenerate via `./gradlew wrapper --gradle-version 8.14.5 --gradle-distribution-sha256-sum 6f74b601422d6d6fc4e1f9a1ab6522f642c2fdcbc15ae33ebd30ba3d7198e854` — this rewrites *both* `gradle-wrapper.jar` and `gradle-wrapper.properties` from Gradle's own signed distribution, which is what actually fixes #503 (a wrapper JAR whose SHA-256 matches the 8.10–8.12.1 line, not the 8.13 the properties file claims); hand-editing `gradle-wrapper.properties` alone would leave the JAR mismatch in place. Checksum cross-verified against both `services.gradle.org/distributions/gradle-8.14.5-bin.zip.sha256` and `gradle.org/release-checksums/` — re-verify at execution time since a research agent copy-pasting a checksum is not itself a supply-chain-safe verification step; prefer having `./gradlew wrapper` fetch and pin it directly. |
| `gradle/actions/wrapper-validation@v6` (GitHub Action, not a Gradle plugin) | v6 (current major; supersedes the archived `gradle/wrapper-validation-action`) | CI step that validates the committed `gradle-wrapper.jar` checksum against Gradle's published per-release list on every push/PR | This is the missing control #503 identifies: "no CI validation step covers this file... the mismatch has persisted undetected." A ~5-line step added to `pr-validation.yml`, `preview.yml`, and `manual-release.yml` (the three workflows that already invoke `./gradlew`) closes the detection gap permanently, independent of which Gradle version is pinned. Does not require a Dependabot `gradle` ecosystem entry (a separate, larger ask not in scope here). |

### IntelliJ Platform SDK APIs (threading — #506, #541, #543, #513, #539, #537)

No new dependency. These are all part of `com.intellij:...` bundled with `intellijIdeaCommunity("2024.2")`,
already on the compile classpath. The project already uses two of them correctly elsewhere
(`executeOnPooledThread` for process launch, `restartAlarm` for the 30s LS shutdown grace period) —
this milestone is applying the *same* established pattern to the sites that currently skip it.

| API | Class | Purpose | Where it applies |
|-----|-------|---------|-------------------|
| `ApplicationManager.getApplication().executeOnPooledThread(Runnable)` | `com.intellij.openapi.application.ApplicationManager` | Move blocking work off the EDT to a platform-managed pooled thread | #506: wrap `buildCommandLine()`'s token-validate/login round trip *inside* the existing pooled-thread block instead of before it |
| `Task.Backgroundable` + `ProgressManager.getInstance().run(...)` | `com.intellij.openapi.progress.Task`, `ProgressManager` | Background work with a visible progress indicator, cancellation, and a defined modality | Preferred over a bare `executeOnPooledThread` for #541/#543 where the debounced Node.js version check or classpath read benefits from a cancellable, coalescible unit of work rather than a fire-and-forget thread |
| `Alarm` (already in use for `restartAlarm`) | `com.intellij.util.Alarm` | Debounce/schedule delayed work without blocking the EDT | #513: replace `Thread.sleep(1000)` inside `invokeLater` with `restartAlarm.addRequest(this::restart, 1000)` — the exact fix the issue proposes, reusing machinery already in `BbjServerService.java`. #541/#543: debounce the settings-dialog document-listener and notification-provider `node --version` spawns (e.g. `Alarm(ThreadToUse.POOLED_THREAD, disposable)` with a ~300ms coalescing window) |
| `ReadAction` / `WriteAction` (`runReadAction`, `runWriteAction`) | `com.intellij.openapi.application.ReadAction`, `WriteAction` | Correct threading discipline when pooled-thread work touches PSI/VFS state (e.g. composer edits after a re-decode) | #567: the re-decode-and-validate helper reads document state; if that read races a write on another thread it needs `ReadAction.compute(...)`, and the actual `WriteCommandAction.replaceString` call (already used in `ComposerLauncher`) stays the write side |
| `ModalityState` | `com.intellij.openapi.application.ModalityState` | Ensures `invokeLater` callbacks scheduled from a pooled thread run at the correct modality when a modal dialog (e.g. the composer dialog, EM login) is on screen | Relevant to #506/#538/#567 wherever a pooled-thread continuation must post back to the EDT while a modal dialog may or may not still be open — pass `ModalityState.defaultModalityState()` (captured before `executeOnPooledThread`) explicitly rather than relying on `invokeLater`'s implicit "any modality" default, which is the usual cause of "callback fired but nothing visibly happened while a dialog was open" bugs |
| `AtomicBoolean` (`java.util.concurrent.atomic`) | JDK, not a platform API | Guard the check-then-set race | #537: guard `downloadNodeAsync()`'s in-progress flag with `compareAndSet`. #539: same primitive (or a single-entry-point refactor funneling all 6 call sites through the existing `scheduleRestart()`/`Alarm`) guards the restart race — the issue's own proposed approach; no new dependency either way |

**What NOT to add:** no coroutines library (`kotlinx-coroutines`), no RxJava, no separate executor/thread-pool
library. The codebase is Java (not Kotlin) and already has exactly one established async idiom
(`executeOnPooledThread` + `Alarm` + `invokeLater`); introducing a second concurrency paradigm for
this fix set would be pure inconsistency risk for no capability the platform SDK doesn't provide.

### Security-relevant JDK APIs (#535, #536, #552, #542)

No new dependency for any of these — and that absence is itself the recommendation.

| API | Class | Purpose | Where it applies |
|-----|-------|---------|-------------------|
| `java.util.Base64.getUrlDecoder()` | JDK | Decode a JWT's base64url header/payload segments without verifying its signature | #535: the existing `isTokenExpired()` already does this; the fix is changing the three "unable to determine" branches to fail closed (`return true`), not adding cryptographic capability |
| `java.nio.file.attribute.PosixFilePermissions.asFileAttribute(EnumSet.of(OWNER_READ, OWNER_WRITE))` | JDK (`java.nio.file.attribute`) | Owner-only temp file permissions at creation time, passed as a `FileAttribute` to `Files.createTempFile(...)` | #536, both call sites (`BbjRunActionBase.java:295`, `BbjEMLoginAction.java:96`) |
| `java.nio.file.attribute.AclFileAttributeView` / `AclEntry` / `AclEntryType` / `AclEntryPermission` | JDK (`java.nio.file.attribute`) | Windows-appropriate ACL fallback for the same temp files, since `PosixFilePermissions` is a no-op on NTFS | #536's Windows branch — build an `AclEntry` granting only the current user (`FileOwnerAttributeView.getOwner()`) `READ_DATA`/`WRITE_DATA`/`APPEND_DATA`, apply via `Files.getFileAttributeView(path, AclFileAttributeView.class).setAcl(...)`, and detect the platform once via `FileSystems.getDefault().supportedFileAttributeViews().contains("acl")` rather than an OS-name string check |
| `PasswordSafe.getInstance().isMemoryOnly()` (existing dependency, unused method) | `com.intellij.ide.passwordSafe.PasswordSafe` (public, stable) | Detect the "do not save/memory-only" case for the currently-configured backend | #552 — cheap, public, no risk. Confirmed via the platform source (`PasswordSafe.kt`): `abstract val isMemoryOnly: Boolean` |
| `PasswordSafeSettings` service, `getProviderType()` → `ProviderType{MEMORY_ONLY,KEYCHAIN,KEEPASS,REMOTE}` | `com.intellij.credentialStore.PasswordSafeSettings` (`@ApiStatus.Internal` applicationService) | Distinguish *which* non-keychain backend is active (KeePass file vs. memory-only vs. remote) for the one-time warning notification | #552's "not the native keychain" check needs this — there is no public API that exposes the resolved provider type; `isMemoryOnly` alone can't tell KeePass apart from "do not save." Access via `ApplicationManager.getApplication().getService(PasswordSafeSettings.class)` (registered as an `applicationService` in `intellij.platform.credentialStore.impl.xml`), read `getProviderType()`. **Treat this exactly like the LSP4IJ `@ApiStatus.Experimental` coupling already flagged in #554/#544**: it's an internal, unversioned-contract API with no regression guarantee across IntelliJ releases — give it the same one-file isolation and a regression test asserting the call still resolves, so a future platform release that removes/renames it fails a test instead of failing silently in production. |

**What NOT to add:** no JWT library (`java-jwt`, `jjwt`, `nimbus-jose-jwt`, `auth0-jwt`). #535 explicitly
needs *unverified* claim inspection (there is no signing key to check against — the server-side
`validateTokenServerSide()` round trip is the actual trust boundary), so a signature-verifying JWT
library would add ~150KB-1MB+ of dependency surface to do less than the four lines of
`Base64.getUrlDecoder().decode(...)` + `JsonParser` (Gson, already a transitive LSP4IJ dependency
and already used elsewhere in this module, e.g. `BbjLanguageClient.createSettings()`) the existing
code already does. No password/keychain abstraction library either (e.g. `java-keyring`) — IntelliJ's
own `PasswordSafe` already *is* that abstraction; the milestone need is detecting which backend it
resolved to, not replacing it.

### Testing (#568, #540, #538, #554, #544, #569)

| Library / Plugin | Version | Purpose | Notes |
|-------------------|---------|---------|-------|
| `testFramework(TestFrameworkType.Platform)` (IntelliJ Platform Gradle Plugin `intellijPlatform` extension) | Ships with the already-pinned `org.jetbrains.intellij.platform.settings` 2.11.0 | Resolves the platform test-framework artifact containing `BasePlatformTestCase`, `LightPlatformTestCase`, `HeavyPlatformTestCase` | Add inside the existing `dependencies { intellijPlatform { ... } }` block in `build.gradle.kts`, alongside the current `intellijIdeaCommunity(...)`/`bundledPlugin(...)`/`plugin(...)` entries. No version bump to the settings plugin needed — 2.11.0 already supports this extension function. |
| `junit:junit:4.13.2` | 4.13.2 | `BasePlatformTestCase` extends the legacy `TestCase`/`UsefulTestCase` hierarchy (JUnit 3-shaped: no `@Test` annotations, methods must be named `testXxx`), which needs the classic JUnit 4 API surface present at compile time | Add as `testImplementation`. JetBrains' own example pairs `testFramework(TestFrameworkType.Platform)` with exactly this dependency (not auto-added by the extension) |
| `org.junit.vintage:junit-vintage-engine:5.10.2` | 5.10.2 (match the already-pinned `junit-bom`/Jupiter version) | Lets the *existing* `useJUnitPlatform()` task run the new `BasePlatformTestCase`-style (JUnit 3/4-shaped) tests **in the same test task** as the 7 existing JUnit 5 Jupiter classes | Add as `testRuntimeOnly`, next to the existing `testRuntimeOnly("org.junit.platform:junit-platform-launcher")`. Without the vintage engine, JUnit Platform's launcher silently skips classes that don't carry Jupiter's `@Test`/`@ExtendWith` shape — a `BasePlatformTestCase` subclass would compile but never run, and `./gradlew test` would report success while testing nothing (exactly the kind of silent-gap the P63-D5 findings are about). Do **not** split into two Gradle test source sets/tasks (e.g. a separate `platformTest`) purely to avoid the vintage dependency — that duplicates configuration and CI wiring for no benefit `useJUnitPlatform()` + vintage doesn't already give for free. |
| No change to `org.junit:junit-bom:5.10.2` / `junit-jupiter` | — | Already correctly pinned | The 7 existing test classes (`NodeInstallIntegrityTest`, `NodeArchiveVerifierTest`, `BbjNodeDownloaderSourceGuardTest`, `BbjSecretArgvSourceGuardTest`, `NodeExecutableResolverTest`, `BbjProcessSecretEnvTest`, `BbjLanguageServerSourceGuardTest`) are plain JUnit 5 Jupiter, unrelated to the platform test framework — several are source-text "guard" tests asserting properties of the guarded `.java` file's source (a lightweight pattern worth reusing for #513/#571's "no `src/test/` gap closed first, or a recorded manual verification" acceptance criteria, where a real `Task.Backgroundable`/EDT scenario is hard to drive without a running IDE) |
| `BasePlatformTestCase` for `BbjCommenterTest` / lexer tests | n/a (see above) | #540, #568 both touch classes (`BbjCommenter`, `BbjWordLexer`) reachable without a full project fixture | Confirm per-test whether `BasePlatformTestCase` (needs `getTestDataPath()`/light fixture) is actually required, or whether the class under test can be instantiated directly in a plain JUnit 5 test — `BbjCommenter.getLineCommentPrefix()` and `BbjWordLexer.advance()` both look unit-testable without a platform fixture at all, which is cheaper and doesn't need the vintage engine. Reserve `BasePlatformTestCase` for cases that actually need PSI/editor state (e.g. an end-to-end comment-toggle keystroke simulation) |
| EDT assertion pattern | n/a — use `Assert.assertFalse(ApplicationManager.getApplication().isDispatchThread())` from inside the pooled-thread callback under test, or drive the action synchronously via `PlatformTestUtil.dispatchAllInvocationEventsInIdeEventQueue()` | No dedicated "EDT assertion" library exists; IntelliJ's own `PlatformTestUtil` (ships with `TestFrameworkType.Platform`) provides `dispatchAllInvocationEventsInIdeEventQueue()`/`waitForAlarm()`-style helpers used across the platform's own test suite for exactly the "assert no EDT block occurred" and "assert the debounce/alarm actually deferred work" shapes this milestone's regression tests need (#541, #543, #513, #537) | |

### LSP4IJ custom request (#571)

| API | Purpose | Notes |
|-----|---------|-------|
| `org.eclipse.lsp4j.jsonrpc.services.@JsonRequest` on a `LanguageServer`-extending interface | Declare `bbj/compile` as a typed, proxyable JSON-RPC request | **Already the established pattern in this codebase** — `BbjComposerServer.java` (`bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/BbjComposerServer.java`) already extends `org.eclipse.lsp4j.services.LanguageServer` with seven `@JsonRequest("bbj/composer/...")` methods for #433, and `BbjLanguageServerFactory.getServerInterface()` already returns that interface. The correct #571 fix is adding a `@JsonRequest("bbj/compile") CompletableFuture<CompileResult> compile(CompileParams params)` method to that same interface (or a sibling one also returned by `getServerInterface()`), not introducing a new LSP4IJ registration mechanism. `org.eclipse.lsp4j` is already a transitive dependency of the pinned `com.redhat.devtools.lsp4ij:0.19.0` — no new Gradle dependency. |
| `LanguageServerManager.getInstance(project).getLanguageServer(id).thenApply(item -> (BbjComposerServer) item.getServer())` | Obtain the typed proxy from `BbjCompileAction` to call `.compile(...)` | `LanguageServerManager` and `getServerInterface()` are both confirmed present in the pinned LSP4IJ 0.19.0 tag (checked directly against the `0.19.0` git tag, not just `main`) — no LSP4IJ version bump required for this fix. `LanguageServerManager` is currently consumed by `BbjServerService`/`BbjJavaInteropService`/`BbjStatusBarWidget` (per #544) as plain enum/id values; `BbjCompileAction` would be the first caller to retrieve and cast the typed server proxy, following the same `getServer()` shape the Developer Guide's own example uses. |
| LS-side: `connection.onRequest('bbj/compile', ...)` mirroring the existing `bbj/composer/*` dispatch table | Not an IntelliJ-side dependency, but the other half of this fix | `bbj-vscode/src/language/composer-commands.ts` already shows the exact established registration shape (`'bbj/composer/...': (params) => ...`) for adding a namespaced custom request; the LS already has `bbj-cpl-service.ts`/`bbj-cpl-parser.ts` implementing the compile itself for VS Code's `bbj.compile`. Wiring `bbj/compile` is composing two things that already exist, not building new compiler integration. |

**What NOT to add:** no new LSP4IJ version, no hand-rolled JSON-RPC client, no second `LanguageServerFactory`
registration. The extension point this milestone needs is a single interface method.

## Installation

```bash
# bbj-intellij/build.gradle.kts — dependencies { ... } block additions
```

```kotlin
dependencies {
    intellijPlatform {
        intellijIdeaCommunity("2024.2")          // unchanged
        bundledPlugin("org.jetbrains.plugins.textmate")   // unchanged
        plugin("com.redhat.devtools.lsp4ij:0.19.0")       // unchanged
        pluginVerifier()
        zipSigner()
        instrumentationTools()
        testFramework(TestFrameworkType.Platform)          // NEW — BasePlatformTestCase et al.
    }

    testImplementation(platform("org.junit:junit-bom:5.10.2"))   // unchanged
    testImplementation("org.junit.jupiter:junit-jupiter")        // unchanged
    testImplementation("junit:junit:4.13.2")                     // NEW — required by TestFrameworkType.Platform
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")   // unchanged
    testRuntimeOnly("org.junit.vintage:junit-vintage-engine:5.10.2") // NEW — runs BasePlatformTestCase-shaped tests under useJUnitPlatform()
}

java {
    toolchain {                                    // NEW — #570
        languageVersion = JavaLanguageVersion.of(17)
    }
}
```

```kotlin
// bbj-intellij/settings.gradle.kts
plugins {
    id("org.jetbrains.intellij.platform.settings") version "2.11.0"   // unchanged
    id("org.gradle.toolchains.foojay-resolver-convention") version "1.0.0"  // NEW — auto-provision JDK 17
}
```

```bash
# Gradle wrapper refresh (#503, #576) — run from bbj-intellij/, do not hand-edit properties/jar
./gradlew wrapper --gradle-version 8.14.5 \
  --gradle-distribution-sha256-sum 6f74b601422d6d6fc4e1f9a1ab6522f642c2fdcbc15ae33ebd30ba3d7198e854
```

```yaml
# .github/workflows/*.yml — add once, before any ./gradlew step, to every workflow that runs bbj-intellij's build
- uses: gradle/actions/wrapper-validation@v6
```

No `npm install` / package.json changes — this milestone is entirely `bbj-intellij/` (Java/Gradle);
`bbj-vscode/`'s existing dependency set (Langium 4.1.3, Chevrotain 11.0.3, Vitest 1.6.1) is untouched.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|--------------------------|
| Gradle 8.14.5 (stay on 8.x) | Gradle 9.7.1 (current major) | If a future milestone deliberately bumps `intellij-platform-gradle-plugin` past its Gradle-9-minimum release and re-validates the sandbox-path move — not a fit for this narrow burn-down |
| `foojay-resolver-convention` for JDK auto-provisioning | Requiring every contributor/CI runner to pre-install JDK 17 (e.g. via `actions/setup-java` in CI, `sdkman`/`asdf` locally) | CI already can pin an exact JDK via `actions/setup-java`, making the resolver redundant *there*; the resolver's value is for contributors/agents whose only available JDK is newer (this environment's own JDK 25, and #570's own reproduction), which is exactly the failure mode #570 documents |
| `PasswordSafeSettings` internal service for backend detection | Prompting the user to manually confirm their "Save passwords" setting | The internal API gives an accurate, non-interruptive one-time notification per #552's acceptance criteria; a manual prompt would be worse UX and doesn't scale to org-policy-driven settings changes the user never sees |
| `junit-vintage-engine` in the existing test task | A second Gradle source set (`src/platformTest/`) with its own `Test` task type (`TestFrameworkType` docs show this pattern too for heavier integration suites) | If a *future* milestone adds true integration/UI tests needing `runIdeForUiTests`-style heavyweight fixtures with a materially different lifecycle (long-running IDE instance, separate CI job) — not needed for the light `BasePlatformTestCase`-shaped unit tests this milestone's acceptance criteria describe |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|--------------|
| Any JWT library (`jjwt`, `java-jwt`, `nimbus-jose-jwt`) | #535 needs unverified claim *inspection*, not signature verification — the server owns the trust decision via `validateTokenServerSide()`; a signing-capable library adds real dependency weight and API surface for zero additional guarantee | `java.util.Base64` + Gson (already present) |
| `kotlinx-coroutines`, RxJava, or any second concurrency library | The module is Java, and one async idiom (`executeOnPooledThread`/`Alarm`/`invokeLater`) is already established and sufficient for every threading fix in scope | `com.intellij.openapi.application`/`com.intellij.openapi.progress`/`com.intellij.util.Alarm` |
| `java-keyring` or any standalone OS-keychain library | IntelliJ's `PasswordSafe` already wraps native keychain/KeePass/memory backends; adding a second credential-storage library would create two competing "where is the JWT stored" answers | `com.intellij.ide.passwordSafe.PasswordSafe` (already used) + `PasswordSafeSettings` for backend introspection |
| Gradle 9.x this milestone | Forces an unplanned `intellij-platform-gradle-plugin` minimum-version bump (9.0.0) and a sandbox directory relocation, neither asked for by #503/#570/#576/#517 | Gradle 8.14.5 |
| A second `LanguageServerFactory`/registration for `bbj/compile` | LSP4IJ registers one server proxy interface per language server id via `plugin.xml`; the existing `BbjComposerServer` interface *is* the extension point | Add the method to `BbjComposerServer` (or a sibling interface also returned from the existing `getServerInterface()`) |
| A brand-new dedicated test source set/task for platform tests | Duplicates `useJUnitPlatform()` wiring, CI invocation, and coverage config the existing single `test` task already provides once vintage engine is added | `testFramework(TestFrameworkType.Platform)` + `junit-vintage-engine` in the existing `test` task |
| Hand-editing `gradle-wrapper.properties`' `distributionSha256Sum` field only | Leaves the actual `gradle-wrapper.jar` binary's mismatch (the real #503 finding) in place — the properties file's checksum was never the problem, the committed JAR was | `./gradlew wrapper --gradle-version ... --gradle-distribution-sha256-sum ...`, which regenerates the JAR itself from a verified distribution |

## Stack Patterns by Variant

**If a fix's regression test needs to assert "no EDT block occurred":**
- Run the code under test from a pooled thread in the test (mirroring how the platform itself invokes it), then assert `!ApplicationManager.getApplication().isDispatchThread()` from inside the callback, or time-box the EDT-side call and assert it returns near-instantly while a `CountDownLatch`/similar shows the background work still in flight.
- Because: this is the actual defect shape in #506/#541/#513/#537 — you're testing an ordering/threading property, not a functional result, so the assertion has to observe *which thread* ran the blocking call, not just that it eventually completed.

**If a fix's acceptance criteria says "regression coverage depends on the `src/test/` gap being closed first, or a recorded manual verification step" (#513, #571):**
- Since `src/test/` already exists (7 classes) as of this milestone's start, that conditional is already satisfied — write the regression test rather than falling back to the manual-verification escape hatch those issues were drafted to allow for.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|------------------|-------|
| `org.jetbrains.intellij.platform.settings:2.11.0` | Gradle 8.13 – (below whatever release first requires 9.0.0) | Confirmed minimum 8.13; do not pair with Gradle 9.x without also bumping this plugin |
| Gradle 8.14.5 | JDK 17+ to run the Gradle daemon itself (Gradle 9.x raises this to a hard requirement; 8.x still tolerates older JDKs for the daemon, but this project's own toolchain block targets 17 regardless) | The `toolchain` block controls what JDK *compiles/runs the plugin code*, independent of what JVM launches Gradle itself |
| `com.redhat.devtools.lsp4ij:0.19.0` | `getServerInterface()` and `LanguageServerManager.getLanguageServer(id)` | Both verified present at the `0.19.0` git tag — no version bump needed for #571 |
| `org.junit.vintage:junit-vintage-engine:5.10.2` | `org.junit:junit-bom:5.10.2` (already pinned), `junit:junit:4.13.2` | Keep the vintage engine version aligned with the Jupiter/platform-launcher versions already pinned via the BOM to avoid split-version classpath warnings |
| `testFramework(TestFrameworkType.Platform)` | `intellijIdeaCommunity("2024.2")` (already pinned) | Platform test framework artifacts are versioned to match the target IDE build; no separate version parameter needed unless a specific pin is later required |

## Sources

- `docs.gradle.org/current/userguide/toolchains.html` — toolchain auto-detection vs. auto-provisioning, foojay resolver requirement — HIGH confidence (official docs)
- `plugins.gradle.org/plugin/org.gradle.toolchains.foojay-resolver-convention` — latest version 1.0.0, JDK 17+ requirement to run the plugin itself — HIGH confidence (official plugin portal)
- `gradle.org/releases/`, `docs.gradle.org/9.7.1/release-notes.html` — current Gradle release train (9.7.1) — HIGH confidence (official)
- `docs.gradle.org/8.14.5/release-notes.html`, `services.gradle.org/distributions/gradle-8.14.5-bin.zip.sha256`, `gradle.org/release-checksums/` — Gradle 8.14.5 as latest 8.x patch and its SHA-256, cross-checked against two independent official pages — HIGH confidence
- `github.com/gradle/actions` (`wrapper-validation` action, current major v6, supersedes `gradle/wrapper-validation-action`) — HIGH confidence (official GitHub org)
- Web search on `intellij-platform-gradle-plugin` Gradle 9 minimum-version bump and sandbox relocation — MEDIUM confidence (search-summary claim, not directly read from the plugin's own changelog entry; treat the *exact* version that first requires Gradle 9 as unconfirmed, only the fact that a bump exists)
- `plugins.jetbrains.com/docs/intellij/tools-intellij-platform-gradle-plugin-testing-extension.html` — `testFramework(TestFrameworkType.Platform/JUnit5/...)` extension shape — HIGH confidence (official docs)
- `plugins.jetbrains.com/docs/intellij/light-and-heavy-tests.html` — `BasePlatformTestCase` JUnit-3-shaped base, `LightJavaCodeInsightFixtureTestCase5` as the JUnit5-native alternative for code-insight-heavy cases — MEDIUM confidence (page didn't fully enumerate JUnit-version specifics; corroborated by locating `BasePlatformTestCase.java`'s actual class hierarchy in `JetBrains/intellij-community` but not fully reading it)
- `github.com/JetBrains/intellij-community`, `platform/credential-store/src/ide/passwordSafe/PasswordSafe.kt` — public `isMemoryOnly` property, read directly from source — HIGH confidence
- `github.com/JetBrains/intellij-community`, `platform/credential-store/src/credentialStore/ProviderType.kt` and `platform/credential-store-impl/src/credentialStore/PasswordSafeSettings.kt` and its `applicationService` registration in `intellij.platform.credentialStore.impl.xml` — `ProviderType` enum and internal `PasswordSafeSettings` service, read directly from source — HIGH confidence, but the class itself is `@ApiStatus.Internal` (unstable-contract, not a confidence caveat on the research)
- `github.com/redhat-developer/lsp4ij`, `docs/DeveloperGuide.md` (raw, `main` branch) and the `0.19.0` git tag's `LanguageServerFactory.java`/`LanguageServerManager.java` — custom `@JsonRequest` pattern, confirmed present at the pinned version — HIGH confidence
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/BbjComposerServer.java`, `BbjLanguageServerFactory.java` (this repo) — existing precedent for #571's fix shape — HIGH confidence (primary source, own codebase)
- `bbj-vscode/src/language/composer-commands.ts` (this repo) — LS-side custom-request dispatch precedent — HIGH confidence (primary source, own codebase)
- `bbj-intellij/build.gradle.kts`, `settings.gradle.kts`, `gradle/wrapper/gradle-wrapper.properties`, `src/test/java/.../lsp/*.java` (this repo) — current pinned versions and existing 7-class JUnit 5 test suite shape — HIGH confidence (primary source, own codebase)

---
*Stack research for: v4.2 IntelliJ Burn-down (21 open PRIO 1/2 issues)*
*Researched: 2026-09-03*
