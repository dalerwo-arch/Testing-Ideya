#!/usr/bin/env bash
# Насб (як маротиба, интернет лозим): bash scripts/setup.sh
set -e
cd "$(dirname "$0")/../frontend"
echo "== Насби бастаҳои Frontend (чанд дақиқа)"
npm install
echo "== Build-и Frontend"
npm run build
echo
echo "Тайёр!  Оғоз:  bash scripts/start.sh   ва баъд  http://localhost:4000"
