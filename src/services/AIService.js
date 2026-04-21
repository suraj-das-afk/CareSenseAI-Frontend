// src/services/AIService.js
import api from "./api"; // ✅ use your fixed axios instance
import { auth } from "../../firebaseConfig";

/**
 * Normalize symptom severity → backend triage hint
 */
const severityToText = (severity) => {
  switch (severity) {
    case "severe":
      return "critical";
    case "moderate":
      return "moderate";
    case "mild":
    default:
      return "mild";
  }
};

export const AIService = {
  /**
   * 🤖 Run AI triage (REAL backend)
   */
  async analyzeSymptoms(symptoms) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");

      // Build readable symptom text for AI
      const symptomText = symptoms
        .map(
          (s) =>
            `${s.name} (${severityToText(s.severity)})`
        )
        .join(", ");

      console.log("🤖 Sending symptoms:", symptomText);

      const response = await api.post(
        "/api/v1/records/ai-triage/",
        {
          symptoms: symptomText,
        }
      );

      /**
       * Backend returns:
       * {
       *  record_id,
       *  triage_level,
       *  advice,
       *  common_causes
       * }
       */

      return {
        success: true,
        recordId: response.data.record_id,
        triageLevel: response.data.triage_level,
        advice: response.data.advice,
        commonCauses: response.data.common_causes || [],
        quotaExceeded: response.data.quota_exceeded || false,
      };
    } catch (error) {
      console.error("❌ AI analyzeSymptoms failed:", error?.response?.data || error.message);

      // QUOTA SAFE FALLBACK (matches backend logic)
      if (error?.response?.status === 429) {
        return {
          success: false,
          quotaExceeded: true,
          triageLevel: "Pending Review",
          advice: "AI is temporarily unavailable. Please try again later.",
          commonCauses: [],
        };
      }

      throw error;
    }
  },

  /**
   * 🧠 Generate AI insights (read-only)
   */
  async generateInsights(record) {
    try {
      const response = await api.post(
        "/api/v1/ai/triage-insight/",
        {
          symptoms: record.symptoms || "",
          triage_level: record.triage_level || "",
          recommended_advice: record.recommended_advice || "",
        }
      );

      return {
        success: true,
        summary: response.data.summary,
        riskLevel: response.data.risk_level,
        recommendation: response.data.recommendation,
      };
    } catch (error) {
      console.error("❌ generateInsights failed:", error?.response?.data || error.message);

      if (error?.response?.status === 429) {
        return {
          success: false,
          quotaExceeded: true,
        };
      }

      throw error;
    }
  },
};

export default AIService;
