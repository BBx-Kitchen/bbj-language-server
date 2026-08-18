# Phase 63 Coverage — bbj-intellij/src/main/java/ (RVW-04, SEC-03)

**Swept tree:** branch `v4.0-stability-and-quality` at commit `c3b17838879422bf20b2bcf2bf909ee86341ee1a` (D-18) — recorded once for the whole phase, at execution time; not re-anchored per plan, so every plan in this file describes the same tree.

**Governing standard:** `.planning/reviews/INVENTORY.md` — the single immutable contract for Phases 61-69. Not edited by this phase.

**Dedup source:** INVENTORY's Frozen Open-Issue Snapshot (15 issues, queried 2026-08-17 via `gh issue list --state open --limit 60`). Phase 69 re-queries the tracker live immediately before filing, so this snapshot is not re-verified live at sweep time. Phase 63-plausible neighbours: #65, #231, #381, #385, #410, #476, #485.

**Slice size:** 5 unit rows × 8 dimensions = **40 cells** (**35** `applies`, **5** `n/a`).

**Recording shape:** inherited unchanged from `.planning/reviews/62-COVERAGE.md` (Phase 63 D-03) — no new format checkpoint is spent re-deriving it. Phase 63 adds exactly three shape elements beyond that frozen shape: `### SEC-03 Integrity Posture` under `RU-63-03` (D-11); `### Inherited referral triage` under each unit owning one of the 7 inherited Phase 62 referrals (`RU-63-01`, `RU-63-04`, `RU-63-02`; D-06); and `### Cross-phase observations (VS Code side)` in the close-out, stubbed here for any plan to append into (D-05).

## Applicability Grid — Phase 63 slice

Cells below record applicability exactly as INVENTORY's grid states it (this table does not change as plans execute); the recorded pass/fail verdict for each live dimension lives in the matching unit's own `### Cells` block further down, so a coverage claim stays adjacent to its evidence rather than being flattened into this summary table.

| Unit | D1 Security | D2 Correctness | D3 Performance | D4 Maintainability | D5 Test coverage | D6 Dependency health | D7 Cross-IDE parity | D8 Doc accuracy |
|---|---|---|---|---|---|---|---|---|
| `RU-63-03` | applies | applies | applies | applies | applies | applies | n/a — R-VSCODE-NO-DOWNLOAD | applies |
| `RU-63-01` | applies | applies | applies | applies | applies | n/a — R-D6-CENTRAL | applies | applies |
| `RU-63-04` | applies | applies | applies | applies | applies | n/a — R-D6-CENTRAL | applies | applies |
| `RU-63-05` | applies | applies | applies | applies | applies | n/a — R-D6-CENTRAL | applies | applies |
| `RU-63-02` | applies | applies | applies | applies | applies | n/a — R-D6-CENTRAL | applies | applies |

**No file-exception rows.** All 8 file-exception rows in INVENTORY belong to `RU-61-07`, `RU-64-02` and `RU-64-03` — none touches a Phase 63 unit, so adding one here would break the Cell-Total Gate below. Two structural firsts this phase carries relative to Phases 61 and 62: **D6 is live for the first time in any sweep phase** — exactly one cell, `RU-63-03`/D6, everywhere else in this document D6 is `n/a — R-D6-CENTRAL`; and **D7's comparison direction is reversed** — Phase 63 owns the IntelliJ rows and reads `bbj-vscode/` as reference/comparison material only, the mirror image of Phase 62's own live D7 cells (D-05).

## Cell-Total Gate (D-17.1)

Expected totals for this phase's slice of INVENTORY's Applicability Grid: **35 `applies`, 5 `n/a`, 40 total** (5 unit rows × 8 dimensions, no file-exception rows).

Re-derived directly from `.planning/reviews/INVENTORY.md` rather than restated, by the following awk pass over the five `RU-63-0[1-5]` grid rows:

```bash
awk '/^\| `RU-63-0[1-5]` \|/ {a+=gsub(/applies/,"applies"); n+=gsub(/n\/a/,"n\/a")} END{print a, n, a+n}' .planning/reviews/INVENTORY.md
```

**Output:** `35 5 40`

This matches the stated totals. Per D-17: if this re-derivation ever disagrees with the stated totals, that disagreement is itself a defect to surface, not a number to quietly adopt. Plan `63-05` re-runs this gate, together with the 61-file tree enumeration and the referral gate, as the phase's closing check.

## Stopping Rule & Write Contract

**Stopping rule.** A unit's sweep is complete when: (i) each of its 7 live `applies` cells carries a verdict (`pass`/`fail`) plus a written line naming the concrete checks applied; (ii) every file in the unit's file list is named at least once inside that unit's own section — in a check line or in a finding's `location:` — so coverage is file-granular, not merely unit-granular; (iii) every candidate claim raised during the sweep is either promoted to a finding record clearing its evidence tier, or written under that unit's `### Not-reproducible dispositions` with its reason; **and (iv) every inherited Phase 62 referral addressed to that unit carries a written disposition** — promoted, dismissed-with-evidence, or not-reproducible (extending Phase 62's three-part rule by D-06's inherited-referral clause). Once (i)-(iv) hold, the unit is done and no further reading is licensed.

**Write contract.** Plans `63-02`..`63-05` each fill exactly one unit section below and touch nothing else — no fragment files, no assembly plan, no whole-file rewrite, and no rewording of a carried-forward `n/a` reason (D-03) — with **one narrowly scoped exception**: any plan may *append* a bullet to `### Cross-phase observations (VS Code side)` in the close-out, never rewording an earlier bullet, because Phase 62 is closed and there is no downstream phase to route such an observation to (D-05). Ordering across this shared file is enforced structurally by the wave dependency chain (D-04), not by an assumption about executor behaviour: one plan per wave, waves 1-5, each plan's `depends_on` naming its predecessor in D-02's risk-rank order (`RU-63-03` → `RU-63-01` → `RU-63-04` → `RU-63-05` → `RU-63-02`).

**Placeholder.** Every not-yet-recorded live-dimension cell line ends with the single lowercase word `pending`. This is mechanically checkable at every wave.

**D-03: no new format checkpoint.** Phase 61's D-05 checkpoint and Phase 62's D-03 inheritance already approved this recording shape (`### Cells` line format, the `n/a` verbatim carry-forward presentation, the 13-field fenced finding-record shape, and the per-unit sub-blocks). Phase 63 inherits it directly from `62-COVERAGE.md` rather than re-litigating it; the three additions named in the header above are defined by this plan's own action text, not discovered at a checkpoint.

**Environment constraint governing every record in this file (D-07).** The Gradle build does not run here: `./gradlew --offline -q tasks` (run from `bbj-intellij/`) fails in ~5s with `FAILURE: Build failed with an exception. * What went wrong: 25.0.3` — before task listing — because the local JDK is Temurin 25.0.3 while `bbj-intellij/build.gradle.kts:12-13` sets `sourceCompatibility`/`targetCompatibility` to `JavaVersion.VERSION_17`. No Gradle task, compile, test run, or build-driven static analysis was scheduled, run, or claimed anywhere in this file. Every D1/D2/D3 finding therefore clears its `repro` tier via INVENTORY 3b's **second** branch — a line-by-line trace naming the concrete inputs/state and the exact `file:line` where behaviour diverges — and every finding record states in its own `evidence:` field, in one clause, why it carries no runnable reproduction.

## Exclusion reasons carried forward

Each block below is copied verbatim from `.planning/reviews/INVENTORY.md` §"Exclusion reasons" — not reworded, not paraphrased, not re-derived, and not merged into one bullet the way Phase 62's uniform single-marker slice allowed.

**R-D6-CENTRAL** (4 cells in this slice — the `D6` cell of `RU-63-01`, `RU-63-04`, `RU-63-05` and `RU-63-02`):

> "No distinct third-party dependency of its own; dependency-tree health (npm and Gradle) is assessed once, exhaustively, at `RU-64-02`, and vendored-binary provenance at `RU-64-03`. Repeating the audit per unit would restate the same npm/Gradle audit under a different heading, not surface a new finding."

**R-VSCODE-NO-DOWNLOAD** (1 cell — `RU-63-03`/D7 — a marker no previous phase has carried):

> "VS Code extensions execute inside VS Code's own bundled Node.js host process and never perform a Node.js runtime download/detection step; there is no missing VS Code counterpart for this IntelliJ-only mechanism to be compared against — the asymmetry is a platform necessity, not a defect."

**Identity check:** 4 + 1 = 5, matching the 5 `n/a` cells in this slice.

## Inherited referral ledger (D-06)

Reproduced from `.planning/reviews/62-COVERAGE.md` §"Phase 62 Close-Out" section D, Group 2 (7 rows), plus an eighth row for INVENTORY's one routed item. Disposition column is `pending` for every row not yet triaged by the owning unit's own plan.

| # | From unit | To unit | Subject | Disposition |
|---|---|---|---|---|
| 1 | `RU-62-01` | `RU-63-01` | `BbjCompileAction.java` is an unimplemented `TODO` stub, never invokes `bbjcpl` | pending |
| 2 | `RU-62-01` | `RU-63-01` | Six VS Code commands (`configureCompileOptions`, `denumber`, `decompile`, `decompileReadonly`, `em`) have no IntelliJ action counterpart | pending |
| 3 | `RU-62-01` | `RU-63-01` | `bbj.refreshJavaClasses` restarts the whole LS on IntelliJ vs. a targeted LSP request on VS Code | pending |
| 4 | `RU-62-04` | `RU-63-04` | SETOPTS has no IntelliJ composer dialog at all | pending |
| 5 | `RU-62-03` | `RU-63-04` | Independent confirmation (logic/UI layer) of the same SETOPTS/IntelliJ absence `RU-62-04` referred | pending |
| 6 | `RU-62-05` | `RU-63-02` | Whether IntelliJ's TextMate importer honors `filenames`; whether IntelliJ's LSP4IJ registration independently covers `.bbl` | pending |
| 7 | `RU-62-02` | `RU-63-02` | None of format/denumber/tokenized-detection/decompile has any IntelliJ counterpart at all (four features in one bullet); #65 checked by number as the tokenized-detection neighbour | pending |
| 8 (routed) | INVENTORY Routing table (D-06) | `RU-63-03`/D6 | `bbj-intellij` Gradle build JDK 17-vs-25.0.3 toolchain mismatch | promoted — `P63-D6-002` |

**Countability notes.** Referrals **#4 and #5 describe the same absence from two Phase 62 vantage points and are triaged once**, as a single disposition on `RU-63-04` naming both source referrals — recording two findings for one absence would double-count. `RU-63-03` and `RU-63-05` own **zero** inherited referrals from Phase 62 — stated explicitly here rather than left as silence. This ledger's completion (all 8 rows carrying a non-`pending` disposition) is the phase's third hard gate (D-17.3), re-confirmed by plan `63-05`.

## RU-63-03 — Settings & runtime acquisition

**Files (6 / 1,097 LOC):**
- `com/basis/bbj/intellij/BbjSettings.java` (152)
- `com/basis/bbj/intellij/BbjSettingsComponent.java` (333)
- `com/basis/bbj/intellij/BbjSettingsConfigurable.java` (161)
- `com/basis/bbj/intellij/BbjHomeDetector.java` (91)
- `com/basis/bbj/intellij/BbjNodeDetector.java` (70)
- `com/basis/bbj/intellij/BbjNodeDownloader.java` (290)

