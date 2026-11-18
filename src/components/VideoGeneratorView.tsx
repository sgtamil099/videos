import React, { useState } from 'react';
import {
  AlertTriangle,
  ExternalLink,
  Film,
  ImagePlus,
  Layers,
  Plus,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NavSection, StudioTransferPayload } from '../types/studio';

interface VideoGeneratorViewProps {
  onOpenAuth: () => void;
  onSendToEditor: (payload: StudioTransferPayload) => void;
  onNavigate: (tab: NavSection) => void;
}

interface BatchPromptItem {
  id: string;
  title: string;
  prompt: string;
  resolution: string;
  format: string;
}

const FREE_GITHUB_VIDEO_MODELS = [
  {
    id: 'skyreels-v2-longform',
    name: 'SkyReels-V2 14B (5-Min Longform)',
    repo: 'SkyworkAI/SkyReels-V2',
    url: 'https://github.com/SkyworkAI/SkyReels-V2',
    license: 'Open Source',
    vram: '24 GB',
  },
  {
    id: 'wan2.1-i2v-14b-cuda',
    name: 'Wan 2.1 T2V / I2V 14B',
    repo: 'Wan-Video/Wan2.1',
    url: 'https://github.com/Wan-Video/Wan2.1',
    license: 'Apache 2.0',
    vram: '24 GB',
  },
  {
    id: 'hunyuan-video-cuda',
    name: 'HunyuanVideo 13B',
    repo: 'Tencent/HunyuanVideo',
    url: 'https://github.com/Tencent/HunyuanVideo',
    license: 'Open Source',
    vram: '24 GB',
  },
  {
    id: 'cogvideox-5b-cuda',
    name: 'CogVideoX-5B',
    repo: 'THUDM/CogVideo',
    url: 'https://github.com/THUDM/CogVideo',
    license: 'Apache 2.0',
    vram: '16 GB',
  },
  {
    id: 'ltx-video-cuda',
    name: 'LTX-Video Real-Time',
    repo: 'Lightricks/LTX-Video',
    url: 'https://github.com/Lightricks/LTX-Video',
    license: 'Open Source',
    vram: '12 GB',
  },
  {
    id: 'mochi-1-cuda',
    name: 'Mochi 1 Preview',
    repo: 'genmoai/mochi',
    url: 'https://github.com/genmoai/mochi',
    license: 'Apache 2.0',
    vram: '24 GB',
  },
];

