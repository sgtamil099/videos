import { GoogleGenAI, Type } from '@google/genai';

const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in server environment.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

export type AiDirectorProvider = 'gemini' | 'claude' | 'chatgpt';

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
}

async function callClaudeJson(system: string, userPrompt: string): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error(
      'Anthropic Claude selected, but ANTHROPIC_API_KEY is not configured in Settings > Secrets. Add ANTHROPIC_API_KEY or switch Director Engine to Google Gemini.'
    );
  }
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 4096,
      system,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || `Claude API error (${res.status})`);
  }
  const text = data?.content?.[0]?.text || '{}';
  const match = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/(\{[\s\S]*\})/);
  return match ? match[1] : text;
}

async function callChatGptJson(system: string, userPrompt: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error(
      'OpenAI ChatGPT selected, but OPENAI_API_KEY is not configured in Settings > Secrets. Add OPENAI_API_KEY or switch Director Engine to Google Gemini.'
    );
  }
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userPrompt },
      ],
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || `OpenAI API error (${res.status})`);
  }
  return data?.choices?.[0]?.message?.content || '{}';
}

export async function generateMultiSceneStoryboard(params: {
  concept: string;
  sceneCount: number;
  totalDurationSec?: number;
  visualStyle: string;
  aspectRatio: string;
  characterAnchor?: string;
  provider?: AiDirectorProvider;
}) {
  const targetTotalSec = Math.min(300, Math.max(10, params.totalDurationSec || 60));
  const systemMsg =
    'You are a lead cinematographer and virtual production supervisor for VYRO AI STUDIO. Return strict valid JSON only.';
  const userPrompt = `Create a ${params.sceneCount}-scene cinematic production storyboard totaling approximately ${targetTotalSec} seconds (up to 5 minutes).
Concept: ${params.concept}
Visual Style: ${params.visualStyle}
Aspect Ratio: ${params.aspectRatio}
${params.characterAnchor ? `Locked Character Consistency Anchor: ${params.characterAnchor}` : ''}

Return a JSON object with:
{
  "projectTitle": string,
  "logline": string,
  "scenes": [
    {
      "sceneNumber": number,
      "title": string,
      "durationSec": number,
      "cameraMovement": string,
      "lighting": string,
      "visualPrompt": string,
      "dialogue": string,
      "speaker": string,
      "audioCue": string,
      "colorGrade": string
    }
  ]
}
Ensure the sum of scene durationSec values adds up closely to ${targetTotalSec} seconds.`;

  if (params.provider === 'claude') {
    const raw = await callClaudeJson(systemMsg, userPrompt);
    return JSON.parse(raw) as {
      projectTitle: string;
      logline: string;
      scenes: StoryScene[];
    };
  }

  if (params.provider === 'chatgpt') {
    const raw = await callChatGptJson(systemMsg, userPrompt);
    return JSON.parse(raw) as {
      projectTitle: string;
      logline: string;
      scenes: StoryScene[];
    };
  }

  const ai = getAiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: userPrompt,
    config: {
      systemInstruction: systemMsg,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          projectTitle: { type: Type.STRING },
          logline: { type: Type.STRING },
          scenes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                sceneNumber: { type: Type.INTEGER },
                title: { type: Type.STRING },
                durationSec: { type: Type.INTEGER },
                cameraMovement: { type: Type.STRING },
                lighting: { type: Type.STRING },
                visualPrompt: { type: Type.STRING },
                dialogue: { type: Type.STRING },
                speaker: { type: Type.STRING },
                audioCue: { type: Type.STRING },
                colorGrade: { type: Type.STRING },
              },
            },
          },
        },
      },
    },
  });

  const raw = (response.text ?? '{}').trim();
  return JSON.parse(raw) as {
    projectTitle: string;
    logline: string;
    scenes: StoryScene[];
  };
}

export async function enhanceCinematicPrompt(params: {
  prompt: string;
  mode: string;
  cameraLens: string;
  characterAnchor?: string;
  provider?: AiDirectorProvider;
}) {
  const systemMsg =
    'You are an AI video prompt engineer. Return strict JSON with keys "enhancedPrompt" and "negativePrompt".';
  const userPrompt = `Enhance this ${params.mode} prompt for cinematic AI video generation.
Raw Prompt: ${params.prompt}
Preferred Lens / Camera: ${params.cameraLens}
${params.characterAnchor ? `Character Anchor to preserve: ${params.characterAnchor}` : ''}

Return a JSON object with enhancedPrompt (single cohesive paragraph with lighting, motion physics, lens, and atmosphere) and negativePrompt.`;

  if (params.provider === 'claude') {
    const raw = await callClaudeJson(systemMsg, userPrompt);
    return JSON.parse(raw) as { enhancedPrompt: string; negativePrompt: string };
  }

  if (params.provider === 'chatgpt') {
    const raw = await callChatGptJson(systemMsg, userPrompt);
    return JSON.parse(raw) as { enhancedPrompt: string; negativePrompt: string };
  }

  const ai = getAiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: userPrompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          enhancedPrompt: { type: Type.STRING },
          negativePrompt: { type: Type.STRING },
        },
      },
    },
  });

  return JSON.parse((response.text ?? '{}').trim()) as {
    enhancedPrompt: string;
    negativePrompt: string;
  };
}

