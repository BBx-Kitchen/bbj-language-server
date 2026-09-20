# Milestone #7 Closing Comments — Draft for Review

Status: **DRAFT — awaiting maintainer go.** Nothing in this file has been posted to GitHub.
Milestone #7 ("v4.4 IntelliJ Focus") currently reads 19 open / 2 closed (re-checked live at draft
time: `gh issue list --milestone "v4.4 IntelliJ Focus" --state all --limit 40` returned exactly 21
issues, matching the required count).

## How to read this file

Each section below is headed with the issue number and its title, followed by the exact comment
text in a fenced block. Edit the fenced text in place if you want the wording changed — nothing
outside a fenced block is ever posted.

## Release this batch names

Every comment below names release **v0.16.0**:
https://github.com/BBx-Kitchen/bbj-language-server/releases/tag/v0.16.0

Every comment cites the same commit and pull request, because the branch that carried all of this
work was squash-merged into one commit: **`7ab6b81`** (pull request **#679**).

## Smoke verdict authorizing this closure pass

Quoted from the recorded verdict:

> Release `v0.16.0` is recorded as **PASS** on the maintainer's reply `"pass"` (2026-09-20), tied to
> artifact `bbj-lang-0.16.0.vsix` sha256 `0fa7ce1fc56097f97a2e963f77fda24353512304afa9ddefa1c23603230c2dc8`
> ... and `bbj-intellij-0.16.0.zip` sha256 `ce2561aaae4fbe3ca05c1f7631a3c44c234bfa54d129882838ebfbe40f33629a`
> ..., both built from workflow run `35524399880` on source commit
> `6101a6b6bdaf8b93d6de32b7f8d2fbd92d0ce464` (tag `v0.16.0`).

Classification: **no findings — classification not applicable** (the maintainer's reply was an
overall "pass" with no per-row failures and nothing to classify). Consequence: 0.16.0 stands as
shippable and this closure pass may proceed. Had the verdict instead recorded a blocking finding,
this closure pass would not run and the milestone would stay open.

## How the batch will be posted, once approved

1. Comments are posted and issues closed **one at a time**, in **ascending issue number order**.
2. Each issue's closure is verified (state confirmed `CLOSED`, comment confirmed present) before the
   next issue is touched.
3. Milestone #7 is closed **last**, only once all 21 issues read closed.
4. Any issue found already closed when the pass reaches it is **skipped and recorded**, not
   re-commented or re-closed — **except** issues **#621** and **#594**, which were already closed
   automatically the moment the release-landing pull request was squash-merged (a squashed commit
   message elsewhere in that merge happened to reference each of them). Those two are the one
   recorded exception: each still receives its drafted comment below, posted as a plain issue
   comment on the already-closed issue — **never reopened, never re-closed**.
5. A retry of this pass must never post a comment twice: an issue whose comment list already
   carries this release's link and commit is skipped and recorded, not re-commented.

**Note on #589's comment below:** it describes the behaviour that actually shipped (the action now
gates its enabled state on whether a project is open, and evaluates that off the UI thread) rather
than the earlier "checks the language server's readiness" wording the underlying issue's own
requirement text used — because the shipped gate deliberately does not consult the language server
at all. See that section's fourth sentence for why.

---

## #587 — the Java-interop connection probe treats any successful TCP handshake as a confirmed connection

```
Fixed in 0.16.0 (https://github.com/BBx-Kitchen/bbj-language-server/releases/tag/v0.16.0). The status bar now reports "Java: Connected" only once the plugin has confirmed the listening peer actually is java-interop, not merely because a TCP handshake succeeded — a process that merely accepts a connection on the configured port no longer shows as connected. Landed in commit 7ab6b81 (PR #679).
```

## #588 — getCachedNodePath() cannot distinguish "not yet downloaded" from "cache directory inaccessible"

```
Fixed in 0.16.0 (https://github.com/BBx-Kitchen/bbj-language-server/releases/tag/v0.16.0). "Node.js not yet downloaded" and "Node.js cache directory inaccessible" are now reported as distinct conditions, each with its own message and action set — the inaccessible-cache case no longer offers a Download Node.js action that would only fail the same way again. Landed in commit 7ab6b81 (PR #679).
```

