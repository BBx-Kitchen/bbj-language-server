---
status: diagnosed
trigger: "G-88-3: tri-state composer generates invalid BBj mask literals — bare hex in SETOPTS argument (test 6), double-quoted $...$ in AND/IOR argument (test 8, !ERROR=17)"
created: 2026-09-11T09:00:00Z
updated: 2026-09-11T09:10:00Z
audit_acknowledged:
  milestone: v4.3
  at: 2026-09-13
  status: diagnosed
---

## Current Focus

bug_class: Bohrbug (fully deterministic — pure string codegen; no timing, concurrency, or
environment component. Reproduced on the first attempt, character-for-character.)

status: ROOT CAUSE CONFIRMED — diagnose-only mode, no fix applied.

reasoning_checkpoint:
  hypothesis: |
    There is no shared mask-literal formatter. Two unrelated write sites each emit a different
    WRONG literal form, because each was written against a different (and in one case, a
    different language's) syntax contract:
    (A) `setopts-catalog.ts:455/457` builds the IOR/AND argument with the template
        `"$${hex}$"` — a literal `"` on each side of the `$...$` hex literal.
    (B) The absolute edit-in-place path derives `hexRange` from the StringLiteral's CST node,
        which SPANS the `$` delimiters, then hands that range to a writer (VS Code
        `setopts-composer-webview.ts:91-93`, IntelliJ `ComposerLauncher.java:501`) that was
        built for config.bbx and replaces the range with BARE hex digits.
  confirming_evidence:
    - "EXPERIMENT 1 (executed): composeSetOptsBlock emitted `opts$=AND(opts$,\"$BFFF…FFFF$\")` — the double-quoted form, identical in shape to the UAT report."
    - "EXPERIMENT 2 (executed): splicing hexDigits into hexRange exactly as the writer does produced `SETOPTS 20C20240000000000000000000000000` — character-for-character the UAT's reported bad line."
    - "bbj.langium:949-950 declares STRING_LITERAL and HEX_STRING as two SEPARATE terminals, so `\"$X$\"` is a plain 34-char string, never a hex decode."
    - "setopts-in-code-request.test.ts:87 already asserts hexRange spans the delimiters (`source.slice(start,end) === '$08004020$'`)."
  falsification_test: |
    If either code path had emitted the correct bare `$…$` form in the experiments, that half of
    the hypothesis would have been refuted. Neither did.
  fix_rationale: |
    Not applied (goal: find_root_cause_only). The fix must introduce ONE BBj-hex-literal
    formatter used by every generated line kind, and reconcile the absolute path's
    range-vs-output contract (either narrow hexRange to the digits, or have the writer re-emit
    the `$…$` wrapper — but not both, or the delimiters double up).
  blind_spots:
    - "The mask-WIDTH question test 8 was designed to answer (88-RESEARCH A2: is a 16-byte/32-hex-digit mask the right width against a live OPTS value?) is STILL unverified — the quoting defect aborted the run before AND() ever saw two decoded operands. Fixing the quoting may expose a second, independent width defect."
    - "No live BBj run was performed in this session; all evidence is static + in-process execution of the exact production functions."
  candidate_causes:
    - "code: `setopts-catalog.ts:455/457` template has two spurious `\"` characters (category: code)"
    - "code/contract: delimiter-spanning `hexRange` + bare-digit writer — a cross-module contract mismatch, not a typo (category: code)"
    - "process/test-oracle: `setopts-catalog.test.ts:343-344` asserts by re-evaluating the SAME template as production — a tautological oracle that can never fail (category: process)"
    - "data/leniency: `parseHexLiteral` (setopts-code-scanner.ts:141-156) accepts BOTH `\"$08$\"` and `$08$`, so the invalid form round-trips cleanly through every decode test (category: data/validation)"
    - "environment: RULED OUT — the reported output matches current HEAD source exactly, so this is not the stale-install class that explained G-88-1/G-88-2"
  and_gate: |
    YES for manifestation 1 — it requires BOTH (a) hexRange spanning the `$` delimiters AND
    (b) the writer emitting bare digits. Either condition alone is harmless: a digits-only range
    with a bare-digit writer is correct, and a delimiter-spanning range with a `$`-wrapping
    writer is correct. This is a genuine two-condition defect, which is why it is invisible in
    each module read alone.
    NO for manifestation 2 — a single-site template defect.

## Symptoms

expected: |
  Every mask/hex literal the composer generates uses BBj program syntax: a bare `$...$` hex-string
  literal. Never a bare unquoted hex string (config.bbx-only), never `"$...$"` (extra double quotes
  make BBj treat `$` as literal text instead of decoding hex).
actual: |
  (1) SETOPTS statement argument generated as `SETOPTS 20C20240000000000000000000000000` — missing
  `$...$` entirely.
  (2) IOR/AND call argument generated as `opts$=AND(opts$,"$DFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF$")` —
  extra surrounding double quotes.
errors: "!ERROR=17 (Strings must be the same length.)" on the AND(...) line at runtime
reproduction: |
  88-UAT.md tests 6 and 8 — invoke tri-state composer in VS Code on
  examples/issue475-setopts-in-code.bbj, inspect the inserted/edited block.
  In-process reproduction (this session, both confirmed): call `composeSetOptsBlock` directly;
  and run `createDecodeInCodeHandler` on `SETOPTS $00C20240000000000000000000000000$` then splice
  `hexDigits` into `hexRange` as the writer does.
started: |
  Manifestation 2: commit 1601a07d `feat(88-03)` (2026-09-07) — the line was born wrong.
  Manifestation 1: latent from decb6dfb `feat: visual SETOPTS composer (#474)` (2026-07-19, where
  bare hex is CORRECT for config.bbx), activated by cfe9bed0 `feat(88-06)` (2026-09-07) which
  routed the BBj-program absolute mode into that same config.bbx writer unchanged.

## Eliminated

- hypothesis: "Stale/un-rebuilt extension install (the class that explained G-88-1 and G-88-2)"
  evidence: "The reported output matches current HEAD source byte-for-byte when the production functions are executed in-process. A stale bundle would produce different or no output, not this exact output."
  timestamp: 2026-09-11T09:08:00Z

- hypothesis: "The mask VALUES/widths are wrong (e.g. a short vector padded incorrectly)"
  evidence: "EXPERIMENT 1 output shows exactly 32 hex digits (16 bytes) per mask, with exactly one bit differing from the all-0x00 (IOR) / all-0xFF (AND) base — singleBitIorMask/singleBitAndMask are correct. The !ERROR=17 length mismatch is caused purely by the 2 extra `\"` characters defeating hex decoding, not by the digit count."
  timestamp: 2026-09-11T09:06:00Z

- hypothesis: "A third, IntelliJ-side duplicate codegen emits its own literal form"
  evidence: "grep of bbj-intellij/src/main/java found no IOR/AND string construction — only javadoc mentions. The IntelliJ tri-state dialog consumes the server's `setoptsComposeTriState` text verbatim, so it inherits manifestation 2 rather than duplicating it. (It DOES independently duplicate manifestation 1, at ComposerLauncher.java:501.)"
  timestamp: 2026-09-11T09:09:00Z

## Evidence

- timestamp: 2026-09-11T09:02:00Z
  checked: "bbj-vscode/src/setopts-catalog.ts lines 450-465 (composeSetOptsBlock)"
  found: |
    setLines.push(`${variable}=IOR(${variable},"$${singleBitIorMask(bit.byte, bit.mask)}$")`);
    clearLines.push(`${variable}=AND(${variable},"$${singleBitAndMask(bit.byte, bit.mask)}$")`);
    In the template, `,"$` is three literal characters and `$"` two more — the `$...$` hex literal
    is wrapped in a literal pair of double quotes.
  implication: "Manifestation 2's proximate cause, at a single site. Both the compose-new and the chain edit-in-place ('reassignments' scope) paths return these same strings."

- timestamp: 2026-09-11T09:03:00Z
  checked: "bbj-vscode/src/language/bbj.langium:949-950"
  found: |
    terminal STRING_LITERAL: /"([^"]|"{2})*"/;
    terminal HEX_STRING: /\$[0-9a-fA-F]*\$/;   // $0A1E$, $$ = Null string
    StringLiteral (line 830) is `value=(STRING_LITERAL | HEX_STRING)` — one AST type, two
    genuinely different tokens.
  implication: |
    The grammar itself proves the distinction the generator ignores. `"$DFFF…$"` lexes as
    STRING_LITERAL and is a 34-character text value; only a bare HEX_STRING is decoded to 16
    bytes. Hence AND()'s operands differ in length → !ERROR=17. The claim is token-level, not
    inferred from the bug report.

