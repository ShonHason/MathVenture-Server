// src/controllers/lessonsController.ts

import lessonsModel, { ILesson } from "../modules/lessonsModel";
import { Request, Response, NextFunction } from "express";
import { BaseController } from "./baseController";
import mongoose from "mongoose";
import { askQuestion } from "./geminiApi";
import { textToSpeechConvert } from "./APIController/ttsController";
import sgMail from "@sendgrid/mail";
import UserModel from "../modules/userModel";
import { progressType } from "../modules/enum/progress";

sgMail.setApiKey(process.env.SENDGRID_API_KEY || "");

// In-memory map to hold the latest expression for each lessonId
// Key: lessonId, Value: arithmetic expression string (e.g. "2+3")
const pendingQuestionKeys: Record<string, string> = {};

class LessonsController extends BaseController<ILesson> {
  private static questionCounter: number = 0;
  public static readonly MAX_QUESTIONS = 15;

  constructor() {
    super(lessonsModel);
  }

  public static getQuestionCounter(): number {
    return this.questionCounter;
  }

  public static incrementQuestionCounter(): void {
    if (this.questionCounter < this.MAX_QUESTIONS) {
      this.questionCounter++;
    } else {
      throw new Error("Maximum question limit reached");
    }
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
    const continueText =
      gender === "female"
        ? "תמשיכי כך, נכון! תשובתך נכונה"
        : "תמשיך כך, נכון! תשיבתך נכונה";
    const startVerb = gender === "female" ? "בואי" : "בוא";
    const readyWord = gender === "female" ? "מוכנה" : "מוכן";

    const formattedSamples = sampleQuestions.map((q) => `- ${q}`).join("\n");
    let questionText = `השאלה מספר ${
      LessonsController.getQuestionCounter() + 1
    } מתוך ${LessonsController.MAX_QUESTIONS}:`;
    LessonsController.incrementQuestionCounter();

    return `
You are a playful, creative, and warm-hearted math tutor for young Hebrew-speaking children.
Address the student consistently using correct feminine or masculine Hebrew forms based on their gender.

Important instructions:
- Once we enter Part 2 (the 15-question section), every math question MUST be exactly two lines:
  1) Line 1: the Hebrew question text (fully diacritics).
  2) Line 2: the bare arithmetic expression (e.g. "2+3", "5-2").

  Example (no JSON, no markdown, no extra punctuation):
  \`\`\`
  אם יש לך 2 תפוחים ועוד 3 תפוחים, כמה תפוחים סך הכל?
  2+3
  \`\`\`

- Do not embed the expression in brackets, quotes, JSON. It must appear verbatim on line 2.
- If the student’s answer is incorrect, repeat the exact same two-line question (same expression).
- Do not output any other JSON or structured format.
- Do not use the sample questions directly; they are for inspiration only.
- Before declaring an answer correct, double- or triple-check your math internally.
- Never say "נכון" unless the student’s numeric answer is exactly correct.
- All responses (questions and feedback) must be in Hebrew with full diacritics.

Greeting (first AI message):
  שלום ${username}!
  נעים מאוד לראותך היום, ${champion}.
  ${startVerb} לשיעור מתמטיקה בנושא ${subject}. ${readyWord} להתחיל?

Lesson structure (second AI message):
  - Part 1: Explain basic concepts slowly (questions here do NOT count toward the 15).
    When you ask a concept-check question, preface with "אין לך מה לדאוג, זה לא חלק מההשאלות של החלק השני".
  - After Part 1: say "עכשיו נעבור לחלק השני של השיעור".
  - Part 2: Exactly 15 math questions, numbered 1–15, each slightly harder than the last.
    Every question must be two lines (Hebrew + expression). For example:
    \`\`\`
    השאלה מספר ${LessonsController.getQuestionCounter()} מתוך 15:
    אם יש לך 2 תפוחים ועוד 3 תפוחים, כמה תפוחים סך הכל?
    2+3
    \`\`\`
  - Ask if this plan works: "${readyWord} לזה?"

Basic Concepts Explanation (after approval):
  - Explain the topic "${subject}" in multiple short messages—one concept per message.
  - Use simple language, relatable examples, analogies.
  - After each concept, ask a small comprehension question (these do NOT count toward the 15).
  - Pause to let the student absorb before continuing.

Sample questions (for reference only):
🛑 Do NOT copy wording or structure—be creative!
${formattedSamples}

Lesson rules:
  - Exactly 15 unique math questions in Part 2.
  - Number them: "השאלה מספר X מתוך 15:" before each two-line block.
  - Each expression must be new (never reuse "2+3").
  - Each answer must be a different numeric result.

Answer checking:
  - If the student’s numeric answer is correct:
    1. Say "…נכון מאוד! תשובתך נכונה."
    2. Repeat: "התשובה היא <correct number>."
    3. Ask: "${readyWord} לשאלה הבאה?"
  - If the student’s numeric answer is incorrect:
    1️⃣ First wrong attempt:
      - Say: "לא נכון, תנסה לחשוב על זה שוב, הפעם קצת יותר לאט."
      - Repeat the exact same two-line question.
    2️⃣ Second wrong attempt:
      - Say: "לא נכון, בוא ננסה לחשוב ביחד."
      - Provide a hint, then repeat the exact same two-line question.
    3️⃣ Third wrong attempt:
      - Provide a playful step-by-step explanation.
      - End with "התשובה היא <correct number>."

Only reveal the numeric answer early if the student explicitly asks "מה התשובה?"

After a correct answer:
  - Say "יופי, תשובתך נכונה! התשובה היא <correct number>. מוכן לשאלה הבאה?" and proceed.

End of lesson:
  If the student says "סוף שיעור", give a warm summary in Hebrew:
    - Topics covered
    - Student’s strengths
    - A friendly tip for improvement

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
        html: `<p>Hello ${user.parent_name},</p><p>Here is the report for your child's lesson on ${lesson.subject}.</p><p>Lesson ID: ${lesson._id}</p><p>Start Time: ${lesson.startTime}</p><p>End Time: ${lesson.endTime}</p><p>Progress: ${lesson.progress}</p><br><p>Best regards,</p><p>MathVenture Team</p>`,
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

  /**
   * Chat endpoint: send question to Gemini and return answer
   */
  async chat(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { lessonId } = req.params;
    const { question: studentAnswer } = req.body as { question?: string };

    if (!studentAnswer) {
      res.status(400).json({ error: "Missing 'question' in request body" });
      return;
    }

    // 1) Load lesson
    const lessonBefore = await lessonsModel.findById(lessonId);
    if (!lessonBefore) {
      res.status(404).json({ error: "Lesson not found" });
      return;
    }

    // 2) Extract last AI‐asked message (only used for logging “question”)
    const lastAiMessage = [...lessonBefore.messages]
      .reverse()
      .find((m) => m.role === "assistant");
    const aiPreviousHebrew = lastAiMessage?.content ?? ""; // used for logging
    const questionTime = new Date();

    // 3) Send student's answer (or request next question) to Gemini
    let raw: string;
    try {
      raw = await askQuestion(studentAnswer, "", lessonId);
    } catch (err) {
      console.error("Error calling Gemini:", err);
      return next(err);
    }

    // 4) If it’s the JSON “done” payload, finish the lesson (unchanged)
    if (raw.trim().startsWith("{")) {
      try {
        const donePayload = JSON.parse(raw);
        if (donePayload.done) {
          // — a) Mark lesson DONE
          const lesson = await lessonsModel.findByIdAndUpdate(
            lessonId,
            { progress: progressType.DONE, endTime: new Date() },
            { new: true }
          );
          if (!lesson) {
            res.status(404).json({ error: "Lesson not found" });
            return;
          }

          // — b) Compute analytics (unchanged)
          const full = await lessonsModel.findById(lessonId).lean();
          const logs = full?.questionLogs || [];
          const total = logs.length;
          const correct = logs.filter((l) => l.isCorrect).length;
          const avgMs = total
            ? logs.reduce((sum, l) => sum + (l.responseTimeMs || 0), 0) / total
            : 0;
          donePayload.analytics = {
            totalQuestions: total,
            correctAnswers: correct,
            accuracyPct: total ? (correct / total) * 100 : 0,
            avgResponseTimeMs: avgMs,
          };

          // — c) Send summary email (unchanged)
          const user = await UserModel.findById(lesson.userId).lean();
          const toEmail = user?.parent_email || user?.email;
          if (toEmail) {
            await sgMail.send({
              to: toEmail,
              from: "mathventurebot@gmail.com",
              subject: `סיכום שיעור: ${lesson.subject}`,
              text: `שלום,

השיעור בנושא "${lesson.subject}" הושלם בהצלחה!

חוזקות:   ${donePayload.strengths   || "–"}
נקודות לשיפור: ${donePayload.weaknesses || "–"}
טיפים:    ${donePayload.tips        || "–"}

— סטטיסטיקות שיעור —
שאלות סך הכל: ${donePayload.analytics.totalQuestions}
תשובות נכונות: ${donePayload.analytics.correctAnswers} (${donePayload.analytics.accuracyPct.toFixed(1)}%)
זמן ממוצע למענה: ${(donePayload.analytics.avgResponseTimeMs / 1000).toFixed(2)} שנניות

בהצלחה בשיעורים הבאים!
`,
              html: `<p>שלום,</p>
<p>השיעור בנושא "<strong>${lesson.subject}</strong>" הושלם בהצלחה!</p>
<ul>
  <li><strong>חוזקות:</strong> ${donePayload.strengths   || "–"}</li>
  <li><strong>נקודות לשיפור:</strong> ${donePayload.weaknesses || "–"}</li>
  <li><strong>טיפים:</strong> ${donePayload.tips        || "–"}</li>
</ul>
<hr/>
<h4>סטטיסטיקות שיעור:</h4>
<ul>
  <li>שאלות סך הכל: ${donePayload.analytics.totalQuestions}</li>
  <li>תשובות נכונות: ${donePayload.analytics.correctAnswers} (${donePayload.analytics.accuracyPct.toFixed(1)}%)</li>
  <li>זמן ממוצע למענה: ${(donePayload.analytics.avgResponseTimeMs / 1000).toFixed(2)} שנניות</li>
</ul>
<p>בהצלחה בשיעורים הבאים!</p>`,
            });
          }

          res.json(donePayload);
          return;
        }
        // else: fall through to normal Q&A
      } catch {
        // not valid JSON → treat as normal text below
      }
    }

    // --------------------------------------------------------------------------------
    // 5) Distinguish:
    //    A) A NEW math question (two lines: Hebrew + expression)
    //    B) A computed result (JSON with { type: "math", ... })
    //    C) Plain Hebrew feedback (praise or "לא נכון")
    //    D) Gemini repeated the question (two lines again)
    // --------------------------------------------------------------------------------

    // — A) Check for a two-line math question:
    //    Regex: ^([\s\S]+?)\r?\n([0-9+\-*/\s]+)\s*$
    //    Group 1 = Hebrew question (line 1), Group 2 = expression (line 2).
    const twoLineMatch = raw.match(/^([\s\S]+?)\r?\n([0-9+\-*/\s]+)\s*$/);

    if (twoLineMatch) {
      // AI is either asking a brand-new math question, OR
      // repeating the same question after "לא נכון".

      const newQuestionText = twoLineMatch[1].trim();  // Hebrew (line 1)
      const newQuestionKey = twoLineMatch[2].trim();   // expression (line 2), e.g. "2+3"

      // CASE: is Gemini repeating the same expression AFTER the student answered?
      // Check if pendingQuestionKeys[lessonId] exists and equals newQuestionKey
      const previousKey = pendingQuestionKeys[lessonId];
      if (previousKey && previousKey === newQuestionKey) {
        // Gemini is repeating the same question because it thought student was wrong.
        // But maybe the student was actually correct. Check numeric equality:
        const expr = newQuestionKey;
        let correctValue: number;
        try {
          // compute 2+3, 5-2 etc:
          // eslint-disable-next-line no-new-func
          correctValue = new Function(`"use strict"; return (${expr});`)();
        } catch {
          correctValue = NaN;
        }
        // parse studentAnswer:
        const numericAns = parseFloat(studentAnswer.replace(",", ".").trim());
        if (!isNaN(numericAns) && Math.abs(numericAns - correctValue) < 1e-9) {
          // Student was correct, but Gemini is mistakenly repeating question.
          // We override: mark correct at first attempt.

          // 1) Check if first attempt on this questionKey:
          const alreadyAttempted = lessonBefore.questionLogs.some(
            (log) => log.questionKey === newQuestionKey
          );

          if (!alreadyAttempted) {
            // Increment both counters:
            await lessonsModel.findByIdAndUpdate(
              lessonId,
              {
                $inc: {
                  mathQuestionsCount: 1,
                  correctAnswersCount: 1,
                },
              },
              { new: true }
            );
          }
          // Log as correct:
          const answerTime = new Date();
          const responseTimeMs = answerTime.getTime() - questionTime.getTime();
          await lessonsModel.findByIdAndUpdate(
            lessonId,
            {
              $push: {
                questionLogs: {
                  questionKey: newQuestionKey,
                  question: aiPreviousHebrew,
                  questionTime,
                  answer: studentAnswer,
                  answerTime,
                  isCorrect: true,
                  responseTimeMs,
                  aiResponse: `יופי! תשובתך נכונה. התשובה היא ${correctValue}.`,
                },
              },
            },
            { new: true }
          );

          // Clear pending:
          delete pendingQuestionKeys[lessonId];

          // Now request next question from Gemini:
          let nextRaw: string;
          try {
            nextRaw = await askQuestion("מוכן לשאלה הבאה?", "", lessonId);
          } catch (err) {
            console.error("Error fetching next question:", err);
            return next(err);
          }

          // NextRaw should be two-line: Hebrew + expression
          const nextMatch = nextRaw.match(/^([\s\S]+?)\r?\n([0-9+\-*/\s]+)\s*$/);
          if (nextMatch) {
            const nextQuestionText = nextMatch[1].trim();
            const nextQuestionKey = nextMatch[2].trim();
            // push Hebrew part only:
            await lessonsModel.findByIdAndUpdate(
              lessonId,
              {
                $push: {
                  messages: { role: "assistant", content: nextQuestionText },
                },
              },
              { new: true }
            );
            // store new key:
            pendingQuestionKeys[lessonId] = nextQuestionKey;

            const updatedLesson = await lessonsModel.findById(lessonId).lean();
            if (!updatedLesson) {
              res.status(404).json({ error: "Lesson not found" });
              return;
            }
            res.json({
              answer:               `יופי! תשובתך נכונה. התשובה היא ${correctValue}.`,
              nextQuestion:         nextQuestionText,
              mathQuestionsCount:   updatedLesson.mathQuestionsCount,
              correctAnswersCount:  updatedLesson.correctAnswersCount,
              isCorrect:            true,
            });
            return;
          } else {
            // Gemini did not return a well-formed two-line next question.
            // Fallback: just return the raw nextRaw as feedback:
            const updatedLesson = await lessonsModel.findById(lessonId).lean();
            if (!updatedLesson) {
              res.status(404).json({ error: "Lesson not found" });
              return;
            }
            res.json({
              answer:               `יופי! תשובתך נכונה. התשובה היא ${correctValue}.`,
              nextQuestion:         nextRaw,
              mathQuestionsCount:   updatedLesson.mathQuestionsCount,
              correctAnswersCount:  updatedLesson.correctAnswersCount,
              isCorrect:            true,
            });
            return;
          }
        }
        // Else: student truly was wrong (numeric mismatch). Let original two-line question stand.
      }

      // CASE: A brand-new question (pendingQuestionKeys not set yet):
      // or Gemini legitimately re-asked because student was wrong.
      // 5.A.1) Push only the Hebrew question text into lesson.messages
      await lessonsModel.findByIdAndUpdate(
        lessonId,
        {
          $push: {
            messages: {
              role:    "assistant",
              content: newQuestionText, // only Hebrew, not expression
            },
          },
        },
        { new: true }
      );

      // 5.A.2) Store the expression temporarily in memory:
      pendingQuestionKeys[lessonId] = newQuestionKey;

      // 5.A.3) Return so the UI sees only the Hebrew question text:
      res.json({
        answer:               newQuestionText,
        mathQuestionsCount:   lessonBefore.mathQuestionsCount,
        correctAnswersCount:  lessonBefore.correctAnswersCount,
        isCorrect:            false,
      });
      return;
    }

    // — B) If not a two-line question, maybe it’s JSON with { type: "math", result: … }
    let feedback = "";
    let isMathPayload = false;
    let answeredCorrectly = false;
    let correctResult: number | null = null;

    if (raw.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.type === "math") {
          // The AI computed the result on its own
          isMathPayload = true;
          answeredCorrectly = true;
          correctResult = parsed.result;
          feedback = `התוצאה היא ${parsed.result}.`;
        }
      } catch {
        // not valid JSON → will treat as plain Hebrew in step C
      }
    }

