import { useWizardStore } from "../../../store/wizardStore";
import Button from "../../../components/ui/Button/Button";
import StepActions from "../../../components/ui/StepActions/StepActions";

export default function StepWelcome() {
  const { next } = useWizardStore();
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 56 }}>🤖🎉</div>
      <h2>Let’s build your AI Support Bot</h2>
      <p>Answer a few quick questions. We’ll handle the rest.</p>
      <StepActions>
        <Button variant="primary" onClick={next}>
          Start Setup
        </Button>
      </StepActions>
    </div>
  );
}
