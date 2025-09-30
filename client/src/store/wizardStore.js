// src/store/wizardStore.js
import { create } from "zustand";

const initial = {
  steps: ["welcome", "basics", "knowledge", "responses", "preview", "deploy"],
  currentStepIndex: 0,
  values: {
    botName: "",
    personality: "Friendly",
    model: "gpt-4o-mini",

    // ✅ add defaults for StepResponses
    fallback: "",
    escalation: {
      enabled: false,
      email: "",
    },
  },
};

export const useWizardStore = create((set, get) => ({
  ...initial,

  progress: () =>
    Math.round(((get().currentStepIndex + 1) / get().steps.length) * 100),

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

  // ✅ merge saved values with *nested* defaults
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
}));
