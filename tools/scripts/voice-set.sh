#!/bin/bash
# voice-set.sh — Change TTS voice via VoicePiece HTTP API
VOICE="$1"
TTS_URL="${JARVIS_TTS_URL:-http://localhost:8880}"
VOICE_PORT="${JARVIS_VOICE_PORT:-50054}"

if [ -z "$VOICE" ]; then
  echo "__TYPE__:error"
  echo "voice is required"
  exit 0
fi

# Verify voice exists
VOICES=$(curl -s "$TTS_URL/v1/audio/voices" 2>/dev/null)
if ! echo "$VOICES" | grep -q "\"$VOICE\""; then
  echo "__TYPE__:error"
  echo "Voice '$VOICE' not found. Use voice_list to see available voices."
  exit 0
fi

# Update via VoicePiece stt-config endpoint (reuse for voice config)
curl -s -X POST "http://localhost:$VOICE_PORT/voice-config" \
  -H "Content-Type: application/json" \
  -d "{\"voice\": \"$VOICE\"}" 2>/dev/null

echo "__TYPE__:text"
echo "Voice changed to: $VOICE"
