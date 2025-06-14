import lessonsModel, { ILesson } from "../modules/lessonsModel";
import { Request, Response, NextFunction } from "express";
import { BaseController } from "./baseController";

import { generateLessonPdf } from "../services/pdfGenerator";
import { generateLessonReportEmail } from "../services/genericEmailPage";
import mongoose from "mongoose";
import { askQuestion } from "./geminiApi";
import { textToSpeechConvert } from "./APIController/ttsController";
import sgMail from "@sendgrid/mail";
import UserModel from "../modules/userModel";
import { GoogleGenAI, createUserContent } from "@google/genai";
import { sendAndLogEmail } from "./emailController";
sgMail.setApiKey(process.env.SENDGRID_API_KEY || "");
import { User } from "../modules/userModel";
import path from "path";
import fs from "fs";
import { rejects } from "assert";
// In-memory map to hold the latest expression for each lessonId
// Key: lessonId, Value: arithmetic expression string (e.g. "2+3")
const pendingQuestionKeys: Record<string, string> = {};
// how do i get the student name and parent name from the request?

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? "" });

async function lessonSummaryGemini(
  chatMessages: { role: string; content: string }[]
): Promise<string | null> {
  console.log("lessonSummaryGemini - Gemini API");
  try {
    const payload = {
      chat: JSON.stringify(chatMessages, null, 2),
    };
    const userPrompt = `
Return ONLY valid JSON with NO markdown formatting, no \`\`\` backticks. The JSON should have this exact structure:

{
  "נושא השיעור": "Topic of the lesson in Hebrew",
  "אחוז הצלחה": number between 0-100,
  "טיפים לשיפור": "Improvement tips in Hebrew",
  "חוזקות": "Student strengths in Hebrew",
  "שיעורי בית": [
    {"שאלה": "Question 1"},
    {"שאלה": "Question 2"},
    ...more questions
  ]
}

INSTRUCTIONS IN ENGLISH:

1. LESSON TOPIC: Extract the main mathematical topic from the chat history.

2. אחוז הצלחה: Calculate by analyzing Part 2 of the lesson where there are exactly 15 questions:
   - Identify all questions in Part 2 (look for "שְׁאֵלָה מִסְפָּר X מִתּוֹךְ 15")
   - Count how many were answered correctly (look for responses indicating correct answers)
   - Calculate: (number of correct answers / 15) * 100
   - Example: If 10 out of 15 questions were answered correctly, אחוז הצלחה = 66

3. טיפים לשיפור: Provide 3-4 practical tips for how the student can improve.

4. חוזקות: List 2-3 positive aspects of the student's performance.

5. שיעורי בית: Generate exactly 10 age-appropriate questions related to the lesson topic:
   - Start easy and gradually increase difficulty
   - Use clear mathematical language
   - Each question must be in the form: {"שאלה": "Question text"}
   - Make sure to put negative numbers in parentheses e.g., (-5)

Remember: Return ONLY clean JSON without code blocks, and KEEP all field names with spaces, NOT underscores.

Based on chat history analyze the lesson :
${payload.chat}
`;

    const chat = ai.chats.create({
      model: "gemini-2.0-flash",
      config: {
        temperature: 0.3,
        maxOutputTokens: 3000,
        systemInstruction: createUserContent(userPrompt),
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
  You are a playful, creative, and warm-hearted math tutor for ${studentHebrew} ${username}, grade ${grade}, rank: ${rank} ("${champion}").
  Always address ${studentHebrew} ${username} in Hebrew with full diacritics in both parts.
  
  ‼️‼️ CRITICAL INSTRUCTION: ABSOLUTELY NO EMOJIS IN ANY RESPONSE. DO NOT USE ANY EMOJI CHARACTERS. ‼️‼️
  
  ⚠️ NO MARKDOWN FENCES—output raw JSON only. Do not wrap the object in triple backticks or any other code block.  
  Do not include any extra text, punctuation, or emojis around the JSON.
  
  If the message is NOT one of the 15 Part 2 questions, return exactly:
  {
    "text": "<Hebrew text with full diacritics or feedback>",
    "counter": undefined
  }
  
  If the message IS one of the 15 Part 2 questions, return exactly:
  {
    "text": "שְׁאֵלָה מִסְפָּר X מִתּוֹךְ 15: <Hebrew question with full diacritics>",
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
       "text": "שְׁאֵלָה מִסְפָּר 1 מִתּוֹךְ 15: אם יש לך 2 תפוחים ועוד 3 תפוחים, כמה תפוחים סך הכל?",
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
  - CRITICAL: Include the question number INSIDE the JSON text field as shown in the example: "שְׁאֵלָה מִסְפָּר X מִתּוֹךְ 15: <question>"
  - NEVER send the question number as a separate message before the question
  - Each arithmetic expression must be new (do not reuse "2+3").
  - CRITICAL: EVERY QUESTION MUST HAVE A DIFFERENT ANSWER THAN ALL PREVIOUS QUESTIONS. You must carefully track all previous answers and ensure each new question has a unique result.
  - If you notice that a question will result in the same answer as a previous one, immediately change it to create a different result.
  - Maintain a list of all previous answers to ensure diversity.

  Answer checking (after the student replies):
  - If the student answers correctly to a Part 2 question, output exactly corrcetResponses:(pick one):
 - "נכון מאוד! תשובתך נכונה. התשובה היא <correct number>. ${gender === "female" ? "בואי" : "בוא"} נעבור לשאלה הבאה.",
  -"מעולה! הצלחת לפתור את השאלה. התשובה היא <correct number>. ${gender === "female" ? "בואי" : "בוא"} נמשיך לשאלה הבאה.",
  -"כל הכבוד! תשובתך מדויקת. התשובה היא <correct number>. ${gender === "female" ? "בואי" : "בוא"} לעוד שאלה.",
  -"נהדר! תשובתך נכונה. התשובה היא <correct number>. ${gender === "female" ? "בואי" : "בוא"} נמשיך הלאה.",
  -"איזה יופי! צדקת. התשובה היא <correct number>. ${gender === "female" ? "מוכנה" : "מוכן"} לעוד אתגר."
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
  
       
  Only reveal the numeric answer early if ${studentHebrew} explicitly asks "מה התשובה?"
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
      const {
        userId,
        subject: rawSubject,
        username,
        grade,
        rank,
        sampleQuestions,
      } = req.body;

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
      // Initialize userFacingText with a default value
      let userFacingText: string =
        "Sorry, I couldn't process your question properly.";

      // 1) Forward the student's question to Gemini
      const rawResponse: string = await askQuestion(
        studentQuestion,
        "",
        lessonId
      );

      // Add debug logging to see the raw response
      console.log(
        "Raw Gemini response:",
        rawResponse.substring(0, 100) + "..."
      );

      // More aggressive cleaning of markdown code blocks
      let cleanedResponse = rawResponse.trim();

      // First, try to remove the entire triple backtick wrapper
      if (
        cleanedResponse.startsWith("```") &&
        cleanedResponse.includes("```", 3)
      ) {
        // Strip the first line if it contains ```json
        const firstLineEnd = cleanedResponse.indexOf("\n");
        if (
          firstLineEnd > 0 &&
          cleanedResponse.substring(0, firstLineEnd).includes("```")
        ) {
          cleanedResponse = cleanedResponse.substring(firstLineEnd + 1);
        } else {
          cleanedResponse = cleanedResponse.substring(3); // Just remove the first ```
        }

        // Strip the last ``` if present
        const lastBacktickPos = cleanedResponse.lastIndexOf("```");
        if (lastBacktickPos > 0) {
          cleanedResponse = cleanedResponse
            .substring(0, lastBacktickPos)
            .trim();
        }
      }

      // Clean any remaining backticks or json labels
      cleanedResponse = cleanedResponse.replace(/```json|```/g, "").trim();

      console.log(
        "Cleaned response:",
        cleanedResponse.substring(0, 100) + "..."
      );

      try {
        // First, try direct text extraction with regex before attempting JSON parsing
        const textMatch = cleanedResponse.match(/"text"\s*:\s*"([^"]+)"/);

        if (textMatch && textMatch[1]) {
          // If regex extraction succeeds, use that directly
          userFacingText = textMatch[1]
            .replace(/\\"/g, '"')
            .replace(/\\n/g, "\n");
        } else {
          // If regex fails, try more aggressive JSON parsing

          // First remove all literal newlines completely (not replacing with \n)
          let sanitizedJson = cleanedResponse
            .replace(/\r?\n/g, "") // Remove all newlines completely
            .replace(/\t/g, " ") // Replace tabs with spaces
            .trim();

          // Ensure it's a valid JSON object format
          if (!sanitizedJson.startsWith("{")) {
            sanitizedJson = "{" + sanitizedJson;
          }
          if (!sanitizedJson.endsWith("}")) {
            sanitizedJson = sanitizedJson + "}";
          }

          console.log(
            "Sanitized JSON:",
            sanitizedJson.substring(0, 50) + "..."
          );

          try {
            const parsed = JSON.parse(sanitizedJson);

            if (parsed && typeof parsed.text === "string") {
              userFacingText = parsed.text
                .replace(/\\n/g, "\n") // Convert escaped newlines back to actual newlines
                .replace(
                  /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{27BF}]/gu,
                  ""
                );
            } else {
              throw new Error("No text field in parsed JSON");
            }
          } catch (innerError) {
            console.error("Inner JSON parse error:", innerError);

            // Fall back to simple content extraction
            if (cleanedResponse.includes("text")) {
              userFacingText = cleanedResponse
                .replace(/^.*"text"\s*:\s*"/i, "") // Remove everything before "text":"
                .replace(/".*$/i, "") // Remove everything after the closing quote
                .trim();
            }
          }
        }
      } catch (error) {
        console.error("JSON parse error:", error);

        // Special case for the lesson end message which often breaks due to multiple newlines
        if (
          cleanedResponse.includes("השיעור נגמר") ||
          cleanedResponse.includes("הַשִּׁעוּר נִגְמַר")
        ) {
          // Extract just the text content without trying to parse JSON - use [\s\S] instead of /s flag
          const endMessagePattern = /text"?\s*:\s*"([\s\S]*?)(?:"|$)/;
          const endMessageMatch = cleanedResponse.match(endMessagePattern);

          if (endMessageMatch && endMessageMatch[1]) {
            // Use the captured text, removing any trailing quotes or backslashes
            userFacingText = endMessageMatch[1]
              .replace(/\\"/g, '"')
              .replace(/\\$/g, "");
          } else {
            // If regex fails, extract everything between the first quote after "text": and the end
            const textStartIndex = cleanedResponse.indexOf('"text"') + 7;
            if (textStartIndex > 7) {
              const valueStartIndex =
                cleanedResponse.indexOf('"', textStartIndex) + 1;
              if (valueStartIndex > 0) {
                userFacingText = cleanedResponse
                  .substring(valueStartIndex)
                  .replace(/"\s*}[\s\S]*$/g, "") // Replace /s flag with [\s\S]
                  .trim();
              }
            }
          }

          // If text extraction fails, use a generic end message
          if (
            !userFacingText ||
            userFacingText ===
              "Sorry, I couldn't process your question properly."
          ) {
            userFacingText = "השיעור נגמר! תודה רבה ונתראה בשיעור הבא!";
          }
        } else {
          // Original fallback code for non-end-of-lesson messages
          if (cleanedResponse.includes('"text"')) {
            const textMatch = cleanedResponse.match(
              /"text"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/
            );
            if (textMatch && textMatch[1]) {
              userFacingText = textMatch[1]
                .replace(/\\"/g, '"')
                .replace(/\\n/g, "\n");
            } else {
              // Last resort - just return the cleaned response
              userFacingText = cleanedResponse
                .replace(/^\s*{\s*|\s*}\s*$/g, "") // Remove { and } if present
                .replace(/"text"\s*:\s*"?|"?\s*$/g, ""); // Remove "text": and quotes
            }
          }
        }
      }

      // 2) Return only the extracted text content
      res.json({ answer: userFacingText });
    } catch (err) {
      console.error("Error in chat handler:", err);
      res.status(500).json({
        error: "Server error processing chat",
        answer: "Sorry, there was a problem processing your question.",
      });
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
    console.log("analyzeLesson called");
    const {
      lessonId,
      user,
      subject: emailSubject,
    } = req.body as {
      lessonId?: string;
      user?: User;
      subject?: string;
    };

    if (
      !lessonId ||
      !user ||
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

      const chatMessages = lesson.messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const reportRaw = await lessonSummaryGemini(chatMessages);
      if (!reportRaw) {
        res.status(500).json({ error: "Failed to analyze lesson" });
        return;
      }

      // ——— IMPROVED CODE BLOCK EXTRACTION ———
      let jsonString = reportRaw.trim();
      let analysisObj: any;

      try {
        // First try direct parsing (in case it's already clean JSON)
        try {
          analysisObj = JSON.parse(jsonString);
        } catch (directParseErr) {
          // If direct parsing fails, try to extract from code block

          // Look for code block with any language identifier (```json, ```, etc.)
          const fenceMatch = jsonString.match(/```(?:\w*)?\s*([\s\S]*?)\s*```/);
          if (fenceMatch && fenceMatch[1]) {
            const extractedContent = fenceMatch[1].trim();

            // Try parsing the extracted content
            try {
              analysisObj = JSON.parse(extractedContent);
            } catch (extractedParseErr) {
              // If still failing, try a more aggressive approach - find content between first and last ```
              const startIndex = jsonString.indexOf("```") + 3;
              const endIndex = jsonString.lastIndexOf("```");

              if (startIndex > 3 && endIndex > startIndex) {
                // Skip past any language identifier after the first ```
                const afterTicksContent = jsonString.substring(startIndex);
                const newLineIndex = afterTicksContent.indexOf("\n");

                if (newLineIndex !== -1) {
                  const contentStart = startIndex + newLineIndex + 1;
                  const contentEnd = endIndex;
                  const lastResortContent = jsonString
                    .substring(contentStart, contentEnd)
                    .trim();

                  analysisObj = JSON.parse(lastResortContent);
                } else {
                  throw new Error("No content after backticks");
                }
              } else {
                throw new Error("Invalid code block format");
              }
            }
          } else {
            throw new Error("No code block found in response");
          }
        }
      } catch (parseErr) {
        console.error("Failed to parse analysis JSON:", parseErr);
        // Log the actual content for debugging
        console.error(
          "Raw content received:",
          reportRaw.substring(0, 200) + "..."
        );
        res.status(500).json({ error: "Analysis returned invalid JSON" });
        return;
      }

      // send the lesson report by email
      const htmlContent = generateLessonReportEmail({
        studentName: user.fullname || user.parent_name, // Use student_name if available, or fallback to name
        parentName: user.parent_name || user.fullname, // Use parent_name if available, or fallback to name
        lessonSubject: analysisObj["נושא השיעור"] || emailSubject,
      });

      const pdfBuffer = await generateLessonPdf(analysisObj);
      const attachment = {
        content: pdfBuffer.toString("base64"),
        filename: `lesson_report_${lessonId}.pdf`,
        type: "application/pdf",
        disposition: "attachment",
      };

      const { success, recordId } = await sendAndLogEmail(
        user,
        `דוח שיעור על ${analysisObj["נושא השיעור"] || emailSubject}`,
        "להלן דוח השיעור שלך בקובץ מצורף.",
        [attachment], // <-- pass the PDF here,
        htmlContent // <-- pass the HTML content here
      );

      console.log("Email sent:", { success, recordId });

      // Mark lesson as DONE
      await lessonsModel.findByIdAndUpdate(lessonId, {
        progress: "DONE",
        endTime: new Date(),
      });

      res.status(success ? 200 : 500).json({ success, recordId });
      return;
    } catch (err) {
      console.error("analyzeLesson error:", err);
      res.status(500).json({ error: "Server error analyzing lesson" });
      return;
    }
  }
}

export default new LessonsController();
