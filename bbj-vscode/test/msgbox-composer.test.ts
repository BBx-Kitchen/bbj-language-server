import { describe, expect, test } from 'vitest';
import {
    encode, decode, describe as describeExpr, composeStatement, parseMsgboxCallOnLine, findMsgboxCallAt, DEFAULT_STATE,
} from '../src/msgbox-composer';

describe('MSGBOX composer logic (#426)', () => {
    test('encode combines button set + icon + default button + flags', () => {
        expect(encode({ ...DEFAULT_STATE, buttonSet: 4, icon: 32 })).toBe(36); // Yes/No + Question
        expect(encode({ ...DEFAULT_STATE, buttonSet: 4, icon: 48 })).toBe(52); // Yes/No + Exclamation
        expect(encode({ ...DEFAULT_STATE, buttonSet: 1, icon: 64, defaultButton: 256 })).toBe(1 + 64 + 256);
        expect(encode({ ...DEFAULT_STATE, buttonSet: 3, icon: 32, noEnter: true })).toBe(3 + 32 + 65536);
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
