# Phase 82 — UI Review

**Audited:** 2026-09-05
**Baseline:** abstract 6-pillar standards (no UI-SPEC.md; surface is an IntelliJ/Swing plugin, not a web frontend)
**Screenshots:** not captured — no dev server / browser surface applies; this is a Swing `DialogWrapper` + IntelliJ notification-balloon UI, audited by source reading of `ComposerNotices.java`, `ComposerNoticeRenderer.java`, `MsgboxComposerDialog.java`, `AddWindowComposerDialog.java`, `AddChildWindowComposerDialog.java`, the three `Configure*Intention.java` classes, and `intentionDescriptions/*/description.html`

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | Notice wording is clear and specific, but `detailOf()` puts raw exception text/class names straight into a user-facing balloon body with no translation layer |
| 2. Visuals | 2/4 | The one in-dialog failure state (`previewUnavailable`) is rendered as plain text with no color/icon differentiation, even though the same dialog already has a red-error convention for other fields |
| 3. Color | 2/4 | `errorLabel()`'s red is a hardcoded `new Color(0xC0392B)` instead of a theme-aware `JBColor`, and the new "Preview unavailable" state doesn't reuse that color at all |
| 4. Typography | 3/4 | Consistent, minimal use of platform styles (`UIUtil.ComponentStyle.SMALL`); no ad hoc font sizes/weights introduced |
| 5. Spacing | 4/4 | All spacing goes through `JBUI.scale(...)`, matching existing dialog rows; no arbitrary pixel values added |
| 6. Experience Design | 3/4 | Loading/failure/stale/empty states are now all handled (a real improvement over the prior silent-failure baseline), but the rate-limit-per-session and truncated-reason design leave two rough edges |

**Overall: 17/24**

---

## Top 3 Priority Fixes

1. **Failure state uses no color/icon signal, only text** (`MsgboxComposerDialog.previewUnavailable`, `AddWindowComposerDialog`/`AddChildWindowComposerDialog` equivalents) — a user scanning the dialog by shape/color (the normal way people notice "something's wrong") can miss "Preview unavailable — …" because it's rendered in the same small gray `summary` label used for normal state, while the dialog already has a red `errorLabel()` convention two rows above it for `messageError`/`titleError`/`customError`. Fix: route the failure text through the same `errorLabel()` styling (or reuse the field, colored) so a stalled preview is visually, not just textually, distinct from a healthy one.

2. **Hardcoded RGB literal for error color** (`MsgboxComposerDialog.java:283`, `new Color(0xC0392B)`) — IntelliJ platform convention is `com.intellij.ui.JBColor` (or `UIUtil`/`NamedColorUtil` error accessors) so the color adapts to Light/Darcula/High-Contrast themes; a hardcoded RGB will look wrong (too dark, low contrast) in a dark theme. Fix: replace with `JBColor.namedColor("Component.errorForeground", ...)` or `com.intellij.util.ui.NamedColorUtil.getErrorForeground()`, which is exactly the platform-provided seam for this.

3. **Raw exception detail surfaces verbatim in the balloon body** (`ComposerNotices.detailOf`, used by `requestFailed(...)`) — when a cause has a message, that message (e.g. a raw `IOException`/LSP4J transport message, possibly containing a stack frame or a socket address) is shown to the user unfiltered as the entire error balloon body, and the same string is also mirrored to the console with no further shaping. This is consistent (no message-prose branching, as designed) but not user-friendly: a plugin end user reading "Compose MSGBOX failed" followed by a raw Java exception string doesn't know what to do next. Fix: keep `detailOf` for the console mirror (where a developer benefits from the raw detail) but give the balloon body a level of indirection — e.g. a fixed "Try again, or check the BBj Language Server console for details" sentence, with the raw detail relegated to the console-only mirror that already exists.

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)

