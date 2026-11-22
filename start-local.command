#!/bin/zsh
set -eu
cd "$(dirname "$0")"
runtime_bin="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin"
fallback_bin="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback"
export PATH="$runtime_bin:$fallback_bin:$PATH"
if [[ ! -d node_modules/next ]]; then
  print 'Dependensi belum tersedia. Jalankan pnpm install terlebih dahulu.'
  exit 1
fi
print 'TravelOS — buka http://localhost:3002'
exec ./node_modules/.bin/next dev --webpack --hostname 127.0.0.1 --port 3002
