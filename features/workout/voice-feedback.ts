"use client";

export interface VoiceFeedbackOptions {
  enabled: boolean;
  defaultCooldownMs?: number;
}

export class VoiceFeedbackController {
  private enabled: boolean;
  private readonly defaultCooldownMs: number;
  private readonly lastSpokenByEvent = new Map<string, number>();

  constructor(options: VoiceFeedbackOptions) {
    this.enabled = options.enabled;
    this.defaultCooldownMs = options.defaultCooldownMs ?? 4_000;
  }

  public isSupported(): boolean {
    return (
      typeof window !== "undefined" &&
      "speechSynthesis" in window &&
      typeof window.SpeechSynthesisUtterance === "function"
    );
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.cancel();
    }
  }

  public speak(
    text: string,
    eventKey: string,
    options?: { priority?: boolean; cooldownMs?: number; nowMs?: number }
  ): boolean {
    if (!this.enabled || !this.isSupported()) {
      return false;
    }

    const cleaned = text.trim();
    if (!cleaned) return false;

    const now = options?.nowMs ?? Date.now();
    const cooldown = options?.cooldownMs ?? this.defaultCooldownMs;
    const lastAt = this.lastSpokenByEvent.get(eventKey) ?? 0;

    if (!options?.priority && now - lastAt < cooldown) {
      return false;
    }

    try {
      const synth = window.speechSynthesis;
      if (options?.priority) {
        synth.cancel();
      }
      const utterance = new window.SpeechSynthesisUtterance(cleaned);
      utterance.lang = "en-US";
      utterance.rate = 1.04;
      utterance.pitch = 1.0;
      synth.speak(utterance);
      this.lastSpokenByEvent.set(eventKey, now);
      return true;
    } catch {
      // Speech failures must never disrupt workout tracking
      return false;
    }
  }

  public cancel(): void {
    if (!this.isSupported()) return;
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore browser speech synthesis cancel failures
    }
  }
}
