#!/usr/bin/env bash
# Renders the six Play Store screenshots (1080x1920) and a full-strip preview from src/panorama.html.
# Usage: bash render.sh   (needs Google Chrome installed)
set -e
cd "$(dirname "$0")"
CHROME="${CHROME:-/c/Program Files/Google/Chrome/Application/chrome.exe}"
SRC="file:///$(cd src && pwd -W 2>/dev/null || pwd)/panorama.html"
for p in 1 2 3 4 5 6; do
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --virtual-time-budget=3000 --window-size=1080,1920 --screenshot="$(pwd -W 2>/dev/null || pwd)/0$p.png" "$SRC?p=$p" >/dev/null 2>&1
done
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --virtual-time-budget=3000 --window-size=6480,1920 --screenshot="$(pwd -W 2>/dev/null || pwd)/preview-strip.png" "$SRC?p=all" >/dev/null 2>&1
ls -la *.png
