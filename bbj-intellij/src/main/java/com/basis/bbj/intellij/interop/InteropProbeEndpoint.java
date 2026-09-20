package com.basis.bbj.intellij.interop;

import org.eclipse.lsp4j.jsonrpc.services.JsonRequest;

import java.util.List;
import java.util.concurrent.CompletableFuture;

/**
 * Plugin-owned remote interface for the one java-interop method {@link InteropProbeClient} uses
 * to confirm peer identity (#587). No DTO module is shared between {@code bbj-intellij} and
 * either backend ({@code java-interop/} or {@code bbj-ls}), so the response shape is declared
 * locally; the method name below must match the backend's wire name exactly.
 */
public interface InteropProbeEndpoint {

    @JsonRequest
    CompletableFuture<List<PackageName>> getTopLevelPackages();

    /**
     * Plugin-local mirror of the backends' {@code PackageInfoParams} -- a single public {@code
     * packageName} field. The probe never reads this field; only the presence of a valid,
     * non-error reply may influence {@link InteropProbeClient.Verdict}.
     */
    class PackageName {
        public String packageName;
    }
}
