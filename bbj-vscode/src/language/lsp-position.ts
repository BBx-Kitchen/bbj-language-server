/**
 * Shared bounds for LSP `Position` values (#571).
 *
 * The LSP specification types `Position.line` and `Position.character` as `uinteger`,
 * whose maximum is 2^31 − 1 = 2147483647. A JVM language client (such as LSP4IJ, which the
 * IntelliJ plugin uses) maps `Position.character` onto a Java primitive `int`. If the
 * language server ever emits a value larger than that maximum, the client's JSON
 * deserializer rejects the entire message before any handler runs — the caller never even
 * sees a malformed field, just a message-parsing failure.
 */

/** The maximum value of the LSP `uinteger` type (2^31 − 1), the type of `Position.line`/`Position.character`. */
export const LSP_MAX_UINTEGER = 2147483647;

/**
 * The character offset used as the "to end of line" stand-in when a diagnostic covers a
 * whole line and no column information is available. Editors clamp an over-long end
 * position to the actual line length, so the rendered highlight is unaffected by using the
 * `uinteger` maximum here instead of the real line length.
 */
export const END_OF_LINE_CHARACTER = LSP_MAX_UINTEGER;
