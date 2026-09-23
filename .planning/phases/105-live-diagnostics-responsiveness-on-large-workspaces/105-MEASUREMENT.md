# Phase 105 Measurement — Live Diagnostics on a Large Workspace

Records the before/after wait for a `BBj Parser` diagnostic on a large workspace (RESP-05,
D-11, D-13) and carries the result into PR #691 and the comment that closes issue #692.

## Metric

The time from the `textDocument/didChange` that introduces an invalid line — in a file opened
while the initial workspace build is still running — to the first
`textDocument/publishDiagnostics` for that file whose parameters contain a diagnostic with
`source: "BBj Parser"`.

A sample counts only when the edit is made **before** the initial build finishes. The initial
build's end is marked by the first `workspace/inlayHint/refresh` request the server sends after
its first `Validated` build phase (`bbj-vscode/src/language/main.ts`,
`shared.workspace.DocumentBuilder.onBuildPhase(DocumentState.Validated, ...)` → `refreshInlayHints()`
→ `connection.languages.inlayHint.refresh()`), which is visible in the trace as an outgoing
`workspace/inlayHint/refresh` request from server to client.

## Environment

**This container (build side):**

- BBj: branch `26.10`, `FixedIssues.txt` report date 2026-09-22 (no separate version file found
  under the install root; this is the most specific build identifier available).
- Shipped `bbj-ls.jar`: `/opt/bbx/.lib/bbjls/bbj-ls.jar`, 40889 bytes, built 2026-09-22 15:43,
  contains `bbj/interop/ParserCacheGuard.class` (confirmed via `unzip -l`).
- Phase base commit: `9601e7122827888ad308611553f9ee145ce9b1fe`
- Final commit (this build): `aec34f9b31c5c7701b23d6c43efb8600d54ac23c`
- Node.js (build/runtime): v24.20.0. `npm run langium:generate` needed Node 22 in the scratch
  worktree used for the "before" build (Node 24 throws `ERR_INVALID_URL` in `jsonschema`); the
  actual `npm run build` / `vsce package` steps ran fine on Node 24 in both trees.
- Machine: 10 CPUs, 62 GiB RAM (30 GiB used / 31 GiB available at build time).

**SHA-256 of the four distributables:**

| File | SHA-256 |
|---|---|
| `/tmp/phase-105-before/bbj-lang.vsix` | `b720af514e74993969ab723e37a1fef35e3de4c115b4ccd88b8e19fff1db2484` |
| `/tmp/phase-105-before/bbj-intellij-0.1.0.zip` | `73e5f47c534d7025b36dc662bdeff3d585b73de8cb653feef4ee9dd92b1a4024` |
| `/tmp/phase-105-after/bbj-lang.vsix` | `79f89e92873b06c91929c8fe6771e343c22b7cf3d2b097813482f1963205288f` |
| `/tmp/phase-105-after/bbj-intellij-0.1.0.zip` | `44b3315c4dcb193b4baadc52532e636bbe541e121195b143601a81c96ba3d69a` |

The "after" zip was verified to bundle the freshly built language server:
`unzip -p <after zip> bbj-intellij/lib/language-server/main.cjs | cmp - bbj-vscode/out/language/main.cjs`
exited 0.

**Tester's machine:**

- OS: macOS 27.0 (Darwin 27.0.0), Apple Silicon (arm64), MacBook Pro, 16 cores
- VS Code version: 1.138.0 (Electron 42.10.0, Node 24.18.1)
- IntelliJ product and version: IntelliJ IDEA 2026.2.3 Ultimate (IU-262.10968.63), JetBrains
  Runtime 25.0.4, LSP4IJ 0.21.0, IDE heap 2048 MiB
- LSP4IJ version: 0.21.0
- BBjServices version on the tester's machine: BBj 26.03 RC, nightly build of 2026-09-23
- Any other client talking to port 5008 during measurement: none — one IDE measured at a time,
  per the concurrency note below

## Runbook

For each IDE and each build (before, after), three samples, restarting the IDE between samples,
one IDE at a time, with nothing else connected to port 5008 during the sample:

