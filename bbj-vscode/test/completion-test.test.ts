
import { EmptyFileSystem } from 'langium';
import { expectCompletion } from 'langium/test';
import { describe, test } from 'vitest';
import { createBBjTestServices } from './bbj-test-module';

describe('BBJ completion provider', async () => {

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