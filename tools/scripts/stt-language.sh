#!/bin/bash
# stt-language.sh — Change STT language
LANGUAGE="$1"
VOICE_PORT="${JARVIS_VOICE_PORT:-50054}"

if [ -z "$LANGUAGE" ]; then
  echo "__TYPE__:error"
  echo "language is required (auto, en, pt, es, fr, ja)"
  exit 0
fi

curl -s -X POST "http://localhost:$VOICE_PORT/stt-config" \
  -H "Content-Type: application/json" \
  -d "{\"language\": \"$LANGUAGE\"}" 2>/dev/null

echo "__TYPE__:text"
echo "STT language set to: $LANGUAGE"
