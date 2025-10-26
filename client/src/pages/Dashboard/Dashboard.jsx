// src/pages/Dashboard/Dashboard.jsx
import { useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useDashboard } from "../../hooks/useDashboard";
import { toast } from "sonner";
import api from "../../lib/api";

// Components
import DashboardHeader from "./components/DashboardHeader";
import StatsOverview from "./components/StatsOverview";
import BotGrid from "./components/BotGrid";
import EmptyState from "./components/EmptyState";
import LoadingState from "./components/LoadingState";
import ErrorState from "./components/ErrorState";
import BotEditDialog from "../../components/BotEditDialog/BotEditDialog";
import DeleteConfirmationDialog from "../../components/DeleteConfirmationDialog/DeleteConfirmationDialog";

export default function Dashboard() {
  const { user, token, isAuthenticated } = useAuth();
  const {
    // State
    bots,
    selectedBot,
    botToDelete,
    editDialogOpen,
    deleteDialogOpen,
    loading,
    error,
    refreshing,
    saveLoading,
    fileUploadLoading,
    deleteLoading,

    // Setters
    setBots,
    setSelectedBot,
    setBotToDelete,
    setEditDialogOpen,
    setDeleteDialogOpen,
    setLoading,
    setError,
    setRefreshing,
    setSaveLoading,
    setFileUploadLoading,
    setDeleteLoading,

    // Actions
    removeBot,
    openEditDialog,
    closeEditDialog,
    openDeleteDialog,
    closeDeleteDialog,
  } = useDashboard();

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

  useEffect(() => {
    console.log("🔍 Bots state updated:", bots);
  }, [bots]);

  const fetchUserBots = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
        toast.loading("Refreshing bots...", { id: "refresh" });
      } else {
        setLoading(true);
      }
      setError(null);

      console.log("🔍 Fetching bots from API...");
      const response = await api.get("/bots");
      console.log("🔍 Full API Response:", response);
      console.log("🔍 API Response data:", response.data);
      console.log("🔍 API Response bots:", response.data.bots);
      console.log("🔍 Is bots array?", Array.isArray(response.data.bots));

      if (response.data.ok) {
        const botsArray = Array.isArray(response.data.bots)
          ? response.data.bots
          : [];
        console.log("🔍 Setting bots array:", botsArray);

        // DEBUG: Check each bot's files
        botsArray.forEach((bot, index) => {
          console.log(`🔍 Bot ${index} (${bot.botName}):`, {
            id: bot._id,
            filesCount: bot.files?.length,
            files: bot.files,
          });
        });

        setBots(botsArray);
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
    openEditDialog();
  };

  const handleEditBot = (bot) => {
    openEditDialog(bot);
  };

  const handleDeleteClick = (bot) => {
    openDeleteDialog(bot);
  };

  const handleConfirmDelete = async (bot) => {
    if (!bot) return;

    setDeleteLoading(true);
    toast.loading(`Deleting "${bot.botName}"...`, { id: "bot-delete" });

    try {
      await api.delete(`/bots/${bot._id || bot.id}`);

      removeBot(bot._id || bot.id);
      toast.success(`"${bot.botName}" deleted successfully`, {
        id: "bot-delete",
      });

      closeDeleteDialog();
    } catch (error) {
      console.error("Delete failed:", error);
      const errorMessage = error.message || "Failed to delete bot";
      toast.error(errorMessage, { id: "bot-delete" });
    } finally {
      setDeleteLoading(false);
    }
  };

  // In Dashboard.jsx - UPDATE the cleanupBotFiles function
  const cleanupBotFiles = async (botId, filesToRemove) => {
    console.log("🧹 Cleaning up old files:", filesToRemove);

    // DEBUG: Log what properties each file has
    filesToRemove.forEach((file, index) => {
      console.log(`📁 File ${index}:`, {
        filename: file.filename,
        storedAs: file.storedAs,
        s3Key: file.s3Key,
        id: file.id,
        _id: file._id,
        allProps: Object.keys(file),
      });
    });

    // FIX: Use the correct identifier - prioritize s3Key, then storedAs, then filename
    const fileIds = filesToRemove
      .map((f) => {
        // Try to get the actual identifier used by the backend
        if (f.s3Key) return f.s3Key;
        if (f.storedAs) return f.storedAs;
        return f.filename;
      })
      .filter(Boolean);

    console.log("🔍 Extracted file IDs for cleanup:", fileIds);

    if (fileIds.length === 0) {
      console.log("❌ No valid file IDs found for cleanup");
      return;
    }

    try {
      const response = await api.delete("/bots/cleanup/uploads", {
        data: {
          botId,
          fileIds,
        },
      });

      console.log("✅ Cleanup completed:", response.data);
      return response;
    } catch (error) {
      console.error("❌ Cleanup failed:", error);
      throw error;
    }
  };

  const uploadBotFiles = async (botId, files) => {
    const filesWithObjects = files.filter(
      (file) => file.fileObject instanceof File
    );

    if (filesWithObjects.length === 0) {
      throw new Error("No files found to upload");
    }

    const formData = new FormData();
    formData.append("botId", botId);

    filesWithObjects.forEach((file) => {
      formData.append("files", file.fileObject);
    });

    return await api.post("/uploads/files", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  };

  const handleSaveBot = async (savedBot) => {
    setSaveLoading(true);

    try {
      const botId = selectedBot ? selectedBot._id || selectedBot.id : null;
      const endpoint = selectedBot ? `/bots/${botId}` : "/bots";
      const method = selectedBot ? "put" : "post";

      console.log("💾 Saving bot to:", endpoint);
      console.log("🔍 DEBUG: Files in savedBot:", savedBot.files);

      toast.loading(selectedBot ? "Updating bot..." : "Creating bot...", {
        id: "bot-save",
      });

      // STEP 1: Prepare files for API (remove temporary properties)
      const filesForApi =
        savedBot.files
          ?.filter((f) => !f.markedForRemoval)
          .map(
            ({ fileObject, isNew, markedForRemoval, ...cleanFile }) => cleanFile
          ) || [];

      console.log("📦 Final files for API:", filesForApi);

      // STEP 2: Create the bot data object
      const botDataForApi = { ...savedBot, files: filesForApi };

      console.log("🔍 DEBUG: Bot data for API:", botDataForApi);

      // STEP 3: Handle file cleanup BEFORE saving bot (CRITICAL FIX)
      if (selectedBot && savedBot.files) {
        const filesMarkedForRemoval = savedBot.files.filter(
          (f) => f.markedForRemoval
        );
        const hasNewFiles = savedBot.files.some((f) => f.isNew);

        // Only cleanup if we're actually replacing files
        if (
          (filesMarkedForRemoval.length > 0 || hasNewFiles) &&
          selectedBot.files?.length > 0
        ) {
          console.log("🔄 File replacement detected, cleaning up old files...");

          // Get files to remove - use the ORIGINAL bot's files that are being replaced
          const filesToRemove = [...selectedBot.files];

          console.log("🗑️ Files to cleanup:", filesToRemove);

          if (filesToRemove.length > 0) {
            try {
              // IMPORTANT: Cleanup BEFORE updating bot
              await cleanupBotFiles(botId, filesToRemove);
              console.log("✅ Old files cleaned up successfully");
            } catch (cleanupError) {
              console.error("⚠️ File cleanup failed:", cleanupError);
              // Continue even if cleanup fails - we still want to save the bot
            }
          }
        }
      }

      // STEP 4: Save bot data AFTER cleanup
      const response = await api[method](endpoint, botDataForApi);
      const createdBot = response.data.bot || response.data;
      const createdBotId = createdBot._id || createdBot.id;

      console.log("🔍 DEBUG: Bot saved with ID:", createdBotId);

      toast.success(
        selectedBot ? "Bot updated successfully!" : "Bot created successfully!",
        { id: "bot-save" }
      );

      // STEP 5: Upload new files if any
      const newFiles =
        savedBot.files?.filter((f) => f.isNew && f.fileObject) || [];
      if (newFiles.length > 0) {
        console.log("📁 Processing new files for bot:", createdBotId);
        setFileUploadLoading(true);

        try {
          toast.loading("Uploading and processing new files...", {
            id: "file-upload",
          });

          const uploadResponse = await uploadBotFiles(createdBotId, newFiles);
          console.log(
            "✅ New files uploaded successfully:",
            uploadResponse.data
          );

          const processedCount = uploadResponse.data.totalProcessed || 0;
          toast.success(
            `Files uploaded successfully! Processed ${processedCount} files.`,
            { id: "file-upload" }
          );
        } catch (uploadError) {
          console.error("❌ File upload failed:", uploadError);
          toast.error("File upload failed", { id: "file-upload" });
          toast.warning("Bot updated but some files failed to upload");
        } finally {
          setFileUploadLoading(false);
        }
      }

      // STEP 6: Refresh the dashboard data (CRITICAL FOR NEW BOTS)
      console.log("🔄 Refreshing dashboard data...");
      await fetchUserBots(); // This will reload all bots from the server

      // STEP 7: Close the dialog
      setEditDialogOpen(false);
      setSelectedBot(null);

      console.log("✅ Bot creation/update completed successfully");
    } catch (error) {
      console.error("Failed to save bot:", error);
      const errorMessage = error.message || "Failed to save bot";
      toast.error(errorMessage, { id: "bot-save" });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleRefresh = () => fetchUserBots(true);
  const handleInspectBot = (bot) => {
    window.open(`/inspect/${bot._id || bot.id}`, "_blank");
  };

  if (loading) return <LoadingState />;
  if (error)
    return (
      <ErrorState
        error={error}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />
    );

  console.log("🔍 Dashboard Debug - Final bots state:", bots);
  console.log("🔍 Dashboard Debug - bots type:", typeof bots);
  console.log("🔍 Dashboard Debug - isArray:", Array.isArray(bots));
  console.log("🔍 Dashboard Debug - bots.length:", bots?.length);
  console.log("🔍 Dashboard Debug - bots > 0 check:", bots?.length > 0);

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <DashboardHeader
          user={user}
          onRefresh={handleRefresh}
          onCreateBot={handleCreateBot}
          refreshing={refreshing}
          saveLoading={saveLoading}
        />

        <StatsOverview bots={Array.isArray(bots) ? bots : []} />

        {Array.isArray(bots) && bots.length > 0 ? (
          <BotGrid
            bots={bots} // Make sure this is being passed
            onEdit={handleEditBot}
            onDelete={handleDeleteClick}
            onInspect={handleInspectBot}
          />
        ) : (
          <EmptyState onCreateBot={handleCreateBot} saveLoading={saveLoading} />
        )}

        <BotEditDialog
          bot={selectedBot}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSave={handleSaveBot}
          saveLoading={saveLoading}
          fileUploadLoading={fileUploadLoading}
        />

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
