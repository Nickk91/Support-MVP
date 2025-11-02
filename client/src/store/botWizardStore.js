// src/store/botWizardStore.js
import { create } from "zustand";
import { PERSONALITY_TEMPLATES } from "@/constants/personalityTemplates";
import { SAFETY_TEMPLATES } from "@/constants/safetyTemplates";

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

  // NEW: Template constants (no loading state needed)
  templates: {
    personality: PERSONALITY_TEMPLATES,
    safety: SAFETY_TEMPLATES,
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
      currentStep: Math.min(state.currentStep + 1, 3),
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
        temperature: 0.7,
        personalityType: "professional",
        safetyLevel: "standard",
        systemMessage: "",
        guardrails: "",
        greeting: "",
        companyReference: "",
        brandContext: {
          primaryCompany: "",
          verifiedBrands: [],
          customBrands: [],
          tier: "basic",
        },
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
      case 0:
        return !!(
          formData.botName &&
          formData.botName.trim().length > 0 &&
          formData.model &&
          formData.companyReference &&
          formData.companyReference.trim().length > 0
        );

      case 1:
        return !!formData.personalityType;

      case 2:
        return !!formData.safetyLevel;

      case 3:
        return true;

      default:
        return false;
    }
  },
}));
