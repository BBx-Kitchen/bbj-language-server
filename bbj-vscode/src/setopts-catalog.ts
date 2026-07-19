/**
 * Editor-agnostic catalog + vector logic for the config.bbx SETOPTS composer (#474).
 *
 * A `SETOPTS` line in config.bbx is a bare hex string — `SETOPTS 08004020000000` — encoding up
 * to 16 bytes of independent bit options (see
 * https://documentation.basis.cloud/BASISHelp/WebHelp/commands/setopts_verb.htm and the
 * BBj-specific notes in
 * https://documentation.basis.cloud/BASISHelp/WebHelp/commands/bbj-commands/setopts_verb_bbj.htm).
 * Unlike the SETOPTS verb in BBj code, the config.bbx string is absolute and stateless — no OPTS
 * query, no IOR/AND — so a composer can round-trip it losslessly: parse to bytes, flip individual
 * bits, re-emit. Bytes 5–6 are data (mask replacement characters), bytes 10–16 are reserved /
 * application use and pass through as raw hex.
 *
 * This module owns the byte/bit catalog and the vector <-> hex <-> line conversions with NO
 * `vscode` dependency, so it is unit-testable and reusable by the IntelliJ client and by the
 * BBj-code SETOPTS composer (#475) later.
 */

export interface SetOptsBit {
    /** 1-based option byte this bit lives in (1–4, 7–9). */
    byte: number;
    /** The single bit within the byte, e.g. 0x80. */
    mask: number;
    label: string;
    detail?: string;
    /** 'ignored' = PRO/5-only, has no effect in BBj. 'bbj-specific' = meaningless in PRO/5. */
    bbj?: 'ignored' | 'bbj-specific';
    /** Why the bit is ignored in BBj / what BBj does differently. */
    bbjDetail?: string;
    /** Version gate, e.g. 'BBj 15.00+'. */
    since?: string;
}

/** UI group heading per option byte (bytes 5–6 and 10–16 are handled as data, not flags). */
export const BYTE_GROUPS: Record<number, string> = {
    1: 'Errors, console & listing',
    2: 'Printing & numeric behavior',
    3: 'Program loading & file locking',
    4: 'File access & number formatting',
    7: 'Large files, licensing & GUI',
    8: 'Compatibility',
    9: 'Input & parsing restrictions',
};

/** Byte 5 replaces ',' and byte 6 replaces '.' in masks — only when byte 3 $02$ is set. */
export const MASK_COMMA_BYTE = 5;
export const MASK_DOT_BYTE = 6;
/** The bit that enables the byte 5/6 mask replacement characters. */
export const MASK_REPLACEMENT_BIT = { byte: 3, mask: 0x02 } as const;
/** Bytes 10–16 are reserved / application use — the composer passes them through as raw hex. */
export const FIRST_RAW_BYTE = 10;
export const MAX_BYTES = 16;

/**
 * The documented option bits, in byte/descending-bit order. PRO/5 wording condensed; `bbj`
 * annotates the delta from the BBj-specific SETOPTS page so the UI can de-emphasize no-ops.
 */
