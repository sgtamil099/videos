import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { AuthRequest, requireAdmin, requireAuth } from './src/middleware/auth.ts';
import {
  createCharacterProfile,
  createProject,
  createRenderJobRecord,
  getAdminOverview,
  getPublicCatalog,
  getUserDashboardData,
  toggleAiModelEnabled,
  updateProjectStoryboard,
  updateRenderJobStatus,
  updateSubscriptionPlan,
} from './src/db/repository.ts';
import { updateUserRoleOrPlan } from './src/db/users.ts';
import {
  dispatchCloudMusicGeneration,
  dispatchCloudVideoGeneration,
  enhanceCinematicPrompt,
  generateLipSyncTimeline,
  generateMultiSceneStoryboard,
  generateSpeechWav,
} from './src/server/ai-engine.ts';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '25mb' }));

// Health endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'vyro-ai-studio',
    gpuWorkerConfigured: Boolean(process.env.GPU_WORKER_URL),
    timestamp: new Date().toISOString(),
  });
});

// Public catalog (AI models + GPU cluster definitions + live CUDA worker probe)
app.get('/api/catalog', async (_req, res) => {
  try {
    const catalog = await getPublicCatalog();
    let cudaWorkerOnline = false;
    let cudaTelemetry: unknown = null;

    if (process.env.GPU_WORKER_URL) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 2000);
        const workerRes = await fetch(
          `${process.env.GPU_WORKER_URL.replace(/\/$/, '')}/api/v1/gpu/telemetry`,
          { signal: controller.signal }
        );
        clearTimeout(timer);
        if (workerRes.ok) {
          cudaWorkerOnline = true;
          cudaTelemetry = await workerRes.json();
        }
      } catch {
        cudaWorkerOnline = false;
      }
    }

    res.json({
      ...catalog,
      cudaWorkerConfigured: Boolean(process.env.GPU_WORKER_URL),
      cudaWorkerOnline,
      cudaTelemetry,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to load catalog';
    res.status(500).json({ error: msg });
  }
});

// Authenticated user workspace
app.get('/api/workspace', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.dbUser) {
      return res.status(401).json({ error: 'User profile not synchronized' });
    }
    const data = await getUserDashboardData(req.dbUser.id);
    res.json({
      user: req.dbUser,
      ...data,
      cudaWorkerConfigured: Boolean(process.env.GPU_WORKER_URL),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to load workspace';
    res.status(500).json({ error: msg });
  }
});

// Create project
app.post('/api/projects', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.dbUser) return res.status(401).json({ error: 'Unauthorized' });
    const {
      title,
      description,
      aspectRatio,
      targetResolution,
      exportFormat,
      fps,
      gpuProfile,
      thumbnailUrl,
      storyboardJson,
    } = req.body;

    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'Project title is required.' });
    }

    const project = await createProject(req.dbUser.id, {
      title: title.trim(),
      description,
      aspectRatio,
      targetResolution,
      exportFormat,
      fps: Number(fps) || 24,
      gpuProfile,
      thumbnailUrl,
      storyboardJson,
    });
    res.status(201).json({ project });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to create project';
    res.status(500).json({ error: msg });
  }
});

// Update project storyboard / timeline
app.patch('/api/projects/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.dbUser) return res.status(401).json({ error: 'Unauthorized' });
    const projectId = Number(req.params.id);
    if (!Number.isFinite(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }
    const updated = await updateProjectStoryboard(
      projectId,
      req.dbUser.id,
      req.body.storyboardJson,
      req.body.title
    );
    if (!updated) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json({ project: updated });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to update project';
    res.status(500).json({ error: msg });
  }
});

