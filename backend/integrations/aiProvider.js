const axios = require('axios');

/**
 * AI Provider Integration for Watch-Range Bilingual Quiz Generation
 * Supports multi-provider priority fallback, strict JSON repair, and Layer 3 quality judging.
 */

const DEFAULT_TIMEOUT_MS = 25000;

// AI Provider Circuit Breaker (FIX 9)
// Tracks provider failure counts and cools down failing providers for 60s to prevent request blocking
const circuitState = {
  openrouter: { failures: 0, state: 'CLOSED', cooldownUntil: 0 },
  openai: { failures: 0, state: 'CLOSED', cooldownUntil: 0 },
  groq: { failures: 0, state: 'CLOSED', cooldownUntil: 0 }
};
const FAILURE_THRESHOLD = 3;
const COOLDOWN_MS = 60000; // 60s cooldown

const isProviderAvailable = (provider) => {
  const c = circuitState[provider];
  if (!c) return true;
  if (c.state === 'OPEN') {
    if (Date.now() > c.cooldownUntil) {
      c.state = 'HALF_OPEN';
      return true;
    }
    return false;
  }
  return true;
};

const recordProviderSuccess = (provider) => {
  if (circuitState[provider]) {
    circuitState[provider].failures = 0;
    circuitState[provider].state = 'CLOSED';
    circuitState[provider].cooldownUntil = 0;
  }
};

const recordProviderFailure = (provider) => {
  if (!circuitState[provider]) {
    circuitState[provider] = { failures: 0, state: 'CLOSED', cooldownUntil: 0 };
  }
  const c = circuitState[provider];
  c.failures += 1;
  if (c.failures >= FAILURE_THRESHOLD || c.state === 'HALF_OPEN') {
    c.state = 'OPEN';
    c.cooldownUntil = Date.now() + COOLDOWN_MS;
    console.warn(`[CircuitBreaker] Provider ${provider} circuit OPEN (cooling down for 60s until ${new Date(c.cooldownUntil).toISOString()})`);
  }
};

/**
 * Sleep helper for exponential backoff
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Raw chat completion caller across configured providers
 */
const callChatCompletion = async (messages, options = {}) => {
  const priorityStr = process.env.AI_PROVIDER_PRIORITY || 'openrouter,openai,groq';
  const providers = priorityStr.split(',').map((p) => p.trim().toLowerCase()).filter(Boolean);

  let lastError = null;

  for (const provider of providers) {
    if (!isProviderAvailable(provider)) {
      console.warn(`[CircuitBreaker] Skipping unavailable/cooling provider: ${provider}`);
      continue;
    }

    let endpoint = '';
    let apiKey = '';
    let model = options.model;
    let headers = { 'Content-Type': 'application/json' };

    if (provider === 'openrouter') {
      apiKey = (process.env.OPENROUTER_API_KEY || '').trim();
      if (!apiKey) continue;
      endpoint = 'https://openrouter.ai/api/v1/chat/completions';
      model = model || process.env.AI_MODEL || 'openai/gpt-3.5-turbo';
      headers['Authorization'] = `Bearer ${apiKey}`;
      headers['HTTP-Referer'] = process.env.FRONTEND_URL || 'https://edu-verse-psi.vercel.app';
      headers['X-OpenRouter-Title'] = 'EduVerse AI Quiz Generator';
    } else if (provider === 'openai') {
      apiKey = (process.env.OPENAI_API_KEY || '').trim();
      if (!apiKey) continue;
      endpoint = 'https://api.openai.com/v1/chat/completions';
      model = model || 'gpt-3.5-turbo';
      headers['Authorization'] = `Bearer ${apiKey}`;
    } else if (provider === 'groq') {
      apiKey = (process.env.GROQ_API_KEY || '').trim();
      if (!apiKey) continue;
      endpoint = 'https://api.groq.com/openai/v1/chat/completions';
      model = model || 'llama-3.3-70b-versatile';
      headers['Authorization'] = `Bearer ${apiKey}`;
    } else {
      continue;
    }

    // Execute with up to 2 retries on 429/5xx
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const payload = {
          model,
          messages,
          temperature: options.temperature ?? 0.3,
          max_tokens: options.max_tokens ?? 2500,
        };

        const res = await axios.post(endpoint, payload, {
          headers,
          timeout: options.timeout || DEFAULT_TIMEOUT_MS,
        });

        const content = res.data?.choices?.[0]?.message?.content;
        if (!content || typeof content !== 'string') {
          throw new Error(`Empty content received from provider ${provider}`);
        }

        const totalTokens = res.data?.usage?.total_tokens || 0;

        recordProviderSuccess(provider);

        return {
          content,
          providerUsed: provider,
          modelUsed: model,
          tokensUsed: totalTokens,
        };
      } catch (err) {
        lastError = err;
        const status = err.response?.status;
        const errMsg = err.response?.data?.error?.message || err.message;

        if (status === 402) {
          console.warn(`[AIProvider] ${provider} 402 Payment/Credit Limit. Tripping circuit and skipping.`);
          recordProviderFailure(provider);
          break; // move to next provider immediately
        }

        if (status === 429 || (status >= 500 && status < 600)) {
          if (attempt === 1) {
            const backoffMs = 1500;
            console.warn(`[AIProvider] ${provider} returned ${status} (${errMsg}). Retrying in ${backoffMs}ms...`);
            await sleep(backoffMs);
            continue;
          }
        }

        console.warn(`[AIProvider] Provider ${provider} failed on attempt ${attempt}:`, errMsg);
        recordProviderFailure(provider);
        break; // try next provider
      }
    }
  }

  throw new Error(`All AI providers failed: ${lastError?.message || 'No available provider configured'}`);
};

