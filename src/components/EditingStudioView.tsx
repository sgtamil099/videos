import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Download,
  Film,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Upload,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { StoryScene, StudioTransferPayload } from '../types/studio';

interface EditingStudioViewProps {
  transferPayload: StudioTransferPayload | null;
  onOpenAuth: () => void;
}

const DEFAULT_SCENES: StoryScene[] = [
  {
    sceneNumber: 1,
    title: 'Virtual Production Stage',
    durationSec: 4,
    cameraMovement: 'Slow Dolly In',
    lighting: 'Electric Blue & Obsidian',
    visualPrompt: 'Virtual stage camera rig on obsidian floor',
    dialogue: 'Initial optical calibration complete.',
    speaker: 'Aria Voss',
    audioCue: 'Sub-bass pulse',
    colorGrade: 'Cinema Obsidian',
    imageUrl: '/src/assets/images/vyro_hero_cinema_1795013506539.jpg',
  },
  {
    sceneNumber: 2,
    title: 'Orbital Horizon Deck',
    durationSec: 4,
    cameraMovement: 'Wide Lateral Pan',
    lighting: 'Twilight Horizon Rim',
    visualPrompt: 'Orbital station deck overlooking twilight planet',
    dialogue: 'Signal confirmed across the eastern terminator.',
    speaker: 'Aria Voss',
    audioCue: 'Atmospheric swell',
    colorGrade: 'Electric Cobalt',
    imageUrl: '/src/assets/images/vyro_scene_orbital_1795013566012.jpg',
  },
  {
    sceneNumber: 3,
    title: 'Basalt Rain Courtyard',
    durationSec: 4,
    cameraMovement: 'Low Tracking Shot',
    lighting: 'Violet & Wet Basalt Reflections',
    visualPrompt: 'Rain-slicked brutalist stone courtyard at night',
    dialogue: 'Proceed to extraction point alpha.',
    speaker: 'Commander Vance',
    audioCue: 'Rain & distant synth',
    colorGrade: 'Anamorphic Silver',
    imageUrl: '/src/assets/images/vyro_scene_tokyo_1795013505173.jpg',
  },
];

const LUT_FILTERS: Record<string, string> = {
  'Cinema Obsidian': 'contrast(1.12) saturate(0.92) brightness(0.96)',
  'Electric Cobalt': 'contrast(1.15) saturate(1.18) hue-rotate(-8deg)',
  'Anamorphic Silver': 'contrast(1.2) saturate(0.65) brightness(1.02)',
  'Monochrome Noir': 'grayscale(1) contrast(1.28) brightness(0.95)',
};

