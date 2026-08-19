/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { AstUtils, EmptyFileSystem } from 'langium';
import { parseHelper } from 'langium/test';
import { beforeAll, describe, expect, test } from 'vitest';

import { createBBjServices } from '../src/language/bbj-module.js';
import { toMethodData } from '../src/language/bbj-nodedescription-provider.js';
import { initializeWorkspace } from './test-helper.js';
import { findBestOverload } from '../src/language/bbj-overload-selector.js';
import { isMethodDecl, Model } from '../src/language/generated/ast.js';

/**
 * P61-D5-007: bbj-overload-selector.ts's findBestOverload (32-52) documents "the linked
 * declaration goes first so it wins all ties" but had no test enforcing it — a future
 * change to the tie-break comparison (e.g. `>` to `>=` on the score comparison) would
 * silently flip which overload wins ties with no test catching the regression (D-13, no
 * red state producible: the code already implements the documented tie rule correctly).
 *
 * findBestOverload has exactly one production call site (bbj-inlay-hint-provider.ts:65);
 * this test drives it directly against a real MethodDecl pair rather than through the
 * inlay-hint provider, so the tie is constructible on demand.
 */
describe('Overload selector: linked declaration wins an exact tie (P61-D5-007)', async () => {
    const services = createBBjServices(EmptyFileSystem);
    const parse = parseHelper<Model>(services.BBj);

    beforeAll(async () => {
        await initializeWorkspace(services.shared);
    });

    test('findBestOverload returns the linked declaration when a sibling scores exactly equal', async () => {
        // Two overloads of foo(), same parameter count, with parameter types that
        // neither matches nor conflicts with an unknown-typed argument — both score
        // identically (typeAffinity returns 0 for an unrecognized/undefined arg type).
        const doc = await parse(`
class public OverloadTie
    method public void foo(java.lang.String a)
    methodend
    method public void foo(java.lang.Object a)
    methodend
classend
        `);
        const methods = AstUtils.streamAllContents(doc.parseResult.value).filter(isMethodDecl).toArray();
        expect(methods).toHaveLength(2);
        const [first, second] = methods;
        expect(first.name.toLowerCase()).toBe('foo');
        expect(second.name.toLowerCase()).toBe('foo');

        // `resolved` is what the linker actually linked to; `linked` is its MethodData.
        // An unknown argument type (undefined) makes both overloads score identically —
        // an exact tie — so the linked declaration (first) must win, not the sibling
        // (second), even though the sibling scores exactly the same.
        const linked = toMethodData(first);
        const best = findBestOverload(first, linked, [undefined]);

        expect(best).toBe(linked);
        expect(best.parameters[0].type).toContain('String');
    });
});
