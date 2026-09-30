# Phase 113: Composer Webview Hardening & Consolidation - Context

**Gathered:** 2026-09-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Each composer webview checks the shape of every message it receives before `build()` or a
WorkspaceEdit runs. The msgbox and CVS composers validate `assignTo` the same way they validate
every other free-text field. The addWindow, addChildWindow and SETOPTS `*-composer-ui.ts` files
are executed by tests. After that, the duplicated CSP, call-locator, argument-scanner and
window-UI helpers each exist once, and `composer-commands.ts` moves out of `src/language/`. The
IntelliJ `AddWindowComposerDialog` and `ComposerLauncher` class docs describe the edit-in-place
flow and all six composer kinds.

The phase adds no new composer kinds and makes no visual redesign.

</domain>

<decisions>
## Implementation Decisions

### Webview message validation (SEC-10)
- **D-01 (user ruling, amends SEC-10 and success criterion 1):** All **six** composer webviews
  are covered, not four: msgbox, addWindow, addChildWindow, SETOPTS (`setopts-composer-webview.ts`),
  SETOPTS tristate (`setopts-tristate-webview.ts`) and CVS (`cvs-composer-webview.ts`). All six use
  the same `switch (msg.type)` handler that runs `build()` and a WorkspaceEdit. A test posts a
  wrong-shaped message to each. REQUIREMENTS.md SEC-10 and ROADMAP.md Phase 113 criterion 1 were
  amended on 2026-09-27.
- **D-02:** A message of the wrong shape is **dropped silently**, with no toast and no log. Only
  a broken or compromised webview script can send one. This matches the existing
  `if (!r.valid) break` guard.
- **D-03:** The check covers the **full payload shape**. The `type` must be one of the panel's
  known types. For payload-carrying types (`change`, `insert`, `apply`), every field of the
  panel's `Selection` must have the right runtime type: strings are strings, numbers are finite
  integers, booleans are booleans, and arrays hold the right element type. Anything else is
  dropped before `build()` sees it.
- **D-04:** The guard shape is a set of **small shared type-check primitives** in one new module
  (for example `isString`, `isFiniteInt`, `isIntArray`, `isStringArray`, `isPlainObject`) plus a
  **per-composer `isXxxMessage()` guard** next to that composer's `Selection` type. There is no
  schema library, so no new runtime dependency is added to the extension bundle. Planner's
  choice: the guard can be applied in each handler, or passed as an optional argument to
  `registerPanelMessageHandler`.

### assignTo validation (SEC-11)
- **D-05 (user ruling, amends SEC-11 and success criterion 2):** The rule covers **msgbox and
  CVS**. Both have the same unvalidated `assignTo` field, which today is placed straight into
  `${assignTo} = CALL(...)`. Both use one shared validator, parameterised by result type.
- **D-06:** Valid targets depend on the result type:
  - msgbox, which returns a number: a plain numeric variable (`ret`) or an object variable
    (`ret!`), or an array element of one (`r[1]`, `r[i+1]`) whose index passes
    `validateBbjExpression`.
  - CVS, which returns a string: `s$`, `s!` or a string array element (`s$[i]`).
  - The validator rejects the wrong-type suffix (for example `$` for msgbox), quotes,
    operators, `=`, `;`/`:` statement separators and anything else.
- **D-07 (user ruling):** `assignTo` is **required** for msgbox and CVS when the field is shown,
  which means a new insert at the cursor. An empty value marks the preview invalid.
- **D-08:** The required rule applies **only to new inserts**. In edit mode (a Code Action
  rewrites an existing call) and completing mode (composing into an unfinished call) the field
  stays hidden and `assignTo` stays omitted. The line keeps its own left-hand side, and those
  flows do not change. The msgbox prefill `ret!` stays. CVS gets a prefill such as `s$`, the
  exact name being the planner's choice. The "(optional)" label text is removed in both IDEs.
