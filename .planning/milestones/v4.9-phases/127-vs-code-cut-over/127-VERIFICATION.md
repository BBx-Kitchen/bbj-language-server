---
phase: 127-vs-code-cut-over
verified: 2026-10-03T12:00:00Z
status: passed
score: 5/5 must-haves verified (SC3 via 2 overrides)
behavior_unverified: 0
overrides_applied: 2
overrides:
  - must_have: "Decompiling a tokenized program through bbjlst still works, while nothing denumbers through bbjlst any more (in-place decompile of a tokenized program from the open prompt, hand check step 15)"
    reason: "Behaviour unchanged from phase base fbe7e07d (same bbjlst argv and rename); defect tracked as ROADMAP backlog 999.1 for separate planning. Denumber removal verified."
    accepted_by: "Stephan Wald"
    accepted_at: "2026-10-03T11:41:47Z"
  - must_have: "Decompile of a tokenized program reached through a symlink (review WR-01: the prompt offers Decompile, the isTokenizedFile guard refuses it; I/O errors reported as 'not tokenized')"
    reason: "Phase-introduced regression accepted for now; folded into backlog 999.1, which revisits the whole open-binary flow."
    accepted_by: "Stephan Wald"
    accepted_at: "2026-10-03T11:41:47Z"
gaps:
  - truth: "SC3: Decompiling a tokenized program through bbjlst still works, while nothing denumbers through bbjlst any more."
    status: partial
    reason: "Two separate findings. (a) The 'nothing denumbers through bbjlst' half is verified. (b) The 'still works' half is not demonstrated: the user's hand check step 15 (Decompile & Replace of a tokenized program from the open prompt) failed to upgrade the binary to source in place. The bbjlst argv and the .lst rename are unchanged from base fbe7e07d, so the cause is not shown to be phase 127, and the user routed it to ROADMAP backlog 999.1. (c) Independently of step 15, the phase added a guard that is a code-confirmed regression for a tokenized program reached through a symlink (review WR-01): the open prompt offers Decompile, the command then refuses with 'is not a tokenized BBj program'."
    artifacts:
      - path: "bbj-vscode/src/Commands/Commands.cjs"
        issue: "Lines 222-226 and 456-459: isTokenizedFile() guard in front of decompileInPlace and decompileReadonly refuses symlinks and swallows every I/O error as 'not tokenized'. On base fbe7e07d a symlinked tokenized file decompiled through the .lst path."
      - path: "bbj-vscode/src/open-file-prompts.ts"
        issue: "Lines 24 and 57-58: the prompt detects tokenized content with a symlink-following read, so it offers an action the command then refuses."
    missing:
      - "Either make the prompt and the guard use one detection rule (realpath before isTokenizedFile, or do not offer the prompt when isTokenizedFile is false) and stop reporting I/O errors as 'not tokenized' (review WR-01), or accept the symlink refusal explicitly via an override."
      - "Decision on the step 15 failure: accept as a pre-existing defect tracked by backlog 999.1 (override, see human_verification item 1), or fix before this phase is closed."
human_verification:
  - test: "Decide how SC3 / DEN-06 'decompiling a tokenized program through bbjlst keeps working' is closed"
    expected: "Either (A) an override accepting 'unchanged from base, tracked at 999.1' for the in-place decompile failure plus a small fix for the WR-01 symlink regression, or (B) a gap-closure plan that fixes the in-place decompile now"
    why_human: "The phase did not change the failing behaviour, but the success criterion as written ('still works') is not met in the user's own hand check. Whether that is acceptable is a scope call the verifier cannot make."
---

# Phase 127: VS Code Cut-Over Verification Report

**Phase Goal:** VS Code formats and denumbers only through the language server. All 15 formatter settings can be configured, the Denumber command and the open-file prompt run on `bbj/denum`, and the formatter jar and the bbjlst denumber path are gone. The result is proven from the built VSIX against a live BBj 26.03.
**Verified:** 2026-10-03
**Status:** passed with overrides (SC3 / DEN-06: step 15 and WR-01 accepted by the user on 2026-10-03, tracked in backlog 999.1). Originally gaps_found.
**Re-verification:** No, initial verification

## Goal Achievement

Verified against the code in `bbj-vscode/` on branch `gsd/v4.9-bbj-ls-denum-format` (HEAD `178d2d81`), phase base `fbe7e07d`. SUMMARY claims were not taken as evidence; each item below cites a file I read or a command I ran.

### Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | All 15 formatter settings in VS Code with typed controls and applied without restart; `bbj.formatter.javaPath` gone; `splitSingleLineIF` users keep behaviour through `splitSingleLineIf`, old key deprecated | VERIFIED | `package.json` parsed with node: exactly 15 non-deprecated `bbj.formatter.*` keys (`indentWidth` integer 0-16 default 2; 7 booleans; `indentCharacter`, `ifClosingKeyword`, `ifKeywordCase`, `parameterLayout`, `operatorSpacing`, `eolCharacter` as string enums, each with `enumDescriptions` of equal length). `bbj.formatter.splitSingleLineIF` is `["boolean","null"]`, default null, with `deprecationMessage` and `markdownDeprecationMessage`. No `javaPath` in `package.json` or any `src/*.ts`; the only mention is a comment in `bbj-format-settings.ts:115` saying it is dropped. The 15 keys equal `FORMATTER_SETTING_KEYS` in `src/language/bbj-format-settings.ts`. `src/settings-migration.ts` moves a boolean old value to the new key per scope (user, and workspace when trusted), then removes the old key; it never rejects, and `extension.ts:463-482,512` calls it fire-and-forget on activation. "Without restart": `formatter` is read from the `bbj` section and the client `synchronize.configurationSection: 'bbj'` pushes changes; hand check step 4 (change `indentWidth`, then `keywordsToUppercase`, next format reflects each) passed. Targeted vitest: `formatter-settings-schema`, `settings-migration`, `settings-migration-activation` pass. Caveat: see WR-03 (migration only runs at activation). |
| 2 | "Denumber BBj Program" keeps id, menus, keybinding and denumbers the live buffer, unsaved changes included, as one undoable edit; `promptOnOpen` offers Denumber through the same path and still offers read-only opening | VERIFIED | `src/denumber-command.ts` (read in full): resolves a target, opens the document, marks it to suppress the numbered-file prompt, shows it unless visible, sends one `bbj/denum` with `{ uri }`; no save, write, spawn or retry member. `extension.ts:570` registers `bbj.denumber` through `createDenumberCommand`. `package.json` still carries `bbj.denumber` at lines 158, 230 (palette), 258, 320, 347 (three menus) and the pinned test `denumber-command.test.ts#the package.json contribution points` passes. `open-file-prompts.ts` offers `Denumber` / `Open Read-only` and runs `bbj.denumber` with the document URI. The edit is applied by the server through `workspace/applyEdit` on the live document (phase 125); undo and unsaved-edit behaviour rest on hand check steps 7-10 and 14, which the user reports passed (buffer dirty, disk unchanged, one Ctrl+Z restores, unsaved edit included, Explorer on an unopened file, prompt, Open Read-only). Live server-side proof: `program-live.test.ts` 17/17 including `denumber numbered status=denumbered` and `denumber and format status=denumbered calls=1` (127-06 run, not repeated). |
| 3 | Decompiling a tokenized program through bbjlst still works, while nothing denumbers through bbjlst any more | PARTIAL (gap) | The removal half is verified: `Commands.cjs` and `process-args.ts` contain no "denumber" text, no `denumber` member, no decompile helper; `buildDecompileArgv` has no option and emits `-l` (`-xlst` for a `.lst` input) with the file last; `commands-cjs-execution.test.ts` asserts the member is absent. The "still works" half is not demonstrated: hand check step 15 FAILED (see Requirements Coverage, DEN-06 and Gaps Summary). |
| 4 | Built VSIX contains no `BBjCFCli.jar` or `tools/formatter`; `document-formatter.ts`, `formatter-java-resolver.ts`, `formatter-verifier.ts`, their tests, guards and packaging references are gone; every CI gate passes | VERIFIED | `unzip -l /tmp/bbj-lang.vsix` (688106 bytes, built 10:43 from the final tree): `tools/` holds only `em-login.bbj`, `em-validate-token.bbj`, `web.bbj`; no `.jar`, no `formatter` path; `out/extension.cjs` and `out/language/main.cjs` present. The three source files and `tools/formatter` do not exist; `git ls-files` finds no `BBjCFCli`, `document-formatter`, `formatter-java-resolver`, `formatter-verifier` or `tools/formatter` entry; `git grep` outside `.planning` and `documentation` matches only the absence suite `test/formatter-removal.test.ts`. No reference in `package.json`, `.vscodeignore`, `esbuild.mjs`, `.github/workflows` or `bbj-intellij/build.gradle.kts`. Gates: I ran `npm run lint` (exit 0) and 10 targeted suites (234/234 pass). The whole-suite, typecheck, build, IntelliJ `cleanTest test`, three hygiene checkers and the register check come from 127-06's own recorded output and were not re-run (per instruction). Caveat: `installed-extension-e2e` fails at suite level (0 failed tests), pre-existing and recorded at the end of phase 126 and in the 2026-10-01 baseline; it spawns the installed bundle, not this tree. |
| 5 | From the built VSIX against a live BBj 26.03 BBjServices: Format Document, Format Selection, format-on-save, numbered-file offer, Denumber and Denumber-and-Format work end to end | VERIFIED | Server side, machine-checked in 127-06: `program-live.test.ts` 17 passed, 0 skipped against the live :5008 peer (format service, mixed-numbered refusal `denum-needed`, denumber and denumber-and-format outcomes). Client side, human-checked from the installed `/tmp/bbj-lang.vsix` in "VS Code (ext test)": hand check steps 5-14 and 16-17 passed (user-reported, 16 of 17 total). The only failed step (15) concerns decompile, which is not on the SC5 list. Basis is the user's report plus the SUMMARY's recorded command output; I did not repeat the browser session. |

