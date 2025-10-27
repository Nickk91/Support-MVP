import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";

export default function Header({ botId, onBack }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Document Inspector
          </h1>
          <p className="text-muted-foreground">
            Review how your documents are processed and verify content
            extraction
          </p>
        </div>
      </div>
      <Badge variant="outline" className="text-sm">
        Bot ID: {botId}
      </Badge>
    </div>
  );
}
