// src/components/BotEditDialog/StepProgressIndicator.jsx

// UPDATED: Removed "advanced" step
const STEPS = [
  { id: "basic", label: "Basic" },
  { id: "personality", label: "Personality" },
  { id: "safety", label: "Safety" },
  { id: "knowledge", label: "Knowledge" },
];

export default function StepProgressIndicator({ currentStep }) {
  return (
    <div className="flex items-center justify-between mb-6 px-1 sm:px-2">
      {STEPS.map((step, index) => (
        <div key={step.id} className="flex items-center flex-1 justify-center">
          {/* Step Circle with responsive sizing */}
          <div
            className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium flex-shrink-0 ${
              index === currentStep
                ? "bg-primary text-primary-foreground"
                : index < currentStep
                ? "bg-green-500 text-white"
                : "bg-gray-200 text-gray-600"
            }`}
          >
            {index < currentStep ? (
              <span className="text-xs sm:text-sm">✓</span>
            ) : (
              index + 1
            )}
          </div>

          {/* Step Label - show on all screens but with different styling */}
          <span
            className={`ml-2 text-xs sm:text-sm truncate ${
              index === currentStep
                ? "text-primary font-medium"
                : index < currentStep
                ? "text-green-600 font-medium"
                : "text-gray-500"
            }`}
          >
            {step.label}
          </span>

          {/* Connector Line (except for last step) - responsive spacing */}
          {index < STEPS.length - 1 && (
            <div
              className={`flex-1 h-0.5 mx-1 sm:mx-2 ${
                index < currentStep ? "bg-green-500" : "bg-gray-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
