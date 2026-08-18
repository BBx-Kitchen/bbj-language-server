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
- D4 Maintainability & code smells — pending
- D5 Test coverage gaps — pending
- D6 Dependency health — fail — Checked against outdated or vulnerable dependencies, license issues and unpinned artifacts, on the unit row's four readable files (the three JAR rows carry their own D6 cells below). **Declared third-party surface:** `run-tests.ts:16-19` imports only Node builtins (`node:net`, `node:fs`, `node:path`, `node:util`) and `:20-26` imports `vscode-jsonrpc/node`, which **is** declared — `bbj-vscode/package.json` lists `vscode-jsonrpc: ^8.2.1` under `dependencies` — and is therefore visible to `npm audit`, to the lockfile and to `.github/dependabot.yml`'s npm ecosystem entry; that is the good case and is recorded as such. The three `.bbj` scripts `use` only BBj-provided and JDK-provided types (`java.net.InetAddress` and `java.util.HashMap` at `em-login.bbj:31-32`, `com.basis.api.admin.BBjAdminFactory` at `em-login.bbj:33` and `em-validate-token.bbj:20`, implicitly at `web.bbj:27`), so they introduce no third-party artifact of their own. **Undeclared tool dependency:** the shebang at `run-tests.ts:1` and the file's own documented usage at `:11-13` both invoke `npx tsx`, and `tsx` appears in neither `dependencies` nor `devDependencies`; `grep -c '"node_modules/tsx"' bbj-vscode/package-lock.json` prints `0` and `ls bbj-vscode/node_modules/tsx` reports it absent, so the only documented way to execute this file resolves an undeclared, unpinned, unlockfiled package from the public registry at run time — invisible to `npm audit`, to the lockfile and to Dependabot alike. Recorded as `P64-D6-001`. The npm and Gradle dependency trees themselves are `RU-64-02`'s, swept in plan `64-03`; this cell stays on what these four files themselves reach for, which is D-02's ordering rationale working as intended.
- D7 Cross-IDE parity — n/a — R-D7-CI — "This surface governs build/CI/packaging output, not end-user-observable IDE runtime behavior; there is no parity claim to make between two IDEs about a shared build pipeline or a shared vendored tool invoked identically by both."
- D8 Comment & doc accuracy — pending

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

Eight records, all `unit: RU-64-03` including the three whose `location:` is a JAR path. Every `dedup:` is checked against INVENTORY's frozen 15-issue snapshot, in which **0 of 15** carry the `dependencies` area label and **0 of 15** name CI, a workflow, build configuration or a vendored binary — re-derived in this file's header rather than assumed.

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

### Not-reproducible dispositions

Two candidate claims were raised during Task 1's sweep and neither clears its tier. Both are written here with the tier they failed and why, per RVW-06's drop-vs-disposition rule, rather than being silently dropped.

1. **Tier failed: `repro` (D2).** Candidate claim: `em-login.bbj` cannot report anything to its caller when invoked with fewer than three arguments. `:12` reads the output path as `ARGV(3,err=*next)`, so a two-argument invocation branches past the assignment and leaves `outputFile!` unset; the guarded writes at `:17`, `:24`, `:41` and `:48` then all target that unset value, which would make every one of the script's four exit paths — including both error paths — unable to write anything at all, leaving the caller unable to distinguish an authentication failure from a harness that never started. **Reason not recorded as a finding:** confirming what `ARGV(n,err=*next)` leaves in the variable on a missing argument, and what `open(ch,mode="O_CREATE,O_TRUNC")` does when handed an unset string, requires executing BBj. No BBj interpreter exists in this checkout, and running one would be a tree-touching action this phase does not take. The control-flow shape is verifiable; the runtime semantics it depends on are not, and asserting them would be exactly the plausible-but-false claim this standard exists to prevent. Left visible for a reviewer with a BBj installation to settle.
2. **Tier failed: `repro` (D2). Inherited from `62-COVERAGE.md:1833`.** Candidate claim: `document-formatter.ts` supplies `BBjCFCli.jar` with **both** an input path (`-i document.uri.fsPath`, `:19-20`) and the live unsaved buffer on stdin (`:82`), so if the JAR's `-i` flag takes precedence over stdin, an unsaved edit would be formatted against stale on-disk content. **Reason not recorded as a finding:** settling which input the JAR honours requires reading its bytecode or running it with divergent `-i`-path and stdin content, and D-11 prohibits both. The manifest cannot settle it either — `BBjCFCli.jar`'s manifest is six header lines (`Manifest-Version`, `Ant-Version`, `Created-By`, `Class-Path`, `X-COMMENT`, `Main-Class`) and carries no usage or argument metadata whatsoever, which was checked before disposing of it rather than assumed. **Disposition: not-reproducible**, carried forward as an open question in `### Vendored Binary Provenance` fact (5) rather than answered by assertion. Phase 62 deferred it here; Phase 64 states plainly that its own method cannot answer it, which is the honest end of that deferral rather than a silent drop.

