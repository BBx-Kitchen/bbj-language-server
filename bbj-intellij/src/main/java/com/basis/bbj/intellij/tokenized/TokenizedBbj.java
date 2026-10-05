package com.basis.bbj.intellij.tokenized;

import com.intellij.openapi.vfs.VirtualFile;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import java.io.IOException;
import java.io.InputStream;
import java.nio.ByteBuffer;
import java.nio.channels.SeekableByteChannel;
import java.nio.file.AccessDeniedException;
import java.nio.file.FileSystemException;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.NoSuchFileException;
import java.nio.file.OpenOption;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.Arrays;
import java.util.Set;

/**
 * Detection of tokenized (compiled, binary) BBj programs. A tokenized program starts with the
 * magic bytes {@link #MAGIC}; nothing else about the file is read, so a huge or odd file never
 * costs more than seven bytes of input.
 */
public final class TokenizedBbj {

    /** The ASCII text {@code <<bbj>>} that opens every tokenized BBj program. */
    static final byte[] MAGIC = {0x3c, 0x3c, 0x62, 0x62, 0x6a, 0x3e, 0x3e};

    /** What {@link #probe} found at a path. */
    public enum Kind {
        TOKENIZED, NOT_TOKENIZED, NOT_A_FILE, MISSING, UNREADABLE
    }

    /**
     * The outcome of {@link #probe}: the kind, the symlink-resolved path (only for the two kinds
     * that read the file) and a human-readable cause (only for {@link Kind#UNREADABLE}).
     */
    public record Probe(@NotNull Kind kind, @Nullable Path resolvedPath, @Nullable String detail) {
    }

    private TokenizedBbj() {
    }

    /** True when {@code bytes} holds at least the seven magic bytes at its start. */
    public static boolean isTokenizedHeader(byte @NotNull [] bytes) {
        if (bytes.length < MAGIC.length) {
            return false;
        }
        for (int i = 0; i < MAGIC.length; i++) {
            if (bytes[i] != MAGIC[i]) {
                return false;
            }
        }
        return true;
    }

    /**
     * Classifies {@code file} without ever blocking on it: the path is resolved first, only a
     * regular file is opened (a FIFO or device is reported as {@link Kind#NOT_A_FILE}), the open
     * refuses to follow a link, and at most {@link #MAGIC} length bytes are read.
     */
    public static @NotNull Probe probe(@NotNull Path file) {
        Path real;
        try {
            real = file.toRealPath();
        } catch (NoSuchFileException e) {
            return new Probe(Kind.MISSING, null, null);
        } catch (IOException e) {
            return new Probe(Kind.UNREADABLE, null, describe(e));
        }

        try {
            BasicFileAttributes attributes =
                    Files.readAttributes(real, BasicFileAttributes.class, LinkOption.NOFOLLOW_LINKS);
            if (!attributes.isRegularFile()) {
                return new Probe(Kind.NOT_A_FILE, null, null);
            }
        } catch (NoSuchFileException e) {
            return new Probe(Kind.MISSING, null, null);
        } catch (IOException e) {
            return new Probe(Kind.UNREADABLE, null, describe(e));
        }

        byte[] head;
        try (SeekableByteChannel channel =
                     Files.newByteChannel(real, Set.<OpenOption>of(StandardOpenOption.READ, LinkOption.NOFOLLOW_LINKS))) {
            ByteBuffer buffer = ByteBuffer.allocate(MAGIC.length);
            while (buffer.hasRemaining() && channel.read(buffer) >= 0) {
                // keep reading until the buffer is full or the file ends
            }
            head = Arrays.copyOf(buffer.array(), buffer.position());
        } catch (IOException e) {
            return new Probe(Kind.UNREADABLE, null, describe(e));
        }

        return new Probe(isTokenizedHeader(head) ? Kind.TOKENIZED : Kind.NOT_TOKENIZED, real, null);
    }

    /**
     * The user-facing reason a probed file cannot be decompiled, or {@code null} when it is a
     * tokenized program and decompiling can go ahead.
     */
    public static @Nullable String refusal(@NotNull Probe probe, @NotNull String displayName) {
        switch (probe.kind()) {
            case TOKENIZED:
                return null;
            case NOT_TOKENIZED:
                return "\"" + displayName + "\" is not a tokenized BBj program, so there is nothing to decompile.";
            case MISSING:
                return "\"" + displayName + "\" was not found, so there is nothing to decompile.";
            case NOT_A_FILE:
                return "\"" + displayName + "\" is not a regular file, so there is nothing to decompile.";
            case UNREADABLE:
            default:
                return "Could not read \"" + displayName + "\": "
                        + (probe.detail() == null || probe.detail().isEmpty() ? "unknown error" : probe.detail());
        }
    }

    /**
     * Whether the bytes behind {@code file} are a tokenized program. Reads only the first seven
     * bytes through the virtual file system, never the whole file, and never the editor's
     * document, which is garbled text for a binary program.
     */
    public static boolean readsTokenized(@NotNull VirtualFile file) {
        if (!file.isValid() || file.isDirectory()) {
            return false;
        }
        try (InputStream in = file.getInputStream()) {
            return isTokenizedHeader(in.readNBytes(MAGIC.length));
        } catch (IOException e) {
            return false;
        }
    }

    /** A non-empty cause for an I/O failure, without leaking the bare path the JDK puts in some messages. */
    static @NotNull String describe(@NotNull IOException e) {
        if (e instanceof AccessDeniedException) {
            return "permission denied";
        }
        if (e instanceof FileSystemException) {
            String reason = ((FileSystemException) e).getReason();
            if (reason != null && !reason.isEmpty()) {
                return reason;
            }
        }
        String message = e.getMessage();
        return message == null || message.isEmpty() ? e.getClass().getSimpleName() : message;
    }
}
