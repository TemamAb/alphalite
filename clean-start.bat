@echo off
echo [DEPLOY] Killing old containers and cleaning up...
docker-compose down -v --remove-orphans

echo [BUILD] Building production image...
docker-compose up --build -d

echo [WAIT] Waiting for engine to initialize (15s)...
timeout /t 15

echo [VERIFY] Running Profit Proof Verification...
node prove-profit.js

echo [DONE] System is running on Port 3000 in LIVE mode.
pause