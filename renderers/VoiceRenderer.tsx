// React hooks injected via window.__JARVIS_REACT by the JARVIS esbuild banner
declare const useEffect: typeof import('react').useEffect;
declare const useRef: typeof import('react').useRef;
declare const useState: typeof import('react').useState;

const AUDIO_PORT = 50054;

interface VoiceData {
  voice?: string;
  enabled?: boolean;
  speaking?: boolean;
  totalSpoken?: number;
  ttsHealthy?: boolean | null;
  model?: string;
}

type TtsState = 'online' | 'offline' | 'checking';

function getTtsState(healthy: boolean | null | undefined): TtsState {
  if (healthy === true) return 'online';
  if (healthy === false) return 'offline';
  return 'checking';
}

const ttsColors: Record<TtsState, string> = { online: '#4f4', offline: '#f44', checking: '#ff8' };
const ttsLabels: Record<TtsState, string> = { online: 'ONLINE', offline: 'OFFLINE', checking: 'CHECKING' };

// Same palettes as ReactorCore
const palettes = {
  online:   { primary: 'rgba(68,170,255,0.6)',  secondary: 'rgba(0,229,176,0.4)',  accent: 'rgba(170,102,255,0.3)' },
  speaking: { primary: 'rgba(68,255,68,0.6)',    secondary: 'rgba(0,229,120,0.4)',  accent: 'rgba(120,255,120,0.3)' },
  offline:  { primary: 'rgba(255,68,68,0.3)',    secondary: 'rgba(255,68,68,0.15)', accent: 'rgba(255,68,68,0.1)' },
  checking: { primary: 'rgba(255,200,68,0.5)',   secondary: 'rgba(255,170,68,0.3)', accent: 'rgba(255,220,100,0.2)' },
  disabled: { primary: 'rgba(100,100,100,0.3)',  secondary: 'rgba(80,80,80,0.15)',  accent: 'rgba(60,60,60,0.1)' },
};

