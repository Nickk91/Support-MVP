// src/features/onboarding/steps/StepDeploy.jsx
import { useEffect, useMemo, useState } from "react";
import { useWizardStore } from "../../../store/wizardStore";
import { Button } from "@/components/ui/button";
import StepActions from "../../../components/ui/StepActions/StepActions";
import SuccessSplash from "@/components/ui/SuccessSplash/SuccessSplash";
import api from "@/lib/api";
import { RocketLaunchIcon } from "@heroicons/react/24/outline";

export default function StepDeploy() {
  const { values, prev } = useWizardStore();

  const [copied, setCopied] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [error, setError] = useState("");
  const [botInfo, setBotInfo] = useState(null);

  // Check if user is authenticated
  const isAuthenticated = !!localStorage.getItem("authToken");

  const snippet = useMemo(() => {
    if (botInfo?.id) {
      return `<script src="https://cdn.ragmate.io/widget.js" data-bot-id="${botInfo.id}"></script>`;
    }
    const name = values.botName?.trim() || "my-bot";
    return `<script src="https://cdn.ragmate.io/widget.js" data-bot="${name}"></script>`;
  }, [botInfo?.id, values.botName]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  };

  const createBot = async (payload) => {
    const { data } = await api.post("/bots", payload);
    return data;
  };

  const handleDeploy = async () => {
    if (isDeploying) return;

    if (!isAuthenticated) {
      setError("Please create an account before deploying your bot");
      return;
    }

    setIsDeploying(true);
    setError("");

    try {
      const payload = {
        botName: values.botName,
        model: values.model,

        systemMessage: values.systemMessage,
        fallback: values.fallback,
        escalation: values.escalation,
        files: values.uploadedFiles || [],
      };

      console.log("🚀 Deploying bot with payload:", payload);

      const data = await createBot(payload);

      if (!data?.ok || !data?.bot) {
        throw new Error(data?.message || "Bot creation failed");
      }

      setBotInfo(data.bot);

      // Success animation
      setTimeout(() => {
        setIsDeploying(false);
        setShowSplash(true);
      }, 300);
    } catch (err) {
      console.error("❌ Deployment failed:", err);
      setIsDeploying(false);
      setError(err.message || "Failed to deploy bot. Please try again.");
    }
  };

  return (
    <>
      <div className="flex items-center justify-center mb-4">
        <RocketLaunchIcon className="h-8 w-8 text-green-600" />
      </div>

      <h3 className="text-lg font-semibold text-center mb-4">
        Deploy Your AI Assistant
      </h3>

      {!isAuthenticated && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> You need to create an account to deploy your
            bot and get the embed code.
          </p>
        </div>
      )}

      <p className="text-sm text-muted-foreground mb-4 text-center">
        Paste this snippet into your website's{" "}
        <code className="font-mono bg-muted px-1 rounded">&lt;body&gt;</code>{" "}
        tag:
      </p>

      <pre className="mt-2 max-w-full overflow-x-auto rounded-lg border bg-black p-3 text-green-400 text-sm">
        {snippet}
      </pre>

      {botInfo && (
        <div className="mt-2 text-sm text-muted-foreground text-center">
          Deployed bot{" "}
          <span className="font-mono bg-muted px-1 rounded">{botInfo.id}</span>{" "}
          • {botInfo.model}
        </div>
      )}

      {error && (
        <div className="mt-2 text-sm text-destructive bg-destructive/10 p-2 rounded text-center">
          {error}
        </div>
      )}

      <StepActions>
        <Button variant="outline" onClick={prev} disabled={isDeploying}>
          Back
        </Button>
        <Button variant="outline" onClick={handleCopy} disabled={isDeploying}>
          {copied ? "Copied!" : "Copy Code"}
        </Button>
        <Button
          onClick={handleDeploy}
          disabled={isDeploying || !isAuthenticated}
          className="flex items-center gap-2"
        >
          {isDeploying ? (
            <>
              <span className="animate-spin">⏳</span>
              Deploying…
            </>
          ) : (
            <>
              <RocketLaunchIcon className="h-4 w-4" />
              Deploy Bot
            </>
          )}
        </Button>
      </StepActions>

      <p className="mt-3 text-sm text-muted-foreground text-center">
        Additional integrations: Slack • Teams • WhatsApp (Coming Soon)
      </p>

      <SuccessSplash
        show={showSplash}
        onComplete={() => setShowSplash(false)}
      />
    </>
  );
}
