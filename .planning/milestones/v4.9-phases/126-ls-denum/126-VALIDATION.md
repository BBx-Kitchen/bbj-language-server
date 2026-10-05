---
phase: "126"
slug: "ls-denum"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-10-02"
---

# Phase 126 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^4.1.10 (bbj-vscode), ESLint, `tsc --noEmit` via `npm run typecheck:test`; Gradle `test` for bbj-intellij |
| **Config file** | `bbj-vscode/vitest.config.ts` |
| **Quick run command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/denum-command.test.ts test/bbj-denum-service.test.ts test/bbj-denum-outcomes.test.ts test/bbj-denum-offer.test.ts test/denum-diagnostics-output.test.ts test/bbj-format-notices.test.ts test/bbj-format-service.test.ts test/bbj-formatting-handler.test.ts test/extension-activation.test.ts test/activation-command-coverage.test.ts test/notifications.test.ts && npm run typecheck:test` |
| **Full suite command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run --maxWorkers=2 && npm run lint && npm run typecheck:test && npm run build` (judge on `numFailedTests`); live: `RUN_BBJ_TESTS=1 npx vitest run test/functional/program-live.test.ts --disable-console-intercept`; IntelliJ: `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test` |
| **Estimated runtime** | ~60 s quick, ~6 min full |

---

## Sampling Rate

- **After every task commit:** the task's test file(s) plus `npm run typecheck:test`
- **After every plan wave:** the quick run command plus `npm run lint`
- **Before `/gsd-verify-work`:** full suite green on `numFailedTests`, live file, `bbj-intellij ./gradlew test`
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

Filled by the planner per task; requirement → test mapping from RESEARCH.md:

All commands run with cwd `/home/coder/repos/bbj-language-server/bbj-vscode` (the IntelliJ one from `bbj-intellij`).

