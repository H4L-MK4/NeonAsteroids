import { GoogleGenAI } from "@google/genai";
import { AIResponse } from "../types";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY is not set");
  return new GoogleGenAI({ apiKey });
};

// Thinking Mode: Generates deep lore or strategy
// Uses gemini-3-pro-preview with high thinking budget
export const getMissionBriefing = async (topic: string): Promise<string> => {
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Generate a sci-fi mission briefing for an elite asteroid miner pilot. Topic: ${topic}. Keep it immersive, intense, and under 150 words.`,
      config: {
        thinkingConfig: { thinkingBudget: 32768 }, // Max budget for complex creative generation
      }
    });
    
    return response.text || "Communication jam detected. Mission data unavailable.";
  } catch (error) {
    console.error("Mission Briefing Error:", error);
    return "Tactical computer offline.";
  }
};

// Search Grounding: Gets real-world space facts
// Uses gemini-2.5-flash with googleSearch tool
export const getDailySpaceFact = async (): Promise<AIResponse> => {
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: "What is a breaking or interesting recent discovery about asteroids, space mining, or deep space exploration? Keep it brief (one sentence).",
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const sources = groundingChunks
      ?.map((chunk) => chunk.web)
      .filter((web): web is { uri: string; title: string } => !!web && !!web.uri && !!web.title) || [];

    return {
      text: response.text || "Scanning deep space network...",
      sources: sources
    };
  } catch (error) {
    console.error("Space Fact Error:", error);
    return { text: "Deep space network unreachable." };
  }
};

// General Helper for analyzing game performance (Thinking Mode Lite)
export const analyzePerformance = async (score: number, accuracy: number): Promise<string> => {
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Analyze the pilot's performance. Score: ${score}, Accuracy: ${accuracy}%. Provide a ruthless robotic critique or praise.`,
      config: {
         thinkingConfig: { thinkingBudget: 2048 }, // Smaller budget for quick feedback
      }
    });
    return response.text || "Analysis failed.";
  } catch (error) {
    return "Data corruption.";
  }
};