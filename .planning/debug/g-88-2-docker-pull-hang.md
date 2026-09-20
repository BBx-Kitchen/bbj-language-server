---
status: diagnosed
trigger: "G-88-2 retest (UAT test 7, 2026-09-11): Alt+Enter on a SETOPTS-in-code line in IntelliJ hangs on \"Searching for Context Option...\" AND \"Pull Docker Image\" — against a freshly built bbj-intellij-0.1.0.zip. NEW Docker clue not present in the original report."
created: 2026-09-11T00:00:00Z
updated: 2026-09-11T00:00:00Z
prior_session: .planning/debug/g-88-2-composer-never-activates.md
audit_acknowledged:
  milestone: v4.3
  at: 2026-09-13
  status: diagnosed
---

## Current Focus

bug_class: Mandelbug (environment-dependent, non-deterministic across machines; reproduces on the
  tester's host, not in this devcontainer — no live IntelliJ here)

hypothesis: |
  The Alt+Enter hang is an unbounded blocking wait in the LSP4IJ ↔ Langium code-action path, not
  in any BBj composer code and not in Docker code:
    (1) IntelliJ's Alt+Enter runs ALL intention availability checks inside ONE modal, cancelable
        ProgressManager.runProcessWithProgressSynchronously titled literally "Searching for
        Context Actions..." (ShowIntentionActionsHandler.calcCachedIntentions).
    (2) LSP4IJ registers LSPIntentionAction0..19 with an EMPTY <language/> (all languages, so
        every .bbj file). Their isAvailable() calls LSPLazyCodeActions.getOrLoadCodeActions(),
        which does an UNBOUNDED ProgressIndicatorUtils.awaitWithCheckCanceled(codeActionFuture)
        — no timeout.
    (3) Langium gates textDocument/codeAction behind DocumentState.Validated
        (addCodeActionHandler default), while textDocument/hover is gated only at
        DocumentState.Linked. So a document that never reaches Validated serves hovers but never
        answers codeAction.
  => hover passes (UAT test 5) and Alt+Enter hangs forever (UAT test 7) in the SAME session, with
  no BBj composer code ever reached.
  "Pull Docker Image" is a concurrent, independently-stuck JetBrains Docker/Dev-Containers
  operation — the repo the tester opened carries .devcontainer/devcontainer.json
  (mcr.microsoft.com/devcontainers/typescript-node:20), the only Docker artifact in the project.

test: "Live LSP probe (RUN — see Evidence): open examples/issue475-setopts-in-code.bbj over a real connection to the shipped server and issue textDocument/codeAction IMMEDIATELY (LSP4IJ's exact params: empty context.diagnostics, triggerKind Automatic) without first waiting for publishDiagnostics — the ordering Alt+Enter actually produces. Run once with rootUri=null and once with rootUri=the repo (the tester's actual project)."
expecting: "codeAction blocks until the build reaches Validated, and is far slower than 88-08's 205ms warm number."
next_action: "Root cause confirmed — return ROOT CAUSE FOUND (goal: find_root_cause_only, no fix)"

reasoning_checkpoint:
  hypothesis: |
    IntelliJ's Alt+Enter hang is an unbounded, timeout-free blocking wait on
    textDocument/codeAction, entered from LSP4IJ's all-languages LSPIntentionActionN inside
    IntelliJ's single modal "Searching for Context Actions..." progress, and gated server-side
    by Langium's DocumentState.Validated requirement — with no BBj composer code involved.
  confirming_evidence:
    - "ShowIntentionActionsHandler.calcCachedIntentions bytecode: ProgressManager.runProcessWithProgressSynchronously(computable, CodeInsightBundle.message(\"progress.title.searching.for.context.actions\"), true, project); the bundle value is literally \"Searching for Context Actions...\""
    - "LSP4IJ 0.21.0 plugin.xml registers LSPIntentionAction0..19 with an EMPTY <language/> element — evaluated in EVERY language, including BBj"
    - "LSPLazyCodeActions.getOrLoadCodeActions bytecode calls ProgressIndicatorUtils.awaitWithCheckCanceled(Future) — the single-arg, NO-TIMEOUT overload"
    - "langium/lib/lsp/language-server.js: addCodeActionHandler default requiredState = DocumentState.Validated; addHoverHandler default requiredState = DocumentState.Linked"
    - "langium/lib/workspace/document-builder.js awaitDocumentState: when document.state < Validated it registers onDocumentPhase(Validated) and returns a promise with NO timeout — it never settles if that document is never rebuilt to Validated"
    - "Live probe, rootUri=repo root: hover 53434ms, codeAction 56016ms on the exact UAT fixture; stderr shows 'Java class resolution chain timed out after 30000ms' twice"
    - "VS Code's composer entry point is a CLIENT-side vscode.languages.registerCodeActionsProvider (setopts-in-code-ui.ts:75) that never touches the server's textDocument/codeAction — which is why UAT test 6 (VS Code) passed while test 7 (IntelliJ) hung, with identical server behaviour"
  falsification_test: "Disable LSP4IJ's LSP code actions (or stop the BBj language server) and press Alt+Enter on the same line. If the popup still hangs, the LSP codeAction path is not the blocker."
  fix_rationale: "(n/a — find_root_cause_only)"
  blind_spots:
    - "No live IntelliJ here — the client half of the chain is proven from LSP4IJ/IDEA bytecode and descriptors, never observed running."
    - "Cannot prove the tester's document was below Validated at the moment of Alt+Enter (no thread dump, no server log from that session)."
    - "The Docker half is inferred from project contents + JetBrains string catalogues; no proof the tester started a Dev Container."
  candidate_causes:
    - "code/library: LSP4IJ's timeout-free awaitWithCheckCanceled on the codeAction future, run inside IntelliJ's modal intention search (client-side)"
    - "code/library: Langium's timeout-free waitUntil(DocumentState.Validated) gate on textDocument/codeAction (server-side)"
    - "environment: java-interop unreachable on the tester's host → 30s-per-class resolution timeouts stretch/never finish the workspace build"
    - "environment: a concurrent JetBrains Docker/Dev-Containers operation ('Pull Docker Image') from the repo's own .devcontainer/devcontainer.json occupying the EDT/modality"
  and_gate: |
    YES — two conditions are required for a *forever* hang rather than a slow one. The
    client+server timeout-free wait (condition A) is necessary but on its own only yields a slow
    popup; it becomes unbounded only when the workspace build never settles at Validated
    (condition B: the environment — a large workspace with java-interop absent, and/or a
    concurrent EDT/write-lock-holding Docker-Dev-Containers operation). Either environmental
    factor alone suffices for B.

## Symptoms

expected: |
  Invoking the tri-state composer (Alt+Enter lightbulb in IntelliJ) on a SETOPTS-shaped chain in
  a .bbj file offers an editable option list and applies the chosen changes, within a reasonable
  time.
actual: |
  Alt+Enter on a SETOPTS-in-code line in IntelliJ hangs on "Searching for Context Option..." and
  the user also sees "Pull Docker Image" during the hang. No composer UI appears. Freshly built
  bbj-intellij-0.1.0.zip (sha256 cde1f2fe...1114d0) confirmed to contain all Phase 88 composer
  symbols per prior automated verification, so the stale-install explanation from the prior
  session is retired for this round.
errors: "No stack trace available (tester runs IntelliJ on a separate host; this devcontainer has no IntelliJ sandbox)."
reproduction: |
  Test 7 in .planning/phases/88-setopts-in-code-hovers-tri-state-composer/88-UAT.md (gap G-88-2).
  Open examples/issue475-setopts-in-code.bbj in IntelliJ with the freshly built plugin, put the
  caret on a SETOPTS-in-code line, press Alt+Enter.
started: "2026-09-11 live UAT retest. Original report 2026-09-08 had the same hang but no Docker mention."

## Eliminated

<!-- carried forward from prior session, plus new -->

- hypothesis: "Stale/un-rebuilt IntelliJ plugin install (the prior session's leading explanation)"
  evidence: "88-UAT.md test 7 records the retest ran against the freshly built bbj-intellij-0.1.0.zip (sha256 cde1f2fe0d8af16b01d910ebd721f37a228351dd58e4b300bd55becdac1114d0) whose composer symbols were verified by 88-09 Task 1. The hang reproduced anyway."
  timestamp: 2026-09-11T00:00:00Z

- hypothesis: "A deadlock/infinite loop inside ConfigureSetoptsInCodeIntention.isAvailable()/generatePreview()/invoke() or the server's decodeInCode/composeTriState handlers"
  evidence: "Prior session (g-88-2-composer-never-activates.md, 2026-09-08T00:45:00Z) read all of it: isAvailable() is a bounded synchronous string scan with no I/O; generatePreview() returns a static IntentionPreviewInfo.Html; invoke() only runs post-selection (after the hang point)."
  timestamp: 2026-09-08T00:45:00Z

- hypothesis: "A standing IntelliJ/LSP4IJ platform defect in this plugin's Alt+Enter path"
  evidence: "82-UAT.md Test 1 (2026-09-05) passed Alt+Enter + preview computation for 3 sibling composer intentions on identical machinery."
  timestamp: 2026-09-08T00:48:00Z

- hypothesis: "A slow/blocked BBjCPL diagnostics round-trip specific to the SETOPTS snippet"
  evidence: "88-08 probe over a real LSP connection: first publishDiagnostics 11082ms/30000ms budget; textDocument/codeAction 205ms/15000ms budget. Both well inside budget on the shared server both IDEs use."
  timestamp: 2026-09-08T17:08:02Z

- hypothesis: "The JetBrains Docker plugin's 'Pull Docker image' intention is itself the blocker — it is offered on the BBj line and its isAvailable()/preview does network or Docker-daemon I/O that never returns."
  evidence: |
    Downloaded and disassembled the real clouds-docker-impl plugin (IU-242 and IU-252).
    DockerPullIntention.isAvailable() only iterates the com.intellij.docker.pull.intention.helper
    EP. Both implementations are cheap and PSI-only: DockerFilePullIntentionHelper needs Dockerfile
    PSI; DefaultDockerPullIntentionHelper walks at most 3 PSI parents for a
    PsiLanguageInjectionHost and then looks for a DockerImagePsiReference among its references.
    DockerImagePsiReference is contributed only by psi.referenceContributor entries scoped to
    language="UAST", language="yaml" and language="Dockerfile" — none of which apply to a BBj PSI
    tree. No I/O, no daemon connection, no network call on the availability path.
  timestamp: 2026-09-11T09:20:00Z

- hypothesis: "A regression between LSP4IJ 0.19.0 (live at Phase 82's passing Alt+Enter UAT) and 0.21.0 introduced the blocking code-action wait."
  evidence: "Both versions register LSPIntentionAction0..19 with an empty <language/>, and both block without a timeout in LSPLazyCodeActions.getOrLoadCodeActions — 0.19.0 via CompletableFutures.waitUntilDone, 0.21.0 via ProgressIndicatorUtils.awaitWithCheckCanceled. The blocking wait is not new; what changed between the two UAT rounds is the workspace opened and how long it takes to reach DocumentState.Validated."
  timestamp: 2026-09-11T09:41:00Z

## Evidence

- timestamp: 2026-09-11T09:05:00Z
  checked: "bbj-intellij sources + build.gradle.kts + plugin.xml, grepped for docker/devcontainer/RunConfiguration/execution/deployment"
  found: "ZERO matches. build.gradle.kts pulls intellijIdeaCommunity(2024.2) + bundledPlugin(textmate) + plugin(com.redhat.devtools.lsp4ij:0.21.0) — no Docker, no deployment, no run-configuration artifact. plugin.xml <depends> is exactly platform, textmate, lsp4ij. All four BBj <intentionAction> entries declare <language>BBj</language>."
  implication: "Nothing in the BBj plugin, its dependencies, or its descriptors can produce a Docker interaction. The Docker item is foreign to this plugin and must come from the tester's IDE."

- timestamp: 2026-09-11T09:12:00Z
  checked: "The actual IDEA Community 2024.2 distribution Gradle cached (…/transformed/ideaIC-2024.2/plugins/) — full bundled-plugin listing"
  found: "No Docker plugin, no Dev Containers plugin in the CE bundle."
  implication: "The tester is running IntelliJ IDEA Ultimate (which bundles Docker + Dev Containers) or a CE with the Docker plugin installed. Either way the Docker feature set is IDE-side, not plugin-side."

- timestamp: 2026-09-11T09:20:00Z
  checked: "Downloaded the real JetBrains Docker plugin (marketplace id 7724, clouds-docker-impl) for IU-242 and IU-252; read META-INF/plugin.xml and messages/DockerBundle.properties; javap'd DockerPullIntention and DefaultDockerPullIntentionHelper"
  found: |
    - DockerBundle.properties: `DockerPullIntention.text=Pull Docker image` and
      `DockerRegistryServiceViewContributor.dialog.title=Pull Docker Image` (exact string the
      tester reported) and `DockerTargetPullImageStep.description=Pulling Docker image…`.
    - plugin.xml registers `<intentionAction><className>com.intellij.docker.image.DockerPullIntention</className>…</intentionAction>`
      with NO <language> element — so IntelliJ DOES evaluate it in .bbj files.
    - DockerPullIntention implements HighPriorityAction (sorts to the top of the Alt+Enter list).
    - BUT its availability delegates to the `com.intellij.docker.pull.intention.helper` EP, whose only
      two implementations are DockerFilePullIntentionHelper (Dockerfile PSI) and
      DefaultDockerPullIntentionHelper, which requires a DockerImagePsiReference within 3 PSI
      parents of a PsiLanguageInjectionHost. DockerImagePsiReference is contributed only by
      psi.referenceContributor for language="UAST", language="yaml" and language="Dockerfile".
  implication: "'Pull Docker Image' is exclusively JetBrains Docker-plugin vocabulary. The intention IS evaluated on every Alt+Enter in a .bbj file, but cannot legitimately become available there — so the Docker item the tester saw is a CONCURRENT Docker/Dev-Containers operation, not the blocker. Its diagnostic value is exclusionary: it proves the hang sits in IntelliJ's shared, cross-plugin intention phase, not in BBj code."

- timestamp: 2026-09-11T09:26:00Z
  checked: "Repo root contents vs. 88-LIVE-RETEST.md's instruction ('in IntelliJ, open the same file from the project tree')"
  found: "The tester therefore opened the bbj-language-server repository itself as the IntelliJ project. That root contains .devcontainer/devcontainer.json declaring image mcr.microsoft.com/devcontainers/typescript-node:20 — the ONLY Docker image reference anywhere in the project. JetBrains docs confirm the Dev Containers flow is started from devcontainer.json's gutter icon and runs in the Services tool window, pulling that image."
  implication: "There is exactly one plausible in-project trigger for an IDE-initiated 'Pull Docker Image', and it is the repo's own devcontainer.json — an artifact of opening THIS repo, unrelated to Phase 88."

- timestamp: 2026-09-11T09:34:00Z
  checked: "IDEA 2024.2 app-client.jar: which class owns the message the tester quoted. Binary-scanned all platform jars for `searching.for.context.actions`, then javap'd the owner."
  found: |
    CodeInsightBundle.properties: `progress.title.searching.for.context.actions=Searching for Context Actions...`
    Sole user: com.intellij.codeInsight.intention.impl.ShowIntentionActionsHandler.calcCachedIntentions,
    whose bytecode is:
      ThreadingAssertions.assertEventDispatchThread();
      …
      ProgressManager.getInstance().runProcessWithProgressSynchronously(computable,
          "Searching for Context Actions...", /*cancelable*/ true, project)
  implication: "Alt+Enter computes ALL intention availability for the caret inside ONE MODAL, EDT-blocking progress dialog. Any single registered intention that blocks freezes the whole popup — and the BBj composer entry can never be rendered while that happens, no matter how cheap its own isAvailable() is."

- timestamp: 2026-09-11T09:41:00Z
  checked: "LSP4IJ 0.21.0 (and 0.19.0) plugin.xml + javap of LSPIntentionAction, LSPLazyCodeActionIntentionAction, LSPLazyCodeActions"
  found: |
    - plugin.xml registers LSPIntentionAction0 … LSPIntentionAction19, each with an EMPTY
      `<language />` element — i.e. offered for EVERY language, so they run in .bbj files.
    - LSPIntentionAction.isAvailable(project, editor, file) builds CodeActionParams
      (context.diagnostics = Collections.emptyList(), triggerKind = Automatic, range = caret
      selection) and delegates to LSPLazyCodeActionIntentionAction.isAvailable →
      loadCodeActionIfNeeded → LSPLazyCodeActions.getCodeActionAt → getOrLoadCodeActions.
    - getOrLoadCodeActions (0.21.0) bytecode:
        invokestatic com/intellij/openapi/progress/util/ProgressIndicatorUtils.awaitWithCheckCanceled:(Ljava/util/concurrent/Future;)Ljava/lang/Object;
      — the SINGLE-ARG overload: NO TIMEOUT. (0.19.0 uses CompletableFutures.waitUntilDone — also
      unbounded, so this is not a version regression.)
  implication: "Every Alt+Enter in a .bbj file performs a BLOCKING, TIMEOUT-FREE wait on the BBj language server's textDocument/codeAction response, from inside IntelliJ's modal intention-search dialog. If that response never arrives, the popup hangs forever — exactly the reported symptom, with the BBj composer never reached."

- timestamp: 2026-09-11T09:48:00Z
  checked: "langium/lib/lsp/language-server.js handler gating and langium/lib/workspace/document-builder.js waitUntil/awaitDocumentState"
  found: |
    - addCodeActionHandler(connection, services, requiredState = DocumentState.Validated)
    - addHoverHandler(connection, services, requiredState = DocumentState.Linked)
    - createRequestHandler → waitUntilPhase → documentBuilder.waitUntil(requiredState, uri, cancelToken)
    - awaitDocumentState: if document.state < requiredState it registers onDocumentPhase(state)
      and returns a promise with NO timeout; it settles only when a build actually pushes THAT
      document to Validated, or when the CLIENT cancels.
    - The server advertises codeActionProvider: true (probe below), so LSP4IJ always issues the request.
  implication: "textDocument/codeAction on the BBj server does not respond until the document reaches DocumentState.Validated — a strictly LATER gate than hover's DocumentState.Linked — and the wait is unbounded. A document that stalls below Validated serves hovers forever while answering codeAction never. This is precisely UAT test 5 (IntelliJ hover PASS) and test 7 (IntelliJ Alt+Enter HANG) in the same session."

- timestamp: 2026-09-11T09:55:00Z
  checked: "Live LSP probe against the shipped bbj-vscode/out/language/main.cjs over --node-ipc, issuing textDocument/hover and textDocument/codeAction SIMULTANEOUSLY right after didOpen on examples/issue475-setopts-in-code.bbj (LSP4IJ's exact codeAction params). Two runs: rootUri=null, and rootUri=/home/coder/repos/bbj-language-server (the project the tester opened)."
  found: |
    rootUri=null:  codeActionProvider capability = true; hover resolved 7595ms (no content yet);
                   codeAction resolved 7595ms with an error object (code -32802); first
                   publishDiagnostics 11513ms; a SECOND, warm codeAction still took 3919ms.
    rootUri=repo:  hover resolved 53434ms; publishDiagnostics 56015ms; codeAction resolved
                   56016ms. stderr: "Java class resolution chain timed out after 30000ms for
                   'com.basis.api.admin.BBjAdminFactory'" (and BBjAdminBase).
  implication: |
    88-08's reassuring "codeAction 205ms / 15000ms budget" measured the WRONG ORDERING — it ran
    on an already-warm, already-Validated document. In the ordering Alt+Enter actually produces
    (request issued before the build settles), codeAction is gated behind the entire workspace
    validation cycle: 56 SECONDS on the very workspace the tester opened, in a devcontainer where
    java-interop is at least partly reachable. On the tester's macOS host, with no java-interop on
    :5008, every Java class resolution burns a 30s timeout, so the build settling at Validated is
    far slower still — and if it never settles, the request never returns and LSP4IJ waits forever.
    The prior session's elimination of "slow/blocked round trip" was therefore based on a
    measurement that did not reproduce the Alt+Enter ordering.

- timestamp: 2026-09-11T10:02:00Z
  checked: "bbj-vscode/src/setopts-in-code-ui.ts (VS Code composer entry point) vs. ConfigureSetoptsInCodeIntention (IntelliJ entry point)"
  found: |
    VS Code registers its composer via vscode.languages.registerCodeActionsProvider(...,
    { providedCodeActionKinds: [RefactorRewrite] }) IN THE EXTENSION HOST (line 75) — it never
    goes through the language server's textDocument/codeAction at all. IntelliJ's equivalent is an
    IntentionAction, which IntelliJ evaluates in the SAME modal batch as LSP4IJ's
    LSPIntentionAction0..19, which does go through textDocument/codeAction.
  implication: "This is the complete explanation for the asymmetric UAT result — test 6 (VS Code composer) PASS and test 7 (IntelliJ composer) HANG against identical server behaviour. The IntelliJ entry point is coupled, by IntelliJ's shared modal intention phase, to an unrelated blocking LSP request that the VS Code entry point never touches."

- timestamp: 2026-09-11T10:06:00Z
  checked: "ConfigureSetoptsInCodeIntention.java re-read in full and diffed against the three Phase 82 sibling intentions"
  found: "Structurally identical to ConfigureMsgboxIntention: isAvailable() is editor != null && a bounded synchronous line-text scan; generatePreview() returns a static IntentionPreviewInfo.Html; startInWriteAction() false; invoke() runs only post-selection."
  implication: "Re-confirms the prior session's elimination with the stale-install confound now removed: the composer's own code cannot hang, and it is not on the critical path of the reported failure."

## Resolution

root_cause: |
  Two contributing causes (AND-gate fired — the first alone yields a slow popup, the pair yields
  the reported permanent hang). Neither is in the Phase 88 tri-state composer, and neither is
  Docker code.

  (1) PRIMARY — an unbounded, timeout-free blocking wait on textDocument/codeAction, entered on
      every Alt+Enter in a .bbj file, inside IntelliJ's single modal intention-search dialog:
        * IntelliJ computes ALL intention availability for the caret inside ONE modal, EDT-blocking
          ProgressManager.runProcessWithProgressSynchronously whose title is literally
          "Searching for Context Actions..." (ShowIntentionActionsHandler.calcCachedIntentions).
        * LSP4IJ registers LSPIntentionAction0..19 with an EMPTY <language/>, so they are evaluated
          in BBj files. Their isAvailable() reaches LSPLazyCodeActions.getOrLoadCodeActions(),
          which calls ProgressIndicatorUtils.awaitWithCheckCanceled(Future) — the single-argument,
          NO-TIMEOUT overload.
        * The BBj server advertises codeActionProvider: true, and Langium gates
          textDocument/codeAction behind DocumentState.Validated (addCodeActionHandler's default)
          while textDocument/hover is gated only at DocumentState.Linked. Langium's
          awaitDocumentState has no timeout: it registers an onDocumentPhase(Validated) listener
          and settles only if that document is actually rebuilt to Validated.
      => While the document sits below Validated, hovers keep working and the Alt+Enter popup
      blocks indefinitely, and the BBj composer's own (cheap, correct) intention is never even
      reached. Measured here on the tester's own workspace: hover 53.4s, codeAction 56.0s.

  (2) CONTRIBUTING (environment) — the workspace build does not settle at Validated on the
      tester's host. The retest told the tester to open the file "from the project tree", i.e. to
      open the whole bbj-language-server repo as the IntelliJ project. With java-interop absent on
      :5008 there, every Java class resolution burns a 30s timeout (reproduced verbatim in this
      devcontainer's probe stderr), stretching or preventing the Validated transition the
      codeAction request is waiting for. A concurrent JetBrains Dev-Containers/Docker operation
      — "Pull Docker Image", triggered by that same repo's .devcontainer/devcontainer.json
      (mcr.microsoft.com/devcontainers/typescript-node:20, the only Docker artifact in the
      project) — independently occupies the EDT/modality that the modal intention progress needs.

  The "Pull Docker Image" clue itself is NOT a cause: "Pull Docker image" / "Pull Docker Image"
  are strings owned solely by JetBrains' Docker plugin (DockerBundle.properties), which is bundled
  in IDEA Ultimate but absent from the IDEA Community 2024.2 distribution this project builds
  against. Its DockerPullIntention IS registered with no <language> restriction and therefore IS
  evaluated on every Alt+Enter in a .bbj file, but its availability requires a
  DockerImagePsiReference (contributed only for UAST/YAML/Dockerfile), so it cannot legitimately
  be offered on BBj code. Its diagnostic value is exclusionary: it proves the hang occurs in
  IntelliJ's shared, cross-plugin intention phase — a phase in which a Docker item can appear at
  all — and therefore cannot be caused by anything BBj-specific.

  Finally, this corrects a prior-round elimination: 88-08's "codeAction 205ms / 15000ms budget"
  measurement was taken on an already-warm, already-Validated document and therefore never
  reproduced the Alt+Enter ordering. In the correct ordering the same request takes 56s on the
  same fixture and workspace.
fix: (not applicable — goal: find_root_cause_only)
verification: (not applicable — no fix applied in this session)
files_changed: []
