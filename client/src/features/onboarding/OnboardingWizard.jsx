// src/features/onboarding/OnboardingWizard.jsx
import { useWizardStore } from "../../store/wizardStore";
import Progress from "../../components/ui/Progress/Progress";
import Card from "../../components/ui/Card/Card";

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
    <div style={{ maxWidth: 960, margin: "40px auto", padding: 24 }}>
      <Progress value={progress()} />
      <div style={{ height: 24 }} />
      <Card>
        <Step />
      </Card>
      <div style={{ marginTop: 12, textAlign: "center", opacity: 0.6 }}>
        Step {currentStepIndex + 1} / {steps.length}
      </div>
    </div>
  );
}
