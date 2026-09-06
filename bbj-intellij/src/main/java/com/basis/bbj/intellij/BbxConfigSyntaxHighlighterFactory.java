package com.basis.bbj.intellij;

import com.intellij.openapi.fileTypes.PlainSyntaxHighlighter;
import com.intellij.openapi.fileTypes.SyntaxHighlighter;
import com.intellij.openapi.fileTypes.SyntaxHighlighterFactory;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.util.registry.Registry;
import com.intellij.openapi.vfs.VirtualFile;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;
import org.jetbrains.plugins.textmate.TextMateService;
import org.jetbrains.plugins.textmate.language.TextMateLanguageDescriptor;
import org.jetbrains.plugins.textmate.language.syntax.highlighting.TextMateHighlighter;
import org.jetbrains.plugins.textmate.language.syntax.lexer.TextMateHighlightingLexer;

/**
 * Carries the bbx TextMate grammar to a config file regardless of the file's actual name. The
 * stock {@code TextMateSyntaxHighlighterFactory} resolves its grammar via {@code
 * TextMateService.getLanguageDescriptorByFileName} called with the OPENED FILE'S NAME, so a
 * custom-named config file would fall back to plain text there. This factory looks the grammar up
 * by a fixed default config file name instead, so the lookup always finds the bbx grammar
 * regardless of what the open file is actually called.
 */
public final class BbxConfigSyntaxHighlighterFactory extends SyntaxHighlighterFactory {

    /**
     * One of the default config filenames the plugin's own TextMate bundle lists for the bbx
     * grammar (see {@code textmate/bbj-bundle/package.json}). A compile-time constant on purpose:
     * the whole point of this factory is to never depend on the opened file's actual name.
     */
    private static final String DEFAULT_CONFIG_FILE_NAME = "config.bbx";

    private static final String LINE_HIGHLIGHTING_LIMIT_REGISTRY_KEY = "textmate.line.highlighting.limit";

    @NotNull
    @Override
    public SyntaxHighlighter getSyntaxHighlighter(@Nullable Project project, @Nullable VirtualFile ignoredFile) {
        TextMateService service = TextMateService.getInstance();
        TextMateLanguageDescriptor descriptor = service == null
                ? null
                : service.getLanguageDescriptorByFileName(DEFAULT_CONFIG_FILE_NAME);
        if (descriptor == null) {
            return new PlainSyntaxHighlighter();
        }
        int lineHighlightingLimit = Registry.get(LINE_HIGHLIGHTING_LIMIT_REGISTRY_KEY).asInteger();
        return new TextMateHighlighter(new TextMateHighlightingLexer(descriptor, lineHighlightingLimit));
    }
}
