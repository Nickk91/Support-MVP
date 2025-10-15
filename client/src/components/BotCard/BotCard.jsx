// client/src/components/BotCard/BotCard.jsx
import { Bot, MessageSquare, FileText, Settings } from "lucide-react";

export default function BotCard({ bot, onEdit }) {
  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-3">
            <Bot className="h-6 w-6 text-blue-600" />
            <CardTitle className="text-lg">{bot.botName}</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-gray-600">{bot.model}</p>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex justify-between text-sm text-gray-600 mb-3">
          <div className="flex items-center">
            <FileText className="h-4 w-4 mr-1" />
            {bot.files?.length || 0} files
          </div>
          <div className="flex items-center">
            <MessageSquare className="h-4 w-4 mr-1" />
            247 messages
          </div>
        </div>

        <div className="text-xs text-gray-500">
          Created {new Date(bot.createdAt).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
}
