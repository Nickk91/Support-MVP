// src/pages/Dashboard/components/StatsOverview.jsx
import { Card, CardContent } from "@/components/ui/card";
import { Bot, MessageSquare, FileText } from "lucide-react";

export default function StatsOverview({ bots }) {
  const stats = [
    {
      icon: Bot,
      label: "Total Bots",
      value: bots.length,
      color: "text-blue-600",
    },
    {
      icon: MessageSquare,
      label: "Active Conversations",
      value: 0,
      color: "text-green-600",
    },
    {
      icon: FileText,
      label: "Total Documents",
      value: bots.reduce((total, bot) => total + (bot.files?.length || 0), 0),
      color: "text-purple-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="flex items-center">
              <stat.icon className={`h-8 w-8 ${stat.color}`} />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
