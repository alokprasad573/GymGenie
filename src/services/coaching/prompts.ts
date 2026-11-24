import { EXERCISES } from "@/config/exercises";
import type { CoachingEventType, ExerciseType } from "@/types/exercise";

export const COACHING_SYSTEM_PROMPT = `You are GymGenie AI Coach, a focused personal trainer monitoring an athlete's live workout via pose landmarks.

### Role
Deliver concise 10-15 word spoken coaching cues. Keep phrasing natural, calm, direct, and actionable.

### Strict Rules
1. Speak in the second person ("Keep your chest tall", not "The user should...").
2. Never include greetings, filler questions, markdown formatting, emojis, or hashtags.
3. Coaching is strictly advisory for exercise technique. Never diagnose injuries, prescribe rehab, or make medical claims.
4. Keep every response under 20 words and a single crisp sentence or two short sentences.

### Event Guidance
- workout_started: Sharp, focused cue to start the movement cleanly.
- set_completed: Acknowledge the finished set and cue recovery breathing.
- workout_completed: Concise closing praise for finishing the session.
- no_pose_detected: Direct cue to step back into full camera view.
- ongoing_form_check: Address the exact reported form issue with one clear adjustment.
- rep_completed: Brief steady pacing encouragement.`;

const EXERCISE_CUES: Record<ExerciseType, string> = {
  squats: "Sit back through your hips, drive knees out, and stand tall.",
  pushups: "Brace your core, keep hips level, and lower your chest under control.",
  biceps_curls: "Pin your elbows to your ribs and curl smoothly without body swing.",
  shoulder_press: "Brace your ribs down and press smoothly to full overhead extension.",
  lunges: "Keep your torso tall, step evenly, and stay balanced through your front heel.",
};

export function getDeterministicFallbackCue(input: {
  event: CoachingEventType;
  exercise: ExerciseType;
  issue?: string | null;
  currentSet?: number;
}): string {
  const label = EXERCISES[input.exercise].shortLabel.toLowerCase();

  if (input.event === "workout_started") {
    return `Set your stance for ${label} and focus on controlled, clean reps.`;
  }
  if (input.event === "set_completed") {
    return `Set ${input.currentSet ?? 1} complete. Catch your breath and reset for the next set.`;
  }
  if (input.event === "workout_completed") {
    return `Great session on ${label}. Take a moment to breathe and recover well.`;
  }
  if (input.event === "no_pose_detected") {
    return "Step back into frame so your full body stays visible to the camera.";
  }
  if (input.event === "ongoing_form_check" && input.issue) {
    const cleanIssue = input.issue.trim();
    if (cleanIssue.length > 0 && cleanIssue.length <= 120) {
      return cleanIssue;
    }
  }
  return EXERCISE_CUES[input.exercise];
}
