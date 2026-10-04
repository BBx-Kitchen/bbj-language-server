package com.basis.bbj.intellij.lsp;

import com.intellij.psi.PsiFile;
import com.redhat.devtools.lsp4ij.client.features.LSPFormattingFeature;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Proves the factory installs its own gated formatting feature, once, and that this feature
 * declares its own override of every one of the four formatting checks, so the factory's
 * formatting switch reaches Reformat Code, range formatting and Actions on Save alike. With the
 * switch on, each check defers to LSP4IJ, which reads the file and the server's capabilities; what
 * the checks answer for a real file is therefore left to the hands-on evaluation, and the source
 * guard in {@link Lsp4ijOverrideSiteSourceGuardTest} pins the switch's value and its short-circuits.
 */
class BbjLspFormattingSwitchTest {

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
    void theGatedSubclassOverridesAllFourChecks() throws NoSuchMethodException {
        Class<?> installed = new BbjLanguageServerFactory()
            .createClientFeatures().getFormattingFeature().getClass();

        for (String name : new String[] {
                "isEnabled", "isSupported", "isFormattingSupported", "isRangeFormattingSupported"}) {
            Method method = installed.getDeclaredMethod(name, PsiFile.class);
            assertEquals(boolean.class, method.getReturnType(),
                name + " must be declared by the gated subclass and answer a boolean");
        }
    }
}