// Create character consistency profile
app.post('/api/characters', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.dbUser) return res.status(401).json({ error: 'Unauthorized' });
    const {
      name,
      roleLabel,
      consistencySeed,
      visualPromptAnchor,
      voicePersona,
      referenceImageUrl,
    } = req.body;

    if (!name || !visualPromptAnchor) {
      return res
        .status(400)
        .json({ error: 'Character name and visual anchor prompt are required.' });
    }

    const character = await createCharacterProfile(req.dbUser.id, {
      name: String(name).trim(),
      roleLabel: String(roleLabel || 'Protagonist'),
      consistencySeed:
        Number(consistencySeed) || Math.floor(100000 + Math.random() * 899999),
      visualPromptAnchor: String(visualPromptAnchor).trim(),
      voicePersona: String(voicePersona || 'Kore'),
      referenceImageUrl,
    });
    res.status(201).json({ character });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to save character';
    res.status(500).json({ error: msg });
  }
});

// AI Enhance Cinematic Prompt (Gemini, Claude, or ChatGPT)
app.post('/api/ai/enhance-prompt', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { prompt, mode, cameraLens, characterAnchor, provider = 'gemini' } =
      req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt text is required.' });
    }
    const result = await enhanceCinematicPrompt({
      prompt,
      mode: mode || 'cinematic-video',
      cameraLens: cameraLens || '35mm Anamorphic',
      characterAnchor,
      provider,
    });
    res.json(result);
  } catch (error: unknown) {
    console.error('Enhance prompt error:', error);
    const msg =
      error instanceof Error ? error.message : 'Failed to enhance prompt';
    res.status(500).json({ error: msg });
  }
});

// AI Multi-Scene Storyboard Generator up to 5 Minutes (Gemini, Claude, or ChatGPT)
app.post('/api/ai/storyboard', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.dbUser) return res.status(401).json({ error: 'Unauthorized' });
    const {
      concept,
      sceneCount = 6,
      totalDurationSec = 300,
      visualStyle = 'Anamorphic Sci-Fi Noir',
      aspectRatio = '16:9',
      characterAnchor,
      provider = 'gemini',
      saveAsProject = true,
    } = req.body;

    if (!concept || typeof concept !== 'string') {
      return res.status(400).json({ error: 'Story concept is required.' });
    }

    const boundedDuration = Math.min(300, Math.max(10, Number(totalDurationSec) || 60));
    const storyboard = await generateMultiSceneStoryboard({
      concept,
      sceneCount: Math.min(20, Math.max(2, Number(sceneCount) || 6)),
      totalDurationSec: boundedDuration,
      visualStyle,
      aspectRatio,
      characterAnchor,
      provider,
    });

    let project = null;
    if (saveAsProject) {
      project = await createProject(req.dbUser.id, {
        title: storyboard.projectTitle || 'Untitled Storyboard',
        description: storyboard.logline || concept,
        aspectRatio,
        targetResolution: '4K',
        exportFormat: 'MP4',
        fps: 24,
        gpuProfile: 'cloud-a100',
        storyboardJson: storyboard,
      });
    }

    const modelSlug =
      provider === 'claude'
        ? 'claude-sonnet-4-5'
        : provider === 'chatgpt'
        ? 'chatgpt-gpt-4o'
        : 'gemini-4-hydrogen';

    const job = await createRenderJobRecord({
      userId: req.dbUser.id,
      projectId: project?.id ?? null,
      jobType: 'multi-scene',
      title: storyboard.projectTitle || 'Multi-Scene Storyboard',
      prompt: concept,
      modelId: modelSlug,
      executionBackend: `${provider}-cloud`,
      gpuTarget:
        provider === 'claude'
          ? 'Anthropic Claude Cloud'
          : provider === 'chatgpt'
          ? 'OpenAI ChatGPT Cloud'
          : 'Gemini 4 Cloud TPU',
      resolution: '4K Blueprint',
      format: 'JSON',
      durationSec: boundedDuration,
      status: 'completed',
      progress: 100,
      outputMeta: storyboard,
      creditsCost: 15,
    });

    res.json({ storyboard, project, job });
  } catch (error: unknown) {
    console.error('Storyboard generation error:', error);
    const msg =
      error instanceof Error ? error.message : 'Storyboard generation failed.';
    res.status(500).json({ error: msg });
  }
});