/**
 * Robust JSON extraction and repair for array payloads
 */
const extractJSONArray = (rawText) => {
  if (!rawText || typeof rawText !== 'string') return null;

  // Step 1: Remove markdown code block fences
  let clean = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

  // Step 2: Direct parse attempt
  try {
    const parsed = JSON.parse(clean);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.questions)) return parsed.questions;
  } catch (_) {}

  // Step 3: Match outermost bracket pair
  const firstBracket = clean.indexOf('[');
  const lastBracket = clean.lastIndexOf(']');

  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    const bracketSubstring = clean.slice(firstBracket, lastBracket + 1);
    try {
      const parsed = JSON.parse(bracketSubstring);
      if (Array.isArray(parsed)) return parsed;
    } catch (_) {
      // Step 4: Repair trailing commas or unclosed items
      const sanitized = bracketSubstring
        .replace(/,\s*([\]}])/g, '$1') // remove trailing commas
        .replace(/[\x00-\x1F\x7F]/g, ' '); // remove control chars
      try {
        const parsed = JSON.parse(sanitized);
        if (Array.isArray(parsed)) return parsed;
      } catch (_) {}
    }
  }

  return null;
};

/**
 * Layer 2: Structural and Bilingual Validation
 */
const validateQuizStructure = (questions, targetCount) => {
  if (!Array.isArray(questions) || questions.length === 0) {
    return { valid: false, error: 'Output is not a valid non-empty array' };
  }

  const seenQuestions = new Set();

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q || typeof q !== 'object') {
      return { valid: false, error: `Question #${i + 1} is not a valid object` };
    }

    const { question, questionHindi, options, optionsHindi, correctIndex, explanation } = q;

    if (!question || typeof question !== 'string' || question.trim().length < 8) {
      return { valid: false, error: `Question #${i + 1} has missing or too short English question` };
    }

    if (!questionHindi || typeof questionHindi !== 'string' || questionHindi.trim().length < 5) {
      return { valid: false, error: `Question #${i + 1} is missing a valid Hindi translation` };
    }

    if (!Array.isArray(options) || options.length !== 4) {
      return { valid: false, error: `Question #${i + 1} must have exactly 4 English options` };
    }

    if (!Array.isArray(optionsHindi) || optionsHindi.length !== 4) {
      return { valid: false, error: `Question #${i + 1} must have exactly 4 Hindi options` };
    }

    // Check duplicate options within question
    const uniqueEnOpts = new Set(options.map((o) => (typeof o === 'string' ? o.trim().toLowerCase() : '')));
    if (uniqueEnOpts.size !== 4 || uniqueEnOpts.has('')) {
      return { valid: false, error: `Question #${i + 1} has empty or duplicate English options` };
    }

    const uniqueHiOpts = new Set(optionsHindi.map((o) => (typeof o === 'string' ? o.trim() : '')));
    if (uniqueHiOpts.size !== 4 || uniqueHiOpts.has('')) {
      return { valid: false, error: `Question #${i + 1} has empty or duplicate Hindi options` };
    }

    if (typeof correctIndex !== 'number' || correctIndex < 0 || correctIndex > 3 || !Number.isInteger(correctIndex)) {
      return { valid: false, error: `Question #${i + 1} correctIndex must be an integer between 0 and 3` };
    }

    if (!explanation || typeof explanation !== 'string' || explanation.trim().length < 5) {
      return { valid: false, error: `Question #${i + 1} is missing an explanation` };
    }

    // Deduplicate questions across batch
    const normalizedQ = question.trim().toLowerCase();
    if (seenQuestions.has(normalizedQ)) {
      return { valid: false, error: `Duplicate question detected in batch: "${question}"` };
    }
    seenQuestions.add(normalizedQ);
  }

  return { valid: true, sanitizedQuestions: questions.slice(0, targetCount) };
};