**Score:** 4/5 truths verified, 1 partial (SC3). `behavior_unverified`: 0 (the behaviour-dependent truths in SC1/SC2/SC5 have recorded human hand-check evidence and server-side live tests).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bbj-vscode/src/denumber-command.ts` | `bbj/denum` command, vscode-free | VERIFIED | 89 lines, substantive, wired in `extension.ts:15,570`; no TBD/FIXME |
| `bbj-vscode/src/settings-migration.ts` | one-time per-scope move | VERIFIED | 116 lines, wired in `extension.ts:463-482,512` |
| `bbj-vscode/src/open-file-prompts.ts` | reworded prompt, `OpenFilePrompts` handle | VERIFIED | `extension.ts` keeps the returned handle; command calls `skipOpenPrompt` |
| `bbj-vscode/package.json` formatter block | 15 typed settings + deprecated alias | VERIFIED | see SC1 |
| `bbj-vscode/src/Commands/Commands.cjs`, `process-args.ts` | no denumber path; decompile keeps `-l` | VERIFIED (removal) / see SC3 (behaviour) | grep for "denumber" empty in both |
| Removed files (`document-formatter.ts`, `formatter-java-resolver.ts`, `formatter-verifier.ts`, `tools/formatter`, jar) | absent | VERIFIED | absence confirmed on disk, in git and in the VSIX |
| `bbj-vscode/test/formatter-removal.test.ts` | absence suite | VERIFIED | passes; see IN-04 on its free-text greps |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `extension.ts` `bbj.denumber` | `createDenumberCommand` | `registerCommand` with real vscode/client deps | WIRED | `sendDenum` goes through the shared language client |
| `open-file-prompts.ts` Denumber button | `bbj.denumber` | `executeCommand` with document URI | WIRED | tested in `activation-prompts-and-status-bars.test.ts` |
| `extension.ts` activation | `migrateSplitSingleLineIf` | `startFormatterSettingsMigration()` | WIRED | after the client starts, before the command registrations |
| `package.json` `bbj.formatter` | server | `initializationOptions.formatter` + `synchronize.configurationSection: 'bbj'` | WIRED | normalizer in `bbj-format-settings.ts` keeps 15 keys |
| open prompt tokenized-detection | `Commands.decompile*` guard | different detection (symlink-following vs `lstat`/`O_NOFOLLOW`) | PARTIAL | the two disagree for symlinks and I/O errors (WR-01) |

### Data-Flow Trace (Level 4)

| Artifact | Data | Source | Real data | Status |
|----------|------|--------|-----------|--------|
| formatter settings push | `bbj.formatter` section | `vscode.workspace.getConfiguration` -> `normalizeFormatterSettings` | yes, all 15 keys with explicit values | FLOWING |
| Denumber result | edit + messages | server `bbj/denum` -> `workspace/applyEdit` | yes (live test) | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Targeted suites for the phase | `cd bbj-vscode && npx vitest run commands-cjs-execution command-argv-injection denumber-command formatter-removal formatter-settings-schema settings-migration settings-migration-activation decompile-io activation-prompts-and-status-bars activation-command-coverage` | 10 files, 234 tests passed | PASS |
| Lint | `npm run lint` | exit 0, `--max-warnings 0` | PASS |
| Package contents | `unzip -l /tmp/bbj-lang.vsix` | no jar, no `tools/formatter`, 3 tools files | PASS |
| Settings schema | node script over `package.json` | 15 + 1 deprecated, no `javaPath` | PASS |

### Probe Execution

Step 7c: no `probe-*.sh` declared by the plans; the phase's runnable proof is the `program-live` suite recorded in 127-06 (17 passed). SKIPPED here, not repeated.

### Requirements Coverage

All eight phase IDs appear in plan frontmatter (01: DEN-02, DEN-05; 02: CUT-02, SET-04; 03: SET-01, SET-03, SET-04, DEN-05; 04 and 05: DEN-06; 06: CUT-02, CUT-03). No ID mapped to phase 127 in REQUIREMENTS.md is unclaimed; no orphans.

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SET-01 | 127-03 | 15 typed formatter settings, no restart | SATISFIED | SC1 evidence |
| SET-03 | 127-03 | `splitSingleLineIF` kept via `splitSingleLineIf`, deprecated | SATISFIED | SC1; migration code + hand check step 2 |
| SET-04 | 127-02, 127-03 | `javaPath` removed | SATISFIED | absent from `package.json` and `src` |
| DEN-02 | 127-01 | Denumber command on `bbj/denum`, live buffer, one undoable edit | SATISFIED in code and hand check, BOOKKEEPING GAP | REQUIREMENTS.md still shows `- [ ] DEN-02` and traceability `Pending` (line 46 and 122); the 127-01 SUMMARY says the file was not edited and the gate plan owns it, and no later plan ticked it. Needs ticking by the orchestrator. |
| DEN-05 | 127-01, 127-03 | prompt offers Denumber + read-only | SATISFIED | SC2 evidence |
| DEN-06 | 127-04, 127-05 | bbjlst denumber path removed; decompiling through bbjlst keeps working | PARTIAL | See below |
| CUT-02 | 127-02, 127-06 | jar, three modules, tests, guards, packaging refs removed | SATISFIED | SC4 evidence |
| CUT-03 | 127-06 | format and DENUM verified end to end from the built VSIX on live BBj 26.03 | SATISFIED | SC5 evidence |

**DEN-06, assessed honestly.** The removal clause is met and machine-checked. The "keeps working" clause is not demonstrably met, for two different reasons that should not be conflated:

1. Hand check step 15 failed. The phase did not change the behaviour that failed: for a tokenized input the bbjlst argv is `-l <file>` (`-xlst` for `.lst`) before and after (I read the base and current `decompileInPlace`; the only differences on the tokenized path are the added guard, the removed unreachable unlink branch, and the fixed title), and the rename of `<file>.lst` is the same. The prompt's magic (`<<bbj>>`, `tokenized-bbj.ts`) and the guard's magic (`decompile-io.ts`, built from the same constant) are identical, so the guard does not explain a miss on an ordinary file. The failure is therefore very likely pre-existing, but the cause was not diagnosed in this session, so "not caused by phase 127" is an inference from the diff, not a measured result. It is correctly tracked as ROADMAP backlog 999.1.
2. WR-01 is a real regression introduced by this phase, narrow but confirmed by reading both versions of the code. On the base a symlinked tokenized program decompiled (`wasTokenized` was false, so bbjlst ran and produced `<file>.lst`, which was renamed over the link). Now both decompile commands call `isTokenizedFile` first, which returns false for any non-regular file (and for any I/O error), so the user gets "is not a tokenized BBj program" for a file the prompt just offered to decompile. Plan 127-04 recorded this as an assumption needing human confirmation (coverage D5, `human_judgment: true`); no test drives a symlink through the commands and the hand check did not exercise one.

**Recommendation.** Do not silently pass DEN-06 and do not block the cut-over on the whole of 999.1. Fix WR-01 in a small gap-closure plan (one detection rule shared by prompt and guard, `realpath` before the check, rethrow non-ENOENT errors) because it is phase-introduced and cheap, and record the step 15 failure as an accepted deviation tied to backlog 999.1. I have not written that override because it needs your name and decision. If you accept, add to this file's frontmatter:

```yaml
overrides:
  - must_have: "Decompiling a tokenized program through bbjlst still works, while nothing denumbers through bbjlst any more (in-place decompile of a tokenized program from the open prompt, hand check step 15)"
    reason: "Behaviour unchanged from phase base fbe7e07d (same bbjlst argv and rename); defect tracked as ROADMAP backlog 999.1 for separate planning. Denumber removal verified."
    accepted_by: "<user>"
    accepted_at: "<ISO timestamp>"
