package com.safezone.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class SimulationNotFoundException extends RuntimeException {

    public SimulationNotFoundException(String message) {
        super(message);
    }

    public SimulationNotFoundException(String simulationId, boolean isId) {
        super("Simulation not found for id: " + simulationId);
    }
}
