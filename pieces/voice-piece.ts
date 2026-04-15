import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";

// Use structural typing — no import from @jarvis/core needed at runtime
// These interfaces match what @jarvis/core exports

interface EventBus {
  publish<T>(topic: string, data: any): void;
  subscribe<T>(topic: string, handler: (msg: T) => void | Promise<void>): () => void;
}

interface Piece {
  readonly id: string;
  readonly name: string;
  start(bus: EventBus): Promise<void>;
  stop(): Promise<void>;
  systemContext?(): string;
}

interface PluginContext {
  bus: EventBus;
  toolRegistry: any;
  config: Record<string, unknown>;
  pluginDir: string;
}

const HUD_TOPICS = {
  ADD: "hud.piece.add",
  UPDATE: "hud.piece.update",
  REMOVE: "hud.piece.remove",
} as const;

interface VoiceConfig {
  ttsUrl: string;
  model: string;
  voice: string;
  enabled: boolean;
  port: number;
  sttLanguage: string;
  kokoroDir: string;
  kokoroAutoStart: boolean;
}

export class VoicePiece implements Piece {
  readonly id = "voice";
  readonly name = "Voice I/O";

  private bus!: EventBus;
  private config: VoiceConfig;
  private speaking = false;
  private latestAudio: Buffer | null = null;
  private latestAudioId = "";
  private totalSpoken = 0;
  private server?: ReturnType<typeof createServer>;
  private ttsHealthy: boolean | null = null;
  private healthInterval?: ReturnType<typeof setInterval>;
  private bootRetries = 0;
  private bootDone = false;
  private kokoroProcess: ChildProcess | null = null;
  private kokoroStartAttempted = false;
  private audioStreamClients = new Set<ServerResponse>();

  constructor(ctx: PluginContext) {
    const saved = ctx.config as Record<string, unknown>;
    this.config = {
      ttsUrl: (saved.ttsUrl as string) ?? process.env.JARVIS_TTS_URL ?? "http://localhost:8880",
      model: (saved.model as string) ?? "kokoro",
      voice: (saved.voice as string) ?? process.env.JARVIS_TTS_VOICE ?? "bm_george",
      enabled: process.env.JARVIS_TTS_ENABLED !== "false",
      port: Number(process.env.JARVIS_VOICE_PORT ?? "50054"),
      sttLanguage: (saved.sttLanguage as string) ?? process.env.JARVIS_STT_LANG ?? "auto",
      kokoroDir: process.env.JARVIS_KOKORO_DIR ?? `${process.env.HOME}/dev/personal/kokoro-local`,
      kokoroAutoStart: process.env.JARVIS_KOKORO_AUTOSTART !== "false",
    };
  }

  systemContext(): string {
    return `## Voice I/O Plugin
TTS: Kokoro engine at ${this.config.ttsUrl}. Voice: ${this.config.voice}. Enabled: ${this.config.enabled}. Healthy: ${this.ttsHealthy}.
STT: Whisper on port 50055. Language: ${this.config.sttLanguage}.
Tools: voice_set, voice_list, stt_language (loaded from plugin tools/).
Voice categories: af_* (American Female), am_* (American Male), bf_* (British Female), bm_* (British Male), pm_* (Portuguese Male), pf_* (Portuguese Female).`;
  }

  async start(bus: EventBus): Promise<void> {
    this.bus = bus;

    this.bus.subscribe("core.main.stream.complete", (msg: any) => this.handleComplete(msg));

    // Register HUD piece with renderer metadata
    this.bus.publish(HUD_TOPICS.ADD, {
      sessionId: "system",
      componentId: this.id,
      piece: {
        pieceId: this.id,
        type: "panel",
        name: this.name,
        status: this.config.enabled ? "running" : "stopped",
        data: this.getData(),
        position: { x: 10, y: 400 },
        size: { width: 220, height: 180 },
        renderer: { plugin: "jarvis-plugin-voice", file: "VoiceRenderer" },
      },
    });

    // Audio stream server
    this.server = createServer((req, res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
      if (req.url?.startsWith("/stream.mp3")) { this.serveAudioStream(req, res); }
      else if (req.url?.startsWith("/latest.mp3")) { this.serveLatest(res); }
      else { res.writeHead(404); res.end(); }
    });
    this.server.listen(this.config.port);

    // TTS health check with boot phase
    const bootCheck = setInterval(async () => {
      await this.checkTtsHealth();
      this.bootRetries++;
      if (this.bootRetries === 1 && !this.ttsHealthy) this.startKokoro();
      if (this.ttsHealthy || this.bootRetries >= 10) {
        clearInterval(bootCheck);
        this.bootDone = true;
        if (!this.ttsHealthy) this.notifyCore(false);
        this.healthInterval = setInterval(() => this.checkTtsHealth(), 10000);
      }
    }, 5000);
  }

