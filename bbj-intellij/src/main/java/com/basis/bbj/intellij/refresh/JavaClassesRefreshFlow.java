package com.basis.bbj.intellij.refresh;

import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeoutException;

/**
 * Classifies the outcome of one bounded {@code bbj/refreshJavaClasses} call (#632). No
 * {@code com.intellij} or LSP4IJ import lives here, so every branch is exercised by plain JUnit
 * with plain lambdas standing in for the platform's bounded proxy lookup and request.
 */
public final class JavaClassesRefreshFlow {

    /**
     * Longer than {@code BbjCompileAction}'s 45s compile timeout, since a large classpath reload
     * takes longer. Bounds both the proxy lookup and the request so a lost response cannot leave
     * the progress indicator up forever.
     */
    public static final long REFRESH_TIMEOUT_SECONDS = 60;

    private JavaClassesRefreshFlow() {}

    /**
     * The machine-readable reason key every consumer (presentation, source guards) dispatches on.
     * Consumers must never dispatch on message prose.
     */
    public enum Outcome {
        /** The server reported the Java class cache was reloaded. */
        REFRESHED,
        /** The server ran the request but reported it could not reload the class cache. */
        DECLINED,
        /** The composer server proxy could not be resolved (server not running). */
        SERVER_UNAVAILABLE,
        /** The request itself failed or was interrupted before a response arrived. */
        REQUEST_FAILED,
        /** The bounded wait elapsed before a response arrived. */
        TIMED_OUT
    }

    /** One classified outcome plus an optional detail; {@code detail} is nullable and carries
     * only an exception's own message for the failure cases. */
    public record Result(Outcome outcome, String detail) {
    }

    /**
     * A bounded call to the server, returning a nullable {@link Boolean}: {@code null} means the
     * server proxy was unavailable.
     */
    @FunctionalInterface
    public interface BoundedRefreshCall {
        Boolean call(long timeoutSeconds) throws InterruptedException, ExecutionException, TimeoutException;
    }

    /** Runs {@code call} bounded at {@code timeoutSeconds} and classifies the result. */
    public static Result run(BoundedRefreshCall call, long timeoutSeconds) {
        Boolean answer;
        try {
            answer = call.call(timeoutSeconds);
        } catch (TimeoutException ex) {
            return new Result(Outcome.TIMED_OUT, messageOf(ex));
        } catch (ExecutionException ex) {
            return new Result(Outcome.REQUEST_FAILED, messageOf(ex));
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            return new Result(Outcome.REQUEST_FAILED, messageOf(ex));
        }

        if (answer == null) {
            return new Result(Outcome.SERVER_UNAVAILABLE, null);
        }
        return answer
            ? new Result(Outcome.REFRESHED, null)
            : new Result(Outcome.DECLINED, null);
    }

    private static String messageOf(Exception ex) {
        String message = ex.getMessage();
        return message != null ? message : ex.getClass().getSimpleName();
    }
}
