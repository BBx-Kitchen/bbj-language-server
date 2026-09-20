# Smoke Test Checklist

## Purpose
Quick sanity check to verify critical path functionality of the BBj Language Server.

**Estimated Time:** 5-10 minutes

**When to Use:**
- After any build
- Before detailed testing
- After dependency updates
- Quick verification after changes

**Release Gate:** If ANY item fails, run FULL-TEST-CHECKLIST.md and document failures.

**Instructions:**
1. Copy this file to `QA/test-runs/YYYY-MM-DD-smoke-test.md`
2. Execute all tests in order
3. Mark `[ ]` with `[x]` for PASS or `[FAIL]` for failures
4. Rename file with `-PASS` or `-FAIL` suffix

---

## This run: v0.16.0 released artifacts, pre-filled for the maintainer

**Version under test:** `0.16.0`.

**Where each side comes from:**
- **VS Code**: install `basis-intl.bbj-lang` **from the VS Code Marketplace**. As of this writing
  the Marketplace's own listing already reports `0.16.0` as its newest version.
- **IntelliJ**: install from `bbj-intellij-0.16.0.zip`, the asset attached to the **v0.16.0 GitHub
  Release** (not the JetBrains Marketplace), via **Settings > Plugins > gear icon > Install Plugin
  from Disk...**.

**Why IntelliJ is installed from the Release zip and not the JetBrains Marketplace:** for this
release, an accepted upload to the JetBrains Marketplace counts as "live" — the review queue that
JetBrains runs afterward is not waited on. Since the Marketplace listing itself may still be
sitting in that review queue at test time, this smoke run deliberately installs the IntelliJ side
from the exact bytes that were uploaded (the Release's own `.zip`, byte-identical to what
`publish-intellij` built and uploaded) rather than from whatever the Marketplace currently serves.
This is a recorded, deliberate exception for the JetBrains side only — the VS Code side is
installed from its Marketplace exactly as usual.

**JetBrains publish job status (read back, not assumed):** the release's `publish-intellij` job
completed with conclusion `success` (`Publish to JetBrains Marketplace` step: `BUILD SUCCESSFUL`,
`:publishPlugin` executed) — recorded in `97-RELEASE-EVIDENCE.md` § 7.

### Artifact identity

| Asset | Size (bytes) | sha256 |
|---|---|---|
| `bbj-lang-0.16.0.vsix` | 2,631,401 | `0fa7ce1fc56097f97a2e963f77fda24353512304afa9ddefa1c23603230c2dc8` |
| `bbj-intellij-0.16.0.zip` | 1,159,957 | `ce2561aaae4fbe3ca05c1f7631a3c44c234bfa54d129882838ebfbe40f33629a` |

