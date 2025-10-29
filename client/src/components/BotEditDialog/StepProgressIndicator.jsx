const STEPS = [
  { id: "basic", label: "Basic Info" },
  { id: "behavior", label: "Behavior" },
  { id: "knowledge", label: "Knowledge" },
  { id: "advanced", label: "Advanced" },
];

export default function StepProgressIndicator({ currentStep }) {
  return (
    <div className="flex items-center justify-between mb-6">
      {STEPS.map((step, index) => (
        <div key={step.id} className="flex items-center">
          {/* Step Circle */}
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              index === currentStep
                ? "bg-primary text-primary-foreground"
                : index < currentStep
                ? "bg-green-500 text-white"
                : "bg-gray-200 text-gray-600"
            }`}
          >
            {index < currentStep ? "✓" : index + 1}
          </div>

          {/* Step Label */}
          <span
            className={`ml-2 text-sm ${
              index === currentStep
                ? "text-primary font-medium"
                : index < currentStep
                ? "text-green-600 font-medium"
                : "text-gray-500"
            }`}
          >
            {step.label}
          </span>

          {/* Connector Line (except for last step) */}
          {index < STEPS.length - 1 && (
            <div
              className={`w-12 h-0.5 mx-2 ${
                index < currentStep ? "bg-green-500" : "bg-gray-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
