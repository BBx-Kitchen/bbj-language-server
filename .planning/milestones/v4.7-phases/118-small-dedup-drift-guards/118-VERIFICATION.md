---
phase: 118-small-dedup-drift-guards
verified: 2026-09-28T21:24:44Z
status: passed
score: 4/4 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 118: Small Dedup & Drift Guards Verification Report

**Phase Goal:** Small duplicated helpers and catalog shapes exist once, and the two hand-synced copies, the `.bbl` catalog files and the `package.json` compiler-option contributions, fail a test as soon as they drift from their source.
**Verified:** 2026-09-28T21:24:44Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth (Roadmap Success Criterion) | Status | Evidence |
|---|---|---|---|
| 1 | `getFunctionReference` is defined once and used by both the signature-help and inlay-hint providers, and both suites pass unchanged | ✓ VERIFIED | `bbj-vscode/src/language/utils.ts` exports the single free function (line 24); `bbj-signature-help-provider.ts` and `bbj-inlay-hint-provider.ts` each `import { getFunctionReference } from "./utils.js"` and call it directly (no protected method remains in either). `grep -l -E 'function getFunctionReference|getFunctionReference\(callNode: MethodCall\)' src/language/*.ts` resolves to only `utils.ts`. Ran `test/functional/lsp-features.test.ts`, `test/inlay-hints.test.ts`, `test/inlay-hints-javadoc.test.ts` live — all pass, no test file in the diff (`git diff --stat 0829ba2c..HEAD -- bbj-vscode/test` shows no line touching these three suites) |
| 2 | The four built-in catalog `.ts` files end with one closing shape, and the catalog tests pass unchanged | ✓ VERIFIED | Byte-inspected head/tail of `events.ts`, `functions.ts`, `labels.ts`, `variables.ts`: all four start with `export const builtinX = \`library` on line 1 and end with `...\n\n\`;\n` (last catalog line, blank line, bare closing backtick+`;`, one final newline). No `.trimLeft()`/`.trimStart()` remains in any of the four. `test/builtin-functions-library.test.ts`, `test/builtin-library-members.test.ts`, `test/example-files.test.ts` ran live and pass |
| 3 | Changing a `.bbl` catalog file so that it no longer matches its `.ts` source makes a test fail | ✓ VERIFIED | Live re-probe (not trusting SUMMARY): appended a line to `variables.bbl` — `test/bbl-catalog-drift.test.ts` failed with `src/language/lib/variables.bbl has drifted from builtinVariables in src/language/lib/variables.ts; rewrite the .bbl from the exported string value`; `git status --porcelain -- bbj-vscode/src/language/lib` was clean before and after the probe (file restored via `git checkout --`). `events.bbl`'s duplicate `ON_MOUSE_ENTER`/`ON_MOUSE_EXIT` entries are gone (`grep -c` returns 2, i.e. one of each) and `functions.bbl` has zero escaped-backtick sequences (`\\\`` count 0) |
| 4 | A compiler option added to, removed from, or given a different default in the shared options table without the matching `bbj.compiler.*` change in `package.json` (or the other way round) makes a test fail | ✓ VERIFIED | Live re-probe: flipped `bbj.compiler.lineNumbering.renumber`'s default in `package.json` — `test/compiler-options-package-json-drift.test.ts` failed with `bbj.compiler.lineNumbering.renumber: default in package.json differs from compiler-options.ts: expected true to strictly equal false`; `package.json` restored clean. Test also checks the reverse direction (every `bbj.compiler.*` key has a table entry, except the reasoned `NOT_BBJCPL_FLAGS` allow-list entry `bbj.compiler.trigger`) and type equality |

**Score:** 4/4 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `bbj-vscode/src/language/utils.ts` | shared `getFunctionReference` | ✓ VERIFIED | exported, wired into both providers, exactly one definition under `src/language` |
| `bbj-vscode/src/language/bbj-signature-help-provider.ts` | resolves callee via shared fn | ✓ VERIFIED | `getFunctionReference(callNode)`; no unused imports (confirmed via clean lint/typecheck) |
| `bbj-vscode/src/language/bbj-inlay-hint-provider.ts` | resolves callee via shared fn | ✓ VERIFIED | `getFunctionReference(node)`; no unused imports |
| `bbj-vscode/src/language/lib/{events,functions,labels,variables}.ts` | one wrapper shape | ✓ VERIFIED | byte-inspected, uniform across all four |
| `bbj-vscode/src/language/lib/{events,functions,labels,variables}.bbl` | byte-identical mirrors | ✓ VERIFIED | drift test passes on unmodified tree; probe confirms it fails on mutation |
| `bbj-vscode/test/bbl-catalog-drift.test.ts` | byte-exact drift guard, 4 pairs + completeness test | ✓ VERIFIED | live-run passes (5 tests); live probe fails as designed |
| `bbj-vscode/test/compiler-options-package-json-drift.test.ts` | two-directional drift guard | ✓ VERIFIED | live-run passes (42 tests); live probe fails as designed; `NOT_BBJCPL_FLAGS` allow-list present and self-checked |
| `.planning/phases/118-small-dedup-drift-guards/COVERAGE.md` | one-line no-API declaration | ✓ VERIFIED | exists, 115 bytes, starts with `No external API integration:` |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `bbj-signature-help-provider.ts` | `utils.ts` | `import { getFunctionReference } from "./utils.js"` + direct call | ✓ WIRED | confirmed in source |
| `bbj-inlay-hint-provider.ts` | `utils.ts` | `import { getFunctionReference } from './utils.js'` + direct call | ✓ WIRED | confirmed in source |
| `bbl-catalog-drift.test.ts` | `lib/{events,functions,labels,variables}.ts` exports | static imports of the four evaluated constants | ✓ WIRED | confirmed in test source |
| `bbl-catalog-drift.test.ts` | `lib/*.bbl` | `fs.readFileSync` from `path.join(__dirname, '..', 'src', 'language', 'lib')` | ✓ WIRED | confirmed in test source |
| `compiler-options-package-json-drift.test.ts` | `compiler-options.ts` `COMPILER_OPTIONS` | direct import, no mocks | ✓ WIRED | confirmed in test source |
| `compiler-options-package-json-drift.test.ts` | `package.json` `contributes.configuration.properties` | `JSON.parse` of the file read via `path.join(__dirname, '..', 'package.json')` | ✓ WIRED | confirmed in test source |

