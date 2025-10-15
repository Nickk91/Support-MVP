// src/pages/Dashboard/Dashboard.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth"; // Use our new hook
import BotCard from "../../components/BotCard/BotCard";
import BotEditDialog from "../../components/BotEditDialog/BotEditDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, MessageSquare, FileText, Plus } from "lucide-react";

export default function Dashboard() {
  const { user, token, isAuthenticated } = useAuth(); // Use the hook
  const [bots, setBots] = useState([]);
  const [selectedBot, setSelectedBot] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchUserBots();
    }
  }, [isAuthenticated, token]);

  const fetchUserBots = async () => {
    try {
      const response = await fetch("/api/bots", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setBots(data.bots || []);
      }
    } catch (error) {
      console.error("Failed to fetch bots:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBot = () => {
    setSelectedBot(null); // Null means create new
    setEditDialogOpen(true);
  };

  const handleEditBot = (bot) => {
    setSelectedBot(bot);
    setEditDialogOpen(true);
  };

  const handleSaveBot = (savedBot) => {
    if (selectedBot) {
      // Update existing bot
      setBots((prev) => prev.map((b) => (b.id === savedBot.id ? savedBot : b)));
    } else {
      // Add new bot
      setBots((prev) => [...prev, savedBot]);
    }
    setEditDialogOpen(false);
    setSelectedBot(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">
              Welcome back, {user?.firstName}!
            </h1>
            <p className=" mt-2">
              Manage your AI assistants and monitor their performance
            </p>
          </div>
          <Button onClick={handleCreateBot}>
            <Plus className="h-4 w-4 mr-2" />
            New Bot
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Bot className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium">Total Bots</p>
                  <p className="text-2xl font-bold">{bots.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <MessageSquare className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium">Total Messages</p>
                  <p className="text-2xl font-bold">1,247</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium ">Documents</p>
                  <p className="text-2xl font-bold">
                    {bots.reduce(
                      (total, bot) => total + (bot.files?.length || 0),
                      0
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bot Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bots.map((bot) => (
            <BotCard key={bot.id} bot={bot} onEdit={() => handleEditBot(bot)} />
          ))}
        </div>

        {/* Empty State */}
        {bots.length === 0 && (
          <Card className="text-center p-12">
            <CardContent>
              <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold  mb-2">No bots yet</h3>
              <p className=" mb-4">
                Create your first AI assistant to get started
              </p>
              <Button onClick={handleCreateBot}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Bot
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Edit Bot Dialog */}
        <BotEditDialog
          bot={selectedBot}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSave={handleSaveBot}
        />
      </div>
    </div>
  );
}