**Risk rank:** 1 of 5 Phase 63 units — `BbjNodeDownloader.java` is the entire SEC-03 surface (Node.js runtime download integrity) and the phase's only live D6 cell.
**Sweep method:** full read.
**Owning plan:** 63-01 (this plan) — Task 1 (D1, D2, D3, D6 — tier `repro`/repro-equivalent, D-15's 5-dimension Task A) and Task 2 (D4, D5, D8 — tier `trace`).

### Cells
- D1 Security — fail — Checked, on `BbjNodeDownloader.java`: the scheme/host of the download URL (`DOWNLOAD_BASE_URL = "https://nodejs.org/dist/"`, `NODE_VERSION = "v20.18.1"` at :34-35, `downloadUrl` built at :104) — HTTPS, fixed host, no redirect-following override or certificate-handling override found in the `HttpRequests.request(...).connect(...)` call (:112-117); whether the archive at the temp file (`Files.createTempFile`, :110) is verified against any checksum, signature or expected size before extraction — confirmed absent (no hash computation, no signature check, no size assertion anywhere in this 290-line file); the `extractZip` entry-name handling (:167-188) — the target file name is the hardcoded literal `"node.exe"` (:174), not `entry.getName()`, so `destDir.resolve("node.exe")` cannot be steered by a hostile entry name in this specific loop (checked, no zip-slip defect on this path); the separate `extractTarGz` path (:190-218), which shells out to a system `tar` `ProcessBuilder` (:192-196) and therefore delegates entry-path safety entirely to whatever `tar` binary is on the invoking user's `PATH` — a trust transfer, stated as a fact under SEC-03 below, not independently provable without constructing a malicious archive (see Not-reproducible dispositions); whether an empty/truncated/entry-less archive is detected before `Files.copy`/`setExecutable` — it is: `!Files.exists(extractedNode)` at :142 throws before either :149 or :153 run, for both extraction paths; the already-occupied-target-path case — `Files.copy(..., REPLACE_EXISTING)` (:149) both overwrites unconditionally with no ownership/hash check and, by not specifying `LinkOption.NOFOLLOW_LINKS`, follows a symlink if one is already present at `targetPath`; and the cancelled/concurrent-download remnant question — the `Task.Backgroundable` (:76) is cancellable, temp file/dir cleanup runs in `finally` blocks on every exit path (:157-159, :161-164), so no partial artifact is left in the shared plugin data dir on cancellation, but the `DOWNLOAD_IN_PROGRESS_KEY` guard itself (:70-74, :79, :88) is not atomic (see D2). Checked the other five files: `BbjSettings.java` persists no credential — `bbjHomePath`/`nodeJsPath`/`classpathEntry`/`configPath`/`emUrl`/`javaInteropHost` are filesystem paths and a host/URL string, none executed directly by this class; `BbjSettingsComponent.java`/`BbjSettingsConfigurable.java` validate a user-entered BBj home (`BbjHomeDetector.isValidBbjHome`, `BbjSettingsComponent.java:57`) and Node path (`BbjNodeDetector.getNodeVersion`/`meetsMinimumVersion`, `BbjSettingsComponent.java:86-92`) via `ComponentValidator` before display, but validation is advisory (a `ValidationInfo` warning, not a blocking gate — `apply()` in `BbjSettingsConfigurable.java:61-85` persists the typed value regardless of validator state); `BbjHomeDetector.java`/`BbjNodeDetector.java` trust the environment as follows: `~/BASIS/Install.properties` (`BbjHomeDetector.java:61`), a small fixed set of OS-specific literal paths (`:85-90`), and the system `PATH` via `PathEnvironmentVariableUtil.findInPath("node")` (`BbjNodeDetector.java:27`) — all read-only filesystem/PATH probes, no network or IPC trust boundary. 2 findings recorded: P63-D1-001, P63-D1-002.
- D2 Correctness & error handling — fail — Checked the `catch (Exception e)` in the background task (:83-86): it only shows an error notification, sets no "Node available" flag, so a caller still observes `getCachedNodePath() == null` afterward — no defect there. Checked the `finally` at :87-92: restores `DOWNLOAD_IN_PROGRESS_KEY` on every path including a `ProcessCanceledException` (a `RuntimeException`, caught by the outer `catch (Exception e)`) — pass. Checked temp file/dir removal on every exit path including the throw at :142-144 — both `finally` blocks (:157-159, :161-164) run regardless of exception type — pass. Checked `getCachedNodePath()`'s swallowed `IOException` (:55, comment "Directory creation failed, return null") — **not distinguishable by the caller from "not yet cached"**: both paths return `null` identically, so a permission-denied or read-only plugin data directory looks exactly like "Node.js hasn't been downloaded yet" to every caller. Checked `extractTarGz`'s handling of a non-zero `tar` exit code (:211-213, throws with the captured output — pass), an interrupted wait (:214-217, sets the interrupt flag and rethrows — correct pattern, pass), and unbounded process output (:201-207, `StringBuilder output` has no size cap; in practice `tar xzf` emits output only on error, so this is a latent-not-active cost, not promoted as its own finding). Checked the settings round-trip for absent/empty/malformed values: `BbjSettingsConfigurable.reset()` (:88-149) null/empty-guards `configPath`/`emUrl` (:144,147) and defaults `logLevel`/`javaInteropHost` when empty (:117-119,124-126) — but `javaInteropPort` auto-detection (:130-140) is gated on `if (javaInteropPort == 5008)` — an equality-to-default check, not an "was this ever explicitly configured" check — and this auto-detection logic lives **only** in the Configurable (UI layer), never inside `BbjSettings.getState()` itself (:42-59), unlike `bbjHomePath`/`nodeJsPath` which **are** auto-detected inside `getState()` (:44-57) so every consumer benefits — a code path that reads `BbjSettings.getInstance().getState().javaInteropPort` directly, without opening the Settings UI, gets the raw stored/default value with no auto-detection ever applied. Checked `BbjHomeDetector`/`BbjNodeDetector`: both return `null` uniformly for "not found" and for a caught exception (`BbjHomeDetector.java:78-80`, `BbjNodeDetector.java:47-48`) — same not-distinguishable pattern as `getCachedNodePath()`, cited as a secondary instance rather than a separate finding. Checked the `DOWNLOAD_IN_PROGRESS_KEY` guard (:70-74) for a check-then-act race: `props.getBoolean(...)` and `props.setValue(...)` (:79) are two separate, unsynchronized calls on an application-scoped `PropertiesComponent` — two IDE windows invoking `downloadNodeAsync` within the same race window can both observe `false` before either sets `true`, launching two concurrent `Task.Backgroundable` downloads that independently `Files.copy(..., REPLACE_EXISTING)` (:149) to the same `targetPath`. 3 findings recorded: P63-D2-001, P63-D2-002, P63-D2-003.
- D3 Performance & resource use — fail — Checked whether `getCachedNodePath()` (:47-59) is cheap enough for its documented "fast and synchronous" contract: two filesystem stats (`Files.exists`, `Files.isExecutable`, :52) plus `Files.createDirectories` inside `getNodeDataDirectory()` (:245, a write-attempt on every call, usually a fast no-op once the directory exists) — not a hot-path concern at the frequency this method is actually called (server startup / manual status checks, not per-keystroke) — pass on this specific check. Checked `BbjHomeDetector`/`BbjNodeDetector` for unbounded filesystem walks or repeated process spawns: `detectBbjHome()` reads one properties file then probes 2-3 fixed literal paths (`BbjHomeDetector.java:41-45,85-90`) — bounded, cheap; `detectNodePath()` walks the `PATH` env var once via the platform's own `PathEnvironmentVariableUtil` (`BbjNodeDetector.java:27`) — bounded. Checked the 8 KiB copy loop in `extractZip` (:177-181, bounded per-file) and the `tar` output accumulation in `extractTarGz` (:201-207, unbounded but practically inert per the D2 note above) — no unbounded-growth defect promoted separately from D2's note. Checked whether the settings UI rebuilds its model per interaction: **it does something more expensive** — `BbjSettingsComponent.java:148-164` wires two `DocumentListener`s (`bbjHomeField`, `nodeJsField`) whose `textChanged` callbacks fire on the Swing EDT on **every keystroke**. `nodeJsField`'s listener calls `updateNodeVersionLabel()` (:221-239), which — whenever the currently-typed path exists as a file — calls `BbjNodeDetector.getNodeVersion()` (:231), which spawns a `node --version` subprocess and **blocks the EDT synchronously** via `ExecUtil.execAndReadLine` (`BbjNodeDetector.java:42-46`) until the process exits, with no debounce and no background thread. `bbjHomeField`'s listener calls `updateClasspathDropdown()` (:200-216) → `BbjSettings.getBBjClasspathEntries()` (`BbjSettings.java:74-100`), a synchronous `Files.readAllLines` file read, also on the EDT, also per keystroke. 1 finding recorded: P63-D3-001.
- D4 Maintainability & code smells — fail — Checked the `SystemInfo.isWindows` branch, repeated independently 5 times in `BbjNodeDownloader.java` (:50, :103, :125, :136-139/:148, :152) with no shared platform-strategy abstraction — each site re-derives the same Windows-vs-other decision. Checked `getPlatformName()` (:220-229) and `getArchitecture()` (:231-241): these translate `SystemInfo`/`CpuArch` booleans into Node.js's own platform/arch naming convention (`"darwin"`/`"linux"`/`"win"`, `"arm64"`/`"x64"`) — a genuine mapping, not pure duplication of what `SystemInfo`/`CpuArch` already expose, so no defect there. Checked `downloadAndExtractNode` (:97-165, 69 lines) for god-function shape: it builds the URL, downloads, dispatches by archive type, extracts, resolves the extracted binary, copies it, sets the executable bit, and cleans up — eight distinct responsibilities in one method, confined to a single file. Checked `BbjHomeDetector.java`/`BbjNodeDetector.java` for copy-pasted detection shape: their detection mechanisms differ structurally (installer-trace-file parsing vs. `PATH` lookup) — no meaningful duplication found there. Checked `BbjSettings.java`/`BbjSettingsComponent.java`/`BbjSettingsConfigurable.java` for a single settings-access convention: the three-layer split (persistent state / Swing UI / Configurable bridge) is consistent — no defect. Checked for duplicated constant/default/path strings across the six files: the literal `5008` (the java-interop default port) appears independently in `BbjSettings.java:30,107,111,116,150`, `BbjSettingsComponent.java:119,125,297,302`, and `BbjSettingsConfigurable.java:131,136` — 3 files, no shared named constant. 2 findings recorded: P63-D4-001, P63-D4-002.
- D5 Test coverage gaps — fail — **This cell carries the phase's single systemic finding, recorded here exactly once (D-08).** Established by enumeration, not assumption: `ls bbj-intellij/src/` prints only `main`; `grep -rn "test" bbj-intellij/build.gradle.kts` returns no matches. `bbj-intellij` declares no test dependency and configures no test task anywhere — **it has no test source set at all.** Recorded as `P63-D5-001` against `RU-63-03`, `location:` anchored at `bbj-intellij/build.gradle.kts` (the file that would declare the missing test configuration). This unit's own specific consequence: every one of this cell's own D1-D3/D6 findings above (`P63-D1-001/002`, `P63-D2-001/002/003`, `P63-D3-001`, `P63-D6-001/002`) is unenforceable by any regression test today — a silently broken download, a wrong cached path, a settings round-trip that silently loses or corrupts a stored value, or a reintroduced concurrent-download race would all ship undetected. A first test suite for this unit would minimally need to cover: `getCachedNodePath()`'s three-way outcome (cached/not-cached/directory-error), the settings round-trip (`BbjSettingsConfigurable.apply()`/`reset()`), and `BbjNodeDetector.meetsMinimumVersion()`'s pure-function version parsing (the one piece of this unit's logic that needs no IntelliJ Platform test fixture at all). The other four Phase 63 units' own D5 cells will cross-reference `P63-D5-001` by ID rather than restating this systemic fact. 1 finding recorded: P63-D5-001.
- D6 Dependency health — fail — Checked the pinned Node.js runtime: `NODE_VERSION = "v20.18.1"` (:34), part of Node.js's "Iron" LTS line. Verified live against nodejs.org's own release index (`curl https://nodejs.org/dist/index.json`, entry for `v20.18.1`: released 2024-11-20, `"lts": "Iron"`, `"security": false`) and the official `nodejs/Release` schedule (`schedule.json`'s `v20` block: `lts: 2023-10-24`, `maintenance: 2024-10-22`, `end: 2026-04-30`). At sweep time (2026-08-18) the entire v20 "Iron" line is **past its own end-of-life date** (roughly 3.5 months past `2026-04-30`), and the pinned `v20.18.1` patch is itself 41 releases and about 21 months behind the v20 line's own final release (`v20.20.2`, 2026-03-24) — the same index flags 5 later v20.x releases as security releases the plugin's pinned build never received: `v20.18.2` (2025-01-21), `v20.19.2` (2025-05-14), `v20.19.4` (2025-07-15), `v20.20.0` (2026-01-12), `v20.20.2` (2026-03-24). Checked the routed item: INVENTORY's Routing table (D-06) sends the `bbj-intellij` Gradle build JDK 17-vs-25.0.3 toolchain mismatch to this cell, the only live D6 cell in Phase 63 (D-10). `bbj-intellij/build.gradle.kts:12-13` sets `sourceCompatibility`/`targetCompatibility` to `JavaVersion.VERSION_17` (confirmed by reading the file); the local JDK is Temurin 25.0.3; `./gradlew --offline -q tasks` fails in ~5s with `* What went wrong: 25.0.3` before task listing. **This finding's `location:` is `bbj-intellij/build.gradle.kts:12-13`, a file INVENTORY assigns to `RU-64-02` for every other dimension — the phase's one deliberate `location:` exception (D-10), stated here explicitly.** No other Gradle, IntelliJ-Platform (`2024.2`) or LSP4IJ (`0.19.0`) version question is assessed in this cell — those remain `RU-64-02`/SEC-08's. 2 findings recorded: P63-D6-001, P63-D6-002.
- D7 Cross-IDE parity — n/a — "VS Code extensions execute inside VS Code's own bundled Node.js host process and never perform a Node.js runtime download/detection step; there is no missing VS Code counterpart for this IntelliJ-only mechanism to be compared against — the asymmetry is a platform necessity, not a defect."
- D8 Comment & doc accuracy — fail — Checked every class-level and method-level Javadoc in the six files against the code just read. `BbjNodeDownloader`'s class Javadoc, "Handles platform detection, download, extraction, and caching in plugin data directory" (:29-31) — accurate, the class does all four. `getCachedNodePath()`'s Javadoc, "This method is fast and synchronous — safe to call from any thread" (:42-45) — the thread-safety and synchronicity claims are accurate (no shared mutable state, no blocking I/O beyond two stat calls), but the doc's implied read-only "get" semantic omits that `getNodeDataDirectory()` (:245) performs `Files.createDirectories` as a side effect on **every** call — a write attempt, not purely a read. Checked the inline comments at :109 ("Download to temp file"), :146 ("Copy to plugin data directory"), :151 ("Set executable permission (important for Unix-like systems)"), :158/:162 (cleanup), and :172 ("We only want node.exe from the archive") against the code beneath each — all five accurately describe what the adjacent code does, including :172, which is accurate because `extractZip` (containing that comment) is only invoked on the `SystemInfo.isWindows` branch (:125-129), so the ZIP archive is Windows-only in this codebase. Checked every comment in the five settings/detector files claiming a validation, default, or ordering: `BbjHomeDetector`'s class Javadoc ("Checks the BASIS installer trace file and common installation locations") and `detectBbjHome()`'s `<ol>` doc both match the code's actual two-step order (:33-48) — accurate. Checked `CLAUDE.md`'s IDE-integration claims against these six files: `CLAUDE.md` makes no positive claim about settings, Node.js detection, or the download path specifically — its silence is noted as an observation, not promoted to a finding, since no claim it does make is contradicted here. 1 finding recorded: P63-D8-001.

### SEC-03 Integrity Posture

This subsection states facts against the actual code — "there is no checksum" is a fact to state; it becomes a finding only when the record says what it enables. Discrete `P63-D1-*` records are allocated above only where a concrete evidence-clearing defect exists.

**(1) Transport security.** The download URL is built entirely from two compile-time constants — `DOWNLOAD_BASE_URL = "https://nodejs.org/dist/"` and `NODE_VERSION = "v20.18.1"` (`BbjNodeDownloader.java:34-35`) — concatenated with a platform/architecture-derived filename (`downloadAndExtractNode`, :99-104) into a fixed-host HTTPS URL. The request is issued via `HttpRequests.request(downloadUrl).productNameAsUserAgent().connect(request -> { request.saveToFile(tempFile.toFile(), indicator); ... })` (:112-117) — IntelliJ Platform's own HTTP client, with no visible override disabling certificate validation, no custom `TrustManager`, and no redirect-handling override anywhere in this file. Transport is HTTPS to a fixed, hardcoded host, with standard certificate validation as far as this file's code can establish.

**(2) Checksum or signature verification.** **None exists.** No hash computation (`MessageDigest`, `Checksum`, or any hashing utility), no signature verification (`Signature`, `PGP`, or any signature library), and no expected-size assertion appear anywhere in `BbjNodeDownloader.java`'s 290 lines — confirmed by reading the file in full. The archive is downloaded to a temp file (`Files.createTempFile`, :110) and handed directly to the extraction path with no integrity check between download and extraction. Recorded as `P63-D1-001`.

**(3) Archive extraction path safety (zip-slip).** Two independent extraction paths exist, selected by `SystemInfo.isWindows` (:125-129). `extractZip` (:167-188, Windows) iterates `ZipInputStream` entries and writes the **first** entry whose name ends with `"node.exe"` to `destDir.resolve("node.exe")` (:174) — the resolved target is the **hardcoded literal string `"node.exe"`**, not `entry.getName()`, so a hostile entry name cannot steer the resolved path in this loop; no second entry can overwrite a different location because the loop `break`s after the first match (:183). `extractTarGz` (:190-218, macOS/Linux) shells out to a system `ProcessBuilder("tar", "xzf", ...)` (:192-196) — this path performs **no entry-name validation of its own at all**; it delegates entry-path safety entirely to whatever `tar` binary is present on the invoking user's `PATH`, which this code neither inspects nor pins a version of. Two entries resolving to the same target path is therefore governed by that external `tar` binary's own last-write-wins/overwrite semantics, not by any check in this file. Stated as a fact, not independently provable further without constructing a crafted malicious archive (see Not-reproducible dispositions below).

**(4) Cache trust.** The cache location is `PathManager.getPluginsPath()/bbj-intellij-data/nodejs` (`getNodeDataDirectory()`, :243-246). Every subsequent IDE launch calls `getCachedNodePath()` (:47-59), which trusts **any** file at the resolved path that satisfies `Files.exists(...) && Files.isExecutable(...)` (:52) — no hash, no version string check, no provenance check of any kind. An existing, partial, or foreign file at that exact path is therefore either (a) treated as "the cached Node.js binary" if it happens to be executable, with no distinction from a genuinely downloaded one, or (b) silently **overwritten** on the next download attempt, since `Files.copy(extractedNode, targetPath, REPLACE_EXISTING)` (:149) unconditionally replaces whatever is there — and because `REPLACE_EXISTING` does not pass `LinkOption.NOFOLLOW_LINKS`, if that existing path is a symlink, the copy follows the link and overwrites whatever the symlink points to, not the symlink itself. Recorded as `P63-D1-002`.

**(5) Extracted-binary path resolution and the executable bit.** `extractedNode` is resolved to `tempExtractDir.resolve("node.exe")` (Windows) or `tempExtractDir.resolve("bin").resolve("node")` (:136-139), existence-checked at :142 (throwing if absent — no silent proceed on an empty/entry-less archive), then copied to the plugin data directory (:147-149) and, on non-Windows, marked executable via `targetPath.toFile().setExecutable(true)` (:152-153) with **no verification step of any kind between the copy and the `setExecutable` call** — whatever bytes were copied are marked runnable unconditionally.

**Blast radius.** An attacker who controls any one of these steps — the transport (fact 1), the archive contents (fact 2/3), or the cache location (fact 4) — ends up controlling a binary that this plugin subsequently `setExecutable(true)`s (fact 5) and runs as the **language server host process** for every BBj file the user opens in this IDE, on every future launch that hits the cache-hit path. `BbjNodeDownloader.java` was read in full (all 290 lines) for this subsection; `BbjSettings.java`, `BbjSettingsComponent.java`, `BbjSettingsConfigurable.java`, `BbjHomeDetector.java`, `BbjNodeDetector.java` were also read in full but contribute no additional fact to this narrative beyond the D1 cell's checks above (none of them touches the download/extraction/cache pipeline). Nothing in this subsection is asserted as a defect purely by virtue of appearing in it — only `P63-D1-001` and `P63-D1-002` are promoted findings; the remaining three facts are stated as-is.

### Findings

```
id:                P63-D1-001
unit:              RU-63-03
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java:34-35,110-117,47-59
dimension:         D1
secondary:         [D6]
severity:          high
evidence_tier:     repro
evidence:          Line-by-line trace (D-07 — no runnable reproduction accompanies this record;
                    a live network-tamper harness is out of this phase's scope and would itself be
                    the trigger sequence D-13 prohibits publishing): the archive is fetched over
                    HTTPS from a fixed host (DOWNLOAD_BASE_URL, :35) to a temp file
                    (Files.createTempFile, :110) via HttpRequests.request(...).connect(...)
                    (:112-117), handed directly to extraction with zero intervening integrity
                    check. No MessageDigest/Checksum/Signature usage, no expected-size assertion,
                    anywhere in the file's 290 lines (confirmed by full read). getCachedNodePath()
                    (:47-59) then trusts any executable file at the resolved cache path on every
                    later launch with the same absence of verification (Files.exists +
                    Files.isExecutable only, :52).
failure_scenario:  A party able to substitute the content served from nodejs.org's distribution
                    path for this exact version/platform/architecture combination — whether via
                    compromise of the origin, a compromised intermediary trusted by the local
                    certificate store, or corruption of the plugin data directory before a
                    first-ever download — has that content extracted, copied, marked executable,
                    and subsequently launched as the language server host process for every BBj
                    file opened in the IDE, with no checksum or signature check at any point to
                    detect the substitution. Per D-13, no trigger sequence or payload is stated
                    beyond this problem-class/impact description.
classification:    major
                    (1) touches 1 file: pass (a checksum/signature check is addable within
                    BbjNodeDownloader.java alone) — (2) no public API/grammar/LSP change: pass —
                    (3) no new dependency: pass (java.security.MessageDigest is JDK-standard) —
                    (4) regression-testable with existing harness: FAIL — no src/test/ source set
                    exists in bbj-intellij (P63-D5-001), so no existing harness can regression-test
                    this fix — (5) reviewer can name the exact edit (compute and compare a
                    published SHASUMS256.txt entry from nodejs.org before extraction): pass —
                    (6) severity `high` and dimension D1: FAIL — test (6) fails on both its clauses,
                    so classification is `major` regardless of the other five tests (D-13's safety
                    gate); test (4) independently fails via D-09's primary reading.
effort:            8
dedup:             none — #410 (Zed Editor support) requests a new editor integration, unrelated to
                    Node.js download integrity on any existing IDE; #476 (starter programs via File
                    and Code Templates) concerns project scaffolding, unrelated to runtime
                    acquisition. Both of this unit's named plausible neighbours checked explicitly
                    and dismissed. No other frozen open issue names Node.js download integrity.
disposition:       major-refactor
```

```
id:                P63-D1-002
unit:              RU-63-03
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java:149
dimension:         D1
secondary:         [D2]
severity:          low
evidence_tier:     repro
evidence:          Line-by-line trace: Files.copy(extractedNode, targetPath,
                    java.nio.file.StandardCopyOption.REPLACE_EXISTING) (:149) is called with no
                    LinkOption.NOFOLLOW_LINKS, so if targetPath (getNodeDataDirectory().resolve(...),
                    a per-user plugin data directory under PathManager.getPluginsPath()) is already
                    a symbolic link at copy time, Files.copy follows it and overwrites the link's
                    target rather than replacing the link itself. No runnable reproduction
                    accompanies this record (D-07); establishing exploitability further would
                    require a local pre-placed symlink, which is outside this static-trace sweep's
                    scope.
failure_scenario:  On a filesystem where another local process or user has write access to the
                    plugin data directory (or can influence what getNodeDataDirectory() resolves to
                    before this plugin's first download), a pre-placed symlink at the exact target
                    path redirects this copy's write to an arbitrary filesystem location the current
                    user can write to, rather than to the intended cache slot — combined with
                    P63-D1-001's absent integrity check, the write's content is also unverified.
                    Severity is low because the plugin data directory is normally private to the
                    current OS user, limiting who could pre-place the symlink.
classification:    major
                    (1) touches 1 file: pass — (2) no public API/grammar/LSP change: pass —
                    (3) no new dependency: pass (LinkOption is JDK-standard) — (4) regression-
                    testable with existing harness: FAIL — no src/test/ source set exists
                    (P63-D5-001) — (5) reviewer can name the exact edit (add
                    LinkOption.NOFOLLOW_LINKS, or pre-check Files.isSymbolicLink(targetPath)):
                    pass — (6) severity `low` but dimension is D1: FAIL — any D1 finding is major
                    regardless of severity per D-13's safety gate; test (4) independently fails.
effort:            2
dedup:             none — neither #410 nor #476, nor any other frozen open issue, concerns
                    symlink-following copy semantics in the Node.js download/cache path.
disposition:       major-refactor
```

```
id:                P63-D2-001
unit:              RU-63-03
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java:47-59
dimension:         D2
secondary:         []
severity:          low
evidence_tier:     repro
evidence:          Line-by-line trace: getCachedNodePath() (:47-59) catches IOException at :55 with
                    the comment "Directory creation failed, return null" and falls through to the
                    same `return null` (:58) that the "path doesn't exist or isn't executable"
                    branch (:52-54, condition false) also reaches. Both conditions are
                    indistinguishable to every caller. The same catch-and-return-null-uniformly
                    pattern recurs at BbjHomeDetector.java:78-80 (detectFromInstallerTrace) and
                    BbjNodeDetector.java:47-48 (getNodeVersion) — cited as the same class of defect,
                    not restated as a separate finding.
failure_scenario:  A plugin data directory that is unwritable (read-only filesystem, permission
                    denial, disk full during Files.createDirectories at :245) causes
                    getCachedNodePath() to report "not cached" identically to the correct
                    first-run state, so any UI or logic that branches on this method's result
                    (e.g., deciding whether to show a "Download Node.js" action) presents the wrong
                    diagnosis — "not downloaded yet" instead of "environment is misconfigured" — and
                    a user retries a download that is doomed to fail at the same directory-creation
                    step for the same underlying reason.
classification:    major
                    (1) touches 1 file: pass — (2) no public API/grammar/LSP change: pass —
                    (3) no new dependency: pass — (4) regression-testable with existing harness:
                    FAIL — no src/test/ source set exists (P63-D5-001) — (5) reviewer can name the
                    exact edit (log the swallowed IOException, or return a small sealed result type
                    distinguishing "not cached" from "cache directory inaccessible"): pass —
                    (6) severity `low`, dimension D2 (not D1): pass — test (4) alone fails, so
                    classification is `major` per D-13 ("failing any one test makes it major").
effort:            2
dedup:             none — no frozen open issue names this cache-availability diagnostic gap.
disposition:       major-refactor
```

```
id:                P63-D2-002
unit:              RU-63-03
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsConfigurable.java:130-140
secondary:         [D4]
dimension:         D2
severity:          low
evidence_tier:     repro
evidence:          Line-by-line trace: BbjSettings.getState() (BbjSettings.java:42-59)
                    auto-detects bbjHomePath and nodeJsPath inline whenever they are empty
                    (:44-57), so every consumer of BbjSettings.getInstance().getState() benefits.
                    javaInteropPort receives no equivalent treatment in getState() — its
                    auto-detection exists only in BbjSettingsConfigurable.reset()
                    (:130-140), gated by `if (javaInteropPort == 5008)` (:131) — an
                    equality-to-the-literal-default check, not an "was this ever configured" check,
                    so a user who explicitly confirms port 5008 is indistinguishable from a user who
                    never touched the field, and any direct BbjSettings.getInstance().getState()
                    caller that is not the Settings UI never runs this auto-detection at all.
failure_scenario:  A consumer reading BbjSettings.getInstance().getState().javaInteropPort directly
                    (bypassing the Settings dialog) gets the hardcoded default 5008 even when
                    BBj.properties specifies a different java-interop port, unlike bbjHomePath/
                    nodeJsPath which are auto-detected wherever they are read. Separately, a user
                    who has explicitly left the port at its default value has that value silently
                    replaced with a newly detected port each time the Settings dialog is reopened
                    and OK'd, with no way to express "I want 5008, don't auto-detect."
classification:    major
                    (1) touches 1 file: pass (fix confined to reconciling BbjSettings.java's
                    getState()/BbjSettingsConfigurable.java's reset(), but a comprehensive fix
                    moving the auto-detect into getState() itself touches BbjSettings.java only,
                    so scored as 1) — (2) no public API/grammar/LSP change: pass — (3) no new
                    dependency: pass — (4) regression-testable with existing harness: FAIL — no
                    src/test/ source set exists (P63-D5-001) — (5) reviewer can name the exact
                    edit (move port auto-detection into BbjSettings.getState(), replacing the
                    equality check with a genuine "never configured" sentinel): pass — (6) severity
                    `low`, dimension D2 (not D1): pass — test (4) alone fails, so classification is
                    `major` per D-13.
effort:            4
dedup:             none — no frozen open issue names java-interop port auto-detection.
disposition:       major-refactor
```

```
id:                P63-D2-003
unit:              RU-63-03
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java:70-79
dimension:         D2
secondary:         [D1]
severity:          medium
evidence_tier:     repro
evidence:          Line-by-line trace: downloadNodeAsync() (:68-95) reads
                    props.getBoolean(DOWNLOAD_IN_PROGRESS_KEY, false) (:71) and, if false,
                    proceeds to queue a Task.Backgroundable whose run() sets
                    props.setValue(DOWNLOAD_IN_PROGRESS_KEY, true) (:79) — the check (:71) and the
                    set (:79) are two separate, unsynchronized calls on the application-scoped
                    PropertiesComponent, with queueing and task-start intervening between them. No
                    synchronized block, lock, or atomic compare-and-set guards this sequence
                    anywhere in the file.
failure_scenario:  Two IntelliJ windows (or two near-simultaneous invocations from within one
                    window) that both call downloadNodeAsync() inside the same race window both
                    observe the flag as false before either call reaches :79, so two concurrent
                    Task.Backgroundable downloads run at once, each independently downloading,
                    extracting, and calling Files.copy(..., REPLACE_EXISTING) (:149) to the
                    identical targetPath — a caller could observe a Files.copy from one task
                    interleaved with a partially-extracted file from the other, or a
                    getCachedNodePath() read of a node executable mid-overwrite by a second
                    concurrent copy.
classification:    major
                    (1) touches 1 file: pass — (2) no public API/grammar/LSP change: pass —
                    (3) no new dependency: pass — (4) regression-testable with existing harness:
                    FAIL — no src/test/ source set exists (P63-D5-001) — (5) reviewer can name the
                    exact edit (guard the check-then-set with a synchronized block or an
                    AtomicBoolean compare-and-set): pass — (6) severity `medium`, dimension D2 (not
                    D1): pass — test (4) alone fails, so classification is `major` per D-13.
effort:            4
dedup:             none — no frozen open issue names concurrent-download races in the Node.js
                    acquisition path.
disposition:       major-refactor
```

```
id:                P63-D3-001
unit:              RU-63-03
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java:148-164
dimension:         D3
secondary:         [D2]
severity:          medium
evidence_tier:     repro
evidence:          Line-by-line trace: bbjHomeField.getTextField().getDocument().
                    addDocumentListener(...) (:148-155) and nodeJsField.getTextField().getDocument().
                    addDocumentListener(...) (:157-164) both override textChanged(), firing on the
                    Swing Event Dispatch Thread on every keystroke. The nodeJsField listener calls
                    updateNodeVersionLabel() (:221-239), which — whenever `new File(nodePath).exists()`
                    is true (:227) — calls BbjNodeDetector.getNodeVersion(nodePath) (:231), which
                    spawns a `node --version` subprocess and blocks synchronously via
                    ExecUtil.execAndReadLine (BbjNodeDetector.java:42-46) until the process returns,
                    all on the EDT. The bbjHomeField listener calls updateClasspathDropdown()
                    (:200-216) -> BbjSettings.getBBjClasspathEntries() (BbjSettings.java:74-100), a
                    synchronous Files.readAllLines call, also on the EDT. Neither listener debounces
                    or defers to a background thread.
failure_scenario:  Typing a Node.js executable path character-by-character in the Settings dialog
                    spawns a subprocess synchronously on the EDT for every keystroke where the
                    in-progress path happens to already exist as a file (e.g., typing over an
                    existing valid path to correct it), freezing the entire Settings dialog for the
                    duration of each spawn; the effect is worse on a slow filesystem, a network-
                    mounted Node.js path, or a `node` shim with non-trivial startup overhead.
classification:    major
                    (1) touches 1 file: pass — (2) no public API/grammar/LSP change: pass —
                    (3) no new dependency: pass — (4) regression-testable with existing harness:
                    FAIL — no src/test/ source set exists (P63-D5-001) — (5) reviewer can name the
                    exact edit (move getNodeVersion()/getBBjClasspathEntries() calls off the EDT
                    via a debounced background task): pass — (6) severity `medium`, dimension D3
                    (not D1): pass — test (4) alone fails, so classification is `major` per D-13.
effort:            4
dedup:             none — no frozen open issue names EDT-blocking behaviour in the BBj settings
                    panel.
disposition:       major-refactor
```

```
id:                P63-D6-001
unit:              RU-63-03
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java:34
dimension:         D6
secondary:         []
severity:          medium
evidence_tier:     inherited
evidence:          Version/advisory claim (repro-equivalent per INVENTORY 3b): NODE_VERSION =
                    "v20.18.1" (:34). Verified live against nodejs.org's own release index
                    (https://nodejs.org/dist/index.json, queried at sweep time): v20.18.1 released
                    2024-11-20, lts: "Iron", security: false (not itself a security release). The
                    official nodejs/Release schedule.json's v20 block: lts 2023-10-24, maintenance
                    2024-10-22, end 2026-04-30 — end-of-life has already passed as of this sweep
                    (2026-08-18). The same index.json lists 5 later v20.x releases flagged
                    security: true that post-date v20.18.1: v20.18.2 (2025-01-21), v20.19.2
                    (2025-05-14), v20.19.4 (2025-07-15), v20.20.0 (2026-01-12), v20.20.2
                    (2026-03-24, the v20 line's own final release). This is the advisory reference
                    this cell's tier requires: nodejs.org's own release-index security flags, not a
                    full per-CVE enumeration (out of this cell's scope per D-10's boundary).
failure_scenario:  Every install of this plugin downloads and executes a Node.js runtime build that
                    is, as of sweep time, past its own upstream end-of-life and missing at least 5
                    releases nodejs.org itself flagged as security fixes — the plugin has no
                    mechanism to pick up any of those fixes short of a plugin-code change to the
                    pinned constant and a new plugin release.
classification:    major
                    (1) touches 1 file: pass (the pin is a single constant) — (2) no public
                    API/grammar/LSP change: pass — (3) no new dependency: n/a — this is a version
                    bump of an existing pinned artifact, not a new dependency addition — (4)
                    regression-testable with existing harness: FAIL — no src/test/ source set
                    exists (P63-D5-001) — (5) reviewer can name the exact edit (bump NODE_VERSION
                    to a current, in-support v20.x or later LTS release and verify the download
                    filename/checksum shape is unchanged): pass — (6) severity `medium`, dimension
                    D6 (not D1): pass — test (4) alone fails, so classification is `major` per
                    D-13.
effort:            4
dedup:             none — no frozen open issue names the pinned Node.js runtime version.
disposition:       major-refactor
```

```
id:                P63-D6-002
unit:              RU-63-03
location:          bbj-intellij/build.gradle.kts:12-13
dimension:         D6
secondary:         []
severity:          medium
evidence_tier:     inherited
evidence:          Routed item (INVENTORY.md Routing table, D-06): build.gradle.kts:12-13 reads
                    `sourceCompatibility = JavaVersion.VERSION_17` / `targetCompatibility =
                    JavaVersion.VERSION_17` (confirmed by reading the file). The local JDK is
                    Temurin 25.0.3 (`java -version` in this environment). `cd bbj-intellij &&
                    ./gradlew --offline -q tasks` fails in ~5s with the literal output
                    `FAILURE: Build failed with an exception. * What went wrong: 25.0.3`, before
                    task listing — an environment/toolchain rejection, not a code defect in the
                    build script's stated target (D-07 — no Gradle task was scheduled or run beyond
                    this one confirmatory invocation, which itself failed before doing any work).
                    THIS FINDING'S location: IS bbj-intellij/build.gradle.kts:12-13, A FILE
                    INVENTORY ASSIGNS TO RU-64-02 FOR EVERY OTHER DIMENSION — THE PHASE'S ONE
                    DELIBERATE location: EXCEPTION (D-10), RECORDED HERE BECAUSE RU-63-03/D6 IS THE
                    PHASE'S ONLY LIVE D6 CELL.
failure_scenario:  A contributor or CI runner whose local/available JDK does not include a
                    JavaVersion.VERSION_17-compatible toolchain (as is the case in this execution
                    environment, which only offers Temurin 25.0.3) cannot build, test, or
                    statically analyze bbj-intellij at all — the build fails before task listing,
                    which is why this entire phase records D1-D3/D6 evidence via trace rather than
                    reproduction (D-07).
classification:    major
                    (1) touches 1 file: pass — (2) no public API/grammar/LSP change: pass —
                    (3) no new dependency: n/a — resolving a toolchain mismatch is a version/
                    configuration change, not a new dependency addition — (4) regression-testable
                    with existing harness: FAIL — no src/test/ source set exists (P63-D5-001), and
                    the Gradle build itself cannot currently run to validate any fix in this
                    environment — (5) reviewer can name the exact edit: n/a at this recording stage
                    — resolution requires RU-64-02's own broader toolchain/IntelliJ-Platform-version
                    triage, not a single named edit from this unit's evidence alone — (6) severity
                    `medium`, dimension D6 (not D1): pass — tests (4) and (5) both fail/n/a, so
                    classification is `major` per D-13.
effort:            8
dedup:             none — no frozen open issue names the bbj-intellij Gradle/JDK toolchain
                    mismatch. `dedup:` additionally notes: RU-64-02 owns bbj-intellij/build.gradle.kts
                    for every dimension other than this routed D6 cell (D-10) — Phase 64's own sweep
                    re-triages this item rather than re-deriving it; this record is the full
                    evidence handoff, not a duplicate.
disposition:       major-refactor
```

```
id:                P63-D4-001
unit:              RU-63-03
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java:50,103,125,136-139,148,152,97-165
dimension:         D4
secondary:         []
severity:          low
evidence_tier:     trace
evidence:          Mechanical structural check: `SystemInfo.isWindows` appears as an independent
                    branch condition 5 times in this file (:50, :103, :125, :136-139, :148, :152 —
                    grep count confirms 6 literal occurrences across those 5 decision sites, one
                    site spanning two lines), with no shared platform-strategy helper. Line-count
                    check on downloadAndExtractNode (:97-165): 69 lines performing URL
                    construction, download, archive-type dispatch, extraction, binary resolution,
                    copy, chmod, and cleanup — 8 responsibilities in one method.
failure_scenario:  n/a (D4 is a code-shape finding, not a runtime failure scenario) — the
                    duplication is a maintainability cost: any future platform-specific fix (e.g.
                    a sixth OS/architecture combination, or hardening one branch without the
                    others) must be applied at up to 5 separate sites by hand, with drift risk
                    between them; the god-function shape makes downloadAndExtractNode harder to
                    review, test in isolation, or partially reuse (e.g. resolving just the
                    extracted-binary path without also downloading).
classification:    easy
                    (1) touches 1 file: pass — confined to BbjNodeDownloader.java — (2) no public
                    API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-
                    testable with existing harness: satisfied vacuously per D-09 — extracting a
                    shared platform-strategy helper and splitting downloadAndExtractNode into
                    named steps changes no runtime behaviour, so there is no regression to test —
                    (5) reviewer can name the exact edit (extract a small `Platform` helper/enum
                    and split downloadAndExtractNode into buildUrl/download/extract/install/
                    cleanup steps): pass — (6) severity `low`, dimension D4 (not D1): pass — all
                    six tests pass, so classification is `easy` per D-13.
effort:            4
dedup:             none — no frozen open issue names code-shape duplication in the Node.js
                    downloader.
disposition:       easy-fix
```

```
id:                P63-D4-002
unit:              RU-63-03
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettings.java:30,107,111,116,150
dimension:         D4
secondary:         [D2]
severity:          low
evidence_tier:     trace
evidence:          Mechanical grep check for the literal `5008` across the unit's settings files:
                    BbjSettings.java:30 (`public int javaInteropPort = 5008;`), :107 (Javadoc),
                    :111, :116, :150 (three `return 5008;` default branches);
                    BbjSettingsComponent.java:119 (`javaInteropPortField.setText("5008")`), :125,
                    :297, :302 (comments/`return 5008` defaults); BbjSettingsConfigurable.java:131
                    (`if (javaInteropPort == 5008)`), :136 (`if (detected != 5008)`) — 3 files, no
                    shared named constant (e.g. a `DEFAULT_JAVA_INTEROP_PORT` field) anywhere.
failure_scenario:  n/a (D4 is a code-shape finding) — if the default java-interop port is ever
                    changed (matching a future language-server default), every one of these sites
                    across 3 files needs a coordinated, hand-synchronized edit; missing one leaves
                    an inconsistent default between the UI's placeholder text, the persisted
                    state's default, and the Configurable's "was this ever changed from default"
                    check used by P63-D2-002's auto-detection gate — silently reintroducing or
                    compounding that finding.
classification:    major
                    (1) touches 1 file: FAIL — a shared constant used consistently requires
                    editing all 3 files that currently hardcode the literal — (2) no public
                    API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-
                    testable with existing harness: FAIL — no src/test/ source set exists
                    (P63-D5-001) — (5) reviewer can name the exact edit (introduce
                    BbjSettings.DEFAULT_JAVA_INTEROP_PORT and reference it from all 3 files):
                    pass — (6) severity `low`, dimension D4 (not D1): pass — test (1) and test (4)
                    both fail, so classification is `major` per D-13.
effort:            2
dedup:             none — no frozen open issue names this literal-duplication gap.
disposition:       major-refactor
```

```
id:                P63-D5-001
unit:              RU-63-03
location:          bbj-intellij/build.gradle.kts
dimension:         D5
secondary:         []
severity:          medium
evidence_tier:     inherited
evidence:          Established by enumeration, not assumption: `ls bbj-intellij/src/` -> `main`
                    (only). `grep -rn "test" bbj-intellij/build.gradle.kts` -> no matches (no test
                    dependency declared, no test task configured). bbj-intellij has no test source
                    set at all — the systemic fact this finding records once for the whole phase
                    (D-08); the other four Phase 63 units' own D5 cells cross-reference this ID by
                    number rather than restating the enumeration.
failure_scenario:  Every RU-63-03 behaviour recorded above — the download/extract/cache pipeline
                    (P63-D1-001/002, P63-D6-001/002), the cache-availability/port-auto-detect/
                    concurrent-download correctness gaps (P63-D2-001/002/003), and the EDT-
                    blocking UI behaviour (P63-D3-001) — ships and regresses silently: there is no
                    harness in this module that would fail if any of it broke.
classification:    major
                    (1) touches 1 file: n/a — this finding *is* the missing-test-infrastructure gap
                    itself, not a behaviour fix — (2) no public API/grammar/LSP change: pass — (3)
                    no new dependency: FAIL by D-13's own accounting for this class of finding —
                    establishing a JVM test source set requires adding a test framework dependency
                    (e.g. JUnit) to build.gradle.kts, which is itself a new dependency — (4)
                    regression-testable with the existing harness, no new test infrastructure: FAIL
                    by definition — adding a src/test/ source set *is* new test infrastructure
                    (D-09's primary reading) — (5) reviewer can name the exact edit (add a
                    `sourceSets.test`/JUnit dependency block to build.gradle.kts and author a first
                    test class): pass — (6) severity `medium`, dimension D5 (not D1): pass — tests
                    (3) and (4) both fail, so classification is `major` per D-13.
effort:            8
dedup:             none — no frozen open issue names bbj-intellij's absent test infrastructure.
disposition:       major-refactor
```

```
id:                P63-D8-001
unit:              RU-63-03
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java:42-45
dimension:         D8
secondary:         []
severity:          low
evidence_tier:     trace
evidence:          getCachedNodePath()'s Javadoc (:42-45) describes it purely as a getter ("Gets
                    the cached Node.js path if it exists and is executable... fast and
                    synchronous"). The implementation calls getNodeDataDirectory() (:49), which
                    performs Files.createDirectories(dataDir) (:245) on every invocation — a
                    filesystem write attempt, not documented anywhere in this method's Javadoc,
                    which describes only the read/existence-check semantics.
failure_scenario:  n/a (D8 is a doc-accuracy finding) — a caller relying on the Javadoc's implied
                    read-only contract (e.g. calling this method speculatively/defensively,
                    assuming it cannot fail due to a write) is not warned that this "getter" can
                    also fail for write-related reasons (permission, read-only filesystem, disk
                    full) — which is exactly the ambiguity P63-D2-001 records as a correctness gap;
                    this finding is the doc-accuracy half of that same code shape.
classification:    easy
                    (1) touches 1 file: pass — (2) no public API/grammar/LSP change: pass — (3) no
                    new dependency: pass — (4) regression-testable with existing harness: satisfied
                    vacuously per D-09 — a Javadoc-only edit changes no runtime behaviour — (5)
                    reviewer can name the exact edit (add one sentence noting the directory-creation
                    side effect to the Javadoc): pass — (6) severity `low`, dimension D8 (not D1):
                    pass — all six tests pass, so classification is `easy` per D-13.
effort:            2
dedup:             none — no frozen open issue names this Javadoc omission.
disposition:       easy-fix
```

### Not-reproducible dispositions

- **Tier failed: `repro` (D1, secondary D6).** Candidate claim: whether `extractTarGz`'s delegation to the system `tar` binary (`BbjNodeDownloader.java:190-218`) actually permits a path-traversal write via a crafted archive entry (e.g., an entry name containing `../` segments) on the `tar` implementations available on macOS/Linux. **Reason not recorded as a finding:** confirming this would require constructing and extracting a malicious `.tar.gz` archive against a live `tar` invocation — which is itself the trigger-sequence/proof-of-concept D-13 prohibits publishing for a D1-adjacent claim regardless of the outcome, and no such harness exists in this phase's scope (this sweep documents code behaviour via trace, it does not construct exploit archives). The fact that this path delegates entry-safety to the system `tar` with no validation of its own is stated as SEC-03 fact (3) instead, which is the trace-clearable claim; whether that delegation is actually exploitable on any specific `tar` build is left here, per RVW-06's drop-vs-disposition rule, rather than silently dropped.

### Cross-unit referrals

None. `RU-63-03`'s sweep raised no candidate whose defect is located outside `bbj-intellij/`'s settings/runtime-acquisition surface or inside `bbj-vscode/` — stated explicitly per the per-unit stopping rule's empty-subblock register, rather than omitted.

### Unit closure

`RU-63-03` is closed against the four-part stopping rule (D-06): **(i)** all 7 live cells (D1, D2, D3, D4, D5, D6, D8) carry a `pass`/`fail` verdict plus a written check line above; **(ii)** all six files are named at least once inside this section — `BbjSettings.java` (D1/D2/D4/D8 cells, `getBBjClasspathEntries`/`detectJavaInteropPort` evidence), `BbjSettingsComponent.java` (D1/D2/D3/D4 cells, `P63-D3-001`'s `location:`), `BbjSettingsConfigurable.java` (D1/D2/D4 cells, `P63-D2-002`'s `location:`), `BbjHomeDetector.java` (D1/D2/D3 cells), `BbjNodeDetector.java` (D1/D2/D3 cells), `BbjNodeDownloader.java` (D1/D2/D3/D4/D6/D8 cells and every finding's `location:` above); **(iii)** every candidate claim raised during either task is either one of the 11 finding records above or the single `### Not-reproducible dispositions` entry — none was silently dropped; **and (iv)** `RU-63-03` owns **zero** inherited Phase 62 referrals — confirmed by the Inherited referral ledger above, where no row names `RU-63-03` as a "To unit" — stated explicitly rather than left as silence, while the ledger's eighth (routed) row was dispositioned as `promoted — P63-D6-002` in Task 1.

**Scope-fidelity note.** All six files in this unit were swept across all 7 live dimensions, even though ROADMAP's Phase 63 success **criterion 1** names only `BbjSettingsComponent.java` and `BbjNodeDownloader.java` from this unit (alongside files from other units) — the Applicability Grid, not the ROADMAP criteria, is the contract, and the criteria are a deliberately named subset of it (D-16); the extra coverage here (`BbjSettings.java`, `BbjSettingsConfigurable.java`, `BbjHomeDetector.java`, `BbjNodeDetector.java`) is recorded as deliberate, not scope creep.

## RU-63-01 — Run, compile & EM actions

**Files (11 / 1,260 LOC):**
- `com/basis/bbj/intellij/actions/BbjCompileAction.java` (71)
- `com/basis/bbj/intellij/actions/BbjComposeAddChildWindowAction.java` (38)
- `com/basis/bbj/intellij/actions/BbjComposeAddWindowAction.java` (38)
- `com/basis/bbj/intellij/actions/BbjComposeMsgboxAction.java` (38)
- `com/basis/bbj/intellij/actions/BbjEMLoginAction.java` (169)
- `com/basis/bbj/intellij/actions/BbjEMTokenStore.java` (89)
- `com/basis/bbj/intellij/actions/BbjRefreshJavaClassesAction.java` (48)
- `com/basis/bbj/intellij/actions/BbjRunActionBase.java` (423)
- `com/basis/bbj/intellij/actions/BbjRunBuiAction.java` (142)
- `com/basis/bbj/intellij/actions/BbjRunDwcAction.java` (142)
- `com/basis/bbj/intellij/actions/BbjRunGuiAction.java` (62)

**Risk rank:** 2 of 5 Phase 63 units — every run/compile action spawns a process (`BbjRunActionBase.java` is the shared base for GUI/BUI/DWC), and `BbjEMTokenStore.java` is the EM token lifecycle's IntelliJ-side storage, cross-referenced by SEC-04.
**Sweep method:** full read.
**Owning plan:** 63-02.

### Cells
- D1 Security — fail — Checked, across the unit's process-spawning and EM-credential surfaces: every `GeneralCommandLine` construction site — `BbjRunGuiAction.buildCommandLine` (:27-52, `-q`/classpath-arg/config-arg/`-WD`+file path, all via `.addParameter(...)`), `BbjRunBuiAction`/`BbjRunDwcAction.buildCommandLine` (:115-134 each, `-q`/`-WD<webRunnerDir>`/`web.bbj`/mode literal/name/programme/workingDir/classpath/token[/configPath]), `BbjRunActionBase.validateTokenServerSide` (:298-303, `-q`/`em-validate-token.bbj`/`-`/token/tmpFile), and `BbjEMLoginAction.performLogin` (:98-112, `-q`/`em-login.bbj`/`-`/username/password/tmpFile/client-info-string) — traced every interpolated segment back to its origin: `bbjHomePath`/`classpathEntry`/`configPath` all come from `BbjSettings` (`BbjSettings.java:18-20`), an **application-level** `@State`/`@Storage` service (confirmed via `plugin.xml:174-176`'s `<applicationService serviceImplementation="...BbjSettings"/>` registration, not a `<projectService>`) — unlike VS Code's workspace-scoped `bbj.classpath`/`bbj.configPath`, this value cannot be committed into a shared repository's own config and silently supplied by an untrusted workspace; it is only ever set by the local developer through Settings > Languages & Frameworks > BBj. `file`/`workingDir`/`programme`/`name` derive from the currently-open `VirtualFile` (`CommonDataKeys.VIRTUAL_FILE`), the user's own editor selection, not a workspace-committed value or a caller-supplied `params` object (IntelliJ's run actions carry no `params`-style external-invocation surface analogous to `extension.ts`'s `runBUI(params)`). Every one of these values reaches the spawned process as a **separate array element** via `GeneralCommandLine.addParameter(...)`, executed directly by `OSProcessHandler`/`CapturingProcessHandler` with **no shell involved at any call site** (confirmed by reading all eleven files in full — no `Runtime.exec(String)`, no `ProcessBuilder("sh","-c",...)`, no string-concatenated command line anywhere) — this is the categorical safety difference Phase 62's `P62-D7-001` already established from the VS Code side: none of these interpolated values is ever subject to shell-metacharacter reinterpretation, so the unescaped-shell-injection class of defect `P62-D1-003` records for `Commands.cjs`/`extension.ts` has no equivalent surface here. This unit's own D1 surface is therefore the EM credential/token lifecycle and the temp-file/cache trust it depends on, not command-string injection: **EM credential and token handling** — `BbjEMLoginAction.java:103` passes the plaintext EM password as a `GeneralCommandLine` argument to the spawned `bbj -q em-login.bbj` process, and `BbjRunActionBase.java:302`/`BbjRunBuiAction.java:127`/`BbjRunDwcAction.java:127` each pass the JWT token the same way — process argument lists are visible to any other process on the same host capable of enumerating them (`ps`/Task Manager-class visibility), and neither value passes through an environment-variable or stdin channel instead; **token storage** — `BbjEMTokenStore.java:25-46` stores the JWT via `PasswordSafe.getInstance().set(attrs, credentials)` (:34) keyed by `CredentialAttributesKt.generateServiceName("BBj Enterprise Manager", "jwt-token")` (:27), which — unlike a plaintext settings field — delegates to IntelliJ's own encrypted-at-rest credential backend, a genuine security improvement over a hand-rolled store; **expiry decoding** — `BbjEMTokenStore.isTokenExpired()` (:56-88) decodes the JWT's `exp` claim via regex against the base64url-decoded payload with **no signature verification of any kind** (confirmed: no `Signature`/JWT-library usage anywhere in this 89-line file) and returns `false` (not expired) for every one of: a non-3-part string (:64-66), a payload missing the `exp` claim (:76-77), and any exception during decode (:84-86) — a malformed, unsigned, or `exp`-less token is therefore treated identically to a genuinely fresh one by this client-side check, though `validateTokenServerSide()` (`BbjRunActionBase.java:282-322`) provides a server-side backstop for the run flows (not for `BbjEMLoginAction` itself, which has none); **temp files** — the temp files passed as arguments at `BbjRunActionBase.java:295`/`:303` and `BbjEMLoginAction.java:96`/`:104` are created via `Files.createTempFile(prefix, ".tmp")` with **no explicit `FileAttribute`/POSIX-permission argument** at either call site, so the file — which receives the EM login's plaintext JWT output or the validate-token result — is created with whatever default permissions the JVM/OS combination applies rather than an explicit owner-only (`0600`) grant, for the window between process completion and the `finally`-block delete; **output handling** — `BbjRunActionBase.java:74-95`'s `ProcessListener.onTextAvailable` forwards only `STDERR` text to `BbjServerService.logToConsole()` (`BbjServerService.java:64-67`), which prints directly into an in-memory `ConsoleView` Tool Window and writes to no file or other persistent sink (confirmed by reading `logToConsole`'s 4-line body) — so no credential/token value that might appear in process output reaches a durable log; stdout is not captured at all by this listener (see D2). No runnable reproduction accompanies any of these records (D-07 — the Gradle build cannot run in this environment and a live process-inspection harness is out of this static-trace sweep's scope). 3 findings recorded: P63-D1-003, P63-D1-004, P63-D1-005.
- D2 Correctness & error handling — fail — Checked `actionPerformed`'s guard clauses across all eleven actions for the no-project/no-editor/wrong-file-type/missing-BBj-home cases: `BbjRunActionBase.actionPerformed` (:43-49) returns silently if `project`/`file` is null, then calls `validateBeforeRun()` (:144-169), which checks `bbjHomePath` non-empty, the directory exists, and the executable resolves, logging a specific, actionable error for each failure via `logError()`/auto-showing the LS log window; `BbjCompileAction.actionPerformed` (:25-31) and `BbjRefreshJavaClassesAction.actionPerformed` (:22-26) both null-guard `project`; the three `BbjCompose*Action` classes null-guard both `project` and `editor` (:20-25 each) before calling `ComposerLauncher.launch(...)`, which declares no checked exception and is not locally wrapped in `try`/`catch` — the platform's own action-invocation infrastructure catches any uncaught exception from `actionPerformed` and reports it, so this is a deliberate, safe delegation, not a swallowed-exception gap. Checked `update()`/`getActionUpdateThread()` agreement across all eleven actions: `BbjRunActionBase`, `BbjCompileAction`, `BbjRefreshJavaClassesAction`, and all three `BbjCompose*Action` classes each explicitly override both, uniformly declaring `ActionUpdateThread.BGT`. **`BbjEMLoginAction` overrides neither** — it extends `AnAction` directly (:25) and defines only `actionPerformed()`, so it inherits the platform's default enablement (always enabled/visible, with no BBj-Home/server-readiness gate the other ten actions all apply) — a genuine cross-action inconsistency, though `performLogin()`'s own internal checks (:46-53) prevent a hard failure by showing an error dialog instead. More significantly: because `actionPerformed()` always executes on the EDT regardless of `getActionUpdateThread()` (which governs only where `update()`'s enablement check runs, not where `actionPerformed()` itself runs), and `BbjEMLoginAction` has no threading override to move its own body off that thread, `BbjEMLoginAction.performLogin()`'s `handler.runProcess(15000)` (:115, up to 15s) blocks the EDT synchronously end to end. The same is true, indirectly, for `BbjRunBuiAction`/`BbjRunDwcAction`: their `buildCommandLine()` override — which calls `validateTokenServerSide()` (`BbjRunActionBase.java:282-322`, up to 10s via `CapturingProcessHandler.runProcess(10000)` at :308) and, on an expired/invalid token, `BbjEMLoginAction.performLogin()` (up to another 15s) — is invoked directly from `BbjRunActionBase.actionPerformed()` at line 60, **before** the `ApplicationManager.getApplication().executeOnPooledThread(...)` dispatch at line 67, whose adjacent comment states its purpose is specifically "to avoid UI freezing"; that pooled-thread dispatch wraps only the final `OSProcessHandler` launch, not `buildCommandLine()`'s own token-validation round trip, so a "Run As BUI/DWC" click can freeze the entire IDE for up to ~25 seconds in the worst case (10s validate + 15s re-login) — precisely the class of defect the project's own "Process launch off EDT to pooled thread" decision (PROJECT.md Key Decisions) was intended to prevent, for the one flow it does not actually cover. Checked temp-file/process-handle release on every exit path: `validateTokenServerSide()`'s `finally` (:315-317) deletes its temp file on every exit including exceptions inside the `try` — correct; but `BbjEMLoginAction.performLogin()`'s temp file, created at :96, is only deleted inside the **inner** `try`/`finally` at :119-123, which wraps the read of `tmpFile` — **not** the `handler.runProcess(15000)` call at line 115, which sits between the file's creation and that inner block; an exception thrown by `runProcess` itself (a launch failure, an I/O error, or the 15s timeout being exceeded) skips the inner `try`/`finally` entirely and reaches only the outer `catch (Exception ex)` at :145, which never deletes `tmpFile` — a genuine, if minor, temp-file leak on that specific error path, potentially containing a partially-written token if `em-login.bbj` wrote before the failure. Checked concurrent-invocation collisions: `Files.createTempFile()` generates a unique random filename per call at every one of this unit's four call sites, so — unlike `RU-63-03`'s shared fixed cache path — two concurrent invocations of this unit's actions cannot collide on the same temp path. Checked `BbjEMTokenStore`'s "unknown expiry" return value against its callers: both `BbjRunBuiAction`/`BbjRunDwcAction` treat `isTokenExpired() == false` as "proceed to server-side validation" (:75-78), so a token this decoder cannot parse is not silently trusted end-to-end; this partially mitigates, but does not eliminate, the D1 finding above, since `BbjEMLoginAction`'s own freshly-issued token is never separately re-checked before being stored. 3 findings recorded: P63-D2-004, P63-D2-005, P63-D2-006.
- D3 Performance & resource use — fail — Checked `update()`'s per-repaint cost across all eleven actions: each reads at most a `VirtualFile` extension string comparison plus one in-memory `BbjServerService.getCurrentStatus()` field read (`BbjRunActionBase.java:121-129`, `BbjCompileAction.java:55-64`, `BbjRefreshJavaClassesAction.java:34-41`) or two null checks (`BbjCompose*Action.update()`) — no filesystem access, no settings read, no process spawn on any `update()` path in this unit, unlike `RU-63-03`'s keystroke-triggered EDT subprocess spawn — pass on this specific check. Checked whether the three plugin-bundled-tool-path resolvers re-resolve on every call rather than caching: `getWebBbjPath()`/`getEmValidateBbjPath()` (`BbjRunActionBase.java:232-248,257-272`) and `getEMLoginBbjPath()` (`BbjEMLoginAction.java:158-168`) each call `PluginManager.getInstance().findEnabledPlugin(pluginId)` (an in-memory registry lookup, not a filesystem walk) plus one `Files.exists()` stat, on every invocation with no cache field — but these run at most once or twice per user-initiated Run/Login/Validate click, not per keystroke or per repaint, so the absent caching is a low-cost inefficiency, not a hot-path defect, and is not separately promoted. Checked process-output accumulation: `BbjRunActionBase.java:72-100`'s `ProcessListener` prints each `STDERR` line individually to `logToConsole()` with no local buffering of its own — bounded by whatever `ConsoleView` itself manages, not this code. Checked whether repeated runs leak processes, listeners, or temp files: each invocation constructs a fresh `OSProcessHandler`/anonymous `ProcessListener` with no static or instance-level retention across invocations, and (per the D2 cell) temp files are deleted on every exit path except the one leak noted there — no unbounded accumulation found. The one genuine hot-repetition cost: **every** "Run As BUI"/"Run As DWC" invocation — not just the first one after login — performs a full server round-trip token validation via `validateTokenServerSide()` (`BbjRunActionBase.java:282-322`, spawning a second `bbj` process with a 10-second timeout) in addition to the cheap client-side `isTokenExpired()` decode, even when the token was validated seconds earlier by the previous run; there is no cached "validated at time T, trust until expiry or N minutes" result anywhere in this unit — each run redundantly re-spawns and re-waits on the validation subprocess, and because (per `P63-D2-004`) this call happens synchronously on the EDT before the pooled-thread dispatch, this redundant cost directly compounds that finding's UI-freeze duration on every single click, not only the first. 1 finding recorded: P63-D3-002.
- D4 Maintainability & code smells — fail — Checked `BbjRunBuiAction.java`/`BbjRunDwcAction.java` (both 142 LOC) with a line-anchored `diff`/`git diff --no-index --numstat`: only 11 of 142 lines differ per file (the `"BUI"`/`"DWC"` client-type literal, three user-facing message strings, the constructor's display text/icon, and `getRunMode()`'s return value) — the remaining 131 lines, including the entire EM-login/token-validation/classpath/config-path/command-line-assembly flow, are byte-for-byte identical, confirming the strong duplication signal mechanically rather than by eyeball. Did the same for the three `BbjComposeAddChildWindowAction.java`/`BbjComposeAddWindowAction.java`/`BbjComposeMsgboxAction.java` files (38 LOC each): pairwise `numstat` shows 4/38 and 5/38 lines differing (class name, doc comment, and the `ComposerLauncher.Kind` constant only) — the `update()`/`actionPerformed()`/`getActionUpdateThread()` bodies are otherwise identical across all three. Checked whether `BbjRunActionBase.java` (423 LOC) has crossed into god-class territory: it carries action enablement, settings-derived argument/path resolution, auto-save, process launch and output listening, logging helpers, and — the one responsibility structurally out of place — EM server-side token validation (`validateTokenServerSide`, `getEmValidateBbjPath`), which otherwise belongs alongside `BbjEMTokenStore.java`'s client-side token lifecycle and `BbjEMLoginAction.java`'s login round-trip rather than inside the "run action" base class. Checked whether `buildCommandLine` (`:414`) is the only extension point: confirmed — all three run subclasses override only `buildCommandLine()` and `getRunMode()`, no other base-class behaviour is overridden anywhere, so the contract is clean on that axis. Checked for duplicated constants/path strings/option flags: the `"-q"` quiet-mode flag literal appears independently in `BbjRunGuiAction.java:30`, `BbjRunActionBase.java:299`, and `BbjEMLoginAction.java:99` with no shared constant; the `"lib/tools/"` plugin-bundled-path-resolution pattern is independently re-implemented three times (`getWebBbjPath`/`getEmValidateBbjPath` in `BbjRunActionBase.java`, `getEMLoginBbjPath` in `BbjEMLoginAction.java`) with no shared helper — a more substantial duplication, each instance re-deriving the same `PluginManager`-lookup-plus-`Files.exists`-check shape. 4 findings recorded: P63-D4-003, P63-D4-004, P63-D4-005, P63-D4-006.
- D5 Test coverage gaps — fail — Cross-references `P63-D5-001` (`RU-63-03`) rather than restating the systemic zero-test-source-set fact: `bbj-intellij` has no `src/test/` source set at all (re-confirmed here: `ls bbj-intellij/src/` -> `main` only). This unit's own specific consequence: the three run-mode command-line assemblies (`BbjRunGuiAction.buildCommandLine`, `BbjRunBuiAction`/`BbjRunDwcAction.buildCommandLine`'s `web.bbj`-argument-order construction), the EM login round-trip (`BbjEMLoginAction.performLogin`'s credential-prompt/spawn/token-store sequence), the EM token lifecycle (`BbjEMTokenStore`'s store/get/delete/`isTokenExpired` decode), the server-side revalidation flow (`validateTokenServerSide`), and per-action enablement (`update()`/`getActionUpdateThread()` across all eleven actions) are all untested — concretely, every finding recorded above in this unit (`P63-D1-003` through `P63-D1-005`, `P63-D2-004` through `P63-D2-006`, `P63-D3-002`, `P63-D4-003` through `P63-D4-006`, `P63-D7-001` through `P63-D7-003`) would ship and regress silently, with no harness that would fail if any of it broke or was fixed incorrectly. A first test suite for this unit would minimally need to cover: `BbjEMTokenStore.isTokenExpired()`'s pure-function JWT-payload-decode branches (malformed/non-JWT/missing-`exp`/expired/valid — the one piece of this unit's logic needing no IntelliJ Platform test fixture at all, mirroring `RU-63-03`'s own `meetsMinimumVersion()` precedent), each `buildCommandLine()`'s argument-list shape for a given settings/file-state combination (feasible with a fake `Project`/`VirtualFile`/`BbjSettings.State`, without spawning `bbj`), and the `update()` enablement matrix across all eleven actions for the project-null/file-null/wrong-extension/server-not-started combinations.
- D6 Dependency health — n/a — "No distinct third-party dependency of its own; dependency-tree health (npm and Gradle) is assessed once, exhaustively, at `RU-64-02`, and vendored-binary provenance at `RU-64-03`. Repeating the audit per unit would restate the same npm/Gradle audit under a different heading, not surface a new finding."
- D7 Cross-IDE parity — fail — Enumerated IntelliJ's action surface from this unit's eleven files against VS Code's command surface (`bbj-vscode/package.json`'s `contributes.commands`, 19 entries, and `extension.ts`'s `registerCommand` calls): `bbj.run`/`bbj.runBUI`/`bbj.runDWC`/`bbj.loginEM` map to `BbjRunGuiAction`/`BbjRunBuiAction`/`BbjRunDwcAction`/`BbjEMLoginAction` respectively, with parity confirmed on the safety-methodology axis Phase 62's `P62-D7-001` already recorded from the VS Code side (`Commands.cjs`'s `run`/`runWeb`/`compile` and `extension.ts`'s EM validate/login all build one shell-interpolated string for `child_process.exec()`; this unit's equivalents uniformly use `GeneralCommandLine.addParameter(...)` with no shell involved — see the D1 cell above for this unit's own confirmation of that same divergence). Three genuine IntelliJ-side gaps against the VS Code surface, each corresponding to one of the three inherited Phase 62 referrals disposed below: **`bbj.compile`** has an IntelliJ action (`BbjCompileAction`) that is registered, visible, and enabled, but its `actionPerformed()` (:24-39) only logs `"[Compile] Triggered for file: " + file.getName()` and never invokes `bbjcpl` — unlike VS Code's real 18-option-aware compile (`Commands.cjs:294-343` via `CompilerOptions.ts`); **`bbj.configureCompileOptions`, `bbj.denumber`, `bbj.decompile`, `bbj.decompileReadonly`, and `bbj.em`** — 5 VS Code commands (enumerated by name from `package.json`; Phase 62's own referral text describes this set as "six," but a direct enumeration of the named commands against `bbj-intellij/src/main/java/`'s full action inventory confirms exactly 5 distinct command IDs with no IntelliJ action counterpart anywhere in the module — noted here as a correction to the inherited referral's own count, not silently adopted) — have no `bbj-intellij` action at all; **`bbj.refreshJavaClasses`** exists on both sides but diverges in mechanism: `BbjRefreshJavaClassesAction.java:22-32`'s `actionPerformed` calls `BbjServerService.getInstance(project).restart()` (:30), which — per `BbjServerService.java:206-211` — stops and restarts the **entire** LSP4IJ-managed language server (`manager.stop(...)`/`manager.start(...)`), taking every language feature (diagnostics, completion, hover, Structure View) offline for the restart's duration, whereas VS Code's `bbj.refreshJavaClasses` (`extension.ts:694-704`) sends a single targeted `bbj/refreshJavaClasses` LSP request (`client.sendRequest(...)`, :700) with no server restart and no interruption to any other language feature. All three are IntelliJ-side absences/divergences, not VS Code-side defects, so per D-05 none is located inside `bbj-vscode/`; each is dispositioned under `### Inherited referral triage` below and promoted to its own `P63-D7-*` finding. 3 findings recorded: P63-D7-001, P63-D7-002, P63-D7-003.
- D8 Comment & doc accuracy — fail — Checked every class-level and method-level Javadoc across the eleven files against the code just read. `BbjRunActionBase`'s class doc ("shared functionality: settings access, auto-save, error handling, file validation") and each of its method docs (`validateBeforeRun`, `getBbjExecutablePath`, `getClasspathArg`, `getWebBbjPath`, `getConfigPath`, `autoSaveIfNeeded`, `logError`/`logInfo`, `buildCommandLine`, `getRunMode`) were checked individually against their bodies — all accurate, including `getConfigPath`'s doc explaining the issue-#382 sentinel-avoidance fallback, which matches `:342-363`'s implementation exactly. `BbjEMLoginAction`'s class comment (:21-24, "Prompts for credentials, launches em-login.bbj, stores token in PasswordSafe") matches `performLogin`'s actual sequence (:44-152) precisely. `BbjCompileAction`'s inline `TODO` (:35, "Implement language server custom notification for bbj.compile command") was checked against the current code and referral #1's own triage above — it still accurately names the exact missing mechanism and has not drifted from reality, so it is not itself a D8 finding; **but** the class-level Javadoc (:14-17) and the constructor's action text (:20-22) both assert compile behaviour unconditionally, with no hint of the gap the honest inline TODO discloses — a genuine doc-accuracy defect, since a reader of the class doc or the action's tooltip alone would not suspect the stub. `BbjEMTokenStore`'s class doc (:15-18, "Utility for storing and retrieving EM JWT tokens via IntelliJ PasswordSafe... stored in the OS-native keychain") and `isTokenExpired`'s doc (:49-54, "Returns true if token is expired, false otherwise or if unable to determine") were both checked: the expiry-decoder doc is accurate — it honestly documents the exact fail-open behaviour `P63-D1-004` records as a security finding, so it is not independently promoted as a doc-accuracy defect; the class doc's "OS-native keychain" claim, however, overclaims a specific backend that `PasswordSafe` does not guarantee — IntelliJ's own Passwords system setting lets a user select KeePass (a local encrypted file) or "Do not save" (memory-only) instead, and nothing in this file pins or checks the active backend. `BbjRefreshJavaClassesAction`'s doc (:11-14, "Restarts the language server to clear all cached Java class data and reload classpath") is honest about performing a full restart, matching the implementation and supporting the referral #3 disposition's "not a hidden bug" framing. Checked `CLAUDE.md`'s IDE-integration claim that both IDEs share the run tools `web.bbj`/`em-login.bbj`: accurate for the files this unit touches (`BbjRunBuiAction`/`BbjRunDwcAction` resolve `web.bbj` via `getWebBbjPath()`; `BbjEMLoginAction` resolves `em-login.bbj` via `getEMLoginBbjPath()`); `CLAUDE.md` does not mention the third shared tool this unit also uses, `em-validate-token.bbj` (`BbjRunActionBase.getEmValidateBbjPath()`) — noted as a silence, not a contradiction, and not promoted to a finding. 2 findings recorded: P63-D8-002, P63-D8-003.

