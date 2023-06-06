
import os from 'os';
import { describe, expect, test } from 'vitest';
import { collectPrefixes, parseSettings } from '../src/language/lib/ws-manager';

const exampleInput = `
classpath=~/git/bbj-language-server/examples/lib/com.google.guava_30.1.0.v20221112-0806.jar
PREFIX="~/BBJ/utils/" "~/BBJ/plugins/" "~/BBJ/utils/reporting/bbjasper/" "~/BBJ/utils/translations/" "~/BBJ/utils/ext/" "~/BBJ/utils/std/" "~/BBJ/utils/email/" "~/BBJ/utils/bus/" "~/BBJ/utils/gapps/" "~/BBJ/utils/gappsV3/" "~/BBJ/utils/xcall/" "~/BBJ/utils/bwu/" "~/BBJ/utils/DialogWizard/" "~/BBJ/utils/BBjToJavadoc/" "~/BBJ/utils/invoker/" "~/BBJ/utils/launchdock/" "~/BBJ/utils/admin/" "~/BBJ/configurator/" "~/BBJ/demos/Common/" "~/BBJ/demos/chiledd/" "~/BBJ/demos/AdminAPI/" "~/BBJ/demos/ecommerce/" "~/BBJ/demos/ecommerce/data/" "~/BBJ/demos/cuiweb/" "~/BBJ/demos/webservices/" "~/BBJ/bbjsp/src/"
`;

describe('Paths handling tests', () => {

    test('Parse properties file test', async () => {
        const parsed = parseSettings(exampleInput)
        expect(parsed.classpath).equal('~/git/bbj-language-server/examples/lib/com.google.guava_30.1.0.v20221112-0806.jar')
        expect(parsed.prefixes).equal('"~/BBJ/utils/" "~/BBJ/plugins/" "~/BBJ/utils/reporting/bbjasper/" "~/BBJ/utils/translations/" "~/BBJ/utils/ext/" "~/BBJ/utils/std/" "~/BBJ/utils/email/" "~/BBJ/utils/bus/" "~/BBJ/utils/gapps/" "~/BBJ/utils/gappsV3/" "~/BBJ/utils/xcall/" "~/BBJ/utils/bwu/" "~/BBJ/utils/DialogWizard/" "~/BBJ/utils/BBjToJavadoc/" "~/BBJ/utils/invoker/" "~/BBJ/utils/launchdock/" "~/BBJ/utils/admin/" "~/BBJ/configurator/" "~/BBJ/demos/Common/" "~/BBJ/demos/chiledd/" "~/BBJ/demos/AdminAPI/" "~/BBJ/demos/ecommerce/" "~/BBJ/demos/ecommerce/data/" "~/BBJ/demos/cuiweb/" "~/BBJ/demos/webservices/" "~/BBJ/bbjsp/src/"')
    })

    const parsed = parseSettings(exampleInput)

    test('Parse prefixes paths test', async () => {
        const paths = collectPrefixes(parsed.prefixes)
        expect(paths.length).equals(26)
        expect(paths[4]).equals(os.homedir() + '/BBJ/utils/ext/')
    })

})