1. **Install the build.**
   - VS Code: install the build's `.vsix` (`code --install-extension <path> --force`, or the
     IDE's "Install from VSIX..." command). This container's ext-test VS Code (port 13338)
     already has the "after" build installed; the "before" `.vsix` is also available for a local
     swap if the tester runs the VS Code leg in this container.
   - IntelliJ: install the build's `.zip` via Settings → Plugins → gear icon → Install Plugin
     from Disk, then restart the IDE.

2. **Turn on the LSP trace for that IDE.**
   - VS Code: add `"bbj.trace.server": "verbose"` to settings (client id is `bbj`, output
     channel "BBj"; confirmed in `bbj-vscode/src/extension.ts` — `new LanguageClient('bbj', 'BBj', ...)`).
     Also enable `"bbj.debug": true` (the BBj debug setting) for good measure. **Important:**
     recent `vscode-languageclient` (`node_modules/vscode-languageclient/lib/common/client.js`,
     `refreshTrace()`) additionally gates the trace on the *output channel's own log level* —
     `"bbj.trace.server"` alone can be silently ignored if the channel's log level is below
     `Trace`. After VS Code starts, open the Output panel, select the "BBj" channel, and if there
     is a log-level control (gear/dropdown) confirm or set it to `Trace`. Every trace line in that
     channel carries a millisecond timestamp.
   - IntelliJ: open the LSP4IJ "Language Servers" tool window (Settings → Languages & Frameworks
     → Language Servers also lists servers), select the BBj server entry, and set its trace level
     to verbose per LSP4IJ's own UI for that installed version. Confirm messages are timestamped
     wherever LSP4IJ writes them (its console/log for that server).

3. **Close every editor tab**, then open the private `bbj-corpus` workspace as a folder/project
   in the IDE (never through this container — this step runs on the tester's machine, or in this
   container's ext-test VS Code only if the corpus is checked out there).

4. **As soon as the window is up** (before waiting for anything to settle), **open any `.bbj`
   file** from that workspace in an editor tab. This is the file the sample measures.

5. **While the initial build is still running**, type one invalid line into that file (any
   syntactically broken statement) and stop typing. Do not save unless the IDE auto-saves.

6. **Read the trace/log**, find:
   - the `textDocument/didChange` (VS Code) or equivalent notification (IntelliJ) that carries
     the invalid-line edit — call this time T0;
   - the first `textDocument/publishDiagnostics` for that file's URI whose `diagnostics` array
     contains an entry with `"source": "BBj Parser"` — call this time T1;
   - the first `workspace/inlayHint/refresh` request from server to client — call this time TB
     (initial build finished).
   - **The sample counts only if T0 < TB.** If the edit landed after TB, discard the sample and
     retry with a fresh IDE restart (the corpus workspace must still be mid-build when you type).

7. **Record T1 − T0 in seconds**, and the timestamp resolution the trace/log actually provides
   (e.g. millisecond).

8. **Repeat for three samples per cell**, restarting the IDE (fully closing and reopening the
   corpus workspace) between samples so each sample starts from a fresh build.

**While measuring with the "after" build, also check and answer** (see Task 2's
`how-to-verify`):
1. Did a `BBj Parser` diagnostic appear on the invalid line before the initial build finished, in
   VS Code? In IntelliJ?
2. After the build finished, does any line show both a `BBj Parser` error and a language-server
   syntax error, or any diagnostic listed twice, in either IDE?
3. Keep typing on another line for a few seconds after the build finished: does anything flash
   red that was yellow, or disappear and come back doubled?
4. Optional: does the BBjServices log show two connections accepted from the language server
   while the "after" build runs?

**Concurrency:** measure each cell against the same BBjServices instance, on the same machine,
with only one IDE running at a time and nothing else talking to port 5008 — otherwise one IDE's
interop traffic (class lookups, the dedicated parse connection) can inflate the other's numbers.

**Never record** a corpus file name, a corpus file path below the workspace folder name, or any
corpus source text — only elapsed times, the timestamp resolution, and environment notes.

## Results

| IDE | Build | Sample 1 (s) | Sample 2 (s) | Sample 3 (s) | Median (s) | Resolution |
|---|---|---|---|---|---|---|
| VS Code | before | 56.050 | 64.307 | 58.895 | 58.895 | millisecond |
| VS Code | after | 3.892 | 5.405 | 5.260 | 5.260 | millisecond |
| IntelliJ | before | 129 | 61 [1] | 66 | 66 | 1 second |
| IntelliJ | after | 5 | 6 | 7 | 6 | 1 second |

[1] This IntelliJ "before" sample started from a file whose edited line still carried a previous
run's edit rather than a fresh invalid line; the tester flagged it. It is recorded as reported;
excluding it does not change the median (the remaining two samples, 66 and 129, still bracket a
median of ~97 s worse than the reported 66 s, so keeping the flagged sample is the conservative
choice).

**VS Code:** the median wait for the `BBj Parser` verdict on an invalid line typed while the
initial workspace build is still running dropped from 58.895 s to 5.260 s — about 11x faster.
Every "before" sample's verdict arrived within roughly half a second of the build-finished
marker (`workspace/inlayHint/refresh` paired with `workspace/codeLens/refresh`); every "after"
sample's verdict arrived with no build-finished marker anywhere in the trace, i.e. strictly
while the build was still running.

**IntelliJ:** the median wait dropped from 66 s to 6 s — about 11x faster. As in VS Code, every
"before" sample's verdict arrived only together with the build-finished marker (same second or
one second later); no "after" trace contained a build-finished marker at all, confirming every
"after" sample landed while the build was still in progress.

