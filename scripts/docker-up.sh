#!/usr/bin/env bash
# Docker deployment via cloudflared quick tunnels.
#
# Flow:
#   1. Build and start the backend container
#   2. Open a cloudflared quick tunnel pointing at the backend port
#   3. Wait for the random backend tunnel URL (e.g. https://xyz.trycloudflare.com)
#   4. Rebuild the frontend container with NEXT_PUBLIC_API_BASE_URL set to that URL
#   5. Start the frontend container
#   6. Open a cloudflared quick tunnel pointing at the frontend port
#   7. Wait for the random frontend tunnel URL
#   8. Keep both tunnels alive (Ctrl+C to stop everything)
#
# Env overrides:
#   BACKEND_PORT  — port the backend container exposes on the host (default: 3001)
#   FRONTEND_PORT — port the frontend container exposes on the host (default: 3000)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_PORT="${BACKEND_PORT:-3001}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
BACKEND_TUNNEL_LOG=$(mktemp)
FRONTEND_TUNNEL_LOG=$(mktemp)
BACKEND_TUNNEL_PID=""
FRONTEND_TUNNEL_PID=""

cleanup() {
  [[ -n "$BACKEND_TUNNEL_PID" ]]  && kill "$BACKEND_TUNNEL_PID"  2>/dev/null || true
  [[ -n "$FRONTEND_TUNNEL_PID" ]] && kill "$FRONTEND_TUNNEL_PID" 2>/dev/null || true
  rm -f "$BACKEND_TUNNEL_LOG" "$FRONTEND_TUNNEL_LOG"
}
trap cleanup EXIT INT TERM

cd "$REPO_ROOT"

# ---------------------------------------------------------------------------
# 1. Backend
# ---------------------------------------------------------------------------
echo "==> Building and starting backend container..."
docker compose up backend -d --build

echo ""
echo "==> Opening cloudflared tunnel → http://localhost:$BACKEND_PORT"
cloudflared tunnel --url "http://localhost:$BACKEND_PORT" >"$BACKEND_TUNNEL_LOG" 2>&1 &
BACKEND_TUNNEL_PID=$!

backend_url=""
for _ in $(seq 1 40); do
  backend_url=$(grep -o 'https://[a-zA-Z0-9-]*\.trycloudflare\.com' "$BACKEND_TUNNEL_LOG" | head -1) || true
  [[ -n "$backend_url" ]] && break
  sleep 1
done

if [[ -z "$backend_url" ]]; then
  echo ""
  echo "ERROR: Timed out waiting for backend cloudflared URL. Full output:"
  cat "$BACKEND_TUNNEL_LOG"
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

echo ""
echo "==> Opening cloudflared tunnel → http://localhost:$FRONTEND_PORT"
cloudflared tunnel --url "http://localhost:$FRONTEND_PORT" >"$FRONTEND_TUNNEL_LOG" 2>&1 &
FRONTEND_TUNNEL_PID=$!

frontend_url=""
for _ in $(seq 1 40); do
  frontend_url=$(grep -o 'https://[a-zA-Z0-9-]*\.trycloudflare\.com' "$FRONTEND_TUNNEL_LOG" | head -1) || true
  [[ -n "$frontend_url" ]] && break
  sleep 1
done

if [[ -z "$frontend_url" ]]; then
  echo ""
  echo "ERROR: Timed out waiting for frontend cloudflared URL. Full output:"
  cat "$FRONTEND_TUNNEL_LOG"
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
echo "Both tunnels alive (backend PID $BACKEND_TUNNEL_PID, frontend PID $FRONTEND_TUNNEL_PID)."
echo "Press Ctrl+C to stop."
echo ""

# Stream both tunnel logs and wait for either tunnel to exit
tail -f "$BACKEND_TUNNEL_LOG" "$FRONTEND_TUNNEL_LOG" &
wait "$BACKEND_TUNNEL_PID" "$FRONTEND_TUNNEL_PID"
