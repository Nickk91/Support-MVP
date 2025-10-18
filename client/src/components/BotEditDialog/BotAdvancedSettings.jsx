// src/components/BotEditDialog/BotAdvancedSettings.jsx
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AI_MODELS } from "@/config/models";

export default function BotAdvancedSettings({ bot, onChange }) {
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
          value={bot?.model || AI_MODELS[0].value}
          onValueChange={handleModelChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a model" />
          </SelectTrigger>
          <SelectContent>
            {AI_MODELS.map((model) => (
              <SelectItem key={model.value} value={model.value}>
                <div className="flex flex-col">
                  <span className="font-medium">{model.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {model.description}
                  </span>
                </div>
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
          Temperature: {bot?.temperature || 0.1}
        </Label>
        <input
          type="range"
          id="temperature"
          min="0"
          max="1"
          step="0.1"
          value={bot?.temperature || 0.1}
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
