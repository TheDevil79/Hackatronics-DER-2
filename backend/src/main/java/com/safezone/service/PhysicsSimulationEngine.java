package com.safezone.service;

import com.safezone.dto.SimulationRequestDto;
import com.safezone.dto.SimulationResponseDto;
import com.safezone.exception.PhysicsEngineException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.time.Duration;

/**
 * =========================================================================================
 * PRODUCTION / INTEGRATION IMPLEMENTATION: PhysicsSimulationEngine
 * =========================================================================================
 * <p>
 * Connects to Deep's external physics simulation engine over HTTP.
 * Serializes canonical SimulationRequestDto payloads, invokes the physics engine API,
 * and deserializes the calculated SimulationResponseDto.
 * </p>
 */
@Component
@ConditionalOnProperty(name = "simulation.engine", havingValue = "physics")
public class PhysicsSimulationEngine implements SimulationEngine {

    private static final Logger log = LoggerFactory.getLogger(PhysicsSimulationEngine.class);

    private final RestClient restClient;
    private final String endpoint;
    private final String baseUrl;

    public PhysicsSimulationEngine(
            RestClient.Builder restClientBuilder,
            @Value("${simulation.physics.url:http://localhost:8000}") String baseUrl,
            @Value("${simulation.physics.endpoint:/api/physics/simulate}") String endpoint,
            @Value("${simulation.physics.connect-timeout-ms:5000}") int connectTimeoutMs,
            @Value("${simulation.physics.read-timeout-ms:30000}") int readTimeoutMs
    ) {
        this.baseUrl = baseUrl;
        this.endpoint = endpoint;

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofMillis(connectTimeoutMs));
        requestFactory.setReadTimeout(Duration.ofMillis(readTimeoutMs));

        this.restClient = restClientBuilder
                .baseUrl(baseUrl)
                .requestFactory(requestFactory)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .build();

        log.info("Initialized PhysicsSimulationEngine targeting base URL: [{}], endpoint: [{}]", baseUrl, endpoint);
    }

    /**
     * Package-private constructor for unit testing with a pre-configured RestClient.
     */
    PhysicsSimulationEngine(RestClient restClient, String baseUrl, String endpoint) {
        this.restClient = restClient;
        this.baseUrl = baseUrl;
        this.endpoint = endpoint;
    }

    @Override
    public SimulationResponseDto simulate(SimulationRequestDto request) {
        log.info("Sending simulation request [{}] to external physics engine at {}{}",
                request != null ? request.requestId() : "null", baseUrl, endpoint);

        try {
            SimulationResponseDto response = restClient.post()
                    .uri(endpoint)
                    .body(request)
                    .retrieve()
                    .body(SimulationResponseDto.class);

            if (response == null) {
                log.error("External physics engine returned empty (null) body for request [{}]",
                        request != null ? request.requestId() : "unknown");
                throw new PhysicsEngineException("External physics engine returned an empty response");
            }

            log.info("Received physics simulation response [{}] with severity [{}] and risk score [{}]",
                    response.simulationId(), response.overallSeverity(), response.overallRiskScore());

            return response;

        } catch (RestClientResponseException ex) {
            log.error("Physics engine returned HTTP {} {}: {}",
                    ex.getStatusCode().value(), ex.getStatusText(), ex.getResponseBodyAsString());
            throw new PhysicsEngineException(
                    String.format("Physics engine error (HTTP %d %s): %s",
                            ex.getStatusCode().value(), ex.getStatusText(), ex.getResponseBodyAsString()),
                    ex.getStatusCode().value()
            );
        } catch (ResourceAccessException ex) {
            log.error("Physics engine connection/timeout failure: {}", ex.getMessage());
            throw new PhysicsEngineException(
                    "Failed to communicate with physics engine (connection refused or timeout): " + ex.getMessage(),
                    ex
            );
        } catch (PhysicsEngineException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Unexpected error invoking physics engine: {}", ex.getMessage(), ex);
            throw new PhysicsEngineException("Unexpected error during physics simulation: " + ex.getMessage(), ex);
        }
    }

    public String getBaseUrl() {
        return baseUrl;
    }

    public String getEndpoint() {
        return endpoint;
    }
}