export const SETOPTS_BITS: SetOptsBit[] = [
    // Byte 1 — errors, console & listing
    { byte: 1, mask: 0x80, label: 'Error 63 on unassigned variables', detail: 'Issue !ERROR=63 when a variable is referenced before being assigned a value.' },
    { byte: 1, mask: 0x40, label: 'Disable all error traps', detail: 'Turns off all error traps; useful when debugging an application.' },
    { byte: 1, mask: 0x20, label: 'Insert mode for EDIT/INPUTE', detail: 'Places EDIT windows and INPUTE fields in insert mode (toggles with CTL-T).' },
    { byte: 1, mask: 0x10, label: 'No pause in LIST/DUMP', detail: 'Disables the "pause" feature of LIST and DUMP.' },
    { byte: 1, mask: 0x08, label: 'Console mode in public programs', detail: 'Enables console mode and debugging in public programs.' },
    { byte: 1, mask: 0x04, label: 'Old SAVEP algorithm', detail: 'Use the pre-2.20 PRO/5 SAVEP algorithm.', bbj: 'ignored' },
    { byte: 1, mask: 0x02, label: 'List variables in lowercase', detail: 'Show variable names in lowercase in LIST/LST() output.', bbj: 'ignored' },
    { byte: 1, mask: 0x01, label: 'List keywords in lowercase', detail: 'Show commands and keywords in lowercase in LIST/LST() output.', bbj: 'ignored' },
    // Byte 2 — printing & numeric behavior
    { byte: 2, mask: 0x80, label: 'Nondestructive @(x) cursor advance', detail: 'Nondestructive cursor advance for the @(X) column positioning mnemonic.' },
    { byte: 2, mask: 0x40, label: 'Linefeed on PRINT without IOLIST', bbj: 'ignored', bbjDetail: 'BBj always outputs a linefeed on a PRINT statement that has no IOLIST.' },
    { byte: 2, mask: 0x20, label: 'Round intermediate math results', detail: 'Numerically round intermediate results after multiplication, division and exponentiation (may reduce performance).' },
    { byte: 2, mask: 0x10, label: 'NUM() strips embedded spaces', detail: 'Strip embedded spaces from the string argument to NUM().' },
    { byte: 2, mask: 0x08, label: 'Ignore mask overflow', detail: 'Ignore mask overflows in PRINT, WRITE and STR() instead of issuing !ERROR=43.' },
    { byte: 2, mask: 0x04, label: 'Reject keyless WRITEs', detail: 'Reject WRITEs to a DIRECT/MKEYED file or unextracted record when no key is specified.' },
    { byte: 2, mask: 0x02, label: 'Disable math coprocessor', detail: 'Skip the math coprocessor for SIN(), COS(), ATN(), SQR(), LOG() and exponentiation.', bbj: 'ignored' },
    { byte: 2, mask: 0x01, label: 'Update MS-DOS file length per write', detail: 'Force MS-DOS to update dynamic file length after each addition (reduces write performance).', bbj: 'ignored' },
    // Byte 3 — program loading & file locking
    { byte: 3, mask: 0x80, label: 'RUN/LOAD from public program space', bbj: 'ignored', bbjDetail: 'BBj automatically loads and runs programs from the program cache.' },
    { byte: 3, mask: 0x40, label: 'Advisory locking in data files', detail: 'EXTRACT blocks EXTRACT/REMOVE while READ can still access extracted data.' },
    { byte: 3, mask: 0x20, label: 'Multiple readers on key region', detail: 'Allow multiple read processes on the key region of a keyed file while blocking writers.', bbj: 'ignored' },
    { byte: 3, mask: 0x10, label: 'WRITE through EXTRACT', detail: 'Allow WRITE on extracted records; requires advisory locking (byte 3 $40$).' },
    { byte: 3, mask: 0x08, label: 'Skip program hash check on load', detail: 'Disable the corruption hash check of a program upon loading.' },
    { byte: 3, mask: 0x04, label: 'Block files with nonzero access count', detail: 'Refuse to access files whose header access count is nonzero (post-crash utility use).', bbj: 'ignored' },
    { byte: 3, mask: 0x02, label: 'Enable mask replacement characters', detail: 'Replace the "," and "." mask characters with the characters in bytes 5 and 6 (also affects CVS()).' },
    { byte: 3, mask: 0x01, label: 'Novell network flag', detail: 'Set by PRO/5 itself when running under MS-DOS on a Novell network.', bbj: 'ignored' },
    // Byte 4 — file access & number formatting
    { byte: 4, mask: 0x80, label: 'Limit OPEN file search', detail: 'Scan the PREFIX list only once and search the current disk only.' },
    { byte: 4, mask: 0x40, label: 'Network lock bit', detail: 'Slower locking scheme so non-PRO/5 processes can access files across the network.' },
    { byte: 4, mask: 0x20, label: 'Enable Data Server access', detail: 'Allow access to the PRO/5 Data Server software.' },
    { byte: 4, mask: 0x10, label: 'Recognize C-ISAM files', bbj: 'ignored', bbjDetail: 'BBj does not support C-ISAM files.' },
    { byte: 4, mask: 0x08, label: '14-digit business math', detail: 'Force templates and keys to 14-digit precision for earlier-version compatibility.', bbj: 'ignored', bbjDetail: 'Business math fields always use 16-digit precision in BBj.' },
    { byte: 4, mask: 0x04, label: 'STR() fills trailing # with zeros', detail: 'Fill trailing "#" mask positions with zeros instead of spaces in STR().' },
    { byte: 4, mask: 0x02, label: 'Adjust leading spaces in EP mode', detail: 'Adjust the number of leading spaces for lines printed in expanded ("EP") mode.' },
    { byte: 4, mask: 0x01, label: 'Leading zero in E notation', detail: 'Express E-notation numbers with a leading zero, e.g. "0.1E+01" instead of ".1E+01".' },
    // Byte 7 — large files, licensing & GUI
    { byte: 7, mask: 0x80, label: 'Check filesystem for large files', detail: 'Check whether the filesystem supports 4GB (PRO/5 2.x) or 64-bit (3.x+) files.' },
    { byte: 7, mask: 0x20, label: 'Recoverable MKEYED files', detail: 'Format MKEYED files for corruption recovery.', bbjDetail: 'BBj also formats XKEYED files for corruption recovery.' },
    { byte: 7, mask: 0x10, label: 'Exit instead of license nag mode', detail: 'Disable "nag" messages and exit when a license cannot be obtained.' },
    { byte: 7, mask: 0x08, label: 'Visual PRO/5 2.0x grid controls', detail: 'Run 2.0x-style Grid controls under 2.10+; affects RESOURCE, GRID, FONT and control sizing.' },
    { byte: 7, mask: 0x04, label: 'SYSGUI defaults to system font', detail: 'Use the system font as SYSGUI default (cannot be changed with a SYSGUI device open).' },
    { byte: 7, mask: 0x02, label: 'Keep SYSGUI channels across BEGIN', detail: 'Do not close SYSGUI channels during a BEGIN statement.' },
    { byte: 7, mask: 0x01, label: 'Allow same file via different paths', detail: 'No !ERROR=0 on duplicate opens through different paths; enables "./" prefix support.' },
    // Byte 8 — compatibility
    { byte: 8, mask: 0x80, label: 'FID() reports MKEYED as type $06$', detail: 'Recoverable/64-bit MKEYED files report as standard MKEYED (PRO/5 2.23+).' },
    { byte: 8, mask: 0x40, label: 'MKEYED verb creates XKEYED files', bbj: 'bbj-specific' },
    { byte: 8, mask: 0x20, label: 'FID() returns name as OPENed', detail: 'PRO/5 FID() backward compatibility: return the filename as specified in OPEN.', bbj: 'bbj-specific' },
    { byte: 8, mask: 0x10, label: 'Grid backward compatibility', detail: 'Grids run with Visual PRO/5 behavior.', bbj: 'bbj-specific' },
    { byte: 8, mask: 0x08, label: 'Client-side ENV()/INFO()/SCALL()', detail: 'ENV(), INFO(4,*) and SCALL() reference the client; TIM, JUL() and DATE() use client-side values in BBj 12.00+.', bbj: 'bbj-specific', since: 'BBj 4.00+' },
    { byte: 8, mask: 0x04, label: 'Allow duplicate template field names', bbj: 'bbj-specific', since: 'BBj 4.01+' },
    { byte: 8, mask: 0x02, label: 'CTL unaffected by data-file reads', detail: 'CTL is only affected by reads from interactive devices, not data files.' },
    // Byte 9 — input & parsing restrictions
    { byte: 9, mask: 0x80, label: 'Reject unsigned exponents', detail: 'NUM(), INPUT and READ reject scientific notation whose exponent has no explicit sign.', since: 'PRO/5 6.30+, BBj 7.0+' },
    { byte: 9, mask: 0x40, label: 'Zero-pad N template fields', detail: 'Assignments to fixed-length type N template fields are padded with leading zeroes.', since: 'PRO/5 14.0+, BBj 15.0+' },
    { byte: 9, mask: 0x20, label: 'READ RECORD on STRING files without SIZ=', detail: 'Also treats $0D0A$ as a single separator.', bbj: 'bbj-specific', since: 'BBj 15.00+' },
    { byte: 9, mask: 0x10, label: 'Restrict console-mode OPEN of pipes', detail: 'The OPEN verb refuses commands starting with "<", ">" or "|" in console mode.', since: 'PRO/5 15.01+, BBj 15.10+' },
];

