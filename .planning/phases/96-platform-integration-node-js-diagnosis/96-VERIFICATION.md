---
phase: 96-platform-integration-node-js-diagnosis
verified: 2026-09-20T15:30:00Z
status: human_needed
score: 5/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 4/5
  gaps_closed:
    - "On a real Windows machine with no Node.js configured, the editor banner's 'Download Node.js' action produces a working node.exe beside its .sha256 sidecar and the language server starts afterward."
  gaps_remaining: []
  regressions: []
deferred: []
behavior_unverified_items: []
human_verification:
  - test: "A Node.js path configured to an older-than-minimum-version runtime no longer starts the language server on real Windows; it falls through to a detected or downloaded candidate."
    expected: "Language server starts off the detected/cached runtime instead of the rejected too-old configured one; no silent launch on an unsupported runtime."
    why_human: "Still not exercised in the 2026-09-20 debug/attestation sessions either — 96-07-SUMMARY.md item D6 and the two resolved debug files' checkpoints cover only the auto-install path and the restart/relaunch defects, not a manually configured too-old Node path. NodeExecutableResolverVersionGatingTest proves the resolver-level decision; the end-to-end IDE-visible startup path on Windows remains unconfirmed."
  - test: "With the plugin's Node.js cache/data directory made unwritable, the missing-Node banner names the cache problem and offers no 'Download Node.js' action."
    expected: "Banner text names the inaccessible-cache reason distinctly from 'nothing found', and its action list omits the Download Node.js button entirely."
    why_human: "Still not exercised in the later sessions — the Windows attestation and the follow-up restart-defect diagnosis both used a normally-writable data directory. NodePresentationTest proves the seam's decision logic; the real banner rendering with a genuinely unwritable directory on Windows has not been confirmed."
  - test: "The server-crash banner appears while the IDE is indexing (dumb mode) with the server in a crashed state."
    expected: "Banner renders during an active indexing pass, not only after indexing completes."
    why_human: "Still not exercised — the attested sessions confirmed crash detection and auto-restart (killing node.exe logs 'stopped unexpectedly' and the server restarts) but not that the banner specifically renders during an active indexing pass. DumbAware wiring remains structurally correct and reviewed only."
  - test: "All four editor notification banners (missing BBj home, missing/unusable Node, server crashed, java-interop unavailable) checked together in one session, including Phase 95's wrong-peer wording on the java-interop banner."
    expected: "Each banner appears and disappears independently and correctly when its triggering condition is present/absent, with no cross-banner interference."
    why_human: "Still not run together — individual banners (crash, missing-Node) were spot-checked across three separate Windows sessions (96-07 attestation, the language-server-startup debug session, the restart/relaunch debug session), but the full four-banner sweep with Phase 95's status-varying wording has never been run in one pass."
---

# Phase 96: Platform Integration and Node.js Diagnosis Verification Report

**Phase Goal:** The plugin's platform-integration surfaces stop wasting resources and stop misleading —
a reused TextMate bundle directory, no inert settings page, one notification-provider base — and a
developer without a usable Node.js is shown the real diagnosis, with the auto-install path finally
attested on real Windows.

**Verified:** 2026-09-20
**Status:** human_needed
**Re-verification:** Yes — after gap closure (previous report: `gaps_found`, 4/5, PLAT-06 failed)

## Goal Achievement

### Re-verification Summary

The previous verification (2026-09-20T00:00:00Z) found truths 1-4 (PLAT-01 through PLAT-05) genuinely
met and truth 5 (PLAT-06, the Windows attestation) **failed**: the Node.js download half worked but the
language server did not start afterward, and that report attributed the missing diagnosis to
`BbjLanguageServer`'s Node-path diagnostics using `java.util.logging.Logger` — a claim since refuted
(see the correction below).

Since that report, a dedicated debug session (`.planning/debug/resolved/bbj-language-server-does-not-s.md`)
found and fixed the actual root cause, and a second debug session
(`.planning/debug/resolved/restart-duplicate-node-launches.md`) found and fixed an independent defect
surfaced during the same Windows round-trip. Both were re-attested on the maintainer's real Windows
machine. This re-verification focuses full three-level scrutiny on the previously-failed truth and
performs a regression pass over the rest.

### Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A second IDE launch reuses the cached TextMate bundle directory instead of allocating a fresh temp directory and re-copying its five files; abandoned directories are cleaned up. | ✓ VERIFIED (regression) | No production file under `bbj-intellij/src/main/java/com/basis/bbj/intellij/TextMateBundleCache.java` or `BbjTextMateBundleProvider.java` was touched by any commit since the previous verification (`git log 76db996b..HEAD` touches only `BbjServerService.java`, `BbjLanguageServer.java`, `BbjComposerService.java`, two test/guard files, `bbj-vscode/package.json`/`package-lock.json`, a new vitest test, and docs/todos/WINDOWS.md). `TextMateBundleCacheTest` re-run green in this session as part of the full `./gradlew test` (1076/0/0). |
| 2 | Customizing a colour under Settings › Editor › Color Scheme › BBj visibly changes highlighting — or the page is gone entirely. | ✓ VERIFIED (regression) | `BbjColorSettingsPage.java` still absent from disk; `plugin.xml` unchanged since previous verification. No regression possible — no commit touched this area. |
| 3 | The three editor notification providers share one base carrying the file-type guard and panel construction; each banner still appears/disappears in exactly the conditions it did before. | ✓ VERIFIED (recorded deviation, regression) | `BbjNotificationProviderBase.java` and its four subclasses unchanged since previous verification. `BbjNotificationProviderBaseSourceGuardTest` and `BbjMissingNodeNotificationSourceGuardTest` re-run green as part of the full suite. |
| 4 | A developer whose Node.js is unusable is shown the diagnosis that matches reality; "not yet downloaded" and "cache directory inaccessible" are distinguishable to every caller; a configured-but-unusable path either consults the cached download or deliberately does not, with the decision recorded. | ✓ VERIFIED (regression) | `NodeExecutableResolver.java`/`NodePresentation.java` unchanged in this window (the fixes since target `BbjLanguageServer.java`'s launch/diagnostics path and `BbjServerService.java`'s restart path, not the resolver/presentation seam itself). `NodeExecutableResolverVersionGatingTest` and `NodePresentationTest` re-run green as part of the full suite. |
| 5 | On a real Windows machine with no Node.js configured, the "Download Node.js" action produces a working `node.exe` beside its `.sha256` sidecar and the language server starts afterward. | ✓ VERIFIED | **Gap closed.** Root cause found and fixed: `BbjServerService.doRestart()` stopped the language server through LSP4IJ's one-argument `LanguageServerManager.stop(String)`, whose `StopOptions.DEFAULT.willDisable=true` **disabled the server definition** on every restart (confirmed against the pinned `lsp4ij-0.21.0` jar via a JUnit probe of the vendor defaults, not read from docs). Nothing in `LanguageServerManager.start(...)` re-enables a definition — only `LanguageServerWrapper.restart()` does, and only when a wrapper is already registered — so on the very first restart after a Node download (no wrapper yet registered) the definition stayed disabled for the rest of the IDE session: LSP4IJ silently filtered it out of every later start, no process ever spawned again, nothing was logged. Fixed in commit `796a3f6f`: `doRestart()` now stops with `new LanguageServerManager.StopOptions().setWillDisable(false)`, runs the start from a `finally` block, and both `BbjLanguageServer` and `BbjServerService` were switched from `java.util.logging.Logger` to `com.intellij.openapi.diagnostic.Logger` with full decision logging (confirmed in source: `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java:305` calls `setWillDisable(false)`; both files import `com.intellij.openapi.diagnostic.Logger`, zero `java.util.logging` imports remain). **Re-attested on real Windows** (`.planning/debug/resolved/bbj-language-server-does-not-s.md`, evidence entry 2026-09-20T14:30:00Z): clean IntelliJ IDEA 2026.2.2 on Windows 10, no Node configured or on PATH, build `bbj-intellij-0.1.0.zip` sha256 `462a4d39e970a478cb376e8c886874de8d37689431d1c2a1976ab2f0977a071b` (commit `796a3f6f`). Maintainer's words: "It's working fine now, all tests worked from a clean intellj. ... after every forced restart it came up correctly with completion, hints, code assistance etc." `idea.log` lines 1736-1892 show the download completing at 10:27:34, "Using the CACHED Node.js executable", launch "stopped -> started" at 10:27:43 in the SAME session as the download, and five further forced restarts each reaching "started" within ~0.6s. A second, independent defect surfaced during that same attestation (duplicate node launches / unanswered shutdown during rapid Search Everywhere keystrokes) was separately root-caused (a JSON-RPC serialization mismatch across duplicate `vscode-jsonrpc` copies causing cancelled requests to be malformed) and fixed in `8fe4da25` + `e109c9ee`, and was itself re-attested green on Windows (`.planning/debug/resolved/restart-duplicate-node-launches.md`, verification section: "only banners in the logs that are expected. not anymore per keystroke", zero "Timeout error while shutdown", zero "Stream Closed" in the follow-up session). `.planning/WINDOWS.md` entry id 3 status is now `fixed` (resolved_at `2026-09-20T08:35:33.376Z`; ledger counts open=1, fixed=2, total=3 — the remaining open entry, id 1, is the unrelated Phase 70 item). `REQUIREMENTS.md` PLAT-06 now shows `[x]` and `Complete` in the traceability table. |

