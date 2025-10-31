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

// src/components/BotEditDialog/steps/BotAdvancedSettings.jsx
// This file can be empty or removed, or you can add other advanced settings later
export default function BotAdvancedSettings({ bot, onChange }) {
  return (
    <div className="space-y-4">
      <div className="text-center p-8 border rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Advanced Settings</h3>
        <p className="text-sm text-muted-foreground">
          Additional advanced configuration options will be added here in the
          future.
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Model selection and temperature settings have been moved to Basic and
          Personality steps.
        </p>
      </div>
    </div>
  );
}
