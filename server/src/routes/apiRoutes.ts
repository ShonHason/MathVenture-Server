import express, { Request, Response } from "express";
import Recording from '../controllers/APIController/sttController';  // פונקציה לביצוע תמלול
import { textToSpeechConvert } from '../controllers/APIController/tssController';  // פונקציה להמרת טקסט לדיבור
const router = express.Router();

router.use(express.json());

// ה-Route שמאזין ל-POST בקשה ומבצע תמלול בזמן אמת
router.post('/speak', async (req: Request, res: Response) => {
  try {
    // מבצע את ההקלטה וההתמלול
    const transcript = await Recording();

    // מחזיר תשובה ללקוח עם התמלול
    res.status(200).json({
      message: 'תמלול הושלם בהצלחה',
      transcript: transcript,  // התמלול שנשמע מהמיקרופון
    });
  } catch (error) {
    // טיפול בשגיאה במקרה של כשלון
    console.error('שגיאה בביצוע התמלול:', error);
    res.status(500).json({ message: 'שגיאה בתמלול', error: error instanceof Error ? error.message : 'שגיאה לא ידועה' });
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