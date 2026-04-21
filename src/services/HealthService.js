// src/services/HealthService.js
import api from "./api"; // ✅ use shared axios instance

// ====================
// ✅ HEALTH SERVICE
// ====================
export const HealthService = {
  // --------------------
  // Fetch records
  // --------------------
  async getHealthRecords() {
    const res = await api.get("/api/v1/records/");
    return res.data;
  },

  // --------------------
  // Create record manually
  // --------------------
  async createHealthRecord(payload) {
    const res = await api.post("/api/v1/records/", payload);
    return res.data;
  },

  // --------------------
  // 🤖 AI TRIAGE (save result)
  // --------------------
  async saveAITriageRecord(symptoms) {
    if (!symptoms) throw new Error("Symptoms missing");

    const res = await api.post("/api/v1/records/ai-triage/", {
      symptoms,
      additional_notes: "",
    });

    return res.data;
  },

  // --------------------
  // 🗑️ DELETE HEALTH RECORD (soft delete)
  // --------------------
  async deleteHealthRecord(recordId) {
    await api.delete(`/api/v1/records/${recordId}/`);
    return true;
  },

  // --------------------
  // ♻️ RESTORE HEALTH RECORD (UNDO)
  // --------------------
  async restoreHealthRecord(recordId) {
    await api.post(`/api/v1/records/${recordId}/restore/`);
    return true;
  },
};
