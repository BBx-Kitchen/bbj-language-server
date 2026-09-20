---
status: diagnosed
phase: 96-platform-integration-node-js-diagnosis
source: [96-01-SUMMARY.md, 96-02-SUMMARY.md, 96-03-SUMMARY.md, 96-04-SUMMARY.md, 96-05-SUMMARY.md, 96-06-SUMMARY.md, 96-07-SUMMARY.md]
started: 2026-09-20T10:58:33Z
updated: 2026-09-20T12:05:00Z
build:
  intellij: bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip sha256 8853a959bd052571910ea99a23e07f8991a48b6973412ba281636c69d6601c6b (HEAD c7f798a8, last source commit e109c9ee)
  vscode: /tmp/bbj-lang.vsix sha256 a48166d559422de015ae323b5c9aa3a65bb5d18d77ab363ce1473d75d98d9266
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

[testing complete]

## Tests

### 1. TextMate bundle directory is reused across launches
expected: Install bbj-intellij-0.1.0.zip, open a BBj file, close the IDE, launch it again and open a BBj file. Syntax highlighting works on both launches. Under the IDE's plugins directory, bbj-intellij-data/textmate holds exactly the five bundle files plus one .plugin-version marker, and no new textmate-bbj* directory appeared in the IDE temp directory for the second launch.
result: pass
note: "Windows 10 / IDEA 2026.2: bbj-intellij-data\\textmate held syntaxes/, both language-configuration files, package.json and .plugin-version, all stamped 13:00 (first launch) after a second launch at ~13:02 -- nothing re-copied. A stray .idea directory (13:02) was the tester opening the folder in IntelliJ, not plugin output. The IDE temp directory was not separately listed; the provider no longer creates temp directories at all, and the sweep is unit-covered (Test 10)."
coverage_id: 96-02 D3

### 2. Too-old configured Node.js is rejected at startup
expected: In Settings, point the BBj Node.js path at a runtime older than Node 22 (e.g. a Node 18 or 20 binary) while a valid Node 22+ is also available (on PATH, or already downloaded into bbj-intellij-data/nodejs). Restart the language server. The server starts on the detected/cached Node 22+ runtime, not on the old one: completion and hover work, and idea.log names the configured candidate as rejected for being below the minimum version.
result: issue
reported: "with an old node.js configured in the path, I don't get offered to download the suitable one. The popup only suggests to \"Configue node.js\" . In our configuration dialog it's not obvious that I can simply remove the path, then restart and let our automatic do its job. The config dialog should somehow offer that next to the statement where it says \"Version too old: ....\""
severity: major
note: "The rejection itself was observed (the settings dialog shows 'Version too old'). The fall-through to a detected/cached Node 22+ was not confirmed in this run -- no usable alternative appears to have been present."
coverage_id: 96-05 D1, 96-07 D6

### 3. Banner and startup agree on a broken configured path
expected: With a valid downloaded Node.js in bbj-intellij-data/nodejs, set the configured Node.js path to a file that does not exist and restart the language server. No missing-Node banner appears on BBj files and the language server starts off the cached download. The banner never claims Node.js is missing while the server is running.
result: pass
note: "Tester: 'indeed an invalid exe in the field with the self-downloaded node present gracefully uses that one instead of that wrong version.' This also confirms the fall-through half of Test 2: with the downloaded Node.js present, an unusable configured entry is stepped over and the server starts on the cached runtime."
coverage_id: 96-06 D1

### 4. Unwritable Node.js cache drops the Download action
expected: With no Node.js configured and none on PATH, make bbj-intellij-data/nodejs unreadable/unwritable (or replace it with a plain file), then open a BBj file. The banner reads "The plugin's Node.js cache directory could not be accessed." and offers the configure-path and install-manually actions but NO "Download Node.js" button.
result: pass
coverage_id: 96-06 D2, 96-07 D7

### 5. Crash banner renders during indexing
expected: Put the language server into the crashed state, then trigger a full re-index (File > Invalidate Caches > Invalidate and Restart, or an equivalent long indexing pass) with a BBj file open. The server-crash banner is visible while the indexing progress bar is still running, not only after indexing completes.
result: pass
coverage_id: 96-04 D2 (indexing part), 96-07 D8

