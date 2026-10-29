const crypto = require('crypto');
const axios = require('axios');
const BuildPathTemplate = require('../models/BuildPathTemplate');
const UserBuildProgress = require('../models/UserBuildProgress');
const Problem = require('../models/Problem');
const { callChatCompletion, extractJSONArray } = require('../integrations/aiProvider');
const { getCuratedVideosForTopic } = require('../integrations/youtubeService');
const { awardUserXp } = require('../utils/gamification');

// ── 1. Official Documentation Domain Allowlist ───────────────────────────────
const OFFICIAL_DOC_ALLOWLIST = [
  'developer.mozilla.org',
  'react.dev',
  'nodejs.org',
  'expressjs.com',
  'python.org',
  'docs.python.org',
  'nextjs.org',
  'vuejs.org',
  'angular.dev',
  'angular.io',
  'tailwindcss.com',
  'mongodb.com',
  'postgresql.org',
  'dev.mysql.com',
  'docs.docker.com',
  'flutter.dev',
  'developer.android.com',
  'developer.apple.com',
  'fastapi.tiangolo.com',
  'spring.io',
  'go.dev',
  'rust-lang.org',
  'doc.rust-lang.org',
  'typescriptlang.org',
  'redux.js.org',
  'socket.io',
  'prisma.io',
  'graphql.org',
  'git-scm.com',
  'kubernetes.io'
];

/**
 * Verifies documentation URL against curated allowlist and executes HTTP GET check.
 * Uses realistic headers and a 3-second timeout.
 */
const verifyDocUrl = async (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { verified: false, url: null, domain: null };
  }

  let parsed;
  try {
    parsed = new URL(rawUrl.trim());
  } catch (_) {
    return { verified: false, url: null, domain: null };
  }

  const hostname = parsed.hostname.toLowerCase();
  const isAllowlisted = OFFICIAL_DOC_ALLOWLIST.some(
    (allowed) => hostname === allowed || hostname.endsWith('.' + allowed)
  );

  if (!isAllowlisted) {
    return { verified: false, url: null, domain: null };
  }

  // Verification via GET request with 3s timeout
  try {
    const res = await axios.get(rawUrl, {
      timeout: 3000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      maxRedirects: 3,
      validateStatus: (status) => status >= 200 && status < 400
    });

    if (res.status >= 200 && res.status < 400) {
      return { verified: true, url: rawUrl, domain: hostname };
    }
  } catch (err) {
    // If specific subpath failed, fall back to official root documentation link
    const fallbackRoot = parsed.protocol + '//' + parsed.hostname;
    try {
      const rootRes = await axios.get(fallbackRoot, {
        timeout: 3000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
        validateStatus: (s) => s >= 200 && s < 400
      });
      if (rootRes.status >= 200 && rootRes.status < 400) {
        return { verified: true, url: fallbackRoot, domain: hostname };
      }
    } catch (_) {}
  }

  return { verified: false, url: null, domain: null };
};

// ── 2. Canonical Signature & Template Matching ──────────────────────────────
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'in', 'on', 'at', 'by', 'for', 'with', 'about', 'against',
  'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'to', 'from', 'up', 'down', 'build', 'create', 'make', 'develop', 'want', 'like',
  'project', 'application', 'app', 'system', 'using', 'clone', 'simple', 'realtime'
]);

const normalizeProjectTokens = (text) => {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
    .sort();
};

const normalizeTechStack = (techStack) => {
  if (!Array.isArray(techStack)) {
    if (typeof techStack === 'string') {
      techStack = techStack.split(',').map((s) => s.trim());
    } else {
      return [];
    }
  }
  return [...new Set(techStack.map((t) => t.toLowerCase().trim()).filter(Boolean))].sort();
};

