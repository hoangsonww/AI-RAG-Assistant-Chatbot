#!/usr/bin/env bash
set -euo pipefail

# Path to your compose file, relative to this script
COMPOSE_FILE="../docker-compose.yml"
SERVICE="backend"

# 1) Start the compose services (in detached mode)
echo "Starting dev container services…"
docker-compose -f "$COMPOSE_FILE" up -d

# 2) Exec into the backend container
echo "Opening shell in service '$SERVICE'…"
docker-compose -f "$COMPOSE_FILE" exec "$SERVICE" bash
