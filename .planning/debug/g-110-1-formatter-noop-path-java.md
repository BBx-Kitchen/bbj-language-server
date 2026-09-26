---
status: diagnosed
trigger: "G-110-1: With bbj.formatter.javaPath cleared, Format Document on a .bbj file resolves java from PATH and reformats the document. User: I see the toast when the class is changed. but else, formatting appears to be a no-op - nothing changes"
created: 2026-09-26T14:00:00Z
updated: 2026-09-26T15:05:00Z
goal: find_root_cause_only
---

## Current Focus

bug_class: Bohrbug (deterministic; same stack on every attempt, reproduced byte-for-byte in the container)
hypothesis: CONFIRMED. With bbj.formatter.splitSingleLineIF=true the extension passes --single-line-if; the vendored formatter library's BBjCodeSplitter.splitMultiLineIF never pushes a block IF (nothing after THEN) onto its Stack<Boolean>, then calls stack.peek() unguarded (source line 282) when it meets a line holding FI/ENDIF/ELSE -> java.util.EmptyStackException -> java exits 1 -> runFormatter rejects with the stack trace -> the extension only console.warn's it, VS Code logs "provider FAILED", no edit is applied, so the document looks unchanged. Pre-existing; not caused by 110-04.
next_action: none (find_root_cause_only) - return ROOT CAUSE FOUND
reasoning_checkpoint:
  hypothesis: "Format Document is a no-op because the bundled jar crashes (EmptyStackException in splitMultiLineIF) on any block IF when --single-line-if is passed, which the user's bbj.formatter.splitSingleLineIF=true causes; the rejection surfaces only as a log line"
  confirming_evidence:
    - "User's Mac log: provider FAILED + EmptyStackException at BBjCodeSplitter.splitMultiLineIF(:282) ... splitCode(:319)"
    - "Container: user's exact file + `--remove-line-continue --single-line-if` reproduces the identical trace incl. splitCode(:319); default flags exit 0 and format"
    - "Minimal input `if x then` / `fi` crashes with --single-line-if; single-line IFs do not"
    - "Bytecode: block-IF branch (offset 199 ifne 286) adds the line with no Stack.push; offset 610-612 (line 282) does an unguarded Stack.peek()"
    - "User confirmed: removing the if/fi block makes formatting succeed with javaPath empty"
  falsification_test: "A block-IF file crashing with default flags, or the user's settings lacking splitSingleLineIF=true, or a different jar at the phase base - none observed (default flags 83/83 corpus files OK; :319 frame proves removeLineContinuation=true in the user's run; blobs identical)"
  fix_rationale: "(diagnose-only) the crash is in the vendored jar; extension-side the fix is to stop passing a flag that crashes on ordinary code and/or surface the failure, not anything in the java resolver"
  blind_spots: "Did not read the user's settings.json directly - splitSingleLineIF=true is inferred from the crash needing --single-line-if and removeLineContinuation=true from the :319 frame. Did not observe which VS Code notification (if any) the user's entry point produces for a provider rejection."
  candidate_causes:
    - "code: vendored BBjCodeFomatter.jar splitMultiLineIF unguarded Stack.peek (confirmed)"
    - "config: user setting bbj.formatter.splitSingleLineIF=true enables the crashing path (confirmed necessary)"
    - "environment: java resolution/spawn on macOS (eliminated - JVM ran the jar)"
    - "data: file content shape - a block IF closed/else'd on its own line (confirmed necessary)"
  and_gate: "yes - three conditions must hold at once: splitSingleLineIF=true (config) AND a multi-line IF with FI/ENDIF/ELSE on its own line (data) AND the unguarded peek in the jar (code). Separately, the invisibility of the failure is the extension's error handling (runFormatter only logger.warn's a non-zero exit)."

## Symptoms

expected: With bbj.formatter.javaPath cleared (empty, user-level), Format Document on a .bbj file in VS Code resolves `java` from PATH and reformats the document. With a nonexistent path, an error toast names the path and reason, no PATH fallback.
actual: Invalid-path toast works. With the setting cleared, Format Document visibly does nothing ("formatting appears to be a no-op - nothing changes"). User on macOS, VSIX built from this tree (/tmp/bbj-lang.vsix). Unknown whether the file was already formatted or whether an error was logged.
errors: None reported.
reproduction: Test 1 in .planning/phases/110-workspace-settings-filesystem-trust/110-UAT.md
started: Discovered during UAT of phase 110 (plan 110-04 replaced bare cp.spawn('java', ...) with resolveFormatterJava)

