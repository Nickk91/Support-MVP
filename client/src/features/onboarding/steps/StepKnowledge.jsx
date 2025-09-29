import { useWizardStore } from "../../../store/wizardStore";
import { Button } from "@/components/ui/button";
import StepActions from "../../../components/ui/StepActions/StepActions";
import { Input } from "@/components/ui/input";

export default function StepKnowledge() {
  const { values, update, next, prev } = useWizardStore();

  const onFiles = (e) => {
    const files = Array.from(e.target.files || []);
    update({ files });
  };

  const toggle = (id) => {
    const set = new Set(values.connectors);
    set.has(id) ? set.delete(id) : set.add(id);
    update({ connectors: Array.from(set) });
  };

  return (
    <>
      <h3>📚 Knowledge Base</h3>
      <Input
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.txt"
        onChange={onFiles}
      />
      <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
        <Button onClick={() => toggle("google-drive")}>Google Drive</Button>
        <Button onClick={() => toggle("confluence")}>Confluence</Button>
        <Button onClick={() => toggle("notion")}>Notion</Button>
      </div>
      <StepActions>
        <Button onClick={prev}>Back</Button>
        <Button variant="primary" onClick={next}>
          Next
        </Button>
      </StepActions>
    </>
  );
}