// ---------------------------------------------------------------------------------------------
// The options vector
// ---------------------------------------------------------------------------------------------

export interface SetOptsVector {
    /** Byte values (0–255); index 0 is option byte 1. */
    bytes: number[];
    /**
     * Number of hex digits in the source string, so encoding reproduces the exact original length
     * (config.bbx strings vary — the stock config ships 14 digits, docs examples use 4).
     * An odd count means the last byte is a high-nibble-only partial.
     */
    digitCount: number;
}

/** Parse a bare hex digit string (as found after the SETOPTS keyword). Undefined when invalid. */
export function parseVector(hexDigits: string): SetOptsVector | undefined {
    if (!/^[0-9A-Fa-f]+$/.test(hexDigits) || hexDigits.length > MAX_BYTES * 2) return undefined;
    const padded = hexDigits.length % 2 === 0 ? hexDigits : hexDigits + '0';
    const bytes: number[] = [];
    for (let i = 0; i < padded.length; i += 2) {
        bytes.push(parseInt(padded.slice(i, i + 2), 16));
    }
    return { bytes, digitCount: hexDigits.length };
}

/** Re-emit the vector as an uppercase hex string of exactly `digitCount` digits. */
export function encodeVector(v: SetOptsVector): string {
    return v.bytes.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join('').slice(0, v.digitCount);
}

