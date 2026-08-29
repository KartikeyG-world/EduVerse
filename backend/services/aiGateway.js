const axios = require("axios");

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/**
 * Unified AI Gateway for managing LLM completions across EduVerse
 * Handles model selection, fallback retries, token caps, timeouts, and error normalization.
 */
const generateAICompletion = async ({
  messages,
  model = "openai/gpt-3.5-turbo",
  maxTokens = null,
  temperature = 0.7,
  timeoutMs = 15000
}) => {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("AI_NOT_CONFIGURED: OpenRouter / OpenAI API key is missing");
  }

  const configuredMax = parseInt(process.env.AI_MAX_TOKENS, 10) || 2500;
  const MAX_TOKENS = maxTokens ? Math.min(maxTokens, 4000) : Math.min(configuredMax, 3500);

  try {
    const response = await axios.post(
      OPENROUTER_URL,
      {
        model,
        messages,
        max_tokens: MAX_TOKENS,
        temperature
      },
      {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.FRONTEND_URL || "https://edu-verse-psi.vercel.app",
          "X-OpenRouter-Title": "EduVerse AI"
        },
        timeout: timeoutMs
      }
    );

    const content = response.data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Invalid response format from OpenRouter AI");
    }

    return content;
  } catch (error) {
    const status = error?.response?.status;
    const msg = error?.response?.data?.error?.message || error.message;

    if (status === 402) {
      throw new Error("AI_CREDIT_LIMIT: AI unavailable. Try again shortly.");
    }
    if (status === 429) {
      throw new Error("AI_RATE_LIMIT: Too many requests. Wait and retry.");
    }
    if (error.code === "ECONNABORTED" || msg.includes("timeout")) {
      throw new Error("AI_TIMEOUT: AI request timed out. Please try again.");
    }
    throw new Error(msg);
  }
};

/**
 * Robust helper to extract and safely parse JSON from AI outputs,
 * handling markdown code fences, trailing commas, and incomplete blocks.
 */
const parseJSONSafely = (text) => {
  if (!text || typeof text !== "string") {
    throw new Error("Invalid input to JSON parser");
  }

  let cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();

  // Try direct parse first
  try {
    return JSON.parse(cleaned);
  } catch (_) {}

  // Attempt trailing comma repair
  try {
    const repaired = cleaned.replace(/,\s*([\]}])/g, "$1");
    return JSON.parse(repaired);
  } catch (_) {}

  // Attempt regex block recovery for roadmaps/arrays
  try {
    const dayObjects = [];
    const objectPattern = /\{\s*"day"\s*:\s*\d+[\s\S]*?"tasks"\s*:\s*\[[\s\S]*?\]\s*\}/g;
    let match;
    while ((match = objectPattern.exec(cleaned)) !== null) {
      try {
        const obj = JSON.parse(match[0]);
        if (obj.day && obj.topic && Array.isArray(obj.tasks)) {
          dayObjects.push(obj);
        }
      } catch (_) {}
    }

    if (dayObjects.length > 0) {
      return { roadmap: dayObjects };
    }
  } catch (_) {}

  throw new Error("Invalid JSON structure returned by AI");
};

module.exports = {
  generateAICompletion,
  parseJSONSafely
};
