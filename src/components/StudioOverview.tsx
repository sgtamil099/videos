import {
  ArrowRight,
  Cpu,
  Film,
  Layers,
  Mic,
  Scissors,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NavSection } from '../types/studio';

interface StudioOverviewProps {
  onNavigate: (tab: NavSection) => void;
  onOpenAuth: () => void;
}

const SHOWCASE_FRAMES = [
  {
    title: 'Orbital Horizon Deck',
    meta: '4K · 24fps · 16:9 · Anamorphic 35mm',
    image: '/src/assets/images/vyro_scene_orbital_1795013566012.jpg',
    fallbackGradient: 'from-blue-950 via-slate-900 to-black',
  },
  {
    title: 'Basalt Rain Courtyard',
    meta: '8K Upscale · 60fps · 2.39:1 · MOV ProRes',
    image: '/src/assets/images/vyro_scene_tokyo_1795013505173.jpg',
    fallbackGradient: 'from-violet-950 via-slate-900 to-black',
  },
  {
    title: 'Character Anchor: Aria Voss',
    meta: 'Seed 482910 · Face Lock · Voice Kore',
    image: '/src/assets/images/vyro_character_aria_1795013504111.jpg',
    fallbackGradient: 'from-slate-800 via-slate-900 to-black',
  },
];