export function cloneVector(v: SetOptsVector): SetOptsVector {
    return { bytes: [...v.bytes], digitCount: v.digitCount };
}

/** A fresh all-defaults vector for composing a new SETOPTS line (grows on demand). */
export function emptyVector(): SetOptsVector {
    return { bytes: [0, 0, 0, 0], digitCount: 8 };
}

/** Grow the vector (zero-filled) until `byteNo` exists. Never shrinks. */
export function growTo(v: SetOptsVector, byteNo: number): void {
    while (v.bytes.length < byteNo) v.bytes.push(0);
    v.digitCount = Math.max(v.digitCount, byteNo * 2);
}

export function getBit(v: SetOptsVector, byteNo: number, mask: number): boolean {
    return byteNo <= v.bytes.length && (v.bytes[byteNo - 1] & mask) !== 0;
}

/** Set/clear one bit. Setting grows the vector as needed; clearing a byte that isn't there is a no-op. */
export function setBit(v: SetOptsVector, byteNo: number, mask: number, on: boolean): void {
    if (on) {
        growTo(v, byteNo);
        v.bytes[byteNo - 1] |= mask;
    } else if (byteNo <= v.bytes.length) {
        v.bytes[byteNo - 1] &= ~mask;
    }
}

/** OR of the catalog bits modeled for `byteNo` — everything else is preserved verbatim. */
export function knownByteMask(byteNo: number): number {
    return SETOPTS_BITS.filter(b => b.byte === byteNo).reduce((m, b) => m | b.mask, 0);
}

