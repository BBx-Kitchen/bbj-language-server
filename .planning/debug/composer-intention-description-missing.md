---
status: diagnosed
trigger: "Phase 82 UAT test 6 (G-82-6)"
created: 2026-09-05
updated: 2026-09-05
goal: find_root_cause_only
---

## Symptoms

**Expected:** Hovering or selecting a composer entry in the lightbulb (Alt+Enter) popup shows no preview and raises no error; the composer dialog opens on invocation.

**Actual (user report):** IDE error report while the MSGBOX composer intention was in the lightbulb popup:

```
com.intellij.openapi.diagnostic.UnhandledException: Intention Description Dir URL is null:
BBj visual composer; ConfigureMsgboxIntention; while looking for description.html [Plugin: com.basis.bbj]
Caused by: com.intellij.diagnostic.PluginException
  at IntentionActionMetaData.getResourceLocation(IntentionActionMetaData.java:61)
  at BeforeAfterActionMetaData.getDescription(BeforeAfterActionMetaData.java:146)
  at IntentionPreviewComputable.tryCreateFallbackDescriptionContent(IntentionPreviewComputable.kt:66)
  at IntentionPreviewComputable.call(IntentionPreviewComputable.kt:58)
  at IntentionListStep.calculateIntentionPreview(IntentionListStep.java:208)
```

Also reported: a "Start BBjServices for Java completions" editor banner visible while the dialog was open and gone after closing it. That banner is `BbjJavaInteropNotificationProvider` (java-interop on :5008 unreachable) and is unrelated to the composers — not a gap.

**Reproduction:** Open a `.bbj` file, put the caret on a `MSGBOX(...)`, `addWindow(...)` or `addChildWindow(...)` call, press Alt+Enter, and let the popup compute the preview for the "Configure … options…" entry (hover/arrow onto it).

## Investigation

1. `ConfigureMsgboxIntention`, `ConfigureAddWindowIntention`, `ConfigureAddChildWindowIntention` (`bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/`) each override `generatePreview` to return `IntentionPreviewInfo.EMPTY` (deliberate: the action opens an interactive dialog).
2. When an intention's preview is EMPTY, the platform's `IntentionPreviewComputable` falls back to `tryCreateFallbackDescriptionContent`, which asks `BeforeAfterActionMetaData.getDescription()` for the intention's `description.html`.
3. `IntentionActionMetaData.getResourceLocation` resolves that file from the plugin classpath at `intentionDescriptions/<SimpleClassName>/description.html` and throws `PluginException("Intention Description Dir URL is null …")` when the directory does not exist.
4. `bbj-intellij/src/main/resources/` contains `META-INF`, `com`, `icons`, `textmate` only — there is no `intentionDescriptions/` directory for any of the three classes. Confirmed with `find … -maxdepth 2 -type d`.
5. The three intentions were registered in `plugin.xml` (`<intentionAction>` ×3, "Visual composer lightbulb intentions (#426 / #430)") by commit `cdbd1699` (#433/#435). The gap pre-dates phase 82; phase 82 only changed the launch/notice/apply paths behind the intentions and did not touch the intention classes' preview or resources.
6. The exception is raised on a background coroutine and reported through the IDE's error dialog; it does not stop `invoke()` from opening the composer, which is why the dialogs still worked in tests 2–5 and 7.

## Root Cause

The three composer intentions are registered as `<intentionAction>` extensions and return an empty inline preview, so the IDE looks up the mandatory per-intention description resource `intentionDescriptions/{ConfigureMsgboxIntention,ConfigureAddWindowIntention,ConfigureAddChildWindowIntention}/description.html`, which the plugin never shipped. The missing resource makes the platform throw a `PluginException` every time the lightbulb popup computes a preview for one of these entries.

## Files Involved

- `bbj-intellij/src/main/resources/` — no `intentionDescriptions/` tree at all
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ConfigureMsgboxIntention.java` — `generatePreview` → EMPTY triggers the fallback lookup
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ConfigureAddWindowIntention.java` — same
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ConfigureAddChildWindowIntention.java` — same
- `bbj-intellij/src/main/resources/META-INF/plugin.xml` — the three `<intentionAction>` registrations (lines 112–126)

## Suggested Fix Direction

Ship the platform-conventional resources: `src/main/resources/intentionDescriptions/<SimpleClassName>/description.html` for all three intentions (one short paragraph each explaining that the entry opens the visual composer for that call), plus the conventional `before.bbj.template` / `after.bbj.template` pair so the Settings › Editor › Intentions page renders a before/after too. Add a plain-JUnit test in the composer test package that reads `plugin.xml`, collects every `<intentionAction><className>` and asserts `intentionDescriptions/<SimpleName>/description.html` exists on the classpath, so a future intention cannot regress this. Optionally replace the `EMPTY` preview with `IntentionPreviewInfo.Html` carrying the same text, which sidesteps the fallback entirely; the resource files are still required for the Intentions settings page.
