---
phase: 61
slug: language-core-review
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-08-18
---

# Phase 61 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

**Phase character.** Phase 61 is a **review phase**. Its deliverable is
`.planning/reviews/61-COVERAGE.md` — a recorded pass/fail sweep of
`bbj-vscode/src/language/` across dimensions D1–D8. It changed **no source code**:
`git diff --name-only cbb6fee~1..HEAD` resolves entirely inside `.planning/`, with zero
`package.json`/`package-lock.json` deltas. Consequently the register splits in two:

- **Subject-matter threats (`T-61-P0n-S*`, disposition `transfer`)** — threats *in the code under
  review*. Phase 61's contract is to **document and evidence** them; remediation transfers to
  Phase 65/66/67 and filing to Phase 69. They close here on documentation, not on a fix.
- **Process threats (`T-61-P0n-0*`, disposition `mitigate` / `accept`)** — threats to the review's
  own integrity (leaking an unfixed vuln into a public repo, mis-classifying a fix as `easy`,
  seven plans overwriting one shared file, claiming coverage without evidence). These close on
  mitigation evidence found in the committed artifacts.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| java-interop peer on `interopHost:interopPort` → language-server process | Unauthenticated, unencrypted JSON-RPC over a bare `net.Socket`; no TLS, no token exchange, no peer-identity check (`java-interop.ts:91-108,125-142`) | Every `getClassInfo`/`getClassInfos` response field → `JavaClass`/`JavaField`/`JavaMethod`/`DocumentationInfo` AST nodes → hover/completion markdown |
| IDE workspace settings → socket destination & spawned binaries | `initializationOptions.interopHost`/`interopPort` (`bbj-ws-manager.ts:53-55`), `didChangeConfiguration` (`main.ts:151-152`), and `bbj.home` (`window`-scoped, `bbj-vscode/package.json:340`) | Workspace-scoped `.vscode/settings.json` travelling inside a cloned repository |
| `<bbj.home>/bin/bbjcpl` → spawned child process | `spawn(bbjcplBin, ['-N', filePath])` (`bbj-cpl-service.ts:140`), path derived by `getBbjcplPath()` (228-235) under a truthiness check only | Workspace-configured filesystem path → executed program |
| Configured paths (`configPath`, PREFIX, `config.bbx`) → filesystem reads | Path resolution in `bbj-document-builder.ts` / `bbj-ws-manager.ts` | Workspace-controlled paths → file reads potentially outside the workspace root |
| `61-COVERAGE.md` → public repository readers | `.planning/` is committed and this repository is public | An unfixed `critical`/`high` D1 finding becomes world-readable on commit |
| recorded `classification:` → Phase 67 apply path | `easy` would route a fix past MAJOR-REFACTORS.md review | Fix-risk routing decision |
| shared `61-COVERAGE.md` → seven writing plans | One file, seven writers across waves 1–7 | Another unit's recorded coverage |
| `java-interop/` Java service → this review's scope | Read as reference material only (D-13); excluded from every `location:` field | Wire-contract knowledge only |

---

## Threat Register

Dispositions and severities are carried verbatim from each plan's `<threat_model>` block. Status is
this audit's verdict.