export function StudioOverview({
  onNavigate,
  onOpenAuth,
}: StudioOverviewProps) {
  const { dbUser, projects, renderJobs, aiModels, gpuNodes, cudaWorkerOnline } =
    useAuth();

  return (
    <div className="space-y-10">
      {/* Hero Production Stage */}
      <section className="relative overflow-hidden rounded-xl border border-slate-800 bg-[#0D1017]">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-between z-10">
            <div>
              <p className="text-xs font-medium tracking-wider text-blue-400 mb-3">
                VYRO AI STUDIO · PRODUCTION SUITE
              </p>
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-slate-50 leading-tight [text-wrap:balance] mb-4">
                Your Imagination. AI Creates.
              </h1>
              <p className="text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed mb-8">
                Direct multi-scene storyboards, lock character consistency across
                shots, synthesize studio WAV voiceovers and lip-sync visemes, and
                export master sequences via Cloud AI, local NVIDIA CUDA GPUs, or
                the built-in NLE Editing Studio.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('video')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0"
              >
                <Film className="w-4 h-4" />
                <span>Open Video Generator</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('story-characters')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#131722] hover:bg-slate-800 border border-slate-700 text-slate-200 text-sm font-medium transition-colors whitespace-nowrap shrink-0"
              >
                <Layers className="w-4 h-4 text-violet-400" />
                <span>Multi-Scene Storyboard</span>
              </button>
              {!dbUser && (
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white transition-colors whitespace-nowrap shrink-0"
                >
                  <span>Sign in to save projects</span>
                </button>
              )}
            </div>
          </div>

          <div className="lg:col-span-5 relative min-h-[260px] lg:min-h-[380px] bg-gradient-to-br from-blue-950/60 via-[#0D1017] to-violet-950/50">
            <img
              src="/src/assets/images/vyro_hero_cinema_1795013506539.jpg"
              alt="VYRO AI STUDIO virtual production stage"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover lg:h-full"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0D1017] via-[#0D1017]/40 to-transparent lg:block hidden" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0D1017]/90 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-slate-300 font-mono tabular-nums">
              <span>VIRTUAL STAGE 01</span>
              <span>4K · 24FPS · ANAMORPHIC</span>
            </div>
          </div>
        </div>
      </section>

      {/* Studio Metrics Strip (Tabular Numerals) */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-800 bg-[#0D1017] p-5">
          <p className="text-xs text-slate-400 mb-1.5">Active Projects</p>
          <p className="font-mono text-2xl font-semibold text-slate-100 tabular-nums">
            {dbUser ? projects.length : 0}
          </p>
          <p className="text-xs text-slate-500 mt-1">PostgreSQL synced</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-[#0D1017] p-5">
          <p className="text-xs text-slate-400 mb-1.5">Render Jobs Logged</p>
          <p className="font-mono text-2xl font-semibold text-slate-100 tabular-nums">
            {dbUser ? renderJobs.length : 0}
          </p>
          <p className="text-xs text-slate-500 mt-1">Queue & history</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-[#0D1017] p-5">
          <p className="text-xs text-slate-400 mb-1.5">Compute Nodes</p>
          <p className="font-mono text-2xl font-semibold text-slate-100 tabular-nums">
            {gpuNodes.length}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {cudaWorkerOnline ? 'Local CUDA connected' : 'RTX · A100 · H100 profiles'}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-[#0D1017] p-5">
          <p className="text-xs text-slate-400 mb-1.5">Studio Credits</p>
          <p className="font-mono text-2xl font-semibold text-blue-400 tabular-nums">
            {dbUser ? dbUser.credits.toLocaleString() : '2,500'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {dbUser ? `${dbUser.plan.toUpperCase()} tier` : 'Sign in to claim'}
          </p>
        </div>
      </section>

      {/* Core Workflows Grid */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-semibold text-slate-100">
            Production Modules
          </h2>
          <span className="text-xs text-slate-400">
            Modular AI & NLE Pipeline
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <button
            type="button"
            onClick={() => onNavigate('video')}
            className="text-left rounded-xl border border-slate-800 bg-[#0D1017] hover:border-blue-500/60 p-5 transition-colors group"
          >
            <Film className="w-5 h-5 text-blue-400 mb-3" />
            <h3 className="font-display text-base font-semibold text-slate-100 mb-1 group-hover:text-blue-300 transition-colors">
              Video & Batch Generation
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Up to 5-minute sequences, 4K/8K CUDA upscaling, MP4/MOV export,
              and Free GitHub Video AI models.
            </p>
            <span className="text-xs text-slate-500">
              SkyReels-V2 · Wan 2.1 · Gemini Omni
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('audio-lipsync')}
            className="text-left rounded-xl border border-slate-800 bg-[#0D1017] hover:border-violet-500/60 p-5 transition-colors group"
          >
            <Mic className="w-5 h-5 text-violet-400 mb-3" />
            <h3 className="font-display text-base font-semibold text-slate-100 mb-1 group-hover:text-violet-300 transition-colors">
              AI Voice, Lip Sync & Music
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Live 24kHz WAV voice synthesis, phoneme viseme lip-sync, and
              cinematic stem scoring.
            </p>
            <span className="text-xs text-slate-500">
              Gemini 3.8 TTS · Live Viseme
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('story-characters')}
            className="text-left rounded-xl border border-slate-800 bg-[#0D1017] hover:border-blue-500/60 p-5 transition-colors group"
          >
            <Users className="w-5 h-5 text-slate-200 mb-3" />
            <h3 className="font-display text-base font-semibold text-slate-100 mb-1 group-hover:text-blue-300 transition-colors">
              Characters & Multi-Scene
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Lock character seeds & direct 5-minute storyboards using Gemini,
              Claude, or ChatGPT.
            </p>
            <span className="text-xs text-slate-500">
              Gemini · Claude · ChatGPT
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('editor')}
            className="text-left rounded-xl border border-slate-800 bg-[#0D1017] hover:border-violet-500/60 p-5 transition-colors group"
          >
            <Scissors className="w-5 h-5 text-blue-400 mb-3" />
            <h3 className="font-display text-base font-semibold text-slate-100 mb-1 group-hover:text-blue-300 transition-colors">
              NLE Video Editing Studio
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Multi-track timeline, color LUTs, audio mix, real-time Canvas2D
              preview & export.
            </p>
            <span className="text-xs text-slate-500">
              WebCodecs · Instant Render
            </span>
          </button>
        </div>
      </section>

      {/* Reference Productions */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-semibold text-slate-100">
            Studio Reference Frames
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('editor')}
            className="text-xs text-blue-400 hover:text-blue-300 font-medium"
          >
            Load in Editing Studio
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {SHOWCASE_FRAMES.map((frame) => (
            <div
              key={frame.title}
              className="rounded-xl border border-slate-800 bg-[#0D1017] overflow-hidden"
            >
              <div
                className={`aspect-video w-full bg-gradient-to-br ${frame.fallbackGradient} relative`}
              >
                <img
                  src={frame.image}
                  alt={frame.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4">
                <h3 className="font-display text-sm font-semibold text-slate-100 mb-1">
                  {frame.title}
                </h3>
                <p className="text-xs text-slate-400 font-mono tabular-nums">
                  {frame.meta}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Transparent Engine Readiness Table */}
      <section className="rounded-xl border border-slate-800 bg-[#0D1017] p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-4 h-4 text-blue-400" />
            <h2 className="font-display text-lg font-semibold text-slate-100">
              AI Engine & GPU Execution Matrix
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            Transparent cloud & CUDA worker availability
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2.5 pr-4 font-medium">Model / Engine</th>
                <th className="py-2.5 pr-4 font-medium">Capability</th>
                <th className="py-2.5 pr-4 font-medium">Provider</th>
                <th className="py-2.5 pr-4 font-medium">Max Spec</th>
                <th className="py-2.5 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {aiModels.map((model) => (
                <tr key={model.id} className="hover:bg-slate-900/40">
                  <td className="py-3 pr-4 font-medium text-slate-100 whitespace-nowrap">
                    {model.name}
                  </td>
                  <td className="py-3 pr-4 text-slate-400 whitespace-nowrap">
                    {model.category}
                  </td>
                  <td className="py-3 pr-4 text-slate-400 whitespace-nowrap">
                    {model.provider}
                  </td>
                  <td className="py-3 pr-4 font-mono tabular-nums text-slate-300 whitespace-nowrap">
                    {model.maxResolution || 'Standard'}
                  </td>
                  <td className="py-3 text-right whitespace-nowrap">
                    {model.availability === 'live' ? (
                      <span className="text-emerald-400 font-medium">
                        Live Cloud API
                      </span>
                    ) : model.availability === 'paid_key_required' ? (
                      <span className="text-amber-400 font-medium">
                        Paid Key / Secrets
                      </span>
                    ) : cudaWorkerOnline ? (
                      <span className="text-emerald-400 font-medium">
                        CUDA Worker Online
                      </span>
                    ) : (
                      <span className="text-slate-400 font-medium">
                        Deploy CUDA Worker
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
