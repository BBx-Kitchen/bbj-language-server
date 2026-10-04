package com.basis.bbj.intellij.lsp;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Pins the literal-aware behaviour the source-guard tests rely on. */
class JavaSourceScanTest {

    @Test
    void aSlashSlashInsideAStringLiteralSurvivesCommentStripping() {
        String source = "String url = \"http://example.com\"; // trailing comment\nint x = 1;";

        String stripped = JavaSourceScan.stripComments(source);

        assertTrue(stripped.contains("\"http://example.com\""), stripped);
        assertFalse(stripped.contains("trailing comment"), stripped);
        assertTrue(stripped.contains("int x = 1;"), stripped);
    }

    @Test
    void commentMarkersInsideCharAndTextBlockLiteralsSurvive() {
        String source = "char c = '\"'; String t = \"\"\"\n  /* kept */ // kept\n  \"\"\"; /* dropped */";

        String stripped = JavaSourceScan.stripComments(source);

        assertTrue(stripped.contains("/* kept */ // kept"), stripped);
        assertFalse(stripped.contains("dropped"), stripped);
    }

    @Test
    void blockAndLineCommentsAreRemoved() {
        String stripped = JavaSourceScan.stripComments("a /* b { */ c // d }\ne");

        assertEquals("a  c \ne", stripped);
    }

    @Test
    void bracesInsideLiteralsAndCommentsAreNotCounted() {
        String source = "void f() { String s = \"}\"; char c = '{'; // }\n /* { */ int x; } void g() { }";

        assertEquals("{ String s = \"}\"; char c = '{'; // }\n /* { */ int x; }",
                JavaSourceScan.bodyOf(source, "void f()"));
        assertEquals(" String s = \"}\"; char c = '{'; // }\n /* { */ int x; ",
                JavaSourceScan.methodBody(source, "void f()"));
        assertEquals("{ }", JavaSourceScan.bodyOf(source, "void g()"));
    }

    @Test
    void nestedBracesAreMatched() {
        assertEquals("{ if (a) { b(); } }", JavaSourceScan.bodyOf("void f() { if (a) { b(); } } tail", "void f()"));
    }
}
