# Project Research Summary

**Milestone:** v4.7 Audit Hygiene Burn-down
**Researched:** 2026-09-26
**Method:** Every open audit issue (filed 2026-08-20) was checked against the current tree (`origin/main` at `a1c041e9`) by four parallel verifiers. Detail with file:line evidence is in:

- `AUDIT-VERIFY-A-SECURITY.md`: input validation and security (18 issues, plus #676)
- `AUDIT-VERIFY-B-CI-DEPS.md`: CI and dependencies (14 issues, plus the langium 4.4 regression)
- `AUDIT-VERIFY-C-TESTS.md`: test coverage and the interop test harness (19 issues, plus the linking warm-up todo)
- `AUDIT-VERIFY-D-REFACTORS.md`: refactors (14 issues, plus the phase 97 and unknown-Java-member todos)

This file replaces the v4.3-era SUMMARY.md. STACK/FEATURES/ARCHITECTURE/PITFALLS.md in this directory belong to earlier milestones and are not inputs for v4.7.

## Key Findings

### Verdicts

| Bucket | Still open | Partly fixed | Fixed |
|--------|-----------|--------------|-------|
| A Security / validation | #509 #510 #511 #523 #524 #525 #526 #546 #548 #553 #579 #585 #604 #605 | #626 #676 | #529 #566 #586 |
| B CI / dependencies | #501 #507 #518 #520 #521 #547 #549 #550 #573 #598 #600 | #515 #551 #572 | — |
| C Tests / harness | #514 #516 #519 #528(=#555) #555 #559 #560 #562 #563 #574 #575 #596 #599 #601 #635 | #565 #628 #629 | #627 |
| D Refactors | #534 #558 #564 #580 #581 #582 #583 #602 #603 #606 #624 #625 | #533 #595 | — |

The fixed verdicts were spot-checked by the orchestrator. #529 and #566 were fixed by the process-spawning rewrite (`src/Commands/process-args.ts`, `process-runner.ts`; there is no `exec(` left in `extension.ts` or `Commands.cjs`). #586 was fixed by the digest re-check in `NodeInstallPipeline.cachedNodePath()`. #627 was fixed by `test/webview-panel-lifecycle.test.ts`.

### Remaining scope of the partly fixed issues

- **#626:** addWindow and addChildWindow now validate their fields; only msgbox's `assignTo` is still unvalidated.
- **#676:** the crash is fixed by #698. The "has no container" log line is still emitted at `java-interop.ts:1155-1158`. It is harmless, and it has not yet been traced why a bare package name reaches `resolveClass`.
- **#515:** `vscode:prepublish` builds the real bundle but still runs the dead `esbuild-base --minify` step, so the shipped bundle is never minified.
- **#551:** Dependabot watches npm and Gradle; GitHub Actions and `/documentation` npm are still missing.
- **#572:** `manual-release.yml` is fixed (SEED-002). `preview.yml` still pushes its version-bump commit before publishing, as a documented deliberate trade-off at lines 148-152.
- **#565:** `extension.ts` is covered; `Commands.cjs` still has 0% coverage because of the CJS vscode-mock loader limitation.
- **#628:** only the msgbox `*-ui.ts` is really covered; the addwindow, addchildwindow and setopts ui files are still only mocked.
- **#629:** only the bbj language-configuration file is tested; `bbx-language-configuration.json` is not.
- **#533:** `getNonce` is shared; the 5-line CSP array is still duplicated in all 4 composer webviews.
- **#595:** the Msgbox dialog doc is fixed. `AddWindowComposerDialog` still says "Create flow only", and `ComposerLauncher` still says "both composer UIs" (it has 6 kinds).
- **#606:** the language-server half is fixed (#571). Only a test guarding `package.json` against drift from the options table remains, which is S effort.
- **#603:** the drift the issue cited is fixed by hand; the root cause (hand-synced `.bbl`, no drift test) remains.

### Notable corrections to the issue texts

- **#528 and #555 are duplicates.** Their evidence is byte-identical. Close one and track the other.
- **#559's diagnosis is wrong.** The 11 failing `linking.test.ts` interop tests use the hermetic `JavaInteropTestService` double and never reach :5008 (see the 2026-09-20 pending todo). The fix must follow the todo's analysis.
- **#511 conflicts with a design decision.** `config-path-resolver.ts:150-190` documents that `configPath` is deliberately not anchored to a workspace folder. The realistic fix is to gate the workspace-scoped value behind Workspace Trust, or to decide not to fix it.
- **#574 is bigger than it looks.** Turning on `tseslint.configs.recommended` (non-type-checked) would surface 214 problems (213 errors) across src and test.
- **Sizes have grown since the audit.** `java-interop.ts` is now 1642 lines (the issue says 955), `activate()` is 352 lines (the issue says ~250), and `ClassValidator` is ~414 lines.

### Langium 4.4

- Pinned with a tilde (`~4.3.1` / `~4.3.0`, `bbj-vscode/package.json:701,715`), so 4.4 cannot slip in through `npm install`.
- There is no `ignore:` rule in `dependabot.yml`, so Dependabot will propose each new langium minor.
- The regressions are recorded in the PR #682 closing comment: parse-error recovery on an unclosed `CVS(` takes ~2.3 s instead of ~2 ms, and DEF FN params disappear from completion. Likely causes are the Langium CST rework (#2191) or the Chevrotain 13 bump (#2196).
- An upstream repro needs a minimal grammar plus an unclosed call, timed on 4.3 versus 4.4.

### Carry-over todos

- **Phase 97 review follow-ups** (IntelliJ download progress on chunked responses, plus three weak source guards): still open.
- **Unknown-Java-member warning extras** (exempt the linking Warning from hierarchy Rule 2, and reword the "NamedElement" message): still open.
- **Linking interop warm-up todo:** still open; it supersedes #559.

## Implications for Roadmap

- **Risk ordering:** do tests and the lint baseline before the risky refactors (#558 JavaInteropService split, #564 activate() split, #625 ClassValidator split, #602 grammar dedup). All three large splits have existing tests to regress against.
- **Pipeline risk:** changes to `preview.yml`, `manual-release.yml` and `vscode:prepublish` (#572, #515, #573, #550) affect publishing. Every push to main publishes previews on both marketplaces, so these belong in a dedicated, late phase that is verified carefully.
- **Suggested natural groups:**
  1. **Interop and config input validation:** #509 #510 #511 #581 (shared host/port defaults).
  2. **Rendering and insertion of interop-peer data:** #523 #524 #525.
  3. **Filesystem and path safety:** #526 #579 #585 #605.
  4. **Composer webview hardening and dedup:** #604 #626 #533 #534 #628.
  5. **EM and web.bbj:** #546 #548 #553.
  6. **Dependencies:** #501 #507 #520 #521, plus the langium ignore rule and upstream repro.
  7. **Non-publish CI hygiene:** #547 #549 #551 #518 #550.
  8. **Release pipeline:** #572 #515 #573 #598 #600.
  9. **Test infrastructure:** #516 #519 #562 #574 #528/#555 #559 plus its todo, #560 #563 #565 #629.
  10. **Interop test harness:** #514 #575 #596 #599 #601 #635.
  11. **Small refactors:** #580 #582 #583 #603 #606 #624 #595.
  12. **Large refactors:** #558 #564 #625 #602.
  13. **Carry-overs:** #676 plus the two todos.
- **Always-green gate:** the whole-suite vitest baseline is the 11 known `linking.test.ts` interop failures. A phase that fixes #559 changes the baseline.

## Sources

- The four `AUDIT-VERIFY-*.md` reports in this directory, with file:line evidence
- GitHub issues #501-#676 (`gh issue view`), and the PR #682 closing comment
- `.planning/todos/pending/*.md` (3 files)
- The v4.7 handover (2026-09-26)