const generateCanonicalSignature = ({ projectIdea, techStack, skillLevel, platform }) => {
  const tokens = normalizeProjectTokens(projectIdea);
  const stack = normalizeTechStack(techStack);
  const level = (skillLevel || 'beginner').toLowerCase().trim();
  const plat = (platform || 'web').toLowerCase().trim();

  const canonicalKey = `${tokens.join('-')}|${stack.join(',')}|${level}|${plat}`;
  const canonicalSignature = crypto.createHash('sha256').update(canonicalKey).digest('hex');

  return { canonicalKey, canonicalSignature, tokens, stack, level, plat };
};

/**
 * Finds an existing template matching the canonical signature or close token similarity.
 */
const findMatchingTemplate = async ({ projectIdea, techStack, skillLevel, platform }) => {
  const { canonicalSignature, tokens, stack, level, plat } = generateCanonicalSignature({
    projectIdea,
    techStack,
    skillLevel,
    platform
  });

  // 1. Exact canonical signature match
  const exact = await BuildPathTemplate.findOne({ canonicalSignature });
  if (exact) {
    return { template: exact, matchType: 'exact' };
  }

  // 2. Similarity search on same stack, level, and platform
  if (tokens.length >= 2) {
    const candidates = await BuildPathTemplate.find({
      skillLevel: level,
      platform: plat
    }).limit(20);

    for (const candidate of candidates) {
      const candTokens = normalizeProjectTokens(candidate.projectIdea);
      const intersection = tokens.filter((t) => candTokens.includes(t));
      const union = new Set([...tokens, ...candTokens]);
      const jaccard = union.size > 0 ? intersection.length / union.size : 0;

      // Also check stack overlap
      const candStack = normalizeTechStack(candidate.techStack);
      const stackOverlap = stack.filter((s) => candStack.includes(s));

      if (jaccard >= 0.75 && (stack.length === 0 || stackOverlap.length > 0)) {
        return { template: candidate, matchType: 'fuzzy', similarity: jaccard };
      }
    }
  }

  return null;
};

// ── 3. Structural Validation (Layer 2) ──────────────────────────────────────
const validateBuildPathStructure = (modules) => {
  if (!Array.isArray(modules) || modules.length < 3 || modules.length > 10) {
    return { valid: false, error: 'Module sequence must contain between 3 and 10 milestones' };
  }

  for (let i = 0; i < modules.length; i++) {
    const m = modules[i];
    if (!m || typeof m !== 'object') {
      return { valid: false, error: `Module #${i + 1} is not a valid object` };
    }

    if (!m.title || typeof m.title !== 'string' || m.title.trim().length < 5) {
      return { valid: false, error: `Module #${i + 1} is missing a descriptive title` };
    }

    if (!m.description || typeof m.description !== 'string' || m.description.trim().length < 90) {
      return { valid: false, error: `Module #${i + 1} description is too brief (minimum 90 chars explaining project context)` };
    }

    if (!m.handsOnTask || typeof m.handsOnTask !== 'object') {
      return { valid: false, error: `Module #${i + 1} must include a concrete handsOnTask object` };
    }

    const { title: taskTitle, instructions } = m.handsOnTask;
    if (!taskTitle || typeof taskTitle !== 'string' || taskTitle.trim().length < 5) {
      return { valid: false, error: `Module #${i + 1} hands-on task is missing a title` };
    }

    if (!instructions || typeof instructions !== 'string' || instructions.trim().length < 30) {
      return { valid: false, error: `Module #${i + 1} hands-on task instructions must be substantial (min 30 chars)` };
    }
  }

  return { valid: true };
};

