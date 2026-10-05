package com.basis.bbj.intellij.tokenized;

import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * The bbjlst core: argument list, executable lookup, naming, and the whole decompile-and-replace
 * flow against the real tool when this machine has a BBj installation.
 */
class BbjLstCommandTest {

    private static final Path REAL_BBJLST = Paths.get("/opt/bbx/bin/bbjlst");
    private static final Path REAL_BBJCPL = Paths.get("/opt/bbx/bin/bbjcpl");

    @TempDir
    Path temp;

    @ParameterizedTest
    @CsvSource({"a.bbj,false", "a.pub,false", "a,false", "a.lst,true"})
    void argvPutsTheFileLastAndAddsXlstOnlyForLst(String fileName, boolean xlst) {
        Path out = Paths.get("/work/out");
        List<String> argv = BbjLstCommand.argv(Paths.get("/bbx/bin/bbjlst"), out, Paths.get("/src", fileName));

        List<String> expected = xlst
                ? List.of("/bbx/bin/bbjlst", "-l", "-xlst", "-d" + out, "/src/" + fileName)
                : List.of("/bbx/bin/bbjlst", "-l", "-d" + out, "/src/" + fileName);
        assertEquals(expected, argv);
    }

    @Test
    void argvKeepsAnOutputDirectoryWithASpaceInOneElement() {
        Path out = Paths.get("/work dir/out dir");
        List<String> argv = BbjLstCommand.argv(Paths.get("/bbx/bin/bbjlst"), out, Paths.get("/my src/a b.bbj"));

        assertEquals(List.of("/bbx/bin/bbjlst", "-l", "-d/work dir/out dir", "/my src/a b.bbj"), argv);
    }

    @Test
    void theListingHasTheInputsOwnFileName() {
        assertEquals(Paths.get("/out/a.pub"), BbjLstCommand.listingFor(Paths.get("/out"), Paths.get("/src/a.pub")));
        assertEquals(Paths.get("/out/a"), BbjLstCommand.listingFor(Paths.get("/out"), Paths.get("/src/a")));
    }

    @ParameterizedTest
    @CsvSource({"prog.bbj,prog.bbj", "prog.pub,prog.bbj", "prog,prog.bbj", "a.b.lst,a.b.bbj", ".bbj,program.bbj"})
    void theReadOnlyCopyIsNamedAfterTheInputWithABbjExtension(String input, String expected) {
        assertEquals(expected, BbjLstCommand.readOnlyName(input));
    }

    @Test
    void resolveExecutableFindsAnExecutableBbjlstUnderBin() throws IOException {
        Path bin = Files.createDirectories(temp.resolve("home/bin"));
        Path exe = executableFile(bin.resolve("bbjlst"));

        assertEquals(exe.toAbsolutePath(), BbjLstCommand.resolveExecutable(temp.resolve("home").toString(), false));
    }

    @Test
    void resolveExecutableIsNullWhenBbjlstIsMissingOrNotExecutable() throws IOException {
        Path home = temp.resolve("home");
        Path bin = Files.createDirectories(home.resolve("bin"));
        assertNull(BbjLstCommand.resolveExecutable(home.toString(), false));

        Files.writeString(bin.resolve("bbjlst"), "#!/bin/sh\n");
        bin.resolve("bbjlst").toFile().setExecutable(false);
        Assumptions.assumeFalse(Files.isExecutable(bin.resolve("bbjlst")), "files are executable by default here");
        assertNull(BbjLstCommand.resolveExecutable(home.toString(), false));
    }

    @Test
    void resolveExecutableIsNullForNoHome() {
        assertNull(BbjLstCommand.resolveExecutable(null, false));
        assertNull(BbjLstCommand.resolveExecutable("", false));
        assertNull(BbjLstCommand.resolveExecutable("   ", false));
    }

