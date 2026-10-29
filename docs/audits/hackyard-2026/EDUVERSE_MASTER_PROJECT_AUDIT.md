# Master Codebase, Product & Architecture Audit
# Platform: EduVerse
**Team:** TGW (The Great Warriors) | **Team Lead:** Kartik Gupta  
**Event:** Hackyard Build 2026 — In-Person Round, IIT Guwahati  
**Audit Date:** October 20, 2026  
**Auditor Roles:** Senior Software Architect, Senior Full-Stack Engineer, Product Analyst, QA Engineer, Technical Documentation Specialist  
**Target Repository:** `d:\Projects\EduVerse`

---

## 1. Executive Summary

This document presents the complete, evidence-based technical audit of **EduVerse**, conducted to establish an uncompromising baseline before selecting the onsite build objective and demo sequence for the Hackyard Build 2026 in-person finals at IIT Guwahati.

### Core Finding
EduVerse is an advanced, production-oriented educational engineering platform built using modern MERN stack architecture (React 19, Express 5, MongoDB Atlas). Its central value proposition is bridging the gap between passive tutorial consumption ("Tutorial Hell") and structured, self-directed software development.

### What Is Implemented and Verified
- **84 automated tests across 5 test suites passed completely** (0 failures, 0 skipped) using Node's native test runner (`node:test`).
- **Frontend production build succeeded** via Vite in 47.12 seconds, compiling 3,487 modules across 17 lazy-loaded routes.
- **Project Build Paths Subsystem:** Implements SHA-256 canonical signature deduplication, Layer 2 structural validation (3–10 milestones), Layer 3 LLM Quality Judging ($\ge 7.0/10$), an official documentation allowlist with live HTTP verification, sourced YouTube curation (3–90 minute duration bounds), hard milestone sequencing, AI deliverable evaluation, idempotent XP gamification, and a bridge to the Peer Tutor Network.
- **Watch-Range Bilingual Quiz Engine:** Dynamically generates quizzes calibrated to watched video durations ($>1800$s $\to 10$ questions; $\le 1800$s $\to 5$ questions) and creator chapters, with simultaneous English/Hindi questions, multi-tier circuit-breaker protection, and idempotent playback caching.
- **Topic Mastery Engine:** Canonicalizes topics, calculates mastery scores (0–100), flags weak areas ($<40$), schedules spaced repetition revisions (1–30 days), and normalizes dense 7-day activity in the user's local IANA timezone.
- **Productivity & Peer Network:** Focus timer (Pomodoro/Stopwatch), SM-2 Spaced Repetition flashcards, TipTap rich text notes with stored XSS sanitization, peer question/solution rewards ($+10$ XP / $+10$ points), and expense tracking.

### Critical Limitations and Missing Connections
- **No Containerized Code Execution:** Task deliverable evaluation is qualitative and semantic via LLM prompts; code is not compiled or run in a sandbox.
- **Disconnected Project-to-Mastery Remediation Loop:** Failed project submissions receive AI text feedback, but **do not** modify `TopicMastery`, do not update spaced repetition schedules, and do not automatically queue remedial courses from the Skills Hub. Closing this loop is the recommended onsite objective for Hackyard 2026.
- **Outdated Documentation:** The root `README.md` lists quizzes, playlists, analytics, and gamification as "Future Enhancements" when they are already implemented in code.
- **Feature Flags:** Build Paths (`FEATURE_PROJECT_BUILD_PATH`) and Watch-Range Quizzes (`FEATURE_IMPROVED_QUIZ`) must be explicitly set to `'true'` in deployment environment configurations.

---

## 2. Audit Scope and Repository Version

- **Repository Root:** `d:\Projects\EduVerse`
- **Git Branch:** `main`
- **Current Commit Hash:** `294e666e` (`fix Streak calculation error`)
- **Remote Origin:** `https://github.com/KartikeyG-world/EduVerse.git`
- **Working-Tree Status:** Changes not staged for commit:
  - Modified: `backend/.env.example`, `backend/integrations/youtubeService.js`, `backend/models/Problem.js`, `backend/routes/auth.js`, `backend/routes/skillHub.js`, `backend/routes/users.js`, `backend/server.js`, `frontend/package-lock.json`, `frontend/src/App.jsx`, `frontend/src/components/SourcePreviewModal.jsx`, `frontend/src/components/layout/Sidebar.jsx`, `frontend/src/pages/LearningView.jsx`, `frontend/src/pages/Tutor.jsx`
  - Untracked Files: `backend/models/BuildPathTemplate.js`, `backend/models/UserBuildProgress.js`, `backend/routes/buildPaths.js`, `backend/services/buildPathService.js`, `backend/tests/buildPathSystem.test.js`, `backend/utils/gamification.js`, `frontend/src/pages/BuildPaths.jsx`
- **System Runtime Baseline:** Node.js `v24.15.0`, npm `11.12.1`, OS: Windows (PowerShell environment).

---

## 3. Repository Inventory & Architecture Map

The project is structured as a decoupled full-stack application within a unified Git workspace:

```text
d:\Projects\EduVerse\
├── backend\                   # Express.js REST API server
│   ├── controllers\           # HTTP route controllers (videoController.js)
│   ├── integrations\          # External provider adapters (aiProvider.js, youtubeService.js)
│   ├── jobs\                  # Background task runners (quizGenerationJob.js)
│   ├── middlewares\           # Express middlewares (auth.js)
│   ├── models\                # 18 Mongoose ODM schemas
│   ├── routes\                # 17 Express route modules
│   ├── scripts\               # Database migration & diagnostic scripts
│   ├── services\              # Business logic services (buildPathService.js, quizService.js, aiGateway.js)
│   ├── templates\             # Transactional email HTML templates (emailTemplates.js)
│   ├── tests\                 # 5 node:test automated test suites
│   ├── utils\                 # Shared utility libraries (streak, gamification, mastery, notification, emailSender)
│   ├── Procfile & railway.json# Railway Nixpacks deployment manifests
│   └── server.js              # Application entry point, security middleware, DB bootstrap
│
├── frontend\                  # React 19 Single-Page Application (Vite 8)
│   ├── public\                # Favicons, SVG icons, static assets
│   ├── src\
│   │   ├── api\               # Specialized client API wrappers (notes.js, flashcards.js)
│   │   ├── assets\            # Application image assets
│   │   ├── components\        # Reusable UI, Layout, Auth, and Skill components
│   │   ├── context\           # 5 React context state providers (Auth, Companion, Focus, Interaction, Theme)
│   │   ├── pages\             # 17 page views (Dashboard, BuildPaths, LearningView, Tutor, etc.)
│   │   ├── utils\             # Axios HTTP client with interceptors (api.js)
│   │   ├── App.jsx            # Top-level routing & Suspense code-splitting
│   │   └── main.jsx           # DOM entry point
│   ├── tailwind.config.js     # Tailwind CSS design system tokens
│   ├── vercel.json            # Vercel SPA routing rewrite rules
│   └── vite.config.js         # Vite build configuration
│
└── docs\audits\hackyard-2026\ # Dedicated audit output directory
```

### Excluded Directories
The following non-first-party artifacts were excluded from semantic code review:
- `node_modules/` in root, backend, and frontend (third-party dependencies).
- `dist/` and `build/` (generated build artifacts).
- `.git/` (VCS internal database).
- Public static image binaries (`favicon.png`, `hero.png`).

---

## 4. Complete Feature Inventory

Below is the verified inventory of every user-facing feature and internal subsystem in EduVerse:

