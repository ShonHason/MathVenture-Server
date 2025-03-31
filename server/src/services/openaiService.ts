// src/services/openaiService.ts

// Create a helper to cache the dynamic import
let openaiModulePromise: Promise<any> | null = null;
const getOpenAIModule = () => {
  if (!openaiModulePromise) {
    openaiModulePromise = import("openai");
  }
  return openaiModulePromise;
};

export const generateLessonContent = async (
  prompt: string
): Promise<string | undefined> => {
  try {
    // Dynamically import and cache the openai module
    const { Configuration, OpenAIApi } = await getOpenAIModule();

    // Initialize the configuration and client
    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    });
    const openai = new OpenAIApi(configuration);

    // Call the GPT-4 API endpoint
    const response = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "You are a knowledgeable math teacher. You are going to generate questions for kids that want to learn math. You will generate a question and then provide the answer to the question. The question should be simple and easy to understand. The answer should be correct and easy to understand. The question should be related to the topic of math.",
        },
        { role: "user", content: prompt },
      ],
    });

    return response.data.choices[0].message?.content;
  } catch (error) {
    console.error("Error generating lesson content:", error);
    throw error;
  }
};
