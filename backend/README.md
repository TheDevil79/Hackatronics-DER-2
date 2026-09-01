# SafeZone AI — Backend Service

The backend service for SafeZone AI provides REST APIs for scenario management, physics engine orchestration, risk score aggregation, and report generation.

---

## 🛠️ Technology Stack

- **Language**: Java 17+
- **Framework**: Spring Boot 3.2.x (Spring Web, Spring Validation)
- **Build Tool**: Gradle
- **Testing**: JUnit 5, Spring Boot Test, MockMvc

---

## 📂 Package Architecture

```
backend/src/main/java/com/safezone/
├── SafeZoneApplication.java  # Main Spring Boot application entry point
├── config/                   # Configuration (CORS, security, converters)
│   └── CorsConfig.java
├── controller/               # REST API Controllers
│   └── HealthController.java
├── dto/                      # Data Transfer Objects & request/response records
│   └── HealthResponse.java
├── service/                  # Business logic & simulation pipeline coordinators
├── model/                    # Domain models & entities
└── repository/               # Data access layer & persistence interfaces
```

---

## 🚀 How to Run the Backend

### Prerequisites
- Java Development Kit (JDK 17 or higher) installed and set in `JAVA_HOME` / `PATH`.
- Gradle (or use wrapper).

### 1. Build the Project
From the `backend/` directory:
```bash
gradle build
```

### 2. Run Tests
```bash
gradle test
```

### 3. Start the Server
```bash
gradle bootRun
```

The server will start locally at **`http://localhost:8080`**.

---

## 📡 Available Endpoints

### 1. Health Check
- **Method**: `GET`
- **Path**: `/api/health`
- **Response**: `200 OK`
```json
{
  "status": "UP",
  "service": "SafeZone AI Backend"
}
```

---

## 🌐 CORS Configuration
CORS is configured in `com.safezone.config.CorsConfig` to allow requests originating from frontend development servers:
- `http://localhost:3000`
- `http://localhost:5173` (Vite)
- `http://localhost:4173`
