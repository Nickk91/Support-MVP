// src/pages/Dashboard/Dashboard.jsx - UPDATED WITH DEBUG LOGGING
import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import BotCard from "../../components/BotCard/BotCard";
import BotEditDialog from "../../components/BotEditDialog/BotEditDialog";
import DeleteConfirmationDialog from "../../components/DeleteConfirmationDialog/DeleteConfirmationDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bot,
  MessageSquare,
  FileText,
  Plus,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import api from "../../lib/api"; // Import the existing axios instance

export default function Dashboard() {
  const { user, token, isAuthenticated } = useAuth();
  const [bots, setBots] = useState([]);
  const [selectedBot, setSelectedBot] = useState(null);
  const [botToDelete, setBotToDelete] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    console.log("🔐 Dashboard Auth State:", {
      user,
      token: token ? `Present (${token.length} chars)` : "Missing",
      isAuthenticated,
    });

    if (isAuthenticated && token) {
      fetchUserBots();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, token]);

  const fetchUserBots = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      console.log("📡 Fetching bots from API");
      const response = await api.get("/bots");

      console.log("✅ Bots data:", response.data);

      if (response.data.ok) {
        setBots(response.data.bots || []);
        if (showRefresh) {
          toast.success("Bots refreshed successfully");
        }
      } else {
        throw new Error(response.data.message || "Failed to fetch bots");
      }
    } catch (error) {
      console.error("Failed to fetch bots:", error);
      const errorMessage = error.message || "Failed to load bots";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCreateBot = () => {
    setSelectedBot(null);
    setEditDialogOpen(true);
  };

  const handleEditBot = (bot) => {
    setSelectedBot(bot);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (bot) => {
    setBotToDelete(bot);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async (bot) => {
    if (!bot) return;

    setDeleteLoading(true);
    try {
      await api.delete(`/bots/${bot.id}`);

      setBots((prev) => prev.filter((b) => b.id !== bot.id));
      toast.success(`"${bot.botName}" deleted successfully`);
      setDeleteDialogOpen(false);
      setBotToDelete(null);
    } catch (error) {
      console.error("Failed to delete bot:", error);
      const errorMessage = error.message || "Failed to delete bot";
      toast.error(errorMessage);
    } finally {
      setDeleteLoading(false);
    }
  };

  // UPDATED: Enhanced handleSaveBot with comprehensive debug logging
  const handleSaveBot = async (savedBot) => {
    try {
      console.log("🔍 DEBUG: handleSaveBot called with savedBot:", savedBot);
      console.log("🔍 DEBUG: Files in savedBot:", savedBot.files);

      const endpoint = selectedBot ? `/bots/${selectedBot.id}` : "/bots";
      const method = selectedBot ? "put" : "post";

      console.log("💾 Saving bot to:", endpoint);

      // First, create/update the bot to get the bot ID
      const response = await api[method](endpoint, savedBot);
      const botId = response.data.bot.id;
      console.log("🔍 DEBUG: Bot created with ID:", botId);

      // In handleSaveBot - update the file upload section
      if (savedBot.files && savedBot.files.length > 0) {
        console.log("📁 Processing files for bot:", botId);
        console.log("🔍 DEBUG: File metadata:", savedBot.files);

        // Check if we have actual File objects
        const hasFileObjects = savedBot.files.some(
          (file) => file.fileObject instanceof File
        );
        console.log("🔍 DEBUG: Has File objects:", hasFileObjects);

        try {
          // Upload files to the server for ingestion
          const uploadResponse = await uploadBotFiles(botId, savedBot.files);
          console.log("✅ Files uploaded successfully:", uploadResponse.data);

          // Refresh bot data to include the uploaded files
          await fetchUserBots();
        } catch (uploadError) {
          console.error("❌ File upload failed:", uploadError);
          console.error("🔍 DEBUG: Upload error details:", {
            message: uploadError.message,
            response: uploadError.response?.data,
            status: uploadError.response?.status,
          });

          toast.warning("Bot created but some files failed to upload");
        }
      } else {
        console.log("🔍 DEBUG: No files to upload in savedBot.files");
      }

      if (selectedBot) {
        setBots((prev) =>
          prev.map((b) =>
            b.id === response.data.bot.id ? response.data.bot : b
          )
        );
        toast.success("Bot updated successfully");
      } else {
        setBots((prev) => [...prev, response.data.bot]);
        toast.success("Bot created successfully");
      }

      setEditDialogOpen(false);
      setSelectedBot(null);
    } catch (error) {
      console.error("Failed to save bot:", error);
      console.error("🔍 DEBUG: Save bot error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      const errorMessage = error.message || "Failed to save bot";
      toast.error(errorMessage);
    }
  };

  // UPDATED: Enhanced uploadBotFiles that uses the stored file objects
  const uploadBotFiles = async (botId, files) => {
    console.log(
      "🔍 DEBUG: uploadBotFiles called with botId:",
      botId,
      "files metadata:",
      files
    );

    const formData = new FormData();
    formData.append("botId", botId);

    // Check if we have actual File objects in the files array
    const filesWithObjects = files.filter(
      (file) => file.fileObject instanceof File
    );
    console.log(
      "🔍 DEBUG: Files with actual File objects:",
      filesWithObjects.length
    );

    if (filesWithObjects.length > 0) {
      // Use the stored File objects from the state
      filesWithObjects.forEach((file, index) => {
        console.log(`🔍 DEBUG: Appending file from state ${index}:`, {
          name: file.fileObject.name,
          size: file.fileObject.size,
          type: file.fileObject.type,
        });
        formData.append("files", file.fileObject);
      });

      console.log("🔍 DEBUG: FormData entries (from state):");
      for (let pair of formData.entries()) {
        console.log(pair[0], pair[1]);
      }

      console.log("🔍 DEBUG: Making upload request to /uploads/files");
      const response = await api.post("/uploads/files", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      console.log("🔍 DEBUG: Upload response received:", response.data);
      return response;
    } else {
      console.warn("⚠️ No File objects found in files array");
      console.log("🔍 DEBUG: Files array contents:", files);

      // Fallback: try to find any file inputs (though this likely won't work)
      const fileInput = document.getElementById("file-upload");
      if (fileInput && fileInput.files && fileInput.files.length > 0) {
        console.log("🔍 DEBUG: Found files in file input fallback");
        Array.from(fileInput.files).forEach((file, index) => {
          formData.append("files", file);
        });
        return await api.post("/uploads/files", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
      } else {
        throw new Error(
          "No files found to upload. File objects were not properly stored."
        );
      }
    }
  };

  const handleRefresh = () => {
    fetchUserBots(true);
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

  if (error) {
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
              <Button onClick={handleRefresh} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </CardContent>
          </Card>
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
            <p className="text-muted-foreground mt-2">
              Manage your AI assistants and monitor their performance
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button onClick={handleCreateBot}>
              <Plus className="h-4 w-4 mr-2" />
              New Bot
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Bot className="h-8 w-8 text-blue-600" />
                <div className="ml-10 flex flex-col m">
                  <p className="text-sm font-medium text-muted-foreground text-center">
                    Total Bots
                  </p>
                  <p className="text-2xl font-bold text-center ">
                    {bots.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <MessageSquare className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Active Conversations
                  </p>
                  <p className="text-2xl font-bold text-center">0</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Documents
                  </p>
                  <p className="text-2xl font-bold text-center">
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
        {bots.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Your AI Assistants</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bots.map((bot) => (
                <BotCard
                  key={bot.id}
                  bot={bot}
                  onEdit={() => handleEditBot(bot)}
                  onDelete={() => handleDeleteClick(bot)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {bots.length === 0 && (
          <Card className="text-center p-12">
            <CardContent>
              <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No bots yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first AI assistant to get started with customer
                support automation
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

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          bot={botToDelete}
          onConfirm={handleConfirmDelete}
          loading={deleteLoading}
        />
      </div>
    </div>
  );
}
