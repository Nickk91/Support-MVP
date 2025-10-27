// src/pages/Dashboard/components/BotCard.jsx - UPDATED with buttons below
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

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-2">
          <Bot className="h-5 w-5 text-blue-600" />
          <CardTitle className="text-lg">{bot.botName}</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          {bot.model} •{" "}
          {bot.systemMessage
            ? "Custom system message"
            : "Default system message"}
        </p>

        {/* Action Buttons - MOVED BELOW BOT NAME */}
        <div className="flex space-x-1 pt-2">
          {/* Evaluate Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleEvaluateClick}
            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            title="Test Bot"
          >
            <Play className="h-4 w-4" />
          </Button>

          {/* Inspect Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleInspectClick}
            className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
            title="Inspect Documents"
          >
            <Eye className="h-4 w-4" />
          </Button>

          {/* Edit Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(bot)}
            className="h-8 w-8 p-0"
          >
            <Edit className="h-4 w-4" />
          </Button>

          {/* Delete Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDeleteClick}
            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-1">
              <FileText className="h-4 w-4 text-gray-500" />
              <span>Documents</span>
            </div>
            <span className="font-medium">{bot.files?.length || 0}</span>
          </div>

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

          {bot.escalation?.enabled && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Escalation</span>
              <span className="text-xs text-orange-600">Enabled</span>
            </div>
          )}

          <div className="pt-2 border-t text-xs text-muted-foreground">
            Created {new Date(bot.createdAt).toLocaleDateString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
