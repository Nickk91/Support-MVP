// src/components/BotEditDialog/steps/BotSafetySettings.jsx
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect, useRef } from "react";
import { useBotWizardStore } from "@/store/botWizardStore";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle, Edit, Save } from "lucide-react";

export default function BotSafetySettings({ bot, onChange }) {
  const { templates } = useBotWizardStore();
  const [selectedSafety, setSelectedSafety] = useState("lenient");
  const [isEditingGuardrails, setIsEditingGuardrails] = useState(false);
  const [isEditingFallback, setIsEditingFallback] = useState(false);
  const [hasUnsavedGuardrailsChanges, setHasUnsavedGuardrailsChanges] =
    useState(false);
  const [hasUnsavedFallbackChanges, setHasUnsavedFallbackChanges] =
    useState(false);
  const initialized = useRef(false);

  // Check if content differs from template
  const checkIfContentCustom = (safetyKey) => {
    if (safetyKey === "custom") return true;

    const template = templates.safety[safetyKey];
    if (!template) return true;

    const normalizeMessage = (msg) => (msg || "").trim().replace(/\s+/g, " ");

    const guardrailsCustom =
      bot?.guardrails &&
      normalizeMessage(bot.guardrails) !==
        normalizeMessage(template.guardrails);

    const fallbackCustom =
      bot?.fallback &&
      normalizeMessage(bot.fallback) !== normalizeMessage(template.fallback);

    // Return true if either guardrails OR fallback has been customized
    return guardrailsCustom || fallbackCustom;
  };

  // Simplified initialization - only set defaults for new bots
  useEffect(() => {
    if (!templates.safety || initialized.current) return;

    // Always start with "lenient" as default UI state
    const defaultSafety = "lenient";

    // Check if this bot has custom content
    const hasCustomContent = checkIfContentCustom(
      bot?.safetyLevel || defaultSafety
    );

    // Set appropriate selected state
    if (hasCustomContent) {
      setSelectedSafety("custom-saved");
    } else {
      setSelectedSafety(defaultSafety);
    }

    // Only populate template content for completely new bots (no existing data)
    if (!bot?.id && (!bot?.guardrails || !bot?.fallback)) {
      const template = templates.safety[defaultSafety];
      if (template) {
        const updates = {
          safetyLevel: defaultSafety,
          guardrails: template.guardrails,
          fallback: template.fallback,
        };
        onChange(updates);
      }
    }

    initialized.current = true;
  }, [bot, onChange, templates.safety]);

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
    setHasUnsavedGuardrailsChanges(true);
    handleChange("guardrails", value);
  };

  const handleFallbackChange = (value) => {
    setHasUnsavedFallbackChanges(true);
    handleChange("fallback", value);
  };

  const handleSafetyChange = (safetyKey) => {
    const template = templates.safety[safetyKey];
    if (!template) return;

    // Only update messages if we're switching to a template safety level
    // and the current content matches the old template
    const currentTemplate = templates.safety[selectedSafety];
    const shouldUpdateContent =
      safetyKey !== "custom" &&
      currentTemplate &&
      !checkIfContentCustom(selectedSafety);

    const updates = {
      safetyLevel: safetyKey,
    };

    if (shouldUpdateContent) {
      updates.guardrails = template.guardrails;
      updates.fallback = template.fallback;
    }

    onChange(updates);
    setSelectedSafety(safetyKey);
    setIsEditingGuardrails(false);
    setIsEditingFallback(false);
    setHasUnsavedGuardrailsChanges(false);
    setHasUnsavedFallbackChanges(false);
  };

  const handleGuardrailsEditToggle = () => {
    if (isEditingGuardrails) {
      setIsEditingGuardrails(false);
      setHasUnsavedGuardrailsChanges(false);
      onChange({ safetyLevel: "custom" });
      setSelectedSafety("custom-saved");
    } else {
      setIsEditingGuardrails(true);
    }
  };

  const handleFallbackEditToggle = () => {
    if (isEditingFallback) {
      setIsEditingFallback(false);
      setHasUnsavedFallbackChanges(false);
      onChange({ safetyLevel: "custom" });
      setSelectedSafety("custom-saved");
    } else {
      setIsEditingFallback(true);
    }
  };

  const delayDuration = 300;

  // Get the current template for tooltip content
  const currentTemplate =
    templates.safety[selectedSafety] || templates.safety.lenient;

  // Simplified logic - consistent with personality settings
  const isGuardrailsEditable = isEditingGuardrails;
  const isFallbackEditable = isEditingFallback;

  const shouldShowGuardrailsEditSaveButton =
    !isEditingGuardrails ||
    (isEditingGuardrails && hasUnsavedGuardrailsChanges);
  const shouldShowFallbackEditSaveButton =
    !isEditingFallback || (isEditingFallback && hasUnsavedFallbackChanges);

  const textareaClassName = (isReadOnly) =>
    `font-mono text-sm resize-vertical ${
      isReadOnly
        ? "text-muted-foreground bg-muted/30 border-muted"
        : "text-foreground bg-background border-border"
    }`;

  const safetyEntries = Object.entries(templates.safety);

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
            {safetyEntries.map(([key, template], index) => (
              <Card
                key={key}
                className={`cursor-pointer transition-all hover:border-primary/50 ${
                  selectedSafety === key ||
                  (selectedSafety === "custom-saved" && key === "custom")
                    ? "border-primary bg-primary/5"
                    : ""
                } ${
                  index === safetyEntries.length - 1 ? "custom-safety-card" : ""
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
            <div className="flex items-center justify-between">
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

              {/* Guardrails Edit/Save Button */}
              {shouldShowGuardrailsEditSaveButton && (
                <Button
                  variant={isEditingGuardrails ? "default" : "outline"}
                  size="sm"
                  onClick={handleGuardrailsEditToggle}
                  className="flex items-center gap-2"
                >
                  {isEditingGuardrails ? (
                    <>
                      <Save className="h-4 w-4" />
                      Save as Custom
                    </>
                  ) : (
                    <>
                      <Edit className="h-4 w-4" />
                      Edit
                    </>
                  )}
                </Button>
              )}
            </div>
            <Textarea
              id="guardrails"
              value={bot?.guardrails || ""}
              onChange={(e) => handleGuardrailsChange(e.target.value)}
              placeholder="Rules and restrictions to keep your bot safe and on-brand..."
              rows={6}
              className={textareaClassName(!isGuardrailsEditable)}
              readOnly={!isGuardrailsEditable}
            />
            <p className="text-sm text-muted-foreground">
              Rules and restrictions to keep your bot safe and on-brand
              {selectedSafety === "custom-saved" && (
                <span className="text-amber-600 font-medium">
                  {" "}
                  • Customized
                </span>
              )}
              {hasUnsavedGuardrailsChanges && (
                <span className="text-orange-600 font-medium">
                  {" "}
                  • Unsaved changes
                </span>
              )}
              {!isGuardrailsEditable && (
                <span className="text-blue-600 font-medium">
                  {" "}
                  • Read-only (click Edit to customize)
                </span>
              )}
            </p>
          </div>

          {/* Fallback Response Editor */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
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

              {/* Fallback Edit/Save Button */}
              {shouldShowFallbackEditSaveButton && (
                <Button
                  variant={isEditingFallback ? "default" : "outline"}
                  size="sm"
                  onClick={handleFallbackEditToggle}
                  className="flex items-center gap-2"
                >
                  {isEditingFallback ? (
                    <>
                      <Save className="h-4 w-4" />
                      Save
                    </>
                  ) : (
                    <>
                      <Edit className="h-4 w-4" />
                      Edit
                    </>
                  )}
                </Button>
              )}
            </div>
            <Textarea
              id="fallback"
              value={bot?.fallback || ""}
              onChange={(e) => handleFallbackChange(e.target.value)}
              placeholder="What to say when the bot doesn't know the answer..."
              rows={3}
              className={textareaClassName(!isFallbackEditable)}
              readOnly={!isFallbackEditable}
            />
            <p className="text-sm text-muted-foreground">
              Response when the bot cannot answer a question
              {selectedSafety === "custom-saved" && (
                <span className="text-amber-600 font-medium">
                  {" "}
                  • Customized
                </span>
              )}
              {hasUnsavedFallbackChanges && (
                <span className="text-orange-600 font-medium">
                  {" "}
                  • Unsaved changes
                </span>
              )}
              {!isFallbackEditable && (
                <span className="text-blue-600 font-medium">
                  {" "}
                  • Read-only (click Edit to customize)
                </span>
              )}
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
