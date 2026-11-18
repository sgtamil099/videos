import { desc, eq, sql } from 'drizzle-orm';
import { db } from './index.ts';
import {
  aiModels,
  characters,
  gpuNodes,
  projects,
  renderJobs,
  subscriptions,
  users,
} from './schema.ts';

export async function ensureSeededCatalog() {
  try {
    await db
      .insert(aiModels)
      .values([
        {
          slug: 'gemini-4-hydrogen',
          name: 'Google Gemini 4 Hydrogen',
          category: 'storyboard-director',
          provider: 'Google Gemini Cloud',
          maxResolution: '5 min Storyboard',
          vramGb: 0,
          enabled: true,
          availability: 'live',
          description:
            'Live multi-scene storyboarding up to 5 minutes, prompt engineering, and viseme tracks.',
        },
        {
          slug: 'claude-sonnet-4-5',
          name: 'Anthropic Claude Sonnet 4.5',
          category: 'storyboard-director',
          provider: 'Anthropic API (ANTHROPIC_API_KEY)',
          maxResolution: '5 min Screenplay',
          vramGb: 0,
          enabled: true,
          availability: 'paid_key_required',
          description:
            'Cinematic screenplay direction, character consistency bibles, and prompt expansion.',
        },
        {
          slug: 'chatgpt-gpt-4o',
          name: 'OpenAI ChatGPT (GPT-4o)',
          category: 'storyboard-director',
          provider: 'OpenAI API (OPENAI_API_KEY)',
          maxResolution: '5 min Screenplay',
          vramGb: 0,
          enabled: true,
          availability: 'paid_key_required',
          description:
            'Multi-scene story generation, shot blocking, and dialogue scripting via ChatGPT.',
        },
        {
          slug: 'gemini-3.8-flash-lite-tts',
          name: 'Gemini 3.8 Flash Lite TTS',
          category: 'ai-voice',
          provider: 'Google Gemini Cloud',
          maxResolution: '24kHz WAV',
          vramGb: 0,
          enabled: true,
          availability: 'live',
          description:
            'Studio-grade single-speaker narration with style direction and instant WAV export.',
        },
        {
          slug: 'gemini-3.8-flash-tts',
          name: 'Gemini 3.8 Flash Screenplay TTS',
          category: 'ai-voice',
          provider: 'Google Gemini Cloud',
          maxResolution: '24kHz WAV',
          vramGb: 0,
          enabled: true,
          availability: 'live',
          description:
            'Dual-speaker voice design, screenplay dialogue, backchanneling, and vocal bursts.',
        },
        {
          slug: 'gemini-omni-1.2-flash',
          name: 'Gemini Omni 1.2 Flash (Veo Engine)',
          category: 'text-to-video',
          provider: 'Google Gemini Interactions API',
          maxResolution: '4K',
          vramGb: 0,
          enabled: true,
          availability: 'paid_key_required',
          description:
            'Cloud text-to-video and image-to-video (15s segments chained for long projects).',
        },
        {
          slug: 'lyria-3-pro-preview',
          name: 'Lyria 3 Pro Cinema Score',
          category: 'ai-music',
          provider: 'Google DeepMind Lyria',
          maxResolution: 'Stereo MP3',
          vramGb: 0,
          enabled: true,
          availability: 'paid_key_required',
          description:
            'Full-length adaptive cinematic soundtracks and stem scoring.',
        },
        {
          slug: 'wan2.1-i2v-14b-cuda',
          name: 'Wan 2.1 14B (GitHub Free AI)',
          category: 'text-to-video',
          provider: 'GitHub: Wan-Video/Wan2.1 · Apache 2.0',
          maxResolution: '1080p / 4K Upscale',
          vramGb: 24,
          enabled: true,
          availability: 'gpu_worker_required',
          description:
            'Free open-source T2V & I2V diffusion on RTX 4090 / A100 via backend-gpu.',
        },
        {
          slug: 'skyreels-v2-longform',
          name: 'SkyReels-V2 5-Min (GitHub Free AI)',
          category: 'text-to-video',
          provider: 'GitHub: SkyworkAI/SkyReels-V2 · Open Source',
          maxResolution: '720p · 5 min Diffusion',
          vramGb: 24,
          enabled: true,
          availability: 'gpu_worker_required',
          description:
            'Infinite-length autoregressive open-source video diffusion supporting up to 5-minute takes.',
        },
        {
          slug: 'hunyuan-video-cuda',
          name: 'HunyuanVideo 13B (GitHub Free AI)',
          category: 'text-to-video',
          provider: 'GitHub: Tencent/HunyuanVideo · Open Source',
          maxResolution: '1080p / 4K Upscale',
          vramGb: 24,
          enabled: true,
          availability: 'gpu_worker_required',
          description:
            'High-coherence cinematic physics open-source text-to-video model.',
        },
        {
          slug: 'cogvideox-5b-cuda',
          name: 'CogVideoX-5B (GitHub Free AI)',
          category: 'text-to-video',
          provider: 'GitHub: THUDM/CogVideo · Apache 2.0',
          maxResolution: '1080p',
          vramGb: 16,
          enabled: true,
          availability: 'gpu_worker_required',
          description:
            'Efficient 16GB VRAM open-source text-to-video and image-to-video generator.',
        },
        {
          slug: 'ltx-video-cuda',
          name: 'LTX-Video Real-Time (GitHub Free AI)',
          category: 'text-to-video',
          provider: 'GitHub: Lightricks/LTX-Video · Open Source',
          maxResolution: '1080p',
          vramGb: 12,
          enabled: true,
          availability: 'gpu_worker_required',
          description:
            'Fast DiT-based open-source video generator runnable on 12GB+ RTX GPUs.',
        },
        {
          slug: 'mochi-1-cuda',
          name: 'Mochi 1 Preview (GitHub Free AI)',
          category: 'text-to-video',
          provider: 'GitHub: genmoai/mochi · Apache 2.0',
          maxResolution: '1080p',
          vramGb: 24,
          enabled: true,
          availability: 'gpu_worker_required',
          description:
            'Open-source high-motion fidelity video model with smooth 30fps fluid motion.',
        },
        {
          slug: 'sadtalker-wav2lip-cuda',
          name: 'Wav2Lip HD + SadTalker (GitHub Free AI)',
          category: 'lip-sync',
          provider: 'GitHub: OpenTalker/SadTalker · Open Source',
          maxResolution: '4K',
          vramGb: 12,
          enabled: true,
          availability: 'gpu_worker_required',
          description:
            'Photorealistic facial lip-sync and head-pose synthesis driven by generated WAV audio.',
        },
      ])
      .onConflictDoNothing({ target: aiModels.slug });

    const existingGpus = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(gpuNodes);

    if ((existingGpus[0]?.count ?? 0) === 0) {
      await db.insert(gpuNodes).values([
        {
          name: 'rtx-4090-workstation-01',
          architecture: 'NVIDIA GeForce RTX 4090 (Ada Lovelace)',
          location: 'Local CUDA Node (GPU_WORKER_URL)',
          vramTotalGb: 24,
          vramUsedGb: 0,
          cudaVersion: '12.4',
          utilizationPct: 0,
          tempCelsius: 38,
          status: 'standby',
        },
        {
          name: 'cloud-a100-asia-south1-a',
          architecture: 'NVIDIA A100-SXM4 80GB',
          location: 'Cloud Cluster · asia-south1',
          vramTotalGb: 80,
          vramUsedGb: 28,
          cudaVersion: '12.4',
          utilizationPct: 35,
          tempCelsius: 54,
          status: 'online',
        },
        {
          name: 'multi-gpu-4xh100-pod',
          architecture: '4x NVIDIA H100 80GB NVLink',
          location: 'Cloud 8K Render Pod · us-central1',
          vramTotalGb: 320,
          vramUsedGb: 112,
          cudaVersion: '12.6',
          utilizationPct: 41,
          tempCelsius: 59,
          status: 'online',
        },
      ]);
    }
  } catch (error) {
    console.error('Database query failed in ensureSeededCatalog:', error);
    throw new Error('Failed to initialize model catalog.', { cause: error });
  }
}

