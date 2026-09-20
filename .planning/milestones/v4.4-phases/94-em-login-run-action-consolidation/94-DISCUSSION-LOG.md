# Phase 94: EM Login & Run Action Consolidation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-18
**Phase:** 94-EM Login & Run Action Consolidation
**Areas discussed:** EM login enablement gate, Token-validation destination, Closing #590 and #615, Tool-path helper shape

---

## EM login enablement gate (EM-02, #589)

The user interrupted the first form of this question to ask whether login is technically possible
without `bbj.home` set — "if it is, let's allow it". Investigation showed it is not: `performLogin`
authenticates by running the bundled `em-login.bbj` through `bbjHome/bin/bbj(.exe)`, with no
REST/`emUrl` alternative. The question was reformulated around the resulting trade-off.

| Option | Description | Selected |
|--------|-------------|----------|
| Project only — keep the dialog | `update()` gates on `project != null`, `getActionUpdateThread()` returns BGT. Closes #589's actual finding (the missing override) without blocking a user who may be about to fix the setting; the "configure BBj Home" dialog stays reachable. | ✓ |
| Project + BBj Home configured | Truthful gate — disabled exactly when `performLogin` would have bailed. Cost: the actionable "configure BBj Home" dialog becomes unreachable, leaving a greyed item with no explanation. | |
| Project + language server started | The literal #589 proposal (mirror `BbjRefreshJavaClassesAction`). Maximum sibling consistency, but couples EM login to a server it never talks to. | |

**User's choice:** Project only — keep the dialog
**Notes:** The user's stated instinct was to avoid blocking the user where the action might still be
the right thing to click. Also surfaced during this area: #589's "ten sibling actions" is really six
classes with an `update()` override, four of which gate on an open BBj file and so are not a model
for a Tools-menu action.

### Follow-up: hide or grey out

| Option | Description | Selected |
|--------|-------------|----------|
| `setEnabledAndVisible` — hide | What all six siblings do. Satisfies "matching its siblings" literally; near-zero practical impact under a project-only gate. | ✓ |
| `setEnabled` only — grey out | Matches ROADMAP criterion 2's literal wording, but would make this the one action in the plugin that behaves differently — the inconsistency #589 was filed about, inverted. | |

**User's choice:** `setEnabledAndVisible` — hide
**Notes:** ROADMAP criterion 2's "enabled and greyed out in exactly the states its ten sibling
actions are" cannot be satisfied by both halves at once; the wording is corrected in CONTEXT.md.

---

## Token-validation destination (EM-03, #617)

| Option | Description | Selected |
|--------|-------------|----------|
| New sibling class, both methods | A new class beside `BbjEMTokenStore` takes `validateTokenServerSide`, `validateTokenTrusted` and the script path together. Keeps the token store a credential-lifecycle utility; keeps the validated/trusted pair adjacent as the guard orders them. | ✓ |
| Static methods on `BbjEMTokenStore` | The literal "alongside the rest of the EM-token lifecycle" — one fewer class, but a 160-line PasswordSafe wrapper gains subprocess launching and owner-only temp-file handling. | |
| Move `validateTokenServerSide` only | Smallest diff and fewest guard re-points, but splits the pair and leaves half the token-validation story in the run-action base. | |

**User's choice:** New sibling class, both methods
**Notes:** Established during this area that no import guard blocks either destination —
`EmTokenBackendNoticeSourceGuardTest:176` constrains `BackendNoticePolicy` and `TokenBackend` only.
The binding constraint is instead `BbjSecretArgvSourceGuardTest`, which lists `BbjRunActionBase` in
`OWNER_ONLY_FILE_CALLERS` and asserts `createOwnerOnlyFile` precedes `CapturingProcessHandler(`
there — both literals leave the base with the moved method.

### Follow-up: how the new class obtains the BBj executable path

| Option | Description | Selected |
|--------|-------------|----------|
| Caller passes `bbjPath` and `scriptPath` | The new class reads no settings and does no plugin lookup, so plain JUnit can drive it with a fake path. Cost: the pinned call literal in `buildWebRunCommandLine` changes. | ✓ |
| New class resolves both itself | Callers stay one-liners and the guard literal survives, but the class regains settings coupling and the executable-path logic gains a third implementation. | |
| Parameters, and unify the executable resolution too | Also retires `BbjEMLoginAction`'s separate resolution, but the two implementations differ in symlink and layout handling, so unifying them can change which binary is found. | |

**User's choice:** Caller passes `bbjPath` and `scriptPath`

---

## Closing #590 and #615 (EM-01, EM-04)

Both requirements were found already satisfied in the tree during the codebase scout — #590 by
commit `06eb1a7c`, #615 by commit `6a55b854`.

| Option | Description | Selected |
|--------|-------------|----------|
| Pin #590, cite existing pins for #615 | #615's invariant is already asserted by two guards, so it closes on cited evidence; #590 has nothing pinning its `finally` scope and regressed once before, so it gets one guard. | ✓ |
| Add regression pins for both | More symmetric to review, at the cost of a third test asserting what two existing tests already assert. | |
| Evidence only, no new tests | Cheapest and arguably honest, but leaves #590's invariant unpinned. | |

**User's choice:** Pin #590, cite existing pins for #615
**Notes:** Neither requirement is to be reported as newly implemented; the phase summary records
what was already true and which commit made it so.

---

## Tool-path helper shape (EM-05, #614)

| Option | Description | Selected |
|--------|-------------|----------|
| Three scripts, with an injected resolver seam | One helper over the three tool scripts, taking a `@FunctionalInterface` plugin-path resolver, so plain JUnit can exercise present/missing — the substance of ROADMAP criterion 5. | ✓ |
| Three scripts, thin static, source guard only | Least indirection for ~10 lines of logic, but the resolution itself stays untested. | |
| All four sites including the LS bundle lookup | Retires the duplication completely, but `resolveServerPath` has a dev-mode fallback and throws rather than returning null, so unifying changes startup behaviour. | |

**User's choice:** Three scripts, with an injected resolver seam
**Notes:** Confirmed during this area that EM-05 is IntelliJ-local by construction — VS Code
resolves the same three scripts through `context.asAbsolutePath('tools/…')`, a different host
mechanism, so no cross-host helper is possible. Also corrected the script's name:
`em-validate-token.bbj`, not `em-validate.bbj` as the roadmap and both issues call it.

---

## Claude's Discretion

- Names of the new validation class and the new path helper, their packages, and the names of the
  new and re-pointed guard tests.
- The exact form of the EM-01 guard's assertion, within the agreed meaning.
- Javadoc wording, and whether the new validation class is a static utility or an instantiable seam
  holder, provided it reads no settings and performs no plugin lookup.
- Whether EM-02's `update()` warrants its own guard or rides along in an existing one.
- Plan sequencing: recorded as EM-05 → EM-03 → EM-02/EM-01/EM-04, refining the roadmap's ordering
  note rather than contradicting it.

## Deferred Ideas

- `BbjEMLoginAction:90-99`'s separate BBj-executable resolution — a fourth duplication no issue
  filed; unifying it is a behaviour change needing its own verification.
- `BbjLanguageServer.resolveServerPath():97-106` — the fourth plugin-path lookup, excluded by
  decision.
- Four keyword-matched todos reviewed and not folded; two are Phase 96 requirements, one is fixed
  and needs close-out, one is local test-environment drift.
