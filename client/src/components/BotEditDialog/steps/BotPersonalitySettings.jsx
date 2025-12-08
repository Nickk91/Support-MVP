// src/components/BotEditDialog/steps/BotPersonalitySettings.jsx
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { TempSlider } from "@/components/TempSlider";

export default function BotPersonalitySettings({ bot, onChange }) {
  const { templates } = useBotWizardStore();

  const [selectedPersonality, setSelectedPersonality] = useState("friendly");
  const [isEditingSystem, setIsEditingSystem] = useState(false);
  const [isEditingGreeting, setIsEditingGreeting] = useState(false);
  const [hasUnsavedSystemChanges, setHasUnsavedSystemChanges] = useState(false);
  const [hasUnsavedGreetingChanges, setHasUnsavedGreetingChanges] =
    useState(false);
  const initialized = useRef(false);

  // Check if content differs from template
  const checkIfContentCustom = (personalityKey) => {
    if (personalityKey === "custom") return true;

    const template = templates.personality[personalityKey];
    if (!template) return true;

    const templateSystemMessage = template.systemMessage
      .replace(/{botName}/g, bot?.botName || "YourBot")
      .replace(/{companyReference}/g, bot?.companyReference || "our company");

    const templateGreeting = template.greeting
      .replace(/{botName}/g, bot?.botName || "YourBot")
      .replace(/{companyReference}/g, bot?.companyReference || "our company");

    const normalizeMessage = (msg) => (msg || "").trim().replace(/\s+/g, " ");

    const systemCustom =
      bot?.systemMessage &&
      normalizeMessage(bot.systemMessage) !==
        normalizeMessage(templateSystemMessage);

    const greetingCustom =
      bot?.greeting &&
      normalizeMessage(bot.greeting) !== normalizeMessage(templateGreeting);

    return systemCustom || greetingCustom;
  };

  // Simplified initialization - only set defaults for new bots
  useEffect(() => {
    if (!templates.personality || initialized.current) return;

    // Always start with "friendly" as default UI state
    const defaultPersonality = "friendly";

    // Check if this bot has custom content
    const hasCustomContent = checkIfContentCustom(
      bot?.personalityType || defaultPersonality
    );

    // Set appropriate selected state
    if (hasCustomContent) {
      setSelectedPersonality("custom-saved");
    } else {
      setSelectedPersonality(defaultPersonality);
    }

    // Only populate template content for completely new bots (no existing data)
    if (!bot?.id && (!bot?.systemMessage || !bot?.greeting)) {
      const template = templates.personality[defaultPersonality];
      if (template) {
        const updates = {
          personalityType: defaultPersonality,
          systemMessage: template.systemMessage
            .replace(/{botName}/g, bot?.botName || "YourBot")
            .replace(
              /{companyReference}/g,
              bot?.companyReference || "our company"
            ),
          greeting: template.greeting
            .replace(/{botName}/g, bot?.botName || "YourBot")
            .replace(
              /{companyReference}/g,
              bot?.companyReference || "our company"
            ),
        };
        onChange(updates);
      }
    }

    initialized.current = true;
  }, [bot, onChange, templates.personality]);

  const handleChange = (field, value) => {
    onChange({ [field]: value });
  };

  const handleTemperatureChange = (value) => {
    onChange({ temperature: value[0] });
  };

  const handleSystemMessageChange = (value) => {
    setHasUnsavedSystemChanges(true);
    handleChange("systemMessage", value);
  };

  const handleGreetingChange = (value) => {
    setHasUnsavedGreetingChanges(true);
    handleChange("greeting", value);
  };

  const handlePersonalityChange = (personalityKey) => {
    const template = templates.personality[personalityKey];
    if (!template) return;

    // Only update messages if we're switching to a template personality
    // and the current content matches the old template
    const currentTemplate = templates.personality[selectedPersonality];
    const shouldUpdateContent =
      personalityKey !== "custom" &&
      currentTemplate &&
      !checkIfContentCustom(selectedPersonality);

    const updates = {
      personalityType: personalityKey,
    };

    if (shouldUpdateContent) {
      updates.systemMessage = template.systemMessage
        .replace(/{botName}/g, bot?.botName || "YourBot")
        .replace(/{companyReference}/g, bot?.companyReference || "our company");

      updates.greeting = template.greeting
        .replace(/{botName}/g, bot?.botName || "YourBot")
        .replace(/{companyReference}/g, bot?.companyReference || "our company");
    }

    onChange(updates);
    setSelectedPersonality(personalityKey);
    setIsEditingSystem(false);
    setIsEditingGreeting(false);
    setHasUnsavedSystemChanges(false);
    setHasUnsavedGreetingChanges(false);
  };

  const handleSystemEditToggle = () => {
    if (isEditingSystem) {
      setIsEditingSystem(false);
      setHasUnsavedSystemChanges(false);
      onChange({ personalityType: "custom" });
      setSelectedPersonality("custom-saved");
    } else {
      setIsEditingSystem(true);
    }
  };

  const handleGreetingEditToggle = () => {
    if (isEditingGreeting) {
      setIsEditingGreeting(false);
      setHasUnsavedGreetingChanges(false);
      onChange({ personalityType: "custom" });
      setSelectedPersonality("custom-saved");
    } else {
      setIsEditingGreeting(true);
    }
  };

  const currentTemplate =
    templates.personality[selectedPersonality] ||
    templates.personality.friendly;
  const delayDuration = 300;

  const isSystemEditable = isEditingSystem;
  const isGreetingEditable = isEditingGreeting;

  const shouldShowSystemEditSaveButton =
    !isEditingSystem || (isEditingSystem && hasUnsavedSystemChanges);
  const shouldShowGreetingEditSaveButton =
    !isEditingGreeting || (isEditingGreeting && hasUnsavedGreetingChanges);

  const textareaClassName = (isReadOnly) =>
    `font-mono text-sm resize-vertical ${
      isReadOnly
        ? "text-muted-foreground bg-muted/30 border-muted"
        : "text-foreground bg-background border-border"
    }`;

  const personalityEntries = Object.entries(templates.personality);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">Personality Style</CardTitle>
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
            Choose how your assistant behaves and communicates
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Label className="font-medium whitespace-nowrap">
              Personality Template:
            </Label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {personalityEntries.map(([key, template], index) => (
              <Card
                key={key}
                className={`cursor-pointer transition-all hover:border-primary/50 ${
                  selectedPersonality === key ||
                  (selectedPersonality === "custom-saved" && key === "custom")
                    ? "border-primary bg-primary/5"
                    : ""
                } ${
                  index === personalityEntries.length - 1
                    ? "custom-personality-card"
                    : ""
                }`}
                onClick={() => handlePersonalityChange(key)}
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

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label htmlFor="systemMessage">System Message</Label>
                <TooltipProvider>
                  <Tooltip delayDuration={delayDuration}>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                        <HelpCircle className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      <p className="text-sm">
                        This defines the core personality and behavior of your
                        assistant.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {shouldShowSystemEditSaveButton && (
                <Button
                  variant={isEditingSystem ? "default" : "outline"}
                  size="sm"
                  onClick={handleSystemEditToggle}
                  className="flex items-center gap-2"
                >
                  {isEditingSystem ? (
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
              id="systemMessage"
              value={bot?.systemMessage || ""}
              onChange={(e) => handleSystemMessageChange(e.target.value)}
              placeholder="Define your assistant's personality and behavior..."
              rows={8}
              className={textareaClassName(!isSystemEditable)}
              readOnly={!isSystemEditable}
            />
            <p className="text-sm text-muted-foreground">
              This message defines the bot's personality and primary behavior.
              {selectedPersonality === "custom-saved" && (
                <span className="text-amber-600 font-medium">
                  {" "}
                  • Customized
                </span>
              )}
              {hasUnsavedSystemChanges && (
                <span className="text-orange-600 font-medium">
                  {" "}
                  • Unsaved changes
                </span>
              )}
              {!isSystemEditable && (
                <span className="text-blue-600 font-medium">
                  {" "}
                  • Read-only (click Edit to customize)
                </span>
              )}
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label htmlFor="greeting">Greeting Message</Label>
                <TooltipProvider>
                  <Tooltip delayDuration={delayDuration}>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                        <HelpCircle className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      <p className="text-sm">
                        The first message users see when starting a
                        conversation.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {shouldShowGreetingEditSaveButton && (
                <Button
                  variant={isEditingGreeting ? "default" : "outline"}
                  size="sm"
                  onClick={handleGreetingEditToggle}
                  className="flex items-center gap-2"
                >
                  {isEditingGreeting ? (
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
              id="greeting"
              value={bot?.greeting || ""}
              onChange={(e) => handleGreetingChange(e.target.value)}
              placeholder="What your bot says when a user starts a conversation..."
              rows={3}
              className={textareaClassName(!isGreetingEditable)}
              readOnly={!isGreetingEditable}
            />
            <p className="text-sm text-muted-foreground">
              The first message users see when starting a conversation.
              {selectedPersonality === "custom-saved" && (
                <span className="text-amber-600 font-medium">
                  {" "}
                  • Customized
                </span>
              )}
              {hasUnsavedGreetingChanges && (
                <span className="text-orange-600 font-medium">
                  {" "}
                  • Unsaved changes
                </span>
              )}
              {!isGreetingEditable && (
                <span className="text-blue-600 font-medium">
                  {" "}
                  • Read-only (click Edit to customize)
                </span>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">Response Creativity</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <p className="text-sm">
                    Higher values make responses more creative but less
                    predictable. Lower values make responses more focused and
                    consistent.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-sm text-muted-foreground">
            Control how creative or predictable your bot's responses are
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <TempSlider
            value={[bot?.temperature || 0.7]}
            onValueChange={handleTemperatureChange}
            min={0}
            max={1}
            step={0.05}
            showLabels={true}
            showMarks={true}
            showHeatIndicator={true}
            showInfoPanel={true}
          />
        </CardContent>
      </Card>
    </div>
  );
}
