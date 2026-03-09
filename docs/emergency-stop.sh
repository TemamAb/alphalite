#!/bin/bash

# ==============================================================================
# EMERGENCY TRADING STOP SCRIPT
#
# This script immediately stops all trading activities by stopping the
# critical 'api' and 'brain' services as defined in the OPS_RUNBOOK.md.
#
# Run this script from the AlphaPro project root directory where the
# primary docker-compose.yml file is located.
#
# To make executable: chmod +x scripts/emergency-stop.sh
# Usage: ./scripts/emergency-stop.sh
# ==============================================================================

# Set color codes for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo -e "${RED}=======================================================${NC}"
echo -e "${RED}    !!!   EMERGENCY: STOP ALL TRADING INITIATED   !!!   ${NC}"
echo -e "${RED}=======================================================${NC}"
echo ""

echo -e "${YELLOW}[1/3] Stopping the Trading Engine (api service)...${NC}"
docker-compose stop api
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to stop the 'api' service. Please check docker-compose setup.${NC}"
    exit 1
fi
echo -e "${GREEN}--> Trading Engine (api) stopped.${NC}"
echo ""

echo -e "${YELLOW}[2/3] Stopping the AI Brain (brain service) as a precaution...${NC}"
docker-compose stop brain
echo -e "${GREEN}--> AI Brain (brain) stopped.${NC}"
echo ""

echo -e "${YELLOW}[3/3] Verifying container statuses...${NC}"
docker-compose ps
echo ""

echo -e "${GREEN}=======================================================${NC}"
echo -e "${GREEN}  EMERGENCY STOP COMPLETE. Trading has been halted.  ${NC}"
echo -e "${GREEN}  Review logs immediately: 'docker-compose logs -f api' ${NC}"
echo -e "${GREEN}=======================================================${NC}"