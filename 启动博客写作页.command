#!/bin/zsh
set -e

cd "$(dirname "$0")"

if lsof -tiTCP:4001 -sTCP:LISTEN >/dev/null 2>&1; then
  open "http://127.0.0.1:4001/admin"
  echo "Blog writer is already running: http://127.0.0.1:4001/admin"
  exit 0
fi

git switch source >/dev/null 2>&1 || true

if [ ! -d node_modules ]; then
  npm install
fi

(sleep 1; open "http://127.0.0.1:4001/admin") &
npm run admin
