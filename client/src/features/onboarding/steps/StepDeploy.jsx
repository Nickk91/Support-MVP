// src/features/onboarding/steps/StepDeploy.jsx
import { useWizardStore } from "../../../store/wizardStore";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import StepActions from "../../../components/ui/StepActions/StepActions";
import SuccessSplash from "@/components/ui/SuccessSplash/SuccessSplash";

export default function StepDeploy() {
  const { values, prev } = useWizardStore();

  const [snippet, setSnippet] = useState("");
  const [copied, setCopied] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    setSnippet(
      `<script src="https://cdn.ragmate.io/widget.js" data-bot="${
        values.botName || "my-bot"
      }"></script>`
    );
  }, [values.botName]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  };

  const handleDeploy = () => {
    // simulate backend provisioning work
    setIsDeploying(true);
    setTimeout(() => {
      setIsDeploying(false);
      setShowSplash(true); // ⚡ show the “It’s alive!” splash
    }, 1200);
  };

  return (
    <>
      <h3 className="text-lg font-semibold">🚀 Deploy</h3>
      <p className="text-sm text-muted-foreground">
        Paste this snippet into your site’s{" "}
        <code className="font-mono">&lt;body&gt;</code>:
      </p>

      <pre className="mt-2 max-w-full overflow-x-auto rounded-lg border bg-black p-3 text-green-400 text-sm">
        {snippet}
      </pre>

      <StepActions>
        <Button variant="outline" onClick={prev}>
          Back
        </Button>
        <Button variant="outline" onClick={handleCopy}>
          {copied ? "Copied!" : "Copy"}
        </Button>
        <Button onClick={handleDeploy} disabled={isDeploying}>
          {isDeploying ? "Deploying…" : "Deploy Bot"}
        </Button>
      </StepActions>

      <p className="mt-3 text-sm text-muted-foreground">
        Or connect: Slack · Teams · WhatsApp
      </p>

      {/* ⚡ Success splash (lightning + “It’s alive!”) */}
      <SuccessSplash
        show={showSplash}
        onComplete={() => setShowSplash(false)}
      />
    </>
  );
}