/**
 * Builds the bilingual quiz generation prompt with few-shot concrete quality examples.
 */
const buildQuizPrompt = (contextData, targetCount, isAmplified = false) => {
  const { videoTitle, topicsSummary, durationSec, watchedStartSec, watchedEndSec } = contextData;

  const qualityInstructions = isAmplified
    ? `CRITICAL QUALITY REVISION:
The previous questions were rejected for being too basic/trivial.
You MUST generate deeper, application-oriented questions that test REAL understanding of what happens in this watched portion. Avoid simple definition lookups. Ask scenario-based questions where applicable.`
    : `TARGET DIFFICULTY: Intermediate. Assumes the viewer paid close attention to the concepts covered in this specific segment and can apply them.`;

  return `You are a Principal Curriculum Designer creating an assessment quiz for students watching an educational video.

${qualityInstructions}

=== LESSON CONTEXT ===
Video Title: "${videoTitle}"
Video Total Duration: ${durationSec}s
Watched Range: ${watchedStartSec}s to ${watchedEndSec}s
Lesson Content Covered in this Range:
${topicsSummary}

=== REQUIREMENTS ===
1. Generate EXACTLY ${targetCount} multiple-choice questions.
2. SCOPE: Every question must test concepts strictly covered in the watched range above.
3. LANGUAGE: Bilingual output required. Provide English ("question", "options") and accurate Hindi translation ("questionHindi", "optionsHindi").
4. FORMAT: Return ONLY a valid JSON array of objects. Do not include markdown preamble, conversational text, or backticks.

=== FEW-SHOT EXAMPLES ===

[GOOD QUESTION EXAMPLE - Conceptual & Applied]:
{
  "question": "If a function in JavaScript is executed without an explicit return statement, what does it evaluate to, and why?",
  "questionHindi": "यदि जावास्क्रिप्ट में कोई फ़ंक्शन बिना स्पष्ट return स्टेटमेंट के निष्पादित होता है, तो इसका परिणाम क्या होगा और क्यों?",
  "options": [
    "undefined, because JavaScript functions implicitly return undefined by default",
    "null, because no object was assigned to the output",
    "A ReferenceError is thrown at runtime",
    "0, as numeric default return"
  ],
  "optionsHindi": [
    "undefined, क्योंकि जावास्क्रिप्ट फ़ंक्शंस डिफ़ॉल्ट रूप से परोक्ष रूप से undefined लौटाते हैं",
    "null, क्योंकि आउटपुट के लिए कोई ऑब्जेक्ट असाइन नहीं किया गया था",
    "रनटाइम पर ReferenceError उत्पन्न होता है",
    "0, संख्यात्मक डिफ़ॉल्ट रिटर्न के रूप में"
  ],
  "correctIndex": 0,
  "explanation": "In JavaScript, functions that do not explicitly return a value evaluate to undefined automatically."
}

[BAD QUESTION EXAMPLE - Trivial / Superficial Recall - DO NOT DO THIS]:
{
  "question": "What color was the instructor's IDE background in the video?",
  "questionHindi": "वीडियो में प्रशिक्षक के IDE का बैकग्राउंड किस रंग का था?",
  "options": ["Black", "White", "Blue", "Green"],
  "optionsHindi": ["काला", "सफ़ेद", "नीला", "हरा"],
  "correctIndex": 0,
  "explanation": "The background was black."
}

=== REQUIRED JSON OUTPUT SCHEMA ===
[
  {
    "question": "Question in English?",
    "questionHindi": "प्रश्न हिंदी में?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "optionsHindi": ["विकल्प A", "विकल्प B", "विकल्प C", "विकल्प D"],
    "correctIndex": 0,
    "explanation": "Clear explanation of the correct answer."
  }
]`;
};

/**
 * Layer 3: Quality Scoring Judge
 * Lightweight evaluation scoring difficulty-appropriateness, non-triviality, and translation accuracy (1-10 scale).
 */
