# GymGenie — Complete Feature Specifications

> Definitive feature inventory, user interaction flows, biomechanics rules, and implementation statuses based strictly on the current GymGenie source code.

---

## 1. Product Overview

GymGenie is an AI-powered browser-based exercise coach that tracks real-time biomechanics directly on the user's client device using MediaPipe Pose Landmarker. It counts repetitions, flags form breakdowns, gives audible spoken feedback through browser SpeechSynthesis, and provides LLM-driven coaching cues via server-side Groq integration with fallback mechanisms.

---

## 2. User Roles & Access Boundaries

| Role | Permissions | Source Evidence |
|---|---|---|
| **`GUEST` / Unauthenticated** | Can view marketing landing page (`/`), view login/register/forgot-password forms, access `/api/health`. Attempting to access protected routes (`/dashboard`, `/workout/*`, `/history/*`, `/analytics`, `/profile`) triggers early redirect via `proxy.ts` and Server Component session guards. | `proxy.ts`, `services/auth/session-guard.ts` |
| **`USER`** | Can manage profile, start/save/delete workouts, receive real-time vision coaching, view aggregated analytics, and manage personal preferences. Data access is strictly scoped to the authenticated `userId`. | `models/User.ts`, `repositories/workout.repository.ts` |
| **`ADMIN`** | Supported in schema (`models/User.ts:4`) and JWT claims (`lib/jwt.ts:15`). Currently behaves identically to `USER` without custom administrative dashboards. | `models/User.ts` |

---

## 3. Core Feature Specifications

### 3.1 Authentication & Session Management
- **Status:** `IMPLEMENTED`
- **Entry Points:** `/login`, `/register`, `/forgot-password`, `/reset-password`
- **Frontend Components:** `app/(auth)/**/page.tsx`, `features/auth/auth-api-client.ts`
- **Backend Services:** `services/auth/auth.service.ts`, `lib/jwt.ts`, `lib/password.ts`
- **API Endpoints:** `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`
- **Database Entities:** `users`, `refreshSessions`
- **Features & Business Rules:**
  - Password hashing with **Argon2id** (`m=65536, t=3, p=1`).
  - Dummy password hashing on non-existent usernames to mitigate user enumeration timing attacks (`lib/password.ts:141`).
  - Dual-token session: 15-minute access token (`gg_access`) and 7-day rotating refresh token (`gg_refresh`).
  - **Token Family Invalidation:** If a previously used refresh token is presented again (replay attack), the entire session family is revoked immediately (`services/auth/auth.service.ts:171`).
  - Self-service password reset with single-use SHA-256 tokens expiring in 30 minutes.

---

### 3.2 Responsive Navigation & App Shell
- **Status:** `IMPLEMENTED`
- **Frontend Components:** `components/layout/app-shell.tsx`, `components/layout/brand-mark.tsx`
- **Capabilities:**
  - **Desktop Navigation:** Horizontal tab navigation with active route highlights, direct navigation (`Dashboard`, `Workout`, `History`, `Analytics`), and user dropdown menu.
  - **Mobile & Tablet Navigation:** Responsive hamburger drawer with slide-out sheet (`data-testid="mobile-hamburger-btn"`), touch-friendly link targets, and accessible focus management.
  - **Accessibility:** Includes "Skip to main content" link (`#main-content`), ARIA expanded and controls attributes, and full keyboard navigation.

---

### 3.3 Computer Vision & Real-Time Pose Tracking
- **Status:** `IMPLEMENTED`
- **Frontend Components:** `features/exercise/pose-vision-controller.ts`, `features/exercise/camera-controller.ts`, `features/exercise/skeleton-renderer.ts`
- **Model Asset:** `/models/pose_landmarker_full.task` (MediaPipe Tasks Vision `^0.10.21`, served with 1-year immutable caching).
- **Capabilities & Parameters:**
  - Mode: `VIDEO` running mode with `numPoses: 1`.
  - Confidence Thresholds: `minPoseDetectionConfidence: 0.7`, `minPosePresenceConfidence: 0.7`, `minTrackingConfidence: 0.7`.
  - Hardware Acceleration: Automatically attempts `GPU` delegate first; gracefully falls back to `CPU` delegate on failure (`features/exercise/pose-vision-controller.ts:54-68`).
  - Frame Throttling: Configurable interval (default 33ms / ~30 FPS) to prevent browser CPU choking.
  - Overlay Rendering: HTML5 Canvas drawing with mirrored webcam video, color-coded landmark joints, 18 anatomical bone connections, and posture status badges.

