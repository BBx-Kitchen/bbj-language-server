---
phase: 67
slug: apply-easy-fixes
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-08-19
---

# Phase 67 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

Register origin: `register_authored_at_plan_time: true` — all 12 phase plans carried a
`<threat_model>` block. Verification depth: ASVS L1 (grep-depth), blocking threshold
`security_block_on: high`. Per the secure-phase short-circuit rule, L1 depth with
`threats_open: 0` and a plan-time register is sufficient; no auditor pass was required.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| java-interop socket peer (127.0.0.1:5008) → language server | classpath responses parsed and assigned into the AST without schema validation | class/field/method shapes (untrusted) |
| `.bbj` source text → lexer / parser / inferer | arbitrary workspace file content, including hostile line endings and quote sequences | workspace file content (untrusted) |
| LSP client → completion / symbol providers | request params (position, cancellation token, prefix) arrive from the editor | request parameters (semi-trusted) |
| extension host → spawned `java` / BBjCPL process | the formatter and compiler shell out to external binaries and read stdout | process argv, stdout diagnostics |
| filesystem `<input>.lst` artefacts → decompile-io | polled files may be stale artefacts of an earlier, possibly crashed, run | decompiled source text |
| npm registry → local dependency tree | `npm ci` / `npm audit fix --package-lock-only` resolve and fetch package versions | package tarballs, lockfile entries |
| GitHub Actions trigger surface → CI runners | `on:` / `paths:` decide which events reach a job holding repository secrets | workflow triggers, secrets |
| remote Node distribution → `BbjNodeDownloader` | builds a URL, fetches an archive, extracts and installs onto the local filesystem | archive contents (untrusted) |
| user credentials → `BbjEMTokenStore` / IntelliJ PasswordSafe | an EM token is persisted through PasswordSafe, backing store depends on user config | credential material |
| planning artifacts → later phases | `67-APPLY-SET.md` becomes Phase 68's DOC-01 input; a wrong row silently propagates | ledger provenance |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-67-01-01 | Tampering | `bbj-type-inferer.ts` `getTypeInternal` fallback | medium | mitigate | The fallback resolves `member.returnType` through the inferer's existing class-resolution path only; it must not `eval`, construct a type from an unva… | closed |
| T-67-01-02 | Denial of Service | `bbj-type-inferer.ts` fallback on a cyclic/self-referencing type name | low | accept | The inferer's existing cyclic-reference guards (`bbj-type-inferer.ts:34-40,67-71`) already wrap the resolution path the fallback reuses; the fallback… | closed |
| T-67-01-03 | Repudiation | `67-APPLY-SET.md` row provenance | medium | mitigate | Every `verdict: applied` row carries a git sha resolvable by `git cat-file -e`; the derivation script is committed so any row can be re-derived and an… | closed |
| T-67-01-04 | Information Disclosure | `67-BASELINE.md` capturing raw command output | low | mitigate | Capture only test names, lint warnings and the gradle failure text; redact any absolute path containing a credential or token before committing. | closed |
| T-67-01-SC | Tampering | npm/pip/cargo installs | high | accept | This plan runs no package-manager install and adds no dependency. INVENTORY §3c test 3 requires every `easy-fix` record to add or upgrade no declared… | closed |
| T-67-02-01 | Denial of Service | `connect()` socket leak (P61-D2-001) | medium | mitigate | The in-flight connect promise ensures one socket per disconnected window; the `close`/`error` listeners release the dead reference so file descriptors… | closed |
| T-67-02-02 | Denial of Service | unbounded `_resolvedClasses` (P61-D3-001) | medium | mitigate | Bound the map with a named LRU size cap; the regression test asserts the map never exceeds the cap across more distinct resolutions than the cap. | closed |
| T-67-02-03 | Tampering | peer-supplied class shape assigned into the AST (P61-D2-003, D1 secondary) | high | transfer | The `??= []` default removes the undefined-dereference crash but does NOT validate peer data. The underlying unvalidated-peer-data finding is `P61-D1-… | closed |
| T-67-02-04 | Spoofing | the socket peer's identity is not authenticated | high | transfer | Pre-existing and out of scope: no `easy-fix` record covers peer authentication (Phase 65 produced zero easy-fix records; all D1 findings are `major-re… | closed |
| T-67-02-05 | Information Disclosure | `console.error` on connect failure may print peer path/host detail | low | accept | The existing `e instanceof Error ? e.message : String(e)` narrowing is preserved unchanged; the fix introduces no new logging of peer content. | closed |
| T-67-02-SC | Tampering | npm/pip/cargo installs | high | accept | This plan runs no package-manager install and adds no dependency; INVENTORY §3c test 3 guarantees every easy-fix record adds none. | closed |
| T-67-03-01 | Denial of Service | per-lookup `allElements()` rescan (P61-D3-005) | medium | mitigate | Replace the per-lookup scan with one Map build per index update; the regression test asserts a bounded call count, and result equivalence guards again… | closed |
| T-67-03-02 | Repudiation | silently swallowed workspace-setup failure (P61-D2-016) | medium | mitigate | Route the catch through `logger.error` so a failed setup leaves an audit trail instead of presenting as a successful start. | closed |
| T-67-03-03 | Denial of Service | an unhandled callback throw aborting the document build (P61-D2-017) | medium | mitigate | Wrap the callback body in try/catch with `logger.error`; the build survives one bad callback. | closed |
| T-67-03-04 | Information Disclosure | `logger.error` newly printing workspace folder paths | low | accept | Folder paths are already present in existing log output on this code path; the fix logs the error object, not new path content. Recorded, not separate… | closed |
| T-67-03-05 | Elevation of Privilege | classpath entries merged from a second, less-trusted workspace folder (P61-D2-015) | medium | accept | Merging all folders is the documented intent of a multi-root workspace and is what the finding requires. No `easy-fix` record covers per-folder classp… | closed |
| T-67-03-SC | Tampering | npm/pip/cargo installs | high | accept | No package-manager install and no dependency change in this plan; INVENTORY §3c test 3 guarantees it for every easy-fix record. | closed |
| T-67-04-01 | Denial of Service | uncancellable completion work (P61-D2-013) | medium | mitigate | Checking `cancelToken.isCancellationRequested` at each await boundary bounds the work a rapid-typing client can queue; the regression test asserts ear… | closed |
| T-67-04-02 | Denial of Service | unbounded prefix memoization cache (P61-D3-004) | medium | mitigate | The cache introduced by the fix must itself be bounded or invalidated; the ledger row records the invalidation trigger, and an unbounded map would rei… | closed |
| T-67-04-03 | Tampering | token stream spliced at index -1 (P61-D2-008) | medium | mitigate | Throwing before the splice turns silent stream corruption on malformed input into a visible failure; the regression test drives the missing-token case… | closed |
| T-67-04-04 | Information Disclosure | a completion cache serving one document's candidates to another | medium | mitigate | The cache is keyed on prefix; the ledger row must state whether the key is document-scoped. If it is not, scope it — cross-document candidate bleed is… | closed |
| T-67-04-05 | Denial of Service | catastrophic backtracking in a custom token pattern reordered by P61-D4-005 | low | accept | Phase 61's D1 sweep checked every custom pattern in `bbj-token-builder.ts` for catastrophic-backtracking shapes and found none; the extraction reorder… | closed |
| T-67-04-SC | Tampering | npm/pip/cargo installs | high | accept | No package-manager install and no dependency change; INVENTORY §3c test 3 guarantees it for every easy-fix record. | closed |
| T-67-05-01 | Tampering | `prepareLineSplitter` offset shift (P61-D2-006) | high | mitigate | A length-non-preserving line-ending change shifts every downstream token offset, which would mis-place every diagnostic and every quick-fix range. The… | closed |
| T-67-05-02 | Tampering | `bbj-value-converter.ts` un-escaping (P61-D2-005) | medium | mitigate | The edit is a literal `.replace(/""/g, '"')` on an already-sliced literal — it performs no evaluation, no interpolation and no unescaping of any other… | closed |
| T-67-05-03 | Denial of Service | regex over untrusted CPL output (P61-D2-009) | low | accept | The clamp adds no new regex; Phase 61's D1 sweep found no catastrophic-backtracking shape in this parser's patterns. Recorded, not separately mitigate… | closed |
| T-67-05-04 | Denial of Service | traversal pruning (P61-D2-010) | medium | mitigate | Pruning strictly reduces the nodes visited; the fix cannot increase traversal cost. Result equality against the pre-fix diagnostic set guards against… | closed |
| T-67-05-05 | Spoofing | a duplicate event declaration shadowing the intended one (P61-D2-019) | low | mitigate | Removing or merging the duplicate makes resolution single-valued; the regression test asserts each name is declared exactly once. | closed |
| T-67-05-SC | Tampering | npm/pip/cargo installs | high | accept | No package-manager install and no dependency change; INVENTORY §3c test 3 guarantees it for every easy-fix record. | closed |
| T-67-06-01 | Tampering | an unintended grammar-rule change in `bbj.langium` (P61-D8-002) | high | mitigate | Run `npm run langium:generate` after the edit and require `git status --porcelain src/language/generated/` to be empty. A non-empty diff means the edi… | closed |
| T-67-06-02 | Tampering | deleting a validator range that is actually reachable (P61-D4-006) | medium | mitigate | Confirm no DI binding in `bbj-module.ts` and no external reference points at the removed methods before deleting; the suite-result comparison against… | closed |
| T-67-06-03 | Repudiation | a documentation fix that installs a new inaccurate claim | medium | mitigate | Each doc edit is verified against the code it describes by a grep on the named file or symbol, listed in the acceptance criteria; no claim is written… | closed |
| T-67-06-04 | Denial of Service | `main.ts` extraction breaking the language-server entry point (P61-D4-012) | high | mitigate | `npm run build` must succeed and produce `out/language/main.cjs` — the single binary both IDEs consume — as a gate on that commit, not only vitest. | closed |
| T-67-06-05 | Information Disclosure | `bbj-linker.ts` location formatting leaking absolute workspace paths into diagnostics | low | accept | The extraction preserves the existing formatted strings byte-for-byte; whatever the messages disclose today, they disclose identically after. Any chan… | closed |
| T-67-06-SC | Tampering | npm/pip/cargo installs | high | accept | No package-manager install and no dependency change; INVENTORY §3c test 3 guarantees it for every easy-fix record. | closed |
| T-67-07-01 | Elevation of Privilege | unvalidated `bbjHome` spawn path (P61-D5-005 / P61-D1-003) | high | transfer | The underlying defect — the CPL service spawns whatever `bbjHome` names, unvalidated — is `P61-D1-003`, classified `major-refactor` by INVENTORY §3c t… | closed |
| T-67-07-02 | Tampering | the substitute binary the new CPL test spawns | medium | mitigate | Point `bbjHome` at a fixture inside `bbj-vscode/test/test-data/` that the repo controls; never at a path outside the repo, a temp dir writable by anot… | closed |
| T-67-07-03 | Denial of Service | `example-files.test.ts` now awaiting every parse (P61-D5-004) | low | accept | Awaiting the parses makes the test's runtime real rather than instant. With 1 top-level `.bbj` fixture the cost is negligible; if the fixture set grow… | closed |
| T-67-07-04 | Repudiation | a vacuous D5 test recorded as coverage | medium | mitigate | The anti-vacuous check: each test is observed RED against a deliberately broken local copy, the red message is recorded in the ledger row, and the bro… | closed |
| T-67-07-SC | Tampering | npm/pip/cargo installs | high | accept | No package-manager install and no dependency change; INVENTORY §3c test 3 guarantees it for every easy-fix record. | closed |
| T-67-08-01 | Denial of Service | never-settling format promise (P62-D2-010) | high | mitigate | Add the `else { reject(err) }` branch so any spawn error settles the promise; the regression test drives a non-ENOENT error and asserts rejection unde… | closed |
| T-67-08-02 | Denial of Service | unbounded concurrent formatter spawns (P62-D3-001) | medium | mitigate | Share one in-flight promise per document URI, and delete the map entry on both settle paths so the map cannot grow without bound. | closed |
| T-67-08-03 | Tampering | stale `.lst` accepted as fresh decompile output (P62-D2-011) | high | mitigate | Gate resolution on `mtimeMs` at or after a call-start timestamp — a size match alone can no longer satisfy the poll. The regression test constructs ex… | closed |
| T-67-08-04 | Information Disclosure | a stale `.lst` from an unrelated earlier file surfaced to the user | medium | mitigate | Same mitigation as T-67-08-03: the mtime gate means content written before this call can never be returned by it. | closed |
| T-67-08-05 | Elevation of Privilege | the formatter spawns whatever `java` resolves to on PATH | high | transfer | Pre-existing and out of scope: no `easy-fix` record covers validating the formatter binary path. Any such finding is D1 and therefore `major-refactor`… | closed |
| T-67-08-SC | Tampering | npm/pip/cargo installs | high | accept | No package-manager install and no dependency change; INVENTORY §3c test 3 guarantees it for every easy-fix record. | closed |
| T-67-09-01 | Denial of Service | catastrophic backtracking in an edited TextMate pattern | high | mitigate | Both edited patterns get *simpler*: `P62-D2-008` adds one alternation of two fixed-length branches (`[ \t]` or a zero-width end-of-line lookahead), an… | closed |
| T-67-09-02 | Tampering | a grammar edit reaching IntelliJ users with no Java-side review | medium | mitigate | Recorded explicitly: the grammar is a bundled resource shared by both IDEs, so these three rows are `user_facing: yes` and the plan delta states that… | closed |
| T-67-09-03 | Repudiation | a silent language-server start failure (P62-D2-004) | medium | mitigate | Attach the `.catch()` and surface the failure through the file's existing reporting path, so a non-starting server is reported rather than presenting… | closed |
| T-67-09-04 | Tampering | a deleted trailing comma silently deleting an entry (P62-D2-006) | medium | mitigate | The regression test asserts strict-JSON parseability AND that every collection's entry count matches the pre-fix count recorded in the ledger row. | closed |
| T-67-09-05 | Information Disclosure | the new activation error message echoing a local path or environment detail | low | mitigate | Surface the failure reason without interpolating environment variables or absolute paths beyond what the existing reporting path already prints. | closed |
| T-67-09-SC | Tampering | npm/pip/cargo installs | high | accept | No package-manager install and no dependency change; INVENTORY §3c test 3 guarantees it for every easy-fix record. | closed |
| T-67-10-SC | Tampering | `npm audit fix --package-lock-only` resolving six transitive packages (P64-D6-013) | high | mitigate | No Package Legitimacy Audit table exists for this project (research disabled), so all six packages fall back to [ASSUMED]. Task 2 is a blocking human… | closed |
| T-67-10-01 | Denial of Service | the six moderate advisories (ReDoS in `ajv`/`markdown-it`/`qs`, bounds check in `uuid`) | medium | mitigate | Remediated by the lockfile update. Their reachable path is `@vscode/vsce` during packaging and publishing, so the practical consequence is a failed or… | closed |
| T-67-10-02 | Elevation of Privilege | widening `pr-validation.yml`'s `paths:` filter (P64-D2-004) | medium | accept | The replacement glob broadens which pull requests trigger the job. `pr-validation.yml`'s jobs build and validate only; the secret-holding publish jobs… | closed |
| T-67-10-03 | Repudiation | claiming CI verification that never ran | high | mitigate | No GitHub Actions run is possible in this environment. Every workflow row's `verification:` states the check that actually ran (YAML parse, or `action… | closed |
| T-67-10-04 | Tampering | a lockfile command silently changing more than the record names | high | mitigate | After each lockfile command, assert the `node_modules/` entry count and confirm `git diff bbj-vscode/package.json` is empty. A moved entry count or a… | closed |
| T-67-10-05 | Spoofing | a typosquatted replacement for one of the six packages | high | mitigate | The Task 2 checkpoint requires character-for-character name confirmation and a repository-link check on npmjs.com for each package. | closed |
| T-67-10-06 | Information Disclosure | `npm audit --json` output pasted into a committed artefact | low | mitigate | Record advisory IDs and version moves in the ledger, not raw audit JSON, which can embed local paths. | closed |
| T-67-11-01 | Tampering | archive extraction path handling inside the split `extract` step (P63-D4-001) | high | mitigate | The refactor must move statements, not change them: no path-construction, no extraction-target and no validation logic may be altered. The statement-b… | closed |
| T-67-11-02 | Tampering | download URL construction moving into a new `Platform` helper (P63-D4-001) | high | mitigate | The built URL must be byte-identical for every platform branch the original handled. Record the original and refactored URL forms per branch in the le… | closed |
| T-67-11-03 | Denial of Service | a cleanup/`finally` block no longer running after the split (P63-D4-001) | medium | mitigate | The ordering trace explicitly asserts that any cleanup runs on every path it ran on before, including exception paths. | closed |
| T-67-11-04 | Information Disclosure | the softened `BbjEMTokenStore` Javadoc (P63-D8-003) | medium | mitigate | The correction reduces an overstated security guarantee to an accurate one — a user relying on the original claim would have believed the token was al… | closed |
| T-67-11-05 | Denial of Service | deleting an icon resource still referenced at runtime (P63-D4-014) | medium | mitigate | Before deleting, grep `bbj-intellij/src/` and check `META-INF/plugin.xml` for any reference; a surviving reference blocks the deletion and the row bec… | closed |
| T-67-11-06 | Repudiation | presenting unverified Java edits as verified | high | mitigate | Every row's `verification:` field states `review-only — no compile, no test ran (D-14)`, and the corresponding `must_haves` truth is marked `verificat… | closed |
| T-67-11-SC | Tampering | npm/pip/cargo installs | high | accept | No package-manager install in this plan; `bbj-intellij/build.gradle.kts` is not edited and no Gradle dependency changes. | closed |
| T-67-12-01 | Repudiation | a close-out that restates a requirement's wording as though it were met | high | mitigate | Both shortfall verdicts are written in plain words, name their causes, and are put in front of a human in a blocking checkpoint before the phase seals… | closed |
| T-67-12-02 | Tampering | widening the D-08 flaky exclusion to reach an identical-or-smaller verdict | high | mitigate | Only a `beforeAll` hook timeout in `WorkspaceManager.initializeWorkspace()` may be excluded, argued per occurrence; the acceptance criteria assert tha… | closed |
| T-67-12-03 | Tampering | a ledger row naming a commit that does not exist or a red sha that does not precede its green | medium | mitigate | The audit runs `git cat-file -e` over every sha and `git merge-base --is-ancestor` over every red/green pair; both are machine checks, not readings. | closed |
| T-67-12-04 | Repudiation | a row silently absent from the ledger | high | mitigate | `derive-apply-set.mjs` is re-run and its 77-ID output is diffed against the file's rows in both directions; the script exits non-zero on any count oth… | closed |
| T-67-12-05 | Tampering | editing REQUIREMENTS.md, INVENTORY.md or a closed COVERAGE file to close a gap | high | mitigate | `git log -- .planning/REQUIREMENTS.md` must show no Phase 67 commit and `git status --porcelain .planning/reviews/` must be empty; both are asserted i… | closed |
| T-67-12-06 | Information Disclosure | pasting raw command output containing absolute paths or tokens into a committed artefact | low | mitigate | Capture test names, lint warnings and the gradle failure text; redact any absolute path containing a credential before committing. | closed |
| T-67-12-SC | Tampering | npm/pip/cargo installs | high | accept | This plan runs no package-manager install; `npm test` and `npm run lint` use the tree already installed. | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above `security_block_on` count toward `threats_open`*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

