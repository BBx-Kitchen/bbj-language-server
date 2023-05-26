import { EmptyFileSystem } from 'langium';
import { parseHelper } from 'langium/test';
import path from 'path';
import fs from 'fs';
import { describe, expect, test } from 'vitest';
import { createBBjServices } from '../src/language/bbj-module';
import { Model } from '../src/language/generated/ast';

const services = createBBjServices(EmptyFileSystem);

const parse = parseHelper<Model>(services.BBj);

describe('Example files Tests', () => {
    const testDataFolder = path.join(__dirname, './test-data');

    test('Parse all files in "test-data" folder', async () => {
        fs.readdirSync(testDataFolder).filter(file => file.endsWith('.bbj')).forEach(async file => {
            const result = await parse(fs.readFileSync(path.join(testDataFolder, file), 'utf-8'))
            expect(result.parseResult.lexerErrors).empty
            expect(result.parseResult.parserErrors).empty
        });
    });
});