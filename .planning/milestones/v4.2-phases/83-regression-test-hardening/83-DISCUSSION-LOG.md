# Phase 83: Regression Test Hardening - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-06
**Phase:** 83-regression-test-hardening
**Areas discussed:** Node pipeline testability, LSP4IJ canary design, Found-bug and EDT residual scope, Proof that new tests can fail

---

## Todo cross-reference

| Option | Description | Selected |
|--------|-------------|----------|
| None, leave all pending | All three outside the IntelliJ JUnit suite | ✓ |
| gradle-wrapper-hygiene fixture (8.13 vs 8.14.5) | bbj-vscode fixture mismatch, 2/19 fail on clean main | |
| Live-interop tests for getAllClassNames | vitest drift against :5008 | |
| Strip EM Config sentinel in getConfigPathArg | run-action argument bug | |

**User's choice:** None, leave all pending.

---

## Node pipeline testability

### How should tests reach the private static download/extract/install steps?

| Option | Description | Selected |
|--------|-------------|----------|
| Extract a plain-Java pipeline seam | fetch → verify → extract → install → record with injectable fetcher, platform/arch, data dir, cancel probe; downloader becomes a thin adapter | ✓ |
| Leave production untouched, test what is reachable | package-private helpers + source guards; fetch/extract/install unexecuted | |
| Reflection into the private statics | real execution of extract/install via reflection; brittle, no way past HttpRequests/PathManager | |

### Where do the zip and tar.gz fixtures come from?

| Option | Description | Selected |
|--------|-------------|----------|
| Commit tiny hand-made archives | few-hundred-byte zip and tar.gz under src/test/resources mirroring Node layout; provenance recorded | ✓ |
| Generate archives at test time | zip via java.util.zip; tar.gz would need spawning tar | |
| Both: commit tar.gz, generate zip | two fixture mechanisms | |

### What to do with the external tar process?

| Option | Description | Selected |
|--------|-------------|----------|
| Keep the tar process, test it for real | real tar on Linux/macOS, skipped on Windows; source guard on argv | ✓ |
| Switch to the platform's Decompressor.Tar/Zip | uniform, no process, production change in a test phase | |
| Pure-Java tar reader in the seam | new code with its own bug surface | |

### How is the HttpRequests fetch covered?

| Option | Description | Selected |
|--------|-------------|----------|
| Injectable fetcher + source guard, no network | fake copies the fixture; guard pins HttpRequests chain | ✓ |
| Real round trip against a JDK HttpServer | exercises the real client; may need platform services | |
| Both, with the HttpServer test optional | fake required, round trip if headless proven | |

### The Windows auto-install regression (phase 80 UAT)?

| Option | Description | Selected |
|--------|-------------|----------|
| Reproduce it in the new tests, fix if the seam exposes it | Windows branch tests; fix in-phase on red, else record + todo | ✓ |
| Test-only; file a todo for the regression | no behaviour change | |
| Investigate first, on the Windows machine | blocks planning on a human step | |

**User's choice:** all recommended options. **Notes:** none.

---

## LSP4IJ canary design

### What should a canary assert per coupling point?

| Option | Description | Selected |
|--------|-------------|----------|
| Reflective signatures + source guards, behavioural where headless allows | exact member shapes, superclass chain, @ApiStatus.Experimental marker; getIcon driven with real CompletionItems if AllIcons loads headless; createClientFeatures reflective | ✓ |
| Reflective signatures + source guards only | no behavioural attempt | |
| Source guards only, rely on compile failure | catches nothing the compiler does not | |

### Fence the coupling inventory (11 files, not 7)?

| Option | Description | Selected |
|--------|-------------|----------|
| Per-file-and-symbol allowlist | scan src/main for lsp4ij imports/FQN uses; map file → symbols equals in-test allowlist | ✓ |
| Per-file allowlist only | set of files equals the known 11 | |
| No fence, inventory in docs | rots silently | |

### How is the custom request surface (bbj/compile + 7 composer requests) canaried?

| Option | Description | Selected |
|--------|-------------|----------|
| Cross-language contract + JSON boundary tests | every @JsonRequest name found in ../bbj-vscode/src/language; MessageJsonHandler round trip per composer DTO | ✓ |
| JSON boundary tests only | DTO drift only | |
| Source guard on getServerInterface only | neither DTO nor name drift | |

### Runtime LSP4IJ skew (G-81-5)?