### 6. All four banners in one session
expected: In one IDE session trigger each banner in turn: missing BBj home, missing/unusable Node.js, server crashed, java-interop unavailable. Each appears when its condition holds and disappears when it is fixed, with no banner affecting another. The java-interop banner's sentence varies with the status, including Phase 95's wrong-peer wording when something other than java-interop answers on the port.
result: pass
coverage_id: 96-07 D9

### 7. Inert Color Scheme page deleted, module compiles, suite green
expected: BbjColorSettingsPage.java deleted and its plugin.xml registration removed; whole IntelliJ JUnit suite green; BbjTokenTypes.java byte-identical.
result: pass
source: automated
coverage_id: 96-01 D1

### 8. IntelliJ features doc describes TextMate-driven highlighting
expected: documentation/docs/intellij/features.md Customization section no longer points at the deleted Settings path.
result: pass
source: automated
coverage_id: 96-01 D3

### 9. Second launch reuses the stable bundle directory and opens zero resources
expected: A second launch at the same plugin version reuses the bundle directory instead of re-copying all five files.
result: pass
source: automated
coverage_id: 96-02 D1

### 10. Abandoned textmate-bbj directories are swept, nothing else
expected: Only direct matching child directories under the IDE temp path are removed; plain files, nested matches and symlink targets are untouched; a delete failure is logged and stepped over.
result: pass
source: automated
coverage_id: 96-02 D2

### 11. Windows zip branch installs only the exact expected entry
expected: A wrong-path decoy entry ending in the same file name is skipped.
result: pass
source: automated
coverage_id: 96-03 D1

### 12. Target.nodeExecutableName() is the single source of the executable name
expected: Windows/Unix end-to-end install cases stay green.
result: pass
source: automated
coverage_id: 96-03 D2

### 13. Failed temp-archive cleanup never masks the real exception
expected: The pipeline's real verification failure surfaces.
result: pass
source: automated
coverage_id: 96-03 D3

### 14. Whole IntelliJ suite green on a forced re-run (96-03)
expected: ./gradlew test --rerun-tasks succeeds.
result: pass
source: automated
coverage_id: 96-03 D4

### 15. Four notification providers share one base
expected: One file-type guard and one panel factory in BbjNotificationProviderBase.
result: pass
source: automated
coverage_id: 96-04 D1

### 16. Per-provider banner content preserved through the consolidation
expected: Home auto-detection fallback, node decision call and three actions, java-interop first-check guard and status-varying sentence all preserved.
result: pass
source: automated
coverage_id: 96-04 D3

### 17. Too-old configured Node falls through to a valid cached download
expected: No new fall-through branch; resolver-level behaviour proven.
result: pass
source: automated
coverage_id: 96-05 D2

### 18. Inaccessible cache distinguishable from empty cache
expected: One new Reason constant, no second result vocabulary.
result: pass
source: automated
coverage_id: 96-05 D3

### 19. Version resolver consulted at most once per candidate, and only sixth
expected: Never consulted for a candidate that already failed an earlier step.
result: pass
source: automated
coverage_id: 96-05 D4

### 20. Legacy four-argument resolve() performs no version gating
expected: NodeExecutableResolverTest's 24 cases pass unedited.
result: pass
source: automated
coverage_id: 96-05 D5

### 21. NodePresentation yields reason-specific sentence and action set
expected: Cache-inaccessible case drops the download action; every other case keeps all three ids.
result: pass
source: automated
coverage_id: 96-05 D6

### 22. Superseded NodeAvailability seam removed
expected: No live reference under bbj-intellij/src.
result: pass
source: automated
coverage_id: 96-06 D3

### 23. Missing-Node provider stays a thin subclass of the base
expected: No locally re-introduced file-type guard or panel construction.
result: pass
source: automated
coverage_id: 96-06 D4