export async function generateSpeechWav(params: {
  mode: 'single' | 'dual';
  text: string;
  voiceName: string;
  styleDirection: string;
  secondSpeakerName?: string;
  secondVoiceName?: string;
  secondSpeakerText?: string;
  secondSpeakerStyle?: string;
}) {
  const ai = getAiClient();

  if (params.mode === 'dual' && params.secondSpeakerText) {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Speaker 1: ${params.text}`,
              speechMetadata: {
                speaker: 'Speaker 1',
                style: params.styleDirection || 'Cinematic, expressive',
              },
            },
            {
              text: `${params.secondSpeakerName || 'Speaker 2'}: ${params.secondSpeakerText}`,
              speechMetadata: {
                speaker: params.secondSpeakerName || 'Speaker 2',
                style: params.secondSpeakerStyle || 'Articulate, balanced',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              {
                speaker: 'Speaker 1',
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: params.voiceName || 'Kore' },
                },
              },
              {
                speaker: params.secondSpeakerName || 'Speaker 2',
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: params.secondVoiceName || 'Puck',
                  },
                },
              },
            ],
          },
        },
      },
    });

    const base64Audio =
      response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error('TTS model returned no audio data.');
    }
    return {
      mimeType: 'audio/wav',
      base64Audio,
      modelUsed: 'gemini-3.8-flash-tts',
    };
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash-lite-tts',
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: params.text,
            speechMetadata: {
              style: params.styleDirection || 'Cinematic narrator, crisp studio mic',
            },
          },
        ],
      },
    ],
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: params.voiceName || 'Kore' },
        },
      },
    },
  });

  const base64Audio =
    response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) {
    throw new Error('TTS model returned no audio data.');
  }

  return {
    mimeType: 'audio/wav',
    base64Audio,
    modelUsed: 'gemini-3.8-flash-lite-tts',
  };
}

export async function generateLipSyncTimeline(params: {
  dialogue: string;
  durationSec: number;
  fps: number;
  emotion: string;
}) {
  const ai = getAiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: `Generate a synchronized lip-sync viseme animation track for this spoken dialogue.
Dialogue: "${params.dialogue}"
Total Duration: ${params.durationSec} seconds
Frame Rate: ${params.fps} fps
Emotion / Performance: ${params.emotion}

Use standard Preston Blair / ARKit viseme codes: REST, MBP, AA, EE, OO, FV, TH, L.
Provide chronological keyframes covering 0.0s to ${params.durationSec}s with mouthOpen (0.0 to 1.0), lipRound (0.0 to 1.0), and headTiltDeg (-8 to 8).`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          phonemeSummary: { type: Type.STRING },
          keyframes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                timeSec: { type: Type.NUMBER },
                viseme: { type: Type.STRING },
                mouthOpen: { type: Type.NUMBER },
                lipRound: { type: Type.NUMBER },
                headTiltDeg: { type: Type.NUMBER },
                syllable: { type: Type.STRING },
              },
            },
          },
        },
      },
    },
  });

  return JSON.parse((response.text ?? '{}').trim()) as {
    phonemeSummary: string;
    keyframes: Array<{
      timeSec: number;
      viseme: string;
      mouthOpen: number;
      lipRound: number;
      headTiltDeg: number;
      syllable: string;
    }>;
  };
}

export async function dispatchCloudVideoGeneration(params: {
  prompt: string;
  aspectRatio: '16:9' | '9:16';
  durationSec: number;
  resolution: '360p' | '720p' | '1080p' | '4k';
  imageBase64?: string;
  imageMimeType?: string;
}) {
  const ai = getAiClient();
  const dur = Math.min(15, Math.max(3, Math.round(params.durationSec)));
  const inputPayload = params.imageBase64
    ? [
        {
          type: 'image' as const,
          mime_type: params.imageMimeType || 'image/png',
          data: params.imageBase64,
        },
        {
          type: 'text' as const,
          text: params.prompt,
        },
      ]
    : params.prompt;

  const interaction = await ai.interactions.create(
    {
      model: 'gemini-omni-1.2-flash',
      input: inputPayload,
      background: false,
      store: false,
      stream: false,
      response_format: {
        type: 'video',
        aspect_ratio: params.aspectRatio,
        duration: `${dur}s`,
        resolution: params.resolution,
      },
    },
    { timeout: 300000 }
  );

  const videoPart = interaction.output_video;
  if (!videoPart?.data && !videoPart?.uri) {
    throw new Error('Video generation completed without a video payload.');
  }

  return {
    mimeType: videoPart.mime_type || 'video/mp4',
    base64Video: videoPart.data || null,
    uri: videoPart.uri || null,
    modelUsed: 'gemini-omni-1.2-flash',
  };
}

export async function dispatchCloudMusicGeneration(params: {
  prompt: string;
  proMode: boolean;
}) {
  const ai = getAiClient();
  const model = params.proMode ? 'lyria-3-pro-preview' : 'lyria-3-clip-preview';
  const response = await ai.models.generateContentStream({
    model,
    contents: params.prompt,
  });

  const audioChunks: Buffer[] = [];
  let lyrics = '';
  let mimeType = 'audio/mpeg';

  for await (const chunk of response) {
    const parts = chunk.candidates?.[0]?.content?.parts;
    if (!parts) continue;
    for (const part of parts) {
      if (part.inlineData?.data) {
        if (audioChunks.length === 0 && part.inlineData.mimeType) {
          mimeType = part.inlineData.mimeType;
        }
        audioChunks.push(Buffer.from(part.inlineData.data, 'base64'));
      }
      if (part.text) {
        lyrics += part.text;
      }
    }
  }

  if (audioChunks.length === 0) {
    throw new Error('Lyria returned no audio stream.');
  }

  return {
    mimeType,
    base64Audio: Buffer.concat(audioChunks).toString('base64'),
    lyrics,
    modelUsed: model,
  };
}