export async function getUserDashboardData(userId: number) {
  try {
    await ensureSeededCatalog();

    const [userProjects, userChars, userJobs, userSub, models, gpus] =
      await Promise.all([
        db
          .select()
          .from(projects)
          .where(eq(projects.userId, userId))
          .orderBy(desc(projects.updatedAt)),
        db
          .select()
          .from(characters)
          .where(eq(characters.userId, userId))
          .orderBy(desc(characters.createdAt)),
        db
          .select()
          .from(renderJobs)
          .where(eq(renderJobs.userId, userId))
          .orderBy(desc(renderJobs.createdAt))
          .limit(50),
        db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.userId, userId))
          .limit(1),
        db.select().from(aiModels).orderBy(aiModels.id),
        db.select().from(gpuNodes).orderBy(gpuNodes.id),
      ]);

    return {
      projects: userProjects,
      characters: userChars,
      renderJobs: userJobs,
      subscription: userSub[0] ?? null,
      aiModels: models,
      gpuNodes: gpus,
    };
  } catch (error) {
    console.error('Database query failed in getUserDashboardData:', error);
    throw new Error('Failed to load workspace data.', { cause: error });
  }
}

export async function createProject(
  userId: number,
  input: {
    title: string;
    description?: string;
    aspectRatio?: string;
    targetResolution?: string;
    exportFormat?: string;
    fps?: number;
    gpuProfile?: string;
    thumbnailUrl?: string;
    storyboardJson?: unknown;
  }
) {
  try {
    const rows = await db
      .insert(projects)
      .values({
        userId,
        title: input.title,
        description: input.description ?? '',
        aspectRatio: input.aspectRatio ?? '16:9',
        targetResolution: input.targetResolution ?? '4K',
        exportFormat: input.exportFormat ?? 'MP4',
        fps: input.fps ?? 24,
        gpuProfile: input.gpuProfile ?? 'cloud-a100',
        status: 'active',
        thumbnailUrl: input.thumbnailUrl ?? null,
        storyboardJson: input.storyboardJson ?? null,
      })
      .returning();
    return rows[0];
  } catch (error) {
    console.error('Database query failed in createProject:', error);
    throw new Error('Failed to create project.', { cause: error });
  }
}

