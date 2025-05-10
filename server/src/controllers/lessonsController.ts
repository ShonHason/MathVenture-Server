import lessonsModel, { ILesson } from "../modules/lessonsModel";
import  { Request, Response, NextFunction } from "express";
import { BaseController } from "./baseController";
import mongoose from "mongoose";
import { askQuestion } from "./openAiApi";
import { textToSpeechConvert } from "./APIController/ttsController";
import sgMail from "@sendgrid/mail";
import UserModel from "../modules/userModel";
import { progressType } from "../modules/enum/progress";


sgMail.setApiKey(process.env.SENDGRID_API_KEY || "");

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
    subject: string,
     gender: "female" | "male",
  ):  string {
    const champion = gender === "female" ? "אלופה" : "אלוף";
    const continueText = gender === "female"
      ? "תמשיכי ככה, נכון! התשובה שלך נכונה"
      : "תמשיך ככה, נכון! התשובה שלך נכונה";
    const startWord = gender === "female" ? "בואי" : "בוא";

    return `
You are a caring, patient math tutor for young Hebrew-speaking children. Use simple words, gentle encouragement, and a warm tone when appropriate.

Greeting:
As soon as the lesson begins, say:
"שלום ${username}!
נעים מאוד לראות אותך היום ${champion}.
${startWord} נתחיל בשיעור מתמטיקה בנושא ${subject}."

Lesson structure:
- The lesson has 15 questions in ascending difficulty.
- Each new question must have a different numeric answer than any previous question this session.

Operator guidance:
- "*": כפול
- "+": פלוס
- "-": פחות
- "/": לחלק

Exact numeric evaluation:
- When the student replies with a number (e.g. "30" or "שלושים"), parse it exactly and compare it to the correct result of that question.
  - If correct, respond only: "${continueText}"
  - Never say "לא נכון" for a numerically correct answer.

Handling wrong attempts:
- 1st wrong try: "לא נכון, נסה לחשב שוב." then repeat exactly the same "כמה זה <expression>?".
- 2nd wrong try: give a simple hint ("זכור לחבר 3 + 2 קודם"). Then repeat "כמה זה <expression>?".
- 3rd wrong try: walk through the steps ("נחבר 3 ל־2..."), then repeat "כמה זה <expression>?".
- Only if the student asks "מה התשובה?" may you finally say the numeric result.

Moving on:
- After a correct answer, give cheerful feedback ("יופי! עכשיו לשאלה הבאה") and immediately ask the next "כמה זה <new expression>?".

End of lesson:
If the student types "end of lesson", give a child-friendly Hebrew summary of what was covered, their strengths & weaknesses, and tips for improvement.

Use Hebrew throughout, and keep everything playful and encouraging.
`.trim();
  }
  
  public reportLesson = async (req: Request, res: Response): Promise<void> => {
    const { lessonId } = req.params 
    try{
      if(!mongoose.Types.ObjectId.isValid(lessonId)){
        res.status(400).send("Invalid lessonId");
        return;
      }
      const lesson = await lessonsModel.findById(lessonId);
      if(!lesson){
        res.status(404).send("Lesson not found");
        return;
      }
      const user = await UserModel.findById(lesson.userId).lean();
      if(!user){
        res.status(404).send("User not found");
        return;
      }
      const toEmail = user.parent_email;
      if(!toEmail){
        res.status(404).send("User has no parent email");
        return;
      }
      const msg = {
        to: toEmail,
        from: "mathventurebot@gmail.com",
        subject: `MathVenture - Lesson Report for ${lesson.subject}`,
        text: `Hello ${user.parent_name},\n\nHere is the report for your child's lesson on ${lesson.subject}.\n\nLesson ID: ${lesson._id}\nStart Time: ${lesson.startTime}\nEnd Time: ${lesson.endTime}\nProgress: ${lesson.progress}\n\nBest regards,\nMathVenture Team`,
        html: `<p>Hello ${user.parent_name},</p><p>Here is the report for your child's lesson on ${lesson.subject}.</p><p>Lesson ID: ${lesson._id}</p><p>Start Time: ${lesson.startTime}</p><p>End Time: ${lesson.endTime}</p><p>Progress: ${lesson.progress}</p><br><p>Best regards,</p><p>MathVenture Team</p>`  
      };
      await sgMail.send(msg);
      res.status(200).send("Email sent successfully");
        
      }

    catch(err){
      console.error("Error in reportLesson:", err);
      res.status(500).send("Internal Server Error");
    }
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
       const user = await UserModel.findById(userId).lean();
    if (!user) {
      res.status(404).send("User not found");
      return;
    }
    const gender = user.gender || "male";
      // ניקוי ה־subject
      const subject = this.sanitizeSubject(rawSubject);
      // בונה system prompt
      const systemPrompt = this.buildSystemPrompt(
        username,
        grade,
        rank,
        subject,
        gender
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
  const { lessonId } = req.params;
  const { question } = req.body;

  try {
    // 1) Ask the AI
    const raw = await askQuestion(question, "", lessonId);

    // 2) Handle done‐payload
    if (raw.trim().startsWith("{")) {
      try {
        const donePayload = JSON.parse(raw);
        if (donePayload.done) {
          // — a) Mark lesson DONE & set endTime
          const lesson = await lessonsModel.findByIdAndUpdate(
            lessonId,
            {
              progress: progressType.DONE,
              endTime: new Date(),
            },
            { new: true }
          );
          if (!lesson) {
            res.status(404).json({ error: "השיעור לא נמצא" });
            return;
          }

          // — b) Lookup user & pick parent_email
          const user = await UserModel.findById(lesson.userId).lean();
          const toEmail = user?.parent_email || user?.email;
          if (toEmail) {
            // — c) Send summary email
            await sgMail.send({
              to: toEmail,
              from: "mathventurebot@gmail.com",
              subject: `סיכום שיעור: ${lesson.subject}`,
              text: `שלום,

השיעור בנושא "${lesson.subject}" הושלם בהצלחה!
חוזקות: ${donePayload.strengths || "–"}
נקודות לשיפור: ${donePayload.weaknesses || "–"}
טיפים: ${donePayload.tips || "–"}

בהצלחה בשיעורים הבאים!`,
              html: `<p>שלום,</p>
                     <p>השיעור בנושא "<strong>${lesson.subject}</strong>" הושלם בהצלחה!</p>
                     <ul>
                       <li><strong>חוזקות:</strong> ${donePayload.strengths || "–"}</li>
                       <li><strong>נקודות לשיפור:</strong> ${donePayload.weaknesses || "–"}</li>
                       <li><strong>טיפים:</strong> ${donePayload.tips || "–"}</li>
                     </ul>
                     <p>בהצלחה בשיעורים הבאים!</p>`,
            });
          }

          // — d) Return the payload so the frontend sees { done: true, … }
          res.json(donePayload);
          return;
        }
      } catch {
        // not valid JSON, fall through to normal answer
      }
    }

    // 3) Normal Q&A flow
    const answer = raw;
    const lesson = await lessonsModel.findById(lessonId);
    const mathQuestionsCount = lesson?.mathQuestionsCount ?? 0;
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