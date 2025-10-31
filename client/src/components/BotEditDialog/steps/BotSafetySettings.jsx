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
import { useState } from "react";
import SAFETY_TEMPLATES from "@/constants/safetyTemplates";

export default function BotSafetySettings({ bot, onChange }) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const getCurrentSafety = () => {
    const guardrails = bot?.guardrails || "";
    for (const [key, template] of Object.entries(SAFETY_TEMPLATES)) {
      const templateCore = template.guardrails.split("\n")[0].trim();
      if (guardrails.includes(templateCore)) {
        return key;
      }
    }
    return "custom";
  };

  const [selectedSafety, setSelectedSafety] = useState(getCurrentSafety());

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
    const template = SAFETY_TEMPLATES[safetyKey];

    if (safetyKey !== "custom") {
      handleChange("guardrails", template.guardrails);
      handleChange("fallback", template.fallback);
    }
  };

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
              {Object.entries(SAFETY_TEMPLATES).map(([key, template]) => (
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
                    {Object.entries(SAFETY_TEMPLATES).map(([key, template]) => (
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
