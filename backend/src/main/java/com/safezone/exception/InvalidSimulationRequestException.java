package com.safezone.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

import java.util.List;

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidSimulationRequestException extends RuntimeException {

    private final List<String> validationErrors;

    public InvalidSimulationRequestException(String message) {
        super(message);
        this.validationErrors = List.of(message);
    }

    public InvalidSimulationRequestException(String message, List<String> validationErrors) {
        super(message);
        this.validationErrors = validationErrors != null ? List.copyOf(validationErrors) : List.of(message);
    }

    public List<String> getValidationErrors() {
        return validationErrors;
    }
}