- **Workflow run ID:** `35524399880` (https://github.com/BBx-Kitchen/bbj-language-server/actions/runs/35524399880)
- **Released commit SHA:** `6101a6b6bdaf8b93d6de32b7f8d2fbd92d0ce464` (tag `v0.16.0`)

Both sha256 values above were independently recomputed against the downloaded release assets and
match GitHub's own reported digests (see `97-RELEASE-EVIDENCE.md` §§ 4-6).

### Clean-profile reminder (from `QA/TESTING-GUIDE.md`)

- Use a **clean profile** of each IDE for this run, not your everyday development profile.
- **Uninstall any locally installed development build first** in each IDE, so the run exercises
  what a real user gets from the released artifact — not a stale local build sitting alongside it.
- VS Code: start with an isolated profile, e.g. `code --user-data-dir <tmp> --extensions-dir <tmp>`,
  then install `basis-intl.bbj-lang` from the Marketplace inside that isolated profile.
- IntelliJ: use a fresh IDE configuration (or at minimum uninstall the dev/preview plugin build)
  before using **Install Plugin from Disk...** with the Release `.zip`.

---

## Smoke Test

**Basis for the marks below:** the maintainer's reply to the Task 2 checkpoint (2026-09-20) was the
single word `"pass"` — an overall verdict, not per-row marks. All ten rows are therefore marked
`[x]` on the basis of that overall "pass" reply, not on individually confirmed per-row results.

| # | Feature | Steps | Expected | Pass/Fail |
|---|---------|-------|----------|-----------|
| 1 | Extension Loads (VS Code) | 1. Open VS Code<br>2. Open any `.bbj` file from `examples/` directory | No error notifications; file opens cleanly; status bar shows language mode | [x] |
| 2 | Syntax Highlighting | 1. Keep file open from test 1<br>2. Verify keywords are colored | Keywords like `class`, `method`, `if`, `print` are colored differently from strings/comments | [x] |
| 3 | Code Completion (BBj) | 1. Create new file `test.bbj`<br>2. Type: `PR`<br>3. Press `Ctrl+Space` (or `Cmd+Space` on macOS) | Completion popup shows `PRINT` and other keywords | [x] |
| 4 | Code Completion (Java) | 1. In same file, type: `use java.util.Hash`<br>2. Press `Ctrl+Space` / `Cmd+Space` | Completion shows `HashMap`, `HashSet` | [x] |
| 5 | Diagnostics | 1. Type: `MODE "INVALID"`<br>2. Save file | Red squiggle appears with error message | [x] |
| 6 | IntelliJ Basic | 1. Open IntelliJ IDEA<br>2. Open any `.bbj` file from `examples/` directory<br>3. Verify syntax highlighting | File opens; keywords are colored; no error notifications | [x] |
| 7 | Run Program (VS Code) | 1. Open simple `.bbj` file (e.g., `examples/hello.bbj`)<br>2. Right-click editor<br>3. Run BBj > Run Program | Program executes; output appears in terminal | [x] |
| 8 | Run Program (IntelliJ) | 1. Open simple `.bbj` file in IntelliJ<br>2. Right-click editor<br>3. Run BBj > Run Program | Program executes; output appears in run window | [x] |
| 9 | Language Server Exits (#232) | 1. With a `.bbj` file open, quit VS Code completely (not just close the window)<br>2. macOS/Linux: `ps aux \| grep 'bbj-lang'`<br>3. Windows (PowerShell): `Get-CimInstance Win32_Process \| Where-Object CommandLine -like '*bbj-lang*'` | No `out/language/main.cjs` process remains within ~10s of quitting. A surviving process means the server is not shutting down — see #232 | [x] |
| 10 | No Runaway CPU (#232) | 1. Open a `.bbj` file and leave the editor idle for ~1 minute<br>2. Check CPU of the extension host / `main.cjs` process in Activity Monitor or `top` | CPU settles to near-idle after initial indexing. Sustained ~100% on one core indicates a spinning validation or rebuild loop | [x] |

**Additional 0.16.0-specific glance checks (not part of the ten numbered rows above):** no BBj page
under Color Scheme; no `bbjcplAvailability` WARN on server start. Neither was reported on by the
maintainer — recorded as **not reported**, not as passed or failed.

---

## Test Run Result

- [x] **PASS** - All items marked with `[x]`
- [ ] **FAIL** - Any item marked with `[FAIL]`

**Maintainer's verbatim reply (2026-09-20):** `"pass"` — an overall PASS with no per-row failures
and no findings. Per D-17, a smoke finding is classified by the maintainer, not by Claude; since no
finding was reported, there is nothing to classify — recorded as **no findings — classification not
applicable**.

**If FAIL:**
1. Document failure with evidence (see TESTING-GUIDE.md)
2. Run FULL-TEST-CHECKLIST.md for comprehensive verification
3. Create GitHub issues for failures

---

## Test Information

**Date:** 2026-09-20

**Tester:** StephanWald (the maintainer; GitHub handle — not independently stated as a display name in this reply)

**Environment:**
- OS: macOS (source: not independently stated in this reply; evidenced by the maintainer's Round 1 UAT log paths recorded elsewhere in this phase, `/Users/…/Library/Logs/JetBrains/IntelliJIdea2026.2/`, per `97-UAT-ARTIFACTS.md`)
- VS Code Version: not stated
- IntelliJ Version: IntelliJ IDEA 2026.2 (same source as OS, above)
- Extension Version: 0.16.0
