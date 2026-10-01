package com.basis.bbj.intellij.lsp;

import com.intellij.psi.PsiFile;
import com.redhat.devtools.lsp4ij.client.features.LSPFormattingFeature;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Proxy;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Proves the formatting feature the factory installs refuses LSP formatting while the factory's
 * formatting switch is off: all four formatting checks answer false, and they do so without ever
 * calling into LSP4IJ or reading the file. The file handed to the checks is a proxy whose every
 * method throws, so any attempt by the vendor superclass to touch it fails the test.
 */
class BbjLspFormattingSwitchTest {

    private static PsiFile throwingFile() {
        return (PsiFile) Proxy.newProxyInstance(
            PsiFile.class.getClassLoader(),
            new Class<?>[] { PsiFile.class },
            (proxy, method, args) -> {
                throw new AssertionError("the formatting checks must not touch the file, but called "
                    + method.getName());
            });
    }

    @Test
    void theInstalledFormattingFeatureIsOurSubclassAndIsStable() {
        BbjLanguageServerFactory factory = new BbjLanguageServerFactory();

        LSPFormattingFeature first = factory.createClientFeatures().getFormattingFeature();
        assertTrue(LSPFormattingFeature.class.isAssignableFrom(first.getClass()),
            "the installed formatting feature must be an LSPFormattingFeature");
        assertNotEquals(LSPFormattingFeature.class, first.getClass(),
            "the installed formatting feature must be the gated subclass, not the vendor default");

        var features = factory.createClientFeatures();
        assertSame(features.getFormattingFeature(), features.getFormattingFeature(),
            "the formatting feature must be installed once and returned on every call");
    }

    @Test
    void everyFormattingCheckAnswersFalseWithoutTouchingTheFile() {
        LSPFormattingFeature feature = new BbjLanguageServerFactory()
            .createClientFeatures().getFormattingFeature();
        PsiFile file = throwingFile();

        assertFalse(feature.isEnabled(file), "isEnabled must answer false while the switch is off");
        assertFalse(feature.isSupported(file), "isSupported must answer false while the switch is off");
        assertFalse(feature.isFormattingSupported(file),
            "isFormattingSupported must answer false while the switch is off");
        assertFalse(feature.isRangeFormattingSupported(file),
            "isRangeFormattingSupported must answer false while the switch is off");
    }
}
