import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Download,
  Mic,
  Music,
  Play,
  Square,
  Volume2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LipSyncKeyframe, StudioTransferPayload } from '../types/studio';

interface AudioLipSyncViewProps {
  onOpenAuth: () => void;
  onSendToEditor: (payload: StudioTransferPayload) => void;
}

function encodeWavFromFloat32(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

export function AudioLipSyncView({
  onOpenAuth,
  onSendToEditor,
}: AudioLipSyncViewProps) {
  const { dbUser, authFetch, refreshWorkspace } = useAuth();
  const [tab, setTab] = useState<'voice' | 'lipsync' | 'music'>('voice');

  // Voice Generator State
  const [voiceMode, setVoiceMode] = useState<'single' | 'dual'>('single');
  const [voiceTitle, setVoiceTitle] = useState('Protagonist Opening Monologue');
  const [voiceName, setVoiceName] = useState('Kore');
  const [styleDirection, setStyleDirection] = useState(
    'Calm, cinematic sci-fi trailer narrator, intimate studio microphone'
  );
  const [voiceText, setVoiceText] = useState(
    'Above the twilight horizon, every signal we left behind is finally answering.'
  );
  const [secondSpeakerName, setSecondSpeakerName] = useState('Commander Vance');
  const [secondVoiceName, setSecondVoiceName] = useState('Fenrir');
  const [secondSpeakerText, setSecondSpeakerText] = useState(
    'Then lock the orbital array and begin final sequence.'
  );
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [voiceAudioUrl, setVoiceAudioUrl] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // Lip-Sync State
  const [lipDialogue, setLipDialogue] = useState(
    'Initializing neural orbital uplink. Visual telemetry locked.'
  );
  const [lipFps, setLipFps] = useState(24);
  const [lipDuration, setLipDuration] = useState(5);
  const [lipBackend, setLipBackend] = useState<'gemini-viseme' | 'cuda-worker'>(
    'gemini-viseme'
  );
  const [lipBusy, setLipBusy] = useState(false);
  const [lipKeyframes, setLipKeyframes] = useState<LipSyncKeyframe[]>([]);
  const [lipError, setLipError] = useState<string | null>(null);
  const [lipPlaying, setLipPlaying] = useState(false);
  const lipCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Music Generator State
  const [musicPrompt, setMusicPrompt] = useState(
    'Deep futuristic synthwave and orchestral sub-bass pulse, 108 BPM, obsidian cinema tension.'
  );
  const [musicBackend, setMusicBackend] = useState<
    'lyria-clip' | 'lyria-pro' | 'cuda-musicgen' | 'webaudio-stem'
  >('webaudio-stem');
  const [musicBusy, setMusicBusy] = useState(false);
  const [musicAudioUrl, setMusicAudioUrl] = useState<string | null>(null);
  const [musicError, setMusicError] = useState<string | null>(null);

  // Real-time Lip-Sync Viseme Canvas Preview
  useEffect(() => {
    const canvas = lipCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    const startTime = performance.now();
    const avatarImg = new Image();
    avatarImg.crossOrigin = 'anonymous';
    avatarImg.src = '/src/assets/images/vyro_character_aria_1795013504111.jpg';

    const drawFrame = (now: number) => {
      const elapsedSec = lipPlaying
        ? ((now - startTime) / 1000) % lipDuration
        : 0;

      let activeFrame: LipSyncKeyframe = {
        timeSec: 0,
        viseme: 'REST',
        mouthOpen: 0.1,
        lipRound: 0.2,
        headTiltDeg: 0,
        syllable: '',
      };

      if (lipKeyframes.length > 0) {
        for (const kf of lipKeyframes) {
          if (kf.timeSec <= elapsedSec) activeFrame = kf;
        }
      }

      ctx.fillStyle = '#06070B';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((activeFrame.headTiltDeg * Math.PI) / 180);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);

      if (avatarImg.complete && avatarImg.naturalWidth > 0) {
        const scale = Math.max(
          canvas.width / avatarImg.naturalWidth,
          canvas.height / avatarImg.naturalHeight
        );
        const w = avatarImg.naturalWidth * scale;
        const h = avatarImg.naturalHeight * scale;
        ctx.drawImage(
          avatarImg,
          (canvas.width - w) / 2,
          (canvas.height - h) / 2,
          w,
          h
        );
      }
      ctx.restore();

      // Viseme telemetry overlay bar
      ctx.fillStyle = 'rgba(6, 7, 11, 0.82)';
      ctx.fillRect(0, canvas.height - 54, canvas.width, 54);

      // Animated lip waveform indicator
      const openH = 4 + activeFrame.mouthOpen * 20;
      const mouthW = 24 + (1 - activeFrame.lipRound) * 18;
      ctx.strokeStyle = '#60A5FA';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(
        canvas.width - 48,
        canvas.height - 27,
        mouthW / 2,
        openH / 2,
        0,
        0,
        Math.PI * 2
      );
      ctx.stroke();

      ctx.fillStyle = '#E2E8F0';
      ctx.font = '12px JetBrains Mono, monospace';
      ctx.fillText(
        `VISEME: ${activeFrame.viseme}  T+${elapsedSec.toFixed(2)}s`,
        14,
        canvas.height - 23
      );

      if (lipPlaying) {
        rafId = requestAnimationFrame(drawFrame);
      }
    };

    avatarImg.onload = () => drawFrame(performance.now());
    drawFrame(performance.now());
    if (lipPlaying) {
      rafId = requestAnimationFrame(drawFrame);
    }

    return () => cancelAnimationFrame(rafId);
  }, [lipKeyframes, lipPlaying, lipDuration]);

  const handleGenerateVoice = async () => {
    if (!dbUser) {
      onOpenAuth();
      return;
    }
    setVoiceBusy(true);
    setVoiceError(null);
    try {
      const res = await authFetch('/api/ai/voice', {
        method: 'POST',
        body: JSON.stringify({
          title: voiceTitle,
          mode: voiceMode,
          text: voiceText,
          voiceName,
          styleDirection,
          secondSpeakerName,
          secondVoiceName,
          secondSpeakerText,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Voice generation failed');
      setVoiceAudioUrl(data.audioDataUrl);
      await refreshWorkspace();
    } catch (err: unknown) {
      setVoiceError(
        err instanceof Error ? err.message : 'AI Voice generation failed.'
      );
    } finally {
      setVoiceBusy(false);
    }
  };

  const handleGenerateLipSync = async () => {
    if (!dbUser) {
      onOpenAuth();
      return;
    }
    setLipBusy(true);
    setLipError(null);
    try {
      const res = await authFetch('/api/ai/lip-sync', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Character Lip-Sync Track',
          dialogue: lipDialogue,
          durationSec: lipDuration,
          fps: lipFps,
          executionBackend: lipBackend,
        }),
      });
      const data = await res.json();
      await refreshWorkspace();
      if (!res.ok) throw new Error(data.error || 'Lip-sync failed');
      if (data.timeline?.keyframes) {
        setLipKeyframes(data.timeline.keyframes);
        setLipPlaying(true);
      }
    } catch (err: unknown) {
      setLipError(
        err instanceof Error ? err.message : 'Lip-sync generation failed.'
      );
    } finally {
      setLipBusy(false);
    }
  };

  const handleGenerateMusic = async () => {
    setMusicBusy(true);
    setMusicError(null);
    try {
      if (musicBackend === 'webaudio-stem') {
        // Real offline WebAudio cinematic stem synthesizer -> downloadable WAV
        const sampleRate = 24000;
        const duration = 12;
        const length = sampleRate * duration;
        const samples = new Float32Array(length);
        const freqs = [55, 110, 164.81, 220];
        for (let i = 0; i < length; i++) {
          const t = i / sampleRate;
          const env =
            Math.min(1, t / 1.2) * Math.min(1, (duration - t) / 1.5);
          const pulse = 0.65 + 0.35 * Math.sin(2 * Math.PI * 1.8 * t);
          let val = 0;
          for (let f = 0; f < freqs.length; f++) {
            val +=
              Math.sin(2 * Math.PI * freqs[f] * t) * (0.28 / (f + 1)) * pulse;
          }
          samples[i] = val * env * 0.5;
        }
        const wavBlob = encodeWavFromFloat32(samples, sampleRate);
        const url = URL.createObjectURL(wavBlob);
        setMusicAudioUrl(url);
        return;
      }

      if (!dbUser) {
        onOpenAuth();
        return;
      }

      const res = await authFetch('/api/ai/music', {
        method: 'POST',
        body: JSON.stringify({
          title: 'VYRO AI Score',
          prompt: musicPrompt,
          proMode: musicBackend === 'lyria-pro',
          executionBackend:
            musicBackend === 'cuda-musicgen' ? 'cuda-worker' : 'gemini-cloud',
        }),
      });
      const data = await res.json();
      await refreshWorkspace();
      if (!res.ok) throw new Error(data.error || 'Music generation failed');
      setMusicAudioUrl(data.audioDataUrl);
    } catch (err: unknown) {
      setMusicError(
        err instanceof Error ? err.message : 'Music generation failed.'
      );
    } finally {
      setMusicBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-100">
            Audio, Lip Sync & Music Studio
          </h1>
          <p className="text-sm text-slate-400">
            Live Gemini 3.8 24kHz WAV Voiceover, Viseme Lip-Sync & Score
            Synthesis
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-[#0D1017] border border-slate-800">
          {(
            [
              ['voice', 'AI Voice Generator'],
              ['lipsync', 'AI Lip Sync'],
              ['music', 'AI Music'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                tab === key
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: AI VOICE GENERATOR */}
      {tab === 'voice' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 rounded-xl border border-slate-800 bg-[#0D1017] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-slate-100">
                Gemini 3.8 Studio Voice Synthesizer
              </h2>
              <div className="flex items-center gap-1 p-1 rounded-md bg-[#06070B] border border-slate-800">
                <button
                  type="button"
                  onClick={() => setVoiceMode('single')}
                  className={`px-2.5 py-1 rounded text-xs font-medium ${
                    voiceMode === 'single'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400'
                  }`}
                >
                  Single Narrator
                </button>
                <button
                  type="button"
                  onClick={() => setVoiceMode('dual')}
                  className={`px-2.5 py-1 rounded text-xs font-medium ${
                    voiceMode === 'dual'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400'
                  }`}
                >
                  Dual Screenplay
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Track Title
                </label>
                <input
                  type="text"
                  value={voiceTitle}
                  onChange={(e) => setVoiceTitle(e.target.value)}
                  className="w-full rounded-lg bg-[#06070B] border border-slate-800 px-3 py-2 text-sm text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Voice Persona
                </label>
                <select
                  value={voiceName}
                  onChange={(e) => setVoiceName(e.target.value)}
                  className="w-full rounded-lg bg-[#06070B] border border-slate-800 px-3 py-2 text-sm text-slate-100"
                >
                  <option value="Kore">Kore · Cinematic Alto</option>
                  <option value="Fenrir">Fenrir · Deep Trailer Bass</option>
                  <option value="Charon">Charon · Documentary Baritone</option>
                  <option value="Puck">Puck · Expressive Tenor</option>
                  <option value="Zephyr">Zephyr · Crisp Soprano</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Performance & Acoustic Direction
              </label>
              <input
                type="text"
                value={styleDirection}
                onChange={(e) => setStyleDirection(e.target.value)}
                className="w-full rounded-lg bg-[#06070B] border border-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                {voiceMode === 'dual' ? 'Speaker 1 Dialogue' : 'Narration Script'}
              </label>
              <textarea
                rows={3}
                value={voiceText}
                onChange={(e) => setVoiceText(e.target.value)}
                className="w-full rounded-lg bg-[#06070B] border border-slate-800 p-3 text-sm text-slate-100"
              />
            </div>

            {voiceMode === 'dual' && (
              <div className="space-y-3 pt-2 border-t border-slate-800/80">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Speaker 2 Name
                    </label>
                    <input
                      type="text"
                      value={secondSpeakerName}
                      onChange={(e) => setSecondSpeakerName(e.target.value)}
                      className="w-full rounded-lg bg-[#06070B] border border-slate-800 px-3 py-2 text-sm text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Speaker 2 Voice
                    </label>
                    <select
                      value={secondVoiceName}
                      onChange={(e) => setSecondVoiceName(e.target.value)}
                      className="w-full rounded-lg bg-[#06070B] border border-slate-800 px-3 py-2 text-sm text-slate-100"
                    >
                      <option value="Fenrir">Fenrir</option>
                      <option value="Puck">Puck</option>
                      <option value="Charon">Charon</option>
                      <option value="Kore">Kore</option>
                      <option value="Zephyr">Zephyr</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Speaker 2 Dialogue
                  </label>
                  <textarea
                    rows={2}
                    value={secondSpeakerText}
                    onChange={(e) => setSecondSpeakerText(e.target.value)}
                    className="w-full rounded-lg bg-[#06070B] border border-slate-800 p-3 text-sm text-slate-100"
                  />
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleGenerateVoice}
              disabled={voiceBusy}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Mic className="w-4 h-4" />
              <span>
                {voiceBusy ? 'Synthesizing WAV...' : 'Generate Studio Voiceover'}
              </span>
            </button>

            {voiceError && (
              <div className="rounded-lg bg-red-950/40 border border-red-900/60 p-3 text-xs text-red-200">
                {voiceError}
              </div>
            )}
          </div>

          <div className="lg:col-span-5 rounded-xl border border-slate-800 bg-[#0D1017] p-6 flex flex-col justify-between space-y-5">
            <div>
              <div className="flex items-center gap-2 text-xs text-blue-400 font-mono mb-2">
                <Volume2 className="w-4 h-4" />
                <span>24KHZ 16-BIT PCM WAV OUTPUT</span>
              </div>
              <h3 className="font-display text-lg font-semibold text-slate-100 mb-2">
                Audio Master Monitor
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Every generated voiceover is stored directly in your PostgreSQL
                render history as a lossless WAV track ready for the NLE Editing
                Studio.
              </p>
            </div>

            {voiceAudioUrl ? (
              <div className="space-y-4">
                <audio controls src={voiceAudioUrl} className="w-full" />
                <div className="flex flex-wrap gap-2">
                  <a
                    href={voiceAudioUrl}
                    download={`${voiceTitle.toLowerCase().replace(/\s+/g, '_')}.wav`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-100"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download WAV</span>
                  </a>
                  <button
                    type="button"
                    onClick={() =>
                      onSendToEditor({
                        title: voiceTitle,
                        voiceAudioUrl,
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-medium text-white"
                  >
                    <span>Send to Editing Studio</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-800 bg-[#06070B] p-8 text-center text-xs text-slate-500">
                Click Generate Studio Voiceover to synthesize real WAV audio via
                Gemini 3.8 TTS.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: AI LIP SYNC */}
      {tab === 'lipsync' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 rounded-xl border border-slate-800 bg-[#0D1017] p-6 space-y-4">
            <h2 className="font-display text-base font-semibold text-slate-100">
              AI Lip-Sync Viseme & Facial Rig Generator
            </h2>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Spoken Dialogue Script
              </label>
              <textarea
                rows={3}
                value={lipDialogue}
                onChange={(e) => setLipDialogue(e.target.value)}
                className="w-full rounded-lg bg-[#06070B] border border-slate-800 p-3 text-sm text-slate-100"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Duration (s, max 300)
                </label>
                <input
                  type="number"
                  min={2}
                  max={300}
                  value={lipDuration}
                  onChange={(e) => setLipDuration(Number(e.target.value))}
                  className="w-full rounded-lg bg-[#06070B] border border-slate-800 px-3 py-2 text-xs font-mono text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Frame Rate
                </label>
                <select
                  value={lipFps}
                  onChange={(e) => setLipFps(Number(e.target.value))}
                  className="w-full rounded-lg bg-[#06070B] border border-slate-800 px-3 py-2 text-xs font-mono text-slate-100"
                >
                  <option value={24}>24 fps</option>
                  <option value={30}>30 fps</option>
                  <option value={60}>60 fps</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Engine
                </label>
                <select
                  value={lipBackend}
                  onChange={(e) =>
                    setLipBackend(
                      e.target.value as 'gemini-viseme' | 'cuda-worker'
                    )
                  }
                  className="w-full rounded-lg bg-[#06070B] border border-slate-800 px-3 py-2 text-xs text-slate-100"
                >
                  <option value="gemini-viseme">Gemini Viseme Track</option>
                  <option value="cuda-worker">Wav2Lip CUDA Worker</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleGenerateLipSync}
                disabled={lipBusy}
                className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium disabled:opacity-50"
              >
                {lipBusy
                  ? 'Computing Phonemes...'
                  : 'Generate Synchronized Lip-Sync'}
              </button>
              {lipKeyframes.length > 0 && (
                <button
                  type="button"
                  onClick={() => setLipPlaying((p) => !p)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-slate-800 text-slate-100 text-sm font-medium"
                >
                  {lipPlaying ? (
                    <>
                      <Square className="w-3.5 h-3.5" />
                      <span>Stop</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {lipError && (
              <div className="rounded-lg bg-amber-950/40 border border-amber-900/60 p-3 text-xs text-amber-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{lipError}</span>
              </div>
            )}

            {lipKeyframes.length > 0 && (
              <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-800 bg-[#06070B] p-3">
                <table className="w-full text-xs font-mono tabular-nums">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-800">
                      <th className="py-1 text-left">Time</th>
                      <th className="py-1 text-left">Viseme</th>
                      <th className="py-1 text-left">Syllable</th>
                      <th className="py-1 text-right">Aperture</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {lipKeyframes.map((kf, i) => (
                      <tr key={i} className="text-slate-300">
                        <td className="py-1">{kf.timeSec.toFixed(2)}s</td>
                        <td className="py-1 text-blue-400">{kf.viseme}</td>
                        <td className="py-1">{kf.syllable}</td>
                        <td className="py-1 text-right">
                          {Math.round(kf.mouthOpen * 100)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="lg:col-span-6 rounded-xl border border-slate-800 bg-[#0D1017] overflow-hidden">
            <canvas
              ref={lipCanvasRef}
              width={640}
              height={420}
              className="w-full h-auto block bg-[#06070B]"
            />
          </div>
        </div>
      )}

      {/* TAB 3: AI MUSIC GENERATOR */}
      {tab === 'music' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 rounded-xl border border-slate-800 bg-[#0D1017] p-6 space-y-4">
            <h2 className="font-display text-base font-semibold text-slate-100">
              AI Music & Cinematic Score Generator
            </h2>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Musical Prompt, Tempo & Instrumentation
              </label>
              <textarea
                rows={3}
                value={musicPrompt}
                onChange={(e) => setMusicPrompt(e.target.value)}
                className="w-full rounded-lg bg-[#06070B] border border-slate-800 p-3 text-sm text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Audio Synthesis Engine
              </label>
              <select
                value={musicBackend}
                onChange={(e) =>
                  setMusicBackend(
                    e.target.value as
                      | 'lyria-clip'
                      | 'lyria-pro'
                      | 'cuda-musicgen'
                      | 'webaudio-stem'
                  )
                }
                className="w-full rounded-lg bg-[#06070B] border border-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                <option value="webaudio-stem">
                  Studio Stem Synthesizer (Instant Browser WAV)
                </option>
                <option value="lyria-clip">
                  Google Lyria 3 Clip 30s (Requires Paid Key)
                </option>
                <option value="lyria-pro">
                  Google Lyria 3 Pro Full Track (Requires Paid Key)
                </option>
                <option value="cuda-musicgen">
                  NVIDIA CUDA MusicGen Worker (GPU_WORKER_URL)
                </option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleGenerateMusic}
              disabled={musicBusy}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium disabled:opacity-50"
            >
              <Music className="w-4 h-4" />
              <span>
                {musicBusy ? 'Composing Audio...' : 'Generate Soundtrack'}
              </span>
            </button>

            {musicError && (
              <div className="rounded-lg bg-amber-950/40 border border-amber-900/60 p-3 text-xs text-amber-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{musicError}</span>
              </div>
            )}
          </div>

          <div className="lg:col-span-5 rounded-xl border border-slate-800 bg-[#0D1017] p-6 flex flex-col justify-between space-y-4">
            <div>
              <h3 className="font-display text-lg font-semibold text-slate-100 mb-2">
                Score Master Output
              </h3>
              <p className="text-xs text-slate-400">
                Preview your generated score and send it straight to Track A2 of
                the Editing Studio timeline.
              </p>
            </div>

            {musicAudioUrl ? (
              <div className="space-y-4">
                <audio controls src={musicAudioUrl} className="w-full" />
                <div className="flex flex-wrap gap-2">
                  <a
                    href={musicAudioUrl}
                    download="vyro_score.wav"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 text-xs font-medium text-slate-100"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Audio</span>
                  </a>
                  <button
                    type="button"
                    onClick={() =>
                      onSendToEditor({
                        title: 'Scored Sequence',
                        musicAudioUrl,
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 text-xs font-medium text-white"
                  >
                    <span>Send to Editing Studio</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-800 bg-[#06070B] p-8 text-center text-xs text-slate-500">
                Select Studio Stem Synthesizer for instant WAV playback or
                connect Lyria / CUDA MusicGen.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