export function VideoGeneratorView({
  onOpenAuth,
  onSendToEditor,
}: VideoGeneratorViewProps) {
  const { dbUser, characters, authFetch, refreshWorkspace, cudaWorkerOnline } =
    useAuth();

  const [mode, setMode] = useState<
    'text-to-video' | 'image-to-video' | 'cinematic-video' | 'batch'
  >('text-to-video');
  const [title, setTitle] = useState('Orbital Dawn 5-Minute Cut');
  const [prompt, setPrompt] = useState(
    'Slow anamorphic dolly across a brushed-silver orbital observation deck overlooking a twilight planet horizon, electric blue rim lighting, volumetric mist.'
  );
  const [directorProvider, setDirectorProvider] = useState<
    'gemini' | 'claude' | 'chatgpt'
  >('gemini');
  const [cameraLens, setCameraLens] = useState('35mm Anamorphic Prime');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [resolution, setResolution] = useState<
    '720p' | '1080p' | '2K' | '4K' | '8K'
  >('4K');
  const [format, setFormat] = useState<'MP4' | 'MOV'>('MP4');
  const [durationSec, setDurationSec] = useState(300);
  const [gpuTarget, setGpuTarget] = useState('Cloud A100 80GB');
  const [executionBackend, setExecutionBackend] = useState<
    'cuda-worker' | 'gemini-cloud'
  >('cuda-worker');
  const [githubModelId, setGithubModelId] = useState('skyreels-v2-longform');
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('');

  const [sourceImageBase64, setSourceImageBase64] = useState<string | null>(
    null
  );
  const [sourceImageMime, setSourceImageMime] = useState<string>('image/png');
  const [sourceImagePreview, setSourceImagePreview] = useState<string | null>(
    null
  );

  const [batchQueue, setBatchQueue] = useState<BatchPromptItem[]>([
    {
      id: 'b-1',
      title: 'Shot 01 · Orbital Horizon',
      prompt:
        'Wide establishing shot of an orbital station observation deck, subtle atmospheric glow.',
      resolution: '4K',
      format: 'MP4',
    },
    {
      id: 'b-2',
      title: 'Shot 02 · Basalt Rain',
      prompt:
        'Low-angle tracking shot through a rain-slicked brutalist stone courtyard at night.',
      resolution: '4K',
      format: 'MOV',
    },
  ]);

  const [enhancing, setEnhancing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(
    null
  );

  const selectedCharacter = characters.find(
    (c) => String(c.id) === selectedCharacterId
  );
  const selectedGithubModel =
    FREE_GITHUB_VIDEO_MODELS.find((m) => m.id === githubModelId) ||
    FREE_GITHUB_VIDEO_MODELS[0];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      setSourceImagePreview(result);
      const parts = result.split(',');
      if (parts.length === 2) {
        setSourceImageBase64(parts[1]);
        setSourceImageMime(file.type || 'image/png');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleEnhancePrompt = async () => {
    if (!dbUser) {
      onOpenAuth();
      return;
    }
    setEnhancing(true);
    setErrorBanner(null);
    try {
      const res = await authFetch('/api/ai/enhance-prompt', {
        method: 'POST',
        body: JSON.stringify({
          prompt,
          mode,
          cameraLens,
          provider: directorProvider,
          characterAnchor: selectedCharacter?.visualPromptAnchor,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Prompt enhancement failed');
      }
      if (data.enhancedPrompt) {
        setPrompt(data.enhancedPrompt);
        const engineLabel =
          directorProvider === 'claude'
            ? 'Anthropic Claude'
            : directorProvider === 'chatgpt'
            ? 'OpenAI ChatGPT'
            : 'Google Gemini 4 Hydrogen';
        setStatusMessage(
          `Prompt enhanced by ${engineLabel} with lens & lighting physics.`
        );
      }
    } catch (err: unknown) {
      setErrorBanner(
        err instanceof Error ? err.message : 'Prompt enhancement failed'
      );
    } finally {
      setEnhancing(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!dbUser) {
      onOpenAuth();
      return;
    }
    setGenerating(true);
    setErrorBanner(null);
    setStatusMessage(null);
    setGeneratedVideoUrl(null);

    try {
      const fullPrompt = selectedCharacter
        ? `${prompt} | Character Consistency Anchor (Seed ${selectedCharacter.consistencySeed}): ${selectedCharacter.visualPromptAnchor}`
        : prompt;

      if (mode === 'batch') {
        let lastError: string | null = null;
        for (const item of batchQueue) {
          const res = await authFetch('/api/ai/video', {
            method: 'POST',
            body: JSON.stringify({
              title: item.title,
              jobType: 'batch-render',
              prompt: item.prompt,
              aspectRatio,
              resolution: item.resolution,
              format: item.format,
              durationSec,
              gpuTarget,
              executionBackend,
              githubModelId,
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            lastError = data.error || 'Batch job paused on upstream engine.';
          }
        }
        await refreshWorkspace();
        if (lastError) {
          setErrorBanner(lastError);
        } else {
          setStatusMessage(
            `Submitted ${batchQueue.length} batch renders to PostgreSQL queue.`
          );
        }
        return;
      }

      const res = await authFetch('/api/ai/video', {
        method: 'POST',
        body: JSON.stringify({
          title,
          jobType: mode,
          prompt: fullPrompt,
          aspectRatio,
          resolution,
          format,
          durationSec,
          gpuTarget,
          executionBackend,
          githubModelId,
          imageBase64: mode === 'image-to-video' ? sourceImageBase64 : undefined,
          imageMimeType: mode === 'image-to-video' ? sourceImageMime : undefined,
        }),
      });
      const data = await res.json();
      await refreshWorkspace();

      if (!res.ok) {
        setErrorBanner(
          data.error ||
            'Video generation could not complete on the selected backend.'
        );
        return;
      }

      setGeneratedVideoUrl(data.videoDataUrl);
      setStatusMessage(
        `Render complete (${resolution} ${format} · ${durationSec}s) and saved to Download Center.`
      );
    } catch (err: unknown) {
      setErrorBanner(
        err instanceof Error ? err.message : 'Video generation request failed.'
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleComposeInStudio = () => {
    onSendToEditor({
      title,
      scenes: [
        {
          sceneNumber: 1,
          title: `${title} — Act I`,
          durationSec: Math.min(100, Math.max(5, Math.round(durationSec / 3))),
          cameraMovement: cameraLens,
          lighting: 'Electric Blue & Obsidian Studio Rim',
          visualPrompt: prompt,
          dialogue: '',
          speaker: selectedCharacter?.name || 'Narrator',
          audioCue: 'Atmospheric Drone',
          colorGrade: 'Cinema Obsidian',
          imageUrl:
            sourceImagePreview ||
            selectedCharacter?.referenceImageUrl ||
            '/src/assets/images/vyro_scene_orbital_1795013566012.jpg',
        },
        {
          sceneNumber: 2,
          title: `${title} — Act II`,
          durationSec: Math.min(100, Math.max(5, Math.round(durationSec / 3))),
          cameraMovement: 'Wide Lateral Pan',
          lighting: 'Twilight Horizon Rim',
          visualPrompt: prompt,
          dialogue: '',
          speaker: selectedCharacter?.name || 'Narrator',
          audioCue: 'Rising Synth',
          colorGrade: 'Electric Cobalt',
          imageUrl: '/src/assets/images/vyro_hero_cinema_1795013506539.jpg',
        },
        {
          sceneNumber: 3,
          title: `${title} — Act III`,
          durationSec: Math.min(100, Math.max(5, Math.round(durationSec / 3))),
          cameraMovement: 'Slow Dolly Out',
          lighting: 'Rain-Slicked Basalt Reflection',
          visualPrompt: prompt,
          dialogue: '',
          speaker: selectedCharacter?.name || 'Narrator',
          audioCue: 'Sub-bass Resolution',
          colorGrade: 'Anamorphic Silver',
          imageUrl: '/src/assets/images/vyro_scene_tokyo_1795013505173.jpg',
        },
      ],
    });
  };

  const formatDurationLabel = (sec: number) =>
    sec >= 60 ? `${(sec / 60).toFixed(sec % 60 === 0 ? 0 : 1)} min (${sec}s)` : `${sec}s`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-100">
            AI Video Generation Engine
          </h1>
          <p className="text-sm text-slate-400">
            Up to 5-Minute (300s) Sequences · Gemini, Claude & ChatGPT Prompt
            Directors · Free GitHub Open-Source Video AI
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-[#0D1017] border border-slate-800 overflow-x-auto">
          {(
            [
              ['text-to-video', 'Text-to-Video'],
              ['image-to-video', 'Image-to-Video'],
              ['cinematic-video', 'Cinematic'],
              ['batch', 'Batch Queue'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setMode(key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                mode === key
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-5 rounded-xl border border-slate-800 bg-[#0D1017] p-6">
          {mode !== 'batch' ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Render Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-lg bg-[#06070B] border border-slate-800 px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Character Consistency Lock
                  </label>
                  <select
                    value={selectedCharacterId}
                    onChange={(e) => setSelectedCharacterId(e.target.value)}
                    className="w-full rounded-lg bg-[#06070B] border border-slate-800 px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">None (Free Subject)</option>
                    {characters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} · Seed {c.consistencySeed}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {mode === 'image-to-video' && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Source Keyframe Image
                  </label>
                  <label className="flex items-center justify-between gap-4 rounded-lg border border-dashed border-slate-700 bg-[#06070B] p-4 cursor-pointer hover:border-blue-500 transition-colors">
                    <div className="flex items-center gap-3">
                      <ImagePlus className="w-5 h-5 text-blue-400 shrink-0" />
                      <div>
                        <p className="text-sm text-slate-200 font-medium">
                          {sourceImagePreview
                            ? 'Keyframe Loaded (Click to replace)'
                            : 'Upload PNG or JPEG starting frame'}
                        </p>
                        <p className="text-xs text-slate-500">
                          Supports 16:9 or 9:16 reference frames
                        </p>
                      </div>
                    </div>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Director Prompt & Motion Physics
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={directorProvider}
                      onChange={(e) =>
                        setDirectorProvider(
                          e.target.value as 'gemini' | 'claude' | 'chatgpt'
                        )
                      }
                      aria-label="AI Director Provider"
                      className="rounded bg-[#06070B] border border-slate-800 px-2 py-1 text-xs text-slate-200"
                    >
                      <option value="gemini">Gemini 4 Hydrogen</option>
                      <option value="claude">Anthropic Claude</option>
                      <option value="chatgpt">OpenAI ChatGPT</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleEnhancePrompt}
                      disabled={enhancing}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 disabled:opacity-50"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      <span>{enhancing ? 'Directing...' : 'Enhance Prompt'}</span>
                    </button>
                  </div>
                </div>
                <textarea
                  rows={4}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full rounded-lg bg-[#06070B] border border-slate-800 p-3.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 leading-relaxed"
                  placeholder="Describe subject, camera movement, lens, lighting, and atmosphere..."
                />
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-slate-300">
                  Batch Video Queue ({batchQueue.length} shots)
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setBatchQueue((prev) => [
                      ...prev,
                      {
                        id: `b-${Date.now()}`,
                        title: `Shot 0${prev.length + 1}`,
                        prompt:
                          'Cinematic wide shot with atmospheric rim lighting.',
                        resolution: '4K',
                        format: 'MP4',
                      },
                    ])
                  }
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Shot</span>
                </button>
              </div>
              {batchQueue.map((item, idx) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-slate-800 bg-[#06070B] p-3.5 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) =>
                        setBatchQueue((prev) =>
                          prev.map((q, i) =>
                            i === idx ? { ...q, title: e.target.value } : q
                          )
                        )
                      }
                      className="bg-transparent text-sm font-medium text-slate-100 focus:outline-none flex-1"
                    />
                    <select
                      value={item.resolution}
                      onChange={(e) =>
                        setBatchQueue((prev) =>
                          prev.map((q, i) =>
                            i === idx ? { ...q, resolution: e.target.value } : q
                          )
                        )
                      }
                      className="rounded bg-[#0D1017] border border-slate-800 px-2 py-1 text-xs font-mono text-slate-200"
                    >
                      <option value="1080p">1080p</option>
                      <option value="2K">2K</option>
                      <option value="4K">4K</option>
                      <option value="8K">8K</option>
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        setBatchQueue((prev) =>
                          prev.filter((_, i) => i !== idx)
                        )
                      }
                      aria-label="Remove batch shot"
                      className="p-1 text-slate-500 hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={item.prompt}
                    onChange={(e) =>
                      setBatchQueue((prev) =>
                        prev.map((q, i) =>
                          i === idx ? { ...q, prompt: e.target.value } : q
                        )
                      )
                    }
                    className="w-full bg-transparent text-xs text-slate-300 focus:outline-none resize-none"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Render Parameters (with up to 5 Minutes Duration) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80">
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Resolution
              </label>
              <select
                value={resolution}
                onChange={(e) =>
                  setResolution(
                    e.target.value as '720p' | '1080p' | '2K' | '4K' | '8K'
                  )
                }
                className="w-full rounded-lg bg-[#06070B] border border-slate-800 px-3 py-2 text-xs font-mono text-slate-100"
              >
                <option value="720p">720p HD</option>
                <option value="1080p">1080p FHD</option>
                <option value="2K">2K DCI</option>
                <option value="4K">4K UHD</option>
                <option value="8K">8K CUDA Upscale</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Format
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as 'MP4' | 'MOV')}
                className="w-full rounded-lg bg-[#06070B] border border-slate-800 px-3 py-2 text-xs font-mono text-slate-100"
              >
                <option value="MP4">MP4 (H.265)</option>
                <option value="MOV">MOV (ProRes)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Aspect Ratio
              </label>
              <select
                value={aspectRatio}
                onChange={(e) =>
                  setAspectRatio(e.target.value as '16:9' | '9:16')
                }
                className="w-full rounded-lg bg-[#06070B] border border-slate-800 px-3 py-2 text-xs font-mono text-slate-100"
              >
                <option value="16:9">16:9 Cinema</option>
                <option value="9:16">9:16 Vertical</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Duration (Up to 5m)
              </label>
              <select
                value={durationSec}
                onChange={(e) => setDurationSec(Number(e.target.value))}
                className="w-full rounded-lg bg-[#06070B] border border-slate-800 px-3 py-2 text-xs font-mono text-slate-100"
              >
                <option value={5}>5 sec</option>
                <option value={15}>15 sec</option>
                <option value={30}>30 sec</option>
                <option value={60}>1 min (60s)</option>
                <option value={180}>3 min (180s)</option>
                <option value={300}>5 min (300s)</option>
              </select>
            </div>
          </div>

          {/* GPU & Free GitHub Video AI Routing */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Execution Engine
              </label>
              <select
                value={executionBackend}
                onChange={(e) =>
                  setExecutionBackend(
                    e.target.value as 'cuda-worker' | 'gemini-cloud'
                  )
                }
                className="w-full rounded-lg bg-[#06070B] border border-slate-800 px-3 py-2 text-xs text-slate-100"
              >
                <option value="cuda-worker">
                  Free GitHub AI (CUDA Worker{' '}
                  {cudaWorkerOnline ? 'Online' : 'Local'})
                </option>
                <option value="gemini-cloud">
                  Gemini Omni Cloud (Paid Key)
                </option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Free GitHub Video AI Model
              </label>
              <select
                value={githubModelId}
                onChange={(e) => setGithubModelId(e.target.value)}
                disabled={executionBackend !== 'cuda-worker'}
                className="w-full rounded-lg bg-[#06070B] border border-slate-800 px-3 py-2 text-xs text-slate-100 disabled:opacity-50"
              >
                {FREE_GITHUB_VIDEO_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.vram})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                GPU Hardware Profile
              </label>
              <select
                value={gpuTarget}
                onChange={(e) => setGpuTarget(e.target.value)}
                className="w-full rounded-lg bg-[#06070B] border border-slate-800 px-3 py-2 text-xs text-slate-100"
              >
                <option>Cloud A100 80GB</option>
                <option>Multi-GPU 4x H100</option>
                <option>NVIDIA RTX 4090 Local</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleGenerateVideo}
              disabled={generating}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Film className="w-4 h-4" />
              <span>
                {generating
                  ? 'Dispatching Render...'
                  : mode === 'batch'
                  ? `Queue ${batchQueue.length} Batch Videos`
                  : `Render ${formatDurationLabel(durationSec)} · ${resolution}`}
              </span>
            </button>

            <button
              type="button"
              onClick={handleComposeInStudio}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#131722] hover:bg-slate-800 border border-slate-700 text-slate-200 text-sm font-medium transition-colors"
            >
              <Layers className="w-4 h-4 text-violet-400" />
              <span>Render Free in Studio (Up to 5 min)</span>
            </button>
          </div>
        </div>

        {/* Viewport & Free GitHub Open-Source Catalog Column */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-xl border border-slate-800 bg-[#0D1017] overflow-hidden">
            <div className="aspect-video bg-[#06070B] relative flex items-center justify-center">
              {generatedVideoUrl ? (
                <video
                  src={generatedVideoUrl}
                  controls
                  autoPlay
                  loop
                  className="w-full h-full object-contain"
                />
              ) : sourceImagePreview ? (
                <img
                  src={sourceImagePreview}
                  alt="Uploaded keyframe preview"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src="/src/assets/images/vyro_scene_orbital_1795013566012.jpg"
                  alt="Studio reference frame"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover opacity-50"
                />
              )}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs font-mono tabular-nums text-slate-200 bg-black/70 px-3 py-1.5 rounded-md">
                <span>
                  {resolution} · {format} · {aspectRatio}
                </span>
                <span>{formatDurationLabel(durationSec)}</span>
              </div>
            </div>

            <div className="p-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Selected Engine</span>
                <span className="font-mono text-slate-200">
                  {executionBackend === 'cuda-worker'
                    ? selectedGithubModel.repo
                    : 'gemini-omni-1.2-flash'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">CUDA Worker Link</span>
                <span
                  className={`font-mono ${
                    cudaWorkerOnline ? 'text-emerald-400' : 'text-slate-400'
                  }`}
                >
                  {cudaWorkerOnline
                    ? 'Connected'
                    : 'Not configured (GPU_WORKER_URL)'}
                </span>
              </div>
            </div>
          </div>

          {/* Free Open-Source GitHub Video AI Directory */}
          <div className="rounded-xl border border-slate-800 bg-[#0D1017] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-semibold text-slate-100">
                Free Open-Source GitHub Video AI Models
              </h3>
              <span className="text-xs text-slate-500">Apache 2.0 / Open</span>
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {FREE_GITHUB_VIDEO_MODELS.map((m) => (
                <div
                  key={m.id}
                  className={`rounded-lg border p-2.5 flex items-center justify-between gap-2 transition-colors ${
                    githubModelId === m.id
                      ? 'border-blue-500/60 bg-[#111624]'
                      : 'border-slate-800 bg-[#06070B]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setExecutionBackend('cuda-worker');
                      setGithubModelId(m.id);
                    }}
                    className="text-left min-w-0 flex-1"
                  >
                    <p className="text-xs font-medium text-slate-100 truncate">
                      {m.name}
                    </p>
                    <p className="text-xs font-mono text-slate-400 truncate">
                      {m.repo} · {m.vram} · {m.license}
                    </p>
                  </button>
                  <a
                    href={m.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open ${m.repo} on GitHub`}
                    className="p-1.5 text-slate-400 hover:text-blue-400 shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
            </div>
          </div>

          {statusMessage && (
            <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/30 p-4 text-xs text-emerald-200 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{statusMessage}</span>
            </div>
          )}

          {errorBanner && (
            <div className="rounded-xl border border-amber-900/60 bg-amber-950/30 p-4 text-xs text-amber-200 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{errorBanner}</span>
              </div>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleComposeInStudio}
                  className="text-xs font-medium text-blue-300 hover:text-blue-200 underline"
                >
                  Open NLE Editing Studio to render up to 5 minutes right now
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
