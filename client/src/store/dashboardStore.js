// src/store/dashboardStore.js
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
    }),
}));
