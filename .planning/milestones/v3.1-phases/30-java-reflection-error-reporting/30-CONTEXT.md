# Phase 30: Java Reflection & Error Reporting - Context

**Gathered:** 2026-02-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Java interop reflection finds recently-added methods (e.g., `setSlot()` on BBjControl); cyclic reference errors report specific file and line number. No changes to completion presentation or new capability additions.

</domain>

<decisions>
## Implementation Decisions

### Java reflection — missing methods
- The core problem is that certain methods (e.g., `setSlot()`) never arrive from java-interop — not a caching/refresh issue but a discovery issue
- Researcher must investigate WHY methods are missing: classpath issue vs reflection filtering vs something else
- Java source tree available at `/Users/beff/svn/trunk/com` for investigation
- Once found, missing methods should appear in completion with no special treatment — same as existing methods

### Java reflection — refresh mechanism
- Re-scan classpath when user changes classpath/config settings
- Add a manual "Refresh Java Classes" command to the command palette in both VS Code AND IntelliJ
- Full invalidation of all cached Java class data on refresh (not selective)
- After refresh, auto re-validate all open documents (re-run diagnostics)
- Show a notification message ("Java classes refreshed") after re-scan completes

### Cyclic reference error reporting
- Severity: Error (red)
- Use LSP related information links so users can click to navigate to other files in the cycle
- Researcher should investigate whether other error types beyond cyclic references also lack file/line info

### Claude's Discretion
- Detail level in cyclic reference messages (file+line only vs full cycle path)
- How to structure the refresh command LSP protocol (custom request vs notification)
- Exact notification wording and timing

</decisions>

<specifics>
## Specific Ideas

- `setSlot()` on `BBjControl` is the concrete test case for missing methods
- Java source tree at `/Users/beff/svn/trunk/com` — use for investigating why methods don't come through
- Refresh command should work in both VS Code and IntelliJ from day one

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 30-java-reflection-error-reporting*
*Context gathered: 2026-02-07*
