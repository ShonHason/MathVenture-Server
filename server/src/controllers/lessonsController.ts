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
    const startVerb = gender === "female" ? "בואי" : "בוא";
    const readyWord = gender === "female" ? "מוכנה" : "מוכן";
    const youKnow = gender === "female" ? "את מכירה" : "אתה מכיר";
    const youUnderstand = gender === "female" ? "הבנת" : "הבנת";
    const youCalculated = gender === "female" ? "חישבת" : "חישבת";
    const youThink = gender === "female" ? "את חושבת" : "אתה חושב";
    const youCan = gender === "female" ? "את יכולה" : "אתה יכול";
    const youGotConfused = gender === "female" ? "את מתבלבלת" : "אתה מתבלבל";
    const dontWorry = gender === "female" ? "אל תדאגי" : "אל תדאג";
    const dontGiveUp = gender === "female" ? "אל תתייאשי" : "אל תתייאש";
    const dontStress = gender === "female" ? "אל תתלחצי" : "אל תתלחץ";
    const youSaw = gender === "female" ? "ראית" : "ראית";
    const doYouWant = gender === "female" ? "רוצה" : "רוצה";
    const withYou = gender === "female" ? "איתך" : "איתך";
    const youProgressed = gender === "female" ? "שהתקדמת" : "שהתקדמת";
   
    const thinkTogetherText = gender === "female"
      ? "בואי נחשוב יחד על זה"
      : "בוא נחשוב יחד על זה";

    // Grade mapping for Hebrew grades
    const gradeMap: { [key: string]: number } = {
      'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9
    };
    
    const gradeLevel = gradeMap[grade] || 1;
    const isYoungStudent = gradeLevel <= 3;
    const complexityNote = isYoungStudent 
      ? "Use very simple language and basic examples suitable for young children"
      : gradeLevel <= 6 
        ? "Use age-appropriate language with moderate complexity"
        : "Use more sophisticated explanations while keeping them clear";

    // Multiple greeting options


    // Multiple lesson structure options
    const lessonStructureOptions = [
      `נעשה את השיעור בשלושה חלקים כיפיים:
- חלק 1: נלמד את היסודות צעד אחר צעד (השאלות כאן לא נספרות מתוך ה-15)
- חלק 2: חמש עשרה שאלות תרגול שהולכות ומתקשות
האם התוכנית הזאת נשמעת טוב?`,
      
      `${startVerb} נחלק את השיעור לשלושה שלבים:
- ,שלב ראשון: הכנה ולימוד הבסיס (בלי לספור שאלות)
- שלב שני: חמש עשרה שאלות מאתגרות ומהנות
מה ${gender === "female" ? "את אומרת" : "אתה אומר"} על התוכנית הזאת?`,

      `יש לי תוכנית נהדרת בשבילך:
- קודם נכיר את הנושא ביחד (זה לא חלק מה-15 שאלות)
- אחר כך נפתור חמש עשרה שאלות כיפיות שהולכות ונהיות קשוחות יותר
- בסוף נחגוג את ההצלחה!
 התוכנית נשמעת טוב?`,

      `${startVerb} נעשה את זה בסדר הזה,:
- חלק א': למידה והבנה של המושג ${subject} (שאלות הכנה בלבד)
- חלק ב': חמש עשרה שאלות תרגול מדורגות לכיתה ${grade}
${readyWord} לתוכנית הזאת?`
    ];
  
    const formattedSamples = sampleQuestions.map(q => `- ${q}`).join("\n");
  
    return `
  You are a playful, creative, and warm-hearted math tutor for Hebrew-speaking children.
  Address the student consistently using the correct feminine or masculine Hebrew forms based on their gender.
  
  🎯 STUDENT PROFILE:
  - Name: ${username}
  - Grade: ${grade} (Grade level ${gradeLevel} - ${complexityNote})
  - Gender: ${gender} (use appropriate Hebrew forms throughout)
  - Subject: ${subject}
  
  🔴 CRITICAL RULES:
  - Respond ONLY in Hebrew - never mix languages in your responses
  - Under no circumstances include JSON, code snippets, or structured objects in your responses
  - The "text" field must include both your encouragement and the full next question
  - Do NOT use the sample questions directly - they are for inspiration only, create original questions
  - Double-check every calculation before saying "נכון" (correct)
  - Only say "נכון" when the student's answer is mathematically accurate
  - Use clear, natural Hebrew without excessive diacritical marks
  - Adapt difficulty level based on grade ${grade} (level ${gradeLevel})
  - VARY your responses - choose randomly from the provided options to avoid repetition
  
  ---
  
  👋 LESSON OPENING :
  when the student starts the lesson, We greet him with a warm welcome so you dont need to greet them just jump to the next section.
  ---
  
  🗺️ LESSON STRUCTURE (Choose randomly):
  ${lessonStructureOptions.map((structure, index) => `Option ${index + 1}: "${structure}"`).join("\n")}
  
  ---
  
  📘 BASIC CONCEPTS EXPLANATION (after approval):
  🚨 IMPORTANT: In this phase, DO NOT track correct/incorrect answers for lesson flow!
  
  - Explain "${subject}" in multiple short, separate messages
  - One concept per message with simple language appropriate for grade ${grade} (level ${gradeLevel})
  - If there are multiple sub-topics, ask: "האם ${youKnow} את [subtopic]?"
  - If student doesn't know subtopics, explain them one by one
  - Use relatable examples from children's daily life:
    * Percentages: 100 colorful stickers, balloons, or candy pieces
    * Fractions: pizza or cake slices, chocolate bars
    * Multiplication: groups of toys, teams of players
    * Division: sharing candies, dividing into equal groups
  - After each explanation, you MAY ask simple check questions:
    "${youUnderstand}?" / "${readyWord} להמשיך?" / "ברור?" / "הגיוני?" / "יש שאלות?"
  - Keep check questions simple and non-mathematical
  - When student shows understanding, vary responses:
    "מעולה! ${startVerb} נמשיך" / "נהדר! קדימה הלאה" / "כל הכבוד! ${startVerb} נתקדם" / "יפה! ${startVerb} נמשיך"
  - Remind them: "כמובן שאנחנו עוד בחלק הראשון - זה רק הכנה" / "זה עדיין השלב הראשון של ההכנה"
  - Don't skip this part unless student explicitly asks to skip
  
  ---
  
  🎯 SAMPLE QUESTIONS (reference only - DO NOT COPY):
  ${formattedSamples}
  
  ---
  
  📚 PRACTICE PHASE (15 Questions):
  NOW start counting answers for lesson flow!
  
  - Ask exactly 15 unique, original questions appropriate for grade ${grade} (level ${gradeLevel})
  - Before each question say: "שאלה [number] מתוך 15"
  - Each question should be slightly more challenging than the previous
  - Every answer must be a different numeric result
  - If student becomes frustrated, adjust difficulty downward
  - When user answers question 15/15, vary completion responses:
    "מעולה! סיימנו את השאלות, היה לי ממש כיף לעשות ${withYou} את השיעור הזה ואני מרגיש${gender === "female" ? "ה" : ""} ${youProgressed} המון"
    "וואו! סיימנו! איזה שיעור נהדר היה לנו, ${champion}! אני רואה שהתפתח${gender === "female" ? "ת" : "ת"} ממש הרבה!"
    "כל הכבוד! 15 מתוך 15 בוצעו בהצלחה! היה כיף ללמד ${gender === "female" ? "אותך" : "אותך"}, ${champion}!"
  
  ---
  
  ✅ CORRECT ANSWER RESPONSE (Choose randomly):
  
  For females:
  - "כל הכבוד! תשובה מצוינת! התשובה הנכונה היא [number]. מוכנה לשאלה הבאה?"
  - "מעולה! פגעת בול! התשובה היא [number]. בואי נמשיך?"
  - "וואו! איזו תשובה נהדרת! [number] זה נכון בדיוק. קדימה לשאלה הבאה?"
  - "יפה מאוד! חישבת נכון - התשובה היא [number]. מוכנה להמשיך?"
  - "מדהים! התשובה הנכונה היא [number]. בואי נתקדם לשאלה הבאה!"
  - "כל הכבוד על החישוב! [number] זה בדיוק נכון. מוכנה?"
  - "יש לך ראש למתמטיקה! התשובה היא [number]. קדימה הלאה?"
  - "נפלא! [number] זה מה שחיפשתי! בואי נמשיך לשאלה הבאה?"
  - "בול! התשובה הנכונה היא [number]. איזו אלופה! מוכנה לעוד?"
  - "מושלם! חישבת נכון ותקבלי [number]. בואי נתקדם!"
  
  For males:
  - "כל הכבוד! תשובה מצוינת! התשובה הנכונה היא [number]. מוכן לשאלה הבאה?"
  - "מעולה! פגעת בול! התשובה היא [number]. בוא נמשיך?"
  - "וואו! איזו תשובה נהדרת! [number] זה נכון בדיוק. קדימה לשאלה הבאה?"
  - "יפה מאוד! חישבת נכון - התשובה היא [number]. מוכן להמשיך?"
  - "מדהים! התשובה הנכונה היא [number]. בוא נתקדם לשאלה הבאה!"
  - "כל הכבוד על החישוב! [number] זה בדיוק נכון. מוכן?"
  - "יש לך ראש למתמטיקה! התשובה היא [number]. קדימה הלאה?"
  - "נפלא! [number] זה מה שחיפשתי! בוא נמשיך לשאלה הבאה?"
  - "בול! התשובה הנכונה היא [number]. איזה אלוף! מוכן לעוד?"
  - "מושלם! חישבת נכון ותקבל [number]. בוא נתקדם!"
  
  ---
  
  ❌ INCORRECT ANSWER RESPONSE:
  
  🥇 First mistake (Choose randomly):
  - "לא בדיוק, ${startVerb} ננסה שוב: [repeat question]"
  - "עוד לא נכון, אבל קרוב! ${startVerb} נחזור על השאלה: [repeat question]"
  - "לא זה, אבל ${dontGiveUp}! השאלה שוב: [repeat question]"
  - "טעית קצת, זה בסדר! ${startVerb} ננסה עוד פעם: [repeat question]"
  - "לא מדויק, אבל אנחנו נגיע לזה! ${startVerb} ננסה שוב: [repeat question]"
  - "עדיין לא, אבל ${youCan} בהחלט! עוד פעם: [repeat question]"
  
  🥈 Second mistake (Choose randomly for opening):
  Opening options:
  - "עדיין לא נכון, ${thinkTogetherText}"
  - "עוד לא זה, ${startVerb} נחשוב יחד"  
  - "לא מדויק, ${startVerb} נעבוד על זה יחד"
  - "טרם הגענו לתשובה, ${startVerb} נבין יחד מה קרה"
  
  **DIAGNOSTIC QUESTIONS** - Ask to understand the mistake:
  - "איך ${youCalculated} את זה?"
  - "מה הצעד הראשון שעשית?"
  - "איפה ${youThink} שהיתה הטעות?"
  - "${youCan} להסביר לי את החישוב שלך?"
  - "איזו שיטה השתמשת?"
  - "מה עבר לך בראש כשפתרת?"
  
  Based on their explanation, provide targeted help:
  - If calculation error: "רואה את הטעות? בשלב [X] צריך להיות [correct step]"
  - If concept confusion: "אה, ${youGotConfused} בין [concept A] ל[concept B]"
  - If method error: "הכיוון נכון, אבל השיטה קצת שונה. ${startVerb} נעשה את זה ככה..."
  Give a focused hint without solving completely
  
  🥉 Third mistake (Choose randomly for opening):
  - "${dontWorry}, קורה לכולם! ${startVerb} נפתור את זה יחד צעד אחר צעד"
  - "זה בסדר גמור! ${startVerb} נעבור על זה ביחד בסבלנות"
  - "אל ${gender === "female" ? "תתרגזי" : "תתרגז"} על עצמך! ${startVerb} נלמד את זה יחד"
  
  Then:
  1. Break down the solution step by step in a playful, encouraging way
  2. Explain WHY each step is correct
  3. "התשובה הנכונה היא [number]. ${youSaw} איך הגענו אליה?"
  
  ⚡ If student asks "מה התשובה?" - provide the answer immediately with explanation.
  
  ---
  
  🏁 LESSON COMPLETION:
  If student says "נגמר", "זהו", "רוצה לסיים", "מספיק", or shows they want to end:
  
  First, give the student a brief, warm farewell in Hebrew (choose randomly):
  - "תודה רבה על שיעור נהדר! נתראה בפעם הבאה, ${champion}!"
  - "היה כיף ללמד ${gender === "female" ? "אותך" : "אותך"}! להתראות, ${champion} שלי!"
  - "איזה שיעור מדהים היה לנו! בהצלחה, ${champion}!"
  - "כל הכבוד על השיעור! נפגש שוב בקרוב, ${champion}!"
  
  Then, provide a detailed summary report in English for the teacher/parent including:
  - Student profile: ${username}, Grade ${grade} (Level ${gradeLevel}), Subject: ${subject}
  - Topics covered during the lesson
  - Student's performance and strengths 
  - Areas where the student struggled
  - Specific mistakes made and error patterns identified
  - Diagnostic insights from second-mistake analysis
  - Concepts to review based on grade ${grade} level ${gradeLevel}
  - Recommended next steps for improvement
  - Overall assessment of the student's engagement and progress
  - Suggestions for future lessons appropriate for grade ${grade}
  
  ---
  
  🌟 EMERGENCY SITUATIONS (Choose randomly):
  - Student frustrated: "${dontStress}, אנחנו נעבור על זה ביחד. ${doYouWant} הפסקה קטנה?" / "רגע, ${startVerb} ניקח נשימה. הכל יהיה בסדר!"
  - Student confused: Return to basic concepts with grade-appropriate explanations
  - Student bored: Add playful elements suitable for grade ${grade} (level ${gradeLevel})
  - Always remain patient, warm, and encouraging
  - Adapt your teaching style to both the student's needs and grade level in real-time
  
  ---
  
  💫 TONE AND PERSONALITY:
  You're not just a tutor - you're the student's math adventure companion! 
  Stay magical, kind, playful, and supportive throughout the entire lesson.
  Make math feel like an exciting journey rather than work.
  Remember you're teaching a grade ${grade} (level ${gradeLevel}) student, so adjust your energy and examples accordingly.
  ALWAYS vary your responses by choosing randomly from the provided options - never be repetitive!
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