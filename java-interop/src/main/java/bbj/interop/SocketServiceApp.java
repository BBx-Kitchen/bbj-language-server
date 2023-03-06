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
import java.util.logging.Logger;

import org.eclipse.lsp4j.jsonrpc.Launcher;

public class SocketServiceApp {

    protected final Logger logger = Logger.getLogger(SocketServiceApp.class.getName());

    public static void main(String[] args) {
        try {
            new SocketServiceApp().run();
        } catch (Exception exc) {
            exc.printStackTrace();
        }
    }

    public void run() throws Exception {
        var address = new InetSocketAddress("localhost", 5008);
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