### High-severity mitigations verified at audit time

| Threat | Control | Evidence |
|--------|---------|----------|
| T-67-05-01 | `prepareLineSplitter` preserves token offsets | `test/lexer.test.ts` P61-D2-006 offset-equality tests pass |
| T-67-06-01 | no grammar-rule change in an easy fix | `git status --porcelain bbj-vscode/src/language/generated/` empty; no Phase 67 commit touches `bbj.langium` |
| T-67-06-04 | language-server entry point intact | `npm run build` succeeds and emits `out/language/main.cjs` |
| T-67-08-01 | format promise always settles | `reject(err)` branches present at `document-formatter.ts:89,91,97` |
| T-67-08-03 | stale `.lst` cannot satisfy the poll | `lstStat.mtimeMs >= callStartMs` gate at `decompile-io.ts:85` |
| T-67-09-01 | no catastrophic-backtracking shape introduced | nested-quantifier scan over `bbj.tmLanguage.json`: 0 candidates |
| T-67-10-SC, T-67-10-05 | package legitimacy before any lockfile mutation | blocking human checkpoint approved verbatim after npmjs.com verification (67-10-SUMMARY.md) |
| T-67-10-03 | no CI verification claimed that never ran | every workflow row's `verification:` states "no CI run occurred" |
| T-67-10-04 | lockfile command changed only what was named | node entry-count check + empty `git diff bbj-vscode/package.json` |
| T-67-11-01, T-67-11-02 | Java refactor moves statements, not semantics | 12-step statement-by-statement ordering trace, 67-APPLY-SET.md row 59 |
| T-67-11-06 | unverified Java edits not presented as verified | rows carry `review-only — no compile, no test ran (D-14)`; truth marked `verification: backstop` |
| T-67-12-01, T-67-12-02 | close-out states shortfalls in plain words | FIX-03/FIX-04 recorded as not literally met; human-approved |
| T-67-12-04 | no ledger row silently absent | `derive-apply-set.mjs` re-run, 77-row total diffed both directions |
| T-67-12-05 | no requirements/inventory edit to close a gap | no Phase 67 commit on `REQUIREMENTS.md`; `.planning/reviews/` clean |

