// src/pages/Dashboard/components/ErrorState.jsx
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function ErrorState({ error, onRefresh, refreshing }) {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <Card className="border-red-200">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-800 mb-2">
              Failed to load bots
            </h3>
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={onRefresh} variant="outline" disabled={refreshing}>
              <RefreshCw
                className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
              />
              {refreshing ? "Refreshing..." : "Try Again"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
