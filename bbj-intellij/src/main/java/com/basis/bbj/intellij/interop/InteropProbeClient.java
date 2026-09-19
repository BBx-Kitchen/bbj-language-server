package com.basis.bbj.intellij.interop;

import org.eclipse.lsp4j.jsonrpc.Launcher;
import org.eclipse.lsp4j.jsonrpc.ResponseErrorException;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.util.List;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

/**
 * Plain client-side LSP4J probe that confirms a java-interop peer's protocol identity (#587),
 * replacing a bare TCP handshake with a real {@code getTopLevelPackages} JSON-RPC round trip. This
 * class holds no IntelliJ platform import, so plain JUnit drives every branch directly -- the same
 * constraint {@link com.basis.bbj.intellij.lsp.NodeAvailability} already satisfies.
 */
public final class InteropProbeClient {

    private InteropProbeClient() {
    }

    /** The three outcomes one probe tick can reach. */
    public enum Verdict {
        /** The peer answered {@code getTopLevelPackages} with a valid, non-error result. */
        CONFIRMED,
        /** The peer accepted the TCP connection but did not answer the interop protocol. */
        WRONG_PEER,
        /** Nothing accepted the TCP connection at all. */
        UNREACHABLE
    }

    /**
     * Probes {@code host:port} for a confirmed java-interop peer. Opens a plain socket bounded by
     * {@code connectTimeoutMs}; a failed connect is {@link Verdict#UNREACHABLE}. On a successful
     * connect, issues a {@code getTopLevelPackages} request bounded by {@code responseTimeoutMs};
     * a non-null result is {@link Verdict#CONFIRMED}, and a timeout, JSON-RPC error, or any other
     * failure while awaiting the reply is {@link Verdict#WRONG_PEER} -- the peer answered the
     * socket but not the protocol. The listening future is cancelled and the socket closed before
     * returning, so no thread or descriptor leaks across repeated ticks.
     */
    public static Verdict probe(String host, int port, int connectTimeoutMs, int responseTimeoutMs) {
        Socket socket = new Socket();
        try {
            socket.connect(new InetSocketAddress(host, port), connectTimeoutMs);
        } catch (IOException e) {
            closeQuietly(socket);
            return Verdict.UNREACHABLE;
        }

        ExecutorService executor = Executors.newCachedThreadPool();
        Future<?> listening = null;
        try {
            Launcher<InteropProbeEndpoint> launcher = new Launcher.Builder<InteropProbeEndpoint>()
                    .setLocalService(new Object())
                    .setRemoteInterface(InteropProbeEndpoint.class)
                    .setInput(socket.getInputStream())
                    .setOutput(socket.getOutputStream())
                    .setExecutorService(executor)
                    .create();
            listening = launcher.startListening();

            InteropProbeEndpoint remote = launcher.getRemoteProxy();
            List<InteropProbeEndpoint.PackageName> result =
                    remote.getTopLevelPackages().get(responseTimeoutMs, TimeUnit.MILLISECONDS);
            return result != null ? Verdict.CONFIRMED : Verdict.WRONG_PEER;
        } catch (TimeoutException | ExecutionException | ResponseErrorException | IOException e) {
            return Verdict.WRONG_PEER;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return Verdict.WRONG_PEER;
        } finally {
            if (listening != null) {
                listening.cancel(true);
            }
            executor.shutdownNow();
            closeQuietly(socket);
        }
    }

    private static void closeQuietly(Socket socket) {
        try {
            socket.close();
        } catch (IOException ignored) {
            // best-effort cleanup -- nothing further to do if closing the socket itself fails
        }
    }
}