## Eliminated

- hypothesis: 110-04 regression - resolveFormatterJava picks a different or failing java than the old bare cp.spawn('java') (macOS /usr/bin/java stub, PATH differences, symlinks, argv[0])
  evidence: resolver walks the same process.env.PATH libuv uses and returns the first absolute existing hit (libuv also skips only non-spawnable entries); probe shows spawn(resolved) and spawn('java') give identical output/stderr; the user's Mac log shows the JVM running the jar (stack trace from inside BBjCodeSplitter), and the user confirmed formatting succeeds with javaPath empty once the IF block is removed
  timestamp: 2026-09-26T14:55:00Z

- hypothesis: an empty-setting resolver refusal ("not found on PATH") swallowed by the once-per-message toast dedupe
  evidence: the java process demonstrably ran on the Mac (JVM stack trace in the log); a refusal never spawns
  timestamp: 2026-09-26T14:55:00Z

- hypothesis: formatter artefacts missing/unreadable in the packaged VSIX (MISSING_OR_UNREADABLE logs without a toast)
  evidence: the bogus-path toast is emitted after verifyFormatterArtifacts passes; VSIX contains the same three jar blobs at extension/tools/formatter/; the jar ran on the Mac
  timestamp: 2026-09-26T14:55:00Z

- hypothesis: a second (no-op) formatting provider from the language server wins the selection
  evidence: only one provider registered for "bbj" (extension.ts registerDocumentFormattingEditProvider); the LS registers no Formatter; the log names basis-intl.bbj-lang provider FAILED
  timestamp: 2026-09-26T14:55:00Z

- hypothesis: the file was already in formatter style, so a successful run produced zero edits
  evidence: the user's file formats (changes) with default flags; with the user's flags the run crashes (exit 1) - there is no successful run to compare
  timestamp: 2026-09-26T14:55:00Z

- hypothesis: specific IF shape in the user's file matters - blank lines inside the block, indented or lowercase `fi`, `process_events` before it, fi vs endif
  evidence: minimal `if x then`/`fi` crashes; blank lines, 8-space indent, upper/lower case, FI vs ENDIF, an ELSE branch, class/method nesting, and removing process_events all still crash under --single-line-if; the only necessary shapes are a block IF (nothing after THEN, or a single-line IF drained at end of line) followed by FI/ENDIF/ELSE on its own line
  timestamp: 2026-09-26T14:58:00Z

## Evidence

- timestamp: 2026-09-26T14:00:00Z
  checked: .planning/debug/knowledge-base.md
  found: File does not exist; no knowledge-base match possible
  implication: Proceed with open investigation

- timestamp: 2026-09-26T14:05:00Z
  checked: git diff d7e0c7be~1 HEAD -- bbj-vscode/src/document-formatter.ts
  found: The only runtime change from 110-04 is (a) resolveFormatterJava(configuredJavaPath) before spawn, with a refusal -> logger.warn + once-per-message toast + reject, and (b) cp.spawn('java', args) -> cp.spawn(javaResolution.path, args). Args list, stdin write, close/exit handling, edit construction all unchanged.
  implication: A 110 regression can only come from the resolver choosing a different/failing binary than libuv's own PATH search for 'java' would, or from a refusal. A refusal always toasts on first occurrence and logs.

- timestamp: 2026-09-26T14:08:00Z
  checked: javap -c / -v of BBjCFCli.BBjCFCli (bbj-vscode/tools/formatter/BBjCFCli.jar, identical 6780-byte jar in /tmp/bbj-lang.vsix at extension/tools/formatter/)
  found: jcommander options: -i/--input = input FILE path, -p/--print = print to console, -w indent width. run(): if input==null return; if !File(input).exists() throw "Input file does not exsit"; if print: System.out.println(formatter.formatBBjCode(readFile(input, UTF_8))). System.in is never read anywhere in the class.
  implication: With the extension's args (-jar BBjCFCli.jar -p -i <document.uri.fsPath> -w N), the formatter formats the SAVED ON-DISK file, not the editor buffer. The p.stdin.end(documentContent) write in runFormatter is dead. Format Document on an unsaved/dirty buffer formats disk content; if disk content is already formatted, output == disk content.

- timestamp: 2026-09-26T14:12:00Z
  checked: bbj-vscode/src/extension.ts:895-900 and bbj-vscode/src/language/ (grep for Formatter)
  found: Exactly one formatting provider for "bbj" (DocumentFormatter via registerDocumentFormattingEditProvider). The language server registers no Formatter service.
  implication: A competing no-op LS formatter being picked by VS Code is ruled out.