### Post-UAT delta

Two fixes were applied during Phase 67 UAT (commit `8194248`) after the plans' registers were
authored. Neither reopens a threat:

- **WR-02** (`java-interop.ts` connection-listener identity guard) touches the control behind
  **T-67-02-01**. The dead-reference release that threat relies on is preserved for the current
  connection; the guard only suppresses a *stale* connection's clobber of a healthy successor.
  The P61-D2-001 regression test (`drops the dead connection and reconnects after the peer
  closes it`) still passes.
- **WR-04** (`bbj-lexer.ts` split narrowed to `/(\r\n|\n)/`) touches the control behind
  **T-67-05-01**. Narrowing restores the pre-fix splitting semantics exactly; the offset-equality
  tests that mitigate T-67-05-01 still pass.

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-67-01 | T-67-01-02 | The inferer's existing cyclic-reference guards (`bbj-type-inferer.ts:34-40,67-71`) already wrap the resolution path the fallback r… | plan-time threat model (Phase 67) | 2026-08-19 |
| AR-67-02 | T-67-01-SC | This plan runs no package-manager install and adds no dependency. INVENTORY §3c test 3 requires every `easy-fix` record to add or… | plan-time threat model (Phase 67) | 2026-08-19 |
| AR-67-03 | T-67-02-05 | The existing `e instanceof Error ? e.message : String(e)` narrowing is preserved unchanged; the fix introduces no new logging of p… | plan-time threat model (Phase 67) | 2026-08-19 |
| AR-67-04 | T-67-02-SC | This plan runs no package-manager install and adds no dependency; INVENTORY §3c test 3 guarantees every easy-fix record adds none. | plan-time threat model (Phase 67) | 2026-08-19 |
| AR-67-05 | T-67-03-04 | Folder paths are already present in existing log output on this code path; the fix logs the error object, not new path content. Re… | plan-time threat model (Phase 67) | 2026-08-19 |
| AR-67-06 | T-67-03-05 | Merging all folders is the documented intent of a multi-root workspace and is what the finding requires. No `easy-fix` record cove… | plan-time threat model (Phase 67) | 2026-08-19 |
| AR-67-07 | T-67-03-SC | No package-manager install and no dependency change in this plan; INVENTORY §3c test 3 guarantees it for every easy-fix record. | plan-time threat model (Phase 67) | 2026-08-19 |
| AR-67-08 | T-67-04-05 | Phase 61's D1 sweep checked every custom pattern in `bbj-token-builder.ts` for catastrophic-backtracking shapes and found none; th… | plan-time threat model (Phase 67) | 2026-08-19 |
| AR-67-09 | T-67-04-SC | No package-manager install and no dependency change; INVENTORY §3c test 3 guarantees it for every easy-fix record. | plan-time threat model (Phase 67) | 2026-08-19 |
| AR-67-10 | T-67-05-03 | The clamp adds no new regex; Phase 61's D1 sweep found no catastrophic-backtracking shape in this parser's patterns. Recorded, not… | plan-time threat model (Phase 67) | 2026-08-19 |
| AR-67-11 | T-67-05-SC | No package-manager install and no dependency change; INVENTORY §3c test 3 guarantees it for every easy-fix record. | plan-time threat model (Phase 67) | 2026-08-19 |
| AR-67-12 | T-67-06-05 | The extraction preserves the existing formatted strings byte-for-byte; whatever the messages disclose today, they disclose identic… | plan-time threat model (Phase 67) | 2026-08-19 |
| AR-67-13 | T-67-06-SC | No package-manager install and no dependency change; INVENTORY §3c test 3 guarantees it for every easy-fix record. | plan-time threat model (Phase 67) | 2026-08-19 |
| AR-67-14 | T-67-07-03 | Awaiting the parses makes the test's runtime real rather than instant. With 1 top-level `.bbj` fixture the cost is negligible; if… | plan-time threat model (Phase 67) | 2026-08-19 |
| AR-67-15 | T-67-07-SC | No package-manager install and no dependency change; INVENTORY §3c test 3 guarantees it for every easy-fix record. | plan-time threat model (Phase 67) | 2026-08-19 |
| AR-67-16 | T-67-08-SC | No package-manager install and no dependency change; INVENTORY §3c test 3 guarantees it for every easy-fix record. | plan-time threat model (Phase 67) | 2026-08-19 |
| AR-67-17 | T-67-09-SC | No package-manager install and no dependency change; INVENTORY §3c test 3 guarantees it for every easy-fix record. | plan-time threat model (Phase 67) | 2026-08-19 |
| AR-67-18 | T-67-10-02 | The replacement glob broadens which pull requests trigger the job. `pr-validation.yml`'s jobs build and validate only; the secret-… | plan-time threat model (Phase 67) | 2026-08-19 |
| AR-67-19 | T-67-11-SC | No package-manager install in this plan; `bbj-intellij/build.gradle.kts` is not edited and no Gradle dependency changes. | plan-time threat model (Phase 67) | 2026-08-19 |
| AR-67-20 | T-67-12-SC | This plan runs no package-manager install; `npm test` and `npm run lint` use the tree already installed. | plan-time threat model (Phase 67) | 2026-08-19 |

*Accepted risks do not resurface in future audit runs.*

---

## Transferred Threats

Routed out of Phase 67 as D1 `major-refactor` findings — Phase 67's own D-05 rule forbids
re-triaging them. Phase 68 (MAJOR-REFACTORS.md) and Phase 69 (issue filing) own these.

| Threat Ref | Component | Underlying finding | Routed to |
|------------|-----------|--------------------|-----------|
| T-67-02-03 | peer-supplied class shape assigned into the AST | P61-D1-002 | Phase 68 / 69 |
| T-67-02-04 | socket peer identity is not authenticated | (no easy-fix record; D1 corpus) | Phase 68 / 69 |
| T-67-07-01 | unvalidated `bbjHome` spawn path | P61-D1-003 | Phase 68 / 69 |
| T-67-08-05 | formatter spawns whatever `java` resolves to on PATH | (D1 by INVENTORY §3c test 6) | Phase 68 / 69 |

T-67-07-01 is the same exposure the code review raised as Critical `CR-01`; Phase 67 UAT test 2
confirmed leaving it untouched was the correct disposition.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-08-19 | 73 | 73 | 0 | /gsd-secure-phase (orchestrator, ASVS L1) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-08-19
