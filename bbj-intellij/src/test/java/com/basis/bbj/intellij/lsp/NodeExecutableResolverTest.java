package com.basis.bbj.intellij.lsp;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class NodeExecutableResolverTest {

    private static final NodeExecutableResolver.PathProbe NOTHING_ON_DISK =
            new NodeExecutableResolver.PathProbe() {
                @Override
                public boolean exists(String path) {
                    return false;
                }

                @Override
                public boolean isRegularFile(String path) {
                    return false;
                }

                @Override
                public boolean isExecutable(String path) {
                    return false;
                }
            };

    @Test
    void withNoCandidateAvailableTheResolverYieldsAnUnresolvedResultCarryingAnActionableMessage() {
        NodeExecutableResolver.Resolution result =
                NodeExecutableResolver.resolve(null, "", null, NOTHING_ON_DISK);

        assertFalse(result.isResolved());
        assertTrue(result.rejections().isEmpty());
        assertTrue(result.failureMessage().contains("Settings | Languages & Frameworks | BBj"));
    }
}
