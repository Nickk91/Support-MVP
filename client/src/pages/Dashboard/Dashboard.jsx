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

  const fetchUserBots = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
        toast.loading("Refreshing bots...", { id: "refresh" });
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await api.get("/bots");

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

  const cleanupBotFiles = async (botId, filesToRemove) => {
    const fileIds = filesToRemove
      .map((f) => f.s3Key || f.storedAs || f.filename)
      .filter(Boolean);

    if (fileIds.length === 0) return;

    try {
      await api.delete("/bots/cleanup/uploads", {
        data: { botId, fileIds },
      });
    } catch (error) {
      console.error("Cleanup failed:", error);
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

      toast.loading(selectedBot ? "Updating bot..." : "Creating bot...", {
        id: "bot-save",
      });

      // Prepare files for API
      const filesForApi =
        savedBot.files
          ?.filter((f) => !f.markedForRemoval)
          .map(
            ({ fileObject, isNew, markedForRemoval, ...cleanFile }) => cleanFile
          ) || [];

      const botDataForApi = { ...savedBot, files: filesForApi };
      const response = await api[method](endpoint, botDataForApi);
      const createdBot = response.data.bot || response.data;
      const createdBotId = createdBot._id || createdBot.id;

      toast.success(
        selectedBot ? "Bot updated successfully!" : "Bot created successfully!",
        { id: "bot-save" }
      );

      // Handle file operations
      if (selectedBot && savedBot.files) {
        const filesMarkedForRemoval = savedBot.files.filter(
          (f) => f.markedForRemoval
        );
        const hasNewFiles = savedBot.files.some((f) => f.isNew);

        if (
          (filesMarkedForRemoval.length > 0 || hasNewFiles) &&
          selectedBot.files?.length > 0
        ) {
          try {
            await cleanupBotFiles(createdBotId, selectedBot.files);
          } catch (cleanupError) {
            console.error("File cleanup failed:", cleanupError);
          }
        }
      }

      // Upload new files
      const newFiles =
        savedBot.files?.filter((f) => f.isNew && f.fileObject) || [];
      if (newFiles.length > 0) {
        setFileUploadLoading(true);
        try {
          toast.loading("Uploading and processing new files...", {
            id: "file-upload",
          });

          const uploadResponse = await uploadBotFiles(createdBotId, newFiles);
          const processedCount = uploadResponse.data.totalProcessed || 0;

          toast.success(
            `Files uploaded successfully! Processed ${processedCount} files.`,
            { id: "file-upload" }
          );

          await fetchUserBots();
        } catch (uploadError) {
          console.error("File upload failed:", uploadError);
          toast.error("File upload failed", { id: "file-upload" });
          toast.warning("Bot updated but some files failed to upload");
        } finally {
          setFileUploadLoading(false);
        }
      }

      // Update local state via store
      if (selectedBot) {
        setBots((prev) =>
          prev.map((b) => ((b._id || b.id) === createdBotId ? createdBot : b))
        );
      } else {
        setBots((prev) => {
          const exists = prev.some(
            (bot) => (bot._id || bot.id) === createdBotId
          );
          return exists
            ? prev.map((bot) =>
                (bot._id || bot.id) === createdBotId ? createdBot : bot
              )
            : [...prev, createdBot];
        });
      }

      closeEditDialog();
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

        <StatsOverview bots={bots} />

        {bots.length > 0 ? (
          <BotGrid
            bots={bots}
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
