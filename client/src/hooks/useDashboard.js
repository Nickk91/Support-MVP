// src/hooks/useDashboard.js - UPDATED with evaluation state
import { useCallback } from "react";
import { useDashboardStore } from "../store/dashboardStore";

export const useDashboard = () => {
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
    selectedBotForEvaluation,

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
    setEvaluationSession,
    setSelectedBotForEvaluation,

    // Compound actions
    clearSelection,
    startEvaluation: storeStartEvaluation,
    stopEvaluation: storeStopEvaluation,
  } = useDashboardStore();

  // Bot management actions
  const addBot = useCallback(
    (bot) => {
      setBots([...bots, bot]);
    },
    [bots, setBots]
  );

  const updateBot = useCallback(
    (updatedBot) => {
      setBots(
        bots.map((bot) =>
          (bot._id || bot.id) === (updatedBot._id || updatedBot.id)
            ? updatedBot
            : bot
        )
      );
    },
    [bots, setBots]
  );

  const removeBot = useCallback(
    (botId) => {
      setBots(bots.filter((bot) => (bot._id || bot.id) !== botId));
    },
    [bots, setBots]
  );

  // Dialog management
  const openEditDialog = useCallback(
    (bot) => {
      setSelectedBot(bot || null);
      setEditDialogOpen(true);
    },
    [setSelectedBot, setEditDialogOpen]
  );

  const closeEditDialog = useCallback(() => {
    setEditDialogOpen(false);
    setSelectedBot(null);
  }, [setEditDialogOpen, setSelectedBot]);

  const openDeleteDialog = useCallback(
    (bot) => {
      setBotToDelete(bot);
      setDeleteDialogOpen(true);
    },
    [setBotToDelete, setDeleteDialogOpen]
  );

  const closeDeleteDialog = useCallback(() => {
    setDeleteDialogOpen(false);
    setBotToDelete(null);
  }, [setDeleteDialogOpen, setBotToDelete]);

  // Evaluation actions
  const startEvaluation = useCallback(
    (bot) => {
      storeStartEvaluation(bot);
    },
    [storeStartEvaluation]
  );

  const stopEvaluation = useCallback(() => {
    storeStopEvaluation();
  }, [storeStopEvaluation]);

  return {
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
    selectedBotForEvaluation,

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
    setEvaluationSession,
    setSelectedBotForEvaluation,

    // Compound actions
    addBot,
    updateBot,
    removeBot,
    openEditDialog,
    closeEditDialog,
    openDeleteDialog,
    closeDeleteDialog,
    startEvaluation,
    stopEvaluation,
    clearSelection,
  };
};
