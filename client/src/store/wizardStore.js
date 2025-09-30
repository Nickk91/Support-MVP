// src/store/wizardStore.js
import { create } from "zustand";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

const initial = {
  steps: ["welcome", "basics", "knowledge", "responses", "preview", "deploy"],
  currentStepIndex: 0,
  values: {
    botName: "",
    personality: "Friendly",
    model: "gpt-4o-mini",

    // responses step defaults
    fallback: "",
    escalation: {
      enabled: false,
      email: "",
    },
  },

  // ✅ validation state
  errors: {}, // shape: { responses: { fallback?: string, escalationEmail?: string }, ... }
};

export const useWizardStore = create((set, get) => ({
  ...initial,

  // derived
  progress: () =>
    Math.round(((get().currentStepIndex + 1) / get().steps.length) * 100),

  // actions
  update: (patch) => set((s) => ({ values: { ...s.values, ...patch } })),

  next: () =>
    set((s) => ({
      currentStepIndex: Math.min(s.currentStepIndex + 1, s.steps.length - 1),
    })),

  prev: () =>
    set((s) => ({
      currentStepIndex: Math.max(s.currentStepIndex - 1, 0),
    })),

  reset: () => set(initial),

  hydrate: (saved) =>
    set((s) => {
      const savedVals = saved?.values || {};
      return {
        ...s,
        ...(typeof saved?.currentStepIndex === "number"
          ? { currentStepIndex: saved.currentStepIndex }
          : {}),
        values: {
          ...s.values,
          ...savedVals,
          escalation: {
            ...s.values.escalation,
            ...(savedVals.escalation || {}),
          },
        },
      };
    }),

  // ========== VALIDATION ==========
  // Validate a specific step by key (e.g., "responses"). Sets errors and returns boolean.
  validateStep: (stepKey) => {
    const v = get().values;
    const stepErrors = {};

    if (stepKey === "responses") {
      // fallback: optional, but keep it reasonable
      if (v.fallback && v.fallback.length > 200) {
        stepErrors.fallback = "Keep under 200 characters.";
      }
      // escalation email required if enabled
      const esc = v.escalation || {};
      if (esc.enabled) {
        if (!esc.email) {
          stepErrors.escalationEmail =
            "Escalation email is required when enabled.";
        } else if (!emailRe.test(esc.email)) {
          stepErrors.escalationEmail = "Please enter a valid email address.";
        }
      }
    }

    // Merge step errors into global errors
    set((s) => ({
      errors: { ...s.errors, [stepKey]: stepErrors },
    }));

    // return true if no errors
    return Object.keys(stepErrors).length === 0;
  },

  // Clear all errors for a step
  clearStepErrors: (stepKey) =>
    set((s) => {
      const next = { ...s.errors };
      delete next[stepKey];
      return { errors: next };
    }),
}));
