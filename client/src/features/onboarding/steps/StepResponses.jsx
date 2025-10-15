// src/features/onboarding/steps/StepResponses.jsx - UPDATED
import { useWizardStore } from "@/store/wizardStore";
import { Label } from "@radix-ui/react-label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import StepActions from "@/components/ui/StepActions/StepActions";
import Button from "@/components/ui/Button/Button";

export default function StepResponses() {
  const { values, update, next, prev, validateStep, validateField, errors } =
    useWizardStore();

  const escalation = values?.escalation ?? {
    enabled: false,
    escalation_email: "",
  }; // ✅ Updated
  const stepErr = errors?.responses || {};

  const handleNext = () => {
    if (validateStep("responses")) next();
  };

  return (
    <>
      <h3 className="mb-3 text-lg font-semibold">🛡️ Behavior & Fallbacks</h3>

      <div className="grid gap-4">
        {/* Fallback message */}
        <div className="grid gap-1">
          <Label htmlFor="fallback">Fallback Message</Label>
          <Input
            id="fallback"
            value={values.fallback ?? ""}
            onChange={(e) => {
              update({ fallback: e.target.value });
              validateField("responses", "fallback");
            }}
            placeholder="Sorry, I couldn't find that. Can you rephrase?"
            className={
              stepErr.fallback
                ? "border-destructive focus-visible:ring-destructive"
                : ""
            }
          />
          {stepErr.fallback && (
            <p className="text-sm text-destructive">{stepErr.fallback}</p>
          )}
        </div>

        {/* Escalation toggle */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="enableEscalation"
            checked={!!escalation.enabled}
            onCheckedChange={(checked) => {
              update({ escalation: { ...escalation, enabled: !!checked } });
              validateField("responses", "escalationEmail");
            }}
            className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
          />
          <Label htmlFor="enableEscalation" className="font-normal">
            Enable email escalation
          </Label>
        </div>

        {/* Escalation email (conditional) */}
        {escalation.enabled && (
          <div className="grid gap-1">
            <Label htmlFor="escalationEmail">Escalation Email</Label>
            <Input
              id="escalationEmail"
              type="email"
              value={escalation.escalation_email} // ✅ Updated
              onChange={(e) => {
                update({
                  escalation: {
                    ...escalation,
                    escalation_email: e.target.value,
                  }, // ✅ Updated
                });
                validateField("responses", "escalationEmail");
              }}
              placeholder="support@yourcompany.com"
              className={
                stepErr.escalationEmail
                  ? "border-destructive focus-visible:ring-destructive"
                  : ""
              }
            />
            {stepErr.escalationEmail && (
              <p className="text-sm text-destructive">
                {stepErr.escalationEmail}
              </p>
            )}
          </div>
        )}
      </div>

      <StepActions>
        <Button variant="outline" onClick={prev}>
          Back
        </Button>
        <Button onClick={handleNext}>Next</Button>
      </StepActions>
    </>
  );
}
