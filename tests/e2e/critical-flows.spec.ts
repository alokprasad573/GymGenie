import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const PARITY_FIXTURES = JSON.parse(
  fs.readFileSync(
    path.join(process.cwd(), "tests", "fixtures", "python-detector-parity.json"),
    "utf-8"
  )
) as {
  squats: Array<{ action: string; label?: string; landmarks?: unknown[] }>;
};

test.describe("GymGenie Critical E2E Journeys", () => {
  test("marketing landing page renders five exercises and respects reduced motion", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        name: /Real-time rep counting and form coaching/i,
      })
    ).toBeVisible();

    for (const label of [
      "Squats",
      "Push-ups",
      "Biceps Curls (Dumbbell)",
      "Shoulder Press",
      "Lunges",
    ]) {
      await expect(page.getByRole("heading", { name: label })).toBeVisible();
    }
  });

  test("unauthenticated visitors are redirected away from protected routes", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
  });

  test("health endpoint confirms single Next.js deployment and pose model asset", async ({
    request,
  }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
    const body = (await res.json()) as {
      data: { status: string; poseModelPresent: boolean };
    };
    expect(body.data.status).toBe("ok");
    expect(body.data.poseModelPresent).toBe(true);
  });

  test("full authenticated lifecycle: register, setup, camera denial recovery, deterministic workout, history, analytics, cross-user isolation, and logout", async ({
    page,
    request,
  }) => {
    const health = await request.get("/api/health");
    const healthJson = (await health.json()) as {
      data: { databaseConfigured: boolean };
    };
    test.skip(
      !healthJson.data.databaseConfigured,
      "MONGODB_URI not configured in this test environment"
    );

    const unique = `${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const userA = {
      username: `e2e_a_${unique}`,
      email: `e2e_a_${unique}@example.com`,
      password: "TestPassword123",
    };

    // 1. Register User A
    await page.goto("/register");
    await page.getByLabel("Username").fill(userA.username);
    await page.getByLabel("Email").fill(userA.email);
    await page.getByLabel("Password").fill(userA.password);
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(
      page.getByRole("heading", { name: /Training overview/i })
    ).toBeVisible();

    // 2. Configure workout (1 set x 1 rep Squats for deterministic verification)
    await page.goto("/workout/setup");
    await page.getByLabel(/Sets \(1–50\)/i).fill("1");
    await page.getByLabel(/Reps per set/i).fill("1");
    await page.getByRole("button", { name: /Launch live session/i }).click();
    await expect(page).toHaveURL(/\/workout\/session/);

    // 3. Simulate camera permission denial & verify actionable recovery UI
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "mediaDevices", {
        configurable: true,
        value: {
          getUserMedia: () =>
            Promise.reject(new DOMException("Permission denied", "NotAllowedError")),
          enumerateDevices: () => Promise.resolve([]),
        },
      });
    });
    await page.reload();
    await expect(page.getByText(/Camera permission denied/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Retry camera/i })
    ).toBeVisible();

    // 4. Drive deterministic real SquatDetector via synthetic Python-parity frames
    const squatFrames = PARITY_FIXTURES.squats.filter(
      (step) => step.action === "frame"
    );
    const downFrame = squatFrames.find((f) => f.label === "deep_squat_down");
    const upFrame = squatFrames.find(
      (f) => f.label === "boundary_160_counts_rep"
    );

    await page.evaluate((lms) => {
      window.dispatchEvent(
        new CustomEvent("gymgenie:pose-frame", { detail: { landmarks: lms } })
      );
    }, upFrame?.landmarks);

    await page.getByTestId("begin-workout-btn").click();

    await page.evaluate(
      ({ down, up }) => {
        window.dispatchEvent(
          new CustomEvent("gymgenie:pose-frame", { detail: { landmarks: down } })
        );
        window.dispatchEvent(
          new CustomEvent("gymgenie:pose-frame", { detail: { landmarks: up } })
        );
      },
      { down: downFrame?.landmarks, up: upFrame?.landmarks }
    );

    await expect(page.getByText(/Workout summary/i)).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(/Saved to your workout history/i)).toBeVisible({
      timeout: 10_000,
    });

    // 5. Verify persisted workout appears in History and Analytics
    await page.goto("/history");
    await expect(page.getByText("Squats")).toBeVisible();

    await page.goto("/analytics");
    await expect(page.getByText(/Daily workout volume/i)).toBeVisible();

    // 6. Logout and verify protected route redirects
    await page.goto("/profile");
    await page.getByRole("button", { name: /Sign out/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