### Inherited referral triage

- **Referral #1** (`RU-62-01` → `RU-63-01`, ledger row 1) — `BbjCompileAction.java` is an unimplemented `TODO` stub, never invokes `bbjcpl`. Verified against the code: `actionPerformed()` (`BbjCompileAction.java:24-39`) only calls `service.logToConsole("[Compile] Triggered for file: " + file.getName(), ...)` (:37-38); the `TODO: Implement language server custom notification for bbj.compile command` comment at :35 accurately names the missing mechanism, and no other code path in this file, or anywhere else in the eleven files, invokes `bbjcpl` or any compiler process. This is not a documented, deliberate scope decision — no comment, `plugin.xml` entry, or `PROJECT.md`/`ROADMAP.md` text marks compile as intentionally deferred, and the action's own `update()` (:42-65) gates it on a real BBj source file with the server started, presenting it as a working command. **Disposition: promoted — `P63-D7-001`.**
- **Referral #2** (`RU-62-01` → `RU-63-01`, ledger row 2) — Six VS Code commands with no IntelliJ action counterpart. Enumerated both surfaces before deciding (see the D7 cell above): the named commands are `bbj.configureCompileOptions`, `bbj.denumber`, `bbj.decompile`, `bbj.decompileReadonly`, and `bbj.em` — **5** distinct command IDs, not 6; `grep -rliE 'denumber|decompile|configureCompileOptions|EnterpriseManager'` against `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/` returns no matches, confirming none has any IntelliJ action anywhere in this module. One finding allocated for the categorical absence, not one per command, so the same gap is not counted five (or six) times. **Disposition: promoted — `P63-D7-002`.**
- **Referral #3** (`RU-62-01` → `RU-63-01`, secondary interest to `RU-63-05`, ledger row 3) — `bbj.refreshJavaClasses` restarts the whole LS on IntelliJ vs. a targeted LSP request on VS Code. Confirmed against `BbjRefreshJavaClassesAction.java:22-32`, whose `actionPerformed` calls `BbjServerService.getInstance(project).restart()` at :30, against `extension.ts:694-704`'s targeted `client.sendRequest('bbj/refreshJavaClasses')`. Location decides ownership — `BbjRefreshJavaClassesAction.java` lives in this unit, so this referral is dispositioned here — but the restart *mechanism* itself, `BbjServerService.restart()` (`ui/BbjServerService.java:206-211`, stop-then-start via `LanguageServerManager`), is `RU-63-05`'s file; a written note routes that side to `RU-63-05` (owned by plan `63-04`) rather than re-reporting it there — see `### Cross-unit referrals` below. **Disposition: promoted — `P63-D7-003`.**

### Findings

```
id:                P63-D1-003
unit:              RU-63-01
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java:103,BbjRunActionBase.java:302,BbjRunBuiAction.java:127,BbjRunDwcAction.java:127
dimension:         D1
secondary:         [D2]
severity:          high
evidence_tier:     repro
evidence:          Line-by-line trace (D-07 — no runnable reproduction accompanies this record; a
                    live process-argument-inspection harness is out of this static-trace sweep's
                    scope): BbjEMLoginAction.java:103 (cmd.addParameter(password)) passes the
                    plaintext EM password as a GeneralCommandLine argument to the spawned
                    "bbj -q em-login.bbj" process; BbjRunActionBase.java:302
                    (validateTokenServerSide's cmd.addParameter(token)) and
                    BbjRunBuiAction.java:127/BbjRunDwcAction.java:127
                    (cmd.addParameter(token)) each pass the stored JWT the same way. All four call
                    sites build a GeneralCommandLine and add the secret via .addParameter(...),
                    which places it in the child process's own argv, visible via OS process-listing
                    APIs to any other process capable of enumerating them; none of the four passes
                    the secret via stdin or an environment variable instead, confirmed by reading
                    all four call sites in full.
failure_scenario:  A local process capable of enumerating other processes' argument lists on the
                    same host (e.g. via ps/Task Manager-class introspection, available to any other
                    user-level process on a shared or compromised machine) can read the EM password
                    during login and the JWT token during every run/validate invocation for as long
                    as each spawned process remains alive — general process-argument-list exposure
                    (CWE-214), not a scenario specific to any single call site. Per D-13, no trigger
                    sequence or payload is stated beyond this problem-class/impact description.
classification:    major
                    (1) touches 1 file: FAIL — a fix (routing secrets via stdin or an environment
                    variable instead of argv) spans at minimum BbjEMLoginAction.java and
                    BbjRunActionBase.java (plus its two run subclasses), since each independently
                    constructs its own GeneralCommandLine — (2) no public API/grammar/LSP change:
                    pass — (3) no new dependency: pass (stdin/env-var argument passing needs no new
                    library) — (4) regression-testable with existing harness: FAIL — no src/test/
                    source set exists in bbj-intellij (P63-D5-001) — (5) reviewer can name the exact
                    edit (switch the four call sites from addParameter(secret) to a stdin write or a
                    process-scoped environment variable the downstream .bbj scripts are redesigned
                    to read instead): pass — (6) severity high and dimension D1: FAIL — test (6)
                    fails on its own, so classification is major regardless of the other five tests
                    (D-13's safety gate).
effort:            8
dedup:             none — #231 (custom classpath and command-line settings for starting BBj
                    programs) requests configurability of run arguments, not their process-argument-
                    list observability; this finding is about an existing exposure of secret values
                    already passed as arguments, a security defect #231 does not address. #385
                    (Graffiti Composer launch request) is unrelated — it requests launching an
                    external composer tool, not EM credential/token handling. Both of this unit's
                    named plausible neighbours checked explicitly and dismissed.
disposition:       major-refactor
```

```
id:                P63-D1-004
unit:              RU-63-01
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMTokenStore.java:56-88
dimension:         D1
secondary:         [D2]
severity:          medium
evidence_tier:     repro
evidence:          Line-by-line trace (D-07 — no runnable reproduction; see the Environment
                    constraint above): isTokenExpired() (:56-88) returns false — "not expired" —
                    for every one of: a non-3-part token string (:64-66, "Not a JWT, let server
                    decide"), a payload with no exp claim (:76-77, "No exp claim, can't determine"),
                    and any exception during base64url-decode/JSON-parse (:84-86, "let server
                    validate"). No signature verification of any kind is performed anywhere in this
                    89-line file (confirmed by full read — no Signature/JWT-library usage). A
                    malformed, unsigned, or exp-less token is therefore indistinguishable from a
                    genuinely fresh one by this client-side check alone.
failure_scenario:  A JWT token that is not well-formed 3-part base64url, whose decoded payload lacks
                    an exp claim, or whose decode throws for any reason is reported as "not expired"
                    identically to a token with a genuine future exp. BbjEMLoginAction's freshly-
                    stored token is never itself re-checked through this or any other validator
                    before being written to PasswordSafe, so a malformed or unsigned token issued or
                    substituted at that point would pass this client-side gate silently; the run
                    flows are protected only by the separate validateTokenServerSide() server round
                    trip, which BbjEMLoginAction itself never calls.
classification:    major
                    (1) touches 1 file: pass (confined to BbjEMTokenStore.java) — (2) no public
                    API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-
                    testable with existing harness: FAIL — no src/test/ source set exists
                    (P63-D5-001) — (5) reviewer can name the exact edit (change the three "unable to
                    determine" branches to return true — fail closed — or add an explicit
                    isTokenWellFormed() gate callers must check before treating a token as usable):
                    pass — (6) severity medium but dimension D1: FAIL — any D1 finding is major
                    regardless of severity per D-13's safety gate; test (4) also independently
                    fails.
effort:            4
dedup:             none — no frozen open issue names JWT expiry-decoding fail-open behaviour in the
                    IntelliJ plugin.
disposition:       major-refactor
```

```
id:                P63-D1-005
unit:              RU-63-01
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java:295,303,BbjEMLoginAction.java:96,104
dimension:         D1
secondary:         [D2]
severity:          medium
evidence_tier:     repro
evidence:          Line-by-line trace (D-07 — no runnable reproduction; establishing exploitability
                    further would require a multi-user filesystem harness outside this static-trace
                    sweep's scope): both Files.createTempFile(prefix, ".tmp") call sites
                    (BbjRunActionBase.java:295, BbjEMLoginAction.java:96) pass no FileAttribute/
                    PosixFilePermissions argument, so the resulting file — which receives the EM
                    login's plaintext JWT output or the validate-token result written by the spawned
                    bbj process — is created with whatever default permissions the JVM/OS
                    combination applies, rather than an explicit owner-only (0600) grant, for the
                    window between the subprocess writing it and this code's finally-block delete
                    (BbjRunActionBase.java:315-317, BbjEMLoginAction.java:119-123).
failure_scenario:  On a multi-user host or shared filesystem where the plugin's temp-file directory
                    is not exclusively readable by the current user, another local process running
                    as a different OS user could read the plaintext JWT token or the validation
                    result during that window — a file-contents exposure channel distinct from
                    P63-D1-003's always-open process-argument exposure, recorded separately because
                    it is a different attack surface.
classification:    major
                    (1) touches 1 file: FAIL — the two Files.createTempFile call sites live in
                    different files (BbjRunActionBase.java, BbjEMLoginAction.java) — (2) no public
                    API/grammar/LSP change: pass — (3) no new dependency: pass
                    (java.nio.file.attribute.PosixFilePermissions is JDK-standard) — (4) regression-
                    testable with existing harness: FAIL — no src/test/ source set exists
                    (P63-D5-001) — (5) reviewer can name the exact edit (pass
                    PosixFilePermissions.asFileAttribute(EnumSet.of(OWNER_READ, OWNER_WRITE)) to
                    both createTempFile calls, with a Windows-appropriate ACL fallback): pass —
                    (6) severity medium but dimension D1: FAIL — any D1 finding is major per D-13;
                    tests (1) and (4) also fail.
effort:            4
dedup:             none — no frozen open issue names temp-file permission handling in the EM
                    login/validate flow.
disposition:       major-refactor
```

```
id:                P63-D2-004
unit:              RU-63-01
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java:60,67,BbjEMLoginAction.java:34-36,115
dimension:         D2
secondary:         [D3]
severity:          high
evidence_tier:     repro
evidence:          Control-flow trace: BbjRunActionBase.actionPerformed() (:43-108) calls
                    buildCommandLine(file, project) synchronously at line 60, BEFORE the
                    ApplicationManager.getApplication().executeOnPooledThread(...) dispatch at line
                    67 that wraps only the subsequent OSProcessHandler launch. For
                    BbjRunBuiAction/BbjRunDwcAction, buildCommandLine() (their own override) calls
                    validateTokenServerSide() (BbjRunActionBase.java:282-322, up to a 10s
                    CapturingProcessHandler.runProcess(10000) at :308) and, if the token is
                    invalid/expired, BbjEMLoginAction.performLogin() (up to a further 15s
                    handler.runProcess(15000) at :115) — both synchronously, before the
                    pooled-thread dispatch is ever reached. actionPerformed() always executes on the
                    EDT in the IntelliJ Platform action system regardless of getActionUpdateThread()
                    (which governs only where update() runs), so this entire chain runs on the EDT.
failure_scenario:  Clicking "Run As BUI"/"Run As DWC" when the stored EM token is absent, expired
                    (client-side check), or rejected by the server-side round trip synchronously
                    blocks the EDT for up to ~25 seconds in the worst case (10s validate + 15s
                    re-login) before the pooled-thread dispatch at BbjRunActionBase.java:67 is ever
                    reached — freezing the entire IDE, not just the current editor. Clicking "Login
                    to Enterprise Manager" directly freezes the IDE for its own runProcess(15000)
                    call every time, since BbjEMLoginAction has no pooled-thread dispatch of its own
                    at all (see P63-D2-005).
classification:    major
                    (1) touches 1 file: FAIL — a fix needs to move buildCommandLine's own
                    network/process work off the EDT in at least BbjRunActionBase.java and
                    BbjEMLoginAction.java — (2) no public API/grammar/LSP change: pass — (3) no new
                    dependency: pass — (4) regression-testable with existing harness: FAIL — no
                    src/test/ source set exists (P63-D5-001) — (5) reviewer can name the exact edit
                    (restructure actionPerformed() so buildCommandLine()'s token-validation/login
                    round trip runs inside the existing executeOnPooledThread(...) block rather than
                    before it): pass — (6) severity high, dimension D2 (not D1): pass — tests (1)
                    and (4) fail, so classification is major per D-13.
effort:            8
dedup:             none — no frozen open issue names EDT-blocking behaviour in the BBj run/EM-login
                    actions (distinct from RU-63-03's P63-D3-001, which is the Settings dialog's own
                    separate EDT-blocking finding).
disposition:       major-refactor
```

```
id:                P63-D2-005
unit:              RU-63-01
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java:25-36
dimension:         D2
secondary:         [D4]
severity:          low
evidence_tier:     repro
evidence:          Structural trace: BbjEMLoginAction extends AnAction directly (:25) and defines
                    only actionPerformed() — no update() or getActionUpdateThread() override,
                    unlike all ten other actions in this unit, each of which explicitly declares
                    ActionUpdateThread.BGT and gates enablement on project/file/server-readiness
                    state.
failure_scenario:  "Login to Enterprise Manager" remains enabled and visible in the Tools menu
                    regardless of whether a project is open or the language server is running —
                    inconsistent with its ten siblings. performLogin()'s own internal checks (BBj
                    Home configured, credentials entered) prevent a hard failure, but the menu
                    item's enabled state does not reflect the project's actual readiness the way
                    every other action in this unit does.
classification:    major
                    (1) touches 1 file: pass (BbjEMLoginAction.java only) — (2) no public
                    API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-
                    testable with existing harness: FAIL — no src/test/ source set exists
                    (P63-D5-001) — (5) reviewer can name the exact edit (add update()/
                    getActionUpdateThread() overrides mirroring BbjRefreshJavaClassesAction's
                    pattern): pass — (6) severity low, dimension D2 (not D1): pass — test (4) alone
                    fails, so classification is major per D-13.
effort:            2
dedup:             none — no frozen open issue names action-enablement inconsistency in the EM
                    login action.
disposition:       major-refactor
```

