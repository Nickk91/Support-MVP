// src/store/dashboardStore.js - UPDATE with evaluation state
import { create } from "zustand";

export const useDashboardStore = create((set) => ({
  // State
  bots: [],
  selectedBot: null,
  botToDelete: null,
  editDialogOpen: false,
  deleteDialogOpen: false,
  loading: true,
  error: null,
  refreshing: false,
  saveLoading: false,
  fileUploadLoading: false,
  deleteLoading: false,

  // ADD evaluation state
  evaluationSession: null,
  selectedBotForEvaluation: null,

  // Actions
  setBots: (bots) => set({ bots }),
  setSelectedBot: (selectedBot) => set({ selectedBot }),
  setBotToDelete: (botToDelete) => set({ botToDelete }),
  setEditDialogOpen: (editDialogOpen) => set({ editDialogOpen }),
  setDeleteDialogOpen: (deleteDialogOpen) => set({ deleteDialogOpen }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setRefreshing: (refreshing) => set({ refreshing }),
  setSaveLoading: (saveLoading) => set({ saveLoading }),
  setFileUploadLoading: (fileUploadLoading) => set({ fileUploadLoading }),
  setDeleteLoading: (deleteLoading) => set({ deleteLoading }),

  // ADD evaluation actions
  setEvaluationSession: (evaluationSession) => set({ evaluationSession }),
  setSelectedBotForEvaluation: (selectedBotForEvaluation) =>
    set({ selectedBotForEvaluation }),

  // Compound actions
  clearSelection: () =>
    set({
      selectedBot: null,
      botToDelete: null,
    }),

  reset: () =>
    set({
      bots: [],
      selectedBot: null,
      botToDelete: null,
      editDialogOpen: false,
      deleteDialogOpen: false,
      loading: true,
      error: null,
      refreshing: false,
      saveLoading: false,
      fileUploadLoading: false,
      deleteLoading: false,
      // ADD evaluation reset
      evaluationSession: null,
      selectedBotForEvaluation: null,
    }),

  // ADD evaluation compound actions
  startEvaluation: (bot) =>
    set({
      selectedBotForEvaluation: bot,
    }),

  stopEvaluation: () =>
    set({
      evaluationSession: null,
      selectedBotForEvaluation: null,
    }),
}));
