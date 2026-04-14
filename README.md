# jarvis-plugin-voice

Voice I/O plugin for JARVIS — Text-to-Speech (Kokoro) + Speech-to-Text (Whisper).

## Install

```bash
# Via JARVIS tool:
# Ask JARVIS: "install plugin github.com/giovanibarili/jarvis-plugin-voice"

# Or manually:
git clone https://github.com/giovanibarili/jarvis-plugin-voice ~/.jarvis/plugins/jarvis-plugin-voice
```

## Dependencies

- **Kokoro TTS** on port 8880 — `scripts/start-kokoro.sh` or Voicebox app
- **Whisper STT** on port 50055 — `brew install whisper-cpp && whisper-server --model ggml-large-v3.bin --port 50055`

## Tools

| Tool | Description |
|------|-------------|
| `voice_set` | Change TTS voice (67 voices) |
| `voice_list` | List available voices by category |
| `stt_language` | Set STT language (auto, en, pt, es, fr, ja) |

## Voices

- `bm_*` — British Male (bm_george, bm_daniel, bm_lewis)
- `pm_*` — Portuguese Male (pm_alex)
- `af_*` — American Female (af_nova, af_bella, af_heart)
- `am_*` — American Male (am_adam, am_echo)
- And 50+ more

## License

ISC