**Score:** 5/5 truths verified (truth 3 verified with the previously-recorded, reasoned deviation from its literal wording; truth 5's gap is closed).

**Correction to the previous report:** the prior verification's truth-5 evidence repeated 96-07-SUMMARY.md
finding 7's claim that "`java.util.logging.Logger` diagnostics never reach `idea.log`." The debug session
that closed this gap tested that claim directly against the maintainer's own log and **refuted** it: a
third-party JUL logger's WARN line *did* appear in `idea.log`, because IntelliJ configures the JUL root
logger and routes third-party JUL records at INFO+ through. The real reason nothing was visible is that
`resolveNodePath` only ever logged rejections, and a totally-empty candidate set (nothing configured,
nothing on PATH, nothing downloaded) produced zero rejections to log. Switching to the platform logger
was still the right move for category control and consistency, but it was not, by itself, the fix. This
report does not repeat the earlier (incorrect) claim as fact; see
`.planning/debug/resolved/bbj-language-server-does-not-s.md`, "Eliminated" section, first entry.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java` | Restart no longer disables the server definition | ✓ VERIFIED | `doRestart()` calls `manager.stop(SERVER_ID, new LanguageServerManager.StopOptions().setWillDisable(false))` (line 305); start runs inside a `finally` block (line 319); imports `com.intellij.openapi.diagnostic.Logger`, 0 `java.util.logging` occurrences |
| `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServer.java` | Node-path decision fully logged on the platform logger | ✓ VERIFIED | Imports `com.intellij.openapi.diagnostic.Logger`, 0 `java.util.logging` occurrences |
| `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/BbjComposerService.java` | `resolveServer()` no longer force-restarts a healthy server | ✓ VERIFIED | Commit `e109c9ee` confirmed; source guard `BbjComposerServiceSourceGuardTest` extended and passing |
| `bbj-vscode/package.json` / `package-lock.json` | Single `vscode-jsonrpc` copy pinned, cancelled requests answered as JSON-RPC errors | ✓ VERIFIED | Commit `8fe4da25`; `bbj-vscode/test/lsp-protocol-single-copy.test.ts` exists and is exercised in the full vitest run (107/110 files passed; the 3 failing files are the pre-existing known-baseline environment failures, not this test) |
| `.planning/WINDOWS.md` | Entry id 3 closed once re-attested | ✓ VERIFIED | Entry id 3 status `fixed`, `resolved_at` set; frontmatter counts (open=1, fixed=2, total=3) match the JSON array rows exactly |
| `.planning/debug/resolved/bbj-language-server-does-not-s.md` | Root-cause diagnosis + fix + Windows re-attestation, resolved | ✓ VERIFIED | `status: resolved`; contains vendor-defaults JUnit probe evidence, source citations, and the verbatim Windows attestation transcript with idea.log line citations |
| `.planning/debug/resolved/restart-duplicate-node-launches.md` | Second defect found during the same attestation, diagnosed and fixed | ✓ VERIFIED | `status: resolved`; contains message-id-level trace proof and a separate Windows re-attestation |
| `.planning/REQUIREMENTS.md` | PLAT-06 marked Complete | ✓ VERIFIED | Checkbox `[x]`, traceability table row `PLAT-06 \| Phase 96 \| Complete` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `BbjServerService.doRestart()` | `LanguageServerManager.stop(String, StopOptions)` | non-disabling stop | ✓ WIRED | Source read confirms the 2-arg overload with `setWillDisable(false)`, replacing the previous 1-arg convenience call |
| `BbjComposerService.resolveServer()` | `LanguageServerManager.start` | non-forcing start, skip when already started | ✓ WIRED | Commit `e109c9ee` diff confirmed; guard test extended |
| `.planning/debug/resolved/bbj-language-server-does-not-s.md` | `.planning/WINDOWS.md` entry 3 | fix + attestation closes the open ledger entry | ✓ WIRED | Ledger entry `resolved_at` timestamp (08:35:33) matches the debug session's window; entry status `fixed` |
| `796a3f6f` fix commit | Windows re-attestation | same build sha256 cited on both sides | ✓ WIRED | Debug file cites `sha256 462a4d39...` for commit `796a3f6f`; the attestation evidence entry cites the identical sha256 and commit |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full IntelliJ suite re-run fresh in this verification session (not trusted from prior claims) | `cd bbj-intellij && ./gradlew test` | `Task :test` executed (not up-to-date); XML results summed: 1076 tests, 0 failures, 0 errors | ✓ PASS |
| Full bbj-vscode vitest suite re-run fresh in this verification session | `cd bbj-vscode && npx vitest run --maxWorkers=2` | 3 failed files / 107 passed (110); 12 failed / 1928 passed / 7 skipped tests | ✓ PASS (matches known local baseline: `linking.test.ts` 11 + `issue447-real-interop.test.ts` 1, both pre-existing interop-backend `getAllClassNames` environment drift per project memory, not a regression) |
| `setWillDisable(false)` fix actually present in source, not just claimed in debug notes | `grep -n "setWillDisable" BbjServerService.java` | Line 305: `manager.stop(SERVER_ID, new LanguageServerManager.StopOptions().setWillDisable(false));` | ✓ PASS |
| Debt-marker scan on every file touched since the previous verification | `grep -nE "TBD\|FIXME\|XXX\|TODO\|HACK\|PLACEHOLDER"` on `BbjLanguageServer.java`, `BbjServerService.java`, `BbjComposerService.java`, `package.json`, `lsp-protocol-single-copy.test.ts` | 0 matches in all 5 files | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|--------------|------------|-------------|--------|----------|
| PLAT-01 (#613) | 96-02 | TextMate bundle reuse + cleanup | ✓ SATISFIED | No regression; unchanged since previous verification, re-run green |
| PLAT-02 (#621) | 96-01 | Inert Color Scheme page removed | ✓ SATISFIED | No regression; unchanged since previous verification |
| PLAT-03 (#622) | 96-04 | Four providers share one base | ✓ SATISFIED (recorded deviation) | No regression; unchanged since previous verification, re-run green |
| PLAT-04 (#588) | 96-05/96-06 | Distinguishable Node diagnoses | ✓ SATISFIED | No regression; unchanged since previous verification, re-run green |
| PLAT-05 (todo) | 96-05/96-06 | Configured-but-unusable path consults cache | ✓ SATISFIED | No regression; unchanged since previous verification, re-run green |
| PLAT-06 (todo) | 96-03/96-07 + gap-closure debug sessions | Windows attestation | ✓ SATISFIED | Gap closed: root cause fixed (`796a3f6f`), re-attested PASS on real Windows (2026-09-20T14:30:00Z); `.planning/WINDOWS.md` entry 3 now `fixed`; `REQUIREMENTS.md` shows Complete |

No orphaned requirements found for this phase — REQUIREMENTS.md's traceability table maps exactly PLAT-01
through PLAT-06 to Phase 96, matching the six plans, and all six now read Complete.

### Anti-Patterns Found

None. Scanned every production file touched by the gap-closure commits (`BbjServerService.java`,
`BbjLanguageServer.java`, `BbjComposerService.java`, `package.json`, `lsp-protocol-single-copy.test.ts`)
for `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` markers — zero matches. No blocker-level findings.

### Human Verification Required

The Windows attestation (PLAT-06) and its follow-on debug sessions closed the phase's one BLOCKER gap,
but four items that 96-07-SUMMARY.md explicitly recorded as "NOT TESTED (outstanding human verification,
carried forward)" were **not** exercised by either of the two subsequent debug sessions — those sessions
were scoped to the language-server-startup blocker and the restart/relaunch defect, not to this list.
Carried forward unresolved:

### 1. Too-old configured Node.js startup rejection on real Windows

**Test:** Configure a Node.js path pointing at a runtime below the minimum supported version; start the IDE with a valid detected or cached Node.js also available.
**Expected:** The language server does not launch on the too-old configured runtime; it falls through and starts on the detected/cached candidate instead.
**Why human:** Requires a running IDE launch sequence on the target OS with a specific manual configuration; the resolver-level decision is unit-tested and passing, but the end-to-end startup behavior has still not been exercised on Windows in any of the three sessions to date.

### 2. Unwritable Node.js cache directory drops the Download action

**Test:** Make the plugin's `bbj-intellij-data/nodejs` directory unwritable, with no Node.js configured or detected, and open a BBj file.
**Expected:** The missing-Node banner names the cache-directory problem distinctly and does not offer a "Download Node.js" button.
**Why human:** Requires manipulating real filesystem permissions and observing rendered banner UI; not exercised in any of the three Windows sessions.

### 3. Crash banner during indexing

**Test:** Put the server into a crashed state, then trigger a full re-index (e.g. invalidate caches and restart).
**Expected:** The server-crash banner renders while indexing is in progress (dumb mode), not only after indexing completes.
**Why human:** Requires a real indexing pass in a running IDE; the `DumbAware` wiring is structurally verified and crash detection/auto-restart itself was attested working, but rendering specifically during an active indexing pass was not observed.

### 4. All four banners together, including Phase 95's wrong-peer wording

**Test:** In one session, trigger each of the four banners (missing BBj home, missing/unusable Node, server crashed, java-interop unavailable) and confirm each appears/disappears independently and that the java-interop banner's status-varying (wrong-peer) wording from Phase 95 still renders correctly.
**Expected:** All four banners behave correctly with no cross-interference.
**Why human:** UI rendering across multiple triggering conditions in one session; individual banners (crash, missing-Node) were spot-checked separately across the three Windows sessions to date, but the full four-banner sweep has never been run together.

### Gaps Summary

No gaps remain. All six of Phase 96's requirements (PLAT-01 through PLAT-06) are now genuinely and
observably complete in the codebase, and the one BLOCKER identified in the previous verification —
PLAT-06's failed Windows attestation — is closed:

A dedicated debug session found the real root cause (a restart path that silently and permanently
disabled the LSP4IJ server definition, confirmed against the pinned vendor jar's actual option defaults
rather than assumed from documentation) and fixed it in commit `796a3f6f`, along with switching the
plugin's Node-path and server-lifecycle diagnostics onto the platform logger so the failure class is
now self-reporting. The fix was re-attested on the maintainer's real Windows machine and passed: the
in-session download → restart → start sequence that used to dead-end now completes, and five further
forced restarts all came up correctly with completion, hints and code assistance working. A second,
independent defect surfaced during that same attestation (duplicate node launches from Search
Everywhere driving rapid feature-triggered restarts against a server that answered cancelled requests
with a malformed JSON-RPC result) was separately root-caused and fixed (`8fe4da25`, `e109c9ee`), and
was itself re-attested clean on Windows in a follow-up session.

`.planning/WINDOWS.md` entry id 3 is now `fixed`, and `REQUIREMENTS.md` correctly shows PLAT-06 as
Complete. The whole IntelliJ suite (1076 tests) and the bbj-vscode vitest suite were both re-run fresh
in this verification session rather than trusted from prior claims: 1076/0/0 and the known local
baseline of 12 pre-existing environment failures (interop backend `getAllClassNames` drift), respectively
— no regressions from the gap-closure changes.

This report does **not** carry the previous report's now-refuted claim that `java.util.logging.Logger`
diagnostics never reach `idea.log` — the debug session tested that claim directly against a real log and
found it false; the actual cause of the invisible diagnostics was that the total-failure code path logged
nothing at all, not that the log route was blocked.

**Status is `human_needed`, not `passed`,** because four human-verification items that 96-07-SUMMARY.md
explicitly deferred (too-old configured Node fallback, unwritable-cache banner wording, crash banner
during indexing, and the full four-banner sweep) remain untested on real hardware. None of these were
in scope for either gap-closure debug session, and none of the codebase evidence available to this
verifier can substitute for a human pass on Windows. Per the decision tree, human-verification items
take priority over an otherwise-clean score.

---

_Verified: 2026-09-20_
_Verifier: Claude (gsd-verifier)_
