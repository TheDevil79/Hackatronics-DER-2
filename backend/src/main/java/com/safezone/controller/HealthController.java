package com.safezone.controller;

import com.safezone.dto.HealthResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class HealthController {

    private final String engine;

    public HealthController(@Value("${simulation.engine:mock}") String engine) {
        this.engine = engine;
    }

    @GetMapping("/")
    public ResponseEntity<Map<String, Object>> getRoot() {
        return ResponseEntity.ok(Map.of(
                "service", "SafeZone AI Backend Service",
                "status", "RUNNING",
                "activeEngine", engine,
                "endpoints", Map.of(
                        "health", "/api/health",
                        "simulations", "/api/simulations"
                ),
                "disclaimer", "Educational demonstrator only - not an engineering safety calculator."
        ));
    }

    @GetMapping("/api/health")
    public ResponseEntity<HealthResponse> getHealth() {
        HealthResponse response = new HealthResponse("UP", "SafeZone AI Backend");
        return ResponseEntity.ok(response);
    }
}
