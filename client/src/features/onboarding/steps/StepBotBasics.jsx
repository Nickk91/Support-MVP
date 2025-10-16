// src/features/onboarding/steps/StepBotBasics.jsx
import { useWizardStore } from "../../../store/wizardStore";
import { Button } from "@/components/ui/button";
import StepActions from "../../../components/ui/StepActions/StepActions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Bot } from "lucide-react";
import { AI_MODELS } from "@/config/models";

export default function StepBotBasics() {
  const { values, update, next, prev, validateStep, validateField, errors } =
    useWizardStore();

  const stepErr = errors?.basics || {};

  const handleNext = () => {
    if (validateStep("basics")) next();
  };

  return (
    <>
      <h3 className="mb-3 text-lg font-semibold flex items-center gap-2">
        Bot Basics <Bot size={28} className="text-blue-600" />
      </h3>

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

        {/* System Message */}
        <div className="grid gap-1">
          <Label htmlFor="systemMessage">System Message</Label>
          <Textarea
            id="systemMessage"
            value={values.systemMessage || ""}
            onChange={(e) => update({ systemMessage: e.target.value })}
            placeholder='e.g., "You are a nice AI bot that helps users figure out what to eat in one short sentence."'
            rows={4}
          />
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
              {AI_MODELS.map((model) => (
                <SelectItem key={model.value} value={model.value}>
                  {model.label}{" "}
                  <span className="text-muted-foreground">
                    {" "}
                    - {model.description}
                  </span>
                </SelectItem>
              ))}
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
