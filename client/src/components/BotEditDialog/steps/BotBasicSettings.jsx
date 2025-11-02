// src/components/BotEditDialog/steps/BotBasicSettings.jsx
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";
import { useUserStore } from "@/store/useUserStore";

const MODELS = [
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
];

export default function BotBasicSettings({ bot, onChange }) {
  const { user } = useUserStore();
  const [availableBrands, setAvailableBrands] = useState([]);

  // 🎯 NEW: Get available brands from user profile
  useEffect(() => {
    if (user) {
      const brands = [];

      // Primary company
      if (user.companyName) {
        brands.push({
          value: user.companyName,
          label: user.companyName,
          type: "primary",
        });
      }

      // TODO: Add verified brands from user.brandSettings when available
      // TODO: Add custom brands from user.brandSettings when available

      setAvailableBrands(brands);
    }
  }, [user]);

  const handleChange = (field, value) => {
    onChange({ [field]: value });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Basic Information</CardTitle>
          <p className="text-sm text-muted-foreground">
            Set up the basic identity and capabilities of your bot
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Bot Name */}
          <div className="space-y-2">
            <Label htmlFor="botName">Bot Name</Label>
            <Input
              id="botName"
              value={bot?.botName || ""}
              onChange={(e) => handleChange("botName", e.target.value)}
              placeholder="Enter a name for your assistant..."
            />
            <p className="text-sm text-muted-foreground">
              This name will be shown to users when they interact with your bot
            </p>
          </div>

          {/* 🎯 UPDATED: Company/Brand Selection */}
          <div className="space-y-2">
            <Label htmlFor="companyReference">Representing Company</Label>
            <Select
              value={bot?.companyReference || ""}
              onValueChange={(value) => handleChange("companyReference", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a company..." />
              </SelectTrigger>
              <SelectContent>
                {availableBrands.map((brand) => (
                  <SelectItem key={brand.value} value={brand.value}>
                    <div className="flex items-center gap-2">
                      <span>{brand.label}</span>
                      {brand.type === "primary" && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Primary
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              The company or brand this bot will represent
              {availableBrands.length === 1 && (
                <span className="text-amber-600">
                  {" "}
                  • Using your primary company
                </span>
              )}
            </p>
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <Label htmlFor="model">AI Model</Label>
            <Select
              value={bot?.model || "gpt-4o-mini"}
              onValueChange={(value) => handleChange("model", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODELS.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              The AI model that will power your bot's responses
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
