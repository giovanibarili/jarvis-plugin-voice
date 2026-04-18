# jarvis-plugin-voice

Voice I/O plugin for JARVIS — text-to-speech (Kokoro TTS) and speech-to-text (Whisper STT) with a visual HUD panel.

## Features

- **Text-to-Speech** — every AI response is spoken aloud via Kokoro TTS streaming. Supports multiple voices across American, British, and Portuguese categories (male/female).
- **Speech-to-Text** — voice input via Whisper for hands-free interaction.
- **HUD Panel** — morphing orb visualization that changes color based on state (blue=online, green=speaking, red=TTS offline).
- **Voice switching** — change voice at runtime with `voice_set`. List all available voices with `voice_list`.
- **Toggle on/off** — enable or disable TTS without unloading the plugin.

## Tools

| Tool | Description |
|------|-------------|
| `voice_set(voice)` | Change the TTS voice (e.g. 'bm_george', 'af_nova') |
| `voice_list()` | List all available Kokoro TTS voices |
| `voice_toggle(enabled)` | Enable or disable voice output |

## Voice Categories

- `af_*` — American Female
- `am_*` — American Male
- `bf_*` — British Female
- `bm_*` — British Male
- `pf_*` — Portuguese Female
- `pm_*` — Portuguese Male

## Structure

```
jarvis-plugin-voice/
├── plugin.json              # manifest
├── package.json             # dependencies
├── pieces/
│   ├── index.ts             # entry: exports createPieces
│   └── voice-piece.ts       # VoicePiece: TTS/STT, health checks, tools
└── renderers/
    └── VoiceRenderer.tsx    # frontend: morphing orb, status display
```

## Install

```bash
# via JARVIS
plugin_install github.com/giovanibarili/jarvis-plugin-voice

# or manually
git clone https://github.com/giovanibarili/jarvis-plugin-voice ~/.jarvis/plugins/jarvis-plugin-voice
```

## Requirements

- **Kokoro TTS** on port 8880 — install via [Voicebox](https://voicebox.sh/) or [Kokoro-FastAPI](https://github.com/remsky/Kokoro-FastAPI)
- The plugin auto-detects Kokoro health and degrades gracefully if unavailable.
