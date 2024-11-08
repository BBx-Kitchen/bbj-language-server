export function assertTrue(condition: boolean, message: string = "Condition expected to be true."): asserts condition {
    if(!condition) {
        throw new Error(message);
    }
}