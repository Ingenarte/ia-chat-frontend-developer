#!/bin/sh
set -eu

# Start the Ollama server in background
/bin/ollama serve &
pid=$!

# Wait for API to be ready, then pull model (best-effort)
for i in 1 2 3 4 5 6 7 8 9 10; do
  sleep 3
  if curl -sf http://127.0.0.1:11434/api/tags >/dev/null; then
    break
  fi
done

echo "Pulling model: ${OLLAMA_MODEL}"
# Pull may fail if already cached or if offline; do not crash on failure
ollama pull "${OLLAMA_MODEL}" || true

# Keep server process in foreground
wait $pid