## #589 — the Login to Enterprise Manager action has no update()/getActionUpdateThread() override, unlike all ten sibling actions

```
Fixed in 0.16.0 (https://github.com/BBx-Kitchen/bbj-language-server/releases/tag/v0.16.0). "Login to Enterprise Manager" now declares update() and getActionUpdateThread() like its sibling actions, so its enabled/disabled state is computed the same safe way theirs is, instead of the menu item staying permanently enabled. Landed in commit 7ab6b81 (PR #679). What shipped differs from this issue's wording: the new gate checks only whether a project is open, not the language server's status or BBj Home configuration, because Enterprise Manager login never talks to the language server and still needs to prompt new users for their BBj Home path before the server is even relevant.
```

## #590 — EM login's temp-file cleanup try/finally doesn't wrap the process-launch call that precedes it

```
Fixed in 0.16.0 (https://github.com/BBx-Kitchen/bbj-language-server/releases/tag/v0.16.0). An Enterprise Manager login temp file is deleted even if the process launch preceding cleanup throws, so no partially-written login output is left on disk. Landed in commit 7ab6b81 (PR #679). What shipped differs from this issue's wording: the cleanup ordering this issue reported was already correct as of an earlier commit made before this release; this release adds a test that pins that ordering rather than changing the cleanup code again.
```

## #591 — applyHexEdit indexes flagsRange/eventMaskRange arrays with no length check

```
Fixed in 0.16.0 (https://github.com/BBx-Kitchen/bbj-language-server/releases/tag/v0.16.0). applyHexEdit now checks that flagsRange and eventMaskRange each carry exactly two elements before indexing them, failing gracefully instead of throwing an ArrayIndexOutOfBoundsException. Landed in commit 7ab6b81 (PR #679).
```

## #592 — the Java-interop health check omits the project.isDisposed() guard its own unit's other service already applies everywhere

```
Fixed in 0.16.0 (https://github.com/BBx-Kitchen/bbj-language-server/releases/tag/v0.16.0). The java-interop health check now checks project.isDisposed() at the same points its sibling service already does, so a check already running when a project closes no longer touches the disposed project. Landed in commit 7ab6b81 (PR #679).
```

## #593 — the Java-interop status poll runs on a fixed 5-second timer with no visibility or focus gating

```
Fixed in 0.16.0 (https://github.com/BBx-Kitchen/bbj-language-server/releases/tag/v0.16.0). The java-interop status poll now stops re-arming while no BBj file is selected, instead of probing every 5 seconds for the lifetime of the project. Landed in commit 7ab6b81 (PR #679). What shipped differs from this issue's wording: window-focus gating was deliberately left out, since no focus or activation API exists anywhere in the plugin and adding one would introduce a new platform coupling racing the editor-selection signal already used for this — so an IDE left open on a BBj file still polls even while the window itself is unfocused or minimized.
```

## #594 — the java-interop default port literal 5008 is hardcoded independently across 3 files with no shared constant

**COMMENT ONLY — already closed at merge (will be posted with `gh issue comment`, never reopened or re-closed).**

```
Fixed in 0.16.0 (https://github.com/BBx-Kitchen/bbj-language-server/releases/tag/v0.16.0). BbjInteropPortDetector.DEFAULT_PORT is now the sole named constant for the default java-interop port, so the UI placeholder, the persisted default and the "changed from default" check all read the same value. Landed in commit 7ab6b81 (PR #679). What shipped differs from this issue's wording: no second, settings-owned port constant was added alongside it — every site that used to hold its own copy of the literal now reads this one constant instead.
```

## #607 — composer dialogs write LS-composed BBj statement text into the developer's document with no escaping or structural validation

```
Fixed in 0.16.0 (https://github.com/BBx-Kitchen/bbj-language-server/releases/tag/v0.16.0). Text typed into a composer dialog that would break BBj statement syntax is now rejected or escaped before it reaches your source file. Landed in commit 7ab6b81 (PR #679).
```

## #609 — composer dialogs iterate catalog sub-lists with no null guard, so a malformed catalogs response throws an unhandled NullPointerException on the EDT

