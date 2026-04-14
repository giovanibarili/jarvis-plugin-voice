#!/bin/bash
# voice-list.sh — List available TTS voices from Kokoro
TTS_URL="${JARVIS_TTS_URL:-http://localhost:8880}"

RESPONSE=$(curl -s "$TTS_URL/v1/audio/voices" 2>/dev/null)
if [ -z "$RESPONSE" ]; then
  echo "__TYPE__:error"
  echo "TTS server not responding at $TTS_URL"
  exit 0
fi

echo "__TYPE__:text"
echo "TTS voices from $TTS_URL:"
echo "$RESPONSE" | python3 -c "
import sys,json
d = json.load(sys.stdin)
voices = d.get('voices', d) if isinstance(d, dict) else d
categories = {}
for v in voices:
    prefix = v.split('_')[0] if '_' in v else 'other'
    categories.setdefault(prefix, []).append(v)
labels = {'af':'American Female','am':'American Male','bf':'British Female','bm':'British Male','ef':'European Female','em':'European Male','pm':'Portuguese Male','pf':'Portuguese Female'}
for prefix, vlist in sorted(categories.items()):
    label = labels.get(prefix, prefix.upper())
    print(f'{label}: {', '.join(vlist)}')
" 2>/dev/null
