@echo off
echo ===================================================
echo   Starting ReturnFlow RRPMS Local Development
echo ===================================================
echo.
echo 1. Freeing port 8080 (stopping Docker backend & frontend containers)...
docker stop rrpms-backend rrpms-frontend 2>nul
echo 2. Ensuring PostgreSQL & Redis containers are running...
docker start rrpms-postgres rrpms-redis 2>nul
echo 3. Launching Spring Boot Backend (port 8080)...
start "RRPMS Backend" cmd /k "cd /d \"%~dp0rrpms-backend\" && run-backend.bat"
echo 4. Launching Vite Frontend Dev Server (port 5173)...
start "RRPMS Frontend" cmd /k "cd /d \"%~dp0rrpms-frontend\" && run-frontend.bat"
echo.
echo ===================================================
echo   All services launched in separate windows!
echo   - Frontend: http://localhost:5173
echo   - Backend:  http://localhost:8080
echo   - Database: localhost:5432 (rrpms_db)
echo ===================================================
pause