```
Fixed in 0.16.0 (https://github.com/BBx-Kitchen/bbj-language-server/releases/tag/v0.16.0). A malformed or partial catalogs response now opens the composer with the same graceful "not ready" message a fully-null response already produced, instead of an "IDE Internal Error" balloon from a null-pointer crash. Landed in commit 7ab6b81 (PR #679).
```

## #613 — the TextMate bundle provider allocates a fresh temp directory and re-copies its bundle files on every IDE launch with no caching or cleanup

```
Fixed in 0.16.0 (https://github.com/BBx-Kitchen/bbj-language-server/releases/tag/v0.16.0). The TextMate bundle provider now reuses one cached directory across IDE launches instead of allocating a fresh temp directory and re-copying its files every time, and directories left behind from before this fix are cleaned up. Landed in commit 7ab6b81 (PR #679).
```

## #614 — three near-identical plugin-tool-path resolution methods duplicate the same lookup-and-null-check logic across two files

```
Fixed in 0.16.0 (https://github.com/BBx-Kitchen/bbj-language-server/releases/tag/v0.16.0). No behaviour change: the three plugin-bundled tool-script path lookups (web.bbj, em-login.bbj, em-validate-token.bbj) now resolve through one shared helper instead of three near-identical methods spread across two files. Landed in commit 7ab6b81 (PR #679).
```

## #615 — BbjRunBuiAction and BbjRunDwcAction duplicate 131 of 142 lines of shared run-action logic, differing only in a handful of BUI/DWC-specific literals

```
Fixed in 0.16.0 (https://github.com/BBx-Kitchen/bbj-language-server/releases/tag/v0.16.0). No behaviour change: BbjRunBuiAction and BbjRunDwcAction already share their run flow through the base class, differing only in their BUI/DWC-specific literals. Landed in commit 7ab6b81 (PR #679). What shipped differs from this issue's wording: the sharing this issue reported as missing had already been done by an earlier commit before this release; this release re-verified the existing test coverage for that sharing against the final tree rather than writing new code.
```

## #616 — three composer-launch actions are near-identical files differing only in one Kind enum constant and doc text

```
Done in 0.16.0 (https://github.com/BBx-Kitchen/bbj-language-server/releases/tag/v0.16.0). No behaviour change: all six composer-launch actions — the three this issue named plus the three added since — now extend one shared base class and differ only in the Kind constant each supplies. Landed in commit 7ab6b81 (PR #679). What shipped differs from this issue's wording: rather than one class registered several times with different data, the fix is a shared abstract base with thin subclasses, because a single class could only tell its registrations apart by reading its own action id at click time, and a renamed or mistyped id would then be a silent no-op instead of a compile error.
```

## #617 — EM server-side token validation logic lives in the run-action base class instead of alongside the rest of the EM-token lifecycle

```
Fixed in 0.16.0 (https://github.com/BBx-Kitchen/bbj-language-server/releases/tag/v0.16.0). No behaviour change: the Enterprise Manager server-side token validation logic now lives alongside the rest of the EM-token lifecycle instead of inside the run-action base class. Landed in commit 7ab6b81 (PR #679).
```

## #618 — three near-identical Configure*Intention files differ only in a display string, a Kind constant and a keyword

```
Done in 0.16.0 (https://github.com/BBx-Kitchen/bbj-language-server/releases/tag/v0.16.0). No behaviour change: all five Configure*Intention classes — the three this issue named plus the two added since — now extend one shared base class and differ only in the display text, Kind constant and keyword each supplies. Landed in commit 7ab6b81 (PR #679). What shipped differs from this issue's wording: rather than one data-driven registration, the fix is a shared abstract base with thin no-argument subclasses, because IntelliJ's intention-action extension point instantiates each class through a no-argument constructor and gives it no registration identity to read, so one class cannot vary its text, Kind or keyword.
```

## #619 — three small Swing helpers (clip, labeled, setEnabledRecursive) are duplicated across composer panels and dialogs with no shared home

```
Fixed in 0.16.0 (https://github.com/BBx-Kitchen/bbj-language-server/releases/tag/v0.16.0). No behaviour change: the small Swing helpers clip, labeled and setEnabledRecursive now exist exactly once in a shared home instead of being duplicated across the composer's schematic panels and dialogs. Landed in commit 7ab6b81 (PR #679).
```

