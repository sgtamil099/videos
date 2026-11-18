import React, { useState } from 'react';
import { Clapperboard, Lock, Plus, Sparkles, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { StoryboardData, StudioTransferPayload } from '../types/studio';

interface StoryCharactersViewProps {
  onOpenAuth: () => void;
  onSendToEditor: (payload: StudioTransferPayload) => void;
}

const SCENE_FALLBACK_IMAGES = [
  '/src/assets/images/vyro_hero_cinema_1795013506539.jpg',
  '/src/assets/images/vyro_scene_orbital_1795013566012.jpg',
  '/src/assets/images/vyro_scene_tokyo_1795013505173.jpg',
  '/src/assets/images/vyro_character_aria_1795013504111.jpg',
];

export function StoryCharactersView({
  onOpenAuth,
  onSendToEditor,
}: StoryCharactersViewProps) {
  const { dbUser, characters, authFetch, refreshWorkspace } = useAuth();

  // Character Consistency Form
  const [charName, setCharName] = useState('Aria Voss');
  const [roleLabel, setRoleLabel] = useState('Orbital Flight Engineer');
  const [seed, setSeed] = useState(482910);
  const [voicePersona, setVoicePersona] = useState('Kore');
  const [visualAnchor, setVisualAnchor] = useState(
    '32-year-old female sci-fi specialist, dark braided hair, brushed silver collar tactical jacket, subtle cheekbone scar, cool electric blue rim light.'
  );
  const [charImage, setCharImage] = useState<string>(
    '/src/assets/images/vyro_character_aria_1795013504111.jpg'
  );
  const [savingChar, setSavingChar] = useState(false);

  // Storyboard Form
  const [concept, setConcept] = useState(
    'An orbital communications officer intercepts an encrypted light-pulse message from Earth during a solar storm and races to align the deep-space mirror array.'
  );
  const [sceneCount, setSceneCount] = useState(6);
  const [totalDurationSec, setTotalDurationSec] = useState(300);
  const [directorProvider, setDirectorProvider] = useState<
    'gemini' | 'claude' | 'chatgpt'
  >('gemini');
  const [visualStyle, setVisualStyle] = useState('Anamorphic Sci-Fi Noir');
  const [selectedCharId, setSelectedCharId] = useState<string>('');
  const [generatingStory, setGeneratingStory] = useState(false);
  const [storyboard, setStoryboard] = useState<StoryboardData | null>(null);
  const [savedProjectId, setSavedProjectId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSaveCharacter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dbUser) {
      onOpenAuth();
      return;
    }
    setSavingChar(true);
    setErrorMsg(null);
    try {
      const res = await authFetch('/api/characters', {
        method: 'POST',
        body: JSON.stringify({
          name: charName,
          roleLabel,
          consistencySeed: seed,
          visualPromptAnchor: visualAnchor,
          voicePersona,
          referenceImageUrl: charImage,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save character');
      await refreshWorkspace();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Character creation failed'
      );
    } finally {
      setSavingChar(false);
    }
  };

  const handleGenerateStoryboard = async () => {
    if (!dbUser) {
      onOpenAuth();
      return;
    }
    setGeneratingStory(true);
    setErrorMsg(null);
    try {
      const char = characters.find((c) => String(c.id) === selectedCharId);
      const res = await authFetch('/api/ai/storyboard', {
        method: 'POST',
        body: JSON.stringify({
          concept,
          sceneCount,
          totalDurationSec,
          provider: directorProvider,
          visualStyle,
          aspectRatio: '16:9',
          characterAnchor: char
            ? `${char.name} (Seed ${char.consistencySeed}): ${char.visualPromptAnchor}`
            : undefined,
          saveAsProject: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Storyboard generation failed');
      const sb = data.storyboard as StoryboardData;
      sb.scenes = sb.scenes.map((s, idx) => ({
        ...s,
        imageUrl: SCENE_FALLBACK_IMAGES[idx % SCENE_FALLBACK_IMAGES.length],
      }));
      setStoryboard(sb);
      setSavedProjectId(data.project?.id ?? null);
      await refreshWorkspace();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Storyboard generation failed'
      );
    } finally {
      setGeneratingStory(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-slate-100">
          Character Consistency & Multi-Scene Storyboard
        </h1>
        <p className="text-sm text-slate-400">
          Lock character identities in PostgreSQL and direct multi-scene
          production scripts live with Gemini 4 Hydrogen.
        </p>
      </div>

      {errorMsg && (
        <div className="rounded-lg bg-red-950/40 border border-red-900/60 p-3.5 text-xs text-red-200">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Character Consistency Builder */}
        <section className="lg:col-span-5 rounded-xl border border-slate-800 bg-[#0D1017] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-slate-100 flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-400" />
              <span>Character Consistency System</span>
            </h2>
            <button
              type="button"
              onClick={() =>
                setSeed(Math.floor(100000 + Math.random() * 899999))
              }
              className="text-xs font-mono text-blue-400 hover:text-blue-300"
            >
              New Seed
            </button>
          </div>

          <form onSubmit={handleSaveCharacter} className="space-y-3">
            <div className="flex items-center gap-4">
              <img
                src={charImage}
                alt={charName}
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-lg object-cover border border-slate-700 shrink-0"
              />
              <div className="flex-1 grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={charName}
                  onChange={(e) => setCharName(e.target.value)}
                  placeholder="Character Name"
                  required
                  className="rounded-lg bg-[#06070B] border border-slate-800 px-3 py-2 text-xs text-slate-100"
                />
                <input
                  type="text"
                  value={roleLabel}
                  onChange={(e) => setRoleLabel(e.target.value)}
                  placeholder="Role"
                  className="rounded-lg bg-[#06070B] border border-slate-800 px-3 py-2 text-xs text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Locked Seed
                </label>
                <input
                  type="number"
                  value={seed}
                  onChange={(e) => setSeed(Number(e.target.value))}
                  className="w-full rounded-lg bg-[#06070B] border border-slate-800 px-3 py-2 text-xs font-mono text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Voice Persona
                </label>
                <select
                  value={voicePersona}
                  onChange={(e) => setVoicePersona(e.target.value)}
                  className="w-full rounded-lg bg-[#06070B] border border-slate-800 px-3 py-2 text-xs text-slate-100"
                >
                  <option value="Kore">Kore</option>
                  <option value="Fenrir">Fenrir</option>
                  <option value="Charon">Charon</option>
                  <option value="Puck">Puck</option>
                  <option value="Zephyr">Zephyr</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Visual Identity Anchor
              </label>
              <textarea
                rows={3}
                value={visualAnchor}
                onChange={(e) => setVisualAnchor(e.target.value)}
                required
                className="w-full rounded-lg bg-[#06070B] border border-slate-800 p-3 text-xs text-slate-100"
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <label className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer">
                <span>Upload Reference Face</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const reader = new FileReader();
                    reader.onload = () => setCharImage(String(reader.result));
                    reader.readAsDataURL(f);
                  }}
                />
              </label>
              <button
                type="submit"
                disabled={savingChar}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{savingChar ? 'Locking...' : 'Lock Character'}</span>
              </button>
            </div>
          </form>

          {/* Saved Characters List */}
          <div className="pt-4 border-t border-slate-800 space-y-2">
            <p className="text-xs font-medium text-slate-400">
              Saved Studio Characters ({characters.length})
            </p>
            {characters.length === 0 ? (
              <p className="text-xs text-slate-500">
                No locked characters yet. Lock your first character above.
              </p>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {characters.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-3 rounded-lg bg-[#06070B] border border-slate-800 p-2.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={
                          c.referenceImageUrl ||
                          '/src/assets/images/vyro_character_aria_1795013504111.jpg'
                        }
                        alt={c.name}
                        referrerPolicy="no-referrer"
                        className="w-9 h-9 rounded object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-100 truncate">
                          {c.name}
                        </p>
                        <p className="text-xs text-slate-500 font-mono truncate">
                          Seed {c.consistencySeed} · {c.voicePersona}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedCharId(String(c.id))}
                      className="text-xs text-blue-400 hover:text-blue-300 shrink-0"
                    >
                      Use
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Multi-Scene Story Generator */}
        <section className="lg:col-span-7 rounded-xl border border-slate-800 bg-[#0D1017] p-6 space-y-4">
          <h2 className="font-display text-base font-semibold text-slate-100 flex items-center gap-2">
            <Clapperboard className="w-4 h-4 text-violet-400" />
            <span>Multi-Scene Story Generator (Gemini · Claude · ChatGPT)</span>
          </h2>

          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Story Premise & Narrative Arc
            </label>
            <textarea
              rows={3}
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              className="w-full rounded-lg bg-[#06070B] border border-slate-800 p-3 text-sm text-slate-100"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                AI Director Engine
              </label>
              <select
                value={directorProvider}
                onChange={(e) =>
                  setDirectorProvider(
                    e.target.value as 'gemini' | 'claude' | 'chatgpt'
                  )
                }
                className="w-full rounded-lg bg-[#06070B] border border-slate-800 px-3 py-2 text-xs text-slate-100"
              >
                <option value="gemini">Google Gemini 4</option>
                <option value="claude">Anthropic Claude</option>
                <option value="chatgpt">OpenAI ChatGPT</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Total Duration
              </label>
              <select
                value={totalDurationSec}
                onChange={(e) => setTotalDurationSec(Number(e.target.value))}
                className="w-full rounded-lg bg-[#06070B] border border-slate-800 px-3 py-2 text-xs font-mono text-slate-100"
              >
                <option value={30}>30 sec</option>
                <option value={60}>1 min (60s)</option>
                <option value={180}>3 min (180s)</option>
                <option value={300}>5 min (300s)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Scene Count
              </label>
              <select
                value={sceneCount}
                onChange={(e) => setSceneCount(Number(e.target.value))}
                className="w-full rounded-lg bg-[#06070B] border border-slate-800 px-3 py-2 text-xs font-mono text-slate-100"
              >
                <option value={4}>4 Scenes</option>
                <option value={6}>6 Scenes</option>
                <option value={10}>10 Scenes</option>
                <option value={15}>15 Scenes</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Visual Direction
              </label>
              <select
                value={visualStyle}
                onChange={(e) => setVisualStyle(e.target.value)}
                className="w-full rounded-lg bg-[#06070B] border border-slate-800 px-3 py-2 text-xs text-slate-100"
              >
                <option>Anamorphic Sci-Fi Noir</option>
                <option>Hyper-Realistic Documentary</option>
                <option>Brutalist Architectural Thriller</option>
                <option>Atmospheric Space Opera</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Cast Character Consistency Lock
            </label>
            <select
              value={selectedCharId}
              onChange={(e) => setSelectedCharId(e.target.value)}
              className="w-full rounded-lg bg-[#06070B] border border-slate-800 px-3 py-2 text-xs text-slate-100"
            >
              <option value="">Auto Cast</option>
              {characters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleGenerateStoryboard}
              disabled={generatingStory}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {generatingStory
                  ? 'Writing Multi-Scene Script...'
                  : 'Generate Multi-Scene Storyboard'}
              </span>
            </button>

            {storyboard && (
              <button
                type="button"
                onClick={() =>
                  onSendToEditor({
                    projectId: savedProjectId,
                    title: storyboard.projectTitle,
                    scenes: storyboard.scenes,
                  })
                }
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                <span>Assemble in Video Editing Studio</span>
              </button>
            )}
          </div>

          {/* Generated Scenes Output */}
          {storyboard && (
            <div className="pt-4 border-t border-slate-800 space-y-4">
              <div>
                <h3 className="font-display text-lg font-semibold text-slate-100">
                  {storyboard.projectTitle}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {storyboard.logline}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {storyboard.scenes.map((scene) => (
                  <div
                    key={scene.sceneNumber}
                    className="rounded-lg border border-slate-800 bg-[#06070B] overflow-hidden"
                  >
                    <div className="aspect-video bg-slate-900 relative">
                      <img
                        src={
                          scene.imageUrl ||
                          '/src/assets/images/vyro_scene_orbital_1795013566012.jpg'
                        }
                        alt={scene.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                        <span>
                          SCENE 0{scene.sceneNumber} · {scene.durationSec}s
                        </span>
                        <span>{scene.colorGrade}</span>
                      </div>
                      <h4 className="font-display text-sm font-semibold text-slate-100">
                        {scene.title}
                      </h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {scene.visualPrompt}
                      </p>
                      <p className="text-xs text-blue-300 font-mono pt-1">
                        {scene.cameraMovement} · {scene.lighting}
                      </p>
                      {scene.dialogue && (
                        <p className="text-xs text-slate-200 italic pt-1">
                          "{scene.dialogue}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