    // — C) If not JSON math, treat raw as plain Hebrew feedback:
    if (!isMathPayload) {
      feedback = raw.trim();
      const noNikud = feedback
        .normalize("NFD")
        .replace(/[\u0591-\u05C7]/g, "");

      if (/תשובתך נכונה/.test(noNikud)) {
        isMathPayload = true;
        answeredCorrectly = true;
      } else if (/לא נכון/.test(noNikud)) {
        isMathPayload = true;
        answeredCorrectly = false;
      }
    }

    // --------------------------------------------------------------------------------
    // 6) If it’s math-related feedback (isMathPayload===true), log it using pendingQuestionKeys:
    // --------------------------------------------------------------------------------
   if (isMathPayload) {
  // Retrieve the expression we stored earlier:
  const questionKey = pendingQuestionKeys[lessonId] || "";

  // Check if this questionKey already appears in questionLogs
  const alreadyAttempted = lessonBefore.questionLogs.some(
    (log) => log.questionKey === questionKey
  );

  if (!alreadyAttempted) {
    // FIRST time seeing this expression:
    //   – If student was correct → increment BOTH counters.
    //   – If student was wrong   → increment ONLY mathQuestionsCount.
    if (answeredCorrectly) {
      await lessonsModel.findByIdAndUpdate(
        lessonId,
        {
          $inc: {
            mathQuestionsCount: 1,
            correctAnswersCount: 1,
          },
        },
        { new: true }
      );
    } else {
      await lessonsModel.findByIdAndUpdate(
        lessonId,
        {
          $inc: {
            mathQuestionsCount: 1,
          },
        },
        { new: true }
      );
    }
  }
  // If alreadyAttempted === true, do NOT increment anything.

  // Log this attempt with isCorrect = answeredCorrectly:
  const answerTime = new Date();
  const responseTimeMs = answerTime.getTime() - questionTime.getTime();
  await lessonsModel.findByIdAndUpdate(
    lessonId,
    {
      $push: {
        questionLogs: {
          questionKey: questionKey,
          question: aiPreviousHebrew,
          questionTime,
          answer: studentAnswer,
          answerTime,
          isCorrect: answeredCorrectly,
          responseTimeMs,
          aiResponse: feedback,
        },
      },
    },
    { new: true }
  );

  // Clear out the stored expression so next question will be fresh:
  delete pendingQuestionKeys[lessonId];
}