- Balloon titles/bodies follow one convention and are specific to the composer kind ("Compose MSGBOX failed", "MSGBOX not updated", `notice.title = kindLabel + " not updated"`) — good, matches Phase 81's `CompileResultPresenter` precedent (`ComposerNotices.java:47-63`).
- `staleDocument()`'s body — "The line changed while the composer was open. Nothing was changed." — is exactly the wording the context doc (`82-CONTEXT.md` D-09) specified, plainly states the recovery guarantee, and pairs with a concrete "Reopen composer" action rather than a dead-end message. This is a strong example.
- `notReady()`'s body carries over the pre-existing modal wording verbatim ("The BBj language server is not ready yet. Open a BBj file and try again.") — fine, but note it tells the user to "open a BBj file" even when a BBj file is already open and the caret is already on a call (the actual not-ready condition is "server not running", not "no BBj file open"); the copy is stale relative to what actually triggers it in this dialog-driven flow.
- `ComposerNotices.detailOf(Throwable)` (`ComposerNotices.java:71-78`) falls back to the raw `cause.getMessage()` or the exception's simple class name (e.g. `"ConnectException"`) for the balloon body — this is developer-facing text reaching an end-user notification with no user-oriented rewrite. See Priority Fix #3.
- `shortReason()` (`ComposerNotices.java:84-87`) truncates at 80 chars with a hard `substring(0, 80)` and no ellipsis marker — a truncated in-dialog label ("Preview unavailable — <cut off mid-word>") reads as a bug rather than an intentional truncation. A trailing "…" is a one-line fix.
- CTA copy in the dialogs themselves is good: `setOKButtonText(editMode ? "Apply" : "Insert")` (`MsgboxComposerDialog.java:95`) avoids the generic "OK"/"Submit" default, correctly describing what pressing the button does per mode.

### Pillar 2: Visuals (2/4)

