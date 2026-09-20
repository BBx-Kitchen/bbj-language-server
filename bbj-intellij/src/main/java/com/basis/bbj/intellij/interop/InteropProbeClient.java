package com.basis.bbj.intellij.interop;

import org.eclipse.lsp4j.jsonrpc.Launcher;
import org.eclipse.lsp4j.jsonrpc.ResponseErrorException;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

/**
 * Plain client-side LSP4J probe that confirms a java-interop peer's protocol identity (#587),
 * replacing a bare TCP handshake with a real {@code getTopLevelPackages} JSON-RPC round trip. This
 * class holds no IntelliJ platform import, so plain JUnit drives every branch directly -- the same
 * constraint {@link com.basis.bbj.intellij.lsp.NodeExecutableResolver} already satisfies.
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

        InetSocketAddress address;
        try {
            // DNS resolution happens here, off-thread and bounded by connectTimeoutMs, rather than
            // inside `new InetSocketAddress(host, port)` on this thread: that constructor performs
            // the lookup unbounded, before socket.connect()'s own timeout starts applying, so a
            // misconfigured/unreachable javaInteropHost could otherwise stall a single poll tick far
            // past the documented TCP_TIMEOUT_MS + RESPONSE_TIMEOUT_MS budget.
            address = resolveAddress(host, port, connectTimeoutMs);
        } catch (IOException e) {
            closeQuietly(socket);
            return Verdict.UNREACHABLE;
        }

        try {
            socket.connect(address, connectTimeoutMs);
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
            // Thread.interrupt() (above) cannot unblock a thread parked in a blocking Socket read
            // (LSP4J's StreamMessageProducer uses blocking I/O) -- closeQuietly() below is what
            // actually forces that read to fail. awaitTermination() here confirms the listener
            // thread has actually exited before probe() returns, rather than trusting the ordering
            // to hold forever; a bound this small never adds meaningful latency to a tick that has
            // already closed the socket.
            closeQuietly(socket);
            awaitTerminationQuietly(executor);
        }
    }

    /** Small bound: closeQuietly() above has already force-unblocked the listener thread. */
    private static final long EXECUTOR_TERMINATION_TIMEOUT_MS = 500;

    private static void awaitTerminationQuietly(ExecutorService executor) {
        try {
            executor.awaitTermination(EXECUTOR_TERMINATION_TIMEOUT_MS, TimeUnit.MILLISECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    /** Daemon threads only -- a resolution that never unblocks must not keep the JVM alive. */
    private static final ThreadFactory DAEMON_THREAD_FACTORY = runnable -> {
        Thread thread = new Thread(runnable, "interop-probe-dns-resolver");
        thread.setDaemon(true);
        return thread;
    };

    /**
     * Resolves {@code host:port} off-thread, bounded by {@code timeoutMs}. Unlike {@code new
     * InetSocketAddress(host, port)} called directly on the caller's thread, this cannot stall the
     * caller past {@code timeoutMs} -- a hung/slow DNS server that never answers leaves an orphaned
     * daemon thread behind instead of blocking the poll tick.
     */
    private static InetSocketAddress resolveAddress(String host, int port, int timeoutMs) throws IOException {
        ExecutorService resolver = Executors.newSingleThreadExecutor(DAEMON_THREAD_FACTORY);
        try {
            return CompletableFuture.supplyAsync(() -> new InetSocketAddress(host, port), resolver)
                    .get(timeoutMs, TimeUnit.MILLISECONDS);
        } catch (TimeoutException e) {
            throw new IOException("DNS resolution for " + host + " did not complete within "
                    + timeoutMs + "ms", e);
        } catch (ExecutionException e) {
            throw new IOException("DNS resolution failed for " + host, e.getCause());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IOException("Interrupted while resolving " + host, e);
        } finally {
            resolver.shutdownNow();
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
