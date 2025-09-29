import { useWizardStore } from "../../../store/wizardStore";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import StepActions from "../../../components/ui/StepActions/StepActions";

export default function StepDeploy() {
  const { values, prev } = useWizardStore();
  const [snippet, setSnippet] = useState("");

  useEffect(() => {
    setSnippet(
      `<script src="https://cdn.ragmate.io/widget.js" data-bot="${
        values.botName || "my-bot"
      }"></script>`
    );
  }, [values.botName]);

  return (
    <>
      <h3>🚀 Deploy</h3>
      <p>
        Paste this snippet into your site’s <code>&lt;body&gt;</code>:
      </p>
      <pre
        style={{
          background: "#111",
          color: "#0f0",
          padding: 12,
          borderRadius: 8,
          overflowX: "auto",
        }}
      >
        {snippet}
      </pre>
      <StepActions>
        <Button onClick={prev}>Back</Button>
        <Button onClick={() => navigator.clipboard.writeText(snippet)}>
          Copy
        </Button>
      </StepActions>
      <p style={{ opacity: 0.7, marginTop: 12 }}>
        Or connect: Slack · Teams · WhatsApp
      </p>
    </>
  );
}