```
id:                P63-D2-006
unit:              RU-63-01
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java:96,115,119-123,145
dimension:         D2
secondary:         [D1]
severity:          low
evidence_tier:     repro
evidence:          Try/finally scoping trace: tmpFile is created at line 96, inside the outer try
                    (:93-148); the inner try/finally at :119-123 deletes it but wraps only the read
                    at :120, NOT the handler.runProcess(15000) call at line 115, which executes
                    between the file's creation and that inner block.
failure_scenario:  An exception thrown by handler.runProcess(15000) at line 115 — a process-launch
                    failure, an I/O error, or an internal timeout — is caught only by the outer
                    catch (Exception ex) at line 145, which shows an error dialog and returns false
                    without ever reaching the inner try/finally that deletes tmpFile; the temp file
                    (potentially containing a partially-written EM login output, including a token
                    fragment, if em-login.bbj wrote before the process failed) is left on disk in
                    the OS temp directory until the OS itself reclaims it.
classification:    major
                    (1) touches 1 file: pass — (2) no public API/grammar/LSP change: pass — (3) no
                    new dependency: pass — (4) regression-testable with existing harness: FAIL — no
                    src/test/ source set exists (P63-D5-001) — (5) reviewer can name the exact edit
                    (widen the try/finally at :119-123 to also wrap the runProcess(...) call at line
                    115): pass — (6) severity low, dimension D2 (not D1): pass — test (4) alone
                    fails, so classification is major per D-13.
effort:            2
dedup:             none — no frozen open issue names this temp-file cleanup gap.
disposition:       major-refactor
```

```
id:                P63-D3-002
unit:              RU-63-01
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java:282-322,BbjRunBuiAction.java:81,BbjRunDwcAction.java:81
dimension:         D3
secondary:         [D2]
severity:          medium
evidence_tier:     repro
evidence:          Trace: BbjRunBuiAction/BbjRunDwcAction's buildCommandLine() calls
                    validateTokenServerSide() (BbjRunActionBase.java:282-322) on every invocation,
                    not only the first after a fresh login — a full second bbj-process spawn with a
                    10-second CapturingProcessHandler timeout, performed unconditionally in addition
                    to the cheap client-side isTokenExpired() decode, with no cache field anywhere
                    in this unit recording "validated at time T, trust until N."
failure_scenario:  Every "Run As BUI"/"Run As DWC" invocation redundantly re-spawns and re-waits on
                    the server-side validation subprocess even when the token was validated seconds
                    earlier by the previous run. Because (per P63-D2-004) this call happens
                    synchronously on the EDT before the pooled-thread dispatch, each redundant
                    validation directly extends that finding's per-click UI-freeze window,
                    compounding rather than merely duplicating cost.
classification:    major
                    (1) touches 1 file: pass (BbjRunActionBase.java, adding a short-lived cache
                    field/timestamp) — (2) no public API/grammar/LSP change: pass — (3) no new
                    dependency: pass — (4) regression-testable with existing harness: FAIL — no
                    src/test/ source set exists (P63-D5-001) — (5) reviewer can name the exact edit
                    (cache the last-validated token value plus a timestamp and skip re-validation
                    within a short trust window): pass — (6) severity medium, dimension D3 (not D1):
                    pass — test (4) alone fails, so classification is major per D-13.
effort:            4
dedup:             none — no frozen open issue names redundant EM token validation round-trips.
disposition:       major-refactor
```

```
id:                P63-D7-001
unit:              RU-63-01
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjCompileAction.java:24-39
dimension:         D7
secondary:         [D2, D8]
severity:          medium
evidence_tier:     inherited
evidence:          Referral #1 disposition (see Inherited referral triage above): actionPerformed()
                    (:24-39) only logs "[Compile] Triggered for file: " + file.getName() and never
                    invokes bbjcpl, confirmed against VS Code's real 18-option-aware compile
                    (Commands.cjs:294-343 via CompilerOptions.ts). No runnable reproduction
                    accompanies this record (D-07); the gap is confirmed by reading the full 71-line
                    file.
failure_scenario:  A user who clicks "Compile BBj File" on IntelliJ sees no error and no visible
                    failure — only a console log line in the LS log Tool Window — and may reasonably
                    believe the file was compiled, unlike VS Code's bbj.compile. The action's own
                    update() gates it as available and enabled on any BBj source file with the
                    server started, presenting a fully-functional-looking command that silently does
                    nothing.
classification:    major
                    (1) touches 1 file: FAIL — a real compile flow requires wiring an LS custom
                    notification/request in addition to BbjCompileAction.java itself — (2) no
                    public API/grammar/LSP change: FAIL — this is new custom-notification wiring
                    between the IntelliJ client and the shared language server — (3) no new
                    dependency: pass — (4) regression-testable with existing harness: FAIL — no
                    src/test/ source set exists (P63-D5-001) — (5) reviewer can name the exact edit:
                    FAIL — only an architecture-level plan (mirror Commands.cjs:294-343's compile
                    flow via a new bbj/compile LSP4IJ request/notification) is nameable, not a
                    single line-edit — (6) severity medium, dimension D7 (not D1): pass — multiple
                    tests fail, so classification is major per D-13.
effort:            8
dedup:             none — #231 (custom classpath and command-line settings for starting BBj
                    programs) requests configurable run/compile settings, which presupposes a
                    working compile action; it does not itself request implementing the missing
                    bbjcpl invocation this finding records. #385 (Graffiti Composer) is unrelated.
                    Both of this unit's named plausible neighbours checked explicitly and dismissed.
disposition:       major-refactor
```

```
id:                P63-D7-002
unit:              RU-63-01
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/
dimension:         D7
secondary:         []
severity:          low
evidence_tier:     inherited
evidence:          Referral #2 disposition (see Inherited referral triage above): both surfaces
                    enumerated — package.json's contributes.commands names bbj.configureCompileOptions,
                    bbj.denumber, bbj.decompile, bbj.decompileReadonly, and bbj.em; grep -rliE
                    'denumber|decompile|configureCompileOptions|EnterpriseManager' against
                    bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/ returns no matches —
                    confirmed absent, no runnable reproduction beyond this enumeration is needed or
                    claimed (D-07).
failure_scenario:  n/a in the sense that D7 records a capability gap rather than a runtime failure —
                    IntelliJ users have no menu path to configure compiler options with
                    dependency/conflict validation, to denumber or decompile a tokenized/
                    line-numbered BBj program, or to launch the Enterprise Manager URL directly from
                    the IDE; each workflow is available only in VS Code today.
classification:    major
                    (1) touches 1 file: FAIL — implementing even the simplest of the five (bbj.em, a
                    URL launcher) requires a new action class plus a plugin.xml registration; the
                    full set touches many more files — (2) no public API/grammar/LSP change: pass
                    (configureCompileOptions would reuse LS-side option data already served for VS
                    Code) — (3) no new dependency: pass — (4) regression-testable with existing
                    harness: FAIL — no src/test/ source set exists (P63-D5-001) — (5) reviewer can
                    name the exact edit: FAIL — only "add N new action classes mirroring the VS Code
                    command handlers" is nameable, not a single edit — (6) severity low, dimension
                    D7 (not D1): pass — multiple tests fail, so classification is major per D-13.
effort:            8
dedup:             #65 (support tokenized BBj files) partial-overlap — #65 requests tokenized/
                    line-numbered BBj file support; this finding's denumber/decompile/
                    decompileReadonly absence is the IntelliJ-side remainder of that same request
                    (the VS Code side is already implemented, per RU-62-02's own D7 cell), so it is
                    not a novel gap for those three commands specifically — the
                    configureCompileOptions and em absences are not covered by #65. #231/#385
                    checked explicitly: #231 concerns run/compile settings configurability
                    generally, overlapping loosely with configureCompileOptions but not requesting
                    the other four; #385 is unrelated (Graffiti Composer).
disposition:       major-refactor
```

```
id:                P63-D7-003
unit:              RU-63-01
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRefreshJavaClassesAction.java:22-32
dimension:         D7
secondary:         []
severity:          low
evidence_tier:     inherited
evidence:          Referral #3 disposition (see Inherited referral triage above): actionPerformed
                    (:22-32) calls BbjServerService.getInstance(project).restart() at :30, which per
                    BbjServerService.java:206-211 stops and restarts the whole LSP4IJ-managed
                    language server; VS Code's extension.ts:694-704 sends a single targeted
                    bbj/refreshJavaClasses LSP request via client.sendRequest(...) at :700 with no
                    restart. No runnable reproduction accompanies this record (D-07); confirmed by
                    reading both call sites in full.
failure_scenario:  Invoking "Refresh Java Classes" on IntelliJ takes every language feature offline
                    for the duration of a full language-server restart (diagnostics, completion,
                    hover, Structure View all unavailable), where the equivalent VS Code command
                    completes a targeted classpath refresh with no interruption to any other
                    feature — a more disruptive experience for functionally the same request, though
                    not incorrect: the restart does achieve the stated goal of clearing cached Java
                    class data.
classification:    major
                    (1) touches 1 file: FAIL — a lighter-weight refresh requires either a new
                    LSP4IJ client-side request handler or a shared language-server-side
                    bbj/refreshJavaClasses notification handler, touching at least
                    BbjRefreshJavaClassesAction.java and the LSP wiring RU-63-05 owns — (2) no
                    public API/grammar/LSP change: FAIL — a targeted-refresh mechanism is new
                    LSP-facing client behaviour — (3) no new dependency: pass — (4) regression-
                    testable with existing harness: FAIL — no src/test/ source set exists
                    (P63-D5-001) — (5) reviewer can name the exact edit: FAIL — only nameable after
                    RU-63-05 confirms whether LSP4IJ's client API supports issuing a custom request
                    without a full restart, which this unit's own sweep cannot establish — (6)
                    severity low, dimension D7 (not D1): pass — multiple tests fail/are
                    undetermined, so classification is major per D-13.
effort:            8
dedup:             none — no frozen open issue names the refreshJavaClasses restart-vs-targeted-
                    request divergence.
disposition:       major-refactor
```

```
id:                P63-D4-003
unit:              RU-63-01
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java:231-248,256-272,BbjEMLoginAction.java:158-168
dimension:         D4
secondary:         []
severity:          low
evidence_tier:     trace
evidence:          Mechanical structural comparison: getWebBbjPath()/getEmValidateBbjPath()
                    (BbjRunActionBase.java) and getEMLoginBbjPath() (BbjEMLoginAction.java) each:
                    resolve PluginId.getId("com.basis.bbj") -> PluginManager.getInstance().
                    findEnabledPlugin(...) -> null-check -> plugin.getPluginPath().resolve(
                    "lib/tools/<name>") -> Files.exists() check -> return path-or-null, wrapped in
                    try/catch(Exception) returning null; differing only in the target filename and
                    minor null-check ordering. No shared helper for "resolve a plugin-bundled tool
                    script path" exists anywhere in this unit.
failure_scenario:  n/a (D4 is a code-shape finding) — any future change to the plugin-ID lookup or
                    bundling convention (e.g. supporting a second plugin ID for a rebrand, or
                    changing the lib/tools/ layout) must be applied at three separate sites by hand
                    across two files, with drift risk between them.
classification:    major
                    (1) touches 1 file: FAIL — a shared helper used consistently spans
                    BbjRunActionBase.java and BbjEMLoginAction.java — (2) no public API/grammar/LSP
                    change: pass — (3) no new dependency: pass — (4) regression-testable with
                    existing harness: satisfied vacuously per D-09 — extracting a shared
                    resolveToolPath(String filename) helper changes no runtime behaviour — (5)
                    reviewer can name the exact edit (add a small static helper and delegate all
                    three call sites to it): pass — (6) severity low, dimension D4 (not D1): pass —
                    test (1) alone fails, so classification is major per D-13.
effort:            4
dedup:             none — no frozen open issue names this duplication.
disposition:       major-refactor
```

```
id:                P63-D4-004
unit:              RU-63-01
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunBuiAction.java,BbjRunDwcAction.java
dimension:         D4
secondary:         []
severity:          low
evidence_tier:     trace
evidence:          git diff --no-index --numstat BbjRunBuiAction.java BbjRunDwcAction.java -> 11 11
                    (11 of 142 lines differ per file — the "BUI"/"DWC" client-type literal, three
                    user-facing message strings, the constructor's display text/icon, and
                    getRunMode()'s return value; the remaining 131 lines, including the entire
                    EM-login/token-validation/classpath/config-path/command-line-assembly flow, are
                    byte-for-byte identical between the two files).
failure_scenario:  n/a (D4 is a code-shape finding) — any future fix to the shared BUI/DWC flow
                    (e.g. the P63-D2-004 EDT-blocking fix, or a classpath-handling change) must be
                    applied identically in two files by hand, with drift risk if one copy is updated
                    and the other missed.
classification:    major
                    (1) touches 1 file: FAIL — collapsing the duplication into BbjRunActionBase
                    (e.g. a protected abstract getClientType() plus a shared
                    buildWebCommandLine(clientType, ...) method) touches BbjRunActionBase.java,
                    BbjRunBuiAction.java and BbjRunDwcAction.java — 3 files — (2) no public
                    API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-
                    testable with existing harness: satisfied vacuously per D-09 — a pure structural
                    refactor changes no runtime behaviour — (5) reviewer can name the exact edit
                    (introduce a getClientType() abstract method and move the shared body up to
                    BbjRunActionBase): pass — (6) severity low, dimension D4 (not D1): pass —
                    test (1) alone fails, so classification is major per D-13.
effort:            4
dedup:             none — no frozen open issue names BUI/DWC action duplication.
disposition:       major-refactor
```

```
id:                P63-D4-005
unit:              RU-63-01
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjComposeAddChildWindowAction.java,BbjComposeAddWindowAction.java,BbjComposeMsgboxAction.java
dimension:         D4
secondary:         []
severity:          low
evidence_tier:     trace
evidence:          Pairwise git diff --no-index --numstat: AddChildWindow vs AddWindow -> 4 4 (4 of
                    38 lines differ: class doc, class name, the Kind enum constant); AddWindow vs
                    Msgbox -> 5 5 (5 of 38 differ, same shape). All three share an identical
                    structure: null-guard project/editor in update(), delegate to
                    ComposerLauncher.launch(project, editor, Kind.X) in actionPerformed(), declare
                    ActionUpdateThread.BGT — differing only in the Kind constant and doc text.
failure_scenario:  n/a (D4 is a code-shape finding) — three files exist purely to supply one
                    differing enum constant to a shared call; a fourth composer kind would add a
                    fourth near-identical file rather than a single data-driven registration.
classification:    major
                    (1) touches 1 file: FAIL — collapsing three files into one parametrized action
                    (or a shared abstract base each subclasses with one overridden Kind) touches all
                    three files at minimum — (2) no public API/grammar/LSP change: pass — (3) no new
                    dependency: pass — (4) regression-testable with existing harness: satisfied
                    vacuously per D-09 — a structural refactor changes no runtime behaviour — (5)
                    reviewer can name the exact edit (a single BbjComposeAction(Kind) constructed
                    three times in plugin.xml via constructor-arg registration, replacing three Java
                    files with one): pass — (6) severity low, dimension D4 (not D1): pass —
                    test (1) alone fails, so classification is major per D-13.
effort:            4
dedup:             none — no frozen open issue names composer-action duplication.
disposition:       major-refactor
```

```
id:                P63-D4-006
unit:              RU-63-01
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java:250-272,282-322
dimension:         D4
secondary:         [D1]
severity:          low
evidence_tier:     trace
evidence:          Structural check — at 423 lines, BbjRunActionBase carries action enablement,
                    settings-derived path/argument resolution, auto-save, process launch and output
                    listening, logging helpers, and — the piece most notably out of place — EM
                    server-side token validation (validateTokenServerSide, getEmValidateBbjPath), a
                    responsibility that otherwise lives entirely alongside BbjEMTokenStore.java
                    (client-side expiry decode, PasswordSafe storage) and BbjEMLoginAction.java (the
                    login round-trip that issues the token in the first place); the run-action base
                    class is not where a reader would expect to find the third leg of the EM-token
                    lifecycle.
failure_scenario:  n/a (D4 is a code-shape finding) — a future change to EM token validation (e.g.
                    fixing P63-D1-004's fail-open decoder, or adding a cached-validation window per
                    P63-D3-002) must touch a "run action" file even though the change is
                    conceptually about EM token handling, and a reader auditing
                    BbjEMTokenStore.java/BbjEMLoginAction.java for the full EM lifecycle would miss
                    this third piece without already knowing to look in BbjRunActionBase.java.
classification:    major
                    (1) touches 1 file: FAIL — moving validateTokenServerSide()/
                    getEmValidateBbjPath() to a new or existing EM-token-adjacent class touches
                    BbjRunActionBase.java plus the destination file — (2) no public API/grammar/LSP
                    change: pass — (3) no new dependency: pass — (4) regression-testable with
                    existing harness: FAIL — the moved method's call sites in
                    BbjRunBuiAction.java/BbjRunDwcAction.java would need updating too, and no
                    src/test/ source set exists to catch a mistake (P63-D5-001) — (5) reviewer can
                    name the exact edit (move validateTokenServerSide()/getEmValidateBbjPath() to a
                    static method on or beside BbjEMTokenStore, updating the two call sites): pass —
                    (6) severity low, dimension D4 (not D1): pass — tests (1) and (4) fail, so
                    classification is major per D-13.
effort:            4
dedup:             none — no frozen open issue names this class-responsibility placement.
disposition:       major-refactor
```

```
id:                P63-D8-002
unit:              RU-63-01
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjCompileAction.java:14-17,20-22
dimension:         D8
secondary:         [D7]
severity:          low
evidence_tier:     trace
evidence:          The class-level Javadoc ("Action to compile the current BBj file. Only visible
                    when a BBj source file ... is open and language server is ready.") and the
                    constructor's action text ("Compile BBj File", "Compile the current BBj file")
                    both assert compile behaviour unconditionally, with no note that the
                    implementation is a stub; only the inline TODO at :35, inside actionPerformed()'s
                    body, discloses the gap. A reader of the class-level doc/UI text alone — without
                    opening actionPerformed()'s body — would have no reason to suspect the action
                    does not compile anything.
failure_scenario:  n/a (D8 is a doc-accuracy finding) — a future maintainer skimming the class
                    Javadoc or a user reading the action's tooltip text ("Compile the current BBj
                    file") receives no signal that this is unimplemented, unlike the honest inline
                    TODO comment.
classification:    easy
                    (1) touches 1 file: pass — (2) no public API/grammar/LSP change: pass — (3) no
                    new dependency: pass — (4) regression-testable with existing harness: satisfied
                    vacuously per D-09 — a Javadoc/tooltip-text edit changes no runtime behaviour —
                    (5) reviewer can name the exact edit (append "(not yet implemented — see
                    referral P63-D7-001)" to the class Javadoc and/or the constructor's description
                    string until the real compile flow lands): pass — (6) severity low, dimension D8
                    (not D1): pass — all six tests pass, so classification is easy per D-13.
effort:            2
dedup:             none — no frozen open issue names this Javadoc/UI-text overclaim.
disposition:       easy-fix
```

```
id:                P63-D8-003
unit:              RU-63-01
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMTokenStore.java:15-18
dimension:         D8
secondary:         []
severity:          low
evidence_tier:     trace
evidence:          The class Javadoc states tokens are "stored in the OS-native keychain," but
                    PasswordSafe.getInstance().set(...) (:34) delegates to whichever backend the
                    user's own IntelliJ "Passwords" system setting (Settings > Appearance &
                    Behavior > System Settings > Passwords) currently selects — the IntelliJ
                    Platform documents this as user-configurable across a native-keychain option, an
                    in-KeePass (local encrypted file, not the OS keychain) option, and a "Do not
                    save" (memory-only, lost on restart) option; nothing in this file or its callers
                    pins the backend or checks which one is active.
failure_scenario:  n/a (D8 is a doc-accuracy finding) — a reader relying on the Javadoc's specific
                    "OS-native keychain" claim to reason about at-rest exposure or persistence-
                    across-restart would be wrong on any install where the user has selected KeePass
                    or "Do not save," neither of which this class detects or accounts for.
classification:    easy
                    (1) touches 1 file: pass — (2) no public API/grammar/LSP change: pass — (3) no
                    new dependency: pass — (4) regression-testable with existing harness: satisfied
                    vacuously per D-09 — a Javadoc edit changes no runtime behaviour — (5) reviewer
                    can name the exact edit (soften the claim to "via IntelliJ's PasswordSafe,
                    backed by whichever credential store the user has configured (native keychain,
                    KeePass, or none)"): pass — (6) severity low, dimension D8 (not D1): pass — all
                    six tests pass, so classification is easy per D-13.
effort:            2
dedup:             none — no frozen open issue names this documentation overclaim.
disposition:       easy-fix
```

### Not-reproducible dispositions

None. This unit's sweep raised no candidate claim that failed to clear its evidence tier — every
check that surfaced a concrete defect is recorded above as a finding, and every inherited referral
reached a definite `promoted` disposition — stated explicitly per the per-unit stopping rule's
empty-subblock register, rather than omitted.

### Cross-unit referrals

- **RU-63-05** — `BbjRefreshJavaClassesAction.java:30`'s `BbjServerService.getInstance(project).restart()` call is the client-side half of referral #3's disposition (`P63-D7-003`, promoted above); `BbjServerService.restart()` itself (`ui/BbjServerService.java:206-211`, a `manager.stop(...)`/`manager.start(...)` pair via `LanguageServerManager`) is the mechanism side and lives in `RU-63-05`'s own file. `RU-63-05`'s sweep (plan `63-04`) should confirm whether LSP4IJ's client API offers any narrower request-response mechanism that could avoid the full stop/start cycle for this specific use, re-triaging the mechanism rather than re-reporting the client-side gap `P63-D7-003` already records.

### Unit closure

