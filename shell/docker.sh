#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="../docker-compose.yml"

usage() {
  cat <<EOF
Usage: $(basename "$0") <command>

Commands:
  up       Start all services in detached mode
  down     Stop and remove all containers, networks, etc.
  build    Build (or rebuild) the images
  logs     Stream logs for all services
  ps       List running containers
  help     Show this help message
EOF
  exit 1
}

case "${1-}" in
  up)
    docker-compose -f "$COMPOSE_FILE" up -d
    ;;
  down)
    docker-compose -f "$COMPOSE_FILE" down
    ;;
  build)
    docker-compose -f "$COMPOSE_FILE" build
    ;;
  logs)
    docker-compose -f "$COMPOSE_FILE" logs -f
    ;;
  ps)
    docker-compose -f "$COMPOSE_FILE" ps
    ;;
  help|""|*)
    usage
    ;;
esac
