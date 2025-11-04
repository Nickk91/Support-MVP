// src/components/BotEditDialog/steps/BotPersonalitySettings.jsx
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
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

export default function BotPersonalitySettings({ bot, onChange }) {
  const { templates } = useBotWizardStore();
  const [selectedPersonality, setSelectedPersonality] = useState("friendly");
  const [hasEditedManually, setHasEditedManually] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [isEditingSystem, setIsEditingSystem] = useState(false);
  const [isEditingGreeting, setIsEditingGreeting] = useState(false);
  const [hasUnsavedSystemChanges, setHasUnsavedSystemChanges] = useState(false);
  const [hasUnsavedGreetingChanges, setHasUnsavedGreetingChanges] =
    useState(false);
  const initialRender = useRef(true);

  // Set initial personality and populate template content
  useEffect(() => {
    if (!initialized && templates.personality) {
      // Check if this is a new bot (no ID) or existing bot
      const isNewBot = !bot?.id;
      const personalityType = isNewBot
        ? "friendly"
        : bot?.personalityType || "friendly";

      setSelectedPersonality(personalityType);

      const template = templates.personality[personalityType];

      if (template) {
        const systemMessage = template.systemMessage
          .replace(/{botName}/g, bot?.botName || "YourBot")
          .replace(
            /{companyReference}/g,
            bot?.companyReference || "our company"
          );

        const greeting = template.greeting
          .replace(/{botName}/g, bot?.botName || "YourBot")
          .replace(
            /{companyReference}/g,
            bot?.companyReference || "our company"
          );

        // For NEW bots, always start as not custom
        // For EXISTING bots, check if content has been customized
        let isCustom = false;
        if (!isNewBot) {
          isCustom = checkIfCustom(personalityType, systemMessage, greeting);
        }
        setHasEditedManually(isCustom);

        // Only update if we're creating a new bot or fields are empty
        const updates = {
          personalityType,
        };

        const shouldUpdateSystemMessage =
          isNewBot ||
          !bot?.systemMessage ||
          (initialRender.current && !bot.systemMessage);
        const shouldUpdateGreeting =
          isNewBot ||
          !bot?.greeting ||
          (initialRender.current && !bot.greeting);

        if (shouldUpdateSystemMessage) {
          updates.systemMessage = systemMessage;
        }

        if (shouldUpdateGreeting) {
          updates.greeting = greeting;
        }

        onChange(updates);

        // After the first render, mark that we're no longer in initial state
        if (initialRender.current) {
          initialRender.current = false;
        }
      }

      setInitialized(true);
    }
  }, [bot, onChange, templates.personality, initialized]);

  // Check if the current content matches the template
  const checkIfCustom = (
    personalityKey,
    expectedSystemMessage = null,
    expectedGreeting = null
  ) => {
    if (personalityKey === "custom") return true;

    const template = templates.personality[personalityKey];
    if (!template) return true;

    const templateSystemMessage =
      expectedSystemMessage ||
      template.systemMessage
        .replace(/{botName}/g, bot?.botName || "YourBot")
        .replace(/{companyReference}/g, bot?.companyReference || "our company");

    const templateGreeting =
      expectedGreeting ||
      template.greeting
        .replace(/{botName}/g, bot?.botName || "YourBot")
        .replace(/{companyReference}/g, bot?.companyReference || "our company");

    // Normalize both messages for comparison (remove extra whitespace)
    const normalizeMessage = (msg) => msg.trim().replace(/\s+/g, " ");

    const systemCustom =
      bot?.systemMessage &&
      normalizeMessage(bot.systemMessage) !==
        normalizeMessage(templateSystemMessage);

    const greetingCustom =
      bot?.greeting &&
      normalizeMessage(bot.greeting) !== normalizeMessage(templateGreeting);

    // Only mark as custom if system message is edited (not just greeting)
    return systemCustom;
  };

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
    setSelectedPersonality(personalityKey);
    setIsEditingSystem(false);
    setIsEditingGreeting(false);
    setHasUnsavedSystemChanges(false);
    setHasUnsavedGreetingChanges(false);

    const template = templates.personality[personalityKey];

    if (template && personalityKey !== "custom") {
      const systemMessage = template.systemMessage
        .replace(/{botName}/g, bot?.botName || "YourBot")
        .replace(/{companyReference}/g, bot?.companyReference || "our company");

      const greeting = template.greeting
        .replace(/{botName}/g, bot?.botName || "YourBot")
        .replace(/{companyReference}/g, bot?.companyReference || "our company");

      onChange({
        systemMessage,
        greeting,
        personalityType: personalityKey,
      });
      setHasEditedManually(false);
    } else {
      // When switching to custom, use the custom template content
      const customTemplate = templates.personality.custom;
      const systemMessage = customTemplate.systemMessage
        .replace(/{botName}/g, bot?.botName || "YourBot")
        .replace(/{companyReference}/g, bot?.companyReference || "our company");

      const greeting = customTemplate.greeting
        .replace(/{botName}/g, bot?.botName || "YourBot")
        .replace(/{companyReference}/g, bot?.companyReference || "our company");

      onChange({
        systemMessage,
        greeting,
        personalityType: "custom",
      });
      setHasEditedManually(true);
      setIsEditingSystem(true);
    }
  };

  const handleSystemEditToggle = () => {
    if (isEditingSystem) {
      // Save action - mark as custom and exit edit mode
      setIsEditingSystem(false);
      setHasEditedManually(true);
      setHasUnsavedSystemChanges(false);
      // Also update personalityType to custom when saving system message edits
      onChange({ personalityType: "custom" });
    } else {
      // Enter edit mode
      setIsEditingSystem(true);
    }
  };

  const handleGreetingEditToggle = () => {
    if (isEditingGreeting) {
      // Save action - just exit edit mode (doesn't mark as custom)
      setIsEditingGreeting(false);
      setHasUnsavedGreetingChanges(false);
    } else {
      // Enter edit mode
      setIsEditingGreeting(true);
    }
  };

  const getTemperatureLabel = (temp) => {
    if (temp <= 0.3) return "More Consistent";
    if (temp <= 0.6) return "Balanced";
    return "More Creative";
  };

  // Get the current template for tooltip content
  const currentTemplate =
    templates.personality[selectedPersonality] ||
    templates.personality.friendly;

  const delayDuration = 300;

  // Determine states for styling and behavior
  const showSystemEditButton =
    !hasEditedManually && selectedPersonality !== "custom";
  const showGreetingEditButton = selectedPersonality !== "custom";
  const isCustomPersonality =
    selectedPersonality === "custom" || hasEditedManually;
  const isSystemReadOnly = !isEditingSystem && !isCustomPersonality;
  const isGreetingReadOnly = !isEditingGreeting && !isCustomPersonality;

  const textareaClassName = (isReadOnly) =>
    `font-mono text-sm resize-vertical ${
      isReadOnly
        ? "text-muted-foreground bg-muted/30 border-muted"
        : "text-foreground bg-background border-border"
    }`;

  // Determine if we should show the edit/save buttons
  const shouldShowSystemEditSaveButton =
    showSystemEditButton || (isEditingSystem && hasUnsavedSystemChanges);
  const shouldShowGreetingEditSaveButton =
    showGreetingEditButton || (isEditingGreeting && hasUnsavedGreetingChanges);

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
          {/* Template Selection */}
          <div className="flex items-center gap-4">
            <Label className="font-medium whitespace-nowrap">
              Personality Template:
            </Label>
          </div>

          {/* Template Cards for quick selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(templates.personality).map(([key, template]) => (
              <Card
                key={key}
                className={`cursor-pointer transition-all hover:border-primary/50 ${
                  (hasEditedManually ? "custom" : selectedPersonality) === key
                    ? "border-primary bg-primary/5"
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

          {/* System Message Editor */}
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
                        assistant. It's the most important setting for shaping
                        how your bot responds to users.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* System Edit/Save Button */}
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
              className={textareaClassName(isSystemReadOnly)}
              readOnly={isSystemReadOnly}
            />
            <p className="text-sm text-muted-foreground">
              This message defines the bot's personality and primary behavior.
              {hasEditedManually && (
                <span className="text-amber-600 font-medium">
                  {" "}
                  • Customized (will save as custom template)
                </span>
              )}
              {hasUnsavedSystemChanges && (
                <span className="text-orange-600 font-medium">
                  {" "}
                  • Unsaved changes
                </span>
              )}
              {isSystemReadOnly && !hasEditedManually && (
                <span className="text-blue-600 font-medium">
                  {" "}
                  • Read-only (click Edit to customize)
                </span>
              )}
            </p>
          </div>

          {/* Greeting Editor */}
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
                        The first message users see when they start a
                        conversation with your bot. Sets the tone for the
                        interaction.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* Greeting Edit/Save Button */}
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
              className={textareaClassName(isGreetingReadOnly)}
              readOnly={isGreetingReadOnly}
            />
            <p className="text-sm text-muted-foreground">
              The first message users see when starting a conversation.
              {hasUnsavedGreetingChanges && (
                <span className="text-orange-600 font-medium">
                  {" "}
                  • Unsaved changes
                </span>
              )}
              {isGreetingReadOnly && !hasEditedManually && (
                <span className="text-blue-600 font-medium">
                  {" "}
                  • Read-only (click Edit to customize)
                </span>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Temperature Setting */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Response Creativity</CardTitle>
          <p className="text-sm text-muted-foreground">
            Control how creative or predictable your bot's responses are
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label htmlFor="temperature-slider">
                Temperature: {bot?.temperature || 0.7}
              </Label>
              <span className="text-sm font-medium text-muted-foreground">
                {getTemperatureLabel(bot?.temperature || 0.7)}
              </span>
            </div>

            <Slider
              id="temperature-slider"
              value={[bot?.temperature || 0.7]}
              onValueChange={handleTemperatureChange}
              min={0}
              max={1}
              step={0.1}
              className="w-full"
            />

            <div className="flex justify-between text-xs text-muted-foreground px-1">
              <span>More Focused</span>
              <span>Balanced</span>
              <span>More Creative</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
