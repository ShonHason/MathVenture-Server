import OpenAI from "openai";
import lessonsModel from "../modules/lessonsModel";
import { progressType } from "../modules/enum/progress";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? "", // ensure your API key is set
});

/**
 * Sends a question (and optional context) to OpenAI's Chat API and returns the answer.
 *
 * @param question - The question to send.
 * @param context - Optional context object.
 * @returns A Promise resolving to the answer as a string.
 */
// openAiApi.ts
export async function askQuestion(
  question: string,
  _unusedContext: string,
  lessonId?: string
): Promise<string> {
  // 1. fetch the lesson from DB
  const lesson = await lessonsModel.findById(lessonId);
  if (!lesson) throw new Error("Lesson not found");

    if (lesson.progress === "NOT_STARTED" || lesson.progress === "PAUSED") {
    lesson.progress = progressType.IN_PROGRESS ;
    }

    // 2. rehydrate your conversation history
  const messages: ChatMessage[] = lesson.messages.map((m: ChatMessage) => ({
    role: m.role,
    content: m.content,
  }));

  // 3. push the new user question
  messages.push({ role: "user", content: question });
  lesson.messages.push({ role: "user", content: question });

  // 4. call OpenAI
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages,
    temperature: 0.7,
    max_tokens: 150,
  });

  const answer = response.choices[0].message?.content?.trim() ?? "";
  // 5. save the assistant’s reply
  lesson.messages.push({ role: "assistant", content: answer });
  await lesson.save();

  return answer;
}
