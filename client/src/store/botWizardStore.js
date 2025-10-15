// src/store/botWizardStore.js
import { create } from "zustand";

export const useBotWizardStore = create((set, get) => ({
  // Bot form data
  formData: {
    botName: "",
    model: "gpt-4o-mini",
    systemMessage: "",
    fallback: "",
    escalation: { enabled: false, escalation_email: "" },
    files: [],
  },

  // Current step
  currentStep: 0,

  // Actions
  updateFormData: (updates) =>
    set((state) => ({
      formData: { ...state.formData, ...updates },
    })),

  setCurrentStep: (step) => set({ currentStep: step }),

  nextStep: () =>
    set((state) => ({
      currentStep: Math.min(state.currentStep + 1, 3), // 3 is the last step index
    })),

  prevStep: () =>
    set((state) => ({
      currentStep: Math.max(state.currentStep - 1, 0),
    })),

  reset: () =>
    set({
      formData: {
        botName: "",
        model: "gpt-4o-mini",
        systemMessage: "",
        fallback: "",
        escalation: { enabled: false, escalation_email: "" },
        files: [],
      },
      currentStep: 0,
    }),

  // Validation for current step
  isStepValid: () => {
    const { formData, currentStep } = get();

    switch (currentStep) {
      case 0: // Basic
        return formData.botName && formData.model;
      case 1: // Behavior
        return formData.fallback;
      case 2: // Knowledge
        return true; // Files are optional
      case 3: // Advanced
        return true; // Advanced settings are optional
      default:
        return true;
    }
  },
}));
