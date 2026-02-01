package com.basis.bbj.intellij;

import com.intellij.openapi.editor.colors.TextAttributesKey;
import com.intellij.openapi.fileTypes.SyntaxHighlighter;
import com.intellij.openapi.options.colors.AttributesDescriptor;
import com.intellij.openapi.options.colors.ColorDescriptor;
import com.intellij.openapi.options.colors.ColorSettingsPage;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import javax.swing.Icon;
import java.util.Map;

import static com.intellij.openapi.editor.DefaultLanguageHighlighterColors.*;

/**
 * Color Scheme settings page for BBj language.
 * Provides customizable color settings for BBj token types with live preview.
 *
 * Note: This establishes BBj-specific TextAttributesKeys with IntelliJ theme fallbacks.
 * Currently, the actual editor highlighting uses TextMate (Phase 02-01) which applies
 * theme defaults directly. User overrides in this page will become fully active when
 * semantic tokens are added in Phase 4 (LSP symbol navigation).
 */
public class BbjColorSettingsPage implements ColorSettingsPage {

    // TextAttributesKey constants for BBj token types
    // Each falls back to corresponding DefaultLanguageHighlighterColors key
    public static final TextAttributesKey BBJ_KEYWORD =
            TextAttributesKey.createTextAttributesKey("BBJ_KEYWORD", KEYWORD);

    public static final TextAttributesKey BBJ_STRING =
            TextAttributesKey.createTextAttributesKey("BBJ_STRING", STRING);

    public static final TextAttributesKey BBJ_LINE_COMMENT =
            TextAttributesKey.createTextAttributesKey("BBJ_LINE_COMMENT", LINE_COMMENT);

    public static final TextAttributesKey BBJ_BLOCK_COMMENT =
            TextAttributesKey.createTextAttributesKey("BBJ_BLOCK_COMMENT", BLOCK_COMMENT);

    public static final TextAttributesKey BBJ_NUMBER =
            TextAttributesKey.createTextAttributesKey("BBJ_NUMBER", NUMBER);

    public static final TextAttributesKey BBJ_FUNCTION_CALL =
            TextAttributesKey.createTextAttributesKey("BBJ_FUNCTION_CALL", FUNCTION_CALL);

    public static final TextAttributesKey BBJ_OPERATION_SIGN =
            TextAttributesKey.createTextAttributesKey("BBJ_OPERATION_SIGN", OPERATION_SIGN);

    public static final TextAttributesKey BBJ_IDENTIFIER =
            TextAttributesKey.createTextAttributesKey("BBJ_IDENTIFIER", IDENTIFIER);

    public static final TextAttributesKey BBJ_STRING_ESCAPE =
            TextAttributesKey.createTextAttributesKey("BBJ_STRING_ESCAPE", VALID_STRING_ESCAPE);

    private static final AttributesDescriptor[] DESCRIPTORS = new AttributesDescriptor[]{
            new AttributesDescriptor("Keyword", BBJ_KEYWORD),
            new AttributesDescriptor("String", BBJ_STRING),
            new AttributesDescriptor("Line comment", BBJ_LINE_COMMENT),
            new AttributesDescriptor("Block comment", BBJ_BLOCK_COMMENT),
            new AttributesDescriptor("Number", BBJ_NUMBER),
            new AttributesDescriptor("Function call", BBJ_FUNCTION_CALL),
            new AttributesDescriptor("Operator", BBJ_OPERATION_SIGN),
            new AttributesDescriptor("Identifier", BBJ_IDENTIFIER),
            new AttributesDescriptor("String escape", BBJ_STRING_ESCAPE)
    };

    @Nullable
    @Override
    public Icon getIcon() {
        return BbjIcons.FILE;
    }

    @NotNull
    @Override
    public SyntaxHighlighter getHighlighter() {
        // Return a no-op highlighter since BBj uses TextMate-based highlighting.
        // The demo text uses tag-based annotation via getAdditionalHighlightingTagToDescriptorMap()
        return new SyntaxHighlighter() {
            @NotNull
            @Override
            public com.intellij.lexer.Lexer getHighlightingLexer() {
                return new com.intellij.lexer.EmptyLexer();
            }

            @NotNull
            @Override
            public TextAttributesKey @NotNull [] getTokenHighlights(com.intellij.psi.tree.IElementType tokenType) {
                return TextAttributesKey.EMPTY_ARRAY;
            }
        };
    }

    @NotNull
    @Override
    public String getDemoText() {
        return """
                <kw>REM</kw> <lc>BBj Example Program</lc>
                <kw>CLASS</kw> <kw>PUBLIC</kw> <id>MyClass</id>

                    <kw>FIELD</kw> <kw>PRIVATE</kw> <id>BBjString</id> <id>name$</id>
                    <kw>FIELD</kw> <kw>PRIVATE</kw> <id>BBjNumber</id> <id>count</id>

                    <kw>METHOD</kw> <kw>PUBLIC</kw> <id>void</id> <fn>process</fn>(<id>BBjString</id> <id>input$</id>)
                        <kw>LET</kw> <id>count</id> <op>=</op> <num>42</num>
                        <kw>LET</kw> <id>name$</id> <op>=</op> <str>"Hello, World!"</str>
                        <kw>IF</kw> <id>count</id> <op>></op> <num>0</num> <kw>THEN</kw>
                            <fn>PRINT</fn>(<id>name$</id>)
                        <kw>FI</kw>
                        <kw>FOR</kw> <id>i</id> <op>=</op> <num>1</num> <kw>TO</kw> <num>10</num>
                            <fn>PRINT</fn>(<str>"Value: "</str> <op>+</op> <fn>STR$</fn>(<id>i</id>))
                        <kw>NEXT</kw> <id>i</id>
                    <kw>METHODEND</kw>

                <kw>CLASSEND</kw>

                <bc>/@
                 * Block comment example
                 * Describes the program
                @/</bc>
                """;
    }

    @Nullable
    @Override
    public Map<String, TextAttributesKey> getAdditionalHighlightingTagToDescriptorMap() {
        return Map.of(
                "kw", BBJ_KEYWORD,
                "str", BBJ_STRING,
                "lc", BBJ_LINE_COMMENT,
                "bc", BBJ_BLOCK_COMMENT,
                "num", BBJ_NUMBER,
                "fn", BBJ_FUNCTION_CALL,
                "op", BBJ_OPERATION_SIGN,
                "id", BBJ_IDENTIFIER,
                "esc", BBJ_STRING_ESCAPE
        );
    }

    @NotNull
    @Override
    public AttributesDescriptor @NotNull [] getAttributeDescriptors() {
        return DESCRIPTORS;
    }

    @NotNull
    @Override
    public ColorDescriptor @NotNull [] getColorDescriptors() {
        return ColorDescriptor.EMPTY_ARRAY;
    }

    @NotNull
    @Override
    public String getDisplayName() {
        return "BBj";
    }
}
