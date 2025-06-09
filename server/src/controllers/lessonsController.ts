import lessonsModel, { ILesson,  } from "../modules/lessonsModel";
import { Request, Response, NextFunction } from "express";
import { BaseController } from "./baseController";
import mongoose from "mongoose";
import { askQuestion } from "./geminiApi";
import { textToSpeechConvert } from "./APIController/ttsController";
import sgMail from "@sendgrid/mail";
import UserModel from "../modules/userModel";
import { GoogleGenAI, createUserContent } from "@google/genai";
import { sendAndLogEmail } from "./emailController";
import jwt, { JwtPayload } from "jsonwebtoken";
sgMail.setApiKey(process.env.SENDGRID_API_KEY || "");

// In-memory map to hold the latest expression for each lessonId
// Key: lessonId, Value: arithmetic expression string (e.g. "2+3")
const pendingQuestionKeys: Record<string, string> = {};

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? "" });

async function lessonSummaryGemini(
  chatMessages: { role: string; content: string }[],
): Promise<string | null> {
  try {
    const payload = {
      chat: JSON.stringify(chatMessages, null, 2),
    };
    const userPrompt =
      `Analyze the lesson data and return one JSON object with keys:\n` +
      `1. "questions": array of { question, yourAnswer, tryNumber, feedback }\n` +
      `2. "successRate": number between 0 and 100\n` +
      `3. "improvementTips": array of 1–3 suggestions\n` +
      `4. "strengths": array of 1–3 observations\n` +
      `5. "practiceHomework": array of 10 new questions ordered easiest to hardest\n` +
      `6. "recommendations": { toKeep: [...], toWorkOn: [...] }\n` +
      `Chat history:\n${payload.chat}`;

    const chat = ai.chats.create({
      model: "gemini-2.0-flash",
      config: {
        temperature: 0.3,
        maxOutputTokens: 800,
        systemInstruction: createUserContent(
          "You are an educational analyst. Provide a structured JSON report."
        ),
      },
      history: [],
    });

    const response = await chat.sendMessage({ message: userPrompt });
    return response.text?.trim() || null;
  } catch (err) {
    console.error("Error in lessonSummaryGemini:", err);
    return null;
  }
}


class LessonsController extends BaseController<ILesson> {
  private static questionCounter: number = 0;
  public static readonly MAX_QUESTIONS = 15;

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

