// src/store/wizardStore.js
import { create } from "zustand";
import { validateStep, validateField } from "@/utils/validation";

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
    // Bot configuration
    botName: "",
    personality: "Friendly",
    systemMessage: "",
    model: "gpt-4o-mini",
    fallback: "",
    escalation: { enabled: false, email: "" },

    // Registration fields
    user: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      companyName: "",
    },

    // File uploads
    uploadedFiles: [],
  },
  errors: {},
};

export const useWizardStore = create((set, get) => ({
  ...JSON.parse(JSON.stringify(initial)),

  progress: () =>
    Math.round(((get().currentStepIndex + 1) / get().steps.length) * 100),

  update: (patch) =>
    set((s) => ({
      values: { ...s.values, ...patch },
    })),

  updateUser: (userPatch) =>
    set((s) => ({
      values: {
        ...s.values,
        user: {
          ...s.values.user,
          ...userPatch,
        },
      },
    })),

  next: () =>
    set((s) => ({
      currentStepIndex: Math.min(s.currentStepIndex + 1, s.steps.length - 1),
    })),

  prev: () =>
    set((s) => ({
      currentStepIndex: Math.max(s.currentStepIndex - 1, 0),
    })),

  reset: () => set(() => JSON.parse(JSON.stringify(initial))),

  hydrate: (saved) =>
    set((s) => {
      const savedVals = saved?.values || {};
      const savedUser = savedVals.user || {};

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
          user: {
            email: savedUser.email || s.values.user.email,
            password: savedUser.password || s.values.user.password,
            firstName: savedUser.firstName || s.values.user.firstName,
            lastName: savedUser.lastName || s.values.user.lastName,
            companyName: savedUser.companyName || s.values.user.companyName,
          },
          uploadedFiles: savedVals.uploadedFiles || [],
        },
      };
    }),

  // Step-level validation
  validateStep: (stepKey) => {
    const values = get().values;
    const stepErrors = validateStep(stepKey, values);

    set((s) => ({ errors: { ...s.errors, [stepKey]: stepErrors } }));
    return Object.keys(stepErrors).length === 0;
  },

  // Field-level validation
  validateField: (stepKey, field) => {
    const values = get().values;
    const message = validateField(stepKey, field, values);

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

  clearRegistration: () =>
    set((s) => ({
      values: {
        ...s.values,
        user: {
          email: "",
          password: "",
          firstName: "",
          lastName: "",
          companyName: "",
        },
      },
    })),
}));
