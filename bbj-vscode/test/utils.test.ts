
import os from 'os';
import { describe, expect, test } from 'vitest';
import { collectPrefixes, parseSettings } from '../src/language/bbj-ws-manager';

const exampleInput = `
classpath=~/git/bbj-language-server/examples/lib/com.google.guava_30.1.0.v20221112-0806.jar:~/someOtherPath.jar
PREFIX="~/BBJ/utils/" "~/BBJ/plugins/" "~/BBJ/utils/reporting/bbjasper/"
`;

describe('Paths handling tests', () => {

    const parsed = parseSettings(exampleInput)

    
    
    test('Parse prefixes paths test', async () => {
        expect(parsed.classpath).equal('~/git/bbj-language-server/examples/lib/com.google.guava_30.1.0.v20221112-0806.jar:~/someOtherPath.jar'.replace('~', os.homedir()))

        const paths = parsed.prefixes
        expect(paths.length).equals(3)
        expect(paths[2]).equals(os.homedir() + '/BBJ/utils/reporting/bbjasper/')
    })

})