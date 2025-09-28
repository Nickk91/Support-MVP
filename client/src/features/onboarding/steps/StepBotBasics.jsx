import { useWizardStore } from "../../../store/wizardStore";
import Button from "../../../components/ui/Button/Button";
import StepActions from "../../../components/ui/StepActions/StepActions";

export default function StepBotBasics() {
  const { values, update, next, prev } = useWizardStore();
  return (
    <>
      <h3>🤖 Bot Basics</h3>
      <div style={{ display: "flex", flexDirection: "row", gap: 10 }}>
        <label>
          Bot Name
          <input
            value={values.botName}
            onChange={(e) => update({ botName: e.target.value })}
            placeholder="e.g., Ragmate Assistant"
          />
        </label>
        <label>
          Personality
          <select
            value={values.personality}
            onChange={(e) => update({ personality: e.target.value })}
          >
            <option>Friendly</option>
            <option>Professional</option>
            <option>Technical</option>
          </select>
        </label>
        <label>
          Model
          <select
            value={values.model}
            onChange={(e) => update({ model: e.target.value })}
          >
            <option value="gpt-4o-mini">GPT-4o mini</option>
            <option value="gpt-4o">GPT-4o</option>
            <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
            <option value="llama-3.1-70b">Llama 3.1 70B</option>
          </select>
        </label>
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
