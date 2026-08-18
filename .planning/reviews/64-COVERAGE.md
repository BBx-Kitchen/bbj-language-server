# Phase 64 Coverage — build, CI & dependency surface (RVW-05, SEC-07, SEC-08)

**Swept tree:** branch `v4.0-stability-and-quality` at commit `446c53c2ae9fe0533ece792f9acb0bcc54b6a9bb` (D-18) — obtained by running `git rev-parse HEAD` at execution time and recorded **once for the whole phase**, never re-anchored per plan. HEAD advances with every v4.0 planning commit, including the commit that landed these three plans, so plans `64-02` and `64-03` describe this same tree rather than whatever HEAD has become by the time they run.

**Governing standard:** `.planning/reviews/INVENTORY.md` — the single immutable contract for Phases 61-69 (Phase 60 D-09). Not edited by this phase. Where this phase finds INVENTORY's own text contradicted by the tree, the drift is recorded as a D8 finding against INVENTORY (D-08, D-19, D-20), never as an edit to it.

**Dedup source:** INVENTORY's Frozen Open-Issue Snapshot — 15 issues, queried 2026-08-17 via `gh issue list --state open --limit 60`. Phase 69 re-queries the tracker live immediately before filing, so this snapshot is not re-verified live at sweep time. Checked here rather than assumed, by reading the snapshot's own `Area` column and title/summary text: **0 of the 15 carry the repository's `dependencies` area label**, and **0 of the 15 name CI, a workflow, build configuration or a vendored binary**. That is why almost every `dedup:` verdict in this file resolves to `none` — the tracker has no open issue anywhere near this phase's surface, and a `none` here is a derived result rather than a shrug.

**Slice size:** 3 unit rows **plus 5 file-exception rows** = **8 rows × 8 dimensions = 64 cells**, of which **29** are `applies` and **35** are `n/a`. Phase 64 is the only sweep phase besides Phase 61 that owns file-exception rows in a live capacity, and the only one whose slice is not simply "units × 8".

**File gate: 29 files.** 27 of them are the files INVENTORY's own per-unit tables assign to `RU-64-01`, `RU-64-02` and `RU-64-03`. The other **two are documented adoptions**, named here individually rather than folded silently into the count:

1. **`.github/dependabot.yml`** — adopted into `RU-64-01` by **D-19**. It is committed, functional `.github/` CI configuration; `RU-64-01` is the unit that owns `.github/`; and it is this milestone's only dependency-automation config. Leaving it unreviewed in the phase that owns SEC-08 would be exactly the invisible hole the coverage gates exist to prevent. It inherits `RU-64-01`'s row rather than earning a file-exception row of its own, because its applicability is identical to the workflows' — so it moves the file gate and not the cell gate.
2. **`bbj-intellij/gradle/wrapper/gradle-wrapper.jar`** — adopted into `RU-64-02` by **D-20**. It is a 43,583-byte third-party executable that `gradlew:117` puts on the classpath and runs on every build. INVENTORY names the 7-line `gradle-wrapper.properties` beside it but never names the JAR itself. Unlike the `dependabot.yml` adoption it **does** earn a file-exception row, mirroring the three `tools/formatter/` JARs exactly, so it moves **both** gates.

**The principle behind both adoptions, stated once because it governs how every count in this file should be read: the gate follows the scope, not the other way round.** A file count that excludes a real in-scope artifact is simply a wrong count. So the gate moved to fit the surface rather than the surface being trimmed to fit the gate.

**Recording shape:** inherited unchanged from `.planning/reviews/63-COVERAGE.md` (D-05) — Phase 61's D-05 checkpoint froze it, Phase 62 D-03 and Phase 63 D-03 each confirmed it transfers, and **no new format checkpoint is spent** re-approving it a fourth time. The file-exception rendering is inherited from `.planning/reviews/61-COVERAGE.md`, the only prior sweep with live file-exception rows. Phase 64 adds exactly three named subsections beyond the frozen shape, listed by their literal headings because downstream phases consume them by name (D-06): `### Vendored Binary Provenance` under `RU-64-03` (this plan); `### SEC-07 Workflow Security Posture` under `RU-64-01` (plan `64-02`); `### SEC-08 Dependency Triage` under `RU-64-02` (plan `64-03`).

## Applicability Grid — Phase 64 slice

Cells below record applicability exactly as INVENTORY's grid states it (this table does not change as plans execute); the recorded pass/fail verdict for each live dimension lives in the matching unit's own `### Cells` or `### File-exception cells` block further down, so a coverage claim stays adjacent to its evidence rather than being flattened into this summary table. Rows are in D-02's risk-rank order.

| Unit | D1 Security | D2 Correctness | D3 Performance | D4 Maintainability | D5 Test coverage | D6 Dependency health | D7 Cross-IDE parity | D8 Doc accuracy |
|---|---|---|---|---|---|---|---|---|
| `RU-64-03` | applies | applies | applies | applies | applies | applies | n/a — R-D7-CI | applies |
| `RU-64-01` | applies | applies | applies | applies | n/a — R-D5-CI | applies | n/a — R-D7-CI | applies |
| `RU-64-02` | applies | applies | applies | applies | applies | applies | n/a — R-D7-CI | applies |

### File-exception rows

Four rows are transcribed **verbatim from INVENTORY** §"File-exception rows", using its row labels character-for-character so the cell gate below re-derives against the same strings. The fifth is **adopted by D-20 and is not in INVENTORY**; it is flagged as an adoption in the row itself, and its applicability is authored here rather than transcribed, mirroring the three `tools/formatter/` JARs exactly (D-11).

| File | Parent unit | D1 | D2 | D3 | D4 | D5 | D6 | D7 | D8 |
|---|---|---|---|---|---|---|---|---|---|
| `bbj-vscode/package-lock.json` | `RU-64-02` | n/a — R-LOCKFILE | n/a — R-LOCKFILE | n/a — R-LOCKFILE | n/a — R-LOCKFILE | n/a — R-LOCKFILE | applies | n/a — R-LOCKFILE | n/a — R-LOCKFILE |
| `tools/formatter/BBjCFCli.jar` | `RU-64-03` | applies | n/a — R-JAR-BINARY | n/a — R-JAR-BINARY | n/a — R-JAR-BINARY | n/a — R-JAR-BINARY | applies | n/a — R-D7-CI | n/a — R-JAR-BINARY |
| `tools/formatter/lib/BBjCodeFomatter.jar` | `RU-64-03` | applies | n/a — R-JAR-BINARY | n/a — R-JAR-BINARY | n/a — R-JAR-BINARY | n/a — R-JAR-BINARY | applies | n/a — R-D7-CI | n/a — R-JAR-BINARY |
| `tools/formatter/lib/jcommander-1.71.jar` | `RU-64-03` | applies | n/a — R-JAR-BINARY | n/a — R-JAR-BINARY | n/a — R-JAR-BINARY | n/a — R-JAR-BINARY | applies | n/a — R-D7-CI | n/a — R-JAR-BINARY |
| `bbj-intellij/gradle/wrapper/gradle-wrapper.jar` **(ADOPTED — D-20, not in INVENTORY)** | `RU-64-02` | applies | n/a — R-JAR-BINARY | n/a — R-JAR-BINARY | n/a — R-JAR-BINARY | n/a — R-JAR-BINARY | applies | n/a — R-D7-CI | n/a — R-JAR-BINARY |

**Three things make this slice structurally unlike Phase 63's, and each is a distinct way it could silently go wrong:**

1. **Phase 64 is the only sweep phase besides Phase 61 that owns file-exception rows in a live capacity.** All four remaining file-exception rows in INVENTORY belong to Phase 64 units, and D-20 adds a fifth. Phase 63 closed with none at all and noted that adding one would have broken its gate; Phase 64 is the mirror image — **omitting one breaks this gate**, and that is the single most likely way this phase silently under-counts (D-17).
2. **D7 is dead across the entire phase.** All 8 rows carry `n/a — R-D7-CI`. No Phase 64 plan performs cross-IDE parity work of any kind, and no `P64-D7-*` finding ID is ever issued (D-14). A finding that seems to want one belongs to a different dimension or a different unit.
3. **D6 is live in bulk for the first time.** Phase 63 had exactly one live D6 cell. Phase 64 has **eight** — three unit rows plus all five file-exception rows — and between them they carry the whole of SEC-08.

## Cell-Total Gate (D-18.1)

Expected totals for this phase's slice: **29 `applies`, 35 `n/a`, 64 total, across 8 rows**. Re-derived below rather than restated. The derivation has **two parts**, because one of the eight rows is not in INVENTORY at all.

**Part 1 — the seven INVENTORY-sourced rows.** Run at execution time:

```bash
grep -E '^\| .(RU-64-0[1-3]|bbj-vscode/package-lock\.json|tools/formatter/[^|]*). \|' .planning/reviews/INVENTORY.md | grep -E 'applies|n/a' | awk '{a+=gsub(/applies/,"x"); n+=gsub(/n\/a/,"y")} END{print NR, a, n, a+n}'
```

**Output:** `7 27 29 56`

The four printed fields are rows, `applies`, `n/a`, total. **The leading row count is part of the gate: it must be 7, not 3.** A re-derivation that prints `3` has silently dropped the four INVENTORY file-exception rows — the specific failure mode D-17 names.

**Part 2 — D-20's adopted row.** `bbj-intellij/gradle/wrapper/gradle-wrapper.jar` contributes **1 row, 2 `applies` (D1, D6), 6 `n/a`, 8 cells**. This is stated explicitly and is **not derivable from the pipeline above**, because INVENTORY does not name the file. Evidence that its absence is a fact rather than an assumption:

```bash
grep -c 'gradle-wrapper.jar' .planning/reviews/INVENTORY.md
```

**Output:** `0`

**Sum:** 7 + 1 = **8** rows; 27 + 2 = **29** `applies`; 29 + 6 = **35** `n/a`; 56 + 8 = **64** cells. **The phase gate is `8 29 35 64`.** A close-out that prints `7 27 29 56` has dropped D-20's row and fails mechanically rather than looking plausible.

If either part ever disagrees with the stated totals, **that disagreement is itself a defect to surface, not a number to quietly adopt** (D-18). INVENTORY is immutable and the three prior coverage files are closed and verified; none of them is edited to make a gate agree. Plan `64-03` re-runs both parts at close-out as one of the phase's two hard gates.

## File Gate (D-18.2)

Expected count: **29 files.** Composition:

- `RU-64-01` — 6 workflow files (568 lines) + **`.github/dependabot.yml`** (19 lines, **adopted by D-19**) = 7
- `RU-64-03` — 4 readable tool files (1,240 lines) + 3 vendored JARs (112,361 bytes) = 7
- `RU-64-02` — 14 manifest files (9,208 lines) + **`gradle/wrapper/gradle-wrapper.jar`** (43,583 bytes, **adopted by D-20**) = 15

Enumerated from the live tree at execution time:

```bash
ls .github/workflows/*.yml .github/dependabot.yml bbj-vscode/tools/*.bbj bbj-vscode/tools/interop-test-harness/run-tests.ts bbj-vscode/tools/formatter/*.jar bbj-vscode/tools/formatter/lib/*.jar bbj-vscode/package.json bbj-vscode/package-lock.json bbj-vscode/esbuild.mjs bbj-vscode/eslint.config.js bbj-vscode/langium-config.json bbj-vscode/tsconfig.json bbj-vscode/tsconfig.test.json bbj-vscode/vitest.config.ts bbj-intellij/build.gradle.kts bbj-intellij/settings.gradle.kts bbj-intellij/gradle.properties bbj-intellij/gradlew bbj-intellij/gradlew.bat bbj-intellij/gradle/wrapper/gradle-wrapper.properties bbj-intellij/gradle/wrapper/gradle-wrapper.jar | wc -l
```

**Output:** `29`

Restated at the point of the count so a reader diffing this file against INVENTORY sees two deliberate documented additions rather than a miscount: **27 of the 29 come from INVENTORY's own file lists. The other two are `.github/dependabot.yml` (D-19) and `bbj-intellij/gradle/wrapper/gradle-wrapper.jar` (D-20).** Plan `64-03` re-runs this gate at close-out and additionally confirms that every one of the 29 basenames appears somewhere in this file.

## Stopping Rule & Write Contract

**Stopping rule (four parts).** A unit's sweep is complete when:

(i) **every live `applies` cell it owns** — in its own unit row **and in every file-exception row parented to it** — carries a verdict (`pass`/`fail`) plus a written line naming the concrete checks applied;
(ii) every file in the unit's file list is named at least once inside that unit's own section, in a check line or in a finding's `location:`, so coverage is file-granular rather than unit-granular;
(iii) every candidate claim raised during the sweep is either promoted to a finding record clearing its evidence tier, or written under that unit's `### Not-reproducible dispositions` with its reason;
(iv) **every inherited item addressed to that unit carries a written disposition** — promoted, dismissed-with-evidence, merged, or not-reproducible.

Once (i)-(iv) hold the unit is done and no further reading is licensed.

**Write contract.** Plans `64-02` and `64-03` each fill exactly one unit section and touch nothing else — no fragment files, no assembly plan, no whole-file rewrite, no rewording of a carried-forward `n/a` reason — with one scoped exception: `64-03` additionally fills the close-out and resolves the inherited-item ledger's disposition column, which is precisely its role as the closing plan. Ordering across this shared file is enforced **structurally by the wave dependency chain (D-04), not by an assumption about executor behaviour**: one plan per wave, waves 1-3, each plan's `depends_on` naming its predecessor in D-02's order.

**Placeholder.** Every not-yet-recorded live cell line ends with the single lowercase word `pending`, so remaining work is mechanically countable at every wave.

**Four environment constraints shape every record in this file, each re-derived at execution time rather than trusted from the plan.** (a) **The working tree is never mutated** — this phase records and Phase 67 applies, so no dependency install, no lockfile regeneration and no automated remediation is run anywhere in this phase; `git status --porcelain` over `bbj-vscode`, `bbj-intellij`, `java-interop`, `.github` and the four `.planning/reviews/` records was empty before and after every task. (b) **The vendored JARs are assessed by manifest and hash only** — `unzip -p <jar> META-INF/MANIFEST.MF` and `sha256sum`, no decompilation, no disassembly, no unpacking beyond the manifest, no execution (D-11), consistent with Phase 63 D-13's prohibition on constructing an exploit to confirm a finding. (c) **GitHub Actions cannot be executed here**, so every `RU-64-01` finding is trace-evidenced and names its triggering event (D-12), which plan `64-02` renders. (d) **The Gradle dependency tree cannot be enumerated locally** — `./gradlew --offline -q dependencies` fails on the local JDK before doing any work — so plan `64-03` enumerates Gradle statically and records that as a stated coverage limitation rather than hiding it (D-10).

## Exclusion reasons carried forward

Each block below is copied **verbatim from `.planning/reviews/INVENTORY.md` §"Exclusion reasons"** — not reworded, not paraphrased, not re-derived, not merged.

