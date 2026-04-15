export default function VoiceRenderer({ state }: { state: { status: string; data: Record<string, any> } }) {
  const d = state.data;
  const healthColor = d.ttsHealthy === true ? '#4f4' : d.ttsHealthy === false ? '#f44' : '#888';
  const statusColor = d.speaking ? '#fa4' : d.enabled ? '#4af' : '#666';

  return (
    <div style={{ padding: '10px', fontFamily: 'monospace', fontSize: '11px', color: '#ccc' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <div style={{
          width: '10px', height: '10px', borderRadius: '50%',
          backgroundColor: statusColor,
          boxShadow: `0 0 6px ${statusColor}`,
        }} />
        <span style={{ color: statusColor, letterSpacing: '2px', fontSize: '10px' }}>
          {d.speaking ? 'SPEAKING' : d.enabled ? 'READY' : 'DISABLED'}
        </span>
      </div>

      <div style={{ marginBottom: '4px' }}>
        <span style={{ color: '#888' }}>VOICE: </span>
        <span style={{ color: '#8af' }}>{d.voice ?? 'unknown'}</span>
      </div>

      <div style={{ marginBottom: '4px' }}>
        <span style={{ color: '#888' }}>TTS: </span>
        <span style={{ color: healthColor }}>
          {d.ttsHealthy === true ? 'ONLINE' : d.ttsHealthy === false ? 'OFFLINE' : 'CHECKING'}
        </span>
      </div>

      <div style={{ marginBottom: '4px' }}>
        <span style={{ color: '#888' }}>STT LANG: </span>
        <span style={{ color: '#8af' }}>{d.sttLanguage ?? 'auto'}</span>
      </div>

      <div>
        <span style={{ color: '#888' }}>SPOKEN: </span>
        <span style={{ color: '#8af' }}>{d.totalSpoken ?? 0}</span>
      </div>
    </div>
  )
}
