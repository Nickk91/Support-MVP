// src/components/BotEditDialog/BotBehaviorSettings.jsx
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export default function BotBehaviorSettings({ bot, onChange }) {
  const handleChange = (field, value) => {
    onChange({ [field]: value });
  };

  const handleEscalationToggle = (enabled) => {
    onChange({
      escalation: {
        ...bot?.escalation,
        enabled,
      },
    });
  };

  const handleEscalationEmail = (email) => {
    onChange({
      escalation: {
        ...bot?.escalation,
        email,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="systemMessage">System Message</Label>
        <Textarea
          id="systemMessage"
          defaultValue={bot?.systemMessage || ""}
          onChange={(e) => handleChange("systemMessage", e.target.value)}
          placeholder="You are a helpful customer support assistant. Answer questions based on the provided documentation."
          rows={4}
        />
        <p className="text-sm text-muted-foreground">
          This message defines the bot's personality and primary behavior.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="guardrails">Guardrails & Restrictions</Label>
        <Textarea
          id="guardrails"
          defaultValue={bot?.guardrails || ""}
          onChange={(e) => handleChange("guardrails", e.target.value)}
          placeholder="Don't mention competitors. Don't discuss pricing. Always be polite and professional."
          rows={3}
        />
        <p className="text-sm text-muted-foreground">
          Rules and restrictions to keep your bot safe and on-brand
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="fallback">Fallback Message</Label>
        <Textarea
          id="fallback"
          defaultValue={bot?.fallback || ""}
          onChange={(e) => handleChange("fallback", e.target.value)}
          placeholder="I'm sorry, I don't have enough information to answer that question. Please contact our support team for assistance."
          rows={3}
        />
        <p className="text-sm text-muted-foreground">
          Message shown when the bot cannot find relevant information in your
          documents.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="escalation">Human Escalation</Label>
            <p className="text-sm text-muted-foreground">
              Allow users to request human support when needed
            </p>
          </div>
          <Switch
            id="escalation"
            defaultChecked={bot?.escalation?.enabled || false}
            onCheckedChange={handleEscalationToggle}
          />
        </div>

        {bot?.escalation?.enabled && (
          <div className="space-y-2 pl-4 border-l-2">
            <Label htmlFor="escalationEmail">Escalation Email</Label>
            <Input
              id="escalationEmail"
              type="email"
              defaultValue={bot?.escalation?.email || ""}
              onChange={(e) => handleEscalationEmail(e.target.value)}
              placeholder="support@company.com"
            />
            <p className="text-sm text-muted-foreground">
              Email where escalation requests will be sent
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