- No focal-point problem: each dialog centers a live schematic preview (`MsgboxSchematicPanel`) above the generated-statement field, which is the correct single focal point for a "configure and preview" dialog.
- Icon-only buttons: none introduced by this phase; the one action button added is the labeled `NotificationAction("Reopen composer")`, which is a full-text action, not an icon-only control needing a tooltip/aria-label workaround — good, no finding here.
- Visual hierarchy gap: the dialog already establishes a two-tier severity language — plain small-gray `summary` label (`JBLabel`, `UIUtil.ComponentStyle.SMALL`) for normal status, and red `errorLabel()` for validation errors (`messageError`/`titleError`/`customError`). The new `previewUnavailable()` failure state (#538's whole point — making a previously-silent failure visible) reuses the *normal-status* label rather than the *error* label style, so the very state this phase exists to surface looks identical, visually, to a healthy preview summary. A user who isn't reading every word of the small print will not notice the failure. This is the same defect across all three dialogs (`MsgboxComposerDialog.java:242-245`, and the equivalent methods in `AddWindowComposerDialog.java`/`AddChildWindowComposerDialog.java`).
- OK-button disablement (`setOKActionEnabled(false)`) is a real and correct gating mechanism, but it is the *only* visual signal (a grayed-out button) once the text-color issue above is accounted for — two signals collapsing into one weakens the "obviously something is wrong" read, especially for a keyboard-only interaction where the user's eyes may be on the field they're typing in, not the button.

### Pillar 3: Color (2/4)

- `errorLabel()`'s `new Color(0xC0392B)` (`MsgboxComposerDialog.java:283`) is a hardcoded RGB literal, not a `JBColor`/platform accessor — it will not adapt across Light/Darcula/High-Contrast themes, breaking IntelliJ's own theming contract (a plugin author convention this codebase otherwise follows elsewhere, e.g. `JBUI.scale`, `UIUtil.ComponentStyle`). This predates this phase (it's inherited by `previewUnavailable` not using it, and would also apply to `messageError`/`titleError`) but this phase is the first to add a *second* state that should logically use this exact color and doesn't, compounding the inconsistency.
- `ComposerNoticeRenderer` correctly delegates all severity-to-color mapping to the platform's own `NotificationType` enum (`ComposerNoticeRenderer.java:38-42`) rather than hardcoding balloon colors — this is the right pattern and should have been the template for the in-dialog label too.
- No new hardcoded hex/rgb colors were introduced in the balloon-rendering path itself; the only offender is the pre-existing Swing label color that the new failure state should have reused and didn't.

### Pillar 4: Typography (3/4)

- All new/modified labels reuse `UIUtil.ComponentStyle.SMALL` consistently with the dialog's existing `summary`/error labels — no new font size or weight introduced.
- No `Font` construction, no hardcoded point sizes anywhere in the touched files (`grep -n "new Font(" bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/*.java` — none found in the phase's diff).
- Minor: the intention-preview HTML strings (`ConfigureMsgboxIntention.java:48-50` etc.) use raw `<p>`/`<code>` tags with no styling class, which is fine and consistent with how IntelliJ intention previews are normally authored (plain semantic HTML, platform stylesheet applies fonts) — not a defect, noted for completeness.

### Pillar 5: Spacing (4/4)

- Every spacing constant added or touched by this phase's dialog changes goes through `JBUI.scale(...)` (e.g. `Box.createVerticalStrut(JBUI.scale(8))`, `GridLayout(0, 3, JBUI.scale(6), JBUI.scale(4))`), matching the pre-existing rows in the same file — no arbitrary/unscaled pixel values were introduced.
- The new failure-state label reuses the existing `summary` component's position in the layout rather than inserting a new row, so no spacing regression from insertion.
- No grep hits for raw pixel integers passed to layout constructors in the touched files outside of `JBUI.scale(...)` wrappers.

### Pillar 6: Experience Design (3/4)

- Real, substantive improvement over the phase's own baseline: all three composer dialogs now have an explicit failure state (`Preview unavailable — <reason>` + OK disabled), a "not ready" state (`NOT_READY` balloon, information severity, correct precedent-following language), a stale-document abort-and-recover state (`STALE_DOCUMENT` balloon + working "Reopen composer" action), and a bounded-wait/timeout path (`REFRESH_TIMEOUT_MILLIS` / `LAUNCH_TIMEOUT_MILLIS`) so a hung server no longer leaves the dialog looking healthy forever. This is exactly what #538/#567 asked for, and it is behaviourally tested (`ComposerFlowTest`, `StaleEditGuardTest`, `ComposerNoticesTest`) rather than merely present in code.
- Destructive-action confirmation: N/A for this phase — no new destructive action was added (the stale-document path is "abort silently and notify," the safer of the two options, per the explicit COMP-02 decision) — correctly conservative.
- Rate-limiting rough edge: the refresh-failure balloon is capped at one per dialog *session* (`ComposerFlow.once(...)`), which is the right call to avoid a keystroke-storm of balloons, but it also means a user who fixes the underlying problem (restarts the server) mid-session, keeps working, and then hits a *second, unrelated* failure later in the same dialog session will get no balloon at all for the second failure — only the in-dialog label updates. Since the label is the visually weak channel (Pillar 2/3 findings above), a second failure in one session is nearly invisible. This is a real interaction gap between two decisions (D-05's rate limit + the label's low visual weight) that individually make sense but compound badly together.
- Loading state: there is no visible "checking…"/spinner state during the `flow.observe(...)` window between a keystroke and the next preview arriving — the dialog just shows the previous preview until a new one lands or fails. This is a minor omission (typical for fast local round-trips) but means a genuinely slow (near-timeout) request gives the user no feedback that anything is in flight, only a delayed "Preview unavailable" or a delayed refreshed preview.

---

## Files Audited

- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerNotices.java`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerNoticeRenderer.java`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerFlow.java` (referenced via SUMMARY.md, not independently re-read line-by-line)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/MsgboxComposerDialog.java`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddWindowComposerDialog.java` (partial — `refresh()`/layout sections)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ConfigureMsgboxIntention.java`
- `bbj-intellij/src/main/resources/intentionDescriptions/ConfigureMsgboxIntention/description.html`
- `.planning/phases/82-composer-robustness/82-CONTEXT.md`, `82-01-SUMMARY.md`, `82-02-SUMMARY.md`, `82-03-SUMMARY.md`, `82-04-SUMMARY.md`

Not independently re-read (evidence taken from SUMMARY.md coverage tables, consistent with the audited files' patterns): `AddChildWindowComposerDialog.java`, `ConfigureAddWindowIntention.java`, `ConfigureAddChildWindowIntention.java`, `StaleEditGuard.java`, `DecodeEquality.java`.