- **D-09:** An invalid or empty `assignTo` is handled **like every other field**: an inline
  per-field error message, the preview marked invalid (`valid: false`), and Insert disabled. The
  check lives in the shared LS preview logic (`msgboxPreview`, `cvsPreview`), so both IDEs get
  the same verdict. Consequence for IntelliJ: this is small Java UI work beyond class docs. A new
  `assignToError` field is added to the preview result model in `ComposerModels.java` and its JSON
  boundary test. `MsgboxComposerDialog` and `CvsComposerDialog` show that error and drop
  "(optional)" from their labels.

### Consolidation layout (REF-03, REF-07, REF-08)
- **D-10:** Shared helpers go in **one small module per concern**, following the existing
  `webview-nonce.ts` / `webview-panel-lifecycle.ts` style:
  - `src/webview-csp.ts`: builds the CSP array/string. All six webviews use it.
  - `src/composer-call-scanner.ts`: `scanArgs`, `trimmedRange` and a generic call locator.
  - A shared window-composer UI module: `titleArg` and the shared addWindow/addChildWindow
    code-action helper.
  - The message-guard primitives module from D-04.
  File names are indicative, and the planner may adjust them. There is no `src/composer/` folder
  move.
- **D-11:** The call locator becomes **one generic locator parameterised by the function name**.
  The existing exported `find*Calls` / `parse*CallOnLine` / `find*CallAt` names for msgbox,
  addWindow, addChildWindow and CVS stay as one-line wrappers, so callers and test assertions do
  not change (criterion 4). The private `scanArgs` copy in `msgbox-composer.ts` is removed.
- **D-12:** CVS and the SETOPTS tristate panel **join the consolidation**. All six webviews use
  the shared CSP helper, and CVS uses the shared scanner and locator, so no copies are left.
- **D-13:** `composer-commands.ts` moves from `src/language/` to **`src/composer-commands.ts`**.
  `src/language/main.ts` imports `'../composer-commands.js'` and the test import path is
  updated. It remains LS-side code bundled into `main.cjs`.

### Ordering and tests (TEST-10, locked by the roadmap)
- **D-14:** The TEST-10 tests are written **first**. They execute the addWindow, addChildWindow
  and SETOPTS `*-composer-ui.ts` code actions, code lenses and commands, using
  `test/msgbox-composer-ui.test.ts`'s mocked-`vscode` harness as the template. They pass before
  and after the consolidation, with no assertion changes (criterion 3/4).

### Claude's Discretion
- Where the message guard is applied (D-04) and the exact module and file names (D-10).
- The CVS `assignTo` prefill value (D-08).
- How the tests post a wrong-shaped message (fake panel with a captured `onDidReceiveMessage`
  handler, as `test/webview-panel-lifecycle.test.ts` does).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Scope and requirements
- `.planning/ROADMAP.md` §"Phase 113: Composer Webview Hardening & Consolidation": goal, success criteria (1 and 2 amended per D-01, D-05..D-09), planning note on test-first ordering
- `.planning/REQUIREMENTS.md`: SEC-10 (amended), SEC-11 (amended), TEST-10, REF-03, REF-07, REF-08, DOC-01
- GitHub issues #604, #626, #628, #582, #533, #534, #595 (read via `gh issue view`)

