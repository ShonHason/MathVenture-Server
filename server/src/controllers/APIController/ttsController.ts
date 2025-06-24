import { Router, Request, Response, NextFunction } from 'express';
import * as textToSpeech from '@google-cloud/text-to-speech';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
// 1) Resolve and validate credentials path


const googleCreds = process.env.GOOGLE_APPLICATION_CREDENTIALS ?? "" ;

// 2) Create and warm up the TTS client once
const client = new textToSpeech.TextToSpeechClient();

(async () => {
  try {
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
  } catch (err) {
    console.error('❌ Failed to warm up TTS client:', err);
  }
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
      const ssml = `<speak><prosody rate="0.95">${text}</prosody></speak>`;

      const [response] = await client.synthesizeSpeech({
        input: { ssml },
        voice: {
          languageCode: 'he-IL',
          name: 'he-IL-Wavenet-B',
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

      res.setHeader('Content-Type', 'audio/mpeg');
      res.send(Buffer.from(response.audioContent as Uint8Array));
    } catch (err) {
      console.error('❌ Error in /api/tts:', err);
      next(err);
    }
  }
);

// Exported utility function
export async function textToSpeechConvert(text: string): Promise<Buffer> {
  const ssml = `<speak><prosody rate="0.95">${text}</prosody></speak>`;

  const [response] = await client.synthesizeSpeech({
    input: { ssml },
    voice: {
      languageCode: 'he-IL',
      name: 'he-IL-Wavenet-B',
      ssmlGender: textToSpeech.protos.google.cloud.texttospeech.v1.SsmlVoiceGender.FEMALE,
    },
    audioConfig: {
      audioEncoding: textToSpeech.protos.google.cloud.texttospeech.v1.AudioEncoding.MP3,
      speakingRate: 0.95,
    },
  });

  if (!response.audioContent) {
    throw new Error('Empty audioContent from TTS');
  }

  return Buffer.from(response.audioContent as Uint8Array);
}

export default router;
