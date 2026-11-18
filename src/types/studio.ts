export type NavSection =
  | 'overview'
  | 'video'
  | 'audio-lipsync'
  | 'story-characters'
  | 'editor'
  | 'downloads'
  | 'billing'
  | 'admin';

export interface DbUser {
  id: number;
  uid: string;
  email: string;
  displayName: string | null;
  role: 'creator' | 'admin' | string;
  plan: string;
  credits: number;
  createdAt: string;
}

export interface StoryScene {
  sceneNumber: number;
  title: string;
  durationSec: number;
  cameraMovement: string;
  lighting: string;
  visualPrompt: string;
  dialogue: string;
  speaker: string;
  audioCue: string;
  colorGrade: string;
  imageUrl?: string;
}

export interface StoryboardData {
  projectTitle: string;
  logline: string;
  scenes: StoryScene[];
}

export interface ProjectRecord {
  id: number;
  userId: number;
  title: string;
  description: string | null;
  aspectRatio: string;
  targetResolution: string;
  exportFormat: string;
  fps: number;
  gpuProfile: string;
  status: string;
  thumbnailUrl: string | null;
  storyboardJson: StoryboardData | null;
  createdAt: string;
  updatedAt: string;
}

export interface CharacterRecord {
  id: number;
  userId: number;
  name: string;
  roleLabel: string | null;
  consistencySeed: number;
  visualPromptAnchor: string;
  voicePersona: string;
  referenceImageUrl: string | null;
  createdAt: string;
}

export interface RenderJobRecord {
  id: number;
  userId: number;
  projectId: number | null;
  jobType: string;
  title: string;
  prompt: string;
  modelId: string;
  executionBackend: string;
  gpuTarget: string;
  resolution: string;
  format: string;
  durationSec: number;
  progress: number;
  status: string;
  outputUrl: string | null;
  outputMeta: Record<string, unknown> | null;
  errorMessage: string | null;
  creditsCost: number;
  createdAt: string;
  completedAt: string | null;
}

export interface AiModelRecord {
  id: number;
  slug: string;
  name: string;
  category: string;
  provider: string;
  maxResolution: string | null;
  vramGb: number;
  enabled: boolean;
  availability: 'live' | 'paid_key_required' | 'gpu_worker_required' | string;
  description: string | null;
}

export interface GpuNodeRecord {
  id: number;
  name: string;
  architecture: string;
  location: string;
  vramTotalGb: number;
  vramUsedGb: number;
  cudaVersion: string;
  utilizationPct: number;
  tempCelsius: number;
  status: string;
}

export interface SubscriptionRecord {
  id: number;
  userId: number;
  plan: string;
  monthlyPriceUsd: number;
  gpuQuotaHours: number;
  status: string;
  renewDate: string;
}

export interface LipSyncKeyframe {
  timeSec: number;
  viseme: string;
  mouthOpen: number;
  lipRound: number;
  headTiltDeg: number;
  syllable: string;
}

export interface StudioTransferPayload {
  projectId?: number | null;
  title?: string;
  scenes?: StoryScene[];
  voiceAudioUrl?: string | null;
  musicAudioUrl?: string | null;
}
