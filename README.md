# GymGenie: AI Exercise Tutor

[![CI](https://github.com/alokprasad573/AI-Exercise-Tutor/actions/workflows/ci.yml/badge.svg)](https://github.com/alokprasad573/AI-Exercise-Tutor/actions/workflows/ci.yml)
[![CD](https://github.com/alokprasad573/AI-Exercise-Tutor/actions/workflows/cd.yml/badge.svg)](https://github.com/alokprasad573/AI-Exercise-Tutor/actions/workflows/cd.yml)

A production-grade, privacy-first web application providing client-side real-time exercise pose tracking, deterministic rep counting, form breakdown detection, and multi-tier AI coaching. Built as a unified full-stack **Next.js 16** (Webpack) application using **MediaPipe Tasks Vision**, **React 19**, **MongoDB Atlas**, **Three.js**, and the **Groq Cloud LLM SDK**.

---

## Documentation Index

Comprehensive, production-grade technical documentation is available:

- 🏗️ **[Architecture & System Design](ARCHITECTURE.md)** (also mirrored in `docs/ARCHITECTURE.md`)
- 🗄️ **[Database Structure & Schema Specification](DATABASE_STRUCTURE.md)** (also mirrored in `docs/DATABASE_STRUCTURE.md`)
- 🔌 **[Complete API Specifications](API_SPECIFICATIONS.md)** (also mirrored in `docs/API_SPECIFICATIONS.md`)
- 📋 **[Complete Features & Biomechanics Inventory](FEATURES.md)** (also mirrored in `docs/FEATURES.md`)

---

## Key Features

- **In-Browser Computer Vision:** 33 normalized biomechanical 3D landmarks extracted in real time via `@mediapipe/tasks-vision` (`PoseLandmarker` in `VIDEO` mode). Zero video frames or raw landmarks are ever streamed over the network.
- **Five Biomechanical Exercise Detectors:**
  - 🏋️ **Squats:** Hip/knee depth detection (`< 100°`), knee valgus, and forward torso lean alerts (`< 130°`).
  - 💪 **Push-ups:** Chest depth, elbow flexion (`< 90°`), plank alignment, and hip sag / piking monitoring.
  - 🦾 **Biceps Curls:** Peak contraction angles, horizontal elbow drift tracking, and torso swing alerts (`> 15°`).
  - 🏋️‍♂️ **Shoulder Press:** Overhead extension tracking (`> 150°`) and lumbar spine arching protection (`> 15°`).
  - 🏃 **Lunges:** Front knee angle tracking (`< 100°`) and lateral stance balance stability monitoring.
- **Multi-Tier AI Coaching:**
  - **Tier 1 (Primary Model):** `openai/gpt-oss-120b` via server-side Groq SDK.
  - **Tier 2 (Fallback Model):** `openai/gpt-oss-20b` invoked automatically if primary model times out (4s) or encounters provider errors.
  - **Tier 3 (Local Cues):** Deterministic corrective voice cues from `src/services/coaching/prompts.ts` if offline.
- **Browser Spoken Feedback:** Hands-free audible cues delivered with zero network latency using `window.speechSynthesis`.
- **Interactive 3D Avatar Wireframe:** Three.js / React Three Fiber interactive wireframe rig with dynamic mouse/pointer yaw and pitch responsiveness, plus SVG fallback for reduced motion or non-WebGL devices.
- **Robust Authentication & Security:**
  - Argon2id password hashing (`m=65536, t=3, p=1`) with timing attack dummy verification.
  - Short-lived signed JWT access tokens (`gg_access`) and 7-day rotating refresh tokens (`gg_refresh`).
  - Automatic session-family revocation upon refresh token reuse detection.
  - Self-service password reset with single-use SHA-256 tokens.
- **Analytics & History:** Visualized via Recharts: weekly volume bars, monthly duration area charts, exercise distribution donuts, and rep progression curves.
- **Fail-Safe Data Layer:** Automatic seamless fallback to an in-memory repository store (`src/repositories/memory-store.ts`) when MongoDB is disconnected or offline.

---

## Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Framework** | Next.js 16.4.6 (Webpack) | Full-stack App Router monolith |
| **Language** | TypeScript 5 (strict mode) | End-to-end type safety |
| **Frontend** | React 19, Tailwind CSS v4, Radix UI | Modern, accessible responsive interface |
| **Computer Vision** | `@mediapipe/tasks-vision` | Browser-side 33-landmark pose tracking |
| **3D & Motion** | Three.js, React Three Fiber, GSAP, Framer Motion | 3D avatar rig and scroll animations |
| **Database** | MongoDB Atlas & Mongoose 8 | User accounts, sessions, and workout history |
| **Auth** | `jose` (JWT) & Argon2id | Dual-cookie token rotation and password hashing |
| **AI LLM** | Groq Cloud JavaScript SDK | High-speed multi-model corrective coaching cues |
| **Testing** | Vitest (50 tests) & Playwright | Complete unit, integration, and E2E coverage |

---

## Prerequisites

- **Node.js:** `v22.x` or higher (verified on Node.js `v26.13.0` and `v24.x`).
- **Package Manager:** `npm` (bundled with Node.js).
- **Webcam:** Required for live pose tracking and exercise detection.
- **MongoDB Cluster (Optional):** MongoDB Atlas or local MongoDB instance (the application automatically runs using an in-memory store if omitted).
- **Groq API Key (Optional):** For AI LLM coaching cues (guaranteed deterministic local audio cues are used when omitted).

---

## Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/alokprasad573/AI-Exercise-Tutor.git
   cd AI-Exercise-Tutor
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```
   Configure `.env.local` with your secrets:
   ```dotenv
   NODE_ENV=development
   APP_URL=http://localhost:3000

   # MongoDB Atlas Connection URI (optional; in-memory store used if blank)
   ATLAS_URI=mongodb+srv://<username>:<password>@<cluster-host>/gymgenie?retryWrites=true&w=majority
   MONGODB_URI=

   # Authentication Secrets (generate random strings with min 32 chars)
   JWT_ACCESS_SECRET=your-minimum-32-character-secret-key-for-access-tokens
   JWT_REFRESH_SECRET=your-minimum-32-character-secret-key-for-refresh-tokens
   JWT_ISSUER=gymgenie
   JWT_AUDIENCE=gymgenie-web

   # Groq AI Coaching (optional; local voice cues used if blank)
   GROQ_API_KEY=gsk_your_groq_api_key_here
   GROQ_MODEL=openai/gpt-oss-120b
   GROQ_FALLBACK_MODEL=openai/gpt-oss-20b
   ```

4. **Verify Pose Landmarker Model Asset:**
   Ensure `public/models/pose_landmarker_full.task` exists (~9.4 MB). Check server health:
   ```bash
   curl http://localhost:3000/api/health
   ```

---

## Running the Application

### Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) (or `http://localhost:3001` if port 3000 is occupied).

### Production Build & Run
```bash
npm run build
npm start
```

---

## Testing & Verification

The test suite validates TypeScript types, code styling, 5-exercise mathematical parity, token family security, and AI coaching fallbacks.

```bash
# Run typechecking
npm run typecheck

# Run ESLint
npm run lint

# Run unit & integration test suites (50 tests)
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run Playwright E2E tests (requires running local app)
npx playwright install chromium
npm run test:e2e
```

---

## Project Structure

```
├── public/models/pose_landmarker_full.task  # MediaPipe Tasks Vision model asset
├── src/
│   ├── proxy.ts                             # Next.js 16 route protection guard
│   ├── app/                                 # App Router pages and Route Handlers
│   │   ├── (auth)/                          # Register, Login, Reset Password
│   │   ├── (dashboard)/                     # Dashboard, Workout, History, Analytics, Profile
│   │   ├── (marketing)/                     # Landing page with 3D Pose Avatar Rig
│   │   └── api/                             # REST APIs (Auth, Workouts, Analytics, AI Coaching)
│   ├── components/                          # UI, Layouts, AppShell, Three.js, Workout Views
│   ├── config/exercises.ts                  # Exercise parameters & MediaPipe configurations
│   ├── features/                            # Vision controller, camera, workout state machine
│   ├── models/                              # Mongoose schemas (User, RefreshSession, Workout)
│   ├── repositories/                        # Mongo repositories + in-memory store
│   └── services/                            # Auth, Coaching, Analytics, and 5 Exercise Detectors
└── tests/                                   # Vitest and Playwright test suites
```

---

## License

This project is licensed under the MIT License.
