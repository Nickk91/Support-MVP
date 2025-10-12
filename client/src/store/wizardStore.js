// src/store/wizardStore.js
import { create } from "zustand";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const LIMITS = {
  botNameMax: 50,
  systemMessageMax: 2000,
  fallbackMax: 200,
};

const initial = {
  steps: [
    "welcome",
    "basics",
    "responses",
    "register",
    "knowledge",
    "preview",
    "deploy",
  ],
  currentStepIndex: 0,
  values: {
    botName: "",
    personality: "Friendly",
    systemMessage: "", // ✅ now validated below
    model: "gpt-4o-mini",
    fallback: "",
    escalation: { enabled: false, email: "" },
  },
  errors: {}, // e.g., { responses: { fallback: "...", escalationEmail: "..." }, basics: {...} }
};

export const useWizardStore = create((set, get) => ({
  // Start with a deep clone to avoid accidental shared refs
  ...JSON.parse(JSON.stringify(initial)),

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
  reset: () => set(() => JSON.parse(JSON.stringify(initial))), // ✅ deep reset

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

  // ---------- Step-level validation (used on Next) ----------
  validateStep: (stepKey) => {
    const v = get().values;
    const stepErrors = {};

    if (stepKey === "responses") {
      if (!v.fallback || v.fallback.trim().length === 0) {
        stepErrors.fallback = "Fallback message is required.";
      } else if (v.fallback.length > LIMITS.fallbackMax) {
        stepErrors.fallback = `Keep fallback under ${LIMITS.fallbackMax} characters.`;
      }
      const esc = v.escalation || {};
      if (esc.enabled) {
        if (!esc.email) {
          stepErrors.escalationEmail =
            "Escalation email is required when escalation is enabled.";
        } else if (!emailRe.test(esc.email)) {
          stepErrors.escalationEmail = "Please enter a valid email address.";
        }
      }
    }

    if (stepKey === "basics") {
      if (!v.botName || v.botName.trim().length === 0) {
        stepErrors.botName = "Bot name is required.";
      } else if (v.botName.length > LIMITS.botNameMax) {
        stepErrors.botName = `Keep bot name under ${LIMITS.botNameMax} characters.`;
      }
      if (!v.model) {
        stepErrors.model = "Please select a model.";
      }
      // ✅ systemMessage is optional but capped
      if (v.systemMessage && v.systemMessage.length > LIMITS.systemMessageMax) {
        stepErrors.systemMessage = `Keep system message under ${LIMITS.systemMessageMax} characters.`;
      }
    }

    set((s) => ({ errors: { ...s.errors, [stepKey]: stepErrors } }));
    return Object.keys(stepErrors).length === 0;
  },

  // ---------- Field-level live validation ----------
  validateField: (stepKey, field) => {
    const v = get().values;
    let message = "";

    if (stepKey === "responses") {
      if (field === "fallback") {
        if (!v.fallback || v.fallback.trim().length === 0) {
          message = "Fallback message is required.";
        } else if (v.fallback.length > LIMITS.fallbackMax) {
          message = `Keep fallback under ${LIMITS.fallbackMax} characters.`;
        }
      }
      if (field === "escalationEmail") {
        const esc = v.escalation || {};
        if (esc.enabled) {
          if (!esc.email) message = "Escalation email is required.";
          else if (!emailRe.test(esc.email))
            message = "Please enter a valid email address.";
        } else {
          message = "";
        }
      }
    }

    if (stepKey === "basics") {
      if (field === "botName") {
        if (!v.botName || v.botName.trim().length === 0) {
          message = "Bot name is required.";
        } else if (v.botName.length > LIMITS.botNameMax) {
          message = `Keep bot name under ${LIMITS.botNameMax} characters.`;
        }
      }
      if (field === "model") {
        if (!v.model) message = "Please select a model.";
      }
      if (field === "systemMessage") {
        if (
          v.systemMessage &&
          v.systemMessage.length > LIMITS.systemMessageMax
        ) {
          message = `Keep system message under ${LIMITS.systemMessageMax} characters.`;
        }
      }
    }

    set((s) => ({
      errors: {
        ...s.errors,
        [stepKey]: { ...(s.errors[stepKey] || {}), [field]: message },
      },
    }));
  },

  clearFieldError: (stepKey, field) =>
    set((s) => {
      const step = { ...(s.errors[stepKey] || {}) };
      delete step[field];
      return { errors: { ...s.errors, [stepKey]: step } };
    }),
}));