### Code under change: VS Code side
- `bbj-vscode/src/webview-panel-lifecycle.ts`: `registerPanelMessageHandler`
- `bbj-vscode/src/webview-nonce.ts`: style model for the new small shared modules
- `bbj-vscode/src/msgbox-composer-webview.ts`, `addwindow-composer-webview.ts`, `addchildwindow-composer-webview.ts`, `setopts-composer-webview.ts`, `setopts-tristate-webview.ts`, `cvs-composer-webview.ts`: message handlers and inline CSP
- `bbj-vscode/src/msgbox-composer.ts`: `validateStringField`, `validateBbjExpression`, `msgboxPreview`, private `scanArgs` copy, msgbox call locator
- `bbj-vscode/src/cvs-composer.ts`: `cvsPreview`, CVS call locator, imports `scanArgs` from addwindow
- `bbj-vscode/src/addwindow-composer.ts` (exported `scanArgs`, `trimmedRange`, locator), `addchildwindow-composer.ts` (locator)
- `bbj-vscode/src/addwindow-composer-ui.ts`, `addchildwindow-composer-ui.ts` (duplicated `titleArg`, code-action helpers), `setopts-composer-ui.ts`
- `bbj-vscode/src/language/composer-commands.ts` → `src/composer-commands.ts`; `bbj-vscode/src/language/main.ts` import

### Code under change: IntelliJ side
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerModels.java`: preview result model (`assignToError`)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/MsgboxComposerDialog.java`, `CvsComposerDialog.java`: assignTo label and error display
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerModelsJsonBoundaryTest.java`: JSON boundary pins
- `bbj-intellij/.../AddWindowComposerDialog.java`, `ComposerLauncher.java`: DOC-01 class docs

### Tests
- `bbj-vscode/test/msgbox-composer-ui.test.ts`: TEST-10 template (mocked-`vscode` harness)
- `bbj-vscode/test/setopts-in-code-ui.test.ts`, `window-composer-validation-ui.test.ts`, `cvs-composer-ui.test.ts`: existing UI-level coverage to check before writing new tests
- `bbj-vscode/test/webview-panel-lifecycle.test.ts`: fake-panel pattern for posting messages
- `bbj-vscode/test/composer-commands.test.ts`: import path moves with D-13

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `validateStringField` / `validateBbjExpression` (msgbox-composer.ts): the existing field
  validation that `assignTo` joins. Its identifier regex `^[A-Za-z_][A-Za-z0-9_]*$` is a
  starting point for the variable-name check.
- `scanArgs` + `trimmedRange` (addwindow-composer.ts): already shared by CVS and addChildWindow.
  They become the canonical scanner.
- `registerPanelMessageHandler`: the single choke point every panel already subscribes through.

### Established Patterns
- Small focused modules with type-only `vscode` imports so they can be unit tested
  (`webview-panel-lifecycle.ts`, `webview-nonce.ts`).
- The composer compose/validate/preview logic is shared by VS Code and IntelliJ through the LS
  (`composer-commands.ts` handlers), so a validation change in `*Preview` reaches both IDEs.
- Edit mode and completing mode omit `assignTo` in both IDEs
  (`input.assignTo = (!editMode && !completing) ? … : null`).

### Integration Points
- `src/language/main.ts` → `registerComposerRequests` (import path changes).
- The IntelliJ dialogs call the LS preview requests and render per-field errors from the result model.

</code_context>

<specifics>
## Specific Ideas

- The user wants `assignTo` required on a fresh insert because the result of MSGBOX/CVS should
  always land in a variable. The prefill keeps this cheap: `ret!` for msgbox, a string var for CVS.
- The roadmap's "four webviews" undercounted. CVS and the tristate panel were added later
  (89-14, 90-05) with the same handler shape, so the user brought them into scope on purpose.

</specifics>

<deferred>
## Deferred Ideas

None: the discussion stayed within phase scope. CVS and tristate were brought into scope
(D-01, D-05, D-12), not deferred.

### Reviewed Todos (not folded)
- IntelliJ sends javaInteropHost/javaInteropPort but the LS reads interopHost/interopPort: interop settings, keyword match only.
- linking.test.ts interop failures survive class warm-up: Phase 116 (TEST-05).
- Phase 97 code-review follow-ups (download progress, weak guards): Phase 114 (FIX-04).
- Peer-supplied Java names break the signature-help fence / snippet variables: signature-help provider, not composers.

</deferred>

---

*Phase: 113-composer-webview-hardening-consolidation*
*Context gathered: 2026-09-27*
