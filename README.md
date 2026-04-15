# jarvis-plugin-voice

Voice I/O plugin for JARVIS. Adds text-to-speech output via Kokoro TTS with a real-time streaming HUD panel.

This is a **Phase 2 plugin** — it provides a backend Piece (VoicePiece), a frontend Renderer (VoiceRenderer), and AI tools, all loaded dynamically at runtime. No build step required.

## How it works

When JARVIS responds to a message, VoicePiece intercepts the `stream.complete` event, sends the text to Kokoro TTS, and streams the MP3 audio to the HUD. The VoiceRenderer connects to the audio stream on mount and plays audio in real-time as chunks arrive. Between utterances, the connection stays idle and reconnects automatically.

The HUD panel displays a morphing orb (same visual as the JARVIS core reactor) that changes color based on state: blue when online, green when speaking, red when TTS is offline, and yellow during initialization. VoicePiece auto-starts Kokoro if it detects the TTS server is down.

## Install

Ask JARVIS to install it:

```
Use the plugin_install tool with repo "github.com/giovanibarili/jarvis-plugin-voice"
```

Or register manually in `.jarvis/settings.json`:

```json
{
  "plugins": {
    "jarvis-plugin-voice": {
      "repo": "github.com/giovanibarili/jarvis-plugin-voice",
      "path": "/path/to/.jarvis/plugins/jarvis-plugin-voice",
      "enabled": true,
      "branch": "master"
    }
  }
}
```

## Dependencies

**Kokoro TTS** — local TTS engine on port 8880. VoicePiece auto-starts it from `~/dev/personal/kokoro-local/` if the venv exists. Alternatively, run it manually or use the Voicebox app.

**Whisper STT** (optional) — speech-to-text on port 50055.

```bash
brew install whisper-cpp
whisper-server --model /opt/homebrew/share/whisper-cpp/models/ggml-large-v3.bin --port 50055 --host 127.0.0.1
```

## Plugin structure

```
jarvis-plugin-voice/
├── plugin.json              manifest (entry, capabilities)
├── package.json             peerDependency on @jarvis/core
├── pieces/
│   ├── index.ts             createPieces() factory
│   └── voice-piece.ts       VoicePiece — TTS lifecycle, audio streaming, tools
├── renderers/
│   └── VoiceRenderer.tsx    HUD panel — orb + status + data rows + audio playback
└── prompts/
    └── voice-context.md     AI context about voice capabilities
```

## Tools

VoicePiece registers these tools programmatically (not from JSON configs):

- **voice_set** — change TTS voice (e.g. `bm_george`, `pm_alex`, `af_nova`)
- **voice_list** — list all available voices from Kokoro (67+ voices)
- **voice_toggle** — enable or disable TTS output
- **stt_language** — set STT language (`auto`, `en`, `pt`, `es`, `fr`, `ja`)

## Voice categories

- `af_*` — American Female (af_nova, af_bella, af_heart, af_sarah, af_sky)
- `am_*` — American Male (am_adam, am_echo, am_michael)
- `bf_*` — British Female (bf_emma, bf_isabella)
- `bm_*` — British Male (bm_george, bm_daniel, bm_lewis)
- `pm_*` — Portuguese Male (pm_alex)
- `pf_*` — Portuguese Female
- `ef_*` / `em_*` — European Female/Male

## Ports

| Port | Service |
|------|---------|
| 50054 | Audio stream server (stream.mp3, latest.mp3) |
| 8880 | Kokoro TTS (external) |
| 50055 | Whisper STT (external) |

## Environment variables

All optional — sensible defaults provided.

- `JARVIS_TTS_URL` — Kokoro URL (default: `http://localhost:8880`)
- `JARVIS_TTS_VOICE` — default voice (default: `bm_george`)
- `JARVIS_TTS_ENABLED` — set `false` to disable (default: enabled)
- `JARVIS_VOICE_PORT` — audio server port (default: `50054`)
- `JARVIS_STT_LANG` — STT language (default: `auto`)
- `JARVIS_KOKORO_DIR` — Kokoro install path (default: `~/dev/personal/kokoro-local`)
- `JARVIS_KOKORO_AUTOSTART` — set `false` to disable auto-start (default: enabled)

## License

ISC
