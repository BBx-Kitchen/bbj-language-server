package com.basis.bbj.intellij.interop;

import org.eclipse.lsp4j.jsonrpc.Launcher;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * End-to-end coverage of {@link InteropProbeClient}'s three outcomes against real local sockets
 * (#587). Each case stands up a throwaway server on an ephemeral port (port 0) and shuts it down
 * in {@link #tearDown()}, so no test leaks a listener across runs.
 */
class InteropProbeClientTest {

    private static final int CONNECT_TIMEOUT_MS = 300;
    private static final int RESPONSE_TIMEOUT_MS = 300;

    /** Marker interface -- the throwaway "real peer" server has nothing to call on the probe. */
    private interface NoRemoteMethods {
    }

    private ServerSocket serverSocket;
    private ExecutorService serverExecutor;

    @AfterEach
    void tearDown() throws IOException {
        if (serverExecutor != null) {
            serverExecutor.shutdownNow();
        }
        if (serverSocket != null && !serverSocket.isClosed()) {
            serverSocket.close();
        }
    }

    @Test
    void realPeerClassifiesAsConfirmed() throws IOException {
        serverSocket = new ServerSocket(0);
        int port = serverSocket.getLocalPort();
        serverExecutor = Executors.newSingleThreadExecutor();
        serverExecutor.submit(() -> {
            try (Socket peer = serverSocket.accept()) {
                InteropProbeEndpoint localService = new InteropProbeEndpoint() {
                    @Override
                    public CompletableFuture<List<PackageName>> getTopLevelPackages() {
                        PackageName name = new PackageName();
                        name.packageName = "java.lang";
                        return CompletableFuture.completedFuture(List.of(name));
                    }
                };
                Launcher<NoRemoteMethods> launcher = new Launcher.Builder<NoRemoteMethods>()
                        .setLocalService(localService)
                        .setRemoteInterface(NoRemoteMethods.class)
                        .setInput(peer.getInputStream())
                        .setOutput(peer.getOutputStream())
                        .create();
                launcher.startListening().get();
            } catch (Exception ignored) {
                // socket closed by the client disconnecting, or by tearDown()
            }
        });

        InteropProbeClient.Verdict verdict =
                InteropProbeClient.probe("localhost", port, CONNECT_TIMEOUT_MS, RESPONSE_TIMEOUT_MS);

        assertEquals(InteropProbeClient.Verdict.CONFIRMED, verdict);
    }

    @Test
    void silentSquatterClassifiesAsWrongPeerWithinResponseBudget() throws IOException {
        serverSocket = new ServerSocket(0);
        int port = serverSocket.getLocalPort();
        serverExecutor = Executors.newSingleThreadExecutor();
        serverExecutor.submit(() -> {
            try (Socket peer = serverSocket.accept()) {
                // Accept the connection and never reply -- the squatter case (#587).
                Thread.sleep(RESPONSE_TIMEOUT_MS * 10L);
            } catch (Exception ignored) {
                // socket closed by the client disconnecting, or by tearDown()
            }
        });

        long start = System.currentTimeMillis();
        InteropProbeClient.Verdict verdict =
                InteropProbeClient.probe("localhost", port, CONNECT_TIMEOUT_MS, RESPONSE_TIMEOUT_MS);
        long elapsed = System.currentTimeMillis() - start;

        assertEquals(InteropProbeClient.Verdict.WRONG_PEER, verdict);
        assertTrue(elapsed < 2000L,
                "silent squatter must return within roughly the response budget, not hang; took "
                        + elapsed + "ms");
    }

    @Test
    void closedPortClassifiesAsUnreachable() throws IOException {
        ServerSocket throwaway = new ServerSocket(0);
        int port = throwaway.getLocalPort();
        throwaway.close();

        InteropProbeClient.Verdict verdict =
                InteropProbeClient.probe("localhost", port, CONNECT_TIMEOUT_MS, RESPONSE_TIMEOUT_MS);

        assertEquals(InteropProbeClient.Verdict.UNREACHABLE, verdict);
    }
}
