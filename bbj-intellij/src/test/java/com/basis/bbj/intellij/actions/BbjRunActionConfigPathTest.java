package com.basis.bbj.intellij.actions;

import com.basis.bbj.intellij.config.ConfigPaths;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

/**
 * Behavioural coverage for {@link ConfigPaths#configPathArg(String)}, the helper
 * {@link BbjRunActionBase#getConfigPathArg()} delegates to. Pins the exact defect a folded todo
 * described: the run actions must never turn the EM Config sentinel into a literal {@code -c--}
 * argument the way the classpath sibling already refuses to for its own sentinel.
 */
class BbjRunActionConfigPathTest {

    @Test
    void aRealPathYieldsExactlyOneCPrefixedValue() {
        assertEquals("-c/opt/bbj/cfg/config.bbx", ConfigPaths.configPathArg("/opt/bbj/cfg/config.bbx"));
    }

    @Test
    void theSentinelYieldsNullRatherThanACPrefixedSentinel() {
        assertNull(ConfigPaths.configPathArg("--"));
    }

    @Test
    void nullYieldsNull() {
        assertNull(ConfigPaths.configPathArg(null));
    }

    @Test
    void emptyYieldsNull() {
        assertNull(ConfigPaths.configPathArg(""));
    }
}
