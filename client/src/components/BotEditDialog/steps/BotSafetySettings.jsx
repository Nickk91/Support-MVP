// src/components/BotEditDialog/steps/BotSafetySettings.jsx
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {} from "@/components/ui/select";
import { useState, useEffect, useRef } from "react";
import { useBotWizardStore } from "@/store/botWizardStore";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

export default function BotSafetySettings({ bot, onChange }) {
  const { templates } = useBotWizardStore();
  const [selectedSafety, setSelectedSafety] = useState("standard");
  const [hasEditedManually, setHasEditedManually] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const initialRender = useRef(true);

  // Set initial safety level and populate template content
  useEffect(() => {
    if (!initialized && templates.safety) {
      const safetyLevel = bot?.safetyLevel || "standard";
      setSelectedSafety(safetyLevel);

      const template = templates.safety[safetyLevel];

      if (template) {
        // For initial render, we assume it's not custom unless we detect otherwise
        const isCustom = initialRender.current
          ? false
          : checkIfCustom(safetyLevel, template.guardrails);
        setHasEditedManually(isCustom);

        // Only update if we're creating a new bot or fields are empty
        // For existing bots, preserve their content
        const updates = {
          safetyLevel,
        };

        const shouldUpdateGuardrails =
          !bot?.guardrails || (initialRender.current && !bot.guardrails);
        const shouldUpdateFallback =
          !bot?.fallback || (initialRender.current && !bot.fallback);

        if (shouldUpdateGuardrails) {
          updates.guardrails = template.guardrails;
        }

        if (shouldUpdateFallback) {
          updates.fallback = template.fallback;
        }

        onChange(updates);

        // After the first render, mark that we're no longer in initial state
        if (initialRender.current) {
          initialRender.current = false;
        }
      }

      setInitialized(true);
    }
  }, [bot, onChange, templates.safety, initialized]);

  // Separate effect to check for custom content after the initial content is set
  useEffect(() => {
    if (initialized && bot?.guardrails) {
      const safetyLevel = bot.safetyLevel || "standard";
      const template = templates.safety[safetyLevel];

      if (template && safetyLevel !== "custom") {
        const isCustom = bot.guardrails.trim() !== template.guardrails.trim();
        setHasEditedManually(isCustom);
      } else {
        setHasEditedManually(true);
      }
    }
  }, [bot?.guardrails, bot?.safetyLevel, initialized, templates.safety]);

  // Check if the current content matches the template
  const checkIfCustom = (safetyKey, expectedGuardrails = null) => {
    if (!bot?.guardrails || safetyKey === "custom") return true;

    const template = templates.safety[safetyKey];
    if (!template) return true;

    const templateGuardrails = expectedGuardrails || template.guardrails;
    return bot.guardrails.trim() !== templateGuardrails.trim();
  };

  const handleChange = (field, value) => {
    onChange({ [field]: value });
  };

  const handleEscalationChange = (updates) => {
    onChange({
      escalation: {
        ...bot?.escalation,
        ...updates,
      },
    });
  };

  const handleGuardrailsChange = (value) => {
    setHasEditedManually(true);
    handleChange("guardrails", value);
  };

  const handleFallbackChange = (value) => {
    setHasEditedManually(true);
    handleChange("fallback", value);
  };

  const handleSafetyChange = (safetyKey) => {
    setSelectedSafety(safetyKey);

    const template = templates.safety[safetyKey];

    if (template && safetyKey !== "custom") {
      onChange({
        guardrails: template.guardrails,
        fallback: template.fallback,
        safetyLevel: safetyKey,
      });
      setHasEditedManually(false);
    } else {
      onChange({ safetyLevel: "custom" });
      setHasEditedManually(true);
    }
  };

  const delayDuration = 300;

  // Get the current template for tooltip content
  const currentTemplate =
    templates.safety[selectedSafety] || templates.safety.standard;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">Safety & Boundaries</CardTitle>
            <TooltipProvider>
              <Tooltip delayDuration={delayDuration}>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <p className="text-sm">{currentTemplate.templateGuide}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Set rules to keep your bot safe and compliant
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Template Selection */}
          <div className="flex items-center gap-4">
            <Label className="font-medium whitespace-nowrap">
              Safety Template:
            </Label>
          </div>

          {/* Template Cards for quick selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(templates.safety).map(([key, template]) => (
              <Card
                key={key}
                className={`cursor-pointer transition-all hover:border-primary/50 ${
                  (hasEditedManually ? "custom" : selectedSafety) === key
                    ? "border-primary bg-primary/5"
                    : ""
                }`}
                onClick={() => handleSafetyChange(key)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{template.icon}</span>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{template.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {template.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Guardrails Editor */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="guardrails">Guardrails & Restrictions</Label>
              <TooltipProvider>
                <Tooltip delayDuration={delayDuration}>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                      <HelpCircle className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    <p className="text-sm">
                      Rules that prevent your bot from providing harmful,
                      inappropriate, or off-topic responses. Essential for
                      safety and compliance.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Textarea
              id="guardrails"
              value={bot?.guardrails || ""}
              onChange={(e) => handleGuardrailsChange(e.target.value)}
              placeholder="Rules and restrictions to keep your bot safe and on-brand..."
              rows={6}
              className="font-mono text-sm resize-vertical"
            />
            <p className="text-sm text-muted-foreground">
              Rules and restrictions to keep your bot safe and on-brand
              {hasEditedManually && (
                <span className="text-amber-600 font-medium">
                  {" "}
                  • Customized (will save as custom template)
                </span>
              )}
            </p>
          </div>

          {/* Fallback Response Editor */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="fallback">Fallback Response</Label>
              <TooltipProvider>
                <Tooltip delayDuration={delayDuration}>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                      <HelpCircle className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    <p className="text-sm">
                      What your bot says when it doesn't know the answer or
                      can't help with a question. Important for managing user
                      expectations.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Textarea
              id="fallback"
              value={bot?.fallback || ""}
              onChange={(e) => handleFallbackChange(e.target.value)}
              placeholder="What to say when the bot doesn't know the answer..."
              rows={3}
              className="font-mono text-sm resize-vertical"
            />
            <p className="text-sm text-muted-foreground">
              Response when the bot cannot answer a question
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Human Escalation */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="escalation" className="text-base font-medium">
                  Human Escalation
                </Label>
                <p className="text-sm text-muted-foreground">
                  Allow users to request human support when needed
                </p>
              </div>
              <Switch
                id="escalation"
                checked={bot?.escalation?.enabled || false}
                onCheckedChange={(enabled) =>
                  handleEscalationChange({ enabled })
                }
              />
            </div>

            {bot?.escalation?.enabled && (
              <div className="space-y-3 pl-4 border-l-2 border-border">
                <div className="space-y-2">
                  <Label
                    htmlFor="escalationEmail"
                    className="text-sm font-medium"
                  >
                    Escalation Email
                  </Label>
                  <Input
                    id="escalationEmail"
                    type="email"
                    value={bot?.escalation?.escalation_email || ""}
                    onChange={(e) =>
                      handleEscalationChange({
                        escalation_email: e.target.value,
                      })
                    }
                    placeholder="support@company.com"
                  />
                  <p className="text-sm text-muted-foreground">
                    Email where escalation requests will be sent
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
