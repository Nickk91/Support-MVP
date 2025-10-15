// src/components/BotEditDialog/BotBehaviorSettings.jsx
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export default function BotBehaviorSettings({ bot }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fallback">Fallback Message</Label>
        <Textarea
          id="fallback"
          defaultValue={bot?.fallback || ""}
          placeholder="I'm sorry, I don't have enough information to answer that question. Please contact our support team for assistance."
          rows={3}
        />
        <p className="text-sm text-gray-500">
          Message shown when the bot cannot find relevant information.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="escalation">Human Escalation</Label>
          <p className="text-sm text-gray-500">
            Allow users to escalate to human support
          </p>
        </div>
        <Switch
          id="escalation"
          defaultChecked={bot?.escalation?.enabled || false}
        />
      </div>

      {bot?.escalation?.enabled && (
        <div className="space-y-2">
          <Label htmlFor="escalationEmail">Escalation Email</Label>
          <Input
            id="escalationEmail"
            type="email"
            defaultValue={bot?.escalation?.email || ""}
            placeholder="support@company.com"
          />
        </div>
      )}
    </div>
  );
}