```

Even with that override, WR-01 should be fixed or separately accepted, because the override covers only the pre-existing failure.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/Commands/Commands.cjs` | 222-226, 456-459 | guard turns symlink and I/O error into "not tokenized" | Warning (regression, WR-01) | Feeds the SC3 gap |
| `src/denumber-command.ts` / `package.json:256-260,318-322,345-349` | n/a | Denumber on a tokenized (binary) file fails with a raw VS Code "binary file" error, no pointer to Decompile (WR-02) | Warning | Dead end after the bbjlst route was removed; not a stated criterion |
| `src/language/bbj-format-settings.ts`, `extension.ts` | 86-92, 463-482 | legacy `splitSingleLineIF` fallback unreachable from VS Code; migration only at activation (WR-03) | Warning | A Settings Sync pull or later hand edit of the old key is ignored until reload; SET-03 holds for the activation case |
| `package.json` | 257, 319, 346 | `resourceLangId == bbx` clause for a language nothing declares (WR-04) | Warning | Dead menu branch |
| `Commands.cjs` | 222, 232, 456-475 | constant `wasTokenized`, redundant re-check, temp-dir leak on failure (IN-01, IN-02) | Info | cleanup |
| `package.json` | 410-418 | `indentWidth` tightened to integer 0-16 without a release note (IN-03) | Info | settings-editor squiggle for existing out-of-range values |
| `test/decompile-io.test.ts`, `test/formatter-removal.test.ts` | n/a | free-text source greps (IN-04) | Info | brittle |

