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
  // In your botWizardStore - UPDATE isStepValid function
  isStepValid: () => {
    const { currentStep, formData } = get();

    switch (currentStep) {
      case 0: // Basic Settings - only botName is required
        return !!(formData.botName && formData.botName.trim().length > 0);

      case 1: // Behavior Settings - all fields are optional
        return true;

      case 2: // Knowledge Settings - files are optional
        return true;

      case 3: // Advanced Settings - all fields have defaults
        return true;

      default:
        return false;
    }
  },
}));
