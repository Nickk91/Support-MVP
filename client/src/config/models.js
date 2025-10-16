// src/config/models.js
export const AI_MODELS = [
  {
    value: "gpt-4o-mini",
    label: "GPT-4o Mini",
    description: "Fast and cost-effective for most tasks",
  },
  {
    value: "gpt-4o",
    label: "GPT-4o",
    description: "Most capable model with multimodal support",
  },
  {
    value: "claude-3-5-sonnet",
    label: "Claude 3.5 Sonnet",
    description: "Balanced intelligence and speed",
  },
  {
    value: "llama-3.1-70b",
    label: "Llama 3.1 70B",
    description: "Open-source powerhouse",
  },
];

export const MODEL_VALUES = AI_MODELS.map((model) => model.value);
