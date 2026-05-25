#!/usr/bin/env bash
# Docker deployment via cloudflared quick tunnels.
#
# Flow:
#   1. Kill any previous cloudflared tunnels started by this script
#   2. Build and start the backend container (detached)
#   3. Wait until the backend is actually responding on BACKEND_PORT
#   4. Open a cloudflared quick tunnel for the backend (daemonized)
#   5. Wait for the random backend tunnel URL (e.g. https://xyz.trycloudflare.com)
#   6. Rebuild the frontend container with NEXT_PUBLIC_API_BASE_URL set to that URL
#   7. Start the frontend container (detached)
#   8. Wait until the frontend is actually responding on FRONTEND_PORT
#   9. Open a cloudflared quick tunnel for the frontend (daemonized)
#  10. Wait for the random frontend tunnel URL
#  11. Print the summary and exit — tunnels keep running in the background
#
# Stop tunnels:   ./scripts/docker-up.sh --stop
#
# Env overrides:
#   BACKEND_PORT       — port the backend container exposes on the host (default: 3001)
#   FRONTEND_PORT      — port the frontend container exposes on the host (default: 3000)
#   BACKEND_READY_SEC  — max seconds to wait for backend readiness (default: 90)
#   FRONTEND_READY_SEC — max seconds to wait for frontend readiness (default: 60)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_PORT="${BACKEND_PORT:-3001}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
BACKEND_READY_SEC="${BACKEND_READY_SEC:-90}"
FRONTEND_READY_SEC="${FRONTEND_READY_SEC:-60}"

PID_FILE="$REPO_ROOT/.cloudflared.pids"
BACKEND_LOG="$REPO_ROOT/.cloudflared-backend.log"
FRONTEND_LOG="$REPO_ROOT/.cloudflared-frontend.log"

# ---------------------------------------------------------------------------
# --stop: kill any running tunnels started by this script
# ---------------------------------------------------------------------------
if [[ "${1:-}" == "--stop" ]]; then
  if [[ -f "$PID_FILE" ]]; then
    while IFS= read -r pid; do
      kill "$pid" 2>/dev/null && echo "Killed cloudflared PID $pid" || true
    done < "$PID_FILE"
    rm -f "$PID_FILE"
    echo "All tunnels stopped."
  else
    echo "No PID file found ($PID_FILE). Nothing to stop."
  fi
  exit 0
fi

# ---------------------------------------------------------------------------
# Kill any previous cloudflared tunnels from a prior run
# ---------------------------------------------------------------------------
if [[ -f "$PID_FILE" ]]; then
  echo "==> Stopping previous cloudflared tunnels..."
  while IFS= read -r pid; do
    kill "$pid" 2>/dev/null || true
  done < "$PID_FILE"
  rm -f "$PID_FILE"
fi

# Wait until a port on localhost is accepting connections.
wait_for_port() {
  local label="$1" port="$2" max_sec="$3"
  echo "==> Waiting for $label on port $port (up to ${max_sec}s)..."
  for i in $(seq 1 "$max_sec"); do
    if curl -sf --max-time 2 "http://localhost:$port" >/dev/null 2>&1 \
       || curl -sf --max-time 2 "http://localhost:$port/health" >/dev/null 2>&1 \
       || (command -v nc >/dev/null && nc -z localhost "$port" 2>/dev/null); then
      echo "    $label is up (${i}s)"
      return 0
    fi
    printf "    still waiting... %ds\r" "$i"
    sleep 1
  done
  echo ""
  echo "ERROR: $label did not become ready within ${max_sec}s."
  echo ""
  echo "--- Docker logs (last 50 lines) ---"
  docker compose logs --tail 250 "$label" 2>/dev/null || true
  exit 1
}

cd "$REPO_ROOT"

# ---------------------------------------------------------------------------
# 1. Backend
# ---------------------------------------------------------------------------
echo "==> Building and starting backend container..."
docker compose up backend -d --build

wait_for_port "backend" "$BACKEND_PORT" "$BACKEND_READY_SEC"

echo ""
echo "==> Opening cloudflared tunnel → http://localhost:$BACKEND_PORT (background)"
nohup cloudflared tunnel --url "http://localhost:$BACKEND_PORT" >"$BACKEND_LOG" 2>&1 &
BACKEND_TUNNEL_PID=$!
disown "$BACKEND_TUNNEL_PID"
echo "$BACKEND_TUNNEL_PID" >> "$PID_FILE"

backend_url=""
for _ in $(seq 1 40); do
  backend_url=$(grep -o 'https://[a-zA-Z0-9-]*\.trycloudflare\.com' "$BACKEND_LOG" | head -1) || true
  [[ -n "$backend_url" ]] && break
  sleep 1
done

if [[ -z "$backend_url" ]]; then
  echo ""
  echo "ERROR: Timed out waiting for backend cloudflared URL. Full output:"
  cat "$BACKEND_LOG"
  exit 1
fi

echo "    Backend URL: $backend_url"

# ---------------------------------------------------------------------------
# 2. Frontend (built with the backend tunnel URL)
# ---------------------------------------------------------------------------
echo ""
echo "==> Building frontend container with NEXT_PUBLIC_API_BASE_URL=$backend_url ..."
NEXT_PUBLIC_API_BASE_URL="$backend_url" docker compose build frontend

echo ""
echo "==> Starting frontend container..."
docker compose up frontend -d

wait_for_port "frontend" "$FRONTEND_PORT" "$FRONTEND_READY_SEC"

echo ""
echo "==> Opening cloudflared tunnel → http://localhost:$FRONTEND_PORT (background)"
nohup cloudflared tunnel --url "http://localhost:$FRONTEND_PORT" >"$FRONTEND_LOG" 2>&1 &
FRONTEND_TUNNEL_PID=$!
disown "$FRONTEND_TUNNEL_PID"
echo "$FRONTEND_TUNNEL_PID" >> "$PID_FILE"

frontend_url=""
for _ in $(seq 1 40); do
  frontend_url=$(grep -o 'https://[a-zA-Z0-9-]*\.trycloudflare\.com' "$FRONTEND_LOG" | head -1) || true
  [[ -n "$frontend_url" ]] && break
  sleep 1
done

if [[ -z "$frontend_url" ]]; then
  echo ""
  echo "ERROR: Timed out waiting for frontend cloudflared URL. Full output:"
  cat "$FRONTEND_LOG"
  exit 1
fi

echo "    Frontend URL: $frontend_url"

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "======================================================"
echo "  Backend  (local) : http://localhost:$BACKEND_PORT"
echo "  Backend  (tunnel): $backend_url"
echo "  Frontend (local) : http://localhost:$FRONTEND_PORT"
echo "  Frontend (tunnel): $frontend_url"
echo "======================================================"
echo ""
echo "Tunnels are running in the background (PIDs saved in .cloudflared.pids)."
echo "Logs: $BACKEND_LOG"
echo "      $FRONTEND_LOG"
echo ""
echo "To stop the tunnels:  ./scripts/docker-up.sh --stop"
echo "To stop everything:   docker compose down && ./scripts/docker-up.sh --stop"
echo ""
