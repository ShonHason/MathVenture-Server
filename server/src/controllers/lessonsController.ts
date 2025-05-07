import lessonsModel, { ILesson } from "../modules/lessonsModel";
import  { Request, Response, NextFunction } from "express";
import { BaseController } from "./baseController";
import mongoose from "mongoose";
import { askQuestion } from "./openAiApi";
import { textToSpeechConvert } from "./APIController/ttsController";

class LessonsController extends BaseController<ILesson> {
  constructor() {
    super(lessonsModel);
  }
  private sanitizeSubject(raw: string): string {
    let subject = raw.trim();
    // אם עטוף במרכאות כפולות – מסיר אותן
    if (/^".*"$/.test(subject)) {
      subject = subject.slice(1, -1);
    }
    return subject;
  }

  /**
   * בונה את ה-system prompt על פי הפרמטרים
   */
  private buildSystemPrompt(
    username: string,
    grade: string,
    rank: string,
    subject: string
  ): string {
    return `
  You are a caring, patient math tutor for young Hebrew-speaking children. Use simple words, gentle encouragement, and a warm tone with emojis when appropriate.
  
  👋 **Greeting**  
  As soon as the lesson begins, say:  
  "שלום ${username}!
   נעים מאוד לראות אותך היום אלוף
    בוא נתחיל בשיעור במתמטיקה בנושא ${subject}."
  
  📚 **Lesson structure**  
  - The lesson has 15 questions in ascending difficulty.  
  - Each new question must have a **different numeric answer** than any previous question this session.  
  - Always ask in the format: “כמה זה <expression>?”.
  
  🔢 **Exact numeric evaluation**  
  - When the student replies with a number (e.g. “30” or “שלושים”), parse it exactly and compare it to the correct result of **that question**.  
    - If correct, respond **only**: “תמשיך ככה,נכון! התשובה שלך נכונה ”  
    - Never say “לא נכון” for a numerically correct answer.
  
  📝 **Handling wrong attempts**  
  - **1st wrong try:** “לא נכון, נסה לחשב שוב.” then repeat **exactly** the same “כמה זה <expression>?”.  
  - **2nd wrong try:** give a simple hint (“זכור לחבר 3 + 2 קודם”). Then repeat “כמה זה <expression>?”.  
  - **3rd wrong try:** walk through the steps (“נחבר 3 ל־2…”) but don’t state the answer. Then repeat “כמה זה <expression>?”.  
  - Only if the student asks “מה התשובה?” may you finally say the numeric result.
  
  🔔 **Moving on**  
  - After a correct answer, give cheerful feedback (“יופי! עכשיו לשאלה הבאה”) and immediately ask the next “כמה זה <new expression>?”.
  
  🚩 **End of lesson**  
  If the student types “end of lesson,” give a child-friendly Hebrew summary of what was covered, their strengths & weaknesses, and tips for improvement.
  
  Use Hebrew throughout, and keep everything playful and encouraging.  
    `.trim();
  }
  
  

  /**
   * POST /lessons/startNew
   */
  public startLesson = async (req: Request, res: Response): Promise<void> => {
    try {
      const { lessonId } = req.params as { lessonId?: string };
      const { userId, subject: rawSubject, username, grade, rank } = req.body;

      // המשך שיעור קיים
      if (lessonId) {
        if (!mongoose.Types.ObjectId.isValid(lessonId)) {
          res.status(400).send("Invalid lessonId");
          return;
        }
        const existing = await lessonsModel.findById(lessonId);
        if (!existing) {
          res.status(404).send("Lesson not found");
          return;
        }
        res.status(200).json({
          _id: existing._id,
          mathQuestionsCount: existing.mathQuestionsCount,
          
        });
        return;
      }

      // יצירת שיעור חדש
      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        res.status(400).send("Invalid or missing userId");
        return;
      }
      if (!rawSubject || typeof rawSubject !== "string") {
        res.status(400).send("Missing or invalid subject");
        return;
      }

      // ניקוי ה־subject
      const subject = this.sanitizeSubject(rawSubject);
      // בונה system prompt
      const systemPrompt = this.buildSystemPrompt(
        username,
        grade,
        rank,
        subject
      );

      const newLesson = await lessonsModel.create({
        userId,
        startTime: new Date(),
        endTime: null,
        progress: "NOT_STARTED",
        subject,
        messages: [{ role: "system", content: systemPrompt }],
      });

      res.status(201).json({
        _id: newLesson._id,
        mathQuestionsCount: newLesson.mathQuestionsCount,
      });
    } catch (err) {
      console.error("Error in startLesson:", err);
      res.status(500).send("Internal Server Error");
    }
  };

  /**
 * GET /lessons/:lessonId/session
 * Returns the full conversation history for this lesson.
 */
async getSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { lessonId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(lessonId)) {
      res.status(400).json({ error: "Invalid lessonId" });
      return;
    }

    const lesson = await lessonsModel.findById(lessonId);
    if (!lesson) {
      res.status(404).json({ error: "Lesson not found" });
      return;
    }

    // Send back the messages array
    res.json({ messages: lesson.messages });
  } catch (err) {
    console.error("❌ /lessons/:lessonId/session error:", err);
    next(err);
  }
}

  /**
   * Retrieve lessons by userId
   */
  async getLessonsByUserId(req: Request, res: Response): Promise<void> {
    const userId = req.params.userId;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).send("Bad Request");
      return;
    }
    try {
      const docs = await this.model.find({ userId });
      if (docs.length === 0) {
        res.status(404).send("No data found");
        return;
      }
      res.status(200).json(docs);
    } catch (err) {
      res.status(400).send(err);
    }
  }

  /**
   * Update the end time of a lesson
   */
  async updateEndTime(req: Request, res: Response): Promise<void> {
    const askedId = req.params._id;
    const endTime = req.body.endTime;
    if (!askedId || !endTime) {
      res.status(400).send("Bad Request");
      return;
    }
    try {
      const doc = await this.model.findByIdAndUpdate(
        askedId,
        { endTime },
        { new: true, runValidators: true }
      );
      if (!doc) {
        res.status(400).send("Bad Request");
        return;
      }
      res.status(200).json(doc);
    } catch (err) {
      res.status(400).send(err);
    }
  }

  /**
   * Chat endpoint: send question to OpenAI and return answer
   */
 // inside LessonsController
 // src/controllers/lessonsController.ts
async chat(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { lessonId } = req.params;
    const { question } = req.body;
    if (!question || typeof question !== "string") {
       res.status(400).json({ error: 'Missing "question"' });
       return
    }

    // 1) Ask the AI (might return a JSON-string for the done:true case)
    const raw = await askQuestion(question, "", lessonId);

    // 2) If it's the "done" payload, return it immediately
    if (raw.trim().startsWith("{")) {
      try {
        const donePayload = JSON.parse(raw);
        if (donePayload.done) {
           res.json(donePayload);
           return
        }
      } catch {
        // not a done‐payload, fall through
      }
    }

    // 3) Normal answer
    const answer = raw;

    // 4) Look up the updated counter
    const lesson = await lessonsModel.findById(lessonId);
    const mathQuestionsCount = lesson?.mathQuestionsCount ?? 0;

    // 5) Send both the answer text and the fresh count
    res.json({ answer, mathQuestionsCount });
  } catch (err) {
    console.error("❌ /lessons/:lessonId/chat error:", err);
    next(err);
  }
}



  

  /**
   * TTS endpoint: convert text to speech and stream MP3
   */
  async tts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { text } = req.body;
      if (!text || typeof text !== "string") {
        res.status(400).json({ error: 'Missing "text"' });
        return;
      }
      console.log("➡️ /lessons/:lessonId/tts", { text: text.slice(0, 30) });
      const audioBuffer = await textToSpeechConvert(text);
      res.setHeader("Content-Type", "audio/mpeg");
      res.send(audioBuffer);
    } catch (err) {
      console.error("❌ /lessons/:lessonId/tts error:", err);
      next(err);
    }
  }
}

export default new LessonsController();