// AI Voice Generator (Live Gemini 3.8 TTS returning real WAV audio)
app.post('/api/ai/voice', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.dbUser) return res.status(401).json({ error: 'Unauthorized' });
    const {
      title,
      mode = 'single',
      text,
      voiceName = 'Kore',
      styleDirection = 'Cinematic film narrator',
      secondSpeakerName,
      secondVoiceName,
      secondSpeakerText,
      secondSpeakerStyle,
      projectId,
    } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Voice script text is required.' });
    }

    const audio = await generateSpeechWav({
      mode: mode === 'dual' ? 'dual' : 'single',
      text,
      voiceName,
      styleDirection,
      secondSpeakerName,
      secondVoiceName,
      secondSpeakerText,
      secondSpeakerStyle,
    });

    const dataUrl = `data:${audio.mimeType};base64,${audio.base64Audio}`;

    const job = await createRenderJobRecord({
      userId: req.dbUser.id,
      projectId: projectId ? Number(projectId) : null,
      jobType: 'ai-voice',
      title: title || `Voiceover (${voiceName})`,
      prompt: text,
      modelId: audio.modelUsed,
      executionBackend: 'gemini-cloud',
      gpuTarget: 'Gemini 3.8 Audio Cloud',
      resolution: '24kHz 16-bit',
      format: 'WAV',
      durationSec: Math.max(3, Math.ceil(text.split(/\s+/).length / 2.4)),
      status: 'completed',
      progress: 100,
      outputUrl: dataUrl,
      outputMeta: {
        voiceName,
        mode,
        styleDirection,
        byteLength: Buffer.from(audio.base64Audio, 'base64').length,
      },
      creditsCost: 10,
    });

    res.json({
      audioDataUrl: dataUrl,
      mimeType: audio.mimeType,
      modelUsed: audio.modelUsed,
      job,
    });
  } catch (error: unknown) {
    console.error('Voice TTS error:', error);
    const msg =
      error instanceof Error ? error.message : 'AI voice generation failed.';
    res.status(500).json({ error: msg });
  }
});

// AI Lip-Sync Generator (Live Gemini 4 Viseme Track + Optional CUDA SadTalker Bridge)
app.post('/api/ai/lip-sync', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.dbUser) return res.status(401).json({ error: 'Unauthorized' });
    const {
      title,
      dialogue,
      durationSec = 6,
      fps = 24,
      emotion = 'Focused cinematic delivery',
      executionBackend = 'gemini-viseme',
      audioBase64,
      avatarImageBase64,
    } = req.body;

    if (!dialogue && executionBackend !== 'cuda-worker') {
      return res
        .status(400)
        .json({ error: 'Dialogue text is required for viseme generation.' });
    }

    if (executionBackend === 'cuda-worker') {
      if (!process.env.GPU_WORKER_URL) {
        const job = await createRenderJobRecord({
          userId: req.dbUser.id,
          jobType: 'lip-sync',
          title: title || 'CUDA SadTalker Lip-Sync',
          prompt: dialogue || 'Audio-driven facial lip-sync',
          modelId: 'sadtalker-wav2lip-cuda',
          executionBackend: 'cuda-worker',
          gpuTarget: 'NVIDIA RTX 4090 Local',
          resolution: '1080p',
          format: 'MP4',
          durationSec: Math.min(300, Number(durationSec) || 6),
          status: 'requires_gpu_worker',
          progress: 0,
          errorMessage:
            'NVIDIA CUDA GPU Worker (GPU_WORKER_URL) is not connected. Start backend-gpu/main.py on your RTX/A100 host or switch to Real-Time Viseme Sequencing.',
        });
        return res.status(503).json({
          error:
            'No NVIDIA CUDA Worker connected (GPU_WORKER_URL unset). Switch to Real-Time Viseme Sequencing or deploy backend-gpu with Docker CUDA.',
          job,
        });
      }

      const workerRes = await fetch(
        `${process.env.GPU_WORKER_URL.replace(/\/$/, '')}/api/v1/lip-sync`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dialogue,
            audio_base64: audioBase64,
            avatar_image_base64: avatarImageBase64,
            fps,
          }),
        }
      );
      const workerData = await workerRes.json();
      if (!workerRes.ok) {
        return res
          .status(workerRes.status)
          .json({ error: workerData.detail || 'CUDA lip-sync worker failed.' });
      }
      const job = await createRenderJobRecord({
        userId: req.dbUser.id,
        jobType: 'lip-sync',
        title: title || 'CUDA Lip-Sync Render',
        prompt: dialogue || 'Audio-driven lip-sync',
        modelId: 'sadtalker-wav2lip-cuda',
        executionBackend: 'cuda-worker',
        gpuTarget: 'NVIDIA CUDA Worker',
        resolution: '1080p',
        format: 'MP4',
        durationSec: Math.min(300, Number(durationSec) || 6),
        status: 'completed',
        progress: 100,
        outputUrl: workerData.video_data_url || null,
        outputMeta: workerData,
      });
      return res.json({ ...workerData, job });
    }

    const timeline = await generateLipSyncTimeline({
      dialogue,
      durationSec: Math.min(300, Math.max(2, Number(durationSec) || 6)),
      fps: Number(fps) || 24,
      emotion,
    });

    const job = await createRenderJobRecord({
      userId: req.dbUser.id,
      jobType: 'lip-sync',
      title: title || 'Lip-Sync Viseme Track',
      prompt: dialogue,
      modelId: 'gemini-4-hydrogen',
      executionBackend: 'gemini-cloud',
      gpuTarget: 'Gemini 4 Viseme Engine',
      resolution: `${fps}fps Rig`,
      format: 'JSON',
      durationSec: Math.min(300, Number(durationSec) || 6),
      status: 'completed',
      progress: 100,
      outputMeta: timeline,
      creditsCost: 12,
    });

    res.json({ timeline, job });
  } catch (error: unknown) {
    console.error('Lip-sync error:', error);
    const msg = error instanceof Error ? error.message : 'Lip-sync generation failed.';
    res.status(500).json({ error: msg });
  }
});

