// src/pages/Dashboard/components/DashboardHeader.jsx
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";

export default function DashboardHeader({
  user,
  onRefresh,
  onCreateBot,
  refreshing,
  saveLoading,
}) {
  return (
    <div className="flex justify-between items-center mb-8">
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {user?.firstName}!</h1>
        <p className="text-muted-foreground mt-2">
          Manage your AI assistants and monitor their performance
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={onRefresh}
          disabled={refreshing || saveLoading}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
          />
          {refreshing ? "Refreshing..." : "Refresh"}
        </Button>
        <Button onClick={onCreateBot} disabled={saveLoading}>
          <Plus className="h-4 w-4 mr-2" />
          New Bot
        </Button>
      </div>
    </div>
  );
}
