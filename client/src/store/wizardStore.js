// src/store/wizardStore.js
import { create } from "zustand";
import { validateStep, validateField } from "@/utils/validation";

const initial = {
  steps: [
    "welcome",
    "basics",
    "responses",
    "register", // This step will be skipped when logged in
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
  // 🆕 Add auth status
  isAuthenticated: false,
};

export const useWizardStore = create((set, get) => ({
  ...JSON.parse(JSON.stringify(initial)),

  progress: () => {
    const steps = get().steps;
    return Math.round(((get().currentStepIndex + 1) / steps.length) * 100);
  },

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

  // 🆕 Enhanced next method that skips register when authenticated
  next: () =>
    set((s) => {
      const nextIndex = s.currentStepIndex + 1;
      let targetIndex = Math.min(nextIndex, s.steps.length - 1);

      // Skip register step if user is authenticated
      if (s.isAuthenticated && s.steps[targetIndex] === "register") {
        targetIndex = Math.min(targetIndex + 1, s.steps.length - 1);
        console.log("🔄 Skipping register step - user authenticated");
      }

      return { currentStepIndex: targetIndex };
    }),

  // 🆕 Enhanced prev method that skips register when authenticated
  prev: () =>
    set((s) => {
      const prevIndex = s.currentStepIndex - 1;
      let targetIndex = Math.max(prevIndex, 0);

      // Skip register step if user is authenticated
      if (s.isAuthenticated && s.steps[targetIndex] === "register") {
        targetIndex = Math.max(targetIndex - 1, 0);
        console.log("🔄 Skipping register step - user authenticated");
      }

      return { currentStepIndex: targetIndex };
    }),

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

  // 🆕 Add auth actions
  setAuthenticated: (status) => set({ isAuthenticated: status }),

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
