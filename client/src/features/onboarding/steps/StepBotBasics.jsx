// src/features/onboarding/steps/StepBotBasics.jsx
import { useWizardStore } from "../../../store/wizardStore";
import { Button } from "@/components/ui/button";
import StepActions from "../../../components/ui/StepActions/StepActions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

export default function StepBotBasics() {
  const { values, update, next, prev, validateStep, validateField, errors } =
    useWizardStore();

  const stepErr = errors?.basics || {};

  const handleNext = () => {
    if (validateStep("basics")) next();
  };

  return (
    <>
      <h3 className="mb-3 text-lg font-semibold">🤖 Bot Basics</h3>

      <div className="grid gap-4">
        {/* Bot name */}
        <div className="grid gap-1">
          <Label htmlFor="botName">Bot Name</Label>
          <Input
            id="botName"
            value={values.botName}
            onChange={(e) => {
              update({ botName: e.target.value });
              validateField("basics", "botName");
            }}
            placeholder="e.g., Ragmate Assistant"
            className={
              stepErr.botName
                ? "border-destructive focus-visible:ring-destructive"
                : ""
            }
          />
          {stepErr.botName && (
            <p className="text-sm text-destructive">{stepErr.botName}</p>
          )}
        </div>

        {/* Personality */}
        <div className="grid gap-1">
          <Label htmlFor="personality">Personality</Label>
          <Select
            value={values.personality}
            onValueChange={(val) => update({ personality: val })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a personality" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Friendly">Friendly</SelectItem>
              <SelectItem value="Professional">Professional</SelectItem>
              <SelectItem value="Technical">Technical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Model */}
        <div className="grid gap-1">
          <Label htmlFor="model">Model</Label>
          <Select
            value={values.model}
            onValueChange={(val) => {
              update({ model: val });
              validateField("basics", "model");
            }}
          >
            <SelectTrigger
              className={
                stepErr.model
                  ? "border-destructive focus-visible:ring-destructive"
                  : ""
              }
            >
              <SelectValue placeholder="Choose a model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gpt-4o-mini">GPT-4o mini</SelectItem>
              <SelectItem value="gpt-4o">GPT-4o</SelectItem>
              <SelectItem value="claude-3-5-sonnet">
                Claude 3.5 Sonnet
              </SelectItem>
              <SelectItem value="llama-3.1-70b">Llama 3.1 70B</SelectItem>
            </SelectContent>
          </Select>
          {stepErr.model && (
            <p className="text-sm text-destructive">{stepErr.model}</p>
          )}
        </div>
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
