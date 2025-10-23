// src/pages/Dashboard/Dashboard.jsx - FIXED RESPONSE HANDLING
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
import api from "../../lib/api";

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

  // NEW LOADING STATES
  const [saveLoading, setSaveLoading] = useState(false);
  const [fileUploadLoading, setFileUploadLoading] = useState(false);

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
        toast.loading("Refreshing bots...", { id: "refresh" });
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
          toast.success("Bots refreshed successfully", { id: "refresh" });
        }
      } else {
        throw new Error(response.data.message || "Failed to fetch bots");
      }
    } catch (error) {
      console.error("Failed to fetch bots:", error);
      const errorMessage = error.message || "Failed to load bots";
      setError(errorMessage);
      toast.error(errorMessage, { id: showRefresh ? "refresh" : undefined });
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

    console.log("🔍 DEBUG: Starting deletion for bot:", bot._id || bot.id);
    setDeleteLoading(true);

    toast.loading(`Deleting "${bot.botName}"...`, { id: "bot-delete" });

    try {
      await api.delete(`/bots/${bot._id || bot.id}`);
      console.log(
        "🔍 DEBUG: Bot deletion API call completed for:",
        bot._id || bot.id
      );

      // Remove from local state
      setBots((prev) => {
        const newBots = prev.filter(
          (b) => (b._id || b.id) !== (bot._id || bot.id)
        );
        console.log(
          "🔍 DEBUG: Local state updated, remaining bots:",
          newBots.length
        );
        return newBots;
      });

      toast.success(`"${bot.botName}" deleted successfully`, {
        id: "bot-delete",
      });

      setDeleteDialogOpen(false);
      setBotToDelete(null);
    } catch (error) {
      console.error(
        "🔍 DEBUG: Delete failed for bot:",
        bot._id || bot.id,
        error
      );
      const errorMessage = error.message || "Failed to delete bot";
      toast.error(errorMessage, { id: "bot-delete" });
    } finally {
      setDeleteLoading(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleSaveBot = async (savedBot) => {
    setSaveLoading(true);

    try {
      console.log("🔍 DEBUG: handleSaveBot called with savedBot:", savedBot);
      console.log("🔍 DEBUG: Files in savedBot:", savedBot.files);

      // ✅ FIXED: Handle both _id and id for bot identification
      const botId = selectedBot ? selectedBot._id || selectedBot.id : null;
      const endpoint = selectedBot ? `/bots/${botId}` : "/bots";
      const method = selectedBot ? "put" : "post";

      console.log("💾 Saving bot to:", endpoint);

      // Show loading for bot creation
      toast.loading(selectedBot ? "Updating bot..." : "Creating bot...", {
        id: "bot-save",
      });

      // First, create/update the bot to get the bot ID
      const response = await api[method](endpoint, savedBot);
      console.log("🔍 DEBUG: Full bot response:", response.data);

      // ✅ FIXED: Handle response structure properly
      const createdBot = response.data.bot || response.data;
      const createdBotId = createdBot._id || createdBot.id;

      console.log("🔍 DEBUG: Bot created with ID:", createdBotId);
      console.log("🔍 DEBUG: Created bot data:", createdBot);

      // Update success message
      toast.success(
        selectedBot ? "Bot updated successfully!" : "Bot created successfully!",
        {
          id: "bot-save",
        }
      );

      // ✅ FIXED: Update local state with proper ID handling
      if (selectedBot) {
        setBots((prev) =>
          prev.map((b) => ((b._id || b.id) === createdBotId ? createdBot : b))
        );
      } else {
        setBots((prev) => {
          // Check if bot already exists to prevent duplicates
          const exists = prev.some(
            (bot) => (bot._id || bot.id) === createdBotId
          );
          if (exists) {
            return prev.map((bot) =>
              (bot._id || bot.id) === createdBotId ? createdBot : bot
            );
          } else {
            return [...prev, createdBot];
          }
        });
      }

      // If there are files to upload, process them
      if (savedBot.files && savedBot.files.length > 0) {
        console.log("📁 Processing files for bot:", createdBotId);
        console.log("🔍 DEBUG: File metadata:", savedBot.files);

        setFileUploadLoading(true);

        try {
          // Show loading for file upload
          toast.loading("Uploading and processing files...", {
            id: "file-upload",
          });

          // Upload files to the server for ingestion
          const uploadResponse = await uploadBotFiles(
            createdBotId,
            savedBot.files
          );
          console.log("✅ Files uploaded successfully:", uploadResponse.data);

          // Success message for file upload
          const processedCount =
            uploadResponse.data.totalProcessed ||
            uploadResponse.data.files?.length ||
            0;
          toast.success(
            `Files uploaded successfully! Processed ${processedCount} files.`,
            {
              id: "file-upload",
            }
          );
        } catch (uploadError) {
          console.error("❌ File upload failed:", uploadError);
          console.error("🔍 DEBUG: Upload error details:", {
            message: uploadError.message,
            response: uploadError.response?.data,
            status: uploadError.response?.status,
          });

          toast.error("File upload failed", { id: "file-upload" });
          toast.warning("Bot created but some files failed to upload");
        } finally {
          setFileUploadLoading(false);
        }
      }

      // Close the dialog immediately after bot creation
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
      toast.error(errorMessage, { id: "bot-save" });
    } finally {
      setSaveLoading(false);
    }
  };

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

      // Fallback: try to find any file inputs
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

  const handleInspectBot = (bot) => {
    // Navigate to the document inspector for this bot
    window.open(`/inspect/${bot._id || bot.id}`, "_blank");
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
              <Button
                onClick={handleRefresh}
                variant="outline"
                disabled={refreshing}
              >
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
              disabled={refreshing || saveLoading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
              />
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>
            <Button onClick={handleCreateBot} disabled={saveLoading}>
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
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Bots
                  </p>
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
                  <p className="text-sm font-medium text-muted-foreground">
                    Active Conversations
                  </p>
                  <p className="text-2xl font-bold">0</p>
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
        {bots.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Your AI Assistants</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bots.map((bot) => (
                <BotCard
                  key={bot._id || bot.id}
                  bot={bot}
                  onEdit={() => handleEditBot(bot)}
                  onDelete={() => handleDeleteClick(bot)}
                  onInspect={handleInspectBot}
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
              <Button onClick={handleCreateBot} disabled={saveLoading}>
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
          saveLoading={saveLoading}
          fileUploadLoading={fileUploadLoading}
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