- timestamp: 2026-09-26T14:15:00Z
  checked: ran `java -jar tools/formatter/BBjCFCli.jar -p -i <file> -w 2` (Temurin 25 in container) on a deliberately unindented class/method/if/for sample; then on the formatted output with the unindented text piped on stdin
  found: (1) exit 0, output re-indented (2-space), blank lines inserted around field/method; (2) with the disk file already formatted and a misformatted buffer on stdin, output is byte-identical (218 bytes) to the DISK file - stdin ignored; (3) formatting already-formatted text is idempotent (output == input byte for byte, println's newline replaces the stripped trailing newline).
  implication: The jar itself works on a modern JDK. Format Document is a genuine no-op whenever the saved file is already in BBjCFCli's format and the buffer equals the saved file; it is a revert-to-disk (not a format) when the buffer is dirty.

- timestamp: 2026-09-26T14:20:00Z
  checked: Node 24 probe (scratchpad/probe.mts) importing an unmodified copy of src/formatter-java-resolver.ts; emulates runFormatter's spawn/stdout/stdin exactly
  found: resolveFormatterJava("" | "   " | undefined | null) => {path:"/opt/java/default/bin/java"} (== first `which -a java` hit); "/nonexistent/java" => refusal naming the path. CASE 1 (disk misformatted, buffer == disk): post-110 spawn(resolved) and pre-110 spawn("java") both exit 0, both change the text, outputs identical. CASE 2 (disk formatted, buffer == disk): output == buffer (true no-op). CASE 3 (disk formatted, buffer dirty): output == disk, != buffer.
  implication: In this environment the 110 change is behaviour-neutral: same binary, same output. The empty-setting path does format.

- timestamp: 2026-09-26T14:28:00Z
  checked: bbj-vscode/src/language/logger.ts + extension.ts:713 (client side)
  found: logger.warn = console.warn in the extension host (level WARN by default); the BBj output channel is not wired to it. runFormatter's non-zero-exit/stderr and "Formatting took too long" lines therefore never reach Output > BBj; they land only in the extension-host console (Developer Tools).
  implication: Asking the user for the BBj output channel would not show formatter failures; need Developer Tools console / Output > Extension Host instead.

- timestamp: 2026-09-26T14:32:00Z
  checked: VS Code 1.10x workbench bundle shipped in /tmp/code-server/lib/code-server-4.135.0 (workbench.web.main.internal.js, extensionHostProcess.js)
  found: (a) ext host _withAdapter logs "[ext-id] provider FAILED" + the error to the Extension Host log on any provider rejection. (b) RPC serializeReplyErr sends a non-empty string rejection as-is (only empty/undefined becomes an empty reply). (c) Keybinding dispatch: executeCommand(id).then(void 0, p => notificationService.warn(p)); context menu / palette paths also surface errors. (d) formatDocumentWithProvider has try/finally (no catch) and `if (!edits || edits.length === 0) return false` after computeMoreMinimalEdits - an output identical to the buffer yields zero edits and nothing visible. (e) EditorStateCancellationTokenSource flags 5 = Value|Position: moving the cursor/typing during the java run cancels silently.
  implication: A java failure (non-zero exit -> reject(stderr) or 'Unknown error while formatting the BBj document'; spawn error -> Error) would normally surface as a VS Code warning/error notification carrying the stderr text, not a silent no-op. A silent no-op is what VS Code does when the formatter SUCCEEDS with output equal to the buffer (or the request is cancelled by a cursor move).

- timestamp: 2026-09-26T14:40:00Z
  checked: NEW EVIDENCE from the user's Mac (relayed by coordinator), Output panel with bbj.formatter.javaPath cleared, every Format Document attempt
  found: "[error] [basis-intl.bbj-lang] provider FAILED" followed by "Exception in thread "main" java.util.EmptyStackException at java.util.Stack.peek(Stack.java:103) at ...BBjCodeSplitter.splitMultiLineIF(BBjCodeSplitter.java:282) at ...splitLines(:128) at ...split(:39) at ...BBjCodeFormatter.splitCode(:319) at ...formatBBjCode(:76) at ...formatBBjCode(:222) at BBjCFCli.run(:118) at BBjCFCli.main(:67)"
  implication: Java resolution and spawn WORK on the Mac (the JVM loaded and ran the jar) - the resolver/110-04 is not the failure point. The bundled formatter library crashes on the user's file (formatBBjCode(String) path via -p). Non-zero exit -> reject(stderr) -> provider FAILED. Shifts focus to the jar's splitMultiLineIF.

- timestamp: 2026-09-26T14:48:00Z
  checked: user's exact failing file (relayed by coordinator; scratchpad/user.bbj) run through the bundled jar with `-p -i user.bbj -w 2` plus every flag combination; javap -l of BBjCodeFormatter.splitCode(ArrayList)
  found: no flags -> exit 0 (formats: collapses blanks, indents print, dedents fi). --remove-line-continue alone -> exit 0. --keywords-uppercase (+/- --remove-line-continue) -> exit 0. --single-line-if -> exit 1, EmptyStackException at splitMultiLineIF(:282), splitCode(:328). --remove-line-continue --single-line-if (+/- --keywords-uppercase) -> exit 1, identical trace with splitCode(:319) - EXACT frame-for-frame match of the user's trace. splitCode line 319 is the split() call inside `if (settings.isRemoveLineContinuationEnabled())` (bytecode offset 80 ifeq 216); line 328 is the default-branch split() call.
  implication: The crash requires bbj.formatter.splitSingleLineIF=true (-> --single-line-if). The user's :319 frame proves their settings also have bbj.formatter.removeLineContinuation=true. Reproduced deterministically in the container on Temurin 25.
- timestamp: 2026-09-26T14:50:00Z
  checked: user confirmation relayed by coordinator
  found: removing the `if i=1 then ... fi` block from the file makes Format Document succeed on the Mac with bbj.formatter.javaPath empty (java from PATH).
  implication: PATH resolution + spawn from 110-04 confirmed working end to end on the user's machine; the failure is purely the jar's handling of that IF block under --single-line-if.

- timestamp: 2026-09-26T14:56:00Z
  checked: minimization with `-p -i f -w 2 --single-line-if` (scratchpad b_*.bbj, c_*.bbj)
  found: CRASH (EmptyStackException): `if x then`+`fi`; `if i=1 then`+`print "X"`+`fi`; ENDIF; uppercase IF/THEN/FI; indented fi; blank lines anywhere in the block; ELSE+FI; ELSE+ENDIF; `if x then print 1`+`fi`; `if(x <> y) then`+body+`FI`; inside class/method; with WHILE/WEND or err=*next lines. OK: `if x then` alone (no closer); `if i=1 then print "X"`; `if i=1 then print "X" else print "Y"`. Related second crash: `if(x <> y)` (no THEN)+body+`FI` -> StringIndexOutOfBoundsException at BBjCodeSplitter.isSplitablePosition(:490) from splitMultiLineIF(:236). Both shapes exit 0 with default flags.
  implication: Minimal reproducer is two lines, `if x then` / `fi`. Any multi-line IF whose FI/ENDIF/ELSE stands on its own line crashes the formatter when splitSingleLineIF is on.

- timestamp: 2026-09-26T14:57:00Z
  checked: javap -c -l BBjCodeSplitter.splitMultiLineIF (local 5 = java.util.Stack)
  found: For a line starting with IF and containing " THEN": if the text after THEN is empty (offset 196-199 isEmpty -> ifne 286) the line is added as-is and control jumps to 776 with NO push (offset 286-293). Only when a statement follows THEN is `Boolean` pushed (offset 228-243). For any other line, IFStatementKeywordPositions finds ELSE/FI/ENDIF; if isSplitablePosition, the prefix is emitted and then `stack.peek()` runs unconditionally (offset 610-612 = source line 282) - no isEmpty() guard. Single-line IFs are drained at end of line (offsets 804-978 isEmpty/peek/pop loop), so a following lone FI also sees an empty stack.
  implication: Mechanism fully explained: the single-line-IF splitter assumes every FI/ENDIF/ELSE belongs to a same-line IF it pushed; ordinary block IFs violate that.

- timestamp: 2026-09-26T14:59:00Z
  checked: whole repo corpus (examples/*.bbj + bbj-vscode/test/test-data/*.bbj, 83 files) through the jar, default flags vs --single-line-if
  found: default: 83/83 exit 0. --single-line-if: 77 ok, 5 EmptyStackException (examples/if-statements.bbj, issue208-and-is-also-a-function.bbj, issue650-composer-cues.bbj, other_cases.bbj, simple-structures.bbj), 1 StringIndexOutOfBoundsException (test-data/class-def.bbj). Exactly the 6 files containing a standalone FI/ENDIF/ELSE line fail; no other file fails.
  implication: splitSingleLineIF=true breaks formatting for every file with a conventional block IF; default settings never hit it.

- timestamp: 2026-09-26T15:01:00Z
  checked: git rev-parse <c591cfe8 phase base | HEAD>:bbj-vscode/tools/formatter/{BBjCFCli.jar,lib/BBjCodeFomatter.jar,lib/jcommander-1.71.jar}; git log -- bbj-vscode/tools/formatter; `git show c591cfe8:bbj-vscode/src/document-formatter.ts`
  found: all three blobs identical at base and HEAD (ffddf8fd, 1470932c, 1790cbaf); the jars were last changed 2023-07-10 (3678cfa8, "cherrypick ... from previous extension"). At the base, args are built identically (`if (config.splitSingleLineIF) args.push('--single-line-if')`, `--remove-line-continue`, `-p`, `-i`) and spawned with cp.spawn('java', ...). The original 2023 DocumentFormatter.js already passed the same flags.
  implication: Pre-existing since the formatter was introduced; phase 110 did not touch the jar or the flags.

- timestamp: 2026-09-26T15:02:00Z
  checked: scratchpad/probe2.mts - user's file with the exact args the extension builds for indentWidth=2, removeLineContinuation=true, splitSingleLineIF=true; spawned once via resolveFormatterJava('') (post-110) and once via bare 'java' (pre-110)
  found: both exit 1, identical stderr (EmptyStackException ... splitMultiLineIF(:282)), empty stdout
  implication: The phase-base build fails identically on the user's file and settings. Not a regression.

- timestamp: 2026-09-26T15:03:00Z
  checked: document-formatter.ts close handler + provideDocumentFormattingEdits reject path (unchanged by 110)
  found: `if (code !== 0) return reject(stderr)`; the reject handler does `logger.warn(String(err)); return Promise.reject(err)` - no vscode.window.showErrorMessage, and logger.warn is console.warn in the extension host (not the BBj output channel). VS Code's ext host adds "[basis-intl.bbj-lang] provider FAILED" + the error to its log, matching the user's Output panel lines.
  implication: UX gap (pre-existing): a formatter crash gives the user no message of its own from the extension; the document is simply left unchanged, which reads as a no-op. Only pre-spawn refusals (checksum mismatch, java resolution) toast.

## Resolution

root_cause: "Pre-existing, not a phase-110 regression. The user's settings have bbj.formatter.splitSingleLineIF=true (and removeLineContinuation=true, proven by the splitCode(:319) frame), so document-formatter.ts passes --single-line-if (and --remove-line-continue) to the vendored BBjCFCli.jar. In the vendored library (lib/BBjCodeFomatter.jar), BBjCodeSplitter.splitMultiLineIF pushes onto its Stack<Boolean> only for IF lines with a statement after THEN, and drains that stack at the end of the line. When a later line holds FI/ENDIF/ELSE it calls stack.peek() with no isEmpty() guard (source line 282), so any ordinary multi-line IF crashes with java.util.EmptyStackException. The minimal case is the two lines `if x then` and `fi`; `if(...)` without THEN hits a sibling StringIndexOutOfBoundsException. java exits 1, runFormatter rejects with the stack trace, and provideDocumentFormattingEdits only logger.warn's it (extension-host console). VS Code logs 'provider FAILED' and applies no edit, so the document looks unchanged. With javaPath empty, java resolution and spawn work (the JVM ran the jar on the Mac, and formatting succeeds once the IF block is removed)."
fix: ""
verification: ""
files_changed: []
secondary_findings:
  - "Pre-existing: the jar's -p/-i mode reads the SAVED file from disk (BBjCFCli.run -> readFile(input)); runFormatter's p.stdin.end(documentContent) is dead, so Format Document on a dirty buffer replaces it with the formatted saved content (unsaved edits lost), and format-on-save would format the previous save. Verified with the jar (stdin ignored); VS Code's save-participant ordering was not verified in this session."
  - "Pre-existing: if the -i path does not exist (e.g. an untitled buffer) the CLI prints 'Input file does not exsit' to stderr and exits 0 with empty stdout, which runFormatter would resolve as '' (a whole-document replacement with nothing). Exit 0 + 0-byte stdout verified with the jar; not run through VS Code."
  - "UAT note: the G-110-1 truth (javaPath empty -> java from PATH -> document reformatted) holds when splitSingleLineIF is false or the file has no block IF. Test 1 can be re-run with bbj.formatter.splitSingleLineIF=false."