### Plan 61-01 — Coverage skeleton + RU-61-06 java-interop sweep

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-61-P01-S1 | Spoofing | `net.Socket` channel to `interopHost:interopPort` | high | transfer | Authentication posture stated as fact in `61-COVERAGE.md` §SEC-06 (2): unauthenticated + unencrypted both directions, `java-interop.ts:91-108,125-142`; server side `SocketServiceApp.java:30-45` read as reference only | closed |
| T-61-P01-S2 | Tampering | JSON-RPC response fields → AST nodes / hover markdown | high | transfer | §SEC-06 (1) and (4) enumerate every peer-controlled field and its unvalidated sink; recorded as `P61-D1-002` (unescaped peer text → markdown) and `P61-D2-003` (unguarded `fields`/`methods` loops) | closed |
| T-61-P01-S3 | Elevation of Privilege | `setConnectionConfig` fed from `initializationOptions` / `didChangeConfiguration` | high | transfer | §SEC-06 (3) answers it: `this.interopPort = port \|\| 5008` is a falsy check, not a type/range check; a workspace-scoped setting silently redirects off loopback. Recorded as `P61-D1-001` | closed |
| T-61-P01-S4 | Denial of Service | connect timeout, per-request timeout race, untimed request paths | medium | transfer | §SEC-06 (5) records all three thresholds and the no-timeout class (`loadClasspath`/`loadImplicitImports`, `java-interop.ts:189-277`); recorded as `P61-D2-002` and `P61-D3-002` | closed |
| T-61-P01-S5 | Information Disclosure | `lib/fs-provider.ts` `bbjlib` provider, `JavadocProvider` | medium | transfer | §SEC-06 (6) confirms the provider serves only its four hardcoded catalog paths (`fs-provider.ts:27-35`) and `JavadocProvider` reads only caller-supplied roots (`java-javadoc.ts:44-86`) | closed |
| T-61-P01-01 | Information Disclosure | unfixed `critical`/`high` D1 finding in a public repo | high | mitigate | D-12 two-tier disclosure honoured. Only one `high` D1 finding exists (`P61-D1-003`); its record states verbatim "Per D-12, the trigger sequence and reproduction script are not published in this record" | closed |
| T-61-P01-02 | Elevation of Privilege | `classification:` → Phase 67 apply path | high | mitigate | All 9 D1 findings carry `classification: major`; 0 blank `classification:` fields across all 73 findings | closed |
| T-61-P01-03 | Tampering | seven plans writing one `61-COVERAGE.md` | medium | mitigate | Waves 1–7 `depends_on`-chained (D-04); each plan asserted exact global counts. Final state 50 verdicts / 38 `n/a` / 88 cells / 0 pending — matches the contract | closed |
| T-61-P01-04 | Repudiation | a coverage claim with no evidence | medium | mitigate | 0 blank `evidence_tier:` fields across 73 findings (33 `repro`, 36 `trace`, 4 `inherited`); 11 unverifiable claims routed to `### Not-reproducible dispositions` per RVW-06 rather than recorded or dropped | closed |
| T-61-P01-05 | Tampering | reading `java-interop/` as reference material | low | mitigate | Verified: no `location:` field resolves inside `java-interop/`. The one Java-side observation routed to `.planning/BACKLOG.md` under `FUT-01` | closed |
| T-61-P01-SC | Tampering | npm / pip / cargo installs | low | accept | See ACC-01 | closed |

### Plan 61-02 — Grammar & lexing (RU-61-01)

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-61-P02-S1 | Denial of Service | terminal regexes in `bbj.langium`, patterns in `bbj-token-builder.ts` | medium | transfer | D1/D3 cells for RU-61-01 record the backtracking and line-splitter checks with named methods; findings transfer to Phase 67 | closed |
| T-61-P02-S2 | Tampering | `bbj-value-converter.ts` value conversion | low | transfer | RU-61-01 D1 cell answers the evaluate/unescape/interpolate question | closed |
| T-61-P02-01 | Information Disclosure | unfixed `critical`/`high` D1 finding in a public repo | high | mitigate | No `critical`/`high` D1 finding in RU-61-01; D-12 rule applied phase-wide (see T-61-P01-01) | closed |
| T-61-P02-02 | Elevation of Privilege | `classification:` → Phase 67 apply path | high | mitigate | All D1 findings `classification: major`; six-test record present | closed |
| T-61-P02-03 | Tampering | seven plans writing one `61-COVERAGE.md` | medium | mitigate | Wave 2 behind `depends_on: [61-01]`; asserted counts held (9→12 verdicts, 41→38 placeholders, 38 `n/a`) | closed |
| T-61-P02-04 | Repudiation | a coverage claim with no evidence | medium | mitigate | RU-61-01 cells name concrete checks; 2 not-reproducible dispositions recorded with their failed tier | closed |
| T-61-P02-05 | Tampering | re-reporting an already-fixed defect | low | mitigate | Verified: no `location:` resolves inside `src/language/generated/`; `a7e1b53`'s cyclic-inheritance fix is not recorded as a live finding | closed |
| T-61-P02-SC | Tampering | npm / pip / cargo installs | low | accept | See ACC-01 | closed |

