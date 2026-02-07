// Minimal synthetic BBjAPI class so that BBjAPI() resolves even without Java interop.
// NOTE: The `library` keyword causes BBjAPI to also appear as a LibFunction in scope.
// The linker in bbj-linker.ts has a special case that prefers the JavaClass BBjAPI
// (from Java interop, with full method signatures) over this synthetic fallback.
export const builtinBBjAPI = `

library

class public BBjAPI
classend

`.trimLeft();
