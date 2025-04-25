// src/routes/apiRoutes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { askQuestion } from '../controllers/openAiApi';
import ttsRouter from '../controllers/APIController/ttsController';

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

export default router;
