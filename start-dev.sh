#!/usr/bin/env bash
# Quick-start for local development: runs pagana-api (Django, :8000)
# and pagana-web (Vite, :5173) together. Ctrl+C stops both.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$ROOT/pagana-api"
WEB_DIR="$ROOT/pagana-web"

# --- Preflight checks -------------------------------------------------------
if [ ! -x "$API_DIR/.venv/bin/python" ]; then
  echo "error: $API_DIR/.venv not found. Create it first:" >&2
  echo "  cd pagana-api && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt" >&2
  exit 1
fi

if [ ! -d "$WEB_DIR/node_modules" ]; then
  echo "error: $WEB_DIR/node_modules not found. Install dependencies first:" >&2
  echo "  cd pagana-web && npm install" >&2
  exit 1
fi

for port in 8000 5173; do
  if ss -tln 2>/dev/null | grep -q ":$port "; then
    echo "error: port $port is already in use. Stop the existing server first." >&2
    exit 1
  fi
done

# --- Start both servers -----------------------------------------------------
PIDS=()

cleanup() {
  echo
  echo "Stopping dev servers..."
  for pid in "${PIDS[@]}"; do
    # Negative PID targets the child's whole process group (npm spawns vite).
    kill -- -"$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null
}
trap cleanup INT TERM EXIT

echo "Applying pending migrations (if any)..."
(cd "$API_DIR" && .venv/bin/python manage.py migrate --no-input)

echo "Starting pagana-api  -> http://localhost:8000"
(cd "$API_DIR" && exec setsid .venv/bin/python manage.py runserver 127.0.0.1:8000) &
PIDS+=("$!")

echo "Starting pagana-web  -> http://localhost:5173"
(cd "$WEB_DIR" && exec setsid npm run dev) &
PIDS+=("$!")

echo
echo "Both servers running. Press Ctrl+C to stop."
wait "${PIDS[@]}"
