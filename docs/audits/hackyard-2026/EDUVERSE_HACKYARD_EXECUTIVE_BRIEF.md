# EduVerse — Hackyard Build 2026 Executive Brief
## Strategic Onsite Engineering & Product Assessment
**Team:** TGW (The Great Warriors) | **Team Lead:** Kartik Gupta  
**Event:** Hackyard Build 2026 — In-Person Round, IIT Guwahati  
**Date of Audit:** October 20, 2026 | **Repository Branch:** `main` (Commit `294e666e`)

---

## 1. Executive Summary: What EduVerse Actually Is

**EduVerse** is a full-stack, AI-orchestrated engineering learning and project acceleration platform built on the MERN stack (React 19 + Express 5 + MongoDB Atlas). 

Rather than functioning as a generic LMS or simple tutorial viewer, EduVerse addresses the **"Tutorial Hell to Independent Builder"** chasm. It combines:
1. **Intelligent Curriculum Generation:** Project-to-Skill Build Paths that convert open-ended learner ideas into milestone-driven engineering blueprints.
2. **Contextual Watch-Range Assessment:** Automated bilingual quiz generation calibrated directly to the specific timestamps and chapters a learner watched.
3. **Cognitive Spaced Repetition (SRS):** An SM-2 flashcard engine interconnected with a centralized Topic Mastery tracking engine.
4. **Peer Tutor Network:** A community-driven question/answer marketplace with gamified XP and code-review capabilities.
5. **Productivity Workspace:** Focus timers (Pomodoro/Stopwatch), rich-text smart notes (TipTap), daily routine grids, and expense tracking.

---

## 2. Actual Implemented Capabilities vs Documented Claims

The repository reveals a substantial implementation far ahead of its outdated root `README.md` (which still lists quizzes, playlists, and gamification as "Future Enhancements").

### Fully Implemented & Test-Verified Capabilities
- **Project Build Paths Engine:** Converts project goals (e.g., *"Real-Time Chat App"*) into 4–6 milestone engineering modules with Layer 2 structural validation, Layer 3 LLM Quality Judging (min score 7.0/10), SHA-256 canonical token deduplication, allowlisted official doc-link verification, and sourced YouTube curation (3–90 min duration filters). (26 passing automated tests).
- **Watch-Range Video Quizzes:** Parses YouTube creator chapters and video durations; dynamically assigns 5 or 10 questions; outputs simultaneous English/Hindi bilingual pairs; enforces idempotency on `(userId, videoId)`; and uses an in-process reconciler on playlist transitions. (16 passing automated tests).
- **Topic Mastery Engine:** Canonicalizes topic identities (stripping casing/whitespace); calculates mastery score (0–100); classifies weak areas ($<40$ or wrong $>$ correct); schedules spaced revisions (1 to 30 days); and aggregates dense 7-day calendar activity in the user's local IANA timezone. (17 passing automated tests).
- **Monotonic Playlist Learning:** YouTube playlists sync non-destructively; high-water mark progress pointers never regress on rewind; quizzes are cached during replays; and playlist changes sync throttled to 60s. (10 passing automated tests).
- **Gamified Level Progression:** Consolidated formula (1000 XP per level) across focus sessions, video completions (+500 XP), build path milestones (+50 XP), and tutor solutions (+10 XP). (15 passing automated tests).
- **Dual Authentication & Security:** Dual-mode JWT (HttpOnly cookies + Bearer headers); in-memory 60s session cache; Express 5 recursive MongoDB operator sanitizer; and an AI circuit breaker across OpenRouter, OpenAI, and Groq with 60s cooldown.

### Feature-Gated Capabilities (Must Be Enabled in Environment)
- `FEATURE_PROJECT_BUILD_PATH=true` (Gates all `/api/build-paths/*` endpoints).
- `FEATURE_IMPROVED_QUIZ=true` (Gates watch-range quiz generation in `/api/track/video-finished` and `/api/videos/:videoId/quizzes`).

### Simulated, Stubbed, or Disconnected Behaviors
- **Sandbox Code Execution:** Does **not** compile, containerize, or run submitted code. Code review is purely semantic evaluation performed via LLM prompts (`evaluateTaskSubmission`).
- **Project-Failure-to-Mastery Feedback Loop:** When a student submits a milestone task or fails an evaluation, the result **does not** automatically write to `TopicMastery`, does not trigger spaced repetition revisions, and does not automatically recommend remediating courses from the Skill Hub. **They exist as separate, unlinked subsystems.**

---

## 3. Technology Stack & Verification Baseline