**R-D7-CI** (7 cells in this slice — the D7 cell of `RU-64-03`, `RU-64-01` and `RU-64-02`, and the D7 cell of all **four** JAR rows, D-20's included):

> "This surface governs build/CI/packaging output, not end-user-observable IDE runtime behavior; there is no parity claim to make between two IDEs about a shared build pipeline or a shared vendored tool invoked identically by both."

**R-D5-CI** (1 cell — `RU-64-01`/D5):

> "Workflow YAML orchestrates test execution but is not itself unit-testable code; test-coverage gaps are recorded against the code the workflow runs, not the workflow file itself."

**R-LOCKFILE** (7 cells — every dimension of `bbj-vscode/package-lock.json` except D6):

> "`package-lock.json` is a machine-generated lockfile, never hand-edited; per this document's coverage-denominator convention it is in scope for D6 only, as the dependency-tree source SEC-08 audits. It carries no logic, no comments and no IDE-specific behavior for the other seven dimensions to assess."

**R-JAR-BINARY** (20 cells — D2, D3, D4, D5 and D8 on each of the **four** JAR rows: the three under `tools/formatter/` and `gradle-wrapper.jar`):

> "This is a compiled, vendored `.jar` binary; its bytecode cannot be read or diffed in this review, so no correctness trace, performance trace, maintainability judgement, test-coverage claim, or doc-accuracy claim can be written against it. Its provenance and pinning status are assessed under D1 and D6 instead."

**Identity check:** 7 + 1 + 7 + 20 = **35**, matching the 35 `n/a` cells in this slice.

D-20's adopted row reuses **R-JAR-BINARY** and **R-D7-CI** verbatim rather than inventing a new marker, because the reason each gives applies to it identically — a compiled vendored binary whose bytecode cannot be read or diffed, on a build/CI surface with no parity claim to make.

**`R-D6-CENTRAL` appears zero times in this slice, and that is a fact rather than a dropped carry-forward.** Phases 61, 62 and 63 all carried it — 11, 5 and 4 cells respectively. Here it carries **none**, because all eight D6 cells in this slice are live. `R-D6-CENTRAL`'s own text is the reason: it says dependency-tree health is assessed once, exhaustively, at `RU-64-02`, and vendored-binary provenance at `RU-64-03`. **This is that phase.** Its absence is stated out loud so no reader mistakes it for an omission.

## Inherited item ledger (D-17)

| # | Source | From | To | Subject | Disposition |
|---|---|---|---|---|---|
| 1 | `63-COVERAGE.md` close-out inheritance table | Phase 63 / `RU-63-03`/D6 | `RU-64-02`/D6 | `P63-D6-002` — the `bbj-intellij` Gradle build JDK 17-vs-25.0.3 toolchain mismatch at `bbj-intellij/build.gradle.kts:12-13`, a `location:` Phase 63 flagged as its one deliberate exception because INVENTORY assigns that file to `RU-64-02` for every dimension | pending |

**Exactly one row, and the three facts that make it exactly one were each verified now rather than asserted:** INVENTORY's routing table (D-06) contains **no Phase 64 row**; `61-COVERAGE.md` has **no downstream-inheritance table at all** and names no Phase 64 obligation; and `62-COVERAGE.md`'s close-out inheritance table names Phases 63, 65, 66, 67, 68 and 69 and contains **no Phase 64 row**. Plan `64-03` resolves the disposition column.

### Phase 62 body-level deferrals addressed to `RU-64-03` — sweep inputs, NOT ledger rows

These two are **not** counted by any gate and are **not** rows in the ledger above. They are recorded here because `62-COVERAGE.md` addresses them to this unit by name, and D-18's arithmetic must stay unchanged. Both are dispositioned by plan `64-01` inside `## RU-64-03`.

1. **`62-COVERAGE.md:1489`** — Phase 62's D1 cell for `RU-62-02` states that `document-formatter.ts`'s `jarPath` "is a compile-time constant, not reachable by any document/workspace/setting value, so it carries no injection risk of its own — its provenance and pinning are `RU-64-03`'s territory (Phase 64), noted as a boundary here, not recorded as a finding." The same cell separately records that `'java'` at `document-formatter.ts:59` is resolved by argv[0] lookup against `PATH` with no absolute-path pinning and no verification step before spawning.
2. **`62-COVERAGE.md:1833`** — a Phase 62 not-reproducible disposition defers whether `BBjCFCli.jar` honours its `-i` path argument or its stdin content, explicitly because "the jar itself is `RU-64-03`'s surface (Phase 64)".

## RU-64-03 — BBj tool scripts, vendored JARs & interop test harness

**Files (7 / 1,240 readable LOC + 112,361 binary bytes):**
- `bbj-vscode/tools/web.bbj` (97)
- `bbj-vscode/tools/em-login.bbj` (51)
- `bbj-vscode/tools/em-validate-token.bbj` (34)
- `bbj-vscode/tools/interop-test-harness/run-tests.ts` (1,058)
- `bbj-vscode/tools/formatter/BBjCFCli.jar` (binary, 6,780 bytes)
- `bbj-vscode/tools/formatter/lib/BBjCodeFomatter.jar` (binary, 38,078 bytes)
- `bbj-vscode/tools/formatter/lib/jcommander-1.71.jar` (binary, 67,503 bytes)

**Risk rank:** 1 of 3 Phase 64 units — the three JARs are vendored, unpinned and unscanned third-party binaries shipped inside the extension, named nowhere in RVW-01..RVW-05 before INVENTORY; this is the entire SEC-08 dependency-vulnerability surface for bundled binaries, distinct from the npm/Gradle trees assessed at `RU-64-02`.
**Sweep method:** full read for the four readable files; manifest and hash only, no decompilation and no execution (D-11), for the three JARs.
**Owning plan:** 64-01 — Task 1 (D1, D2, D3, D6 plus the three JAR rows' D1 and D6 cells, tier `repro`/repro-equivalent) and Task 2 (D4, D5, D8, tier `trace`).

### Cells
- D1 Security — fail — Checked against REQUIREMENTS.md's D1 wording (injection, untrusted input, secret exposure, integrity gaps, privilege/trust-boundary errors), on the four readable files. **EM credential intake:** `em-login.bbj:10-11` takes the username and password as `ARGV(1)`/`ARGV(2)` and `web.bbj:19-20` takes them as `ARGV(5)`/`ARGV(6)`, with the JWT arriving at `web.bbj:22` as `ARGV(8)` — every one of them a process argument; `em-login.bbj:41-43` then writes the raw token to the caller-supplied path `outputFile!` with `open(ch,mode="O_CREATE,O_TRUNC")` and no mode, permission or umask control, and `em-validate-token.bbj:8` takes the token the same way. Recorded as `P64-D1-002`. **Credential fallback:** `web.bbj:30-31` substitutes the literal well-known defaults `admin`/`admin123` when neither `ARGV(5)` nor `ARGV(6)` is supplied, so the script fails *open* into a privileged EM login instead of failing closed — recorded as `P64-D1-001`. **Failure/unreachable paths:** `em-login.bbj:46-51` and `em-validate-token.bbj:29-34` both write a fixed marker (`ERROR:...` / `INVALID`) rather than the exception text, so no EM diagnostic string leaks into the temp file; neither script echoes the token to stdout (`? 'HIDE'` at `em-login.bbj:8` and `em-validate-token.bbj:6`) and neither logs it. **Constructed values:** `web.bbj` builds no URL, path, command string or classpath from a value it did not itself produce — `sscp!` (`:21`) and `configFile!` (`:23`) are passed straight into `app!.setString` (`:79`, `:83`) as EM configuration values, `url!` (`:90`) comes from `getDwcUrl`/`getBuiUrl` on the EM side, and there is no string concatenation into any executable form anywhere in the file. **`run-tests.ts`:** it spawns no process at all (no `child_process` import — `:16-19` imports only `node:net`, `node:fs`, `node:path` and `node:util`), reads no environment variable, and writes exactly one file, `OUTPUT_PATH` (`:43-45`, `:1038`), whose value is either a developer-supplied `--output` or a path resolved beside the script itself; the one network connection is to `--host`/`--port`, defaulting to `127.0.0.1:5008` (`:32-33`, `:142`), an unauthenticated JSON-RPC peer whose responses are attacker-controlled if the peer is. Those responses are embedded into the generated HTML report, and the escaping order is **correct**: `escapeHtml` runs at `:706` and `:708` **before** `syntaxHighlightJson`, and every remote-derived interpolation site (`:687-698`, `:715-719`, `:729-731`, `:740-743`, `:943`) passes through `escapeHtml` (`:596-598`) into a text node or a double-quoted attribute whose value is a computed literal, so no injection path into the report exists — a positive result recorded rather than left silent. The EM token lifecycle end to end is **Phase 65's SEC-04**, and process spawning across both IDEs is **SEC-05**; this unit records its own leg with full evidence and cites that boundary rather than attempting the lifecycle here.
- D2 Correctness & error handling — fail — Checked against null/undefined safety, unhandled rejections, swallowed exceptions, async races, off-by-one, wrong edge-case behaviour and resource leaks, across the four readable files. **`run-tests.ts` verdict reporting:** test case 14 returns a hardcoded `status: 'pass'` at `:510` and test case 17 returns one at `:579` and again at `:584`, in all three places *after* pushing assertions that the return value then ignores — so a failed assertion in either case is rendered green by the console icon (`:1016`) and by the report's status badge (`:739`) while `main`'s exit-code test at `:1042-1048` still counts `r.assertions.some(a => !a.passed)`; recorded as `P64-D2-001`. **`run-tests.ts` dead highlighting:** `generateReport:706-708` escapes before highlighting, and `escapeHtml:597` turns every `"` into `&quot;`, so the two regexes at `:602` and `:605` that require a literal `"` can never match — reproduced in isolation, 0 key spans and 0 string spans as shipped versus 4 and 1 on the same input unescaped; recorded as `P64-D2-002`. **`.bbj` error paths:** `web.bbj` declares `err=` on exactly two calls, both logins (`:27`, `:32`), and on the five `ARGV` reads (`:19-23`); the six EM/API calls that follow a successful login (`:34`, `:54`, `:70`, `:87`, `:90`, `:91`) carry none, so the only user-facing failure message the script has — the `MSGBOX` at `:97` under `login_failed:` — is unreachable from any of them; recorded as `P64-D2-003`. `em-login.bbj` and `em-validate-token.bbj` both fail closed and are caller-distinguishable (an `ERROR:` prefix or the literal `INVALID` versus a bare token or `VALID`), and every exit path closes its channel (`:19`, `:26`, `:43`, `:50` and `:15`, `:26`, `:33`), so no leaked file handle exists on any branch. **Async and resource handling in `run-tests.ts`:** every `sendRequest` is awaited inside a `try` with a matching `catch` that converts the rejection into an `error`-status result (`:163-192` and the five inline runners at `:426-453`, `:461-487`, `:495-516`, `:523-542`, `:550-564`, `:572-589`), the connect timer is cleared on both settle paths (`:140-141`), the top-level `main()` carries a `.catch` (`:1055-1058`), and `conn.dispose()` at `:1026` runs before the report write — no unhandled rejection and no un-awaited promise found. Two candidate claims did not clear the `repro` bar and are written under `### Not-reproducible dispositions` rather than dropped.
- D3 Performance & resource use — pass — Checked against hot-path cost, quadratic walks, missing caches or debounces, redundant work and unbounded memory growth. **Connection reuse:** `main` connects once at `:994` and passes the single `conn` into `defineTests` at `:1003`, so all 17 cases share one socket — no per-case reconnect, no per-case file re-read (the harness reads no file at all). **Loop shape:** the driver at `:1010-1023` is strictly linear in the case count with no nested pass over the corpus; `buildMatrixRow` (`:224-252`) makes four `countWhere` passes and four `.some` passes over the same two arrays, i.e. O(methods + fields) per row for the 9 rows selected at `:1008`, never O(n squared); the six `results.filter` calls at `:652-654` and `:1029-1031` each walk a 17-element array. **Memory:** `results` (`:1004`) retains every response for the run — bounded by 17 responses, and only `getClassInfos('java.lang')` at `:426` is large — while report growth is explicitly capped by `truncateJson(_, 3)` at `:707`, which stops at depth 3 (`:620`) and slices arrays to the first 5 with a count marker (`:624-626`), so HTML size does not scale with response size. No spawned process exists to accumulate output from. **`.bbj` scripts:** `web.bbj:41-50` walks the registered-application list once per launch to find a name match with no cache — linear, once per user-initiated run, over an EM-sized list, so latent rather than active; `em-login.bbj` and `em-validate-token.bbj` each perform a single EM round trip and one file write. One latent division-by-zero-shaped cost at `:966-968` (`passCount / total`) is unreachable today because `defineTests` returns a fixed 17-element array; stated as latent and **not** promoted to a finding on volume alone, per the standard that a cost which is latent rather than active is said to be so.
- D4 Maintainability & code smells — fail — Checked against duplication, god functions, dead code, tangled coupling, inconsistent patterns and missing abstractions, on a mechanical basis wherever one exists rather than on an eyeball impression. **Where the bulk of `run-tests.ts` sits:** `grep -nE '^(async )?function '` returns **18** top-level declarations; measuring their spans shows **two of them hold 666 of the file's 1,058 lines (63%)** — `defineTests` at `:256-592` (337 lines) and `generateReport` at `:651-979` (329 lines, of which `:760-978` is one unbroken 219-line HTML/CSS template literal). The remaining 16 declarations share the other ~390 lines, the largest being `main` at `:983-1053` (71) and `runGetClassInfo` at `:154-193` (40), so no third function is anywhere near god-function size — the problem is exactly two functions, which is a narrower and more actionable statement than "the file is long". **Test cases: half factored, half copy-pasted.** Cases 1-11 are one-line closures delegating to the shared `runGetClassInfo` helper (`:259`, `:295`, `:309`, `:322`, `:347`, `:364`, `:372`, `:385`, `:395`, `:406`, `:416`). Cases 12-17 (`:422`, `:457`, `:491`, `:520`, `:546`, `:568`) are six inline async closures that each re-implement the *same* scaffold the helper already provides — `performance.now()` start, `try`, `sendRequest`, assertion accumulation, a literal `TestResult` object, `catch` producing an `error`-status `TestResult` — at roughly 30 lines each, about 180 duplicated lines. The file therefore has a factored path and a copy-pasted path for one job, and that duplication is not cosmetic: it is exactly why `P64-D2-001`'s hardcoded `status: 'pass'` could diverge in two of the six copies while the other four correctly compute `failed`. Recorded as `P64-D4-001`. **Dead code:** `grep -n 'criticalFields'` over the file returns exactly **one** line — the declaration at `:659` — so the eight-element array naming the fields the report calls critical is written and never read; the code that actually decides criticality, at `:1045`, hardcodes a different, shorter list. Recorded as `P64-D4-002`. Every other helper is referenced (`typeOf` at `:113` and `:431`, `countWhere` at `:229-232` and `:317`, `statusBadge` at `:739`, `validateParameterFields` at `:265`), and no commented-out block or unreachable branch was found. **Setup/teardown:** factored once — a single `connect` at `:994` shared by all 17 cases and a single `conn.dispose()` at `:1026`; no per-case setup is repeated. **The three `.bbj` scripts:** they do share a copy-pasted output idiom — the four-line `ch=unt` / `open(ch,mode="O_CREATE,O_TRUNC")outputFile!` / `write(ch)...` / `close(ch)` block appears 4 times in `em-login.bbj` (`:16-20`, `:23-27`, `:40-44`, `:47-51`) and 3 times in `em-validate-token.bbj` (`:12-16`, `:23-27`, `:30-34`), seven copies in 85 combined lines. Recorded as an observation rather than a finding, and the judgement is stated rather than hidden: these are 34-to-51-line flat stub scripts where a shared helper would cost more indirection than the duplication does, and the copies are local, identical and bounded. **Inconsistent pattern, observed not asserted:** `em-login.bbj:33` and `em-validate-token.bbj:20` both declare `use com.basis.api.admin.BBjAdminFactory`, while `web.bbj` calls `BBjAdminFactory.getBBjAdmin` at `:27` and `:32` with no `use` statement anywhere in the file. Whether that resolves through a default import is a BBj language question this sweep cannot settle without an interpreter, so it is recorded as an inconsistency between three sibling scripts and not promoted to a correctness claim. **Coupling of the `tools/` layout:** the directory shape this unit owns is a contract reproduced by two independent consumers with no shared constant — `document-formatter.ts:10` hardcodes `${__dirname}/../tools/formatter/BBjCFCli.jar`, and `bbj-intellij/build.gradle.kts:100-107` and `:123-128` copy `web.bbj`, `em-login.bbj` and `em-validate-token.bbj` by name into `resources/main/tools` and `lib/tools`. Moving or renaming anything under `tools/` silently breaks one or both. No Phase 64 finding is located in either file — the first is `RU-62-02`'s and closed, the second is `RU-64-02`'s and swept by plan `64-03` — so the coupling is recorded here, where it is observable, and referred rather than relocated.
- D5 Test coverage gaps — fail — Read per D-15 as "is the test surface this unit owns real and reachable", not as "is this file covered" in the abstract, and established by enumeration with each command's output recorded rather than by assumption. **Is `run-tests.ts` exercised by anything?** No. `find bbj-vscode/tools -name '*.test.ts' -o -name '*.spec.ts' | wc -l` prints `0`. A repository-wide `grep -rn 'run-tests|interop-test-harness'` excluding `node_modules/` and `.planning/` returns exactly two kinds of hit: `.gitignore:22` (which ignores the `report.html` the harness writes) and the file's own usage comment at `:11-13`. None of the 15 `bbj-vscode/package.json` scripts invokes it — `test` is `vitest run` and `test:bbj` is `RUN_BBJ_TESTS=1 vitest run`, neither of which reaches `tools/`. So a 1,058-line test harness is itself entirely untested, and is only ever run by hand. **Is it even type-checked or linted?** No, and this is the part that is new here rather than merely absent. `tsconfig.json`'s `include` is `["src/**/*.ts"]` and `tsconfig.test.json`'s is `["test/**/*"]`, so `npm run build` (`tsc -b tsconfig.json && node ./esbuild.mjs`) never compiles it; `npm run lint` is `eslint src test`, so ESLint never sees it. The whole `tools/` tree sits outside every test, type-check and lint boundary the project has. **How is it invoked, and is that path reachable in this checkout?** Only as `npx tsx tools/interop-test-harness/run-tests.ts`, documented in the file's own header at `:9-13` and **nowhere else** — not in `package.json`, not in `CLAUDE.md`, not in any workflow. Its precondition is a reachable java-interop peer, defaulting to `127.0.0.1:5008` (`:32-33`). And the invocation is **not reachable offline**: `tsx` is undeclared and absent from `node_modules/` (see `P64-D6-001`), so the one documented way to run this harness requires a live registry fetch. **Is it at least a CI subject?** No, though it is a CI *trigger*: `.github/workflows/pr-validation.yml:11` lists `bbj-vscode/tools/**` among its `paths:` filters, so editing this file starts a workflow — one that builds `bbj-vscode` and `bbj-intellij` and never executes the harness. Trigger without subject is a sharper statement than "no CI coverage" and is recorded as such; the workflow file itself is `RU-64-01`'s and plan `64-02` sweeps it. **Do the three `.bbj` scripts have any regression surface?** None. `example-files.test.ts:14-17` auto-parses every `.bbj` under `bbj-vscode/test/test-data/` only, so `tools/*.bbj` is not even in the parse-regression corpus, let alone behaviourally tested. **Already-owned debt, cross-referenced rather than re-recorded (D-15):** the 11 known-failing `linking.test.ts` tests are routed by INVENTORY's routing table to Phase 61 and belong to `RU-61-06`, and the 3 disabled `parser.test.ts` assertions are owned by **DEBT-02**. Neither is re-recorded here and neither is counted in this cell; this unit's D5 adds only what is new, which is that `tools/` is outside every quality gate the repository operates. Recorded as `P64-D5-001`.
- D6 Dependency health — fail — Checked against outdated or vulnerable dependencies, license issues and unpinned artifacts, on the unit row's four readable files (the three JAR rows carry their own D6 cells below). **Declared third-party surface:** `run-tests.ts:16-19` imports only Node builtins (`node:net`, `node:fs`, `node:path`, `node:util`) and `:20-26` imports `vscode-jsonrpc/node`, which **is** declared — `bbj-vscode/package.json` lists `vscode-jsonrpc: ^8.2.1` under `dependencies` — and is therefore visible to `npm audit`, to the lockfile and to `.github/dependabot.yml`'s npm ecosystem entry; that is the good case and is recorded as such. The three `.bbj` scripts `use` only BBj-provided and JDK-provided types (`java.net.InetAddress` and `java.util.HashMap` at `em-login.bbj:31-32`, `com.basis.api.admin.BBjAdminFactory` at `em-login.bbj:33` and `em-validate-token.bbj:20`, implicitly at `web.bbj:27`), so they introduce no third-party artifact of their own. **Undeclared tool dependency:** the shebang at `run-tests.ts:1` and the file's own documented usage at `:11-13` both invoke `npx tsx`, and `tsx` appears in neither `dependencies` nor `devDependencies`; `grep -c '"node_modules/tsx"' bbj-vscode/package-lock.json` prints `0` and `ls bbj-vscode/node_modules/tsx` reports it absent, so the only documented way to execute this file resolves an undeclared, unpinned, unlockfiled package from the public registry at run time — invisible to `npm audit`, to the lockfile and to Dependabot alike. Recorded as `P64-D6-001`. The npm and Gradle dependency trees themselves are `RU-64-02`'s, swept in plan `64-03`; this cell stays on what these four files themselves reach for, which is D-02's ordering rationale working as intended.
- D7 Cross-IDE parity — n/a — R-D7-CI — "This surface governs build/CI/packaging output, not end-user-observable IDE runtime behavior; there is no parity claim to make between two IDEs about a shared build pipeline or a shared vendored tool invoked identically by both."
- D8 Comment & doc accuracy — fail — Checked every header comment, function comment and inline explanation in the four readable files against the code beneath it, with particular attention to any comment claiming a validation, a default, an ordering or a precondition. **`run-tests.ts` header (`:2-14`), two claims:** "exercises all 4 API methods" is **accurate** — four `RequestType`s are declared at `:53-56` and all four are exercised (`getClassInfo` by cases 1-11, `getClassInfos` by 12-14, `getTopLevelPackages` by 15, `loadClasspath` by 16-17). "validates every critical field the LS depends on" is **contradicted by the code that decides what critical means**: the eight-field list at `:659` is declared and never read (see `P64-D4-002`), while the gate at `:1045` hardcodes only `['isStatic', 'isDeprecated', 'constructors']` — three of the eight. **`run-tests.ts` usage block (`:9-13`)** documents `--host`, `--port` and `--output` but not `--timeout`, which `parseArgs` accepts at `:35` under `strict: true`, which defaults to `15000ms`, and which `main` prints back to the user at `:987` — so the harness advertises three options and honours four. Both mismatches sit in the same header block and are recorded together as `P64-D8-001`. **Inline comments, all checked and all accurate:** `:341` ("Math has a private constructor, so constructors should be empty or absent") matches the assertion at `:342-343`; `:396` ("Primitives may return a minimal object or error — both are acceptable") matches `:397-402`; `:1007` ("Classes for the field presence matrix (tests 1-8, 11)") matches `matrixTestIndices` at `:1008` exactly, indices 0-7 being tests 1-8 and index 10 being test 11; `:1043` ("Connection errors don't count as field failures") matches the `status === 'error'` early return beneath it. `:469` hedges about Guava's `ClassPath.getTopLevelClasses()` behaviour on the server side, which this sweep cannot verify and which asserts nothing about this file — noted, not recorded. `:582` and `:584` ("An error response is also acceptable for invalid paths" / "Graceful error is a pass") accurately document the catch branch, but not the success branch at `:577-579`, where the same hardcoded `pass` also swallows a failing `Returns boolean` assertion the comments say nothing about — the behaviour recorded as `P64-D2-001` is therefore under-documented as well as wrong, which is noted here rather than double-counted as a second finding. **`.bbj` headers, all checked and all accurate:** `web.bbj:1-11` lists nine parameters in order and `:15-23` reads `ARGV(1)` through `ARGV(9)` in that same order with the same meanings; `web.bbj:62-67` and `:76-77` describe the `"--"` sentinel handling and issue #382 exactly as `:68-74` and `:78-80` implement it; `em-login.bbj:1-6` and `em-validate-token.bbj:1-4` list their parameters correctly against `:10-13` and `:8-9`. One imprecision, recorded as an observation and not a finding because nothing acts on it: `em-login.bbj:1` says the stub "returns JWT token" when `:41-43` writes it to the output file rather than returning it, which the same header's own parameter 3 already makes clear. **`CLAUDE.md`, checked and stale — and routed, not claimed.** `CLAUDE.md:92` lists "Run tools: `web.bbj`, `em-login.bbj`" under what both IDEs share. That enumeration is incomplete: `bbj-intellij/build.gradle.kts:100-107` and `:123-128` copy **three** files — `web.bbj`, `em-login.bbj` **and** `em-validate-token.bbj` — into `resources/main/tools` and `lib/tools`, and all three are present in the built output. `CLAUDE.md`'s `npm test` and `npm run test:bbj` descriptions, by contrast, match `package.json` exactly. **`CLAUDE.md` is `RU-D8-01`'s file, `RU-D8-01` is owned by no sweep phase (D-18), and no Phase 64 plan may allocate a finding there** — so this is recorded as a written observation naming the row that owns it, and no `P64-*` ID is issued against it. Where `CLAUDE.md` is merely *silent* — it never mentions `run-tests.ts`, the interop harness, or the vendored formatter JARs — that silence contradicts nothing and is noted as silence rather than promoted to a finding. **Classification note:** a D8 fix that changes only comment text changes no runtime behaviour, so it can be `easy` when the other five INVENTORY 3c tests pass. `P64-D8-001` is recorded as `major` anyway, and the record states which reading was applied and why.

### File-exception cells

Three rows, transcribed from INVENTORY's `### File-exception rows` table with its row labels character-for-character. D1 on each row is satisfied by **distribution-integrity reasoning and `Class-Path` wiring**, never by bytecode analysis (D-11); D6 on each row opens with the artifact identity established by `sha256sum` and byte size, because for two of the three that hash is the only stable identifier that exists.

- [file-exception] tools/formatter/BBjCFCli.jar · D1 — fail — 6,780 bytes, sha256 `f73a8af5b6eceee3fa5ab11f71e96a629629dc4885235293cfaf6ed6e3c68bd4`. Checked whether it reaches an end user: `bbj-vscode/.vscodeignore` excludes `.vscode/**`, `.vscode-test/**`, `.gitignore`, `langium-quickstart.md`, `nodecd`, `_modules`, `.vscode`, `node_modules`, `src/`, `tsconfig.json`, `webpack.config.js` and `test/` — it does **not** exclude `tools/`, so this JAR ships inside the published `.vsix`. Checked how it is invoked: `document-formatter.ts:10` resolves it as the compile-time constant `${__dirname}/../tools/formatter/BBjCFCli.jar` and `:14-15` passes it to `java -jar` with no existence check, no hash check and no signature check anywhere between resolution and execution. Checked what else it drags in: its manifest declares `Class-Path: lib/jcommander-1.71.jar lib/BBjCodeFomatter.jar`, so executing this one JAR loads all three. Checked whether anything in this repository produces it — nothing does; see `### Vendored Binary Provenance` fact (3) for the search and its result. Recorded as `P64-D1-003`.
- [file-exception] tools/formatter/BBjCFCli.jar · D2 — n/a — R-JAR-BINARY — "This is a compiled, vendored `.jar` binary; its bytecode cannot be read or diffed in this review, so no correctness trace, performance trace, maintainability judgement, test-coverage claim, or doc-accuracy claim can be written against it. Its provenance and pinning status are assessed under D1 and D6 instead."
- [file-exception] tools/formatter/BBjCFCli.jar · D3 — n/a — R-JAR-BINARY — "This is a compiled, vendored `.jar` binary; its bytecode cannot be read or diffed in this review, so no correctness trace, performance trace, maintainability judgement, test-coverage claim, or doc-accuracy claim can be written against it. Its provenance and pinning status are assessed under D1 and D6 instead."
- [file-exception] tools/formatter/BBjCFCli.jar · D4 — n/a — R-JAR-BINARY — "This is a compiled, vendored `.jar` binary; its bytecode cannot be read or diffed in this review, so no correctness trace, performance trace, maintainability judgement, test-coverage claim, or doc-accuracy claim can be written against it. Its provenance and pinning status are assessed under D1 and D6 instead."
- [file-exception] tools/formatter/BBjCFCli.jar · D5 — n/a — R-JAR-BINARY — "This is a compiled, vendored `.jar` binary; its bytecode cannot be read or diffed in this review, so no correctness trace, performance trace, maintainability judgement, test-coverage claim, or doc-accuracy claim can be written against it. Its provenance and pinning status are assessed under D1 and D6 instead."
- [file-exception] tools/formatter/BBjCFCli.jar · D6 — pass — 6,780 bytes, sha256 `f73a8af5b6eceee3fa5ab11f71e96a629629dc4885235293cfaf6ed6e3c68bd4`. Checked what its manifest identifies: `Created-By: 11.0.10+9 (AdoptOpenJDK)`, `Ant-Version: Apache Ant 1.10.8`, `Main-Class: BBjCFCli.BBjCFCli`, `Class-Path: lib/jcommander-1.71.jar lib/BBjCodeFomatter.jar` and `X-COMMENT: Main-Class will be added automatically by build`. That establishes a first-party BASIS artifact built by Ant under a JDK 11 line, and it declares **no third-party dependency of its own** beyond the two `Class-Path` entries, each of which is a separately assessed row below — so there is no outdated-or-vulnerable dependency at this row to record. What it does **not** establish is stated rather than glossed: no version string, no source revision, no build date and no build script in this repository that reproduces it. That unreproducibility is an integrity gap, not a dependency-health gap, and it is where it bites — inside `P64-D1-003` — rather than being double-counted here as a second finding on the same fact.
- [file-exception] tools/formatter/BBjCFCli.jar · D7 — n/a — R-D7-CI — "This surface governs build/CI/packaging output, not end-user-observable IDE runtime behavior; there is no parity claim to make between two IDEs about a shared build pipeline or a shared vendored tool invoked identically by both."
- [file-exception] tools/formatter/BBjCFCli.jar · D8 — n/a — R-JAR-BINARY — "This is a compiled, vendored `.jar` binary; its bytecode cannot be read or diffed in this review, so no correctness trace, performance trace, maintainability judgement, test-coverage claim, or doc-accuracy claim can be written against it. Its provenance and pinning status are assessed under D1 and D6 instead."
- [file-exception] tools/formatter/lib/BBjCodeFomatter.jar · D1 — fail — 38,078 bytes, sha256 `5df78cc81797d0c2e0c5c14eb75c5141a5edb1bb9d131e84ebaafd26a6c1cf9f`. Ships inside the published `.vsix` for the same verified reason as the row above: `bbj-vscode/.vscodeignore` excludes `src/`, `test/`, `node_modules` and nine other entries, and does not exclude `tools/`. It is never invoked directly — it is reached only through `BBjCFCli.jar`'s manifest `Class-Path`, so the single call site at `document-formatter.ts:10` loads it transitively, with the same absence of any existence, hash or signature check before `java -jar` runs. No lockfile entry, no checksum file, no signature and no in-repo build script covers it. This row is the one where the missing integrity check matters most, because it is also the artifact nothing can identify (see its D6 cell). Recorded as `P64-D1-003`.
- [file-exception] tools/formatter/lib/BBjCodeFomatter.jar · D2 — n/a — R-JAR-BINARY — "This is a compiled, vendored `.jar` binary; its bytecode cannot be read or diffed in this review, so no correctness trace, performance trace, maintainability judgement, test-coverage claim, or doc-accuracy claim can be written against it. Its provenance and pinning status are assessed under D1 and D6 instead."
- [file-exception] tools/formatter/lib/BBjCodeFomatter.jar · D3 — n/a — R-JAR-BINARY — "This is a compiled, vendored `.jar` binary; its bytecode cannot be read or diffed in this review, so no correctness trace, performance trace, maintainability judgement, test-coverage claim, or doc-accuracy claim can be written against it. Its provenance and pinning status are assessed under D1 and D6 instead."
- [file-exception] tools/formatter/lib/BBjCodeFomatter.jar · D4 — n/a — R-JAR-BINARY — "This is a compiled, vendored `.jar` binary; its bytecode cannot be read or diffed in this review, so no correctness trace, performance trace, maintainability judgement, test-coverage claim, or doc-accuracy claim can be written against it. Its provenance and pinning status are assessed under D1 and D6 instead."
- [file-exception] tools/formatter/lib/BBjCodeFomatter.jar · D5 — n/a — R-JAR-BINARY — "This is a compiled, vendored `.jar` binary; its bytecode cannot be read or diffed in this review, so no correctness trace, performance trace, maintainability judgement, test-coverage claim, or doc-accuracy claim can be written against it. Its provenance and pinning status are assessed under D1 and D6 instead."
- [file-exception] tools/formatter/lib/BBjCodeFomatter.jar · D6 — fail — 38,078 bytes, sha256 `5df78cc81797d0c2e0c5c14eb75c5141a5edb1bb9d131e84ebaafd26a6c1cf9f`, which is the **only** stable identifier this artifact has. Checked its manifest with `unzip -p`: it is two lines, `Manifest-Version: 1.0` and the terminating blank — no `Bundle-Version`, no `Implementation-Version`, no `Bundle-SymbolicName`, no vendor, no `Created-By`, no build date, no source reference. Checked every other place an identity could come from: no lockfile entry, no checksum file, no `.pom`, no `build.xml`, no `pom.xml`, no Gradle task, no npm script and no CI step anywhere in this repository names or produces it. Checked whether automated tooling could ever see it: `.github/dependabot.yml` declares the npm ecosystem for `/bbj-vscode` only, so a `.jar` under `tools/` is outside anything it scans — the file itself is `RU-64-01`'s and plan `64-02` sweeps it, so the boundary is stated here rather than its finding pre-empted. The filename's own typo, `Fomatter` for `Formatter`, corroborates a hand-copied vendored binary rather than a build-produced one. Recorded as `P64-D6-002` with `triage: file-issue`, because the fix this asks for is provenance, not a version bump.
- [file-exception] tools/formatter/lib/BBjCodeFomatter.jar · D7 — n/a — R-D7-CI — "This surface governs build/CI/packaging output, not end-user-observable IDE runtime behavior; there is no parity claim to make between two IDEs about a shared build pipeline or a shared vendored tool invoked identically by both."
- [file-exception] tools/formatter/lib/BBjCodeFomatter.jar · D8 — n/a — R-JAR-BINARY — "This is a compiled, vendored `.jar` binary; its bytecode cannot be read or diffed in this review, so no correctness trace, performance trace, maintainability judgement, test-coverage claim, or doc-accuracy claim can be written against it. Its provenance and pinning status are assessed under D1 and D6 instead."
- [file-exception] tools/formatter/lib/jcommander-1.71.jar · D1 — fail — 67,503 bytes, sha256 `b78ba8f80afc3defe5cbec954495d650273205b715edf4578212f78517d8b804`. Ships inside the published `.vsix` on the same verified `.vscodeignore` evidence as the two rows above. Like `BBjCodeFomatter.jar` it is never invoked directly and is reached only through `BBjCFCli.jar`'s manifest `Class-Path`, so the single call site at `document-formatter.ts:10` loads it transitively. It is the one artifact of the three whose upstream identity **is** recoverable (see its D6 cell), which makes the integrity gap sharper rather than softer: the byte sequence shipped here is never checked against the published upstream artifact, so knowing which release it claims to be buys nothing at run time. No lockfile entry, no checksum, no signature, no in-repo build script. Recorded as `P64-D1-003`.
- [file-exception] tools/formatter/lib/jcommander-1.71.jar · D2 — n/a — R-JAR-BINARY — "This is a compiled, vendored `.jar` binary; its bytecode cannot be read or diffed in this review, so no correctness trace, performance trace, maintainability judgement, test-coverage claim, or doc-accuracy claim can be written against it. Its provenance and pinning status are assessed under D1 and D6 instead."
- [file-exception] tools/formatter/lib/jcommander-1.71.jar · D3 — n/a — R-JAR-BINARY — "This is a compiled, vendored `.jar` binary; its bytecode cannot be read or diffed in this review, so no correctness trace, performance trace, maintainability judgement, test-coverage claim, or doc-accuracy claim can be written against it. Its provenance and pinning status are assessed under D1 and D6 instead."
- [file-exception] tools/formatter/lib/jcommander-1.71.jar · D4 — n/a — R-JAR-BINARY — "This is a compiled, vendored `.jar` binary; its bytecode cannot be read or diffed in this review, so no correctness trace, performance trace, maintainability judgement, test-coverage claim, or doc-accuracy claim can be written against it. Its provenance and pinning status are assessed under D1 and D6 instead."
- [file-exception] tools/formatter/lib/jcommander-1.71.jar · D5 — n/a — R-JAR-BINARY — "This is a compiled, vendored `.jar` binary; its bytecode cannot be read or diffed in this review, so no correctness trace, performance trace, maintainability judgement, test-coverage claim, or doc-accuracy claim can be written against it. Its provenance and pinning status are assessed under D1 and D6 instead."
- [file-exception] tools/formatter/lib/jcommander-1.71.jar · D6 — pass — 67,503 bytes, sha256 `b78ba8f80afc3defe5cbec954495d650273205b715edf4578212f78517d8b804`. Identified from its own manifest, not from its filename: `Bundle-SymbolicName: jcommander`, `Bundle-Name: com.beust.jcommander`, `Bundle-Version: 1.71`, `Export-Package: com.beust.jcommander;version="1.71"` and four sibling packages, `Bundle-License: http://www.apache.org/licenses/LICENSE-2.0`, `Created-By: 1.8.0_111 (Oracle Corporation)`, `Tool: Bnd-2.4.0.201411031534`, `Bnd-LastModified: 1493325683414`. Converting that epoch — 1493325683414 ms, i.e. `date -u -d @1493325683` — gives **2017-04-27**, so INVENTORY's "notably old" risk-rank note is verified from the artifact itself and is 9 years 4 months before this sweep. Advisory check against a resolvable reference, run 2026-08-18: `POST https://api.osv.dev/v1/query` with `{"package":{"name":"com.beust:jcommander","ecosystem":"Maven"},"version":"1.71"}` returns `{}`, and the same query without a version pin, covering every published version of the coordinate, also returns `{}`; the query mechanism was sanity-checked against `org.apache.logging.log4j:log4j-core` at `2.14.1`, which returns a populated `vulns` array, so the empty result is a real negative rather than a broken call. The relocated coordinate `org.jcommander:jcommander` likewise returns `{}`. **No advisory applies to 1.71, so no CVE finding is recorded here** — a clean result stated with its source and date rather than left as silence. How far behind it sits, from Maven Central's `solrsearch` index: `com.beust:jcommander` ends at `1.82` (2022-01-11) and the project relocated to `org.jcommander:jcommander`, whose latest is `2.0` (2024-08-18) — so 1.71 is eleven releases and one groupId migration back. Age with no advisory is not a D6 finding under RVW-06, and it is not inflated into one here; the integrity gap that does exist is `P64-D1-003`.
- [file-exception] tools/formatter/lib/jcommander-1.71.jar · D7 — n/a — R-D7-CI — "This surface governs build/CI/packaging output, not end-user-observable IDE runtime behavior; there is no parity claim to make between two IDEs about a shared build pipeline or a shared vendored tool invoked identically by both."
- [file-exception] tools/formatter/lib/jcommander-1.71.jar · D8 — n/a — R-JAR-BINARY — "This is a compiled, vendored `.jar` binary; its bytecode cannot be read or diffed in this review, so no correctness trace, performance trace, maintainability judgement, test-coverage claim, or doc-accuracy claim can be written against it. Its provenance and pinning status are assessed under D1 and D6 instead."

### Vendored Binary Provenance

This subsection states facts against the actual artifacts — "there is no checksum" is a fact to state; it becomes a finding only when the record says what it enables. It reads like a map, not a defect list. Discrete `P64-D1-*` / `P64-D6-*` records are allocated in `### Findings` below only where a concrete evidence-clearing defect exists. It is the direct analogue of `63-COVERAGE.md`'s `### SEC-03 Integrity Posture`.

**(1) What is shipped, and how it reaches a user.** Three files, all under `bbj-vscode/tools/formatter/`, totalling 112,361 bytes:

| Artifact | Bytes | SHA-256 (`sha256sum`) |
|---|---|---|
| `BBjCFCli.jar` | 6,780 | `f73a8af5b6eceee3fa5ab11f71e96a629629dc4885235293cfaf6ed6e3c68bd4` |
| `lib/BBjCodeFomatter.jar` | 38,078 | `5df78cc81797d0c2e0c5c14eb75c5141a5edb1bb9d131e84ebaafd26a6c1cf9f` |
| `lib/jcommander-1.71.jar` | 67,503 | `b78ba8f80afc3defe5cbec954495d650273205b715edf4578212f78517d8b804` |

"Shipped inside the published extension" is a **verified** claim, not an assumption. `bbj-vscode/.vscodeignore` is 12 lines and excludes exactly `.vscode/**`, `.vscode-test/**`, `.gitignore`, `langium-quickstart.md`, `nodecd`, `_modules`, `.vscode`, `node_modules`, `src/`, `tsconfig.json`, `webpack.config.js` and `test/`. `tools/` is **not** among them, so the whole `tools/` tree — the three JARs and the three `.bbj` scripts alongside them — is packaged into the `.vsix` that `@vscode/vsce` produces and that the Marketplace serves.

**(2) Provenance, per artifact.** Read with `unzip -p <jar> META-INF/MANIFEST.MF` and nothing else. The three artifacts fall into three clearly different categories, and conflating them would lose the point:

- **Identifiable third-party — `jcommander-1.71.jar`.** `Bundle-SymbolicName: jcommander`, `Bundle-Name: com.beust.jcommander`, `Bundle-Version: 1.71`, `Bundle-ManifestVersion: 2`, `Export-Package: com.beust.jcommander;version="1.71"` plus four sibling packages, `Bundle-License: http://www.apache.org/licenses/LICENSE-2.0`, `Bundle-Description: A Java library to parse command line options`, `Created-By: 1.8.0_111 (Oracle Corporation)`, `Tool: Bnd-2.4.0.201411031534`, `Bnd-LastModified: 1493325683414`. The epoch converts to **2017-04-27**. This is the one artifact whose upstream identity, licence and build date are all recoverable from the bytes themselves.
- **First-party with readable build provenance — `BBjCFCli.jar`.** `Manifest-Version: 1.0`, `Ant-Version: Apache Ant 1.10.8`, `Created-By: 11.0.10+9 (AdoptOpenJDK)`, `Class-Path: lib/jcommander-1.71.jar lib/BBjCodeFomatter.jar`, `X-COMMENT: Main-Class will be added automatically by build`, `Main-Class: BBjCFCli.BBjCFCli`. That establishes *which* JDK line and *which* build tool produced it, and therefore roughly when — Ant 1.10.8 and AdoptOpenJDK 11.0.10+9 both date to 2020-2021. It establishes no version, no source revision, and no build in this repository that reproduces it.
- **Unidentifiable — `BBjCodeFomatter.jar`.** Its entire manifest is `Manifest-Version: 1.0` followed by the terminating blank line. No version, no vendor, no build date, no source reference, no symbolic name, no licence. Its SHA-256 is the only stable identifier it has. Its filename carries a typo (`Fomatter`, missing the second `r`) — what a hand-copied vendored binary looks like, not what a build produces.

**(3) Pinning and update mechanism — and whether anything in this repository produces these files.** Nothing does, and that was established by search rather than inferred. A repository-wide grep for `BBjCFCli`, `BBjCodeFomatter`, `jcommander` and `tools/formatter` across `*.json`, `*.mjs`, `*.js`, `*.ts`, `*.yml`, `*.yaml`, `*.kts`, `*.gradle`, `*.xml` and `Makefile`, excluding `node_modules/` and `.planning/`, returns exactly **two** hits: `bbj-vscode/src/document-formatter.ts:10` (the call site) and the same string inside the committed esbuild output `bbj-vscode/out/main.js`. A `find` for any `build.xml` or `pom.xml` anywhere in the tree returns **nothing**. The 15 `bbj-vscode/package.json` scripts contain no step that compiles, downloads or verifies a JAR. So: **no checksum file, no signature, no lockfile entry, no `.pom`, no Ant or Maven or Gradle build, no CI job, no npm script.** The only provenance signal that exists is the manifest bytes read in fact (2), and there is no update mechanism of any kind — these files change only when a human copies new ones in. Whether the repository's dependency-automation config could ever see them is `RU-64-01`'s question: `.github/dependabot.yml` is swept by plan `64-02`, and the boundary is stated here rather than that plan's finding pre-empted.

**(4) Reachability and wiring — the ordering fact that decides everything above.** `BBjCFCli.jar`'s manifest declares `Class-Path: lib/jcommander-1.71.jar lib/BBjCodeFomatter.jar`. Executing the CLI therefore loads **all three** artifacts; the two `lib/` JARs are reachable *through* the first and are never independently invoked. There is exactly one call site: `document-formatter.ts:10` resolves `${__dirname}/../tools/formatter/BBjCFCli.jar` as a compile-time constant, `:14-15` pushes `-jar` and that path, and the spawn at `:59` runs `java` with the resulting argument array. Between the constant and the spawn there is **no existence check, no hash check and no signature check** — if the file is absent the spawn fails with a raw `java` error, and if the file has been replaced the replacement simply runs. `document-formatter.ts` belongs to `RU-62-02` and Phase 62 is closed, so it is cited as evidence here and no Phase 64 finding is located in it. Phase 62 also already recorded, at `62-COVERAGE.md:1489`, that the `java` executable itself is resolved by argv[0] lookup against `PATH` with no absolute-path pinning and no verification step before spawning. **That boundary is dispositioned here rather than re-recorded:** it is the *runtime* half of the same unverified-execution chain whose *artifact* half is `P64-D1-003` — neither the interpreter nor the three JARs it loads is pinned, hashed or signed — and it is cited inside that finding's evidence rather than allocated a second `P64-*` ID against a closed phase's file.

**(5) What was deliberately not done, and precisely what that leaves unknowable.** No decompilation, no disassembly, no unpacking beyond `META-INF/MANIFEST.MF`, no execution (D-11), consistent with Phase 63 D-13's prohibition on constructing an exploit to confirm a finding. What that leaves unknowable: what `BBjCodeFomatter.jar` actually *is* (its manifest answers nothing and its class names were not read); what third-party code any of the three embeds beyond the declared `Class-Path`; and the question `62-COVERAGE.md:1833` deferred to this unit — whether `BBjCFCli.jar` honours its `-i` path argument or its stdin content when the two disagree, which matters because `document-formatter.ts` supplies both. The manifest cannot settle it: `BBjCFCli.jar`'s six header lines carry no usage metadata whatsoever. **It is therefore dispositioned as not-reproducible below, with that reason, rather than answered by assertion.**

**An empty manifest is a strictly worse posture than a known-vulnerable dependency, and that is the point D-11 makes.** A dependency with a CVE is a problem with a name, a fixed version and a scanner that will keep raising it. `BBjCodeFomatter.jar` has none of those: it cannot be matched to an advisory database, cannot be diffed against an upstream release, cannot be re-derived from source, and cannot even be *asked about* without a vendor conversation. It is 38,078 bytes of code that ships to every user of this extension and that no process in this repository can say anything true about beyond its hash.

**Blast radius.** An attacker who controls any one of these three artifacts controls what runs when a user formats a BBj document. The chain is short and fully unverified at every link: `tools/` is packaged into the `.vsix` (fact 1); the CLI JAR is resolved as a fixed relative path and executed with no integrity check (fact 4); its `Class-Path` pulls in both library JARs (fact 4); and the process is handed the user's own document content on stdin. There is no point in that sequence at which a substitution would be detected, and no recorded hash anywhere in the repository against which one could be detected after the fact.

**What was read, and by what method.** Three manifests via `unzip -p`, three hashes via `sha256sum`, `bbj-vscode/.vscodeignore` in full (12 lines), `bbj-vscode/src/document-formatter.ts:1-30` and `bbj-vscode/package.json`'s script block as context only, plus the repository-wide producer search in fact (3). No JAR was decompiled, disassembled or executed. **Nothing in this subsection is asserted as a defect purely by virtue of appearing here** — the discrete records are `P64-D1-003` and `P64-D6-002`, and everything else above is context those two are read against.

### Findings

Twelve records, all `unit: RU-64-03` including the three whose `location:` is a JAR path. Every `dedup:` is checked against INVENTORY's frozen 15-issue snapshot, in which **0 of 15** carry the `dependencies` area label and **0 of 15** name CI, a workflow, build configuration or a vendored binary — re-derived in this file's header rather than assumed.

```
id:                P64-D1-001
unit:              RU-64-03
location:          bbj-vscode/tools/web.bbj:30-31
dimension:         D1
secondary:         none
severity:          medium
evidence_tier:     repro
evidence:          Line-by-line trace; no runnable reproduction accompanies this record because
                   executing the script requires a live BBj interpreter and a reachable Enterprise
                   Manager, neither of which exists in this checkout, and this phase mutates nothing.
                   `web.bbj:19-20` reads the username and password with `ARGV(5,err=*next)` /
                   `ARGV(6,err=*next)`, so a caller that supplies fewer than six arguments leaves both
                   unset. `web.bbj:26` takes the token branch only when `token!` is non-null and
                   non-empty; otherwise control reaches `:29-32`, where `:30` assigns the literal
                   `"admin"` to an unset `username!` and `:31` assigns the literal `"admin123"` to an
                   unset `password!`, and `:32` calls
                   `BBjAdminFactory.getBBjAdmin(username!, password!, err=login_failed)` with them.
                   Those two literals are BASIS's documented out-of-the-box EM administrator
                   credentials. The script therefore fails *open* into a privileged login rather than
                   failing closed, and it does so silently — no message, no log line, no marker in the
                   output. There is no configuration switch anywhere in the file that disables the
                   fallback.
failure_scenario:  A BBj installation whose EM administrator password was never changed from the
                   shipped default. A user triggers the BUI or DWC run command with no EM credentials
                   configured and no token available, so ARGV(5), ARGV(6) and ARGV(8) all arrive
                   empty. `web.bbj:30-31` substitutes admin/admin123, `:32` authenticates as the EM
                   administrator, and `:54`-`:87` then create or overwrite a registered application
                   entry — program path, working directory, classpath and config file — under
                   administrator authority that the user never knowingly exercised and was never
                   prompted for. The same path is what makes an unattended or scripted invocation
                   silently privileged.
classification:    major — (1) at most one file: PASS, the edit is confined to web.bbj. (2) no public
                   API / no grammar rule / no LSP contract change: PASS. (3) adds or upgrades no
                   dependency: PASS. (4) regression-testable with the existing harness: FAIL — no
                   test in this repository exercises any `.bbj` tool script, and vitest cannot drive
                   a BBj interpreter, so a regression test needs new infrastructure. (5) reviewer can
                   name the exact edit: PASS — delete the two fallback assignments and route the
                   no-credential case to `login_failed:`. (6) severity is neither critical nor high
                   AND primary dimension is not D1: FAIL — the primary dimension is D1. Tests (4) and
                   (6) both fail, and (6) is the deliberate safety gate, so this is `major`
                   regardless of how small the edit is.
effort:            4
dedup:             none — no open issue in the frozen 15-issue snapshot mentions EM credentials,
                   default passwords, `web.bbj`, or authentication of any kind; 0 of the 15 carry the
                   `dependencies` label and 0 name CI, a workflow, build configuration or a vendored
                   binary.
disposition:       major-refactor — the fix changes the script's contract with its callers (a
                   no-credential invocation must now fail rather than proceed), so the VS Code and
                   IntelliJ launch paths have to be considered alongside it; Phase 67 does not apply
                   it unilaterally.
```

```
id:                P64-D1-002
unit:              RU-64-03
location:          bbj-vscode/tools/em-login.bbj:10-13,41-43
dimension:         D1
secondary:         none
severity:          high
evidence_tier:     repro
evidence:          Line-by-line trace; no runnable reproduction accompanies this record because
                   observing a process table entry for a BBj process requires running one, which this
                   phase does not do, and because publishing a step-by-step capture procedure against
                   a shipped credential path is exactly what D-16's two-tier rule excludes. The trace
                   is complete without it. `em-login.bbj:10-11` reads the username and password as
                   `ARGV(1)` and `ARGV(2)`; `web.bbj:19-20` reads them as `ARGV(5)` and `ARGV(6)`; and
                   `web.bbj:22` reads the JWT as `ARGV(8)`. Command-line arguments of a running
                   process are readable by any process on the host running as the same user, and on
                   Linux by anything that can read `/proc/<pid>/cmdline`. The three scripts have no
                   alternative intake — no stdin read, no environment variable, no file — so the
                   argument vector is the only channel by which a credential reaches them.
                   `em-login.bbj:40-43` then writes the returned token to the caller-supplied path
                   `outputFile!` using `open(ch,mode="O_CREATE,O_TRUNC")` with no mode, permission or
                   umask control, and `em-validate-token.bbj:8-9` reads the token back the same way,
                   so the token has a second at-rest exposure whose file permissions are whatever the
                   BBj process default happens to be. What the scripts do get right is recorded too:
                   `? 'HIDE'` at `em-login.bbj:8` and `em-validate-token.bbj:6` suppresses console
                   echo, no script writes the token to stdout or to a log, and the failure branches at
                   `em-login.bbj:46-51` and `em-validate-token.bbj:29-34` emit fixed markers rather
                   than the underlying exception text, so no EM diagnostic leaks either.
failure_scenario:  Any local process running under the developer's own account — a malicious or
                   compromised npm postinstall script, a shared build agent, an unrelated tool with a
                   process-listing feature — samples the process table during the window in which
                   `em-login.bbj` runs and reads the Enterprise Manager password in cleartext from
                   ARGV(2), or reads a live JWT from `web.bbj`'s ARGV(8). Separately, the token file
                   written at `em-login.bbj:41-43` persists at the caller-chosen path with default
                   permissions until something deletes it, so the same value is readable from disk
                   after the process has exited.
classification:    major — (1) at most one file: FAIL, the argument contract is shared by
                   `em-login.bbj`, `em-validate-token.bbj` and `web.bbj` and by each IDE's launch
                   code. (2) no public API change: FAIL, the ARGV contract is the public interface
                   between the extensions and these scripts. (3) adds or upgrades no dependency:
                   PASS. (4) regression-testable with the existing harness: FAIL, as above. (5)
                   reviewer can name the exact edit: FAIL — moving a secret off the argument vector
                   means choosing a replacement channel, which is a design decision, not an edit.
                   (6) severity is neither critical nor high AND primary dimension is not D1: FAIL on
                   both halves. Five of six tests fail.
effort:            8
dedup:             none — the frozen 15-issue snapshot contains no issue about EM authentication,
                   token handling, credential storage or process arguments; issue #231 is the nearest
                   neighbour by subject area (custom classpath and command-line settings for starting
                   BBj programs) and is a feature request about classpath configuration, sharing no
                   defect with this record.
disposition:       major-refactor — this is one leg of SEC-04 (EM token lifecycle, end to end across
                   `BbjEMTokenStore`, `em-login.bbj` and `em-validate-token.bbj`) and touches SEC-05
                   (process spawning). Phase 65 owns the synthesis; this record supplies the
                   `RU-64-03` leg with full evidence and does not attempt the lifecycle here.
```

```
id:                P64-D1-003
unit:              RU-64-03
location:          bbj-vscode/tools/formatter/BBjCFCli.jar
dimension:         D1
secondary:         [D6]
severity:          high
evidence_tier:     repro
evidence:          Line-by-line trace plus artifact inspection; no runnable reproduction accompanies
                   this record, deliberately — confirming a substitution by performing one would mean
                   replacing a shipped binary and executing it, which D-11 prohibits outright and
                   which Phase 63 D-13 already established is not how a finding gets confirmed in this
                   milestone. Every link in the chain is verifiable statically. (a) Packaging:
                   `bbj-vscode/.vscodeignore` is 12 lines and excludes `.vscode/**`, `.vscode-test/**`,
                   `.gitignore`, `langium-quickstart.md`, `nodecd`, `_modules`, `.vscode`,
                   `node_modules`, `src/`, `tsconfig.json`, `webpack.config.js` and `test/`; `tools/`
                   is absent from that list, so all three JARs are packaged into the published `.vsix`.
                   (b) Execution: `bbj-vscode/src/document-formatter.ts:10` resolves
                   `${__dirname}/../tools/formatter/BBjCFCli.jar` as a compile-time constant, `:14-15`
                   pushes `-jar` and that path onto the argument array, and `:59` spawns `java` with
                   it — with no existence check, no hash check and no signature check at any point in
                   between. That file belongs to `RU-62-02` and Phase 62 is closed, so it is cited as
                   evidence and no Phase 64 finding is located in it. (c) Transitive load:
                   `BBjCFCli.jar`'s manifest declares `Class-Path: lib/jcommander-1.71.jar
                   lib/BBjCodeFomatter.jar`, so executing the CLI loads all three artifacts. (d)
                   Absence of any verifier: a repository-wide grep for `BBjCFCli`, `BBjCodeFomatter`,
                   `jcommander` and `tools/formatter` across the build, config and CI file types
                   returns only the call site and the committed esbuild output; `find` locates no
                   `build.xml` and no `pom.xml`; none of the 15 `package.json` scripts touches a JAR;
                   and no checksum, signature or lockfile entry for any of the three exists anywhere.
                   (e) Interpreter: `62-COVERAGE.md:1489` already recorded that `java` itself is
                   resolved by argv[0] lookup against `PATH` with no absolute-path pinning and no
                   verification before spawning — cited here as the runtime half of the same
                   unverified chain rather than re-recorded against a closed phase's file.
failure_scenario:  Any write to the extension's installed `tools/formatter/` directory — by another
                   process running as the user, by a tampered or re-packed `.vsix`, or by a
                   compromised release artifact — changes which bytecode the next format-on-save
                   executes. The user formats a BBj document; `document-formatter.ts:59` spawns
                   `java -jar` against the resolved constant path; the replaced code runs under the
                   user's own account and is handed the document's full text on stdin. Nothing in the
                   sequence compares the file against an expected hash or signature, nothing in the
                   repository records what the expected bytes are, and the substitution leaves no
                   signal in any log, so neither the user nor a later reviewer has a way to detect it
                   before or after the fact. Per D-16 the surface, problem class and impact are
                   recorded and no trigger sequence, payload or fork-and-run procedure is.
classification:    major — (1) at most one file: FAIL, a fix means adding a verification step at the
                   call site plus a recorded hash or signature for three artifacts. (2) no public API
                   change: PASS. (3) adds or upgrades no dependency: PASS as written, though a
                   signature-based fix would not be. (4) regression-testable with the existing
                   harness: FAIL, nothing in vitest reaches `tools/` and the formatter path is not
                   covered. (5) reviewer can name the exact edit: FAIL — pinning requires first
                   deciding what the artifacts are and where they come from, which is `P64-D6-002`'s
                   unanswered question for one of the three. (6) severity is neither critical nor high
                   AND primary dimension is not D1: FAIL on both halves.
effort:            8
dedup:             none — no issue in the frozen 15-issue snapshot concerns the formatter, the
                   vendored JARs, extension packaging or artifact integrity; 0 of the 15 carry the
                   `dependencies` area label.
disposition:       major-refactor — recorded here, routed to `MAJOR-REFACTORS.md` by Phase 68 and to
                   Phase 69 for filing. Phase 67 does not apply it.
```

```
id:                P64-D2-001
unit:              RU-64-03
location:          bbj-vscode/tools/interop-test-harness/run-tests.ts:510,579,584
dimension:         D2
secondary:         none
severity:          medium
evidence_tier:     repro
evidence:          Line-by-line trace; no runnable end-to-end reproduction accompanies this record
                   because triggering it needs a live java-interop peer on the target port that
                   returns a non-conforming response, and standing one up is outside a static review
                   that mutates nothing. The divergence is exact and readable. Test case 14
                   (`getClassInfos — com.basis.startup.type`) pushes two assertions at `:499-501` and
                   a third conditionally at `:505-507`, then returns `status: 'pass'` as a hardcoded
                   literal at `:510` without ever computing `assertions.some(a => !a.passed)` — unlike
                   every neighbouring case, which does exactly that at `:446`, `:480`, `:535` and
                   `:557`. Test case 17 does the same twice: `:579` in the success branch after
                   pushing a `Returns boolean` assertion at `:577`, and `:584` in the catch branch.
                   Downstream, the console icon at `:1016` and the report's status badge at `:739`
                   both key off `result.status`, and the summary counts at `:652-654` and `:1029-1031`
                   are `results.filter(r => r.status === ...)` — so all four display surfaces read the
                   hardcoded literal. The exit-code check at `:1042-1048` does not: it walks
                   `r.assertions.some(a => !a.passed)` independently and therefore *does* see the
                   failure. The two halves of the harness disagree by construction.
failure_scenario:  The interop service returns something other than an array for
                   `getClassInfos('com.basis.startup.type')` — for example an error object, which is a
                   response shape the harness explicitly anticipates elsewhere at `:398` and `:408`.
                   The `Returns array` assertion at `:499` records `passed: false`. Test 14 still
                   returns `status: 'pass'` at `:510`. The console prints `✓ 14. getClassInfos —
                   com.basis.startup.type`, the summary line at `:1034` prints `17 passed, 0 failed, 0
                   errors`, and `report.html` shows a green PASS badge with a `<details>` element that
                   is not even auto-expanded, because `:737` only opens non-pass rows. The process
                   then exits 1. A developer reading the console and the report concludes the interop
                   service is healthy; only the shell's exit status disagrees, and in an interactive
                   run nobody looks at it.
classification:    major — (1) at most one file: PASS. (2) no public API change: PASS. (3) adds or
                   upgrades no dependency: PASS. (4) regression-testable with the existing harness:
                   FAIL — `tools/` is outside `tsconfig.json`'s `include` (`src/**/*.ts` only) and
                   outside `tsconfig.test.json`'s (`test/**/*` only), `npm run lint` is
                   `eslint src test`, and nothing under `tools/` matches vitest's default test-file
                   pattern; `run-tests.ts` also calls `main()` at module scope (`:1055`), so importing
                   it from a test would execute the harness. A regression test needs new
                   infrastructure. (5) reviewer can name the exact edit: PASS — compute `failed` the
                   way `:446` does and return it in all three places. (6) severity is neither critical
                   nor high AND primary dimension is not D1: PASS. One test fails, so `major`.
effort:            2
dedup:             none — the frozen 15-issue snapshot contains no issue about the interop test
                   harness, test reporting or CI result accuracy.
disposition:       major-refactor — small edit, but INVENTORY 3c test (4) fails, so it does not enter
                   Phase 67's `easy` apply path without the `MAJOR-REFACTORS.md` record first.
```

```
id:                P64-D2-002
unit:              RU-64-03
location:          bbj-vscode/tools/interop-test-harness/run-tests.ts:706-708
dimension:         D2
secondary:         [D4]
severity:          low
evidence_tier:     repro
evidence:          Runnable reproduction, executed in isolation without touching the repository.
                   `generateReport:706` and `:708` call `escapeHtml(...)` and pass the result to
                   `syntaxHighlightJson(...)` at `:747` and `:751`. `escapeHtml:597` replaces every
                   `"` with `&quot;`. `syntaxHighlightJson:602` matches
                   `/("(?:\\.|[^"\\])*")\s*:/g` and `:605` matches `/:\s*("(?:\\.|[^"\\])*")/g` —
                   both require a literal `"`, which by then no longer occurs anywhere in the input.
                   Copying both functions verbatim into a standalone script and feeding them
                   `JSON.stringify({className:'java.lang.String',count:3,ok:true,extra:null},null,2)`
                   produces, in the shipped order, **0** `json-key` spans and **0** `json-string`
                   spans, with 1 each of `json-number`, `json-bool` and `json-null`; feeding the same
                   regexes the unescaped input produces **4** `json-key` spans and **1**
                   `json-string` span. The three numeric/boolean/null branches at `:608`, `:611` and
                   `:614` still fire because their patterns contain no quote character. The
                   `.json-key` and `.json-string` CSS rules are still emitted into every report.
failure_scenario:  Run the harness against any live service and open the generated `report.html`.
                   Expand any Request block or any Response block: every JSON key and every JSON
                   string value renders in the default `pre` colour, and the document contains no
                   `<span class="json-key">` or `<span class="json-string">` element at all, while
                   numbers, booleans and nulls are coloured. The feature the CSS and the two dead
                   regexes were written for has never worked in any report this harness has produced,
                   and nothing signals that — the report looks deliberately styled rather than broken.
classification:    major — (1) at most one file: PASS. (2) no public API change: PASS. (3) adds or
                   upgrades no dependency: PASS. (4) regression-testable with the existing harness:
                   FAIL, for the same reasons recorded under `P64-D2-001` — `tools/` is reached by no
                   tsconfig, no lint script and no vitest pattern, and the module self-executes. (5)
                   reviewer can name the exact edit: PASS — highlight first, then escape, or make the
                   two regexes match `&quot;`. (6) severity is neither critical nor high AND primary
                   dimension is not D1: PASS. One test fails, so `major`.
effort:            2
dedup:             none — no issue in the frozen 15-issue snapshot concerns the interop harness or
                   its HTML report.
disposition:       major-refactor — cosmetic in effect, but classified by the same six tests as
                   everything else; recorded rather than quietly downgraded.
```

```
id:                P64-D2-003
unit:              RU-64-03
location:          bbj-vscode/tools/web.bbj:34,54,70,87,90,91
dimension:         D2
secondary:         none
severity:          medium
evidence_tier:     repro
evidence:          Line-by-line trace; no runnable reproduction accompanies this record because
                   provoking an EM-side failure requires a live Enterprise Manager, which this
                   checkout does not have and this phase does not stand up. The control-flow claim is
                   fully verifiable from the file. `grep -n 'err=' bbj-vscode/tools/web.bbj` returns
                   exactly seven lines: five `ARGV(n,err=*next)` reads at `:19-23`, and the two
                   `BBjAdminFactory.getBBjAdmin(...,err=login_failed)` calls at `:27` and `:32`. The
                   script's only user-facing failure message is the `MSGBOX("Login Failed!",...)` at
                   `:97`, under the `login_failed:` label at `:96`, and that label is reachable from
                   nowhere except those two login calls — `:93` executes `release` before it, so it
                   cannot be fallen into. Six external calls run after a successful login and none of
                   them carries an `err=` branch: `admin!.getRemoteConfiguration()` (`:34`),
                   `configuration!.createApplication()` (`:54`),
                   `BBjAPI().getConfig().getConfigFileName()` (`:70`), `app!.commit()` (`:87`),
                   `app!.getDwcUrl(0)` / `app!.getBuiUrl(0)` (`:90`) and
                   `BBjAPI().getThinClient().browse(url!)` (`:91`). Error handling in this script is
                   therefore present on exactly the one call where the outcome is least ambiguous and
                   absent on every call where it is not.
failure_scenario:  EM authentication succeeds, so `:27` or `:32` returns an `admin!` handle and the
                   `login_failed:` path is out of reach. `app!.commit()` at `:87` then fails — the
                   authenticated EM user lacks permission to write the application entry, the entry
                   collides, or the EM connection drops between `:34` and `:87`. Control never reaches
                   `:90-91`, so no browser is opened, and it cannot reach `:97`, so no message box is
                   shown. From the user's side the BUI/DWC run command produces nothing at all: no
                   browser, no dialog, no distinction from a run that was never triggered. The same
                   shape applies to the other five unguarded calls.
classification:    major — (1) at most one file: PASS. (2) no public API change: PASS. (3) adds or
                   upgrades no dependency: PASS. (4) regression-testable with the existing harness:
                   FAIL — no test in this repository exercises any `.bbj` tool script and vitest
                   cannot drive a BBj interpreter. (5) reviewer can name the exact edit: PASS — add
                   `err=` branches to the six calls and give them a distinct labelled message rather
                   than reusing `login_failed:`, whose text would be wrong for them. (6) severity is
                   neither critical nor high AND primary dimension is not D1: PASS. One test fails,
                   so `major`.
effort:            4
dedup:             none — the frozen 15-issue snapshot contains no issue about BUI/DWC launch
                   failures, `web.bbj`, or silent run-command no-ops.
disposition:       major-refactor — recorded for Phase 68's document split; not applied here.
```

```
id:                P64-D6-001
unit:              RU-64-03
location:          bbj-vscode/tools/interop-test-harness/run-tests.ts:1,11-13
dimension:         D6
secondary:         none
severity:          medium
evidence_tier:     inherited
evidence:          Resolves to repro-equivalent: the claim is an absence, and it was established by
                   three commands whose output is recorded rather than by reading the file alone.
                   `run-tests.ts:1` is `#!/usr/bin/env npx tsx` and the file's own usage block at
                   `:11-13` gives three invocations, all of the form `npx tsx
                   tools/interop-test-harness/run-tests.ts`. Reading `bbj-vscode/package.json`:
                   `tsx` appears in neither `dependencies` (8 entries) nor `devDependencies` (13
                   entries). `grep -c '"node_modules/tsx"' bbj-vscode/package-lock.json` prints `0`,
                   so the lockfile pins no version of it and the resolved tree does not contain it —
                   the two `"tsx"` strings that do occur in the lockfile, at lines 7390 and 7424, are
                   a peer declaration inside another package's metadata, not a top-level install. `ls
                   bbj-vscode/node_modules/tsx` reports the directory absent even though
                   `node_modules/` is populated in this checkout. So the only documented way to run
                   this file causes `npx` to resolve `tsx` from the public registry at execution time,
                   at whatever version the registry serves that day. By contrast the file's one
                   genuine library import, `vscode-jsonrpc/node` at `:20-26`, **is** declared
                   (`vscode-jsonrpc: ^8.2.1`) and is therefore covered by `npm audit`, by the lockfile
                   and by Dependabot — recorded so the finding is read as the specific gap it is
                   rather than as a general complaint about the file.
failure_scenario:  A maintainer follows the file's own documented usage and runs `npx tsx
                   tools/interop-test-harness/run-tests.ts`. `npx` downloads and executes whatever
                   `tsx` the registry currently resolves to, with no version pin and no lockfile
                   entry constraining it, and that package's install and run-time code executes with
                   the developer's privileges. Nothing in this repository records which version was
                   used, `npm audit` cannot report on a package that is not in the tree, and
                   `.github/dependabot.yml` cannot open an update PR for a dependency that is not
                   declared — so an advisory published against `tsx` would produce no signal here at
                   all, in either direction.
classification:    major — (1) at most one file: PASS, the declaration lands in `package.json`. (2) no
                   public API change: PASS. (3) adds or upgrades no dependency in
                   `bbj-vscode/package.json`: **FAIL** — declaring `tsx` is precisely adding one. (4)
                   regression-testable with the existing harness: FAIL, as for the other
                   `run-tests.ts` records. (5) reviewer can name the exact edit: PASS — add a pinned
                   `tsx` to `devDependencies` and drop `npx` from the shebang and the usage block. (6)
                   severity is neither critical nor high AND primary dimension is not D1: PASS. Tests
                   (3) and (4) fail. Note the interaction with D-09's mapping, stated rather than
                   papered over: this is not a `fix-now` version bump, because the change adds a
                   dependency declaration, which INVENTORY 3c test (3) makes `major` by construction.
                   `triage: file-issue` and `classification: major` therefore agree with D-09's table
                   rather than contradicting it.
triage:            file-issue
effort:            2
dedup:             none — the frozen 15-issue snapshot contains no issue about tooling dependencies,
                   the interop harness, or undeclared packages; 0 of the 15 carry the `dependencies`
                   area label.
disposition:       major-refactor — referred to `RU-64-02` as a cross-unit referral below, because the
                   `location:` of the defect is this file but the file the fix edits,
                   `bbj-vscode/package.json`, is `RU-64-02`'s and is swept by plan `64-03`.
```

```
id:                P64-D6-002
unit:              RU-64-03
location:          bbj-vscode/tools/formatter/lib/BBjCodeFomatter.jar
dimension:         D6
secondary:         none
severity:          high
evidence_tier:     inherited
evidence:          Resolves to trace-equivalent rather than to the advisory-reference bar, because the
                   claim this record makes is not "version X has CVE Y" — it is that **no version
                   exists to check**, and that absence is readable directly from the artifact. No
                   runnable reproduction accompanies it: there is nothing to run, and D-11 prohibits
                   the decompilation that would be the only way to learn more.
                   `unzip -p bbj-vscode/tools/formatter/lib/BBjCodeFomatter.jar META-INF/MANIFEST.MF`
                   emits two lines — `Manifest-Version: 1.0` and the terminating blank. There is no
                   `Bundle-Version`, no `Implementation-Version`, no `Specification-Version`, no
                   `Bundle-SymbolicName`, no `Implementation-Vendor`, no `Created-By`, no
                   `Built-Date`, no SCM reference and no licence. Compare the sibling row:
                   `jcommander-1.71.jar`'s manifest carries eleven identifying headers and can be
                   queried against OSV. `sha256sum` gives
                   `5df78cc81797d0c2e0c5c14eb75c5141a5edb1bb9d131e84ebaafd26a6c1cf9f` for 38,078
                   bytes, and that hash is the artifact's only stable identifier. Every other possible
                   source of identity was checked and is absent: no lockfile entry, no `.pom`, no
                   checksum file, no signature, no `build.xml` or `pom.xml` anywhere in the tree, no
                   Gradle task, no npm script among the 15 in `package.json`, and no CI step. Coverage
                   by automation is likewise absent: `.github/dependabot.yml` declares only the npm
                   ecosystem for `/bbj-vscode`, so a `.jar` under `tools/` is outside its scan
                   entirely — that file is `RU-64-01`'s and plan `64-02` sweeps it, so the boundary is
                   noted without pre-empting its finding. The filename's typo, `Fomatter` for
                   `Formatter`, corroborates a hand-copied vendored binary rather than a
                   build-produced one.
failure_scenario:  A vulnerability is published against whatever library this JAR actually contains.
                   The maintainer does everything right: runs `npm audit` over `bbj-vscode`, reads
                   every Dependabot PR, reviews `package-lock.json`, and greps the repository for the
                   affected package name. None of those can see the file — it is not in the npm tree,
                   not in the lockfile, not in Dependabot's configured ecosystem, and its name matches
                   nothing. A reviewer who goes further and opens the JAR's manifest by hand learns
                   only that it is version 1.0 of the manifest format. There is no step at which the
                   project can determine that it ships affected code, so the extension keeps shipping
                   it indefinitely with no signal that action is required. This is a strictly worse
                   posture than a known-vulnerable dependency, which at least has a name, a fixed
                   version and a scanner that keeps raising it.
classification:    major — (1) at most one file: FAIL, resolving this means adding provenance metadata
                   and a recorded hash, and probably a build or acquisition step. (2) no public API
                   change: PASS. (3) adds or upgrades no dependency: PASS as stated, though the
                   resolution may replace the artifact entirely. (4) regression-testable with the
                   existing harness: FAIL, nothing tests the formatter path. (5) reviewer can name the
                   exact edit: **FAIL** — nobody in this repository can name the edit, because nobody
                   in this repository can say what the file is. That is the finding. (6) severity is
                   neither critical nor high AND primary dimension is not D1: FAIL, severity is high.
                   Four tests fail.
triage:            file-issue
effort:            8
dedup:             none — no issue in the frozen 15-issue snapshot names the formatter, a vendored
                   binary, or dependency provenance; 0 of the 15 carry the `dependencies` area label
                   and 0 name CI, a workflow, build configuration or a vendored binary.
disposition:       major-refactor — **the fix this asks for is provenance, not a version bump.** What
                   is needed is a statement of what the artifact is, where it came from, which version
                   it is, and a recorded hash to pin it — after which it becomes triageable at all.
                   Filed by Phase 69; not applied by Phase 67.
```

```
id:                P64-D4-001
unit:              RU-64-03
location:          bbj-vscode/tools/interop-test-harness/run-tests.ts:256-592,651-979
dimension:         D4
secondary:         none
severity:          low
evidence_tier:     trace
evidence:          Written trace naming the code shape, which is what D4's tier requires; the
                   measurements below are mechanical rather than impressionistic.
                   `grep -nE '^(async )?function ' run-tests.ts` returns 18 top-level declarations.
                   Two of them hold 666 of the file's 1,058 lines: `defineTests` at `:256-592`
                   (337 lines) and `generateReport` at `:651-979` (329 lines, `:760-978` of which is
                   one 219-line HTML/CSS template literal). No other declaration approaches that —
                   the next largest are `main` at `:983-1053` (71) and `runGetClassInfo` at
                   `:154-193` (40). Inside `defineTests` the 17 cases split into two populations:
                   cases 1-11 (`:259`, `:295`, `:309`, `:322`, `:347`, `:364`, `:372`, `:385`,
                   `:395`, `:406`, `:416`) are one-line closures delegating to the shared
                   `runGetClassInfo` helper, while cases 12-17 (`:422`, `:457`, `:491`, `:520`,
                   `:546`, `:568`) are inline async closures that each re-implement that helper's
                   whole scaffold — timing start, `try`, `sendRequest`, assertion accumulation, a
                   literal `TestResult`, and a `catch` producing an `error`-status `TestResult` — at
                   roughly 30 lines apiece, about 180 duplicated lines. The abstraction that would
                   remove the duplication already exists in the file and is used by two thirds of
                   the cases.
failure_scenario:  A maintainer adds an eighteenth test case for a method that returns something
                   other than a class-info object, so `runGetClassInfo` does not fit and the case is
                   written by copying case 16 or 17 — the established pattern for that shape. The
                   copy carries whatever the source copy got wrong. That is not hypothetical: it is
                   exactly how `P64-D2-001` came about, with two of the six copies (`:510`, `:579`
                   and `:584`) returning a hardcoded `status: 'pass'` while the other four compute
                   `failed` correctly at `:446`, `:480`, `:535` and `:557`. The next divergence has
                   the same shape and the same probability of going unnoticed, because there is no
                   single place where the case protocol is defined.
classification:    major — (1) at most one file: PASS. (2) no public API change: PASS. (3) adds or
                   upgrades no dependency: PASS. (4) regression-testable with the existing harness:
                   FAIL — `tools/` is outside `tsconfig.json`'s include (`src/**/*.ts`), outside
                   `tsconfig.test.json`'s (`test/**/*`), outside `npm run lint` (`eslint src test`)
                   and outside vitest's default pattern, and the module self-executes `main()` at
                   `:1055`, so a regression test needs new infrastructure. (5) reviewer can name the
                   exact edit: PASS — generalise `runGetClassInfo` over the request type so cases
                   12-17 delegate to it, and split the report's template literal out of
                   `generateReport`. (6) severity is neither critical nor high AND primary dimension
                   is not D1: PASS. One test fails, so `major`.
effort:            8
dedup:             none — no issue in the frozen 15-issue snapshot concerns the interop test
                   harness, its structure, or code organisation anywhere under `bbj-vscode/tools/`.
disposition:       major-refactor — recorded for Phase 68's `MAJOR-REFACTORS.md`; not applied here.
```

```
id:                P64-D4-002
unit:              RU-64-03
location:          bbj-vscode/tools/interop-test-harness/run-tests.ts:659
dimension:         D4
secondary:         none
severity:          low
evidence_tier:     trace
evidence:          Written trace with a mechanical basis. `grep -n 'criticalFields' run-tests.ts`
                   returns exactly **one** line, the declaration at `:659`:
                   `const criticalFields = ['isStatic', 'isDeprecated', 'constructors', 'name',
                   'returnType', 'type', 'parameters', 'packageName'];`. It is never read anywhere
                   in the 1,058 lines. The code that actually decides what counts as a critical
                   field is `:1045`, which hardcodes its own, different, three-element list inline.
                   So the file contains two definitions of "critical field", one authoritative and
                   one inert, and the inert one is the longer and more plausible-looking of the two.
                   This is also the reason `run-tests.ts:6`'s header claim about validating "every
                   critical field" reads as true to anyone who greps for the term — see
                   `P64-D8-001`.
failure_scenario:  A maintainer extends the critical-field set by editing `:659`, which is the
                   obvious place and the only place the phrase is defined as a list. Nothing
                   changes: the report still passes and the exit code is still decided by the three
                   hardcoded names at `:1045`. The edit is silently inert, and the reviewer of that
                   change has no signal that it did nothing.
classification:    major — (1) at most one file: PASS. (2) no public API change: PASS. (3) adds or
                   upgrades no dependency: PASS. (4) regression-testable with the existing harness:
                   FAIL, for the same reasons as `P64-D4-001`. (5) reviewer can name the exact edit:
                   PASS — either delete `:659` or make `:1045` derive its list from it. (6) severity
                   is neither critical nor high AND primary dimension is not D1: PASS. One test
                   fails, so `major`. Recorded rather than waved through as trivial precisely
                   because the trivial reading is what leaves the inert definition in place.
effort:            2
dedup:             none — the frozen 15-issue snapshot contains no issue about the interop harness
                   or dead code anywhere in the repository.
disposition:       major-refactor — small edit, `major` by INVENTORY 3c test (4); it does not enter
                   Phase 67's `easy` apply path without a `MAJOR-REFACTORS.md` record first.
```

```
id:                P64-D5-001
unit:              RU-64-03
location:          bbj-vscode/tools/interop-test-harness/run-tests.ts:1-1058
dimension:         D5
secondary:         none
severity:          medium
evidence_tier:     inherited
evidence:          Resolves to `trace`, because what this record asserts is a missing test rather
                   than a runtime behaviour, and the absence was established by enumeration with
                   each command's output recorded. `find bbj-vscode/tools -name '*.test.ts' -o -name
                   '*.spec.ts' | wc -l` prints `0`. A repository-wide grep for `run-tests` and
                   `interop-test-harness`, excluding `node_modules/` and `.planning/`, returns only
                   `.gitignore:22` (ignoring the harness's own `report.html` output) and the file's
                   usage comment at `:11-13`. None of the 15 `bbj-vscode/package.json` scripts
                   invokes it. `tsconfig.json` includes `src/**/*.ts` only and `tsconfig.test.json`
                   includes `test/**/*` only, so `npm run build` never type-checks it; `npm run
                   lint` is `eslint src test`, so ESLint never sees it. Its one documented
                   invocation, `npx tsx tools/interop-test-harness/run-tests.ts` (`:9-13`), appears
                   in no script, no workflow and no project document, and is not even reachable
                   offline because `tsx` is undeclared and absent from `node_modules/` (see
                   `P64-D6-001`). `.github/workflows/pr-validation.yml:11` lists
                   `bbj-vscode/tools/**` among its `paths:` filters, so this tree is a CI *trigger*
                   while being the subject of nothing CI runs. The three `.bbj` scripts have no
                   surface at all: `example-files.test.ts:14-17` auto-parses only what is under
                   `bbj-vscode/test/test-data/`.
                   Already-owned debt is cross-referenced, not re-recorded (D-15): the 11
                   known-failing `linking.test.ts` tests belong to `RU-61-06` by INVENTORY's routing
                   table, and the 3 disabled `parser.test.ts` assertions to DEBT-02. Neither is
                   restated in this record.
failure_scenario:  Someone edits `run-tests.ts` — to add a case, to change an assertion, or to fix
                   `P64-D2-001` — and opens a pull request. `pr-validation.yml` fires because the
                   path filter matches, builds both projects, and passes. No type-checker has read
                   the change, no linter has read it, no test has run it, and the only thing that
                   would have exercised it is a manual `npx tsx` invocation that requires a live npm
                   registry and a running java-interop peer on port 5008. A syntax-valid but
                   semantically broken harness therefore merges green, and the breakage surfaces
                   only the next time a human runs the harness by hand — which, as this record
                   establishes, nothing in the project schedules or reminds anyone to do.
classification:    major — (1) at most one file: FAIL, closing this means changing tsconfig or lint
                   scope, adding a test entry point, and probably a `package.json` script. (2) no
                   public API change: PASS. (3) adds or upgrades no dependency: FAIL, running the
                   harness at all requires declaring `tsx`. (4) regression-testable with the
                   existing harness: FAIL by definition — the gap *is* the absence of that harness
                   for this tree. (5) reviewer can name the exact edit: FAIL, the scope of what to
                   bring under test is a decision, not an edit. (6) severity is neither critical nor
                   high AND primary dimension is not D1: PASS. Four tests fail.
effort:            8
dedup:             none — the frozen 15-issue snapshot contains no issue about test coverage, CI
                   scope, lint scope, or the interop harness.
disposition:       major-refactor — recorded for Phase 68's document split and Phase 69's filing.
                   Distinct from DEBT-02 (disabled `parser.test.ts` assertions) and from
                   `RU-61-06`'s failing `linking.test.ts` tests, both of which concern tests that
                   exist; this record concerns a tree that has none.
```

```
id:                P64-D8-001
unit:              RU-64-03
location:          bbj-vscode/tools/interop-test-harness/run-tests.ts:2-14
dimension:         D8
secondary:         [D4]
severity:          low
evidence_tier:     trace
evidence:          Written trace against the code beneath the comment; both dimensions this record
                   touches are `trace`-tier, so the adjacency rule leaves the bar at `trace`. Two
                   claims in the same header block do not match the code. (a) `:6` states the
                   harness "validates every critical field the LS depends on". The file defines
                   "critical field" twice: an eight-element list at `:659`
                   (`isStatic`, `isDeprecated`, `constructors`, `name`, `returnType`, `type`,
                   `parameters`, `packageName`) which `grep -n 'criticalFields'` shows is never read
                   (see `P64-D4-002`), and the gate that actually runs, at `:1045`, which hardcodes
                   `['isStatic', 'isDeprecated', 'constructors']` — three of the eight. The other
                   five are collected into `fieldChecks` and displayed in the report, but a missing
                   `name`, `returnType`, `type`, `parameters` or `packageName` never makes the
                   harness fail. (b) `:9-13` documents exactly three options — `--host`, `--port`,
                   `--output` — while `parseArgs` at `:30-38` accepts a fourth, `--timeout`, under
                   `strict: true`, with a `15000` default that `main` echoes back to the user at
                   `:987`. Every other comment in the four readable files was checked against its
                   code and found accurate; those checks are recorded in this unit's D8 cell line
                   rather than duplicated here.
failure_scenario:  A maintainer diagnosing an interop regression reads `:6`, concludes that a green
                   run means every critical field the language server depends on is present, and
                   stops looking. In fact a response missing `returnType` on every method — a field
                   the LS does depend on, and one the harness explicitly checks for at `:206` —
                   produces a green exit code, because `:1045` does not include it in the gate. The
                   report does show the failed field check, but the header's claim is what tells the
                   reader whether the report needs reading at all. Separately, a maintainer whose
                   run times out against a slow peer reads `:9-13`, sees no timeout option, and
                   concludes the 15-second limit is not adjustable, when `--timeout` has worked all
                   along.
classification:    major — (1) at most one file: PASS. (2) no public API change: PASS. (3) adds or
                   upgrades no dependency: PASS. (4) regression-testable with the existing harness:
                   FAIL — `tools/` is outside every test, type-check and lint boundary, as recorded
                   under `P64-D5-001`. (5) reviewer can name the exact edit: PASS — correct the
                   claim at `:6` to name the three fields the gate enforces (or widen the gate to
                   match the claim), and add `--timeout` to `:9-13`. (6) severity is neither
                   critical nor high AND primary dimension is not D1: PASS. **Which reading was
                   applied, and why:** a D8 fix that changes only comment text changes no runtime
                   behaviour and can be `easy` when the other five tests pass. Here test (4) fails
                   regardless of how the fix is written, because nothing in this repository can
                   regression-test anything under `tools/`. One test fails, so `major` — the `easy`
                   reading was considered and rejected for a stated reason rather than assumed.
effort:            2
dedup:             none — the frozen 15-issue snapshot contains no issue about documentation
                   accuracy in the interop harness or anywhere under `bbj-vscode/tools/`.
disposition:       major-refactor — recorded; the widen-the-gate variant of the fix would change
                   runtime behaviour and belongs with `P64-D4-002`, so the two are best resolved
                   together.
```

### Not-reproducible dispositions

Two candidate claims were raised during Task 1's sweep and neither clears its tier. Both are written here with the tier they failed and why, per RVW-06's drop-vs-disposition rule, rather than being silently dropped.

1. **Tier failed: `repro` (D2).** Candidate claim: `em-login.bbj` cannot report anything to its caller when invoked with fewer than three arguments. `:12` reads the output path as `ARGV(3,err=*next)`, so a two-argument invocation branches past the assignment and leaves `outputFile!` unset; the guarded writes at `:17`, `:24`, `:41` and `:48` then all target that unset value, which would make every one of the script's four exit paths — including both error paths — unable to write anything at all, leaving the caller unable to distinguish an authentication failure from a harness that never started. **Reason not recorded as a finding:** confirming what `ARGV(n,err=*next)` leaves in the variable on a missing argument, and what `open(ch,mode="O_CREATE,O_TRUNC")` does when handed an unset string, requires executing BBj. No BBj interpreter exists in this checkout, and running one would be a tree-touching action this phase does not take. The control-flow shape is verifiable; the runtime semantics it depends on are not, and asserting them would be exactly the plausible-but-false claim this standard exists to prevent. Left visible for a reviewer with a BBj installation to settle.
2. **Tier failed: `repro` (D2). Inherited from `62-COVERAGE.md:1833`.** Candidate claim: `document-formatter.ts` supplies `BBjCFCli.jar` with **both** an input path (`-i document.uri.fsPath`, `:19-20`) and the live unsaved buffer on stdin (`:82`), so if the JAR's `-i` flag takes precedence over stdin, an unsaved edit would be formatted against stale on-disk content. **Reason not recorded as a finding:** settling which input the JAR honours requires reading its bytecode or running it with divergent `-i`-path and stdin content, and D-11 prohibits both. The manifest cannot settle it either — `BBjCFCli.jar`'s manifest is six header lines (`Manifest-Version`, `Ant-Version`, `Created-By`, `Class-Path`, `X-COMMENT`, `Main-Class`) and carries no usage or argument metadata whatsoever, which was checked before disposing of it rather than assumed. **Disposition: not-reproducible**, carried forward as an open question in `### Vendored Binary Provenance` fact (5) rather than answered by assertion. Phase 62 deferred it here; Phase 64 states plainly that its own method cannot answer it, which is the honest end of that deferral rather than a silent drop.

### Cross-unit referrals

1. **→ `RU-64-02` (plan `64-03`), D6.** `P64-D6-001`'s defect lives at `run-tests.ts:1,11-13`, but the file its fix edits — `bbj-vscode/package.json` — is `RU-64-02`'s for every dimension. Referred so `64-03`'s `### SEC-08 Dependency Triage` sees an undeclared tool dependency that no `npm audit` run over the declared tree can surface, and can state whether its own npm enumeration confirms the absence independently.
2. **→ `RU-64-01` (plan `64-02`), D6/SEC-07.** Whether this repository's dependency automation could ever see the three vendored JARs. What `RU-64-03` establishes and hands over: the three artifacts are `.jar` files under `bbj-vscode/tools/formatter/`, none is declared in any manifest or lockfile, and `.github/dependabot.yml` declares the npm ecosystem for `/bbj-vscode`. The conclusion that follows is `RU-64-01`'s to draw against the file itself, which plan `64-02` owns; stated here as a boundary rather than pre-empted.
3. **→ Phase 65, SEC-04 and SEC-05.** `P64-D1-002` is one leg of the EM token lifecycle (acquisition and validation via `em-login.bbj` and `em-validate-token.bbj`) and touches process spawning. Phase 65 owns the end-to-end synthesis across `BbjEMTokenStore` and both IDEs' launch paths; this unit supplies its leg with full evidence and does not attempt the lifecycle. Recorded as a referral rather than a ledger row, since Phase 65 is a cross-cutting audit and not a sweep unit.

### Unit closure

**`RU-64-03` is closed against the four-part stopping rule, part by part.**

**(i) Every live cell it owns carries a verdict plus a written check line.** Seven live unit-row cells — D1 `fail`, D2 `fail`, D3 `pass`, D4 `fail`, D5 `fail`, D6 `fail`, D8 `fail` — and six live file-exception cells across the three JAR rows: D1 `fail` on each of `tools/formatter/BBjCFCli.jar`, `tools/formatter/lib/BBjCodeFomatter.jar` and `tools/formatter/lib/jcommander-1.71.jar`, and D6 `pass`, `fail`, `pass` on the same three in that order. Thirteen live cells, thirteen verdicts, thirteen written check lines naming the concrete checks applied and phrased against each dimension's own REQUIREMENTS.md wording. No cell in this unit carries the `pending` placeholder.

**(ii) Coverage is file-granular.** All seven files of the unit are named inside this section — `web.bbj`, `em-login.bbj`, `em-validate-token.bbj` and `run-tests.ts` in check lines and in finding `location:` anchors, and `BBjCFCli.jar`, `BBjCodeFomatter.jar` and `jcommander-1.71.jar` in their own file-exception cell lines, in `### Vendored Binary Provenance` and in the `location:` fields of `P64-D1-003` and `P64-D6-002`.

**(iii) Every candidate claim raised is either a finding or a written disposition.** Twelve findings recorded — `P64-D1-001`, `P64-D1-002`, `P64-D1-003`, `P64-D2-001`, `P64-D2-002`, `P64-D2-003`, `P64-D4-001`, `P64-D4-002`, `P64-D5-001`, `P64-D6-001`, `P64-D6-002`, `P64-D8-001` — each with a `path:line` anchor, a primary dimension, evidence clearing its tier, a verified failure scenario and a non-blank `dedup:`; both D6 findings carry `triage:` alongside `classification:` per D-09. Two claims did not clear their tier and are written under `### Not-reproducible dispositions` with the tier they failed and why, rather than being silently dropped. Several further observations — the `.bbj` output-idiom duplication, the missing `use` statement in `web.bbj`, the `em-login.bbj:1` header imprecision, the latent division at `run-tests.ts:966-968`, and `CLAUDE.md:92`'s incomplete run-tool list — are recorded inside their dimension's check line as observations, deliberately not inflated into findings; `CLAUDE.md`'s in particular names **`RU-D8-01`** as the row that owns it, because no Phase 64 plan may allocate a finding in that file (D-18). The `### Cross-unit referrals` sub-block holds three entries and is **not** empty; the `### Not-reproducible dispositions` sub-block holds two and is **not** empty.

**(iv) Every inherited item addressed to this unit carries a written disposition.** Both of the Phase 62 body-level deferrals are dispositioned, by their own line anchors. **`62-COVERAGE.md:1489`** — the `'java'`-resolved-from-`PATH` provenance boundary, plus Phase 62's note that `jarPath` provenance and pinning are `RU-64-03`'s territory: **dispositioned as addressed, promoted into `### Vendored Binary Provenance` fact (4) and cited inside `P64-D1-003`'s evidence as the runtime half of the same unverified-execution chain**, rather than allocated a second finding against `document-formatter.ts`, which is `RU-62-02`'s file and closed. **`62-COVERAGE.md:1833`** — whether `BBjCFCli.jar` honours its `-i` path argument or its stdin content: **dispositioned as not-reproducible**, with the reason recorded (settling it requires decompiling or executing the JAR, both prohibited by D-11, and the JAR's six-line manifest carries no argument metadata — checked before disposing rather than assumed). Neither is a ledger row, and D-18's arithmetic is unchanged: the inherited-item ledger still holds exactly one row.

**D7 and the absence of parity work, stated so it does not read as an oversight.** This unit's D7 cell and the D7 cell of all three JAR rows are `n/a` under **`R-D7-CI`**, carried forward verbatim. **No cross-IDE parity work of any kind was performed here** — `bbj-intellij/` was opened only as read-only context for two specific facts (that `build.gradle.kts:100-107` and `:123-128` copy the three `.bbj` scripts, used for the D8 `CLAUDE.md` observation and the D4 coupling observation), never as a comparison surface, and no `P64-D7-*` ID exists anywhere in this phase.

Once (i)-(iv) hold the unit is done and no further reading is licensed. **`RU-64-03` is complete.**

## RU-64-01 — GitHub Actions workflows

**Files (7 / 587 lines):**
- `.github/workflows/build.yml` (45)
- `.github/workflows/deploy-docs.yml` (62)
- `.github/workflows/manual-release.yml` (186)
- `.github/workflows/preview.yml` (109)
- `.github/workflows/pr-validation.yml` (61)
- `.github/workflows/pr-vsix.yml` (105)
- `.github/dependabot.yml` (19) — **adopted into this unit by D-19**; present in the tree but absent from INVENTORY's file list and contradicted by INVENTORY's own `.github/` accounting

**Risk rank:** 2 of 3 Phase 64 units — the entire SEC-07 surface: secret handling, `GITHUB_TOKEN` permission scope, unpinned third-party actions, and script injection via untrusted PR-controlled inputs.
**Sweep method:** full read, plus `.github/dependabot.yml`, adopted by D-19.
**Owning plan:** 64-02.

### Cells
- D1 Security — fail — Checked against REQUIREMENTS.md's D1 wording (injection, untrusted input, secret exposure, integrity gaps, privilege/trust-boundary errors) over all six workflows and `.github/dependabot.yml`, at tier `repro` satisfied by trace per D-12 — GitHub Actions cannot be executed in this checkout, so every statement below names a file and line, the trigger that reaches it, the untrusted input that flows in and the sink it reaches, and nothing here claims a workflow was run, dispatched or exploited. **(a) Triggers, and which ref supplies the definition versus the code.** `build.yml:3-9` `push`→`typefox-dev` plus `pull_request`→`main` with no path filter; `deploy-docs.yml:3-10` `push`→`main` (paths `documentation/**` and the workflow itself) plus `workflow_dispatch`; `manual-release.yml:4-9` `workflow_dispatch` only, with one required `version` input; `preview.yml:4-8` `push`→`main` plus `workflow_dispatch`; `pr-validation.yml:4-13` `pull_request`→`main` behind five path globs; `pr-vsix.yml:12-17` `pull_request`→`main` behind `bbj-vscode/**` and the workflow itself. For all three `pull_request` workflows GitHub reads the workflow **definition** from the base branch, so a contributor cannot alter the definition their PR runs under — `pr-vsix.yml:8-9` states exactly that in a comment and the comment is accurate. `build.yml:18` and `pr-validation.yml:20,45` check out with no `ref:`, i.e. the PR **merge** ref; `pr-vsix.yml:36-39` checks out `github.event.pull_request.head.sha`, the un-merged PR **head**. In all three the job then executes contributor-controlled code (`npm ci`, which runs `bbj-vscode/package.json`'s `prepare` lifecycle script, then `npm run build`, `npm run test`, `npx vsce package` or `./gradlew buildPlugin`); that is the accepted `pull_request` model and is recorded as the boundary it is rather than as a finding, because none of those three workflows references a secret and GitHub forces a read-only token for fork PRs. **(b) Every `github`-context expression that reaches a shell or an action input.** The complete set in the tree: `pr-vsix.yml:21,60,69` — `github.event.pull_request.number`, a GitHub-generated integer that no contributor can set, and `:60` is the only one of the three that lands inside a `run:` string; `pr-vsix.yml:80-82` — `toJSON(...)` of two step outputs into `actions/github-script`, the documented-safe encoding, in a step gated to same-repository PRs at `:76`; `manual-release.yml:15,127,133,137` and `preview.yml:100,107` — `needs.<job>.outputs.version`; and `deploy-docs.yml:56` — `steps.deployment.outputs.page_url`, consumed by an `environment.url` field and not by a shell. `manual-release.yml:127,133` interpolate the `workflow_dispatch` `version` input straight into a `run:` shell block, which is a genuine sink, but it is not reachable with an unvalidated value: both live in `build-intellij`, which declares `needs: build-vscode` at `:108`, and `build-vscode` exits 1 at `:48-51` unless the value matches the anchored regex `^[0-9]+\.[0-9]+\.[0]+$`. Per D-12 a sink with no reachable trigger is recorded as this note, not as a finding. The same file passes that input through `env:` at `:38-39`, `:63-64` and `:71-73` — the correct pattern, used in three of five places. **(c) Fork reachability of secret-handling jobs.** No workflow that references a secret is reachable from a `pull_request` event at all: `manual-release.yml` is `workflow_dispatch`-only and `preview.yml` is `push`→`main` plus dispatch, both of which require write access. `pr-vsix.yml:76` additionally gates its only privileged step to `github.event.pull_request.head.repo.full_name == github.repository`; what that guards is the `pull-requests: write` comment API call, what it does not guard is the install, build, test and package steps at `:46-72`, which run fork code by design and hold no secret. **(d) The three secrets in play.** `secrets.VSCE_PAT` is bound through `env:` at `preview.yml:64-65` and `manual-release.yml:86-87` and consumed unquoted as `-p $VSCE_PAT` at `:68` and `:90`; `secrets.JETBRAINS_MARKETPLACE_TOKEN` is interpolated directly into the `run:` command line at `preview.yml:102` and `manual-release.yml:137` — recorded as `P64-D1-004`; `secrets.GITHUB_TOKEN` is named only at `manual-release.yml:72,132,169`, each through `env:`. Nothing echoes a secret to stdout, no `set -x` is enabled in any `run:` block, and no secret reaches an artifact-upload path or a third-party action's `with:` input. **(e) Artifact paths.** `preview.yml:70-75`, `pr-validation.yml:33-38` and `manual-release.yml:92-97` upload `bbj-vscode/out/language/main.cjs`, which `preview.yml:84-88`, `pr-validation.yml:47-51` and `manual-release.yml:113-117` download into a sibling job that builds and — in `preview.yml` and `manual-release.yml` — publishes it; every one of those flows stays inside a single workflow run, so nothing built by a fork-triggered run is ever consumed by a privileged one. **(f) `pull_request_target` — absent, recorded as an explicit positive.** `grep -rn 'pull_request_target' .github/workflows/` produces no output and exits 1: the single highest-severity GitHub Actions attack pattern is not present in this repository. That is checked-and-clean, not unchecked, and it is stated here so a reader can tell the difference. **Privilege scope:** four of the six workflows declare no `permissions:` block anywhere — recorded as `P64-D1-005`. **Observation, deliberately not promoted:** `pr-vsix.yml:57-62` builds `$OUT` from the `name` and `version` fields of the PR head's own `package.json` and appends it to `$GITHUB_OUTPUT`, so a multi-line value would be an output-injection sink; its only fork-reachable consumer is the `path:` action input at `:70`, and a fork PR already controls the entire workspace, so the sink reaches nothing the contributor does not already own, while the `github-script` consumer at `:80-82` is both `toJSON`-encoded and same-repository-gated. Whether the runner's `$GITHUB_OUTPUT` parser would accept such a value at all is recorded under `### Not-reproducible dispositions` rather than asserted.
- D2 Correctness & error handling — fail — Checked against wrong edge-case behaviour, swallowed failures and resource leaks read into workflow terms, at tier `repro` satisfied by trace. **A verification step that silently does not run:** `pr-validation.yml:8-13` gates the repository's only cross-IDE build check on five path globs, and the second of them, `bbj-vscode/out/language/**`, can never match — `bbj-vscode/.gitignore:1` is the line `/out/` and `git ls-files bbj-vscode/out` returns zero tracked files, while the source that artefact is built from, `bbj-vscode/src/language/**` (53 tracked files), appears nowhere in the list. Recorded as `P64-D2-004`. **Failures that are not swallowed:** no workflow uses `continue-on-error` anywhere, no `run:` block masks an exit code behind a pipeline, and the one conditional that could mask a failure — `build.yml:30` `if: success() || failure()` — deliberately runs the test step after a failed build without suppressing its own exit code, which is correct rather than defective. **Half-published state:** both release workflows write durable state before publishing and then publish to two marketplaces from separate jobs with no rollback. `manual-release.yml:69-82` pushes `main` and the `v$VERSION` tag before `:84-90` publishes to the VS Code Marketplace, `:135-137` publishes to JetBrains from a second job, and `:167-186` creates the GitHub release from a third; `preview.yml:53-60` pushes the version bump before `:62-68` publishes and `:96-102` publishes to JetBrains from a second job. A failure at any later step leaves a tag and a bumped `package.json` on `main` describing a release that does not exist, wholly or in part. Recorded as `P64-D2-005`. **What each workflow does when an input it reads is empty or absent:** an empty `VSCE_PAT` reaches `npx vsce publish -p $VSCE_PAT` unquoted, so `-p` consumes the next token — there is none — and vsce exits non-zero; an empty `JETBRAINS_MARKETPLACE_TOKEN` becomes an empty Gradle property and `publishPlugin` fails at the marketplace API; `secrets.GITHUB_TOKEN` is auto-provisioned and cannot be empty, only insufficiently scoped, which also fails at the call. All three therefore fail **closed** — but none is checked before the tag and the version commit have already been pushed, which is why the empty case is a consequence of `P64-D2-005` rather than a separate defect. `manual-release.yml:6-9` declares its `version` input `required: true` with no default, so a dispatch cannot omit it. **Recomputation versus single computation:** the release version is computed once and threaded through job outputs in `manual-release.yml:14-15` → `:127,133,137` and `preview.yml:13-14,51` → `:100,107`, which is the correct shape; `preview.yml:38-47` instead recomputes the patch number from `package.json` on every run, and with no concurrency guard two pushes to `main` in quick succession compute the same value, whereupon one run's `git push` at `:60` is rejected as non-fast-forward and that run publishes nothing. Recorded as `P64-D2-006`. **Concurrency and cancellation, and what a cancelled run leaves behind:** only `deploy-docs.yml:17-19` (`group: pages`, `cancel-in-progress: false` — queues rather than cancels, correct for a deployment) and `pr-vsix.yml:20-22` (`group: pr-vsix-<PR number>`, `cancel-in-progress: true` — cancels a superseded PR build, which publishes nothing and so leaves nothing behind) declare a group at all; `build.yml`, `pr-validation.yml`, `preview.yml` and `manual-release.yml` declare none, so for the two publishing workflows two runs can overlap, and a run cancelled between `preview.yml:60`'s push and `:68`'s publish leaves exactly the half-published state above. **Observations, deliberately not promoted to findings:** `manual-release.yml:47-48`'s comment says `x.y.0` while its regex `^[0-9]+\.[0-9]+\.[0]+$` also accepts `1.2.00`; `preview.yml:39` splits the version with an unquoted `${VERSION//./ }` array expansion and `:41-47` silently drops a fourth version component; and only `build.yml:15` and `pr-vsix.yml:34` set `timeout-minutes`, so a hung job in the other four runs to the platform default. All three are reachable only from values that already live on `main` or from infrastructure, and none is promoted on volume alone.
- D3 Performance & resource use — fail — Checked against redundant work, missing caches and unbounded growth, at tier `repro` satisfied by trace. **Caching:** exactly one of the six workflows configures a dependency cache — `deploy-docs.yml:29-34`, with `cache: npm` and `cache-dependency-path: documentation/package-lock.json`, which is the correct key for what it caches. The five `npm ci` invocations against `bbj-vscode` (`build.yml:27`, `pr-validation.yml:30`, `pr-vsix.yml:49`, `preview.yml:32`, `manual-release.yml:34`) configure none, and none of the three `actions/setup-java@v4` steps (`pr-validation.yml:53-57`, `preview.yml:90-94`, `manual-release.yml:119-123`) sets `cache: gradle`, so every Gradle build resolves its dependencies cold as well. The cost is larger than a download, because `bbj-vscode/package.json`'s `prepare` lifecycle script runs `langium:generate && build` on every `npm ci`, so each uncached run repeats a full grammar regeneration and bundle. Recorded as `P64-D3-001`. **The same build performed more than once for the same commit:** `build.yml:3-9` declares no `paths:` filter, so every pull request to `main` — including one touching only `documentation/`, `QA/` or `.planning/` — runs a full install, build, vitest suite and `npx vsce package`; and any PR touching `bbj-vscode/**` additionally runs the near-identical install, build and test sequence in `pr-vsix.yml:46-51`, giving two cold installs and two complete test runs of one commit. Recorded as `P64-D3-002`. **Superseded runs:** `build.yml` and `pr-validation.yml` declare no `concurrency:` group, so a branch pushed three times in a minute leaves three full builds running to completion; `pr-vsix.yml:20-22` is the only workflow that cancels its own superseded runs. **Retention and unbounded growth:** `build.yml:40-45` is the only artifact upload in the repository with no `retention-days`, so its `.vsix` inherits the repository-wide default while every other upload states one explicitly — 1 day at `pr-validation.yml:38` and `manual-release.yml:97,104,144`, 7 at `preview.yml:75,108`, 14 at `pr-vsix.yml:71`. It is one small artifact per pull request, so this is recorded here as a latent cost rather than promoted to a finding, on the rule that a cost is not promoted on volume alone. No `strategy: matrix` is declared in any of the six files, so matrix breadth contributes nothing. **What is already right:** every job pins `runs-on: ubuntu-latest`, no workflow polls, sleeps or retries, `deploy-docs.yml:7-9` and `pr-vsix.yml:15-17` both scope themselves with `paths:` filters so they do not run on irrelevant changes, and `pr-validation.yml:16-42` splits the Node and Java halves into two jobs so the second reuses the first's artefact instead of rebuilding it.
- D4 Maintainability & code smells — fail — Checked against REQUIREMENTS.md's D4 wording — duplication, god functions, dead code, tangled coupling, inconsistent patterns and missing abstractions — read into workflow terms, at tier `trace`, with a mechanical basis stated wherever one exists. **Duplication with no abstraction:** five of the six workflows perform the same checkout → Node setup → `npm ci` → build preamble against `bbj-vscode` (`build.yml:17-28`, `pr-validation.yml:20-31`, `pr-vsix.yml:36-51`, `preview.yml:17-32`, `manual-release.yml:18-34`), and three of them repeat a second common sequence — download the `language-server` artifact, `actions/setup-java@v4` with `temurin`/`17`, then a `./gradlew` invocation in `bbj-intellij` (`pr-validation.yml:47-61`, `preview.yml:84-102`, `manual-release.yml:113-137`). Neither is factored into a composite action under `.github/actions/` or a reusable workflow; `ls .github/` returns exactly `dependabot.yml` and `workflows`, so no such directory exists. A twelve-line version-bump-commit-and-push procedure is likewise duplicated in full between `preview.yml:34-60` and `manual-release.yml:61-82`. Recorded as `P64-D4-003`. **Inconsistent conventions, all six axes measured rather than asserted:** the five preambles disagree on step indentation (`build.yml:17` indents steps 4 spaces, the other five use 6), on directory handling (`grep -n 'working-directory:'` returns 20 hits across five files while `build.yml:26,33,38` alone uses `cd bbj-vscode` inside `run:`), on shell declaration (`grep -n 'shell:'` returns three hits, all in `build.yml`), on action major version (`build.yml:18,20` on `@v3`, everything else on `@v4` — `P64-D6-004`), on caching (only `deploy-docs.yml:29-34` — `P64-D3-001`), and on step naming for the identical step ("Use Node.js" at `build.yml:19`, "Setup Node.js" at `deploy-docs.yml:29`, "Set up Node" at the other three). Checkout is written as a bare `- uses:` in six places and as a named step in three. **Dead configuration:** `build.yml:4-6` triggers on `push` to a branch `typefox-dev` that exists in none of this repository's 20 remote branches (`git branch -r | grep -ci typefox` prints `0`), so half of that workflow's trigger surface can never fire. Recorded as `P64-D4-004`. A second dead-configuration candidate is `pr-validation.yml:10`'s unmatched `bbj-vscode/out/language/**` glob, which is recorded under D2 as `P64-D2-004` because its consequence is a skipped verification rather than clutter; and a third, `manual-release.yml:72`'s possibly-vestigial `GITHUB_TOKEN` binding, could not be settled at this tier and is written under `### Not-reproducible dispositions`. **Long inline shell where a checked-in script would be clearer:** `preview.yml:37-51` is fifteen lines of version arithmetic and `manual-release.yml:40-59` is twenty lines of validation, both inline, both untestable outside a workflow run, and both duplicating logic the other performs differently. **Configuration agreeing with the tree:** `.github/dependabot.yml` names one directory, `/bbj-vscode`, while the workflows in the same directory build three — `bbj-vscode`, `bbj-intellij` and `documentation` — so the two halves of `.github/` do not agree about which trees this project has; that disagreement is recorded once as `P64-D6-005` and is not double-counted here. **Where duplication is unavoidable and is therefore not recorded as a defect:** each job runs on a fresh runner, so a checkout and a toolchain setup must appear in every job that needs them; that is the Actions execution model, not a smell. What is avoidable is that the *contents* of those repeated blocks differ, and that no composite action exists to make them identical. **Also noted without promotion:** `build.yml:41-42` carries trailing whitespace on two lines, and `pr-validation.yml`'s two jobs are the only ones in the repository with no display `name:`, so they appear in the checks list by job id.
- D5 Test coverage gaps — n/a — R-D5-CI — "Workflow YAML orchestrates test execution but is not itself unit-testable code; test-coverage gaps are recorded against the code the workflow runs, not the workflow file itself."
- D6 Dependency health — fail — Checked against REQUIREMENTS.md's D6 wording — outdated or vulnerable dependencies, license issues and **unpinned GitHub Actions**, which that wording names explicitly — at tier `inherited` resolving to repro-equivalent, over the six workflows' action references and over `.github/dependabot.yml`, this unit's seventh file. **Pinning, enumerated rather than asserted.** `grep -h 'uses:' .github/workflows/*.yml | wc -l` prints `36`, agreeing with the count scouted at discussion time, and `grep -c 'uses:' .github/workflows/*.yml` prints the same distribution: `build.yml` 3, `deploy-docs.yml` 5, `pr-vsix.yml` 4, `manual-release.yml` 11, `pr-validation.yml` 6, `preview.yml` 7. `grep -nE 'uses:.*@[0-9a-f]{40}' .github/workflows/*.yml | wc -l` prints `0`: **not one of the 36 is pinned to a commit SHA.** All 36 are pinned to a mutable major-version tag and none floats on a branch, across 9 distinct actions and 11 distinct `action@ref` pairs — `actions/checkout@v4` ×9, `actions/upload-artifact@v4` ×8, `actions/setup-node@v4` ×5, `actions/download-artifact@v4` ×5, `actions/setup-java@v4` ×3, and one each of `actions/configure-pages@v4`, `actions/deploy-pages@v4`, `actions/upload-pages-artifact@v3`, `actions/github-script@v7`, `actions/checkout@v3` and `actions/setup-node@v3`, summing to 36. The security consequence per class, one sentence each: a **commit-SHA** reference executes exactly the bytes that were reviewed and cannot change without an edit to this repository; a **mutable tag** executes whatever the tag points at when the job starts, so a compromised or re-pointed release changes what runs with no repository change and no reviewable diff; a **branch or floating** reference is strictly worse than a tag and does not occur here. All 36 resolve to the first-party `actions/` organisation, which materially lowers the likelihood without removing the class. Recorded as `P64-D6-003`. The highest-privilege combination of a mutable reference and a real secret is `preview.yml:71,105` and `manual-release.yml:93,100,140` — five `actions/upload-artifact@v4` steps sitting inside the same jobs that hold `secrets.VSCE_PAT` and `secrets.JETBRAINS_MARKETPLACE_TOKEN`. **Outdated:** `build.yml:18,20` still reference `actions/checkout@v3` and `actions/setup-node@v3`, one major behind the `@v4` line every other workflow uses; recorded as `P64-D6-004`. Recorded as an observation rather than promoted: `manual-release.yml:29` performs an unpinned `npm install -g semver` inside the release job, which is third-party code fetched at release time, though no secret is bound to that step's environment and the two publishing credentials are scoped to their own steps at `:87` and `:137`. **`.github/dependabot.yml` (adopted into this unit by D-19).** 19 lines, 881 bytes, committed as `be402d6`. It configures `version: 2` and exactly one `updates:` entry — `package-ecosystem: "npm"`, `directory: "/bbj-vscode"`, `schedule: interval: "weekly"` (`:2-7`). There is **no `gradle` entry**, so `bbj-intellij`'s dependency tree receives no automated update coverage at all; there is likewise no entry for `documentation/`, whose 685,194-byte `package-lock.json` `deploy-docs.yml:36-38` installs and builds on every docs change, and none for `github-actions`, whose absence is the direct cause of `build.yml`'s stale `@v3` references above. Three of this repository's four dependency trees are therefore uncovered by the milestone's only dependency-automation config; recorded as `P64-D6-005`. The observable output agrees with the config rather than contradicting it: `git branch -r` lists five open `dependabot/npm_and_yarn/bbj-vscode/*` branches (`concurrently`, `eslint`, `properties-file`, `types/node`, `typescript-eslint`) and none for gradle, github-actions or `documentation/`. The Gradle half of this gap is referred to `RU-64-02`/D6 in plan `64-03`, which under D-10 establishes that the same tree cannot even be enumerated locally; the composed unscanned-and-unenumerable result belongs there and is not pre-empted here. **The two `ignore:` entries are well-reasoned and are recorded as such, not as defects** — they are the model of what `triage: accepted-with-reason` requires under D-09, because each names the code path that would break and cites the pull request that established it, rather than resting on a bare not-shipped claim, and both were checked mechanically against the tree rather than taken on trust. `chevrotain` (`:8-13`, PR #347): `bbj-vscode/package.json:671` declares `chevrotain: ~12.0.0`, and `bbj-vscode/package-lock.json:4619-4626` shows `langium@4.3.1` depending on `chevrotain: ~12.0.0` — the pin matches Langium's own constraint exactly, so bumping it independently is precisely the grammar-generation break the comment describes. `typescript` majors (`:14-19`, PR #397): `bbj-vscode/package-lock.json:1826,1857,1881,1941` records typescript-eslint's peer requirement as the literal `">=4.8.4 <6.1.0"`, exactly the range the comment cites, so a TypeScript 6 major would put the declared `typescript-eslint: ^8.64.0` (`bbj-vscode/package.json:689`) outside its supported range. Both entries are correct, both are narrowly scoped — the TypeScript one blocks only `version-update:semver-major` and still allows 5.x — and neither is a finding.
- D7 Cross-IDE parity — n/a — R-D7-CI — "This surface governs build/CI/packaging output, not end-user-observable IDE runtime behavior; there is no parity claim to make between two IDEs about a shared build pipeline or a shared vendored tool invoked identically by both."
- D8 Comment & doc accuracy — fail — Checked against REQUIREMENTS.md's D8 wording — stale comments and claims contradicted by what the files actually do — at tier `trace`, over every comment, workflow `name:`, job name and input description in the seven files, plus INVENTORY's own accounting of `.github/`. **Every comment in the seven files was read against the YAML beneath it, and the great majority are accurate — stated as a positive so a reader can tell checked-and-clean from unchecked.** `pr-vsix.yml:8-9`'s load-bearing claim that "for `pull_request`, GitHub runs the workflow definition from the BASE branch, so this file only takes effect for PRs opened AFTER it is merged to main" is correct and is exactly the fact D1's check (a) independently tested; `:19` ("Cancel superseded runs when a PR gets new commits") matches `:20-22`; `:24-25` ("Least privilege: read the code, write the PR comment. (For fork PRs GitHub forces a read-only token, so the comment step below is gated to same-repo PRs.)") matches `:26-28` and the guard at `:76` exactly; `:44` and `preview.yml:22` ("langium 4.x/4.3 toolchain requires Node 22+") match `langium@4.3.1` at `bbj-vscode/package-lock.json:4620` and `node-version: 22` beneath each; `:50` ("produces out/extension.cjs (the packaged `main`)") matches `bbj-vscode/package.json:651` `"main": "./out/extension.cjs"` and `bbj-vscode/esbuild.mjs:8-9`; `:75` matches `:76`. `preview.yml:28` and `manual-release.yml:30` ("vsce comes from bbj-vscode devDependencies (npm ci) — `npx vsce` resolves the pinned version") match `"@vscode/vsce": "^3.7.1"` at `bbj-vscode/package.json:670`, which `npm ci` installs at the lockfile-resolved version. `manual-release.yml:8`'s input description ("Version to release (must be higher and end with .0, e.g. 25.12.0)") matches both halves of what `:48` and `:54` actually enforce. `.github/dependabot.yml:9-12` and `:14-17` were verified mechanically against the tree and are accurate — see the D6 cell line for both derivations. The four path-header comments (`manual-release.yml:1`, `preview.yml:1`, `pr-validation.yml:1`, `pr-vsix.yml:1`) each name their own file correctly. **Imprecisions recorded as observations and deliberately not promoted to findings:** `manual-release.yml:47`'s "# Must be in x.y.0 format" describes a regex, `^[0-9]+\.[0-9]+\.[0]+$`, that also accepts `1.2.00`; `preview.yml:30`'s step name "Install deps and build" runs only `npm ci`, which is accurate in effect but only because `bbj-vscode/package.json`'s `prepare` script runs the build as an npm lifecycle hook, a coupling the name does not reveal; and the job id `build-intellij` at `preview.yml:77` and `manual-release.yml:106` names as a build a job whose last step publishes to the JetBrains Marketplace (`preview.yml:96-102`, `manual-release.yml:135-137`), which matters when someone is scanning job names during an incident. None is promoted, because renaming a job id changes the check name any branch protection rule references and is therefore not the free edit it appears to be. **The D-19 drift record.** INVENTORY's Surface Accounting states, in its top-level table at `.planning/reviews/INVENTORY.md:932`, that for `.github/` the disposition is *"`workflows/` → `RU-64-01`; no other content under `.github/` in this tree"*, and its .github/ breakdown table (one level down) at `:967-971` lists exactly one sub-surface, `workflows/` (6 files). Both are contradicted by the tree: `ls -A .github/` prints `dependabot.yml` and `workflows`, and `git log --oneline -1 -- .github/dependabot.yml` prints `be402d6 chore: tell dependabot to ignore TypeScript major bumps (#402)`, so an 881-byte committed, functional configuration file sits beside `workflows/` and belongs to no review unit in INVENTORY's own lists. Recorded as `P64-D8-002`, a D8 finding whose `location:` is `.planning/reviews/INVENTORY.md:932` — **recorded, never edited away**, because Phase 60 D-09 makes INVENTORY immutable and the finding *is* the correction (the same treatment D-08 gives INVENTORY's stale `node_modules/` note on `RU-64-02`'s row). Phase 64 has adopted the file into `RU-64-01` under **D-19**, and the arithmetic of that adoption is stated precisely at the point of the record rather than merged with the other one: this adoption adds **one file** to the file gate and **no cell**, because `dependabot.yml` inherits this unit's row rather than earning a file-exception row of its own. The separate **D-20** adoption of `bbj-intellij/gradle/wrapper/gradle-wrapper.jar` into `RU-64-02` **does** earn a row and so moves both gates; the two together take the file gate from 27 to **29** and leave the cell gate at **29/35/64**. Attributing both movements to one adoption would mis-state which 8 cells came from where. **Where the stale side is not a workflow:** no D8 claim in this unit is located in `CLAUDE.md`, `bbj-vscode/VERBs.md` or `documentation/` — those belong to **`RU-D8-01`**, which no Phase 64 plan may allocate a finding in (D-18) — and nothing in the seven files made such a claim necessary. **Reading applied to the D8 fix:** a change that alters only comment text alters no runtime behaviour and may be `easy` when the other five INVENTORY 3c tests pass; `P64-D8-002` is nonetheless `major`, on test (4), because no harness in this repository can verify a planning document's surface accounting.

### SEC-07 Workflow Security Posture

ROADMAP Phase 64 criterion 2 reads *"Every workflow's secret handling, `GITHUB_TOKEN` permission scope, third-party action pinning, and exposure to untrusted PR-controlled input is documented"*. The table below is that criterion rendered as a **6-row × 4-column grid** — one row per workflow file in INVENTORY's listed order, one column per criterion-2 clause, in the clause order the criterion states them: secret handling, `GITHUB_TOKEN` permission scope, third-party action pinning, and exposure to untrusted PR-controlled input. **All 24 cells are filled.** A workflow that references no secret carries an explicit written cell saying so and what follows from it, never a blank and never a dash, because a blank cell is indistinguishable from an unchecked cell and criterion 2 says *every* workflow's — which is what makes this table verifiable by a reader rather than by this phase's own assertion (D-13). Every line number below was read from the file at the swept commit.

| Workflow | Secret handling | `GITHUB_TOKEN` permission scope | Third-party action pinning | Exposure to untrusted PR-controlled input |
|---|---|---|---|---|
| `.github/workflows/build.yml` | **No secrets referenced.** `grep -n 'secrets\.' .github/workflows/build.yml` returns no output; the file binds no `env:` secret and passes none to an action input. The absent/empty case is therefore vacuous — there is no credential to be missing — and the job still receives an auto-provisioned `GITHUB_TOKEN` it never names or uses. | **Not declared.** No `permissions:` block at file or job level, so the effective scope is the repository/organisation default "Workflow permissions" setting, which is a GitHub settings value and is not readable from a checkout — see `P64-D1-005`. On its `pull_request` runs from a fork GitHub forces a read-only token regardless; on its `push`→`typefox-dev` runs and its same-repository PR runs the default applies in full. Nothing in this workflow needs write access. | 3 of the 36 references: `actions/checkout@v3` (`:18`), `actions/setup-node@v3` (`:20`), `actions/upload-artifact@v4` (`:41`). All three are mutable tags; none is SHA-pinned. This is the only workflow still on the `@v3` majors while the other five have moved to `@v4` — `P64-D6-004`. | Trigger `pull_request`→`main` at `:7-9` with **no** path filter, so every PR reaches it. The definition is read from the base branch; `:18` checks out with no `ref:`, so the job runs the PR **merge** ref. **No `${{ github.* }}` expression appears anywhere in the file**, so no attacker-controllable value reaches a shell or an action input. The untrusted input that does flow in is the PR's own source, first executed at `:27` by `npm ci` (which runs `package.json`'s `prepare` script) and again at `:28`, `:34` and `:39`. No secret is present, so the blast radius is the ephemeral runner and the uploaded `.vsix`. |
| `.github/workflows/deploy-docs.yml` | **No secrets referenced.** `grep -n 'secrets\.'` returns no output. Publication to GitHub Pages is done with OIDC — `id-token: write` at `:15` feeding `actions/deploy-pages@v4` at `:62` — so there is no long-lived credential in this workflow to leak, and the absent/empty case cannot arise because no static token exists to be absent. | **Declared, complete, least-privilege.** Top-level `permissions:` at `:12-15` grants exactly `contents: read`, `pages: write`, `id-token: write`; because declaring any block resets every other scope to `none`, both jobs are denied everything else. One of only two complete top-level declarations in the repository. | 5 of the 36: `actions/checkout@v4` (`:27`), `actions/setup-node@v4` (`:30`), `actions/configure-pages@v4` (`:45`), `actions/upload-pages-artifact@v3` (`:48`), `actions/deploy-pages@v4` (`:62`). All mutable tags, none SHA-pinned. The `@v3` here is that action's own current major, not a stale pin like `build.yml`'s. | **None.** Its triggers are `push`→`main` behind `paths:` (`:4-9`) and `workflow_dispatch` (`:10`); both require write access and there is no `pull_request` trigger, so no fork ref is ever read and the definition and the checkout are the same trusted `main`. The only expression in the file, `${{ steps.deployment.outputs.page_url }}` at `:56`, is an action output consumed by an `environment.url` field, not by a shell. |
| `.github/workflows/manual-release.yml` | **All three secrets, two patterns.** `secrets.GITHUB_TOKEN` bound through `env:` at `:72`, `:132` and `:169`; `secrets.VSCE_PAT` bound through `env:` at `:87` and consumed unquoted as `-p $VSCE_PAT` at `:90`; `secrets.JETBRAINS_MARKETPLACE_TOKEN` **interpolated straight into the `run:` command line** at `:137` — `P64-D1-004`. Absent/empty behaviour: an empty `VSCE_PAT` leaves `-p` without a value and vsce exits non-zero; an empty JetBrains token becomes an empty Gradle property and `publishPlugin` fails at the marketplace API; `GITHUB_TOKEN` is auto-provisioned and cannot be empty, only under-scoped, which also fails at the call. All three fail **closed** — but only after `:81-82` has already pushed `main` and the `v$VERSION` tag (`P64-D2-005`). | **Mixed, and this is the only file that declares per job.** `create-release` declares `permissions: contents: write` at `:149-150`, which resets every other scope to `none` for that job — correct for `gh release create` at `:172`. `build-vscode` and `build-intellij` declare nothing and therefore run at the repository default; `:81-82`'s `git push origin main` and tag push authenticate through the credential `actions/checkout` persists by default, so that default **must** include `contents: write` for the release path to work at all (`P64-D1-005`). | 11 of the 36, the largest share: `actions/checkout@v4` (`:18`, `:111`, `:153`), `actions/setup-node@v4` (`:21`), `actions/upload-artifact@v4` (`:93`, `:100`, `:140`), `actions/download-artifact@v4` (`:114`, `:156`, `:162`), `actions/setup-java@v4` (`:120`). All mutable tags, none SHA-pinned, and five of them execute inside jobs holding a live publishing credential. `:29` separately installs `semver` globally from the registry, also unpinned. | **No pull-request trigger at all** — `workflow_dispatch` only (`:4-9`), so both the definition and the checkout come from the ref the dispatcher selects and only an account with write access can dispatch. The one externally supplied value is the `version` input; it reaches a shell through `env:` at `:38-41`, `:63-66` and `:71-75` — the correct pattern — and is validated against the anchored regex `^[0-9]+\.[0-9]+\.[0]+$` at `:48` before anything else runs. It **is** interpolated directly into `run:` at `:127`, `:133` and `:137`, a real sink, but `build-intellij` declares `needs: build-vscode` at `:108`, so it cannot be reached with a value that failed validation; per D-12 that is a pass-with-note, not a finding. |
| `.github/workflows/preview.yml` | **Two publishing secrets, no `GITHUB_TOKEN` reference.** `secrets.VSCE_PAT` bound through `env:` at `:65` and consumed unquoted at `:68`; `secrets.JETBRAINS_MARKETPLACE_TOKEN` **interpolated into the `run:` command line** at `:102` — `P64-D1-004`. Absent/empty behaviour is identical to `manual-release.yml`: both publish steps fail closed on an empty credential, but only after `:53-60` has already pushed a version-bump commit to `main`, so `package.json` on `main` can record a preview version that was never published (`P64-D2-005`). | **Not declared, on either job.** No `permissions:` block anywhere in the file, so both `publish-preview` and `build-intellij` run at the repository default; `:60`'s `git push` is the proof that the default includes `contents: write`. The consequence is that every step in both jobs — five mutable-tag actions, a `./gradlew publishPlugin`, and two marketplace credentials — executes alongside a repository token at the full default scope (`P64-D1-005`). | 7 of the 36: `actions/checkout@v4` (`:17`, `:82`), `actions/setup-node@v4` (`:20`), `actions/upload-artifact@v4` (`:71`, `:105`), `actions/download-artifact@v4` (`:85`), `actions/setup-java@v4` (`:91`). All mutable tags, none SHA-pinned; this is the highest-privilege unpinned set in the repository, because these steps run in the same jobs as both publishing tokens. | **None.** Triggers are `push`→`main` and `workflow_dispatch` (`:4-8`), both write-gated; there is no `pull_request` trigger, so no fork ref is read and the workflow definition and the checked-out code are the same trusted ref. The values it interpolates at `:100` and `:107` come from its own `bump` step, which derives them at `:38` from `package.json` on `main`. |
| `.github/workflows/pr-validation.yml` | **No secrets referenced.** `grep -n 'secrets\.' .github/workflows/pr-validation.yml` returns no output; neither job binds an `env:` secret nor passes one to an action. The absent/empty case cannot arise. `./gradlew buildPlugin` at `:61` needs no marketplace credential because it builds the plugin rather than publishing it. | **Not declared.** No `permissions:` block, so the effective scope is the repository default (`P64-D1-005`). For fork PRs GitHub forces a read-only token regardless; for same-repository PRs the full default applies to a job that builds contributor-supplied Gradle code at `:61`. Neither job requires any write scope. | 6 of the 36: `actions/checkout@v4` (`:20`, `:45`), `actions/setup-node@v4` (`:23`), `actions/upload-artifact@v4` (`:34`), `actions/download-artifact@v4` (`:48`), `actions/setup-java@v4` (`:54`). All mutable tags, none SHA-pinned. | Trigger `pull_request`→`main` behind five path globs (`:4-13`). The definition is read from the base branch; both checkouts (`:20`, `:45`) take no `ref:`, so the merge ref is used. **No `${{ github.* }}` expression exists anywhere in the file**, so nothing attacker-controllable reaches a shell or an action input; the untrusted input is the PR's code itself, first executed at `:30` by `npm ci` (running `prepare`) and again at `:61` by `./gradlew buildPlugin`, which executes the PR's own `build.gradle.kts`. Separately, the path list is misconfigured such that the job frequently does not run when it should (`P64-D2-004`). |
| `.github/workflows/pr-vsix.yml` | **No secrets referenced.** `grep -n 'secrets\.' .github/workflows/pr-vsix.yml` returns no output; the `actions/github-script@v7` step at `:77` authenticates with the implicit job token rather than a named secret. The absent/empty case cannot arise; the realistic failure is an insufficient token scope, which GitHub forces for fork PRs and which `:76` handles by skipping the step rather than failing the run. | **Declared, complete, least-privilege.** Top-level `permissions:` at `:26-28` grants `contents: read` and `pull-requests: write` and resets everything else to `none`. The accompanying comment at `:24-25` describes both the intent and the fork read-only behaviour accurately. The second of the repository's only two complete top-level declarations. | 4 of the 36: `actions/checkout@v4` (`:37`), `actions/setup-node@v4` (`:42`), `actions/upload-artifact@v4` (`:67`), `actions/github-script@v7` (`:77`). All mutable tags, none SHA-pinned. `github-script` is the highest-capability of the four, because it executes JavaScript with an authenticated Octokit client under the `pull-requests: write` scope. | **The unit's most exposed workflow, and the only one that checks out an un-merged ref.** Trigger `pull_request`→`main` behind `bbj-vscode/**` (`:12-17`); GitHub reads the definition from the **base** branch — stated accurately in the file's own comment at `:8-9` — while `:36-39` checks out `github.event.pull_request.head.sha`, the PR head. The first point contributor-controlled content reaches a shell is `:49`, where `npm ci` runs the PR's `prepare` script; it reaches an **action input** at `:70` via `steps.pkg.outputs.vsix`, which `:57-62` derives from the PR head's `package.json`. The `github`-context values interpolated at `:21`, `:60` and `:69` are all the GitHub-generated PR number, which no contributor can set; `:80-82` uses `toJSON(...)`, the documented-safe encoding, and that step is gated to same-repository PRs at `:76`. |

**`.github/dependabot.yml` has no row in this table, and that is deliberate rather than an omission.** It is not a workflow: it declares no `on:` trigger, defines no job, executes nothing on a runner and references no secret, so all four criterion-2 clauses are inapplicable to it and a row would be four "not applicable" cells. It is nonetheless swept as this unit's seventh file under D-19, and its substantive content — the npm-only ecosystem coverage and the two well-reasoned `ignore:` entries — is recorded in the D6 cell above and in `P64-D6-005`.

**`pull_request_target` is absent from this repository, recorded here as a positive result.** The search that established it, run at execution time over the six workflow files:

```bash
grep -rn 'pull_request_target' .github/workflows/
```

**Output:** *(no output; exit status 1)*

That matters enough to state rather than to omit: `pull_request_target` runs the **base** branch's workflow definition with a **read-write** token and full secret access in the context of a pull request, and combining it with a checkout of the PR head is the single highest-severity GitHub Actions misconfiguration pattern. It does not occur here. A document that listed only defects would leave a reader unable to distinguish that from a dimension nobody looked at (D-12).

**Concurrency and cancellation.** Two of the six workflows declare a `concurrency:` group. `deploy-docs.yml:17-19` uses `group: pages` with `cancel-in-progress: false`, which queues rather than cancels — correct for a deployment, since a cancelled Pages deployment could otherwise leave the site mid-swap. `pr-vsix.yml:20-22` uses `group: pr-vsix-${{ github.event.pull_request.number }}` with `cancel-in-progress: true`, which cancels a superseded PR build; that run publishes nothing and writes only an artifact and a sticky comment, so cancelling it leaves nothing behind. The other four declare no group. For `build.yml` and `pr-validation.yml` the cost is only wasted runners (`P64-D3-002`). For `preview.yml` and `manual-release.yml` it is material: two publishing runs can overlap, and a run cancelled — or failed — between `preview.yml:60`'s push and `:68`'s publish, or between `manual-release.yml:82`'s tag push and `:90`'s publish, leaves a version commit and possibly a tag on `main` describing a release that was never published, with no compensating action anywhere in either file (`P64-D2-005`, `P64-D2-006`).

**Blast radius of each named secret, stated so the severities above have a scale.** `secrets.VSCE_PAT` is a Visual Studio Marketplace personal access token: whoever holds it can publish or overwrite versions of `basis-intl.bbj-lang`, which every VS Code user of this extension receives as an automatic update, and its authority is bounded by the publisher account it was issued under rather than by this repository. `secrets.JETBRAINS_MARKETPLACE_TOKEN` is the equivalent for JetBrains plugin `30033-bbj-language-support`, reaching every IntelliJ user of the plugin. `secrets.GITHUB_TOKEN` is scoped to this repository and expires with the job, but at the permissive default it can push to `main`, create and move tags, create releases and write packages — enough to change what a subsequent release publishes. Two of the three therefore reach end users' machines directly and neither can be revoked by anything in this repository.

**What was read and what was asserted.** Every cell above was derived by reading the seven files at the swept commit and by running the enumeration commands recorded in this section and in the D1 and D6 cell lines. **No workflow was triggered, dispatched, re-run or otherwise executed**, no GitHub API was queried, and no repository or organisation setting was read — where a fact depends on such a setting, the cell says so instead of guessing. Nothing in this table is a defect purely by virtue of appearing in it: the majority of these cells record correct or accepted behaviour, and the cells that record a defect name the finding ID that carries it.

### Findings

Thirteen records, all `unit: RU-64-01`, allocated in discovery order and continuing the monotonic per-`(64, dimension)` sequences plan `64-01` opened rather than restarting at `001` — D1 resumes at `004`, D2 at `004`, D4 at `003`, D6 at `003`, D8 at `002`, and D3 opens at `001` because `RU-64-03` recorded no D3 finding. No `P64-D5-*` or `P64-D7-*` ID is allocated here: both dimensions are `n/a` for this unit. Every `dedup:` is checked against INVENTORY's frozen 15-issue snapshot, in which 0 of 15 carry the `dependencies` area label and 0 of 15 name CI, a workflow, build configuration or a vendored binary. Every record states in one clause why it carries no runnable reproduction: GitHub Actions cannot be executed in this checkout, so the evidence is a trace naming the trigger, the input and the sink (D-12).

**A note on classification test (4), applied identically to all thirteen records so the reading is visible rather than implicit.** INVENTORY 3c test (4) asks whether a fix is regression-testable with the existing harness — vitest for TypeScript, Gradle for the IntelliJ plugin — with no new test infrastructure. For a workflow file the existing harness *is* the workflow run: a change to `.github/workflows/*.yml` is exercised by the very next run of that workflow, on the pull request that changes it, with nothing new to build. Test (4) therefore passes for changes whose effect a single run demonstrates, and fails for changes whose effect only shows under conditions a run cannot stage — a race between two concurrent runs, or the behaviour of a scheduled service. Each record below states which side it falls on.

```
id:                P64-D1-004
unit:              RU-64-01
location:          .github/workflows/preview.yml:96-102
dimension:         D1
secondary:         none
severity:          high
evidence_tier:     repro
evidence:          Disclosure-limited per D-16 — this repository is public and forkable and the
                   credential concerned publishes to a public marketplace, so this record states the
                   surface, the problem class and the impact and stops there: no trigger sequence, no
                   payload and no fork-and-run procedure is written here or anywhere in this file. The
                   evidence exists and is a line-by-line read of the two files at the swept commit; no
                   runnable reproduction accompanies it because GitHub Actions cannot be executed in
                   this checkout and D-12 forbids claiming a workflow was run. **Surface:** the two
                   `./gradlew publishPlugin` steps, `preview.yml:96-102` and `manual-release.yml:135-137`.
                   **Problem class:** `secrets.JETBRAINS_MARKETPLACE_TOKEN` is expanded by the Actions
                   expression evaluator directly into the `run:` command line, rather than bound to the
                   step through an `env:` mapping and referenced as a shell variable. The credential is
                   therefore materialised as an argument of a process on the runner and into the script
                   file the runner writes for that step, instead of being confined to the step's process
                   environment. **Impact:** for the duration of the publish the value is present as
                   process-visible data inside a job that resolves and executes the full IntelliJ
                   Platform Gradle plugin dependency tree, which is third-party code running
                   concurrently in the same container. Log masking does not address this class — it
                   redacts the transcript, not the runner. What makes this an inconsistency rather than
                   a platform constraint is that both files already use the correct pattern two steps
                   away: `env: VSCE_PAT: ${{ secrets.VSCE_PAT }}` at `preview.yml:64-65` and
                   `manual-release.yml:86-87`.
failure_scenario:  A release or preview run reaches the JetBrains publish step. During that step the
                   marketplace publishing credential exists as process-visible data on the runner rather
                   than only as step environment state, so any code already executing inside that job
                   with process visibility — the Gradle daemon, a build plugin, a transitive plugin
                   dependency, or any of the five mutable-tag actions in the same job under
                   `P64-D6-003` — is positioned to observe it, whereas the `env:`-bound `VSCE_PAT` two
                   steps earlier is not. The consequence of an observed token is publication rights to
                   the plugin listing under this project's own identity, which is indistinguishable from
                   a legitimate release to every downstream IntelliJ user, and which nothing in this
                   repository can revoke.
classification:    major — (1) at most one file: FAIL, two workflows carry the same pattern. (2) no
                   public API / no grammar rule / no LSP contract change: PASS. (3) adds or upgrades no
                   dependency: PASS. (4) regression-testable with the existing harness: PASS under the
                   reading stated above — the next run of either workflow exercises the changed step
                   directly. (5) reviewer can name the exact edit: PASS — add an `env:` mapping for the
                   token to both steps and reference the shell variable from the `run:` body, exactly as
                   `VSCE_PAT` is already handled. (6) severity is neither critical nor high AND primary
                   dimension is not D1: FAIL on both halves. Tests (1) and (6) fail, and (6) is the
                   deliberate safety gate, so this is `major` regardless of how small the edit is.
effort:            2
dedup:             none — no open issue in the frozen 15-issue snapshot names CI, a workflow, secret
                   handling, publishing or a marketplace credential; 0 of the 15 carry the
                   `dependencies` area label and 0 name build configuration of any kind. Issue #476
                   mentions both IDEs but concerns starter-program templates, not the release pipeline.
disposition:       major-refactor — test (6) routes every D1 finding to Phase 68's `MAJOR-REFACTORS.md`
                   rather than Phase 67's apply path, even though the edit itself is two lines, and
                   Phase 69's issue drafting for it is subject to D-16's disclosure limits and to
                   ISSUE-01.
```

```
id:                P64-D1-005
unit:              RU-64-01
location:          .github/workflows/preview.yml:8-10
dimension:         D1
secondary:         none
severity:          medium
evidence_tier:     repro
evidence:          Line-by-line trace plus an enumeration; no runnable reproduction accompanies it
                   because GitHub Actions cannot be executed in this checkout.
                   `grep -n 'permissions:' .github/workflows/*.yml` returns exactly three hits —
                   `deploy-docs.yml:12` and `pr-vsix.yml:26`, both top-level, and
                   `manual-release.yml:149`, job-level on `create-release` alone. Four of the six
                   workflows therefore declare no `permissions:` anywhere: `build.yml`, `preview.yml`,
                   `pr-validation.yml`, and `manual-release.yml` for its `build-vscode` and
                   `build-intellij` jobs — 7 of the repository's 10 jobs. For those jobs the
                   `GITHUB_TOKEN` scope is not stated in the tree at all; it is whatever the repository
                   or organisation "Workflow permissions" default is, which is a GitHub settings value
                   and cannot be read from a checkout. The tree does constrain it in one direction:
                   `preview.yml:53-60` runs `git config`, `git commit` and `git push` with no explicit
                   token, authenticating through the credential `actions/checkout` persists by default,
                   and `manual-release.yml:69-82` does the same plus `git push origin "v$VERSION"`.
                   Neither can succeed unless that default grants `contents: write`, and both are the
                   project's live release paths, so the default is necessarily the permissive setting —
                   under which every scope is granted read and write to every job that declares no block
                   of its own. This last step is an **inference from the workflows' design intent, not
                   an observation of a run**, and is flagged as such; the unverifiable half is recorded
                   under `### Not-reproducible dispositions`. Two consequences follow directly: the jobs
                   holding `secrets.VSCE_PAT` and `secrets.JETBRAINS_MARKETPLACE_TOKEN`
                   (`preview.yml:11-108`, `manual-release.yml:12-104`) also hold a full-scope repository
                   token, and `pr-validation.yml`'s same-repository PR runs build contributor-supplied
                   Gradle code under that same token — fork PRs are forced read-only by GitHub and are
                   not exposed. The contrast lives in the same tree: `deploy-docs.yml:12-15` and
                   `pr-vsix.yml:26-28` each declare a block, which resets every undeclared scope to
                   `none`, and `pr-vsix.yml:24-25` names the posture explicitly as "Least privilege".
failure_scenario:  A third-party action or a Gradle plugin executing inside `preview.yml`'s
                   `publish-preview` or `build-intellij` job — every action reference in both being a
                   mutable tag under `P64-D6-003` — runs with a repository token that, on the permissive
                   default, can push to `main`, move tags, create releases and write packages, in
                   addition to whatever marketplace credential is in scope for its step. The narrower
                   everyday case is the same shape without a compromise: any step that misbehaves in
                   those seven jobs does so with far more authority than the job's task requires, and
                   nothing in the repository records what that authority is, so a reviewer reading
                   `build.yml` or `pr-validation.yml` cannot tell from the file whether its token can
                   write to the repository or not.
classification:    major — (1) at most one file: FAIL, four workflows. (2) no public API / grammar /
                   LSP change: PASS. (3) adds or upgrades no dependency: PASS. (4) regression-testable
                   with the existing harness: PASS under the reading stated above — a declared scope is
                   exercised by the next run of each workflow, and a scope that is too narrow fails that
                   run loudly rather than silently. (5) reviewer can name the exact edit: PASS — add
                   `permissions: contents: read` to `build.yml` and `pr-validation.yml`, `contents:
                   write` to `preview.yml`, and per-job blocks to `manual-release.yml`'s two undeclared
                   jobs. (6) severity is neither critical nor high AND primary dimension is not D1:
                   FAIL — the primary dimension is D1. Tests (1) and (6) fail.
effort:            4
dedup:             none — the frozen 15-issue snapshot contains no issue about CI permissions, tokens,
                   workflow configuration or release automation; 0 of the 15 carry the `dependencies`
                   label and 0 name a workflow.
disposition:       major-refactor — declaring a scope that turns out to be too narrow breaks the
                   release path, so the change has to be staged against a real release run rather than
                   applied unilaterally by Phase 67, and test (6) independently routes any D1 finding to
                   `MAJOR-REFACTORS.md`.
```

```
id:                P64-D2-004
unit:              RU-64-01
location:          .github/workflows/pr-validation.yml:8-13
dimension:         D2
secondary:         none
severity:          medium
evidence_tier:     repro
evidence:          Line-by-line trace with a mechanical basis; no runnable reproduction accompanies it
                   because GitHub Actions cannot be executed in this checkout. `pr-validation.yml`
                   exists to prove the IntelliJ plugin still builds against the current language
                   server: `build-vscode` (`:16-38`) builds `bbj-vscode` and uploads
                   `out/language/main.cjs`, and `validate-intellij` (`:40-61`) downloads it and runs
                   `./gradlew buildPlugin`. It runs only when the pull request's diff matches one of
                   the five globs at `:8-13` — `bbj-intellij/**`, `bbj-vscode/out/language/**`,
                   `bbj-vscode/tools/**`, `bbj-vscode/syntaxes/**`, `.github/workflows/pr-validation.yml`.
                   The second glob cannot match anything: `bbj-vscode/.gitignore:1` is the single line
                   `/out/`, and `git ls-files bbj-vscode/out` returns zero tracked files, so no pull
                   request can contain a change under `bbj-vscode/out/language/`; GitHub evaluates
                   `paths:` against the files changed in the pull request, and an ignored, untracked
                   build-output directory never appears among them. The path the filter evidently
                   means — the language-server source that `out/language/main.cjs` is built from — is
                   `bbj-vscode/src/language/**`, which `git ls-files bbj-vscode/src/language | wc -l`
                   reports as 53 tracked files and which appears nowhere in the list. Nothing else
                   compensates: `build.yml` builds and tests `bbj-vscode` on every PR to `main` but
                   never touches `bbj-intellij`, and `pr-vsix.yml` builds only the VS Code extension.
                   The repository's only cross-IDE build gate therefore does not run on the class of
                   change most likely to break it.
failure_scenario:  A pull request edits `bbj-vscode/src/language/bbj-module.ts`, or any of the other 52
                   tracked files under `src/language/`, and nothing else. The `paths:` filter at
                   `:8-13` matches none of the changed files, so `pr-validation.yml` is skipped
                   entirely and the pull request shows no IntelliJ check at all — not a failing check, an
                   absent one, which reads to a reviewer as "not applicable" rather than "not run".
                   `build.yml` runs and passes, because it builds and tests only `bbj-vscode`. The
                   change merges to `main`, and the first time the IntelliJ side is exercised is
                   `preview.yml`'s `build-intellij` job, which runs after `publish-preview` has already
                   published the VS Code preview to the Marketplace — so the break surfaces after
                   publication instead of before merge.
classification:    easy — (1) at most one file: PASS, `pr-validation.yml` alone. (2) no public API / no
                   grammar rule / no LSP contract change: PASS. (3) adds or upgrades no dependency:
                   PASS. (4) regression-testable with the existing harness: PASS under the reading
                   stated above — the next pull request touching `bbj-vscode/src/language/**`
                   demonstrates the fix directly, with no new test infrastructure. (5) reviewer can name
                   the exact edit: PASS — replace the glob `'bbj-vscode/out/language/**'` at `:10` with
                   `'bbj-vscode/src/language/**'`. (6) severity is neither critical nor high AND primary
                   dimension is not D1: PASS — `medium`, D2. All six tests pass.
effort:            2
dedup:             none — no open issue in the frozen 15-issue snapshot mentions CI, pull-request
                   checks, the IntelliJ build or workflow configuration; issue #476 and #385 are the
                   only two carrying the `intellij` or `vscode` area labels and both are feature
                   requests about editor-facing functionality.
disposition:       easy-fix — a one-glob change inside a single workflow file with no behavioural
                   coupling to anything else; Phase 67 can apply it directly.
```

```
id:                P64-D2-005
unit:              RU-64-01
location:          .github/workflows/manual-release.yml:69-82
dimension:         D2
secondary:         none
severity:          medium
evidence_tier:     repro
evidence:          Line-by-line trace of both release workflows; no runnable reproduction accompanies
                   it because publishing to either marketplace is precisely what this phase does not
                   do. Both workflows write durable, externally visible state before the state that
                   would justify it exists, and both spread publication across jobs with no rollback
                   or compensating action anywhere. In `manual-release.yml`, `build-vscode` pushes the
                   version commit to `main` and the `v$VERSION` tag at `:81-82`, then publishes to the
                   VS Code Marketplace at `:84-90`; `build-intellij` publishes to the JetBrains
                   Marketplace at `:135-137` in a second job; `create-release` creates the GitHub
                   release at `:167-186` in a third. In `preview.yml`, `publish-preview` pushes the
                   version bump at `:53-60` and publishes at `:62-68`, and `build-intellij` publishes
                   to JetBrains at `:96-102`. Each stage can fail independently — a rejected push, an
                   empty or expired credential (see the empty-input analysis in the D2 cell line), a
                   Gradle failure, a marketplace rejection — and no stage undoes a preceding one. The
                   ordering is also the wrong way round with respect to reversibility: a tag and a
                   commit on `main` are cheap to create and awkward to retract, while a marketplace
                   publication is the step most likely to fail on credentials. Note that the two
                   workflows are not merely similar here; `preview.yml:53-60` and
                   `manual-release.yml:69-82` are the same twelve-line procedure with different commit
                   messages, which is why one fix has to address both (see `P64-D4-003`).
failure_scenario:  A maintainer dispatches `manual-release.yml` with a valid version. `build-vscode`
                   validates it, sets `package.json`, commits, pushes `main` and pushes the tag
                   `v25.12.0` (`:81-82`). The next step, `npx vsce publish -p $VSCE_PAT` (`:90`), fails
                   — the PAT has expired, which is the ordinary failure mode for a marketplace token.
                   The job fails, so `build-intellij` and `create-release` never run. What is left
                   behind is `main` claiming version 25.12.0 in `package.json`, a `v25.12.0` tag
                   pointing at that commit, no VS Code Marketplace release, no JetBrains release and no
                   GitHub release. Re-running the workflow with the same version now fails at `:54`,
                   because the version is no longer greater than `package.json`'s current value, so
                   recovery requires deleting the tag and hand-reverting `main` before any release can
                   proceed. The `preview.yml` variant is the same shape one step smaller: a failed
                   `vsce publish` at `:68` leaves `main` recording a preview version that was never
                   published, and the next run bumps from that phantom version.
classification:    major — (1) at most one file: FAIL, `manual-release.yml` and `preview.yml` carry the
                   same defect and a fix that repaired one would leave the other. (2) no public API /
                   grammar / LSP change: PASS. (3) adds or upgrades no dependency: PASS. (4)
                   regression-testable with the existing harness: PASS under the reading stated above,
                   though only weakly — a successful release run exercises the happy path; the failure
                   path it fixes is exercised only by an actual failure. (5) reviewer can name the exact
                   edit: FAIL — reordering a release pipeline so that nothing durable is written before
                   the last publish succeeds is a design decision between publish-then-tag, an explicit
                   compensating rollback, and collapsing the three jobs into one, not a nameable edit.
                   (6) severity is neither critical nor high AND primary dimension is not D1: PASS.
                   Tests (1) and (5) fail.
effort:            8
dedup:             none — the frozen 15-issue snapshot contains no issue about releases, versioning,
                   tags or publication; 0 of the 15 carry the `dependencies` label and 0 name CI.
disposition:       major-refactor — the change reorders two live publishing pipelines across two
                   marketplaces and can only be validated by an actual release, so Phase 67 does not
                   apply it unilaterally.
```

```
id:                P64-D2-006
unit:              RU-64-01
location:          .github/workflows/preview.yml:3-8
dimension:         D2
secondary:         none
severity:          low
evidence_tier:     repro
evidence:          Line-by-line trace; no runnable reproduction accompanies it because staging two
                   overlapping workflow runs requires executing GitHub Actions, which this phase does
                   not do. `preview.yml` triggers on every `push` to `main` (`:4-8`) and declares no
                   `concurrency:` group anywhere in the file — `grep -n 'concurrency:'
                   .github/workflows/*.yml` returns hits only for `deploy-docs.yml:17` and
                   `pr-vsix.yml:20`. Its `bump` step (`:34-51`) reads the current version out of the
                   checked-out `package.json` with `jq -r .version` and increments the patch component
                   in the workspace, then `:53-60` commits and pushes that bump to `main`. Because each
                   run's checkout is the commit that triggered it, and because a `GITHUB_TOKEN` push
                   does not itself trigger a workflow, a second push to `main` arriving before or
                   shortly after the first run's push produces a run whose checkout does not contain the
                   first run's bump. Both runs then compute the same `NEW_VERSION` from the same input.
                   The loser's `git push` at `:60` is rejected as non-fast-forward, the step fails, and
                   because publication happens afterwards at `:62-68` that run publishes nothing. The
                   defect is in the read-modify-write shape rather than in the missing `concurrency:`
                   block alone, which is why adding one does not by itself fix it: `cancel-in-progress:
                   true` would drop a preview build for a commit that was pushed, and `false` would
                   queue the second run, which would then still be working from a checkout that predates
                   the first run's bump and would still collide.
failure_scenario:  Two commits are pushed to `main` a minute apart — an ordinary merge followed by a
                   follow-up fix. Run A and run B both start, both read version `0.12.0` from their own
                   checkouts, and both compute `0.12.1`. Run A pushes the bump and publishes preview
                   `0.12.1`. Run B's `git push` at `:60` is rejected, the step fails, and run B stops
                   before `:62-68`, so the second commit is never published as a preview and the only
                   signal is a red run whose failure message is a Git rejection rather than anything
                   about releases. A maintainer who re-runs the failed job hits the same rejection,
                   because run B's checkout is still the pre-bump commit.
classification:    major — (1) at most one file: PASS, `preview.yml` alone. (2) no public API /
                   grammar / LSP change: PASS. (3) adds or upgrades no dependency: PASS. (4)
                   regression-testable with the existing harness: FAIL — a race between two concurrent
                   runs cannot be staged by a workflow run, which is exactly why it has gone unnoticed;
                   this is the "conditions a run cannot stage" side of the reading stated above. (5)
                   reviewer can name the exact edit: FAIL — as traced above, a `concurrency:` block
                   alone is insufficient in either cancel mode, so the fix requires deciding how the
                   bump should read `main` (fetch-and-rebase before bumping, derive the version from
                   the tag list, or move the bump after publication). (6) severity is neither critical
                   nor high AND primary dimension is not D1: PASS. Tests (4) and (5) fail.
effort:            2
dedup:             none — the frozen 15-issue snapshot contains no issue about preview builds,
                   versioning or CI concurrency.
disposition:       major-refactor — the fix is small in lines but is a release-policy decision about
                   how the preview version is derived, so it belongs on `MAJOR-REFACTORS.md` rather
                   than in Phase 67's apply path.
```

```
id:                P64-D3-001
unit:              RU-64-01
location:          .github/workflows/build.yml:19-22
dimension:         D3
secondary:         none
severity:          medium
evidence_tier:     repro
evidence:          Trace with an enumeration; no runnable reproduction accompanies it because timing a
                   GitHub-hosted runner requires running one. Exactly one of the six workflows
                   configures a dependency cache: `deploy-docs.yml:29-34`, which sets `cache: npm` with
                   `cache-dependency-path: documentation/package-lock.json` — a correct key for what it
                   caches. The five `actions/setup-node@v4`/`@v3` steps that precede an `npm ci` against
                   `bbj-vscode` set no `cache:` input at all: `build.yml:19-22` before `:27`,
                   `pr-validation.yml:22-25` before `:30`, `pr-vsix.yml:41-44` before `:49`,
                   `preview.yml:19-22` before `:32`, and `manual-release.yml:20-23` before `:34`. None
                   of the three `actions/setup-java@v4` steps sets `cache: gradle` either —
                   `pr-validation.yml:53-57` before `./gradlew buildPlugin` at `:61`,
                   `preview.yml:90-94` before `./gradlew publishPlugin` at `:99`, and
                   `manual-release.yml:119-123` before three `./gradlew` invocations at `:127`, `:133`
                   and `:137`. The cost is larger than a package download: `bbj-vscode/package.json`
                   declares `"prepare": "npm run langium:generate && npm run build"`, and npm runs
                   `prepare` automatically after `npm ci`, so every uncached run repeats a full Langium
                   grammar regeneration and esbuild bundle in addition to installing the dependency
                   tree, and every uncached Gradle run re-resolves the IntelliJ Platform dependencies.
                   `bbj-vscode/package-lock.json` is 7,894 lines, so the cache key that would serve
                   these five is the same one `deploy-docs.yml` already uses for its own tree.
failure_scenario:  Any pull request to `main` that touches `bbj-vscode/**` starts at least two jobs —
                   `build.yml`'s and `pr-vsix.yml`'s (see `P64-D3-002`) — and each performs a complete
                   cold `npm ci` plus the `prepare` regeneration and bundle before it does any work
                   specific to its own purpose. A PR touching `bbj-intellij/**` additionally resolves
                   the IntelliJ Platform dependency set from scratch in `pr-validation.yml`. The wrong
                   behaviour is not an incorrect result but a fixed, repeated cost paid on every run of
                   five of six workflows, on a repository whose CI already runs two to three
                   overlapping builds per pull request; the same runner minutes are spent regenerating
                   artefacts that are byte-identical to the previous run's whenever the lockfile has not
                   changed.
classification:    major — (1) at most one file: FAIL, five workflows would each need the input added.
                   (2) no public API / grammar / LSP change: PASS. (3) adds or upgrades no dependency:
                   PASS. (4) regression-testable with the existing harness: PASS under the reading
                   stated above — a cache hit or miss is visible in the very next run of each workflow.
                   (5) reviewer can name the exact edit: PASS — add `cache: npm` and
                   `cache-dependency-path: bbj-vscode/package-lock.json` to the five `setup-node`
                   steps and `cache: gradle` to the three `setup-java` steps. (6) severity is neither
                   critical nor high AND primary dimension is not D1: PASS. Only test (1) fails, and it
                   fails solely on file count.
effort:            2
dedup:             none — the frozen 15-issue snapshot contains no issue about CI duration, caching or
                   build performance.
disposition:       major-refactor — the edit is mechanical and low-risk, but test (1) fails on file
                   count, and INVENTORY 3c admits no exception for a change that is small in each of
                   several files; recorded as `major` rather than reclassified to fit the fix.
```

```
id:                P64-D3-002
unit:              RU-64-01
location:          .github/workflows/build.yml:3-9
dimension:         D3
secondary:         none
severity:          medium
evidence_tier:     repro
evidence:          Trace across the three pull-request workflows; no runnable reproduction accompanies
                   it because GitHub Actions cannot be executed in this checkout. `build.yml:7-9`
                   declares `pull_request: branches: [main]` with **no `paths:` filter**, so it runs on
                   every pull request to `main` regardless of what changed, and performs `npm ci`
                   (`:27`), `npm run build` (`:28`), the full vitest suite (`:34`) and `npx vsce
                   package` (`:39`). `pr-vsix.yml:12-17` declares the same trigger behind
                   `paths: ['bbj-vscode/**', '.github/workflows/pr-vsix.yml']` and performs `npm ci`,
                   `npm run build` and `npm run test` at `:46-51` followed by `npx vsce package` at
                   `:61`. The two overlap completely for any pull request touching `bbj-vscode/**`,
                   which is the majority of this repository's pull requests: the same commit is
                   installed, built, tested and packaged twice, in two jobs, on two runners, with no
                   cache between them (`P64-D3-001`). At the other end, a pull request touching only
                   `documentation/`, `QA/`, `examples/` or `.planning/` still runs `build.yml` in full,
                   including the vitest suite and a VSIX package, for a change that cannot affect any
                   of them — `deploy-docs.yml:7-9`, `pr-validation.yml:8-13` and `pr-vsix.yml:15-17` all
                   scope themselves with `paths:` filters, so `build.yml` is the only unscoped one.
                   Neither `build.yml` nor `pr-validation.yml` declares a `concurrency:` group, so
                   superseded runs are not cancelled and a branch pushed three times leaves three full
                   builds running to completion.
failure_scenario:  A contributor opens a pull request that edits `bbj-vscode/src/language/bbj.langium`
                   and pushes three times over ten minutes while responding to review. Each push starts
                   a fresh `build.yml` run (cold install, build, full vitest suite, VSIX package) and a
                   fresh `pr-vsix.yml` run (cold install, build, full vitest suite, VSIX package), and
                   because neither declares a `concurrency:` group for `build.yml`, none of the earlier
                   `build.yml` runs is cancelled. Six full builds of the same project execute for one
                   pull request, four of them for commits nobody will look at again. Separately, a
                   documentation-only pull request — which `deploy-docs.yml` correctly declines to
                   build — still triggers a complete `build.yml` run including the vitest suite.
classification:    major — (1) at most one file: PASS in the narrowest reading, since a `paths:` filter
                   and a `concurrency:` block would both go in `build.yml`. (2) no public API / grammar
                   / LSP change: PASS. (3) adds or upgrades no dependency: PASS. (4) regression-testable
                   with the existing harness: PASS under the reading stated above for the `paths:`
                   filter; the concurrency half is the "conditions a run cannot stage" side and is
                   weaker. (5) reviewer can name the exact edit: FAIL — deciding whether `build.yml`
                   should gain a `paths:` filter, be merged into `pr-vsix.yml`, or deliberately remain
                   the one unconditional gate on every pull request is a CI-policy decision about what
                   `main` is protected by, not a nameable edit; the wrong choice removes the only check
                   that currently runs on every PR. (6) severity is neither critical nor high AND
                   primary dimension is not D1: PASS. Test (5) fails.
effort:            4
dedup:             none — the frozen 15-issue snapshot contains no issue about CI duration, redundant
                   builds or workflow triggers.
disposition:       major-refactor — the decision changes what protects `main`, so it is documented for
                   review rather than applied by Phase 67.
```

```
id:                P64-D6-003
unit:              RU-64-01
location:          .github/workflows/manual-release.yml:18-162
dimension:         D6
secondary:         [D1]
severity:          medium
evidence_tier:     inherited
evidence:          Repro-equivalent per INVENTORY 3b: the claim is a pinning claim, and it is settled
                   by enumeration rather than by an advisory reference or a runnable reproduction — no
                   workflow was run. `grep -h 'uses:' .github/workflows/*.yml | wc -l` prints `36`,
                   matching the count scouted at discussion time; `grep -c 'uses:'
                   .github/workflows/*.yml` prints `build.yml` 3, `deploy-docs.yml` 5,
                   `manual-release.yml` 11, `pr-validation.yml` 6, `pr-vsix.yml` 4, `preview.yml` 7,
                   summing to 36. `grep -nE 'uses:.*@[0-9a-f]{40}' .github/workflows/*.yml | wc -l`
                   prints `0`. Every one of the 36 references a mutable major-version tag; none names a
                   commit SHA and none floats on a branch. The full set is 9 distinct actions in 11
                   distinct `action@ref` pairs: `actions/checkout@v4` ×9, `actions/upload-artifact@v4`
                   ×8, `actions/setup-node@v4` ×5, `actions/download-artifact@v4` ×5,
                   `actions/setup-java@v4` ×3, and one each of `actions/configure-pages@v4`,
                   `actions/deploy-pages@v4`, `actions/upload-pages-artifact@v3`,
                   `actions/github-script@v7`, `actions/checkout@v3` and `actions/setup-node@v3`. A
                   mutable tag means the bytes executed at job start are whatever the tag points at
                   then, so what runs can change without any change to this repository and without a
                   reviewable diff; a commit SHA removes that property entirely. Two facts bound the
                   severity honestly and are recorded rather than omitted: all 36 resolve to the
                   first-party `actions/` organisation, which materially lowers likelihood, and
                   `.github/dependabot.yml` declares no `github-actions` ecosystem (`P64-D6-005`), so
                   nothing in the repository would notice or update these references either way. The
                   highest-privilege combination of a mutable reference and a live secret is
                   `preview.yml:71,105` and `manual-release.yml:93,100,140` — five
                   `actions/upload-artifact@v4` steps inside the same jobs that hold
                   `secrets.VSCE_PAT` and `secrets.JETBRAINS_MARKETPLACE_TOKEN` — with
                   `actions/github-script@v7` at `pr-vsix.yml:77` the highest-capability reference
                   outside them, since it executes JavaScript with an authenticated Octokit client.
failure_scenario:  A release of any one of the nine referenced actions is re-tagged or republished
                   under its existing major tag — the ordinary mechanism by which `@v4` advances, and
                   the mechanism an account compromise would ride. The next `preview.yml` or
                   `manual-release.yml` run executes the new bytes inside a job that holds a marketplace
                   publishing credential and, per `P64-D1-005`, a repository token at the permissive
                   default scope. Nothing in this repository changes, no pull request is opened, and no
                   diff exists for anyone to review; the first observable signal would be whatever the
                   changed action does. The same exposure applies in the ordinary non-malicious case as
                   a reproducibility gap: a build that succeeded last week and fails today cannot be
                   attributed from the repository alone, because the workflow file is identical and the
                   code it ran is not.
classification:    major — (1) at most one file: FAIL, all six workflows carry references. (2) no
                   public API / grammar / LSP change: PASS. (3) adds or upgrades no dependency in
                   `bbj-vscode/package.json` or `bbj-intellij/build.gradle.kts`: PASS — a GitHub Action
                   reference is in neither manifest. (4) regression-testable with the existing harness:
                   PASS under the reading stated above; a SHA-pinned reference either resolves or fails
                   on the next run. (5) reviewer can name the exact edit: FAIL — pinning 36 references
                   requires resolving each tag to a SHA and, to remain maintainable rather than
                   immediately stale, adopting an update mechanism alongside it, which is a process
                   decision rather than an edit. (6) severity is neither critical nor high AND primary
                   dimension is not D1: PASS — `medium`, D6, with D1 secondary. Tests (1) and (5) fail.
triage:            file-issue — mapping to `classification: major` per D-09. Not `fix-now`: pinning is
                   not a version bump with no API change, it is 36 coordinated edits across six files
                   plus an ongoing update mechanism, and doing it without that mechanism trades a
                   mutable-reference risk for a permanently-stale-dependency one. Not
                   `accepted-with-reason`: the reachability argument that disposition requires cannot be
                   made here, because the code paths concerned are reached on every run of every
                   workflow, two of them alongside live publishing credentials.
effort:            4
dedup:             none — no open issue in the frozen 15-issue snapshot concerns GitHub Actions,
                   pinning, supply-chain provenance or CI dependencies; 0 of the 15 carry the
                   `dependencies` area label at all, which was re-derived in this file's header rather
                   than assumed.
disposition:       major-refactor — routed to Phase 68's `MAJOR-REFACTORS.md` with the enumeration
                   above attached, so the pin set does not have to be re-derived; the separate one-file
                   `@v3` staleness at `P64-D6-004` is the part Phase 67 can apply.
```

```
id:                P64-D6-004
unit:              RU-64-01
location:          .github/workflows/build.yml:18-20
dimension:         D6
secondary:         none
severity:          low
evidence_tier:     inherited
evidence:          Repro-equivalent per INVENTORY 3b, settled by enumeration; no workflow was run.
                   `build.yml:18` references `actions/checkout@v3` and `build.yml:20` references
                   `actions/setup-node@v3`. Every other reference to those two actions in the
                   repository is `@v4` — `actions/checkout@v4` at `deploy-docs.yml:27`,
                   `preview.yml:17,82`, `pr-validation.yml:20,45`, `manual-release.yml:18,111,153` and
                   `pr-vsix.yml:37`, and `actions/setup-node@v4` at `deploy-docs.yml:30`,
                   `preview.yml:20`, `pr-validation.yml:23`, `manual-release.yml:21` and
                   `pr-vsix.yml:42`. `build.yml` is therefore the only file in the repository still on
                   the `@v3` majors, and its third reference, `actions/upload-artifact@v4` at `:41`, is
                   already on `@v4`, so the file is internally inconsistent as well. What a `@v3` tag
                   resolves to today cannot be enumerated from this checkout and is not asserted here;
                   the defect recorded is the divergence from the repository's own established
                   convention and the absence of anything that would close it — `.github/dependabot.yml`
                   declares no `github-actions` ecosystem (`P64-D6-005`), so no automated update will
                   ever propose this bump, which is why it has persisted while five other files moved.
failure_scenario:  A contributor reads `build.yml` to copy the standard checkout-and-setup preamble
                   into a new workflow — the preamble being duplicated across five files already,
                   `P64-D4-003` — and copies the `@v3` pair, propagating the stale reference. More
                   directly: the `@v3` and `@v4` majors of these actions differ in defaults and in the
                   runtime they execute under, so `build.yml`'s job is not running the same
                   checkout-and-setup behaviour as the other five workflows even though the five files
                   read as though it were, and any divergence between `build.yml`'s result and
                   `pr-vsix.yml`'s for the same commit has a cause that is invisible in the diff.
classification:    easy — (1) at most one file: PASS, `build.yml` alone. (2) no public API / grammar /
                   LSP contract change: PASS. (3) adds or upgrades no dependency in
                   `bbj-vscode/package.json` or `bbj-intellij/build.gradle.kts`: PASS. (4)
                   regression-testable with the existing harness: PASS under the reading stated above —
                   the pull request that makes the change runs `build.yml` and demonstrates it. (5)
                   reviewer can name the exact edit: PASS — change `@v3` to `@v4` on lines 18 and 20.
                   (6) severity is neither critical nor high AND primary dimension is not D1: PASS —
                   `low`, D6. All six tests pass.
triage:            fix-now — mapping to `classification: easy` per D-09. It is a version bump with no
                   API change, applicable in Phase 67, and it moves `build.yml` onto the convention the
                   other five workflows already use rather than introducing a new one.
effort:            2
dedup:             none — no open issue in the frozen 15-issue snapshot names GitHub Actions, CI or
                   dependency versions.
disposition:       easy-fix — Phase 67 applies it; the broader SHA-pinning question is separately
                   recorded as `P64-D6-003` and is not bundled into this one.
```

```
id:                P64-D6-005
unit:              RU-64-01
location:          .github/dependabot.yml:3-7
dimension:         D6
secondary:         none
severity:          medium
evidence_tier:     inherited
evidence:          Repro-equivalent per INVENTORY 3b: the claim is about declared coverage and is
                   settled by reading the config and enumerating the trees it does and does not name.
                   `.github/dependabot.yml` is 19 lines and 881 bytes, committed as `be402d6`, and
                   declares `version: 2` with exactly one `updates:` entry — `package-ecosystem: "npm"`,
                   `directory: "/bbj-vscode"`, `schedule: interval: "weekly"` (`:3-7`). Four dependency
                   trees exist in this repository and the config names one of them. Uncovered: (a)
                   `bbj-intellij`'s Gradle tree — `bbj-intellij/build.gradle.kts` plus
                   `gradle/wrapper/gradle-wrapper.properties` — for which there is no `gradle` ecosystem
                   entry, so it receives no automated update coverage at all; (b) `documentation/`'s npm
                   tree, whose `package-lock.json` is 685,194 bytes and which `deploy-docs.yml:36-38`
                   installs and builds on every documentation change, with no entry naming that
                   directory; and (c) the 36 GitHub Actions references enumerated in `P64-D6-003`, for
                   which there is no `github-actions` ecosystem entry — the direct cause of `build.yml`
                   still sitting on `@v3` while five other files moved to `@v4` (`P64-D6-004`).
                   The observable output agrees with the config rather than contradicting it: `git
                   branch -r` lists five open Dependabot branches, all of them
                   `dependabot/npm_and_yarn/bbj-vscode/*` (`concurrently`, `eslint`, `properties-file`,
                   `types/node`, `typescript-eslint`), and none for gradle, github-actions or
                   `documentation/`. The Gradle half of this gap is referred to `RU-64-02`/D6 in plan
                   `64-03`, which under D-10 establishes that the same tree cannot be enumerated locally
                   either; the composed result — unscanned by tooling *and* unenumerable by hand — is
                   materially stronger than either half and belongs to that unit's SEC-08 triage, so it
                   is stated as a referral here rather than pre-empted. The file's two `ignore:` entries
                   are **not** part of this finding: both are well-reasoned, both were verified against
                   the tree, and they are recorded in this unit's D6 cell line as the model of what
                   `triage: accepted-with-reason` requires.
failure_scenario:  A published advisory affects a transitive dependency of the IntelliJ Platform Gradle
                   plugin, or the Docusaurus tree under `documentation/`, or one of the nine GitHub
                   Actions this repository executes. Dependabot opens no pull request, because none of
                   those three trees is declared in its configuration, and the repository's maintainers
                   see the same steady stream of `bbj-vscode` npm updates they always see — five such
                   branches are open right now — which reads as working dependency automation rather
                   than as partial coverage. Nothing else fills the gap: `RU-64-02` will establish that
                   the Gradle tree cannot be enumerated locally either, so for that tree there is no
                   automated signal and no manual one. The failure is therefore silent by construction:
                   the absence of an alert is indistinguishable from the absence of a vulnerability.
classification:    major — (1) at most one file: PASS, `.github/dependabot.yml` alone. (2) no public
                   API / grammar / LSP contract change: PASS. (3) adds or upgrades no dependency in
                   `bbj-vscode/package.json` or `bbj-intellij/build.gradle.kts`: PASS — it changes what
                   is watched, not what is installed. (4) regression-testable with the existing harness:
                   FAIL — Dependabot runs on GitHub's schedule against the default branch, so no vitest
                   run, no Gradle build and no workflow run can demonstrate that a new ecosystem entry
                   works; this is the "conditions a run cannot stage" side of the reading above. (5)
                   reviewer can name the exact edit: FAIL for the finding as a whole — the
                   `github-actions` and `documentation/` entries are nameable, but whether the Gradle
                   tree should be covered by Dependabot, by a different scanner, or accepted with a
                   written reason is exactly the criterion-3 triage decision `RU-64-02` owns. Tests (4)
                   and (5) fail.
triage:            file-issue — mapping to `classification: major` per D-09. Not `fix-now`: it is not a
                   version bump, and the Gradle half needs a decision rather than a bump. Not
                   `accepted-with-reason`: that disposition requires a written reachability argument
                   naming the code path that would have to exist for the gap to matter and showing it
                   does not, and the opposite holds here — `bbj-intellij` ships to users, `documentation/`
                   publishes a public site, and the 36 action references execute on every run.
effort:            4
dedup:             none — 0 of the frozen 15 open issues carry the `dependencies` area label and none
                   names Dependabot, dependency automation, Gradle dependencies or the documentation
                   site's dependencies; this was re-derived from the snapshot's own `Area` column in
                   this file's header rather than assumed.
disposition:       major-refactor — the npm and `github-actions` additions are mechanical, but the
                   Gradle decision is criterion-3 triage that plan `64-03` consolidates, so the whole is
                   documented rather than applied.
```

```
id:                P64-D4-003
unit:              RU-64-01
location:          .github/workflows/build.yml:16-34
dimension:         D4
secondary:         none
severity:          medium
evidence_tier:     trace
evidence:          Written trace across the six files; nothing is run, and nothing needs to be — D4 is
                   a `trace`-tier dimension under INVENTORY 3b and the code shape is the evidence.
                   Five workflows carry the same checkout → Node setup → `npm ci` → build preamble
                   against `bbj-vscode`: `build.yml:17-28`, `pr-validation.yml:20-31`,
                   `pr-vsix.yml:36-51`, `preview.yml:17-32`, `manual-release.yml:18-34`. Three carry a
                   second common sequence — download the `language-server` artifact, `setup-java@v4`
                   with `temurin`/`17`, then `./gradlew` in `bbj-intellij`: `pr-validation.yml:47-61`,
                   `preview.yml:84-102`, `manual-release.yml:113-137`. A third block, the twelve-line
                   version-bump-commit-and-push, is duplicated in full between `preview.yml:34-60` and
                   `manual-release.yml:61-82` with different commit messages and different version
                   arithmetic. No composite action or reusable workflow exists to hold any of them:
                   `ls .github/` prints exactly `dependabot.yml` and `workflows`, so there is no
                   `.github/actions/` directory. The duplication has already drifted on six measurable
                   axes, each counted rather than asserted: step indentation (`build.yml:17` uses 4
                   spaces, the other five use 6); directory handling (`grep -n 'working-directory:'
                   .github/workflows/*.yml` returns 20 hits across five files, while `build.yml:26,33,38`
                   alone uses `cd bbj-vscode` inside `run:`); shell declaration (`grep -n 'shell:'`
                   returns 3 hits, all in `build.yml`); action major (`build.yml:18,20` on `@v3`,
                   everything else `@v4`); caching (only `deploy-docs.yml:29-34`); and step naming for
                   the identical step — "Use Node.js" (`build.yml:19`), "Setup Node.js"
                   (`deploy-docs.yml:29`), "Set up Node" (`pr-validation.yml:22`, `pr-vsix.yml:41`,
                   `preview.yml:19`, `manual-release.yml:20`). Checkout appears as a bare `- uses:` in
                   six places and as a named step in three. What is not recorded as a defect, because
                   the Actions model requires it: every job runs on a fresh runner, so a checkout and a
                   toolchain setup must physically appear in each job that needs them. The defect is
                   that their contents differ and that nothing makes them identical.
failure_scenario:  A maintainer bumps the project to a new Node major. The change has to be made in
                   six places (`build.yml:22`, `deploy-docs.yml:32`, `pr-validation.yml:25`,
                   `pr-vsix.yml:44`, `preview.yml:22`, `manual-release.yml:23`), two of which carry an
                   explanatory comment that also has to be updated and four of which do not. Missing
                   one leaves a workflow silently building the project on a different Node than the
                   others — which is precisely the state `build.yml` is already in with respect to the
                   `actions/*` majors (`P64-D6-004`), where the divergence has persisted long enough
                   for five files to move without it. The same shape governs the caching fix
                   (`P64-D3-001`, five files) and the permissions fix (`P64-D1-005`, four files): each
                   is individually trivial and each fails classification test (1) purely because the
                   preamble was never factored out.
classification:    major — (1) at most one file: FAIL, the abstraction has to be introduced once and
                   adopted in five or six files. (2) no public API / no grammar rule / no LSP contract
                   change: PASS. (3) adds or upgrades no dependency: PASS. (4) regression-testable with
                   the existing harness: PASS under the reading stated at the head of this section —
                   each migrated workflow is exercised by its own next run. (5) reviewer can name the
                   exact edit: FAIL — choosing between a composite action, a reusable workflow and
                   leaving the preambles inline but normalised is a structural decision, and the
                   drifted axes have to be reconciled to a single convention before any of them can be
                   shared. (6) severity is neither critical nor high AND primary dimension is not D1:
                   PASS. Tests (1) and (5) fail.
effort:            8
dedup:             none — the frozen 15-issue snapshot contains no issue about CI structure, workflow
                   maintenance or build configuration; 0 of the 15 carry the `dependencies` area label
                   and 0 name a workflow.
disposition:       major-refactor — a structural change across six workflow files that only a real run
                   of each can validate; Phase 67 does not apply it, and it carries `P64-D3-001`,
                   `P64-D1-005` and `P64-D6-004` with it as the reason each of those is a multi-file
                   edit rather than a one-line one.
```

```
id:                P64-D4-004
unit:              RU-64-01
location:          .github/workflows/build.yml:4-6
dimension:         D4
secondary:         none
severity:          low
evidence_tier:     trace
evidence:          Written trace with a mechanical basis. `build.yml:3-9` declares two triggers:
                   `push` to the branch `typefox-dev` (`:4-6`) and `pull_request` to `main` (`:7-9`).
                   The first names a branch that does not exist in this repository: `git branch -r |
                   wc -l` prints `20` and `git branch -r | grep -ci typefox` prints `0`, and no local
                   branch matches either (`git branch -a | grep -i typefox` returns nothing). The
                   branch name is a remnant of the project's pre-transfer history — the repository's
                   remaining branches are `main`, five `dependabot/npm_and_yarn/bbj-vscode/*` and
                   fourteen feature or fix branches, none of them a `typefox-*` development trunk. Half
                   of this workflow's declared trigger surface therefore cannot fire, and a reader
                   trying to establish when `build.yml` runs has to check the branch list to find out
                   that only one of its two triggers is live. This is recorded separately from
                   `P64-D4-003` because it is dead configuration rather than duplication, and
                   separately from `P64-D2-004` because its consequence is clutter rather than a
                   verification that silently does not run.
failure_scenario:  A contributor reads `build.yml:3-9` and concludes that pushes to a development
                   branch are built by CI, and pushes work to a long-lived branch expecting it to be
                   validated; nothing runs, and the absence of a check reads as "CI is not configured
                   for this branch" only if they already know `typefox-dev` is gone. The dual of the
                   same confusion is a maintainer auditing which events can reach a workflow that runs
                   `npx vsce package` — the answer they must reach is "pull requests to `main`, and
                   nothing else", and the file does not say that.
classification:    easy — (1) at most one file: PASS, `build.yml` alone. (2) no public API / grammar /
                   LSP contract change: PASS. (3) adds or upgrades no dependency: PASS. (4)
                   regression-testable with the existing harness: PASS under the reading stated at the
                   head of this section — the pull request that removes the trigger runs `build.yml`
                   via its surviving `pull_request` trigger and demonstrates it still fires. (5)
                   reviewer can name the exact edit: PASS — delete lines 4-6, leaving `on:` with the
                   `pull_request` trigger only. (6) severity is neither critical nor high AND primary
                   dimension is not D1: PASS — `low`, D4. All six tests pass.
effort:            2
dedup:             none — no open issue in the frozen 15-issue snapshot names CI, branches or workflow
                   triggers.
disposition:       easy-fix — Phase 67 can apply it directly; note that it should be applied alongside
                   the `P64-D3-002` decision about `build.yml`'s `paths:` filter rather than before it,
                   since both edit the same `on:` block.
```

```
id:                P64-D8-002
unit:              RU-64-01
location:          .planning/reviews/INVENTORY.md:932
dimension:         D8
secondary:         none
severity:          low
evidence_tier:     trace
evidence:          Written trace of a stated claim against the tree; nothing is run beyond two
                   enumerations, both recorded with their literal output. INVENTORY's Surface
                   Accounting table states at `:932`, for the surface `.github/`: *"`workflows/` →
                   `RU-64-01`; no other content under `.github/` in this tree"*, and its `.github/`
                   breakdown table (one level down) at `:967-971` lists exactly one sub-surface,
                   `workflows/` (6 files). The tree contradicts both. `ls -A .github/` prints
                   `dependabot.yml` and `workflows`. `git log --oneline -1 -- .github/dependabot.yml`
                   prints `be402d6 chore: tell dependabot to ignore TypeScript major bumps (#402)`, so
                   the file is committed rather than a local artefact, and `wc -c -l
                   .github/dependabot.yml` prints `19` lines and `881` bytes of functional
                   configuration that belongs to no review unit in INVENTORY's own per-unit file
                   lists. INVENTORY is immutable under Phase 60 D-09, so this is recorded and not
                   corrected in place — the finding is the correction, exactly as D-08 handles
                   INVENTORY's stale `node_modules/` note on `RU-64-02`'s row. Phase 64 has adopted the
                   file into `RU-64-01` under **D-19**, and this adoption's arithmetic is stated here
                   precisely and separately from the other one: it adds **one file** to the file gate
                   and **no cell**, because `dependabot.yml` inherits `RU-64-01`'s row rather than
                   earning a file-exception row of its own, its applicability being identical to the
                   workflows' (D5 `n/a — R-D5-CI`, D7 `n/a — R-D7-CI`). The separate **D-20** adoption
                   of `bbj-intellij/gradle/wrapper/gradle-wrapper.jar` into `RU-64-02` **does** earn a
                   file-exception row and so moves both gates. Together the two take the file gate from
                   27 to **29** and set the cell gate at **29/35/64**; attributing both movements to one
                   adoption would mis-state which 8 cells came from where, which is why they are
                   recorded as two adoptions with two different consequences rather than one combined
                   correction. The adoption is reversible: a later reader who disagrees can move the
                   file to its own file-exception row or to `RU-64-02` with a one-line note, because
                   nothing downstream keys on which unit holds it — only the file gate does, and that
                   count is unaffected by which unit owns the file.
failure_scenario:  A reader — Phase 68's DOC-03 coverage statement being the concrete one — reconciles
                   this milestone's review coverage against INVENTORY's file lists and finds 29 files
                   claimed against 27 listed. Without this record the two extra files look like a
                   miscount in the phase that reported them rather than two documented adoptions, and
                   the natural correction is downward: trim the gate to match INVENTORY, which would
                   silently drop from the milestone's coverage the only dependency-automation config in
                   the repository and the fourth vendored binary. The more direct failure is the one
                   this phase avoided by checking: a reviewer trusting `:932` would never open
                   `.github/dependabot.yml` at all, and `P64-D6-005` — three of four dependency trees
                   with no automated update coverage — would not exist.
classification:    major — (1) at most one file: PASS, `.planning/reviews/INVENTORY.md` alone. (2) no
                   public API / no grammar rule / no LSP contract change: PASS. (3) adds or upgrades no
                   dependency: PASS. (4) regression-testable with the existing harness: FAIL — neither
                   vitest nor Gradle can verify a planning document's surface accounting, and no
                   workflow run touches it either, so this is the "conditions a run cannot stage" side
                   of the reading stated at the head of this section. (5) reviewer can name the exact
                   edit: PASS — amend `:932`'s clause and add a `dependabot.yml` row to the `:969-971`
                   table. (6) severity is neither critical nor high AND primary dimension is not D1:
                   PASS — `low`, D8. Test (4) alone fails, which is the whole reason a comment-text
                   change is not automatically `easy` here.
effort:            2
dedup:             none — the frozen 15-issue snapshot is a list of open issues in this repository's
                   public tracker and contains nothing about this milestone's own planning artefacts;
                   0 of the 15 carry the `documentation` area label and none names INVENTORY, review
                   coverage or `.github/`.
disposition:       wontfix — with the reason required by the template: INVENTORY is immutable under
                   Phase 60 D-09, so the correct outcome is not an edit to it. The correction is this
                   record plus the 29-file gate written into this file's header, and Phase 68's DOC-03
                   reconciles the two; a future milestone that rebuilds INVENTORY should carry the
                   corrected accounting forward from here.
```
### Not-reproducible dispositions

Three candidate claims were raised across this unit's two tasks and none clears its tier. All three are written here with the tier they failed and why, per RVW-06's drop-vs-disposition rule, rather than being silently dropped or asserted anyway. This sub-block is **not** empty, and neither is `### Cross-unit referrals` below.

1. **Tier failed: `repro` (D1).** Candidate claim: this repository's default "Workflow permissions" setting is the permissive read-and-write-all option, so the seven jobs that declare no `permissions:` block hold a full-scope `GITHUB_TOKEN`. **Reason not recorded as a finding:** that setting is a GitHub repository or organisation configuration value, not a file in the tree, and it cannot be read from a checkout. What the tree does establish is one-directional and is recorded as `P64-D1-005`: `preview.yml:53-60` and `manual-release.yml:69-82` push to `main` and push tags using the credential `actions/checkout` persists, which cannot succeed unless the default includes `contents: write`. Concluding from a working release path that the setting is therefore the permissive one is an inference about a setting, not an observation of it — the setting could equally be a narrower non-default that happens to grant `contents: write` alone. Settling it requires reading repository settings or observing a run, and this phase does neither. The tree-verifiable half — that 7 of 10 jobs state no scope anywhere in the repository — is what `P64-D1-005` records, and the inferential half is flagged inside that record as an inference. Left visible for a maintainer with settings access to settle in one click.
2. **Tier failed: `repro` (D1).** Candidate claim: a multi-line `name` or `version` field in a pull request head's `bbj-vscode/package.json` would inject an arbitrary additional `key=value` line into `$GITHUB_OUTPUT` at `pr-vsix.yml:62`, setting a step output the workflow never computed. **Reason not recorded as a finding:** the runner's `$GITHUB_OUTPUT` parser has required an explicit heredoc delimiter for multi-line values since 2022, and whether a bare multi-line write is rejected, truncated at the newline or accepted wholesale determines whether the sink exists at all. Settling that requires executing a workflow, which D-12 forbids and this checkout cannot do. Recorded here rather than dropped, with the observation that it would not have been promoted even had it cleared its tier: the consumer analysis in the D1 cell line shows the only fork-reachable consumer is the `path:` action input at `:70`, and a fork pull request already controls the entire workspace, so the sink reaches nothing the contributor does not already own — while the `actions/github-script` consumer at `:80-82` is both `toJSON`-encoded and gated to same-repository pull requests at `:76`.
3. **Tier failed: `trace` (D4).** Candidate claim: `manual-release.yml:72`'s `GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}` binding is dead configuration, because the `git push origin main` and `git push origin "v$VERSION"` at `:81-82` authenticate through the credential `actions/checkout` writes into the local Git config rather than through the environment variable. **Reason not recorded as a finding:** whether Git consults that variable at all in this step depends on the checkout action's credential-persistence behaviour and on the remote's configured extraheader at run time, neither of which is observable from the tree, and the same file's two other bindings are demonstrably live (`:132` feeds the IntelliJ plugin verifier's GitHub listing fetch, `:169` feeds `gh release create` at `:172`). Asserting that the third is vestigial on the strength of the first two being different would be exactly the plausible-but-false claim this standard exists to prevent. The line is noted in the D4 cell line as an unresolved candidate and left for a reviewer who can observe a run.

### Cross-unit referrals

Four entries; this sub-block is **not** empty. None of them is an inherited-item ledger row — this unit owns zero of those, stated explicitly in `### Unit closure` below — and none of them writes into another unit's section.

1. **→ `RU-64-02` (plan `64-03`), D6 / SEC-08.** The Gradle half of `P64-D6-005`. What `RU-64-01` establishes and hands over: `.github/dependabot.yml:3-7` declares exactly one `updates:` entry, `package-ecosystem: "npm"` for `directory: "/bbj-vscode"`, with **no `gradle` entry**, so `bbj-intellij`'s dependency tree receives no automated update coverage at all; corroborated by five open `dependabot/npm_and_yarn/bbj-vscode/*` remote branches and none for gradle. Plan `64-03` establishes under D-10 that the same tree cannot be enumerated locally either, and the composition — unscanned by tooling *and* unenumerable by hand — is a materially stronger SEC-08 result than either half alone. That composition belongs in `RU-64-02`'s `### SEC-08 Dependency Triage`, which consolidates criterion 3's answer; it is stated here as a boundary rather than pre-empted. The `documentation/` and `github-actions` halves of the same finding stay here, because both surfaces are `RU-64-01`'s.
2. **→ `RU-64-02` (plan `64-03`), D2 / D5.** `bbj-vscode/package.json:654` declares `"vscode:prepublish": "shx cp ../LICENSE ./LICENSE && npm run esbuild-base -- --minify && npm run lint"`, and `vsce package` runs that script before packaging. Every packaging step in this unit therefore depends on ESLint passing — `build.yml:39`, `pr-vsix.yml:61`, `preview.yml:67` and `manual-release.yml:89` — including the two that immediately precede a marketplace publish, even though **no workflow in the repository runs `npm run lint` explicitly** and no workflow names lint as a gate. That is a workflow-visible fact, but the file it would be fixed in is `bbj-vscode/package.json`, which INVENTORY assigns to `RU-64-02` for every dimension, so no finding is allocated here (D-18). Referred so `64-03` can assess it against the manifest and against INVENTORY's recorded `npm run lint` baseline.
3. **→ `RU-64-03` (plan `64-01`, closed) — answering its referral, not opening one.** `64-01`'s `### Cross-unit referrals` entry 2 asks whether this repository's dependency automation could ever see the three vendored `tools/formatter/` JARs, and states plainly that the conclusion is `RU-64-01`'s to draw against the config file itself. **The answer is no.** `.github/dependabot.yml:4-5` declares only the npm ecosystem for `/bbj-vscode`; Dependabot's npm ecosystem derives its dependency set from `package.json` and `package-lock.json`, in neither of which any of the three JARs is declared (`RU-64-03` established that as `P64-D6-001`'s premise), and the config declares no `maven` or `gradle` ecosystem that could see a `.jar` by any other route. The three vendored binaries are therefore outside every ecosystem this repository's dependency automation declares, which is a different and stronger statement than "no advisory has been reported for them". `RU-64-03` is closed and its section is not edited; the answer is recorded here, in the unit that owns the file that settles it.
4. **→ Phase 69 (issue drafting), gated on ISSUE-01 and bounded by D-16.** `P64-D1-004` is rated `high` and its `evidence:` field is deliberately redacted under D-16's two-tier rule, which this plan renders rather than re-approves. Whoever drafts its issue must carry the same limits into the issue text — surface, problem class and impact only — and must not reconstruct the omitted detail from the surrounding `### SEC-07 Workflow Security Posture` cells, which describe the same steps at the same level of abstraction for a different purpose. `P64-D1-005` is `medium` and carries no such limit. Recorded as a referral rather than a ledger row, since Phase 69 is not a sweep unit and INVENTORY's routing table contains no Phase 64 row.

### Unit closure

**`RU-64-01` is closed against the four-part stopping rule, part by part.**

**(i) Every live cell it owns carries a verdict plus a written check line.** Six live cells — D1 `fail`, D2 `fail`, D3 `fail`, D4 `fail`, D6 `fail`, D8 `fail` — six verdicts, six written check lines, each naming the concrete checks applied and each phrased against that dimension's own REQUIREMENTS.md wording. This unit owns **no file-exception row**: `.github/dependabot.yml` inherits the unit row under D-19 and adds no cell, and all five of the phase's file-exception rows belong to `RU-64-03` (the three `tools/formatter/` JARs, recorded by plan `64-01`) and to `RU-64-02` (the lockfile and, under D-20, `gradle-wrapper.jar`, both recorded by plan `64-03`). No cell in this unit carries the `pending` placeholder.

**(ii) Coverage is file-granular.** All **seven** files of the unit are named inside this section — `build.yml`, `deploy-docs.yml`, `manual-release.yml`, `preview.yml`, `pr-validation.yml` and `pr-vsix.yml` each in multiple check lines, each as a row of `### SEC-07 Workflow Security Posture`, and each in at least one finding `location:` or `evidence:` anchor; and `.github/dependabot.yml` in the D6 and D8 check lines, in the note beneath the posture table explaining why it has no row there, and as `P64-D6-005`'s `location:`.

**(iii) Every candidate claim raised is either a finding or a written disposition.** Thirteen findings recorded — `P64-D1-004`, `P64-D1-005`, `P64-D2-004`, `P64-D2-005`, `P64-D2-006`, `P64-D3-001`, `P64-D3-002`, `P64-D4-003`, `P64-D4-004`, `P64-D6-003`, `P64-D6-004`, `P64-D6-005`, `P64-D8-002` — each with a `path:line` anchor, a primary dimension, evidence clearing its tier, a verified failure scenario and a non-blank `dedup:` checked against the frozen 15; all three D6 findings carry `triage:` alongside `classification:` per D-09. Three claims did not clear their tier and are written under `### Not-reproducible dispositions` with the tier they failed and why. Several further observations are recorded inside their dimension's check line and deliberately **not** inflated into findings: `manual-release.yml:127,133`'s direct interpolation of the dispatch input into a `run:` block, which is a real sink with no reachable unvalidated trigger and is therefore a pass-with-note under D-12; `pr-vsix.yml:57-62`'s `$GITHUB_OUTPUT` construction; `build.yml:40-45`'s missing `retention-days`; `manual-release.yml:29`'s unpinned global `npm install -g semver`; the four workflows without `timeout-minutes`; `manual-release.yml:47`'s imprecise regex comment; `preview.yml:30`'s step name; the `build-intellij` job id that publishes; and `build.yml:41-42`'s trailing whitespace. Two positives are recorded as results in their own right rather than omitted: the **absence of `pull_request_target`** anywhere in the six workflows, with the search command and its empty output, and the **correctness of `.github/dependabot.yml`'s two `ignore:` entries**, each verified mechanically against `bbj-vscode/package.json` and `bbj-vscode/package-lock.json` and each recorded as the model of what `triage: accepted-with-reason` requires under D-09 rather than as a defect.

**(iv) This unit owns zero inherited items, stated explicitly rather than left as silence.** The inherited-item ledger in this file's header holds exactly one row, and it is addressed to **`RU-64-02`** — `P63-D6-002`, the `bbj-intellij` Gradle toolchain mismatch — which plan `64-03` dispositions. INVENTORY's routing table (D-06) contains **no Phase 64 row** at all, `61-COVERAGE.md` has no downstream-inheritance table, and `62-COVERAGE.md`'s inheritance table names Phases 63, 65, 66, 67, 68 and 69 but no Phase 64. The two Phase 62 body-level deferrals recorded in this file's header are addressed to `RU-64-03` and were dispositioned by plan `64-01`, not here. Part (iv) is therefore satisfied vacuously, and the vacuity is a verified fact rather than an oversight.

**D5, D7, and the absence of parity work — stated so the two `n/a` cells do not read as omissions.** This unit's D5 cell is `n/a` under **`R-D5-CI`**, carried forward verbatim from INVENTORY: workflow YAML orchestrates test execution but is not itself unit-testable code, so test-coverage gaps are recorded against the code the workflow runs, not against the workflow file, and no D5 finding is recorded against `RU-64-01` (D-15). Its D7 cell is `n/a` under **`R-D7-CI`**, also verbatim, and **no cross-IDE parity work of any kind was performed here** — `bbj-intellij/` and `bbj-vscode/` were opened only as read-only context for specific mechanical facts (the `prepare` and `vscode:prepublish` scripts, `main`, the esbuild entry points, the `chevrotain` and `typescript-eslint` constraints, the `/out/` ignore rule and the tracked-file counts), never as a comparison surface between the two IDEs. No `P64-D7-*` finding ID exists anywhere in this phase, and none was wanted (D-14).

**Working tree.** No source file was modified by this unit's sweep. `git status --porcelain bbj-vscode bbj-intellij java-interop .github .planning/reviews/INVENTORY.md .planning/reviews/61-COVERAGE.md .planning/reviews/62-COVERAGE.md .planning/reviews/63-COVERAGE.md` was empty before and after both tasks; `.github/` is read-only review subject matter here and remediation is Phase 67's.

Once (i)-(iv) hold the unit is done and no further reading is licensed. **`RU-64-01` is complete.**

## RU-64-02 — Build, packaging & dependency manifests

**Files (15 / 9,208 lines + 43,583 binary bytes):**
- `bbj-vscode/package.json` (694)
- `bbj-vscode/package-lock.json` (7,894)
- `bbj-vscode/esbuild.mjs` (28)
- `bbj-vscode/eslint.config.js` (18)
- `bbj-vscode/langium-config.json` (22)
- `bbj-vscode/tsconfig.json` (25)
- `bbj-vscode/tsconfig.test.json` (13)
- `bbj-vscode/vitest.config.ts` (30)
- `bbj-intellij/build.gradle.kts` (135)
- `bbj-intellij/settings.gradle.kts` (5)
- `bbj-intellij/gradle.properties` (1)
- `bbj-intellij/gradlew` (244)
- `bbj-intellij/gradlew.bat` (92)
- `bbj-intellij/gradle/wrapper/gradle-wrapper.properties` (7)
- `bbj-intellij/gradle/wrapper/gradle-wrapper.jar` (binary, 43,583 bytes) — **adopted into this unit by D-20**; executed via `gradlew:117`, present in the tree but absent from INVENTORY's file list

**Risk rank:** 3 of 3 Phase 64 units — the npm and Gradle dependency-tree source for SEC-08 and the build/CI configuration surface; lower attacker-reachability than the vendored binaries or the workflow scripts ranked above it.
**Sweep method:** full read except `package-lock.json`, which is read as the D6 dependency-tree source only (R-LOCKFILE), plus `gradle-wrapper.jar` by manifest and hash only, adopted by D-20.
**Owning plan:** 64-03 — Task A (D1, D2, D3, tier `repro`), Task B (the SEC-08 dependency audit: D6 for the unit row and for both file-exception rows), Task C (D4, D5, D8, tier `trace`) — the three-way split D-03 pins for this plan. `64-03` additionally fills the close-out and resolves the inherited-item ledger.

### Cells
- D1 Security — fail — Checked against REQUIREMENTS.md's D1 wording (injection, untrusted input, secret exposure, integrity gaps, privilege/trust-boundary errors) over the 13 readable manifests at tier `repro`, satisfied by line-by-line trace rather than by a runnable reproduction: no command in this phase mutates the tree, and the Gradle build does not execute in this environment at all (`./gradlew --offline -q dependencies` exits 1 in 723 ms — the literal output is recorded in the D6 cell). **(a) npm lifecycle hooks, enumerated rather than assumed.** `package.json:652-668` declares 15 scripts; programmatically intersecting that key set with npm's lifecycle-hook names returns exactly one — **`prepare` at `:653`** (`npm run langium:generate && npm run build`). There is no `preinstall`, `install`, `postinstall`, `prepublish`, `prepublishOnly`, `prepack`, `postpack`, `preuninstall`, `postuninstall` or `dependencies` hook, and that absence is a checked fact rather than an omission. `vscode:prepublish` at `:654` is a **vsce** hook, not an npm one: it fires under `vsce package`/`vsce publish` and never on install. `prepare` fires on every bare `npm install` and on every `npm ci` — `grep -rn 'npm ci' .github/workflows/` returns 8 occurrences across 5 workflows — so on every contributor machine and every CI runner the install step runs Langium code generation plus a full `tsc -b` and `node ./esbuild.mjs` before any reviewed step begins. **What it executes is repository-local only** (`langium generate` reading `langium-config.json` and `src/language/bbj.langium`, then `tsc` and `esbuild`), so it introduces no third-party execution beyond the packages the install itself just placed on disk; it is recorded here as a checked positive, not a finding, and its *cost* is a D3 matter recorded as `P64-D3-003`. **(b) The Gradle wrapper chain, all 7 properties read.** `gradle/wrapper/gradle-wrapper.properties:1-2` set `distributionBase`/`distributionPath`; `:3` sets `distributionUrl=https\://services.gradle.org/distributions/gradle-8.13-bin.zip` — **HTTPS, first-party Gradle host**; `:4` sets `networkTimeout=10000`; `:5` sets **`validateDistributionUrl=true`**, which is present; `:6-7` set `zipStoreBase`/`zipStorePath`. **There is no `distributionSha256Sum` property anywhere in the file**, and that is the one Gradle-side integrity question answerable without a working build, so it is answered explicitly rather than left implicit: it is **absent**. `validateDistributionUrl=true` checks that the URL is well-formed and resolves; it pins no content. The distribution that `gradlew` downloads, unpacks and executes is therefore authenticated by TLS to `services.gradle.org` and by nothing else in this repository. Recorded as `P64-D1-006`, whose evidence also covers the wrapper JAR's own row below. **(c) The wrapper JAR itself is swept directly, on its own file-exception row (D-20)** — `gradlew:117` sets `CLASSPATH=$APP_HOME/gradle/wrapper/gradle-wrapper.jar` and `:208-209` hands that classpath to `org.gradle.wrapper.GradleWrapperMain`, so a 43,583-byte third-party binary committed to this repository executes before any build logic runs; its identity, manifest, reachability and verification status are recorded on the `[file-exception] bbj-intellij/gradle/wrapper/gradle-wrapper.jar · D1` line below rather than inferred here from its two text neighbours. **(d) Build and bundling configuration.** `esbuild.mjs` (28 lines, read in full) marks exactly one module external — `'vscode'` at `:17`, with an accurate comment — and inlines everything else reachable from its two entry points at `:8` (`src/extension.ts`, `src/language/main.ts`). **No value from the build environment reaches the bundle**: `grep -n 'define\|banner\|inject\|process.env' bbj-vscode/esbuild.mjs` returns nothing, and the only `process.argv` reads are the `--watch`/`--minify` flags at `:4-5`, so nothing from the builder's environment is baked into the shipped output. What *is* inlined is a supply-chain fact and was checked against the built artifact rather than assumed: `out/extension.cjs` contains 38 occurrences of `minimatch` and 2 each of `brace-expansion` and `balanced-match`, reached through `vscode-languageclient/node` — that is the reachability evidence the D6 triage below rests on. `langium-config.json` points at `src/language/bbj.langium` (`:6`), emits generated code to `src/language/generated` (`:18`) and a TextMate grammar to `syntaxes/gen-bbj.tmLanguage.json` (`:14`); all three paths exist in this checkout, and the fact that the third output is referenced nowhere else is a D4 matter recorded as `P64-D4-005`. **(e) Declared repositories and plugin sources, every host and every scheme.** `build.gradle.kts:16-21` declares `mavenCentral()` and `intellijPlatform { defaultRepositories() }`; `settings.gradle.kts:1-3` declares `org.jetbrains.intellij.platform.settings` at version `2.11.0` with **no** `pluginManagement { repositories { … } }` block, so plugin resolution falls through to the Gradle Plugin Portal default. `grep -n 'http://' bbj-intellij/build.gradle.kts bbj-intellij/settings.gradle.kts bbj-intellij/gradle.properties bbj-intellij/gradle/wrapper/gradle-wrapper.properties` returns **nothing**: no declared endpoint in this unit resolves over plaintext. **(f) Secrets and paths.** No credential literal appears in any of the 13 readable files. The only credential reference is `build.gradle.kts:75`, `token = providers.gradleProperty("intellijPlatformPublishingToken")`, which reads a Gradle property rather than embedding a value — the correct shape on the manifest side; that the CI callers then pass that value on the command line at `manual-release.yml:137` and `preview.yml:102` is `RU-64-01`'s finding `P64-D1-004`, cross-referenced here rather than re-recorded. `build.gradle.kts:45` reads `src/main/resources/META-INF/description.html` at configuration time; the file exists (1,618 bytes). One developer-machine path is baked into a build task — `build.gradle.kts:133`, `runIde { args = listOf(System.getProperty("user.home") + "/tinybbj") }` — recorded as an observation and deliberately not promoted, because `runIde` is a developer-only sandbox task reached by no CI path and the value derives from the running user's own home rather than being hardcoded to one machine. No manifest in this unit declares a token, a password, or an absolute path outside the project.
- D2 Correctness & error handling — fail — Checked against wrong edge-case behaviour, swallowed failures, inconsistent configuration and resource leaks, read into configuration terms, at tier `repro`; every claim below names the concrete state and the exact `file:line` where behaviour diverges, and two of the three were additionally confirmed by running a read-only command. **Do the two tsconfigs agree, and is the divergence deliberate?** `tsconfig.json:2-17` sets `target: ES6`, `module`/`moduleResolution: Node16`, `strict: true`, `noEmit: true`, `noUnusedLocals`, `noImplicitReturns`, `noImplicitOverride`, `esModuleInterop: false`, `sourceMap: true`, over `include: ["src/**/*.ts"]` (`:18-20`). `tsconfig.test.json:2` extends it and overrides only `noEmit: true` (already true) and `rootDir: "test"` (`:3-6`), then declares `references: [{ path: "tsconfig.json" }]` (`:7-9`) and `include: ["test/**/*",]` (`:10-12`, with a trailing comma tsc tolerates in JSONC). **That reference is not merely redundant — it is invalid, and the divergence is accidental rather than deliberate**: `npx tsc -p tsconfig.test.json --noEmit` reports `tsconfig.test.json(7,18): error TS6306: Referenced project '…/tsconfig.json' must have setting "composite": true.` and `error TS6310: Referenced project '…/tsconfig.json' may not disable emit.` The test-side type-check configuration this repository declares **cannot be compiled at all**, and nothing notices because nothing runs it: `grep -rn 'tsconfig.test'` across every `.json`, `.ts`, `.js`, `.mjs`, `.yml` and `.md` in the tree, excluding `node_modules/` and `.planning/`, returns **zero** hits outside the file itself — no script in `package.json:652-668`, no workflow, no editor config. Recorded as `P64-D2-008`. **Do `package.json`'s scripts do what their names claim, and can any report success while its step failed?** Read one by one: `build` (`:655`) chains `tsc -b tsconfig.json && node ./esbuild.mjs` with `&&`, so the second step cannot run after a failed first and the shell's exit status is the failing step's — correct; `watch` (`:656`) delegates to `concurrently`, which propagates a non-zero child status by default; `lint` (`:657`), `test` (`:658`), `test:watch`, `test:coverage` and `test:bbj` (`:667`) are single commands whose status is the script's status; **no script anywhere in the file contains a pipeline (`|`), a `;` separator, an `|| true`, or a subshell that could mask an exit code** — checked across all 15. The `RUN_BBJ_TESTS=1` prefix on `test:bbj` (`:667`) is the variable the suite actually reads: `test/test-helper.ts:39` reads `process.env.RUN_BBJ_TESTS`, documented at `:31-32`. **But one script builds the wrong artifact.** `package.json:651` declares `"main": "./out/extension.cjs"`, which `esbuild.mjs:8-12` produces. `vscode:prepublish` (`:654`) — the hook `vsce package`/`vsce publish` runs — does **not** invoke that path: it runs `esbuild-base` (`:661`), which bundles only `./src/extension.ts` and writes `--outfile=out/main.js`, a filename nothing declares, loads or references, and which omits the language-server entry point `src/language/main.ts` entirely. The consequence is concrete and visible on disk in this checkout: `out/extension.cjs` and `out/language/main.cjs` are dated 2026-08-17 (from `prepare`/`build`) while `out/main.js` is dated 2026-07-19 and 622,562 bytes — so `--minify` has never applied to the file that actually ships, and packaging silently depends on a prior unrelated build having left `out/extension.cjs` in place. Recorded as `P64-D2-007`. **Does `esbuild.mjs` fail non-zero on its own build failure?** Yes, by construction rather than by handling: `:26` awaits `ctx.rebuild()` at ESM top level with no `try`/`catch`, so an esbuild error rejects the top-level await and Node exits non-zero; the only casualty is `ctx.dispose()` at `:27`, which is skipped on the failure path — immaterial, since the process is terminating. Stated as a checked positive. **Do `eslint.config.js` and `langium-config.json` point at paths that exist?** Yes: `eslint.config.js:5` ignores `out/**` and `src/language/generated/**`, both present, and `:8` matches `**/*.ts`; `langium-config.json:6,14,18` name `src/language/bbj.langium`, `syntaxes/gen-bbj.tmLanguage.json` and `src/language/generated`, all three present. **Is `build.gradle.kts`'s declared Java level consistent with what the build assumes?** `:11-14` sets `sourceCompatibility`/`targetCompatibility` to `VERSION_17` and declares **no `toolchain`**, so the build compiles with whatever JVM launched Gradle rather than provisioning a JDK 17 — the file `P63-D6-002` is anchored in; the correctness observation is recorded here and the toolchain-health **triage** is deliberately left to the `### Inherited item triage` block so the two are not double-counted. The contrast is in this repository: `java-interop/build.gradle:6-10` declares `java { toolchain { languageVersion = JavaLanguageVersion.of(17) } }`, the shape that pins the compiler independently of the launching JVM. **A cross-project input with no producer and no check.** `build.gradle.kts:93-98` (`copyLanguageServer`) and `:115-119` (`prepareSandbox`) both copy `main.cjs` from `${projectDir}/../bbj-vscode/out/language/`, a directory produced by the npm toolchain that Gradle neither builds, declares a dependency on, nor tests for: there is no `dependsOn` on any bbj-vscode step, no `onlyIf`, no `doFirst` existence assertion and no failure path anywhere in the 135-line file. Recorded as `P64-D2-009`; the precise runtime consequence could not be executed here and is written up under `### Not-reproducible dispositions` rather than asserted. **What do the wrapper scripts do when the properties file is missing or malformed?** Neither reads it: `gradlew:117` and `gradlew.bat:71` place the JAR on the classpath and `gradlew:208-209` / `gradlew.bat:75` hand control to `org.gradle.wrapper.GradleWrapperMain`, which is what parses the properties file — so a missing or malformed file surfaces as a Java-side wrapper error rather than a shell-side one, and both scripts still propagate its status (`gradlew:244` uses `exec`, so the JVM's status becomes the script's; `gradlew.bat:84-87` captures `%ERRORLEVEL%` and forces a non-zero code when the failure path is taken). Both fail closed.
- D3 Performance & resource use — fail — Checked against redundant work, missing caches and unbounded growth, read in build terms, at tier `repro` satisfied by trace plus one timed measurement; where a cost is latent rather than active it is said to be so and is not promoted on volume alone. **Does the build compile the same sources twice?** Not within a single `npm run build`: `package.json:655` runs `tsc -b tsconfig.json` where `tsconfig.json:7` sets `noEmit: true`, so `tsc` type-checks and emits nothing, and `esbuild.mjs` then transpiles and bundles without type-checking — two passes with two different jobs, one emit, and that is the intended division rather than duplication. **But the whole build does run twice per CI job, and that is measurable from the manifests alone.** `package.json:653`'s `prepare` hook is `npm run langium:generate && npm run build`, and npm runs `prepare` on every `npm ci`; three workflows then invoke `npm run build` again on the line immediately following — `build.yml:27-28`, `pr-vsix.yml:49-50` and `pr-validation.yml:30-31`. Each of those jobs therefore performs Langium code generation, a full non-incremental `tsc -b` and a full esbuild bundle of both entry points, twice, on every push or pull request. The `-b` build mode buys nothing back: `tsconfig.json` declares no `composite: true` and no `incremental: true`, so there is no project-reference graph and no `.tsbuildinfo` to make the second pass cheap — every invocation is a cold full type-check. Recorded as `P64-D3-003`. **Is the test suite's discovery scoped?** No, and this is the latent half. `vitest.config.ts` (30 lines, read in full) declares **no `include` and no `exclude` for test discovery at all** — its `test` block contains only `coverage` (`:7-28`) — so which files constitute the suite is decided entirely by vitest's built-in defaults, which this repository states nowhere and which do not exclude `out/` (3.5 MB across four generated files in this checkout) or `examples/`. Measured rather than assumed: `npx vitest list --filesOnly` completes in **0.615 s** and resolves **50** files, exactly matching the 50 `*.test.ts` files present under `test/`. So the cost is latent — discovery is fast today because the tree is small and the default exclusions catch `node_modules/` — and it is recorded as latent, not promoted; the *correctness* half of the same fact, that three sources disagree about what the suite is, is D5's and is recorded there. **Is coverage collection scoped?** Yes, and tightly: `vitest.config.ts:8` sets `coverage.enabled: false` so the instrumented run is opt-in via `--coverage` (`package.json:660`'s `test:coverage`), `:12` scopes `include` to `src/**/*.ts`, and `:13-17` excludes `src/language/generated/**` (~17.5k generated LOC), `src/extension.ts` and `**/*.d.ts`. Checked positive. **Does esbuild produce a sourcemap, and is the bundle proportionate?** `esbuild.mjs:19-20` sets `sourcemap: !minify` and `minify` from `--minify`, so the default `build` path emits maps: `out/extension.cjs` is 1,265,974 bytes with a sibling `.cjs.map`, and `out/language/main.cjs` is 2,251,400 bytes — proportionate for a Langium language server that inlines its parser and its generated grammar. The disproportionate item is the 622,562-byte `out/main.js` that no configuration references, which is `P64-D2-007`'s subject and is not double-counted here. **Does any Gradle configuration force a re-resolve or disable caching?** No: `gradle.properties` is a single line (`org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8`) and declares no `--refresh-dependencies` equivalent, no `cacheChangingModulesFor`, no dynamic (`+`) or `-SNAPSHOT` version anywhere in `build.gradle.kts` or `settings.gradle.kts` — every coordinate is a fixed version, which is the cache-friendly case. It also declares no `org.gradle.caching` and no `org.gradle.parallel`, so the build cache and parallel execution are simply off by default; stated as a fact rather than as a defect, since neither is required for a single-project build.
- D4 Maintainability & code smells — pending
- D5 Test coverage gaps — pending
- D6 Dependency health — pending
- D7 Cross-IDE parity — n/a — R-D7-CI — "This surface governs build/CI/packaging output, not end-user-observable IDE runtime behavior; there is no parity claim to make between two IDEs about a shared build pipeline or a shared vendored tool invoked identically by both."
- D8 Comment & doc accuracy — pending

### File-exception cells

Two rows. `bbj-vscode/package-lock.json` is transcribed verbatim from INVENTORY's `### File-exception rows` table. `bbj-intellij/gradle/wrapper/gradle-wrapper.jar` is **adopted by D-20 and is not in INVENTORY**, so it is written with its repository-relative path and its applicability is authored rather than transcribed, mirroring the three `tools/formatter/` JARs exactly: D1 and D6 live, D7 under `R-D7-CI`, the remaining five under `R-JAR-BINARY`. Its provenance question is distinctive and worth stating up front for plan `64-03`: a Gradle wrapper JAR's integrity is normally established by the checksum mechanism declared in `gradle-wrapper.properties`, so whether that property is present is the finding, not an aside.

- [file-exception] bbj-vscode/package-lock.json · D1 — n/a — R-LOCKFILE — "`package-lock.json` is a machine-generated lockfile, never hand-edited; per this document's coverage-denominator convention it is in scope for D6 only, as the dependency-tree source SEC-08 audits. It carries no logic, no comments and no IDE-specific behavior for the other seven dimensions to assess."
- [file-exception] bbj-vscode/package-lock.json · D2 — n/a — R-LOCKFILE — "`package-lock.json` is a machine-generated lockfile, never hand-edited; per this document's coverage-denominator convention it is in scope for D6 only, as the dependency-tree source SEC-08 audits. It carries no logic, no comments and no IDE-specific behavior for the other seven dimensions to assess."
- [file-exception] bbj-vscode/package-lock.json · D3 — n/a — R-LOCKFILE — "`package-lock.json` is a machine-generated lockfile, never hand-edited; per this document's coverage-denominator convention it is in scope for D6 only, as the dependency-tree source SEC-08 audits. It carries no logic, no comments and no IDE-specific behavior for the other seven dimensions to assess."
- [file-exception] bbj-vscode/package-lock.json · D4 — n/a — R-LOCKFILE — "`package-lock.json` is a machine-generated lockfile, never hand-edited; per this document's coverage-denominator convention it is in scope for D6 only, as the dependency-tree source SEC-08 audits. It carries no logic, no comments and no IDE-specific behavior for the other seven dimensions to assess."
- [file-exception] bbj-vscode/package-lock.json · D5 — n/a — R-LOCKFILE — "`package-lock.json` is a machine-generated lockfile, never hand-edited; per this document's coverage-denominator convention it is in scope for D6 only, as the dependency-tree source SEC-08 audits. It carries no logic, no comments and no IDE-specific behavior for the other seven dimensions to assess."
- [file-exception] bbj-vscode/package-lock.json · D6 — pending
- [file-exception] bbj-vscode/package-lock.json · D7 — n/a — R-LOCKFILE — "`package-lock.json` is a machine-generated lockfile, never hand-edited; per this document's coverage-denominator convention it is in scope for D6 only, as the dependency-tree source SEC-08 audits. It carries no logic, no comments and no IDE-specific behavior for the other seven dimensions to assess."
- [file-exception] bbj-vscode/package-lock.json · D8 — n/a — R-LOCKFILE — "`package-lock.json` is a machine-generated lockfile, never hand-edited; per this document's coverage-denominator convention it is in scope for D6 only, as the dependency-tree source SEC-08 audits. It carries no logic, no comments and no IDE-specific behavior for the other seven dimensions to assess."
- [file-exception] bbj-intellij/gradle/wrapper/gradle-wrapper.jar · D1 — fail — Swept **directly**, by manifest and hash only, on the same footing plan `64-01` gave the three `tools/formatter/` JAR rows: `unzip -p <jar> META-INF/MANIFEST.MF` and `sha256sum`, no decompilation, no disassembly, no unpacking beyond the manifest, no execution (D-11). **Artifact identity.** `sha256sum` prints `2db75c40782f5e8ba1fc278a5574bab070adccb2d21ca5a6e5ed840888448046`; size is 43,583 bytes; `ls -la bbj-intellij/gradle/wrapper/` shows the directory holds exactly two entries, this JAR and the 251-byte `gradle-wrapper.properties`. **What the manifest declares, and what it does not.** The whole of `META-INF/MANIFEST.MF` is two lines — `Manifest-Version: 1.0` and `Implementation-Title: Gradle Wrapper` — with **no `Implementation-Version`, no `Implementation-Vendor`, no `Build-Jdk`, no `Created-By` and no signature entry**. The JAR's own bytes therefore cannot tell a reader which Gradle release produced it, so identity has to be established by comparing the hash against Gradle's published wrapper checksums, and that comparison was made rather than described: `https://services.gradle.org/versions/all` publishes a `wrapperChecksum` per release, and this hash matches **19 published entries spanning Gradle 8.10 through 8.12.1** (latest final match: **8.12.1**, built 2025-01-24) — while `gradle-wrapper.properties:3` declares `gradle-8.13-bin.zip`, whose published wrapper checksum is `81a82aaea5abcc8ff68b3dfcb58b3c3c429378efd98e7433460610fecd7ae45f`, a different value. **The committed JAR is not the wrapper JAR of the Gradle version the file beside it declares**, and the two were committed together in a single commit (`git log -- bbj-intellij/gradle/wrapper/` returns exactly one, `e97c587 chore(01-01): initialize Gradle wrapper and build scripts`) and have never been touched since, so the pair was never produced by one `./gradlew wrapper --gradle-version 8.13` run. **Reachability — this binary executes, it is not merely stored.** `gradlew:117` sets `CLASSPATH=$APP_HOME/gradle/wrapper/gradle-wrapper.jar`, `:208-209` passes that classpath and `org.gradle.wrapper.GradleWrapperMain` to the JVM and `:244` `exec`s it; `gradlew.bat:71,75` do the same on Windows. It runs on every contributor build and in every CI job that invokes a Gradle task — `pr-validation.yml:61` (`buildPlugin`), `manual-release.yml:127,133,137` (`buildPlugin`, `verifyPlugin`, `publishPlugin`) and `preview.yml:99` (`publishPlugin`) — and three of those five sit in jobs holding `secrets.JETBRAINS_MARKETPLACE_TOKEN`. **Does anything in this repository verify it before `gradlew` runs?** No, checked three ways: `gradle-wrapper.properties` carries no `distributionSha256Sum` (all 7 lines read above); `grep -rn 'wrapper-validation\|gradle/actions\|setup-gradle' .github/workflows/` returns nothing, so Gradle's own wrapper-validation action is absent from all six workflows; and no dependency-automation config could ever flag it, because `.github/dependabot.yml` declares no `gradle` ecosystem (`RU-64-01`'s `P64-D6-005`). The bootstrap is thus a three-step unverified chain — an unpinned JAR of a version that does not match its own properties file, loading a distribution pinned by nothing but TLS. Recorded as `P64-D1-006`; the identity-and-update-path half is recorded separately on this row's D6 cell as `P64-D6-006`. **D-16 assessment, stated rather than left implicit:** this record describes an integrity gap and cites only Gradle's own public checksum metadata; it contains no exploitation path, and substituting this JAR requires write access to the repository, so the redaction tier is not triggered here.
- [file-exception] bbj-intellij/gradle/wrapper/gradle-wrapper.jar · D2 — n/a — R-JAR-BINARY — "This is a compiled, vendored `.jar` binary; its bytecode cannot be read or diffed in this review, so no correctness trace, performance trace, maintainability judgement, test-coverage claim, or doc-accuracy claim can be written against it. Its provenance and pinning status are assessed under D1 and D6 instead."
- [file-exception] bbj-intellij/gradle/wrapper/gradle-wrapper.jar · D3 — n/a — R-JAR-BINARY — "This is a compiled, vendored `.jar` binary; its bytecode cannot be read or diffed in this review, so no correctness trace, performance trace, maintainability judgement, test-coverage claim, or doc-accuracy claim can be written against it. Its provenance and pinning status are assessed under D1 and D6 instead."
- [file-exception] bbj-intellij/gradle/wrapper/gradle-wrapper.jar · D4 — n/a — R-JAR-BINARY — "This is a compiled, vendored `.jar` binary; its bytecode cannot be read or diffed in this review, so no correctness trace, performance trace, maintainability judgement, test-coverage claim, or doc-accuracy claim can be written against it. Its provenance and pinning status are assessed under D1 and D6 instead."
- [file-exception] bbj-intellij/gradle/wrapper/gradle-wrapper.jar · D5 — n/a — R-JAR-BINARY — "This is a compiled, vendored `.jar` binary; its bytecode cannot be read or diffed in this review, so no correctness trace, performance trace, maintainability judgement, test-coverage claim, or doc-accuracy claim can be written against it. Its provenance and pinning status are assessed under D1 and D6 instead."
- [file-exception] bbj-intellij/gradle/wrapper/gradle-wrapper.jar · D6 — pending
- [file-exception] bbj-intellij/gradle/wrapper/gradle-wrapper.jar · D7 — n/a — R-D7-CI — "This surface governs build/CI/packaging output, not end-user-observable IDE runtime behavior; there is no parity claim to make between two IDEs about a shared build pipeline or a shared vendored tool invoked identically by both."
- [file-exception] bbj-intellij/gradle/wrapper/gradle-wrapper.jar · D8 — n/a — R-JAR-BINARY — "This is a compiled, vendored `.jar` binary; its bytecode cannot be read or diffed in this review, so no correctness trace, performance trace, maintainability judgement, test-coverage claim, or doc-accuracy claim can be written against it. Its provenance and pinning status are assessed under D1 and D6 instead."

### SEC-08 Dependency Triage

_(pending — plan `64-03`; holds the ROADMAP criterion-3 triage table, D-09)_

### Inherited item triage

_(pending — plan `64-03`; re-triages `P63-D6-002`)_

### Findings

All records carry `unit: RU-64-02`. Every `dedup:` is checked against INVENTORY's frozen 15-issue
snapshot, in which **0 of 15** carry the `dependencies` area label and **0 of 15** name CI, a
workflow, build configuration or a vendored binary — a fact re-derived in this file's header, so a
`dedup: none` here is a derived result rather than a shrug. Findings are grouped by the task that
recorded them; `triage:` is carried on every D6 record per D-09, immediately after
`classification:`.

```
id:                P64-D1-006
unit:              RU-64-02
location:          bbj-intellij/gradle/wrapper/gradle-wrapper.properties:3-5
dimension:         D1
secondary:         [D6]
severity:          high
evidence_tier:     repro
evidence:          Line-by-line trace over the complete 7-line properties file and the two wrapper
                   scripts; no runnable reproduction accompanies this record because the Gradle
                   build does not execute in this environment at all (`./gradlew --offline -q
                   dependencies` exits 1 in 723 ms on the JDK 25.0.3 version check) and this phase
                   mutates nothing. `gradle-wrapper.properties` declares, in full: `:1`
                   `distributionBase=GRADLE_USER_HOME`, `:2` `distributionPath=wrapper/dists`, `:3`
                   `distributionUrl=https\://services.gradle.org/distributions/gradle-8.13-bin.zip`,
                   `:4` `networkTimeout=10000`, `:5` `validateDistributionUrl=true`, `:6`
                   `zipStoreBase=GRADLE_USER_HOME`, `:7` `zipStorePath=wrapper/dists`. There is no
                   `distributionSha256Sum` property, which is the mechanism Gradle provides for
                   pinning the downloaded distribution by content; `validateDistributionUrl=true`
                   only checks that the URL is well-formed and resolves, and pins nothing.
                   Independently, nothing pins the wrapper JAR that performs the download:
                   `gradlew:117` sets `CLASSPATH=$APP_HOME/gradle/wrapper/gradle-wrapper.jar`,
                   `gradlew:208-209` passes that classpath plus
                   `org.gradle.wrapper.GradleWrapperMain` to the JVM and `:244` `exec`s it
                   (`gradlew.bat:71,75` are the Windows equivalents), and
                   `grep -rn 'wrapper-validation\|gradle/actions\|setup-gradle' .github/workflows/`
                   returns nothing, so Gradle's own wrapper-validation action is absent from all six
                   workflows. The JAR's `sha256sum` is
                   `2db75c40782f5e8ba1fc278a5574bab070adccb2d21ca5a6e5ed840888448046`, which matches
                   Gradle's published `wrapperChecksum` for releases 8.10 through 8.12.1 and **not**
                   the `81a82aaea5abcc8ff68b3dfcb58b3c3c429378efd98e7433460610fecd7ae45f` published
                   for the 8.13 distribution this same file declares — so the two halves of the
                   wrapper do not even agree with each other. Resolvable references: Gradle's own
                   release metadata at https://services.gradle.org/versions/all (fields
                   `wrapperChecksum` and `checksum` per release) and
                   https://services.gradle.org/distributions/gradle-8.13-wrapper.jar.sha256. This
                   record describes an integrity gap and publishes no exploitation path; D-16's
                   redaction tier is assessed and not triggered, since substituting either artifact
                   requires write access to this repository.
failure_scenario:  A CI runner or a contributor machine executes `./gradlew publishPlugin`
                   (`manual-release.yml:137`, `preview.yml:99`) or `./gradlew buildPlugin`
                   (`pr-validation.yml:61`, `manual-release.yml:127`). `gradlew:117` puts the
                   committed 43,583-byte JAR on the classpath and runs it; the JAR downloads
                   `gradle-8.13-bin.zip` over TLS and unpacks it into `~/.gradle/wrapper/dists`.
                   Neither artifact is compared against any expected digest at any point: not the
                   JAR (no wrapper-validation step exists in any workflow) and not the distribution
                   (no `distributionSha256Sum`). A distribution served from a compromised mirror or
                   a repository-side substitution of the JAR therefore executes with the full
                   authority of the job — which, for `manual-release.yml:135-137` and
                   `preview.yml:96-102`, includes `secrets.JETBRAINS_MARKETPLACE_TOKEN`, a
                   credential that publishes to every IntelliJ user of this plugin. The
                   version mismatch above is the direct evidence that nothing in this repository or
                   its CI would notice the wrapper JAR being other than expected: it already is.
classification:    major — (1) at most one file: FAIL, the minimal correct fix regenerates both
                   `gradle-wrapper.properties` and `gradle-wrapper.jar` via
                   `./gradlew wrapper --gradle-version <v> --gradle-distribution-sha256-sum <sum>`
                   and adds a validation step to the workflows, touching three or more files.
                   (2) no public API / no grammar rule / no LSP contract change: PASS. (3) adds or
                   upgrades no dependency in `package.json` or `build.gradle.kts`: PASS — the
                   Gradle distribution version is declared in the wrapper properties, not in
                   `build.gradle.kts`. (4) regression-testable with the existing harness: FAIL — the
                   Gradle build does not run in this environment and no test in this repository
                   asserts anything about the wrapper. (5) reviewer can name the exact edit: PASS —
                   add `distributionSha256Sum=<published sum for the chosen release>` to the
                   properties file, regenerate the JAR for that same release, and add
                   `gradle/actions/wrapper-validation` to the workflows that run `./gradlew`.
                   (6) severity is neither critical nor high AND primary dimension is not D1: FAIL
                   on both halves. Tests (1), (4) and (6) fail; (6) is the deliberate safety gate,
                   so this is `major` regardless of how small the properties-file edit looks.
effort:            4
dedup:             none — no open issue in the frozen 15-issue snapshot mentions Gradle, the
                   wrapper, checksums, supply chain or the IntelliJ build; 0 of the 15 carry the
                   `dependencies` label and 0 name CI, a workflow, build configuration or a
                   vendored binary.
disposition:       major-refactor — the fix spans the wrapper pair and the workflow definitions and
                   changes what every build verifies before it runs, so Phase 67 does not apply it
                   unilaterally; it belongs in `MAJOR-REFACTORS.md` alongside `P64-D6-006`, which
                   records the same artifact's identity and update-path half.
```

```
id:                P64-D2-007
unit:              RU-64-02
location:          bbj-vscode/package.json:654,661
dimension:         D2
secondary:         [D3]
severity:          medium
evidence_tier:     repro
evidence:          Line-by-line trace with the divergence confirmed against artefacts on disk; no
                   packaging run was performed because this phase mutates nothing. `package.json:651`
                   declares `"main": "./out/extension.cjs"`. The file of that name is produced only
                   by `esbuild.mjs:7-21`, whose `entryPoints` are `src/extension.ts` and
                   `src/language/main.ts` (`:8`), whose `outdir` is `out` (`:9`) and whose
                   `outExtension` maps `.js` to `.cjs` (`:10-12`); `esbuild.mjs` is invoked only by
                   `build` (`:655`) and `watch` (`:656`). The hook that `vsce package` and
                   `vsce publish` run is `vscode:prepublish` (`:654`), which is
                   `shx cp ../LICENSE ./LICENSE && npm run esbuild-base -- --minify && npm run lint`.
                   `esbuild-base` (`:661`) is
                   `esbuild ./src/extension.ts --bundle --outfile=out/main.js --external:vscode
                   --format=cjs --platform=node`: a single entry point, a different output filename,
                   and no language-server bundle. `grep -rn 'out/main.js'` over the tree excluding
                   `node_modules/` and `.planning/` returns only `package.json:661` itself — nothing
                   loads it. The two sibling scripts `esbuild` (`:662`) and `esbuild-watch` (`:663`)
                   delegate to the same dead output, and `test-compile` (`:664`, `tsc -p ./`) is
                   likewise referenced by nothing. The divergence is visible on disk in this
                   checkout: `out/extension.cjs` (1,265,974 bytes) and `out/language/main.cjs`
                   (2,251,400 bytes) are dated 2026-08-17, while `out/main.js` (622,562 bytes) is
                   dated 2026-07-19 — different builds, months apart, only one of which ships.
                   `.vscodeignore` was read as context to establish what the VSIX contains (it
                   excludes `node_modules` and `src/` but not `out/`); INVENTORY excludes
                   `.vscodeignore` from every unit, so it is cited as context only and no finding is
                   located in it, and it adds no file to this unit's list or to the file gate.
failure_scenario:  A maintainer runs `vsce package` (or the release path at `preview.yml:62-68` /
                   `manual-release.yml:84-90`, which invoke vsce and therefore the same hook).
                   `vscode:prepublish` writes a freshly minified `out/main.js` that nothing
                   references, runs the linter, and exits successfully. vsce then packages the
                   directory: the file named by `main`, `out/extension.cjs`, is whatever an earlier
                   `npm ci`-triggered `prepare` left there — unminified, with its sourcemap — and
                   `out/language/main.cjs`, the language server the IntelliJ plugin also consumes,
                   is likewise the `prepare` output rather than anything `vscode:prepublish`
                   produced. The published extension is therefore never the minified artifact the
                   prepublish hook exists to build, ships a 622 KB unreferenced bundle plus
                   sourcemaps as dead weight, and would ship a stale `out/extension.cjs` outright on
                   any machine where `prepare` did not run immediately before packaging.
classification:    major — (1) at most one file: PASS, the fix is confined to `package.json`'s
                   scripts block. (2) no public API / no grammar rule / no LSP contract change:
                   PASS. (3) adds or upgrades no dependency: PASS. (4) regression-testable with the
                   existing harness: FAIL — vitest runs over `src/` and `test/` and asserts nothing
                   about packaging output; catching this regression needs a VSIX-content check that
                   does not exist. (5) reviewer can name the exact edit: PASS — point
                   `vscode:prepublish` at `node ./esbuild.mjs --minify` and delete the dead
                   `esbuild-base`, `esbuild`, `esbuild-watch` and `test-compile` scripts. (6)
                   severity is neither critical nor high AND primary dimension is not D1: PASS.
                   Only test (4) fails, which is enough to make this `major`.
effort:            2
dedup:             none — no open issue in the frozen 15-issue snapshot mentions packaging, vsce,
                   esbuild, minification or the VSIX; 0 of the 15 carry the `dependencies` label and
                   0 name CI, a workflow, build configuration or a vendored binary.
disposition:       major-refactor — the edit is one line plus four deletions, but it changes what
                   the release path produces, so it wants a deliberate packaging verification
                   rather than an unattended Phase 67 apply.
```

```
id:                P64-D2-008
unit:              RU-64-02
location:          bbj-vscode/tsconfig.test.json:7-9
dimension:         D2
secondary:         [D4, D5]
severity:          medium
evidence_tier:     repro
evidence:          Reproduced by a read-only compiler invocation that emits nothing.
                   `npx tsc -p tsconfig.test.json --noEmit`, run from `bbj-vscode/`, prints exactly
                   two diagnostics and exits non-zero: `tsconfig.test.json(7,18): error TS6306:
                   Referenced project '/home/coder/repos/bbj-language-server/bbj-vscode/tsconfig.json'
                   must have setting "composite": true.` and `tsconfig.test.json(7,18): error
                   TS6310: Referenced project '.../tsconfig.json' may not disable emit.` Both are
                   structural: `tsconfig.test.json:7-9` declares
                   `"references": [{ "path": "tsconfig.json" }]`, while `tsconfig.json:2-17`
                   declares neither `composite: true` nor emit — `:7` sets `noEmit: true`. A
                   project reference is valid only against a composite, emitting project, so this
                   configuration cannot be compiled in any mode that honours the reference. The
                   reason no one has noticed is that nothing runs it:
                   `grep -rn 'tsconfig.test'` across every `.json`, `.ts`, `.js`, `.mjs`, `.yml` and
                   `.md` in the tree, excluding `node_modules/` and `.planning/`, returns zero hits
                   outside the file itself — no entry in `package.json:652-668`, no workflow step,
                   no editor configuration. `package.json:655`'s `build` type-checks
                   `tsconfig.json` only, whose `include` is `["src/**/*.ts"]` (`:18-20`), so the
                   120 TypeScript files under `src/` and `test/` are covered for linting
                   (`:657`, `eslint src test`) but the `test/` half is type-checked by nothing.
                   The file also carries a trailing comma at `:11` (`"test/**/*",`), which tsc
                   tolerates in JSONC and which is noted as cosmetic rather than causal.
failure_scenario:  A contributor follows the file's evident intent and runs
                   `npx tsc -b tsconfig.test.json` (or wires it into `npm run build`, or an editor
                   picks it up as the test project). The build fails immediately with TS6306/TS6310
                   before type-checking a single test file. Meanwhile, in the state that actually
                   ships, every type error in `test/` — 50 test files — passes unnoticed through
                   both `npm run build` and CI, because the only configuration that claims to cover
                   them is the one that cannot run. A type error introduced in a test helper
                   surfaces as a vitest runtime failure with a confusing message rather than as a
                   compile error, or does not surface at all in a code path the suite does not take.
classification:    major — (1) at most one file: PASS if the fix is to drop the invalid
                   `references` block from `tsconfig.test.json`; the alternative fix (make
                   `tsconfig.json` composite and emitting) touches two. (2) no public API / no
                   grammar rule / no LSP contract change: PASS. (3) adds or upgrades no dependency:
                   PASS. (4) regression-testable with the existing harness: FAIL — no test asserts
                   that any tsconfig compiles, and adding one means wiring a type-check step that
                   does not exist today. (5) reviewer can name the exact edit: PASS — delete
                   `tsconfig.test.json:7-9` and add a `typecheck` script that runs
                   `tsc -p tsconfig.test.json --noEmit`. (6) severity is neither critical nor high
                   AND primary dimension is not D1: PASS. Only test (4) fails, which makes this
                   `major`.
effort:            2
dedup:             none — no open issue in the frozen 15-issue snapshot mentions TypeScript
                   configuration, project references or type-checking the test suite; 0 of the 15
                   carry the `dependencies` label and 0 name CI, a workflow or build configuration.
disposition:       major-refactor — the honest fix is not the one-line deletion but wiring a
                   type-check for `test/` that nothing runs today, which is a build-pipeline change
                   rather than an unattended edit.
```

```
id:                P64-D2-009
unit:              RU-64-02
location:          bbj-intellij/build.gradle.kts:93-98,115-119
dimension:         D2
secondary:         none
severity:          medium
evidence_tier:     repro
evidence:          Line-by-line trace over the complete 135-line file; no runnable reproduction
                   accompanies this record because the Gradle build does not execute in this
                   environment (`./gradlew --offline -q dependencies` exits 1 in 723 ms — literal
                   output recorded in the D6 cell) and this phase mutates nothing. Two tasks copy an
                   artefact produced by a different toolchain: `copyLanguageServer` at `:93-98`
                   copies `main.cjs` `from("${projectDir}/../bbj-vscode/out/language/")` into
                   `resources/main/language-server`, and the `prepareSandbox` customisation at
                   `:115-119` copies the same file into `${pluginName}/lib/language-server`.
                   `out/language/main.cjs` is produced only by `bbj-vscode`'s `npm run build`
                   (`bbj-vscode/package.json:655` → `esbuild.mjs:8-12`), and `bbj-vscode/.gitignore:1`
                   is the line `/out/`, so it is never present in a fresh clone. The whole file was
                   searched for a guard and there is none: no `dependsOn` on any bbj-vscode step,
                   no `Exec` task that runs npm, no `onlyIf`, no `doFirst` existence assertion, no
                   `inputs.files(...).withPropertyName(...)` declaration and no error path — the
                   only `dependsOn` calls in the file are `:110-112`, which wire the three copy
                   tasks into `processResources` and say nothing about their sources. The same
                   pattern applies at `:83-91` (`copyTextMateBundle`) and `:100-107`
                   (`copyWebRunner`), whose sources are tracked files and therefore always present;
                   the language-server copy is the one whose source is a build output.
failure_scenario:  A contributor clones the repository and runs `./gradlew buildPlugin` in
                   `bbj-intellij/` without first running `npm ci && npm run build` in
                   `bbj-vscode/` — the order CLAUDE.md documents as two separate sections and no
                   build file enforces. `../bbj-vscode/out/language/main.cjs` does not exist,
                   because `/out/` is gitignored. Nothing in `build.gradle.kts` declares that
                   dependency, tests for the file, or fails; the copy specifications at `:93-98`
                   and `:115-119` simply have no matching source. The plugin the build assembles is
                   missing the language server it exists to wrap, and the contributor has no signal
                   from the build about why. The same silent-input condition applies in CI at
                   `pr-validation.yml:61`, which is guarded only by an `actions/download-artifact`
                   step earlier in the same job rather than by anything in the Gradle build itself.
classification:    major — (1) at most one file: PASS, the fix is confined to `build.gradle.kts`.
                   (2) no public API / no grammar rule / no LSP contract change: PASS. (3) adds or
                   upgrades no dependency: PASS. (4) regression-testable with the existing harness:
                   FAIL — the Gradle build does not run in this environment, and no test asserts
                   anything about the assembled plugin's contents. (5) reviewer can name the exact
                   edit: PASS — declare the copy inputs explicitly and add a `doFirst` that fails
                   with a directed message when `../bbj-vscode/out/language/main.cjs` is absent.
                   (6) severity is neither critical nor high AND primary dimension is not D1: PASS.
                   Only test (4) fails, which makes this `major`.
effort:            2
dedup:             none — no open issue in the frozen 15-issue snapshot mentions the IntelliJ
                   build, plugin packaging or the language-server copy step; 0 of the 15 carry the
                   `dependencies` label and 0 name CI, a workflow, build configuration or a
                   vendored binary.
disposition:       major-refactor — the fix adds a failure path to a build this environment cannot
                   execute, so it needs a real Gradle run to verify rather than an unattended
                   Phase 67 apply.
```

```
id:                P64-D3-003
unit:              RU-64-02
location:          bbj-vscode/package.json:653
dimension:         D3
secondary:         [D4]
severity:          low
evidence_tier:     repro
evidence:          Line-by-line trace across the manifest and the workflows that invoke it; no
                   runnable reproduction accompanies this record because measuring CI wall-clock
                   would require dispatching a workflow, which this phase does not do.
                   `package.json:653` declares the lifecycle hook
                   `"prepare": "npm run langium:generate && npm run build"`. npm runs `prepare`
                   after every `npm install` **and** every `npm ci`, so it is not opt-in.
                   `grep -rn 'npm ci' .github/workflows/` returns 8 occurrences; three of them are
                   immediately followed by an explicit second build on the next line —
                   `build.yml:27-28`, `pr-vsix.yml:49-50` and `pr-validation.yml:30-31`. Each of
                   those jobs therefore runs `langium generate` (regenerating
                   `src/language/generated/`, ~17.5k LOC, plus
                   `syntaxes/gen-bbj.tmLanguage.json`), a full `tsc -b tsconfig.json` over the 53
                   tracked files under `src/language/` plus the rest of `src/`, and a full esbuild
                   bundle of both entry points — twice. The second pass is not cheap:
                   `tsconfig.json:2-17` declares neither `composite: true` nor `incremental: true`,
                   so `-b` build mode has no project graph and writes no `.tsbuildinfo`, making
                   every invocation a cold full type-check; and `esbuild.mjs` uses
                   `esbuild.context()` + `rebuild()` per process (`:7`, `:26`), so nothing carries
                   over between the two runs either. The redundancy is structural rather than
                   incidental: the workflows are correct to build explicitly, and `prepare` is the
                   hook that makes the explicit build a duplicate.
failure_scenario:  Any push to `typefox-dev`, or any pull request to `main` matching
                   `pr-validation.yml:8-13`'s path filters, or any pull request touching
                   `bbj-vscode/**`. The runner executes `npm ci`, npm fires `prepare`, and the
                   full generate-plus-typecheck-plus-bundle pipeline runs to completion; the next
                   line then runs `npm run build`, repeating the type-check and the bundle from
                   cold. Every CI run of those three workflows pays the build twice, and every
                   contributor who runs `npm install` locally pays it once before doing anything —
                   including contributors who only wanted to update a dependency. The cost is
                   duplicated work rather than incorrect output, which is why this is `low`.
classification:    major — (1) at most one file: PASS, the fix is confined to `package.json`.
                   (2) no public API / no grammar rule / no LSP contract change: PASS. (3) adds or
                   upgrades no dependency: PASS. (4) regression-testable with the existing harness:
                   FAIL — vitest asserts nothing about build timing or lifecycle-hook behaviour,
                   and verifying the change means observing a CI run. (5) reviewer can name the
                   exact edit: PASS — either narrow `prepare` to `npm run langium:generate` (the
                   part a fresh checkout genuinely needs) and let each caller build explicitly, or
                   drop the redundant `npm run build` line from the three workflows. (6) severity
                   is neither critical nor high AND primary dimension is not D1: PASS. Only test
                   (4) fails, which makes this `major`.
effort:            2
dedup:             none — no open issue in the frozen 15-issue snapshot mentions build time, CI
                   duration, npm lifecycle scripts or Langium code generation; 0 of the 15 carry
                   the `dependencies` label and 0 name CI, a workflow or build configuration.
disposition:       major-refactor — the edit is small but it changes what a bare `npm install`
                   leaves behind, which several documented workflows and CLAUDE.md's own quickstart
                   depend on, so it is a deliberate change rather than an unattended one.
```

### Not-reproducible dispositions

_(pending — plan `64-03`)_

### Cross-unit referrals

_(pending — plan `64-03`)_

### Unit closure

_(pending — plan `64-03`)_

## Phase 64 Close-Out

_(pending — plan `64-03` fills all of it.)_

### A. File gate

_(pending)_

### B. Cell-total gate

_(pending)_

### C. Finding accounting

_(pending)_

### D. Inherited-item accounting

_(pending)_

### E. Scope-fidelity note

_(pending)_

### F. ROADMAP success criteria

_(pending)_

### G. Closing confirmations

_(pending)_

### Milestone coverage position (last sweep phase)

_(pending — Phase 64 is the last sweep phase, so this subsection states which INVENTORY rows are recorded across `61`/`62`/`63`/`64-COVERAGE.md` and that `RU-D8-01`/D8 is the sole remainder. Phase 68's DOC-03 full-coverage claim reads it directly.)_