/** Bits set in option byte `byteNo` that no catalog entry models. */
export function unknownBitsInByte(v: SetOptsVector, byteNo: number): number {
    if (byteNo > v.bytes.length) return 0;
    return v.bytes[byteNo - 1] & ~knownByteMask(byteNo);
}

export function maskReplacementEnabled(v: SetOptsVector): boolean {
    return getBit(v, MASK_REPLACEMENT_BIT.byte, MASK_REPLACEMENT_BIT.mask);
}

/** The mask replacement character stored in byte 5 or 6, as a printable char ('' when 0/unprintable). */
export function maskChar(v: SetOptsVector, byteNo: number): string {
    const code = byteNo <= v.bytes.length ? v.bytes[byteNo - 1] : 0;
    return code >= 0x20 && code <= 0x7e ? String.fromCharCode(code) : '';
}

/** Store a mask replacement character ('' clears the byte back to 0 = no replacement). */
export function setMaskChar(v: SetOptsVector, byteNo: number, ch: string): void {
    const code = ch ? ch.charCodeAt(0) & 0xff : 0;
    if (code === 0 && byteNo > v.bytes.length) return; // nothing to clear, don't grow
    growTo(v, byteNo);
    v.bytes[byteNo - 1] = code;
}

/** The raw hex digits for bytes 10–16 (empty when the vector ends before byte 10). */
export function rawTail(v: SetOptsVector): string {
    return encodeVector(v).slice((FIRST_RAW_BYTE - 1) * 2);
}

/** Replace bytes 10–16 from raw hex digits; '' truncates the vector back to bytes 1–9. */
export function setRawTail(v: SetOptsVector, hexDigits: string): void {
    const headLen = (FIRST_RAW_BYTE - 1) * 2;
    const head = encodeVector(v).slice(0, headLen);
    const digits = hexDigits === '' ? head : head.padEnd(headLen, '0') + hexDigits;
    const parsed = parseVector(digits);
    if (!parsed) return;
    v.bytes = parsed.bytes;
    v.digitCount = parsed.digitCount;
}

/** Human-readable summary of everything the vector sets (or '(default settings)'). */
export function describeVector(v: SetOptsVector): string {
    const parts: string[] = [];
    for (const byteNo of Object.keys(BYTE_GROUPS).map(Number)) {
        const labels = SETOPTS_BITS.filter(b => b.byte === byteNo && getBit(v, byteNo, b.mask)).map(b => b.label);
        const unknown = unknownBitsInByte(v, byteNo);
        if (unknown !== 0) labels.push(`unknown bit(s) $${unknown.toString(16).toUpperCase().padStart(2, '0')}$`);
        if (labels.length) parts.push(`Byte ${byteNo}: ${labels.join(' · ')}`);
    }
    if (maskReplacementEnabled(v)) {
        const comma = maskChar(v, MASK_COMMA_BYTE), dot = maskChar(v, MASK_DOT_BYTE);
        parts.push(`Mask chars: "," → "${comma || '(none)'}", "." → "${dot || '(none)'}"`);
    }
    const tail = rawTail(v);
    if (/[^0]/.test(tail)) parts.push(`Bytes ${FIRST_RAW_BYTE}+: ${tail}`);
    return parts.length ? parts.join('; ') : '(default settings)';
}

// ---------------------------------------------------------------------------------------------
// config.bbx line parsing / composition
// ---------------------------------------------------------------------------------------------

export interface SetOptsLineInfo {
    /** [start, end) of the hex token within the line, when the line carries one. */
    hexRange?: [number, number];
    hexDigits?: string;
    /** The parsed vector, when the hex token is valid. */
    vector?: SetOptsVector;
    /** Where to insert ` <hex>` when the line is a bare `SETOPTS` with no digits yet. */
    insertOffset?: number;
}

