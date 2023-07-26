
import os from 'os';
import { describe, expect, test } from 'vitest';
import { parseSettings } from '../src/language/bbj-ws-manager';

const exampleInput = `
classpath=~/git/bbj-language-server/examples/lib/com.google.guava_30.1.0.v20221112-0806.jar:~/someOtherPath.jar:~/someOtherPath2.jar
PREFIX="~/BBJ/utils/" "~/BBJ/plugins/" "~/BBJ/utils/reporting/bbjasper/"
`;
const prefixfromconfigbbx = "/bbx/utils/ /bbx/plugins/";
const bbjdir = "/bbx/";

describe('Paths handling tests', () => {


    const parsed = parseSettings(exampleInput, prefixfromconfigbbx)

    test('Parse prefixes paths test', async () => {
        const expectVal = '~/git/bbj-language-server/examples/lib/com.google.guava_30.1.0.v20221112-0806.jar:~/someOtherPath.jar:~/someOtherPath2.jar'
        expect(parsed.classpath.length).equals(3)
        expect(parsed.classpath.join(':')).equal(expectVal.replace(/~/g, os.homedir()))

        const paths = parsed.prefixes
        expect(paths.length).equals(3)
        expect(paths[2]).equals(os.homedir() + '/BBJ/utils/reporting/bbjasper/')
    })

})