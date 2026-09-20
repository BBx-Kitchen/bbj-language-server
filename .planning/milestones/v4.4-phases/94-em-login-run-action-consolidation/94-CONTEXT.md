# Phase 94: EM Login & Run Action Consolidation - Context

**Gathered:** 2026-09-18
**Status:** Ready for planning

<domain>
## Phase Boundary

EM login leaves nothing behind when a launch fails and enables itself like its sibling actions, and
the BUI/DWC run flow, its server-side token validation and its bundled tool-script paths each live
in exactly one place.

Covers EM-01 (#590), EM-02 (#589), EM-03 (#617), EM-04 (#615), EM-05 (#614). Files:
`bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/` — `BbjRunActionBase.java` (575 lines),
`BbjEMLoginAction.java` (235), `BbjEMTokenStore.java` (160), `BbjRunBuiAction.java` /
`BbjRunDwcAction.java` (31 each) — plus the source guards that pin them. No shared
language-server code is touched: this phase is IntelliJ-local by construction (see the EM-05 note
below).

**Three corrections to the issue text that planning MUST carry:**

1. **EM-01 (#590) is already fixed in the tree.** Commit `06eb1a7c` ("fix(75-gap): move EM
   login/validate network calls off the IntelliJ EDT") restructured the block: `tmpFile` is created
   at `BbjEMLoginAction.java:110` inside its own try/catch, and the `try` at `:115` covers handler
   construction *and* `runProcess(15000)` at `:133`, with the `finally` at `:178` deleting it. The
   code comment names the finding it closed ("WR-02: a finally scoped only around the file read
   left the file leaked on disk whenever construction/launch itself threw"). The issue's evidence
   lines (`:96,115,119-123,145`) no longer correspond to the file. The failure scenario #590
   describes cannot occur today — but **nothing pins the invariant**, which is what this phase adds.

2. **EM-04 (#615) is already satisfied.** Commit `6a55b854` ("fix(84): extract shared BUI/DWC
   command-line builder") moved the shared body into `BbjRunActionBase.buildWebRunCommandLine`
   (`:448-552`). `BbjRunBuiAction` and `BbjRunDwcAction` are **31 lines each differing in 7**
   (class name, two javadoc lines, constructor text/description/icon, the `"BUI"`/`"DWC"` argument,
   and `getRunMode()`'s literal) — not the 142 lines differing in 131 the issue describes. ROADMAP
   criterion 4 is already true, and two existing guards already pin it.

3. **The script is `em-validate-token.bbj`, not `em-validate.bbj`** as ROADMAP criterion 5, #617
   and #614 all call it. The three scripts live once in `bbj-vscode/tools/` and are copied into
   the plugin's `lib/tools` by `prepareSandbox` (`bbj-intellij/build.gradle.kts:217-222`).

So the implementation work is EM-02, EM-03 and EM-05; EM-01 and EM-04 are closed with evidence
plus (for EM-01) one new pin.

</domain>

<decisions>
## Implementation Decisions

### EM login enablement (EM-02, #589)

- **D-01:** `BbjEMLoginAction` gains `update()` gating on **`project != null` only**, plus
  `getActionUpdateThread()` returning `ActionUpdateThread.BGT`. Deliberately **not** gated on BBj
  Home and **not** gated on language-server readiness.
  - Not server-gated, despite #589's "mirror `BbjRefreshJavaClassesAction`": EM login never talks
    to the language server. It authenticates by running the bundled `em-login.bbj` *through the BBj
    interpreter* (`BbjEMLoginAction.java:62-99,128`). Gating on `ServerStatus.started` would remove
    the ability to log in to EM whenever the language server is stopped or crashed — an outcome no
    user would predict.
  - Not BBj-Home-gated, even though BBj Home is a genuine hard prerequisite (`performLogin` builds
    `bbjHome/bin/bbj(.exe)` and refuses if it is unset or not executable): disabling the item there
    would silently swallow the one thing that tells a new user what to fix — the "Please configure
    BBj Home in Settings > Languages & Frameworks > BBj" dialog. A greyed-out menu item teaches
    nothing.
  - #589's actual finding is the **missing `update()`/`getActionUpdateThread()` override**, not a
    specific gate; this closes that finding. A project-only gate also reads no settings in
    `update()`, so nothing in it is BGT-unsafe.
  - **Note the "ten sibling actions" claim is inflated:** only six classes declare an `update()`
    override (`BbjRunActionBase`, `BbjCompileAction`, `BbjComposeActionBase`,
    `BbjOpenComposerAtAction`, `BbjRestartServerAction`, `BbjRefreshJavaClassesAction`); the "ten"
    counts subclasses inheriting a base's gate. Four of the six gate on an open BBj *file* because
    they live on the editor popup menu, so they are not a model for a Tools-menu action with no
    file context.

- **D-02:** The gate is applied with **`setEnabledAndVisible`** — the item hides rather than greys
  out — matching all six siblings (`BbjRunActionBase:138`, `BbjCompileAction:179`,
  `BbjRefreshJavaClassesAction:128`, `BbjRestartServerAction:41`, `BbjComposeActionBase:52`,
  `BbjOpenComposerAtAction:63`). **ROADMAP criterion 2's wording "enabled and greyed out in exactly
  the states its ten sibling actions are" is self-contradictory** — the siblings all hide — and is
  corrected here to *enabled and visible in exactly the states its siblings are*. Practical impact
  is near zero under a project-only gate: the Tools menu barely exists with no project open.

### Token-validation relocation (EM-03, #617)

- **D-03:** `validateTokenServerSide` **and** `validateTokenTrusted` both move off
  `BbjRunActionBase` into a **new class beside `BbjEMTokenStore`** (not onto it). #617 explicitly
  permits "a static method on or beside `BbjEMTokenStore`". Rationale: `BbjEMTokenStore` is a
  160-line credential-lifecycle utility, and moving `GeneralCommandLine`, `CapturingProcessHandler`
  and owner-only temp-file handling into it would change what the file is about. Moving the pair
  together keeps `validateTokenServerSide`/`validateTokenTrusted` adjacent, which
  `EmTokenTrustWindowSourceGuardTest:138-148` deliberately asserts, and leaves no half of the
  token-validation story behind in the run-action base — the exact complaint #617 filed.
  No import guard blocks either destination: `EmTokenBackendNoticeSourceGuardTest:176` forbids
  platform imports in `BackendNoticePolicy` and `TokenBackend` only.
  — **Reversibility:** costly — the move re-points two security-relevant source guards
  (`BbjSecretArgvSourceGuardTest`, `EmTokenTrustWindowSourceGuardTest`); undoing it re-points them
  again.

- **D-04:** The new class **takes the BBj executable path and the `em-validate-token.bbj` path as
  parameters**. It reads no settings and performs no plugin lookup of its own.
  `BbjRunActionBase.getBbjExecutablePath()` stays where it is (the GUI run flow needs it anyway),
  and the script path is resolved through EM-05's shared helper at the call site. This is what
  makes the class reachable from plain JUnit 5 with a fake path — the same reason EM-05 gets a seam
  (D-06). Consequence planning must carry: `buildWebRunCommandLine`'s call site grows from
  `validateTokenTrusted(project, token)` to an explicit multi-argument call, so
  `EmTokenTrustWindowSourceGuardTest:112-116,129-135`'s pinned literal changes with it.
  The 5-minute `TokenValidationCache.TRUST_WINDOW_MS` semantics are preserved exactly — the cache
  itself (`TokenValidationCache.java`, no `com.intellij` import) is untouched.

### Closing the two already-satisfied requirements (EM-01, EM-04)

- **D-05:** **EM-01 (#590) closes with a new source guard**; **EM-04 (#615) closes on cited
  evidence with no new test.**
  - #615's invariant is already pinned twice — `EmTokenTrustWindowSourceGuardTest:96-101` and
    `BbjRunActionConfigPathSourceGuardTest:127-130` each assert
    `buildWebRunCommandLine(file, project, "BUI")` / `("DWC")` occurs exactly once in its subclass.
    A third test asserting the same thing adds nothing. Close it citing commit `6a55b854` and both
    guards.
  - #590 has **nothing** pinning the `finally` scope, and the invariant regressed once already
    (the WR-02 note at `BbjEMLoginAction.java:101-105`). One guard asserts the temp-file cleanup
    covers the whole launch — the nearest existing analogue is
    `BbjSecretArgvSourceGuardTest:282-299`, which pins `createOwnerOnlyFile` *preceding*
    `CapturingProcessHandler(` in the same two files, an adjacent but different invariant.
  - Neither requirement is to be reported as newly implemented. The phase summary records what was
    already true, which commit made it true, and what now pins it.

### Tool-script path resolution (EM-05, #614)

- **D-06:** One shared helper resolves **the three tool scripts only** — `web.bbj`,
  `em-login.bbj`, `em-validate-token.bbj` — and takes an **injected plugin-path resolver seam**
  (a `@FunctionalInterface`, following the `BbjNodeVersionCache` / `JavaClassesRefreshFlow` /
  `BbjInteropPortCache` convention already in this tree). The seam is what lets plain JUnit 5
  exercise "script present → path" and "script missing → null", which is the substance of ROADMAP
  criterion 5 ("every consumer still finds its script inside an installed plugin, not only in a dev
  sandbox"). The three call sites retired are `BbjRunActionBase.getWebBbjPath():241`,
  `BbjRunActionBase.getEmValidateBbjPath():266` and `BbjEMLoginAction.getEMLoginBbjPath():224`.
  — **Reversibility:** reversible — three call sites and one new class.

- **D-07:** **`BbjLanguageServer.resolveServerPath():97-106` is deliberately left alone**, despite
  being a fourth near-identical `PluginId.getId` → `findEnabledPlugin` → `resolve` → exists
  sequence. It is a different shape: it resolves `lib/language-server/main.cjs` rather than a
  `lib/tools/` script, falls back to extracting the bundle from the classloader in dev mode, and
  throws rather than returning null. Folding it in would change language-server startup behaviour,
  well beyond what #614 asks.

### Verification shape and sequencing

- **D-08:** Every guard the moves break is re-pointed using **Phase 93's D-11 precedent**: assert
  each pin exactly once inside the *new* home's extracted method body via a brace-balanced
  `extractMethodBody()`, keep a delegation pin at each call site, and keep negative/zero assertions
  sweeping all affected files at full breadth. Each guard keeps its own private copy of
  `countOccurrences`/`extractMethodBody`/`readSource`, per Phase 93's D-12 — the test-helper
  duplication is deliberate isolation. The guards known to break:
  - `BbjSecretArgvSourceGuardTest` — `OWNER_ONLY_FILE_CALLERS` (`:57`) and
    `ALL_GUARDED_ACTION_FILES` (`:53`) both list `BbjRunActionBase`, and `:272-299` asserts
    `createOwnerOnlyFile` is referenced there *and* precedes `CapturingProcessHandler(`. Both
    literals leave the base with `validateTokenServerSide`. **This guard is the GHSA-33x9-cpwv-xcv2
    / GHSA-xxp5-vv2w-42q8 pin — re-point it with care, never weaken it.** Note `:116` and `:191`
    extract the *first* `BbjProcessSecretEnv.Invocation <var> =` and the *first* `withEnvironment(`
    in the file; after the move the base's first such pair becomes
    `buildWebRunCommandLine`'s, which also names its variable `invocation`, so the data-flow
    assertion still holds — verify this rather than assuming it.
  - `EmTokenTrustWindowSourceGuardTest:138-148` — asserts `BbjRunActionBase.java` declares
    `validateTokenServerSide` exactly once and calls `TokenValidationCache.SESSION.validateThrough(`
    exactly once, in that order. Both move.
  - `OffEdtDispatchSourceGuardTest` and `Lsp4ijImportAllowlistTest:45` are **not** expected to
    break (no LSP4IJ import and no `assertIsNonDispatchThread()` moves), but must be re-run.

- **D-09:** Plan order is **EM-05 → EM-03 → EM-02 / EM-01 / EM-04**. This refines rather than
  contradicts the ROADMAP ordering note (EM-03 still lands before EM-04): EM-05's helper is what
  EM-03's new class consumes for its `em-validate-token.bbj` path, so building it first means the
  new class is written once against its final dependency instead of being refactored. EM-02 is
  file-disjoint from both and can land anywhere; EM-01's pin and EM-04's evidence come last, after
  the files they assert against have reached their final shape.

### Claude's Discretion

- Names of the new validation class and the new path helper, their packages, and the names of the
  new and re-pointed guard tests.
- The exact form of the EM-01 guard's assertion, within D-05's meaning (that the cleanup covers the
  launch, not merely that a `finally` exists).
- Javadoc wording throughout, and whether the new validation class is a static utility or an
  instantiable seam holder — provided D-04's "no settings read, no plugin lookup" property holds.
- Whether EM-02's tiny `update()` warrants its own guard or rides along in an existing action guard.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase and requirement definition
- `.planning/ROADMAP.md` — Phase 94 goal, the five success criteria, and the ordering note. Read
  with D-02 (criterion 2's "greyed out" is corrected) and the `em-validate.bbj` naming correction
  in mind.
- `.planning/REQUIREMENTS.md` — EM-01..EM-05 statements and the v4.4 subsystem grouping
- `.planning/STATE.md` — Active Constraints, and the standing Phase 79/80 decisions this phase must
  preserve (off-EDT behind `assertIsNonDispatchThread()`; `JwtValidity.check` fails closed)
- `.planning/phases/93-composer-robustness-consolidation/93-CONTEXT.md` — D-11 (base-aware guard
  re-pointing) and D-12 (per-guard private helpers), the precedents D-08 above adopts

### Code the decisions bind to
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java` —
  `getWebBbjPath():241`, `getEmValidateBbjPath():266`, `validateTokenServerSide():291`,
  `validateTokenTrusted():345`, `buildWebRunCommandLine():448-552`, `getBbjExecutablePath():187`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java` — the
  already-correct temp-file scope at `:106-180` (EM-01), the missing `update()` override at
  `:27-43` (EM-02), `getEMLoginBbjPath():224` (EM-05), and its own separate BBj-executable
  resolution at `:90-99` (see Deferred)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMTokenStore.java` — the EM-token
  lifecycle the new class sits beside
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/TokenValidationCache.java` — the
  5-minute trust window; no `com.intellij` import, and it must stay that way
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRefreshJavaClassesAction.java` —
  the Tools-menu action #589 names as the model (`update():120-134`)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServer.java` —
  `resolveServerPath():97-106`, the fourth plugin-path site D-07 deliberately excludes
- `bbj-intellij/src/main/resources/META-INF/plugin.xml` — `bbj.loginEM` on `ToolsMenu` (`:26-32`);
  `bbj.runBui` / `bbj.runDwc` on `EditorPopupMenu` with `alt B` / `alt D` shortcuts (`:42-59`)
- `bbj-intellij/build.gradle.kts:217-222` — the `prepareSandbox` copy of the three scripts from
  `bbj-vscode/tools/` into `lib/tools`

### Test contracts that constrain the work
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjSecretArgvSourceGuardTest.java` — the
  advisory pin; `:53,57,116,191,272-299` are the assertions the EM-03 move disturbs
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmTokenTrustWindowSourceGuardTest.java`
  — `:96-101` (the #615 evidence), `:104-148` (the assertions EM-03 moves)
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BbjRunActionConfigPathSourceGuardTest.java`
  — `:113` (base-body extraction, the D-11 model) and `:127-130` (the second #615 evidence)
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/OffEdtDispatchSourceGuardTest.java` —
  `:110-123`, the abstract-declaration edge case; also the model for "assert inside the body"
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmTokenFailClosedSourceGuardTest.java`
  and `.../EmTokenBackendNoticeSourceGuardTest.java` — the EM-token guards that must keep passing
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijImportAllowlistTest.java:45` — the
  symbol-level import allowlist covering `BbjRunActionBase`

### GitHub issues
- #590 (EM-01), #589 (EM-02), #617 (EM-03), #615 (EM-04), #614 (EM-05) — all on milestone #7.
  Read them against the three corrections in `<domain>`: #590's and #615's evidence is stale, and
  #617/#614 misname `em-validate-token.bbj`.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `BbjRunActionBase.buildWebRunCommandLine():448-552` — the shared BUI/DWC body already extracted
  in Phase 84. EM-04 needs nothing further from it; EM-03 changes exactly one call inside it.
- `TokenValidationCache` — a plain static memo with no `com.intellij` import, already exercised by
  `TokenValidationCacheTest` (242 lines) with an injected clock. The model for D-04's parameterised
  new class, and the seam D-06 copies.
- `BbjNodeVersionCache`, `JavaClassesRefreshFlow`, `BbjInteropPortCache`, `ThreadProbe`,
  `KeystrokeDebouncer`, `ComposerFlow` — the existing `@FunctionalInterface` seam convention D-06
  follows.
- `BbjRefreshJavaClassesAction:120-134` — the only true Tools-menu peer for EM-02's `update()`.

### Established Patterns
- **Blocking work stays off the EDT** behind `executeOnPooledThread` with
  `assertIsNonDispatchThread()` as the first statement (Phase 79 EDT-01), pinned by
  `OffEdtDispatchSourceGuardTest`. EM-03's move must not disturb either assertion site.
- **Secrets travel on the environment, never argv** — every secret-bearing invocation goes through
  `BbjProcessSecretEnv` and `withEnvironment(invocation.environment())`, and the temp file is
  created owner-only *before* the process handler. EM-03 relocates one such call site, so this is
  the invariant most at risk.
- **Plain-Java seams carry no `com.intellij` import** so plain JUnit 5 can reach them. D-04 and
  D-06 are both applications of this.
- **Source guards pin IDE-only wiring by literal counts**, with comment lines stripped, each guard
  owning private copies of its helpers.

### Integration Points
- `plugin.xml` registers `bbj.loginEM` on `ToolsMenu` with no icon and no shortcut; the run actions
  sit on `EditorPopupMenu` with `alt G` / `alt B` / `alt D`. EM-02 changes only the action class,
  not the registration.
- `BbjEMLoginAction.performLogin(project)` is called from two places: its own `actionPerformed` and
  `buildWebRunCommandLine`'s two login prompts (`:484`, `:516`). Both are already off-EDT.
- The three tool scripts reach the plugin only through `prepareSandbox`; in a dev sandbox they land
  under `.intellijPlatform/sandbox/.../lib/tools/`, which is why criterion 5 distinguishes an
  installed plugin from a dev sandbox.

</code_context>

<specifics>
## Specific Ideas

- **The user's framing on EM-02 was "if login is technically possible without BBj Home, allow it."**
  It is not — login runs `em-login.bbj` through `bbjHome/bin/bbj` — but the instinct carried the
  decision anyway: D-01 gates on nothing the user might legitimately be about to fix, so the
  action stays clickable and the dialog that names the missing setting still fires.
- **UAT must cover both login entry points and all three run modes**, because EM-03 changes the
  token path shared by them: Tools ▸ Login to Enterprise Manager directly; BUI and DWC launched
  from the editor context menu *and* `alt B` / `alt D`; a run with no stored token (login prompt);
  a run with an expired token (re-prompt); and a second run inside five minutes (trust-window hit,
  no `em-validate-token.bbj` subprocess). GUI run is the control — it touches no EM code and must
  be unchanged.
- **One observable change to call out at UAT:** with no project open, "Login to Enterprise Manager"
  disappears from the Tools menu where it previously stayed visible (D-01 + D-02). Everything else
  in this phase is intended to be a no-observable-delta refactor.

</specifics>

<deferred>
## Deferred Ideas

- **`BbjEMLoginAction:90-99` resolves the BBj executable with its own implementation** (`os.name`
  string test, `toRealPath()`, `isExecutable`) that differs from
  `BbjRunActionBase.getBbjExecutablePath():187-210` (`SystemInfo.isWindows`, `bin/` with a
  no-`bin/` fallback, no symlink resolution). A fourth duplication no issue filed. Not folded in:
  the two genuinely differ in which binary they find on symlinked or non-standard layouts, so
  unifying them is a behaviour change needing its own verification, and it widens a phase whose
  five requirements are already settled.
- **`BbjLanguageServer.resolveServerPath():97-106`** — the fourth plugin-path lookup, excluded by
  D-07. Worth revisiting only if the plugin ID or the `lib/` layout ever changes, which is the
  scenario #614 was written against.
- **`79-REVIEW` IN-02** is retired by EM-05 (`.planning/STATE.md` lists it as an advisory
  follow-up landing in this phase's files) — confirm at phase close that it can be marked resolved.

### Reviewed Todos (not folded)

`todo.match-phase 94` returned four keyword matches; none belong to this phase — the same four
Phase 93 reviewed and rejected:
- `2026-09-06-configured-node-path-suppresses-cached-download-fallback` — is **PLAT-05, Phase 96**
- `2026-09-06-live-windows-check-for-node-auto-install-failure` — is **PLAT-06, Phase 96**
- `2026-09-05-gradle-wrapper-hygiene-fixture-declares-stale-gradle-version` — fixed 2026-09-06;
  needs close-out, not work
- `2026-09-03-update-live-interop-tests-for-getallclassnames-backend` — environment drift in the
  local vitest baseline, unrelated to the IntelliJ EM and run actions

</deferred>

---

*Phase: 94-EM Login & Run Action Consolidation*
*Context gathered: 2026-09-18*
