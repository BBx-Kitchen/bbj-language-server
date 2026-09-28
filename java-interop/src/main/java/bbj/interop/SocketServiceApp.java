/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
package bbj.interop;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.channels.AsynchronousServerSocketChannel;
import java.nio.channels.AsynchronousSocketChannel;
import java.nio.channels.Channels;
import java.util.concurrent.ExecutionException;
import java.util.logging.Logger;

import org.eclipse.lsp4j.jsonrpc.Launcher;

/**
 * Runs the BBj Java Interop socket service. Accepts an optional port argument
 * (1-65535, default 5008); the service always binds to localhost only, never
 * to a network-facing address.
 */
public class SocketServiceApp extends Thread{

    static final int DEFAULT_PORT = 5008;

    protected final Logger logger = Logger.getLogger(SocketServiceApp.class.getName());

    private final int port;

    public SocketServiceApp() {
        this(DEFAULT_PORT);
    }

    public SocketServiceApp(int port) {
        this.port = port;
    }

    public static void main(String[] args) {
        int port;
        try {
            port = parsePort(args);
        } catch (IllegalArgumentException e) {
            System.err.println("Usage: java-interop [port]  (1-65535, default 5008): " + e.getMessage());
            System.exit(2);
            return;
        }
        try {
            new Thread(new SocketServiceApp(port)).run();
        } catch (Exception exc) {
            exc.printStackTrace();
        }
    }

    static int parsePort(String[] args) {
        if (args.length == 0) {
            return DEFAULT_PORT;
        }
        if (args.length > 1) {
            throw new IllegalArgumentException("expected at most one argument, got " + args.length);
        }
        int port;
        try {
            port = Integer.parseInt(args[0]);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("'" + args[0] + "' is not a valid port number");
        }
        if (port < 1 || port > 65535) {
            throw new IllegalArgumentException("'" + args[0] + "' is out of range 1-65535");
        }
        return port;
    }

    public void run()  {
        var address = new InetSocketAddress("localhost", port);
        try (
            var serverSocket = AsynchronousServerSocketChannel.open().bind(address)
        ) {
            logger.info("BBj Java Interop Service listening to " + address);
            while (true) {
                var socketChannel = serverSocket.accept().get();
                try {
                    startJsonRpc(socketChannel);
                    logger.info("Accepted new connection.");
                } catch (Exception exc) {
                    logger.severe(exc.getMessage());
                    exc.printStackTrace();
                }
            }
        } catch (IOException | InterruptedException | ExecutionException e) {
            logger.severe(e.getMessage());
            e.printStackTrace();
        }
    }

    protected void startJsonRpc(AsynchronousSocketChannel socketChannel) throws IOException {
        var interopService = new InteropService();
        var launcher = Launcher.createLauncher(
            interopService,
            LanguageServer.class,
            Channels.newInputStream(socketChannel),
            Channels.newOutputStream(socketChannel));
        launcher.startListening();
    }

}