---

### 3.4 Biomechanics & Exercise Detectors
GymGenie features five deterministic exercise detectors ported with mathematical parity from original Python algorithms:

#### 1. Squats (`SquatDetector`)
- **Status:** `IMPLEMENTED`
- **Source:** `services/exercise/detectors/squat.detector.ts`
- **Required Landmarks:** Left/right shoulders (11, 12), hips (23, 24), knees (25, 26), ankles (27, 28).
- **Rep Detection:**
  - `down` stage triggered when knee angle `< 100°`.
  - `up` stage & rep increment triggered when knee angle `>= 160°` after reaching `down`.
- **Form Evaluation:**
  - Depth check: `GOOD DEPTH` (`<= 100°`) vs `TOO HIGH` (`> 100°`).
  - Forward torso lean: Emits warning `"Leaning too far forward — keep your chest upright."` when back angle `< 130°`.

#### 2. Push-ups (`PushUpDetector`)
- **Status:** `IMPLEMENTED`
- **Source:** `services/exercise/detectors/pushup.detector.ts`
- **Rep Detection:**
  - `down` stage triggered when elbow angle `< 90°`.
  - `up` stage & rep increment triggered when elbow angle `> 160°` from `down`.
- **Form Evaluation:**
  - Body alignment: Evaluates shoulder-hip-ankle line (`> 160°` = `Straight`, `140-160°` = `Slight Bend`, `< 140°` = `Poor Form`).
  - Hip position: Flags `"Hips are sagging"` or `"Hips are too high"` based on vertical deviation tolerance.

#### 3. Biceps Curls (`BicepsCurlDetector`)
- **Status:** `IMPLEMENTED`
- **Source:** `services/exercise/detectors/biceps-curl.detector.ts`
- **Rep Detection:**
  - `up` stage triggered when elbow angle `< 50°`.
  - `down` stage & rep increment triggered when elbow angle `> 160°` from `up`.
- **Form Evaluation:**
  - Shoulder stability: Monitors horizontal elbow drift relative to shoulder line.
  - Torso swing: Flags `"Torso is swinging — keep your upper body still."` when vertical torso angle deviation `> 15°`.

#### 4. Shoulder Press (`ShoulderPressDetector`)
- **Status:** `IMPLEMENTED`
- **Source:** `services/exercise/detectors/shoulder-press.detector.ts`
- **Rep Detection:**
  - `down` stage triggered when elbow angle `< 90°`.
  - `up` stage & rep increment triggered when elbow angle `> 150°` from `down`.
- **Form Evaluation:**
  - Extension check: `FULL` (`> 160°`), `PARTIAL` (`140-160°`), or `LOW`.
  - Lower back arch: Flags `"Lower back is arching during the press — brace your core and stay stacked."` when vertical spine deviation `> 15°`.

#### 5. Lunges (`LungeDetector`)
- **Status:** `IMPLEMENTED`
- **Source:** `services/exercise/detectors/lunge.detector.ts`
- **Rep Detection:**
  - Identifies front leg as the knee with the smaller angle (`leftKneeAngle <= rightKneeAngle`).
  - `down` stage triggered when front knee angle `< 100°`.
  - `up` stage & rep increment triggered when front knee angle `> 160°` from `down`.
- **Form Evaluation:**
  - Lateral balance: Flags `"Losing lateral balance during the lunge — keep feet hip-width apart."` when ankle-hip lateral offset exceeds tolerance.

---

### 3.5 Interactive 3D Pose Avatar Rig
- **Status:** `IMPLEMENTED`
- **Frontend Components:** `components/three/pose-rig-canvas.tsx`, `components/three/exercise-rig-preview.tsx`, `components/three/pose-rig-data.tsx`
- **Capabilities:**
  - Three.js / React Three Fiber rendering of an animated 3D wireframe avatar rigged for all 5 exercises.
  - Interactive mouse/touch tracking with dynamic yaw (`pointer.x * 0.52`) and pitch (`-pointer.y * 0.22`) tilt responsiveness.
  - Built-in graceful degradation: Detects WebGL availability and respects `prefers-reduced-motion` to render an SVG wireframe fallback with zero Three.js runtime overhead.

---

