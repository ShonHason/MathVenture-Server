import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import OpenAI from "openai";
import lessonsModel from "../modules/lessonsModel";
import { progressType } from "../modules/enum/progress";
// 1) Load & override the root .env
const envPath = path.resolve(__dirname, "../../.env");
console.log("📦 [openAiApi] Loading .env from:", envPath);

if (!fs.existsSync(envPath)) {
  throw new Error(`❌ [openAiApi] No .env at ${envPath}`);
}
console.log("📄 [openAiApi] .env contents:\n", fs.readFileSync(envPath, "utf-8"));

dotenv.config({ path: envPath, override: true });

// 2) Confirm the key in memory
console.log(
  "🔑 [openAiApi] OPENAI_API_KEY after override:",
  process.env.OPENAI_API_KEY?.slice(0, 12)
);

// 3) Now require the OpenAI SDK (non-hoisted)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "" });


// 4) Your imports/models come next


type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

/**
 * Sends a question (and optional context) to OpenAI's Chat API and returns the answer.
 */
export async function askQuestion(
  question: string,
  _unusedContext: string,
  lessonId?: string
): Promise<string> {
  // Fetch lesson
  const lesson = await lessonsModel.findById(lessonId);
  if (!lesson) throw new Error("Lesson not found");
  if (lesson.progress === "NOT_STARTED" || lesson.progress === "PAUSED") {
    lesson.progress = progressType.IN_PROGRESS;
  }

  // Rehydrate history
  const messages: ChatMessage[] = lesson.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));
  messages.push({ role: "user", content: question });
  lesson.messages.push({ role: "user", content: question });

  // Call OpenAI
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages,
    temperature: 0.7,
    max_tokens: 350,
  });

  const answer = response.choices[0].message?.content?.trim() ?? "";

  // Save the reply
  lesson.messages.push({ role: "assistant", content: answer });
  await lesson.save();

  return answer;
}