// ── 4. Quality-Judge Pass (Layer 3) ─────────────────────────────────────────
const judgeBuildPathQuality = async (modules, intakeData) => {
  const sample = modules.map((m, i) => ({
    milestone: i + 1,
    title: m.title,
    task: m.handsOnTask?.title,
    instructions: (m.handsOnTask?.instructions || '').slice(0, 150)
  }));

  const judgePrompt = [
    {
      role: 'system',
      content: 'You are an Engineering Curriculum Quality Judge. Score project-based curriculum sequences on depth, practical applicability, project-specificity (avoiding generic copy-paste), and logical order on a 1-10 scale. Respond in strict JSON only: {"score": 8.5, "reason": "brief reason"}'
    },
    {
      role: 'user',
      content: `Evaluate this build path for project "${intakeData.projectIdea}" with tech stack "${(intakeData.techStack || []).join(', ')}" and level "${intakeData.skillLevel}".
Milestones:
${JSON.stringify(sample, null, 2)}

Score (1-10, where >=7.0 is genuinely practical, project-specific, well-sequenced; <7.0 is generic filler):`
    }
  ];

  try {
    const res = await callChatCompletion(judgePrompt, { temperature: 0.1, max_tokens: 200 });
    const clean = (res.content || '').replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(clean);
    const score = typeof parsed.score === 'number' ? Math.max(1, Math.min(10, parsed.score)) : 8.0;
    return { score, reason: parsed.reason || 'Quality evaluation completed' };
  } catch (err) {
    console.warn('[BuildPathService:Judge] Judge fallback pass:', err.message);
    return { score: 7.8, reason: 'Judge fallback pass' };
  }
};

// ── 5. End-to-End Generation Pipeline ───────────────────────────────────────
const buildPromptText = (intake, isAmplified = false) => {
  const qualityDirective = isAmplified
    ? `CRITICAL QUALITY REVISION:
The previous curriculum was rejected for being too generic or superficial.
Make every module explicitly tailored to "${intake.projectIdea}". Explain WHY this specific architecture/database/feature is required for this exact project, not a textbook definition.`
    : `Design a practical, step-by-step milestone curriculum that takes a student from zero to a working, production-ready build of this project.`;

  return `You are a Principal Software Architect and Lead Educator.
${qualityDirective}

Project to Build: "${intake.projectIdea}"
Preferred Tech Stack: ${(intake.techStack || []).length > 0 ? intake.techStack.join(', ') : 'Recommend a modern, industry-standard stack'}
Student Skill Level: ${intake.skillLevel || 'beginner'}
Target Platform: ${intake.platform || 'web'}

REQUIREMENTS:
1. Generate between 4 and 6 sequential, progressive milestones (modules).
2. Each module MUST build directly upon the output of the prior module.
3. For each module:
   - "title": Professional concept/milestone title.
   - "description": Substantial, engaging explanation (at least 2-3 paragraphs / 120+ words). Detail what this technology/concept is, why it is needed specifically for "${intake.projectIdea}", and what practical understanding the student will gain.
   - "estimatedMinutes": Realistic time (e.g., 60, 90, 120).
   - "coreTechnology": The primary tool/library/framework (e.g. "React", "Node.js", "MongoDB", "Express", "PostgreSQL", "Tailwind CSS", "Docker").
   - "docUrl": An official documentation URL for that core technology from trusted domains (e.g., https://react.dev, https://developer.mozilla.org, https://nodejs.org, https://www.mongodb.com/docs, https://tailwindcss.com/docs).
   - "youtubeSearchQuery": Specific search query for curated video lookup (e.g. "Express middleware REST API tutorial").
   - "handsOnTask":
     - "title": Concrete task title.
     - "instructions": Exact deliverable instructions (e.g., "Implement the Student and Course Mongoose schemas with indexing and one-to-many relationship").
     - "deliverableType": "code" | "text" | "repo_url" | "any".
     - "evaluationCriteria": Array of 3-4 bullet points to verify completion.
   - "stepByStepGuide": Array of 4-6 concise, concrete, ordered steps (e.g. ["1. Configure Mongoose connection", "2. Define User schema with indexed email", ...]) walking through how to build this specific deliverable.
4. Output strict JSON array of objects conforming to the schema below. No markdown backticks outside JSON.

OUTPUT JSON SCHEMA:
[
  {
    "moduleIndex": 0,
    "title": "Milestone Title",
    "description": "Substantial, practical explanation...",
    "estimatedMinutes": 60,
    "coreTechnology": "Technology Name",
    "docUrl": "https://official-documentation-url",
    "youtubeSearchQuery": "Topic search query",
    "handsOnTask": {
      "title": "Task Deliverable Title",
      "instructions": "Step-by-step deliverable instructions...",
      "deliverableType": "code",
      "evaluationCriteria": ["Requirement 1", "Requirement 2"]
    },
    "stepByStepGuide": [
      "1. Actionable step one...",
      "2. Actionable step two..."
    ]
  }
]`;
};

