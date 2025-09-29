import { useWizardStore } from "../../../store/wizardStore";
import { Button } from "@/components/ui/button";
import StepActions from "../../../components/ui/StepActions/StepActions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export default function StepResponses() {
  const { values, update, next, prev } = useWizardStore();

  return (
    <>
      <h3 className="text-lg font-semibold mb-3">🛡️ Behavior & Fallbacks</h3>

      <div className="grid gap-4">
        {/* Fallback message */}
        <div className="grid gap-1">
          <Label htmlFor="fallback">Fallback Message</Label>
          <Input
            id="fallback"
            value={values.fallback}
            onChange={(e) => update({ fallback: e.target.value })}
            placeholder="Sorry, I couldn’t find that. Can you rephrase?"
          />
        </div>

        {/* Escalation toggle */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="enableEscalation"
            checked={values.escalation.enabled}
            onCheckedChange={(checked) =>
              update({
                escalation: { ...values.escalation, enabled: !!checked },
              })
            }
            /* optional brand tweak */
            className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
          />
          <Label htmlFor="enableEscalation" className="font-normal">
            Enable email escalation
          </Label>
        </div>

        {/* Escalation email (conditional) */}
        {values.escalation.enabled && (
          <div className="grid gap-1">
            <Label htmlFor="escalationEmail">Escalation Email</Label>
            <Input
              id="escalationEmail"
              type="email"
              value={values.escalation.email}
              onChange={(e) =>
                update({
                  escalation: { ...values.escalation, email: e.target.value },
                })
              }
              placeholder="support@yourcompany.com"
            />
          </div>
        )}
      </div>

      <StepActions>
        <Button variant="outline" onClick={prev}>
          Back
        </Button>
        <Button onClick={next}>Next</Button>
      </StepActions>
    </>
  );
}
