# GymGenie — Complete API Specifications

> Production-grade API specification of all Route Handlers, authentication mechanisms, validation schemas, rate limits, and error envelopes implemented in the GymGenie Next.js 16 application.

---

## 1. API Architecture & Global Conventions

- **Architecture:** Next.js 16 App Router Route Handlers (`src/app/api/**/route.ts`).
- **Base URL:** `http://localhost:3000` (development) or `process.env.APP_URL`.
- **Runtime:** Strictly `nodejs` (`export const runtime = "nodejs"`).
- **Caching:** Dynamic data endpoints enforce `export const dynamic = "force-dynamic"`.
- **Content Negotiation:** All mutation requests expect `Content-Type: application/json`. All responses return JSON envelopes with an `X-Request-Id` tracking header.

### 1.1 Standard Response Envelopes

#### Success Envelope (`src/lib/errors.ts:48`)
```json
{
  "data": { ... },
  "requestId": "c76f62b4-7d5a-464a-9b4e-2895f3ea7b21"
}
```

#### Error Envelope (`src/lib/errors.ts:39`)
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "requestId": "c76f62b4-7d5a-464a-9b4e-2895f3ea7b21",
    "details": {
      "email": ["Enter a valid email address"]
    }
  }
}
```

### 1.2 Global Error Codes & HTTP Status Mappings

| Error Code | HTTP Status | Description |
|---|---|---|
| `BAD_REQUEST` | 400 | Malformed request or cast error |
| `VALIDATION_ERROR` | 400 | Zod schema validation failure |
| `UNAUTHORIZED` | 401 | Missing, invalid, or expired JWT / refresh token |
| `FORBIDDEN` | 403 | Insufficient resource permissions |
| `CSRF_FAILED` | 403 | Missing/invalid `Origin` or cross-site mutation attempt |
| `NOT_FOUND` | 404 | Resource does not exist or is not owned by user |
| `CONFLICT` | 409 | Duplicate email, username, or idempotency conflict |
| `RATE_LIMITED` | 429 | IP or user bucket rate limit exceeded |
| `PROVIDER_ERROR` | 502 | Upstream external service failure |
| `INTERNAL_ERROR` | 500 | Unexpected server error (sanitized, stack trace masked) |

---

## 2. Security, CSRF & Rate Limiting

### 2.1 CSRF Defense (`src/lib/csrf.ts`)
All state-modifying requests (`POST`, `PATCH`, `DELETE`) call `assertSameOriginRequest(request)`:
- Rejects requests if `Sec-Fetch-Site: cross-site`.
- Verifies `Origin` or `Referer` matches `APP_URL`, `Host`, or `X-Forwarded-Host`.
- Production requires an `Origin` header whenever auth cookies are present.

### 2.2 Rate Limiting Architecture (`src/lib/rate-limit.ts`)
In-memory sliding-window counter tracking client IP or authenticated User ID:

| Route | Bucket | Window | Max Requests | Key |
|---|---|---|---|---|
| `POST /api/auth/register` | `auth:register` | 15 minutes | 10 | Client IP |
| `POST /api/auth/login` | `auth:login` | 15 minutes | 15 | Client IP |
| `POST /api/auth/refresh` | `auth:refresh` | 15 minutes | 30 | Client IP |
| `POST /api/auth/forgot-password`| `auth:forgot-password` | 15 minutes | 5 | Client IP |
| `POST /api/auth/reset-password` | `auth:reset-password` | 15 minutes | 10 | Client IP |
| `PATCH /api/users/me/password` | `users:change-password`| 15 minutes | 5 | User ID |
| `POST /api/ai/coaching` | `ai:coaching` | 1 minute | 30 | User ID |

---

## 3. Endpoints Documentation

### 3.1 Health Check

#### `GET /api/health`
- **Description:** Verifies server health, database connectivity status, MediaPipe model availability on disk, and Groq coaching configuration.
- **Authentication:** Not required.
- **Success Response (200 OK):**
```json
{
  "data": {
    "status": "ok",
    "service": "gymgenie",
    "timestamp": "2026-11-24T13:50:00.000Z",
    "poseModelPresent": true,
    "databaseConfigured": true,
    "databaseConnected": true,
    "databaseMode": "mongodb",
    "aiCoachingConfigured": true
  },
  "requestId": "d4a51e66-8802-4fc3-a5b6-750d0a28fbe4"
}
```

---

### 3.2 Authentication Endpoints

#### `POST /api/auth/register`
- **Description:** Creates a new user account with Argon2id password hash and issues session cookies.
- **Authentication:** Not required.
- **Rate Limit:** 10 requests / 15 minutes per IP.
- **Request Headers:** `Content-Type: application/json`, `Origin: <origin>`
- **Request Body:**
```json
{
  "username": "athlete_john",
  "email": "john@example.com",
  "password": "Password123",
  "name": "John Doe"
}
```
- **Response Headers:**
  - `Set-Cookie: gg_access=...; Path=/; HttpOnly; SameSite=Lax; Max-Age=900`
  - `Set-Cookie: gg_refresh=...; Path=/api/auth; HttpOnly; SameSite=Strict; Max-Age=604800`
- **Success Response (201 Created):**
```json
{
  "data": {
    "user": {
      "id": "673f45a0b9e8f1023c4a1234",
      "username": "athlete_john",
      "displayUsername": "athlete_john",
      "email": "john@example.com",
      "name": "John Doe",
      "role": "USER",
      "preferences": {
        "enableVoice": true,
        "enableAiCoaching": true,
        "defaultRestSeconds": 60
      },
      "createdAt": "2026-11-24T13:50:00.000Z",
      "updatedAt": "2026-11-24T13:50:00.000Z"
    }
  },
  "requestId": "..."
}
```
- **Error Responses:**
  - `400 VALIDATION_ERROR`: Missing or invalid field constraints.
  - `409 CONFLICT`: Email already exists or username taken.
  - `429 RATE_LIMITED`: Exceeded register bucket.

#### `POST /api/auth/login`
- **Description:** Authenticates credentials (email or username + password), equalizing timing attacks with dummy password hashing on unknown accounts.
- **Authentication:** Not required.
- **Rate Limit:** 15 requests / 15 minutes per IP.
- **Request Body:**
```json
{
  "identifier": "athlete_john",
  "password": "Password123"
}
```
- **Success Response (200 OK):** Returns `{ data: { user: PublicUser } }` and sets `gg_access` and `gg_refresh` cookies.
- **Error Responses:**
  - `401 UNAUTHORIZED`: Invalid credentials.

#### `POST /api/auth/refresh`
- **Description:** Rotates the refresh token atomically. Detects token reuse to revoke the entire session family.
- **Authentication:** Cookie `gg_refresh`.
- **Rate Limit:** 30 requests / 15 minutes per IP.
- **Success Response (200 OK):** Returns new `user` profile and issues updated `gg_access` and `gg_refresh` cookies.
- **Error Responses:**
  - `401 UNAUTHORIZED`: Session invalid, token expired, or token reuse detected (automatically clears auth cookies).

#### `POST /api/auth/logout`
- **Description:** Inactivates the caller's session in the database and clears auth cookies.
- **Authentication:** Cookie `gg_refresh`.
- **Success Response (200 OK):**
```json
{
  "data": { "loggedOut": true },
  "requestId": "..."
}
```

#### `POST /api/auth/forgot-password`
- **Description:** Issues a SHA-256 hashed single-use password reset token (30-minute validity).
- **Rate Limit:** 5 requests / 15 minutes per IP.
- **Request Body:** `{ "email": "john@example.com" }`
- **Success Response (200 OK):** Always returns generic message to prevent account enumeration:
```json
{
  "data": {
    "message": "If an account exists for that email, password reset instructions have been issued."
  },
  "requestId": "..."
}
```

#### `POST /api/auth/reset-password`
- **Description:** Consumes a reset token, updates the password hash, and revokes all existing sessions.
- **Request Body:** `{ "token": "raw-token-string", "newPassword": "NewPassword123" }`
- **Success Response (200 OK):** `{ "data": { "message": "Password updated. Sign in with your new password." } }`

---

### 3.3 User Profile Endpoints

#### `GET /api/users/me`
- **Description:** Fetches current user profile.
- **Authentication:** Required (`gg_access` cookie).
- **Success Response (200 OK):** `{ "data": { "user": PublicUser } }`

#### `PATCH /api/users/me`
- **Description:** Updates profile fields and preferences.
- **Authentication:** Required.
- **Request Body:**
```json
{
  "name": "Johnny Doe",
  "username": "johnny_fit",
  "avatarUrl": "https://images.example.com/avatar.png",
  "preferences": {
    "enableVoice": true,
    "enableAiCoaching": false,
    "defaultRestSeconds": 90
  }
}
```
- **Success Response (200 OK):** `{ "data": { "user": PublicUser } }`

#### `PATCH /api/users/me/password`
- **Description:** Updates password for authenticated user and revokes all other active sessions.
- **Authentication:** Required.
- **Rate Limit:** 5 requests / 15 minutes per user.
- **Request Body:** `{ "currentPassword": "OldPassword123", "newPassword": "NewPassword123" }`
- **Success Response (200 OK):** `{ "data": { "user": PublicUser, "message": "Password updated and other sessions revoked." } }`

---

### 3.4 Workout Endpoints

#### `GET /api/workouts`
- **Description:** Paginated, filterable list of user-owned workouts.
- **Authentication:** Required.
- **Query Parameters:**
  - `page`: Integer, min 1 (default `1`).
  - `limit`: Integer, min 1, max 50 (default `10`).
  - `exercise`: Optional filter (`"squats"`, `"pushups"`, etc.).
  - `status`: Optional filter (`"COMPLETED"`, `"INTERRUPTED"`).
  - `from`: Optional ISO datetime string.
  - `to`: Optional ISO datetime string.
- **Success Response (200 OK):**
```json
{
  "data": {
    "items": [
      {
        "id": "67406a92b9e8f1023c4a5678",
        "userId": "673f45a0b9e8f1023c4a1234",
        "idempotencyKey": "a4d3e2f1-0000-0000-0000-000000000000",
        "exerciseName": "squats",
        "status": "COMPLETED",
        "targetReps": 10,
        "targetSets": 3,
        "totalReps": 30,
        "totalSets": 3,
        "durationSeconds": 240,
        "startedAt": "2026-11-24T12:00:00.000Z",
        "completedAt": "2026-11-24T12:04:00.000Z",
        "sets": [
          { "setNumber": 1, "reps": 10, "durationSeconds": 45, "completedAt": "2026-11-24T12:01:00.000Z" }
        ],
        "notes": "Solid depth today",
        "createdAt": "2026-11-24T12:04:01.000Z",
        "updatedAt": "2026-11-24T12:04:01.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  },
  "requestId": "..."
}
```

#### `POST /api/workouts`
- **Description:** Creates a workout record idempotently. Retries with identical `idempotencyKey` return existing record without duplicate creation.
- **Authentication:** Required.
- **Request Body:**
```json
{
  "idempotencyKey": "b9f71c23-4567-4890-a123-abcdef012345",
  "exerciseName": "pushups",
  "status": "COMPLETED",
  "targetReps": 12,
  "targetSets": 3,
  "totalReps": 36,
  "totalSets": 3,
  "durationSeconds": 310,
  "startedAt": "2026-11-24T13:00:00.000Z",
  "completedAt": "2026-11-24T13:05:10.000Z",
  "sets": [
    { "setNumber": 1, "reps": 12, "durationSeconds": 50 },
    { "setNumber": 2, "reps": 12, "durationSeconds": 55 },
    { "setNumber": 3, "reps": 12, "durationSeconds": 60 }
  ],
  "exerciseMetrics": {
    "elbowAngle": 88,
    "bodyAlignment": "Straight",
    "hipStatus": "LEVEL"
  },
  "notes": "Pushed through the last set"
}
```
- **Success Response:**
  - `201 Created` if new record created: `{ "data": { "workout": WorkoutDTO, "created": true } }`
  - `200 OK` if duplicate idempotencyKey matched: `{ "data": { "workout": WorkoutDTO, "created": false } }`

#### `GET /api/workouts/:id`
- **Description:** Retrieves a single owned workout by ID.
- **Authentication:** Required.

#### `PATCH /api/workouts/:id`
- **Description:** Updates the `notes` field of an owned workout (max 500 characters).
- **Authentication:** Required.
- **Request Body:** `{ "notes": "Updated reflection notes" }`
- **Success Response (200 OK):** `{ "data": { "workout": WorkoutDTO } }`

#### `DELETE /api/workouts/:id`
- **Description:** Deletes an owned workout by ID.
- **Authentication:** Required.
- **Success Response (200 OK):** `{ "data": { "deleted": true } }`

---

### 3.5 Analytics Endpoints

#### `GET /api/analytics/overview`
- **Description:** Aggregates user lifetime overview, current streak in UTC days, weekly activity array, and recent workouts.
- **Authentication:** Required.
- **Success Response (200 OK):**
```json
{
  "data": {
    "totalWorkouts": 12,
    "completedWorkouts": 11,
    "totalReps": 360,
    "totalSets": 36,
    "totalDurationSeconds": 2880,
    "currentStreakDays": 4,
    "streakRule": "Consecutive UTC calendar days with at least one logged workout, anchored on today or yesterday.",
    "favoriteExercise": {
      "exercise": "squats",
      "label": "Squats",
      "sessions": 6
    },
    "weeklyActivity": [
      { "date": "2026-11-18", "label": "Wed", "workouts": 1, "reps": 30, "durationSeconds": 240 }
    ],
    "recentWorkouts": [ ... ]
  },
  "requestId": "..."
}
```

#### `GET /api/analytics/weekly?days=7`
- **Description:** Daily activity buckets (days range: 7 to 90).
- **Authentication:** Required.

#### `GET /api/analytics/monthly?months=6`
- **Description:** Monthly aggregated activity buckets (months range: 1 to 12).
- **Authentication:** Required.

#### `GET /api/analytics/exercises?days=90`
- **Description:** Per-exercise breakdown, total volume, best session reps, and progression points.
- **Authentication:** Required.

---

### 3.6 AI Coaching Endpoint

#### `POST /api/ai/coaching`
- **Description:** Server-side Groq LLM integration with multi-model fallback (`openai/gpt-oss-120b` → `openai/gpt-oss-20b` → deterministic local cues). Enforces 5s cooldowns on non-major events and cleans clinical/medical text.
- **Authentication:** Required.
- **Rate Limit:** 30 requests / 1 minute per user.
- **Request Body:**
```json
{
  "event": "ongoing_form_check",
  "exercise": "squats",
  "repCount": 4,
  "currentSet": 1,
  "targetSets": 3,
  "issue": "Squat is not deep enough",
  "metrics": {
    "kneeAngle": 112,
    "depthStatus": "TOO HIGH"
  }
}
```
- **Success Response (200 OK):**
```json
{
  "data": {
    "feedback": "Drop your hips slightly lower and keep your chest tall.",
    "source": "groq",
    "modelUsed": "openai/gpt-oss-120b",
    "throttled": false,
    "event": "ongoing_form_check",
    "exercise": "squats"
  },
  "requestId": "..."
}
```
*(If throttled within 5 seconds for non-major events, returns `{ "feedback": "", "source": "fallback", "throttled": true }`)*.