/**
 * Recognize a config.bbx `SETOPTS hexstring` line (keyword case-insensitive, the docs' stated
 * syntax). Lines with trailing junk or a malformed token return undefined — the composer must
 * not touch what it cannot round-trip.
 */
export function parseSetOptsLine(line: string): SetOptsLineInfo | undefined {
    const kw = /^\s*SETOPTS(?=\s|$)/i.exec(line);
    if (!kw) return undefined;
    const rest = line.slice(kw[0].length);
    if (/^\s*$/.test(rest)) {
        return { insertOffset: kw[0].length };
    }
    const tok = /^[ \t]+([^ \t]+)[ \t]*$/.exec(rest);
    if (!tok) return undefined;
    const start = kw[0].length + tok[0].indexOf(tok[1]);
    const vector = parseVector(tok[1]);
    if (!vector) return undefined;
    return { hexRange: [start, start + tok[1].length], hexDigits: tok[1], vector };
}

/** Compose a full config.bbx line for the vector. */
export function composeSetOptsLine(v: SetOptsVector): string {
    return `SETOPTS ${encodeVector(v)}`;
}

// ---------------------------------------------------------------------------------------------
// Preview — the single entry point every UI uses
// ---------------------------------------------------------------------------------------------

/** Flat UI selection: checked catalog bits + the data-byte fields. */
export interface SetOptsSelection {
    /** Catalog bits currently checked ("byte:mask" would also do, but structured is clearer). */
    bits: Array<{ byte: number; mask: number }>;
    /** Mask replacement chars for bytes 5/6 (only applied while byte 3 $02$ is checked). */
    maskComma: string;
    maskDot: string;
    /** Raw hex digits for bytes 10–16, verbatim. */
    rawTail: string;
}

export interface SetOptsPreview {
    hexDigits: string;
    line: string;
    summary: string;
    /** Whether the byte 5/6 char inputs are meaningful for this selection. */
    maskInputsEnabled: boolean;
    /** Non-catalog bits present per byte, so the UI can flag what it preserves. */
    unknownByBytes: Array<{ byte: number; mask: number }>;
}

/**
 * Apply a UI selection on top of the original vector and compute the resulting line. Starting
 * from the original (not from zero) is what makes the round-trip lossless: unknown bits and
 * the original digit count survive untouched unless the user explicitly changes their byte.
 */
export function setoptsPreview(original: SetOptsVector | undefined, sel: SetOptsSelection): SetOptsPreview {
    const v = original ? cloneVector(original) : emptyVector();
    for (const bit of SETOPTS_BITS) {
        const on = sel.bits.some(b => b.byte === bit.byte && b.mask === bit.mask);
        setBit(v, bit.byte, bit.mask, on);
    }
    const maskEnabled = maskReplacementEnabled(v);
    if (maskEnabled) {
        // Only write a char that differs from what the UI displays: an unprintable byte 5/6 value
        // renders as '' and must survive an untouched '' input (round-trip safety).
        if (sel.maskComma !== maskChar(v, MASK_COMMA_BYTE)) setMaskChar(v, MASK_COMMA_BYTE, sel.maskComma);
        if (sel.maskDot !== maskChar(v, MASK_DOT_BYTE)) setMaskChar(v, MASK_DOT_BYTE, sel.maskDot);
    }
    if (/^[0-9A-Fa-f]*$/.test(sel.rawTail) && sel.rawTail !== rawTail(v)) {
        setRawTail(v, sel.rawTail);
    }
    return {
        hexDigits: encodeVector(v),
        line: composeSetOptsLine(v),
        summary: describeVector(v),
        maskInputsEnabled: maskEnabled,
        unknownByBytes: Object.keys(BYTE_GROUPS).map(Number)
            .map(byte => ({ byte, mask: unknownBitsInByte(v, byte) }))
            .filter(u => u.mask !== 0),
    };
}
