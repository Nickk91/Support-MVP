import { useWizardStore } from "../../../store/wizardStore";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import StepActions from "../../../components/ui/StepActions/StepActions";
import SuccessSplash from "@/components/ui/SuccessSplash/SuccessSplash";
import api from "@/lib/api";

export default function StepDeploy() {
  const { values, prev } = useWizardStore();
  const [snippet, setSnippet] = useState("");
  const [copied, setCopied] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [error, setError] = useState("");

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
    } catch {}
  };

  async function createBot(botPayload) {
    const res = await api.post("/bots", botPayload);
    return res.data; // { ok: true, bot: {...} }
  }

  const handleDeploy = async () => {
    if (isDeploying) return;
    setIsDeploying(true);
    setError("");

    try {
      // Build payload explicitly so we don’t leak extra fields
      const payload = {
        name: values.botName,
        model: values.model,
        personality: values.personality,
        fallback: values.fallback,
        escalation: values.escalation,
        // from StepKnowledge success; safe if undefined
        files: values.uploadedFiles || [],
      };

      const json = await createBot(payload);
      if (!json?.ok) throw new Error(json?.message || "Bot creation failed");

      // small delight delay then splash
      setTimeout(() => {
        setIsDeploying(false);
        setShowSplash(true);
      }, 400);
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

      <SuccessSplash
        show={showSplash}
        onComplete={() => setShowSplash(false)}
      />
    </>
  );
}
