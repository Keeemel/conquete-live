#!/bin/sh
# macOS / Linux launcher
cd "$(dirname "$0")"
[ -d node_modules ] || npm install
LAST=$(cat username.txt 2>/dev/null)
printf "Your TikTok username without @ [%s]: " "$LAST"
read N
U=${N:-$LAST}
echo "$U" > username.txt
node server.js "$U"
