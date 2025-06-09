// src/routes/apiRoutes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { askQuestion } from '../controllers/geminiApi';
import ttsRouter from '../controllers/APIController/ttsController';
import { ImageAnnotatorClient } from '@google-cloud/vision';

const router = Router();

// 1) Chat endpoint
router.post(
  '/chat',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { question, context, lessonId } = req.body;
      console.log('Received question:', question);
      console.log('Context:', context);
      console.log('Lesson ID:', lessonId);

      const answer = await askQuestion(question, context, lessonId);
      res.json({ answer });
    } catch (error) {
      console.error('Error processing chat request:', error);
      next(error);
    }
  }
);

// 2) Mount the TTS router at /tts
router.use('/tts', ttsRouter);

const client = new ImageAnnotatorClient();
const MATH_WHITELIST_REGEX = /[\u0590-\u05FF0-9+\-×÷*/=^()[\]{}.,\s]/g;
router.post('/scanMath', async (req, res) => {
  try {
    // בצע בקליינט: JSON.stringify({ image: base64WithoutPrefix })
    const base64 = req.body.image;
    const buffer = Buffer.from(base64, 'base64');

    const [result] = await client.documentTextDetection({
      image: { content: buffer },
      imageContext: { languageHints: ['he'] }
    });

    const raw = result.fullTextAnnotation?.text || '';
    const filtered = (raw.match(MATH_WHITELIST_REGEX) || [])
      .join('')
      .trim();

    res.json({ text: filtered });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err });
  }
});
export default router;
