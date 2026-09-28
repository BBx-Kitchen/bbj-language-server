import { describe, expect, test } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Guards against a lint suppression comment that carries no explanation.
 *
 * A suppression comment scoped to a single line (the "next line" or "same line"
 * form) is only allowed when it names at least one rule and gives a reason after
 * a ' -- ' separator, e.g. `// <suppress>-next-line some-rule -- fakes use any`.
 * A file-wide or range-form suppression comment (no next-line/same-line suffix
 * at all) is never allowed, no matter what follows it.
 *
 * The directive keyword itself is assembled from two joined string pieces at
 * runtime everywhere in this file, including inside the synthetic fixtures fed
 * to the self-test cases below, so this file's own source text never contains
 * the keyword and can never flag itself when the repository scan below reads
 * it back off disk.
 */

const DIRECTIVE_HEAD = 'eslint';
const DIRECTIVE_TAIL = 'disable';
const DIRECTIVE = `${DIRECTIVE_HEAD}-${DIRECTIVE_TAIL}`;
const NEXT_LINE_SUFFIX = '-next-line';
const SAME_LINE_SUFFIX = '-line';
const REASON_SEPARATOR = ' -- ';

interface DirectiveViolation {
    line: number;
    excerpt: string;
}

/**
 * Pure scanner: given file text, returns every line that carries a directive
 * violation (a file-wide/range suppression, or a next-line/same-line suppression
 * missing a rule name or a reason).
 */
function findDirectiveViolations(text: string): DirectiveViolation[] {
    const violations: DirectiveViolation[] = [];
    const lines = text.split(/\r?\n/);
    lines.forEach((line, index) => {
        const at = line.indexOf(DIRECTIVE);
        if (at === -1) {
            return;
        }
        const lineNumber = index + 1;
        const rest = line.slice(at + DIRECTIVE.length);

        let scoped: string | null = null;
        if (rest.startsWith(NEXT_LINE_SUFFIX)) {
            scoped = rest.slice(NEXT_LINE_SUFFIX.length);
        } else if (rest.startsWith(SAME_LINE_SUFFIX)) {
            scoped = rest.slice(SAME_LINE_SUFFIX.length);
        }

        if (scoped === null) {
            // Bare or range-form directive: no scoping suffix at all, so it can
            // silence more than one line (or the whole file). Never allowed.
            violations.push({ line: lineNumber, excerpt: line.trim() });
            return;
        }

        const separatorIndex = scoped.indexOf(REASON_SEPARATOR);
        if (separatorIndex === -1) {
            // Scoped to one line, but no ' -- reason' at all.
            violations.push({ line: lineNumber, excerpt: line.trim() });
            return;
        }

        const rulesPart = scoped.slice(0, separatorIndex).trim();
        const reasonPart = scoped
            .slice(separatorIndex + REASON_SEPARATOR.length)
            .replace(/\*\/\s*$/, '')
            .trim();

        if (rulesPart.length === 0 || reasonPart.length === 0) {
            // Either no rule was named before the separator, or nothing follows it.
            violations.push({ line: lineNumber, excerpt: line.trim() });
        }
    });
    return violations;
}

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, '..');
const SCAN_ROOTS = ['src', 'test', 'tools/interop-test-harness'];
const ALLOWED_EXTENSIONS = new Set(['.ts', '.cjs', '.mjs', '.js']);

// The Langium-generated AST module is rewritten by every `langium:generate` run
// and already excluded from lint; it holds the one existing directive in this
// repository today. test/.tmp and test/test-data hold scratch/fixture content,
// not reviewed source.
const SKIP_PATH_PREFIXES = ['src/language/generated', 'test/.tmp', 'test/test-data'];

function isSkipped(relativePosixPath: string): boolean {
    return SKIP_PATH_PREFIXES.some(
        (prefix) => relativePosixPath === prefix || relativePosixPath.startsWith(`${prefix}/`)
    );
}

function listGuardedFiles(): string[] {
    const files: string[] = [];
    for (const root of SCAN_ROOTS) {
        const rootDir = path.join(REPO_ROOT, root);
        const entries = fs.readdirSync(rootDir, { recursive: true, withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isFile()) {
                continue;
            }
            if (!ALLOWED_EXTENSIONS.has(path.extname(entry.name))) {
                continue;
            }
            const absolute = path.join(entry.parentPath, entry.name);
            const relativePosixPath = path.relative(REPO_ROOT, absolute).split(path.sep).join('/');
            if (isSkipped(relativePosixPath)) {
                continue;
            }
            files.push(absolute);
        }
    }
    return files.sort();
}

describe('lint suppression comments always carry a reason', () => {
    test('every tracked src and test source file is free of an unreasoned suppression comment', () => {
        const offenders: string[] = [];
        for (const file of listGuardedFiles()) {
            const text = fs.readFileSync(file, 'utf-8');
            const violations = findDirectiveViolations(text);
            for (const violation of violations) {
                const relative = path.relative(REPO_ROOT, file);
                offenders.push(`${relative}:${violation.line}: ${violation.excerpt}`);
            }
        }
        expect(offenders).toEqual([]);
    });

    test('a reason-less next-line suppression is flagged', () => {
        const text = [
            `// ${DIRECTIVE}${NEXT_LINE_SUFFIX}`,
            'const unused = 1;'
        ].join('\n');
        expect(findDirectiveViolations(text)).toHaveLength(1);
    });

    test('a next-line suppression naming a rule with a reason is not flagged', () => {
        const text = [
            `// ${DIRECTIVE}${NEXT_LINE_SUFFIX} some-rule -- fakes intentionally return this shape`,
            'const unused = 1;'
        ].join('\n');
        expect(findDirectiveViolations(text)).toHaveLength(0);
    });

    test('a bare file-wide block suppression is flagged regardless of any text after it', () => {
        const text = [
            `/* ${DIRECTIVE} -- this reason does not help, the form has no line scope */`,
            'const unused = 1;'
        ].join('\n');
        expect(findDirectiveViolations(text)).toHaveLength(1);
    });

    test('a suppression with a reason but no rule name is flagged', () => {
        const text = [
            `// ${DIRECTIVE}${NEXT_LINE_SUFFIX} -- reason text with nothing naming a rule before it`,
            'const unused = 1;'
        ].join('\n');
        expect(findDirectiveViolations(text)).toHaveLength(1);
    });
});
