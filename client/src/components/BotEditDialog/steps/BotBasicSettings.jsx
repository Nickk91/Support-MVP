// src/components/BotEditDialog/steps/BotBasicSettings.jsx
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AI_MODELS } from "@/config/models";
import { Building } from "lucide-react";

export default function BotBasicSettings({ bot, onChange }) {
  const handleChange = (field, value) => {
    onChange({ [field]: value });
  };

  const handleModelChange = (value) => {
    onChange({ model: value });
  };

  return (
    <div className="space-y-6">
      {/* Company Reference - NEW */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building className="h-5 w-5" />
            Company Identity
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Define what organization this bot represents
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyReference">Company/Brand Name</Label>
            <Input
              id="companyReference"
              value={bot?.companyReference || ""}
              onChange={(e) => handleChange("companyReference", e.target.value)}
              placeholder="Your company or primary brand name"
              required
            />
            <p className="text-sm text-muted-foreground">
              This helps the AI provide more relevant responses.
              <span className="font-medium">
                {" "}
                Only use names you're authorized to represent.
              </span>
            </p>
          </div>

          {/* Future Tier Indicator */}
          <div className="bg-muted/50 rounded-lg p-3 border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Basic Tier</p>
                <p className="text-xs text-muted-foreground">
                  Single company reference
                </p>
              </div>
              <div className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                Current
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Upgrade to Pro for multiple verified brands or Enterprise for
              unlimited custom brands.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Bot Identity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Bot Identity</CardTitle>
          <p className="text-sm text-muted-foreground">
            Basic information about your AI assistant
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="botName">Bot Name</Label>
            <Input
              id="botName"
              value={bot?.botName || ""}
              onChange={(e) => handleChange("botName", e.target.value)}
              placeholder="My Support Assistant"
              maxLength={18}
              required
            />
            <p className="text-sm text-muted-foreground">
              A friendly name for your AI assistant
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">AI Model</Label>
            <Select
              value={bot?.model || AI_MODELS[0].value}
              onValueChange={handleModelChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {AI_MODELS.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label}{" "}
                    <span className="text-muted-foreground">
                      - {model.description}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Choose the AI model that powers your bot.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
