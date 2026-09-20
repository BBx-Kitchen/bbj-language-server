# Phase 97: Release 0.16.0 & Milestone Close - Research

**Researched:** 2026-09-20
**Domain:** GitHub Actions release gate (VS Code + JetBrains Marketplace), IntelliJ/LSP4IJ lifecycle plumbing, vitest test-debt housekeeping
**Confidence:** MEDIUM — the release-mechanics half is HIGH (verified directly against the workflow files, the pinned vendor jar, and this environment); the crash-detection rework is MEDIUM/LOW in one specific spot (thread-safety, flagged below) precisely because it is "the only technically uncertain part" the phase description calls out.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Phase order is fixed: (1) folded-todo code wave + its verification and hand UAT →
  (2) one landing PR → (3) green Preview run + maintainer hand check → (4) maintainer dispatches
  Manual Release 0.16.0 → (5) release evidence + curated release notes → (6) maintainer smoke →
  (7) issue closure + milestone #7 close. No step starts before the previous one's gate is met.
- **D-02:** One PR carrying the whole branch lineage — Phases 93-96 source, the folded-todo fixes,
  and the planning docs. The branch must first be brought up to date with `origin/main` (one
  `Bump preview version` commit ahead). Reversibility: costly.
- **D-03:** The standing per-commit register check applies before push: grep the source/test diff
  for planning identifiers before push. GitHub issue numbers are fine.
- **D-04:** The PR body carries no `Fixes #nnn`/`Closes #nnn` keywords (see D-18), and does carry a
  readable summary of v4.4 including the folded todos (see D-21).
- **D-05:** `/gsd-ship` is bypassed. Plain `git push -u origin <branch>` + `gh pr create`.
  WINDOWS.md entry 1 stays open and untouched. Do not run `windows waive`.
- **D-06:** Pre-release gate after merge: the Preview workflow run triggered by the merge must
  finish green, and the maintainer installs that preview build in both IDEs for a quick sanity
  pass. No calendar soak period.
- **D-07:** The crash-detection rework ships in 0.16.0 only with: plain-JUnit seam tests, a
  whole-file source guard for the IDE-only wiring, an LSP4IJ coupling canary for the new hook, and
  a maintainer hand UAT (kill the node process / drop the connection in a running IDE). No Windows
  re-attestation required. Build both distributables before UAT and again from the final tree
  after any code-review fixes.
- **D-08:** No "pull it back out if it balloons" escape hatch. If the rework needs a change to
  `ExpectedStopGuard`'s classification semantics, that is a deviation to surface to the
  maintainer, not something to decide silently.
- **D-09:** `manual-release.yml` is not changed. `publish-vscode`/`publish-intellij` stay
  parallel.
- **D-10:** A written reconciliation runbook is produced before release dispatch, covering: VS
  Code published/JetBrains failed; JetBrains published/VS Code failed; both published but
  `tag-release` failed; tag pushed but `create-release` failed. Each path publishes the missing
  side from the failed run's own verified artifact, then tags/creates the release by hand.
  Constraint: artifacts have `retention-days: 1` — download all three via `gh run download
  <run-id>` first, before diagnosing anything.
- **D-11:** The maintainer dispatches Manual Release `0.16.0` from the Actions UI (blocking-human
  checkpoint). Before it, Claude confirms preconditions: landing PR merged; Preview run green;
  hand check passed; `origin/main` HEAD is the expected SHA; `package.json` on `main` is a 0.15.x
  lower than 0.16.0; no `v0.16.0` tag/release exists; runbook written. Claude watches the run with
  `gh` and reports; never runs `gh workflow run`.
- **D-12:** Failure rule tiered by where the run failed: `verify` fails → fix on branch+PR,
  re-dispatch as-is; exactly one publish fails → runbook, publish by hand, then tag+release by
  hand, never bump the version to paper over a half-release; `tag-release`/`create-release` fail →
  by hand per runbook. Every manual recovery step is a human checkpoint — no autonomous retries.
- **D-13:** Release notes: workflow's auto-generated notes land untouched first; Claude then drafts
  a short user-facing v4.4 summary, maintainer approves, then Claude applies via `gh release edit`
  keeping the install block.
- **D-14:** "Live" on JetBrains = upload accepted (green `publish-intellij`); the phase does not
  wait on the JetBrains review queue. IntelliJ smoke runs against `bbj-intellij-0.16.0.zip` from
  the v0.16.0 GitHub Release, not a marketplace install. Recorded override of ROADMAP criterion 3
  for the JetBrains side only; VS Code is installed from the Marketplace as written.
- **D-15:** The maintainer runs `QA/SMOKE-TEST-CHECKLIST.md` by hand in a clean profile of each
  IDE. Claude prepares a filled-in copy of the "Test Run Result"/"Test Information" blocks. No
  Playwright pass, no Windows pass.
- **D-16:** Artifact identity: Claude records sha256 of the `.vsix`/`.zip` attached to the release,
  plus workflow run id and released commit SHA; smoke verdict is recorded against those hashes (the
  96-08 re-UAT precedent). No download-and-compare of the Marketplace VSIX.
- **D-17:** A smoke finding is classified by the maintainer, not Claude. Blocking → fix lands via
  PR, ships in next preview immediately, milestone stays open until then. Non-blocking → filed as
  an issue for the next milestone; 0.16.0 stands and the milestone closes.
- **D-18:** Issues close only after the release run is green and the smoke verdict is in.
- **D-19:** Claude drafts all 21 closing comments into one review file in the phase directory; the
  maintainer reads/edits it; after an explicit "go" Claude posts each comment and closes each issue
  one at a time, then closes milestone #7. One approval gate for the batch.
- **D-20:** Comment shape: 2-4 sentences — "Fixed in 0.16.0" with the release link, what the user
  now sees, and the fixing commit SHA(s) on `main`. Issues #616, #618, #620, #622, #594, #593
  additionally say plainly what was done instead and why. No planning identifiers in any comment.
- **D-21:** The folded todos get no GitHub issues. User-visible ones appear in curated release
  notes and the landing PR body only. Milestone #7 stays at exactly 21 issues. Todo files move from
  `.planning/todos/pending/` to `.planning/todos/completed/`.

### Claude's Discretion

- Merge method for the landing PR (repo has been squash-merging).
- Branch name for the landing PR, and whether folded-todo work continues on the current branch or
  a new `gsd/phase-97-…` branch cut from its HEAD (not from `origin/main`).
- Exact wording/file name of the runbook, the precondition checklist, and the closing-comment
  review file.
- Plan/wave split (human checkpoints are not discretionary).
- For `bbj/bbjcplAvailability`: no-op `@JsonNotification` handler (preferred) versus surfacing
  BBjCPL availability the way VS Code does (a new capability — not preferred).

### Deferred Ideas (OUT OF SCOPE)

- Serializing `publish-intellij` before `publish-vscode` — declined for 0.16.0.
- Raising `retention-days` on release artifacts — out of scope under D-09.
- Confirming the JetBrains Marketplace listing shows 0.16.0 once review clears — not a phase gate.
- Surfacing BBjCPL availability in the IntelliJ UI the way VS Code does.
- Windows re-attestation of the crash-detection rework.
- Reconciling the half-released 0.15.0; the v4.1 advisory publication/CVE decision (PROC-03,
  maintainer-owned); any change to `manual-release.yml`'s job graph; fixing/waiving WINDOWS.md
  entry 1.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REL-01 | Release 0.16.0 published to both marketplaces through SEED-002's single verification gate, no half-release, no orphaned tag | See "Release Mechanics" below: exact 5-job graph, version validator, artifact retention, and the reconciliation-runbook commands for each partial-failure path. |
