import { useWizardStore } from "../../../store/wizardStore";
import ChatPreview from "../../../components/ChatPreview/ChatPreview";
import { Button } from "@/components/ui/button";
import StepActions from "../../../components/ui/StepActions/StepActions";
import ChatInterface from "@/components/ChatInterface/ChatInterface";

export default function StepPreview() {
  const { next, prev } = useWizardStore();
  return (
    <>
      <h3>🧪 Preview</h3>
      {/* <ChatPreview /> */}
      <ChatInterface />
      <StepActions>
        <Button variant="outline" onClick={prev}>
          Back
        </Button>
        <Button onClick={next}>Next</Button>
      </StepActions>
    </>
  );
}
