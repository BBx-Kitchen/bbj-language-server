import { describe, expect, test } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Source guards for the Enterprise Manager launcher `tools/web.bbj` (issues #546 and
 * #548). BBj cannot run in-process, so these assert the script text; the live
 * behaviour (a real login and a real EM step failure, in both IDEs) is covered by the
 * hand check recorded in the phase UAT.
 */

const TOOLS_DIR = path.resolve(__dirname, '..', 'tools');
const WEB_SCRIPT = path.join(TOOLS_DIR, 'web.bbj');

/** Strip `rem` comment lines (case-insensitive, leading whitespace tolerated). */
function stripRemLines(source: string): string {
    return source
        .split(/\r?\n/)
        .filter((line) => !/^\s*rem\b/i.test(line))
        .join('\n');
}

function readFileOrThrow(filePath: string): string {
    if (!fs.existsSync(filePath)) {
        throw new Error(`Guarded source file not found at ${filePath}`);
    }
    return fs.readFileSync(filePath, 'utf-8');
}

function readStrippedScript(filePath: string): string {
    return stripRemLines(readFileOrThrow(filePath));
}

/**
 * Lines belonging to a label's block: everything after a `^label:$` definition
 * (case-insensitive) up to, but not including, the next label definition line.
 */
function labelBlockLines(source: string, label: string): string[] {
    const lines = source.split(/\r?\n/);
    const labelPattern = new RegExp(`^\\s*${label}:\\s*$`, 'i');
    const anyLabelPattern = /^\s*[A-Za-z_][A-Za-z0-9_]*:\s*$/;
    const startIndex = lines.findIndex((line) => labelPattern.test(line));
    if (startIndex === -1) {
        throw new Error(`Label not found in web.bbj: ${label}`);
    }
    const block: string[] = [];
    for (let i = startIndex + 1; i < lines.length; i++) {
        if (anyLabelPattern.test(lines[i])) {
            break;
        }
        block.push(lines[i]);
    }
    return block;
}

/**
 * True when some line assigns a string literal to `varName!` either as the whole
 * statement (line starts with the assignment) or as the consequent of a one-line
 * `IF ... THEN <assignment>` — the two positions a default-credential fill-in could
 * hide in. A `varName! = "literal"` appearing only inside an IF's *condition* (before
 * THEN) is a comparison, not an assignment, and does not count.
 */
function assignsLiteralToVariable(source: string, varName: string): boolean {
    const escaped = varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const startAssign = new RegExp(`^${escaped}\\s*=\\s*"[^"]*"`, 'i');
    const thenAssign = new RegExp(`^\\s*${escaped}\\s*=\\s*"[^"]*"`, 'i');
    for (const line of source.split(/\r?\n/)) {
        if (startAssign.test(line.trim())) {
            return true;
        }
        const thenParts = line.split(/\bthen\b/i);
        if (thenParts.length > 1 && thenAssign.test(thenParts.slice(1).join('then'))) {
            return true;
        }
    }
    return false;
}

const stripped = readStrippedScript(WEB_SCRIPT);
const lines = stripped.split(/\r?\n/);

describe('web-bbj-source-guard — credentials', () => {
    test('admin123 appears on exactly one line, gated on username! = "admin" (case-sensitive) and password! = "", assigned only in the THEN', () => {
        const admin123Lines = lines.filter((line) => line.includes('admin123'));
        expect(admin123Lines).toHaveLength(1);

        const [condition, ...rest] = admin123Lines[0].split(/\bthen\b/i);
        const thenPart = rest.join('then');
        expect(condition).toMatch(/username!\s*=\s*"admin"/);
        expect(condition).not.toMatch(/username!\s*=\s*"Admin"/);
        expect(condition).not.toMatch(/username!\s*=\s*"ADMIN"/);
        expect(condition).toMatch(/password!\s*=\s*""/);
        expect(thenPart).toMatch(/password!\s*=\s*"admin123"/);
    });

    test('no line assigns a string literal to username! anywhere (statement start or after THEN)', () => {
        expect(assignsLiteralToVariable(stripped, 'username!')).toBe(false);
    });

    test('an empty or missing username (no token) jumps straight to login_failed, after the token-branch getBBjAdmin call and before the username/password getBBjAdmin call', () => {
        const getBBjAdminIndices = lines.reduce<number[]>((acc, line, i) => {
            if (/getBBjAdmin\(/i.test(line)) {
                acc.push(i);
            }
            return acc;
        }, []);
        expect(getBBjAdminIndices).toHaveLength(2);

        const emptyUsernameCheckIndex = lines.findIndex(
            (line) => /username!\s*=\s*null\(\)\s*or\s*username!\s*=\s*""/i.test(line) && /goto\s+login_failed/i.test(line)
        );
        expect(emptyUsernameCheckIndex).toBeGreaterThan(-1);
        expect(emptyUsernameCheckIndex).toBeGreaterThan(getBBjAdminIndices[0]);
        expect(emptyUsernameCheckIndex).toBeLessThan(getBBjAdminIndices[1]);
    });

    test('both getBBjAdmin calls carry err=login_rejected', () => {
        const guardedCalls = lines.filter((line) => /getBBjAdmin\(/i.test(line) && /err\s*=\s*login_rejected/i.test(line));
        expect(guardedCalls).toHaveLength(2);
    });

    test('fails with an explicit message naming the path when web.bbj is absent', () => {
        const missing = path.join(TOOLS_DIR, 'does-not-exist-web.bbj');
        expect(() => readStrippedScript(missing)).toThrow(new RegExp(`Guarded source file not found at .*does-not-exist-web\\.bbj`));
    });
});

describe('web-bbj-source-guard — failure reporting', () => {
    test('login_rejected sets failedStep$ to "Login Failed!" and jumps to report_failure, with no MSGBOX or release of its own', () => {
        const block = labelBlockLines(stripped, 'login_rejected').join('\n');
        expect(block).toMatch(/failedStep\$\s*=\s*"Login Failed!"/);
        expect(block).toMatch(/goto\s+report_failure/i);
        expect(block).not.toMatch(/MSGBOX\(/i);
        expect(block).not.toMatch(/\brelease\b/i);
    });

    test('report_failure shows one MSGBOX built from failedStep$, ERRMES(-1) and str(err), titled with programme!, and ends with release 1', () => {
        const block = labelBlockLines(stripped, 'report_failure').join('\n');
        const msgboxLines = block.split('\n').filter((line) => /MSGBOX\(/i.test(line));
        expect(msgboxLines).toHaveLength(1);
        expect(msgboxLines[0]).toMatch(/failedStep\$/);
        expect(msgboxLines[0]).toMatch(/ERRMES\(-1\)/i);
        expect(msgboxLines[0]).toMatch(/str\(err\)/i);
        expect(msgboxLines[0]).toMatch(/"Launching "\s*\+\s*str\(programme!\)/);
        expect(block).toMatch(/^\s*release 1\s*$/im);
    });

    test('login_failed shows MSGBOX("Login Failed!", 0, "Launching " + str(programme!)) and ends with release 1, never calling ERRMES', () => {
        const block = labelBlockLines(stripped, 'login_failed').join('\n');
        expect(block).toMatch(/MSGBOX\("Login Failed!"\s*,\s*0\s*,\s*"Launching "\s*\+\s*str\(programme!\)\)/);
        expect(block).toMatch(/^\s*release 1\s*$/im);
        expect(block).not.toMatch(/ERRMES\(/i);
    });

    test('the file contains exactly two MSGBOX calls, and neither contains username!, password! or token!', () => {
        const msgboxLines = lines.filter((line) => /MSGBOX\(/i.test(line));
        expect(msgboxLines).toHaveLength(2);
        for (const line of msgboxLines) {
            expect(line).not.toMatch(/username!/i);
            expect(line).not.toMatch(/password!/i);
            expect(line).not.toMatch(/token!/i);
        }
    });

    test('no failure block ends with a bare release: exactly one bare release exists (the success path)', () => {
        const bareReleaseLines = lines.filter((line) => /^\s*release\s*$/i.test(line));
        expect(bareReleaseLines).toHaveLength(1);
    });

    test('exactly two release 1 statements exist, one per failure reporter', () => {
        const releaseOneLines = lines.filter((line) => /^\s*release 1\s*$/i.test(line));
        expect(releaseOneLines).toHaveLength(2);
    });
});
