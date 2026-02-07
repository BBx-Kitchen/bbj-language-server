export const builtinBBjAPI = `

library

/@@
BBjAPI is the main entry point for accessing BBj runtime services.
This built-in class ensures BBjAPI() always resolves, independent of Java interop.
When Java interop service is available, full method signatures are loaded dynamically.
@/
class public BBjAPI
classend

`.trimLeft();
