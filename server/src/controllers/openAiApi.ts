import OpenAI from "openai";

// Create your own message type (we only need system and user for now)
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
export async function askQuestion(question: string, context?: string): Promise<string> {
  try {
    // Build the messages array. If you have context, include it as a system message.
    const messages: ChatMessage[] = [];
    if (context) {
      messages.push({
        role: "system",
        content: JSON.stringify(context),
      });
    }
    messages.push({
      role: "user",
      content: question,
    });

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages,
      temperature: 0.7,
      max_tokens: 150,
    });

    // Ensure the response contains choices and a valid message
    const answer = response.choices?.[0]?.message?.content?.trim();
    return answer || "";
  } catch (error) {
    console.error("Error asking question:", error);
    throw error;
  }
}
