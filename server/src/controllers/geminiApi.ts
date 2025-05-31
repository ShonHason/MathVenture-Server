import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { GoogleGenAI, createUserContent, createModelContent } from "@google/genai";
import lessonsModel from "../modules/lessonsModel";
import { progressType } from "../modules/enum/progress";

// 1) Load & override the root .env
const envPath = path.resolve(__dirname, "../../.env");
if (!fs.existsSync(envPath)) {
  throw new Error(`❌ [geminiApi] No .env at ${envPath}`);
}
dotenv.config({ path: envPath, override: true });

// 2) Instantiate the Gemini client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? "" });

// 3) Safely evaluate arithmetic expressions (fallback for quick math)
function calculateExpression(expr: string): number {
  if (!/^[0-9+\-*/().\s]+$/.test(expr)) {
    throw new Error(`Invalid characters in expression: "${expr}"`);
  }
  // eslint-disable-next-line no-new-func
  const fn = new Function(`"use strict"; return (${expr});`);
  const result = fn();
  if (typeof result !== "number" || Number.isNaN(result)) {
    throw new Error(`Could not compute expression: "${expr}"`);
  }
  return result;
}

export async function askQuestion(
  question: string,
  _unusedContext: string,
  lessonId?: string
): Promise<string> {
  if (!lessonId) throw new Error("Lesson ID is required");

  // Fetch lesson
  const lesson = await lessonsModel.findById(lessonId);
  if (!lesson) throw new Error("Lesson not found");
  if (lesson.progress === progressType.NOT_STARTED) {
    lesson.progress = progressType.IN_PROGRESS;
  }

  // Detect math-only queries
  const isMath = /^[0-9+\-*/().\s=]+$/.test(question.trim());
  if (isMath) {
    // Compute and return JSON payload
    const expression = question.replace(/[^0-9+\-*/().]/g, "");
    const result = calculateExpression(expression);
    lesson.mathQuestionsCount = (lesson.mathQuestionsCount || 0) + 1;
    if (lesson.mathQuestionsCount >= 15) {
      lesson.progress = progressType.DONE;
      await lesson.save();
      return JSON.stringify({
        done: true,
        message: "You have completed the math questions. Please proceed to the next lesson.",
      });
    }
    await lesson.save();
    return JSON.stringify({ type: "math", question, expression, result });
  }

  // Build chat history as Content[]
  const history = lesson.messages.map((m) => {
    if (m.role === "assistant") {
      return createModelContent(m.content);
    } else {
      return createUserContent(m.content);
    }
  });

  // System prompt
  const systemPrompt = `You are a friendly Hebrew tutor. Reply in plain Hebrew, keep explanations warm and engaging.`;

  // Create a chat session
  const chat = ai.chats.create({
    model: "gemini-2.0-flash",
    config: {
      temperature: 0.7,
      maxOutputTokens: 350,
      systemInstruction: createUserContent(systemPrompt),
    },
    history,
  });

  // Send the user question
  const response = await chat.sendMessage({ message: question });
  const answer = response.text?.trim() ?? "";

  // Save question & answer to lesson
  lesson.messages.push({ role: "user", content: question });
  lesson.messages.push({ role: "assistant", content: answer });
  await lesson.save();

  return answer;
}