### 3.6 Multi-Tier AI Coaching & Voice Feedback
- **Status:** `IMPLEMENTED`
- **Backend Service:** `services/coaching/groq-coaching.service.ts`
- **Client Controller:** `features/workout/voice-feedback.ts`
- **Architecture:**
  - **Tier 1 (Primary):** `openai/gpt-oss-120b` via server-side Groq SDK (4s timeout).
  - **Tier 2 (Secondary Fallback):** `openai/gpt-oss-20b` invoked automatically if the primary model fails, times out, or triggers provider errors.
  - **Tier 3 (Local Cues):** Deterministic fallback cues from `services/coaching/prompts.ts` used if all upstream models fail or if running offline.
- **Form Issue Sanitizer:** Rejects clinical/medical claims (e.g., torn ACL, herniated disc, diagnosis) before returning cues to the user.
- **Throttling Rules:** 5-second cooldown on non-major events (`ongoing_form_check`); immediate bypass for milestone events (`workout_started`, `set_completed`, `workout_completed`).

---

### 3.7 Workout Lifecycle & State Machine
- **Status:** `IMPLEMENTED`
- **Source:** `features/workout/workout-state-machine.ts`
- **States:** `IDLE` → `INITIALIZING` → `READY` → `ACTIVE` ↔ `PAUSED` → `SET_COMPLETED` → `WORKOUT_COMPLETED` (and `ERROR`).
- **Features:**
  - Monotonic active duration tracking (excludes pause periods and rest timer countdowns).
  - Configurable rest timer countdown between sets.
  - Automatic set advancement and workout completion when `currentSet >= targetSets`.
  - Client-side idempotency UUID key generation ensuring retried saves cannot create duplicate records.
  - Interrupted session capture when a user exits early.

---

### 3.8 Dashboard, Analytics & History
- **Status:** `IMPLEMENTED`
- **Pages & Components:** `/dashboard`, `/analytics`, `/history`, `/history/[id]`
- **Capabilities:**
  - Overview KPI summary: Total workouts, completed count, total reps, cumulative active time, active streak days.
  - UTC streak calculation anchored on today or yesterday.
  - Recharts visualizers: Weekly volume bars, monthly area chart, exercise distribution donut, rep progression lines.
  - Paginated workout history table with exercise and status filters.
  - Individual session review showing set-by-set breakdown and editable notes.

---

## 4. Feature Implementation Status Matrix

| Feature Module | Component / Route | Current Status | Notes |
|---|---|---|---|
| User Registration | `/register`, `POST /api/auth/register` | `IMPLEMENTED` | Argon2id + Zod validation |
| User Login | `/login`, `POST /api/auth/login` | `IMPLEMENTED` | Timing attack equalized |
| Session Rotation | `POST /api/auth/refresh` | `IMPLEMENTED` | Token family reuse revocation |
| Password Reset | `/forgot-password`, `/reset-password` | `IMPLEMENTED` | SHA-256 tokens, 30m TTL |
| Profile & Preferences | `/profile`, `GET/PATCH /api/users/me` | `IMPLEMENTED` | Username, preferences |
| App Navigation Shell | `components/layout/app-shell.tsx` | `IMPLEMENTED` | Tabs + Mobile Hamburger |
| Camera Setup & Preview | `/workout/setup`, `camera-controller.ts`| `IMPLEMENTED` | Device selector + testing |
| 3D Rig Avatar | `components/three/*` | `IMPLEMENTED` | R3F + Pointer Yaw/Pitch |
| Live Workout Session | `/workout/session`, `live-workout-session.tsx`| `IMPLEMENTED` | WebRTC + Canvas Overlay |
| Biomechanics (5 exercises) | `services/exercise/detectors/*` | `IMPLEMENTED` | 100% parity verified |
| AI Coaching Multi-Model | `POST /api/ai/coaching` | `IMPLEMENTED` | 120b → 20b → Local cues |
| Spoken Voice Cues | `voice-feedback.ts` | `IMPLEMENTED` | SpeechSynthesis API |
| Rest Timer Countdown | `workout-state-machine.ts` | `IMPLEMENTED` | Auto reset on next set |
| Idempotent Workout Save | `POST /api/workouts` | `IMPLEMENTED` | Compound unique index |
| History List & Detail | `/history`, `/history/[id]` | `IMPLEMENTED` | Pagination, notes PATCH |
| Analytics Visualizers | `/analytics`, `analytics.service.ts` | `IMPLEMENTED` | Recharts charts |
| In-Memory Fallback Store | `repositories/memory-store.ts` | `IMPLEMENTED` | Auto fallback when offline |
| Social Login / OAuth | — | `NOT_IMPLEMENTED` | Not in application scope |
| Video File Recording Upload | — | `NOT_IMPLEMENTED` | Excluded by privacy policy |