    @Test
    void resolveExecutableUsesTheExeNameOnWindows() throws IOException {
        Path home = temp.resolve("home");
        Path bin = Files.createDirectories(home.resolve("bin"));
        Path exe = executableFile(bin.resolve("bbjlst.exe"));

        assertEquals(exe.toAbsolutePath(), BbjLstCommand.resolveExecutable(home.toString(), true));
        assertNull(BbjLstCommand.resolveExecutable(home.toString(), false));
    }

    @Test
    void decompilingATokenizedProgramWithTheRealBbjlstReplacesItAndTouchesNothingElse() throws Exception {
        Assumptions.assumeTrue(Files.isExecutable(REAL_BBJLST) && Files.isExecutable(REAL_BBJCPL),
                "needs a BBj installation with bbjlst and bbjcpl");

        Path work = Files.createDirectories(temp.resolve("work"));
        Path program = work.resolve("prog.bbj");
        Files.copy(tokenize("print \"SOURCE-MARKER\"\nend\n"), program);
        byte[] siblingBytes = "plain sibling\n".getBytes(StandardCharsets.UTF_8);
        Path sibling = work.resolve("prog");
        Files.write(sibling, siblingBytes);
        assertTrue(TokenizedBbj.isTokenizedHeader(Files.readAllBytes(program)), "the sample must start out tokenized");

        Path privateParent = Files.createDirectories(temp.resolve("private"));
        Path dir = BbjLstCommand.decompileToPrivateDir(
                REAL_BBJLST, program, processRunner(), 60_000, privateParent);
        BbjLstCommand.replaceInPlace(program, BbjLstCommand.listingFor(dir, program));

        byte[] after = Files.readAllBytes(program);
        assertFalse(TokenizedBbj.isTokenizedHeader(after), "the program must be source after the replace");
        assertTrue(new String(after, StandardCharsets.ISO_8859_1).contains("SOURCE-MARKER"),
                "the source must contain the original PRINT text");
        assertArrayEquals(siblingBytes, Files.readAllBytes(sibling), "the same-base sibling must be untouched");
        try (Stream<Path> names = Files.list(work)) {
            assertEquals(List.of("prog", "prog.bbj"), names.map(p -> p.getFileName().toString()).sorted().toList());
        }

        BbjLstCommand.deleteRecursively(dir);
        assertFalse(Files.exists(dir), "the private directory must be gone");
    }

    @Test
    void aRunnerFollowingTheOutputDirectoryRuleLeavesTheListingUnderTheReturnedDirectory() throws Exception {
        Path input = Files.writeString(temp.resolve("a.pub"), "tokenized stand-in");
        Path privateParent = Files.createDirectories(temp.resolve("private"));

        Path dir = BbjLstCommand.decompileToPrivateDir(
                Paths.get("/bbx/bin/bbjlst"), input, listingWriter("print 1\n".getBytes(StandardCharsets.UTF_8)),
                1_000, privateParent);

        assertEquals(privateParent, dir.getParent());
        assertTrue(dir.getFileName().toString().startsWith("bbj-decompiled-"));
        assertEquals("print 1\n", Files.readString(BbjLstCommand.listingFor(dir, input)));
    }

    @Test
    void aRunThatWritesNothingFailsWithItsCauseAndBbjlstsOutputAndLeavesNoDirectory() throws Exception {
        Path input = Files.writeString(temp.resolve("a.bbj"), "tokenized stand-in");
        Path privateParent = Files.createDirectories(temp.resolve("private"));
        BbjLstCommand.Runner silentFailure =
                (argv, timeout) -> new BbjLstCommand.Output(0, "Unable to open file\n", "", false);

        BbjLstCommand.DecompileException failure = assertThrows(BbjLstCommand.DecompileException.class,
                () -> BbjLstCommand.decompileToPrivateDir(
                        Paths.get("/bbx/bin/bbjlst"), input, silentFailure, 1_000, privateParent));

        assertTrue(failure.getMessage().contains("wrote no decompiled listing"), failure.getMessage());
        assertTrue(failure.getMessage().contains("Unable to open file"), failure.getMessage());
        assertNoPrivateDirectory(privateParent);
    }

