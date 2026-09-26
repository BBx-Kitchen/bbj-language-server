/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * The single owner of the bounds applied to Java class data that arrives from the java-interop
 * peer (issue #523). `JavaInteropService.resolveClass()` copies a peer-supplied class description
 * onto the AST unchecked; this module holds every length limit and the guard functions that keep
 * an oversized or wrongly typed field from ever reaching the `JavaClass` node, for both the
 * single-class and the bulk implicit-import resolution paths.
 *
 * It also owns render-time escaping for Java documentation shown as Markdown (issue #524),
 * applied once where hover and completion build Markdown so stored text stays plain; the
 * less-than sign is left out so javadoc HTML stays readable (VS Code strips raw HTML in hovers).
 *
 * It also owns the check that a candidate class name from the peer is a genuine Java qualified
 * name before the missing-USE quick fix or auto-import completion inserts it into source as a
 * `use ${fqn}\n` line (issue #525), so a candidate carrying a line break or other BBj statement
 * text can never be typed into the user's document.
 *
 * Kept free of Langium and editor imports so it is unit-testable with plain values and shared by
 * every caller.
 */

/**
 * The bound applied to every identifier-shaped string copied from the peer: a class, field,
 * method or constructor name, a type or return-type name, and (from a later task) a javadoc
 * parameter real name. Measured against the installed BBj javadoc corpus (41 package files): the
 * longest member name found was 40 characters, the longest class name 38, and the longest javadoc
 * parameter name 30 — this limit is far above any real identifier, so it only ever rejects a
 * broken or hostile peer, never real documentation.
 */
export const MAX_JAVA_IDENTIFIER_LENGTH = 1024;

/**
 * The bound applied to javadoc text (a class's or a method's documentation, once converted to
 * Markdown) copied from the peer. Measured against the installed BBj javadoc corpus: the longest
 * documentation text found was 11,615 characters (`BBjRecordSet.getMappingDescription`); a
 * representative large class (`java.util.HashMap`) measured 5,250 characters of class-level text.
 * This limit clears every measured real value with wide margin.
 */
export const MAX_JAVADOC_LENGTH = 32768;

/** The bound applied to the class-level `error` string the peer reports for a failed resolution. */
export const MAX_PEER_ERROR_LENGTH = 1024;

/** Appended to a value truncated by {@link truncateText}, so a truncated value is always visibly
 * incomplete rather than silently cut off. */
export const TRUNCATION_MARKER = '…';

/** Stored in place of a peer-supplied `error` value that is present but not text, so the class
 * still counts as unresolved without ever storing or logging the wrongly typed value itself. */
export const UNREADABLE_PEER_ERROR = 'The Java interop service returned an error value that is not text.';

/** A plain object, as opposed to `null`, an array, or a primitive. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** `undefined`/`null` (the field was never sent, or was sent as JSON `null`) counts as absent —
 * left untouched so a caller's own `??`/`??=` defaulting still applies to it. Anything else,
 * including an empty string or `0`, counts as present. */
function isPresent(value: unknown): boolean {
    return value !== undefined && value !== null;
}

/** Whether `name` is usable as the name of a class or a member (field, method, constructor,
 * parameter): a non-empty string of at most {@link MAX_JAVA_IDENTIFIER_LENGTH} characters. */
export function isUsableJavaClassName(name: unknown): name is string {
    return typeof name === 'string' && name.length > 0 && name.length <= MAX_JAVA_IDENTIFIER_LENGTH;
}

/** Whether `type` is usable as a member's type or return-type name: a string of at most
 * {@link MAX_JAVA_IDENTIFIER_LENGTH} characters. */
function isUsableTypeName(type: unknown): type is string {
    return typeof type === 'string' && type.length <= MAX_JAVA_IDENTIFIER_LENGTH;
}

/** Whether `code` is the leading (high) half of a UTF-16 surrogate pair. */
function isHighSurrogate(code: number): boolean {
    return code >= 0xD800 && code <= 0xDBFF;
}

/**
 * Bounds free text (javadoc, a peer error message, a javadoc parameter's real name) to at most
 * `limit` UTF-16 code units, never rejecting it outright. Text at or under the limit is returned
 * unchanged. Longer text is cut to `limit - 1` code units — one fewer when the last kept unit
 * would be the high half of a surrogate pair, so a pair is never split — followed by
 * {@link TRUNCATION_MARKER}; the result is always at most `limit` characters long.
 */
export function truncateText(text: string, limit: number): string {
    if (text.length <= limit) {
        return text;
    }
    let cut = Math.max(limit - TRUNCATION_MARKER.length, 0);
    if (cut > 0 && isHighSurrogate(text.charCodeAt(cut - 1))) {
        cut -= 1;
    }
    return text.slice(0, cut) + TRUNCATION_MARKER;
}

/** If `obj[key]` is present but not a boolean, replaces it with `false` and appends a note naming
 * `path`. An absent value is left untouched, so a caller's own `?? false` defaulting still applies
 * to it. */
function sanitizeBooleanFlag(obj: Record<string, unknown>, key: string, path: string, notes: string[]): void {
    const value = obj[key];
    if (isPresent(value) && typeof value !== 'boolean') {
        obj[key] = false;
        notes.push(`${path} defaulted to false`);
    }
}

/**
 * If `obj[key]` is present but not an array, replaces it with `[]` and appends a note naming
 * `path`. An absent value is left untouched, so a caller's own `??= []` defaulting still applies
 * to it. Returns whether `obj[key]` is (now, or already was) an array.
 */
function defaultArrayIfPresentButInvalid(obj: Record<string, unknown>, key: string, path: string, notes: string[]): boolean {
    const value = obj[key];
    if (Array.isArray(value)) {
        return true;
    }
    if (isPresent(value)) {
        obj[key] = [];
        notes.push(`${path} defaulted to []`);
    }
    return Array.isArray(obj[key]);
}

/**
 * Keeps only the parameters of a kept method/constructor whose `name` and `type` are both usable.
 * A present but non-array `parameters` becomes `[]`; an absent one is left alone. Appends one note
 * per dropped parameter, naming only the field path — never the rejected value.
 */
function sanitizeParameters(owner: Record<string, unknown>, ownerPath: string, notes: string[]): void {
    if (!defaultArrayIfPresentButInvalid(owner, 'parameters', `${ownerPath}.parameters`, notes)) {
        return;
    }
    const parameters = owner.parameters as unknown[];
    const kept: unknown[] = [];
    parameters.forEach((parameter, index) => {
        if (isPlainObject(parameter) && isUsableJavaClassName(parameter.name) && isUsableTypeName(parameter.type)) {
            kept.push(parameter);
        } else {
            notes.push(`${ownerPath}.parameters[${index}] dropped`);
        }
    });
    if (kept.length !== parameters.length) {
        owner.parameters = kept;
    }
}

/**
 * Keeps only the entries of `dto[arrayName]` that are usable: a non-null object whose `name` is
 * usable per {@link isUsableJavaClassName}, and whose `typeField` (`type` for a field,
 * `returnType` for a method/constructor) is usable per {@link isUsableTypeName}. A present but
 * non-array `dto[arrayName]` becomes `[]`; an absent one is left alone. For every kept entry, also
 * sanitizes its `isDeprecated` flag, its `isStatic` flag when `sanitizeIsStatic` is true, and its
 * `parameters` array when `sanitizeParams` is true. The array is replaced only when something was
 * dropped, so a clean class keeps the identical array objects it arrived with.
 */
function sanitizeMemberArray(
    dto: Record<string, unknown>,
    arrayName: string,
    typeField: string,
    sanitizeParams: boolean,
    sanitizeIsStatic: boolean,
    notes: string[]
): void {
    if (!defaultArrayIfPresentButInvalid(dto, arrayName, arrayName, notes)) {
        return;
    }
    const members = dto[arrayName] as unknown[];
    const kept: unknown[] = [];
    members.forEach((member, index) => {
        if (isPlainObject(member) && isUsableJavaClassName(member.name) && isUsableTypeName(member[typeField])) {
            const path = `${arrayName}[${index}]`;
            sanitizeBooleanFlag(member, 'isDeprecated', `${path}.isDeprecated`, notes);
            if (sanitizeIsStatic) {
                sanitizeBooleanFlag(member, 'isStatic', `${path}.isStatic`, notes);
            }
            if (sanitizeParams) {
                sanitizeParameters(member, path, notes);
            }
            kept.push(member);
        } else {
            notes.push(`${arrayName}[${index}] dropped`);
        }
    });
    if (kept.length !== members.length) {
        dto[arrayName] = kept;
    }
}

/** Keeps only the object entries of `dto.classes`; a present but non-array `classes` becomes `[]`.
 * An absent `classes` is left alone. */
function sanitizeClassesArray(dto: Record<string, unknown>, notes: string[]): void {
    if (!defaultArrayIfPresentButInvalid(dto, 'classes', 'classes', notes)) {
        return;
    }
    const classes = dto.classes as unknown[];
    const kept = classes.filter((entry, index) => {
        if (isPlainObject(entry)) {
            return true;
        }
        notes.push(`classes[${index}] dropped`);
        return false;
    });
    if (kept.length !== classes.length) {
        dto.classes = kept;
    }
}

/** Truncates or replaces a present class-level `error` value, never rejecting the class over it. */
function sanitizeErrorField(dto: Record<string, unknown>, notes: string[]): void {
    const error = dto.error;
    if (!isPresent(error)) {
        return;
    }
    if (typeof error !== 'string') {
        dto.error = UNREADABLE_PEER_ERROR;
        notes.push('error replaced (not text)');
        return;
    }
    if (error.length > MAX_PEER_ERROR_LENGTH) {
        dto.error = truncateText(error, MAX_PEER_ERROR_LENGTH);
        notes.push('error truncated');
    }
}

/** Whether `value` is usable as a `packageName`/`simpleName` string: a string of at most
 * {@link MAX_JAVA_IDENTIFIER_LENGTH} characters. Unlike {@link isUsableJavaClassName}, an empty
 * string is usable here — it is the legitimate spelling of the unnamed/default package. */
function isUsablePackageOrSimpleName(value: unknown): value is string {
    return typeof value === 'string' && value.length <= MAX_JAVA_IDENTIFIER_LENGTH;
}

/** Deletes a present `dto[key]` (`packageName`/`simpleName`) that is not a usable string, so a
 * caller's own derivation logic for a missing value applies to it instead. */
function sanitizeIdentifierStringField(dto: Record<string, unknown>, key: string, notes: string[]): void {
    const value = dto[key];
    if (!isPresent(value)) {
        return;
    }
    if (!isUsablePackageOrSimpleName(value)) {
        delete dto[key];
        notes.push(`${key} removed`);
    }
}

/**
 * Bounds and type-checks a java-interop peer class description in place before any of its fields
 * are copied onto a `JavaClass` AST node (issue #523). A class-level `isDeprecated` that is
 * present but not a boolean defaults to `false`; a present but non-string/over-long `packageName`
 * or `simpleName` is removed so the caller's own derivation applies; a present but non-string
 * `error` is replaced by {@link UNREADABLE_PEER_ERROR}, and an over-long one is truncated. A
 * field, method or constructor whose `name`/`type`(`returnType`) is missing, wrongly typed or over
 * {@link MAX_JAVA_IDENTIFIER_LENGTH} characters is dropped from its array; a parameter of a kept
 * method/constructor is dropped under the same rule; a kept member's non-boolean `isDeprecated`
 * (and, for a field or method, `isStatic`) defaults to `false`. `fields`, `methods`,
 * `constructors` and `classes` that are present but not arrays default to `[]`. Returns
 * human-readable notes naming the affected field paths only — never the rejected values, which
 * may be attacker-controlled or simply huge.
 */
export function sanitizeJavaClassDto(dto: object): string[] {
    const notes: string[] = [];
    if (!isPlainObject(dto)) {
        return notes;
    }
    sanitizeBooleanFlag(dto, 'isDeprecated', 'isDeprecated', notes);
    sanitizeIdentifierStringField(dto, 'packageName', notes);
    sanitizeIdentifierStringField(dto, 'simpleName', notes);
    sanitizeErrorField(dto, notes);
    sanitizeClassesArray(dto, notes);
    sanitizeMemberArray(dto, 'fields', 'type', false, true, notes);
    sanitizeMemberArray(dto, 'methods', 'returnType', true, true, notes);
    sanitizeMemberArray(dto, 'constructors', 'returnType', true, false, notes);
    return notes;
}

/**
 * Every character {@link escapeMarkdown} backslash-escapes: the backslash itself (so a
 * peer-supplied backslash cannot undo a later escape), the backtick, and the six characters that
 * make up Markdown link/image syntax (`[`, `]`, `(`, `)`, `!`). The less-than sign is deliberately
 * left out (issue #524, amended 2026-09-26): most installed javadoc contains HTML tags, and VS
 * Code's hover already strips raw HTML when `supportHtml` is off, so escaping it would only turn
 * readable hovers into literal tags.
 */
const MARKDOWN_ESCAPE_PATTERN = /[\\`[\]()!]/g;

/**
 * Backslash-escapes every occurrence of `\`, `` ` ``, `[`, `]`, `(`, `)` and `!` in `text`, in a
 * single left-to-right pass, so Markdown link (`[x](y)`) and image (`![x](y)`) syntax supplied by
 * the java-interop peer or a javadoc file renders as literal text instead of an interpretable link
 * or a remote image (issue #524). The escape is applied once, at the render boundary, where hover
 * and completion build the Markdown string they return — never at storage, so the stored
 * `node.docu`/javadoc text stays plain for any other consumer. The less-than sign is not escaped;
 * see {@link MARKDOWN_ESCAPE_PATTERN}.
 */
export function escapeMarkdown(text: string): string {
    return text.replace(MARKDOWN_ESCAPE_PATTERN, '\\$&');
}

/** Every line-break sequence {@link toFenceSafeLine} replaces with a single space: a Windows
 * CRLF pair, a lone line feed, a lone carriage return, and the Unicode line/paragraph
 * separators U+2028/U+2029. */
const FENCE_LINE_BREAK_PATTERN = new RegExp('\\r\\n|[\\r\\n\\u2028\\u2029]', 'g');

/**
 * Makes `text` safe to place inside a fenced ```` ```java ```` code block in completion
 * documentation (issue #524): every backtick is removed, so the text cannot close the fence
 * early, and every line break becomes a single space, so an embedded newline cannot break the
 * fence open. Not backslash-escaped — inside a fence, a backslash would show up literally.
 */
export function toFenceSafeLine(text: string): string {
    return text.replace(/`/g, '').replace(FENCE_LINE_BREAK_PATTERN, ' ');
}

/**
 * The characters a Java-qualified-name segment may *start* with: a Unicode letter (`L`), letter
 * number (`Nl`), currency symbol (`Sc`, which includes `$`) or connector punctuation (`Pc`, which
 * includes `_`).
 */
const JAVA_SEGMENT_START = '\\p{L}\\p{Nl}\\p{Sc}\\p{Pc}';

/** The characters a segment may *continue* with: everything a segment may start with, plus
 * decimal digits (`Nd`) and combining marks (`Mn`, `Mc`). */
const JAVA_SEGMENT_CONTINUE = `${JAVA_SEGMENT_START}\\p{Nd}\\p{Mn}\\p{Mc}`;

/** One or more dot-separated Java identifier segments, anchored at both ends, matched with the
 * `u` flag so `\p{...}` are Unicode property escapes rather than literal text. */
const JAVA_QUALIFIED_NAME_PATTERN = new RegExp(
    `^[${JAVA_SEGMENT_START}][${JAVA_SEGMENT_CONTINUE}]*(?:\\.[${JAVA_SEGMENT_START}][${JAVA_SEGMENT_CONTINUE}]*)*$`,
    'u'
);

/**
 * Whether `fqn` is a Java qualified name safe to insert into source as a `use ${fqn}\n` line
 * (issue #525): a string of 1 to {@link MAX_JAVA_IDENTIFIER_LENGTH} UTF-16 code units made of one
 * or more dot-separated segments, each starting with a Unicode letter, letter number, currency
 * symbol (including `$`) or connector punctuation (including `_`), and continuing with those plus
 * decimal digits and combining marks. No empty segment, and no whitespace, `;`, line break, or
 * other punctuation is accepted anywhere in the name.
 *
 * This follows the JLS identifier rules, except that the JLS "ignorable" format and control
 * characters are deliberately excluded on purpose — they could hide text, for example a
 * right-to-left override placed before a malicious statement. Both nested-class spellings pass:
 * `java.util.Map$Entry` (the spelling a user can type in source) and `java.util.Map.Entry`.
 */
export function isJavaQualifiedName(fqn: unknown): fqn is string {
    return typeof fqn === 'string'
        && fqn.length > 0
        && fqn.length <= MAX_JAVA_IDENTIFIER_LENGTH
        && JAVA_QUALIFIED_NAME_PATTERN.test(fqn);
}