`RU-63-01` is closed against the four-part stopping rule (D-06): **(i)** all 7 live cells (D1, D2, D3, D4, D5, D7, D8) carry a `fail` verdict plus a written check line above — every dimension surfaced at least one concrete finding (D5's `fail` is the cross-referenced systemic absence plus this unit's own consequence, not a unit-specific defect ID); **(ii)** all eleven files are named at least once inside this section — `BbjCompileAction.java` (D7 cell, `P63-D7-001`, `P63-D8-002`, referral #1), `BbjComposeAddChildWindowAction.java`/`BbjComposeAddWindowAction.java`/`BbjComposeMsgboxAction.java` (D2/D3/D4 cells, `P63-D4-005`), `BbjEMLoginAction.java` (D1/D2/D3/D4/D7 cells, `P63-D1-003/004/005`, `P63-D2-004/005/006`, `P63-D4-003`), `BbjEMTokenStore.java` (D1/D5/D8 cells, `P63-D1-004`, `P63-D8-003`), `BbjRefreshJavaClassesAction.java` (D2/D3/D7 cells, `P63-D7-003`, referral #3), `BbjRunActionBase.java` (D1-D4 cells, most findings' `location:`), `BbjRunBuiAction.java`/`BbjRunDwcAction.java` (D1-D4/D7 cells, `P63-D3-002`, `P63-D4-004`), `BbjRunGuiAction.java` (D1/D3/D4 cells); **(iii)** every candidate claim raised during either task is either one of the 16 finding records above (`P63-D1-003` through `P63-D1-005`, `P63-D2-004` through `P63-D2-006`, `P63-D3-002`, `P63-D4-003` through `P63-D4-006`, `P63-D7-001` through `P63-D7-003`, `P63-D8-002`, `P63-D8-003`) or the single explicit `### Not-reproducible dispositions` empty statement — none was silently dropped; **and (iv)** all 3 inherited Phase 62 referrals carry a written disposition under `### Inherited referral triage` above, each promoted to a `P63-D7-*` finding, and the ledger's rows 1-3 are updated accordingly (re-confirmed by plan `63-05`).

**Scope-fidelity note.** All eleven files in this unit were swept across all 7 live dimensions, even though ROADMAP's Phase 63 success **criterion 1** names only `BbjRunActionBase.java`, its GUI/BUI/DWC subclasses (`BbjRunGuiAction.java`, `BbjRunBuiAction.java`, `BbjRunDwcAction.java`) and `BbjEMTokenStore.java` from this unit — the Applicability Grid, not the ROADMAP criteria, is the contract, and the criteria are a deliberately named subset of it (D-16); the extra coverage here — the three `BbjCompose*Action` files, `BbjCompileAction.java`, and `BbjRefreshJavaClassesAction.java` — is recorded as deliberate, not scope creep.

## RU-63-04 — Composer dialogs & bridge

**Files (13 / 2,067 LOC):**
- `com/basis/bbj/intellij/composer/AddChildWindowComposerDialog.java` (315)
- `com/basis/bbj/intellij/composer/AddWindowComposerDialog.java` (306)
- `com/basis/bbj/intellij/composer/BbjComposerServer.java` (54)
- `com/basis/bbj/intellij/composer/BbjComposerService.java` (30)
- `com/basis/bbj/intellij/composer/ChildWindowSchematicPanel.java` (159)
- `com/basis/bbj/intellij/composer/ComposerLauncher.java` (224)
- `com/basis/bbj/intellij/composer/ComposerModels.java` (245)
- `com/basis/bbj/intellij/composer/ConfigureAddChildWindowIntention.java` (50)
- `com/basis/bbj/intellij/composer/ConfigureAddWindowIntention.java` (50)
- `com/basis/bbj/intellij/composer/ConfigureMsgboxIntention.java` (49)
- `com/basis/bbj/intellij/composer/MsgboxComposerDialog.java` (273)
- `com/basis/bbj/intellij/composer/MsgboxSchematicPanel.java` (180)
- `com/basis/bbj/intellij/composer/WindowSchematicPanel.java` (132)

**Risk rank:** 3 of 5 Phase 63 units — `BbjComposerServer.java`/`ComposerLauncher.java` bridge to an external composer process; the largest unit by LOC in the phase.
**Sweep method:** full read.
**Owning plan:** 63-03.

### Cells
- D1 Security — fail — Checked what the bridge actually is, correcting INVENTORY's own risk-rank framing ("bridge to an external composer process"): `BbjComposerServer.java` (54 lines) is an LSP4J `@JsonRequest` interface extending `LanguageServer` — a typed proxy for 7 `bbj/composer/*` request methods (`composerCatalogs`, `msgboxPreview`, `addWindowPreview`, `msgboxDecodeCall`, `addWindowDecodeCall`, `addChildWindowPreview`, `addChildWindowDecodeCall`, :28-53) — not a spawned process; `BbjComposerService.java` (30 lines) resolves it via `LanguageServerManager.getInstance(project).getLanguageServer(SERVER_ID)` (:23-28), the same running BBj language server every other Phase 63 unit talks to. No `ProcessBuilder`/`Runtime.exec`/raw socket call exists anywhere in this unit's 13 files (confirmed by full read) — every composer request rides the existing LSP4IJ connection, so this unit spawns no external process at all; INVENTORY's phrasing is a description carried forward from before the bridge's actual shape was traced, corrected here rather than restated. **Document-edit path:** traced every `WriteCommandAction`/`Document` call site in `ComposerLauncher.java` back to its origin — `openMsgbox` (:107-115) inserts/replaces with `dialog.getStatement()` (the LS-computed `MsgboxPreview.statement`, itself built from dialog-typed `message`/`title`/`assignTo`/custom-button text plus catalog bit values), and `applyHexEdit` (:172-196, shared by the addWindow and addChildWindow edit flows) rewrites `flagsHex`/`eventHex` tokens the LS computed from checkbox selections — none of these sources (dialog free-text fields, catalog bit values, or the LS-composed statement string) passes through any escaping or structural validation before `Document.replaceString`/`insertString`. This mirrors Phase 62's `P62-D1-005` exactly: every affected field (`message`/`title`/`assignTo` in `MsgboxComposerDialog.java`, `receiver`/`sysgui`/`x`/`y`/`width`/`height`/`title` in `AddWindowComposerDialog.java`, `receiver`/`window`/`id`/`context`/`title`/`x`/`y`/`width`/`height` in `AddChildWindowComposerDialog.java`) is text the developer types into their own IntelliJ dialog, never document/workspace/config-sourced — self-inflicted statement-corruption surface, not attacker-controlled — recorded here as this unit's own IntelliJ-side instance (per D-05, no `P62-*` cross-reference substitutes for a Phase-63-owned record). **Dialog input handling:** none of the geometry fields (`x`/`y`/`width`/`height` in both addWindow-family dialogs) is range- or type-checked in Java or on the LS side — `composeAddWindow`/`composeAddChildWindow` (`bbj-vscode/src/addwindow-composer.ts`, `addchildwindow-composer.ts`) embed them as raw expression text with no `validate`-named function anywhere, matching Phase 62's own established design (these are BBj expressions, not constrained numerics, symmetrically unvalidated on both IDEs — not an IntelliJ-only gap). **Intention actions:** all three `Configure*Intention.isAvailable()` methods delegate to `ComposerLauncher.isCaretOnCall(editor, keyword)` (:43-55), a text-only heuristic (line-substring match, not PSI-based) that can offer the intention while the caret sits inside a comment or string literal containing the keyword; on invoke, the LS's own `decodeCall` re-parses the real call and returns `found:false` for a false positive, falling back to the blank create flow rather than crashing or corrupting anything — checked, confirmed no defect on this specific path. **DTO trust:** `ComposerModels.java`'s public mutable fields are populated by Gson from the LS response with no null/shape check at the point of use in `ComposerLauncher`/the three dialogs — the concrete downstream consequences of a missing/malformed field are traced under D2 below (not D1, since the LS is the same trusted same-process peer every other unit already treats as trusted, not an external/attacker-controlled input). No runnable reproduction accompanies this record (D-07 — the Gradle build cannot run in this environment; the document-write path is confirmed by static trace of the cited call sites plus the corresponding `composer-commands.ts` functions that produce the written values). 1 finding recorded: P63-D1-006.
- D2 Correctness & error handling — fail — Checked every `CompletableFuture` chain returned by `BbjComposerServer`'s request methods across all 13 files (`ComposerLauncher.launch()`'s `server(...).thenAccept(...)`/`composerCatalogs().thenAccept(...)`/`*DecodeCall(...).thenAccept(...)` chain at :66-87, and each of the three dialogs' `refresh()` methods' `server.*Preview(...).thenAccept(...)` chain — `MsgboxComposerDialog.java:209-214`, `AddWindowComposerDialog.java:238-243`, `AddChildWindowComposerDialog.java:247-252`): `grep -rn "exceptionally\|whenComplete\|\.handle(\|catch\s*(" bbj-intellij/.../composer/*.java` returns zero matches across all 13 files — no chain anywhere in this unit calls `.exceptionally()`/`.handle()`/`.whenComplete()`, and no call site is wrapped in a `try`/`catch`. If any `bbj/composer/*` request completes exceptionally (LSP4IJ timeout, LS restart mid-request, connection drop), the `.thenAccept(...)` continuation simply never runs and the exception is stored on the future unobserved — for `ComposerLauncher.launch()` this means the intention/action click produces zero visible effect (no dialog opens, no error shown, no log entry); for an already-open dialog's `refresh()` this means the preview/statement/schematic silently stop updating on the next keystroke with no indication anything failed, leaving the "Generated statement" field showing stale text the user may unknowingly accept. Checked the `seq` `AtomicInteger` stale-response guard (`MsgboxComposerDialog.java:208,211`, mirrored in both other dialogs): correctly discards an out-of-order response by comparing `mySeq == seq.get()` before calling `apply(...)` — confirmed pass, no defect on this specific ordering check. Checked catalogs sub-list null-safety: `MsgboxComposerDialog.createCenterPanel()`'s `fillCombo(icon, catalogs.icons)`/`fillCombo(buttonSet, catalogs.buttonSets)`/`fillCombo(defaultButton, catalogs.defaultButtons)` (:116-118) and the flags loop (`for (CatalogItem it : catalogs.flags)`, :139) iterate their list arguments directly with no null guard; `AddWindowComposerDialog`/`AddChildWindowComposerDialog.addGroupedChecks(flags, catalogs.flags, flagChecks)`/`addGroupedChecks(eventPanel, catalogs.eventBits, eventChecks)` (:151,161 and :155,165) do the same — a malformed or partial `bbj/composer/catalogs` response with a null `icons`/`buttonSets`/`defaultButtons`/`flags`/`eventBits` field throws `NullPointerException` inside `createCenterPanel()`, called synchronously from `DialogWrapper.init()` during dialog construction on the EDT (inside the `onEdt(...)` dispatch from `ComposerLauncher`) — IntelliJ's top-level EDT handler catches it and shows an "IDE Internal Error" balloon rather than the intended "not ready" message, a poor failure mode for what `ComposerLauncher.openMsgbox`/`openAddWindow`/`openAddChildWindow` already has a graceful path for (`catalogs == null` is checked one level up, :92,120,141, but the individual sub-list fields are not). Checked `ComposerLauncher.applyHexEdit()` (:172-196): `ed.flagsRange[0]`/`ed.flagsRange[1]` (:179) and `ed.eventMaskRange[0]`/`[1]` (:185) index a non-null `int[]` with no length check — a malformed 0- or 1-element array from a future LS change throws `ArrayIndexOutOfBoundsException`; today's `composer-commands.ts` always builds these as 2-element tuples, so this is a latent, not currently observed, gap. Checked the edit-in-place staleness question the plan's own threat model names (T-63-P03-S4): `ComposerLauncher.launch()` captures `line`/`lineText`/`col` (:59-64) and decodes the call via the LS (`msgboxDecodeCall`/`addWindowDecodeCall`/`addChildWindowDecodeCall`) **before** the modal dialog is shown; `openMsgbox`/`applyAddWindowEdit`/`applyHexEdit` then apply the captured `ed.callStart`/`callEnd`/`flagsRange`/`eventMaskRange` offsets **after** `dialog.showAndGet()` returns — i.e. after the entire modal dialog session, during which the document can be mutated by a background process (file-watcher reload, another window's edit in a split-view multi-caret scenario, an LSP-driven auto-edit) — with no re-decode or offset-revalidation step anywhere between capture and apply; a shifted or deleted call at the captured line/offsets either throws (offsets now exceed the line's length) or, more concerning, silently rewrites whatever text now occupies that byte range. Checked what each decode path does with an unparseable existing statement: `decodeCall` returns `found:false`, and all three `open*` methods fall back to the blank create flow (:96,124,145) rather than crashing — confirmed pass, no defect. Checked threading discipline: every `.thenAccept(...)` continuation that touches Swing state is itself wrapped in `ApplicationManager.getApplication().invokeLater(...)` with an explicit `ModalityState` (`onEdt()` in `ComposerLauncher`, `ModalityState.any()` in all three dialogs' `refresh()`) — confirmed pass, no EDT violation found anywhere in this unit. 4 findings recorded: P63-D2-007, P63-D2-008, P63-D2-009, P63-D2-010.
- D3 Performance & resource use — fail — Checked whether a preview request is issued per keystroke without debouncing: every text-field `DocumentListener` in all three dialogs (`SimpleDocumentListener`, identical inline record in each file) calls `refresh()` synchronously on every `insertUpdate`/`removeUpdate`/`changedUpdate` event with no `Timer`/`Alarm`/`SingleAlarm`/scheduled-executor anywhere in this unit (confirmed by grep) — unlike the language server's own document-validation pipeline (a 500ms trailing-edge debounce per `CLAUDE.md`/PROJECT.md), each keystroke in `message`/`title`/`assignTo` (Msgbox) or `receiver`/`sysgui`/`x`/`y`/`width`/`height` (addWindow) or the addChildWindow equivalents fires one full `bbj/composer/*/preview` LSP4IJ round trip. Checked whether the catalogs are fetched once per dialog session or repeatedly: `ComposerLauncher.launch()` calls `server.composerCatalogs()` (:71) fresh on every single invocation of the msgbox/addWindow/addChildWindow action or intention — the static option catalogs (button sets, icons, default buttons, window/event flags) never change at runtime (module-level `const` arrays on the LS side, per Phase 62's own `RU-62-02`/`D3` finding for the same catalogs), yet nothing in this unit caches the result across invocations within a session. Checked whether `ComposerLauncher`/`BbjComposerService` re-resolve the server on every call: `BbjComposerService.server(project)` (:23-29) calls `LanguageServerManager.getInstance(project).start(SERVER_ID)` plus a fresh `getLanguageServer(SERVER_ID)` future resolution on every `launch()` invocation, layered on top of the uncached catalogs fetch — so every single composer open incurs a server-lookup round trip plus a full catalogs round trip plus a decode round trip before the dialog even appears, none of which is cached for the editing session. Checked whether the three schematic panels repaint proportionally to the change or rebuild their whole model: `setRender(...)` just assigns the new descriptor and calls `repaint()` (:32-35 in each panel); `paintComponent` is O(number of drawn primitives), a small constant per panel — confirmed pass, no cost concern here. Checked listener/future/disposable accumulation across repeated open/close cycles: every listener is registered once per fresh dialog instance inside `createCenterPanel()` (called once per `DialogWrapper.init()`), with no static or shared registry anywhere in this unit — confirmed pass, no accumulation. 2 findings recorded: P63-D3-003, P63-D3-004.
- D4 Maintainability & code smells — fail — Mechanical structural comparison, per the plan's required method: `git diff --no-index --numstat AddWindowComposerDialog.java AddChildWindowComposerDialog.java` → `37 28` (37 of 306 lines removed, 28 of 315 added — roughly 88%/85% of each file byte-identical to the other, sharing `refresh()`/`apply()`/`selected()`/`setSelected()`/`preselect()`/`addGroupedChecks()`/`setEnabledRecursive()`/`labeled()` essentially verbatim, differing only in the field set — `receiver`/`sysgui` vs. `receiver`/`window`/`id`/`context`/`title` — the schematic-panel type, and the preview/decode RPC names) — confirms the plan's own "structurally near-duplicate" framing mechanically rather than by eyeball. Ran the same comparison against `MsgboxComposerDialog.java` for both: `156 189` and `156 198` lines differing out of 273/306/315 — Msgbox diverges far more (different field set, validation/error-label UI, no event-mask section), so the strong duplication signal is specifically the addWindow/addChildWindow pair, not a three-way tie. Ran the same comparison across the three `Configure*Intention.java` files (49/50/50 lines): `ConfigureMsgboxIntention.java` vs `ConfigureAddWindowIntention.java` → `9 8` (40 of 49 lines identical), `ConfigureAddWindowIntention.java` vs `ConfigureAddChildWindowIntention.java` → `7 7` (43 of 50 identical) — all three share an identical `isAvailable`/`invoke`/`startInWriteAction`/`generatePreview` shape, differing only in the display text and the `ComposerLauncher.Kind` constant/keyword string — the near-identical triple the plan names as this unit's strongest D4 signal. Checked for duplicated small static helpers, per the plan's own explicit ask: the 14-line private static `clip(Graphics2D, String, int)` helper is duplicated near-verbatim across all three `*SchematicPanel.java` files (diff on the extracted method bodies — `MsgboxSchematicPanel.java:166-179` vs. `WindowSchematicPanel.java:118-131` differ only in a local-variable-vs-inline-call style choice; `WindowSchematicPanel.java` vs. `ChildWindowSchematicPanel.java:145-158` are byte-for-byte identical); the 6-line private static `labeled(String, JComponent)` helper is byte-for-byte identical across all three dialog files (`MsgboxComposerDialog.java:257-262`, `AddWindowComposerDialog.java:274-279`, `AddChildWindowComposerDialog.java:283-288`, confirmed via diff); the private static `setEnabledRecursive(JComponent, boolean)` helper is byte-for-byte identical between `AddWindowComposerDialog.java:181-188` and `AddChildWindowComposerDialog.java:185-192` — none of these three small helpers has a shared home anywhere in the `composer/` package. Also noted: the same `0x00010000L` "Keyboard navigation" default-flag literal is independently hardcoded in both `AddWindowComposerDialog.java:102` and `AddChildWindowComposerDialog.java:104` with no shared named constant, only a comment in each. Checked `ComposerLauncher.java` (224 lines: dispatch, server/catalogs resolution, three `open*`/`apply*` pairs, `insertAtCaret`, `notifyNotReady`, `onEdt`) for god-function/god-class shape: not crossed — each responsibility is factored into its own small, clearly-named private method, unlike `RU-63-01`'s `BbjRunActionBase.java` precedent. Checked `ComposerModels.java`'s public-mutable-field DTO shape: this is Gson's own idiomatic no-arg-constructor-plus-public-fields convention (consistent with `BbjComposerServer.java`'s `@JsonRequest` usage), not a smell — checked, not promoted. 3 findings recorded: P63-D4-007, P63-D4-008, P63-D4-009.
- D5 Test coverage gaps — fail — Cross-references `P63-D5-001` (`RU-63-03`) rather than restating the systemic zero-test-source-set fact: `bbj-intellij` has no `src/test/` source set at all (re-confirmed here: `ls bbj-intellij/src/` → `main` only). This unit's own specific consequence: the decode-and-prefill path for an existing statement (`msgboxDecodeCall`/`addWindowDecodeCall`/`addChildWindowDecodeCall` consumption in `ComposerLauncher.open*`), the emitted-statement construction for each of the three dialogs (`dialog.getStatement()`/`getFlagsHex()`/`getEventHex()`), the DTO round-trip against the LS response shape (the field-drift this unit's own D7 cell already found, `P63-D7-004` — a round-trip test asserting every declared TS field has a Java counterpart would have caught it immediately), the three schematic panels' render-descriptor-to-pixel logic, the document-edit apply path (including the stale-range gap this unit's own D2 cell recorded, `P63-D2-010`), and the unhandled-future-failure paths (`P63-D2-007`) are all untested — every finding recorded in this unit's `### Findings` (`P63-D1-006` through `P63-D8-005`) would ship and regress silently, with no harness that would fail if any of it broke or was fixed incorrectly. Noting the asymmetry this unit's own D7 sweep already surfaced: `bbj-vscode/test/` has 4 dedicated composer test files (`msgbox-composer.test.ts`, `addwindow-composer.test.ts`, `addchildwindow-composer.test.ts`, `composer-commands.test.ts`, confirmed via `find`) exercising the exact same generated-code contract this unit's Java dialogs consume over LSP4IJ, while the IntelliJ side has zero tests for that same contract — a parity-relevant consequence of the same systemic absence. A first test suite for this unit would minimally need to cover: `ComposerModels.java`'s DTO field set against the LS-side param/result shapes (a pure structural round-trip needing no IntelliJ Platform fixture, catching `P63-D7-004`'s class of gap), and — once a fake `LanguageServer`/`BbjComposerServer` test double exists — each dialog's `refresh()`/`apply()` cycle and `ComposerLauncher`'s edit-application offset logic.
- D6 Dependency health — n/a — "No distinct third-party dependency of its own; dependency-tree health (npm and Gradle) is assessed once, exhaustively, at `RU-64-02`, and vendored-binary provenance at `RU-64-03`. Repeating the audit per unit would restate the same npm/Gradle audit under a different heading, not surface a new finding."
- D7 Cross-IDE parity — fail — **The parity question is equivalence of the generated BBj code, not of the UI toolkit (INVENTORY's own framing for this unit).** Confirmed for msgbox/addwindow/addchildwindow, matching Phase 62's own `RU-62-04`/D7 establishment: `MsgboxComposerDialog.java:209`, `AddWindowComposerDialog.java:238` and `AddChildWindowComposerDialog.java:247` call `server.msgboxPreview(...)`/`addWindowPreview(...)`/`addChildWindowPreview(...)` — the exact same `bbj/composer/{msgbox,addwindow,addchildwindow}/preview` handlers (`composer-commands.ts:69,129,167`) the VS Code webviews call locally — so there is no second, divergent BBj-codegen implementation on the IntelliJ side to compare; the generated statement is identical by construction for all three forms. **DTO shape comparison, field-for-field, `ComposerModels.java` vs. `bbj-vscode/src/language/composer-commands.ts`'s param/result types (`msgbox-composer.ts`, `addwindow-composer.ts`, `addchildwindow-composer.ts`):** `MsgboxPreviewInput`, `MsgboxCatalogs`/`AddWindowCatalogs`, `AddWindowPreviewInput`/`AddWindowPreview`/`WindowRender`, and `AddChildWindowPreviewInput`/`AddChildWindowPreview`/`ChildWindowRender` all mirror their TypeScript counterparts field-for-field by name (confirmed field-by-field, including the `AddWindowEdit`/`MsgboxEdit`/`AddWindowInitial` edit-in-place shapes) — **with one confirmed drift:** TypeScript's `MsgboxPreview` interface (`msgbox-composer.ts:374-388`) declares an optional `exprText?: string` ("the constants form of `expr` when `useConstants` is set"), and TypeScript's msgbox `CatalogItem` (`msgbox-composer.ts:12-17`) declares an optional `constant?: string` (the `BBjMsgBox.*` constant name) — **neither field exists on Java's `ComposerModels.MsgboxPreview` or unified `CatalogItem` DTO**, so Gson silently drops both on deserialization; this is a genuine, if currently dormant, DTO-shape gap — "a silent shape drift the compiler cannot catch" per this task's own framing. Traced the actual consequence: `exprText` is computed server-side inside `msgboxPreview()` (`msgbox-composer.ts:403`) and folded into `statement` via `composeStatement({..., expr, exprText, ...})` **before** the response is serialized, so the useConstants checkbox's own promise — the *generated code* uses the constants form — holds identically on both IDEs (`p.statement`/`m.statement` both carry the correct text); checked whether either UI's own display consumes the now-dropped fields: VS Code's own webview summary line (`msgbox-composer-webview.ts:330`, `'expr = ' + m.expr + ...`) **also never reads `m.exprText`**, so this is not an active IntelliJ-only display regression — both IDEs show the raw numeric `expr` in the summary regardless of `useConstants`. Recorded as a low-severity, currently-inert DTO-completeness gap rather than an active parity bug, per the concrete trace. Checked capability reachability both directions for the three implemented forms (msgbox/addwindow/addchildwindow): every `bbj/composer/{msgbox,addwindow,addchildwindow}/{preview,decodeCall}` capability VS Code's webviews use is reachable from IntelliJ via the identical 7-method `BbjComposerServer` interface — confirmed symmetric, no defect. **Checked SETOPTS, the phase's merged inherited referral (see Inherited referral triage below):** confirmed absent from IntelliJ entirely, promoted to its own finding rather than folded into the DTO-drift finding, since it is a whole-feature absence rather than a field-level shape gap. 2 findings recorded: P63-D7-004, P63-D7-005.
- D8 Comment & doc accuracy — fail — Checked every class-level Javadoc across all 13 files against the code just read. Found two related stale-count/stale-flow doc claims, both traceable to the same root cause (the #473 addChildWindow addition landing without a doc pass over the two earlier files): `MsgboxComposerDialog.java`'s class doc (:39-44) ends "Create flow — inserts a fresh MSGBOX(...) statement" with no mention that the SAME class also supports edit-in-place (the `editMode` constructor parameter drives `assignToRow` visibility, the OK button text, and whether `ComposerLauncher.openMsgbox` applies a `replaceString` edit instead of an insert) — a reader of the class doc alone would not learn edit mode exists; `AddWindowComposerDialog.java`'s class doc (:40-45) goes further, stating "Create flow only for now — inserts a fresh addWindow(...) statement," an explicit, now-false limitation claim, since `applyAddWindowEdit`/`applyHexEdit` fully implement edit-in-place — contrast `AddChildWindowComposerDialog.java`'s own class doc (:40-45), added later alongside #473, which correctly states both flows ("Create flow inserts a fresh statement; edit flow rewrites the hex tokens in place"). The same doc-lag pattern recurs in `ComposerLauncher.java`'s own class doc (:25-31), which still says "Shared entry point for both composer UIs (#430/#433)" though the class has dispatched three `Kind` values (`MSGBOX`, `ADDWINDOW`, `ADDCHILDWINDOW`) since #473 landed. Checked `ComposerModels.java:1-14`'s "mirroring the language server's ... params and results" claim against this unit's own D7 field-comparison (`P63-D7-004` above): the claim overstates completeness — two TS-side optional fields (`MsgboxPreview.exprText`, `CatalogItem.constant`) have no Java counterpart, so "mirroring" is not exact, though the doc's core substantive claim (no flag/hex arithmetic happens on the Java side, TS is the single source of truth) remains accurate and is itself confirmed correct by this unit's own sweep (no arithmetic found anywhere in `ComposerModels.java`). Checked `BbjComposerService.java`'s "callers must handle the null case" Javadoc (:19-22) against its one call site (`ComposerLauncher.java:67`, grepped — only one call site in this unit): correctly guarded — confirmed accurate, not promoted. Checked `applyAddWindowEdit`'s "right-to-left" Javadoc claim (`ComposerLauncher.java:161`) against `applyHexEdit`'s actual sort (`Comparator.comparingInt(...).reversed()`, :191): accurate — confirmed, not promoted. Checked `CLAUDE.md` against this unit: it names no composer file anywhere (confirmed by grep), so its silence is noted per `RU-63-01`'s own precedent, not promoted. 2 findings recorded: P63-D8-004, P63-D8-005.

### Inherited referral triage

- **Referral #4-5** (`RU-62-04`'s ledger row 4 and `RU-62-03`'s ledger row 5, both → `RU-63-04`) — **SETOPTS has no IntelliJ composer dialog at all, confirmed independently from two Phase 62 vantage points** (`RU-62-04`'s generator-layer view: `setopts-composer-webview.ts` (321 lines) has no IntelliJ counterpart; `RU-62-03`'s logic/UI-layer view: `setopts-catalog.ts` (335 lines) and `setopts-composer-ui.ts` (96 lines) have no IntelliJ counterpart either) — **triaged here once, as a single disposition naming both source referrals**, per D-06. Re-verified against the current tree rather than re-deriving Phase 62's own commands: `grep -c setopts bbj-vscode/src/language/composer-commands.ts` → `0` (no `bbj/composer/setopts/*` LS command exists — unlike msgbox/addwindow/addchildwindow, SETOPTS is not part of the shared `bbj/composer/*` LS command layer at all, so "porting" it to IntelliJ is not simply "add a Java dialog that calls an existing shared handler" the way the other three were); `ls bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/` lists no `SetoptsComposerDialog.java`; `ComposerModels.java` defines no `SetOpts*` DTO of any kind (confirmed by full read); `grep -in setopts bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java` returns zero matches anywhere in its dispatch logic, contrasting directly with its `openMsgbox`/`openAddWindow`/`openAddChildWindow` handlers (:90,118,139) and the parallel `BbjComposeMsgboxAction`/`BbjComposeAddWindowAction`/`BbjComposeAddChildWindowAction` action trio `RU-63-01` already swept — no fourth `BbjComposeSetoptsAction` exists either. Checked whether this is a deliberate, documented scope decision rather than an unaddressed gap: PROJECT.md's own Key Decision for SETOPTS ("SETOPTS composer deviates from the triple split... reusable across future BBj-code and bbx-config SETOPTS composers (#474)") documents only VS Code's own internal `-ui`/`-webview` file split, and its own forward-looking claim in `setopts-catalog.ts`'s header — "reusable by the IntelliJ client... later" (quoted verbatim in `RU-62-03`'s own D8 cell) — states the OPPOSITE of a deliberate exclusion: it names IntelliJ reuse as a stated future intention, not an out-of-scope decision; neither `PROJECT.md`'s Out of Scope section nor `REQUIREMENTS.md`'s Out of Scope table names SETOPTS or the IntelliJ composer surface anywhere. Open issue **#475** ("SETOPTS assistance in BBj code: decode hovers + tri-state composer with IOR/AND-aware codegen") remains open in the frozen snapshot, confirming this is a live, acknowledged gap rather than a closed decision. **Disposition: promoted — `P63-D7-005`**, with `dedup:` naming #475 explicitly as a partial-overlap (see the finding record below for the precise scope distinction between this unit's IntelliJ-port gap and #475's broader BBj-code-scoped request).

### Findings

```
id:                P63-D1-006
unit:              RU-63-04
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java:107-115,172-196
dimension:         D1
secondary:         [D2]
severity:          low
evidence_tier:     repro
evidence:          Line-by-line trace (D-07 — no runnable reproduction; the Gradle build cannot run
                    in this environment): openMsgbox (:107-115) writes dialog.getStatement() — the
                    LS-composed MsgboxPreview.statement built from dialog-typed message/title/
                    assignTo/custom-button text plus catalog bit values — directly via
                    Document.replaceString/insertString with no escaping or structural validation;
                    applyHexEdit (:172-196, shared by the addWindow and addChildWindow edit flows)
                    writes flagsHex/eventHex tokens the LS computed from checkbox selections the
                    same way. Every affected field (message/title/assignTo, receiver/sysgui/x/y/
                    width/height/title, receiver/window/id/context/title/x/y/width/height) is text
                    the developer types into their own IntelliJ dialog — never document, workspace
                    or config-sourced — mirroring Phase 62's P62-D1-005 exactly, recorded here as
                    this unit's own IntelliJ-side instance per D-05.
failure_scenario:  A developer who types BBj syntax-breaking text (an unescaped quote, an unmatched
                    parenthesis) into a composer dialog's message/title/geometry fields gets that
                    text embedded verbatim into the statement inserted into their own live source
                    file, with no client- or server-side structural check catching it before the
                    write — a self-inflicted statement-corruption gap in the developer's own file,
                    not an attacker-controlled injection surface (no workspace-committed, remote, or
                    peer-supplied value reaches this path).
classification:    major
                    (1) touches 1 file: pass (confined to ComposerLauncher.java's write sites) — (2)
                    no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4)
                    regression-testable with existing harness: FAIL — no src/test/ source set exists
                    in bbj-intellij (P63-D5-001) — (5) reviewer can name the exact edit (thread the
                    LS's existing validateStringField-style structural check, or an
                    IntelliJ-side equivalent, through the write path before Document.replaceString/
                    insertString): pass — (6) dimension D1: FAIL — test (6) fails on its own per
                    D-13's safety gate regardless of severity, so classification is major.
effort:            4
dedup:             none — checked #385 (Graffiti Composer launch request, unrelated external tool)
                    and #475 (SETOPTS assistance, a different composer form) explicitly; neither
                    names this document-write validation gap. No frozen open issue addresses it.
disposition:       major-refactor
```

```
id:                P63-D2-007
unit:              RU-63-04
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java:66-87,MsgboxComposerDialog.java:209-214,AddWindowComposerDialog.java:238-243,AddChildWindowComposerDialog.java:247-252
dimension:         D2
secondary:         []
severity:          medium
evidence_tier:     repro
evidence:          Line-by-line trace (D-07 — no runnable reproduction; a live LS-crash/timeout
                    harness is out of this static-trace sweep's scope): grep -rn "exceptionally\|
                    whenComplete\|\.handle(\|catch\s*(" across all 13 files in this unit returns
                    zero matches. Every CompletableFuture chain (ComposerLauncher.launch()'s nested
                    server/catalogs/decodeCall chain at :66-87, and each dialog's refresh() ->
                    *Preview(...).thenAccept(...) chain) has no completion-exception handler and no
                    surrounding try/catch anywhere in this unit.
failure_scenario:  If any bbj/composer/* LSP4IJ request completes exceptionally (server restart
                    mid-request, timeout, connection drop), the .thenAccept(...) continuation never
                    runs and the exception is stored on the future unobserved. Invoking a composer
                    action/intention under this condition produces zero visible effect (no dialog,
                    no error, no log entry); an already-open dialog's refresh() silently stops
                    updating the preview/statement/schematic on the next keystroke, leaving stale
                    text a user could unknowingly accept via the still-clickable OK button.
classification:    major
                    (1) touches 1 file: FAIL — a fix (add .exceptionally()/.handle() plus a user-
                    visible notification) spans ComposerLauncher.java and all three dialog files —
                    (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4)
                    regression-testable with existing harness: FAIL — no src/test/ source set exists
                    (P63-D5-001) — (5) reviewer can name the exact edit (add .exceptionally(t ->
                    onEdt(() -> notifyNotReady(...))) or an equivalent error-surfacing handler to
                    each chain): pass — (6) severity medium, dimension D2 (not D1): pass — tests (1)
                    and (4) fail, so classification is major.
effort:            4
dedup:             none — no frozen open issue names unhandled composer-request failures.
disposition:       major-refactor
```

```
id:                P63-D2-008
unit:              RU-63-04
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/MsgboxComposerDialog.java:116-118,139,AddWindowComposerDialog.java:151,161,AddChildWindowComposerDialog.java:155,165
dimension:         D2
secondary:         [D1]
severity:          low
evidence_tier:     repro
evidence:          Line-by-line trace (D-07): fillCombo(icon, catalogs.icons)/fillCombo(buttonSet,
                    catalogs.buttonSets)/fillCombo(defaultButton, catalogs.defaultButtons) and the
                    `for (CatalogItem it : catalogs.flags)` loop in MsgboxComposerDialog.
                    createCenterPanel() iterate their list arguments with no null guard; both
                    addWindow-family dialogs' addGroupedChecks(flags/eventPanel, catalogs.flags/
                    eventBits, ...) do the same. ComposerLauncher's own catalogs==null check
                    (:92,120,141) guards only the top-level ComposerCatalogs reference, not its
                    individual sub-list fields.
failure_scenario:  A malformed or partial bbj/composer/catalogs response with a null icons/
                    buttonSets/defaultButtons/flags/eventBits field throws NullPointerException
                    inside createCenterPanel(), called synchronously from DialogWrapper.init() on
                    the EDT during dialog construction — IntelliJ's top-level EDT handler shows an
                    "IDE Internal Error" balloon instead of the graceful "not ready" message
                    ComposerLauncher already has one level up for a fully-null catalogs object.
classification:    major
                    (1) touches 1 file: FAIL — spans MsgboxComposerDialog.java and both
                    addWindow-family dialogs — (2) no public API/grammar/LSP change: pass — (3) no
                    new dependency: pass — (4) regression-testable with existing harness: FAIL — no
                    src/test/ source set exists (P63-D5-001) — (5) reviewer can name the exact edit
                    (null-default each sub-list to List.of() at the point of use, or guard before
                    iterating): pass — (6) severity low, dimension D2 (not D1): pass — tests (1) and
                    (4) fail, so classification is major.
effort:            4
dedup:             none — no frozen open issue names this defensive-null-check gap.
disposition:       major-refactor
```

```
id:                P63-D2-009
unit:              RU-63-04
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java:179,185
dimension:         D2
secondary:         []
severity:          low
evidence_tier:     repro
evidence:          Line-by-line trace (D-07): applyHexEdit's ed.flagsRange[0]/[1] (:179) and
                    ed.eventMaskRange[0]/[1] (:185) index a non-null int[] with no length check
                    before indexing. composer-commands.ts's addwindow/addChildWindow decodeCall
                    handlers always build these as 2-element [start,end] tuples today (confirmed by
                    reading both handlers in full), so this is a latent, not currently observed,
                    gap rather than a live defect.
failure_scenario:  A future LS-side change to the flagsRange/eventMaskRange encoding that ever
                    produces a 0- or 1-element array would throw ArrayIndexOutOfBoundsException
                    inside the WriteCommandAction that applies the edit, with no defensive length
                    check anywhere in the client to catch it before indexing.
classification:    major
                    (1) touches 1 file: pass (confined to ComposerLauncher.java) — (2) no public
                    API/grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-
                    testable with existing harness: FAIL — no src/test/ source set exists
                    (P63-D5-001) — (5) reviewer can name the exact edit (guard
                    ed.flagsRange.length == 2 / ed.eventMaskRange.length == 2 before indexing):
                    pass — (6) severity low, dimension D2 (not D1): pass — test (4) alone fails, so
                    classification is major.
effort:            2
dedup:             none — no frozen open issue names this array-bounds gap.
disposition:       major-refactor
```

```
id:                P63-D2-010
unit:              RU-63-04
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java:57-159
dimension:         D2
secondary:         [D1]
severity:          medium
evidence_tier:     repro
evidence:          Line-by-line trace (D-07), matching the plan's own threat model entry
                    T-63-P03-S4: launch() captures line/lineText/col (:59-64) and decodes the call
                    via the LS BEFORE the modal dialog is shown; openMsgbox/applyAddWindowEdit/
                    applyHexEdit then apply the captured callStart/callEnd/flagsRange/
                    eventMaskRange offsets AFTER dialog.showAndGet() returns — i.e. after the
                    entire modal dialog session, during which a background process (file-watcher
                    reload, another window's edit, an LSP-driven auto-edit) could mutate the
                    document. No re-decode or offset-revalidation step exists anywhere between
                    capture and apply in any of the three edit-application methods.
failure_scenario:  If the document changes at or before the captured line/offsets while the
                    composer dialog is open, WriteCommandAction.replaceString either throws
                    (offsets now exceed the line's current length) or — the more concerning case —
                    silently rewrites whatever text now occupies that byte range, corrupting
                    unrelated content the user never intended to touch.
classification:    major
                    (1) touches 1 file: FAIL — a fix needs a re-decode-and-compare step reachable
                    from all three apply methods, likely a shared helper plus per-method call-site
                    changes — (2) no public API/grammar/LSP change: pass (reuses the existing
                    decodeCall requests) — (3) no new dependency: pass — (4) regression-testable
                    with existing harness: FAIL — no src/test/ source set exists (P63-D5-001) — (5)
                    reviewer can name the exact edit: FAIL — only the general shape (re-decode at
                    apply time, compare against the captured offsets, prompt or abort on mismatch)
                    is nameable, not a single line-edit — (6) severity medium, dimension D2 (not
                    D1): pass — multiple tests fail, so classification is major.
effort:            8
dedup:             none — no frozen open issue names this stale-captured-range gap.
disposition:       major-refactor
```

```
id:                P63-D3-003
unit:              RU-63-04
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/MsgboxComposerDialog.java:268-272,AddWindowComposerDialog.java:300-305,AddChildWindowComposerDialog.java:309-314
dimension:         D3
secondary:         []
severity:          low
evidence_tier:     repro
evidence:          Line-by-line trace (D-07): the identical inline SimpleDocumentListener record in
                    all three dialogs calls refresh() synchronously from insertUpdate/removeUpdate/
                    changedUpdate with no Timer/Alarm/SingleAlarm/scheduled-executor anywhere in
                    this unit (confirmed by grep across all 13 files) — every keystroke in any
                    text field fires one full bbj/composer/*/preview LSP4IJ round trip, unlike the
                    LS's own 500ms trailing-edge document-validation debounce named in CLAUDE.md.
failure_scenario:  Fast typing in message/title/assignTo (Msgbox) or any of the geometry/receiver
                    fields (addWindow/addChildWindow) issues one LSP4IJ request per keystroke with
                    no coalescing, each round trip updating the schematic/statement/summary fields
                    on the EDT — a redundant-request cost that scales with typing speed rather than
                    with actual settle points.
classification:    major
                    (1) touches 1 file: FAIL — a shared debounce mechanism spans all three dialog
                    files — (2) no public API/grammar/LSP change: pass — (3) no new dependency:
                    pass (IntelliJ Platform's own Alarm/SingleAlarm utility is already available,
                    no new library) — (4) regression-testable with existing harness: FAIL — no
                    src/test/ source set exists (P63-D5-001) — (5) reviewer can name the exact edit
                    (wrap each refresh() call in a shared debounce helper using
                    com.intellij.util.Alarm): pass — (6) severity low, dimension D3 (not D1): pass
                    — tests (1) and (4) fail, so classification is major.
effort:            4
dedup:             none — no frozen open issue names this missing debounce.
disposition:       major-refactor
```

```
id:                P63-D3-004
unit:              RU-63-04
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java:66-71,BbjComposerService.java:23-29
dimension:         D3
secondary:         []
severity:          low
evidence_tier:     repro
evidence:          Line-by-line trace (D-07): launch() calls BbjComposerService.server(project)
                    (:66, itself re-resolving LanguageServerManager.start(SERVER_ID) plus a fresh
                    getLanguageServer future every call) followed unconditionally by
                    server.composerCatalogs() (:71) on every single composer-open invocation — the
                    static option catalogs (button sets, icons, window/event flags) are module-
                    level const arrays on the LS side that never change at runtime (confirmed
                    against composer-commands.ts's catalogs handler, :52-57), yet nothing in this
                    unit caches either the resolved server or the catalogs result across
                    invocations within a session.
failure_scenario:  Every "Compose MSGBOX"/"Compose addWindow"/"Compose addChildWindow" invocation —
                    not just the first one in a session — pays a server-resolution round trip plus
                    a full catalogs round trip plus a decode round trip before the dialog appears,
                    even though the catalogs contents are identical to the previous invocation's.
classification:    major
                    (1) touches 1 file: pass (a session-scoped cache field on ComposerLauncher or a
                    small holder class confines the change) — (2) no public API/grammar/LSP change:
                    pass — (3) no new dependency: pass — (4) regression-testable with existing
                    harness: FAIL — no src/test/ source set exists (P63-D5-001) — (5) reviewer can
                    name the exact edit (cache the resolved BbjComposerServer/ComposerCatalogs per
                    project, invalidated on LS restart): pass — (6) severity low, dimension D3 (not
                    D1): pass — test (4) alone fails, so classification is major.
effort:            4
dedup:             none — no frozen open issue names this redundant catalogs/server refetch.
disposition:       major-refactor
```

```
id:                P63-D7-004
unit:              RU-63-04
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerModels.java:18-23,75-84
dimension:         D7
secondary:         [D4, D8]
severity:          low
evidence_tier:     inherited
evidence:          Field-for-field DTO comparison (D-07-equivalent trace, repro-equivalent per 3b):
                    TypeScript's MsgboxPreview interface (msgbox-composer.ts:374-388) declares
                    exprText?: string, and TypeScript's msgbox CatalogItem (msgbox-composer.ts:
                    12-17) declares constant?: string; neither field exists on Java's
                    ComposerModels.MsgboxPreview or unified CatalogItem DTO (both read in full) —
                    Gson silently drops both on deserialization. Traced the consequence: exprText
                    is computed server-side inside msgboxPreview() (msgbox-composer.ts:403) and
                    folded into `statement` before serialization, so the useConstants checkbox's
                    generated-code promise holds identically on both IDEs; checked whether either
                    UI's display consumes the dropped fields — VS Code's own webview summary line
                    (msgbox-composer-webview.ts:330) also never reads m.exprText, so this is
                    currently inert on both sides, not an active IntelliJ-only regression.
failure_scenario:  Currently zero observable impact — both IDEs display the raw numeric expr in
                    their summary line regardless of useConstants, and the actually-inserted
                    statement text is correct on both sides. The latent risk is that a future
                    change to either webview's or dialog's display code to surface exprText/
                    constant would work silently on the VS Code side and silently do nothing on the
                    IntelliJ side, since Gson would drop the field with no compile-time or runtime
                    error — "a silent shape drift the compiler cannot catch."
classification:    easy
                    (1) touches 1 file: pass (ComposerModels.java only) — (2) no public API/
                    grammar/LSP change: pass (adding fields Gson already tolerates being absent
                    from older payloads) — (3) no new dependency: pass — (4) regression-testable
                    with existing harness: satisfied vacuously per D-09 — adding two unused DTO
                    fields changes no current runtime behaviour — (5) reviewer can name the exact
                    edit (add `public String exprText;` to MsgboxPreview and `public String
                    constant;` to CatalogItem): pass — (6) severity low, dimension D7 (not D1):
                    pass — all six tests pass, so classification is easy.
effort:            2
dedup:             none — checked #385 and #475 explicitly; neither names this DTO field gap.
disposition:       easy-fix
```

```
id:                P63-D7-005
unit:              RU-63-04
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/
dimension:         D7
secondary:         []
severity:          low
evidence_tier:     inherited
evidence:          Inherited referral disposition (see Inherited referral triage above): grep -c
                    setopts bbj-vscode/src/language/composer-commands.ts -> 0 (SETOPTS has no
                    bbj/composer/setopts/* LS command at all, unlike msgbox/addwindow/
                    addchildwindow); ls bbj-intellij/.../composer/ lists no SetoptsComposerDialog.
                    java; ComposerModels.java (read in full) defines no SetOpts* DTO; grep -in
                    setopts ComposerLauncher.java returns zero matches in its dispatch logic. No
                    runnable reproduction accompanies this record beyond the enumeration (D-07).
failure_scenario:  n/a in the sense D7 records a capability gap rather than a runtime failure — an
                    IntelliJ user editing a config.bbx file has no visual SETOPTS byte/bit-vector
                    composer available at all (must hand-edit the hex vector), where a VS Code user
                    on the same file gets a CodeLens-launched composer (#474, shipped 0.12.0).
classification:    major
                    (1) touches 1 file: FAIL — porting requires a new LS command layer (SETOPTS is
                    not part of the shared bbj/composer/* namespace today) plus a new
                    SetoptsComposerDialog.java, new ComposerModels DTOs, and a ComposerLauncher/
                    action wiring — many files — (2) no public API/grammar/LSP change: FAIL — new
                    bbj/composer/setopts/* LSP-facing commands would need to be added — (3) no new
                    dependency: pass — (4) regression-testable with existing harness: FAIL — no
                    src/test/ source set exists (P63-D5-001) — (5) reviewer can name the exact
                    edit: FAIL — only an architecture-level plan is nameable — (6) severity low,
                    dimension D7 (not D1): pass — multiple tests fail, so classification is major.
effort:            8
dedup:             #475 partial-overlap — #475 requests a NEW BBj-code-scoped SETOPTS capability
                    (decode hovers + tri-state composer with IOR/AND-aware codegen for SETOPTS calls
                    inside BBj source) that neither IDE has today; this finding is about porting the
                    EXISTING #474 config.bbx SETOPTS composer (already shipped in VS Code) to
                    IntelliJ — related but not identical. setopts-catalog.ts's own header, quoted in
                    RU-62-03's D8 cell, names IntelliJ reuse of its byte/bit logic as a stated future
                    intention — exactly the reuse surface #475's tri-state composer would also need
                    — so this finding's fix is a natural prerequisite subset of #475's fuller scope,
                    not a duplicate of it. #385 (Graffiti Composer, an unrelated external tool)
                    checked explicitly and dismissed.
disposition:       major-refactor
```

```
id:                P63-D4-007
unit:              RU-63-04
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddWindowComposerDialog.java,AddChildWindowComposerDialog.java
dimension:         D4
secondary:         []
severity:          low
evidence_tier:     trace
evidence:          Mechanical structural comparison: git diff --no-index --numstat
                    AddWindowComposerDialog.java AddChildWindowComposerDialog.java -> 37 28 (37 of
                    306 lines removed, 28 of 315 added — roughly 88%/85% of each file byte-identical
                    to the other). Shared verbatim or near-verbatim: refresh()/apply()/selected()/
                    setSelected()/preselect()/addGroupedChecks()/setEnabledRecursive()/labeled(),
                    the eventEnabled/eventPanel wiring, and the whole createCenterPanel() layout
                    shape. Differs only in the field set (receiver+sysgui vs.
                    receiver+window+id+context+title), the schematic-panel field type, and the
                    server RPC method names.
failure_scenario:  n/a (D4 is a code-shape finding) — any future fix to the shared addWindow-family
                    flow (e.g. P63-D2-010's stale-range revalidation, or P63-D3-003's debounce) must
                    be applied identically in two files by hand, with drift risk if one copy is
                    updated and the other missed.
classification:    major
                    (1) touches 1 file: FAIL — collapsing the duplication (e.g. a shared abstract
                    base parametrized by field set and Kind) touches AddWindowComposerDialog.java
                    and AddChildWindowComposerDialog.java at minimum — (2) no public API/grammar/LSP
                    change: pass — (3) no new dependency: pass — (4) regression-testable with
                    existing harness: satisfied vacuously per D-09 — a pure structural refactor
                    changes no runtime behaviour — (5) reviewer can name the exact edit (extract a
                    shared AddWindowFamilyComposerDialog base carrying refresh/apply/selected/
                    setSelected/preselect/addGroupedChecks/setEnabledRecursive/labeled, with the two
                    concrete classes supplying only their distinct field set and RPC calls): pass —
                    (6) severity low, dimension D4 (not D1): pass — test (1) alone fails, so
                    classification is major.
effort:            8
dedup:             none — checked #385 and #475 explicitly; neither names this dialog duplication.
disposition:       major-refactor
```

```
id:                P63-D4-008
unit:              RU-63-04
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ConfigureMsgboxIntention.java,ConfigureAddWindowIntention.java,ConfigureAddChildWindowIntention.java
dimension:         D4
secondary:         []
severity:          low
evidence_tier:     trace
evidence:          Pairwise git diff --no-index --numstat: ConfigureMsgboxIntention.java vs
                    ConfigureAddWindowIntention.java -> 9 8 (40 of 49 lines identical);
                    ConfigureAddWindowIntention.java vs ConfigureAddChildWindowIntention.java -> 7 7
                    (43 of 50 identical). All three share an identical isAvailable()/invoke()/
                    startInWriteAction()/generatePreview() shape — differing only in getText()'s
                    display string, the ComposerLauncher.Kind constant passed to launch(), and the
                    keyword string passed to isCaretOnCall().
failure_scenario:  n/a (D4 is a code-shape finding) — three files exist purely to supply one
                    differing display string, Kind constant and keyword to a shared call; a fourth
                    composer form would add a fourth near-identical file rather than a single
                    data-driven registration.
classification:    major
                    (1) touches 1 file: FAIL — collapsing three files into one parametrized
                    IntentionAction (or a shared abstract base each subclasses with three
                    overridden strings/Kind) touches all three files at minimum — (2) no public
                    API/grammar/LSP change: pass — (3) no new dependency: pass — (4)
                    regression-testable with existing harness: satisfied vacuously per D-09 — a
                    structural refactor changes no runtime behaviour — (5) reviewer can name the
                    exact edit (a single ConfigureComposerIntention(String text, Kind kind, String
                    keyword) constructed three times via plugin.xml constructor-arg registration,
                    mirroring RU-63-01's own P63-D4-005 disposition for the analogous three
                    BbjCompose*Action files): pass — (6) severity low, dimension D4 (not D1): pass —
                    test (1) alone fails, so classification is major.
effort:            4
dedup:             none — no frozen open issue names this intention-action duplication.
disposition:       major-refactor
```

```
id:                P63-D4-009
unit:              RU-63-04
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/MsgboxSchematicPanel.java:166-179,WindowSchematicPanel.java:118-131,ChildWindowSchematicPanel.java:145-158,MsgboxComposerDialog.java:257-262,AddWindowComposerDialog.java:181-188,274-279,AddChildWindowComposerDialog.java:185-192,283-288
dimension:         D4
secondary:         []
severity:          low
evidence_tier:     trace
evidence:          Extracted-method diff: the 14-line private static clip(Graphics2D, String, int)
                    helper is duplicated near-verbatim across all three *SchematicPanel.java files
                    (WindowSchematicPanel.java and ChildWindowSchematicPanel.java are byte-for-byte
                    identical; MsgboxSchematicPanel.java differs only in a local-variable-vs-
                    inline-call style choice). The 6-line private static labeled(String, JComponent)
                    helper is byte-for-byte identical across all three dialog files. The private
                    static setEnabledRecursive(JComponent, boolean) helper is byte-for-byte
                    identical between AddWindowComposerDialog.java and
                    AddChildWindowComposerDialog.java. None of these three small helpers has a
                    shared home anywhere in the composer/ package.
failure_scenario:  n/a (D4 is a code-shape finding) — a future fix to clip()'s ellipsis-truncation
                    logic, or to labeled()'s layout, must be applied at three (or two) separate
                    sites by hand, with drift risk between them; this is a smaller-granularity
                    instance of the same "no shared composer/ utility" pattern P63-D4-007/008
                    record at the file level.
classification:    major
                    (1) touches 1 file: FAIL — extracting a shared utility class (e.g. a
                    package-private ComposerSwingUtil with clip()/labeled()/setEnabledRecursive())
                    touches at least the three schematic panels and three dialog files — (2) no
                    public API/grammar/LSP change: pass — (3) no new dependency: pass — (4)
                    regression-testable with existing harness: satisfied vacuously per D-09 — a
                    pure structural extraction changes no runtime behaviour — (5) reviewer can name
                    the exact edit (add a small static-only ComposerSwingUtil class in composer/
                    and delegate all six call sites to it): pass — (6) severity low, dimension D4
                    (not D1): pass — test (1) alone fails, so classification is major.
effort:            4
dedup:             none — no frozen open issue names this small-helper duplication.
disposition:       major-refactor
```

```
id:                P63-D8-004
unit:              RU-63-04
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/MsgboxComposerDialog.java:39-44,AddWindowComposerDialog.java:40-45,ComposerLauncher.java:25-31
dimension:         D8
secondary:         []
severity:          low
evidence_tier:     trace
evidence:          MsgboxComposerDialog.java's class doc (:39-44) states only "Create flow —
                    inserts a fresh MSGBOX(...) statement," with no mention of the editMode
                    constructor parameter and its edit-in-place behaviour (assignToRow visibility,
                    OK-button text, replaceString vs. insert dispatch in ComposerLauncher.
                    openMsgbox). AddWindowComposerDialog.java's class doc (:40-45) states "Create
                    flow only for now — inserts a fresh addWindow(...) statement" — an explicit,
                    now-false limitation claim, since applyAddWindowEdit/applyHexEdit fully
                    implement edit-in-place. Contrast AddChildWindowComposerDialog.java's own class
                    doc, added later alongside #473, which correctly names both flows.
                    ComposerLauncher.java's class doc (:25-31) still says "Shared entry point for
                    both composer UIs (#430/#433)" though the class has dispatched three Kind
                    values since #473 landed — the same doc-lag root cause.
failure_scenario:  A maintainer reading MsgboxComposerDialog.java's or AddWindowComposerDialog.
                    java's class doc alone, without reading the constructor or ComposerLauncher's
                    call sites, would not learn edit-in-place exists for either class, and would
                    read AddWindowComposerDialog.java's doc as an accurate current limitation when
                    it is stale.
classification:    major
                    (1) touches 1 file: FAIL — the fix spans MsgboxComposerDialog.java,
                    AddWindowComposerDialog.java and ComposerLauncher.java — (2) no public
                    API/grammar/LSP change: pass — (3) no new dependency: pass — (4)
                    regression-testable with existing harness: satisfied vacuously per D-09 — a
                    Javadoc-only edit changes no runtime behaviour — (5) reviewer can name the exact
                    edit (update each class doc to name both create and edit-in-place flows,
                    mirroring AddChildWindowComposerDialog.java's own accurate wording, and update
                    ComposerLauncher.java's doc to say "all three composer UIs"): pass — (6)
                    severity low, dimension D8 (not D1): pass — test (1) alone fails, so
                    classification is major despite being doc-only.
effort:            2
dedup:             none — no frozen open issue names these stale class-doc claims.
disposition:       major-refactor
```

```
id:                P63-D8-005
unit:              RU-63-04
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerModels.java:1-14
dimension:         D8
secondary:         [D7]
severity:          low
evidence_tier:     trace
evidence:          The class doc claims these DTOs are "Gson-serializable data objects mirroring
                    the language server's bbj/composer/* request params and results." This unit's
                    own D7 field comparison (P63-D7-004) found two TS-side optional fields
                    (MsgboxPreview.exprText, msgbox CatalogItem.constant) with no Java counterpart —
                    "mirroring" overstates completeness by that margin. The doc's core substantive
                    claim (no flag/hex arithmetic happens here, TypeScript is the single source of
                    truth) remains accurate and is independently confirmed by this unit's own sweep
                    (no arithmetic found anywhere in the 245-line file).
failure_scenario:  A maintainer relying on the class doc's "mirroring" claim to assume Java's DTOs
                    are a complete field-for-field reflection of the TS-side types would be wrong by
                    exactly the two dormant fields P63-D7-004 records — not a functional bug today,
                    since neither field is currently consumed by any UI, but a doc-accuracy gap that
                    would mislead a reviewer checking DTO completeness by reading the comment alone
                    instead of diffing the two sides.
classification:    easy
                    (1) touches 1 file: pass (ComposerModels.java only) — (2) no public API/
                    grammar/LSP change: pass — (3) no new dependency: pass — (4) regression-testable
                    with existing harness: satisfied vacuously per D-09 — a doc-comment edit changes
                    no runtime behaviour — (5) reviewer can name the exact edit (soften "mirroring"
                    to "carrying the language server's bbj/composer/* params and results relevant to
                    the IntelliJ dialogs" or add a one-line note naming the two intentionally-unused
                    optional fields): pass — (6) severity low, dimension D8 (not D1): pass — all six
                    tests pass, so classification is easy.
effort:            2
dedup:             none — no frozen open issue names this doc-completeness overclaim.
disposition:       easy-fix
```

### Not-reproducible dispositions

None. This unit's sweep raised no candidate claim that failed to clear its evidence tier — every
check that surfaced a concrete defect is recorded above as a finding, the merged SETOPTS referral
reached a definite `promoted` disposition, and the D2/D3 checks confirmed several specific
behaviours as correct (the `seq` stale-response guard, threading discipline, decode-of-unparseable-
statement fallback, schematic-panel repaint cost) without any of those checks surfacing an
unclearable candidate — stated explicitly per the per-unit stopping rule's empty-subblock register,
rather than omitted.

### Cross-unit referrals

None. This unit's sweep raised no candidate that belongs to another unit's file list — the LSP4IJ
`LanguageServerManager` resolution this unit's D1/D3 cells trace (`BbjComposerService.server()`)
is a read-only, idempotent call into `RU-63-05`'s wiring, not a defect in that wiring itself, and no
finding here names a file this unit does not own — stated explicitly per the per-unit stopping
rule's empty-subblock register, rather than omitted.

### Unit closure

`RU-63-04` is closed against the four-part stopping rule (D-06): **(i)** all 7 live cells (D1, D2,
D3, D4, D5, D7, D8) carry a `fail` verdict plus a written check line above — every dimension
surfaced at least one concrete finding or, for D5, the cross-referenced systemic absence plus this
unit's own consequence; **(ii)** all thirteen files are named at least once inside this section —
`AddChildWindowComposerDialog.java` (D1/D4/D7/D8 cells, referral disposition), `AddWindowComposerDialog.java`
(D1/D2/D3/D4/D7/D8 cells, `P63-D4-007`), `BbjComposerServer.java` (D1 cell), `BbjComposerService.java`
(D1/D3/D8 cells), `ChildWindowSchematicPanel.java` (D4 cell, `P63-D4-009`), `ComposerLauncher.java`
(D1-D4/D8 cells, most findings' `location:`), `ComposerModels.java` (D1/D7/D8 cells, `P63-D7-004`,
`P63-D8-005`), `ConfigureAddChildWindowIntention.java`/`ConfigureAddWindowIntention.java`/
`ConfigureMsgboxIntention.java` (D1/D4 cells, `P63-D4-008`), `MsgboxComposerDialog.java`
(D1-D4/D7/D8 cells), `MsgboxSchematicPanel.java` (D4 cell, `P63-D4-009`), `WindowSchematicPanel.java`
(D4 cell, `P63-D4-009`); **(iii)** every candidate claim raised during either task is either one of
the 14 finding records above (`P63-D1-006`, `P63-D2-007` through `P63-D2-010`, `P63-D3-003`/`004`,
`P63-D4-007` through `P63-D4-009`, `P63-D7-004`/`005`, `P63-D8-004`/`005`) or the single explicit
`### Not-reproducible dispositions` empty statement — none was silently dropped; **and (iv)** both
inherited Phase 62 referrals (#4 from `RU-62-04`, #5 from `RU-62-03`) carry one written disposition
under `### Inherited referral triage` above, promoted together to `P63-D7-005`, and the ledger's
rows 4-5 are updated accordingly (re-confirmed by plan `63-05`).

**Scope-fidelity note.** All thirteen files in this unit were swept across all 7 live dimensions,
even though ROADMAP's Phase 63 success **criterion 1** names only "composer dialogs" from this
unit — the Applicability Grid, not the ROADMAP criteria, is the contract, and the criteria are a
deliberately named subset of it (D-16); the extra coverage here — the three `*SchematicPanel.java`
files, the three `Configure*Intention.java` files, and the four bridge/model files
(`ComposerModels.java`, `ComposerLauncher.java`, `BbjComposerServer.java`, `BbjComposerService.java`)
— is recorded as deliberate, not scope creep.

## RU-63-05 — LSP wiring, server lifecycle & status UI

**Files (13 / 1,297 LOC: 4 under `lsp/`, 9 under `ui/`):**
- `com/basis/bbj/intellij/lsp/BbjCompletionFeature.java` (77)
- `com/basis/bbj/intellij/lsp/BbjLanguageClient.java` (50)
- `com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java` (66)
- `com/basis/bbj/intellij/lsp/BbjLanguageServer.java` (97)
- `com/basis/bbj/intellij/ui/BbjJavaInteropService.java` (206)
- `com/basis/bbj/intellij/ui/BbjJavaInteropStatusBarWidgetFactory.java` (43)
- `com/basis/bbj/intellij/ui/BbjJavaInteropStatusBarWidget.java` (151)
- `com/basis/bbj/intellij/ui/BbjRestartServerAction.java` (43)
- `com/basis/bbj/intellij/ui/BbjServerCrashNotificationProvider.java` (63)
- `com/basis/bbj/intellij/ui/BbjServerLogToolWindowFactory.java` (47)
- `com/basis/bbj/intellij/ui/BbjServerService.java` (244)
- `com/basis/bbj/intellij/ui/BbjStatusBarWidgetFactory.java` (43)
- `com/basis/bbj/intellij/ui/BbjStatusBarWidget.java` (167)

**Risk rank:** 4 of 5 Phase 63 units — LSP4IJ wiring (DEBT-05's 19 experimental-API usages) and the server-health status bar.
**Sweep method:** full read.
**Owning plan:** 63-04.

### Cells
- D1 Security — fail — Checked, across this unit's two process/network-facing surfaces: **the language-server launch path**, `lsp/BbjLanguageServer.java`'s `OSProcessStreamConnectionProvider` configuration (:28-43) — `resolveNodePath()` (:45-66) falls through settings (`BbjSettings.getInstance().getState().nodeJsPath`, :47-50) -> auto-detection (`BbjNodeDetector.detectNodePath()`, :52-56) -> the RU-63-03 download cache (`BbjNodeDownloader.getCachedNodePath()`, :58-62) -> an unqualified literal `"node"` (:65) as the final fallback with no absolute-path guarantee; `resolveServerPath()` (:68-96) resolves `main.cjs` from the installed plugin path first (:70-77) or extracts it from a classloader resource to a temp file in development mode (:80-93), throwing `RuntimeException` if neither succeeds (:92,95) rather than silently proceeding with an empty path; the constructed `GeneralCommandLine(nodePath, serverPath, "--stdio")` (:38) passes both as separate array elements with no shell involved, and `cmd.setWorkDirectory(new File(project.getBasePath()))` (:40) sets the working directory to the current project's own base path. **The java-interop probe:** `ui/BbjJavaInteropService.java`'s `checkConnection()` (:117-160) reads `host`/`port` from settings at check time (:118-124, deliberately uncached — see D3), opens `new Socket()` in a try-with-resources and calls `socket.connect(new InetSocketAddress(host, port), TCP_TIMEOUT_MS)` (:129-130) — confirmed by full read that no byte is ever written to or read from that socket anywhere in this file, and the socket closes unconditionally on every path via try-with-resources; the sole signal `InteropStatus.CONNECTED` (:132) is derived from is a bare TCP handshake succeeding, with no peer-identity check. **Status and log surfaces:** `ui/BbjServerLogToolWindowFactory.java`'s console (:20-41) and both status-bar widgets display only curated status-transition strings originating from `BbjServerService.logToConsole()`/`BbjLanguageClient.handleServerStatusChanged()` — confirmed by grep that no `Process`/`OutputStream`/`InputStream` reference exists anywhere in this unit's files, so the language server's own raw stdout/stderr never reaches these UI sinks (the doc-accuracy consequence of this same fact is `P63-D8-006`), meaning no sensitive server-output content can leak through this specific path today. **Trust in server-reported state:** `lsp/BbjLanguageClient.handleServerStatusChanged()` (:34-49) and `ui/BbjServerService.updateStatus()` (:92-168) act on LSP4IJ's own `ServerStatus` enum values only — no free-form server-sent message content is interpreted or executed anywhere in this unit. No runnable reproduction accompanies either promoted record (D-07 — the Gradle build cannot run in this environment; a live PATH/CWD-hijack or network-tamper harness is out of this static-trace sweep's scope and would itself be the trigger sequence D-13 prohibits publishing). 2 findings recorded: P63-D1-007, P63-D1-008.
- D2 Correctness & error handling — fail — Checked the full server-lifecycle and dispose paths across `ui/BbjServerService.java` and `ui/BbjJavaInteropService.java`. **Restart during an in-flight request / concurrent restarts:** `restart()` (`BbjServerService.java:206-211`) calls `manager.stop("bbjLanguageServer")`/`manager.start("bbjLanguageServer")` unconditionally with no in-flight guard; `scheduleRestart()` (:217-220) exists as an apparent debounce (`restartAlarm.cancelAllRequests()`/`addRequest(this::restart, RESTART_DEBOUNCE_MS)`, `RESTART_DEBOUNCE_MS = 500` at :35) but `grep -rn "scheduleRestart()" bbj-intellij/src/main/java` returns zero call sites anywhere in the codebase — every one of the six real restart triggers (`ui/BbjRestartServerAction.java:27`, `ui/BbjServerCrashNotificationProvider.java:49`, `ui/BbjStatusBarWidget.java:122`, `ui/BbjJavaInteropStatusBarWidget.java:116`, `actions/BbjRefreshJavaClassesAction.java:30`, and the crash-auto-restart path itself at `BbjServerService.java:127`) calls the raw, unguarded `restart()` directly. **The status bar in between:** `BbjStatusBarWidget`/`BbjJavaInteropStatusBarWidget` both subscribe to their respective status Topics and repaint on every published event (:67-101/:65-95), so a restart's `stopping`/`stopped`/`starting`/`started` sequence is faithfully reflected — no defect on that specific path. **First-crash auto-restart blocks the EDT:** `updateStatus()`'s `crashCount == 1` branch (:115-128) calls `ApplicationManager.getApplication().invokeLater(() -> { ...; Thread.sleep(1000); ...; restart(); })` (:118-128) — `invokeLater` runnables execute on the Swing EDT, so the runnable's own `Thread.sleep(1000)` (:123) blocks the entire IDE UI for a full second on every first-crash auto-restart. **`Alarm`-driven polling disposal:** `BbjJavaInteropService.dispose()` (:203-205) calls `checkAlarm.cancelAllRequests()`, which cancels queued-but-not-yet-running requests only; `checkConnection()` (:117-160, runs on `Alarm.ThreadToUse.POOLED_THREAD`) and `broadcastStatus()` (:175-184) contain no `project.isDisposed()` check anywhere, unlike `BbjServerService.updateStatus()`, which checks it at entry (:93-95) and again inside every `invokeLater` lambda it schedules (:118-121,133-136,149-152,160-163) — a genuine asymmetry within this same unit. **Socket closure on every path:** confirmed pass — `try (Socket socket = new Socket())` (:129) closes unconditionally on success, timeout, and refusal alike. **Status listener removal:** confirmed pass — `BbjStatusBarWidget`/`BbjJavaInteropStatusBarWidget.dispose()` both call `messageBusConnection.disconnect()` (:163-165/:146-149); `BbjJavaInteropService`'s own subscription is parented to `this` via `project.getMessageBus().connect(this)` (:67), auto-disposed with the service. **Listener threading:** confirmed pass — every status-change continuation that touches Swing state is wrapped in `ApplicationManager.getApplication().invokeLater(...)` at its own call site, with no off-EDT UI touch found anywhere in this unit. **Widget enablement when no server exists:** `BbjRestartServerAction.update()` (:31-42) gates on the currently focused file's extension only, not on whether a server instance exists for the project — enabled even before first server start, though `restart()`'s `manager.stop(...)`/`manager.start(...)` calls are themselves idempotent no-ops on a never-started server per LSP4IJ's own id-based lookup, so this is not promoted as a separate defect. **Editor-tab-switch visibility:** both status-bar widgets' `updateVisibility()` (`BbjStatusBarWidget.java:103-114`, `BbjJavaInteropStatusBarWidget.java:97-108`) is called exclusively from inside `updateStatus()` (:67-101/:65-95), itself fired only by a status-Topic event or once at construction — neither file registers a `FileEditorManagerListener` or any other editor-selection hook (confirmed by grep), so a bare editor-tab switch with no intervening status change leaves the widget's visibility stale. 4 findings recorded: P63-D2-011, P63-D2-012, P63-D2-013, P63-D2-014.
- D3 Performance & resource use — fail — Checked the java-interop poll cost and cadence: `checkConnection()` (`BbjJavaInteropService.java:117-160`) performs one TCP connect attempt per tick (`TCP_TIMEOUT_MS = 1000`, :60) at `CHECK_INTERVAL_MS = 5000` (:58) cadence, re-reading `BbjSettings.getInstance().getState()` on every call (:119) rather than caching — the code's own comment states this is deliberate ("not cached - user may change them"), so this is stated as a trade-off, not assumed to be a defect. **Whether polling continues while no BBj file is open or the project is backgrounded:** `startChecking()` (:93-96) arms once when the language-server status first reaches `started` (:70-71), and `scheduleNextCheck()` (:109-111) unconditionally re-arms itself at the end of every `checkConnection()` run (:159) — the only two states that stop it are the language server itself stopping (:72-75) or project disposal (:203-205); nothing in this file checks whether a BBj file is currently open (that gating exists only in the two widgets' own display-layer `updateVisibility()`, not in the scheduling loop) or whether the IDE window has focus, so the poll runs indefinitely at the same 5-second cadence regardless. **Status-bar repaint frequency:** both widgets recompute on status-Topic events only (:67-101/:65-95), not per editor caret/keystroke event — confirmed pass, no hot-path concern. **Server log tool window growth:** `BbjServerLogToolWindowFactory`'s `ConsoleView` (:23-25) receives only the small set of curated status-transition strings this unit logs (see D1/D8 — never the server's own raw stdout/stderr), so unbounded growth risk is low; IntelliJ's own `ConsoleView` additionally manages its own scroll-back buffer — confirmed pass, no defect promoted. **`BbjCompletionFeature` per-item cost:** `getIcon()` (`lsp/BbjCompletionFeature.java:21-56`) and `isJavaInteropCompletion()` (:62-76) perform a bounded `switch` plus up to four `String.contains()` calls per completion item — standard per-item completion-rendering cost, no scaling defect beyond what every completion-icon provider does. 1 finding recorded: P63-D3-005.
- D4 Maintainability & code smells — fail — **This is where DEBT-05's evidence is recorded, bounded as follows.** State the count basis as measured, with both commands and their literal outputs: `grep -rn "ApiStatus.Experimental\|@Experimental" bbj-intellij/src/main/java` returns **zero** annotations in this repository's own source; `grep -rln "com.redhat.devtools.lsp4ij" bbj-intellij/src/main/java` returns **20 references across 11 files** — a measured correction to the "10 files" figure carried in this phase's own planning documents (the 11: `BbjCompileAction.java`, `BbjRefreshJavaClassesAction.java`, `BbjRunActionBase.java` — `RU-63-01`'s files; `BbjComposerService.java` — `RU-63-04`'s file; and this unit's own 7: `BbjCompletionFeature.java`, `BbjLanguageClient.java`, `BbjLanguageServerFactory.java`, `BbjLanguageServer.java`, `BbjJavaInteropService.java`, `BbjServerService.java`, `BbjStatusBarWidget.java`). PROJECT.md's "19 experimental API usages" figure counts APIs LSP4IJ itself marks experimental on its own side, which is not greppable from this tree — neither confirmed nor refuted here; Phase 66 owns its resolution (DEBT-05). Enumerated the concrete, checkable coupling shape this unit depends on: `LSPCompletionFeature` (`lsp/BbjCompletionFeature.java`, subclassed), `LanguageServerFactory`/`LSPClientFeatures`/`LSPDocumentLinkFeature`/`StreamConnectionProvider` (`lsp/BbjLanguageServerFactory.java`), `LanguageClientImpl` (`lsp/BbjLanguageClient.java`, subclassed, overriding `createSettings()`/`handleServerStatusChanged()`), `OSProcessStreamConnectionProvider` (`lsp/BbjLanguageServer.java`, subclassed), and `LanguageServerManager`/`ServerStatus` (`ui/BbjServerService.java`, `ui/BbjJavaInteropService.java`, `ui/BbjStatusBarWidget.java`, consumed as plain enum values/static id-based lookups, not subclassed — the narrowest coupling form). Recorded as `P63-D4-010`, `dedup:` naming DEBT-05. Beyond DEBT-05, ran the ordinary D4 checks: structural comparison of `ui/BbjStatusBarWidget.java` (167) and `ui/BbjJavaInteropStatusBarWidget.java` (151) via `git diff --no-index --numstat` -> `25 41` (roughly 85%/73% of each file's shape shared), and of the two 43-line widget factories -> `5 5` (roughly 88% shared) — recorded as `P63-D4-011`. Checked `ui/BbjServerService.java` (244 lines) for god-service shape: state-tracking, console logging, notification, restart, dispose, and the `Topic` interface are five cohesive lifecycle-orchestration responsibilities in one focused class — not crossed into god-service territory, confirmed, not promoted. Checked whether status representation is expressed once or re-derived per consumer: the `ServerStatus`/`InteropStatus`-to-icon/text switch is independently re-derived in each of the two widgets — the same duplication `P63-D4-011` already records, not restated as a third finding. 2 findings recorded: P63-D4-010, P63-D4-011.
- D5 Test coverage gaps — fail — Cross-references `P63-D5-001` (`RU-63-03`) rather than restating the systemic zero-test-source-set fact: `bbj-intellij` has no `src/test/` source set at all (re-confirmed here: `ls bbj-intellij/src/` -> `main` only). This unit's own specific consequence: server start/stop/restart sequencing including the unguarded-concurrency and EDT-blocking crash-recovery paths (`P63-D2-012`, `P63-D2-013`), status propagation to both widgets including their stale-visibility bug (`P63-D2-011`), the java-interop probe's connect/grace-period state machine and its dispose-race gap (`P63-D3-005`, `P63-D2-014`), crash-notification behaviour on repeated crashes, and `BbjCompletionFeature`'s icon-mapping override are all untested — every finding recorded in this unit's `### Findings` above would ship and regress silently, with no harness that would fail if any of it broke or was fixed incorrectly. A first test suite for this unit would minimally need to cover: `BbjJavaInteropService.checkConnection()`'s grace-period state transitions (a pure state machine over `InteropStatus`, feasible with a fake/mock socket layer, needing no IntelliJ Platform test fixture beyond that), `BbjServerService.updateStatus()`'s crash-count/window logic, and `BbjCompletionFeature.isJavaInteropCompletion()`'s pure-function detail-string heuristic (the one piece of this unit's own logic needing no IntelliJ Platform fixture at all, mirroring `RU-63-03`'s own `meetsMinimumVersion()` precedent). Noting in one clause: this is also the unit whose LSP4IJ coupling (`P63-D4-010`, DEBT-05) would most benefit from a contract test asserting this unit's extension-point overrides still match LSP4IJ's expected signatures across a version bump — the concrete cost DEBT-05 carries.
- D6 Dependency health — n/a — "No distinct third-party dependency of its own; dependency-tree health (npm and Gradle) is assessed once, exhaustively, at `RU-64-02`, and vendored-binary provenance at `RU-64-03`. Repeating the audit per unit would restate the same npm/Gradle audit under a different heading, not surface a new finding."
- D7 Cross-IDE parity — fail — **The direction is reversed relative to Phase 62: this phase owns the IntelliJ rows and reads `bbj-vscode/` as reference material only (D-05).** Compared server-launch mechanics: `bbj-vscode/src/extension.ts`'s `startLanguageClient()` (:840-894) launches `main.cjs` via `vscode-languageclient`'s own IPC transport inside the extension host's bundled Node.js runtime (`TransportKind.ipc`, :853-854) — VS Code performs no Node.js runtime download/detection/executable-search step at all, the asymmetry `RU-63-03`'s own D7 cell already records as `n/a — R-VSCODE-NO-DOWNLOAD`; not re-derived here. Compared server-restart handling, including `bbj.refreshJavaClasses` (`ui/BbjServerService.java`'s `restart()`, :206-211) against the VS Code side's targeted LSP request (`extension.ts:694-704`, `client.sendRequest('bbj/refreshJavaClasses')`) — **cross-referencing `RU-63-01`'s already-recorded disposition of Phase 62's referral #3 (`P63-D7-003`) by ID rather than allocating a second finding for the same divergence (D-06)**, adding only what the mechanism side contributes: `BbjServerService.restart()`'s only available primitive is `LanguageServerManager`'s id-based `stop(String)`/`start(String)` pair (:208-210) — no narrower per-request refresh call is used anywhere in this unit's own code; notably, this same plugin already demonstrates the exact typed-request mechanism a narrower `bbj/refreshJavaClasses` call would need — `com/basis/bbj/intellij/composer/BbjComposerServer.java` (`RU-63-04`'s file) is a `@JsonRequest`-annotated `LanguageServer` subinterface reached via the same `LanguageServerManager.getLanguageServer(...)` this unit's `BbjComposerService.java` also calls — so the full-restart mechanism is an implementation choice that does not reuse machinery already present in this codebase for other custom requests, not an LSP4IJ platform limitation; this observation supports, and does not re-file, `P63-D7-003`'s existing disposition. Compared status/crash/log surfaces and java-interop connection handling each IDE offers: `bbj-vscode/src/extension.ts` registers no `onDidChangeState` handler, no status-bar item reflecting language-server or java-interop connection state, and no crash-loop detection/auto-restart logic anywhere (confirmed by grep — `deactivate()`, :832-838, only calls `client.stop()`); IntelliJ's `BbjServerService`/`BbjStatusBarWidget`/`BbjJavaInteropStatusBarWidget`/`BbjServerCrashNotificationProvider`/`BbjRestartServerAction` provide all of these. This is IntelliJ offering *more* than VS Code, not an IntelliJ-side defect, so per D-05 it is recorded as a bullet in `### Cross-phase observations (VS Code side)` in the close-out rather than as a `P63-D7-*` finding here — Phase 62 is closed and this is the one narrowly scoped exception the write contract allows. No new finding ID allocated for either the mechanism cross-reference or the VS Code-side observation.
- D8 Comment & doc accuracy — fail — Checked every class-level and method-level Javadoc across all 13 files against the code just read. `ui/BbjJavaInteropService.java`'s class comment (:19-28) explaining why the plugin probes the TCP port independently — that the language server connects to java-interop but does not expose connection status over LSP, so an independent probe is the only way to show status without LS changes — checked against the implementation and confirmed still accurate and still holding (no LSP-level status notification exists anywhere in this unit's files or in `bbj-vscode/src/extension.ts`, per this unit's own D7 cross-phase observation above). `lsp/BbjLanguageServerFactory.java:19`'s comment naming the `com.redhat.devtools.lsp4ij.server` extension point checked against `plugin.xml`'s actual registration (`<extensions defaultExtensionNs="com.redhat.devtools.lsp4ij"><server id="bbjLanguageServer" ... factoryClass="com.basis.bbj.intellij.lsp.BbjLanguageServerFactory">`, :231-241 — read as context only, no finding located in `plugin.xml`, D-16) — accurate. `lsp/BbjLanguageServer.java`'s class doc ("Starts the BBj language server process using Node.js... Resolves the bundled main.cjs from plugin resources") matches `resolveNodePath()`/`resolveServerPath()`'s implementation — accurate. `lsp/BbjCompletionFeature.java`'s class doc matches its `getIcon()`/`isJavaInteropCompletion()` implementation — accurate. Found two genuine doc-accuracy defects: `ui/BbjServerLogToolWindowFactory.java`'s class doc claims the tool window "displays real-time server stdout/stderr" (:14-17), but the console it creates (:20-41) is never attached to the spawned process's own I/O streams and is written to exclusively by `BbjServerService.logToConsole()`'s curated status-transition strings (confirmed by grep: no `Process`/`OutputStream`/`InputStream` reference anywhere in this file) — recorded as `P63-D8-006`; `ui/BbjServerService.java`'s class doc (:24-28) lists "debounced restart scheduling" among its responsibilities, but `P63-D2-013` establishes `scheduleRestart()` has zero callers anywhere in the codebase — recorded as `P63-D8-007`, cross-referencing `P63-D2-013`'s own evidence rather than restating it (D-08 pattern). Checked `CLAUDE.md` §"IDE Integration"'s claims against this unit: "Both VS Code and IntelliJ consume the same language server binary (`out/language/main.cjs`). The IntelliJ plugin bundles the compiled LS and TextMate grammar, and connects via LSP4IJ" — checked against `lsp/BbjLanguageServer.java`'s `resolveServerPath()` (plugin-bundled `lib/language-server/main.cjs` resolution, :70-77) and `lsp/BbjLanguageServerFactory.java`'s LSP4IJ `LanguageServerFactory` implementation — both claims accurate for the files this unit touches. `CLAUDE.md` is silent about the java-interop status probe, the crash-recovery/auto-restart mechanism, and the status-bar widgets entirely — noted as a silence per `RU-63-01`'s own precedent, not promoted to a finding, since nothing `CLAUDE.md` does claim is contradicted here. 2 findings recorded: P63-D8-006, P63-D8-007.

### Findings

```
id:                P63-D1-007
unit:              RU-63-05
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServer.java:32,38-43,45-66
dimension:         D1
secondary:         []
severity:          high
evidence_tier:     repro
evidence:          Line-by-line trace (D-07 — no runnable reproduction; a live PATH/CWD-hijack
                    harness is out of this static-trace sweep's scope and would itself be the
                    trigger sequence D-13 prohibits publishing): resolveNodePath() (:45-66) falls
                    through settings (:47-50) -> auto-detection (:52-56) -> the RU-63-03 download
                    cache (:58-62) -> an unqualified literal "node" (:65) when all three resolution
                    paths are empty/absent. The resulting GeneralCommandLine (:38,
                    `new GeneralCommandLine(nodePath, serverPath, "--stdio")`) is constructed with
                    that bare, unqualified executable name with no absolute-path guarantee, and its
                    working directory is explicitly set to the current project's own base path
                    (:40, `cmd.setWorkDirectory(new File(project.getBasePath()))`) — the exact
                    combination CWE-426 (Untrusted Search Path) names as hazardous on platforms
                    whose process-creation API consults the working directory for an unqualified
                    executable name.
failure_scenario:  On a machine where Node.js is not configured in BBj Settings, not
                    auto-detectable via PATH, and has never been downloaded through the RU-63-03
                    cache, this fallback resolves the executable to the literal string "node" and
                    launches it with the current project directory as the working directory — the
                    same combination through which workspace-supplied content can be preferred over
                    the genuinely intended system binary on platforms that search the working
                    directory for an unqualified executable name, resulting in that content running
                    as the language-server host process for every BBj file opened in the project.
                    Per D-13, no trigger sequence or payload is stated beyond this
                    problem-class/impact description.
classification:    major
                    (1) touches 1 file: pass (confined to BbjLanguageServer.java's
                    resolveNodePath()) — (2) no public API/grammar/LSP change: pass — (3) no new
                    dependency: pass — (4) regression-testable with existing harness: FAIL — no
                    src/test/ source set exists (P63-D5-001) — (5) reviewer can name the exact edit
                    (require an absolute, existing, executable path before constructing
                    GeneralCommandLine — fail loudly with an actionable Settings-configuration
                    prompt instead of falling back to the bare literal "node"): pass — (6) severity
                    high and dimension D1: FAIL — test (6) fails on its own, so classification is
                    major regardless of the other five tests (D-13's safety gate).
effort:            4
dedup:             none — #410 (Zed Editor support) and #231 (custom classpath and command-line
                    settings) both checked explicitly and dismissed — neither concerns Node.js
                    executable resolution or search-path safety. No other frozen open issue names
                    this launch-path fallback.
disposition:       major-refactor
```

```
id:                P63-D1-008
unit:              RU-63-05
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropService.java:117-150
dimension:         D1
secondary:         [D2]
severity:          low
evidence_tier:     repro
evidence:          Line-by-line trace: checkConnection() (:117-160) opens `new Socket()` and calls
                    socket.connect(new InetSocketAddress(host, port), TCP_TIMEOUT_MS) (:129-130)
                    inside a try-with-resources — no byte is written to or read from the socket at
                    any point in this file (confirmed by full read: no OutputStream/InputStream/
                    write/read call anywhere), and the socket is closed unconditionally on every
                    path via try-with-resources. A bare TCP three-way handshake succeeding is the
                    sole signal InteropStatus.CONNECTED (:132) is derived from — no peer-identity or
                    protocol check follows it.
failure_scenario:  Any process — not necessarily the genuine java-interop service — that accepts a
                    TCP connection on the configured host:port (default localhost:5008) causes this
                    probe to report "Java: Connected" in the status bar, even though no
                    application-layer exchange confirms the listening peer is actually java-interop.
                    The consequence is a misleading, purely cosmetic status indicator, not a state
                    change or data exposure — no value from the socket is read or acted upon
                    anywhere in this file.
classification:    major
                    (1) touches 1 file: pass — (2) no public API/grammar/LSP change: pass — (3) no
                    new dependency: pass — (4) regression-testable with existing harness: FAIL — no
                    src/test/ source set exists (P63-D5-001) — (5) reviewer can name the exact edit
                    (the limitation is inherent given java-interop exposes no LSP-visible identity
                    or handshake to check against, per this file's own class doc, :19-23 — the
                    nameable edit is documenting the limitation explicitly in that same doc, since a
                    protocol-level identity check would require a java-interop change out of this
                    unit's scope): pass — (6) severity low, dimension D1 (not high, not critical):
                    pass — test (4) alone fails, so classification is major per D-13.
effort:            2
dedup:             none — #410 and #231 checked explicitly and dismissed as unrelated. No frozen
                    open issue names java-interop probe identity verification.
disposition:       major-refactor
```

```
id:                P63-D2-011
unit:              RU-63-05
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjStatusBarWidget.java:67-114,bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropStatusBarWidget.java:65-108
dimension:         D2
secondary:         [D3]
severity:          low
evidence_tier:     repro
evidence:          Line-by-line trace: both widgets call updateVisibility() (BbjStatusBarWidget.
                    java:99, BbjJavaInteropStatusBarWidget.java:93) exclusively from inside their
                    own updateStatus() method (:67-101/:65-95), which itself runs only when the
                    server-status or java-interop-status message-bus Topic fires a new value
                    (subscribed at :58-61/:56-59) or once at construction time (:64/:62). Neither
                    file registers a FileEditorManagerListener or any other editor-selection-change
                    hook anywhere (confirmed by grep across both files) — updateVisibility()'s own
                    file-extension check (:104-113/:98-107) therefore only re-runs on a status
                    transition, never on a bare editor-tab switch.
failure_scenario:  A user who opens a BBj file (widget becomes visible) and then switches to a
                    non-BBj file, with no intervening server-status or java-interop-status change,
                    keeps seeing the now-stale visible widget — and the reverse: opening a first
                    BBj file after the server has already reached a stable "started" status (no
                    further status event fires) leaves the widget hidden until some unrelated
                    status transition happens to occur, if one ever does.
classification:    major
                    (1) touches 1 file: FAIL — the same fix (registering a FileEditorManagerListener)
                    is needed independently in both widget files — (2) no public API/grammar/LSP
                    change: pass — (3) no new dependency: pass — (4) regression-testable with
                    existing harness: FAIL — no src/test/ source set exists (P63-D5-001) — (5)
                    reviewer can name the exact edit (register a FileEditorManagerListener.
                    FILE_EDITOR_MANAGER subscription via the project message bus in each widget's
                    constructor, disposed alongside messageBusConnection, calling updateVisibility()
                    on selection change): pass — (6) severity low, dimension D2 (not D1): pass —
                    tests (1) and (4) both fail, so classification is major.
effort:            4
dedup:             none — #410 and #231 checked explicitly and dismissed. No frozen open issue
                    names status-bar visibility staleness on editor-tab switch.
disposition:       major-refactor
```

```
id:                P63-D2-012
unit:              RU-63-05
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java:115-128
dimension:         D2
secondary:         [D3]
severity:          medium
evidence_tier:     repro
evidence:          Line-by-line trace: on the first detected crash (crashCount == 1, :115),
                    updateStatus() calls ApplicationManager.getApplication().invokeLater(() -> {
                    ...; Thread.sleep(1000); ...; restart(); }) (:118-128). invokeLater runnables
                    execute on the Swing Event Dispatch Thread; the runnable's own Thread.sleep(1000)
                    (:123) therefore blocks the EDT — and with it every other queued UI repaint,
                    keystroke, and menu action — for a full second on every single first-crash
                    auto-restart.
failure_scenario:  The moment the language server crashes for the first time within a session, the
                    entire IntelliJ UI freezes for approximately one second while this handler
                    sleeps on the EDT before calling restart() — the opposite of the project's own
                    established "process launch off EDT to pooled thread" pattern (PROJECT.md Key
                    Decisions), applied here to a purely cosmetic pre-restart delay rather than the
                    actual restart work.
classification:    major
                    (1) touches 1 file: pass — (2) no public API/grammar/LSP change: pass — (3) no
                    new dependency: pass — (4) regression-testable with existing harness: FAIL — no
                    src/test/ source set exists (P63-D5-001) — (5) reviewer can name the exact edit
                    (move the delay onto restartAlarm.addRequest(this::restart, 1000) off the EDT,
                    reusing the existing Alarm-based scheduling machinery instead of a raw
                    Thread.sleep inside invokeLater): pass — (6) severity medium, dimension D2 (not
                    D1): pass — test (4) alone fails, so classification is major.
effort:            2
dedup:             none — no frozen open issue names EDT-blocking behavior in the crash-recovery
                    path (distinct from #486, which requests config-file watch/reload, not crash
                    recovery). #410/#231 also checked and dismissed.
disposition:       major-refactor
```

```
id:                P63-D2-013
unit:              RU-63-05
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java:34-35,206-220
secondary:         [D4]
dimension:         D2
severity:          medium
evidence_tier:     repro
evidence:          Line-by-line trace plus a repo-wide grep: scheduleRestart() (:217-220) debounces
                    via restartAlarm.cancelAllRequests()/addRequest(this::restart,
                    RESTART_DEBOUNCE_MS) (:218-219, RESTART_DEBOUNCE_MS = 500 at :35) — but
                    `grep -rn "scheduleRestart()" bbj-intellij/src/main/java` returns zero call
                    sites anywhere in the codebase. Every actual restart trigger instead calls the
                    raw, unguarded restart() (:206-211, manager.stop(...)/manager.start(...) with no
                    lock, flag, or debounce) directly: BbjRestartServerAction.java:27,
                    BbjServerCrashNotificationProvider.java:49, BbjStatusBarWidget.java:122,
                    BbjJavaInteropStatusBarWidget.java:116, BbjRefreshJavaClassesAction.java:30, and
                    the crash-auto-restart path itself (BbjServerService.java:127, P63-D2-012's own
                    call site) — six independent call sites, none passing through
                    scheduleRestart()'s debounce.
failure_scenario:  Two of these six triggers invoked within a short window of each other — e.g. a
                    user double-clicking "Restart Server" in the status-bar popup, or clicking
                    "Restart" on the crash notification banner while the crash-triggered 1-second
                    auto-restart delay (P63-D2-012) is still pending — each independently call
                    manager.stop("bbjLanguageServer")/manager.start("bbjLanguageServer") with no
                    synchronization between the two calls, an unguarded interleaving whose outcome
                    depends on LanguageServerManager's own internal handling of overlapping
                    stop/start calls for the same server id, not on anything this file coordinates.
classification:    major
                    (1) touches 1 file: pass — the minimal fix (an in-flight guard inside restart()
                    itself, e.g. an AtomicBoolean compare-and-set) is confined to BbjServerService.
                    java; the six call sites need no change since they already call the single
                    restart() entry point that would gain the guard — (2) no public API/grammar/LSP
                    change: pass — (3) no new dependency: pass — (4) regression-testable with
                    existing harness: FAIL — no src/test/ source set exists (P63-D5-001) — (5)
                    reviewer can name the exact edit (guard restart() with an in-flight
                    AtomicBoolean, or make the currently-unused scheduleRestart()/Alarm machinery
                    the single entry point every caller uses): pass — (6) severity medium, dimension
                    D2 (not D1): pass — test (4) alone fails, so classification is major.
effort:            4
dedup:             none — #410/#231 checked and dismissed. No frozen open issue names
                    concurrent-restart races or the unused debounce infrastructure.
disposition:       major-refactor
```

```
id:                P63-D2-014
unit:              RU-63-05
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropService.java:117-184
dimension:         D2
secondary:         [D4]
severity:          low
evidence_tier:     repro
evidence:          Line-by-line trace, contrasted against this same unit's own established pattern:
                    BbjServerService.updateStatus() checks project.isDisposed() at entry (:93-95)
                    and again inside every invokeLater lambda it schedules (:118-121,133-136,
                    149-152,160-163) before touching project.getMessageBus(). BbjJavaInteropService.
                    checkConnection() (:117-160, runs on Alarm.ThreadToUse.POOLED_THREAD) and
                    broadcastStatus() (:175-184) contain no project.isDisposed() check anywhere —
                    broadcastStatus()'s invokeLater lambda (:176-183) calls project.getMessageBus().
                    syncPublisher(...) and EditorNotifications.getInstance(project).
                    updateAllNotifications() (:177-182) unconditionally.
failure_scenario:  A health check already in flight on the pooled thread when the project begins
                    disposing (dispose() at :202-205 only calls checkAlarm.cancelAllRequests(),
                    which cancels queued-but-not-yet-running requests, not one already executing)
                    completes after disposal has started and reaches broadcastStatus()'s
                    invokeLater lambda, which calls project.getMessageBus()/EditorNotifications.
                    getInstance(project) on a project that may already be disposed — a class of
                    failure this same unit's own BbjServerService code already guards against at
                    every equivalent call site.
classification:    major
                    (1) touches 1 file: pass — (2) no public API/grammar/LSP change: pass — (3) no
                    new dependency: pass — (4) regression-testable with existing harness: FAIL — no
                    src/test/ source set exists (P63-D5-001) — (5) reviewer can name the exact edit
                    (add `if (project.isDisposed()) return;` at the top of checkConnection() and
                    inside broadcastStatus()'s invokeLater lambda, mirroring BbjServerService's own
                    pattern): pass — (6) severity low, dimension D2 (not D1): pass — test (4) alone
                    fails, so classification is major.
effort:            2
dedup:             none — no frozen open issue names this dispose-ordering gap. #410/#231 also
                    checked and dismissed.
disposition:       major-refactor
```

```
id:                P63-D3-005
unit:              RU-63-05
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropService.java:93-96,109-111,117-160
dimension:         D3
secondary:         []
severity:          low
evidence_tier:     repro
evidence:          Line-by-line trace: startChecking() (:93-96) is invoked once, when the
                    language-server status first transitions to started (the message-bus
                    subscription at :67-77), and thereafter scheduleNextCheck() (:109-111)
                    unconditionally re-arms checkAlarm.addRequest(this::checkConnection,
                    CHECK_INTERVAL_MS) (:110, every 5000ms) at the end of every checkConnection()
                    run (:159) — with no check anywhere in this file for whether a BBj file is
                    currently open (that gating exists only in the two status-bar widgets' own
                    updateVisibility(), a display concern — see P63-D2-011) or whether the IDE
                    window currently has focus. The only two states that stop the alarm are
                    stopChecking() (:102-104, called only when the LS status itself becomes
                    stopped/stopping) and dispose() (:203-205, project close).
failure_scenario:  Once the language server has started, this unit performs a TCP connect attempt
                    against the configured java-interop host:port every 5 seconds indefinitely — for
                    the lifetime of the project — even while every open editor tab is a non-BBj file
                    (the status widget itself is hidden per its own visibility check) and even while
                    the IDE window is minimized or in the background, since neither condition is
                    checked anywhere in the scheduling loop. The settings re-read on every tick
                    (BbjSettings.getInstance().getState(), :119) is a stated, deliberate design
                    trade-off ("not cached - user may change them") rather than a defect, so this
                    finding is scoped to the missing visibility/focus gating only.
classification:    major
                    (1) touches 1 file: pass — (2) no public API/grammar/LSP change: pass — (3) no
                    new dependency: pass — (4) regression-testable with existing harness: FAIL — no
                    src/test/ source set exists (P63-D5-001) — (5) reviewer can name the exact edit
                    (gate scheduleNextCheck()/startChecking() on whether a BBj file is currently
                    open, mirroring the widgets' own updateVisibility() check, or on project-frame
                    focus/idle state): pass — (6) severity low, dimension D3 (not D1): pass — test
                    (4) alone fails, so classification is major.
effort:            3
dedup:             none — #410/#231 checked and dismissed. No frozen open issue names java-interop
                    poll cadence/gating.
disposition:       major-refactor
```

```
id:                P63-D4-010
unit:              RU-63-05
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjCompletionFeature.java,bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java:8-12,40-65,bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageClient.java:8-9,18,bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServer.java:11,28,bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java:19-20,208-210,bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropService.java:10,bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjStatusBarWidget.java:14
dimension:         D4
secondary:         []
severity:          medium
evidence_tier:     trace
evidence:          Measured, not assumed: `grep -rn "ApiStatus.Experimental\|@Experimental"
                    bbj-intellij/src/main/java` -> zero matches anywhere in this repository's own
                    source. `grep -rln "com.redhat.devtools.lsp4ij" bbj-intellij/src/main/java` ->
                    20 references across 11 files (measured correction to this phase's own
                    planning-document figure of "10 files"): BbjCompileAction.java,
                    BbjRefreshJavaClassesAction.java, BbjRunActionBase.java (RU-63-01's files),
                    BbjComposerService.java (RU-63-04's file), and this unit's own 7 —
                    BbjCompletionFeature.java, BbjLanguageClient.java,
                    BbjLanguageServerFactory.java, BbjLanguageServer.java,
                    BbjJavaInteropService.java, BbjServerService.java, BbjStatusBarWidget.java.
                    PROJECT.md's "19 experimental API usages" figure counts APIs LSP4IJ itself
                    marks experimental on its own side — not greppable from this tree, neither
                    confirmed nor refuted here per D-13's prohibition on asserting an unmeasured
                    count. This unit is where the coupling concentrates: BbjCompletionFeature
                    extends LSPCompletionFeature (subclassing, overriding getIcon()) —
                    PROJECT.md's own named coupling of concern; BbjLanguageServerFactory implements
                    LanguageServerFactory and returns an anonymous LSPClientFeatures with a nested
                    LSPDocumentLinkFeature override (:41-64); BbjLanguageClient extends
                    LanguageClientImpl overriding createSettings()/handleServerStatusChanged
                    (ServerStatus); BbjLanguageServer extends OSProcessStreamConnectionProvider;
                    BbjServerService/BbjJavaInteropService/BbjStatusBarWidget consume the
                    ServerStatus enum and LanguageServerManager's start(String)/stop(String)
                    id-based API as plain values/static lookups, not subclassed — the narrowest
                    coupling form of the set.
failure_scenario:  n/a (D4 is a code-shape finding, not a runtime failure scenario) — a breaking
                    signature or semantics change to LSPCompletionFeature.getIcon(),
                    LSPClientFeatures's builder chain, LanguageClientImpl.
                    handleServerStatusChanged(), or OSProcessStreamConnectionProvider's constructor
                    contract in a future LSP4IJ release would surface as a compile failure or a
                    silent behaviour change across this unit's 7 files at plugin-update time, with
                    no regression test anywhere in this module (P63-D5-001) to catch a silent one
                    before release.
classification:    major
                    (1) touches 1 file: n/a — this record documents an existing coupling surface,
                    not a proposed fix — (2) no public API/grammar/LSP change: pass — (3) no new
                    dependency: n/a — records an existing dependency's coupling shape, adds nothing
                    — (4) regression-testable with existing harness: FAIL — no src/test/ source set
                    exists (P63-D5-001) — (5) reviewer can name the exact edit: n/a at this
                    recording stage — Phase 66 owns DEBT-05's re-triage and any contract-test
                    authoring, not a single named edit from this unit's evidence alone — (6)
                    severity medium, dimension D4 (not D1): pass — tests (4) and (5) both fail/n/a,
                    so classification is major.
effort:            4
dedup:             DEBT-05 — this is the phase's designated DEBT-05 evidence record; Phase 66
                    re-triages it, not re-derives it. #410 and #231 also checked explicitly and
                    dismissed as unrelated to LSP4IJ API coupling.
disposition:       major-refactor
```

```
id:                P63-D4-011
unit:              RU-63-05
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjStatusBarWidget.java,bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropStatusBarWidget.java,bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjStatusBarWidgetFactory.java,bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropStatusBarWidgetFactory.java
dimension:         D4
secondary:         []
severity:          low
evidence_tier:     trace
evidence:          Mechanical structural comparison, per the plan's required method:
                    `git diff --no-index --numstat BbjStatusBarWidget.java
                    BbjJavaInteropStatusBarWidget.java` -> `25  41` (25 of 167 lines removed, 41 of
                    151 added — roughly 85%/73% of each file's structure shared: the panel/
                    iconLabel/textLabel construction, the MouseAdapter/showPopupMenu wiring, the
                    messageBusConnection subscribe/disconnect lifecycle, and the identical
                    updateVisibility() method body appear near-verbatim in both, differing only in
                    the subscribed Topic, the status-enum switch's icon/text mapping, and the popup
                    menu's item labels). `git diff --no-index --numstat
                    BbjStatusBarWidgetFactory.java BbjJavaInteropStatusBarWidgetFactory.java` ->
                    `5  5` (5 of 43 lines differing in each — the id string, display name, and
                    constructed widget type only; isAvailable(), disposeWidget(), and
                    canBeEnabledOn() are byte-for-byte identical). No shared abstract base class or
                    helper exists for either pair anywhere in the ui/ package.
failure_scenario:  n/a (D4 is a code-shape finding) — any future change to the shared widget shape
                    (the popup-menu wiring pattern, the visibility-by-file-extension check whose
                    own staleness bug is P63-D2-011, or the StatusBarWidgetFactory boilerplate)
                    must be hand-applied to both members of each pair, with drift risk between them
                    — exactly the mechanism by which P63-D2-011's visibility-staleness bug is
                    present identically in both widgets today.
classification:    major
                    (1) touches 1 file: FAIL — extracting a shared base spans at least 4 files —
                    (2) no public API/grammar/LSP change: pass — (3) no new dependency: pass — (4)
                    regression-testable with existing harness: FAIL — no src/test/ source set
                    exists (P63-D5-001) — (5) reviewer can name the exact edit (extract a shared
                    base class/factory parameterized by Topic type, icon/text mapping function, and
                    popup-menu item list): pass — (6) severity low, dimension D4 (not D1): pass —
                    tests (1) and (4) both fail, so classification is major.
effort:            4
dedup:             none — #410 and #231 checked explicitly and dismissed. No frozen open issue
                    names status-bar widget/factory duplication.
disposition:       major-refactor
```

```
id:                P63-D8-006
unit:              RU-63-05
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerLogToolWindowFactory.java:14-17,20-41
dimension:         D8
secondary:         [D2]
severity:          low
evidence_tier:     trace
evidence:          The class Javadoc states, verbatim: "Tool window factory for the BBj Language
                    Server log output. Creates a console view that displays real-time server
                    stdout/stderr." (:14-17). createToolWindowContent() (:20-41) creates a fresh,
                    empty ConsoleView via TextConsoleBuilderFactory (:23-25) that is never attached
                    to the spawned Node.js process's own Process/OutputStream/InputStream in any
                    way — it is registered with BbjServerService.setConsoleView(console) (:34), and
                    the only writer to it anywhere in this unit's 13 files is
                    BbjServerService.logToConsole() (BbjServerService.java:64-68), called
                    exclusively with curated status-transition strings ("Server status: ...",
                    "Auto-restarting...", "Language server crashed twice...", "Project closing")
                    from BbjServerService/BbjLanguageClient — never with the raw bytes the
                    `node main.cjs --stdio` process itself writes to its OS-level stdout or stderr
                    streams (confirmed by grep: no Process/OutputStream/InputStream/ProcessListener
                    reference anywhere in this file or in BbjLanguageServer.java, whose
                    OSProcessStreamConnectionProvider superclass owns that process's actual I/O
                    streams for the LSP protocol itself, not for display).
failure_scenario:  A developer who opens this tool window expecting to see the language server's
                    own diagnostic stdout/stderr output — the exact promise the class doc and the
                    window's own initial message ("BBj Language Server log initialized") make —
                    sees only the small set of status-transition strings this unit's code happens
                    to log, never the server process's own console output, reducing the window's
                    diagnostic value below what its documentation promises.
classification:    easy
                    (1) touches 1 file: pass — (2) no public API/grammar/LSP change: pass — (3) no
                    new dependency: pass — (4) regression-testable with existing harness: satisfied
                    vacuously per D-09 — a Javadoc correction changes no runtime behaviour — (5)
                    reviewer can name the exact edit (correct the Javadoc to describe what the
                    window actually shows, or — as a behaviour-changing alternative outside this
                    record's easy-fix scope — wire the process's actual stdout/stderr into the
                    console): pass — (6) severity low, dimension D8 (not D1): pass — all six tests
                    pass under the doc-only reading, so classification is easy.
effort:            1
dedup:             none — #410/#231 checked and dismissed. No frozen open issue names this
                    doc/behaviour gap.
disposition:       easy-fix
```

```
id:                P63-D8-007
unit:              RU-63-05
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java:24-28
dimension:         D8
secondary:         [D2]
severity:          low
evidence_tier:     trace
evidence:          Cross-references P63-D2-013's own evidence rather than restating it: the class
                    Javadoc (:24-28) lists "debounced restart scheduling" among this class's stated
                    responsibilities, but P63-D2-013 establishes that scheduleRestart() — the only
                    debounced-restart entry point this class defines — has zero callers anywhere in
                    the codebase; every actual restart trigger bypasses it entirely.
failure_scenario:  A reader of this class's own doc reasonably assumes rapid repeated restart
                    triggers are already deduplicated somewhere in this class, when in fact — per
                    P63-D2-013 — none of the six real trigger paths goes through that debouncing at
                    all.
classification:    easy
                    (1) touches 1 file: pass — (2) no public API/grammar/LSP change: pass — (3) no
                    new dependency: pass — (4) regression-testable with existing harness: satisfied
                    vacuously per D-09 — a Javadoc correction alone changes no runtime behaviour —
                    (5) reviewer can name the exact edit (remove the "debounced restart scheduling"
                    claim from the class doc, or — as the behaviour-changing alternative
                    P63-D2-013 itself names — wire scheduleRestart() into the real call sites,
                    satisfying the doc as written): pass — (6) severity low, dimension D8 (not D1):
                    pass — all six tests pass under the doc-only reading, so classification is
                    easy.
effort:            1
dedup:             none — #410/#231 checked and dismissed. No frozen open issue names this
                    doc/behaviour gap.
disposition:       easy-fix
```

### Not-reproducible dispositions

None. This unit's sweep raised no candidate claim that failed to clear its evidence tier — every
check that surfaced a concrete defect is recorded above as a finding, the mechanism-side referral
cross-reference (`P63-D7-003`) was settled with concrete code evidence (`BbjComposerServer.java`'s
own `@JsonRequest` precedent) rather than left open, and every other check that found no defect
(socket closure, listener removal, threading discipline, log-window growth, per-item completion
cost) is stated as a pass in the `### Cells` narrative above — stated explicitly per the per-unit
stopping rule's empty-subblock register, rather than omitted.

### Cross-unit referrals

None. `RU-63-05` owns zero inherited Phase 62 referrals — confirmed by the Inherited referral
ledger above, where no row names `RU-63-05` as a "To unit" — so this unit has no
`### Inherited referral triage` sub-block, a fact stated explicitly here rather than left as
silence. This unit's own sweep raised no new candidate whose defect belongs to another unit's file
list either: the mechanism-side note on `BbjServerService.restart()` answers `RU-63-01`'s own
outbound referral (recorded under that unit's `### Cross-unit referrals`) by cross-reference within
this unit's own D7 cell above, rather than requiring a new referral row here — stated explicitly per
the per-unit stopping rule's empty-subblock register, rather than omitted.

### Unit closure

`RU-63-05` is closed against the four-part stopping rule (D-06): **(i)** all 7 live cells (D1, D2,
D3, D4, D5, D7, D8) carry a `fail` verdict plus a written check line above — every dimension
surfaced at least one concrete finding or, for D5, the cross-referenced systemic absence plus this
unit's own consequence, and D7 the cross-referenced mechanism-side evidence for `P63-D7-003`; the D6
cell still carries INVENTORY's `R-D6-CENTRAL` text verbatim, untouched; **(ii)** all thirteen files
are named at least once inside this section — `BbjCompletionFeature.java` (D1/D3/D4/D5/D8 cells),
`BbjLanguageClient.java` (D1/D4/D8 cells), `BbjLanguageServerFactory.java` (D1/D4/D8 cells,
`plugin.xml` registration check), `BbjLanguageServer.java` (D1/D4/D7/D8 cells, `P63-D1-007`'s
`location:`), `BbjJavaInteropService.java` (D1-D5/D8 cells, most findings' `location:`),
`BbjJavaInteropStatusBarWidgetFactory.java` (D4 cell, `P63-D4-011`), `BbjJavaInteropStatusBarWidget.java`
(D1-D4 cells, `P63-D2-011`, `P63-D4-011`), `BbjRestartServerAction.java` (D2 cell), `BbjServerCrashNotificationProvider.java`
(D2 cell, `P63-D2-013`'s `location:`), `BbjServerLogToolWindowFactory.java` (D1/D3/D8 cells,
`P63-D8-006`'s `location:`), `BbjServerService.java` (D1-D5/D7/D8 cells, most findings' `location:`),
`BbjStatusBarWidgetFactory.java` (D4 cell, `P63-D4-011`), `BbjStatusBarWidget.java` (D1-D4 cells,
`P63-D2-011`, `P63-D2-013`, `P63-D4-011`); **(iii)** every candidate claim raised during either task
is either one of the 11 finding records above (`P63-D1-007`/`008`, `P63-D2-011` through `P63-D2-014`,
`P63-D3-005`, `P63-D4-010`/`011`, `P63-D8-006`/`007`) or the single explicit
`### Not-reproducible dispositions` empty statement — none was silently dropped; **and (iv)**
`RU-63-05` owns zero inherited Phase 62 referrals — confirmed by the Inherited referral ledger,
where no row names `RU-63-05` as a "To unit" — stated explicitly rather than left as silence, and
`RU-63-01`'s own outbound referral to this unit (routing `BbjServerService.restart()`'s mechanism
side) is answered by cross-reference within the D7 cell above rather than left pending.

**Scope-fidelity note.** All thirteen files in this unit were swept across all 7 live dimensions,
even though ROADMAP's Phase 63 success **criterion 1** names only "LSP wiring" and "status bar
widgets" from this unit — the Applicability Grid, not the ROADMAP criteria, is the contract, and
the criteria are a deliberately named subset of it (D-16); the extra coverage here —
`BbjServerCrashNotificationProvider.java` and `BbjServerLogToolWindowFactory.java` — is recorded as
deliberate, not scope creep.

## RU-63-02 — Language registration, editor support & notifications

**Files (18 / 888 LOC):**
- `com/basis/bbj/intellij/BbjColorSettingsPage.java` (157)
- `com/basis/bbj/intellij/BbjCommenter.java` (36)
- `com/basis/bbj/intellij/BbjFile.java` (21)
- `com/basis/bbj/intellij/BbjFileType.java` (36)
- `com/basis/bbj/intellij/BbjIcons.java` (19)
- `com/basis/bbj/intellij/BbjJavaInteropNotificationProvider.java` (57)
- `com/basis/bbj/intellij/BbjLanguageCodeStyleSettingsProvider.java` (31)
- `com/basis/bbj/intellij/BbjLanguage.java` (11)
- `com/basis/bbj/intellij/BbjMissingHomeNotificationProvider.java` (55)
- `com/basis/bbj/intellij/BbjMissingNodeNotificationProvider.java` (76)
- `com/basis/bbj/intellij/BbjPairedBraceMatcher.java` (39)
- `com/basis/bbj/intellij/BbjParserDefinition.java` (79)
- `com/basis/bbj/intellij/BbjPsiElement.java` (15)
- `com/basis/bbj/intellij/BbjSpellcheckingStrategy.java` (16)
- `com/basis/bbj/intellij/BbjTextMateBundleProvider.java` (49)
- `com/basis/bbj/intellij/BbjTokenTypes.java` (23)
- `com/basis/bbj/intellij/BbjWelcomeNotification.java` (63)
- `com/basis/bbj/intellij/BbjWordLexer.java` (105)

**Risk rank:** 5 of 5 Phase 63 units — file-type/language registration, PSI/parser plumbing, and passive notification providers; the lowest-churn, most declarative unit in the phase.
**Sweep method:** full read, in three sub-clusters (registration & file type / PSI, lexer & editor plumbing / notification providers & presentation).
**Owning plan:** 63-05 (also closes the phase).

### Cells
- D1 Security — pass — Checked all 18 files across the three sub-clusters for injection, untrusted-input, secret-exposure, integrity-gap and trust-boundary defects, matching this unit's largely declarative shape (INVENTORY's own framing): `BbjTextMateBundleProvider.java:27-48`'s `getBundles()` reads its five `BUNDLE_FILES` (`:17-23`) exclusively from this plugin's own bundled classloader resources (`getClass().getClassLoader().getResource(...)`), never from a workspace-committed or user-supplied path, and writes them to a freshly `Files.createTempDirectory`-allocated directory (`:29-30`) — no attacker-controlled filename, no path-traversal surface, no destination collision (see the D3 cell below for this same method's redundant-copy and leak concerns, which are correctness/performance, not security); checked all four notification providers (`BbjJavaInteropNotificationProvider.java`, `BbjMissingHomeNotificationProvider.java`, `BbjMissingNodeNotificationProvider.java`, `BbjWelcomeNotification.java`) line by line for any settings value, detected path, or server message interpolated into displayed text or into an offered action — none exists: every `panel.setText(...)`/`Notification(...)` call uses a hardcoded literal string, and every offered action either opens the plugin's own Settings dialog (`ShowSettingsUtil.showSettingsDialog(project, BbjSettingsConfigurable.class)`) or browses a fixed literal URL (`BrowserUtil.browse("https://nodejs.org/")`, `BbjMissingNodeNotificationProvider.java:72`) — no externally-sourced string ever reaches a notification's text or its action target; `BbjColorSettingsPage.java`'s demo text (`:96-121`) is a hardcoded literal, not externally sourced. Checked whether `BbjWordLexer.java`/`BbjParserDefinition.java` can be driven into unbounded work or a crash by hostile document content — a real trust boundary, since any opened file reaches them: `BbjWordLexer.advance()` (`:56-94`) is a single forward-only linear scan with no backtracking, no recursion and no unbounded lookahead — every branch (whitespace run, word run, single-char punctuation) advances `tokenEnd` monotonically and terminates at `bufferEnd`, so no crafted input can force quadratic or unbounded work; `BbjParserDefinition`'s parser (`:38-48`) is a flat `while (!builder.eof()) builder.advanceLexer();` loop with one root marker — no recursive descent, so no stack-depth-driven crash is possible regardless of input shape. No runnable reproduction accompanies this record beyond the trace above (D-07 — the Gradle build cannot run in this environment).
- D2 Correctness & error handling — fail — Checked whether `BbjFileType.java`/`BbjLanguage.java`/`BbjFile.java` agree on one language instance and one extension set: all three route through the single `BbjLanguage.INSTANCE` singleton (`BbjLanguage.java:6`, private constructor, no second instantiation path anywhere in the 18 files), and the extension set is declared exactly once, in `plugin.xml`'s `<fileType extensions="bbj;bbjt;src;bbx"/>` (read as context, D-16) — no divergence. Checked `BbjParserDefinition.java`'s element-type and whitespace/comment token-set declarations against `BbjTokenTypes.java`: `getCommentTokens()`/`getStringLiteralElements()` (`:55-63`) both return `TokenSet.EMPTY`, internally consistent with `BbjTokenTypes.java` declaring no `COMMENT`/`STRING` `IElementType` at all — not a mismatch by itself, but the *cause* of the finding below, since `BbjWordLexer.java` never emits a distinguishing token for either construct. Checked `BbjPairedBraceMatcher.java`'s pair table and `isPairedBracesAllowedBeforeType` at end-of-file: the three pairs (`:16-20`) are well-formed and `isPairedBracesAllowedBeforeType` (`:27-32`) unconditionally returns `true` — safe at EOF (an unmatched bracket simply has no highlighted partner, standard platform behaviour) but, combined with the missing string-literal token set, the same unconditional `true` is what lets a bracket inside a string literal be treated as structural (**`P63-D2-015`**). Checked each notification provider's behaviour when its reported condition flips while showing, and whether any can be produced repeatedly for the same editor: all four are stateless `EditorNotificationProvider`/`StartupActivity` implementations with no cached prior-result field, so the platform's own `EditorNotifications` re-invocation on every refresh naturally reflects the current condition — no stale-banner or duplicate-banner defect found. Checked `BbjTextMateBundleProvider.java`'s behaviour on a missing, unreadable or already-present bundle file: a missing classloader resource throws `Objects.requireNonNull`'s `NullPointerException` with an explicit "Missing TextMate bundle resource: ..." message (`:35-36`) rather than failing silently; an "already present at destination" collision cannot occur in practice, since `bundleDir` (`:29-30`) is a freshly allocated, uniquely named temp directory on every call, never a fixed reused path (see `P63-D3-006` for the cost of that same freshness). Checked `BbjCommenter.java`'s line/block comment prefixes against BBj's actual comment syntax: `getLineCommentPrefix()` (`:9-11`) returns the fixed literal `"REM "`, but `bbj-vscode/src/language/bbj.langium:923`'s own `terminal COMMENT` is explicitly case-insensitive (`/([rR][eE][mM])(?!...)/`) — a lowercase or mixed-case `rem` line is valid BBj source but is not recognised as already-commented by IntelliJ's literal-prefix toggle logic (**`P63-D2-016`**). No runnable reproduction accompanies either record beyond the trace above (D-07). 2 findings recorded: P63-D2-015, P63-D2-016.
- D3 Performance & resource use — fail — Checked `BbjWordLexer.java`'s per-keystroke cost, since it sits on the editor's re-lex path: `advance()` (`:56-94`) performs no allocation of its own per call (every returned `IElementType` is a pre-existing static final constant from `BbjTokenTypes`/`TokenType`) and is a single forward linear scan with no rescanning — pass on this specific check. Checked whether `BbjColorSettingsPage.java` rebuilds its attribute-descriptor array per call: `DESCRIPTORS` (`:56-66`) is a `private static final` array built once at class-load, not per-invocation — pass. Checked whether `BbjSpellcheckingStrategy.java` adds per-token cost: `getBundledDictionaries()` (`:12-15`) returns a static one-element array read once by the platform's spellchecker registry at startup, not invoked per token — pass. Checked whether the four notification providers do filesystem or settings work per editor-notification pass, since this framework runs often (every file/editor open and every `EditorNotifications.updateAllNotifications()` refresh): `BbjMissingHomeNotificationProvider.java`'s `BbjHomeDetector.isValidBbjHome()`/`detectBbjHome()` calls (`:33-43`) do a small, bounded number of `File.exists()`-class stats per pass — a low-cost inefficiency, not separately promoted; **`BbjMissingNodeNotificationProvider.java`'s `collectNotificationData` (`:28-59`) is materially worse** — on every pass where `nodeJsPath` is configured (the common case) or during PATH auto-detection, it calls `BbjNodeDetector.getNodeVersion(...)` (`:42`, `:50`), which spawns a real `node --version` child process via `GeneralCommandLine`/`ExecUtil.execAndReadLine` — with zero caching of the result across passes (**`P63-D3-007`**). Checked whether `BbjTextMateBundleProvider.java`'s copy work runs once or on every startup: `getBundles()` (`:27-48`) allocates a brand-new `Files.createTempDirectory` (`:29-30`) and re-copies all five `BUNDLE_FILES` on **every** invocation, with no check for an existing valid copy and no cleanup of the directory it created on a prior call (**`P63-D3-006`**). No runnable reproduction accompanies either record beyond the trace above (D-07). 2 findings recorded: P63-D3-006, P63-D3-007.
- D4 Maintainability & code smells — pending
- D5 Test coverage gaps — pending
- D6 Dependency health — n/a — "No distinct third-party dependency of its own; dependency-tree health (npm and Gradle) is assessed once, exhaustively, at `RU-64-02`, and vendored-binary provenance at `RU-64-03`. Repeating the audit per unit would restate the same npm/Gradle audit under a different heading, not surface a new finding."
- D7 Cross-IDE parity — fail — **The direction is reversed relative to Phase 62: this phase owns the IntelliJ rows and reads `bbj-vscode/` as reference material only (D-05).** Compared the file-extension/language-ID/grammar registration set: `plugin.xml`'s `<fileType extensions="bbj;bbjt;src;bbx"/>` (read as context, D-16) matches VS Code's own `bbj-vscode/package.json` `"bbj"` language `extensions` (`[".bbj",".bbjt",".src",".bbx"]`, per `RU-62-05`'s own established D7 record) exactly, four-for-four — no divergence; both sides deliberately omit `.bbl` from this true-source-language extension list, consistent with `bbj-vscode/src/language/bbj-ws-manager.ts:189`'s own comment ("`.bbl` excluded — library files are not user-editable source (#369)") and with the fact that every `.bbl` file in this tree (`bbj-vscode/src/language/lib/*.bbl`) is a synthetic builtin-catalog document, not user-authored BBj source. **One internal-to-IntelliJ split, not a VS Code-comparison gap:** IntelliJ's own hand-authored TextMate bundle manifest (`bbj-intellij/src/main/resources/textmate/bbj-bundle/package.json`, read as D7 comparison material per D-05) *does* list `.bbl` in its `"BBj"` language `extensions`, but that manifest governs only the TextMate highlighter, not the `<fileType>`/LSP4IJ registration that actually attaches language-server features (`plugin.xml:128-133`, `:243-245`) — the two manifests disagree with each other about `.bbl` inside the same plugin; this drives referral #6's disposition below rather than a `P63-D7-*` finding, since confirming its user-visible consequence needs a running IDE. Compared comment/brace-matching/code-style behaviour against `bbj-vscode/bbj-language-configuration.json`: brackets (`(){}`/`[]`) match on both sides; **VS Code's own `onEnterRules`/`autoClosingPairs` (`:41-54`,`:78-99`) explicitly handle both `"REM /**"` and `"rem /**"`, with every `beforeText` regex written `[Rr][Ee][Mm]` — VS Code demonstrably gets BBj's case-insensitive REM comment right where IntelliJ's `BbjCommenter.java` does not**, so `P63-D2-016` (above) carries `secondary: [D7]` rather than being restated here. Compared the editor-command surface for the four features cross-referenced from `RU-62-02`'s own D7 cell (`62-COVERAGE.md`): re-verified live rather than trusting the inherited text — `grep -rliE 'denumber|decompile|tokenized|isLineNumbered|bbjlst' bbj-intellij/src/main/java/` returns no matches, and `BbjLanguageCodeStyleSettingsProvider.java` (`:20-25`) only customises reformat *defaults*, never invoking a `BBjCFCli.jar`-equivalent — all four confirmed absent, promoted as **one** finding for the categorical gap (**`P63-D7-006`**), disposed under referral #7 below. 1 finding recorded: P63-D7-006.
- D8 Comment & doc accuracy — pending

### Inherited referral triage

- **Referral #6** (`RU-62-05` → `RU-63-02`, ledger row 6) — whether IntelliJ's built-in TextMate bundle importer actually *honors* the `filenames` field for the `"BBx Config"` language (vs. falling back to extension-only matching), and whether IntelliJ's own LSP4IJ file-type/language registration independently covers `.bbl` the way its TextMate bundle's `extensions` list already does. **Part 2 (the `.bbl` question) is answerable via trace, and now is**: `plugin.xml`'s `<fileType name="BBj" ... extensions="bbj;bbjt;src;bbx"/>` (`:128-133`) — the registration LSP4IJ's own `<languageMapping language="BBj" serverId="bbjLanguageServer" languageId="bbj"/>` (`:243-245`) depends on — does **not** list `.bbl`, so LSP4IJ's language-server attachment does not independently cover `.bbl`; only the TextMate bundle's own hand-authored `package.json` (`bbj-intellij/src/main/resources/textmate/bbj-bundle/package.json:7`) lists it, for syntax highlighting only. This is consistent, not a gap: `bbj-vscode/src/language/bbj-ws-manager.ts:189`'s comment establishes `.bbl` files are deliberately excluded from BBj-source treatment on the VS Code side too (#369) — every `.bbl` file in this tree is a synthetic builtin-catalog document (`bbj-vscode/src/language/lib/*.bbl`), not user-authored source a developer would knowingly open expecting LSP features. **Part 1 (does the TextMate importer honor `filenames`) cannot be confirmed without launching the IDE** — the same deferred-infrastructure limit `RU-62-05` itself hit — and Part 2's practical consequence (does a `.bbl` file opened in IntelliJ actually render via the TextMate bundle's own independently-declared extension path, given no other `<fileType>` claims it) is likewise a runtime question this static-trace sweep cannot settle. **Disposition: not-reproducible** — see `### Not-reproducible dispositions` below for the reason; the confirmable half (Part 2's `plugin.xml` fact) is recorded here as established context, not as a promoted finding, since it establishes consistency rather than a defect.
- **Referral #7** (`RU-62-02` → `RU-63-02`, ledger row 7) — none of format-document / denumber / tokenized-detection / decompile has any IntelliJ counterpart. Re-enumerated all four independently rather than trusting the inherited text (see the D7 cell above for the live re-grep): **format document** — `BbjLanguageCodeStyleSettingsProvider.java:20-25` only customises reformat *defaults* (REM-at-column-0), never invoking a `BBjCFCli.jar`-equivalent or spawning any process; **denumber/line-numbered detection** — no `denumber`/`lineNumber` match anywhere in this unit's 18 files; **tokenized-BBj detection** — no `tokenized`/`<<bbj>>` match anywhere; **decompile** — no `decompile`/`bbjlst` match anywhere. Open issue **#65** ("support tokenized BBj files") is checked by number as the tokenized-detection neighbour, exactly as `RU-62-02`'s own referral text frames it — #65 is already implemented on the VS Code side (`tokenized-bbj.ts`, per `RU-62-02`'s own D7 cell) and remains open only for this IntelliJ-side remainder. One finding allocated for the categorical absence across all four features, not one per feature. **Disposition: promoted — `P63-D7-006`**, with `dedup:` naming #65 explicitly as a partial-overlap covering only the tokenized-detection quarter of the four.

### Findings

```
id:                P63-D2-015
unit:              RU-63-02
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjWordLexer.java:81-93,BbjParserDefinition.java:60-63,BbjPairedBraceMatcher.java:16-20
dimension:         D2
secondary:         []
severity:          medium
evidence_tier:     repro
evidence:          Line-by-line trace (D-07 — no runnable reproduction accompanies this record; a
                    live keystroke-driven bracket-highlight harness is out of this static-trace
                    sweep's scope): BbjWordLexer.advance()'s punctuation branch (:81-93) tokenizes
                    '(' / ')' / '[' / ']' / '{' / '}' as BbjTokenTypes.LPAREN/RPAREN/LBRACKET/
                    RBRACKET/LBRACE/RBRACE unconditionally by character alone, with no notion of
                    string-literal context anywhere in the class — a '"' character falls through to
                    the SYMBOL default (:91) with no state change. BbjParserDefinition.
                    getStringLiteralElements() (:60-63) returns TokenSet.EMPTY, confirming no PSI
                    layer distinguishes string content either. BbjPairedBraceMatcher's
                    isPairedBracesAllowedBeforeType (:27-32) unconditionally returns true, with no
                    guard consulting any string-literal token set (there is none to consult).
failure_scenario:  A BBj line such as PRINT "value (not a bracket)" — a plain string literal
                    containing parenthesis characters — has its two parens tokenized identically to
                    real structural brackets by BbjWordLexer, so IntelliJ's bracket-matching
                    highlight, Ctrl+Shift+M navigation, and auto-close-bracket behavior all treat
                    them as a genuine matched pair inside the string, rather than inert string
                    content. Any BBj source containing a bracket character inside a string literal
                    (common in user-facing message text) triggers this.
classification:    major
                    (1) touches 1 file: FAIL — a real fix needs a STRING_LITERAL IElementType in
                    BbjTokenTypes.java, emission of it from BbjWordLexer.java's quote-scanning logic,
                    registration in BbjParserDefinition.getStringLiteralElements(), and a context
                    guard in BbjPairedBraceMatcher's isPairedBracesAllowedBeforeType — four files —
                    (2) no public API/grammar/LSP change: pass (internal to the IntelliJ plugin only)
                    — (3) no new dependency: pass — (4) regression-testable with existing harness:
                    FAIL — no src/test/ source set exists in bbj-intellij (P63-D5-001) — (5) reviewer
                    can name the exact edit (add a quote-delimited scan branch to BbjWordLexer.
                    advance(), emit a new STRING IElementType, wire it into
                    getStringLiteralElements(), and guard isPairedBracesAllowedBeforeType against it):
                    pass — (6) severity medium and dimension D2 (not D1): pass — two tests fail, so
                    classification is major.
effort:            8
dedup:             none — #65 (tokenized BBj files), #381 (config.bbx highlighting) and #476
                    (starter programs) are this unit's named plausible neighbours; none addresses
                    bracket-matching inside string literals. No other frozen open issue is closer.
disposition:       major-refactor
```

```
id:                P63-D2-016
unit:              RU-63-02
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjCommenter.java:9-11
dimension:         D2
secondary:         [D7]
severity:          medium
evidence_tier:     repro
evidence:          Line-by-line trace (D-07 — no runnable reproduction; a live Ctrl+/-toggle harness
                    is out of this static-trace sweep's scope): BbjCommenter.getLineCommentPrefix()
                    (:9-11) returns the fixed literal "REM " (uppercase, one trailing space).
                    bbj-vscode/src/language/bbj.langium:923's terminal COMMENT is explicitly
                    case-insensitive: /([rR][eE][mM])(?![\w!$%@])([ \t][^\n\r]*)?([\n\r]+)?/ — any
                    case combination of "rem" is a valid BBj comment marker. IntelliJ's platform
                    toggle-line-comment action detects an "already commented" line by a literal
                    prefix match against Commenter.getLineCommentPrefix()'s return value; no override
                    anywhere in this 37-line file normalizes case before that comparison, and
                    BbjParserDefinition.getCommentTokens() (:56-58) returns TokenSet.EMPTY, confirming
                    there is no PSI-level comment token either that could let the platform's
                    PSI-aware commenting path bypass the raw-text check.
failure_scenario:  A BBj source line beginning with lowercase or mixed-case "rem " (grammar-valid per
                    bbj.langium:923, and BBj is case-insensitive per CLAUDE.md) is not recognized as
                    already-commented when the user presses Ctrl+/ (Cmd+/) — IntelliJ inserts a
                    second "REM " prefix instead of removing the existing one, producing
                    "REM rem <original text>" rather than toggling the comment off.
classification:    major
                    (1) touches 1 file: pass (confined to BbjCommenter.java, though the deeper fix may
                    need a case-insensitive-aware Commenter implementation) — (2) no public
                    API/grammar/LSP change: pass — (3) no new dependency: pass — (4)
                    regression-testable with existing harness: FAIL — no src/test/ source set exists
                    (P63-D5-001) — (5) reviewer can name the exact edit (BbjCommenter.java:9-11 is the
                    exact site; the fix direction is to make REM recognition case-insensitive,
                    either via a lexer-level COMMENT token so the platform's PSI-aware commenting path
                    applies instead of raw-text matching, or a custom case-insensitive commenter):
                    pass — (6) severity medium, dimension D2 (not D1): pass — test (4) fails, so
                    classification is major.
effort:            4
dedup:             none — #65, #381 and #476 (this unit's named neighbours) are unrelated; no frozen
                    open issue names IntelliJ comment-toggle case sensitivity.
disposition:       major-refactor
```

```
id:                P63-D3-006
unit:              RU-63-02
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjTextMateBundleProvider.java:27-48
dimension:         D3
secondary:         [D2]
severity:          low
evidence_tier:     repro
evidence:          Line-by-line trace (D-07 — no runnable reproduction; observing this across
                    multiple real IDE restarts is out of this static-trace sweep's scope):
                    getBundles() (:27-48) calls Files.createTempDirectory(Path.of(PathManager.
                    getTempPath()), "textmate-bbj") (:29-30) — a freshly, uniquely named directory —
                    on every invocation, then re-copies all five BUNDLE_FILES (:17-23) into it from
                    this plugin's own bundled resources, with no check for a prior valid copy and no
                    caching of a stable target path. No call anywhere in this file deletes bundleDir,
                    registers a shutdown hook, or calls File.deleteOnExit() on it or its contents.
failure_scenario:  Every IDE process that loads this plugin's TextMate bundle (at minimum once per
                    IDE launch, given the bundleProvider extension point is application-scoped)
                    allocates a new "textmate-bbjXXXXXXXX"-named temp directory and re-copies five
                    small files into it, and never removes the directory created by any prior launch
                    — repeated launches accumulate abandoned directories in the plugin's temp path
                    with no cleanup path in this code.
classification:    major
                    (1) touches 1 file: pass — (2) no public API/grammar/LSP change: pass — (3) no
                    new dependency: pass — (4) regression-testable with existing harness: FAIL — no
                    src/test/ source set exists (P63-D5-001) — (5) reviewer can name the exact edit
                    (cache bundleDir in a stable location, mirroring RU-63-03's own
                    getNodeDataDirectory() pattern, and skip the copy loop when a valid prior copy is
                    already present): pass — (6) severity low, dimension D3 (not D1): pass — test (4)
                    fails, so classification is major.
effort:            4
dedup:             none — #65, #381 and #476 are unrelated; no frozen open issue names this
                    temp-directory accumulation.
disposition:       major-refactor
```

```
id:                P63-D3-007
unit:              RU-63-02
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjMissingNodeNotificationProvider.java:28-59
dimension:         D3
secondary:         []
severity:          medium
evidence_tier:     repro
evidence:          Line-by-line trace (D-07 — no runnable reproduction; a live per-editor-pass
                    process-spawn count is out of this static-trace sweep's scope):
                    collectNotificationData (:28-59) is invoked by the platform's
                    EditorNotificationProvider framework on every file/editor open and every
                    EditorNotifications.updateAllNotifications() refresh. When nodeJsPath is
                    explicitly configured (:39-44) or during PATH auto-detection (:46-52), both
                    branches call BbjNodeDetector.getNodeVersion(...) (:42, :50), which constructs a
                    GeneralCommandLine(nodePath, "--version") and blocks on
                    ExecUtil.execAndReadLine(cmd) — a real child-process spawn — with no field, cache,
                    or debounce anywhere in this class remembering the last result across calls.
failure_scenario:  For any user with a configured or auto-detectable Node.js path (the common case),
                    every editor-notification refresh pass — not just the first per session — spawns
                    a fresh "node --version" child process and blocks on its output before the banner
                    can be suppressed or shown, redundant work on a path that runs far more often than
                    a one-time startup check.
classification:    major
                    (1) touches 1 file: pass (a cache field in this class, keyed by path, is
                    sufficient) — (2) no public API/grammar/LSP change: pass — (3) no new dependency:
                    pass — (4) regression-testable with existing harness: FAIL — no src/test/ source
                    set exists (P63-D5-001) — (5) reviewer can name the exact edit (cache the last
                    known-good version result per path, invalidated on settings change): pass — (6)
                    severity medium, dimension D3 (not D1): pass — test (4) fails, so classification
                    is major.
effort:            4
dedup:             none — #65, #381 and #476 are unrelated; no frozen open issue names redundant
                    Node.js version-check spawning.
disposition:       major-refactor
```

```
id:                P63-D7-006
unit:              RU-63-02
location:          bbj-intellij/src/main/java/com/basis/bbj/intellij/
dimension:         D7
secondary:         []
severity:          low
evidence_tier:     inherited
evidence:          Referral #7 disposition (see Inherited referral triage above): re-enumerated both
                    surfaces live rather than trusting the inherited text. bbj-vscode implements all
                    four features (document-formatter.ts, tokenized-bbj.ts + decompile-io.ts,
                    denumber via extension.ts:572's 'bbj.denumber' command, per RU-62-02's own D7
                    cell). grep -rliE 'denumber|decompile|tokenized|isLineNumbered|bbjlst'
                    bbj-intellij/src/main/java/ returns no matches; BbjLanguageCodeStyleSettingsProvider.
                    java:20-25 (this unit's closest related file) only customizes reformat defaults,
                    never invoking a BBjCFCli.jar-equivalent or spawning any process. All four
                    confirmed absent with no IntelliJ counterpart anywhere in the plugin.
failure_scenario:  n/a in the sense that D7 records a capability gap rather than a runtime failure —
                    IntelliJ users have no menu path to reformat a BBj file via the real
                    BBjCFCli.jar-backed formatter (only cosmetic REM-indent defaults), to detect and
                    denumber a line-numbered program, to detect a tokenized <<bbj>> file on open, or
                    to decompile one — all four workflows exist only in VS Code today.
classification:    major
                    (1) touches 1 file: FAIL — implementing even the smallest of the four requires a
                    new detector/action class plus a plugin.xml registration; the full set touches
                    many more files — (2) no public API/grammar/LSP change: pass (each feature can
                    reuse LS-side/tool-side logic already built for VS Code) — (3) no new dependency:
                    FAIL — a real format-document feature needs the vendored BBjCFCli.jar
                    (RU-64-03's surface) bundled into bbj-intellij, which it does not currently ship —
                    (4) regression-testable with existing harness: FAIL — no src/test/ source set
                    exists (P63-D5-001) — (5) reviewer can name the exact edit: FAIL — only "add four
                    new feature implementations mirroring their VS Code counterparts" is nameable, not
                    a single edit — (6) severity low, dimension D7 (not D1): pass — multiple tests
                    fail, so classification is major.
effort:            8
dedup:             #65 (support tokenized BBj files) partial-overlap — #65 requests exactly the
                    tokenized-detection quarter of this finding's four-feature absence; the VS Code
                    side already implements it (RU-62-02's own D7 cell), so this finding's
                    tokenized-detection component is #65's IntelliJ-side remainder, not a novel
                    request. The format/denumber/decompile components are not covered by #65 or any
                    other frozen open issue. #381 and #476 (this unit's other named neighbours) are
                    unrelated.
disposition:       major-refactor
```

### Not-reproducible dispositions

- **Tier failed: `inherited` (D7).** Candidate claim: whether IntelliJ's built-in TextMate bundle importer actually honors the `"BBx Config"` language's `filenames` field (vs. falling back to extension-only matching, silently reintroducing #381's failure mode on the IntelliJ side despite the manifest declaring the fix — see `RU-62-05`'s own D7 cell), and, relatedly, whether a `.bbl` file opened in IntelliJ picks up TextMate highlighting via the bundle's own independently-declared `extensions` list even though no `<fileType>` claims that extension. **Reason not recorded as a finding:** both questions turn on how the JetBrains TextMate plugin's bundle importer behaves at runtime when it owns a language/extension mapping the platform's own file-type registry does not — confirming either requires launching the IDE and opening a `config.bbx`/`.bbl` file, which is deferred infrastructure not available in this sandbox (the same limit `RU-62-05` itself recorded). The confirmable half — that `plugin.xml`'s `<fileType>` registration omits `.bbl` while the TextMate bundle's own manifest includes it — is stated as established fact in the D7 cell and the referral triage above rather than silently dropped, per RVW-06's drop-vs-disposition rule.

### Cross-unit referrals

pending

## Phase 63 Close-Out

Filled by plan `63-05`. Both the file gate and the cell-total gate are re-run at execution time against the tree and against `.planning/reviews/INVENTORY.md`, not copied from any earlier plan's own numbers (D-17).

### A. File gate (61-file tree enumeration)

pending

### B. Cell-total gate (three-source re-derivation)

pending

### C. Finding accounting

pending

### D. Cross-unit referral accounting (inbound, with disposition column)

pending

### E. Scope-fidelity note

pending

### F. ROADMAP success criteria

pending

### G. Closing confirmations

pending

### Cross-phase observations (VS Code side)

Any plan may append a bullet here — never rewording an earlier one — for a VS Code-side observation surfaced during a D7 read that has no `RU-63-*` finding location available to it (D-05). None recorded yet.

- **`RU-63-05` (plan `63-04`).** `bbj-vscode/src/extension.ts` registers no `onDidChangeState` handler on its `LanguageClient`, creates no status-bar item reflecting language-server connection state or java-interop connection state, and implements no crash-loop detection or auto-restart logic anywhere in the file (confirmed by grep for `onDidChangeState`/`State\.`/`crash`/`restart` — the only matches are `deactivate()`, `extension.ts:832-838`, which calls `client.stop()` on extension shutdown, and the two unrelated `suppressionStatusBar`/`bbjcplStatusBar` items, :778-828, which surface diagnostic-suppression and BBjCPL-availability state, not language-server or java-interop connection health). `RU-63-05`'s own `BbjServerService`/`BbjStatusBarWidget`/`BbjJavaInteropStatusBarWidget`/`BbjServerCrashNotificationProvider`/`BbjRestartServerAction` provide all of these on the IntelliJ side. Not a Phase 63 finding per D-05 — this is a VS Code-side absence, not an IntelliJ-side defect, and Phase 62 (which owns `extension.ts`) is closed; noted here for any future VS Code parity backlog item.