| Option | Description | Selected |
|--------|-------------|----------|
| JUnit-side pin test; record runtime skew as out of reach | build.gradle.kts pin matches the jar on the test classpath; 81-07 reflective getMessage stays the runtime defence | ✓ |
| Add a runtime version check in the plugin | production feature in a test phase | |
| Both | | |

**User's choice:** all recommended options. **Notes:** none.

---

## Found-bug and EDT residual scope

### What does "EDT residual" (#569) mean here?

| Option | Description | Selected |
|--------|-------------|----------|
| Gap-driven: add the missing cases per EDT-01..06 site | map each 79 fix site to its test; add only untested behaviours; map recorded in SUMMARY | ✓ |
| Verify-and-close: inventory only | add nothing unless a requirement has no test | |
| Broad: thread-probe every off-EDT seam | uniform, touches seams 79 left without a probe | |

### The debounced Settings lookup has no failure path (79 UI review)?

| Option | Description | Selected |
|--------|-------------|----------|
| Fix in-phase with the test that exposes it | lookup throws → error result posted; catch in BbjSettingsLookups/debouncer | ✓ |
| Fix the failure path and the misleading placeholder together | also a distinct "(fix BBj home path above)" placeholder | |
| Leave it, file a todo | test documents current behaviour | |

### 79-REVIEW IN-03: deleteDirectory follows symlinks?

| Option | Description | Selected |
|--------|-------------|----------|
| Fix inside the seam, with a symlink fixture test | NOFOLLOW_LINKS walk; @TempDir symlink test asserts target survives | ✓ |
| Move it unchanged, file a todo | | |

### Rule for anything else a new test turns red on main's logic?

| Option | Description | Selected |
|--------|-------------|----------|
| Fix in-phase when small and covered by the finding test; otherwise todo | larger findings get a todo with the failing test kept @Disabled | ✓ |
| Strictly test-only | every red finding becomes a todo | |
| Fix everything found | open-ended scope | |

**User's choice:** all recommended options. **Notes:** none.

---

## Proof that new tests can fail

### Red evidence for a test-only phase?

| Option | Description | Selected |
|--------|-------------|----------|
| Mutation check per test class, recorded in the SUMMARY | break the guarded line or mis-point a canary, record the red run, revert; one per class | ✓ |
| Would-fail-if javadoc note only | no executed proof | |
| Mutation check for seam tests, notes for canaries | | |

### IN-01: text source guards are refactor-defeatable?

| Option | Description | Selected |
|--------|-------------|----------|
| New guards scoped and structural; existing guards untouched | method-body window assertions; reflection for structural facts | ✓ |
| Keep the existing whole-file text style | | |
| Retrofit the existing guards too | | |

### How is closure of #569, #544 and #554 evidenced?

| Option | Description | Selected |
|--------|-------------|----------|
| Coverage map in the SUMMARY plus a closure comment per issue naming the tests | criterion → test class.method table, posted on each issue | ✓ |
| Test code only | | |
| A durable bbj-intellij/TESTING.md | second place that can drift | |

### Plan split?

| Option | Description | Selected |
|--------|-------------|----------|
| Three plans by surface, parallel-capable | P01 Node seam; P02 EDT residual + Settings failure path; P03 LSP4IJ canaries | ✓ |
| Two plans by requirement | | |
| Planner's discretion | | |

**User's choice:** all recommended options. **Notes:** none.

---

## Claude's Discretion

- Seam names/packages and the Fetcher/platform/cancel-probe interface shapes.
- Fixture file names, marker bytes, provenance location.
- Allowlist representation and FQN matching.
- Canary class placement; how class-retention `@ApiStatus.Experimental` is read if reflection cannot see it.
- Extra EDT cases beyond the D-12 minimum.
- `@Disabled` naming and todo wording for deferred findings.

## Deferred Ideas

- Runtime LSP4IJ version check in the plugin.
- Switch extraction to the platform Decompressor.
- JDK HttpServer round trip against the real HttpRequests adapter.
- Settings classpath placeholder wording (79-UI-REVIEW).
- Retrofit existing source guards (IN-01); IN-02 duplicated bundle-path resolution.
- Trim `since-build` (80-UAT); version dev builds as 999.x (81-UAT).
- A maintained `bbj-intellij/TESTING.md`.
- Three reviewed todos left pending (EM sentinel, live-interop getAllClassNames, gradle-wrapper-hygiene fixture).