### Cross-unit referrals

1. **→ `RU-64-02` (plan `64-03`), D6.** `P64-D6-001`'s defect lives at `run-tests.ts:1,11-13`, but the file its fix edits — `bbj-vscode/package.json` — is `RU-64-02`'s for every dimension. Referred so `64-03`'s `### SEC-08 Dependency Triage` sees an undeclared tool dependency that no `npm audit` run over the declared tree can surface, and can state whether its own npm enumeration confirms the absence independently.
2. **→ `RU-64-01` (plan `64-02`), D6/SEC-07.** Whether this repository's dependency automation could ever see the three vendored JARs. What `RU-64-03` establishes and hands over: the three artifacts are `.jar` files under `bbj-vscode/tools/formatter/`, none is declared in any manifest or lockfile, and `.github/dependabot.yml` declares the npm ecosystem for `/bbj-vscode`. The conclusion that follows is `RU-64-01`'s to draw against the file itself, which plan `64-02` owns; stated here as a boundary rather than pre-empted.
3. **→ Phase 65, SEC-04 and SEC-05.** `P64-D1-002` is one leg of the EM token lifecycle (acquisition and validation via `em-login.bbj` and `em-validate-token.bbj`) and touches process spawning. Phase 65 owns the end-to-end synthesis across `BbjEMTokenStore` and both IDEs' launch paths; this unit supplies its leg with full evidence and does not attempt the lifecycle. Recorded as a referral rather than a ledger row, since Phase 65 is a cross-cutting audit and not a sweep unit.

### Unit closure

_(pending — plan `64-01` Task 2)_

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
- D1 Security — pending
- D2 Correctness & error handling — pending
- D3 Performance & resource use — pending
- D4 Maintainability & code smells — pending
- D5 Test coverage gaps — n/a — R-D5-CI — "Workflow YAML orchestrates test execution but is not itself unit-testable code; test-coverage gaps are recorded against the code the workflow runs, not the workflow file itself."
- D6 Dependency health — pending
- D7 Cross-IDE parity — n/a — R-D7-CI — "This surface governs build/CI/packaging output, not end-user-observable IDE runtime behavior; there is no parity claim to make between two IDEs about a shared build pipeline or a shared vendored tool invoked identically by both."
- D8 Comment & doc accuracy — pending

### SEC-07 Workflow Security Posture

_(pending — plan `64-02`)_

### Findings

_(pending — plan `64-02`)_

### Not-reproducible dispositions

_(pending — plan `64-02`)_

### Cross-unit referrals

_(pending — plan `64-02`)_

### Unit closure

_(pending — plan `64-02`)_

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
- D1 Security — pending
- D2 Correctness & error handling — pending
- D3 Performance & resource use — pending
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
- [file-exception] bbj-intellij/gradle/wrapper/gradle-wrapper.jar · D1 — pending
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

_(pending — plan `64-03`)_

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
