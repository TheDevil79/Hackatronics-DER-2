package com.safezone.controller;

import com.safezone.dto.SimulationRequestDto;
import com.safezone.dto.SimulationResponseDto;
import com.safezone.service.SimulationService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/simulations")
public class SimulationController {

    private final SimulationService simulationService;

    public SimulationController(SimulationService simulationService) {
        this.simulationService = simulationService;
    }

    /**
     * Executes a hazard and domino-effect simulation.
     *
     * @param request the simulation configuration, facility layout, and incident parameters
     * @return canonical simulation response with hazard zones, affected assets, domino chain, and escape routes
     */
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<SimulationResponseDto> runSimulation(@Valid @RequestBody SimulationRequestDto request) {
        SimulationResponseDto response = simulationService.runSimulation(request);
        return ResponseEntity.ok(response);
    }
}
