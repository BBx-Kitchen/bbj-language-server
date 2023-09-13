/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { EmptyFileSystem } from 'langium';
import { describe, test } from 'vitest';

import { expectError, validationHelper } from 'langium/test';
import { createBBjServices } from '../src/language/bbj-module';
import { Program, isBinaryExpression } from '../src/language/generated/ast';
import { findFirst, initializeWorkspace } from './test-helper';

const services = createBBjServices(EmptyFileSystem);
const validate = validationHelper<Program>(services.BBj);

describe('BBj validation', async () => {

    await initializeWorkspace(services.shared);

    test('Symbolic link reference must start with "*"', async () => {
        const validationResult = await validate(`let map = new List(err=next)`);

        expectError(validationResult, /Symbolic Label name must be prefixed with '\*'./, {
            node: findFirst(validationResult.document, isBinaryExpression),
            property: 'right'
        });
        
    });
});