// src/pages/Dashboard/Dashboard.jsx - UPDATED with evaluation feature
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
import EvaluationChat from "../../components/EvaluationChat/EvaluationChat"; // ADD THIS IMPORT

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
    evaluationSession,
    selectedBotForEvaluation, // ADD THIS

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
    setEvaluationSession, // ADD THIS

    // Actions
    removeBot,
    openEditDialog,
    closeEditDialog,
    openDeleteDialog,
    closeDeleteDialog,
    startEvaluation, // ADD THIS
    stopEvaluation, // ADD THIS
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

  // ADD EVALUATION FUNCTION

  const handleEvaluateBot = async (bot) => {
    try {
      startEvaluation(bot);
      toast.loading("Starting evaluation session...", {
        id: "evaluation-start",
      });

      const response = await api.post("/evaluate/start", { botId: bot._id });
      setEvaluationSession(response.data);

      toast.success(`Evaluation started for ${bot.botName}`, {
        id: "evaluation-start",
      });
    } catch (error) {
      console.error("Failed to start evaluation:", error);

      // FIX: Show appropriate error message based on error type
      if (error.response?.status === 404) {
        toast.error(
          "Evaluation feature not available yet. Backend endpoint not found.",
          {
            id: "evaluation-start",
          }
        );
      } else {
        toast.error("Failed to start evaluation session", {
          id: "evaluation-start",
        });
      }

      stopEvaluation();
    }
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
    console.log("🧹 CLEANUP DEBUG - Starting file cleanup process");
    console.log("📦 Input parameters:", {
      botId,
      filesToRemoveCount: filesToRemove?.length || 0,
      filesToRemove,
    });

    if (!botId || !filesToRemove || !Array.isArray(filesToRemove)) {
      console.error("❌ Invalid parameters for cleanup:", {
        botId,
        filesToRemove,
      });
      throw new Error("Bot ID and files array are required for cleanup");
    }

    if (filesToRemove.length === 0) {
      console.log("ℹ️ No files to cleanup - skipping");
      return { ok: true, message: "No files to cleanup" };
    }

    // COMPREHENSIVE DEBUG: Log detailed file information
    console.log("🔍 DETAILED FILE ANALYSIS:");
    filesToRemove.forEach((file, index) => {
      console.log(`📁 File ${index + 1}/${filesToRemove.length}:`, {
        filename: file.filename,
        storedAs: file.storedAs,
        s3Key: file.s3Key,
        id: file.id,
        _id: file._id,
        size: file.size,
        mimetype: file.mimetype,
        uploadedBy: file.uploadedBy,
        uploadedAt: file.uploadedAt,
        s3Url: file.s3Url,
        // Log all available properties for debugging
        allProperties: Object.keys(file),
        rawObject: file,
      });
    });

    // ENHANCED IDENTIFIER EXTRACTION: Try multiple strategies
    const fileIdentifiers = {
      s3Keys: [],
      storedAsValues: [],
      filenames: [],
      allIdentifiers: [],
    };

    filesToRemove.forEach((file) => {
      // Strategy 1: Use s3Key (most reliable for backend matching)
      if (file.s3Key && typeof file.s3Key === "string") {
        fileIdentifiers.s3Keys.push(file.s3Key);
        fileIdentifiers.allIdentifiers.push(file.s3Key);
        console.log(`✅ Using s3Key: ${file.s3Key}`);
      }

      // Strategy 2: Use storedAs (backup identifier)
      if (file.storedAs && typeof file.storedAs === "string") {
        fileIdentifiers.storedAsValues.push(file.storedAs);
        fileIdentifiers.allIdentifiers.push(file.storedAs);
        console.log(`✅ Using storedAs: ${file.storedAs}`);
      }

      // Strategy 3: Use filename (least reliable but better than nothing)
      if (file.filename && typeof file.filename === "string") {
        fileIdentifiers.filenames.push(file.filename);
        fileIdentifiers.allIdentifiers.push(file.filename);
        console.log(`✅ Using filename: ${file.filename}`);
      }

      // Strategy 4: If we have MongoDB _id, include it
      if (file._id) {
        const idStr = file._id.toString
          ? file._id.toString()
          : String(file._id);
        fileIdentifiers.allIdentifiers.push(idStr);
        console.log(`✅ Using _id: ${idStr}`);
      }
    });

    // Remove duplicates and filter out empty values
    const uniqueFileIds = [...new Set(fileIdentifiers.allIdentifiers)].filter(
      Boolean
    );

    console.log("🎯 FINAL IDENTIFIER ANALYSIS:", {
      totalFiles: filesToRemove.length,
      s3KeysFound: fileIdentifiers.s3Keys.length,
      storedAsFound: fileIdentifiers.storedAsValues.length,
      filenamesFound: fileIdentifiers.filenames.length,
      uniqueIdentifiers: uniqueFileIds.length,
      allIdentifiers: uniqueFileIds,
    });

    if (uniqueFileIds.length === 0) {
      console.error("❌ CRITICAL: No valid file identifiers found for cleanup");
      console.error("📋 File objects received:", filesToRemove);
      throw new Error(
        "No valid file identifiers could be extracted for cleanup"
      );
    }

    // STRATEGY SELECTION: Prefer s3Keys, fall back to other identifiers
    const primaryIdentifiers =
      fileIdentifiers.s3Keys.length > 0
        ? fileIdentifiers.s3Keys
        : uniqueFileIds;

    console.log(
      "🚀 Using primary identifiers for cleanup:",
      primaryIdentifiers
    );

    try {
      console.log("📡 Sending cleanup request to backend...");

      const response = await api.delete("/bots/cleanup/uploads", {
        data: {
          botId,
          fileIds: primaryIdentifiers,
          // Include additional context for backend debugging
          cleanupContext: {
            timestamp: new Date().toISOString(),
            totalFiles: filesToRemove.length,
            identifierTypes: {
              s3Keys: fileIdentifiers.s3Keys.length,
              storedAs: fileIdentifiers.storedAsValues.length,
              filenames: fileIdentifiers.filenames.length,
            },
          },
        },
        timeout: 30000, // 30 second timeout for cleanup operations
      });

      console.log("✅ BACKEND CLEANUP RESPONSE:", {
        status: response.status,
        data: response.data,
        message: response.data?.message,
        results: response.data?.results,
      });

      // VALIDATE RESPONSE
      if (!response.data?.ok) {
        console.warn("⚠️ Backend reported cleanup issues:", response.data);
      }

      // LOG CLEANUP SUMMARY
      const results = response.data?.results;
      if (results) {
        console.log("📊 CLEANUP SUMMARY:", {
          s3FilesDeleted: results.s3Deletions?.length || 0,
          chunksDeleted: results.chunkDeletions || 0,
          documentsUpdated: results.documentUpdates || 0,
          errors: results.errors?.length || 0,
          totalOperations:
            (results.s3Deletions?.length || 0) +
            (results.chunkDeletions || 0) +
            (results.documentUpdates || 0),
        });

        if (results.errors && results.errors.length > 0) {
          console.warn("🚨 CLEANUP ERRORS:", results.errors);
        }
      }

      return response.data;
    } catch (error) {
      console.error("❌ CLEANUP REQUEST FAILED:", {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
        botId,
        fileIds: primaryIdentifiers,
      });

      // ENHANCED ERROR HANDLING
      const enhancedError = new Error(
        error.response?.data?.error ||
          error.response?.data?.message ||
          `File cleanup failed: ${error.message}`
      );

      enhancedError.details = {
        botId,
        fileIds: primaryIdentifiers,
        backendError: error.response?.data,
        statusCode: error.response?.status,
      };

      throw enhancedError;
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
            bots={bots}
            onEdit={handleEditBot}
            onDelete={handleDeleteClick}
            onInspect={handleInspectBot}
            onEvaluate={handleEvaluateBot} // ADD THIS PROP
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

        {/* ADD Evaluation Chat Dialog */}
        {selectedBotForEvaluation && (
          <EvaluationChat
            bot={selectedBotForEvaluation}
            session={evaluationSession}
            onClose={stopEvaluation}
          />
        )}
      </div>
    </div>
  );
}