- timestamp: 2026-09-11T09:04:00Z
  checked: "bbj-vscode/src/language/setopts-in-code-request.ts:155-169 (absolute branch)"
  found: |
    const cst = target.opts.$cstNode;
    const hexRange: [number, number] = [cst.offset - lineStart, cst.offset + cst.length - lineStart];
    ... absolute: { line, hexRange, hexDigits: shape.hexDigits }
    `hexRange` is the CST node's full extent (the whole HEX_STRING token, delimiters included),
    while `hexDigits` comes from parseHexLiteral, which STRIPS the delimiters.
  implication: "The two fields of the same payload use opposite conventions — the range includes `$…$`, the digits do not. Nothing in the interface's doc comment states this."

- timestamp: 2026-09-11T09:04:30Z
  checked: "bbj-vscode/test/setopts-in-code-request.test.ts:86-87"
  found: "expect(source.slice(start, end)).toBe('$08004020$') — an EXISTING, PASSING test pins hexRange as delimiter-inclusive."
  implication: "The delimiter-spanning range is intentional and locked by a test; the fix must not silently narrow it without updating this assertion (or must change the writer instead)."

- timestamp: 2026-09-11T09:05:00Z
  checked: "bbj-vscode/src/setopts-composer-webview.ts:84-100 (the 'apply' handler)"
  found: |
    edit.replace(uri, new vscode.Range(target.line, target.hexRange[0], target.line, target.hexRange[1]), r.hexDigits);
    Writes BARE digits. This module's own header comment (lines 1-14) declares it the
    "Visual config.bbx SETOPTS composer" — where `SETOPTS 08004020` bare hex IS the correct syntax.
  implication: "Manifestation 1's proximate cause: a config.bbx-syntax writer reused verbatim for a BBj-program literal whose range includes the `$` delimiters. Delimiters in, bare digits out → delimiters deleted."

