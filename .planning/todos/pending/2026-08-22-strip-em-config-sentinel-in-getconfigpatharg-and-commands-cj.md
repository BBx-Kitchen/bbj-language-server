---
created: 2026-08-22T07:32:34.472Z
title: Strip EM Config "--" sentinel in getConfigPathArg and Commands.cjs run
area: intellij-run-actions
severity: major
files:

  - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java:326-340 (getConfigPathArg)
  - bbj-vscode/src/Commands/Commands.cjs:258 (run)
  - bbj-vscode/src/Commands/process-args.ts:106-117 (buildRunArgv)

audit_acknowledged:
  milestone: v4.1
  at: 2026-09-03
---

## Problem

`75-REVIEW.md` WR-01 (found during Phase 75's code review, deliberately NOT fixed as part of
this phase's gap-closure pass -- captured here instead per the human's explicit scoping
decision):

`getConfigPathArg()` in `BbjRunActionBase.java` does not strip the EM Config sentinel value
`"--"`, unlike its sibling `getClasspathArg()` right next to it:

```java
protected String getClasspathArg() {
    ...
    // "--" is the EM Config sentinel meaning "not configured" -- treat as no classpath
    if ("--".equals(entry)) {
        return null;
    }
    return "-CP" + entry;
}

protected String getConfigPathArg() {
    BbjSettings.State state = BbjSettings.getInstance().getState();
    String configPath = state.configPath;
    if (configPath == null || configPath.isEmpty()) {
        return null;
    }
    return "-c" + configPath;   // no "--" check -- returns the literal string "-c--"
}
```

When `state.configPath` is exactly `"--"`, `getConfigPathArg()` returns the literal string
`"-c--"`. `BbjRunGuiAction.buildCommandLine` (outside Phase 75's review file list, but the sole
caller of this method) adds this directly as a command-line parameter to the `bbj` executable
via `cmd.addParameter(configPath)` -- unlike the BUI/DWC and web-run paths, there is no `.bbj`
script downstream of the plain GUI run to absorb/ignore the sentinel the way `web.bbj:77` does.

The same class of gap exists on the VS Code side: `Commands.cjs`'s `run` function (line 258)
reads `configPath` with no sentinel filter and passes it straight into `buildRunArgv`
(`process-args.ts:106-117`), which pushes `-c${configPath}` whenever the value is truthy (line
112-114) -- `"--"` is truthy, so the same `-c--` flag would be emitted. VS Code's `runWeb`, in
contrast, is safe only because `web.bbj` itself absorbs the sentinel downstream -- the plain
GUI-run path has no such downstream script to rely on.

## Solution

Add the same `"--".equals(configPath)` short-circuit to `getConfigPathArg()` that
`getClasspathArg()` already has (IntelliJ side), and add the equivalent check to
`Commands.cjs`'s `run` / `buildRunArgv`'s `configPath` handling on the VS Code side -- e.g. via
the existing `stripSentinel` helper already used for `classpath` in the same file.

Deliberately not fixed during Phase 75's gap-closure pass (2026-08-22): the human scoped that
pass to the vacuous guard assertion (CR-01) and the EDT-blocking threading issue (CR-02) plus
the WR-02 temp-file leak found in the same edit. WR-01 was explicitly excluded from that pass.
