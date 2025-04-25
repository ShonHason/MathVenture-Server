import { Router, Request, Response, NextFunction } from 'express';
import * as textToSpeech from '@google-cloud/text-to-speech';
import fs from 'fs';
import path from 'path';

// 1) Quick sanity check: make sure credentials file exists
const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS!;
if (!fs.existsSync(credsPath)) {
  console.error('❌ TTS creds not found at', credsPath);
  throw new Error(`Missing TTS creds file: ${credsPath}`);
}
console.log('✅ TTS credentials loaded from:', credsPath);

// 2) Create and warm up the TTS client once
const client = new textToSpeech.TextToSpeechClient();
(async () => {
  console.log('⏳ Warming up TTS client...');
  await client.synthesizeSpeech({
    input: { text: ' ' },
    voice: {
      languageCode: 'en-US',
      ssmlGender: textToSpeech.protos.google.cloud.texttospeech.v1.SsmlVoiceGender.NEUTRAL,
    },
    audioConfig: {
      audioEncoding: textToSpeech.protos.google.cloud.texttospeech.v1.AudioEncoding.MP3,
    },
  });
  console.log('✅ TTS client warmed up');
})();

// 3) Build the router
const router = Router();

/**
 * POST /api/tts
 * Body: { text: string }
 * Returns: audio/mpeg
 */
router.post(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { text } = req.body;
    if (typeof text !== 'string' || !text.trim()) {
      res.status(400).json({ error: 'Missing "text" in request body' });
      return;
    }

    console.log('🔊 TTS request:', text.slice(0, 30));

    try {
      // 4) Prepare SSML for a natural Hebrew WaveNet voice
      const ssml = `
        <speak>
          <prosody rate="0.95">
            ${text}
          </prosody>
        </speak>
      `;

      const [response] = await client.synthesizeSpeech({
        input: { ssml },
        voice: {
          languageCode: 'he-IL',
          name: 'he-IL-Wavenet-D',
          ssmlGender: textToSpeech.protos.google.cloud.texttospeech.v1.SsmlVoiceGender.FEMALE,
        },
        audioConfig: {
          audioEncoding: textToSpeech.protos.google.cloud.texttospeech.v1.AudioEncoding.MP3,
          speakingRate: 0.95,
        },
      });

      if (!response.audioContent) {
        throw new Error('Empty audioContent');
      }

      // 5) Stream the MP3 back
      res.setHeader('Content-Type', 'audio/mpeg');
      res.send(Buffer.from(response.audioContent as Uint8Array));
    } catch (err) {
      console.error('❌ Error in /api/tts:', err);
      next(err);
    }
  }
);
export async function textToSpeechConvert(text: string): Promise<Buffer> {
  // Wrap your text in SSML for prosody control
  const ssml = `<speak><prosody rate="0.95">${text}</prosody></speak>`;

  const [response] = await client.synthesizeSpeech({
    input:    { ssml },
    voice:    {
      languageCode: 'he-IL',
      name:         'he-IL-Wavenet-D',
      ssmlGender:   textToSpeech.protos.google.cloud.texttospeech.v1.SsmlVoiceGender.FEMALE,
    },
    audioConfig: {
      audioEncoding: textToSpeech.protos.google.cloud.texttospeech.v1.AudioEncoding.MP3,
      speakingRate:  0.95,
    },
  });

  if (!response.audioContent) {
    throw new Error('Empty audioContent from TTS');
  }

  return Buffer.from(response.audioContent as Uint8Array);
}

export default router;
