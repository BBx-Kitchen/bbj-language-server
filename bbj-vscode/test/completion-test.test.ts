
import { EmptyFileSystem } from 'langium';
import { expectCompletion } from 'langium/test';
import { beforeAll, describe, test } from 'vitest';
import { createBBjServices } from '../src/language/bbj-module';
import { initializeWorkspace } from './test-helper';
import { createBBjTestServices } from './bbj-test-module';
import { JavadocProvider } from '../src/language/java-javadoc';

describe('BBJ completion provider', () => {

    const bbjServices = createBBjTestServices(EmptyFileSystem).BBj;
    const completion = expectCompletion(bbjServices);

    test('Should propose imported java class', async () => {
        const text = `
        use java.util.HashMap
        Hash<|>
        `
        await completion({
            text,
            index: 0,
            expectedItems: [
                'HashMap'
            ]
        });
    });
});