export async function updateProjectStoryboard(
  projectId: number,
  userId: number,
  storyboardJson: unknown,
  title?: string
) {
  try {
    const existing = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!existing[0] || existing[0].userId !== userId) {
      return null;
    }

    const rows = await db
      .update(projects)
      .set({
        storyboardJson,
        ...(title ? { title } : {}),
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId))
      .returning();
    return rows[0];
  } catch (error) {
    console.error('Database query failed in updateProjectStoryboard:', error);
    throw new Error('Failed to update project timeline.', { cause: error });
  }
}

export async function createCharacterProfile(
  userId: number,
  input: {
    name: string;
    roleLabel: string;
    consistencySeed: number;
    visualPromptAnchor: string;
    voicePersona: string;
    referenceImageUrl?: string;
  }
) {
  try {
    const rows = await db
      .insert(characters)
      .values({
        userId,
        name: input.name,
        roleLabel: input.roleLabel,
        consistencySeed: input.consistencySeed,
        visualPromptAnchor: input.visualPromptAnchor,
        voicePersona: input.voicePersona,
        referenceImageUrl: input.referenceImageUrl ?? null,
      })
      .returning();
    return rows[0];
  } catch (error) {
    console.error('Database query failed in createCharacterProfile:', error);
    throw new Error('Failed to create character profile.', { cause: error });
  }
}

export async function createRenderJobRecord(input: {
  userId: number;
  projectId?: number | null;
  jobType: string;
  title: string;
  prompt: string;
  modelId: string;
  executionBackend: string;
  gpuTarget: string;
  resolution: string;
  format: string;
  durationSec: number;
  status: string;
  progress: number;
  outputUrl?: string | null;
  outputMeta?: unknown;
  errorMessage?: string | null;
  creditsCost?: number;
}) {
  try {
    const rows = await db
      .insert(renderJobs)
      .values({
        userId: input.userId,
        projectId: input.projectId ?? null,
        jobType: input.jobType,
        title: input.title,
        prompt: input.prompt,
        modelId: input.modelId,
        executionBackend: input.executionBackend,
        gpuTarget: input.gpuTarget,
        resolution: input.resolution,
        format: input.format,
        durationSec: input.durationSec,
        status: input.status,
        progress: input.progress,
        outputUrl: input.outputUrl ?? null,
        outputMeta: input.outputMeta ?? null,
        errorMessage: input.errorMessage ?? null,
        creditsCost: input.creditsCost ?? 0,
        completedAt: input.status === 'completed' ? new Date() : null,
      })
      .returning();
    return rows[0];
  } catch (error) {
    console.error('Database query failed in createRenderJobRecord:', error);
    throw new Error('Failed to log render job.', { cause: error });
  }
}

