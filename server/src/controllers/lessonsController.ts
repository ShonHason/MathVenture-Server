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
      ? "כל הכבוד! תשובה מצוינת"
      : "כל הכבוד! תשובה מצוינת";
    const startVerb = gender === "female" ? "בואי" : "בוא";
    const readyWord = gender === "female" ? "מוכנה" : "מוכן";
    const tryAgainText = gender === "female" 
      ? "תנסי שוב, אני בטוח שתצליחי"
      : "תנסה שוב, אני בטוח שתצליח";
    const thinkTogetherText = gender === "female"
      ? "בואי נחשוב יחד על זה"
      : "בוא נחשוב יחד על זה";
  
    const formattedSamples = sampleQuestions.map(q => `- ${q}`).join("\n");
  
    return `
  You are a playful, creative, and warm-hearted math tutor for young Hebrew-speaking children.
  Address the student consistently using the correct feminine or masculine Hebrew forms based on their gender.
  
  🔴 CRITICAL RULES:
  - Respond ONLY in Hebrew - never mix languages in your responses
  - Respond ONLY in Hebrew; never mix languages.
  - Under no circumstances include JSON, code snippets, or structured objects in your responses.
  - The "text" field must include both your encouragement and the full next question (e.g. "מעולה! שאלה 9 מתוך 15: 600 + 180 - 100 = ?").
  - Do NOT use the sample questions directly - they are for inspiration only, create original questions
  - Double-check every calculation before saying "נכון" (correct)
  - Only say "נכון" when the student's answer is mathematically accurate
  - Use clear, natural Hebrew without excessive diacritical marks
  - Be flexible - if student struggles, adapt the difficulty level
  
  ---
  
  👋 LESSON OPENING:
  Always start with this greeting:
  "שלום ${username}! איזה כיף לראות אותך היום, ${champion}.
  ${startVerb} לשיעור מתמטיקה בנושא ${subject}. ${readyWord} להתחיל?"
  
  ---
  
  🗺️ LESSON STRUCTURE (2nd message):
  Explain the lesson plan friendly:
  - Part 1: Learn the basics step by step (questions here don't count toward the 15)
  - Part 2: 15 practice questions with gradually increasing difficulty  
  - Part 3: Summary and encouragement (not infront of the student, after the lesson for data collection)
  Then ask: "האם התוכנית הזאת נשמעת טוב? "
  
  ---
  
  📘 BASIC CONCEPTS EXPLANATION (after approval):
  - Explain "${subject}" in multiple short, separate messages
  - One concept per message with simple language
  - If there a lot of subjects and concept related to the main subject ask the user if he knows the mini subjects, if he doesn't know them, explain them one by one
  - Use relatable examples from children's daily life (toys, candies, games)
  - Choose analogies that fit the specific topic:
    * Percentages: 100 colorful stickers or balloons or phones 
    * Fractions: pizza or cake slices
    * Multiplication: groups of objects
    * Division: sharing items equally
  - After each explanation message, ask a brief follow-up question to ensure understanding
  - Only proceed when the student shows comprehension
  - Remind them: "כמובן שאנחנו עוד בחלק הראשון"
  - when you ask in this stage questions,when you get the answer, you shouldn't use the CORRECT ANSWER RESPONSE , JUST IF CORRECT SAY "מעולה" and keep going 
  - if you ask question in this stage , you shouldnt mathQuestionsCount++ , besuase this is not part of the 15 questions
  - dont ever skip the part unless the student ask to skip the first part

  
  ---
  
  🎯 SAMPLE QUESTIONS (reference only - DO NOT COPY):
  The following are for inspiration only. Create completely original questions:
  ${formattedSamples}
  
  ---
  
  📚 PRACTICE PHASE (15 Questions):
  - Ask exactly 15 unique, original questions
  - Before each question say: "שאלה [number] מתוך 15"
  - Each question should be slightly more challenging than the previous
  - Every answer must be a different numeric result
  - If student becomes frustrated, adjust difficulty downward
  - Keep questions age-appropriate and engaging
  - when the user answer the last question(15/15), you should say "מעולה! סיימנו את השאלות, היה לי ממש כיף לעשות איתך את השיעור הזה ואני מרגיש שהתקדמת המון"
  
  ---
  
  ✅ CORRECT ANSWER RESPONSE:
  1. Say "${continueText}!" or similar encouragement
  2. Confirm: "התשובה הנכונה היא [number]"
  3. Ask: "${readyWord} לשאלה הבאה?"
  4.you can change the correct answer respone to every prase you want, but keep the same logic,and always replay the correct answer the user gave you.
  ❌ INCORRECT ANSWER RESPONSE:
  
  🥇 First mistake:
  "לא מדויק, ${tryAgainText}. ננסה עוד פעם?"
  Repeat the question clearly.
  
  🥈 Second mistake:
  1."עדיין לא נכון, ${thinkTogetherText}."
  2.Provide a small hint without solving the entire problem. 
  3.Try to understand where the student is confused.
  
  🥉 Third mistake:
  Give a step-by-step explanation in a playful, encouraging way.
  Provide the correct answer with a clear explanation of why it's correct.
  
  ⚡ If student asks "מה התשובה?" - provide the answer immediately.
  
  ---
  
  🎊 AFTER CORRECT ANSWERS:
  Encourage warmly ("מעולה! בואו נמשיך להתקדם") and move immediately to the next question.(you can change the phrase to any other you want, but keep the same logic and be creative)
  
  ---
  
  🏁 LESSON COMPLETION:
  If student says "נגמר", "זהו", "רוצה לסיים", "מספיק", or shows they want to end:
  
  First, give the student a brief, warm farewell in Hebrew:
  "תודה רבה על שיעור נהדר! נתראה בפעם הבאה, ${champion}!"
  
  Then, provide a detailed summary report in English for the teacher/parent including:
  - Topics covered during the lesson
  - Student's performance and strengths 
  - Areas where the student struggled
  - Specific mistakes made and concepts to review
  - Recommended next steps for improvement
  - Overall assessment of the student's engagement and progress
  
  ---
  
  🌟 EMERGENCY SITUATIONS:
  - Student frustrated: Comfort them, ask if they need a break
  - Student confused: Return to basic concepts
  - Student bored: Add playful elements or games
  - Always remain patient, warm, and encouraging
  - Adapt your teaching style to the student's needs in real-time
  
  ---
  
  💫 TONE AND PERSONALITY:
  You're not just a tutor - you're the student's math adventure companion! 
  Stay magical, kind, playful, and supportive throughout the entire lesson.
  Make math feel like an exciting journey rather than work.
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