import { EmptyFileSystem } from "langium";
import { ParseHelperOptions, validationHelper } from "langium/test";
import { beforeAll, describe, expect, test } from "vitest";
import { createBBjServices } from "../src/language/bbj-module";
import { Program } from "../src/language/generated/ast";
import { initializeWorkspace } from "./test-helper";
import { basename } from "path";
import { afterEach } from "node:test";

describe("Classes access-levels", () => {
    let disposables: (() => Promise<void>)[] = [];
    const services = createBBjServices(EmptyFileSystem);
    let validate: ReturnType<typeof validationHelper<Program>>;

    beforeAll(async () => {
        await initializeWorkspace(services.shared);
        const validateInternal = validationHelper<Program>(services.BBj);
        validate = async (input: string, options?: ParseHelperOptions) => {
            const result = await (validateInternal(input, options));
            disposables.push(result.dispose);
            return result;
        }
    });

    afterEach(async () => {
        for (const dispose of disposables) {
            await dispose();   
        }
        disposables = [];
    });
    
    test("Can access private class from same file", async () => {
        const { diagnostics } = await validate(`
            class private A
            classend
            
            let a! = new A()
        `)
        expect(diagnostics).toHaveLength(0);
    });

    test("Cannot access private class from different file", async () => {
        const { document } = await validate(`
            class private A
            classend
        `);
        const { diagnostics } = await validate(`
            use ::${basename(document.uri.fsPath)}::A

            let a! = new A()
        `);
        expect(diagnostics).toHaveLength(2);
        expect(diagnostics[0].message).toBe("Private class 'A' is not visible from this file.");
        expect(diagnostics[1].message).toBe("Private class 'A' is not visible from this file.");
    });

    test("Can access protected class from different same-folder file", async () => {
        const { document } = await validate(`
            class protected A
            classend
        `);
        const { diagnostics } = await validate(`
            use ::${basename(document.uri.fsPath)}::A

            let a! = new A()
        `);
        expect(diagnostics).toHaveLength(0);
    });

    test("Cannot access protected class from different non-related folder file", async () => {
        const { document } = await validate(`
            class protected A
            classend
        `, { documentUri: './folder/test1.bbj' });
        const { diagnostics } = await validate(`
            use ::${document.uri.fsPath}::A

            let a! = new A()
        `);
        expect(diagnostics).toHaveLength(2);
        expect(diagnostics[0].message).toBe("Protected class 'A' is not visible from this directory.");
        expect(diagnostics[1].message).toBe("Protected class 'A' is not visible from this directory.");
    });

    test("Can access public class from different non-related folder file", async () => {
        const { document } = await validate(`
            class public A
            classend
        `, { documentUri: './folder/test2.bbj' });
        const { diagnostics } = await validate(`
            use ::${document.uri.fsPath}::A

            let a! = new A()
        `);
        expect(diagnostics).toHaveLength(0);
    });
});