| Task | Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|------|-------------|----------|-----------|-------------------|-------------|--------|
| 126-01-T1 | DEN-01 | `bbj/denum` end to end: open numbered buffer -> denumProgram -> one versioned `applyEdit` -> "Denumbered."; DI slot; `main.ts` order | unit (e2e, hermetic) | `npx vitest run test/denum-command.test.ts test/setopts-in-code-request.test.ts && npm run typecheck:test` | ✅ | ✅ green |
| 126-01-T2 | DEN-01 | bad params, not open, non-BBj refused before bbj-ls; result carries diagnostics; handler never rejects | unit | `npx vitest run test/denum-command.test.ts && npm run typecheck:test && npm run lint` | ✅ | ✅ green |
| 126-01-T3 | DEN-01 | stale, refused, in-flight, cancelled, tokenized, empty, CRLF/astral, no canonicalName, never deduplicated | unit | `npx vitest run test/bbj-denum-service.test.ts test/denum-command.test.ts test/java-interop-program-test-double.test.ts && npm run typecheck:test && npm run lint` | ✅ | ✅ green |
| 126-02-T1 | DEN-04 | list notification -> 'BBj' channel block; Show reveals; activation pins (34) | unit | `npx vitest run test/denum-diagnostics-output.test.ts test/extension-activation.test.ts test/activation-command-coverage.test.ts && npm run typecheck:test` | ✅ | ✅ green |
| 126-02-T2 | DEN-04 | malformed, hostile, CR/LF, astral, order, separate blocks | unit | `npx vitest run test/denum-diagnostics-output.test.ts test/extension-activation.test.ts test/activation-command-coverage.test.ts test/activation-prompts-and-status-bars.test.ts test/config-reload-host.test.ts test/extension-config-trust.test.ts && npm run typecheck:test && npm run lint` | ✅ | ✅ green |
| 126-03-T1 | DEN-04 | list sent only after an applied success with diagnostics; counts message with Show at the right severity; Show -> reveal notification | unit | `npx vitest run test/bbj-denum-outcomes.test.ts test/bbj-denum-service.test.ts test/denum-command.test.ts && npm run typecheck:test` | ✅ | ✅ green |
| 126-03-T2 | DEN-03 | one message per outcome, exact older-BBj and not-reachable texts, Go to Line, never deduplicated, privacy | unit | `npx vitest run test/bbj-denum-outcomes.test.ts test/bbj-denum-service.test.ts test/denum-command.test.ts && npm run typecheck:test && npm run lint` | ✅ | ✅ green |
| 126-04-T1 | FMT-06 | `-33006` -> `[]` + one offer with two actions; click acts on the buffer at click time; interim message gone | unit | `npx vitest run test/bbj-denum-offer.test.ts test/bbj-format-notices.test.ts test/bbj-format-service.test.ts && npm run typecheck:test` | ✅ | ✅ green |
| 126-04-T2 | FMT-07 | "Denumber and Format" = one `formatProgram` with the denumber permission, one edit; failure texts | unit | `npx vitest run test/bbj-denum-offer.test.ts test/bbj-format-notices.test.ts test/bbj-denum-outcomes.test.ts test/bbj-denum-service.test.ts && npm run typecheck:test && npm run lint` | ✅ | ✅ green |
| 126-04-T3 | FMT-06 | selection explanation with one action; dedup per document and version; order, concurrency, empty | unit | `npx vitest run test/bbj-denum-offer.test.ts test/bbj-format-notices.test.ts test/bbj-format-service.test.ts test/bbj-formatting-handler.test.ts test/bbj-formatter.test.ts test/bbj-denum-service.test.ts test/bbj-denum-outcomes.test.ts test/denum-command.test.ts && npm run typecheck:test && npm run lint` | ✅ | ✅ green |
| 126-05-T1 | all | live DENUM, Denumber and Format and offer through the production services on :5008 | live (gated) | `RUN_BBJ_TESTS=1 npx vitest run test/functional/program-live.test.ts --disable-console-intercept` | ✅ | ✅ green |
| 126-05-T2 | all | whole suite, lint, typecheck, build, IntelliJ suite, register check; hand check from VSIX and plugin zip | gate | `RUN_BBJ_TESTS=0 npx vitest run --maxWorkers=2`; `npm run lint && npm run typecheck:test && npm run build`; `./gradlew cleanTest test` | ✅ | ✅ green |
| 126-06-T1 | FMT-06 | repeated Format Document on an unchanged numbered buffer shows the offer again, handler to client window (G-126-1) | unit | `npx vitest run test/bbj-denum-offer.test.ts test/bbj-format-notices.test.ts && npm run typecheck:test` | ✅ | ✅ green |
| 126-06-T2 | FMT-06 | Format Selection, saves and concurrent requests each get their message; ledger never used up by offers | unit | `npx vitest run test/bbj-denum-offer.test.ts test/bbj-format-notices.test.ts test/bbj-format-service.test.ts test/bbj-formatting-handler.test.ts test/bbj-formatter.test.ts test/bbj-denum-service.test.ts test/bbj-denum-outcomes.test.ts test/denum-command.test.ts && npm run typecheck:test && npm run lint` | ✅ | ✅ green |
| 126-07-T1 | DEN-04 | denumber list for an open BBj file lands in the Problems view; Show opens it without taking focus (G-126-2) | unit | `npx vitest run test/denum-diagnostics-output.test.ts test/extension-activation.test.ts test/activation-command-coverage.test.ts && npm run typecheck:test` | ✅ | ✅ green |
| 126-07-T2 | DEN-04 | entries cleared with the text they describe; hostile or unknown payloads place nothing; activation pins | unit | `npx vitest run test/denum-diagnostics-output.test.ts test/extension-activation.test.ts test/activation-command-coverage.test.ts test/activation-prompts-and-status-bars.test.ts test/config-file-association.test.ts test/stale-output-channel-repro.test.ts test/bbj-denum-outcomes.test.ts test/denum-command.test.ts && npm run typecheck:test && npm run lint` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `test/denum-command.test.ts`, `test/bbj-denum-service.test.ts`, `test/bbj-denum-outcomes.test.ts`, `test/bbj-denum-offer.test.ts`, `test/denum-diagnostics-output.test.ts` (new; each created by the first task that needs it)
- [x] `test/fake-server-connection.ts` and `test/denum-test-harness.ts` (new shared helpers)
- [x] `JavaInteropTestService.denumProgram` records calls (`denumProgramCalls`) and accepts the token
- [x] Shared fake server connection (`workspace.applyEdit`, window messages, `sendNotification`) extracted from `bbj-format-notices.test.ts`
- [x] Activation test pins updated for two new notification handlers

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Offer, Denumber, Denumber and Format, undo, dirty buffer, messages, Show list in a real VS Code | FMT-06, FMT-07, DEN-01, DEN-03, DEN-04 | Needs live BBj 26.03 BBjServices and the built VSIX | Build VSIX from final tree; numbered, mixed, unnumbered, tokenized, protected files; format doc/selection/on-save; click each action; Ctrl+Z |
| IntelliJ stays quiet with the unhandled notification | DEN-04 | LSP4IJ runtime behaviour | Build IntelliJ zip; open BBj files; confirm no error balloon in idea.log |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 90s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-10-03

---

## Validation Audit 2026-10-03

Run on the final tree (`aab5c9e4`), after the gap-closure plans 126-06 and 126-07 and the code-review fixes.

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

- Mapped task commands (18 files): 462/462 passed; `typecheck:test` and `lint` clean
- Live `test/functional/program-live.test.ts` against :5008: 17/17 passed
- Whole suite `--maxWorkers=2`: 4385 tests, `numFailedTests` 0 (only `functional/installed-extension-e2e.test.ts` fails as a suite; it spawns the installed `~/.ext-test` bundle, the known baseline)
- `bbj-intellij ./gradlew test`: exit 0, 130 result files, no failures
- Manual-only rows covered by UAT round 2 (`126-UAT.md`, 7/7 passed)
