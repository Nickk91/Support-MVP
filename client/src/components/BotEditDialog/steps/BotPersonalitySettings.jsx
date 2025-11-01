// src/components/BotEditDialog/steps/BotPersonalitySettings.jsx
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ChevronDown, ChevronUp, Edit3 } from "lucide-react";
import { useState, useEffect } from "react";
import { templateService } from "@/services/templateService";

export default function BotPersonalitySettings({ bot, onChange }) {
  const [personalityTemplates, setPersonalityTemplates] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedPersonality, setSelectedPersonality] = useState("friendly");

  // Fetch templates only once on component mount
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        const templates = await templateService.getPersonalityTemplates();
        setPersonalityTemplates(templates);

        // Set initial personality type from bot data, default to friendly
        setSelectedPersonality(bot?.personalityType || "friendly");
      } catch (error) {
        console.error("Failed to fetch personality templates:", error);
        setPersonalityTemplates({});
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  const handleChange = (field, value) => {
    onChange({ [field]: value });
  };

  const handleTemperatureChange = (value) => {
    onChange({ temperature: value[0] });
  };

  const handleSystemMessageChange = (value) => {
    handleChange("systemMessage", value);
  };

  const handlePersonalityChange = (personalityKey) => {
    setSelectedPersonality(personalityKey);

    const template = personalityTemplates[personalityKey];

    if (template) {
      const systemMessage = template.systemMessage
        .replace(/{botName}/g, bot?.botName || "YourBot")
        .replace(/{companyReference}/g, bot?.companyReference || "our company");

      const greeting = template.greeting
        .replace(/{botName}/g, bot?.botName || "YourBot")
        .replace(/{companyReference}/g, bot?.companyReference || "our company");

      handleChange("systemMessage", systemMessage);
      handleChange("greeting", greeting);
    }

    // Always set the personalityType to the selected key
    handleChange("personalityType", personalityKey);
  };

  const getTemperatureLabel = (temp) => {
    if (temp <= 0.3) return "More Consistent";
    if (temp <= 0.6) return "Balanced";
    return "More Creative";
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">
                  Loading personality templates...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Personality Style</CardTitle>
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
            <Select
              value={selectedPersonality}
              onValueChange={handlePersonalityChange}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(personalityTemplates).map(([key, template]) => (
                  <SelectItem key={key} value={key}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Template Cards for quick selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(personalityTemplates).map(([key, template]) => (
              <Card
                key={key}
                className={`cursor-pointer transition-all hover:border-primary/50 ${
                  selectedPersonality === key
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

          {/* System Message Editor (always visible) */}
          <div className="space-y-3">
            <Label htmlFor="systemMessage">System Message</Label>
            <Textarea
              id="systemMessage"
              value={bot?.systemMessage || ""}
              onChange={(e) => handleSystemMessageChange(e.target.value)}
              placeholder="Define your assistant's personality and behavior..."
              rows={8}
              className="font-mono text-sm resize-vertical"
            />
            <p className="text-sm text-muted-foreground">
              This message defines the bot's personality and primary behavior.
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
