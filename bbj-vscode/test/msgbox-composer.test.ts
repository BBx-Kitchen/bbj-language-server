import { describe, expect, test } from 'vitest';
import {
    encode, decode, describe as describeExpr, composeStatement, parseMsgboxCallOnLine, findMsgboxCallAt,
    stateFromSelection, flagsFromState, validateBbjExpression, expressionDisplayText, buttonLabels,
    splitButtonsAndTrailing, DEFAULT_STATE, resolvesToString, validateStringField, quoteAsStringLiteral,
    msgboxPreview,
} from '../src/msgbox-composer';

describe('MSGBOX composer logic (#426)', () => {
    test('encode combines button set + icon + default button + flags', () => {
        expect(encode({ ...DEFAULT_STATE, buttonSet: 4, icon: 32 })).toBe(36); // Yes/No + Question
        expect(encode({ ...DEFAULT_STATE, buttonSet: 4, icon: 48 })).toBe(52); // Yes/No + Exclamation
        expect(encode({ ...DEFAULT_STATE, buttonSet: 1, icon: 64, defaultButton: 256 })).toBe(1 + 64 + 256);
        expect(encode({ ...DEFAULT_STATE, buttonSet: 3, icon: 32, noEnter: true })).toBe(3 + 32 + 65536);
    });

    test('stateFromSelection maps flat UI selection (flags list) to state', () => {
        expect(encode(stateFromSelection({ buttonSet: 4, icon: 32, flags: [65536] }))).toBe(4 + 32 + 65536);
        expect(encode(stateFromSelection({ buttonSet: 3, icon: 48, defaultButton: 256, flags: [32768, 131072] })))
            .toBe(3 + 48 + 256 + 32768 + 131072);
        expect(encode(stateFromSelection({}))).toBe(0);
    });

    test('decode is the inverse of encode', () => {
        for (const n of [0, 36, 52, 321, 65572, 32768, 131072, 4 + 32 + 512]) {
            expect(encode(decode(n))).toBe(n);
        }
    });

    test('decode splits a real value into parts', () => {
        const s = decode(52);
        expect(s.buttonSet).toBe(4); // Yes/No
        expect(s.icon).toBe(48);     // Exclamation
        expect(s.defaultButton).toBe(0);
    });

    test('describe renders a human summary', () => {
        expect(describeExpr(36)).toBe('Yes, No · Question icon');
        expect(describeExpr(0)).toBe('OK');
        expect(describeExpr(3 + 32 + 256 + 65536)).toBe('Yes, No, Cancel · Question icon · default: Second button · no Enter');
    });

    test('composeStatement includes only the args it needs', () => {
        expect(composeStatement({ message: '"Hi"', expr: 0 })).toBe('MSGBOX("Hi")');
        expect(composeStatement({ message: '"Hi"', expr: 36 })).toBe('MSGBOX("Hi", 36)');
        expect(composeStatement({ message: '"Hi"', expr: 36, title: '"Confirm"' })).toBe('MSGBOX("Hi", 36, "Confirm")');
        expect(composeStatement({ message: '"Hi"', expr: 0, title: '"T"' })).toBe('MSGBOX("Hi", 0, "T")');
        expect(composeStatement({ message: '"Hi"', expr: 36, title: '"C"', assignTo: 'ret!' }))
            .toBe('ret! = MSGBOX("Hi", 36, "C")');
        expect(composeStatement({ message: '"Q"', expr: 7, buttons: ['"Left"', '"Right"'] }))
            .toBe('MSGBOX("Q", 7, "", "Left", "Right")');
    });

    test('composeStatement preserves trailing args (buttons / MODE / ERR) when rewriting', () => {
        expect(composeStatement({ message: '"m"', expr: 36, title: '"t"', trailingArgs: ['MODE="theme=primary"', 'ERR=*NEXT'] }))
            .toBe('MSGBOX("m", 36, "t", MODE="theme=primary", ERR=*NEXT)');
        // trailing args force a (possibly empty) title slot to keep positions valid
        expect(composeStatement({ message: '"m"', expr: 0, title: '', trailingArgs: ['TIM=5'] }))
            .toBe('MSGBOX("m", 0, "", TIM=5)');
    });

    test('flagsFromState is the inverse of the flag part of stateFromSelection', () => {
        expect(flagsFromState(stateFromSelection({ flags: [65536, 131072] })).sort()).toEqual([65536, 131072].sort());
        expect(flagsFromState(stateFromSelection({}))).toEqual([]);
    });

    test('validateBbjExpression flags unterminated strings / unbalanced parens, allows real expressions', () => {
        expect(validateBbjExpression('"TEST').ok).toBe(false);                 // no closing quote
        expect(validateBbjExpression('"TEST"').ok).toBe(true);
        expect(validateBbjExpression('"say ""hi"""').ok).toBe(true);           // "" escapes
        expect(validateBbjExpression('msg$').ok).toBe(true);                   // a variable is fine
        expect(validateBbjExpression('a$ + "!"').ok).toBe(true);              // concatenation
        expect(validateBbjExpression('getText(1').ok).toBe(false);            // unbalanced paren
        expect(validateBbjExpression('', { required: true }).ok).toBe(false); // required + empty
        expect(validateBbjExpression('', {}).ok).toBe(true);                   // optional + empty
    });

    test('quoteAsStringLiteral wraps text and doubles embedded quotes', () => {
        expect(quoteAsStringLiteral('Caption')).toBe('"Caption"');
        expect(quoteAsStringLiteral('Are you sure?')).toBe('"Are you sure?"');
        expect(quoteAsStringLiteral('say "hi"')).toBe('"say ""hi"""');
    });

    test('resolvesToString accepts literals / $ / ! vars, function calls, and string concatenations', () => {
        expect(resolvesToString('"Caption"')).toBe(true);
        expect(resolvesToString('caption$')).toBe(true);          // string variable
        expect(resolvesToString('caption!')).toBe(true);          // object variable
        expect(resolvesToString('arr$[1]')).toBe(true);           // string array element
        expect(resolvesToString('obj!.getText()')).toBe(true);    // method call
        expect(resolvesToString('STR(n)')).toBe(true);            // string function
        expect(resolvesToString('a$ + "!"')).toBe(true);          // concatenation
        expect(resolvesToString('"n=" + STR(n)')).toBe(true);
        expect(resolvesToString('("wrapped" + a$)')).toBe(true);  // parenthesised
    });

    test('resolvesToString rejects bare numeric refs, numbers, %-vars, and arithmetic', () => {
        expect(resolvesToString('Caption')).toBe(false);          // the reported bug: numeric variable
        expect(resolvesToString('Are you sure?')).toBe(false);    // unquoted prose
        expect(resolvesToString('42')).toBe(false);
        expect(resolvesToString('count%')).toBe(false);           // integer variable
        expect(resolvesToString('"x" + count')).toBe(false);      // numeric operand in concat
        expect(resolvesToString('a$ - b$')).toBe(false);          // arithmetic operator ⇒ numeric
        expect(resolvesToString('')).toBe(false);
    });

    test('validateStringField requires a String and suggests how to fix a bare value', () => {
        expect(validateStringField('"Caption"', { required: true }).ok).toBe(true);
        expect(validateStringField('caption$').ok).toBe(true);
        expect(validateStringField('', { required: false }).ok).toBe(true);   // optional + empty
        expect(validateStringField('', { required: true }).ok).toBe(false);   // required + empty

        const bareId = validateStringField('Caption', { required: true });
        expect(bareId.ok).toBe(false);
        expect(bareId.message).toContain('"Caption"');       // suggests quoting
        expect(bareId.message).toContain('Caption$');        // and the $/! variable form

        const prose = validateStringField('Are you sure?', { required: true });
        expect(prose.ok).toBe(false);
        expect(prose.message).toContain('"Are you sure?"');  // quote suggestion
        expect(prose.message).not.toContain('$');            // no nonsensical `prose$` hint

        // structural errors still win over the typing check
        expect(validateStringField('"TEST').ok).toBe(false); // unterminated literal
    });

    test('msgboxPreview aggregates encode + compose + validate + render for a UI', () => {
        const p = msgboxPreview({
            message: '"Are you sure?"', title: '"Confirm"', assignTo: 'ret!',
            buttonSet: 4, icon: 32, defaultButton: 256, flags: [65536], customButtons: [],
        });
        expect(p.expr).toBe(4 + 32 + 256 + 65536);
        expect(p.statement).toBe('ret! = MSGBOX("Are you sure?", 65828, "Confirm")');
        expect(p.summary).toContain('Yes, No');
        expect(p.valid).toBe(true);
        expect(p.render).toEqual({ title: 'Confirm', message: 'Are you sure?', icon: 32, buttons: ['Yes', 'No'], defaultIndex: 1 });
    });

    test('msgboxPreview surfaces a bare-string error and drops the assignment in edit mode', () => {
        const bad = msgboxPreview({ message: 'Caption', title: '', buttonSet: 0, icon: 0, defaultButton: 0, flags: [], customButtons: [] });
        expect(bad.valid).toBe(false);
        expect(bad.messageError).toContain('"Caption"');

        const edit = msgboxPreview({ message: '"Hi"', title: '', assignTo: 'ret!', editMode: true, buttonSet: 0, icon: 0, defaultButton: 0, flags: [], customButtons: [] });
        expect(edit.statement).toBe('MSGBOX("Hi")'); // no `ret! =` prefix in edit mode
    });

    test('expressionDisplayText unquotes string literals, passes expressions through', () => {
        expect(expressionDisplayText('"Hello World!"')).toBe('Hello World!');
        expect(expressionDisplayText('"say ""hi"""')).toBe('say "hi"');
        expect(expressionDisplayText('msg$')).toBe('msg$');
        expect(expressionDisplayText('a$ + "!"')).toBe('a$ + "!"'); // not a single literal -> as-is
    });

    test('buttonLabels returns standard labels or custom expressions', () => {
        expect(buttonLabels(4)).toEqual(['Yes', 'No']);
        expect(buttonLabels(0)).toEqual(['OK']);
        expect(buttonLabels(7, ['"Left"', '"Right"'])).toEqual(['Left', 'Right']);
        expect(buttonLabels(7, [])).toEqual(['Button 1']); // fallback when custom set has no labels
    });

    test('splitButtonsAndTrailing separates custom buttons from MODE/TIM/ERR', () => {
        expect(splitButtonsAndTrailing(['"Left"', '"Right"'], true)).toEqual({ buttons: ['"Left"', '"Right"'], trailing: [] });
        expect(splitButtonsAndTrailing(['"Left"', 'MODE="x"'], true)).toEqual({ buttons: ['"Left"'], trailing: ['MODE="x"'] });
        expect(splitButtonsAndTrailing(['MODE="x"'], false)).toEqual({ buttons: [], trailing: ['MODE="x"'] });
    });

    test('parseMsgboxCallOnLine finds a numeric expr and its range', () => {
        const line = '    ret! = MSGBOX("Are you sure?", 36, "Confirm")';
        const info = parseMsgboxCallOnLine(line)!;
        expect(info).toBeDefined();
        expect(info.exprValue).toBe(36);
        expect(line.slice(info.exprRange![0], info.exprRange![1])).toBe('36');
    });

    test('parse handles commas inside strings and nested calls', () => {
        const line = 'x = MSGBOX("a, b, c", 52, foo(1, 2))';
        const info = parseMsgboxCallOnLine(line)!;
        expect(info.args[0]).toBe('"a, b, c"');
        expect(info.exprValue).toBe(52);
        expect(info.args[2]).toBe('foo(1, 2)');
    });

    test('parse handles "" escapes inside the message string', () => {
        const line = 'MSGBOX("say ""hi""", 16)';
        const info = parseMsgboxCallOnLine(line)!;
        expect(info.exprValue).toBe(16);
        expect(info.args[0]).toBe('"say ""hi"""');
    });

    test('parse reports an option-insert offset for a bare MSGBOX (no options yet)', () => {
        const line = 'a! = msgbox("Hello World!")';
        const info = parseMsgboxCallOnLine(line)!;
        expect(info.exprValue).toBeUndefined();
        expect(info.optionInsertOffset).toBeDefined();
        const off = info.optionInsertOffset!;
        expect(line.slice(0, off) + ', 36' + line.slice(off)).toBe('a! = msgbox("Hello World!", 36)');
    });

    test('no insert offset when options already present or arg#2 is non-numeric', () => {
        expect(parseMsgboxCallOnLine('MSGBOX("m", 36)')!.optionInsertOffset).toBeUndefined();
        const nonNumeric = parseMsgboxCallOnLine('MSGBOX("m", foo)')!;
        expect(nonNumeric.optionInsertOffset).toBeUndefined();
        expect(nonNumeric.exprValue).toBeUndefined();
        expect(parseMsgboxCallOnLine('MSGBOX()')!.optionInsertOffset).toBeUndefined();
    });

    test('parse yields no exprRange for a non-literal expr', () => {
        const info = parseMsgboxCallOnLine('MSGBOX("hi", 32+4)')!;
        expect(info).toBeDefined();
        expect(info.exprValue).toBeUndefined();
        expect(info.exprRange).toBeUndefined();
    });

    test('non-MSGBOX line returns undefined', () => {
        expect(parseMsgboxCallOnLine('x = foo(1, 2)')).toBeUndefined();
    });

    test('findMsgboxCallAt targets the call the cursor is inside (two calls on one line)', () => {
        const line = 'if c then a! = MSGBOX("A", 16) else b! = MSGBOX("B")';
        // cursor inside the first call -> reconfigure (expr 16)
        const first = findMsgboxCallAt(line, line.indexOf('"A"'))!;
        expect(first.exprValue).toBe(16);
        // cursor inside the second call -> add options (bare call)
        const second = findMsgboxCallAt(line, line.indexOf('"B"'))!;
        expect(second.exprValue).toBeUndefined();
        expect(second.optionInsertOffset).toBeDefined();
        // the two lookups resolve to different calls
        expect(first.callStart).not.toBe(second.callStart);
        // cursor between the calls (on ` else `) -> no call
        expect(findMsgboxCallAt(line, line.indexOf(' else ') + 3)).toBeUndefined();
        // cursor before the first call (on the IF) -> no call
        expect(findMsgboxCallAt(line, 0)).toBeUndefined();
    });
});