export function EditingStudioView({
  transferPayload,
  onOpenAuth,
}: EditingStudioViewProps) {
  const { dbUser, authFetch, refreshWorkspace } = useAuth();

  const [projectTitle, setProjectTitle] = useState('VYRO Master Cut 01');
  const [scenes, setScenes] = useState<StoryScene[]>(DEFAULT_SCENES);
  const [lut, setLut] = useState<string>('Cinema Obsidian');
  const [exportRes, setExportRes] = useState<'720p' | '1080p' | '4K'>('1080p');
  const [showCaptions, setShowCaptions] = useState(true);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  const [musicUrl, setMusicUrl] = useState<string | null>(null);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [rendering, setRendering] = useState(false);
  const [exportedVideoUrl, setExportedVideoUrl] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const loadedImagesRef = useRef<Record<string, HTMLImageElement>>({});
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!transferPayload) return;
    if (transferPayload.title) setProjectTitle(transferPayload.title);
    if (transferPayload.scenes && transferPayload.scenes.length > 0) {
      setScenes(transferPayload.scenes);
      setCurrentTime(0);
    }
    if (transferPayload.voiceAudioUrl) {
      setVoiceUrl(transferPayload.voiceAudioUrl);
    }
    if (transferPayload.musicAudioUrl) {
      setMusicUrl(transferPayload.musicAudioUrl);
    }
  }, [transferPayload]);

  const totalDuration = useMemo(
    () => Math.max(1, scenes.reduce((s, sc) => s + (sc.durationSec || 4), 0)),
    [scenes]
  );

  // Preload scene images
  useEffect(() => {
    scenes.forEach((sc) => {
      const src =
        sc.imageUrl || '/src/assets/images/vyro_scene_orbital_1795013566012.jpg';
      if (!loadedImagesRef.current[src]) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = src;
        loadedImagesRef.current[src] = img;
      }
    });
  }, [scenes]);

  // Playback timer
  useEffect(() => {
    if (!playing) {
      voiceAudioRef.current?.pause();
      musicAudioRef.current?.pause();
      return;
    }

    if (voiceAudioRef.current && voiceUrl) {
      voiceAudioRef.current.currentTime = Math.min(
        currentTime,
        voiceAudioRef.current.duration || currentTime
      );
      voiceAudioRef.current.play().catch(() => {});
    }
    if (musicAudioRef.current && musicUrl) {
      musicAudioRef.current.currentTime = Math.min(
        currentTime,
        musicAudioRef.current.duration || currentTime
      );
      musicAudioRef.current.play().catch(() => {});
    }

    let last = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setCurrentTime((prev) => {
        const next = prev + dt;
        if (next >= totalDuration) {
          setPlaying(false);
          return 0;
        }
        return next;
      });
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [playing, totalDuration, voiceUrl, musicUrl]);

  // Draw Canvas2D Program Monitor frame
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let elapsed = 0;
    let activeScene = scenes[0];
    let sceneProgress = 0;
    for (const sc of scenes) {
      const d = sc.durationSec || 4;
      if (currentTime <= elapsed + d) {
        activeScene = sc;
        sceneProgress = Math.max(0, Math.min(1, (currentTime - elapsed) / d));
        break;
      }
      elapsed += d;
    }

    ctx.fillStyle = '#06070B';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (activeScene) {
      const src =
        activeScene.imageUrl ||
        '/src/assets/images/vyro_scene_orbital_1795013566012.jpg';
      const img = loadedImagesRef.current[src];
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.save();
        ctx.filter = LUT_FILTERS[lut] || 'none';
        const zoom = 1.0 + sceneProgress * 0.08;
        const baseScale = Math.max(
          canvas.width / img.naturalWidth,
          canvas.height / img.naturalHeight
        );
        const w = img.naturalWidth * baseScale * zoom;
        const h = img.naturalHeight * baseScale * zoom;
        const panX = (canvas.width - w) * (0.4 + sceneProgress * 0.2);
        const panY = (canvas.height - h) * 0.5;
        ctx.drawImage(img, panX, panY, w, h);
        ctx.restore();
      }

      // Subtle cinema letterbox + HUD
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, 36);
      ctx.fillRect(0, canvas.height - 44, canvas.width, 44);

      if (showCaptions && activeScene.dialogue) {
        ctx.fillStyle = 'rgba(6, 7, 11, 0.78)';
        ctx.fillRect(80, canvas.height - 96, canvas.width - 160, 38);
        ctx.fillStyle = '#F8FAFC';
        ctx.font = '500 18px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
          `${activeScene.speaker ? activeScene.speaker + ': ' : ''}${activeScene.dialogue}`,
          canvas.width / 2,
          canvas.height - 71
        );
        ctx.textAlign = 'left';
      }

      ctx.fillStyle = '#94A3B8';
      ctx.font = '12px "JetBrains Mono", monospace';
      ctx.fillText(
        `VYRO NLE · ${projectTitle.toUpperCase()} · SCENE 0${activeScene.sceneNumber}`,
        18,
        22
      );
      ctx.fillText(
        `TC ${currentTime.toFixed(2)}s / ${totalDuration.toFixed(2)}s · ${lut}`,
        18,
        canvas.height - 17
      );
    }
  }, [currentTime, scenes, lut, showCaptions, projectTitle, totalDuration]);

  const handleSaveProject = async () => {
    if (!dbUser) {
      onOpenAuth();
      return;
    }
    const res = await authFetch('/api/projects', {
      method: 'POST',
      body: JSON.stringify({
        title: projectTitle,
        description: `NLE Timeline (${scenes.length} scenes, ${totalDuration}s)`,
        targetResolution: exportRes,
        storyboardJson: { projectTitle, logline: 'NLE Cut', scenes },
      }),
    });
    if (res.ok) {
      await refreshWorkspace();
      setExportStatus('Timeline saved to My Projects in PostgreSQL.');
    }
  };

  const handleRenderExport = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setRendering(true);
    setExportedVideoUrl(null);
    setExportStatus('Capturing real-time Canvas2D sequence via MediaRecorder...');

    try {
      const stream = canvas.captureStream(30);
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const stopped = new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          resolve(new Blob(chunks, { type: mimeType }));
        };
      });

      setCurrentTime(0);
      setPlaying(true);
      recorder.start(250);

      const recordMs = Math.min(totalDuration * 1000, 300000);
      await new Promise((r) => setTimeout(r, recordMs));

      recorder.stop();
      setPlaying(false);
      const blob = await stopped;
      const url = URL.createObjectURL(blob);
      setExportedVideoUrl(url);
      setExportStatus(
        `Export ready (${(blob.size / 1024).toFixed(0)} KB WebM).`
      );

      if (dbUser) {
        await authFetch('/api/jobs/studio-export', {
          method: 'POST',
          body: JSON.stringify({
            title: projectTitle,
            prompt: `${scenes.length} scenes · ${lut}`,
            resolution: exportRes,
            format: 'WEBM',
            durationSec: Math.round(recordMs / 1000),
            outputMeta: { byteSize: blob.size, lut },
          }),
        });
        await refreshWorkspace();
      }
    } catch (err: unknown) {
      setExportStatus(
        err instanceof Error ? err.message : 'Browser MediaRecorder failed.'
      );
    } finally {
      setRendering(false);
    }
  };

  const handleAddCustomClip = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setScenes((prev) => [
      ...prev,
      {
        sceneNumber: prev.length + 1,
        title: file.name.replace(/\.[^/.]+$/, ''),
        durationSec: 4,
        cameraMovement: 'Slow Push',
        lighting: 'Custom Clip',
        visualPrompt: file.name,
        dialogue: '',
        speaker: '',
        audioCue: '',
        colorGrade: lut,
        imageUrl: url,
      },
    ]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-100">
            Professional Video Editing Studio
          </h1>
          <p className="text-sm text-slate-400">
            Multi-Track NLE Timeline, Color Grading LUTs & Real-Time Video
            Exporter
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSaveProject}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#131722] hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Project</span>
          </button>
          <button
            type="button"
            onClick={handleRenderExport}
            disabled={rendering}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white disabled:opacity-50"
          >
            <Film className="w-3.5 h-3.5" />
            <span>
              {rendering ? 'Rendering Video...' : `Render & Export (${exportRes})`}
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Program Monitor */}
        <div className="lg:col-span-8 rounded-xl border border-slate-800 bg-[#0D1017] overflow-hidden">
          <canvas
            ref={canvasRef}
            width={960}
            height={540}
            className="w-full h-auto block bg-[#06070B]"
          />

          {/* Transport Bar */}
          <div className="p-4 border-t border-slate-800 space-y-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPlaying((p) => !p)}
                className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white"
                aria-label={playing ? 'Pause playback' : 'Play timeline'}
              >
                {playing ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPlaying(false);
                  setCurrentTime(0);
                }}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
                aria-label="Reset playhead"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <input
                type="range"
                min={0}
                max={totalDuration}
                step={0.05}
                value={currentTime}
                onChange={(e) => setCurrentTime(Number(e.target.value))}
                className="flex-1 accent-blue-500"
              />

              <span className="font-mono text-xs tabular-nums text-slate-300 shrink-0">
                {currentTime.toFixed(2)}s / {totalDuration.toFixed(2)}s
              </span>
            </div>
          </div>
        </div>

        {/* Inspector & Color LUT Panel */}
        <div className="lg:col-span-4 rounded-xl border border-slate-800 bg-[#0D1017] p-5 space-y-4">
          <h2 className="font-display text-base font-semibold text-slate-100">
            Master Sequence Inspector
          </h2>

          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Sequence Name
            </label>
            <input
              type="text"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              className="w-full rounded-lg bg-[#06070B] border border-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Color LUT
              </label>
              <select
                value={lut}
                onChange={(e) => setLut(e.target.value)}
                className="w-full rounded-lg bg-[#06070B] border border-slate-800 px-3 py-2 text-xs text-slate-100"
              >
                {Object.keys(LUT_FILTERS).map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Export Target
              </label>
              <select
                value={exportRes}
                onChange={(e) =>
                  setExportRes(e.target.value as '720p' | '1080p' | '4K')
                }
                className="w-full rounded-lg bg-[#06070B] border border-slate-800 px-3 py-2 text-xs font-mono text-slate-100"
              >
                <option value="720p">720p</option>
                <option value="1080p">1080p</option>
                <option value="4K">4K</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={showCaptions}
              onChange={(e) => setShowCaptions(e.target.checked)}
              className="accent-blue-500"
            />
            <span>Burn-in Dialogue Subtitles</span>
          </label>

          <label className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg border border-dashed border-slate-700 bg-[#06070B] hover:border-blue-500 text-xs text-slate-300 cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-blue-400" />
            <span>Import Image Clip to Timeline</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleAddCustomClip}
              className="hidden"
            />
          </label>

          {exportStatus && (
            <div className="rounded-lg bg-slate-900 border border-slate-800 p-3 text-xs text-slate-200">
              {exportStatus}
            </div>
          )}

          {exportedVideoUrl && (
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <video
                src={exportedVideoUrl}
                controls
                className="w-full rounded-lg bg-black"
              />
              <a
                href={exportedVideoUrl}
                download={`${projectTitle.toLowerCase().replace(/\s+/g, '_')}.webm`}
                className="inline-flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Rendered Video</span>
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Multi-Track NLE Timeline */}
      <div className="rounded-xl border border-slate-800 bg-[#0D1017] p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold text-slate-100">
            Multi-Track Timeline (V1 Video · A1 Voice · A2 Score)
          </h3>
          <button
            type="button"
            onClick={() =>
              setScenes((prev) => [
                ...prev,
                {
                  sceneNumber: prev.length + 1,
                  title: `Scene 0${prev.length + 1}`,
                  durationSec: 4,
                  cameraMovement: 'Pan',
                  lighting: 'Studio',
                  visualPrompt: 'Added scene',
                  dialogue: '',
                  speaker: 'Narrator',
                  audioCue: '',
                  colorGrade: lut,
                  imageUrl: '/src/assets/images/vyro_scene_orbital_1795013566012.jpg',
                },
              ])
            }
            className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Append Clip</span>
          </button>
        </div>

        {/* V1 Track */}
        <div className="flex items-stretch gap-2 overflow-x-auto pb-2">
          <div className="w-16 shrink-0 flex items-center justify-center rounded bg-[#06070B] border border-slate-800 text-xs font-mono text-slate-400">
            V1
          </div>
          {scenes.map((sc, idx) => (
            <div
              key={`${sc.sceneNumber}-${idx}`}
              style={{ minWidth: `${Math.max(150, sc.durationSec * 38)}px` }}
              className="rounded-lg border border-blue-500/40 bg-[#131722] p-2.5 flex items-center justify-between gap-2 shrink-0"
            >
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-100 truncate">
                  {sc.title}
                </p>
                <p className="text-xs font-mono text-slate-400">
                  {sc.durationSec}s · {sc.cameraMovement}
                </p>
              </div>
              {scenes.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setScenes((prev) => prev.filter((_, i) => i !== idx))
                  }
                  aria-label="Remove clip"
                  className="text-slate-500 hover:text-red-400 p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* A1 & A2 Audio Tracks */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="flex items-center justify-between rounded-lg bg-[#06070B] border border-slate-800 px-3 py-2 text-xs">
            <span className="font-mono text-violet-400">A1 VOICEOVER</span>
            <span className="text-slate-400">
              {voiceUrl ? 'WAV Track Loaded' : 'No voiceover attached'}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-[#06070B] border border-slate-800 px-3 py-2 text-xs">
            <span className="font-mono text-blue-400">A2 MUSIC SCORE</span>
            <span className="text-slate-400">
              {musicUrl ? 'Score Track Loaded' : 'No music attached'}
            </span>
          </div>
        </div>

        {voiceUrl && (
          <audio ref={voiceAudioRef} src={voiceUrl} className="hidden" />
        )}
        {musicUrl && (
          <audio ref={musicAudioRef} src={musicUrl} className="hidden" />
        )}
      </div>
    </div>
  );
}