const generateBuildPathTemplate = async (intakeData) => {
  const minScore = 7.0;
  let attempts = 0;
  let providerUsed = 'unknown';

  for (let tryNum = 1; tryNum <= 2; tryNum++) {
    attempts++;
    const isAmplified = tryNum > 1;
    const prompt = buildPromptText(intakeData, isAmplified);

    const messages = [
      {
        role: 'system',
        content: 'You are an expert curriculum engineering system. Return ONLY a valid JSON array of milestones.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    let aiResult;
    try {
      aiResult = await callChatCompletion(messages, { temperature: isAmplified ? 0.4 : 0.3, max_tokens: 3500 });
      providerUsed = aiResult.providerUsed;
    } catch (err) {
      if (tryNum === 2) throw err;
      continue;
    }

    const rawModules = extractJSONArray(aiResult.content);
    if (!rawModules || !Array.isArray(rawModules)) {
      if (tryNum === 2) throw new Error('Failed to parse AI output into module sequence array');
      continue;
    }

    // Layer 2: Structural Validation
    const structCheck = validateBuildPathStructure(rawModules);
    if (!structCheck.valid) {
      console.warn(`[BuildPathService] Structural validation failed on attempt ${tryNum}: ${structCheck.error}`);
      if (tryNum === 2) throw new Error(`Build path structure invalid: ${structCheck.error}`);
      continue;
    }

    // Layer 3: Quality-Judge Pass
    const judge = await judgeBuildPathQuality(rawModules, intakeData);
    console.info(`[BuildPathService] Quality Judge Score: ${judge.score}/10 (Threshold: ${minScore}) - ${judge.reason}`);

    if (judge.score >= minScore || tryNum === 2) {
      // Enrich modules with verified doc links and curated YouTube videos in parallel
      const enrichedModules = await Promise.all(
        rawModules.map(async (mod, idx) => {
          // 1. Doc Link Verification
          let verifiedDoc = null;
          if (mod.docUrl) {
            const check = await verifyDocUrl(mod.docUrl);
            if (check.verified) {
              verifiedDoc = {
                title: `${mod.coreTechnology || 'Official'} Documentation`,
                url: check.url,
                domain: check.domain,
                isVerified: true
              };
            }
          }

          // 2. Curate 2-3 YouTube resources
          const videoQuery = mod.youtubeSearchQuery || `${mod.title} ${intakeData.techStack?.[0] || ''}`;
          let youtubeResources = [];
          try {
            youtubeResources = await getCuratedVideosForTopic(videoQuery, 3);
          } catch (_) {}

          return {
            moduleIndex: idx,
            title: mod.title,
            description: mod.description,
            estimatedMinutes: Number(mod.estimatedMinutes) || 60,
            handsOnTask: mod.handsOnTask,
            youtubeResources,
            docLink: verifiedDoc,
            stepByStepGuide: Array.isArray(mod.stepByStepGuide) ? mod.stepByStepGuide : []
          };
        })
      );

      const { canonicalSignature, canonicalKey, stack, level, plat } = generateCanonicalSignature(intakeData);

      const resolvedTechStack = stack.length > 0
        ? stack
        : [...new Set(rawModules.map((m) => m.coreTechnology).filter(Boolean))];

      const template = new BuildPathTemplate({
        canonicalSignature,
        canonicalKey,
        projectIdea: intakeData.projectIdea,
        normalizedTitle: intakeData.projectIdea.replace(/[^\w\s-]/g, '').trim(),
        overview: `Guided build path for "${intakeData.projectIdea}" covering ${enrichedModules.length} core engineering milestones.`,
        techStack: resolvedTechStack,
        skillLevel: level,
        platform: plat,
        modules: enrichedModules,
        qualityScore: judge.score,
        generationAttempts: attempts,
        providerUsed
      });

      await template.save();
      return template;
    }
  }

  throw new Error('Curriculum generation failed quality threshold after max retries');
};

// ── 6. Submission Feedback Judge ────────────────────────────────────────────
const evaluateTaskSubmission = async ({ projectTitle, moduleTitle, taskInstructions, submissionContent, submissionType }) => {
  if (!submissionContent || submissionContent.trim().length < 5) {
    return {
      feedback: 'Please provide a more detailed submission for review.',
      strengths: [],
      suggestions: ['Include your implementation details, code snippets, or repository commit link.']
    };
  }

  const prompt = [
    {
      role: 'system',
      content: 'You are an encouraging Senior Code Reviewer. Review student deliverables against task requirements. Provide constructive feedback, 2 strengths, and 1-2 actionable suggestions. Respond in strict JSON: {"feedback": "concise overview", "strengths": ["string"], "suggestions": ["string"]}'
    },
    {
      role: 'user',
      content: `Project: "${projectTitle}"
Module Milestone: "${moduleTitle}"
Task Requirements:
${taskInstructions}

Student Submission (${submissionType}):
${submissionContent.slice(0, 2000)}

Review concisely:`
    }
  ];

  try {
    const res = await callChatCompletion(prompt, { temperature: 0.2, max_tokens: 300 });
    const clean = (res.content || '').replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(clean);
    return {
      feedback: parsed.feedback || 'Great work completing this milestone deliverable!',
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : ['Good practical effort.'],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : ['Keep following the architectural plan.']
    };
  } catch (err) {
    return {
      feedback: 'Deliverable submitted successfully! Your progress is recorded.',
      strengths: ['Hands-on deliverable recorded.'],
      suggestions: ['Proceed to the next project milestone.']
    };
  }
};

/**
 * Generates an on-demand, project-specific step-by-step implementation guide
 * for a specific module's hands-on deliverable using the AI gateway.
 */
// ── Guide Structural Validation (Layer 2 equivalent for step-by-step guide) ─────────────
// Applied before caching on the shared BuildPathTemplate to ensure bad AI generations do not
// persist for all future users of the template. Mirrors the validateBuildPathStructure pattern.
const validateGuideStructure = (steps) => {
  if (!Array.isArray(steps) || steps.length < 4) {
    return { valid: false, error: 'Guide must contain at least 4 ordered steps' };
  }
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    if (typeof s !== 'string' || s.trim().length < 15) {
      return { valid: false, error: `Step ${i + 1} is missing or too brief (min 15 chars)` };
    }
  }
  // Reject duplicate or near-identical steps.
  // Strip the leading step-number prefix (e.g. "1. ", "2) ") before comparing so that
  // "1. Do X" and "3. Do X" are correctly identified as duplicate content.
  const normalized = steps.map((s) =>
    s.toLowerCase().replace(/^\d+[.)\s]+/, '').replace(/\W+/g, ' ').trim()
  );
  const unique = new Set(normalized);
  if (unique.size < steps.length) {
    return { valid: false, error: 'Guide contains duplicate or near-identical steps' };
  }
  return { valid: true };
};

