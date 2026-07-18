/******************************************************************************
 * Copyright 2024 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * Detects whether a BBj source text is a classic *line-numbered* program.
 *
 * Legacy BBx/BBj programs prefix every statement line with an incrementing
 * integer line number, e.g.:
 *
 *     0010 LET A=5
 *     0020 PRINT A
 *     0030 END
 *
 * Modern (unnumbered) BBj source never does this. The check is intentionally
 * strict — it only reports `true` when *every* inspected non-blank line carries
 * a line number — so it does not nag users who are editing ordinary source.
 * Numeric labels such as `0010:` are not line numbers (no whitespace separates
 * the digits from the statement) and are therefore not counted.
 *
 * @param text raw file contents
 * @returns true if the text looks like a uniformly line-numbered program
 */
export function isLineNumberedSource(text: string): boolean {
    // A line number is a run of digits followed by horizontal whitespace and
    // then the start of a statement. `0010:` (a numeric label) does not match.
    const numberedLine = /^\s*\d+[ \t]+\S/;
    // Sample enough non-blank lines to be confident without scanning huge files.
    const maxLinesToInspect = 20;
    // Require a few lines so a one-liner starting with a number can't false-trigger.
    const minLinesToDecide = 3;

    let inspected = 0;
    for (const line of text.split(/\r?\n/)) {
        if (line.trim().length === 0) {
            continue;
        }
        // A numbered program is uniform: a single unnumbered statement rejects it.
        if (!numberedLine.test(line)) {
            return false;
        }
        if (++inspected >= maxLinesToInspect) {
            break;
        }
    }
    return inspected >= minLinesToDecide;
}