    @Test
    void anEmptyListingFailsAndLeavesNoDirectory() throws Exception {
        Path input = Files.writeString(temp.resolve("a.bbj"), "tokenized stand-in");
        Path privateParent = Files.createDirectories(temp.resolve("private"));

        BbjLstCommand.DecompileException failure = assertThrows(BbjLstCommand.DecompileException.class,
                () -> BbjLstCommand.decompileToPrivateDir(
                        Paths.get("/bbx/bin/bbjlst"), input, listingWriter(new byte[0]), 1_000, privateParent));

        assertTrue(failure.getMessage().contains("wrote an empty listing"), failure.getMessage());
        assertNoPrivateDirectory(privateParent);
    }

    @Test
    void aListingThatIsStillTokenizedFailsAndLeavesNoDirectory() throws Exception {
        Path input = Files.writeString(temp.resolve("a.bbj"), "tokenized stand-in");
        Path privateParent = Files.createDirectories(temp.resolve("private"));
        byte[] stillTokenized = "<<bbj>>\u0084 more".getBytes(StandardCharsets.ISO_8859_1);

        BbjLstCommand.DecompileException failure = assertThrows(BbjLstCommand.DecompileException.class,
                () -> BbjLstCommand.decompileToPrivateDir(
                        Paths.get("/bbx/bin/bbjlst"), input, listingWriter(stillTokenized), 1_000, privateParent));

        assertTrue(failure.getMessage().contains("the listing is still a tokenized program"), failure.getMessage());
        assertNoPrivateDirectory(privateParent);
    }

    @Test
    void aRunThatTimesOutFailsWithTheLimitAndLeavesNoDirectory() throws Exception {
        Path input = Files.writeString(temp.resolve("a.bbj"), "tokenized stand-in");
        Path privateParent = Files.createDirectories(temp.resolve("private"));
        BbjLstCommand.Runner hangs = (argv, timeout) -> new BbjLstCommand.Output(-1, "", "", true);

        BbjLstCommand.DecompileException failure = assertThrows(BbjLstCommand.DecompileException.class,
                () -> BbjLstCommand.decompileToPrivateDir(
                        Paths.get("/bbx/bin/bbjlst"), input, hangs, 60_000, privateParent));

        assertTrue(failure.getMessage().contains("did not finish within 60 seconds"), failure.getMessage());
        assertNoPrivateDirectory(privateParent);
    }

    @Test
    void aRunThatCannotBeStartedFailsWithItsCauseAndLeavesNoDirectory() throws Exception {
        Path input = Files.writeString(temp.resolve("a.bbj"), "tokenized stand-in");
        Path privateParent = Files.createDirectories(temp.resolve("private"));
        BbjLstCommand.Runner cannotStart = (argv, timeout) -> {
            throw new IOException("Cannot run program");
        };

        BbjLstCommand.DecompileException failure = assertThrows(BbjLstCommand.DecompileException.class,
                () -> BbjLstCommand.decompileToPrivateDir(
                        Paths.get("/bbx/bin/bbjlst"), input, cannotStart, 1_000, privateParent));

        assertTrue(failure.getMessage().contains("Cannot run program"), failure.getMessage());
        assertNoPrivateDirectory(privateParent);
    }

    @Test
    void aFailedMoveLeavesTheTargetUnchangedAndNoStagedFile() throws Exception {
        Assumptions.assumeFalse(System.getProperty("os.name").toLowerCase().contains("win"),
                "directory permissions are POSIX only");
        Assumptions.assumeFalse("root".equals(System.getProperty("user.name")),
                "root ignores directory permissions");
        Path locked = Files.createDirectories(temp.resolve("locked"));
        Path target = Files.writeString(locked.resolve("prog.bbj"), "original");
        Path listing = Files.writeString(temp.resolve("listing"), "replacement");
        assertTrue(locked.toFile().setWritable(false), "could not lock the directory");
        try {
            assertThrows(IOException.class, () -> BbjLstCommand.replaceInPlace(target, listing));
        } finally {
            locked.toFile().setWritable(true);
        }

        assertEquals("original", Files.readString(target));
        try (Stream<Path> names = Files.list(locked)) {
            assertEquals(List.of("prog.bbj"), names.map(p -> p.getFileName().toString()).toList());
        }
    }