const judgeQuizQuality = async (questions, contextData) => {
  const sampleQuestions = questions.slice(0, 3).map((q) => ({
    q: q.question,
    q_hi: q.questionHindi,
    correct: q.options[q.correctIndex],
  }));

  const judgePrompt = [
    {
      role: 'system',
      content: 'You are an educational quality evaluation judge. Score quiz question batches on depth, intermediate difficulty, non-triviality, and translation consistency on a 1-10 scale. Respond in strict JSON only: {"score": 8, "reason": "brief reason"}',
    },
    {
      role: 'user',
      content: `Evaluate this quiz batch generated for topic "${contextData.videoTitle}".
Context: ${contextData.topicsSummary}

Sample Questions:
${JSON.stringify(sampleQuestions, null, 2)}

Score (1-10, where >=7 is rigorous/conceptual/good translation, <7 is too basic/trivial/broken Hindi):`,
    },
  ];

  try {
    const res = await callChatCompletion(judgePrompt, { temperature: 0.1, max_tokens: 150 });
    const clean = res.content.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(clean);
    const score = typeof parsed.score === 'number' ? Math.max(1, Math.min(10, parsed.score)) : 7.5;
    return { score, reason: parsed.reason || 'Judge evaluation completed' };
  } catch (err) {
    console.warn('[AIProvider:Judge] Judge pass error (defaulting to pass score 7.5):', err.message);
    return { score: 7.5, reason: 'Judge fallback pass' };
  }
};

/**
 * End-to-end Quiz Generation with 3-Layer Quality Architecture
 */
const generateBilingualQuiz = async (contextData, targetCount) => {
  const minScore = parseFloat(process.env.QUIZ_MIN_QUALITY_SCORE || '7.0');
  let attempts = 0;
  let totalTokens = 0;
  let providerUsed = 'unknown';

  for (let tryNum = 1; tryNum <= 2; tryNum++) {
    attempts++;
    const isAmplified = tryNum > 1;
    const promptText = buildQuizPrompt(contextData, targetCount, isAmplified);

    const messages = [
      {
        role: 'system',
        content: 'You are an expert educational assessment engine. You output only valid JSON arrays conforming exactly to the requested schema.',
      },
      {
        role: 'user',
        content: promptText,
      },
    ];

    let aiResult;
    try {
      aiResult = await callChatCompletion(messages, { temperature: isAmplified ? 0.4 : 0.3 });
      providerUsed = aiResult.providerUsed;
      totalTokens += aiResult.tokensUsed;
    } catch (callErr) {
      if (tryNum === 2) throw callErr;
      continue;
    }

    let parsedQuestions = extractJSONArray(aiResult.content);

    // If initial JSON parsing failed, attempt one fast recovery prompt
    if (!parsedQuestions) {
      console.warn('[AIProvider] Initial JSON parse failed. Retrying with strict JSON-only repair prompt...');
      try {
        const repairRes = await callChatCompletion(
          [
            {
              role: 'system',
              content: 'Convert the following unparsed output into a strict valid JSON array matching the required schema. Return ONLY valid JSON array with no extra text.',
            },
            {
              role: 'user',
              content: aiResult.content,
            },
          ],
          { temperature: 0.1, max_tokens: 2500 }
        );
        totalTokens += repairRes.tokensUsed;
        parsedQuestions = extractJSONArray(repairRes.content);
      } catch (_) {}
    }

    if (!parsedQuestions) {
      if (tryNum === 2) throw new Error('AI failed to produce parseable JSON quiz after recovery attempts');
      continue;
    }

    // Layer 2: Structural validation
    const structureCheck = validateQuizStructure(parsedQuestions, targetCount);
    if (!structureCheck.valid) {
      console.warn(`[AIProvider] Layer 2 structural validation failed on attempt ${tryNum}: ${structureCheck.error}`);
      if (tryNum === 2) throw new Error(`Quiz validation failed: ${structureCheck.error}`);
      continue;
    }

    const candidateQuestions = structureCheck.sanitizedQuestions;

    // Layer 3: Quality Scoring Judge
    const judgeResult = await judgeQuizQuality(candidateQuestions, contextData);
    console.info(`[AIProvider] Layer 3 Quality Judge Score: ${judgeResult.score}/10 (Threshold: ${minScore}) - ${judgeResult.reason}`);

    if (judgeResult.score >= minScore || tryNum === 2) {
      return {
        questions: candidateQuestions,
        attempts,
        qualityScore: judgeResult.score,
        providerUsed,
        tokensUsed: totalTokens,
      };
    }
  }

  throw new Error('Quiz generation failed quality threshold after max attempts');
};

module.exports = {
  callChatCompletion,
  extractJSONArray,
  validateQuizStructure,
  buildQuizPrompt,
  judgeQuizQuality,
  generateBilingualQuiz,
};