// AI Video Generation (Text-to-Video, Image-to-Video, Cinematic, Batch, up to 5 minutes)
app.post('/api/ai/video', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.dbUser) return res.status(401).json({ error: 'Unauthorized' });
    const {
      title,
      jobType = 'text-to-video',
      prompt,
      aspectRatio = '16:9',
      resolution = '1080p',
      format = 'MP4',
      durationSec = 300,
      gpuTarget = 'Cloud A100 80GB',
      executionBackend = 'gemini-cloud',
      githubModelId = 'skyreels-v2-longform',
      imageBase64,
      imageMimeType,
      projectId,
    } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Video prompt is required.' });
    }

    const boundedDuration = Math.min(300, Math.max(3, Number(durationSec) || 300));

    // 1. Route to self-hosted Free GitHub Open-Source Video AI Worker (NVIDIA CUDA FastAPI)
    if (executionBackend === 'cuda-worker') {
      if (!process.env.GPU_WORKER_URL) {
        const job = await createRenderJobRecord({
          userId: req.dbUser.id,
          projectId: projectId ? Number(projectId) : null,
          jobType,
          title: title || `Free GitHub AI Render (${githubModelId})`,
          prompt,
          modelId: githubModelId,
          executionBackend: 'cuda-worker',
          gpuTarget,
          resolution,
          format,
          durationSec: boundedDuration,
          status: 'requires_gpu_worker',
          progress: 0,
          errorMessage: `Free open-source model "${githubModelId}" requires connecting the Python FastAPI CUDA Worker (GPU_WORKER_URL) from backend-gpu/Dockerfile.`,
        });
        return res.status(503).json({
          error: `Free GitHub AI model (${githubModelId}) selected for ${boundedDuration}s (${(boundedDuration / 60).toFixed(1)} min). Start backend-gpu/main.py on your NVIDIA GPU and set GPU_WORKER_URL, or export a 5-minute cut directly in the NLE Editing Studio.`,
          code: 'GPU_WORKER_UNAVAILABLE',
          job,
        });
      }

      const workerRes = await fetch(
        `${process.env.GPU_WORKER_URL.replace(/\/$/, '')}/api/v1/video/generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            job_type: jobType,
            model_id: githubModelId,
            aspect_ratio: aspectRatio,
            resolution,
            export_format: format,
            duration_sec: boundedDuration,
            gpu_target: gpuTarget,
            image_base64: imageBase64,
          }),
        }
      );

      const workerJson = await workerRes.json();
      if (!workerRes.ok) {
        return res.status(workerRes.status).json({
          error: workerJson.detail || 'CUDA GPU Worker returned an error.',
        });
      }

      const job = await createRenderJobRecord({
        userId: req.dbUser.id,
        projectId: projectId ? Number(projectId) : null,
        jobType,
        title: title || `Free GitHub AI Render (${githubModelId})`,
        prompt,
        modelId: workerJson.model || githubModelId,
        executionBackend: 'cuda-worker',
        gpuTarget,
        resolution,
        format,
        durationSec: boundedDuration,
        status: 'completed',
        progress: 100,
        outputUrl: workerJson.video_data_url || null,
        outputMeta: workerJson,
        creditsCost: 50,
      });

      return res.json({ videoDataUrl: workerJson.video_data_url, job });
    }

    // 2. Route to Gemini Cloud Video (gemini-omni-1.2-flash)
    const allowedCloudRes =
      resolution === '4K' ? '4k' : resolution === '720p' ? '720p' : '1080p';
    const cloudAspect = aspectRatio === '9:16' ? '9:16' : '16:9';

    try {
      const video = await dispatchCloudVideoGeneration({
        prompt,
        aspectRatio: cloudAspect,
        durationSec: boundedDuration,
        resolution: allowedCloudRes,
        imageBase64,
        imageMimeType,
      });

      const videoDataUrl = video.base64Video
        ? `data:${video.mimeType};base64,${video.base64Video}`
        : video.uri;

      const job = await createRenderJobRecord({
        userId: req.dbUser.id,
        projectId: projectId ? Number(projectId) : null,
        jobType,
        title: title || 'Gemini Omni Video Render',
        prompt,
        modelId: video.modelUsed,
        executionBackend: 'gemini-cloud',
        gpuTarget,
        resolution,
        format,
        durationSec: boundedDuration,
        status: 'completed',
        progress: 100,
        outputUrl: videoDataUrl,
        outputMeta: { mimeType: video.mimeType },
        creditsCost: resolution === '4K' ? 120 : 60,
      });

      return res.json({ videoDataUrl, job });
    } catch (upstreamErr: unknown) {
      const rawMsg =
        upstreamErr instanceof Error
          ? upstreamErr.message
          : 'Cloud video inference failed.';
      const isPaidKeyRequired =
        rawMsg.includes('429') ||
        rawMsg.includes('403') ||
        rawMsg.includes('RESOURCE_EXHAUSTED') ||
        rawMsg.includes('PERMISSION_DENIED') ||
        rawMsg.includes('billing') ||
        rawMsg.includes('quota');

      const friendlyMessage = isPaidKeyRequired
        ? 'Cloud Video Generation (gemini-omni-1.2-flash) requires a billing-enabled Gemini API key in Settings > Secrets, or a connected NVIDIA CUDA FastAPI Worker (GPU_WORKER_URL).'
        : rawMsg;

      const job = await createRenderJobRecord({
        userId: req.dbUser.id,
        projectId: projectId ? Number(projectId) : null,
        jobType,
        title: title || 'Cloud Video Render',
        prompt,
        modelId: 'gemini-omni-1.2-flash',
        executionBackend: 'gemini-cloud',
        gpuTarget,
        resolution,
        format,
        durationSec: boundedDuration,
        status: isPaidKeyRequired ? 'requires_paid_key' : 'failed',
        progress: 0,
        errorMessage: friendlyMessage,
      });

      return res.status(isPaidKeyRequired ? 402 : 502).json({
        error: friendlyMessage,
        code: isPaidKeyRequired ? 'PAID_KEY_REQUIRED' : 'UPSTREAM_ERROR',
        job,
      });
    }
  } catch (error: unknown) {
    console.error('Video generation error:', error);
    const msg =
      error instanceof Error ? error.message : 'Video generation failed.';
    res.status(500).json({ error: msg });
  }
});

// AI Music Generation (Lyria Cloud or CUDA MusicGen)
app.post('/api/ai/music', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.dbUser) return res.status(401).json({ error: 'Unauthorized' });
    const {
      title,
      prompt,
      proMode = false,
      executionBackend = 'gemini-cloud',
    } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Music prompt is required.' });
    }

    if (executionBackend === 'cuda-worker') {
      if (!process.env.GPU_WORKER_URL) {
        const job = await createRenderJobRecord({
          userId: req.dbUser.id,
          jobType: 'ai-music',
          title: title || 'CUDA MusicGen Track',
          prompt,
          modelId: 'musicgen-large-cuda',
          executionBackend: 'cuda-worker',
          gpuTarget: 'NVIDIA RTX 4090 Local',
          resolution: '44.1kHz Stereo',
          format: 'WAV',
          durationSec: 30,
          status: 'requires_gpu_worker',
          progress: 0,
          errorMessage:
            'GPU_WORKER_URL is not configured. Deploy backend-gpu/Dockerfile to run MusicGen locally on CUDA.',
        });
        return res.status(503).json({
          error:
            'No NVIDIA CUDA Worker connected (GPU_WORKER_URL unset). Use Studio Stem Synthesizer or connect backend-gpu.',
          code: 'GPU_WORKER_UNAVAILABLE',
          job,
        });
      }

      const workerRes = await fetch(
        `${process.env.GPU_WORKER_URL.replace(/\/$/, '')}/api/v1/music/generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        }
      );
      const workerJson = await workerRes.json();
      if (!workerRes.ok) {
        return res
          .status(workerRes.status)
          .json({ error: workerJson.detail || 'CUDA music generation failed.' });
      }
      const job = await createRenderJobRecord({
        userId: req.dbUser.id,
        jobType: 'ai-music',
        title: title || 'CUDA MusicGen Track',
        prompt,
        modelId: 'musicgen-large-cuda',
        executionBackend: 'cuda-worker',
        gpuTarget: 'NVIDIA CUDA Worker',
        resolution: 'Stereo WAV',
        format: 'WAV',
        durationSec: 30,
        status: 'completed',
        progress: 100,
        outputUrl: workerJson.audio_data_url || null,
        outputMeta: workerJson,
      });
      return res.json({ audioDataUrl: workerJson.audio_data_url, job });
    }

    try {
      const music = await dispatchCloudMusicGeneration({
        prompt,
        proMode: Boolean(proMode),
      });
      const audioDataUrl = `data:${music.mimeType};base64,${music.base64Audio}`;

      const job = await createRenderJobRecord({
        userId: req.dbUser.id,
        jobType: 'ai-music',
        title: title || 'Lyria AI Soundtrack',
        prompt,
        modelId: music.modelUsed,
        executionBackend: 'gemini-cloud',
        gpuTarget: 'DeepMind Lyria Cloud',
        resolution: 'Stereo MP3',
        format: 'MP3',
        durationSec: proMode ? 90 : 30,
        status: 'completed',
        progress: 100,
        outputUrl: audioDataUrl,
        outputMeta: { lyrics: music.lyrics },
        creditsCost: proMode ? 40 : 20,
      });

      return res.json({
        audioDataUrl,
        lyrics: music.lyrics,
        modelUsed: music.modelUsed,
        job,
      });
    } catch (upstreamErr: unknown) {
      const rawMsg =
        upstreamErr instanceof Error
          ? upstreamErr.message
          : 'Lyria music generation failed.';
      const isPaidKeyRequired =
        rawMsg.includes('429') ||
        rawMsg.includes('403') ||
        rawMsg.includes('RESOURCE_EXHAUSTED') ||
        rawMsg.includes('PERMISSION_DENIED') ||
        rawMsg.includes('billing') ||
        rawMsg.includes('quota');

      const friendlyMessage = isPaidKeyRequired
        ? 'Lyria AI Music Generation requires a billing-enabled Gemini API key in Settings > Secrets, or a connected NVIDIA CUDA MusicGen Worker (GPU_WORKER_URL).'
        : rawMsg;

      const job = await createRenderJobRecord({
        userId: req.dbUser.id,
        jobType: 'ai-music',
        title: title || 'Lyria AI Soundtrack',
        prompt,
        modelId: proMode ? 'lyria-3-pro-preview' : 'lyria-3-clip-preview',
        executionBackend: 'gemini-cloud',
        gpuTarget: 'DeepMind Lyria Cloud',
        resolution: 'Stereo MP3',
        format: 'MP3',
        durationSec: proMode ? 90 : 30,
        status: isPaidKeyRequired ? 'requires_paid_key' : 'failed',
        progress: 0,
        errorMessage: friendlyMessage,
      });

      return res.status(isPaidKeyRequired ? 402 : 502).json({
        error: friendlyMessage,
        code: isPaidKeyRequired ? 'PAID_KEY_REQUIRED' : 'UPSTREAM_ERROR',
        job,
      });
    }
  } catch (error: unknown) {
    console.error('Music generation error:', error);
    const msg =
      error instanceof Error ? error.message : 'Music generation failed.';
    res.status(500).json({ error: msg });
  }
});

