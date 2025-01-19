import * as textToSpeech from '@google-cloud/text-to-speech';
import dotenv from 'dotenv';
dotenv.config();  // Load environment variables

// אתחול הלקוח של Google Cloud TTS
const client = new textToSpeech.TextToSpeechClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS, // מיקום קובץ המפתחות שלך
});

// פונקציה להמיר טקסט לדיבור ולשלוח את האודיו כ-Buffer
export async function textToSpeechConvert(text: string): Promise<Buffer> {
  try {
    // הגדרת הבקשה ל-TTS
    const request = {
      input: { text: text }, // הטקסט שברצונך להמיר
      voice: { languageCode: 'he-IL', ssmlGender: textToSpeech.protos.google.cloud.texttospeech.v1.SsmlVoiceGender.NEUTRAL }, // עברית
      audioConfig: { audioEncoding: textToSpeech.protos.google.cloud.texttospeech.v1.AudioEncoding.MP3 }, // הגדרת פורמט ה-output כ-MP3
    };

    // שליחת הבקשה ל-Google TTS והמתנה לתשובה
    const [response] = await client.synthesizeSpeech(request);

    // אם התוכן הוא null או undefined, נזרוק שגיאה
    if (!response.audioContent) {
      throw new Error('הקלטת הדיבור לא הצליחה');
    }

    // המרת התוצאה ל-Buffer במקרה הצורך
    const audioBuffer = Buffer.isBuffer(response.audioContent)
      ? response.audioContent
      : Buffer.from(new Uint8Array(response.audioContent as ArrayBuffer));

    // מחזירים את האודיו כ-Buffer
    return audioBuffer;
  } catch (error) {
    console.error('שגיאה בהמרת טקסט לדיבור:', error);
    throw new Error('שגיאה בהמרת טקסט לדיבור');
  }
}
