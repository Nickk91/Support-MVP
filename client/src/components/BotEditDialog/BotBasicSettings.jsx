// src/components/BotEditDialog/BotBasicSettings.jsx
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function BotBasicSettings({ bot, onChange }) {
  const handleChange = (field, value) => {
    onChange({ [field]: value });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="botName">Bot Name</Label>
        <Input
          id="botName"
          defaultValue={bot?.botName || ""}
          onChange={(e) => handleChange("botName", e.target.value)}
          placeholder="My Support Assistant"
        />
        <p className="text-sm text-muted-foreground">
          A friendly name for your AI assistant
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="greeting">Welcome Message</Label>
        <Textarea
          id="greeting"
          defaultValue={bot?.greeting || ""}
          onChange={(e) => handleChange("greeting", e.target.value)}
          placeholder="Hello! I'm your AI assistant. How can I help you today?"
          rows={3}
        />
        <p className="text-sm text-muted-foreground">
          Initial message shown when the chat widget opens
        </p>
      </div>
    </div>
  );
}
