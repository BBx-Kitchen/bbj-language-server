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
- D4 Maintainability & code smells — pending
- D5 Test coverage gaps — pending
- D6 Dependency health — n/a — "No distinct third-party dependency of its own; dependency-tree health (npm and Gradle) is assessed once, exhaustively, at `RU-64-02`, and vendored-binary provenance at `RU-64-03`. Repeating the audit per unit would restate the same npm/Gradle audit under a different heading, not surface a new finding."
- D7 Cross-IDE parity — fail — Enumerated IntelliJ's action surface from this unit's eleven files against VS Code's command surface (`bbj-vscode/package.json`'s `contributes.commands`, 19 entries, and `extension.ts`'s `registerCommand` calls): `bbj.run`/`bbj.runBUI`/`bbj.runDWC`/`bbj.loginEM` map to `BbjRunGuiAction`/`BbjRunBuiAction`/`BbjRunDwcAction`/`BbjEMLoginAction` respectively, with parity confirmed on the safety-methodology axis Phase 62's `P62-D7-001` already recorded from the VS Code side (`Commands.cjs`'s `run`/`runWeb`/`compile` and `extension.ts`'s EM validate/login all build one shell-interpolated string for `child_process.exec()`; this unit's equivalents uniformly use `GeneralCommandLine.addParameter(...)` with no shell involved — see the D1 cell above for this unit's own confirmation of that same divergence). Three genuine IntelliJ-side gaps against the VS Code surface, each corresponding to one of the three inherited Phase 62 referrals disposed below: **`bbj.compile`** has an IntelliJ action (`BbjCompileAction`) that is registered, visible, and enabled, but its `actionPerformed()` (:24-39) only logs `"[Compile] Triggered for file: " + file.getName()` and never invokes `bbjcpl` — unlike VS Code's real 18-option-aware compile (`Commands.cjs:294-343` via `CompilerOptions.ts`); **`bbj.configureCompileOptions`, `bbj.denumber`, `bbj.decompile`, `bbj.decompileReadonly`, and `bbj.em`** — 5 VS Code commands (enumerated by name from `package.json`; Phase 62's own referral text describes this set as "six," but a direct enumeration of the named commands against `bbj-intellij/src/main/java/`'s full action inventory confirms exactly 5 distinct command IDs with no IntelliJ action counterpart anywhere in the module — noted here as a correction to the inherited referral's own count, not silently adopted) — have no `bbj-intellij` action at all; **`bbj.refreshJavaClasses`** exists on both sides but diverges in mechanism: `BbjRefreshJavaClassesAction.java:22-32`'s `actionPerformed` calls `BbjServerService.getInstance(project).restart()` (:30), which — per `BbjServerService.java:206-211` — stops and restarts the **entire** LSP4IJ-managed language server (`manager.stop(...)`/`manager.start(...)`), taking every language feature (diagnostics, completion, hover, Structure View) offline for the restart's duration, whereas VS Code's `bbj.refreshJavaClasses` (`extension.ts:694-704`) sends a single targeted `bbj/refreshJavaClasses` LSP request (`client.sendRequest(...)`, :700) with no server restart and no interruption to any other language feature. All three are IntelliJ-side absences/divergences, not VS Code-side defects, so per D-05 none is located inside `bbj-vscode/`; each is dispositioned under `### Inherited referral triage` below and promoted to its own `P63-D7-*` finding. 3 findings recorded: P63-D7-001, P63-D7-002, P63-D7-003.
- D8 Comment & doc accuracy — pending

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

### Not-reproducible dispositions

None. This unit's sweep raised no candidate claim that failed to clear its evidence tier — every
check that surfaced a concrete defect is recorded above as a finding, and every inherited referral
reached a definite `promoted` disposition — stated explicitly per the per-unit stopping rule's
empty-subblock register, rather than omitted.

### Cross-unit referrals

- **RU-63-05** — `BbjRefreshJavaClassesAction.java:30`'s `BbjServerService.getInstance(project).restart()` call is the client-side half of referral #3's disposition (`P63-D7-003`, promoted above); `BbjServerService.restart()` itself (`ui/BbjServerService.java:206-211`, a `manager.stop(...)`/`manager.start(...)` pair via `LanguageServerManager`) is the mechanism side and lives in `RU-63-05`'s own file. `RU-63-05`'s sweep (plan `63-04`) should confirm whether LSP4IJ's client API offers any narrower request-response mechanism that could avoid the full stop/start cycle for this specific use, re-triaging the mechanism rather than re-reporting the client-side gap `P63-D7-003` already records.

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
- D1 Security — pending
- D2 Correctness & error handling — pending
- D3 Performance & resource use — pending
- D4 Maintainability & code smells — pending
- D5 Test coverage gaps — pending
- D6 Dependency health — n/a — "No distinct third-party dependency of its own; dependency-tree health (npm and Gradle) is assessed once, exhaustively, at `RU-64-02`, and vendored-binary provenance at `RU-64-03`. Repeating the audit per unit would restate the same npm/Gradle audit under a different heading, not surface a new finding."
- D7 Cross-IDE parity — pending
- D8 Comment & doc accuracy — pending

### Inherited referral triage

pending — see ledger rows 4-5 above (triaged together as one disposition, per D-06).

### Findings

pending

### Not-reproducible dispositions

pending

### Cross-unit referrals

pending

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
- D1 Security — pending
- D2 Correctness & error handling — pending
- D3 Performance & resource use — pending
- D4 Maintainability & code smells — pending
- D5 Test coverage gaps — pending
- D6 Dependency health — n/a — "No distinct third-party dependency of its own; dependency-tree health (npm and Gradle) is assessed once, exhaustively, at `RU-64-02`, and vendored-binary provenance at `RU-64-03`. Repeating the audit per unit would restate the same npm/Gradle audit under a different heading, not surface a new finding."
- D7 Cross-IDE parity — pending
- D8 Comment & doc accuracy — pending

### Findings

pending

### Not-reproducible dispositions

pending

### Cross-unit referrals

pending

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
- D1 Security — pending
- D2 Correctness & error handling — pending
- D3 Performance & resource use — pending
- D4 Maintainability & code smells — pending
- D5 Test coverage gaps — pending
- D6 Dependency health — n/a — "No distinct third-party dependency of its own; dependency-tree health (npm and Gradle) is assessed once, exhaustively, at `RU-64-02`, and vendored-binary provenance at `RU-64-03`. Repeating the audit per unit would restate the same npm/Gradle audit under a different heading, not surface a new finding."
- D7 Cross-IDE parity — pending
- D8 Comment & doc accuracy — pending

### Inherited referral triage

pending — see ledger rows 6-7 above.

### Findings

pending

### Not-reproducible dispositions

pending

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
