#!/bin/bash
# XpressPro FX — Start Script
# Works on any Linux/Mac system or VPS
set -e

echo "Starting XpressPro FX..."

# Load .env file if it exists
if [ -f ".env" ]; then
  export $(grep -v '^#' .env | xargs)
  echo "✅ Loaded .env file"
fi

export PORT=${PORT:-8080}
export NODE_ENV=${NODE_ENV:-production}

echo "Port: $PORT"
echo "Mode: $NODE_ENV"

node artifacts/api-server/dist/index.mjs