| REL-02 | All 21 issues on milestone #7 closed, milestone itself closed | See "Release Mechanics → Milestone/issue closure" and D-18/D-19/D-20 verbatim above; no independent research needed beyond `gh` CLI syntax, which is standard. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Repo shape:** `bbj-vscode/` (TS/Langium extension + LS), `bbj-intellij/` (Kotlin/Java IntelliJ
  plugin via LSP4IJ), `java-interop/` (Java JSON-RPC :5008), `documentation/`, `examples/`, `QA/`.
- **Build/test commands** (run from the named directory):
  - `bbj-vscode`: `npm run langium:generate` after grammar changes; `npm run build`; `npm test`
    (BBj/Java tests skip unless reachable); `npm run test:bbj` (needs java-interop on :5008);
    `npx vitest run <file>` for a single file.
  - `java-interop`: `./gradlew build`; `./gradlew run` (starts :5008).
  - `bbj-intellij`: `./gradlew build`/`buildPlugin` — **fails fast** if
    `bbj-vscode/out/language/main.cjs` is missing (`verifyLanguageServerBundle` task, confirmed at
    `bbj-intellij/build.gradle.kts:121-162`).
- **Generated files:** never edit `bbj-vscode/src/language/generated/*` directly; regenerate via
  `npm run langium:generate`.
- **AST type constants:** Langium 4.x uses the `ClassName` string-type-constant form for `$type`
  checks; use `isXxx()` guards from `generated/ast.ts`.
- **Testing pattern:** Vitest + Langium `EmptyFileSystem`/`validationHelper`; `createBBjTestServices`
  for Java-interop-dependent tests. Every `.bbj` file under `bbj-vscode/test/test-data/` is
  auto-parsed by `example-files.test.ts` and must produce zero lexer/parser errors.
- **Shell and file-access rules (mandatory for every subagent this phase spawns):** use `Grep`,
  `Glob`, `Read` first; every shell path absolute and complete; never chain `cd` with
  grep/find/cat/sed/head/tail; `cd` only directly in front of a build tool
  (`cd bbj-intellij && ./gradlew …`, `cd bbj-vscode && npx vitest run …`); no blind recursive
  scans; never read `.env*`/`*.pem`/`*.key`/credential stores; `git add <exact path>` only, never
  `-A`/`.`.
- **Nothing in this phase's scope requires touching generated Langium artifacts or the AST.** The
  phase touches `bbj-intellij/src/main/java` (crash-detection rework, three small fixes),
  `bbj-vscode/test/` (housekeeping), and `.github/workflows/*.yml` (read-only — D-09 forbids
  edits).

## Summary

Phase 97 has two genuinely different halves that should be planned and verified separately, in the
order D-01 fixes: a **code wave** (six folded todos, entirely in `bbj-intellij/` plus two
`bbj-vscode/test/` housekeeping items) that must be complete, tested and hand-UAT'd before any PR
opens, and a **release-mechanics wave** (landing PR → preview dress rehearsal → manual release →
runbook-gated reconciliation → smoke → issue/milestone closure) that is almost entirely
human-checkpoint-gated automation Claude drives and reports on, not code Claude writes.

Of the six folded todos, four are small and mechanical (log-message fix, no-op notification
handler, one-line `setIndeterminate(false)` fix, and a bookkeeping close-out that is **already
green** — verified this session by running the test file directly). The fifth (test housekeeping
for `getAllClassNames`) needs a real but scoped fix to one test file plus an actual investigation
of `linking.test.ts`'s 11 failing "Interop related tests" — verified this session to still fail
identically to the documented baseline, but the investigation trail refutes the todo's own leading
hypothesis (see "Environment Verification" below). The sixth — moving the crash-detection status
feed from `BbjLanguageClient` (a `LanguageClientImpl` override, which LSP4IJ nulls before publishing
`ServerStatus.stopped` after an unexpected stop) to `LSPClientFeatures#handleServerStatusChanged`
(which LSP4IJ always calls, client-or-not) — is the one place this research found a real, unbuilt
design decision: moving the authoritative status feed off the EDT-serialized
`BbjLanguageClient.handleServerStatusChanged`'s `invokeLater` wrapper removes an **implicit
single-threading guarantee** that `BbjServerService.updateStatus`'s unsynchronized fields
(`currentStatus`, `previousStatus`, `crashCount`, `lastCrashTime`, `serverCrashed`) currently rely
on. This is the "only technically uncertain part" the phase description names, and this research
grounds it precisely (bytecode-level: `LanguageServerWrapper.updateStatus` calls the client
callback conditionally, then the client-features callback unconditionally, with no thread-hop of
its own) rather than leaving it to be discovered mid-implementation.