  async stop(): Promise<void> {
    if (this.healthInterval) clearInterval(this.healthInterval);
    this.kokoroProcess?.kill();
    this.kokoroProcess = null;
    this.server?.close();
    this.bus.publish(HUD_TOPICS.REMOVE, {
      sessionId: "system",
      componentId: this.id,
      pieceId: this.id,
    });
  }

  private async handleComplete(msg: any): Promise<void> {
    if (!this.config.enabled || !this.ttsHealthy) return;
    const text = this.stripMarkdown(String(msg.fullText ?? "").trim());
    if (!text) return;

    this.speaking = true;
    this.latestAudioId = crypto.randomUUID();
    this.latestAudio = null;
    this.updateHud();

    try {
      const response = await fetch(`${this.config.ttsUrl}/v1/audio/speech`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.config.model,
          input: text.slice(0, 4096),
          voice: this.config.voice,
          stream: true,
          response_format: "mp3",
        }),
      });
      if (!response.ok) throw new Error(`TTS: ${response.status}`);

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No body");

      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          for (const client of this.audioStreamClients) {
            try { client.write(Buffer.from(value)); } catch {}
          }
        }
      }

      this.latestAudio = Buffer.concat(chunks.map(c => Buffer.from(c)));
      this.totalSpoken++;
    } catch {} finally {
      this.speaking = false;
      for (const client of this.audioStreamClients) { try { client.end(); } catch {} }
      this.audioStreamClients.clear();
      this.updateHud();
    }
  }

  private async checkTtsHealth(): Promise<void> {
    let healthy = false;
    try { healthy = (await fetch(`${this.config.ttsUrl}/health`)).ok; } catch {}
    const was = this.ttsHealthy;
    this.ttsHealthy = healthy;
    if (this.bootDone && healthy !== was) {
      if (!healthy && !this.kokoroProcess) this.startKokoro();
      this.notifyCore(healthy);
    }
  }

  private startKokoro(): void {
    if (this.kokoroStartAttempted || !this.config.kokoroAutoStart) return;
    this.kokoroStartAttempted = true;
    const dir = this.config.kokoroDir;
    const py = `${dir}/venv/bin/python3`;
    if (!existsSync(py)) return;

    this.kokoroProcess = spawn(py, ["-m", "uvicorn", "api.src.main:app", "--host", "127.0.0.1", "--port", "8880"], {
      cwd: dir,
      env: {
        ...process.env,
        PHONEMIZER_ESPEAK_LIBRARY: "/opt/homebrew/lib/libespeak-ng.dylib",
        USE_GPU: "false",
        MODEL_DIR: `${dir}/api/src/models`,
        VOICES_DIR: `${dir}/api/src/voices/v1_0`,
        PROJECT_ROOT: dir,
        VIRTUAL_ENV: `${dir}/venv`,
        PATH: `${dir}/venv/bin:${process.env.PATH}`,
      },
      stdio: "ignore",
    });
    this.kokoroProcess.on("exit", () => { this.kokoroProcess = null; this.kokoroStartAttempted = false; });
  }

  private notifyCore(healthy: boolean): void {
    const text = healthy
      ? `[SYSTEM] Voice plugin: TTS (Kokoro) online. Voice: ${this.config.voice}.`
      : `[SYSTEM] Voice plugin: TTS (Kokoro) offline at ${this.config.ttsUrl}.`;
    this.bus.publish("input.prompt", {
      sessionId: "main", componentId: this.id, text,
    });
  }

  private serveAudioStream(req: IncomingMessage, res: ServerResponse): void {
    res.writeHead(200, { "Content-Type": "audio/mpeg", "Transfer-Encoding": "chunked", "Cache-Control": "no-cache" });
    this.audioStreamClients.add(res);
    req.on("close", () => this.audioStreamClients.delete(res));
  }

  private serveLatest(res: ServerResponse): void {
    if (!this.latestAudio) { res.writeHead(204); res.end(); return; }
    res.writeHead(200, { "Content-Type": "audio/mpeg", "Content-Length": this.latestAudio.length });
    res.end(this.latestAudio);
  }

  private stripMarkdown(text: string): string {
    return text
      .replace(/```[\s\S]*?```/g, "")
      .replace(/`[^`]+`/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[#*_~|>-]/g, "")
      .replace(/\|[^\n]+\|/g, "")
      .replace(/\n{2,}/g, ". ")
      .replace(/\n/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  private getData(): Record<string, unknown> {
    return {
      voice: this.config.voice,
      model: this.config.model,
      enabled: this.config.enabled,
      speaking: this.speaking,
      totalSpoken: this.totalSpoken,
      ttsHealthy: this.ttsHealthy,
      sttLanguage: this.config.sttLanguage,
    };
  }

  private updateHud(): void {
    this.bus.publish(HUD_TOPICS.UPDATE, {
      sessionId: "system",
      componentId: this.id,
      pieceId: this.id,
      data: this.getData(),
      status: this.speaking ? "processing" : this.config.enabled ? "running" : "stopped",
    });
  }
}
