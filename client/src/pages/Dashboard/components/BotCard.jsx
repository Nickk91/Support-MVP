// src/pages/Dashboard/components/BotCard.jsx - UPDATED with color coding
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Bot,
  Edit,
  Trash2,
  FileText,
  MessageSquare,
  Eye,
  Play,
  Building,
  User,
  Shield,
} from "lucide-react";

export default function BotCard({
  bot,
  onEdit,
  onDelete,
  onInspect,
  onEvaluate,
}) {
  const botId = bot._id || bot.id;

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    onDelete(bot);
  };

  const handleInspectClick = (e) => {
    e.stopPropagation();
    onInspect(bot);
  };

  const handleEvaluateClick = (e) => {
    e.stopPropagation();
    onEvaluate(bot);
  };

  // 🎯 Color coding for personality types
  const getPersonalityColor = (type) => {
    switch (type) {
      case "friendly":
        return "text-green-600";
      case "professional":
        return "text-blue-600";
      case "technical":
        return "text-purple-600";
      case "custom":
        return "text-gray-600";
      default:
        return "text-blue-600";
    }
  };

  // 🎯 Color coding for safety levels
  const getSafetyColor = (level) => {
    switch (level) {
      case "lenient":
        return "text-green-600";
      case "standard":
        return "text-yellow-600";
      case "strict":
        return "text-red-600";
      case "custom":
        return "text-gray-600";
      default:
        return "text-yellow-600";
    }
  };

  const personalityLabels = {
    friendly: "Friendly",
    professional: "Professional",
    technical: "Technical",
    custom: "Custom",
  };

  const safetyLabels = {
    lenient: "Flexible",
    standard: "Standard",
    strict: "Strict",
    custom: "Custom",
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-col">
          <div className="flex items-center space-x-2">
            <Bot className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">{bot.botName}</CardTitle>
          </div>

          {/* Action Buttons - MOVED TO TOP RIGHT */}
          <div className="flex w-full justify-between space-x-1">
            {/* Evaluate Button */}
            <Button
              variant="ghost"
              onClick={handleEvaluateClick}
              className="flex-1 h-16 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              title="Test Bot"
              style={{ fontSize: "1.5rem" }}
            >
              <Play style={{ width: "1.5rem", height: "1.5rem" }} />
            </Button>

            {/* Inspect Button */}
            <Button
              variant="ghost"
              onClick={handleInspectClick}
              className="flex-1 h-16 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
              title="Inspect Documents"
              style={{ fontSize: "1.5rem" }}
            >
              <Eye style={{ width: "1.5rem", height: "1.5rem" }} />
            </Button>

            {/* Edit Button */}
            <Button
              variant="ghost"
              onClick={() => onEdit(bot)}
              className="flex-1 h-16 p-0"
              title="Edit Bot"
              style={{ fontSize: "1.5rem" }}
            >
              <Edit style={{ width: "1.5rem", height: "1.5rem" }} />
            </Button>

            {/* Delete Button */}
            <Button
              variant="ghost"
              onClick={handleDeleteClick}
              className="flex-1 h-16 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
              title="Delete Bot"
              style={{ fontSize: "1.5rem" }}
            >
              <Trash2 style={{ width: "1.5rem", height: "1.5rem" }} />
            </Button>
          </div>
        </div>

        {/* 🎯 NEW: Template System Information */}
        <div className="space-y-2 pt-2">
          {/* Company Reference */}
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Building className="h-4 w-4" />
            <span>Represents: {bot.companyReference || bot.botName}</span>
          </div>

          {/* Personality & Safety Templates */}
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-1">
              <User className="h-4 w-4 text-purple-600" />
              <span
                className={`font-medium ${getPersonalityColor(
                  bot.personalityType
                )}`}
              >
                {personalityLabels[bot.personalityType] || "Professional"}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <Shield className="h-4 w-4 text-orange-600" />
              <span
                className={`font-medium ${getSafetyColor(bot.safetyLevel)}`}
              >
                {safetyLabels[bot.safetyLevel] || "Standard"}
              </span>
            </div>
          </div>

          {/* Model Info */}
          <p className="text-sm text-muted-foreground">
            {bot.model} •{" "}
            {bot.temperature ? `Temp: ${bot.temperature}` : "Default temp"}
          </p>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Files Count */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-1">
              <FileText className="h-4 w-4 text-gray-500" />
              <span>Documents</span>
            </div>
            <span className="font-medium">{bot.files?.length || 0}</span>
          </div>

          {/* Fallback Status */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-1">
              <MessageSquare className="h-4 w-4 text-gray-500" />
              <span>Fallback</span>
            </div>
            <span
              className={`text-xs ${
                bot.fallback ? "text-green-600" : "text-gray-500"
              }`}
            >
              {bot.fallback ? "Configured" : "Not set"}
            </span>
          </div>

          {/* Escalation Status */}
          {bot.escalation?.enabled && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Escalation</span>
              <span className="text-xs text-orange-600">Enabled</span>
            </div>
          )}

          {/* 🎯 NEW: Customization Indicators */}
          {/* {(bot.personalityType === "custom" ||
            bot.safetyLevel === "custom") && (
            <div className="pt-2 border-t">
              <div className="flex items-center space-x-2 text-xs text-amber-600">
                <span>⚙️ Customized</span>
                {bot.personalityType === "custom" && <span>Personality</span>}
                {bot.safetyLevel === "custom" && <span>Safety Rules</span>}
              </div>
            </div>
          )} */}

          {/* Creation Date */}
          <div className="pt-2 border-t text-xs text-muted-foreground">
            Created {new Date(bot.createdAt).toLocaleDateString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
