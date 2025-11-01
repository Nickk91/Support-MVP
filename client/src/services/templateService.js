// src/services/templateService.js
import api from "../lib/api";

export const templateService = {
  async getAllTemplates() {
    const response = await api.get("/templates");
    return response.data;
  },

  async getPersonalityTemplates() {
    const response = await api.get("/templates/personality");
    return response.data;
  },

  async getSafetyTemplates() {
    const response = await api.get("/templates/safety");
    return response.data;
  },
};
