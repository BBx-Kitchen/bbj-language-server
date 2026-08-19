import { EmptyFileSystem } from 'langium';
import { parseHelper } from 'langium/test';
import path from 'path';
import fs from 'fs';
import { describe, expect, test } from 'vitest';
import { createBBjServices } from '../src/language/bbj-module.js';
import { Model } from '../src/language/generated/ast.js';

const services = createBBjServices(EmptyFileSystem);

const parse = parseHelper<Model>(services.BBj);

describe('Example files Tests', () => {
    const testDataFolder = path.join(__dirname, './test-data');

    // P61-D5-004: `.forEach(async file => ...)` never awaits the callback's returned
    // promise — a lexer/parser error thrown inside it becomes an unhandled rejection,
    // not a test failure, so the test always resolved "green" regardless of the actual
    // parse result. Each file is now parsed and asserted sequentially with a real await.
    test('Parse all files in "test-data" folder', async () => {
        const files = fs.readdirSync(testDataFolder).filter(file => file.endsWith('.bbj'));
        expect(files.length).toBeGreaterThan(0);
        for (const file of files) {
            const result = await parse(fs.readFileSync(path.join(testDataFolder, file), 'utf-8'));
            expect(result.parseResult.lexerErrors, `${file}: lexer errors`).empty;
            expect(result.parseResult.parserErrors, `${file}: parser errors`).empty;
        }
    });
});