| Feature Name | Product Purpose | Target User | Entry Point | Frontend Implementation | Backend Implementation | Database Models | Integrations | Status | Limitations |
|---|---|---|---|---|---|---|---|---|---|
| **User Registration & OTP** | Email-based onboarding with Brevo verification | New Learners | `/register` | [`Register.jsx`](file:///d:/Projects/EduVerse/frontend/src/pages/auth/Register.jsx), [`VerifyOTP.jsx`](file:///d:/Projects/EduVerse/frontend/src/pages/auth/VerifyOTP.jsx) | [`routes/auth.js`](file:///d:/Projects/EduVerse/backend/routes/auth.js#L50-L200) | `User, Activity, Notification` | Brevo HTTP API | AUTOMATED TEST PASSED | Requires live Brevo API key for real email delivery |
| **Email & Password Login** | Authenticate returning users with session cookie & JWT | Registered Users | `/login`, `AuthModal` | [`Login.jsx`](file:///d:/Projects/EduVerse/frontend/src/pages/auth/Login.jsx), [`AuthModal.jsx`](file:///d:/Projects/EduVerse/frontend/src/components/ui/AuthModal.jsx) | [`routes/auth.js`](file:///d:/Projects/EduVerse/backend/routes/auth.js#L237-L360) | `User` | None | AUTOMATED TEST PASSED | Lockout triggered after 5 failed attempts |
| **Google OAuth 2.0** | One-tap federated sign-in | Returning / Fast Onboarding | `SocialAuthButtons` | [`SocialAuthButtons.jsx`](file:///d:/Projects/EduVerse/frontend/src/components/auth/SocialAuthButtons.jsx#L25-L150) | [`routes/auth.js`](file:///d:/Projects/EduVerse/backend/routes/auth.js#L523-L640) | `User, Notification` | Google Identity Services | AUTOMATED TEST PASSED | Requires client and server Google client IDs to match |
| **Facebook OAuth** | Federated sign-in | Returning Users | `SocialAuthButtons` | [`SocialAuthButtons.jsx`](file:///d:/Projects/EduVerse/frontend/src/components/auth/SocialAuthButtons.jsx#L47-L200) | [`routes/auth.js`](file:///d:/Projects/EduVerse/backend/routes/auth.js#L644-L755) | `User, Notification` | Facebook JavaScript SDK v19.0 | IMPLEMENTED IN CODE | Requires valid Facebook App ID |
| **Smart Dashboard** | Central command center showing 7-day analytics, streak, mastery & AI insight | All Students | `/` | [`Dashboard.jsx`](file:///d:/Projects/EduVerse/frontend/src/pages/Dashboard.jsx), [`MasteryOverview.jsx`](file:///d:/Projects/EduVerse/frontend/src/components/dashboard/MasteryOverview.jsx) | [`routes/dashboard.js`](file:///d:/Projects/EduVerse/backend/routes/dashboard.js#L68-L201) | `Activity, TopicMastery, User` | OpenRouter (AI coaching insight) | AUTOMATED TEST PASSED | Dynamic AI insight cached for 12 hours |
| **Focus Mode** | Distraction-free Pomodoro & stopwatch study timer | Self-Directed Learners | `/focus` | [`FocusMode.jsx`](file:///d:/Projects/EduVerse/frontend/src/pages/FocusMode.jsx), [`FocusContext.jsx`](file:///d:/Projects/EduVerse/frontend/src/context/FocusContext.jsx) | [`routes/focus.js`](file:///d:/Projects/EduVerse/backend/routes/focus.js#L10-L84) | `FocusSession, User, Activity, Notification` | None | AUTOMATED TEST PASSED | Focus XP rate: 1 XP per 30 seconds focused |
| **Smart Notes** | TipTap rich-text notes with auto-saving & PDF export | Note Takers | `/notes` | [`SmartNotes.jsx`](file:///d:/Projects/EduVerse/frontend/src/pages/SmartNotes.jsx) | [`routes/notes.js`](file:///d:/Projects/EduVerse/backend/routes/notes.js#L21-L122) | `Note` | html2pdf.js | AUTOMATED TEST PASSED | Decoupled from TopicMastery |
| **AI Notes Summarizer** | Generates key bullet points and 3 quiz questions from notes | Students reviewing long notes | `/notes` ("Summarize" button) | [`SmartNotes.jsx`](file:///d:/Projects/EduVerse/frontend/src/pages/SmartNotes.jsx#L200-L240) | [`routes/ai.js`](file:///d:/Projects/EduVerse/backend/routes/ai.js#L118-L147) | `Activity` | OpenRouter (gpt-4o-mini) | IMPLEMENTED IN CODE | Requires minimum 10 characters input |
| **AI Flashcard Generator** | Converts note text into 5–8 SM-2 Q&A pairs | Flashcard Learners | `/notes` ("Generate Flashcards") | [`SmartNotes.jsx`](file:///d:/Projects/EduVerse/frontend/src/pages/SmartNotes.jsx#L245-L290) | [`routes/flashcards.js`](file:///d:/Projects/EduVerse/backend/routes/flashcards.js#L75-L144) | `Flashcard, Note` | OpenRouter (AI Gateway) | IMPLEMENTED IN CODE | Dual-persisted: embedded in Note and in Flashcard collection |
| **SM-2 Flashcard Study** | Spaced-repetition study queue with 3D flip card UI | Reviewing Students | `/flashcards/study` | [`FlashcardStudy.jsx`](file:///d:/Projects/EduVerse/frontend/src/pages/FlashcardStudy.jsx) | [`routes/flashcards.js`](file:///d:/Projects/EduVerse/backend/routes/flashcards.js#L150-L256) | `Flashcard, TopicMastery` | None | IMPLEMENTED IN CODE | Rating $\ge 2$ adds $+10$ mastery; rating $<2$ subtracts $-15$ |
| **Skills Hub** | Catalog of video & playlist courses with progress tracking | Students learning courses | `/skills` | [`SkillsHub.jsx`](file:///d:/Projects/EduVerse/frontend/src/pages/SkillsHub.jsx), [`SkillCard.jsx`](file:///d:/Projects/EduVerse/frontend/src/components/skills/SkillCard.jsx) | [`routes/skills.js`](file:///d:/Projects/EduVerse/backend/routes/skills.js#L75-L270) | `Skill` | YouTube Data API v3 / ytpl | AUTOMATED TEST PASSED | Automatically detects playlist vs single video URLs |
| **Course Player (LearningView)** | Video player with high-water mark progress & playlist auto-advance | Course Watchers | `/skills/:id/learn` | [`LearningView.jsx`](file:///d:/Projects/EduVerse/frontend/src/pages/LearningView.jsx) | [`routes/skills.js`](file:///d:/Projects/EduVerse/backend/routes/skills.js#L272-L401) | `Skill, User, Notification` | react-player (YouTube iframe) | AUTOMATED TEST PASSED | Monotonic pointer: progress never decreases on rewind |
| **Watch-Range Bilingual Quiz** | Contextual quiz generated from watched timestamp intervals | Students finishing a lesson | Modal on video end or button click | [`LearningView.jsx`](file:///d:/Projects/EduVerse/frontend/src/pages/LearningView.jsx#L357-L480), [`QuizModal.jsx`](file:///d:/Projects/EduVerse/frontend/src/components/ui/QuizModal.jsx) | [`videoController.js`](file:///d:/Projects/EduVerse/backend/controllers/videoController.js), [`quizService.js`](file:///d:/Projects/EduVerse/backend/services/quizService.js) | `QuizGenerationMeta` | YouTube Data API v3, aiProvider (OpenRouter/OpenAI/Groq) | AUTOMATED TEST PASSED / FEATURE-GATED | Gated by `FEATURE_IMPROVED_QUIZ=true`; 60s minimum range |
| **Quiz Attempt Mastery Hook** | Records quiz score and updates topic mastery in database | Evaluated Learners | [`QuizModal.jsx`](file:///d:/Projects/EduVerse/frontend/src/components/ui/QuizModal.jsx) | [`QuizModal.jsx`](file:///d:/Projects/EduVerse/frontend/src/components/ui/QuizModal.jsx#L70-L110) | [`routes/skills.js`](file:///d:/Projects/EduVerse/backend/routes/skills.js#L403-L444) | `QuizAttempt, TopicMastery` | None | AUTOMATED TEST PASSED | Percentage $\ge 70\%$ counts as `isCorrect: true` |
| **AI Study Planner** | Creates day-by-day roadmap enriched with curated videos & articles | Students planning exam/study prep | `/planner` | [`StudyPlanner.jsx`](file:///d:/Projects/EduVerse/frontend/src/pages/StudyPlanner.jsx) | [`routes/ai.js`](file:///d:/Projects/EduVerse/backend/routes/ai.js#L17-L84) | `Plan, Activity` | OpenRouter, YouTube API, Google search | AUTOMATED TEST PASSED | Fetches live videos for first 5 days in parallel |
| **Daily Routine Planner** | 16-hour hourly timeblock grid synced between local and backend | Habit Builders | `/planner` (Routine tab) | [`StudyPlanner.jsx`](file:///d:/Projects/EduVerse/frontend/src/pages/StudyPlanner.jsx#L35-L85) | [`routes/users.js`](file:///d:/Projects/EduVerse/backend/routes/users.js#L101-L131) | `User` | None | IMPLEMENTED IN CODE | Synced to `user.dailyRoutine` array |
| **AI Discovery Engine** | Searches YouTube and uses Gemini Flash to filter high-yield tutorials | Course Explorers | `/skills` (Discovery tab) | [`SkillDiscovery.jsx`](file:///d:/Projects/EduVerse/frontend/src/components/skills/SkillDiscovery.jsx) | [`routes/discover.js`](file:///d:/Projects/EduVerse/backend/routes/discover.js#L36-L149) | None (in-memory LRU) | yt-search, OpenRouter (Gemini Flash 1.5) | AUTOMATED TEST PASSED | 500-item in-memory LRU cache with 10-minute TTL |
| **Peer Tutor Network** | Student posts question, peer teachers answer; student accepts solution | Collaborative Students | `/tutor` | [`Tutor.jsx`](file:///d:/Projects/EduVerse/frontend/src/pages/Tutor.jsx) | [`routes/tutor.js`](file:///d:/Projects/EduVerse/backend/routes/tutor.js#L12-L190) | `Problem, Solution, User` | None | AUTOMATED TEST PASSED | $+10$ XP / $+10$ Tutor Points awarded upon acceptance |
| **Project Build Paths (Intake)** | Converts project ideas into multi-milestone engineering blueprints | Software Project Builders | `/build-paths` | [`BuildPaths.jsx`](file:///d:/Projects/EduVerse/frontend/src/pages/BuildPaths.jsx#L110-L165) | [`routes/buildPaths.js`](file:///d:/Projects/EduVerse/backend/routes/buildPaths.js#L35-L103), [`buildPathService.js`](file:///d:/Projects/EduVerse/backend/services/buildPathService.js) | `BuildPathTemplate, UserBuildProgress` | OpenRouter/OpenAI/Groq + YouTube API | AUTOMATED TEST PASSED / FEATURE-GATED | SHA-256 deduplication; Layer 2 structural gate; Layer 3 Quality Judge |
| **Build Path Deliverable Review** | Students submit code/repo; AI evaluates with strengths & suggestions | Learners building tasks | `/build-paths` | [`BuildPaths.jsx`](file:///d:/Projects/EduVerse/frontend/src/pages/BuildPaths.jsx#L295-L350) | [`routes/buildPaths.js`](file:///d:/Projects/EduVerse/backend/routes/buildPaths.js#L218-L292) | `UserBuildProgress, BuildPathTemplate` | OpenRouter / OpenAI | AUTOMATED TEST PASSED / FEATURE-GATED | Hard milestone sequencing; qualitative LLM feedback (no sandbox) |
| **Milestone Completion & XP** | Marks milestone complete and awards idempotent $+50$ XP | Project Builders | `/build-paths` | [`BuildPaths.jsx`](file:///d:/Projects/EduVerse/frontend/src/pages/BuildPaths.jsx#L355-L390) | [`routes/buildPaths.js`](file:///d:/Projects/EduVerse/backend/routes/buildPaths.js#L294-L381) | `UserBuildProgress, User, Activity, Notification` | None | AUTOMATED TEST PASSED / FEATURE-GATED | Idempotent: completing same milestone twice awards 0 additional XP |
| **Milestone Peer Review Bridge** | Bridges milestone code to Peer Tutor Network as a `Problem` | Students seeking human feedback | `/build-paths` | [`BuildPaths.jsx`](file:///d:/Projects/EduVerse/frontend/src/pages/BuildPaths.jsx#L395-L430) | [`routes/buildPaths.js`](file:///d:/Projects/EduVerse/backend/routes/buildPaths.js#L383-L455) | `Problem, UserBuildProgress` | None | AUTOMATED TEST PASSED / FEATURE-GATED | Displays in Tutor Network with purple "Project Build Review" badge |
| **Step-by-Step Implementation Guide** | Generates or retrieves cached 4–6 step guide for milestone tasks | Students stuck on a task | `/build-paths` | [`BuildPaths.jsx`](file:///d:/Projects/EduVerse/frontend/src/pages/BuildPaths.jsx#L260-L290) | [`routes/buildPaths.js`](file:///d:/Projects/EduVerse/backend/routes/buildPaths.js#L142-L177) | `BuildPathTemplate` | OpenRouter / OpenAI | AUTOMATED TEST PASSED / FEATURE-GATED | Caches generated guide on shared template; rate-limited via `aiLimiter` |
| **AI Chatbot Multi-Session** | Interactive AI tutoring with conversation threads & 10-message context | Students with questions | `/chat` | [`Chatbot.jsx`](file:///d:/Projects/EduVerse/frontend/src/pages/Chatbot.jsx) | [`routes/chat.js`](file:///d:/Projects/EduVerse/backend/routes/chat.js#L12-L156) | `ChatSession, ChatMessage` | OpenRouter (gpt-4o-mini) | IMPLEMENTED IN CODE | Migrates legacy `ChatMessage` records into `ChatSession` automatically |
| **Expense Tracker** | Educational spending ledger with category breakdown & Recharts pie | Budgeting Students | `/expenses` | [`ExpenseTracker.jsx`](file:///d:/Projects/EduVerse/frontend/src/pages/ExpenseTracker.jsx) | [`routes/expenses.js`](file:///d:/Projects/EduVerse/backend/routes/expenses.js#L7-L75) | `Expense` | None | IMPLEMENTED IN CODE | Validates amount (max $1,000,000) and allowed category enum |
| **Companion Orb** | Interactive AI assistant widget with mood animations and reactive speech | All Users | Global floating widget | [`CompanionOrb.jsx`](file:///d:/Projects/EduVerse/frontend/src/components/ui/CompanionOrb.jsx), [`CompanionContext.jsx`](file:///d:/Projects/EduVerse/frontend/src/context/CompanionContext.jsx) | None (client-side reactivity) | None | None | IMPLEMENTED IN CODE | Reacts to 16 distinct event triggers across the application |

---

## 5. Detailed User Interaction Walkthrough

To understand how EduVerse behaves in the hands of a real user, we trace the three primary user workflows:

### Journey 1: Project-to-Skill Builder Journey
1. **Intake:** The student navigates to `/build-paths`, opens the intake modal, and enters *"Real-Time Collaborative Code Editor"*, selects *"Intermediate"*, and specifies *"React, Node.js, WebSockets, Redis"*.
2. **Validation:** Frontend checks that input length $\ge 3$ characters.
3. **Dispatch:** Client sends `POST /api/build-paths/generate`.
4. **Backend Ingestion:** Express matches canonical signature. If a duplicate exists, it reuses the template. If not, it executes `generateBuildPathTemplate`.
5. **Quality Gates:** AI returns JSON milestones; backend runs Layer 2 structural validation (verifying 3–10 modules, minimum descriptions $\ge 90$ chars); runs Layer 3 LLM Quality Judge (verifying practical applicability $\ge 7.0/10$).
6. **Enrichment:** Validates official doc links (e.g., `socket.io`, `react.dev`) against allowlist via HTTP; queries YouTube Data API for tutorials (filtered between 180s and 5400s).
7. **Storage:** Saves template to `BuildPathTemplate`; creates `UserBuildProgress` with `currentModuleIndex: 0`.
8. **UI Presentation:** The student sees an interactive milestone roadmap with Milestone 1 unlocked and Milestones 2–5 hard-locked.
9. **Implementation:** Student opens Milestone 1, views the curated video, reads the verified documentation link, and toggles the **Step-by-Step Guide** for a 4-step actionable walkthrough.
10. **Submission:** Student pastes their WebSocket connection code into the deliverable editor and clicks **Submit Deliverable**.
11. **Feedback:** Backend calls `evaluateTaskSubmission`; AI returns structured feedback with 2 strengths and 1 suggestion. The submission and feedback are saved in `UserBuildProgress`.
12. **Completion:** Student clicks **Mark Complete**. Backend validates that Milestone 0 is being completed, executes `awardUserXp(userId, 50)`, updates user level, unlocks Milestone 2, and emits an XP notification.
13. **Peer Escalation:** If the student wants human critique, they click **Request Peer Review**. The backend posts a `Problem` with `isBuildPathReview: true` to `/tutor`.

### Journey 2: Video Course & Contextual Bilingual Quiz Journey
1. **Selection:** Student navigates to `/skills` and clicks on a course (e.g., *"Full Stack MERN Playlist"*).
2. **Player Launch:** `/skills/:id/learn` renders `LearningView.jsx`, loading the YouTube player and playlist sidebar.
3. **Playback Tracking:** Every 10 seconds, `LearningView` calls `PUT /api/skills/:id/progress` sending `watchedDuration`, `totalDuration`, and `currentVideoIndex`.
4. **Monotonic Enforcement:** Backend pre-save hook ensures watched position never decreases even if user scrubs backward.
5. **Completion Hook:** When video finishes, frontend triggers `POST /api/track/video-finished`.
6. **Background Worker:** `quizService` checks if `watchedEndSec - watchedStartSec >= 60`. It extracts creator chapters overlapping the watched window, determines question count ($>1800$s $\to 10$; $\le 1800$s $\to 5$), and initiates `generateBilingualQuiz`.
7. **Bilingual Prompting:** AI returns paired questions with English and Hindi fields.
8. **Interactive Modal:** `QuizModal.jsx` opens, presenting questions with an English/Hindi toggle button.
9. **Submission & Mastery:** Student answers questions and submits. `POST /api/skills/:id/quiz` records the attempt. If score $\ge 70\%$, it calls `updateTopicMastery` with `isCorrect: true`, raising mastery score by $+10$ and pushing next revision due date by 7–30 days.

### Journey 3: Flashcard Spaced Repetition (SM-2) Journey
1. **Creation:** Student highlights text in `SmartNotes.jsx` and clicks **Generate Flashcards**.
2. **Extraction:** Backend AI extracts 5–8 Q&A pairs, saving them into `Flashcard` with `easeFactor: 2.5` and `srsInterval: 1`.
3. **Queue:** On the Dashboard, the pending flashcards widget shows cards due today.
4. **Review:** Student opens `/flashcards/study`, clicks the 3D card to flip, and selects a rating (Forgot, Hard, Good, Easy).
5. **SM-2 Execution:** `PUT /api/flashcards/:id/review` calculates the new interval ($I' = I \times EF$) and ease factor.
6. **Mastery Synchronization:** If rating $\ge 2$, it credits $+10$ mastery points. If rating $= 0$, it penalizes $-15$ points and sets `isWeakArea = true`.

---

## 6. Frontend Architecture

### Core Building Blocks
- **Router:** React Router DOM 7.13.2 configured in [`App.jsx`](file:///d:/Projects/EduVerse/frontend/src/App.jsx) with 17 lazy-loaded components wrapped in `Suspense` and a fallback spinner.
- **State & Context Providers:**
  1. `AuthContext`: Manages user credentials, HttpOnly cookie sync, login/logout, and native guest mode.
  2. `FocusContext`: Owns the global Pomodoro/stopwatch timer interval, sound effects, and XP sync.
  3. `CompanionContext`: State machine driving the Companion Orb's moods and reactive voice.
  4. `ThemeContext`: Toggles dark/light/neon CSS themes.
  5. `InteractionContext`: Coordinates UI interaction effects (e.g., ClickImpact ripple).
- **HTTP Client:** Centralized Axios instance ([`frontend/src/utils/api.js`](file:///d:/Projects/EduVerse/frontend/src/utils/api.js)) configured with `withCredentials: true`, trailing slash normalizer, and request interceptors injecting `Authorization: Bearer <token>` and `X-Timezone`.
- **UI Framework:** Tailwind CSS 3.4.19 with custom neon/glassmorphism design tokens, animated by Framer Motion 12.38.0.
- **Rich Text:** TipTap 3.22.5 with StarterKit, Underline, and Placeholder extensions, cleaned via DOMPurify.

```mermaid
flowchart TD
    subgraph Browser["Client Browser (React 19 + Vite 8)"]
        Router["React Router DOM 7 (App.jsx)"]
        
        subgraph Providers["Context Providers"]
            Auth["AuthContext (Guest & User Sessions)"]
            Focus["FocusContext (Timer & Sound)"]
            Comp["CompanionContext (AI Companion Orb)"]
            Theme["ThemeContext (Design Themes)"]
        end
        
        subgraph Views["17 Lazy-Loaded Page Views"]
            Dash["Dashboard.jsx (Mastery & Activity Charts)"]
            BP["BuildPaths.jsx (Milestone Curriculums)"]
            Learn["LearningView.jsx (Player & Quizzes)"]
            Tutor["Tutor.jsx (Peer Q&A Network)"]
            Notes["SmartNotes.jsx (TipTap Editor)"]
            Flash["FlashcardStudy.jsx (SM-2 SRS)"]
            Skills["SkillsHub.jsx (Course Catalog)"]
        end
        
        Axios["Axios Client (api.js - Bearer Token + X-Timezone)"]
    end
    
    subgraph BackendAPI["Backend REST API (Express 5.2.1)"]
        Endpoints["Express Route Handlers (/api/*)"]
    end

    Router --> Providers
    Providers --> Views
    Views --> Axios
    Axios -->|HTTP Requests withCredentials| Endpoints
```

---

## 7. Backend Architecture & Request Lifecycle

### Server Initialization Sequence
1. [`backend/server.js`](file:///d:/Projects/EduVerse/backend/server.js) loads `.env` and validates 8 required environment variables (`MONGO_URI`, `JWT_SECRET`, `OPENROUTER_API_KEY`, `YOUTUBE_API_KEY`, `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `FRONTEND_URL`, `GOOGLE_CLIENT_ID`).
2. Configures `app.set("trust proxy", 1)` for reverse proxies (Railway/Vercel).
3. Disables command buffering globally via `mongoose.set("bufferCommands", false)` so database outages fail immediately instead of hanging requests.
4. Mounts `cookieParser()`, `helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } })`, and Express 5 recursive MongoDB operator sanitizer.
5. Configures CORS with origin normalization and credentials support.
6. Mounts rate limiters: `authLimiter` (30 req / 15 min), `aiLimiter` (50 req / 15 min), and regex-mounted build path guide limiter.
7. Registers 17 route files.
8. Connects to MongoDB Atlas and starts HTTP server on `PORT` (default 5000).

### End-to-End Request Trace
**Trace:** User Submits Build Path Deliverable
1. **User Action:** User clicks "Submit Deliverable" in `BuildPaths.jsx`.
2. **UI Handler:** `handleSubmitDeliverable()` in [`frontend/src/pages/BuildPaths.jsx#L295`](file:///d:/Projects/EduVerse/frontend/src/pages/BuildPaths.jsx#L295).
3. **API Client:** `api.post('/build-paths/progress/:id/modules/:moduleIndex/submit', { content, submissionType })`.
4. **HTTP Transport:** Sends `POST` with `Bearer <token>` and `X-Timezone: Asia/Kolkata`.
5. **Server Routing:** Routed to `backend/routes/buildPaths.js`.
6. **Middleware:** 
   - `gateFeature` verifies `process.env.FEATURE_PROJECT_BUILD_PATH === 'true'`.
   - `protect` verifies JWT and reads user from in-memory session cache (`getCachedUser`).
7. **Controller/Service Logic:** 
   - Verifies user ownership of progress record.
   - Enforces hard sequencing: checks that module $N-1$ is completed if $N > 0$.
   - Calls `evaluateTaskSubmission()` in `buildPathService.js`.
8. **Downstream Integration:** Calls `callChatCompletion()` in `aiProvider.js` targeting OpenRouter/OpenAI.
9. **Persistence:** Saves feedback, content, and submission timestamp to `UserBuildProgress.completedModules[i]`.
10. **Response:** Returns `200 { success: true, submission, aiFeedback, progress }`.
11. **Frontend Update:** State updates locally; displays formatted strengths and suggestions cards; triggers success toast.

```mermaid
sequenceDiagram
    autonumber
    participant Client as Frontend (BuildPaths.jsx)
    participant Server as Express Server (server.js)
    participant AuthMW as Auth Middleware (auth.js)
    participant Route as BuildPaths Route (buildPaths.js)
    participant Service as BuildPath Service (buildPathService.js)
    participant AI as AI Provider (OpenRouter/OpenAI)
    participant DB as MongoDB Atlas

    Client->>Server: POST /api/build-paths/progress/:id/modules/:idx/submit
    Server->>AuthMW: Validate JWT & check userCache
    AuthMW-->>Server: User verified (req.user)
    Server->>Route: Route handler
    Route->>DB: Find UserBuildProgress & verify ownership
    DB-->>Route: Progress document
    Route->>Route: Enforce hard sequencing (module idx-1 completed?)
    Route->>Service: evaluateTaskSubmission(task, code)
    Service->>AI: callChatCompletion(evaluation prompt)
    AI-->>Service: Structured review JSON {feedback, strengths, suggestions}
    Service-->>Route: Evaluated feedback
    Route->>DB: Update completedModules array in UserBuildProgress
    DB-->>Route: Saved document
    Route-->>Client: 200 OK {success: true, submission, aiFeedback}
    Client->>Client: Render feedback cards & unlock review options
```

---

## 8. Complete API Inventory

The discovered API surface spans 64 endpoints across 17 route files. Below is the master endpoint catalog:

| Method | Route Path | Purpose | Auth Level | Key Payload / Params | Service / Downstream Call | Primary Model(s) |
|---|---|---|---|---|---|---|
| `POST` | `/api/auth/register` | Register new user & send OTP | Public | `{ name, email, password }` | `emailSender.sendOtpEmail` | `User, Activity` |
| `POST` | `/api/auth/verify-otp` | Verify email OTP & activate user | Public | `{ email, otp }` | `emailSender.sendWelcomeEmail` | `User, Notification` |
| `POST` | `/api/auth/resend-otp` | Resend verification OTP | Public (Rate-limited) | `{ email }` | `emailSender.sendOtpEmail` | `User` |
| `POST` | `/api/auth/login` | Authenticate email/password | Public (Rate-limited) | `{ email, password }` | `streak.updateStreak` | `User` |
| `POST` | `/api/auth/google` | Google OAuth token login/register | Public | `{ token }` (Google ID token) | `google-auth-library` | `User, Notification` |
| `POST` | `/api/auth/facebook` | Facebook OAuth login/register | Public | `{ accessToken, userID }` | Facebook Graph API | `User, Notification` |
| `POST` | `/api/auth/forgot-password` | Request password reset email | Public (Rate-limited) | `{ email }` | `emailSender.sendPasswordResetEmail` | `User` |
| `POST` | `/api/auth/reset-password` | Set new password with reset token | Public | `{ token, password }` | bcrypt hash | `User` |
| `POST` | `/api/auth/logout` | Clear auth cookie | Public | None | None | None |
| `GET` | `/api/auth/me` | Fetch authenticated user profile | Protected | None | `streak.updateStreak` | `User` |
| `PUT` | `/api/auth/update-profile` | Update user name and avatar | Protected | `{ name, avatar }` | `auth.invalidateUserCache` | `User` |
| `GET` | `/api/users/me` | Fetch unified user stats DTO | Optional | None | `streak.updateStreak` | `User` |
| `PUT` | `/api/users/add-xp` | Manually add XP & focus time | Protected | `{ xpToAdd, focusSeconds }` | `notification.createNotification` | `User, Activity, Notification` |
| `GET` | `/api/users/routine` | Get 16-hour daily routine grid | Protected | None | None | `User` |
| `PUT` | `/api/users/routine` | Save 16-hour daily routine grid | Protected | `{ routine: [...] }` | `auth.invalidateUserCache` | `User` |
| `GET` | `/api/dashboard` | 7-day activity, stats, mastery & insight | Optional | None | `streak.js`, `mastery.js`, AI insight | `Activity, TopicMastery, User` |
| `POST` | `/api/focus` | Record focus session (sole source of truth) | Protected | `{ type, duration, xpEarned }` | `notification.createNotification` | `FocusSession, User, Activity` |
| `GET` | `/api/focus/history` | Get latest 50 focus sessions | Optional | None | None | `FocusSession` |
| `GET` | `/api/notes` | Get all user notes | Optional | Query `?select=summary` | None | `Note` |
| `POST` | `/api/notes` | Create new note | Protected | `{ title, content, summary }` | `sanitizeNoteHtml` | `Note` |
| `PUT` | `/api/notes/:id` | Update note atomically | Protected | `{ title, content, summary, tags, isPinned }` | `sanitizeNoteHtml` | `Note` |
| `DELETE`| `/api/notes/:id` | Delete user note | Protected | Param `:id` | None | `Note` |
| `GET` | `/api/notes/:id` | Get single note by ID | Protected | Param `:id` | None | `Note` |
| `POST` | `/api/ai/summarize` | AI summarize note content | Protected | `{ content }` | `aiGateway.generateAICompletion` | `Activity` |
| `POST` | `/api/flashcards/generate`| Extract SM-2 flashcard Q&A pairs | Protected | `{ noteContent, topicName, noteId }` | `aiGateway.generateAICompletion` | `Flashcard, Note` |
| `GET` | `/api/flashcards` | Get user flashcards (filter by `?due=true`)| Protected | Query `?due=true&limit=...` | None | `Flashcard` |
| `GET` | `/api/flashcards/pending-count`| Get flashcards due today | Protected | None | None | `Flashcard` |
| `PUT` | `/api/flashcards/:id/review`| Record SM-2 rating & update mastery | Protected | `{ rating: 0|1|2|3 }` | `sm2 algorithm, mastery.updateTopicMastery`| `Flashcard, TopicMastery` |
| `DELETE`| `/api/flashcards/:id` | Delete flashcard | Protected | Param `:id` | None | `Flashcard` |
| `GET` | `/api/skills` | List all tracked skills / courses | Optional | None | None | `Skill` |
| `POST` | `/api/skills` | Add new video/playlist course | Protected | `{ title, category, videoUrl, difficulty }` | `youtubeService.fetchPlaylistDetails` | `Skill` |
| `GET` | `/api/skills/search` | Search YouTube videos by relevance & views | Protected | Query `?q=...` | YouTube Data API v3 | None |
| `GET` | `/api/skills/:id` | Get course details (auto-syncs playlists)| Protected | Param `:id` | `youtubeService.getPlaylistCount` | `Skill` |
| `POST` | `/api/skills/:id/sync` | Manually re-sync playlist videos | Protected | Param `:id` | `youtubeService.fetchPlaylistDetails` | `Skill` |
| `PUT` | `/api/skills/:id/progress` | Update watched duration & advance pointer| Protected | `{ watchedDuration, videoId, isCompleted }` | `quizGenerationJob.reconcilePlaylistProgress`| `Skill, User, Notification` |
| `POST` | `/api/skills/:id/quiz` | Save quiz score & update topic mastery | Protected | `{ score, totalQuestions }` | `mastery.updateTopicMastery` | `QuizAttempt, TopicMastery` |
| `GET` | `/api/skills/:id/quiz` | Get quiz attempts for calendar | Protected | Param `:id` | None | `QuizAttempt` |
| `DELETE`| `/api/skills/:id` | Delete skill course | Protected | Param `:id` | None | `Skill` |
| `POST` | `/api/track/video-finished`| Hook triggering watch-range quiz generation| Optional | `{ videoId, watchedStartSec, watchedEndSec }`| `quizService.generateQuizForWatchRange` | `QuizGenerationMeta, User` |
| `GET` | `/api/videos/:videoId/quizzes`| Get generated watch-range quiz | Optional | Param `:videoId` | `quizService.getQuizForVideo` | `QuizGenerationMeta` |
| `GET` | `/api/quiz-generation/:jobId/status`| Admin/debug job status inspection | Optional | Param `:jobId` | `quizService.getJobStatus` | `QuizGenerationMeta` |
| `POST` | `/api/ai/planner` | Generate day-by-day study roadmap | Protected | `{ subject, durationDays, goal }` | `resources.fetchResourcesForTopic` | `Plan, Activity` |
| `GET` | `/api/ai/planner` | Get saved user study plans | Optional | None | None | `Plan` |
| `DELETE`| `/api/ai/planner/:id` | Delete study plan | Protected | Param `:id` | None | `Plan` |
| `GET` | `/api/discover` | YouTube search + AI educational filter | Optional | Query `?q=...` | `yt-search`, OpenRouter (Gemini Flash) | None (in-memory LRU) |
| `POST` | `/api/skillhub/add-source`| Add discovered source to Skills Hub | Protected | `{ sourceUrl, sourceTitle, sourceType }` | `youtubeService.fetchPlaylistDetails` | `Skill` |
| `POST` | `/api/tutor/problem` | Post new question to peer network | Protected | `{ subject, questionText, image }` | None | `Problem` |
| `GET` | `/api/tutor/my-problems` | Get student's posted questions | Optional | None | None | `Problem, Solution, User` |
| `POST` | `/api/tutor/accept` | Accept teacher solution (+10 XP) | Protected | `{ problemId, solutionId }` | None | `Problem, Solution, User` |
| `GET` | `/api/tutor/problems` | Teacher feed of unsolved questions | Optional | Query `?subject=...` | None | `Problem, User, Solution` |
| `POST` | `/api/tutor/solution` | Teacher submits answer to problem | Protected | `{ problemId, solutionText, image }` | None | `Solution, Problem` |
| `GET` | `/api/tutor/stats` | Tutor network analytics | Optional | None | None | `Problem, Solution, User` |
| `POST` | `/api/build-paths/generate`| Generate or match milestone build path | Protected | `{ projectIdea, techStack, skillLevel, platform }`| `buildPathService.generateBuildPathTemplate`| `BuildPathTemplate, UserBuildProgress` |
| `GET` | `/api/build-paths/templates`| List top 30 popular build path templates | Optional | None | None | `BuildPathTemplate` |
| `GET` | `/api/build-paths/templates/:id`| Get full template details | Optional | Param `:id` | None | `BuildPathTemplate` |
| `GET` | `/api/build-paths/templates/:id/modules/:idx/guide`| Get or generate cached step-by-step guide| Protected (Rate-limited)| Params `:id`, `:idx` | `buildPathService.generateModuleStepByStepGuide`| `BuildPathTemplate` |
| `GET` | `/api/build-paths/progress` | Get user's active build paths | Protected | None | None | `UserBuildProgress, BuildPathTemplate`|
| `GET` | `/api/build-paths/progress/:id`| Get user progress by ID (ownership checked)| Protected | Param `:id` | None | `UserBuildProgress, BuildPathTemplate`|
| `POST` | `/api/build-paths/progress/:id/modules/:idx/submit`| Submit deliverable & get AI review | Protected | `{ submissionType, content }` | `buildPathService.evaluateTaskSubmission`| `UserBuildProgress, BuildPathTemplate`|
| `POST` | `/api/build-paths/progress/:id/modules/:idx/complete`| Mark complete & award idempotent +50 XP | Protected | Params `:id`, `:idx` | `gamification.awardUserXp` | `UserBuildProgress, User, Activity` |
| `POST` | `/api/build-paths/progress/:id/modules/:idx/peer-review`| Bridge milestone deliverable to Tutor Network| Protected | `{ customNote }` | None | `Problem, UserBuildProgress` |
| `DELETE`| `/api/build-paths/progress/:id`| Delete user progress (preserves template) | Protected | Param `:id` | None | `UserBuildProgress, BuildPathTemplate`|
| `POST` | `/api/chat/sessions` | Create new AI chatbot thread | Protected | None | None | `ChatSession` |
| `GET` | `/api/chat/sessions` | List all chatbot threads (with auto-migration)| Protected | None | Migrates legacy `ChatMessage` | `ChatSession, ChatMessage` |
| `GET` | `/api/chat/sessions/:id` | Get full chat session message history | Protected | Param `:id` | None | `ChatSession` |
| `POST` | `/api/chat/sessions/:id/message`| Send message (10-message sliding window) | Protected | `{ message }` | `aiGateway.generateAICompletion` | `ChatSession` |
| `PATCH`| `/api/chat/sessions/:id/rename`| Rename chat thread title | Protected | `{ title }` | None | `ChatSession` |
| `DELETE`| `/api/chat/sessions/:id`| Delete chat thread | Protected | Param `:id` | None | `ChatSession` |
| `GET` | `/api/expenses` | Get expenses with optional date filter | Optional | Query `?startDate=...&endDate=...` | None | `Expense` |
| `POST` | `/api/expenses` | Add new educational expense | Protected | `{ amount, description, category }` | None | `Expense` |
| `DELETE`| `/api/expenses/:id` | Delete expense | Protected | Param `:id` | None | `Expense` |
| `GET` | `/api/notifications` | Get latest 20 notifications | Protected | None | None | `Notification` |
| `PUT` | `/api/notifications/read` | Mark all notifications read | Protected | None | None | `Notification` |
| `POST` | `/api/mastery/track` | Manually track topic progress | Protected | `{ topicName, category, isCorrect, confidence }`| `mastery.updateTopicMastery` | `TopicMastery` |
| `GET` | `/api/mastery/stats` | Learning analytics summary | Protected | None | `mastery.isRevisionDue` | `TopicMastery` |
| `GET` | `/api/mastery/weak` | Top 10 weak topics | Protected | None | None | `TopicMastery` |
| `GET` | `/api/mastery/revision` | Topics currently due for revision | Protected | None | `mastery.isRevisionDue` | `TopicMastery` |
| `GET` | `/api/mastery/mastered` | Mastered topics ($\ge 80$) | Protected | None | None | `TopicMastery` |
| `GET` | `/api/mastery/all` | All tracked topics | Protected | None | None | `TopicMastery` |
| `GET` | `/health`, `/api/health`| Health probe for Railway / uptime | Public | None | None | None |

---

## 9. Database & Data Model Audit

EduVerse defines 18 Mongoose schemas in `backend/models/`.

```mermaid
erDiagram
    User ||--o{ Activity : logs
    User ||--o{ FocusSession : records
    User ||--o{ Note : writes
    User ||--o{ Flashcard : reviews
    User ||--o{ Skill : enrolls
    User ||--o{ QuizAttempt : takes
    User ||--o{ QuizGenerationMeta : triggers
    User ||--o{ TopicMastery : tracks
    User ||--o{ Plan : creates
    User ||--o{ Problem : posts
    User ||--o{ Solution : submits
    User ||--o{ UserBuildProgress : builds
    User ||--o{ ChatSession : chats
    User ||--o{ Notification : receives
    User ||--o{ Expense : tracks
    
    BuildPathTemplate ||--o{ UserBuildProgress : instantiates
    Problem ||--o{ Solution : receives
    Problem ||--o| Solution : accepts
    Note ||--o{ Flashcard : generates
    Skill ||--o{ QuizAttempt : assesses
    TopicMastery ||--o{ Flashcard : links
```

### Schema Analysis & Consistency Rules

1. **`User` ([`models/User.js`](file:///d:/Projects/EduVerse/backend/models/User.js)):**
   - Core fields: `name`, `email` (unique, lowercase, trimmed), `password` (required only if local auth), `authProvider` (local/google/facebook), `googleId`, `facebookId`.
   - Gamification fields: `xp` (default 0), `level` (default 1), `streak` (default 0), `focusHours` (default 0), `tutorPoints` (default 0), `lastActiveDate`.
   - Security fields: `otp`, `otpExpiry`, `otpAttempts`, `isVerified`, `resetPasswordToken`, `resetPasswordExpiry`, `loginAttempts`, `lockUntil`, `lastLogin`.
   - Custom features: `dailyRoutine` array storing 16-hour schedule.
2. **`Skill` ([`models/Skill.js`](file:///d:/Projects/EduVerse/backend/models/Skill.js)):**
   - Types: `video`, `playlist`, `documentation`.
   - Embedded `playlistData`: Contains nested `videos` array (`videoId`, `title`, `duration`, `durationSecs`, `thumbnail`, `isCompleted`, `lastWatchedTimestamp`), `totalVideos`, `currentVideoIndex`.
   - Monotonic pre-save hook: auto-calculates `progress = (completedVideos / totalVideos) * 100` or `(watchedDuration / totalDuration) * 100`; sets `completed = true` at $\ge 95\%$.
   - Compound index: `{ userId: 1, lastWatched: -1, createdAt: -1 }`.
3. **`TopicMastery` ([`models/TopicMastery.js`](file:///d:/Projects/EduVerse/backend/models/TopicMastery.js)):**
   - Fields: `userId`, `topicName`, `canonicalTopicName` (lowercase trimmed), `category`, `categories` array (multi-source deduplication), `sources` array (bounded to 10 entries tracking flashcard/quiz/manual counts), `masteryScore` (0–100), `confidenceScore` (0–100), `correctAttempts`, `wrongAttempts`, `lastStudiedAt`, `nextRevisionDue`, `difficultyLevel`, `isWeakArea`.
   - Pre-save hook: populates `canonicalTopicName` and `categories`.
   - Compound indexes: `{ userId: 1, canonicalTopicName: 1 }`, `{ userId: 1, topicName: 1, category: 1 }`, `{ userId: 1, isWeakArea: 1 }`, `{ userId: 1, nextRevisionDue: 1 }`.
4. **`BuildPathTemplate` ([`models/BuildPathTemplate.js`](file:///d:/Projects/EduVerse/backend/models/BuildPathTemplate.js)):**
   - Shared, reusable curriculum document.
   - Fields: `canonicalSignature` (unique SHA-256 hash), `canonicalKey`, `projectIdea`, `normalizedTitle`, `overview`, `techStack` array, `skillLevel`, `platform`, `qualityScore` (from Layer 3 Judge), `usageCount`.
   - Embedded `modules` array: each has `moduleIndex`, `title`, `description`, `estimatedMinutes`, `handsOnTask` (`title`, `instructions`, `deliverableType`, `evaluationCriteria`), `youtubeResources` (`title`, `url`, `videoId`, `channel`, `duration`, `views`), `docLink` (`title`, `url`, `domain`, `isVerified`), and cached `stepByStepGuide` array.
5. **`UserBuildProgress` ([`models/UserBuildProgress.js`](file:///d:/Projects/EduVerse/backend/models/UserBuildProgress.js)):**
   - Individual user progress linking to `BuildPathTemplate`.
   - Fields: `userId`, `templateId`, `status` (`active`, `completed`, `abandoned`), `currentModuleIndex`, `totalXpEarned`.
   - Embedded `completedModules`: `moduleIndex`, `completedAt`, `xpAwarded`, `submission` (`submissionType`, `content`, `submittedAt`), `aiFeedback` (`feedback`, `strengths`, `suggestions`), `peerReviewProblemId`.
   - Unique compound index: `{ userId: 1, templateId: 1 }`.
6. **`QuizGenerationMeta` ([`models/quizGenerationMeta.js`](file:///d:/Projects/EduVerse/backend/models/quizGenerationMeta.js)):**
   - Tracks watch-range quiz generation jobs and caching.
   - Fields: `userId`, `videoId`, `skillId`, `jobId` (unique), `status` (`in-progress`, `success`, `failed`), `watchedStartSec`, `watchedEndSec`, `videoDurationSec`, `targetQuestionCount`, `quiz` (`questions` array with English & Hindi pairs), `attempts`, `qualityScore`, `contextType`, `tokensUsed`, `generationLatencyMs`, `errorMessage`.
   - Idempotency Lock: strictly unique on `{ userId: 1, videoId: 1 }`.
7. **`Flashcard` ([`models/Flashcard.js`](file:///d:/Projects/EduVerse/backend/models/Flashcard.js)):**
   - SM-2 Spaced Repetition card.
   - Fields: `userId`, `topicId` (links to `TopicMastery`), `sourceNoteId` (links to `Note`), `front`, `back`, `nextReviewDate`, `srsInterval`, `easeFactor` (min 1.3), `repetitions`, `history` array, `totalReviews`.
   - Compound index: `{ userId: 1, nextReviewDate: 1 }`.
8. **`Problem` & `Solution` ([`models/Problem.js`](file:///d:/Projects/EduVerse/backend/models/Problem.js), [`models/Solution.js`](file:///d:/Projects/EduVerse/backend/models/Solution.js)):**
   - Peer Tutor Network models. `Problem` includes additive `isBuildPathReview` (Boolean) and `buildPathMeta` (`templateId`, `moduleIndex`, `moduleTitle`) to support milestone code reviews.

---

## 10. AI & External Integration Audit

### AI Services Matrix

| Integration Name | Provider / SDK | Trigger / Endpoint | Input Context | Model Selected | Retry / Circuit Breaker Behavior | Output Verification |
|---|---|---|---|---|---|---|
| **Build Path Curriculum Generator** | OpenRouter / OpenAI / Groq | `POST /api/build-paths/generate` | Project idea, tech stack, skill level, platform | `gpt-4o-mini` or priority list | 2 attempts with temperature amplification ($0.3 \to 0.4$) | Layer 2 structural validation + Layer 3 Quality Judge ($\ge 7.0/10$) |
| **Build Path Quality Judge** | OpenRouter / OpenAI | Internal service call | Generated milestones sample | `gpt-4o-mini` | Fallback score 7.8 on network failure | Strict JSON score (1–10 scale) |
| **Deliverable Task Reviewer** | OpenRouter / OpenAI | `POST /api/build-paths/.../submit` | Project title, milestone task requirements, student deliverable | `gpt-4o-mini` | Graceful fallback on LLM error | Strict JSON `{ feedback, strengths, suggestions }` |
| **Step-by-Step Guide Generator** | OpenRouter / OpenAI | `GET /api/build-paths/.../guide` | Project idea, tech stack, milestone title, task criteria | `gpt-4o-mini` | 2 generation attempts with structural validation | Enforces $\ge 4$ unique, project-specific steps |
| **Watch-Range Bilingual Quiz** | OpenRouter / OpenAI / Groq | `POST /api/track/video-finished` | YouTube chapters, duration, video title/description excerpt | `gpt-4o-mini` | Circuit breaker (3 fails $\to$ 60s cooldown); exponential backoff | Validates 4 unique options, bilingual parity, correctIndex 0–3 |
| **Study Planner Roadmap** | OpenRouter | `POST /api/ai/planner` | Subject, duration in days, goal | `gpt-4o-mini` | Timeout 15s | `parseJSONSafely` regex recovery |
| **Educational Video Discovery** | OpenRouter | `GET /api/discover` | YouTube search results summary | `google/gemini-flash-1.5` | Fallback to raw YouTube results if AI fails | Extracts JSON indices and difficulty tags |
| **Note Summarizer & Flashcard Extractor**| OpenRouter | `POST /api/ai/summarize`, `POST /api/flashcards/generate` | Note text (HTML stripped via regex/DOMPurify) | `gpt-4o-mini` | Error normalization (402, 429, timeout) | `safeParseJSON` code fence stripper |
| **AI Chatbot Tutor** | OpenRouter | `POST /api/chat/sessions/:id/message`| User query + last 10 messages from thread | `gpt-4o-mini` | Token cap: 1500 tokens | String reply appended to `ChatSession` |
| **Dashboard AI Coach Insight** | OpenRouter | `GET /api/dashboard` | Student level, streak, focus hours | `openai/gpt-4o-mini` | Fallback default encouraging message | 12-hour in-memory cache |

### External Network Integrations
1. **YouTube Data API v3 & ytpl / yt-search:**
   - Used for playlist metadata extraction, video duration parsing, and curated video search.
   - Sourced curation applies view-count ranking and 3–90 minute duration filters.
   - Fallback hierarchy: YouTube Data API v3 $\to$ `yt-search` scraping.
2. **Brevo (Sendinblue) HTTP API:**
   - Used in `backend/utils/emailSender.js` via direct `fetch('https://api.brevo.com/v3/smtp/email')`.
   - Sends transactional HTML emails for registration OTP, welcome onboarding, and password reset links.
3. **Google Identity Services (GIS):**
   - Script dynamically loaded via `https://accounts.google.com/gsi/client`.
   - Client sends Google ID token; backend verifies token server-side via `google-auth-library` (`OAuth2Client.verifyIdToken`).
4. **Facebook JavaScript SDK:**
   - Loaded via `https://connect.facebook.net/en_US/sdk.js` with App ID; backend verifies access token against Graph API.

---

## 11. Dedicated Analysis: Project → Skill & Project Build Paths

This section provides the dedicated audit of the Project Build Paths system as mandated by Part 10 of the Master Prompt.

```mermaid
flowchart TD
    subgraph Intake["1. User Intake Flow"]
        Input["User specifies: Project Idea, Tech Stack, Level, Platform"]
        Hash["Generate Canonical SHA-256 Signature"]
    end
    
    subgraph ReuseCheck["2. Template Deduplication"]
        Exact["Exact Signature Match?"]
        Fuzzy["Jaccard Token Similarity >= 0.75?"]
        Reuse["Reuse Existing BuildPathTemplate (usageCount++)"]
    end
    
    subgraph Generation["3. Multi-Layer Generation Pipeline"]
        LLMGen["LLM Generates 4-6 Milestones"]
        L2["Layer 2: Structural Validation Gate (3-10 modules, min lengths)"]
        L3["Layer 3: Quality Judge (Scored 1-10; threshold >= 7.0)"]
        Amp["Retry with Quality Amplification Prompt"]
    end
    
    subgraph Enrichment["4. Sourced Resource Enrichment"]
        DocCheck["Official Doc Link Check (30-Domain Allowlist + HTTP GET)"]
        YTCheck["Sourced YouTube Curation (3-90 min Duration Filter)"]
    end
    
    subgraph Execution["5. Learner Build Path Execution"]
        Seq["Hard Sequencing: Milestone N locked until N-1 completed"]
        Guide["On-Demand Step-by-Step Guide (Cached onto Template)"]
        Submit["Submit Deliverable (Text/Code/Repo URL)"]
        Review["AI Code Review (Strengths & Suggestions)"]
        Complete["Mark Complete -> Strictly Idempotent +50 XP (awardUserXp)"]
        Peer["Bridge to Peer Tutor Network (Problem with isBuildPathReview)"]
    end
    
    subgraph GapAnalysis["6. Disconnected Remediation Loop"]
        MissingMastery["Does NOT write to TopicMastery"]
        MissingCourse["Does NOT auto-queue remediating course from Skills Hub"]
    end

    Input --> Hash --> Exact
    Exact -- Yes --> Reuse
    Exact -- No --> Fuzzy
    Fuzzy -- Yes --> Reuse
    Fuzzy -- No --> LLMGen
    
    LLMGen --> L2
    L2 -- Pass --> L3
    L2 -- Fail --> Amp --> LLMGen
    L3 -- Score >= 7.0 --> DocCheck
    L3 -- Score < 7.0 --> Amp
    
    DocCheck --> YTCheck --> Execution
    Reuse --> Execution
    
    Execution --> Seq --> Guide --> Submit --> Review --> Complete
    Submit --> Peer
    Review -.-> MissingMastery
    MissingMastery -.-> MissingCourse

    classDef implemented fill:#1e293b,stroke:#3b82f6,stroke-width:2px;
    classDef gap fill:#451a03,stroke:#f59e0b,stroke-width:2px,stroke-dasharray: 5 5;
    class Input,Hash,Exact,Fuzzy,Reuse,LLMGen,L2,L3,Amp,DocCheck,YTCheck,Seq,Guide,Submit,Review,Complete,Peer implemented;
    class MissingMastery,MissingCourse gap;
```

### 15 Architectural Inquiries: Detailed Code Findings

1. **How a learner expresses a desired project goal:** In [`frontend/src/pages/BuildPaths.jsx#L110-L165`](file:///d:/Projects/EduVerse/frontend/src/pages/BuildPaths.jsx#L110-L165), user inputs a natural language description, skill level (beginner/intermediate/advanced), tech stack, and platform.
2. **How required skills are derived:** Derived dynamically during AI curriculum generation in [`backend/services/buildPathService.js#L275-L314`](file:///d:/Projects/EduVerse/backend/services/buildPathService.js#L275-L314). The prompt directs the LLM to identify the core technology and specific deliverable required for each milestone.
3. **How prerequisites are determined and ordered:** Sequenced progressively from setup/foundation to advanced integration by prompt instruction and validated via `moduleIndex: 0, 1, 2...`.
4. **Stages / Milestones:** Each curriculum consists of 4 to 6 ordered milestones containing title, detailed description, estimated minutes, core technology, official doc link, curated YouTube videos, hands-on task, and step-by-step guide.
5. **How project tasks and milestones are generated:** Generated via `generateBuildPathTemplate()` with 2-pass retry, Layer 2 structural validation (rejecting descriptions $<90$ chars or instructions $<30$ chars), and Layer 3 Quality Judge scoring on a 1–10 scale.
6. **How documentation and resources are attached:** Validated against `OFFICIAL_DOC_ALLOWLIST` (30 domains) with live HTTP GET requests; YouTube videos curated via YouTube Data API v3 and `yt-search` with duration filters (180s to 5400s).
7. **How progress is stored:** Stored in `UserBuildProgress` with unique compound index `{ userId: 1, templateId: 1 }`.
8. **How a learner submits a task:** User enters text/code/repo URL in `BuildPaths.jsx` deliverable panel, calling `POST /api/build-paths/progress/:id/modules/:moduleIndex/submit`.
9. **How result is evaluated:** Evaluated via `evaluateTaskSubmission()` in `buildPathService.js` using LLM prompt returning structured JSON `{ feedback, strengths, suggestions }`.
10. **Deterministic vs AI:** Evaluation is **AI-based semantic feedback**.
11. **Code compilation / execution:** **No code is compiled or executed in a sandbox.**
12. **Mastery records modification on failure:** **No.** `UserBuildProgress` does not call `updateTopicMastery`.
13. **Missing concept identification:** Qualitative suggestions are returned in text, but no discrete topic entity is emitted.
14. **Learning material recommendation:** Video resources and doc links attached to the milestone are displayed, but no dynamic external remediation course is attached.
15. **Full project-failure-to-remediation loop status:** **DISCONNECTED.** The project build path module and topic mastery engine operate independently.

---

## 12. Build, Testing, Reliability, Security & Deployment

### Automated Test Results (Executed During Audit)
All tests executed synchronously via `node --test` with 0 errors:

1. **`backend/tests/quizSystem.test.js`:** 16 tests passed (11.4s). Duration rules, chapter parsing, JSON repair, bilingual validation, idempotency caching, quality judge retry, status gating.
2. **`backend/tests/buildPathSystem.test.js`:** 26 tests passed (2.1s). Canonical signature deduplication, Layer 2 structural gate, doc allowlist HTTP verification, video curation heuristics, AI feedback, gamification idempotency, feature flag gating, peer review contract, template isolation, hard sequencing, step guide caching.
3. **`backend/tests/fullPhases.test.js`:** 15 tests passed (0.6s). Email normalization, XP formula, AI gateway JSON parser, bounded LRU cache, Mongoose compound indexes, timezone-aware streak.
4. **`backend/tests/masteryDashboardCorrectness.test.js`:** 17 tests passed (0.5s). IANA timezone handling, Notes mastery signal decoupling, canonical topic normalization, strict revision scheduling (`isRevisionDue`), multi-source evidence, frontend route wiring.
5. **`backend/tests/playlistFixes.test.js`:** 10 tests passed (3.1s). Desktop layout structure, navigation snap-back prevention, monotonic progress rules, playlist re-sync, 60s sync throttle.
- **Total Tests Passed:** **84 tests passed, 0 failed, 0 skipped.**

### Frontend Build & Lint Findings
- **Vite Production Build:** Executed `npm run build --prefix frontend`. **Exit Code: 0 (Success).** Transformed 3,487 modules in 47.12 seconds. Built all 17 page chunks cleanly.
- **ESLint Check:** Executed `npm run lint --prefix frontend`. **Exit Code: 1.** Found 125 issues (115 errors, 10 warnings), predominantly unused variable declarations (e.g. unused `motion` imports in auth pages) and a CommonJS export warning in `tailwind.config.js`.

### Security & Reliability Controls
- **JWT & Session Security:** Signed with `JWT_SECRET`, expires in 7 days. Dual delivery via HttpOnly cookie and Bearer header.
- **MongoDB Injection Prevention:** Custom recursive operator sanitizer in `server.js` strips all keys starting with `$` or containing `.`.
- **Stored XSS Prevention:** TipTap HTML sanitized server-side in `notes.js` via regex stripping `<script>`, `<iframe>`, `<object>`, `<embed>`, inline event handlers, and `javascript:` URIs. DOMPurify cleans client HTML.
- **AI Circuit Breaker:** Tracks provider failures; trips circuit after 3 consecutive errors; enforces 60s cooldown.
- **Rate Limiting:** Protects auth endpoints (30 req / 15 min), AI endpoints (50 req / 15 min), and step guide generator.

### Deployment Configuration
- **Backend:** Railway deployment configured in [`backend/railway.json`](file:///d:/Projects/EduVerse/backend/railway.json) using Nixpacks builder, start command `node server.js`, health check path `/health`, 30s timeout, restart on failure.
- **Frontend:** Vercel deployment configured in [`frontend/vercel.json`](file:///d:/Projects/EduVerse/frontend/vercel.json) with SPA catch-all rewrite rule to `/index.html`.

---

## 13. Product Purpose, Target Personas & User Experience

### Primary Problem Addressed
Most online learners suffer from **"Tutorial Hell"**: they watch hundreds of hours of coding videos, understand the instructor's code, but experience complete cognitive paralysis when asked to build an independent software project from scratch.

### Target Personas
1. **The College Computer Science Student:** Preparing for placements or hackathons; needs verifiable portfolio projects and rapid conceptual revision.
2. **The Self-Taught Developer:** Switching careers; needs structure, milestone accountability, and guidance on industry-standard architecture.
3. **The Lifelong Tech Explorer:** Curious about emerging tech (AI, WebSockets, DevOps); wants curated learning without wading through clickbait.

### Core Strengths of the Experience
- **Fluid, Uncluttered Interface:** High-end glassmorphism aesthetic with zero jarring layout shifts, powered by responsive sidebars, smooth Framer Motion transitions, and the interactive Companion Orb.
- **Frictionless Onboarding:** Native Guest Mode lets visitors explore the Dashboard, Course Catalog, and Tutor Network before being asked to sign up.

---

## 14. Architecture & Workflow Diagrams

### 1. Overall System Architecture
```mermaid
flowchart TD
    Client["Frontend SPA (React 19 + Vite 8 + Tailwind)"]
    Proxy["Reverse Proxy (Vercel / Railway)"]
    API["Express 5 REST API Server"]
    DB[(MongoDB Atlas)]
    AIProvider["AI Provider Gateway (OpenRouter / OpenAI / Groq)"]
    YT["YouTube Data API v3"]
    Brevo["Brevo SMTP API"]

    Client -->|HTTPS / WSS| Proxy
    Proxy -->|REST Requests| API
    API -->|Mongoose 9 ODM| DB
    API -->|LLM Chat Completions| AIProvider
    API -->|Video / Playlist Queries| YT
    API -->|Transactional Emails| Brevo
```

### 2. Topic Mastery & Spaced Repetition Lifecycle
```mermaid
stateDiagram-v2
    [*] --> NewTopic: Discovered via Video Quiz or Flashcard
    NewTopic --> Assessment: User takes Quiz or reviews Flashcard
    Assessment --> Mastered: Score >= 80% (Revision due in 30 days)
    Assessment --> Progressing: Score 40-79% (Revision due in 7-14 days)
    Assessment --> WeakArea: Score < 40% or Forgot (Revision due in 1-3 days)
    WeakArea --> Assessment: Review Flashcard or Retake Quiz
    Progressing --> Assessment: Spaced Repetition Interval Reached
    Mastered --> Assessment: Retention Check
```

---

## 15. Known Problems, Inconsistencies & Limitations

1. **Working-Tree Modifications Pending:** 13 modified files and 7 untracked files in the Git workspace represent recent active development (Build Paths, streak fixes, peer review bridges). They must be formally committed to `main` before deployment.
2. **Root `README.md` Inaccuracy:** The documentation is severely out of sync with code reality, labeling implemented features as future work.
3. **ESLint Errors:** 125 linting errors in the frontend (primarily unused imports in auth components).
4. **Code Execution Sandbox Absence:** Task deliverables are evaluated via AI prompt text analysis, not sandbox container execution.
5. **Disconnected Project-to-Mastery Remediation Loop:** The Build Path task evaluation does not write to the Topic Mastery engine or recommend targeted remediation courses from the Skills Hub.

---

## 16. Hackyard-Specific Engineering Assessment

EduVerse is assessed against the official Hackyard Build 2026 judging criteria:

### 1. Build (40%)
- **Score Potential: High (8.5–9.0/10)**
- **Rationale:** 84 passing tests, clean Vite production build, Express 5 + React 19 modern stack, 18 schemas with compound indexing, circuit breakers, and rate limiters demonstrate exceptionally disciplined engineering.

### 2. Problem (20%)
- **Score Potential: High (8.5/10)**
- **Rationale:** "Tutorial Hell" is universally understood by judges and engineers. Bridging open-ended project intake to structured engineering milestones directly attacks a massive market pain point.

### 3. Ingenuity (20%)
- **Score Potential: High (8.5/10)**
- **Rationale:** 3-Layer Quality Gating (Structural Gate + LLM Judge), SHA-256 canonical deduplication, allowlisted doc-link verification, and watch-range chapter parsing represent non-trivial systems thinking beyond simple wrapper apps.

### 4. Potential (20%)
- **Score Potential: High (8.0/10)**
- **Rationale:** Can expand into institutional learning, bootcamps, and developer hiring assessments.

---

## 17. Candidate Onsite Contributions & Final Recommendation

### Candidate 1: The Closed-Loop "Project Gap $\to$ Skill Remediation" Engine (RECOMMENDED)
- **Problem:** Students struggle on project milestones without an automatic learning bridge to master the underlying prerequisite concepts.
- **Existing Foundation Reused:** `buildPathService.js`, `UserBuildProgress`, `TopicMastery`, `updateTopicMastery`, `Skill`, and `SkillHub`.
- **What Must Be Built Onsite:**
  1. Modify `evaluateTaskSubmission` to identify 1–2 specific conceptual skill gaps.
  2. Wire `POST /build-paths/.../submit` to call `updateTopicMastery` with `isCorrect: false` and mark `isWeakArea: true`.
  3. Query `Skill` library or YouTube Data API to prescribe a 5-minute targeted remediation module.
  4. Display an interactive *"Bridge This Skill Gap"* drawer in `BuildPaths.jsx`.
- **User-Visible Result:** When flawed code is submitted, EduVerse pinpoints the exact concept gap, marks it in the Mastery Overview, and immediately recommends a 5-minute remedial video and quiz.
- **Feasibility:** High. Can be built, tested, and demoed comfortably within the hackathon build window without external infrastructure risks.

### Candidate 2: In-Browser Interactive Code Execution & Unit Test Verification Sandbox
- **Problem:** Milestone code submissions rely on LLM text evaluation rather than running real code.
- **Existing Foundation Reused:** Hands-on task evaluation panel in `BuildPaths.jsx`.
- **What Must Be Built Onsite:** In-browser WebAssembly runner (Pyodide or JS iframe) executing milestone code against automated assertions.
- **Feasibility:** Moderate to Low. High risk of browser security header conflicts (COOP/COEP) with YouTube embeds under hackathon time limits.

### Candidate 3: Live Collaborative Peer Code Review & XP Bounties
- **Problem:** Peer reviews posted to the Tutor Network are asynchronous forum threads without live code diffing.
- **Existing Foundation Reused:** Problem/Solution models, `isBuildPathReview` badge, `tutor.js`.
- **What Must Be Built Onsite:** Side-by-side code diff viewer for milestone reviews and real-time notification socket.
- **Feasibility:** Moderate. Good demo appeal, but does not advance the core Project-to-Skill thesis as strongly as Candidate 1.

### Final Recommendation
**Implement Candidate 1.** It directly closes the loop between the two strongest subsystems in the repository (Project Build Paths and Topic Mastery), transforming EduVerse into a truly cohesive, self-healing learning engine.

---

## 18. Exact References to Relevant Source Files & Line Ranges

- **Server Bootstrap & Security:** [`backend/server.js#L1-L197`](file:///d:/Projects/EduVerse/backend/server.js#L1-L197)
- **Auth Middleware & User Cache:** [`backend/middlewares/auth.js#L4-L94`](file:///d:/Projects/EduVerse/backend/middlewares/auth.js#L4-L94)
- **Project Build Path Engine:** [`backend/services/buildPathService.js#L1-L606`](file:///d:/Projects/EduVerse/backend/services/buildPathService.js#L1-L606)
- **Build Path Endpoints:** [`backend/routes/buildPaths.js#L1-L490`](file:///d:/Projects/EduVerse/backend/routes/buildPaths.js#L1-L490)
- **Build Path Frontend:** [`frontend/src/pages/BuildPaths.jsx#L1-L1404`](file:///d:/Projects/EduVerse/frontend/src/pages/BuildPaths.jsx#L1-L1404)
- **Topic Mastery Service:** [`backend/utils/mastery.js#L1-L151`](file:///d:/Projects/EduVerse/backend/utils/mastery.js#L1-L151)
- **Timezone Streak Utility:** [`backend/utils/streak.js#L1-L176`](file:///d:/Projects/EduVerse/backend/utils/streak.js#L1-L176)
- **Watch-Range Quiz Service:** [`backend/services/quizService.js#L1-L314`](file:///d:/Projects/EduVerse/backend/services/quizService.js#L1-L314)
- **AI Provider Circuit Breaker:** [`backend/integrations/aiProvider.js#L10-L140`](file:///d:/Projects/EduVerse/backend/integrations/aiProvider.js#L10-L140)
- **YouTube Curation Service:** [`backend/integrations/youtubeService.js#L306-L412`](file:///d:/Projects/EduVerse/backend/integrations/youtubeService.js#L306-L412)
- **Gamification Single Source of Truth:** [`backend/utils/gamification.js#L1-L71`](file:///d:/Projects/EduVerse/backend/utils/gamification.js#L1-L71)
- **LearningView Video Player:** [`frontend/src/pages/LearningView.jsx#L350-L500`](file:///d:/Projects/EduVerse/frontend/src/pages/LearningView.jsx#L350-L500)
- **Peer Tutor Network:** [`backend/routes/tutor.js#L1-L226`](file:///d:/Projects/EduVerse/backend/routes/tutor.js#L1-L226), [`frontend/src/pages/Tutor.jsx#L1-L469`](file:///d:/Projects/EduVerse/frontend/src/pages/Tutor.jsx#L1-L469)
- **TipTap Smart Notes:** [`frontend/src/pages/SmartNotes.jsx#L1-L624`](file:///d:/Projects/EduVerse/frontend/src/pages/SmartNotes.jsx#L1-L624), [`backend/routes/notes.js#L1-L125`](file:///d:/Projects/EduVerse/backend/routes/notes.js#L1-L125)
- **SM-2 Flashcard Study:** [`frontend/src/pages/FlashcardStudy.jsx#L1-L412`](file:///d:/Projects/EduVerse/frontend/src/pages/FlashcardStudy.jsx#L1-L412), [`backend/routes/flashcards.js#L1-L275`](file:///d:/Projects/EduVerse/backend/routes/flashcards.js#L1-L275)

---

## 19. Repository Files & Areas Not Inspected

The following areas were excluded from active inspection during this audit:
1. **Third-Party Node Modules:** `backend/node_modules`, `frontend/node_modules`, and root `node_modules`. Excluded because they contain vendor code, verified solely via lockfiles.
2. **Binary Image Assets:** `frontend/public/favicon.png` (1.6 MB), `frontend/src/assets/hero.png` (44.9 KB). Binary media files not subject to semantic source review.
3. **Live External Third-Party Accounts:** Live Brevo dashboard, Google Cloud Console OAuth consent screen, and Facebook Developer App settings were not accessed directly. Implementation was verified from source code and environment variable declarations.
4. **Live Railway Production Server Shell:** No remote SSH or destructive operations were executed against deployed cloud databases, adhering strictly to rule 1.4.

---

## 20. Final Evidence-Based Claim Register

All assertions in this audit are grounded in the four evidentiary classes defined in Part 1.5:

- **Claim A1 (Static Implementation Evidence):** The application features 18 Mongoose models, 64 REST API endpoints, 17 frontend pages, and 5 context providers. Confirmed via file inspection of every source module.
- **Claim B1 (Automated Verification):** All 84 unit and integration tests across 5 test suites pass without errors (`quizSystem`, `buildPathSystem`, `fullPhases`, `masteryDashboardCorrectness`, `playlistFixes`).
- **Claim B2 (Automated Verification):** Frontend production build compiles cleanly via Vite in 47.12 seconds, producing minified client chunks for all 17 routes.
- **Claim B3 (Automated Verification):** ESLint reports 125 issues (115 errors, 10 warnings), predominantly unused variable imports.
- **Claim C1 (Runtime Verification):** Monotonic progress pointers prevent watch history regression; SHA-256 canonical token deduplication generates matching hashes across whitespace and case variations.
- **Claim D1 (Production Verification):** Railway deployment manifest (`railway.json`) and Vercel routing rewrites (`vercel.json`) are configured in code; live production availability depends on deployment environment credentials.
