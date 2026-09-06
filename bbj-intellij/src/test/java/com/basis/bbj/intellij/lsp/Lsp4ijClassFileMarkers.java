package com.basis.bbj.intellij.lsp;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.fail;

/**
 * Reads a class file directly off the classpath and answers whether a given annotation
 * descriptor is referenced anywhere in its constant pool -- by the class itself or by one of its
 * members. Reflection cannot answer this for a class-retention annotation such as
 * {@code org.jetbrains.annotations.ApiStatus.Experimental}: {@code Class.isAnnotationPresent}
 * only sees {@code RuntimeVisibleAnnotations}, so it reports {@code false} whether or not the
 * marker is there. Parsing the constant pool is the way to observe a class-retention marker
 * without shelling out to an external tool such as {@code javap}.
 */
final class Lsp4ijClassFileMarkers {

    /** The class-file descriptor for {@code org.jetbrains.annotations.ApiStatus.Experimental}. */
    static final String EXPERIMENTAL_DESCRIPTOR = "Lorg/jetbrains/annotations/ApiStatus$Experimental;";

    private Lsp4ijClassFileMarkers() {}

    /** Reads the full bytes of {@code type}'s own class file off the classpath. */
    static byte[] classBytes(Class<?> type) {
        String resourceName = "/" + type.getName().replace('.', '/') + ".class";
        try (InputStream in = type.getResourceAsStream(resourceName)) {
            if (in == null) {
                fail("Class file resource not found for " + type.getName() + " at " + resourceName);
            }
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buffer = new byte[8192];
            int read;
            while ((read = in.read(buffer)) != -1) {
                out.write(buffer, 0, read);
            }
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOExceptionForTest(type, e);
        }
    }

    private static final class UncheckedIOExceptionForTest extends RuntimeException {
        UncheckedIOExceptionForTest(Class<?> type, IOException cause) {
            super("Failed to read class file bytes for " + type.getName(), cause);
        }
    }

    /**
     * Walks the constant pool of a parsed class file and returns the text of every {@code
     * CONSTANT_Utf8} entry. Handles every constant-pool tag the JVM spec defines so a tag this
     * method does not recognise fails loudly instead of silently desynchronising the walk and
     * mis-parsing every entry after it.
     */
    static Set<String> constantPoolStrings(byte[] classFile) {
        Set<String> utf8Entries = new HashSet<>();
        int offset = 8; // magic(4) + minor_version(2) + major_version(2)
        int constantPoolCount = readUnsignedShort(classFile, offset);
        offset += 2;
        // Constant pool entries are indexed 1..constantPoolCount-1 (index 0 is unused).
        for (int index = 1; index < constantPoolCount; index++) {
            int tag = classFile[offset] & 0xFF;
            offset += 1;
            switch (tag) {
                case 1: { // CONSTANT_Utf8: 2 length bytes + that many bytes
                    int length = readUnsignedShort(classFile, offset);
                    offset += 2;
                    utf8Entries.add(new String(classFile, offset, length, StandardCharsets.UTF_8));
                    offset += length;
                    break;
                }
                case 3:  // CONSTANT_Integer: 4 bytes
                case 4:  // CONSTANT_Float: 4 bytes
                    offset += 4;
                    break;
                case 5:  // CONSTANT_Long: 8 bytes, consumes an extra pool slot
                case 6:  // CONSTANT_Double: 8 bytes, consumes an extra pool slot
                    offset += 8;
                    index++;
                    break;
                case 7:  // CONSTANT_Class: 2 bytes
                case 8:  // CONSTANT_String: 2 bytes
                case 16: // CONSTANT_MethodType: 2 bytes
                case 19: // CONSTANT_Module: 2 bytes
                case 20: // CONSTANT_Package: 2 bytes
                    offset += 2;
                    break;
                case 9:  // CONSTANT_Fieldref: 4 bytes
                case 10: // CONSTANT_Methodref: 4 bytes
                case 11: // CONSTANT_InterfaceMethodref: 4 bytes
                case 12: // CONSTANT_NameAndType: 4 bytes
                case 17: // CONSTANT_Dynamic: 4 bytes
                case 18: // CONSTANT_InvokeDynamic: 4 bytes
                    offset += 4;
                    break;
                case 15: // CONSTANT_MethodHandle: 3 bytes
                    offset += 3;
                    break;
                default:
                    fail("Unknown constant-pool tag " + tag + " at entry index " + index
                        + " -- the constant-pool walk cannot continue safely from here");
            }
        }
        return utf8Entries;
    }

    private static int readUnsignedShort(byte[] data, int offset) {
        return ((data[offset] & 0xFF) << 8) | (data[offset + 1] & 0xFF);
    }

    /**
     * Whether {@code descriptor} is referenced anywhere in {@code type}'s own class file -- by
     * the class itself or by one of its members. This is a coarser claim than "the class is
     * annotated", but it is stable: when a vendor graduates an experimental API and removes the
     * marker from the class and every member, the descriptor disappears from the constant pool
     * entirely, which is exactly the re-audit trigger this helper exists to raise.
     */
    static boolean referencesAnnotation(Class<?> type, String descriptor) {
        return constantPoolStrings(classBytes(type)).contains(descriptor);
    }
}