### Plan 61-03 — Validation & BBjCPL diagnostics (RU-61-03)

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-61-P03-S1 | Elevation of Privilege | command-line assembly in `bbj-cpl-service.ts` | high | transfer | **Confirmed and recorded as `P61-D1-003`** (`severity: high`, `evidence_tier: repro`, `classification: major`, `location: bbj-cpl-service.ts:82-155,228-235`). Argument-array form means no shell injection, but `bbjcplBin` is unvalidated; cross-referenced to SEC-05 for Phase 65, remediation to Phase 67 | closed |
| T-61-P03-S2 | Tampering | compiler output → diagnostics via `bbj-cpl-parser.ts` | medium | transfer | RU-61-03 D1/D2 cells: hostile output is bounded to plain-text diagnostic `message`, no markup path; negative-line-number boundary recorded as `P61-D2-009` | closed |
| T-61-P03-S3 | Denial of Service | per-keystroke validation cost, per-change BBjCPL spawns | medium | transfer | RU-61-03 D3 cell records traversal sharing, hierarchy-walk cost and debounce posture | closed |
| T-61-P03-S4 | Information Disclosure | environment + temp files handed to the spawned compiler | medium | transfer | RU-61-03 D1 cell: no temp files written by this unit for the invocation; the inherited-environment claim failed tier `repro` and is recorded under `### Not-reproducible dispositions`, with the spawn *path* still owned by `P61-D1-003` | closed |
| T-61-P03-01 | Information Disclosure | unfixed `high` D1 finding in a public repo | high | mitigate | `P61-D1-003` is the phase's only `high` D1 finding and carries the explicit D-12 withholding statement | closed |
| T-61-P03-02 | Elevation of Privilege | `classification:` → Phase 67 apply path | high | mitigate | `P61-D1-003` classified `major` on the D-13 severity safety gate, exactly as the register required | closed |
| T-61-P03-03 | Tampering | seven plans writing one `61-COVERAGE.md` | medium | mitigate | Wave 3 behind `depends_on: [61-02]`; asserted counts held (15/35 → 18/32, 38 `n/a` invariant) | closed |
| T-61-P03-04 | Repudiation | re-reporting the fixed cyclic-inheritance hang | medium | mitigate | Not re-recorded; `a7e1b53`'s termination guard confirmed present | closed |
| T-61-P03-05 | Repudiation | a coverage claim with no evidence | medium | mitigate | All 8 unit files named; 2 not-reproducible dispositions with stated failed tiers | closed |
| T-61-P03-SC | Tampering | npm / pip / cargo installs | low | accept | See ACC-01 | closed |