## Hand-verification results (Task 2)

Checked while measuring with the "after" build, per the Runbook's four questions:

1. **Did a `BBj Parser` diagnostic appear on the invalid line before the initial build
   finished, in VS Code? In IntelliJ?** Yes in both IDEs — every "after" sample's verdict
   arrived with no build-finished marker anywhere in the trace.
2. **After the build finished, does any line show both a `BBj Parser` error and a
   language-server syntax error, or any diagnostic listed twice, in either IDE?** No overlapping
   or duplicate diagnostic was observed; the language server's own errors sat on other lines than
   the `BBj Parser` verdict. Caveat: no "after" run captured the invalid line and the
   build-finished marker together in the same trace, so the specific post-build state with the
   invalid line still present is recorded as **not observed**, not as confirmed-clean.
3. **Keep typing on another line for a few seconds after the build finished: does anything flash
   red that was yellow, or disappear and come back doubled?** No flash or doubling observed;
   removing the invalid character cleared the verdict within roughly 0.6 s (0.567 s in one VS
   Code sample), and re-inserting it brought the verdict back in a comparable time (0.564 s).
4. **Optional — does the BBjServices log show two connections accepted from the language server
   while the "after" build runs?** Not checked.

## Residual server risk

The `bbj-ls` cache-guard fix (commit `9987bee`, "isolate parser cache and enforce running parse
deadlines") is on `origin/develop` in the sibling `bbj-ls` repository but has not yet reached a
release branch. It must reach the release branch that ships as BBj 26.03 before this fix ships to
users — this container's shipped jar already contains it
(`bbj/interop/ParserCacheGuard.class`, confirmed above), but that is this container's jar, not
necessarily what a customer's 26.03 install will carry until the fix is merged to the release
branch.

## Closing comment for #692

_Draft — post this comment when this issue is closed with the v4.5 milestone, not before._

> Live compiler diagnostics now appear while a large workspace's initial build is still running,
> in both VS Code and IntelliJ. The live parse is armed directly from document open and change
> events instead of waiting on the workspace build lock, and it travels over its own dedicated
> interop connection to the server, falling back silently to the shared connection if a second
> one can't be opened.
>
> Measured on a real large workspace, with three samples per cell: VS Code's median wait for the
> first parser diagnostic on an invalid line typed during the initial build dropped from 58.9 s
> to 5.3 s; IntelliJ's dropped from 66 s to 6 s. Measured against BBj 26.03 RC (nightly build of
> 2026-09-23).
>
> This fix ships with the v4.5 milestone; this issue closes when that milestone's pull request
> merges.
