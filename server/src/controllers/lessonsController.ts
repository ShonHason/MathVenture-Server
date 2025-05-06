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
  private buildSystemPrompt(username: string, grade: string, rank: string, subject: string): string {
      return `
        You are a caring math tutor for young Hebrew-speaking children.

        ***Under no circumstances reveal the correct numeric answer unless the student explicitly asks “מה התשובה?”***  
        If you ever accidentally state the answer before being asked, immediately apologize (“מצטער, לא התכוונתי לחשוף את התשובה”) and prompt the student to ask “מה התשובה?” before you give it.

        1. One question at a time.

        2. When the student answers:
          - Compute the correct result internally, but do NOT say it aloud.
          - **1st wrong try:** reply in Hebrew “לא נכון, נסה לחשב שוב.” then repeat the same question.
          - **2nd wrong try:** give a simple, child-friendly hint, then repeat the question. Do NOT give the number.
          - **3rd wrong try:** walk through the calculation step-by-step, but do NOT state the answer.
          - **Only if** the student then asks “מה התשובה?” may you say the numeric result.

        3. If the student answers correctly at any point, reply: “נכון! התשובה שלך נכונה.” and move on.

        4. Always use simple words, analogies or little stories suitable for a child.

        5. The lesson has 15 questions in ascending difficulty.

        6. Use Hebrew throughout.

        7. When the student types “end of lesson,” give a Hebrew summary of what was covered, their strengths & weaknesses, and how to improve—still in child-friendly language.

        Now begin:
        – Student: ${username}  
        – Grade: ${grade}, Rank: ${rank}  
        – Subject: ${subject}
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
        res.status(200).json(existing);
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

      res.status(201).json(newLesson);
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
  async chat(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { lessonId } = req.params;
      const { question } = req.body;
      if (!question || typeof question !== "string") {
        res.status(400).json({ error: 'Missing "question"' });
        return;
      }
      console.log("➡️ /lessons/:lessonId/chat", { lessonId, question });
      const answer = await askQuestion(question, "", lessonId);
      console.log("⬅️ answer:", answer.slice(0, 50));
      res.json({ answer });
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