### Plan 61-04 — Scope, linking & type inference (RU-61-02)

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-61-P04-S1 | Denial of Service | scope walks / index rebuilds in multi-project workspaces (#232, DEBT-01) | high | transfer | Re-triaged against current code and recorded as a `P61-D3-*` finding naming DEBT-01, `severity: high` → `classification: major` per D-13; remediation to Phase 66/67 | closed |
| T-61-P04-S2 | Tampering | document-URI resolution from `USE`/PREFIX/configured paths | medium | transfer | RU-61-02 D1 cell could not settle it and issued a cross-unit referral to `RU-61-05`, where it was located in `bbj-document-builder.ts` and promoted to `P61-D1-008` with a direct reproduction | closed |
| T-61-P04-S3 | Tampering | peer-supplied descriptions entering the global index | medium | transfer | RU-61-02 D1 cell; peer-side defect correctly referred to `RU-61-06` (`P61-D1-002`) rather than double-recorded | closed |
| T-61-P04-S4 | Repudiation | unspecified tie-breaking in overload selection / scope shadowing | medium | transfer | RU-61-02 D2 cell states answers for equal-scoring overloads, same-position shadowing, duplicate qualified names and index insertion order | closed |
| T-61-P04-01 | Information Disclosure | unfixed `critical`/`high` D1 finding in a public repo | high | mitigate | No `critical`/`high` D1 finding in RU-61-02; D-12 rule applied phase-wide | closed |
| T-61-P04-02 | Elevation of Privilege | `classification:` → Phase 67 apply path | high | mitigate | All D1 findings `classification: major` | closed |
| T-61-P04-03 | Tampering | seven plans writing one `61-COVERAGE.md` | medium | mitigate | Wave 4 behind `depends_on: [61-03]`; asserted counts held (21/29 → 24/26, 38 `n/a` invariant) | closed |
| T-61-P04-04 | Repudiation | double-recording an item another unit owns | medium | mitigate | The 11 `test/linking.test.ts` interop failures are named as owned by `RU-61-06` (`P61-D5-001`), not duplicated and not dropped | closed |
| T-61-P04-05 | Repudiation | recording shipped v3.9 behavior as a defect | low | mitigate | The three Phase 59 decisions are not recorded as defects | closed |
| T-61-P04-SC | Tampering | npm / pip / cargo installs | low | accept | See ACC-01 | closed |

### Plan 61-05 — LSP feature providers (RU-61-04)

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-61-P05-S1 | Tampering | markdown construction in `bbj-hover.ts` / `bbj-completion-provider.ts` | high | transfer | RU-61-04 D1 cell records the escaping posture; the unescaped-peer-text-into-markdown claim failed tier `repro` at this unit and is dispositioned there, with the peer-side surface owned by `RU-61-06`'s `P61-D1-002` | closed |
| T-61-P05-S2 | Elevation of Privilege | workspace edits/commands from `bbj-code-action-provider.ts`, `bbj-use-insert.ts` | medium | transfer | RU-61-04 D1 cell answers whether either constructs an edit or command from uncontrolled text | closed |
| T-61-P05-S3 | Denial of Service | per-keystroke provider cost, synchronous waits on the peer | medium | transfer | RU-61-04 D3 cell; timeout analysis cross-referenced to `RU-61-06` rather than duplicated | closed |
| T-61-P05-S4 | Repudiation | unspecified ordering/empty-result contracts across 11 providers | low | transfer | RU-61-04 D2 cell states answers for touching ranges, empty/single-token documents and equal-rank ordering | closed |
| T-61-P05-01 | Information Disclosure | unfixed `critical`/`high` D1 finding in a public repo | high | mitigate | No `critical`/`high` D1 finding in RU-61-04; D-12 rule applied phase-wide | closed |
| T-61-P05-02 | Elevation of Privilege | `classification:` → Phase 67 apply path | high | mitigate | All D1 findings `classification: major` | closed |
| T-61-P05-03 | Tampering | seven plans writing one `61-COVERAGE.md` | medium | mitigate | Wave 5 behind `depends_on: [61-04]`; asserted counts held (27/23 → 30/20, 38 `n/a` invariant) | closed |
| T-61-P05-04 | Repudiation | recording a shipped decision or open feature request as a defect | medium | mitigate | Phase 59 decisions and issues #108/#475 handled per the `dedup:` field — 0 blank `dedup:` fields across 73 findings | closed |
| T-61-P05-05 | Repudiation | a coverage claim with no evidence | medium | mitigate | All 11 unit files named; 2 not-reproducible dispositions recorded; `npm run lint` re-run to confirm routed warnings | closed |
| T-61-P05-SC | Tampering | npm / pip / cargo installs | low | accept | See ACC-01 | closed |

### Plan 61-06 — Server lifecycle, DI wiring & workspace management (RU-61-05)

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-61-P06-S1 | Elevation of Privilege | `initializationOptions` in `bbj-ws-manager.ts`, settings-change path in `main.ts` | high | transfer | Confirmed and recorded as `P61-D1-006` (interop host/port validation gap, promoted from `RU-61-06`'s referral); the `bbj.home` sibling gap is `P61-D1-003`. Remediation to Phase 67 | closed |
| T-61-P06-S2 | Information Disclosure | `logger.ts` output at default level | medium | transfer | RU-61-05 D1 cell answers whether a classpath, token, path or document content reaches a user-visible or on-disk log | closed |
| T-61-P06-S3 | Tampering | PREFIX / `config.bbx` path resolution | medium | transfer | Confirmed and recorded as `P61-D1-007` (`configPath`) and `P61-D1-008` (PREFIX traversal), both `severity: medium`, `classification: major` | closed |
| T-61-P06-S4 | Denial of Service | `WorkspaceManager.initializeWorkspace()` cost under load | medium | transfer | RU-61-05 D3 cell profiles the initialization path; recorded as a D5 finding naming both candidate remediations without choosing one | closed |
| T-61-P06-S5 | Elevation of Privilege | command/argument construction in `composer-commands.ts` | medium | transfer | RU-61-05 D1 cell answers whether any command, path or argument is built from user-controlled values | closed |
| T-61-P06-01 | Information Disclosure | unfixed `critical`/`high` D1 finding in a public repo | high | mitigate | RU-61-05's D1 findings are all `severity: medium`; D-12 rule applied phase-wide | closed |
| T-61-P06-02 | Elevation of Privilege | `classification:` → Phase 67 apply path | high | mitigate | `P61-D1-006`/`-007`/`-008` all `classification: major` on the D1-dimension safety gate despite `medium` severity | closed |
| T-61-P06-03 | Tampering | seven plans writing one `61-COVERAGE.md` | medium | mitigate | Wave 6 behind `depends_on: [61-05]`; asserted counts held (33/17 → 36/14, 38 `n/a` invariant) | closed |
| T-61-P06-04 | Repudiation | a cross-unit referral addressed to this unit going unanswered | high | mitigate | **All 12 phase-wide referrals resolved and enumerated in `## Phase 61 Close-Out`.** Every referral addressed to `RU-61-05` was promoted to a finding (`P61-D1-006`, `P61-D1-008`, `P61-D5-013`) or dismissed with a written reason (`trackBbjcplAvailability()`). None left unresolved | closed |
| T-61-P06-05 | Repudiation | a D4 finding proposing the merge STATE.md forbids | medium | mitigate | No proposal to merge/inline/remove `bbj-notifications.ts`; the isolation constraint is recorded as the reason it is not a smell | closed |
| T-61-P06-SC | Tampering | npm / pip / cargo installs | low | accept | See ACC-01 | closed |

### Plan 61-07 — Builtin catalogs (RU-61-07) + phase close-out

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-61-P07-S1 | Tampering | template-literal escaping in the four `.ts` catalogs | low | transfer | RU-61-07 D1 cell records the grep for unescaped backticks / `${` inside catalog content | closed |
| T-61-P07-S2 | Tampering | drift between each `.ts` catalog and its `.bbl` sibling | medium | transfer | RU-61-07 D4 cell records a programmatic diff per pair with the exact differing-line count for all four pairs | closed |
| T-61-P07-S3 | Repudiation | a coverage claim implying a read that did not happen | high | mitigate | D-08 mechanical sweep licensed only with the method named per cell; the sampling protocol, its sources and the four diff counts are present and reproducible. No cell claims a line-by-line read of the 1,880-line catalogs | closed |
| T-61-P07-01 | Repudiation | the phase's own arithmetic silently becoming the contract | high | mitigate | **D-17 closing gate ran and recorded its verdict.** The `awk` re-derivation over `INVENTORY.md` output `50 38 88`; the coverage file's own content counted 50 verdicts / 38 `n/a` / 88 cells / 0 pending. Explicit **Verdict: AGREE** | closed |
| T-61-P07-02 | Repudiation | a file swept by no unit | high | mitigate | Close-out enumerated 53 review-target files from the tree with `ls` (not from a plan list) and grepped each basename against the coverage file — output: nothing missing | closed |
| T-61-P07-03 | Tampering | this plan disturbing six already-recorded sections | medium | mitigate | Wave 7 behind `depends_on: [61-06]`; final asserted counts held (43/7 → 50/0, 38 `n/a` and 24 untouched `.bbl` `n/a` cells invariant) | closed |
| T-61-P07-04 | Information Disclosure | unfixed `critical`/`high` D1 finding in a public repo | medium | mitigate | RU-61-07 recorded no `critical`/`high` D1 finding (static data unit, as anticipated); the D-12 rule stood regardless | closed |
| T-61-P07-05 | Elevation of Privilege | `classification:` → Phase 67 apply path | high | mitigate | All 9 phase-wide D1 findings `classification: major`; 73/73 findings carry a non-blank `classification:` | closed |
| T-61-P07-SC | Tampering | npm / pip / cargo installs | low | accept | See ACC-01 | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above `workflow.security_block_on` (`high`) count toward `threats_open`*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party / later phase)*

---

## Transferred Threats — Downstream Owners

The 26 `transfer` threats close in Phase 61 on **documentation**, not on remediation. The live
security debt they document is carried by these findings and remains open against the codebase:

| Finding | Severity | Location | Transfers to |
|---------|----------|----------|--------------|
| `P61-D1-003` | **high** | `bbj-cpl-service.ts:82-155,228-235` — unvalidated `<bbj.home>/bin/bbjcpl` spawn, reproduced | Phase 65 (SEC-05), Phase 67 (fix), Phase 69 (filing) |
| `P61-D1-001` | medium | `java-interop.ts:116-120` — `interopHost`/`interopPort` unvalidated, falsy-check only | Phase 67 |
| `P61-D1-002` | medium | `java-interop.ts:632-643` — unescaped, unbounded peer text → hover/completion markdown | Phase 67 |
| `P61-D1-006` | medium | `bbj-ws-manager.ts:53-55`, `main.ts:151-152` — input side of the same host/port gap | Phase 67 |
| `P61-D1-007` | medium | `configPath` — arbitrary file read | Phase 67 |
| `P61-D1-008` | medium | PREFIX path traversal (`bbj-document-builder.ts`) — arbitrary file read | Phase 67 |
| `P61-D1-004`, `P61-D1-005` | medium | see `61-COVERAGE.md` | Phase 67 |
| `P61-D1-009` | low | see `61-COVERAGE.md` | Phase 67 |
| `P61-D3-002` | high | `java-interop.ts:42-46,798-820,482` — serialized 10s timeouts behind the global lock | Phase 66/67 |
| `P61-D2-002`, `P61-D2-003` | — | `java-interop.ts:176-181`, `576`/`581` — unhandled rejection, unguarded loops | Phase 67 |
| `P61-D3-*` (DEBT-01/#232) | high | multi-project scope walks & index rebuilds | Phase 66/67 |

**Note for the reader.** `threats_open: 0` here means *Phase 61's own security contract is
satisfied* — every threat it undertook to document is documented, and every threat to the review's
integrity is mitigated. It does **not** mean the codebase is clean. Nine D1 findings, one of them
`high` with a working reproduction, are recorded and awaiting Phase 67.

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| ACC-01 | `T-61-P01-SC` … `T-61-P07-SC` (7 rows) | No plan in Phase 61 ran a package-manager install task; commands were limited to `git`, `grep`, `awk`, `sed`, `diff`, `ls` and the already-installed `npx vitest run` / `npm run lint` harnesses. The package-legitimacy gate is not applicable and no RESEARCH.md audit table was required. **Verified:** `git diff --stat cbb6fee~1..HEAD -- '*package.json' '*package-lock.json'` is empty, and every file the phase touched lives under `.planning/` | gsd-secure-phase audit (orchestrator) | 2026-08-18 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-08-18 | 69 | 69 | 0 | `/gsd-secure-phase 61` (orchestrator, ASVS L1 grep-depth) |

**Breakdown:** 26 `transfer` (closed on documentation, debt carried downstream — see table above) ·
36 `mitigate` (closed on evidence found in committed artifacts) · 7 `accept` (ACC-01).

**Method.** State B — no prior SECURITY.md; register rebuilt from the `<threat_model>` blocks in all
seven `61-0n-PLAN.md` files (`register_authored_at_plan_time: true`, all 7 parseable). No
`## Threat Flags` section exists in this phase's SUMMARY files. With `threats_open: 0`,
`register_authored_at_plan_time: true` and `asvs_level: 1`, the workflow's short-circuit applies:
grep-depth verification is sufficient and no `gsd-security-auditor` subagent was spawned.

**Observation (non-threat).** The close-out's published command
`grep -c "Tier failed:" .planning/reviews/61-COVERAGE.md` now returns `12`, not the stated `11`,
because the command string is itself inside the file and matches itself. The stated count of 11 real
not-reproducible dispositions is correct (verified by line number: 635, 636, 1018, 1019, 1471, 1480,
1830, 1831, 2290, 2291, 2976). A documentation nit, not a security threat.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log (ACC-01)
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-08-18
