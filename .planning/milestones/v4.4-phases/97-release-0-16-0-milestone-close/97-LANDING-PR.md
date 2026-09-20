## PR body as submitted

**Title:** Release 0.16.0: v4.4 IntelliJ Focus (milestone #7)

**Base:** `main`
**Head:** `gsd/phase-97-release-0-16-0`

---

This PR carries the whole v4.4 "IntelliJ Focus" lineage onto `main`: the IntelliJ work from
Phases 93-96 (Composer, Enterprise Manager and run actions, java-interop status/settings, and
platform integration/Node.js), plus **four** folded todos landed in this phase, plus the v4.4
planning documents. Four, not six: two additional folded todos (a crash-detection rework and a
related status-log fix) were pulled out of 0.16.0 after their hand UAT failed — see below.

### Behaviour fixes (11)

- The BBj composer no longer shows an "IDE Internal Error" balloon when the server returns a
  malformed or partial catalog response — it now shows the same graceful "not ready" message a
  fully-null response already got (#609)
- Text typed into a composer dialog that would break BBj statement syntax is now rejected or
  escaped before it reaches your source file (#607)
- A malformed hex edit in the composer no longer throws an `ArrayIndexOutOfBoundsException` — it
  now fails gracefully (#591)
- An Enterprise Manager login temp file is now deleted even if the process launch before cleanup
  throws, so no partially-written login output is left on disk (#590)
- "Login to Enterprise Manager" now correctly enables/disables based on project and server-ready
  state, matching its sibling actions (#589)
- A java-interop health check already in flight when a project closes no longer touches the
  disposed project (#592)
- The java-interop status poll no longer re-arms while no BBj file is selected, instead of probing
  every 5 seconds for the lifetime of the project. Window-focus gating was deliberately left out —
  no focus/activation API exists in the plugin and adding one would introduce a new platform
  coupling — so an IDE left open on a BBj file still polls (#593)
- The status bar now reports "Java: Connected" only when the listening peer is confirmed to
  actually be java-interop, not merely because a TCP handshake succeeded (#587)
- The IntelliJ TextMate bundle now reuses a cached directory across IDE launches instead of
  allocating a fresh temp directory and re-copying its files every time, and abandoned
  directories are cleaned up (#613)
- **The non-functional Settings > Editor > Color Scheme > BBj customization page has been
  removed**, since customizing a colour there never changed editor highlighting (#621)
- **"Node.js not yet downloaded" and "Node.js cache directory inaccessible" are now
  distinguishable**, so you're shown the right diagnosis instead of being pointed at a download
  that will fail the same way again (#588)

### Consolidations (10)

Ten internal, behaviour-preserving consolidations across the composer, Enterprise Manager, and
java-interop/platform-integration code — shared base classes and helpers replacing duplicated
logic, with no observable change for users (#630, #619, #618, #616, #617, #615, #614, #594,
#620, #622).

### Folded todos shipped in this phase (4)

- The IntelliJ client no longer logs an "Unsupported notification method:
  bbj/bbjcplAvailability" warning on every server start — it now has a no-op handler for that
  notification.
- The Node.js download progress indicator no longer logs an `IllegalStateException` for
  `setFraction` on an indeterminate indicator.
- Test housekeeping: the `gradle-wrapper-hygiene` fixture's stale Gradle version reference was
  already fixed; this phase closes out that bookkeeping.
- Test housekeeping: the live-interop capability test was rewritten to assert the actual product
  invariant (probe result agrees with the cached capability flag) instead of pinning one
  backend's specific answer, following drift in the live interop backend.

### Work attempted and reverted (not shipping)

Two additional folded todos — a rework to move IntelliJ's crash detection onto the language
client's own status-feed callback, and a related fix to the server-status log's "from" state —
were **attempted in this phase**, but the crash-detection rework **failed its maintainer hand
UAT**: on macOS, a killed language-server process arrives as
`started -> stopping -> stopped`, a sequence the crash classifier never distinguishes from
LSP4IJ's own deliberate stops (e.g. closing the last file), so the classifier never fired and no
crash banner or auto-restart occurred. Both changes were **reverted before this PR was opened**
(commits `8fe7cb72` and `a22b78ad`). As a result, this PR's commit history contains both the
feature commits and their reverts for that work, and since this branch is squash-merged, **none
of that crash-detection or status-log behaviour reaches `main`**. This PR makes **no change to
crash detection and no change to the status-log "from" state** — the language server's crash
handling and status logging on `main` after this merge are unchanged from before this PR.

### Verification

What ships in this PR was hand-checked against the Round 2 artifacts recorded in
`97-UAT-ARTIFACTS.md`: the rebuilt IntelliJ plugin and VS Code extension install cleanly, a
`.bbj` file opens with the language server reaching a started state, diagnostics and completion
work, and no `bbj/bbjcplAvailability` WARN appears in the session log. Both whole test suites
(IntelliJ Gradle, Vitest) are green on the merged tree, and a register check confirmed no
internal planning identifier appears in the added source/test diff.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Exh8UqH1wRRH4CGthV99h7

---

## Facts recorded before push (per plan 97-06, Task 2)

- **Commit count** (`origin/main..HEAD` before push): 135 commits
- **Source-file diffstat** (`bbj-intellij bbj-vscode documentation .github`, against `origin/main`): 76 files changed, 4167 insertions(+), 1166 deletions(-)
- **Full diffstat** (all paths, against `origin/main`): 153 files changed, 23279 insertions(+), 1231 deletions(-)
- **`package.json` version before merge:** `0.15.3` (branch) / `0.15.4` (`origin/main`, one preview bump ahead)
- **`package.json` version after merge (merge commit `0458612f`):** `0.15.4` — equals `origin/main`'s value, no regression
- **Workflow files:** `git diff --exit-code origin/main -- .github/workflows/manual-release.yml .github/workflows/preview.yml` exits 0 (byte-identical)
- **Register check result:** `git diff origin/main...HEAD -- bbj-intellij bbj-vscode documentation .github | grep -nE '...'` prints nothing (grep exit 1) — no planning identifier in the added diff
- **Both whole suites on the merged tree:** IntelliJ `./gradlew test --rerun-tasks` — BUILD SUCCESSFUL, 1096 tests / 0 failures / 0 errors; Vitest `RUN_BBJ_TESTS=0 npx vitest run --maxWorkers=2` — `numFailedTests: 0` (1947 total, 1837 passed, 110 pending across 6 pre-existing/non-regression suite-level `beforeAll`-contention or async-teardown-race reports, consistent with `97-UAT-ARTIFACTS.md`)
- **`WINDOWS.md`:** untouched — `git diff --exit-code origin/main -- .planning/WINDOWS.md` exits 0

## PR record (filled in after `gh pr create`)

- **PR number:** #679
- **PR URL:** https://github.com/BBx-Kitchen/bbj-language-server/pull/679
- **Head branch:** `gsd/phase-97-release-0-16-0`
- **Head SHA:** `0458612f939a30087b287a11d908210200a81c07`
- **Base:** `main`
- **State at PR creation:** OPEN
- **Register grep over `.planning/WINDOWS.md`:** `git diff --exit-code origin/main -- .planning/WINDOWS.md` reports a non-empty diff, but this reflects Phase 96's own prior, legitimate WINDOWS.md edits already committed on this branch before this plan started (entry 3 recorded/resolved 2026-09-20 during Phase 96; commits `8162ebe6`, `af3784f7`) — not anything this plan (97-06) touched. This plan's own commits (the `origin/main` merge, `0458612f`) do not touch `.planning/WINDOWS.md`. Entry 1 remains `open` (confirmed by grep against the file on disk), matching D-05's requirement. No `windows waive` was run.

## Merge record (filled in after the maintainer merges — Task 3)

- **PR state:** MERGED
- **Merged at:** 2026-09-20T16:15:13Z
- **Squash commit SHA:** `7ab6b81042841efbade0610890e7e22495b0e205`
- **`origin/main`'s new HEAD SHA:** `7ab6b81042841efbade0610890e7e22495b0e205` (squash commit is the new tip)
- **PR checks before merge (all six SUCCESS):** BBj CI, Build test VSIX, build-vscode, No secrets in run bodies, validate-intellij, Gradle wrapper pinned and validated
- **Merged-tree verification:** `git diff 7ab6b810 0458612f -- bbj-intellij bbj-vscode documentation .github java-interop` is empty — the squashed source tree on `main` is byte-identical to the gated branch tip (`0458612f`, this plan's Task 1 merge commit) across every path that mattered to the gates.
- **Preview run triggered:** `Publish Preview Extension` (run `35522129619`), started `2026-09-20T16:15:15Z` on `7ab6b810`, status `in_progress` at record time — this is the run plan 97-07 watches.
- **Claude ran no merge command; the merge was performed by the maintainer**, per their reply: "merged 7ab6b81042841efbade0610890e7e22495b0e205 - build running now".

### Deviation: milestone #7 issue-state acceptance criterion NOT met (D-23)

Task 3's acceptance criterion `gh api repos/BBx-Kitchen/bbj-language-server/milestones/7 --jq '.open_issues'` "still reports 21" is **FAILED, with an accepted deviation**. Re-run at verification time: `open_issues: 19`, `closed_issues: 2`.

The squash merge auto-closed **#621** and **#594** one second after merging (2026-09-20T16:15:13Z + ~1s): GitHub concatenates every commit message in the squash range into the squash commit's body, and two Phase 95/96 commit bodies carried `Closes #621.` / `This closes #594`. The D-04 gate that ran before the push checked only the PR body text for closing keywords — it never scanned the 135 individual commit messages being squashed, so it passed a body that was clean while the underlying commit range was not.

**Maintainer decision (2026-09-20):** leave both issues closed, do not reopen. The closing pass (plan 97-11) still posts each issue's drafted comment naming 0.16.0 — for #621 and #594 that comment is posted plain via `gh issue comment` on the already-closed issue, never re-closed. This narrows D-18/D-19: the closing pass becomes 19 issues to comment-and-close plus 2 to comment-only; the end state (21 closed, milestone #7 closed last) is unchanged. Full reasoning recorded as D-23 in `97-CONTEXT.md`.

**Lesson for future landings** (recorded in D-23): scan the commit messages of the merge range, not only the PR body, for closing keywords before a squash merge.