## #620 — the two status-bar widgets and their factories duplicate most of their structure with no shared base class

```
Fixed in 0.16.0 (https://github.com/BBx-Kitchen/bbj-language-server/releases/tag/v0.16.0). No behaviour change: the two status-bar widgets and their factories now share one base class instead of duplicating most of their structure. Landed in commit 7ab6b81 (PR #679). What shipped differs from this issue's wording: rather than one data-driven class, the fix is a generic widget base with thin per-widget subclasses, because the two widgets are driven by two unrelated status-enum types — a single class parameterised by data would lose the compile-time check that each widget's status handling actually covers its own enum.
```

## #621 — the Color Scheme customization page's nine keys are never consulted by the actual TextMate-driven highlighter

**COMMENT ONLY — already closed at merge (will be posted with `gh issue comment`, never reopened or re-closed).**

```
Fixed in 0.16.0 (https://github.com/BBx-Kitchen/bbj-language-server/releases/tag/v0.16.0). The Settings > Editor > Color Scheme > BBj customization page has been removed entirely, rather than made to work. Landed in commit 7ab6b81 (PR #679). What shipped differs from this issue's wording: the page's colour keys were never consulted by the actual TextMate-driven highlighter, so making the page functional would have meant building a second highlighting mechanism from scratch — removing the inert page was the smaller, honest fix.
```

## #622 — three editor notification providers re-implement the same file-type-guard-then-panel shape with no shared base

```
Fixed in 0.16.0 (https://github.com/BBx-Kitchen/bbj-language-server/releases/tag/v0.16.0). The three editor notification providers this issue named, plus the server-crash banner provider, now share one base class that owns the file-type guard and panel construction. Landed in commit 7ab6b81 (PR #679). What shipped differs from this issue's wording: the shared base covers all four registered notification providers, not only the three this issue named, and the crash banner's own guard changed along with it from a hard-coded file-extension list to the same resolved-file-type check the other three already used — as a visible side effect, the crash banner now correctly appears on .bbx programs it previously missed, no longer appears on .bbl files it used to misfire on, and now also appears while the IDE is indexing.
```

## #630 — AddWindowComposerDialog and AddChildWindowComposerDialog duplicate about 87% of their structure with no shared base

```
Fixed in 0.16.0 (https://github.com/BBx-Kitchen/bbj-language-server/releases/tag/v0.16.0). No behaviour change: AddWindowComposerDialog and AddChildWindowComposerDialog now share one base, so a fix to the shared addWindow-family flow is written once instead of hand-applied to two files. Landed in commit 7ab6b81 (PR #679).
```

---

## Todo bookkeeping (no GitHub issue for any of these — milestone #7 stays at exactly 21 issues)

### Shipped in 0.16.0 — four folded todos

These four are covered by the release notes and the landing pull request's body; none of them gets
its own GitHub issue.

- The IntelliJ client no longer logs an "Unsupported notification method: bbj/bbjcplAvailability"
  warning on every server start — it now has a no-op handler for that notification.
- The Node.js download progress indicator no longer logs an IllegalStateException for setFraction
  on an indeterminate indicator.
- The gradle-wrapper-hygiene test fixture's stale Gradle version reference — already fixed earlier;
  this release closes out that bookkeeping.
- The live-interop getAllClassNames capability test — rewritten to assert the actual product
  invariant instead of pinning one backend's specific answer, after the live interop backend's
  behaviour drifted.

### Still pending — three todos (not part of 0.16.0)

These three stay in the pending todo queue and likewise get no GitHub issue.

- **Lost language-server connection is invisible to crash detection** — a rework was attempted for
  this release but pulled back out after its hand verification showed that a killed server and a
  deliberate stop arrive through the exact same status sequence, so status alone cannot tell the
  two apart. It needs a crash signal that isn't the status sequence, and stays pending for a future
  release.
- **The server status log line prints a stale previous status** — pulled out alongside the item
  above, to be addressed together with the crash-detection redesign.
- **Live-interop linking failures survive class warmup** — re-filed after a fresh investigation
  during this release; it is live environment drift, not a completed item, so it stays open.

---

## Maintainer review