export default function VoiceRenderer({ state }: { state: { status: string; data: VoiceData } }) {
  const d = state.data;
  const enabled = d.enabled ?? false;
  const tts = getTtsState(d.ttsHealthy);
  const totalSpoken = d.totalSpoken ?? 0;

  const [isPlaying, setIsPlaying] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;

    async function listenStream() {
      while (!controller.signal.aborted) {
        try {
          const res = await fetch(`http://localhost:${AUDIO_PORT}/stream.mp3`, {
            signal: controller.signal,
          });
          if (!res.body) return;

          const reader = res.body.getReader();
          const chunks: Uint8Array[] = [];
          let firstChunk = true;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
              if (firstChunk) { setIsPlaying(true); firstChunk = false; }
              chunks.push(value);
            }
          }

          if (chunks.length > 0) {
            const blob = new Blob(chunks, { type: "audio/mpeg" });
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audio.onended = () => { URL.revokeObjectURL(url); setIsPlaying(false); };
            audio.onerror = () => { URL.revokeObjectURL(url); setIsPlaying(false); };
            audio.play().catch(() => { URL.revokeObjectURL(url); setIsPlaying(false); });
          } else {
            setIsPlaying(false);
          }
        } catch (e: any) {
          setIsPlaying(false);
          if (e.name === "AbortError") return;
          await new Promise(r => setTimeout(r, 2000));
        }
      }
    }

    listenStream();
    return () => { controller.abort(); abortRef.current = null; };
  }, []);

  const palette = !enabled ? palettes.disabled
    : tts === 'offline' ? palettes.offline
    : tts === 'checking' ? palettes.checking
    : isPlaying ? palettes.speaking
    : palettes.online;

  const isActive = enabled && tts !== 'offline';
  const isWorking = isPlaying;

  const statusText = !enabled ? 'DISABLED'
    : tts === 'offline' ? 'TTS OFFLINE'
    : tts === 'checking' ? 'INITIALIZING'
    : isPlaying ? 'SPEAKING'
    : 'ONLINE';

  const statusColor = !enabled ? '#666'
    : tts === 'offline' ? '#f44'
    : tts === 'checking' ? '#ff8'
    : isPlaying ? '#4f4'
    : '#4af';

  const size = 80;
  const blobSize = size * 0.6;

  return (
    <div style={{
      padding: '8px',
      fontFamily: "'Courier New', monospace",
      fontSize: '10px',
      color: '#8ac',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Orb — uses same CSS classes as ReactorCore from hud.css */}
      <div className="orbWrapper" style={{ width: size, height: size, margin: '4px auto 4px' }}>
        {/* Ambient glow */}
        <div className="orbGlow" style={{
          width: size * 0.8,
          height: size * 0.8,
          background: `radial-gradient(circle, ${palette.primary}, transparent 70%)`,
          opacity: isActive ? 0.4 : 0.1,
          animation: isActive ? 'pulse-slow 3s ease-in-out infinite' : undefined,
        }} />

        {/* Primary blob */}
        <div className="orbBlob" style={{
          width: blobSize,
          height: blobSize,
          borderRadius: '48% 52% 55% 45% / 42% 58% 42% 58%',
          background: `linear-gradient(135deg, ${palette.primary}, ${palette.secondary})`,
          animation: isActive
            ? `morph1 ${isWorking ? '2s' : '4s'} ease-in-out infinite`
            : undefined,
          opacity: isActive ? 1 : 0.3,
        }} />

        {/* Secondary blob */}
        <div className="orbBlobSecondary" style={{
          width: blobSize * 0.85,
          height: blobSize * 0.85,
          borderRadius: '52% 48% 45% 55% / 55% 45% 55% 45%',
          background: `linear-gradient(225deg, ${palette.secondary}, ${palette.accent})`,
          animation: isActive
            ? `morph2 ${isWorking ? '1.5s' : '3s'} ease-in-out infinite`
            : undefined,
          opacity: isActive ? 0.8 : 0.2,
        }} />

        {/* Core highlight */}
        <div className="orbHighlight" style={{
          width: blobSize * 0.5,
          height: blobSize * 0.5,
          borderRadius: '45% 55% 50% 50% / 50% 50% 55% 45%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.35), transparent)',
          animation: isActive
            ? `morph3 ${isWorking ? '1s' : '5s'} ease-in-out infinite`
            : undefined,
          opacity: isActive ? 1 : 0.2,
        }} />

        {/* Spinning halo */}
        {isActive && (
          <div className="orbHalo" style={{
            width: blobSize * 1.3,
            height: blobSize * 1.3,
            background: `conic-gradient(from 0deg, transparent, ${palette.primary}, transparent, ${palette.secondary}, transparent)`,
            opacity: 0.15,
            animation: `spin ${isWorking ? '3s' : '8s'} linear infinite`,
          }} />
        )}

        {/* Ripple rings when speaking */}
        {isWorking && [0, 1, 2].map(i => (
          <div key={i} className="orbRipple" style={{
            width: blobSize * 0.8,
            height: blobSize * 0.8,
            border: `1px solid ${palette.primary}`,
            animation: `ripple 2s ease-out infinite ${i * 0.6}s`,
          }} />
        ))}
      </div>

      {/* Status label */}
      <div className="statusLabel" style={{
        color: statusColor,
        textAlign: 'center',
        marginBottom: '8px',
      }}>
        <div style={{ fontSize: '8px', letterSpacing: '3px', textShadow: `0 0 8px ${statusColor}` }}>
          {statusText}
        </div>
      </div>

      {/* Data rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <DataRow label="VOICE" value={d.voice ?? '—'} color="#8cf" />
        <DataRow label="MODEL" value={d.model ?? '—'} color="#8cf" />
        <DataRow label="TTS" value={ttsLabels[tts]} color={ttsColors[tts]} />
        <DataRow label="SENT" value={String(totalSpoken)} color="#adf" />
      </div>
    </div>
  );
}

function DataRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '1px 0',
      borderBottom: '1px solid #ffffff08',
    }}>
      <span style={{ color: '#567', fontSize: '8px', letterSpacing: '1px' }}>{label}</span>
      <span style={{ color, fontSize: '10px' }}>{value}</span>
    </div>
  );
}
