import { describe, expect, test } from 'vitest';
import { documentationHeader, methodSignature } from '../src/language/bbj-hover.js';
import { JavaMethod, JavaField } from '../src/language/generated/ast.js';

describe('hover helpers are robust against malformed Java data', () => {
    // Java data comes from the java-interop socket / javadoc JSON and can arrive with
    // fields missing (e.g. a no-arg method serialized without a `parameters` array).
    // Hover must never throw on such payloads.

    test('methodSignature tolerates a missing parameters array', () => {
        expect(() => methodSignature({ name: 'foo', parameters: undefined as never, returnType: 'void' }))
            .not.toThrow();
        expect(methodSignature({ name: 'foo', parameters: undefined as never, returnType: 'void' }))
            .toBe('foo()');
    });

    test('methodSignature renders provided parameters', () => {
        expect(methodSignature({
            name: 'put',
            parameters: [{ name: 'k', type: 'String' }, { name: 'v', type: 'Object' }],
            returnType: 'Object'
        })).toBe('put(String k, Object v)');
    });

    test('documentationHeader tolerates a JavaMethod with no parameters array', () => {
        const method = { $type: JavaMethod.$type, name: 'size', returnType: 'int', parameters: undefined } as never;
        expect(() => documentationHeader(method)).not.toThrow();
        expect(documentationHeader(method)).toContain('size()');
    });

    test('documentationHeader tolerates a JavaField with no type', () => {
        const field = { $type: JavaField.$type, name: 'count', type: undefined } as never;
        expect(() => documentationHeader(field)).not.toThrow();
    });
});
