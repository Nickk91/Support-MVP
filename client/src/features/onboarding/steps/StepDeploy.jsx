// src/features/onboarding/steps/StepDeploy.jsx
import { useEffect, useMemo, useState } from "react";
import { useWizardStore } from "../../../store/wizardStore";
import { Button } from "@/components/ui/button";
import StepActions from "../../../components/ui/StepActions/StepActions";
import SuccessSplash from "@/components/ui/SuccessSplash/SuccessSplash";
import api from "@/lib/api";

export default function StepDeploy() {
  const { values, prev } = useWizardStore();

  const [copied, setCopied] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [error, setError] = useState("");
  const [botInfo, setBotInfo] = useState(null);

  // Prefer an ID-based snippet once the bot is created; otherwise fall back to name.
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

  async function createBot(payload) {
    const { data } = await api.post("/bots", payload);
    return data; // { ok: true, bot: {...} }
  }

  const handleDeploy = async () => {
    if (isDeploying) return;
    setIsDeploying(true);
    setError("");

    try {
      // Only send what the backend cares about (align with server's bots route)
      const payload = {
        botName: values.botName,
        model: values.model,
        personality: values.personality,
        fallback: values.fallback,
        escalation: values.escalation,
        files: values.uploadedFiles || [], // from StepKnowledge
      };

      const json = await createBot(payload);
      if (!json?.ok || !json?.bot) {
        throw new Error(json?.message || "Bot creation failed");
      }

      setBotInfo(json.bot);

      // small delight delay then splash
      setTimeout(() => {
        setIsDeploying(false);
        setShowSplash(true);
      }, 300);
    } catch (e) {
      setIsDeploying(false);
      setError(e.message || "Failed to deploy");
    }
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

      {botInfo && (
        <div className="mt-2 text-sm text-muted-foreground">
          Deployed bot <span className="font-mono">{botInfo.id}</span> •{" "}
          {botInfo.model}
        </div>
      )}

      {error && <div className="mt-2 text-sm text-destructive">{error}</div>}

      <StepActions>
        <Button variant="outline" onClick={prev} disabled={isDeploying}>
          Back
        </Button>
        <Button variant="outline" onClick={handleCopy} disabled={isDeploying}>
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
