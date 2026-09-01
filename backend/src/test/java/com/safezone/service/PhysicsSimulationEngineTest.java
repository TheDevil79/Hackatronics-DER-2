package com.safezone.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.safezone.dto.AssetDimensionsDto;
import com.safezone.dto.AssetDto;
import com.safezone.dto.AssetType;
import com.safezone.dto.FacilityBoundaryDto;
import com.safezone.dto.FacilityDto;
import com.safezone.dto.IncidentDto;
import com.safezone.dto.IncidentParametersDto;
import com.safezone.dto.IncidentType;
import com.safezone.dto.LocationDto;
import com.safezone.dto.Point2D;
import com.safezone.dto.Position3DDto;
import com.safezone.dto.SimulationConfigDto;
import com.safezone.dto.SimulationRequestDto;
import com.safezone.dto.SimulationResponseDto;
import com.safezone.dto.TankPropertiesDto;
import com.safezone.dto.WindDto;
import com.safezone.exception.PhysicsEngineException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.io.InputStream;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class PhysicsSimulationEngineTest {

    private RestClient.Builder restClientBuilder;
    private MockRestServiceServer mockServer;
    private PhysicsSimulationEngine physicsEngine;
    private ObjectMapper objectMapper;

    private static final String BASE_URL = "http://localhost:8000";
    private static final String ENDPOINT = "/api/physics/simulate";

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        restClientBuilder = RestClient.builder();
        mockServer = MockRestServiceServer.bindTo(restClientBuilder).build();

        physicsEngine = new PhysicsSimulationEngine(
                restClientBuilder,
                BASE_URL,
                ENDPOINT,
                1000,
                2000
        );
    }

    private SimulationRequestDto createSampleRequest() {
        LocationDto location = new LocationDto(19.0760, 72.8777, 12.0);
        FacilityBoundaryDto boundary = new FacilityBoundaryDto(300.0, 200.0, List.of(
                new Point2D(-50.0, -50.0),
                new Point2D(250.0, -50.0),
                new Point2D(250.0, 150.0),
                new Point2D(-50.0, 150.0)
        ));

        AssetDto tank = new AssetDto(
                "T-101",
                "LPG Tank",
                AssetType.TANK,
                new Position3DDto(40.0, 50.0, 0.0),
                new AssetDimensionsDto(null, null, 16.0, 14.0),
                new TankPropertiesDto("LPG", 1500.0, 75.0, 8.5, 28.0, true)
        );

        FacilityDto facility = new FacilityDto("FAC-01", "Plant 1", location, boundary, List.of(tank), List.of(), List.of());
        IncidentDto incident = new IncidentDto("T-101", IncidentType.VAPOR_CLOUD_EXPLOSION, new IncidentParametersDto(4500.0, 675.0, 22.0, 45.0, null));
        WindDto wind = new WindDto(6.5, 112.5, "ESE", "METRIC");

        return new SimulationRequestDto("req-test-physics", facility, incident, wind, null, new SimulationConfigDto());
    }

    @Test
    @DisplayName("simulate successfully serializes request and deserializes physics engine response")
    void testSuccessfulPhysicsSimulation() throws Exception {
        ClassPathResource fixture = new ClassPathResource("mock/two-tank-explosion-response.json");
        String responseJson;
        try (InputStream is = fixture.getInputStream()) {
            responseJson = new String(is.readAllBytes());
        }

        mockServer.expect(requestTo(BASE_URL + ENDPOINT))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.requestId").value("req-test-physics"))
                .andExpect(jsonPath("$.facility.facilityId").value("FAC-01"))
                .andExpect(jsonPath("$.incident.sourceAssetId").value("T-101"))
                .andRespond(withSuccess(responseJson, MediaType.APPLICATION_JSON));

        SimulationRequestDto request = createSampleRequest();
        SimulationResponseDto response = physicsEngine.simulate(request);

        mockServer.verify();

        assertNotNull(response);
        assertEquals("sim-20260901-09412-safezone", response.simulationId());
        assertEquals("req-safezone-demo-001", response.requestId());
        assertEquals("CRITICAL", response.overallSeverity());
        assertEquals(84.5, response.overallRiskScore());
        assertEquals(4, response.hazardZones().size());
        assertEquals(4, response.affectedAssets().size());
        assertEquals(1, response.dominoPropagation().size());
        assertEquals(2, response.escapeRoutesAssessment().size());
        assertNotNull(response.recommendedApproachDirection());
        assertEquals("WNW", response.recommendedApproachDirection().compassSector());
    }

    @Test
    @DisplayName("simulate throws PhysicsEngineException when physics engine returns 500 error")
    void testPhysicsEngine500Error() {
        mockServer.expect(requestTo(BASE_URL + ENDPOINT))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body("{\"error\": \"Sedov-Taylor calculation failed: divergence\"}")
                        .contentType(MediaType.APPLICATION_JSON));

        SimulationRequestDto request = createSampleRequest();

        PhysicsEngineException ex = assertThrows(PhysicsEngineException.class, () -> physicsEngine.simulate(request));
        assertTrue(ex.getMessage().contains("500"));
        assertTrue(ex.getMessage().contains("Sedov-Taylor"));
        assertEquals(500, ex.getUpstreamStatusCode());
    }

    @Test
    @DisplayName("simulate throws PhysicsEngineException when physics engine returns 400 bad request")
    void testPhysicsEngine400Error() {
        mockServer.expect(requestTo(BASE_URL + ENDPOINT))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.BAD_REQUEST)
                        .body("{\"detail\": \"Invalid coordinates\"}")
                        .contentType(MediaType.APPLICATION_JSON));

        SimulationRequestDto request = createSampleRequest();

        PhysicsEngineException ex = assertThrows(PhysicsEngineException.class, () -> physicsEngine.simulate(request));
        assertTrue(ex.getMessage().contains("400"));
        assertEquals(400, ex.getUpstreamStatusCode());
    }

    @Test
    @DisplayName("simulate throws PhysicsEngineException when connection fails (unreachable host)")
    void testConnectionRefusedHandling() {
        // Create an engine instance pointing to an unreachable host/port without a mock server
        RestClient directClient = RestClient.builder().baseUrl("http://127.0.0.1:1").build();
        PhysicsSimulationEngine unreachableEngine = new PhysicsSimulationEngine(
                directClient,
                "http://127.0.0.1:1",
                "/api/physics/simulate"
        );

        SimulationRequestDto request = createSampleRequest();

        PhysicsEngineException ex = assertThrows(PhysicsEngineException.class, () -> unreachableEngine.simulate(request));
        assertTrue(ex.getMessage().contains("Failed to communicate with physics engine"));
    }
}
