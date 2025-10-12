// src/features/onboarding/OnboardingWizard.jsx
import { useEffect } from "react";
import { useWizardStore } from "@/store/wizardStore";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import PipelineProgress from "@/components/ui/PipelineProgress/PipelineProgress";
import RobotProgress from "@/components/ui/RobotProgress/RobotProgress";

import StepWelcome from "./steps/StepWelcome";
import StepBotBasics from "./steps/StepBotBasics";
import StepKnowledge from "./steps/StepKnowledge";
import StepResponses from "./steps/StepResponses";
import StepPreview from "./steps/StepPreview";
import StepDeploy from "./steps/StepDeploy";
import StepRegister from "./steps/StepRegister";

const map = {
  welcome: StepWelcome,
  basics: StepBotBasics,

  responses: StepResponses,
  register: StepRegister,
  knowledge: StepKnowledge,
  preview: StepPreview,
  deploy: StepDeploy,
};

export default function OnboardingWizard() {
  const {
    steps,
    currentStepIndex,
    progress,
    values, // <-- pull values from store
    hydrate, // <-- new action
  } = useWizardStore();

  const Step = map[steps[currentStepIndex]];

  // Save to localStorage whenever values/step changes
  useEffect(() => {
    localStorage.setItem(
      "wizard",
      JSON.stringify({ values, currentStepIndex })
    );
  }, [values, currentStepIndex]);

  // Hydrate once on mount
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("wizard") || "{}");
    if (saved && (saved.values || typeof saved.currentStepIndex === "number")) {
      hydrate(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6 grid gap-4 justify-center">
      {/* Header row: robot fill + pipeline */}
      <div className="flex items-center gap-4">
        <RobotProgress progress={progress()} size="w-12 h-12" />
        <div className="flex-1 min-w-0">
          <PipelineProgress steps={steps} currentIndex={currentStepIndex} />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xl">Onboarding</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Step />
        </CardContent>
      </Card>

      <div className="text-center text-sm opacity-60">
        Step {currentStepIndex + 1} / {steps.length}
      </div>
    </div>
  );
}