  /**
   * buildSystemPrompt:
   * In Part 2, every math question must be exactly two lines:
   *   Line 1: Hebrew question text (fully diacritized).
   *   Line 2: Bare arithmetic expression (e.g. "2+3", "5-2").
   *
   * Example format (no JSON, markdown, or extra punctuation):
   * ```
   * אם יש לך 2 תפוחים ועוד 3 תפוחים, כמה תפוחים סך הכל?
   * 2+3
   * ```
   */
  private buildSystemPrompt(
    username: string,
    grade: string,
    rank: string,
    subject: string,
    gender: "female" | "male",
    sampleQuestions: string[]
  ): string {
    const champion = gender === "female" ? "אלופה" : "אלוף";
    const studentHebrew = gender === "female" ? "התלמידה" : "התלמיד";
    const formattedSamples = sampleQuestions.map((q) => `- ${q}`).join("\n");
  
    return `
  You are a playful, creative, and warm-hearted math tutor for ${studentHebrew} ${username}, grade ${grade}, rank: ${rank} (“${champion}”).
  Always address ${studentHebrew} ${username} in Hebrew with full diacritics in both parts.
  
  ⚠️ NO MARKDOWN FENCES—output raw JSON only. Do not wrap the object in triple backticks or any other code block.  
  Do not include any extra text, punctuation, or emojis around the JSON.
  
  If the message is NOT one of the 15 Part 2 questions, return exactly:
  {
    "text": "<Hebrew text with full diacritics or feedback>",
    "counter": undefined
  }
  
  If the message IS one of the 15 Part 2 questions, return exactly:
  {
    "text": "<Hebrew question with full diacritics>",
    "counter": <number between 1 and 15>
  }
  
  Lesson structure:
  
  1. Part 1: Explain basic concepts slowly. (These messages do NOT count toward the 15 Part 2 questions.)  
     When you ask a concept-check question,you could prefix it with but dont say it more than once:  
     "אין לך מה לדאוג, זה לא חלק מהשאלות של החלק השני".
  
  2. After Part 1, output raw JSON with only the "text" field:
     {"text": "עכשיו נעבור לחלק השני של השיעור"}
  
  3. Part 2: Exactly 15 math questions, each slightly harder than the previous one.
     Each question must be output as raw JSON with "text", "mathexpression", and "counter".  
     For example:
     {
       "text": "אם יש לך 2 תפוחים ועוד 3 תפוחים, כמה תפוחים סך הכל?",
       "counter": 1
     }
   
  
  Basic Concepts Explanation (after approval):
  - Explain the topic "${subject}" in multiple short messages—one concept per message.
  - Use simple language, relatable examples, and analogies.
  - After each concept, ask a short comprehension question. (These DO NOT count toward the 15 Part 2 questions; output only raw JSON with "text".)
  - Pause to allow the student to process before continuing.
  
  Sample questions (for reference only—never copy wording or structure):
  ${formattedSamples}
  
  Lesson rules:
  - Part 2 must contain exactly 15 unique math questions.
  - Number each Part 2 question: "השאלה מספר X מתוך 15:" before its JSON block. without writing the number as hebrew word. 8-שמונה לדוגמא
  - for example "שאלה מספר 1 מתוך 15:"/שאלה 2 מתוך 15:
  - Each arithmetic expression must be new (do not reuse "2+3").
  - Each numeric result must differ from all previous questions.

  Answer checking (after the student replies):
  - If the student answers correctly to a Part 2 question, output exactly corrcetResponses:(pick one):
 - "נכון מאוד! תשובתך נכונה. התשובה היא <correct number>. ${gender === 'female' ? 'בואי' : 'בוא'} נעבור לשאלה הבאה.",
  -"מעולה! הצלחת לפתור את השאלה. התשובה היא <correct number>. ${gender === 'female' ? 'בואי' : 'בוא'} נמשיך לשאלה הבאה.",
  -"כל הכבוד! תשובתך מדויקת. התשובה היא <correct number>. ${gender === 'female' ? 'בואי' : 'בוא'} לעוד שאלה.",
  -"נהדר! תשובתך נכונה. התשובה היא <correct number>. ${gender === 'female' ? 'בואי' : 'בוא'} נמשיך הלאה.",
  -"איזה יופי! צדקת. התשובה היא <correct number>. ${gender === 'female' ? 'מוכנה' : 'מוכן'} לעוד אתגר."
  -when im in question 14 , you could say:
  "כל הכבוד ! תשובתך נכונה. התשובה היא <correct number , בוא נמשיך לשאלה האחרונה של השיעור."
  when im in question 15, you could say:
  "מדהים, באמת צדקת, התשובה היא <correct number>.זאת הייתה השאלה האחרונה לשיעור, ממש מקווה שנהנתה!" 
    {
      "text": choose one from above,
      "counter": <same counter>
    }

  - If ${studentHebrew} answers incorrectly:
When the student is wrong the first time, pick one of:
    - לא נכון, תנסה לחשוב על זה שוב, הפעם קצת יותר לאט.
    - לא נכון, נסה לחשוב על זה שוב בצורה אחרת.
    - לא נכון, אולי תנסה לגשת לזה מזווית אחרת?
    - לא נכון, קח רגע לחשוב שוב, אולי תמצא את התשובה.
    - לא נכון, תנסה לחשוב על זה שוב, הפעם בקצב שלך.
    - לא נכון, בוא ננסה לחשוב על זה יחד.
than try to understand the student's thought process.
    
       {
         "text": choose one from above,than replay the question again without the number of question
         "counter": <same counter>
       }
       Then repeat the exact same JSON question.
    2️⃣ Second wrong attempt:  
       {
         "text": "לא נכון, בוא ננסה לחשוב ביחד. <hint here>", and try to understand the student's thought process deeply.
         "counter": <same counter>
       }
       Then repeat the same JSON question.
    3️⃣ Third wrong attempt:  
       {
         "text": "<playful step-by-step explanation in Hebrew> התשובה היא <correct number>.",
         "counter": <same counter>
       }
  
       
  Only reveal the numeric answer early if ${studentHebrew} explicitly asks “מה התשובה?”
  you can only say השיעור נגמר once , and thats happend after the user answer all the question.
  after you finish all 15 Part 2 questions, output exactly: 
  {
  text: "השיעור נגמר,${username} היה לי ממש כיף ללמוד איתך היום!
  אני מקווה שלמדת הרבה על ${subject}!
  אני ממליץ לך לחזור על השאלות שענית לא נכון, ולנסות לפתור אותן שוב.
  אם יש לך שאלות נוספות, אני כאן בשבילך.
  נתראה בשיעור הבא!" 
  }
  
  
  Remain kind, playful, and encouraging—their math adventure buddy!
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
        html: `<p>Hello ${user.parent_name},</p>
<p>Here is the report for your child's lesson on ${lesson.subject}.</p>
<p>Lesson ID: ${lesson._id}</p>
<p>Start Time: ${lesson.startTime}</p>
<p>End Time: ${lesson.endTime}</p>
<p>Progress: ${lesson.progress}</p>
<br><p>Best regards,</p><p>MathVenture Team</p>`,
      };
      await sgMail.send(msg);
      res.status(200).send("Email sent successfully");
    } catch (err) {
      console.error("Error in reportLesson:", err);
      res.status(500).send("Internal Server Error");
    }
  };

  /**
   * POST /lessons/startNew
   */
  public startLesson = async (req: Request, res: Response): Promise<void> => {
    try {
      const { lessonId } = req.params as { lessonId?: string };
      const { userId, subject: rawSubject, username, grade, rank, sampleQuestions } =
        req.body;

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
          correctAnswersCount: existing.correctAnswersCount,
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
        mathQuestionsCount: 0,
        correctAnswersCount: 0,
        questionLogs: [],
      });

      res.status(201).json({
        _id: newLesson._id,
        mathQuestionsCount: newLesson.mathQuestionsCount,
        correctAnswersCount: newLesson.correctAnswersCount,
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

  async chat(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { lessonId } = req.params;
    const { question: studentQuestion } = req.body as { question?: string };
  
    if (!studentQuestion) {
      res.status(400).json({ error: "Missing 'question' in request body" });
      return;
    }
  
    try {
      // 1) Forward the student’s question to Gemini (or whatever AI)
      const rawResponse: string = await askQuestion(studentQuestion, "", lessonId);
  
      // 2) Return exactly what Gemini sent (as plain text)
      res.json({ answer: rawResponse });
    } catch (err) {
      console.error("Error in chat handler:", err);
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
      return;
    }

    try {
      const existingLesson = await lessonsModel.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        subject: subject,
        progress: { $in: ["IN_PROGRESS", "NOT_STARTED"] },
      });

      if (existingLesson) {
        console.log("if-existingLesson", existingLesson);
        res.json({ isOpen: true });
        return;
      } else {
        console.log("else-existingLesson", existingLesson);
        res.json({ isOpen: false });
        return;
      }
    } catch (error) {
      console.error("Error checking open lesson:", error);
      res.status(500).json({ message: "Server error" });
      return;
    }
  };

  public async getLessonMessages(req: Request, res: Response): Promise<void> {
    const { lessonId } = req.params;

    // Validate ObjectId
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
  

    public async analyzeLesson(req: Request, res: Response): Promise<void> {
      const {
        lessonId,
        parentEmail,
        subject: emailSubject,
      } = req.body as {
        lessonId?: string;
        parentEmail?: string;
        subject?: string;
      };
  
      if (
        !lessonId ||
        !parentEmail ||
        !emailSubject ||
        !mongoose.Types.ObjectId.isValid(lessonId)
      ) {
        res.status(400).json({
          error:
            "Missing or invalid fields: lessonId (ObjectId), parentEmail, subject must be in body",
        });
        return;
      }
  
      try {
        const lesson = await lessonsModel.findById(lessonId);
        if (!lesson) {
          res.status(404).json({ error: "Lesson not found" });
          return;
        }
  
        const chatMessages = lesson.messages.map(m => ({ role: m.role, content: m.content }));
    
  
        const reportJson = await lessonSummaryGemini(chatMessages,);
        if (!reportJson) {
          res.status(500).json({ error: "Failed to analyze lesson" });
          return;
        }
  
        // extract userId from token
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(" ")[1];
        const decoded = token && jwt.decode(token);
        const userId = decoded && typeof decoded !== "string" ? (decoded as JwtPayload)._id : null;
        if (!userId) {
           res.status(401).json({ error: "Invalid or missing token" });
           return;
        }
        // send and log email
        const { success, recordId } = await sendAndLogEmail(
          userId,
          parentEmail,
          emailSubject,
          reportJson
        );
  
         res
          .status(success ? 200 : 500)
          .json({ analysis: JSON.parse(reportJson), email: { success, recordId } });
          return;
      } catch (err) {
        console.error("analyzeLesson error:", err);
        res.status(500).json({ error: "Server error analyzing lesson" });
        return;
      }
    }
  
  }  
 

export default new LessonsController();
