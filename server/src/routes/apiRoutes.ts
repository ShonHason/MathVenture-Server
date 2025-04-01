import { Router, Request, Response } from 'express';
import { askQuestion } from '../controllers/openAiApi';
import { textToSpeechConvert } from '../controllers/APIController/ttsController';

const router = Router();

router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { question, context } = req.body;
    console.log('Received question:', question);
    console.log('Context:', context);

    const answer = await askQuestion(question, context);
    res.json({ answer });
  } catch (error) {
    console.error('Error processing chat request:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ה-Route להמרת טקסט לדיבור
router.post('/tts', async (req: Request, res: Response) => {
  try {
    const { text } = req.body; // קבלת הטקסט מהלקוח

    // המרת הטקסט לדיבור
    const audioBuffer = await textToSpeechConvert(text);

    // מחזירים את ה-audioBuffer כקובץ MP3 ללקוח
    res.set('Content-Type', 'audio/mp3');
    res.send(audioBuffer); // שולחים את האודיו כ-Buffer
  } catch (error) {
    console.error('שגיאה בהמרת טקסט לדיבור:', error);
    res.status(500).json({ error: 'שגיאה בתהליך המרת הטקסט לדיבור' });
  }
});

export default router;
