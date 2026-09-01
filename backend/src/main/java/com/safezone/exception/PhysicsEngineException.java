package com.safezone.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Thrown when communication with the external physics simulation engine fails
 * (e.g. connection refused, read timeout, or upstream HTTP error).
 */
@ResponseStatus(HttpStatus.BAD_GATEWAY)
public class PhysicsEngineException extends RuntimeException {

    private final Integer upstreamStatusCode;

    public PhysicsEngineException(String message) {
        super(message);
        this.upstreamStatusCode = null;
    }

    public PhysicsEngineException(String message, Throwable cause) {
        super(message, cause);
        this.upstreamStatusCode = null;
    }

    public PhysicsEngineException(String message, int upstreamStatusCode) {
        super(message);
        this.upstreamStatusCode = upstreamStatusCode;
    }

    public Integer getUpstreamStatusCode() {
        return upstreamStatusCode;
    }
}
