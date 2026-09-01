"""
Entry point to launch the SafeZone AI Python physics service.
"""

import uvicorn

if __name__ == "__main__":
    print("=================================================================")
    print(" SafeZone AI Python Physics Service")
    print(" Open in Browser: http://localhost:8000/docs or http://127.0.0.1:8000/health")
    print("=================================================================")
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=False)
