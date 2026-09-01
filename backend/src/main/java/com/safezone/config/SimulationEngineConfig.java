package com.safezone.config;

import com.safezone.service.MockSimulationEngine;
import com.safezone.service.PythonSedovSimulationEngine;
import com.safezone.service.SedovTaylorSimulationEngine;
import com.safezone.service.SimulationEngine;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

/**
 * Strategy configuration for dynamic SimulationEngine selection based on application property `simulation.engine`.
 */
@Configuration
public class SimulationEngineConfig {

    private static final Logger log = LoggerFactory.getLogger(SimulationEngineConfig.class);

    @Bean
    @Primary
    public SimulationEngine simulationEngine(
            @Value("${simulation.engine:mock}") String engineType,
            MockSimulationEngine mockEngine,
            SedovTaylorSimulationEngine javaSedovEngine,
            ObjectProvider<PythonSedovSimulationEngine> pythonEngineProvider
    ) {
        String normalized = engineType != null ? engineType.trim().toLowerCase() : "mock";
        log.info("Configuring active SimulationEngine for key: [{}]", normalized);

        switch (normalized) {
            case "python-sedov":
            case "python":
            case "physics":
            case "sedov-python":
                PythonSedovSimulationEngine pyEngine = pythonEngineProvider.getIfAvailable();
                if (pyEngine != null) {
                    log.info("Active SimulationEngine -> PythonSedovSimulationEngine (Python-based wind-aware Sedov engine)");
                    return pyEngine;
                }
                log.warn("PythonSedovSimulationEngine bean not available; falling back to SedovTaylorSimulationEngine");
                return javaSedovEngine;

            case "java-sedov":
            case "sedov":
                log.info("Active SimulationEngine -> SedovTaylorSimulationEngine (Java in-process physics engine)");
                return javaSedovEngine;

            case "mock":
            default:
                log.info("Active SimulationEngine -> MockSimulationEngine (Demo fixture)");
                return mockEngine;
        }
    }
}
