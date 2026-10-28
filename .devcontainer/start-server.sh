#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
port="${PORT:-3000}"
log_file="${TMPDIR:-/tmp}/smartqueue.log"

health_check() {
  SMARTQUEUE_HEALTH_URL="http://127.0.0.1:${port}/api/health" node -e '
    fetch(process.env.SMARTQUEUE_HEALTH_URL)
      .then((response) => process.exit(response.ok ? 0 : 1))
      .catch(() => process.exit(1));
  '
}

if health_check; then
  echo "SmartQueue is already healthy on port ${port}."
  exit 0
fi

: > "$log_file"
nohup node server.js >>"$log_file" 2>&1 </dev/null &
server_pid=$!

for ((attempt = 1; attempt <= 30; attempt++)); do
  if health_check; then
    echo "SmartQueue is healthy on port ${port}."
    exit 0
  fi

  if ! kill -0 "$server_pid" 2>/dev/null; then
    echo "SmartQueue exited before its health check passed. Server log:"
    cat "$log_file"
    exit 1
  fi

  sleep 1
done

kill "$server_pid" 2>/dev/null || true
echo "SmartQueue did not become healthy on port ${port} within 30 seconds. Server log:"
cat "$log_file"
exit 1
