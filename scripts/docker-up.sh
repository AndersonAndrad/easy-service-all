#!/usr/bin/env bash
# Docker deployment via cloudflared quick tunnel.
#
# Flow:
#   1. Build and start the backend container
#   2. Open a cloudflared quick tunnel pointing at the backend port
#   3. Wait for the random tunnel URL (e.g. https://xyz.trycloudflare.com)
#   4. Rebuild the frontend container with NEXT_PUBLIC_API_BASE_URL set to that URL
#   5. Start the frontend container
#   6. Keep the tunnel alive (Ctrl+C to stop everything)
#
# Env overrides:
#   BACKEND_PORT  — port the backend container exposes on the host (default: 3001)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_PORT="${BACKEND_PORT:-3001}"
TUNNEL_LOG=$(mktemp)
TUNNEL_PID=""

cleanup() {
  [[ -n "$TUNNEL_PID" ]] && kill "$TUNNEL_PID" 2>/dev/null || true
  rm -f "$TUNNEL_LOG"
}
trap cleanup EXIT INT TERM

cd "$REPO_ROOT"

echo "==> Building and starting backend container..."
docker compose up backend -d --build

echo ""
echo "==> Opening cloudflared quick tunnel → http://localhost:$BACKEND_PORT"
cloudflared tunnel --url "http://localhost:$BACKEND_PORT" >"$TUNNEL_LOG" 2>&1 &
TUNNEL_PID=$!

# Wait up to 40s for the tunnel URL to appear in cloudflared output
url=""
for _ in $(seq 1 40); do
  url=$(grep -o 'https://[a-zA-Z0-9-]*\.trycloudflare\.com' "$TUNNEL_LOG" | head -1) || true
  [[ -n "$url" ]] && break
  sleep 1
done

if [[ -z "$url" ]]; then
  echo ""
  echo "ERROR: Timed out waiting for cloudflared URL. Full output:"
  cat "$TUNNEL_LOG"
  exit 1
fi

echo "    URL: $url"
echo ""
echo "==> Building frontend container with NEXT_PUBLIC_API_BASE_URL=$url ..."
NEXT_PUBLIC_API_BASE_URL="$url" docker compose build frontend

echo ""
echo "==> Starting frontend container..."
docker compose up frontend -d

echo ""
echo "======================================================"
echo "  Backend  : http://localhost:$BACKEND_PORT"
echo "  Tunnel   : $url"
echo "  Frontend : http://localhost:3000"
echo "======================================================"
echo ""
echo "Tunnel is alive (PID $TUNNEL_PID). Press Ctrl+C to stop."
echo ""

# Stream tunnel logs so the terminal stays useful
tail -f "$TUNNEL_LOG" &
wait "$TUNNEL_PID"