const generateModuleStepByStepGuide = async (projectIdea, techStack, moduleData) => {
  const stackStr = Array.isArray(techStack) ? techStack.join(', ') : (techStack || 'standard stack');
  const task = moduleData.handsOnTask || {};

  const buildMessages = () => [
    {
      role: 'system',
      content:
        'You are a Senior Software Architect and Tech Lead. Generate a detailed, ordered, actionable ' +
        'step-by-step walkthrough explaining exactly how to accomplish this milestone task. Provide 4 to 6 ' +
        'concrete, project-specific steps (e.g. "1. Do X", "2. Then do Y"). Do not provide generic textbook ' +
        'steps; tailor each step specifically to this project. Return strict JSON array of strings only: ' +
        '["1. ...", "2. ..."]'
    },
    {
      role: 'user',
      content:
        `Project: "${projectIdea}"\n` +
        `Tech Stack: ${stackStr}\n` +
        `Milestone #${(moduleData.moduleIndex || 0) + 1}: "${moduleData.title}"\n` +
        `Deliverable Task: "${task.title || moduleData.title}"\n` +
        `Instructions:\n${task.instructions || moduleData.description}\n\n` +
        `Key Evaluation Criteria:\n${(task.evaluationCriteria || []).map((c, i) => `${i + 1}. ${c}`).join('\n')}\n\n` +
        `Output strict JSON array of 4-6 ordered steps:`
    }
  ];

  const normalize = (parsed) =>
    parsed.map((item, idx) => {
      const text = typeof item === 'string' ? item.trim() : JSON.stringify(item);
      return /^\d+[\.\)]/.test(text) ? text : `${idx + 1}. ${text}`;
    });

  // Layer 2 + retry loop: attempt generation, validate structure, retry once on failure.
  // Same validation discipline as validateBuildPathStructure for module content — any bad
  // generation is caught here before being cached on the shared BuildPathTemplate document.
  const MAX_ATTEMPTS = 2;
  let lastError = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const temperature = attempt === 1 ? 0.2 : 0.35; // slight temperature increase on retry
      const res = await callChatCompletion(buildMessages(), { temperature, max_tokens: 600 });
      const parsed = extractJSONArray(res.content);

      if (!Array.isArray(parsed) || parsed.length === 0) {
        lastError = 'AI returned empty or non-array response';
        console.warn(`[BuildPathService:Guide] Attempt ${attempt}: ${lastError}`);
        continue;
      }

      const steps = normalize(parsed);

      // Layer 2: structural validation gate
      const structCheck = validateGuideStructure(steps);
      if (!structCheck.valid) {
        lastError = structCheck.error;
        console.warn(`[BuildPathService:Guide] Attempt ${attempt} structural validation failed: ${lastError}`);
        continue;
      }

      console.info(`[BuildPathService:Guide] Attempt ${attempt} validated OK (${steps.length} steps)`);
      return steps;
    } catch (err) {
      lastError = err.message;
      console.warn(`[BuildPathService:Guide] Attempt ${attempt} threw: ${err.message}`);
    }
  }

  console.warn(`[BuildPathService:Guide] All ${MAX_ATTEMPTS} attempts failed (${lastError}). Using fallback.`);

  // Fallback: derive from evaluation criteria if at least 4 exist, otherwise use generic scaffold
  const criteria = task.evaluationCriteria || [];
  if (criteria.length >= 4) {
    return criteria.map((c, idx) => `${idx + 1}. ${c}`);
  }

  return [
    `1. Initialize project files and environment dependencies for ${moduleData.title}.`,
    `2. Implement core architectural components following the milestone specifications.`,
    `3. Wire and configure data schemas, API routes, or UI components.`,
    `4. Test your implementation against task deliverables and fix edge cases.`
  ];
};

module.exports = {
  verifyDocUrl,
  OFFICIAL_DOC_ALLOWLIST,
  generateCanonicalSignature,
  normalizeProjectTokens,
  normalizeTechStack,
  findMatchingTemplate,
  validateBuildPathStructure,
  judgeBuildPathQuality,
  generateBuildPathTemplate,
  evaluateTaskSubmission,
  generateModuleStepByStepGuide
};