    @Test
    void replaceInPlaceKeepsTheTargetsPermissionsAndLeavesNoStagedFile() throws Exception {
        Assumptions.assumeFalse(System.getProperty("os.name").toLowerCase().contains("win"),
                "permission bits are POSIX only");
        Path target = Files.writeString(temp.resolve("prog.bbj"), "original");
        Files.setPosixFilePermissions(target, java.nio.file.attribute.PosixFilePermissions.fromString("rwxr-x---"));
        Path listing = Files.writeString(temp.resolve("listing"), "replacement");

        BbjLstCommand.replaceInPlace(target, listing);

        assertEquals("replacement", Files.readString(target));
        assertEquals("rwxr-x---", java.nio.file.attribute.PosixFilePermissions.toString(
                Files.getPosixFilePermissions(target)));
        try (Stream<Path> names = Files.list(temp)) {
            assertEquals(List.of("listing", "prog.bbj"),
                    names.map(p -> p.getFileName().toString()).sorted().toList());
        }
    }

    /** A runner that follows bbjlst's output rule: the listing goes to the -d directory under the input's name. */
    private static BbjLstCommand.Runner listingWriter(byte[] content) {
        return (argv, timeoutMillis) -> {
            Path outputDir = null;
            for (String element : argv) {
                if (element.startsWith("-d")) {
                    outputDir = Paths.get(element.substring(2));
                }
            }
            Path input = Paths.get(argv.get(argv.size() - 1));
            Files.write(outputDir.resolve(input.getFileName()), content);
            return new BbjLstCommand.Output(0, "", "", false);
        };
    }

    private static void assertNoPrivateDirectory(Path parent) throws IOException {
        try (Stream<Path> entries = Files.list(parent)) {
            assertEquals(List.of(), entries.map(p -> p.getFileName().toString()).toList(),
                    "a failed run must leave no bbj-decompiled- directory behind");
        }
    }

    private static Path executableFile(Path path) throws IOException {
        Files.writeString(path, "#!/bin/sh\n");
        assertTrue(path.toFile().setExecutable(true), "could not mark " + path + " executable");
        return path;
    }

    /** A tokenized copy of {@code source}, produced by the real compiler into a scratch directory. */
    private Path tokenize(String source) throws IOException, InterruptedException {
        Path src = Files.createDirectories(temp.resolve("src")).resolve("sample.bbj");
        Files.writeString(src, source);
        Path out = Files.createDirectories(temp.resolve("tokenized"));
        BbjLstCommand.Output result = processRunner().run(
                List.of(REAL_BBJCPL.toString(), "-d" + out, src.toString()), 60_000);
        Path tokenized = out.resolve("sample.bbj");
        assertTrue(Files.isRegularFile(tokenized), "bbjcpl wrote no tokenized program: " + result);
        return tokenized;
    }

    /** Runs a real process, capturing its output in files so a chatty tool can never fill a pipe. */
    private BbjLstCommand.Runner processRunner() {
        return (argv, timeoutMillis) -> {
            Path stdout = Files.createTempFile(temp, "stdout", ".txt");
            Path stderr = Files.createTempFile(temp, "stderr", ".txt");
            Process process = new ProcessBuilder(argv)
                    .redirectOutput(stdout.toFile())
                    .redirectError(stderr.toFile())
                    .start();
            if (!process.waitFor(timeoutMillis, TimeUnit.MILLISECONDS)) {
                process.destroyForcibly();
                return new BbjLstCommand.Output(-1, "", "", true);
            }
            return new BbjLstCommand.Output(process.exitValue(),
                    Files.readString(stdout, StandardCharsets.ISO_8859_1),
                    Files.readString(stderr, StandardCharsets.ISO_8859_1), false);
        };
    }
}
