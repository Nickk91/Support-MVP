// src/store/wizardStore.js
import { create } from "zustand";
const steps = [
  "welcome",
  "basics",
  "knowledge",
  "responses",
  "preview",
  "deploy",
];
export const useWizardStore = create((set, get) => ({
  steps,
  currentStepIndex: 0,
  values: {
    botName: "",
    personality: "Friendly",
    model: "gpt-4o-mini",
    fallback: "Sorry, I couldn’t find that. Please contact support.",
    escalation: { enabled: true, email: "" },
    files: [],
    connectors: [],
  },
  next: () => {
    const i = get().currentStepIndex;
    if (i < steps.length - 1) set({ currentStepIndex: i + 1 });
  },
  prev: () => {
    const i = get().currentStepIndex;
    if (i > 0) set({ currentStepIndex: i - 1 });
  },
  goto: (idx) => set({ currentStepIndex: idx }),
  update: (patch) => set((s) => ({ values: { ...s.values, ...patch } })),
  progress: () =>
    Math.round(((get().currentStepIndex + 1) / steps.length) * 100),
}));
