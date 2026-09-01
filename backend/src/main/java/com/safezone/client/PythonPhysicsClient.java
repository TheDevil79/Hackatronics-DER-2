package com.safezone.client;

import com.safezone.dto.python.PythonPhysicsRequestDto;
import com.safezone.dto.python.PythonPhysicsResponseDto;
import com.safezone.exception.PhysicsEngineException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.time.Duration;
import java.util.Map;

/**
 * Production-ready HTTP client communicating with the external Python physics service.
 */
@Component
public class PythonPhysicsClient {

    private static final Logger log = LoggerFactory.getLogger(PythonPhysicsClient.class);

    private final RestClient restClient;
    private final String baseUrl;
    private final boolean fallbackToJava;

    @Autowired
    public PythonPhysicsClient(
            RestClient.Builder restClientBuilder,
            @Value("${simulation.python.base-url:http://localhost:8000}") String baseUrl,
            @Value("${simulation.python.connect-timeout-ms:2000}") int connectTimeoutMs,
            @Value("${simulation.python.read-timeout-ms:10000}") int readTimeoutMs,
            @Value("${simulation.python.fallback-to-java:true}") boolean fallbackToJava
    ) {
        this.baseUrl = baseUrl;
        this.fallbackToJava = fallbackToJava;

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofMillis(connectTimeoutMs));
        requestFactory.setReadTimeout(Duration.ofMillis(readTimeoutMs));

        this.restClient = restClientBuilder
                .baseUrl(baseUrl)
                .requestFactory(requestFactory)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .build();

        log.info("Initialized PythonPhysicsClient with baseUrl=[{}], connectTimeout=[{}ms], readTimeout=[{}ms], fallbackToJava=[{}]",
                baseUrl, connectTimeoutMs, readTimeoutMs, fallbackToJava);
    }

    /**
     * Package-private constructor for unit testing with a pre-configured RestClient.
     */
    public PythonPhysicsClient(RestClient restClient, String baseUrl, boolean fallbackToJava) {
        this.restClient = restClient;
        this.baseUrl = baseUrl;
        this.fallbackToJava = fallbackToJava;
    }

    /**
     * Executes the blast simulation on the Python physics service.
     *
     * @param request the normalized physics request DTO
     * @return the Python physics calculation response
     * @throws PhysicsEngineException on connection, timeout, or HTTP error
     */
    public PythonPhysicsResponseDto simulate(PythonPhysicsRequestDto request) {
        log.debug("Dispatching physics simulation request to Python service at {}/api/physics/simulate", baseUrl);

        try {
            PythonPhysicsResponseDto response = restClient.post()
                    .uri("/api/physics/simulate")
                    .body(request)
                    .retrieve()
                    .body(PythonPhysicsResponseDto.class);

            if (response == null) {
                log.error("Python physics service returned null body");
                throw new PhysicsEngineException("Python physics service returned an empty response");
            }

            return response;

        } catch (RestClientResponseException ex) {
            log.error("Python physics service error (HTTP {} {}): {}",
                    ex.getStatusCode().value(), ex.getStatusText(), ex.getResponseBodyAsString());
            throw new PhysicsEngineException(
                    String.format("Python physics engine error (HTTP %d %s): %s",
                            ex.getStatusCode().value(), ex.getStatusText(), ex.getResponseBodyAsString()),
                    ex.getStatusCode().value()
            );
        } catch (ResourceAccessException ex) {
            log.error("Python physics service connection failure: {}", ex.getMessage());
            throw new PhysicsEngineException(
                    "Failed to communicate with Python physics service (connection refused or timeout): " + ex.getMessage(),
                    ex
            );
        } catch (PhysicsEngineException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Unexpected error invoking Python physics service: {}", ex.getMessage());
            throw new PhysicsEngineException("Unexpected error invoking Python physics service: " + ex.getMessage(), ex);
        }
    }

    /**
     * Diagnostic health check for the Python physics microservice.
     */
    public boolean isHealthy() {
        try {
            Map<?, ?> health = restClient.get()
                    .uri("/health")
                    .retrieve()
                    .body(Map.class);
            return health != null && "UP".equalsIgnoreCase(String.valueOf(health.get("status")));
        } catch (Exception e) {
            log.debug("Python physics service health check failed: {}", e.getMessage());
            return false;
        }
    }

    public boolean isFallbackToJava() {
        return fallbackToJava;
    }

    public String getBaseUrl() {
        return baseUrl;
    }
}
