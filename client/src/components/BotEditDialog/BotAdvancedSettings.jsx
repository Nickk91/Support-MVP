// src/components/BotEditDialog/BotAdvancedSettings.jsx
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function BotAdvancedSettings({ bot, onChange }) {
  const models = [
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
    { value: "gpt-4", label: "GPT-4" },
    { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
    { value: "claude-3-sonnet", label: "Claude 3 Sonnet" },
    { value: "claude-3-haiku", label: "Claude 3 Haiku" },
  ];

  const handleModelChange = (value) => {
    onChange({ model: value });
  };

  const handleTemperatureChange = (e) => {
    onChange({ temperature: parseFloat(e.target.value) });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="model">AI Model</Label>
        <Select
          value={bot?.model || "gpt-4o-mini"}
          onValueChange={handleModelChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a model" />
          </SelectTrigger>
          <SelectContent>
            {models.map((model) => (
              <SelectItem key={model.value} value={model.value}>
                {model.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          Choose the AI model that powers your bot.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="temperature">
          Temperature: {bot?.temperature || 0.7}
        </Label>
        <input
          type="range"
          id="temperature"
          min="0"
          max="1"
          step="0.1"
          value={bot?.temperature || 0.7}
          onChange={handleTemperatureChange}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>More focused</span>
          <span>Balanced</span>
          <span>More creative</span>
        </div>
      </div>
    </div>
  );
}