    // — If it was NOT math feedback, strip any "*" from plain feedback:
    if (!isMathPayload) {
      feedback = raw.trim().replace(/\*/g, "");
    }

    // --------------------------------------------------------------------------------
    // 7) Push the student’s answer + AI feedback into lesson.messages:
    // --------------------------------------------------------------------------------
    lessonBefore.messages.push({
      role:    "user",
      content: studentAnswer,
    });
    lessonBefore.messages.push({
      role:    "assistant",
      content: feedback,
    });
    await lessonBefore.save();

    // --------------------------------------------------------------------------------
    // 8) Return to the UI: feedback + updated mathQuestionsCount + correctAnswersCount
    // --------------------------------------------------------------------------------
    const updatedLesson = await lessonsModel.findById(lessonId).lean();
    res.json({
      answer:               feedback,
      mathQuestionsCount:   updatedLesson?.mathQuestionsCount ?? 0,
      correctAnswersCount:  updatedLesson?.correctAnswersCount ?? 0,
      isCorrect:            isMathPayload ? answeredCorrectly : false,
    });
  }

  async getAnalystics(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { lessonId } = req.params;
    try {
      const lesson = await lessonsModel
        .findById(lessonId)
        .select("questionLogs mathQuestionsCount correctAnswersCount")
        .lean();
      if (!lesson) {
        res.status(404).json({ error: "Lesson not found" });
        return;
      }
      const logs = lesson.questionLogs;
      const total = logs.length;
      const correct = logs.filter((log) => log.isCorrect).length;
      const averageTime =
        total > 0
          ? logs.reduce((sum, log) => sum + (log.responseTimeMs || 0), 0) / total
          : 0;
      res.json({
        totalQuestions:        total,
        correctAnswers:        correct,
        accuracyPct:           total > 0 ? (correct / total) * 100 : 0,
        avgResponseTimeMs:     averageTime,
        mathQuestionsCount:    lesson.mathQuestionsCount,
        correctAnswersCount:   lesson.correctAnswersCount,
        logs,
      });
    } catch (err) {
      console.error("❌ /lessons/:lessonId/analytics error:", err);
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
}

export default new LessonsController();
