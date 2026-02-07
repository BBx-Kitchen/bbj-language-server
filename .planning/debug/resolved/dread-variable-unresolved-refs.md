---
status: resolved
trigger: "DREAD statement variables report 'Could not resolve reference to NamedElement named X$' even though DREAD is an input statement that initializes/reads variables"
created: 2026-02-06T00:00:00Z
updated: 2026-02-06T00:00:02Z
symptoms_prefilled: true
---

## Current Focus

hypothesis: VERIFIED - Fix complete and working
test: Added validation test in parser.test.ts
expecting: Test passes with no unresolved reference errors
next_action: Archive session and commit fix

## Symptoms

expected: `DREAD X$,Y$` should not produce unresolved reference errors for X$ and Y$
actual: Variables in DREAD report "Could not resolve reference to NamedElement named 'X$'"
errors: "Could not resolve reference to NamedElement named 'X$'"
reproduction: Write `DREAD X$,Y$` in a BBj file
started: Since DREAD was added in phase 24

## Eliminated

## Evidence

- timestamp: 2026-02-06T00:00:01Z
  checked: bbj.langium grammar file
  found: DreadStatement (line 212-214): 'DREAD' items+=InputItem (',' items+=InputItem)* Err?
  implication: DREAD uses InputItem, same as READ statement

- timestamp: 2026-02-06T00:00:02Z
  checked: bbj.langium grammar file
  found: ReadStatement (line 581-583): kind=READ_KINDS record?='RECORD'? WithChannelAndOptionsAndInputItems?
  implication: READ also uses InputItem through WithChannelAndOptionsAndInputItems fragment

- timestamp: 2026-02-06T00:00:03Z
  checked: InputItem definition (line 607-609)
  found: InputItem: InputVariable | Expression | OtherItem
  implication: InputItem can be InputVariable, which wraps an Expression

- timestamp: 2026-02-06T00:00:04Z
  checked: InputVariable definition (line 614-616)
  found: InputVariable: {infer InputVariable} Expression options=VerifyOptions?
  implication: InputVariable contains an Expression, which will resolve to a SymbolRef cross-reference

- timestamp: 2026-02-06T00:00:05Z
  checked: bbj-scope-local.ts lines 172-192
  found: Special handling for InputVariable when inside ReadStatement OR EnterStatement
  implication: InputVariable creates new variable declarations ONLY for ReadStatement and EnterStatement

- timestamp: 2026-02-06T00:00:06Z
  checked: DreadStatement import in bbj-scope-local.ts
  found: No import for isDreadStatement, not referenced anywhere in the file
  implication: DreadStatement is NOT handled in the scope computation logic

## Resolution

root_cause: DreadStatement InputItem variables are not handled in bbj-scope-local.ts. The code at lines 172-192 only creates variable declarations for InputVariable nodes when their container is ReadStatement OR EnterStatement. DreadStatement was added in phase 24 but the scoping logic was never updated to include it. This causes DREAD variables to be treated as cross-references to existing variables rather than declarations of new variables.

fix:
1. Added isDreadStatement import to bbj-scope-local.ts
2. Updated condition at line 172 to include isDreadStatement check:
   `isReadStatement(node.$container) || isDreadStatement(node.$container) || isEnterStatement(node.$container)`
3. Updated comment to document DREAD case

verification:
- Added test case in parser.test.ts: "GRAM-03: DREAD variables should not show unresolved reference errors"
- Test validates DREAD creates variables and they can be used without errors
- Test passes successfully
- No regression in existing tests

files_changed:
- bbj-vscode/src/language/bbj-scope-local.ts (import + condition + comment)
- bbj-vscode/test/parser.test.ts (new validation test)