- timestamp: 2026-09-11T09:06:00Z
  checked: "EXPERIMENT (executed, scratch vitest, since deleted) — composeSetOptsBlock with one Set + one Clear"
  found: |
    "opts$=OPTS"
    "opts$=IOR(opts$,\"$80000000000000000000000000000000$\")"
    "opts$=AND(opts$,\"$BFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF$\")"
    "SETOPTS opts$"
  implication: "Direct observation, not inference: the emitted IOR/AND lines carry the extra double quotes, matching the UAT's `opts$=AND(opts$,\"$DFFF…$\")` shape exactly (the UAT cleared a different bit). Manifestation 2 CONFIRMED."

- timestamp: 2026-09-11T09:06:30Z
  checked: "EXPERIMENT (executed) — createDecodeInCodeHandler on `SETOPTS $00C20240000000000000000000000000$`, then splice per setopts-composer-webview.ts:91-93"
  found: |
    mode: absolute, editable: true
    hexRange:   [8,42]                                        (34 chars)
    range text: "$00C20240000000000000000000000000$"           (delimiters INCLUDED)
    hexDigits:  "00C20240000000000000000000000000"            (delimiters STRIPPED)
    WRITTEN:    "SETOPTS 20C20240000000000000000000000000"
  implication: |
    The written line is character-for-character the UAT's reported bad line
    `SETOPTS 20C20240000000000000000000000000`. Manifestation 1 CONFIRMED, including the
    byte-0 `00`→`20` change the tester made. examples/issue475-setopts-in-code.bbj:6 is exactly
    `SETOPTS $00C20240000000000000000000000000$`, so this is the literal the tester edited.

- timestamp: 2026-09-11T09:07:00Z
  checked: "bbj-vscode/test/setopts-catalog.test.ts:335-348 — the only test asserting composeSetOptsBlock's exact output"
  found: |
    expect(result.lines).toEqual([
      ...,
      `${SETOPTS_IN_CODE_DEFAULT_VAR}=IOR(${SETOPTS_IN_CODE_DEFAULT_VAR},"$${singleBitIorMask(...)}$")`,
      `${SETOPTS_IN_CODE_DEFAULT_VAR}=AND(${SETOPTS_IN_CODE_DEFAULT_VAR},"$${singleBitAndMask(...)}$")`,
      ...]);
    The expected value is built by re-evaluating the SAME template literal the production code
    uses, calling the SAME mask functions. The sibling tests (lines 350-367) only use
    `toContain('IOR')` / `not.toContain('SETOPTS')` — structural, never the literal form.
  implication: |
    A tautological oracle: a stray `"` in the template is copied into the expectation, so the
    test is mathematically incapable of failing on the delimiter form. This is WHY the defect
    shipped despite "33 passing composer tests".

- timestamp: 2026-09-11T09:07:30Z
  checked: "bbj-vscode/src/language/setopts-code-scanner.ts:141-156 (parseHexLiteral) and the test corpus"
  found: |
    parseHexLiteral strips `$` only "when both are present", after the value converter has
    already stripped `"` from a STRING_LITERAL (bbj-value-converter.ts:14). So BOTH `"$08$"` and
    `$08$` decode identically to `08`. Consequently the fixtures in
    setopts-in-code-request.test.ts (lines 55, 91, 166) are written in the INVALID quoted form
    — `SETOPTS "$08004020$"`, `A$=IOR(A$,"$08$")` — and pass.
  implication: |
    The decoder's tolerance is a contributing cause: it made the wrong output form look
    round-trippable, so the wrong form propagated from the generator into the test fixtures and
    was never contradicted. Contrast the REAL BBj file examples/issue475-setopts-in-code.bbj,
    which uses the bare form throughout (`$C2$`, `$7F$`, `$01$`, `$FE$`).

