// src/features/onboarding/OnboardingWizard.jsx
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

const map = {
  welcome: StepWelcome,
  basics: StepBotBasics,
  knowledge: StepKnowledge,
  responses: StepResponses,
  preview: StepPreview,
  deploy: StepDeploy,
};

export default function OnboardingWizard() {
  const { steps, currentStepIndex, progress } = useWizardStore();
  const Step = map[steps[currentStepIndex]];

  return (
    <div className="max-w-4xl mx-auto p-6 grid gap-4">
      {/* Header row: robot fill + pipeline */}
      <div className="flex items-center gap-4">
        <RobotProgress progress={progress()} size="w-12 h-12" />
        <div className="flex-1">
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
