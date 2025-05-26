import lessonsModel, { ILesson } from "../modules/lessonsModel";
import { Request, Response, NextFunction } from "express";
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
    if (/^".*"$/.test(subject)) {
      subject = subject.slice(1, -1);
    }
    return subject;
  }

  private buildSystemPrompt(
    username: string,
    grade: string,
    rank: string,
    subject: string,
    gender: "female" | "male",
    sampleQuestions: string[]
  ): string {
    const champion = gender === "female" ? "אלופה" : "אלוף";
    const continueText = gender === "female"
      ? "תמשיכי כך, נכון! התשובתך נכונה"
      : "תמשיך כך, נכון! התשובתך נכונה";
    const startVerb = gender === "female" ? "בואי" : "בוא";
    const readyWord = gender === "female" ? "מוכנה" : "מוכן";
  
    const formattedSamples = sampleQuestions.map(q => `- ${q}`).join("\n");
  
    return `
  You are a playful, creative, and warm-hearted math tutor for young Hebrew-speaking children.
  Address the student consistently using the correct feminine or masculine Hebrew forms based on their gender.
  
  🟣 Important instructions:
  - Under no circumstances include JSON, code snippets, or structured objects in your responses.
  - Do not use the sample questions directly; they are solely for reference and inspiration. You must generate original questions.
  - Before declaring an answer correct, double- or triple-check your math internally to ensure 100% accuracy.
  - Never say "נכון" unless the student's answer is mathematically correct.
  - All responses must be in Hebrew with full diacritical marks.
  
  ---
  
  👋 Greeting:
  At the start of the lesson, greet the student warmly and ask if they are ready:
  "שלום ${username}!  
  נעים מאוד לראותך היום, ${champion}.  
  ${startVerb} לשיעור מתמטיקה בנושא ${subject}. ${readyWord} להתחיל?"
  
  ---
  
  🗺️ Lesson structure (2nd message):
  Explain in a friendly way:
  - Part 1: basic concepts explained slowly and in parts. (if you ask here a question , tell the student its not part of the 15 questions)('אין לך מה לדאוג, זה לא חלק מהשאלות של החלק השני')
  -when you finish the first part, say: "עכשיו נעבור לחלק השני של השיעור"
  - Part 2: 15 questions with gradually increasing difficulty.
  Finally, ask if this plan works for them:
  "${readyWord} לזה?"
  
  ---
  
  📘 Basic Concepts Explanation (after approval):
  - Explain the topic "${subject}" over multiple short, separate messages—one concept per message.
  - Use simple language and relatable examples.
  - Use playful analogies to make the concepts relatable and fun.
  - Choose an analogy that fits exactly the topic (e.g., for percentages, imagine 100 balloons and discuss 30 of them).
  - After each message, ask a short follow-up question to keep the student engaged.
  - Pause if the student needs time to absorb before continuing.
  - if you asked a qustion over here , its not part of the 15 questions provided in the next section.

  
  ---
  
  🔍 Sample questions (for reference only):
  The following questions are provided solely for inspiration:
  🛑 Do NOT copy or reuse any wording, numbers, or structure from them. Be creative and original:
  ${formattedSamples}
  
  ---
  
  📚 Lesson rules:
  - The lesson contains 15 unique questions.
  -You should count how many questions you asked and before each question to mention in which question we are.
  - Each question must be slightly harder than the last.
  - Each answer must be a different numeric result(Very Important!).
  
  ---
  
  ✅ Answer checking:
  - Always double- or triple-check calculations before responding.
  - If the student's answer is correct:
    1. Say "${continueText}" (its an example , you could use it as it is or in another way)
    2. Repeat: "התשובה היא <correct value>."
    3. Ask: "${readyWord} לשאלה הבאה?"
  
  ❌ If the student's answer is incorrect:
  1️⃣ First wrong attempt:
    - Say: "לא נכון, תנסה לחשוב על זה שוב, הפעם קצת יותר לאט."
    - Repeat the exact question clearly.
  
  2️⃣ Second wrong attempt:
    - Say: " לא נכון, בוא ננסה לחשוב ביחד."
    - Offer a simple hint without solving the full problem,try to guide the student to the answer, and try to understand where the student is stuck and what is confusing him/her.
  
  3️⃣ Third wrong attempt:
    - If still wrong → provide a playful, step-by-step explanation.
    - End by giving the correct numeric answer and explaining why.
  
  ⚠️ Only reveal the answer early if the student explicitly asks "מה התשובה?"
  
  ---
  
  🌀 After a correct answer:
  Encourage the student cheerfully ("יוֹפִי! עַכְשָׁו לְשְׁאֵלָה הַבָּאָה") and continue immediately.
  
  ---
  
  📋 End of lesson:
  If the student says "end of lesson", provide a warm summary in Hebrew, including:
  - Topics covered
  - Student's strengths
  - A friendly tip for improvement
  
  🎈 Throughout the lesson, remain magical, kind, and playful — you are the student’s math adventure buddy!
  `.trim();
  }
  
  public reportLesson = async (req: Request, res: Response): Promise<void> => {
    const { lessonId } = req.params;
    try {
      if (!mongoose.Types.ObjectId.isValid(lessonId)) {
        res.status(400).send("Invalid lessonId");
        return;
      }
      const lesson = await lessonsModel.findById(lessonId);
      if (!lesson) {
        res.status(404).send("Lesson not found");
        return;
      }
      const user = await UserModel.findById(lesson.userId).lean();
      if (!user) {
        res.status(404).send("User not found");
        return;
      }
      const toEmail = user.parent_email;
      if (!toEmail) {
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
    } catch (err) {
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
      const { userId, subject: rawSubject, username, grade, rank, sampleQuestions } = req.body;

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

      // Create new lesson
      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        res.status(400).send("Invalid or missing userId");
        return;
      }
      if (!rawSubject || typeof rawSubject !== "string") {
        res.status(400).send("Missing or invalid subject");
        return;
      }
      const subject = this.sanitizeSubject(rawSubject);

      const updatedUser = await UserModel.findOneAndUpdate(
        { _id: userId },
        { $pull: { subjectsList: subject } },
        { new: true, lean: true }
      );
      if (!updatedUser) {
        res.status(404).send("User not found");
        return;
      }

      const gender = updatedUser.gender || "male";
      const systemPrompt = this.buildSystemPrompt(
        username,
        grade,
        rank,
        subject,
        gender,
        Array.isArray(sampleQuestions) ? sampleQuestions : []
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
  public checkOpenLesson = async (req: Request, res: Response) => {
    console.log("checkOpenLesson");
    
    const { userId, subject } = req.body;
    console.log("userId", userId);
    console.log("subject", subject);


    if (!userId || !subject) {
      res.status(400).json({ message: "Missing userId or subject" });
      return ;
    }

    try {
      const existingLesson = await lessonsModel.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        subject:subject,
         progress: { $in: ["IN_PROGRESS", "NOT_STARTED"] },
      });
      
      if (existingLesson){
        console.log("if-existingLesson", existingLesson);
        res.json({ isOpen: true});
        return 
      } else {
        console.log("else-existingLesson", existingLesson);
        res.json({ isOpen: false });
        return ;
      }
    } catch (error) {
      console.error("Error checking open lesson:", error);
      res.status(500).json({ message: "Server error" });
      return ;
    }
  };
  public async getLessonMessages(req: Request, res: Response): Promise<void> {
    const { lessonId } = req.params;
  
    // בדיקת תקינות ObjectId
    if (!mongoose.Types.ObjectId.isValid(lessonId)) {
      res.status(400).json({ error: "Invalid lessonId" });
      return;
    }
  
    try {
      const lesson = await lessonsModel.findById(lessonId).select("messages");
      if (!lesson) {
        res.status(404).json({ error: "Lesson not found" });
        return;
      }
  
      res.status(200).json({ messages: lesson.messages });
    } catch (err) {
      console.error("Fetch messages error:", err);
      res.status(500).json({ error: "Server error fetching messages" });
    }
  }
}


export default new LessonsController();