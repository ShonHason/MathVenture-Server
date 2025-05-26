import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import OpenAI from "openai";
import lessonsModel from "../modules/lessonsModel";
import { progressType } from "../modules/enum/progress";

// 1) Load & override the root .env
const envPath = path.resolve(__dirname, "../../.env");
if (!fs.existsSync(envPath)) {
  throw new Error(`❌ [openAiApi] No .env at ${envPath}`);
}
dotenv.config({ path: envPath, override: true });

// 2) Instantiate the OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "" });

// 3) Safely evaluate arithmetic expressions
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

// 4) Our message type
type ChatMessage =
  | { role: "system" | "user" | "assistant"; content: string }
  | { role: "function"; name: string; content: string };

export async function askQuestion(
  question: string,
  _unusedContext: string,
  lessonId?: string
): Promise<string> {
  // Fetch & update lesson
  const lesson = await lessonsModel.findById(lessonId);
  if (!lesson) throw new Error("Lesson not found");
    if (
      lesson.progress === progressType.NOT_STARTED 
    ) 
    {
    lesson.progress = progressType.IN_PROGRESS;
  }

  // Build history
  const history: ChatMessage[] = lesson.messages.map((m) => ({
    role: m.role as "system" | "user" | "assistant",
    content: m.content,
  }));

  // Detect math
  const isMath = /[0-9+\-*/=]/.test(question);

  // System prompt for math vs chat
  history.unshift({
    role: "system",
    content: isMath
      ? `
For any arithmetic the student asks, call "calculate" with the raw expression.
Then wrap your reply ONLY as JSON:
{"type":"math","question":"<the question text>","expression":"<the expression>"}
Do NOT output any extra text.
      `.trim()
      : `
You are a friendly Hebrew tutor. For non-math chat, reply in plain Hebrew, no JSON.
      `.trim(),
  });

  // Append user
  history.push({ role: "user", content: question });
  lesson.messages.push({ role: "user", content: question });

  // Prepare params (omit empty functions array)
  const params: any = {
    model: "gpt-3.5-turbo",
    messages: history,
    temperature: 0.7,
    max_tokens: 350,
  };
  if (isMath) {
    params.functions = [
      {
        name: "calculate",
        description: "Perform basic arithmetic",
        parameters: {
          type: "object",
          properties: { expression: { type: "string" } },
          required: ["expression"],
        },
      },
    ];
    params.function_call = { name: "calculate" };
  }

  // 1) First call
  const firstResp = await openai.chat.completions.create(params);
  const msg = firstResp.choices[0].message!;
  let assistantContent: string;

  if (msg.function_call?.name === "calculate") {
    // 2) Model asked for calc
    history.push({
      role: "function",
      name: "calculate",
      content: msg.function_call.arguments || "",
    });
    const args = JSON.parse(msg.function_call.arguments || "{}");
    let result: number;
    try {
      result = calculateExpression(args.expression);
    } catch {
      result = NaN;
    }
    history.push({
      role: "function",
      name: "calculate",
      content: String(result),
    });

    // 3) Second call to wrap in JSON
    const second = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: history,
      temperature: 0.7,
      max_tokens: 150,
    });
    assistantContent = second.choices[0].message?.content?.trim() ?? "";
  } else {
    // Plain chat
    assistantContent = msg.content?.trim() ?? "";
  }

  // 4) Parse & fallback
  let answer: string;
  if (isMath) {
    let payload: { type: string; question: string };
    try {
      payload = JSON.parse(assistantContent);
    } catch {
      // fallback: assume it's the question text itself
      payload = { type: "math", question: assistantContent };
    }
    answer = payload.question;

    // count math
    lesson.mathQuestionsCount = (lesson.mathQuestionsCount || 0) + 1;
    if (lesson.mathQuestionsCount >= 15) {
      lesson.progress = progressType.DONE;
      await lesson.save();
      return JSON.stringify({
        done: true,
        message:
          "You have completed the math questions. Please proceed to the next lesson.",
      });
    }
  } else {
    // chat
    answer = assistantContent;
  }

  // 5) Save & return
  lesson.messages.push({ role: "assistant", content: answer });
  await lesson.save();
  return answer;
}
