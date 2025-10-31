// src/store/botWizardStore.js
import { create } from "zustand";

export const useBotWizardStore = create((set, get) => ({
  // Bot form data
  formData: {
    // Core bot identity
    botName: "",
    model: "gpt-4o-mini",
    temperature: 0.7,

    // Template system
    personalityType: "professional",
    safetyLevel: "standard",

    // Derived prompts
    systemMessage: "",
    guardrails: "",
    greeting: "",

    // BASIC TIER: Single company reference
    companyReference: "", // New field for MVP

    // Brand system (for future tiers - empty in MVP)
    brandContext: {
      primaryCompany: "",
      verifiedBrands: [],
      customBrands: [],
      tier: "basic",
    },

    // Existing fields
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
      currentStep: Math.min(state.currentStep + 1, 3), // 3 is the last step index (4 steps total)
    })),

  prevStep: () =>
    set((state) => ({
      currentStep: Math.max(state.currentStep - 1, 0),
    })),

  reset: () =>
    set({
      formData: {
        // Core bot identity
        botName: "",
        model: "gpt-4o-mini",
        temperature: 0.7,

        // Template system
        personalityType: "professional",
        safetyLevel: "standard",

        // Derived prompts
        systemMessage: "",
        guardrails: "",
        greeting: "",

        // BASIC TIER: Single company reference
        companyReference: "",

        // Brand system (for future tiers - empty in MVP)
        brandContext: {
          primaryCompany: "",
          verifiedBrands: [],
          customBrands: [],
          tier: "basic",
        },

        // Existing fields
        fallback: "",
        escalation: { enabled: false, escalation_email: "" },
        files: [],
      },
      currentStep: 0,
    }),

  // UPDATED: Validation for 4 steps with companyReference requirement
  isStepValid: () => {
    const { currentStep, formData } = get();

    switch (currentStep) {
      case 0: // Basic Settings - botName, model, AND companyReference are required
        return !!(
          formData.botName &&
          formData.botName.trim().length > 0 &&
          formData.model &&
          formData.companyReference &&
          formData.companyReference.trim().length > 0
        );

      case 1: // Personality Settings - template selection
        return !!formData.personalityType;

      case 2: // Safety Settings - template selection
        return !!formData.safetyLevel;

      case 3: // Knowledge Settings - files are optional
        return true;

      default:
        return false;
    }
  },
}));