### Behavioral Spot-Checks / Probe Execution

| Behavior | Command | Result | Status |
|---|---|---|---|
| `.bbl` drift caught | Appended `var PROBE_ONLY: int` to `variables.bbl`, ran `bbl-catalog-drift.test.ts` | 1 failed / 4 passed, message named `variables.bbl` exactly, file restored clean | ✓ PASS |
| `package.json` compiler-option drift caught | Flipped default of `bbj.compiler.lineNumbering.renumber` in `package.json`, ran `compiler-options-package-json-drift.test.ts` | 1 failed / 41 passed, message named the exact key, file restored clean | ✓ PASS |
| Targeted suite run (10 files: both drift tests, both catalog suites, both compiler-option suites, lsp-features, inlay-hints ×2, example-files) | `npx vitest run <10 files>` | 156/156 passed | ✓ PASS |
| lint | `npm run lint` | clean, 0 warnings | ✓ PASS |
| typecheck:test | `npm run typecheck:test` | clean | ✓ PASS |
| No planning IDs leaked into source/test | `git diff 0829ba2c..HEAD -- bbj-vscode/src bbj-vscode/test \| grep added-lines \| grep -c <D-NN\|REF-NN\|118-NN\|CR/WR/IN-NN\|Pitfall N\|Phase 1NN>` | 0 | ✓ PASS |
| No debt markers (TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER) added | grep on added lines in diff | 0 | ✓ PASS |
| Working tree clean of stray files | `git status --porcelain` | only pre-existing untracked `.planning/milestone.lock` | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| REF-01 | 118-03 | `getFunctionReference` exists once, shared by both providers (#580) | ✓ SATISFIED | verified above; REQUIREMENTS.md marks `Phase 118 / Complete` |
| REF-04 | 118-01 | Four catalog `.ts` wrappers share one closing shape (#583) | ✓ SATISFIED | verified above; REQUIREMENTS.md marks `Phase 118 / Complete` |
| REF-05 | 118-01 | Test fails when a `.bbl` catalog file drifts from its `.ts` source (#603) | ✓ SATISFIED | verified above (live probe); REQUIREMENTS.md marks `Phase 118 / Complete` |
| REF-06 | 118-02 | Test fails when `package.json` compiler-option contributions drift from `COMPILER_OPTIONS` (#606) | ✓ SATISFIED | verified above (live probe); REQUIREMENTS.md marks `Phase 118 / Complete` |

No orphaned requirements: `grep -E "Phase 118" .planning/REQUIREMENTS.md` lists exactly REF-01, REF-04, REF-05, REF-06, all of which are declared in the three plans' frontmatter.

### Anti-Patterns Found

None in the phase's changed files. `utils.ts` lacks a trailing final newline (code review IN-01, cosmetic, no functional impact) — carried over from the existing code-review report, not a new finding.

### Code Review

`.planning/phases/118-small-dedup-drift-guards/118-REVIEW.md`: 0 critical, 0 warning, 2 info (both cosmetic/informational, no fix required). Consistent with this verification's independent findings.

### Human Verification Required

None. All four roadmap success criteria are mechanically checkable (test-file drift guards, single-definition greps, wrapper-shape byte checks) and were independently re-verified against the live codebase rather than trusted from SUMMARY.md.

### Gaps Summary

None. All four roadmap success criteria hold, all four requirement IDs are accounted for and complete, both new drift guards were independently re-probed (not just trusted from the plan SUMMARYs) and correctly catch drift while restoring their mutated files, lint and typecheck are clean, and no planning identifiers or debt markers were introduced into source or test files.

---

*Verified: 2026-09-28T21:24:44Z*
*Verifier: Claude (gsd-verifier)*
