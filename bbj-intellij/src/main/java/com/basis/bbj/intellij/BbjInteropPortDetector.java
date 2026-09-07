package com.basis.bbj.intellij;

import org.jetbrains.annotations.Nullable;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Properties;

/**
 * Reads the java-interop port BBjServices actually publishes, {@code com.basis.languageServer.addr},
 * and turns it into a validated port with no throwing path for any input. Replaces the dead
 * {@code java.interop.port=} / {@code bridge.port=} substring match, which never matches a real
 * {@code BBj.properties} (#608). No {@code com.intellij} import — every method here is a plain
 * static, exercised by plain JUnit.
 */
public final class BbjInteropPortDetector {

    private BbjInteropPortDetector() {
    }

    /**
     * The only key BBjServices publishes for the java-interop address. Its value has the form
     * {@code host:port:enabled}, with the colons backslash-escaped on disk (standard
     * {@link java.util.Properties} escaping) — e.g. {@code localhost\:5008\:true}.
     */
    public static final String ADDR_KEY = "com.basis.languageServer.addr";

    /**
     * The language server's own default port. Reported whenever nothing is detected, and already
     * the Java default of {@code BbjSettings.State.javaInteropPort}.
     */
    public static final int DEFAULT_PORT = 5008;

    /**
     * Result of parsing {@link #ADDR_KEY}'s value. {@code port} is always {@link #DEFAULT_PORT}
     * when {@code detected} is false. {@code serviceDisabled} is meaningful only when
     * {@code detected} is true. A read failure and a genuinely absent key are deliberately
     * collapsed into the same not-detected result, since both produce the same user-visible
     * outcome — there is no separate {@code failed} flag here.
     */
    public record PortLookup(int port, boolean detected, boolean serviceDisabled) {
    }

    /** The shared not-detected result: the default port, not detected, service not reported disabled. */
    public static final PortLookup NOT_DETECTED = new PortLookup(DEFAULT_PORT, false, false);

    /**
     * Parses an already-unescaped {@code host:port:enabled} (or {@code host:port}) value. Null,
     * empty, or blank input returns {@link #NOT_DETECTED}. The value must split into exactly two
     * or three colon-separated segments; any other count is not detected. The second segment,
     * trimmed, must parse as an integer in 1-65535; a {@link NumberFormatException} or an
     * out-of-range value is not detected. When a third segment is present, {@code serviceDisabled}
     * is true exactly when that segment, trimmed, equals {@code false} ignoring case — anything
     * else leaves it false.
     *
     * <p>A still-escaped value (e.g. {@code localhost\:5008\:true}, backslashes not yet resolved
     * by {@link Properties#load}) fails the numeric check on its second "segment" and is therefore
     * reported not-detected rather than a wrong port — unescaping must happen before this method
     * is called.
     */
    public static PortLookup parseAddrValue(@Nullable String unescapedValue) {
        if (unescapedValue == null || unescapedValue.isBlank()) {
            return NOT_DETECTED;
        }
        String[] segments = unescapedValue.split(":", -1);
        if (segments.length != 2 && segments.length != 3) {
            return NOT_DETECTED;
        }
        int port;
        try {
            port = Integer.parseInt(segments[1].trim());
        } catch (NumberFormatException e) {
            return NOT_DETECTED;
        }
        if (port < 1 || port > 65535) {
            return NOT_DETECTED;
        }
        boolean serviceDisabled = segments.length == 3 && "false".equalsIgnoreCase(segments[2].trim());
        return new PortLookup(port, true, serviceDisabled);
    }

    /**
     * Resolves {@code <bbjHomePath>/cfg/BBj.properties}, the single place both the reader and the
     * cache's stamp function build this path, so it is built in exactly one place.
     */
    public static Path propertiesPathFor(String bbjHomePath) {
        return Path.of(bbjHomePath, "cfg", "BBj.properties");
    }

    /**
     * Reads {@code propertiesFile} through {@link Properties#load}, which performs the documented
     * unescaping BBjServices' own writer produced, resolves {@link #ADDR_KEY} — a repeated key
     * resolves to its last occurrence, per {@link Properties}' own documented contract — and
     * parses the result with {@link #parseAddrValue(String)}. Returns {@link #NOT_DETECTED} when
     * {@code propertiesFile} is null or not a regular file, and never throws: any {@link IOException}
     * or unchecked exception is caught and turned into {@link #NOT_DETECTED}.
     */
    public static PortLookup readFrom(@Nullable Path propertiesFile) {
        if (propertiesFile == null || !Files.isRegularFile(propertiesFile)) {
            return NOT_DETECTED;
        }
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(Files.newInputStream(propertiesFile), StandardCharsets.UTF_8))) {
            Properties properties = new Properties();
            properties.load(reader);
            String value = properties.getProperty(ADDR_KEY);
            return parseAddrValue(value);
        } catch (IOException | RuntimeException e) {
            return NOT_DETECTED;
        }
    }

    /**
     * Resolves the java-interop port for the BBj installation at {@code bbjHomePath}. A null,
     * empty, or blank home returns {@link #NOT_DETECTED} without touching the filesystem;
     * otherwise delegates to {@link #readFrom(Path)} over {@link #propertiesPathFor(String)}.
     */
    public static PortLookup lookup(@Nullable String bbjHomePath) {
        if (bbjHomePath == null || bbjHomePath.isBlank()) {
            return NOT_DETECTED;
        }
        return readFrom(propertiesPathFor(bbjHomePath));
    }
}
