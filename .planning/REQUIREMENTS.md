# Requirements: BBj Language Server

**Defined:** 2026-09-26
**Milestone:** v4.7 Audit Hygiene Burn-down
**Core Value:** BBj developers get consistent, high-quality language intelligence — syntax highlighting, error diagnostics, code completion, run commands, and Java class/method completions — in both VS Code and IntelliJ through a single shared language server.

Scope source: the 2026-08-20 audit issues, each re-verified against `main` (a1c041e9) on 2026-09-26. Evidence is in `.planning/research/AUDIT-VERIFY-*.md`, and the synthesis in `.planning/research/SUMMARY.md`. Issues found already fixed (#529, #566, #586, #627), the duplicate #555 and the documented trade-off #572 were closed on GitHub before this file was written.

## v4.7 Requirements

### Security and input validation

- [x] **SEC-01**: Interop host and port settings are validated in one shared place before connecting (host is a non-empty string, port is an integer from 1 to 65535). Invalid values fall back to the defaults with a logged warning. (#509, #510)
- [x] **SEC-02**: A workspace-level `bbj.configPath` is ignored in an untrusted workspace (VS Code Workspace Trust); user-level settings are unaffected (#511)
- [ ] **SEC-03**: java-interop peer response fields are checked for type and length before they are copied into AST documentation (#523)
- [ ] **SEC-04**: Hover and completion escape Markdown control characters in javadoc text supplied by the java-interop peer (#524)
- [ ] **SEC-05**: The missing-USE quick fix and auto-import completion insert a class name only if it matches the Java qualified-identifier pattern (#525)
- [ ] **SEC-06**: USE-statement path resolution rejects a path that resolves outside the configured PREFIX roots (#526)
- [ ] **SEC-07**: `isExternalDocument()` compares paths on segment boundaries, so a sibling directory whose name shares a prefix is classified correctly (#579)
- [x] **SEC-08**: `isTokenizedFile`/`statSize` do not follow symlinks or read non-regular files (#585)
- [x] **SEC-09**: The formatter's `java` binary can be configured, and it is verified before it is spawned instead of relying on a bare PATH lookup (#605)
- [ ] **SEC-10**: All four composer webviews validate the shape of every postMessage payload before it reaches `build()` or a WorkspaceEdit (#604)
- [ ] **SEC-11**: The msgbox composer validates its `assignTo` field like every other free-text composer field (#626)
- [ ] **SEC-12**: `web.bbj` never falls back to the default admin/admin123 credentials; missing credentials (and no token) go to `login_failed` (#546)
- [ ] **SEC-13**: Every Enterprise Manager call in `web.bbj` after login has an error handler that reports the failure visibly (#548)
- [ ] **SEC-14**: The EM token expiry check treats a malformed, unsigned or exp-less JWT as expired (#553)

### Parser and runtime fixes

- [ ] **FIX-01**: `declare ::lib1::ClassA a; declare ::lib2::ClassB b` on one line parses both declarations, each with its own file-path token and without validation errors (#527)
- [ ] **FIX-02**: "Java class java.io has no container, packageName: java" is no longer logged; the path by which a bare package name reaches `resolveClass` is traced and fixed (#676)
- [ ] **FIX-03**: An unresolved-Java-member linking Warning stays visible in a file that has an unrelated Error (it is exempt from diagnostic-hierarchy Rule 2), and the "Could not resolve reference to NamedElement" wording is replaced with a user-facing message (pending todo 2026-09-24)
- [ ] **FIX-04**: IntelliJ's Node.js download reports progress without logging IllegalStateException when the response has no Content-Length, and the three weak source-guard tests from the phase 97 review assert real behaviour (pending todo 2026-09-20)

### Dependencies

- [ ] **DEP-01**: `@vscode/vsce` is a devDependency, so the production dependency set no longer contains it or its transitive packages (#501)
- [ ] **DEP-02**: The vendored formatter JAR carries recorded version, vendor and provenance metadata that an advisory database can be checked against (#507)
- [ ] **DEP-03**: The interop test harness runs through a pinned, declared `tsx` dependency instead of an unpinned `npx tsx` install (#520)
- [ ] **DEP-04**: java-interop uses a Guava release that is not affected by the two temporary-directory advisories (#521)
- [ ] **DEP-05**: Dependabot ignores langium and langium-cli 4.4.x, and a minimal upstream repro exists for the parse-recovery slowdown on an unclosed call and the lost DEF FN completion params. Filing it upstream needs maintainer approval.

### CI

- [ ] **CI-01**: Every workflow declares a least-privilege `permissions:` block (#547)
- [ ] **CI-02**: `build.yml` no longer duplicates the PR build and test, and has a concurrency group (#549)
- [ ] **CI-03**: Every GitHub Actions reference is pinned to a commit SHA, with the version in a comment (#550)
- [ ] **CI-04**: Dependabot also watches the `github-actions` ecosystem and the `/documentation` npm tree (#551)
- [ ] **CI-05**: Every workflow that installs npm or Gradle dependencies uses dependency caching (#518)
- [ ] **CI-06**: The checkout and Node-setup preamble is defined once, as a composite action or reusable workflow, and every workflow uses it (#573)
- [ ] **CI-07**: `vscode:prepublish` builds only the bundles that ship, and ships them minified; the dead `esbuild-base` step is gone (#515)
- [ ] **CI-08**: The `prepare` lifecycle hook no longer duplicates the generate, type-check and bundle pipeline that CI runs explicitly (#598)
- [ ] **CI-09**: The unreachable npm scripts, the unused TextMate generator directive and the self-contradictory `activationEvents` entries are removed from `package.json` (#600)

### Tests and lint

- [ ] **TEST-01**: ESLint enables the `typescript-eslint` recommended rules, all existing violations (about 214) are fixed, and CI fails on lint errors (#574)
- [ ] **TEST-02**: The `test/` tree is type-checked by a working tsconfig project that CI runs (#516)
- [ ] **TEST-03**: `vitest.config.ts` declares explicit include and exclude patterns (#519)
- [ ] **TEST-04**: The three disabled `parser.test.ts` validation assertions are re-enabled and pass (#528)
- [ ] **TEST-05**: The 11 `linking.test.ts` interop tests pass, or are deliberately rewritten, following the root cause in the 2026-09-20 pending todo, and the whole-suite baseline has no known failures (#559)
- [ ] **TEST-06**: The real connection, timeout and lock code in `java-interop.ts` is exercised by tests against a local fake socket server (#560)
- [ ] **TEST-07**: `initializeWorkspace()` no longer exceeds the vitest hook timeout under whole-suite load (#562)
- [ ] **TEST-08**: The LSP handler logic in `main.ts` can be tested without module-load-time `createConnection()` and is covered by tests (#563)
- [ ] **TEST-09**: `Commands.cjs` is executed and covered by tests (#565)
- [ ] **TEST-10**: The addwindow, addchildwindow and setopts composer `*-ui.ts` files are invoked and covered by tests, not only mocked (#628)
- [ ] **TEST-11**: `bbx-language-configuration.json` is covered for JSON validity and editor behaviour, like the bbj file (#629)

### Interop test harness

- [ ] **HARN-01**: No harness test case hard-codes `status: 'pass'`; every case reports its real assertion result (#514)
- [ ] **HARN-02**: The interop test harness is type-checked, linted and tested in CI (#575)
- [ ] **HARN-03**: The harness JSON highlighter handles escaped quotes, so key and string colouring works (#596)
- [ ] **HARN-04**: The pass/fail gate checks exactly the declared `criticalFields` list (#599)
- [ ] **HARN-05**: The harness header comment describes the fields the gate really checks and documents `--timeout` (#601)
- [ ] **HARN-06**: The six duplicated test-case scaffolds use the harness's existing helper, and the two oversized functions are split (#635)

### Refactors

- [ ] **REF-01**: `getFunctionReference` exists once and is shared by the signature-help and inlay-hint providers (#580)
- [x] **REF-02**: The interop host/port defaults are defined in one place, used by both `bbj-ws-manager.ts` and `main.ts` (#581)
- [ ] **REF-03**: `composer-commands.ts` lives outside `src/language/` (#582)
- [ ] **REF-04**: The four built-in-catalog `.ts` wrappers share one closing shape (#583)
- [ ] **REF-05**: A test fails when a `.bbl` catalog file drifts from its `.ts` source (#603)
- [ ] **REF-06**: A test fails when the `package.json` compiler-option contributions drift from the shared compiler-options table (#606)
- [ ] **REF-07**: The composer webview CSP array is built by one shared helper (#533)
- [ ] **REF-08**: The call-locator and argument-scanner logic exists once, shared by the composer logic and UI layers (#534)
- [ ] **REF-09**: `JavadocProvider` is an injected DI service instead of a `getInstance()` singleton (#624)
- [ ] **REF-10**: `ClassValidator` is split into modules along its four responsibilities, with unchanged diagnostics (#625)
- [ ] **REF-11**: `activate()` is split into single-purpose registration functions sharing one exec-wrapping helper, with unchanged behaviour (#564)
- [ ] **REF-12**: `JavaInteropService` is split along its five responsibilities, with unchanged behaviour (#558)
- [ ] **REF-13**: The two grammar fragments with the channel/options/RPAREN opening share one rule, and parsing is unchanged (#602)

### Docs

- [ ] **DOC-01**: The `AddWindowComposerDialog` and `ComposerLauncher` class docs describe the current edit-in-place flow and all six composer kinds (#595)

## Future Requirements

None deferred. Every still-open audit issue is in scope.

## Out of Scope

| Feature | Reason |
|---------|--------|
| IntelliJ counterparts for configureCompileOptions, denumber, decompile, EM and the real formatter (#631, #634) | Parity features, not hygiene; a separate feature milestone |
| bbj-ls `parseProgram` message issues (#693, #694) | Belong to the bbj-ls repository |
| `preview.yml` pushing its version bump before publishing (#572) | A documented, deliberate trade-off; `manual-release.yml` is fixed; the issue is closed |
| Feature requests (#33, #65, #83, #90, #108, #231, #385, #410, #466, #472, #476, #664, #677, #690) | Not audit hygiene |
| Upgrading to langium 4.4 | Regresses parse recovery and DEF FN completion; stays on 4.3 until upstream fixes it |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SEC-01 | Phase 110 | Complete |
| SEC-02 | Phase 110 | Complete |
| SEC-03 | Phase 111 | Pending |
| SEC-04 | Phase 111 | Pending |
| SEC-05 | Phase 111 | Pending |
| SEC-06 | Phase 110 | Pending |
| SEC-07 | Phase 110 | Pending |
| SEC-08 | Phase 110 | Complete |
| SEC-09 | Phase 110 | Complete |
| SEC-10 | Phase 113 | Pending |
| SEC-11 | Phase 113 | Pending |
| SEC-12 | Phase 112 | Pending |
| SEC-13 | Phase 112 | Pending |
| SEC-14 | Phase 112 | Pending |
| FIX-01 | Phase 119 | Pending |
| FIX-02 | Phase 111 | Pending |
| FIX-03 | Phase 111 | Pending |
| FIX-04 | Phase 114 | Pending |
| DEP-01 | Phase 117 | Pending |
| DEP-02 | Phase 117 | Pending |
| DEP-03 | Phase 115 | Pending |
| DEP-04 | Phase 117 | Pending |
| DEP-05 | Phase 117 | Pending |
| CI-01 | Phase 122 | Pending |
| CI-02 | Phase 122 | Pending |
| CI-03 | Phase 122 | Pending |
| CI-04 | Phase 117 | Pending |
| CI-05 | Phase 122 | Pending |
| CI-06 | Phase 122 | Pending |
| CI-07 | Phase 122 | Pending |
| CI-08 | Phase 122 | Pending |
| CI-09 | Phase 122 | Pending |
| TEST-01 | Phase 114 | Pending |
| TEST-02 | Phase 114 | Pending |
| TEST-03 | Phase 114 | Pending |
| TEST-04 | Phase 116 | Pending |
| TEST-05 | Phase 116 | Pending |
| TEST-06 | Phase 116 | Pending |
| TEST-07 | Phase 114 | Pending |
| TEST-08 | Phase 116 | Pending |
| TEST-09 | Phase 112 | Pending |
| TEST-10 | Phase 113 | Pending |
| TEST-11 | Phase 114 | Pending |
| HARN-01 | Phase 115 | Pending |
| HARN-02 | Phase 115 | Pending |
| HARN-03 | Phase 115 | Pending |
| HARN-04 | Phase 115 | Pending |
| HARN-05 | Phase 115 | Pending |
| HARN-06 | Phase 115 | Pending |
| REF-01 | Phase 118 | Pending |
| REF-02 | Phase 110 | Complete |
| REF-03 | Phase 113 | Pending |
| REF-04 | Phase 118 | Pending |
| REF-05 | Phase 118 | Pending |
| REF-06 | Phase 118 | Pending |
| REF-07 | Phase 113 | Pending |
| REF-08 | Phase 113 | Pending |
| REF-09 | Phase 121 | Pending |
| REF-10 | Phase 120 | Pending |
| REF-11 | Phase 120 | Pending |
| REF-12 | Phase 121 | Pending |
| REF-13 | Phase 119 | Pending |
| DOC-01 | Phase 113 | Pending |

**Coverage:**

- v4.7 requirements: 63 total
- Mapped to phases: 63
- Unmapped: 0

---
*Requirements defined: 2026-09-26*
*Last updated: 2026-09-26 after the v4.7 roadmap (traceability filled, 63/63 mapped to Phases 110-122)*
