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
  const [hasEditedManually, setHasEditedManually] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [isEditingGuardrails, setIsEditingGuardrails] = useState(false);
  const [isEditingFallback, setIsEditingFallback] = useState(false);
  const [hasUnsavedGuardrailsChanges, setHasUnsavedGuardrailsChanges] =
    useState(false);
  const [hasUnsavedFallbackChanges, setHasUnsavedFallbackChanges] =
    useState(false);
  const initialRender = useRef(true);

  // Set initial safety level and populate template content
  useEffect(() => {
    if (!initialized && templates.safety) {
      // Check if this is a new bot (no ID) or existing bot
      const isNewBot = !bot?.id;
      const safetyLevel = isNewBot ? "lenient" : bot?.safetyLevel || "lenient";

      setSelectedSafety(safetyLevel);

      const template = templates.safety[safetyLevel];

      if (template) {
        // For NEW bots, always start as not custom
        // For EXISTING bots, check if content has been customized
        let isCustom = false;
        if (!isNewBot) {
          isCustom = checkIfCustom(
            safetyLevel,
            template.guardrails,
            template.fallback
          );
        }
        setHasEditedManually(isCustom);

        // Only update if we're creating a new bot or fields are empty
        const updates = {
          safetyLevel,
        };

        const shouldUpdateGuardrails =
          isNewBot ||
          !bot?.guardrails ||
          (initialRender.current && !bot.guardrails);
        const shouldUpdateFallback =
          isNewBot ||
          !bot?.fallback ||
          (initialRender.current && !bot.fallback);

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
      const safetyLevel = bot.safetyLevel || "lenient";
      const template = templates.safety[safetyLevel];

      if (template && safetyLevel !== "custom") {
        const isCustom = checkIfCustom(
          safetyLevel,
          template.guardrails,
          template.fallback
        );
        setHasEditedManually(isCustom);
      } else {
        setHasEditedManually(true);
      }
    }
  }, [
    bot?.guardrails,
    bot?.fallback,
    bot?.safetyLevel,
    initialized,
    templates.safety,
  ]);

  // Check if the current content matches the template
  const checkIfCustom = (
    safetyKey,
    expectedGuardrails = null,
    expectedFallback = null
  ) => {
    if (safetyKey === "custom") return true;

    const template = templates.safety[safetyKey];
    if (!template) return true;

    const templateGuardrails = expectedGuardrails || template.guardrails;
    const templateFallback = expectedFallback || template.fallback;

    // Normalize both messages for comparison (remove extra whitespace)
    const normalizeMessage = (msg) => msg.trim().replace(/\s+/g, " ");

    const guardrailsCustom =
      bot?.guardrails &&
      normalizeMessage(bot.guardrails) !== normalizeMessage(templateGuardrails);

    const fallbackCustom =
      bot?.fallback &&
      normalizeMessage(bot.fallback) !== normalizeMessage(templateFallback);

    // Only mark as custom if guardrails are edited (not just fallback)
    return guardrailsCustom;
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
    setHasUnsavedGuardrailsChanges(true);
    handleChange("guardrails", value);
  };

  const handleFallbackChange = (value) => {
    setHasUnsavedFallbackChanges(true);
    handleChange("fallback", value);
  };

  const handleSafetyChange = (safetyKey) => {
    setSelectedSafety(safetyKey);
    setIsEditingGuardrails(false);
    setIsEditingFallback(false);
    setHasUnsavedGuardrailsChanges(false);
    setHasUnsavedFallbackChanges(false);

    const template = templates.safety[safetyKey];

    if (template && safetyKey !== "custom") {
      onChange({
        guardrails: template.guardrails,
        fallback: template.fallback,
        safetyLevel: safetyKey,
      });
      setHasEditedManually(false);
    } else {
      // When switching to custom, use the custom template content
      const customTemplate = templates.safety.custom;
      onChange({
        guardrails: customTemplate.guardrails,
        fallback: customTemplate.fallback,
        safetyLevel: "custom",
      });
      setHasEditedManually(true);
      setIsEditingGuardrails(true);
    }
  };

  const handleGuardrailsEditToggle = () => {
    if (isEditingGuardrails) {
      // Save action - mark as custom and exit edit mode
      setIsEditingGuardrails(false);
      setHasEditedManually(true);
      setHasUnsavedGuardrailsChanges(false);
      // Also update safetyLevel to custom when saving guardrails edits
      onChange({ safetyLevel: "custom" });
    } else {
      // Enter edit mode
      setIsEditingGuardrails(true);
    }
  };

  const handleFallbackEditToggle = () => {
    if (isEditingFallback) {
      // Save action - just exit edit mode (doesn't mark as custom)
      setIsEditingFallback(false);
      setHasUnsavedFallbackChanges(false);
    } else {
      // Enter edit mode
      setIsEditingFallback(true);
    }
  };

  const delayDuration = 300;

  // Get the current template for tooltip content
  const currentTemplate =
    templates.safety[selectedSafety] || templates.safety.lenient;

  // Determine states for styling and behavior
  const showGuardrailsEditButton =
    !hasEditedManually && selectedSafety !== "custom";
  const showFallbackEditButton = selectedSafety !== "custom";
  const isCustomSafety = selectedSafety === "custom" || hasEditedManually;
  const isGuardrailsReadOnly = !isEditingGuardrails && !isCustomSafety;
  const isFallbackReadOnly = !isEditingFallback && !isCustomSafety;

  const textareaClassName = (isReadOnly) =>
    `font-mono text-sm resize-vertical ${
      isReadOnly
        ? "text-muted-foreground bg-muted/30 border-muted"
        : "text-foreground bg-background border-border"
    }`;

  // Determine if we should show the edit/save buttons
  const shouldShowGuardrailsEditSaveButton =
    showGuardrailsEditButton ||
    (isEditingGuardrails && hasUnsavedGuardrailsChanges);
  const shouldShowFallbackEditSaveButton =
    showFallbackEditButton || (isEditingFallback && hasUnsavedFallbackChanges);

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
              className={textareaClassName(isGuardrailsReadOnly)}
              readOnly={isGuardrailsReadOnly}
            />
            <p className="text-sm text-muted-foreground">
              Rules and restrictions to keep your bot safe and on-brand
              {hasEditedManually && (
                <span className="text-amber-600 font-medium">
                  {" "}
                  • Customized (will save as custom template)
                </span>
              )}
              {hasUnsavedGuardrailsChanges && (
                <span className="text-orange-600 font-medium">
                  {" "}
                  • Unsaved changes
                </span>
              )}
              {isGuardrailsReadOnly && !hasEditedManually && (
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
              className={textareaClassName(isFallbackReadOnly)}
              readOnly={isFallbackReadOnly}
            />
            <p className="text-sm text-muted-foreground">
              Response when the bot cannot answer a question
              {hasUnsavedFallbackChanges && (
                <span className="text-orange-600 font-medium">
                  {" "}
                  • Unsaved changes
                </span>
              )}
              {isFallbackReadOnly && !hasEditedManually && (
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