### 24. Node.js auto-install on real Windows, language server starts afterward
expected: "Download Node.js" produces a working node.exe beside its .sha256 sidecar and the language server starts in the same session.
result: pass
source: prior-attestation
evidence: Failed in the 96-07 session, root-caused and fixed in 796a3f6f, re-attested PASS by the maintainer on Windows 10 / IntelliJ IDEA 2026.2.2 on 2026-09-20 (.planning/debug/resolved/bbj-language-server-does-not-s.md; 96-VERIFICATION.md truth 5).
coverage_id: 96-07 D1

### 25. No BBj Color Scheme page, highlighting still correct
expected: Settings > Editor > Color Scheme has no BBj entry and BBj files still highlight via TextMate.
result: pass
source: prior-attestation
evidence: Maintainer hand-UAT on the Windows build, 2026-09-20 -- "it's correct" (96-07-SUMMARY.md, UAT Results).
coverage_id: 96-01 D2, 96-07 D2

### 26. Crash banner on .bbx, not on .bbl
expected: The server-crash banner appears on .bbx programs and no longer on .bbl files.
result: pass
source: prior-attestation
evidence: Maintainer hand-UAT on the Windows build, 2026-09-20 (96-07-SUMMARY.md, UAT Results). The indexing part of 96-04 D2 is Test 5.
coverage_id: 96-04 D2 (file-type part), 96-07 D3

### 27. Crash detection and auto-restart
expected: Killing node.exe logs "Language server stopped unexpectedly" and the server auto-restarts.
result: pass
source: prior-attestation
evidence: Maintainer hand-UAT on the Windows build, 2026-09-20 (96-07-SUMMARY.md); five further forced restarts clean in the re-attestation session.
coverage_id: 96-07 D4

### 28. Missing-Node banner appears and Download Node.js runs the pipeline
expected: Banner shows and its download action runs the install pipeline.
result: pass
source: prior-attestation
evidence: Maintainer hand-UAT on the Windows build, 2026-09-20 (96-07-SUMMARY.md, UAT Results).
coverage_id: 96-07 D5

## Summary

total: 28
passed: 27
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

- gap_id: G-96-2
  truth: "A too-old configured Node.js is rejected and the user is led to a working runtime: the notification offers the Node.js download, and the settings dialog says next to its 'Version too old' statement that clearing the path lets the plugin pick or download a suitable Node.js"
  status: failed
  reason: "User reported: with an old node.js configured in the path, I don't get offered to download the suitable one. The popup only suggests to \"Configue node.js\" . In our configuration dialog it's not obvious that I can simply remove the path, then restart and let our automatic do its job. The config dialog should somehow offer that next to the statement where it says \"Version too old: ....\""
  severity: major
  test: 2
  root_cause: "Two independent causes. (1) BbjLanguageServer's start-failure notification hardcodes a single 'Configure Node.js Path' action and receives only resolution.failureMessage(), so it never consults NodePresentation.bannerActions(resolution) -- the reason-specific action seam was wired into the editor banner only. (2) BbjSettingsComponent's too-old branch sets only 'Version too old (minimum: 22), detected: ...' with no recovery hint, and nodeJsField is the one path field without an empty-text hint."
  artifacts:
    - path: "bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServer.java"
      issue: "notifyUnresolvedNodePath (lines ~94-123) builds a configure-only popup from a message string; the Resolution is discarded at the call site"
    - path: "bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java"
      issue: "line ~366 too-old label carries no recovery hint; nodeJsField (lines ~113-117) has no getEmptyText() hint unlike its sibling fields"
    - path: "bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeExecutableResolver.java"
      issue: "failureMessage() (lines ~157-158, ~276-279) only says 'Configure a ... path', never mentions the download"
  missing:
    - "Pass the Resolution to the start-failure notification and build its actions from NodePresentation.bannerActions(resolution), reusing the banner's id-to-action mapping (inherits the cache-inaccessible Download exclusion)"
    - "Extend the 'Version too old' label with a sentence saying clearing the field lets the plugin detect or download a suitable Node.js; optionally add an empty-text hint on nodeJsField"
    - "New tests: a guard that the popup's actions derive from NodePresentation.bannerActions rather than a literal, and a source guard on the settings label text"
    - "Re-UAT blind spot: confirm the editor banner shows all three actions in the too-old-configured state"
  debug_session: .planning/debug/g-96-2-too-old-node-no-download-offer.md
