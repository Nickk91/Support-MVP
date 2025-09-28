import { useWizardStore } from "../../../store/wizardStore";
// import ChatPreview from "../../../components/ChatPreview";
import Button from "../../../components/ui/Button/Button";
import StepActions from "../../../components/ui/StepActions/StepActions";

export default function StepPreview() {
  const { next, prev } = useWizardStore();
  return (
    <>
      <h3>🧪 Preview</h3>
      <ChatPreview />
      <StepActions>
        <Button onClick={prev}>Back</Button>
        <Button variant="primary" onClick={next}>
          Looks Good
        </Button>
      </StepActions>
    </>
  );
}