**Verbatim go:** "go" (2026-09-20)

Given after the maintainer was shown: the review file path; the file checks (21 sections, 0
planning identifiers, 0 closing keywords, 0 @-mentions); the orchestrator's two corrected comments
(#616, #618) in full; the gist of every other special case; and the exact posting procedure.

**Edits folded in:** none — the approved text is this file's comment bodies exactly as they stand
at commit `b2b8c4d6`, posted byte-for-byte with no rewording, shortening, merging or other change.

## Posting log

*(One row per issue, in ascending order. Each row was preceded by a re-read of the issue's live
state/comments and followed by a re-read confirming the result, per the plan's one-at-a-time
procedure. No error occurred; the pass ran to completion in one continuous sequence.)*

| # | Action | Comment URL |
|---|--------|-------------|
| 587 | posted+closed | https://github.com/BBx-Kitchen/bbj-language-server/issues/587#issuecomment-5751839442 |
| 588 | posted+closed | https://github.com/BBx-Kitchen/bbj-language-server/issues/588#issuecomment-5751840971 |
| 589 | posted+closed | https://github.com/BBx-Kitchen/bbj-language-server/issues/589#issuecomment-5751842070 |
| 590 | posted+closed | https://github.com/BBx-Kitchen/bbj-language-server/issues/590#issuecomment-5751843163 |
| 591 | posted+closed | https://github.com/BBx-Kitchen/bbj-language-server/issues/591#issuecomment-5751844285 |
| 592 | posted+closed | https://github.com/BBx-Kitchen/bbj-language-server/issues/592#issuecomment-5751845356 |
| 593 | posted+closed | https://github.com/BBx-Kitchen/bbj-language-server/issues/593#issuecomment-5751846536 |
| 594 | commented (closed at merge, D-23) | https://github.com/BBx-Kitchen/bbj-language-server/issues/594#issuecomment-5751847762 |
| 607 | posted+closed | https://github.com/BBx-Kitchen/bbj-language-server/issues/607#issuecomment-5751848852 |
| 609 | posted+closed | https://github.com/BBx-Kitchen/bbj-language-server/issues/609#issuecomment-5751849903 |
| 613 | posted+closed | https://github.com/BBx-Kitchen/bbj-language-server/issues/613#issuecomment-5751850995 |
| 614 | posted+closed | https://github.com/BBx-Kitchen/bbj-language-server/issues/614#issuecomment-5751852211 |
| 615 | posted+closed | https://github.com/BBx-Kitchen/bbj-language-server/issues/615#issuecomment-5751853353 |
| 616 | posted+closed | https://github.com/BBx-Kitchen/bbj-language-server/issues/616#issuecomment-5751854671 |
| 617 | posted+closed | https://github.com/BBx-Kitchen/bbj-language-server/issues/617#issuecomment-5751855916 |
| 618 | posted+closed | https://github.com/BBx-Kitchen/bbj-language-server/issues/618#issuecomment-5751857057 |
| 619 | posted+closed | https://github.com/BBx-Kitchen/bbj-language-server/issues/619#issuecomment-5751858231 |
| 620 | posted+closed | https://github.com/BBx-Kitchen/bbj-language-server/issues/620#issuecomment-5751859367 |
| 621 | commented (closed at merge, D-23) | https://github.com/BBx-Kitchen/bbj-language-server/issues/621#issuecomment-5751860579 |
| 622 | posted+closed | https://github.com/BBx-Kitchen/bbj-language-server/issues/622#issuecomment-5751861590 |
| 630 | posted+closed | https://github.com/BBx-Kitchen/bbj-language-server/issues/630#issuecomment-5751862762 |

**Summary:** 19 posted+closed, 2 commented-closed-at-merge (D-23: #594, #621), 0 skipped-already-closed,
0 skipped-comment-present.

**Milestone #7 read-back after the pass:** `gh api repos/BBx-Kitchen/bbj-language-server/milestones/7
--jq '{open_issues,closed_issues,state}'` → `{"closed_issues":21,"open_issues":0,"state":"closed"}`.
Closed via `gh api -X PATCH repos/BBx-Kitchen/bbj-language-server/milestones/7 -f state=closed`, run
only after the 0/21 count was confirmed.
