#!/bin/sh
# Reinstala dependencias solo si package-lock.json cambió desde la última
# instalación (node_modules vive en un volumen que sobrevive a los reinicios).
set -e
cd /app
current="$(sha1sum package-lock.json)"
if [ ! -f node_modules/.lock-hash ] || [ "$(cat node_modules/.lock-hash)" != "$current" ]; then
  echo "package-lock.json cambió: instalando dependencias…"
  npm ci --no-audit --no-fund
  echo "$current" > node_modules/.lock-hash
fi
exec "$@"
