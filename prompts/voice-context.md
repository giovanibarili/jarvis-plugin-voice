## Voice Plugin

JARVIS has voice I/O capabilities via the voice plugin.

**TTS (Text-to-Speech):** Kokoro engine. Your text responses are spoken aloud automatically.
- `voice_set` — change voice (67 available: bm_* British Male, pm_* Portuguese Male, af_* American Female, etc)
- `voice_list` — list all voices by category

**STT (Speech-to-Text):** Whisper engine. User can speak via microphone.
- `stt_language` — set recognition language (auto, en, pt, es, fr, ja)

Voice is optional — works without it, just no audio.