export async function updateRenderJobStatus(
  jobId: number,
  updates: {
    status?: string;
    progress?: number;
    outputUrl?: string | null;
    outputMeta?: unknown;
    errorMessage?: string | null;
  }
) {
  try {
    const rows = await db
      .update(renderJobs)
      .set({
        ...updates,
        ...(updates.status === 'completed' ? { completedAt: new Date() } : {}),
      })
      .where(eq(renderJobs.id, jobId))
      .returning();
    return rows[0] ?? null;
  } catch (error) {
    console.error('Database query failed in updateRenderJobStatus:', error);
    throw new Error('Failed to update render job.', { cause: error });
  }
}

export async function updateSubscriptionPlan(userId: number, plan: string) {
  try {
    const tierMap: Record<
      string,
      { price: number; hours: number; credits: number }
    > = {
      starter: { price: 0, hours: 4, credits: 500 },
      pro: { price: 29, hours: 25, credits: 2500 },
      studio: { price: 99, hours: 120, credits: 10000 },
      enterprise: { price: 299, hours: 500, credits: 45000 },
    };
    const tier = tierMap[plan] ?? tierMap.pro;
    const renewDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    await db
      .update(users)
      .set({ plan, credits: tier.credits })
      .where(eq(users.id, userId));

    const existing = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);

    if (existing[0]) {
      const updated = await db
        .update(subscriptions)
        .set({
          plan,
          monthlyPriceUsd: tier.price,
          gpuQuotaHours: tier.hours,
          status: 'active',
          renewDate,
        })
        .where(eq(subscriptions.userId, userId))
        .returning();
      return { subscription: updated[0], credits: tier.credits };
    } else {
      const created = await db
        .insert(subscriptions)
        .values({
          userId,
          plan,
          monthlyPriceUsd: tier.price,
          gpuQuotaHours: tier.hours,
          status: 'active',
          renewDate,
        })
        .returning();
      return { subscription: created[0], credits: tier.credits };
    }
  } catch (error) {
    console.error('Database query failed in updateSubscriptionPlan:', error);
    throw new Error('Failed to update subscription plan.', { cause: error });
  }
}

export async function getAdminOverview() {
  try {
    await ensureSeededCatalog();
    const [allUsers, allJobs, allModels, allGpus, allSubs] = await Promise.all([
      db.select().from(users).orderBy(desc(users.createdAt)),
      db.select().from(renderJobs).orderBy(desc(renderJobs.createdAt)).limit(60),
      db.select().from(aiModels).orderBy(aiModels.id),
      db.select().from(gpuNodes).orderBy(gpuNodes.id),
      db.select().from(subscriptions).orderBy(desc(subscriptions.createdAt)),
    ]);

    const monthlyRecurringRevenue = allSubs
      .filter((s) => s.status === 'active')
      .reduce((sum, s) => sum + s.monthlyPriceUsd, 0);

    return {
      users: allUsers,
      renderJobs: allJobs,
      aiModels: allModels,
      gpuNodes: allGpus,
      subscriptions: allSubs,
      revenue: {
        mrrUsd: monthlyRecurringRevenue,
        activeSubscriptions: allSubs.filter((s) => s.status === 'active').length,
        totalCreditsIssued: allUsers.reduce((sum, u) => sum + u.credits, 0),
      },
    };
  } catch (error) {
    console.error('Database query failed in getAdminOverview:', error);
    throw new Error('Failed to fetch admin console data.', { cause: error });
  }
}

export async function toggleAiModelEnabled(modelId: number, enabled: boolean) {
  try {
    const rows = await db
      .update(aiModels)
      .set({ enabled })
      .where(eq(aiModels.id, modelId))
      .returning();
    return rows[0] ?? null;
  } catch (error) {
    console.error('Database query failed in toggleAiModelEnabled:', error);
    throw new Error('Failed to update AI model state.', { cause: error });
  }
}

export async function getPublicCatalog() {
  try {
    await ensureSeededCatalog();
    const [models, gpus] = await Promise.all([
      db.select().from(aiModels).orderBy(aiModels.id),
      db.select().from(gpuNodes).orderBy(gpuNodes.id),
    ]);
    return { aiModels: models, gpuNodes: gpus };
  } catch (error) {
    console.error('Database query failed in getPublicCatalog:', error);
    throw new Error('Failed to load platform catalog.', { cause: error });
  }
}
