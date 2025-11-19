import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { BotPersona } from "../types";

// We maintain a map of chat sessions per room to keep context
const chatSessions: Record<string, Chat> = {};

let ai: GoogleGenAI | null = null;

const getAI = () => {
  if (!ai) {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.error("API_KEY is missing from environment variables.");
      return null;
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
};

export const sendMessageToBot = async (
  roomId: string, 
  userMessage: string, 
  persona: BotPersona
): Promise<string> => {
  const client = getAI();
  if (!client) return "Ошибка: API ключ не найден.";

  try {
    // Initialize chat session for this room if it doesn't exist
    if (!chatSessions[roomId]) {
      chatSessions[roomId] = client.chats.create({
        model: "gemini-2.5-flash",
        config: {
          systemInstruction: persona.systemInstruction,
          temperature: persona.temperature,
        },
      });
    }

    const chat = chatSessions[roomId];
    
    // Send the user's message to the "Room" (Bot)
    const response: GenerateContentResponse = await chat.sendMessage({
      message: userMessage
    });

    return response.text || "...";
  } catch (error) {
    console.error("Error talking to Gemini:", error);
    return "Что-то пошло не так... (Сбой связи)";
  }
};

export const generateAIAvatar = async (prompt: string): Promise<string | undefined> => {
  const client = getAI();
  if (!client) return undefined;

  try {
    const response = await client.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: `Avatar icon, ${prompt}`,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '1:1',
      },
    });

    return response.generatedImages?.[0]?.image?.imageBytes;
  } catch (error) {
    console.error("Error generating avatar:", error);
    return undefined;
  }
};