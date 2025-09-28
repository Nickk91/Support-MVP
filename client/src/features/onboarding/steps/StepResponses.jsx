import { useWizardStore } from "../../../store/wizardStore";
import Button from "../../../components/ui/Button/Button";
import StepActions from "../../../components/ui/StepActions/StepActions";

export default function StepResponses() {
  const { values, update, next, prev } = useWizardStore();
  return (
    <>
      <h3>🛡️ Behavior & Fallbacks</h3>
      <label>
        Fallback Message
        <input
          value={values.fallback}
          onChange={(e) => update({ fallback: e.target.value })}
        />
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type="checkbox"
          checked={values.escalation.enabled}
          onChange={(e) =>
            update({
              escalation: { ...values.escalation, enabled: e.target.checked },
            })
          }
        />
        Enable email escalation
      </label>
      {values.escalation.enabled && (
        <label>
          Escalation Email
          <input
            value={values.escalation.email}
            onChange={(e) =>
              update({
                escalation: { ...values.escalation, email: e.target.value },
              })
            }
          />
        </label>
      )}
      <StepActions>
        <Button onClick={prev}>Back</Button>
        <Button variant="primary" onClick={next}>
          Next
        </Button>
      </StepActions>
    </>
  );
}
