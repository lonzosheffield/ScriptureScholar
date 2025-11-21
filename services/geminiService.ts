import { GoogleGenAI, Type } from "@google/genai";
import { Question } from "../types";

// We'll generate partial objects and map them to our internal Question structure
interface GeneratedQuestion {
  text: string;
  options: string[];
  correctOptionIndex: number;
  reference: string;
  difficulty: string;
  category: string;
}

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found");
  }
  return new GoogleGenAI({ apiKey });
}

export const generateBibleQuestions = async (
  count: number = 5, 
  topic: string = "General Bible Knowledge"
): Promise<Question[]> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Generate ${count} multiple-choice Bible trivia questions about "${topic}". 
      The difficulty should vary between Easy, Medium, and Hard.
      Ensure the 'correctOptionIndex' is the 0-based index of the correct answer in the 'options' array.
      Ensure 'reference' points to a valid Bible verse or passage.
      Assign a broad 'category' like 'Old Testament', 'New Testament', 'Gospels', 'Prophecy', or 'History'.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING, description: "The question text" },
              options: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "An array of 4 possible answers"
              },
              correctOptionIndex: { type: Type.INTEGER, description: "Index (0-3) of the correct answer" },
              reference: { type: Type.STRING, description: "Bible reference (e.g., John 3:16)" },
              difficulty: { type: Type.STRING, description: "Easy, Medium, or Hard" },
              category: { type: Type.STRING, description: "Category of the question" }
            },
            required: ["text", "options", "correctOptionIndex", "reference", "difficulty", "category"]
          }
        }
      }
    });

    const rawData = response.text;
    if (!rawData) {
      throw new Error("No content returned from Gemini");
    }

    const parsedData = JSON.parse(rawData) as GeneratedQuestion[];

    // Transform to our internal Question type with unique IDs
    return parsedData.map((q) => ({
      ...q,
      id: crypto.randomUUID(),
      difficulty: (['Easy', 'Medium', 'Hard'].includes(q.difficulty) ? q.difficulty : 'Medium') as 'Easy' | 'Medium' | 'Hard',
    }));

  } catch (error) {
    console.error("Error generating questions:", error);
    throw error;
  }
};

export const getVerseContext = async (reference: string, questionText: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Provide a concise (max 2 sentences) historical, theological, or cultural context insight regarding the Bible verse "${reference}" relevant to this question: "${questionText}". Keep it educational and fascinating.`,
    });

    return response.text || "Context unavailable.";
  } catch (error) {
    console.error("Error getting context:", error);
    return "Unable to load context at this time.";
  }
};