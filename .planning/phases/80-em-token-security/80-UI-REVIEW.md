# Phase 80 — UI Review

**Audited:** 2026-09-04
**Baseline:** Abstract 6-pillar standards, adapted for a Java/Swing IntelliJ Platform plugin (no UI-SPEC.md for this phase; follows Phase 79's adaptation convention)
**Screenshots:** not captured — this is an IntelliJ plugin (Swing/IntelliJ Platform UI), no dev server exists at localhost. Audit is code-only, reading `BbjEMTokenStore.java` (`showBackendBalloon`, `resolveBackend`), `BbjEMLoginAction.java` (`performLogin`'s dialog calls), and `BbjProcessSecretEnv.java` (the `IOException` text in `selectOwnerOnlyStrategy`) directly.

This phase's user-facing surface is unusually narrow: one new modal error string (login-time JWT rejection), one new fail-closed `IOException` message that only reaches the user by way of an existing "Login failed: …" wrapper, and one new non-modal WARNING balloon with two actions. There is no settings panel, no list, no combo box, and no async loading state — three of Phase 79's six pillars (Visuals, Typography, Spacing) have almost nothing to grip on here. Where a pillar is governed entirely by the IntelliJ platform's own rendering (balloon chrome, dialog chrome, font, spacing), this review scores the code's adherence to platform convention rather than inventing findings about pixels this codebase does not control.

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | New strings are clear and specific, but the login-failure message under-informs relative to Phase 79's own copy bar, and the backend body text is 3-way duplicated instead of templated |
| 2. Visuals | 3/4 | Correct severity choice (WARNING balloon, non-modal) matches D-13's own reasoning about not stacking a second modal; no visual differentiation between the balloon's three backend variants beyond text |
| 3. Color | 4/4 | Exclusively platform enums (`NotificationType.WARNING`); no hardcoded colors anywhere in the three audited files |
| 4. Typography | 4/4 | No custom fonts, sizes, or Swing text components at all — entirely `Notification`/`Messages` platform dialogs, correctly deferring 100% of rendering to the platform |
| 5. Spacing | N/A (4/4 by default) | No layout code in this phase's surfaces — balloon and dialog chrome is 100% platform-rendered, nothing to audit |
| 6. Experience Design | 2/4 | The fail-closed IOException text leaks filesystem internals into a user-facing "Login failed" dialog; the balloon's dismiss-then-forever-silenced semantics for `UNKNOWN` has no escape hatch if detection is wrong |

**Overall: 20/24**

---

## Top 3 Priority Fixes

1. **The login-failure message for an unusable EM token gives the user no next step.** User impact: `"Enterprise Manager returned an unusable token"` (`BbjEMLoginAction.java:159`) correctly avoids leaking the token per D-05, but it also tells the user nothing they can act on — is this a server misconfiguration, a network problem, or something they should retry? Compare to the file's own better-written sibling three lines above it, `"No token received from EM login"` (line 145), which at least names what didn't happen. Concrete fix: `"Enterprise Manager returned a token in a format this plugin cannot use. Contact your EM administrator or retry the login."` — same non-interpolated-literal constraint D-05 requires, more actionable.

2. **The Windows/ACL fail-closed `IOException` surfaces filesystem jargon straight into a modal "Login failed" dialog with no translation layer.** User impact: if `selectOwnerOnlyStrategy` throws (`BbjProcessSecretEnv.java:174-176`, `"Cannot create an owner-only temporary file in {tmpdir}: the default filesystem supports neither the posix nor the acl file-attribute view"`), it propagates unmodified through `BbjEMLoginAction.java:112`'s catch block as `"Login failed: " + ex.getMessage()`. A working BBj developer with no filesystem-internals background sees a modal dialog naming "posix", "acl file-attribute view", and a raw temp-directory path, with no indication this is a caused-by-your-OS-config situation rather than a login-credentials problem. This is the same class of gap Phase 79 flagged for the disabled-combobox placeholder (generic wording standing in for a specific cause) — here it is the reverse: a low-level cause standing in for user-facing wording. Concrete fix: catch this specific `IOException` message shape (or better, a dedicated exception type) in `performLogin` and rewrite to `"Login failed: this system's temporary-file storage doesn't support the security restrictions this plugin requires. Contact your IT administrator."` before it reaches `showErrorOnEdt`; keep the raw message in a log line for support diagnosis, per the plan's own bounded-message rationale (D-08's "instead of creating a file with default permissions").

3. **The `UNKNOWN` backend balloon offers no way to find out *why* detection failed, and its wording ("unrecognised password store") reads as if the user did something wrong.** User impact: `resolveBackend()` maps any exception, null service, or unrecognised `ProviderType` constant to `UNKNOWN` (by design, per D-11/D-12 — correctly conservative), and `showBackendBalloon`'s body for that case is `"IntelliJ is keeping your Enterprise Manager token in an unrecognised password store, not the operating system keychain."` (`BbjEMTokenStore.java:104`). The two concrete cases (`KEEPASS_FILE`, `MEMORY_ONLY`) both name what's actually happening; `UNKNOWN` is a plugin-detection failure being presented with the same confident phrasing as a known fact, and its "Open Password Settings" action can't help a user whose actual backend the plugin never identified. Concrete fix: distinguish the copy — `"BBj Language Server couldn't determine how your Enterprise Manager token is being stored. It may not be protected by your OS keychain."` — so the user understands this is a detection gap, not a factual backend report, matching #552's own "detection failure must not silently pass as keychain" spirit one step further (don't just warn — say the warning itself is uncertain).

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)

- **Login failure, unusable token** (`BbjEMLoginAction.java:159`, `"Enterprise Manager returned an unusable token"`): correctly avoids interpolating the token per D-05's explicit security constraint (SUMMARY 80-01 D4, human-judgment item), but under Priority Fix #1 gives no next action — a real regression relative to the file's own `"No token received from EM login"` (line 145) and `"em-login.bbj not found in plugin bundle"` (line 83), both of which at least name the failing component.
- **Backend balloon title** (`BbjEMTokenStore.java:112`, `"Enterprise Manager token is not in the OS keychain"`): clear, factual, matches D-13's wording direction verbatim. No complaint.
- **Backend balloon bodies** (`BbjEMTokenStore.java:98-104`): all three follow the same `"IntelliJ is keeping your Enterprise Manager token in {X}"` template consistently — this is a genuine strength (contrast Phase 79's finding that its Settings-dialog status line drifted across three sentence shapes; this phase's three variants are templated correctly). The `UNKNOWN` variant's specific wording is still a Priority Fix (#3 above) — the template is right, one instance's content is misleading.
- **Fail-closed `IOException` text** (`BbjProcessSecretEnv.java:174-176`): well-written *as a developer/log message* — it correctly names the missing capability rather than saying "something went wrong" — but it was never intended to reach a modal dialog verbatim, which is exactly what happens today (Priority Fix #2). This is an integration gap between two files, not a defect in either message taken alone.
- No generic "OK"/"Submit"/"Click Here" labels in any of the three audited files. Action button labels are specific: `"Open Password Settings"`, `"Dismiss"`, `"Login to Enterprise Manager"`.
- The action registration string (`BbjEMLoginAction.java:30-32`) — `"Login to Enterprise Manager"` / `"Authenticate with BBj Enterprise Manager and store JWT token"` — is clear and was untouched by this phase; noted for completeness, not scored as new work.

### Pillar 2: Visuals (3/4)

- `NotificationType.WARNING` (not `ERROR`, not `INFORMATION`) is the correct severity for "your token is technically stored but less protected than ideal" — this is a real security-relevant condition but not a broken feature, and WARNING communicates that gradient correctly. This directly reflects D-13's own reasoning.
- Non-modal balloon choice (vs. a `Messages.showWarningDialog`) is correct and explicitly justified in-code (`BbjEMTokenStore.java:88-89`, "the login path already shows a modal success dialog, and a second modal on top of it would be unwelcome") — this is good interaction-design reasoning captured as a comment, not just an implementation accident.
- All three backend variants (`KEEPASS_FILE`, `MEMORY_ONLY`, `UNKNOWN`) render through the identical `Notification`/`NotificationType.WARNING` path with the same two actions — there is no visual way to tell "we know your backend and it's KeePass" apart from "we couldn't figure out your backend at all" (Priority Fix #3's root visual-hierarchy gap: an uncertain finding and a certain one look identical).
- The login-failure dialogs (`Messages.showErrorDialog`) are unchanged platform modal chrome, correctly deferred to the platform — no complaint, but also nothing this phase added visually.

### Pillar 3: Color (4/4)

- Zero hardcoded hex/RGB/`Color` values across `BbjEMTokenStore.java`, `BbjEMLoginAction.java`, `BbjProcessSecretEnv.java`. Severity is expressed exclusively through `NotificationType.WARNING` — correctly inherits the user's active IDE theme.
- No new severity surface was introduced that a hardcoded color could have crept into (the two dialog calls, `Messages.showErrorDialog`/`showInfoMessage`, are pre-existing platform calls, unmodified by this phase). Scoring at the ceiling because there is genuinely nothing to fault, unlike Phase 79 which scored 3/4 for "nothing to distinguish as exceptional" — here the WARNING-vs-ERROR-vs-INFORMATION choice is itself a deliberate, correct, phase-specific decision (D-13), which is the exceptional case.

### Pillar 4: Typography (4/4)

- No `Font`, no point size, no `JLabel`/`JBLabel` construction anywhere in this phase's three files — 100% of the phase's user-facing text renders through `Notification` (balloon) or `Messages.show*Dialog` (modal), both fully platform-styled with zero custom typography code. This is the correct approach for a plugin with no bespoke UI surface, and there is no missed-opportunity finding here the way Phase 79 found for its pending/settled state distinction — this phase has no analogous state pair to distinguish.

### Pillar 5: Spacing (N/A — scored 4/4 by default, no layout code exists)

- There is no `FormBuilder`, no `GridLayout`, no manual insets or borders anywhere in the three files this phase touches. The balloon and both dialog types are laid out entirely by the IntelliJ Platform's own `Notification`/`DialogWrapper` machinery. Scored at the ceiling by the same logic Phase 79 applied to its platform-default pillars — nothing this phase does interacts with layout code at all, so there is no basis to dock it, and inventing a spacing critique here would be exactly the "surface findings that aren't there" failure mode this audit is warned against.

### Pillar 6: Experience Design (2/4)

- **Loading/pending states:** not applicable — none of this phase's three surfaces has an async pending state (login is a blocking modal-dialog flow already off the EDT per Phase 79's own fix; the balloon is a fire-and-forget notify call).
- **Error states exist but one leaks an internal cause verbatim** (Priority Fix #2) — the fail-closed `IOException` was deliberately engineered to be safe *content-wise* (D-07/D-08's rationale: "names only java.io.tmpdir and the two missing view names — no token, username or credential value") but was never evaluated for whether its *audience* is a plugin user rather than a plugin developer. Content-safety and audience-appropriateness are two different bars, and only the first was checked.
- **No confirmation needed for the balloon's actions** — "Dismiss" and "Open Password Settings" are both low-risk, reversible, non-destructive; correctly un-confirmed.
- **The once-per-distinct-backend notification policy (D-12) has a genuine UX edge the plan itself surfaces but doesn't fully close:** if `resolveBackend()` returns `UNKNOWN` once (e.g., a transient `PasswordSafeSettings` service hiccup) and the user dismisses the balloon, `BackendNoticePolicy` records `"UNKNOWN"` as warned and will not warn again unless the backend later resolves to `NATIVE_KEYCHAIN` and back away from it (D-12's reset-on-keychain rule). A detection failure that never recovers to a concrete backend (e.g., persistently `UNKNOWN` across every session) warns exactly once, ever, for what could be an ongoing unprotected-storage situation — this is arguably in-spec per the literal D-12 wording ("notify once per distinct non-keychain backend value", and `UNKNOWN` is one such value), but it sits at odds with #552's own stated goal of not letting a detection failure quietly become permanent silence. Not a blocker (D-12 is an explicit, reviewed decision, not an oversight), but worth flagging as the sharpest edge case this phase's own policy accepts.
- **The three human-UAT items across 80-02/80-03/80-04 SUMMARYs are honestly and prominently flagged as unverified** (Windows `icacls` check, live KeePass balloon, "Open Password Settings" action target "not independently verified against a running IDE in this environment") — this is good process transparency, not a defect, but it does mean the actual on-screen appearance of the balloon and the correctness of its settings-page action target remain unconfirmed by anything other than string-literal grep assertions at the time of this review.

---

## Registry Safety

Not applicable — this is a Java/Gradle IntelliJ plugin project with no `components.json`/shadcn registry. Skipped per audit instructions.

---

## Files Audited

- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMTokenStore.java`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjProcessSecretEnv.java`
- `bbj-intellij/src/main/resources/META-INF/plugin.xml` (notification group registration, line 223)
- `.planning/phases/80-em-token-security/80-01-SUMMARY.md`
- `.planning/phases/80-em-token-security/80-02-SUMMARY.md`
- `.planning/phases/80-em-token-security/80-03-SUMMARY.md`
- `.planning/phases/80-em-token-security/80-04-SUMMARY.md`
- `.planning/phases/80-em-token-security/80-CONTEXT.md`
- `.planning/phases/79-edt-responsiveness/79-UI-REVIEW.md` (baseline/convention reference)

---
*Phase: 80-em-token-security*
*Reviewed: 2026-09-04*
