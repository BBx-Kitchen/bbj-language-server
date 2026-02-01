package com.basis.bbj.intellij;

import com.intellij.lang.ASTNode;
import com.intellij.lang.ParserDefinition;
import com.intellij.lang.PsiBuilder;
import com.intellij.lang.PsiParser;
import com.intellij.lexer.Lexer;
import com.intellij.openapi.project.Project;
import com.intellij.psi.FileViewProvider;
import com.intellij.psi.PsiElement;
import com.intellij.psi.PsiFile;
import com.intellij.psi.tree.IElementType;
import com.intellij.psi.tree.IFileElementType;
import com.intellij.psi.tree.TokenSet;
import org.jetbrains.annotations.NotNull;

/**
 * Minimal parser definition for BBj files.
 *
 * Provides word-level tokenization so that IntelliJ's {@code PsiFile.findElementAt()}
 * returns individual word elements rather than one element spanning the entire file.
 * This is required for correct Cmd/Ctrl+hover highlighting with LSP4IJ — without it,
 * the go-to-definition underline covers the whole file instead of just the symbol.
 *
 * Syntax highlighting remains handled by the TextMate engine; this parser only
 * exists to produce properly-sized PsiElements for navigation features.
 */
public final class BbjParserDefinition implements ParserDefinition {

    private static final IFileElementType FILE_ELEMENT_TYPE =
            new IFileElementType(BbjLanguage.INSTANCE);

    @Override
    public @NotNull Lexer createLexer(Project project) {
        return new BbjWordLexer();
    }

    @Override
    public @NotNull PsiParser createParser(Project project) {
        return (IElementType root, PsiBuilder builder) -> {
            PsiBuilder.Marker rootMarker = builder.mark();
            while (!builder.eof()) {
                builder.advanceLexer();
            }
            rootMarker.done(root);
            return builder.getTreeBuilt();
        };
    }

    @Override
    public @NotNull IFileElementType getFileNodeType() {
        return FILE_ELEMENT_TYPE;
    }

    @Override
    public @NotNull TokenSet getCommentTokens() {
        return TokenSet.EMPTY;
    }

    @Override
    public @NotNull TokenSet getStringLiteralElements() {
        return TokenSet.EMPTY;
    }

    @Override
    public @NotNull PsiElement createElement(@NotNull ASTNode node) {
        return new BbjPsiElement(node);
    }

    @Override
    public @NotNull PsiFile createFile(@NotNull FileViewProvider viewProvider) {
        return new BbjFile(viewProvider);
    }

    @Override
    public @NotNull SpaceRequirements spaceExistenceTypeBetweenTokens(ASTNode left, ASTNode right) {
        return SpaceRequirements.MAY;
    }
}