- timestamp: 2026-09-11T09:08:30Z
  checked: "bbj-intellij/src/main/java/.../composer/ComposerLauncher.java:471-503 and a grep for IOR/AND codegen across bbj-intellij/src/main/java"
  found: |
    Line 501: doc.replaceString(ls + ed.hexRange[0], ls + ed.hexRange[1], hex);  // hex = bare digits
    No IOR/AND string construction anywhere in the IntelliJ sources (javadoc mentions only) —
    the tri-state dialog inserts the server's composed text verbatim.
  implication: |
    Blast radius: manifestation 2 is server-side and therefore hits BOTH IDEs (currently masked
    in IntelliJ by the separate G-88-2 Alt+Enter hang). Manifestation 1 is independently
    duplicated in IntelliJ at ComposerLauncher.java:501 — the fix must cover both hosts, or
    IntelliJ will keep emitting bare-hex SETOPTS once G-88-2 is unblocked.

- timestamp: 2026-09-11T09:09:30Z
  checked: "git log -L on both sites"
  found: |
    setopts-catalog.ts:455-457  → 1601a07d feat(88-03) 2026-09-07 (born wrong)
    setopts-composer-webview.ts:88-96 → decb6dfb feat #474 2026-07-19 (correct for config.bbx)
    setopts-in-code-ui.ts:134-145 → cfe9bed0 feat(88-06) 2026-09-07 (the reuse that activated it)
  implication: "Confirms manifestation 1 is a reuse/contract defect introduced by 88-06, not a regression in the #474 config.bbx composer, which remains correct for its own file format."

## Resolution

root_cause: |
  Two independent defects in the composer's generated-source text, both stemming from one design
  omission: THERE IS NO SHARED BBj-HEX-LITERAL FORMATTER. Every line kind the composer emits
  hand-rolls its own literal syntax, so each one encodes a different (wrong) assumption about how
  a BBj hex mask is written.

  (1) IOR/AND call argument — `bbj-vscode/src/setopts-catalog.ts:455` and `:457`.
      `composeSetOptsBlock` builds the argument with the template `…,"$${mask}$")`, emitting
      `opts$=AND(opts$,"$BFFF…FFFF$")`. Per `bbj.langium:949-950`, `STRING_LITERAL` (`"…"`) and
      `HEX_STRING` (`$…$`) are two distinct terminals; the quoted form is a 34-character plain
      string, so BBj never hex-decodes it and `AND()` compares a 34-byte operand against the
      16-byte `opts$` → `!ERROR=17 (Strings must be the same length.)`. Server-side, so it
      affects the VS Code compose-new path, the VS Code chain edit-in-place path
      (`scope:'reassignments'`), and the IntelliJ tri-state dialog alike.

  (2) SETOPTS statement argument (absolute edit-in-place) — a two-condition contract mismatch
      (the AND-gate fired):
        (a) `setopts-in-code-request.ts:162` derives `hexRange` from the StringLiteral's CST node,
            so the range SPANS the `$` delimiters (`[8,42]` = `"$00C2…$"`, pinned by the existing
            test `setopts-in-code-request.test.ts:87`), while the sibling `hexDigits` field has
            them stripped; AND
        (b) the writer that consumes that range — `setopts-composer-webview.ts:91-93` in VS Code,
            `ComposerLauncher.java:501` in IntelliJ — replaces it with BARE `hexDigits`, because
            that writer was built by #474 for **config.bbx**, where bare hex is the correct
            syntax, and 88-06 (`cfe9bed0`) routed BBj-program absolute mode into it unchanged.
      Delimiters in, bare digits out → the `$…$` wrapper is deleted, yielding
      `SETOPTS 20C20240000000000000000000000000` (reproduced character-for-character).

  Why it shipped un-caught: the only test asserting `composeSetOptsBlock`'s exact output
  (`setopts-catalog.test.ts:343-344`) builds its expected value by re-evaluating the SAME
  template literal as production, making it a tautological oracle that cannot fail on the
  delimiter form; and `parseHexLiteral` (`setopts-code-scanner.ts:141-156`) accepts the invalid
  `"$08$"` form as readily as the valid `$08$`, so the wrong form propagated into the decode
  test fixtures (`setopts-in-code-request.test.ts:55, 91, 166`) and round-tripped cleanly there
  too. No test anywhere compares generated output against real BBj syntax.

fix: "" # not applied — goal: find_root_cause_only
verification: "" # not applied
files_changed: []