// Log real Studio Compositor export into PostgreSQL History & Download Center
app.post('/api/jobs/studio-export', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.dbUser) return res.status(401).json({ error: 'Unauthorized' });
    const {
      title,
      prompt,
      resolution = '1080p',
      format = 'WEBM',
      durationSec = 10,
      projectId,
      outputMeta,
    } = req.body;

    const job = await createRenderJobRecord({
      userId: req.dbUser.id,
      projectId: projectId ? Number(projectId) : null,
      jobType: 'studio-export',
      title: title || 'NLE Studio Master Render',
      prompt: prompt || 'Multi-track timeline composite',
      modelId: 'vyro-studio-compositor',
      executionBackend: 'studio-compositor',
      gpuTarget: 'Browser WebCodecs / Canvas2D',
      resolution,
      format,
      durationSec: Number(durationSec) || 10,
      status: 'completed',
      progress: 100,
      outputMeta: outputMeta ?? { exportedAt: new Date().toISOString() },
      creditsCost: 0,
    });

    res.status(201).json({ job });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to log studio export';
    res.status(500).json({ error: msg });
  }
});

// Subscription management
app.post('/api/subscription/change', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.dbUser) return res.status(401).json({ error: 'Unauthorized' });
    const { plan } = req.body;
    if (!['starter', 'pro', 'studio', 'enterprise'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid subscription tier.' });
    }
    const result = await updateSubscriptionPlan(req.dbUser.id, plan);
    res.json(result);
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : 'Failed to update subscription.';
    res.status(500).json({ error: msg });
  }
});

