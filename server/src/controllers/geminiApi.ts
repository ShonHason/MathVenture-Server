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
  console.log("askQuestion - Gemini API");
  if (!lessonId) throw new Error("Lesson ID is required");

  // Fetch lesson
  const lesson = await lessonsModel.findById(lessonId);
  if (!lesson) throw new Error("Lesson not found");
  if (lesson.progress === progressType.NOT_STARTED) {
    lesson.progress = progressType.IN_PROGRESS;
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
      temperature: 0.8,
      maxOutputTokens: 500,
      systemInstruction: createUserContent(systemPrompt),
    },
    history,
  });

  // Send the user question
  const response = await chat.sendMessage({ message: question });
  const answer = response.text?.trim() ?? "";
console.log("Gemini response:", answer);
  
  // Save question & answer to lesson
  lesson.messages.push({ role: "user", content: question });
  lesson.messages.push({ role: "assistant", content: answer });
  await lesson.save();

  return answer;
}