For the release mechanics: this research confirms directly against `manual-release.yml` that
`publish-intellij` **rebuilds** the plugin via `./gradlew publishPlugin` rather than uploading the
already-verified `intellij-plugin` artifact — exactly the CONTEXT's flagged concern. The IntelliJ
Platform Gradle Plugin 2.18.1's `publishPlugin` task publishes whatever `archiveFiles` resolves to
(default: `buildPlugin`'s output), and JetBrains Marketplace additionally exposes a documented
direct-upload HTTP API (`POST /api/updates/upload`, multipart `pluginId`/`file`/`channel`) that
takes an arbitrary zip and the existing permanent token — this is the faithful "publish the exact
verified bytes" path the runbook needs for the JetBrains-failed-but-VS-Code-published scenario, and
it sidesteps Gradle's rebuild-on-publish behavior entirely. Also confirmed directly by inspecting
git refs: the local unpushed branch's `bbj-vscode/package.json` is `0.15.3` while `origin/main`'s is
already `0.15.4` (one preview bump ahead) — landing the PR (D-02) will need to resolve this version
field the "right" way (take `origin/main`'s higher value), not let a naive merge/rebase silently
regress the tracked version.

**Primary recommendation:** Plan the crash-detection rework as its own small wave with an explicit
synchronization decision recorded up front (see "Architecture Patterns" below), scope the two test-
housekeeping todos separately (one is done, one needs investigation, not just a fix), and write the
JetBrains-side runbook step around the direct Marketplace upload API rather than a re-run of
`publishPlugin`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Language-server crash detection / status classification | IntelliJ plugin (client) | LSP4IJ vendor lifecycle (client-features hook) | Purely IDE-host wiring; the shared LS has no role — it is the *consumer's* job to notice its own supervised process died. |
| `bbj/bbjcplAvailability` handling | IntelliJ plugin (client) | Shared LS (sender, `bbj-vscode/src/language/bbj-document-builder.ts`) | Server-neutral notification; VS Code already has a real handler, IntelliJ needs at minimum a no-op so the log stays clean — no server change needed. |
| Node.js download progress reporting | IntelliJ plugin (client), UI-only | — | `ProgressIndicator` API misuse (`setFraction` without `setIndeterminate(false)`), entirely local to `BbjNodeDownloader`. |
| Release verification/publish/tag/GitHub Release | CI (GitHub Actions) | Maintainer (dispatch, smoke, approval) | `manual-release.yml`'s 5-job graph is the single source of truth; Claude drives and reports, never dispatches or force-publishes. |
| Test-fixture accuracy vs. live java-interop backend shape | `bbj-vscode/test/` (test tier) | java-interop backend (external, out of this repo's control) | The backend's shape changed (`getAllClassNames` added); the tests must adapt, not the shared LS. |
| Milestone/issue closure | GitHub (process tier) | Maintainer (approval gate) | Pure process automation behind a human "go" — no code tier involved. |

## Standard Stack

No new external packages are introduced by this phase. The crash-detection rework and the three
small fixes use APIs already pinned and fenced (LSP4IJ 0.21.0, `bbj-intellij/build.gradle.kts:34`;
IntelliJ Platform Gradle Plugin 2.18.1, `bbj-intellij/settings.gradle.kts:2`
`[VERIFIED: bbj-intellij/settings.gradle.kts:2]` — quoted verbatim: `id("org.jetbrains.intellij.platform.settings") version "2.18.1"`). The
test-housekeeping todos touch only existing vitest infrastructure. The release mechanics use `gh`
CLI (already relied on throughout this project) and, per this research's recommendation, a plain
`curl` call to the JetBrains Marketplace's documented upload endpoint (no new dependency — `curl`
is a standard CI/runbook tool).

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Re-running `./gradlew publishPlugin` by hand for a failed JetBrains publish | Direct `curl -F pluginId=… -F file=@…zip -F channel=… https://plugins.jetbrains.com/api/updates/upload` with the existing `JETBRAINS_MARKETPLACE_TOKEN` | The Gradle path rebuilds from the current source tree (not guaranteed byte-identical to what `verifyPlugin` checked, and requires re-running the whole build/verify chain by hand); the curl path uploads the *exact* artifact bytes downloaded from the failed run, which is what D-10's runbook actually promises ("publish … from the failed run's own verified artifact"). |
| Moving `BbjServerService.updateStatus`'s call site wholesale into the new `LSPClientFeatures` hook and deleting `BbjLanguageClient`'s override | Keeping both overrides, with `BbjLanguageClient`'s reduced to logging only (no `updateStatus` call) | Confirmed by bytecode read (`LanguageServerWrapper.updateStatus`, offsets 81-101) that LSP4IJ calls the client callback (when non-null) **and then unconditionally** the client-features callback for every status change — so if both call `BbjServerService.updateStatus(status)`, every transition where the client is still attached gets processed **twice**, corrupting crash-count/previousStatus bookkeeping. Exactly one call site must remain authoritative. |

## Package Legitimacy Audit

Not applicable — no new external packages are installed by this phase (Java, TypeScript, or
Gradle-plugin dependency). Skip the legitimacy gate.

## Architecture Patterns

### Crash-detection status feed — current vs. required data flow

```
TODAY (broken for unexpected stops):
  LanguageServerWrapper.stop()                     [LSP4IJ, any thread — see Threading note]
    ├─ updateStatus(stopping)  ─────────────────────────┐
    ├─ languageClient.dispose(); languageClient = null  │   (finally, BEFORE async body runs)
    └─ async shutdownAll() ─▶ updateStatus(stopped) ─────┤
                                                          ▼
                                     if (languageClient != null)     ◀── ALWAYS false here:
                                         languageClient.handleServerStatusChanged(stopped)   client was nulled above
                                     getClientFeatures().handleServerStatusChanged(stopped)  ◀── ALWAYS called
                                                          │
                                          (nobody today overrides this hook)
                                                          ▼
                                              BbjServerService.updateStatus() NEVER RUNS
                                              for the "stopped" transition that matters most.

REQUIRED:
  BbjLanguageServerFactory.createClientFeatures() returns an LSPClientFeatures subclass that
  overrides handleServerStatusChanged(ServerStatus) and calls
  BbjServerService.getInstance(project).updateStatus(status) directly (synchronously — see
  Threading note). BbjLanguageClient's existing override either goes away or keeps ONLY logging,
  never a second call to updateStatus().
```

### Threading note (the phase's one real open design question)

Verified this session by disassembling the pinned `lsp4ij-0.21.0.jar`
(`~/.gradle/caches/9.7.1/transforms/.../lsp4ij-0.21.0.jar`,
`com/redhat/devtools/lsp4ij/LanguageServerWrapper.class`, method `updateStatus`, bytecode offsets
0-104): the method does **no thread dispatch of its own** — it runs synchronously on whatever
thread called it. `stop()`'s async teardown (`shutdownAll`) runs via `CompletableFuture.runAsync`
with no executor (confirmed independently by the withdrawn upstream Report A in
`.planning/debug/resolved/lsp4ij-upstream-report-draft.md`, filed as
redhat-developer/lsp4ij#1672), which can land on `ForkJoinPool.commonPool()` **or** be picked up by
`ForkJoinPool.helpAsyncBlocker()` on a caller's thread that happens to be blocked under a
`ReadAction` — i.e. the thread that eventually calls `getClientFeatures().handleServerStatusChanged(stopped)`
is **not guaranteed to be, or not to be, the EDT**, and multiple LSP4IJ-internal callers can invoke
`start()`/`stop()` concurrently during a recovery storm (proven in the same debug session's Report
B / message-id trace: 3 "Launching" lines in 270 ms from independent callers).

Today, `BbjServerService.updateStatus`'s mutable state (`currentStatus`, `previousStatus`,
`crashCount`, `lastCrashTime`, `serverCrashed` — all plain, non-volatile fields,
`[VERIFIED: bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java:49-62]`)
is safe only because every call arrives through `BbjLanguageClient.handleServerStatusChanged`'s
`ApplicationManager.getApplication().invokeLater(...)` wrapper
(`[VERIFIED: bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageClient.java:48-56]`),
which serializes every call onto the EDT. `Lsp4ijOverrideSiteSourceGuardTest` pins this exact shape
today: `handleServerStatusChangedCallsSuperOnceAndDispatchesItsOwnWorkThroughInvokeLater` asserts
the override calls `super.handleServerStatusChanged(` once and `invokeLater(` once
(`[VERIFIED: bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijOverrideSiteSourceGuardTest.java:127-135]`).

Moving the authoritative call into `LSPClientFeatures#handleServerStatusChanged` and following the
debug session's own recommendation ("record the status synchronously … keep only the UI work
inside `invokeLater`") removes that implicit single-threading guarantee. The plan must record a
deliberate choice here — this is exactly the kind of "surface it, don't decide it silently"
situation D-08 calls out, even though D-08's own text is about the *classifier's* semantics
specifically:

- **Option A (recommended):** keep `updateStatus()`'s field-mutating section wrapped in the same
  monitor `ExpectedStopGuard` already uses internally (it is `synchronized` per-method,
  `[VERIFIED: bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/ExpectedStopGuard.java:46,51,63]`),
  by making `updateStatus`'s non-UI section `synchronized(this)` in `BbjServerService`, and keep
  only the UI-touching calls (`EditorNotifications`, notifications, message-bus publish) behind
  `invokeLater`. This matches the debug session's own proposed fix #3 and needs no LSP4IJ API beyond
  what is already pinned.
- **Option B:** keep dispatching the whole body through `invokeLater` from the new hook too (status
  quo behavior, but now correctly fed `stopped`). Simpler, but reintroduces the 20-76 ms deferral
  the debug session measured as a contributor to `BbjServerService`'s misleading ordering in logs,
  and does not fix the "the log shows a launch appearing to precede its own stop" symptom.
- Either way: **do not** leave `BbjServerService.updateStatus` un-synchronized while removing its
  single-caller guarantee — this is a latent data race, not merely a style question.

### LSP4IJ coupling fence — files a new hook touches

Confirmed by reading (not assuming) the three fencing tests this session:

1. `Lsp4ijImportAllowlistTest` — **12 files today, not 11.** The phase description says "eleven-file
   symbol-level import allowlist"; the actual test asserts
   `assertEquals(12, ALLOWLIST.size())` and the map literal
   (`[VERIFIED: bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijImportAllowlistTest.java:44-63]`)
   lists twelve `Map.entry(...)` pairs. `BbjLanguageServerFactory.java`'s current entry is
   `Set.of("LanguageServerFactory", "LanguageClientImpl", "LSPClientFeatures",
   "LSPDocumentLinkFeature", "StreamConnectionProvider")` (line 55-57 of that same file). Adding a
   `handleServerStatusChanged(ServerStatus status)` override to the anonymous `LSPClientFeatures`
   in that file's `createClientFeatures()` will newly reference `ServerStatus`, and this entry's
   `Set.of(...)` must add `"ServerStatus"` or the whole-suite Gradle gate reds.
2. `Lsp4ijOverrideSiteSourceGuardTest` — `createClientFeaturesBuildsExactlyOneDocumentLinkFeatureThenOneCompletionFeatureWithOneInitializeParamsOverride`
   only pins `setDocumentLinkFeature`/`setCompletionFeature`/`initializeParams` counts; it does
   **not** forbid a new override, so adding `handleServerStatusChanged` there does not break this
   specific assertion — but per D-07 the plan needs a **new** assertion in this file pinning the new
   override's shape (e.g. that it calls `BbjServerService.getInstance(project).updateStatus(` and,
   if Option A above is taken, that it does **not** wrap that call in `invokeLater`).
3. `Lsp4ijCouplingCanaryTest` — has no existing canary for `LSPClientFeatures.handleServerStatusChanged`
   (only for `LanguageClientImpl.handleServerStatusChanged`,
   `[VERIFIED: bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijCouplingCanaryTest.java:332-344]`).
   Per D-07 ("an LSP4IJ coupling canary for the new hook"), add a reflective pin:
   `LSPClientFeatures.class.getMethod("handleServerStatusChanged", ServerStatus.class)` returns
   `void` — confirmed present and public this session via `javap -p` on the pinned jar
   (`com.redhat.devtools.lsp4ij.client.features.LSPClientFeatures`:
   `public void handleServerStatusChanged(com.redhat.devtools.lsp4ij.ServerStatus);`
   `[VERIFIED: com/redhat/devtools/lsp4ij/client/features/LSPClientFeatures.class via javap, ~/.gradle/caches/9.7.1/transforms/810689ad0380ec07b3b66a6b60a6f6e3/transformed/com.redhat.devtools.lsp4ij-0.21.0/lsp4ij/lib/lsp4ij-0.21.0.jar]`).

### `ExpectedStopGuard` — does the classifier's input contract need to change?

`ExpectedStopGuard.classify(statusName, previousStatusName, nowMs)` itself needs **no** semantic
change: it is a pure function over two status-name strings and a timestamp, already unit-tested
independent of how those strings are produced
(`[VERIFIED: bbj-intellij/src/test/java/com/basis/bbj/intellij/concurrency/ExpectedStopGuardTest.java]`).
What **does** need fixing (todo 2, same files) is the caller's bug in *computing* the
`previousStatusName` argument: `BbjServerService.updateStatus` reads the field `previousStatus`
(which is only ever assigned at the very end of the previous call:
`previousStatus = currentStatus; this.currentStatus = status;`,
`[VERIFIED: bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java:206-207]`)
**before** that assignment runs for the current call — so the value fed to `classify()` and printed
in the log line is the status from **two calls ago**, not one. Traced through by hand this session:
call N's `classify()`/log line uses the field value that call `N-1` left behind at ITS end, which is
call `N-2`'s `currentStatus`. The correct "previous" value for call N's transition is call `N-1`'s
`currentStatus` (i.e. the field's value **before** line 207 overwrites it in the current call) — the
fix is to read `currentStatus` (not the `previousStatus` field) as the "from" state for both the log
line and the `classify()` call, then still perform the existing `previousStatus = currentStatus`
assignment for whatever bookkeeping (if any) still needs it.

**This is exactly the kind of change D-08 flags**: fixing it changes what `classify()` actually
receives on every call (today it silently receives a stale, two-behind value). Per the todo's own
text ("do not change the classifier input without a test that pins the intended behaviour") and
D-08, the plan must (a) add a test that pins the *correct* from-state before making the change, (b)
verify no existing passing test asserted the old (buggy) behavior, and (c) record this as a
surfaced deviation in the plan's SUMMARY rather than silently absorbing it — no test in this
codebase currently exercises `BbjServerService.updateStatus`'s field-staleness directly (only
`ExpectedStopGuard`'s own unit tests, which take clean string inputs and are unaffected).

### `bbj/bbjcplAvailability` no-op handler

Sender confirmed in the shared LS: `notifyBbjcplAvailability(available: boolean)`
(`[VERIFIED: bbj-vscode/src/language/bbj-notifications.ts:39-44]`, quoted verbatim: `_connection?.sendNotification('bbj/bbjcplAvailability', { available });`),
called once per session from `trackBbjcplAvailability()`
(`[VERIFIED: bbj-vscode/src/language/bbj-document-builder.ts:289-299]`). VS Code's handler
(`[VERIFIED: bbj-vscode/src/extension.ts:970-977]`) types the payload as `{ available: boolean }`.
The IntelliJ no-op belongs beside the other two `@JsonNotification` methods already on
`BbjLanguageClient.java` (`bbj/resolvedConfigPath` at line 68, `bbj/configReloadRequired` at line
106 — `[VERIFIED: bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageClient.java:68,106]`).
Per Claude's Discretion, prefer a true no-op: `@JsonNotification("bbj/bbjcplAvailability") public
void bbjcplAvailability(Object result) {}` — an untyped/ignored parameter is sufficient since the
handler does nothing; declaring a typed POJO (matching the `ConfigModels`-style convention) is
also acceptable if the executor prefers matching the file's existing style, but is not required
for a true no-op.

### Node.js `setFraction` fix

Confirmed exact call site: `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java:101`
(`[VERIFIED: bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java:101]`, quoted
verbatim: `indicator.setFraction(fraction);`), inside the lambda passed to `pipeline.install(...)`
at lines 98-102. Fix is `indicator.setIndeterminate(false);` once before the first `setFraction`
call in that lambda (or immediately before entering `pipeline.install(...)`) — `setIndeterminate`
is never called anywhere else in the plugin, confirmed by the todo file and not contradicted by
anything found this session.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Publishing an already-verified plugin zip to JetBrains Marketplace | A custom script that re-signs/re-uploads via Gradle internals | The documented `POST https://plugins.jetbrains.com/api/updates/upload` multipart endpoint (`pluginId`, `file`, `channel`, `Authorization: Bearer <token>`) | Official, documented, stable API; same permanent-token type the Gradle plugin already uses; zero new tooling. |
| Downloading a specific workflow run's artifacts for reconciliation | Manual browser download via the Actions UI | `gh run download <run-id> -n <artifact-name> -D <dir>` | Already the project's standard tool (`gh`), scriptable, and matches the 1-day retention window's urgency. |
| Detecting a real vs. false-positive java-interop backend on :5008 | A new bespoke protocol probe for this phase | Out of scope for Phase 97 — this is DEBT.md item 5, a pre-existing, separately-tracked debt item, not one of the six folded todos | Folding it in would silently expand scope beyond the maintainer's explicit "fold all six, nothing more." |

**Key insight:** every piece of "custom" work this phase would otherwise invent (publishing an
existing artifact, reconciling a partial release, closing issues in bulk) already has an official,
documented mechanism (`gh` CLI, the Marketplace upload API, `gh issue close`/`gh api .../milestones`)
— the runbook's job is to sequence those correctly under the D-10/D-12 failure rules, not to build
new tooling.

## Common Pitfalls

### Pitfall 1: Adding a second `BbjServerService.updateStatus()` call site double-processes transitions
**What goes wrong:** If the new `LSPClientFeatures#handleServerStatusChanged` override calls
`BbjServerService.updateStatus(status)` *in addition to* `BbjLanguageClient`'s existing override
(rather than instead of it), every status transition where the client is still attached (i.e. every
transition except the specific "already disposed" case the todo exists to fix) gets processed
**twice** — corrupting `crashCount`, `previousStatus`/`currentStatus`, and firing
`EditorNotifications`/console logs twice per real event.
**Why it happens:** confirmed via bytecode read of `LanguageServerWrapper.updateStatus` — the
client-features hook is called **unconditionally**, immediately after the (conditional) client
hook, for every status update that isn't deduplicated (see Pitfall 3).
**How to avoid:** exactly one call site to `BbjServerService.updateStatus()` should remain
authoritative after this rework. Remove the call from `BbjLanguageClient`'s override (keep the
override only if console logging there is still wanted) and make the new hook the sole feed.
**Warning signs:** doubled console log lines ("Server status: X -> Y" appearing twice per real
transition), `crashCount` reaching 2 (and abandoning auto-restart) after only one real crash.

### Pitfall 2: Losing the implicit EDT-single-threading guarantee
**What goes wrong:** `BbjServerService.updateStatus`'s fields are not `volatile`/`synchronized`
and are currently safe only because every caller arrives via `invokeLater`. Feeding the same method
from a vendor callback that can run on the EDT, a `ForkJoinPool` thread, or (per the still-open
upstream Report A) a caller's own `ReadAction`-blocked thread, potentially concurrently during a
restart storm, is a latent data race if left unguarded.
**Why it happens:** the move is being made specifically because the old (EDT-serialized) path
*doesn't receive* the status this phase cares about — but this also removes the serialization that
made the old code safe by accident.
**How to avoid:** decide and record explicitly (see "Threading note" above) whether the
non-UI section of `updateStatus` becomes `synchronized`, and add a test if practical (a
plain-JUnit concurrent-callers test in the spirit of `ExpectedStopGuardTest`'s own 8-thread test).
**Warning signs:** flaky crash-count assertions under concurrent test invocation; in production, a
crash notification firing zero or two times for one real crash during a restart storm.

### Pitfall 3: `LanguageServerWrapper.updateStatus` deduplicates identical consecutive statuses and skips `none`
**What goes wrong:** a naive assumption that every LSP4IJ-internal status change reaches the new
hook is wrong in two specific ways, confirmed by bytecode read: (a) if the new status equals the
wrapper's currently-stored status, the whole notification path is skipped (no lifecycle-manager
call, no client call, no client-features call); (b) a transition **to** `ServerStatus.none` is
never notified either (explicit `if (newStatus == none) isModified = false` branch). `ServerStatus`
now has **9** constants, not the 4 this plugin branches on
(`none, checking_installed, installing, installed, not_installed, starting, started, stopping,
stopped` — `[VERIFIED: com/redhat/devtools/lsp4ij/ServerStatus.class via javap]`, already pinned by
`Lsp4ijCouplingCanaryTest.theServerStatusConstantsThisPluginBranchesOnStillExist`'s
`assertEquals(9, ServerStatus.values().length, ...)`).
**Why it happens:** `LanguageServerWrapper.updateStatus`'s own early-exit logic
(`[VERIFIED: com/redhat/devtools/lsp4ij/LanguageServerWrapper.class via javap -c -l, method
updateStatus, bytecode offsets 9-104]`).
**How to avoid:** do not assume `handleServerStatusChanged` fires for every internal state change;
design the classifier and any new hand-UAT script around the 4 statuses this plugin already
branches on, and treat the 5 install-lifecycle statuses as out of scope (matching the existing
canary's own framing, which flags — but does not yet require handling — the newer constants).
**Warning signs:** an integration test that expects a callback for a status this plugin doesn't
already branch on, or expects a duplicate consecutive status to produce a second log line.

### Pitfall 4: `publishPlugin` in `manual-release.yml` rebuilds, it does not republish
**What goes wrong:** assuming a runbook step of "just re-run the IntelliJ publish job" republishes
the exact bytes `verifyPlugin` already checked. It does not — `publish-intellij`'s only step is
`./gradlew publishPlugin -Pversion=... -PintellijPlatformPublishingToken=...`
(`[VERIFIED: .github/workflows/manual-release.yml:203-207]`), which (per the IntelliJ Platform
Gradle Plugin 2.18.1 docs — `[CITED: plugins.jetbrains.com/docs/intellij/tools-intellij-platform-gradle-plugin-tasks.html]`)
publishes whatever `archiveFiles` currently resolves to, defaulting to `buildPlugin`'s freshly
rebuilt output — a new zip, built from whatever source tree/commit the runner happens to check out
at that moment, not the artifact `verify` already validated.
**Why it happens:** the workflow's `publish-intellij` job doesn't even download the `intellij-plugin`
artifact (only `create-release` does, for the GitHub Release assets) — it downloads only
`language-server` and rebuilds the plugin around it.
**How to avoid:** for a by-hand reconciliation of a failed JetBrains publish, use
`gh run download <run-id> -n intellij-plugin` to get the exact verified zip, then upload it
directly via `curl -F pluginId=30033 -F file=@bbj-intellij-0.16.0.zip
https://plugins.jetbrains.com/api/updates/upload -H "Authorization: Bearer $JETBRAINS_MARKETPLACE_TOKEN"`
(channel omitted = stable/default, matching the release build's own `channels` config) rather than
re-running `./gradlew publishPlugin` from a possibly-different tree state.
**Warning signs:** a "reconciled" JetBrains upload whose zip sha256 doesn't match the one recorded
from the original `verify` run's `intellij-plugin` artifact.

### Pitfall 5: The landing PR will carry a package.json version regression unless resolved deliberately
**What goes wrong:** the local, unpushed branch's `bbj-vscode/package.json` reads `"0.15.3"`
(`[VERIFIED: git show HEAD:bbj-vscode/package.json, checked 2026-09-20]`) while `origin/main`'s
already reads `"0.15.4"` (`[VERIFIED: git show origin/main:bbj-vscode/package.json, checked
2026-09-20]` — `origin/main` is one commit ahead of the merge base via `d4a335ac Bump preview
version`). A merge/rebase that resolves this field naively (or a squash that simply takes the
feature branch's version) would silently regress the tracked version from 0.15.4 to 0.15.3.
**Why it happens:** `preview.yml` bumps and commits the patch version on every push to `main`
independently of feature-branch work; the feature branch was cut before that bump landed.
**How to avoid:** D-02 already requires bringing the branch up to date with `origin/main` before
opening the PR — when resolving this specific line, keep the higher (`origin/main`) value,
`0.15.4`, not the branch's `0.15.3`. It is not release-blocking either way (0.16.0 is greater than
both), but it is an accurate-history / no-silent-regression concern worth a register-check-style
verification step.
**Warning signs:** the merged PR's `package.json` version is lower than what `origin/main` had
immediately before the merge.

## Code Examples

### LSP4IJ status hook, verified signature (javap on the pinned jar)

```
// com.redhat.devtools.lsp4ij.client.features.LSPClientFeatures (0.21.0, publicly overridable)
public void handleServerStatusChanged(com.redhat.devtools.lsp4ij.ServerStatus);

// com.redhat.devtools.lsp4ij.client.LanguageClientImpl (existing override site, unchanged)
public void handleServerStatusChanged(com.redhat.devtools.lsp4ij.ServerStatus);
```
Both exist independently; overriding one does not require touching the other. Source:
`~/.gradle/caches/9.7.1/transforms/810689ad0380ec07b3b66a6b60a6f6e3/transformed/com.redhat.devtools.lsp4ij-0.21.0/lsp4ij/lib/lsp4ij-0.21.0.jar`.

### `manual-release.yml`'s exact job graph (verified, not to be modified — D-09)

```
verify (build+test+package VS Code, buildPlugin+verifyPlugin IntelliJ; uploads
        language-server, vscode-extension, intellij-plugin, retention-days: 1)
  ├─▶ publish-vscode   (downloads vscode-extension; npx vsce publish --packagePath)
  └─▶ publish-intellij (downloads language-server ONLY; ./gradlew publishPlugin — REBUILDS)
         both feed into:
tag-release   (needs verify + BOTH publishes; commits package.json bump, tags vX.Y.Z, pushes)
  └─▶ create-release (needs verify + both publishes + tag-release; downloads vscode-extension
                       + intellij-plugin; gh release create with fixed install-block notes)
```
Source: `.github/workflows/manual-release.yml:16-285`, read in full this session.

### JetBrains Marketplace direct-upload runbook command (for a failed `publish-intellij`)

```bash
# 1. Download the exact artifact verify already checked (retention-days: 1 — do this first).
gh run download <run-id> -n intellij-plugin -D ./reconcile

# 2. Upload those exact bytes directly (bypasses Gradle's rebuild-on-publish).
curl -i \
  --header "Authorization: Bearer $JETBRAINS_MARKETPLACE_TOKEN" \
  -F pluginId=30033 \
  -F file=@./reconcile/bbj-intellij-0.16.0.zip \
  https://plugins.jetbrains.com/api/updates/upload
# channel omitted = default/stable channel, matching manual-release.yml's own (channel-less) config.
```
`[CITED: plugins.jetbrains.com/docs/marketplace/plugin-upload.html]` for the endpoint/verb shape;
plugin ID 30033 per `.planning/phases/97-release-0-16-0-milestone-close/97-CONTEXT.md`'s canonical
references (`bbj-language-support`, JetBrains plugin 30033). The token value is the same
`JETBRAINS_MARKETPLACE_TOKEN` secret already used by `-PintellijPlatformPublishingToken` — both are
official JetBrains Marketplace publishing paths for the same permanent-token type, but this
specific interchangeability was not independently confirmed against a live token this session
`[ASSUMED — see Assumptions Log A3]`.

## Environment Verification (this session, targeted runs only — cwd = bbj-vscode)

Per the phase's explicit instruction, the whole vitest suite was **not** run. Three targeted files
were run instead, from `bbj-vscode`:

- `npx vitest run test/gradle-wrapper-hygiene.test.ts` → **19/19 passed.** Confirms todo 5
  (gradle-wrapper-hygiene stale fixture) is fully fixed already — the fixture now derives its
  "good" properties lines from the real `gradle-wrapper.properties` file at test time
  (`[VERIFIED: bbj-vscode/test/gradle-wrapper-hygiene.test.ts:28-53]`), so this todo is pure
  bookkeeping: move the file from `.planning/todos/pending/` to `.planning/todos/completed/`, no
  code change. Note: the committed wrapper is now Gradle **9.7.1** (Gradle 9 migration landed since
  the todo was filed against 8.13→8.14.5), further confirming the fixture is correctly
  self-deriving rather than hard-coded.
- `npx vitest run test/functional/issue447-real-interop.test.ts` → **1 failed, 1 passed**, exactly
  as documented: `capability detection: current server lacks getAllClassNames and degrades
  gracefully` asserts `ensureCompleteClassIndex()` is `false`; this session's live :5008 backend
  returns `true`. Confirms todo 6's issue447-specific claim is still live and needs the test
  rewritten to accept either backend shape (or probe live and assert accordingly) rather than
  hard-coding the old server's behavior.
- `npx vitest run test/linking.test.ts -t "Interop"` → **11 failed, 7 passed, 24 skipped**,
  matching the documented baseline exactly (`Could not resolve reference to JavaPackageLike named
  'Map'`/`'Entry'`, `getValue` unresolved). **Important refutement found this session:** the
  todo's own leading hypothesis — "the failure is in the LS code path taken when a complete class
  index is available" — does not hold up under a source check: `grep`-confirmed that
  `completeClassIndex`/`hasCompleteClassIndex(` are referenced **only** inside
  `bbj-vscode/src/language/java-interop.ts` itself (used solely by the missing-`use` quick-fix
  helpers `resolveClassCandidatesBySimpleName`/`findClassCandidatesByPrefix`); nothing in the
  scope/linking code path (`bbj-scope.ts`, `bbj-scope-local.ts`, `bbj-linker.ts`) consults it, so a
  complete class index being present cannot, by itself, change how `Map`/`Map.Entry`/`toString`
  resolve. The more likely explanation, per this project's own recorded memory
  (`java-interop-cold-resolution-gotcha`), is a test warm-up gap for specific classes, not a
  server-side behavior change gated on the index. **Recommendation for the plan:** scope this as a
  genuine investigation task (confirm/refute the warm-up hypothesis by adding an explicit warm-up
  call for `java.util.Map`/`Map.Entry` before the failing assertions and re-running just this file),
  not a one-line fix assumed in advance — and note explicitly in the plan that this repository's
  own DEBT.md item 5 (the `shouldRunBBjTests()` bare-TCP-connect false-positive) is a plausible
  independent contributor and is **out of scope** for this phase (not one of the six folded todos).
- `describe.runIf(isInteropRunning)` **does** gate `linking.test.ts`'s "Interop related tests" at
  suite level today (`[VERIFIED: bbj-vscode/test/linking.test.ts:15,295]`) — DEBT.md item 5's claim
  that "linking.test.ts's `describe` is currently unconditional" did not hold up under a direct
  read this session; flag this as a possibly-stale DEBT.md line for the maintainer, not something
  this phase needs to fix.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The recommended synchronization approach (Option A: `synchronized(this)` around `updateStatus`'s non-UI section) is the right one, versus keeping the status quo `invokeLater`-wraps-everything shape (Option B) | Architecture Patterns → Threading note | Low — both are presented as options with tradeoffs; the plan should pick one and record it, not silently default to either. |
| A2 | A no-op `Object`-typed `@JsonNotification` parameter is acceptable style versus a typed POJO matching the `ConfigModels` convention | Architecture Patterns → bbjcplAvailability handler | Very low — purely stylistic, already flagged as Claude's Discretion in CONTEXT.md; either compiles and satisfies the todo. |
| A3 | The `JETBRAINS_MARKETPLACE_TOKEN` secret (a JetBrains Marketplace permanent token used today via `-PintellijPlatformPublishingToken`) is directly usable as the `Authorization: Bearer` value for the documented `/api/updates/upload` HTTP endpoint | Code Examples → JetBrains Marketplace direct-upload runbook command | Medium if wrong — the runbook step would need to fall back to the Gradle rebuild path (Pitfall 4) or manual web upload via the Marketplace UI instead; this should be spot-checked with a real (non-secret-revealing) dry run or at minimum a maintainer confirmation before the runbook is relied on live. |
| A4 | The linking.test.ts "Interop related tests" failure is a test-warm-up gap rather than a genuine LS-side regression triggered by the live backend's newer shape | Environment Verification | Medium — if the real cause turns out to be a genuine resolution bug (not warm-up), the scoped "investigation" task in the plan needs to become a real LS-side fix task instead of a test-only fix; the plan should build in a decision point after the investigation rather than assume the outcome. |

## Open Questions

1. **Does `ConsoleView.print()` (used throughout `BbjServerService.logToConsole`) tolerate being
   called from a non-EDT thread?**
   - What we know: `notifyCrash()` already calls `NotificationGroupManager...notify(project)`
     directly (not wrapped in `invokeLater`) from within `updateStatus()`'s CRASH branch — so if
     that pattern is already safe off-EDT today (when called via `BbjLanguageClient`'s
     `invokeLater`, it's actually on the EDT today, so this has never been exercised off-EDT), the
     same code path called synchronously from the new hook needs the same guarantee.
   - What's unclear: this session did not find or fetch authoritative IntelliJ Platform SDK docs
     confirming `ConsoleView.print()`/`Notification.notify()` are safe off-EDT; it is commonly
     assumed platform convention but not verified here.
   - Recommendation: either confirm via the IntelliJ Platform SDK docs during planning, or default
     to Option B's simpler "still invokeLater everything" shape until this is confirmed, accepting
     the smaller deferral-related symptom as a known, documented tradeoff.

2. **Should the todo-6 investigation for `linking.test.ts`'s 11 failures be scoped as "fix" or
   "investigate and report"?**
   - What we know: the failures reproduce exactly as documented, and this session refuted the
     todo's own leading hypothesis (complete-class-index code path) via a direct source check.
   - What's unclear: whether the actual root cause (most likely the warm-up gotcha, per project
     memory) is fixable within this phase's time budget, or needs its own debug session.
   - Recommendation: scope a small, time-boxed investigation task; if warm-up fixes it, ship the
     fix; if not, downgrade todo 6 to "issue447 test fixed, linking.test.ts failure re-filed as a
     new todo" rather than blocking the phase on an open-ended investigation — this keeps D-07/D-08's
     "surface deviations, don't silently descope" spirit for a todo that isn't the crash-detection
     rework.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `gh` CLI | Release-run monitoring, artifact download, issue/milestone closure | ✓ (used throughout this project already) | — | — |
| java-interop on :5008 | Todo 6 investigation, `npm run test:bbj` | ✓ (port open, live in this devcontainer) | — | — |
| LSP4IJ 0.21.0 jar (for canary/reflection work) | Crash-detection rework's coupling canary | ✓ — present in `~/.gradle/caches/{8.14.5,9.7.1}/transforms/.../lsp4ij-0.21.0.jar` and in `bbj-intellij/build/idea-sandbox/*/plugins/lsp4ij/lib/` | 0.21.0 | — |
| Windows machine | PLAT-06 attestation, WINDOWS.md entry 3 | N/A to this phase — D-07 explicitly requires no Windows re-attestation for the crash-detection rework | — | — |

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework (bbj-vscode) | Vitest 4.1.10, config `bbj-vscode/vitest.config.ts` |
| Framework (bbj-intellij) | JUnit 5 (`junit-bom:6.1.3`) via Gradle `useJUnitPlatform()`, `bbj-intellij/build.gradle.kts:39-46` |
| Quick run (bbj-vscode) | `cd bbj-vscode && npx vitest run <file>` |
| Quick run (bbj-intellij) | `cd bbj-intellij && ./gradlew test --tests <ClassName>` |
| Full suite (bbj-vscode) | `cd bbj-vscode && npm test` (RUN_BBJ_TESTS unset → auto-detect; use `RUN_BBJ_TESTS=0` for a deterministic 12-failure baseline per DEBT.md) |
| Full suite (bbj-intellij) | `cd bbj-intellij && ./gradlew test --rerun-tasks` (per Phase 94/96 standing practice — avoids an UP-TO-DATE no-op masking a stale green) |

### Phase Requirements → Verification Map

| Req/Item | Behavior | Verification Type | Command | File Exists? |
|----------|----------|-------------------|---------|-------------|
| Todo 1 (crash detection) | `stopped` transition after unexpected disconnect reaches `BbjServerService.updateStatus` and classifies CRASH | plain-JUnit seam + source guard + coupling canary (D-07) | `./gradlew test --tests Lsp4ijCouplingCanaryTest --tests Lsp4ijOverrideSiteSourceGuardTest --tests BbjServerServiceRestartSourceGuardTest` | New assertions needed in existing files — see Architecture Patterns |
| Todo 1 (crash detection) | Real-world confirmation | human-checkpoint (D-07 hand UAT: kill node process / drop connection in a running IDE) | manual, both distributables built first | N/A — human only |
| Todo 2 (stale log) | Log line prints the true from-state | new pinning test (per todo's own instruction) | `./gradlew test --tests ExpectedStopGuardTest` (or a new BbjServerService-scoped test) | New test needed |
| Todo 3 (bbjcplAvailability) | No `Unsupported notification method` WARN in idea.log on server start | manual log inspection during D-07's hand UAT (shared session) | N/A | — |
| Todo 4 (setFraction) | No `IllegalStateException` trace during a Node download | manual observation during Node-download hand test, or a plain-JUnit test on `BbjNodeDownloader`'s indicator interactions if one already exists | `./gradlew test --tests '*BbjNodeDownloader*'` | Check for existing test file first |
| Todo 5 (gradle-wrapper-hygiene) | Test file green | automated, already verified this session | `cd bbj-vscode && npx vitest run test/gradle-wrapper-hygiene.test.ts` | ✅ 19/19 passing |
| Todo 6 (interop test drift) | issue447 test accepts both backend shapes; linking.test.ts investigated | automated (rewritten test) + investigation report | `cd bbj-vscode && npx vitest run test/functional/issue447-real-interop.test.ts test/linking.test.ts -t Interop` | ❌ needs rewrite (issue447) + investigation (linking) |
| REL-01 | `verify` job green before any publish/tag/push | CI job dependency graph (`needs: verify`) — already structural, not new | `gh run watch <run-id>` | N/A — existing CI |
| REL-01 | Both marketplaces show 0.16.0, tag+release present | human checkpoint (D-11 dispatch) + `gh` verification (`gh release view v0.16.0`, `git tag`) | `gh release view v0.16.0`, `git ls-remote --tags origin v0.16.0` | N/A |
| REL-02 | 21 issues closed, milestone closed | human-approved batch (D-19) + `gh` execution | `gh issue close <n> --comment "..."`, `gh api -X PATCH repos/.../milestones/7 -f state=closed` | N/A |

### Sampling Rate

- **Per task commit (code wave):** targeted `./gradlew test --tests <touched classes>` and/or
  `npx vitest run <touched file>` — never the whole suite per this phase's explicit instruction.
- **Per wave merge:** full `./gradlew test --rerun-tasks` (IntelliJ) before the code wave is
  declared complete and before the landing PR opens (D-01 step 1's own gate).
- **Phase gate:** the D-06 Preview run (which runs the *same* `verify` job as the release, per the
  in-file comment on `manual-release.yml`'s header) is this phase's true full-suite gate for the
  release-mechanics half; there is no separate Nyquist "full suite" run beyond what CI already
  provides for the workflow-mechanics half.

### Wave 0 Gaps

- [ ] A new source-guard assertion in `Lsp4ijOverrideSiteSourceGuardTest.java` pinning the new
      `handleServerStatusChanged` override's shape once its design (Option A vs B) is chosen.
- [ ] A new reflective canary in `Lsp4ijCouplingCanaryTest.java` for
      `LSPClientFeatures.handleServerStatusChanged(ServerStatus)`.
- [ ] A new pinning test for the fixed `previousStatus`/`currentStatus` from-state (todo 2) —
      no existing test covers this bug today.
- [ ] Confirm whether a test already exists for `BbjNodeDownloader`'s progress-indicator
      interactions before assuming one needs to be written for todo 4.
- [ ] The `issue447-real-interop.test.ts` rewrite (todo 6) — no existing dual-backend-shape test.

## Security Domain

`security_enforcement` is not set in `.planning/config.json` (absent = enabled), so this section is
included, scoped to what this phase actually touches.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | No | This phase touches no auth flow. |
| V3 Session Management | No | N/A. |
| V4 Access Control | No | N/A. |
| V5 Input Validation | Marginal | The `bbjcplAvailability` no-op handler must not process an untrusted/malformed payload — a true no-op (ignore the parameter entirely) sidesteps this by construction. |
| V6 Cryptography | No | No cryptographic material is introduced. |

### Known Threat Patterns for this phase's stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| Secret leakage in workflow logs during manual runbook execution | Information Disclosure | Already enforced by `bbj-vscode/tools/check-workflow-secrets.mjs` / `workflow-secret-hygiene.test.ts` for the committed workflows; when running the runbook's `curl`/`gradlew` commands **by hand**, pass the token via an environment variable, never inline it on the command line where it could be logged or appear in shell history — matches the existing repo convention (`-PintellijPlatformPublishingToken="$JETBRAINS_MARKETPLACE_TOKEN"`, never a literal). |
| A half-published release masquerading as complete | Repudiation / Tampering (of release state) | This is the entire subject of D-09 through D-12 and SEED-002 — already the phase's central design, not something this research needs to add to. |
| LSP4IJ hook misuse spawning a new attack surface | Elevation of Privilege | Not applicable — `handleServerStatusChanged`'s payload is a vendor enum (`ServerStatus`), not attacker-controlled data; no new deserialization surface. |

## Sources

### Primary (HIGH confidence — verified this session via tool)

- `bbj-intellij/build.gradle.kts`, `bbj-intellij/settings.gradle.kts` — LSP4IJ 0.21.0 pin, IntelliJ
  Platform Gradle Plugin 2.18.1 pin, `verifyLanguageServerBundle` fail-fast task.
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/{lsp/BbjLanguageClient.java,
  lsp/BbjLanguageServerFactory.java, ui/BbjServerService.java,
  concurrency/ExpectedStopGuard.java, BbjNodeDownloader.java}` — read in full.
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/{Lsp4ijImportAllowlistTest.java,
  Lsp4ijCouplingCanaryTest.java, Lsp4ijOverrideSiteSourceGuardTest.java}`,
  `.../lsp/BbjServerServiceRestartSourceGuardTest.java`,
  `.../concurrency/ExpectedStopGuardTest.java` — read in full.
- `lsp4ij-0.21.0.jar` (`~/.gradle/caches/9.7.1/transforms/.../lsp4ij-0.21.0.jar`) — disassembled via
  `javap -p -c -l` for `LanguageServerWrapper`, `LSPClientFeatures`, `LanguageClientImpl`,
  `ServerStatus`.
- `.github/workflows/manual-release.yml`, `.github/workflows/preview.yml` — read in full.
- `bbj-vscode/test/workflow-secret-hygiene.test.ts`, `bbj-vscode/tools/check-workflow-secrets.mjs`
  — read in full.
- `bbj-vscode/test/gradle-wrapper-hygiene.test.ts` (run this session: 19/19 pass),
  `test/functional/issue447-real-interop.test.ts` (run: 1 fail/1 pass, matches baseline),
  `test/linking.test.ts -t Interop` (run: 11 fail/7 pass/24 skip, matches baseline).
- `bbj-vscode/src/language/{bbj-notifications.ts, bbj-document-builder.ts, java-interop.ts}`,
  `bbj-vscode/src/extension.ts` — read relevant sections.
- Git refs: `origin/main:bbj-vscode/package.json` (0.15.4), `HEAD:bbj-vscode/package.json` (0.15.3),
  `git tag --list` (latest release tag `v0.15.0`).
- `.planning/todos/pending/*.md` (all six folded todos), `.planning/debug/resolved/{lsp4ij-upstream-report-draft.md,
  restart-duplicate-node-launches.md, bbj-language-server-does-not-s.md}`, `.planning/DEBT.md`.

### Secondary (MEDIUM confidence)

- [Publishing a Plugin | IntelliJ Platform Plugin SDK — Tasks page](https://plugins.jetbrains.com/docs/intellij/tools-intellij-platform-gradle-plugin-tasks.html) — `publishPlugin`'s `archiveFiles` property and its default (defers to `buildPlugin`'s output when signing isn't configured).
- [Plugin upload API | JetBrains Marketplace Documentation](https://plugins.jetbrains.com/docs/marketplace/plugin-upload.html) — exact `curl`/multipart shape for `/api/updates/upload`.
- [gh CLI manual — `gh run download`](https://cli.github.com/manual/gh_run_download) — flag syntax.

### Tertiary (LOW confidence)

- The initial WebSearch summary claimed a `distributionFile` property exists on `publishPlugin` —
  **this was wrong** and was corrected by fetching the actual docs page directly (which names
  `archiveFiles`, not `distributionFile`). Recorded here only as a caution: do not trust an
  AI-summarized search result for Gradle-plugin task properties without confirming against the
  primary doc page, which this research did.

## Metadata

**Confidence breakdown:**
- Release mechanics (workflows, versioning, JetBrains upload API): HIGH — verified directly
  against the workflow files, the live git refs, and a fetched primary doc page.
- Crash-detection rework (LSP4IJ hook move, fencing-test impact): HIGH on the "what" (bytecode-
  verified call graph, exact fencing-test impact), MEDIUM on the "how" (the synchronization
  decision is presented as an explicit choice, not a single verified answer — this is the phase's
  named uncertain part).
- Test-housekeeping todos: HIGH on todo 5 (verified green) and on todo 6's issue447 half
  (verified failing exactly as documented); MEDIUM on todo 6's linking.test.ts half (root cause
  not conclusively identified this session — the leading hypothesis was refuted, not replaced with
  a confirmed one).

**Research date:** 2026-09-20
**Valid until:** ~7 days (fast-moving: this research depends on exact current git-ref state —
branch commit counts, package.json versions, live :5008 backend behavior — which will change as
soon as the code wave and landing PR proceed).