Debt markers (`TBD`, `FIXME`, `XXX`, `TODO`, `HACK`) in the phase's source files and in the added diff lines: none. Planning-ID leakage check (127-06) and the review both report clean.

Review 127-REVIEW.md (0 critical, 4 warning, 4 info) was read; I confirmed WR-01 against the code and the base. WR-02 to WR-04 I accepted from the review without independent reproduction, except that I confirmed the `bbx` `when` clauses and the activation-only migration call.

### Human Verification Required

#### 1. Decide how SC3 / DEN-06 is closed

**Test:** Review the DEN-06 assessment above and choose between (A) override for the pre-existing step 15 failure plus a small WR-01 fix, or (B) gap-closure plan that fixes in-place decompile now.
**Expected:** A recorded decision; either an `overrides:` entry in this file or a `/gsd-plan-phase 127 --gaps` run.
**Why human:** The phase did not change the failing behaviour, yet the criterion as written ("still works") is not met in the user's own hand check. That is a scope decision.

### Deferred Items

Backlog 999.1 (safe in-place decompile of tokenized programs) is not in any later milestone phase (124-130), so it is not a Step 9b deferral and does not turn the gap into a non-gap. Phase 130 only removes docs that mention the jar, `javaPath` and bbjlst denumbering. Those docs still do today (`documentation/docs/vscode/configuration.md:320-380`, `commands.md:256`) and are Phase 130's (MIG-01) responsibility, not a Phase 127 criterion.

### Gaps Summary

The cut-over itself is complete and proven: 15 typed settings with a working deprecated alias and migration, `javaPath` gone, Denumber and the numbered-file prompt on `bbj/denum`, the jar and three modules deleted and absent from the built VSIX, and format and DENUM working from the installed VSIX against live BBj (17/17 live tests plus 16 of 17 hand-check steps). Four of five success criteria are verified.

SC3 is the one open item. Its "nothing denumbers through bbjlst" half is verified; its "decompile still works" half is not, because the user's step 15 failed. That failure is probably pre-existing and is routed to 999.1, but it is undiagnosed, and the phase also added one real regression (WR-01, symlinked tokenized files) that the plan itself had flagged for human confirmation and nobody confirmed. Two housekeeping items for the orchestrator: tick DEN-02 in `.planning/REQUIREMENTS.md` (line 46 and traceability line 122) once the SC3 decision is made, and note that the `installed-extension-e2e` suite-level failure is a known local environment issue, not a phase regression.

---

_Verified: 2026-10-03_
_Verifier: Claude (gsd-verifier)_
