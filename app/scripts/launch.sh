#!/bin/bash
# Avvia Budget Tracker: Postgres (se serve) → server → apre il browser.
# Si può lanciare da un'app macOS creata con osacompile (doppio clic).

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
URL="http://localhost:3000"

# Node via nvm, se presente; Postgres via Homebrew.
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
export PATH="/opt/homebrew/bin:/opt/homebrew/opt/postgresql@16/bin:$PATH"
cd "$APP_DIR" || exit 1

# 1) Postgres: avvialo se non risponde
if ! pg_isready -q 2>/dev/null; then
  brew services start postgresql@16 >/dev/null 2>&1
  for i in $(seq 1 20); do pg_isready -q 2>/dev/null && break; sleep 1; done
fi

# 2) Server: avvialo solo se la porta 3000 non risponde già
if ! curl -s -o /dev/null "$URL/api/categories" 2>/dev/null; then
  nohup npm run dev > /tmp/budget-tracker.log 2>&1 &
  for i in $(seq 1 40); do curl -s -o /dev/null "$URL/api/categories" 2>/dev/null && break; sleep 1; done
fi

# 3) Apri la dashboard nel browser
open "$URL"
