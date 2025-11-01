// src/components/BotEditDialog/steps/BotSafetySettings.jsx
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, ChevronUp, Edit3 } from "lucide-react";
import { useState, useEffect } from "react";
import { templateService } from "@/services/templateService";

export default function BotSafetySettings({ bot, onChange }) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [safetyTemplates, setSafetyTemplates] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedSafety, setSelectedSafety] = useState("standard");

  // Fetch templates on component mount
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        const templates = await templateService.getSafetyTemplates();
        setSafetyTemplates(templates);

        // Determine current safety level after templates are loaded
        const currentSafety = getCurrentSafety(templates);
        setSelectedSafety(currentSafety);
      } catch (error) {
        console.error("Failed to fetch safety templates:", error);
        // Fallback to empty object to prevent crashes
        setSafetyTemplates({});
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  const getCurrentSafety = (templates = safetyTemplates) => {
    if (!bot?.guardrails || Object.keys(templates).length === 0) {
      return "standard";
    }

    const guardrails = bot.guardrails;

    for (const [key, template] of Object.entries(templates)) {
      if (!template.guardrails) continue;

      // Extract the first line of the template for comparison
      const templateCore = template.guardrails.split("\n")[0].trim();

      // Check if the current guardrails contain the template core
      if (guardrails.includes(templateCore)) {
        return key;
      }
    }

    return "custom";
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

  const handleSafetyChange = (safetyKey) => {
    setSelectedSafety(safetyKey);
    const template = safetyTemplates[safetyKey];

    if (template && safetyKey !== "custom") {
      handleChange("guardrails", template.guardrails);
      handleChange("fallback", template.fallback);
    }
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
                  Loading safety templates...
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Safety & Boundaries</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Set rules to keep your bot safe and compliant
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2"
            >
              <Edit3 className="h-4 w-4" />
              {showAdvanced ? "Hide Advanced" : "Advanced"}
              {showAdvanced ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!showAdvanced ? (
            /* Template Selection View */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(safetyTemplates).map(([key, template]) => (
                <Card
                  key={key}
                  className={`cursor-pointer transition-all hover:border-primary/50 ${
                    selectedSafety === key ? "border-primary bg-primary/5" : ""
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
          ) : (
            /* Advanced Editor View */
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Label className="font-medium whitespace-nowrap">
                  Start with template:
                </Label>
                <Select
                  value={selectedSafety}
                  onValueChange={handleSafetyChange}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(safetyTemplates).map(([key, template]) => (
                      <SelectItem key={key} value={key}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label htmlFor="guardrails">Guardrails & Restrictions</Label>
                <Textarea
                  id="guardrails"
                  value={bot?.guardrails || ""}
                  onChange={(e) => handleChange("guardrails", e.target.value)}
                  placeholder="Rules and restrictions to keep your bot safe and on-brand..."
                  rows={6}
                  className="font-mono text-sm resize-vertical"
                />
                <p className="text-sm text-muted-foreground">
                  Rules and restrictions to keep your bot safe and on-brand
                </p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="fallback">Fallback Response</Label>
                <Textarea
                  id="fallback"
                  value={bot?.fallback || ""}
                  onChange={(e) => handleChange("fallback", e.target.value)}
                  placeholder="What to say when the bot doesn't know the answer..."
                  rows={3}
                  className="font-mono text-sm resize-vertical"
                />
                <p className="text-sm text-muted-foreground">
                  Response when the bot cannot answer a question
                </p>
              </div>
            </div>
          )}
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