| Subsystem | Verified Technology & Version | Implementation Evidence |
|---|---|---|
| **Frontend Framework** | React 19.2.4 + Vite 8.0.1 | [`frontend/package.json`](file:///d:/Projects/EduVerse/frontend/package.json) |
| **Frontend Routing** | React Router DOM 7.13.2 | [`frontend/src/App.jsx`](file:///d:/Projects/EduVerse/frontend/src/App.jsx) (17 lazy-loaded routes) |
| **Rich Text Editor** | TipTap 3.22.5 + DOMPurify 3.4.14 | [`frontend/src/pages/SmartNotes.jsx`](file:///d:/Projects/EduVerse/frontend/src/pages/SmartNotes.jsx) |
| **Visuals & Charts** | Recharts 3.8.1, Framer Motion 12.38.0 | [`frontend/src/pages/Dashboard.jsx`](file:///d:/Projects/EduVerse/frontend/src/pages/Dashboard.jsx) |
| **Backend Framework** | Node.js v24.15.0 + Express 5.2.1 | [`backend/package.json`](file:///d:/Projects/EduVerse/backend/package.json), [`backend/server.js`](file:///d:/Projects/EduVerse/backend/server.js) |
| **Database & ODM** | MongoDB Atlas + Mongoose 9.3.3 | 18 defined schemas, compound indexing |
| **AI Providers** | OpenRouter (gpt-4o-mini), OpenAI, Groq (llama-3.3) | [`backend/integrations/aiProvider.js`](file:///d:/Projects/EduVerse/backend/integrations/aiProvider.js) |
| **Email Gateway** | Brevo (Sendinblue) HTTP API | [`backend/utils/emailSender.js`](file:///d:/Projects/EduVerse/backend/utils/emailSender.js) |
| **External APIs** | YouTube Data API v3, Google OAuth 2.0, Facebook SDK | [`backend/integrations/youtubeService.js`](file:///d:/Projects/EduVerse/backend/integrations/youtubeService.js) |
| **Hosting Config** | Railway (Nixpacks, `/health`) + Vercel SPA rewrite | [`backend/railway.json`](file:///d:/Projects/EduVerse/backend/railway.json), [`frontend/vercel.json`](file:///d:/Projects/EduVerse/frontend/vercel.json) |
| **Test Verification** | Node.js Native Test Runner (`node:test`) | **84 tests executed; 84 passed; 0 failed** |
| **Build Verification** | Vite client production build | **Passed (3487 modules in 47.12s)** |

---

## 4. Strongest Technical Differentiator & Strongest Foundation

### Strongest Technical Foundation: The Project Build Paths Subsystem
The untracked/staged Project Build Paths subsystem (`buildPathService.js`, `buildPaths.js`, `BuildPaths.jsx`) is the most architecturally mature module in the repository:
1. **Deduplication Discipline:** Strips stop-words, sorts tokens, and hashes SHA-256 canonical signatures to prevent re-generating identical curriculums.
2. **Multi-Layer Quality Gate:** Raw LLM outputs must pass Layer 2 structural bounds (3–10 milestones, min length requirements) followed by a Layer 3 Quality Judge pass scoring $\ge 7.0/10$ with prompt amplification on retries.
3. **Verified External Linkage:** Enforces a 30-domain allowlist and performs live HTTP requests to guarantee documentation links are alive before presenting them to students.
4. **Hard-Locked Milestone Sequencing:** Students cannot leapfrog milestones; milestone $N$ unlocks strictly when milestone $N-1$ is registered in `completedModules`.
5. **Peer Review Bridge:** Bridges self-paced learning to community tutoring by generating a `Problem` with `isBuildPathReview: true`.

---

## 5. The Critical Gap: The Disconnected Remediation Loop

The audit reveals a central missing connection in the platform's core thesis:
```
[User Expresses Goal] ──► [Build Path Generated] ──► [Milestone Task Submitted]
                                                              │
                                                              ▼
                                                   [AI Evaluates Code]
                                                              │
                                                     (GAP DETECTED HERE)
                                                              │
                                                              X  Does NOT update TopicMastery
                                                              X  Does NOT detect specific skill gap
                                                              X  Does NOT prescribe remediating course
```
Although EduVerse has a sophisticated **TopicMastery Engine** and a rich **Skills Hub / Course Catalog**, a student who struggles or submits poor code on a Build Path milestone receives static text advice, but their mastery record remains unchanged, and no targeted course or quiz is automatically queued to help them bridge that gap.

---

## 6. Three Candidate Onsite Build Objectives for Hackyard 2026

### Candidate 1: The Closed-Loop "Project Gap $\to$ Skill Remediation" Engine (RECOMMENDED)
- **Problem:** Students fail or struggle on project milestones but have no automatic, personalized learning bridge to master the underlying prerequisite concepts.
- **Existing Foundation Reused:** `buildPathService.js`, `UserBuildProgress`, `TopicMastery`, `updateTopicMastery`, `Skill`, and `SkillHub`.
- **What Must Be Built Onsite:**
  1. Modify `evaluateTaskSubmission` to identify 1–2 specific conceptual skill gaps (e.g., *"MongoDB Schema Indexing"*).
  2. Wire `POST /build-paths/.../submit` to call `updateTopicMastery` with `isCorrect: false` and mark `isWeakArea: true`.
  3. Create an automated query that matches the detected skill gap against the user's `Skill` library or YouTube Data API to prescribe a 5-minute targeted remediation module.
  4. Display an interactive *"Bridge This Skill Gap"* drawer in `BuildPaths.jsx`.
- **User-Visible Result:** When a student submits flawed code, EduVerse highlights the exact concept gap, marks it in their Mastery Overview, and immediately recommends a 5-minute video and interactive quiz.
- **Why It Wins Hackyard:** Directly closes the loop between "Project" and "Skill" (40% Build, 20% Ingenuity), making the platform feel remarkably intelligent and cohesive.

### Candidate 2: In-Browser Interactive Code Execution & Unit Test Verification Sandbox
- **Problem:** Milestone code submissions currently accept any pasted string and rely on LLM guessing rather than running actual code.
- **Existing Foundation Reused:** Hands-on task evaluation panel in `BuildPaths.jsx`, `handsOnTask.evaluationCriteria`.
- **What Must Be Built Onsite:**
  1. Integrate an in-browser WebAssembly runner (e.g. Pyodide for Python or WebContainer/iframe runner for JavaScript).
  2. Execute milestone code against automated assertions directly in the browser.
  3. Pass test output into `evaluateTaskSubmission`.
- **Risks & Feasibility:** High technical risk under hackathon time and network constraints; cross-origin security headers (COOP/COEP) can conflict with YouTube embeds.

### Candidate 3: Live Collaborative Peer Code Review & XP Bounties
- **Problem:** Peer reviews posted to the Tutor Network are asynchronous forum threads without live code diffing or structured rubrics.
- **Existing Foundation Reused:** Problem/Solution models, `isBuildPathReview` badge, `tutor.js`.
- **What Must Be Built Onsite:**
  1. Side-by-side code diff viewer for milestone reviews.
  2. Acceptance rubric awarding milestone-specific bonus XP.
  3. Real-time notification socket when a peer posts a review.
- **Demo Appeal:** Great visual story for peer learning, but secondary to the core Project-to-Skill thesis.

---

## 7. Recommended Live Demonstration Sequence (3 Minutes)

To impress the Hackyard judges at IIT Guwahati, execute this tight, reliable 3-minute sequence:

1. **Minute 1:00 — The Zero-to-One Project Intake**
   - Open `/build-paths`. Enter a real-world prompt: *"Build a High-Throughput URL Shortener with Analytics"*.
   - Choose *"Intermediate"* and *"Node.js, Redis, MongoDB"*.
   - Click **Generate Build Path**.
   - Show the 3-Layer generation: SHA-256 deduplication check, structural validation, and LLM Quality Judging.
   - Reveal the generated 5-milestone roadmap with live-verified MDN/Redis doc links and curated YouTube tutorials.

2. **Minute 2:00 — Hands-on Deliverable & Intelligent Feedback**
   - Click Milestone 1: *"Redis Key-Value Expiration & Cache Architecture"*.
   - Click **"Step-by-Step Guide"** — show the cached 4-step actionable walkthrough.
   - Paste a code snippet into the deliverable panel.
   - Click **Submit Deliverable** — show instant AI Code Review providing specific strengths and architectural suggestions.
   - Click **Mark Complete** — show idempotent $+50$ XP reward and level-up progress.

3. **Minute 3:00 — The Complete Platform Synergy**
   - Click **"Request Peer Review"** — show the deliverable seamlessly bridge into the **Peer Tutor Network** (`/tutor`) with a purple *"Project Build Review"* badge.
   - Navigate to `/skills` — show playlist tracking with monotonic progress.
   - Open the Video Player (`/skills/:id/learn`) and trigger a **Watch-Range Bilingual Quiz** with paired English/Hindi questions.
   - End on the **Dashboard** (`/`) showing the 7-day activity graph, streak, and Topic Mastery breakdown.

---

## 8. Presentation Guardrails

### Safe Claims to Make in Front of Judges
- *"EduVerse converts project goals into structured, milestone-driven curriculums with multi-layer quality gating."*
- *"We enforce official documentation allowlists and perform live HTTP checks to eliminate hallucinated links."*
- *"Quizzes are dynamically calibrated to the exact video range watched, generating simultaneous English and Hindi translations."*
- *"All playlist and video tracking enforces monotonic progress pointers, preventing progress regression on replay."*
- *"We have 84 automated tests verifying our core business logic, duration parsers, deduplication algorithms, and gamification rules."*

### Dangerous Claims to AVOID (Red Flags)
- **DO NOT CLAIM:** *"We execute and compile student code in secure sandboxes."* (Code is evaluated semantically via LLM prompts; no sandboxed container exists).
- **DO NOT CLAIM:** *"When a student fails a project task, the system automatically rebuilds their entire mastery graph and schedules personalized remedial lectures."* (This loop is currently disconnected; build Candidate 1 onsite to make this claim true!).
- **DO NOT CLAIM:** *"We have thousands of daily active users."* (This is an engineering hackathon prototype; present it honestly as a production-grade architecture).
