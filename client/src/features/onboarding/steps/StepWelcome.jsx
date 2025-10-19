import { useWizardStore } from "../../../store/wizardStore";
import { Button } from "@/components/ui/button";

import StepActions from "../../../components/ui/StepActions/StepActions";

import { Bot } from "lucide-react";

export default function StepWelcome() {
  const { next } = useWizardStore();
  return (
    <div style={{ textAlign: "center" }}>
      <div className="flex justify-center mb-4">
        <div className="relative">
          <Bot size={48} className="text-blue-600" />
          {/* <Sparkles
            size={20}
            className="absolute -top-1 -right-1 text-yellow-500"
          /> */}
        </div>
      </div>
      <h2>Let's build your AI Support Bot</h2>
      <p>Answer a few quick questions. We'll handle the rest.</p>
      <StepActions>
        <Button variant="outline" onClick={next}>
          Start Setup
        </Button>
      </StepActions>
    </div>
  );
}
