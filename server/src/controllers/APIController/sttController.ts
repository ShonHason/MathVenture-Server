import { SpeechClient } from '@google-cloud/speech';
import { Readable } from 'stream';
import dotenv from 'dotenv';

import MicrophoneStream from 'microphone-stream';
dotenv.config();  // Load environment variables

// אתחול של Google Cloud Speech Client
const client = new SpeechClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS  // מיקום קובץ המפתח
});

// משתנה לשמירת הזמן האחרון של דיבור
let lastSpeechTime: number | null = null;
let silenceTimer: NodeJS.Timeout | null = null;

// פונקציה להמיר אודיו לטקסט
const speakStream = (audioStream: Readable): Promise<string> => {
  return new Promise((resolve, reject) => {
    const request = {
      config: {
        encoding: 'LINEAR16' as const,  // פורמט האודיו
        sampleRateHertz: 16000, // קצב הדגימה
        languageCode: 'he-IL',  // עברית
      },
      interimResults: false, // לא לקבל תוצאות ביניים
    };

    // יצירת סטרים למענה מה-API
    const recognizeStream = client.streamingRecognize(request)
      .on('data', (data) => {
        // כל פעם שמתקבלת תשובה עם דיבור, אנחנו מעדכנים את הזמן
        lastSpeechTime = Date.now();
        
        // התגובה המתקבלת מהממשק בזמן אמת
        const transcript = data.results
          .map((result: { alternatives: { transcript: string }[] }) => result.alternatives[0].transcript)
          .join('\n');
        console.log(`תמלול סופי: ${transcript}`);

        // סיום התמלול
        resolve(transcript);
      })
      .on('error', (error) => {
        reject(error);  // טיפול בשגיאה
      })
      .on('end', () => {
        console.log('סיים את התמלול');
      });

    // חיבור הסטרים של האודיו לסטרים של ה-API
    audioStream.pipe(recognizeStream);
  });
};

// מתחילים את ההקלטה מהמיקרופון
const Recording = async (): Promise<string> => {
  const micStream = new MicrophoneStream(); // יצירת סטרים מהמיקרופון

  return new Promise<string>((resolve, reject) => {
    // פתח את המיקרופון
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        micStream.setStream(stream);  // חיבור סטרים למיקרופון

        // יצירת סטרים מותאם אישית
        const audioStream = new Readable({
          read() {
            const buffer = micStream._read();  // קרא נתונים מהמיקרופון
            if (buffer !== null) {
              this.push(buffer);  // שלח את המידע שהתקבל
            } else {
              this.push(null);  // אין יותר מידע, סיים את הזרם
            }
          }
        });

        // התחלת ההקלטה
        console.log('ההקלטה התחילה');

        // לולאת בדיקה שהשקט לא ארוך מדי
        silenceTimer = setInterval(() => {
          if (lastSpeechTime && Date.now() - lastSpeechTime > 2000) {
            // אם עברו יותר מ-2 שניות מאז הדיבור האחרון, נסיים את ההקלטה
            micStream.stop();
            if (silenceTimer) {
              clearInterval(silenceTimer);
            }
            speakStream(audioStream).then(resolve).catch(reject);
          }
        }, 1000); // בודק כל שניה
      })
      .catch((err) => {
        reject(err);  // טיפול בשגיאה במקרה של כשלון בהקלטה
      });
  });
};



export default Recording;