// Admin Console endpoints
app.get('/api/admin/overview', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const overview = await getAdminOverview();
    res.json(overview);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Admin fetch failed';
    res.status(500).json({ error: msg });
  }
});

app.patch(
  '/api/admin/models/:id',
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const modelId = Number(req.params.id);
      const { enabled } = req.body;
      const updated = await toggleAiModelEnabled(modelId, Boolean(enabled));
      if (!updated) return res.status(404).json({ error: 'Model not found' });
      res.json({ model: updated });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Model update failed';
      res.status(500).json({ error: msg });
    }
  }
);

app.patch(
  '/api/admin/users/:id',
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const targetId = Number(req.params.id);
      const { role, plan, credits } = req.body;
      const updated = await updateUserRoleOrPlan(targetId, {
        ...(role ? { role } : {}),
        ...(plan ? { plan } : {}),
        ...(typeof credits === 'number' ? { credits } : {}),
      });
      if (!updated) return res.status(404).json({ error: 'User not found' });
      res.json({ user: updated });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'User update failed';
      res.status(500).json({ error: msg });
    }
  }
);

app.patch(
  '/api/admin/jobs/:id',
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const jobId = Number(req.params.id);
      const { status, progress, errorMessage } = req.body;
      const updated = await updateRenderJobStatus(jobId, {
        status,
        progress,
        errorMessage,
      });
      if (!updated) return res.status(404).json({ error: 'Job not found' });
      res.json({ job: updated });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Job update failed';
      res.status(500).json({ error: msg });
    }
  }
);

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VYRO AI STUDIO server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
