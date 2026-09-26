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

/** A plain object, as opposed to `null`, an array, or a primitive. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Whether `name` is usable as the name of a member (field, method, constructor, parameter): a
 * non-empty string of at most {@link MAX_JAVA_IDENTIFIER_LENGTH} characters. */
function isUsableMemberName(name: unknown): name is string {
    return typeof name === 'string' && name.length > 0 && name.length <= MAX_JAVA_IDENTIFIER_LENGTH;
}

/** Whether `type` is usable as a member's type or return-type name: a string of at most
 * {@link MAX_JAVA_IDENTIFIER_LENGTH} characters. */
function isUsableTypeName(type: unknown): type is string {
    return typeof type === 'string' && type.length <= MAX_JAVA_IDENTIFIER_LENGTH;
}

/**
 * Keeps only the parameters of a kept method/constructor whose `name` and `type` are both usable.
 * Mutates `owner.parameters` in place when present and an array; leaves anything else alone.
 * Appends one note per dropped parameter, naming only the field path — never the rejected value.
 */
function sanitizeParameters(owner: Record<string, unknown>, ownerPath: string, notes: string[]): void {
    const parameters = owner.parameters;
    if (!Array.isArray(parameters)) {
        return;
    }
    const kept: unknown[] = [];
    parameters.forEach((parameter, index) => {
        if (isPlainObject(parameter) && isUsableMemberName(parameter.name) && isUsableTypeName(parameter.type)) {
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
 * Keeps only the entries of `dto[arrayName]` that are usable: a non-null
 * object whose `name` is a non-empty string of at most {@link MAX_JAVA_IDENTIFIER_LENGTH}, and
 * whose `typeField` (`type` for a field, `returnType` for a method/constructor) is a string of at
 * most {@link MAX_JAVA_IDENTIFIER_LENGTH}. For every kept entry, also sanitizes its `parameters`
 * array when `sanitizeParams` is true. The array is replaced only when something was dropped, so a
 * clean class keeps the identical array objects it arrived with.
 */
function sanitizeMemberArray(
    dto: Record<string, unknown>,
    arrayName: string,
    typeField: string,
    sanitizeParams: boolean,
    notes: string[]
): void {
    const members = dto[arrayName];
    if (!Array.isArray(members)) {
        return;
    }
    const kept: unknown[] = [];
    members.forEach((member, index) => {
        if (isPlainObject(member) && isUsableMemberName(member.name) && isUsableTypeName(member[typeField])) {
            if (sanitizeParams) {
                sanitizeParameters(member, `${arrayName}[${index}]`, notes);
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

/**
 * Bounds and type-checks a java-interop peer class description in place before any of its fields
 * are copied onto a `JavaClass` AST node (issue #523). A field, method
 * or constructor whose `name`/`type`(`returnType`) is missing, wrongly typed or over
 * {@link MAX_JAVA_IDENTIFIER_LENGTH} characters is dropped from its array, and a parameter of a
 * kept method/constructor is dropped under the same rule. Returns human-readable notes naming the
 * affected field paths only — never the rejected values, which may be attacker-controlled or
 * simply huge.
 */
export function sanitizeJavaClassDto(dto: object): string[] {
    const notes: string[] = [];
    if (!isPlainObject(dto)) {
        return notes;
    }
    sanitizeMemberArray(dto, 'fields', 'type', false, notes);
    sanitizeMemberArray(dto, 'methods', 'returnType', true, notes);
    sanitizeMemberArray(dto, 'constructors', 'returnType', true, notes);
    return notes;
}
