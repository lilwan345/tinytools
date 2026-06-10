#!/usr/bin/env bash
# Serve the tools locally at http://localhost:8000
cd "$(dirname "$0")"
echo "Serving viral-tools at http://localhost:8000  (Ctrl+C to stop)"
python3 -m http.server 8000
