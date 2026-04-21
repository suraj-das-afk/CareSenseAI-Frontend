import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import api from "../services/api";
import { usePopup } from "../contexts/PopupContext";

const { width } = Dimensions.get("window");

/* ---------------- TRIAGE CONFIG ---------------- */

const getTriageConfig = (level) => {
  const l = (level || "").toLowerCase();

  if (!l || l.includes("pending") || l.includes("processing")) {
    return {
      colors: ["#94A3B8", "#64748B"],
      icon: "clock",
      label: "Processing",
      bgColor: "#F1F5F9",
      textColor: "#475569",
      iconColor: "#64748B",
    };
  }

  if (l.includes("emergency")) {
    return {
      colors: ["#EF4444", "#DC2626"],
      icon: "exclamation-circle",
      label: "Emergency",
      bgColor: "#FEE2E2",
      textColor: "#991B1B",
      iconColor: "#DC2626",
    };
  }

  if (l.includes("urgent") || l.includes("primary")) {
    return {
      colors: ["#F59E0B", "#D97706"],
      icon: "exclamation-triangle",
      label: "Urgent",
      bgColor: "#FEF3C7",
      textColor: "#92400E",
      iconColor: "#D97706",
    };
  }

  return {
    colors: ["#3B82F6", "#2563EB"],
    icon: "file-medical-alt",
    label: "Routine",
    bgColor: "#DBEAFE",
    textColor: "#1E40AF",
    iconColor: "#2563EB",
  };
};

/* ---------------- HELPER: Generate Report Title ---------------- */
const generateReportTitle = (record) => {
  // Try to extract key symptoms from ai_summary or symptoms_summary
  const summary = (record.ai_summary || record.symptoms_summary || "").toLowerCase();
  
  // Common symptom patterns
  if (summary.includes("fever") && summary.includes("cough")) {
    return "Fever & Respiratory Symptoms";
  }
  if (summary.includes("fever") && summary.includes("headache")) {
    return "Fever & Headache Assessment";
  }
  if (summary.includes("fever")) {
    return "Fever Assessment";
  }
  if (summary.includes("headache") && summary.includes("migraine")) {
    return "Migraine & Headache Evaluation";
  }
  if (summary.includes("headache")) {
    return "Headache Evaluation";
  }
  if (summary.includes("cough") || summary.includes("respiratory")) {
    return "Respiratory Symptoms Assessment";
  }
  if (summary.includes("pain") && summary.includes("abdominal")) {
    return "Abdominal Pain Evaluation";
  }
  if (summary.includes("pain") && summary.includes("chest")) {
    return "Chest Pain Assessment";
  }
  if (summary.includes("allerg")) {
    return "Allergic Reaction Assessment";
  }
  if (summary.includes("nausea") || summary.includes("vomit")) {
    return "Gastrointestinal Symptoms";
  }
  if (summary.includes("fatigue") || summary.includes("tired")) {
    return "Fatigue & Weakness Evaluation";
  }
  if (summary.includes("dizz")) {
    return "Dizziness Assessment";
  }
  if (summary.includes("injury") || summary.includes("trauma")) {
    return "Injury Assessment";
  }
  
  // Fallback to triage level
  const triageLevel = (record.triage_level || "").toLowerCase();
  if (triageLevel.includes("emergency")) {
    return "Emergency Medical Assessment";
  }
  if (triageLevel.includes("urgent")) {
    return "Urgent Care Assessment";
  }
  
  // Default
  return "General Health Assessment";
};

/* ---------------- SCREEN ---------------- */

export default function HealthRecordDetail({ route, navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const [record, setRecord] = useState(route?.params?.record || null);
  const [insightsOpen, setInsightsOpen] = useState(true);
  const [medicationsOpen, setMedicationsOpen] = useState(true);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [aiBlocked, setAiBlocked] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [sharingReport, setSharingReport] = useState(false);
  const { showPopup } = usePopup();

  const isMounted = useRef(true);

  /* ---------- lifecycle safety ---------- */

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  /* ---------- sync params ---------- */

  useEffect(() => {
    if (route?.params?.record) {
      setRecord(route.params.record);
    }
  }, [route?.params?.record]);

  /* ---------- animations ---------- */

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 7,
        tension: 20,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  /* ---------- guard ---------- */

  if (!record) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.errorText}>No record data available.</Text>
      </SafeAreaView>
    );
  }

  /* ---------- TRIAGE ---------- */

  const triageLevel = record.triage_level || "Pending";
  const triageConfig = getTriageConfig(triageLevel);
  const reportTitle = generateReportTitle(record);

  /* ---------- COPY ---------- */

  const copyFullReport = async () => {
    const medications = record.suggested_medications || [];
    const medText = medications.length > 0 
      ? medications.map((med, idx) => 
          `${idx + 1}. ${med.name} - ${med.dosage}\n   ${med.frequency} | ${med.duration}\n   ${med.instructions || ''}`
        ).join('\n\n')
      : "No medications suggested";

    const text = `
${reportTitle.toUpperCase()}
${'='.repeat(50)}

Date: ${new Date(record.created_at).toLocaleString()}
Triage Level: ${triageLevel}

AI HEALTH SUMMARY
${record.ai_summary || "N/A"}

RISK ASSESSMENT
${record.ai_risk_level || "N/A"}

MEDICAL RECOMMENDATION
${record.ai_recommendation || record.recommended_advice || "N/A"}

SUGGESTED MEDICATIONS
${medText}

${'='.repeat(50)}
⚠️ This is AI-generated information for reference only.
Always consult healthcare professionals for medical advice.
`;

    await Clipboard.setStringAsync(text.trim());

    showPopup("success", {
      title: "Report Copied",
      message: "Complete health record copied to clipboard.",
    });
  };

 /* ---------- AI GENERATION ---------- */

  const generateAIInsight = async () => {
    if (loadingInsight || aiBlocked) return;

    try {
      setLoadingInsight(true);

      const response = await api.post(
        "/api/v1/ai/triage-insight/",
        { record_id: record.id }
      );

      if (response.data?.quota_exceeded) {
        setAiBlocked(true);

        showPopup("warning", {
          title: "Daily AI Limit Reached",
          message: "AI insights are temporarily unavailable. Please try again tomorrow.",
        });

        return;
      }

      if (!isMounted.current) return;

      setRecord((prev) => ({
        ...prev,
        ai_summary: response.data.summary,
        ai_risk_level: response.data.risk_level,
        ai_recommendation: response.data.recommendation,
        recommended_advice: response.data.recommendation,
        suggested_medications: response.data.medications || prev.suggested_medications,
      }));

      setInsightsOpen(true);
      setMedicationsOpen(true);
    } catch {
      showPopup("error", {
        title: "AI Unavailable",
        message: "Unable to generate AI insights at the moment.",
      });
    } finally {
      if (isMounted.current) {
        setLoadingInsight(false);
      }
    }
  };

  /* ---------- DOWNLOAD REPORT ---------- */

  const downloadReport = async () => {
    if (downloadingReport) return;

    try {
      setDownloadingReport(true);

      const medications = record.suggested_medications || [];
      const medHtml = medications.length > 0
        ? medications.map((med, idx) => `
            <div style="margin: 15px 0; padding: 12px; background: #f8f9fa; border-radius: 8px;">
              <h4 style="margin: 0 0 8px 0; color: #10B981;">${idx + 1}. ${med.name} - ${med.dosage}</h4>
              <p style="margin: 4px 0; color: #666;"><strong>Frequency:</strong> ${med.frequency}</p>
              <p style="margin: 4px 0; color: #666;"><strong>Duration:</strong> ${med.duration}</p>
              ${med.instructions ? `<p style="margin: 4px 0; color: #666;"><strong>Instructions:</strong> ${med.instructions}</p>` : ''}
            </div>
          `).join('')
        : '<p>No medications suggested</p>';

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>${reportTitle}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
              h1 { color: #3B82F6; border-bottom: 3px solid #3B82F6; padding-bottom: 10px; }
              h2 { color: #0F172A; margin-top: 30px; }
              .header { text-align: center; margin-bottom: 30px; }
              .section { margin: 20px 0; }
              .info { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px 0; }
              .disclaimer { background: #FEF3C7; padding: 15px; border-left: 4px solid #F59E0B; margin-top: 30px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>${reportTitle}</h1>
              <p><strong>Date:</strong> ${new Date(record.created_at).toLocaleString()}</p>
              <p><strong>Triage Level:</strong> ${triageLevel}</p>
            </div>

            <div class="section">
              <h2>Assessment Summary</h2>
              <div class="info">
                ${record.ai_summary || record.symptoms_summary || reportTitle}
              </div>
            </div>

            ${record.ai_risk_level ? `
              <div class="section">
                <h2>Risk Assessment</h2>
                <div class="info">${record.ai_risk_level}</div>
              </div>
            ` : ''}

            ${record.ai_recommendation || record.recommended_advice ? `
              <div class="section">
                <h2>Medical Recommendation</h2>
                <div class="info">${record.ai_recommendation || record.recommended_advice}</div>
              </div>
            ` : ''}

            <div class="section">
              <h2>Suggested Medications</h2>
              ${medHtml}
            </div>

            <div class="disclaimer">
              <strong>⚠️ Medical Disclaimer:</strong> This AI-generated assessment is for informational purposes only and does not replace professional medical advice, diagnosis, or treatment. Always consult qualified healthcare professionals for medical concerns.
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: reportTitle,
        UTI: 'com.adobe.pdf'
      });

      showPopup("success", {
        title: "Report Generated",
        message: "Your health record has been saved and shared.",
      });
    } catch (error) {
      showPopup("error", {
        title: "Export Failed",
        message: "Unable to generate PDF report. Please try again.",
      });
    } finally {
      if (isMounted.current) {
        setDownloadingReport(false);
      }
    }
  };

  /* ---------- SHARE WITH DOCTOR ---------- */

  const shareWithDoctor = async () => {
    if (sharingReport) return;

    try {
      setSharingReport(true);

      const medications = record.suggested_medications || [];
      const medText = medications.length > 0 
        ? medications.map((med, idx) => 
            `${idx + 1}. ${med.name} - ${med.dosage}\n   ${med.frequency} | ${med.duration}\n   ${med.instructions || ''}`
          ).join('\n\n')
        : "No medications suggested";

      const shareText = `
${reportTitle.toUpperCase()}
${'='.repeat(50)}

Date: ${new Date(record.created_at).toLocaleString()}
Triage Level: ${triageLevel}

AI HEALTH SUMMARY
${record.ai_summary || "N/A"}

RISK ASSESSMENT
${record.ai_risk_level || "N/A"}

MEDICAL RECOMMENDATION
${record.ai_recommendation || record.recommended_advice || "N/A"}

SUGGESTED MEDICATIONS
${medText}

${'='.repeat(50)}
⚠️ This is AI-generated information for reference only.
Always consult healthcare professionals for medical advice.
      `.trim();

      await Sharing.shareAsync('', {
        message: shareText,
      });

      showPopup("success", {
        title: "Report Shared",
        message: "Health record ready to share with your doctor.",
      });
    } catch (error) {
      showPopup("error", {
        title: "Share Failed",
        message: "Unable to share report. Please try again.",
      });
    } finally {
      if (isMounted.current) {
        setSharingReport(false);
      }
    }
  };

  /* ---------- DATE ---------- */

  const dateObj = new Date(record.created_at);
  const date = dateObj.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const time = dateObj.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  /* ---------- MOCK DATA (if not present) ---------- */
  const medications = record.suggested_medications || [
    {
      name: "Paracetamol",
      dosage: "500mg",
      frequency: "Every 6 hours",
      duration: "3-5 days",
      instructions: "Take with food to avoid stomach upset",
      type: "Pain Relief"
    },
    {
      name: "Cetirizine",
      dosage: "10mg",
      frequency: "Once daily",
      duration: "7 days",
      instructions: "Take before bedtime",
      type: "Antihistamine"
    }
  ];

  /* ---------------- UI ---------------- */

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <FontAwesome5 name="arrow-left" size={18} color="#475569" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Health Record</Text>
          <TouchableOpacity 
            style={styles.moreButton}
            onPress={copyFullReport}
          >
            <FontAwesome5 name="copy" size={16} color="#475569" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView 
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          {/* Hero Card */}
          <LinearGradient
            colors={triageConfig.colors}
            style={styles.heroCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.heroContent}>
              <View style={styles.heroIcon}>
                <FontAwesome5 
                  name={triageConfig.icon} 
                  size={32} 
                  color="#FFFFFF" 
                />
              </View>
              
              <View style={styles.heroText}>
                <Text style={styles.heroLabel}>Medical Assessment</Text>
                <Text style={styles.heroTitle}>
                  {reportTitle}
                </Text>
              </View>
            </View>

            <View style={styles.heroFooter}>
              <View style={styles.heroItem}>
                <FontAwesome5 name="calendar" size={13} color="rgba(255,255,255,0.9)" />
                <Text style={styles.heroItemText}>{date}</Text>
              </View>
              <View style={styles.heroItem}>
                <FontAwesome5 name="clock" size={13} color="rgba(255,255,255,0.9)" />
                <Text style={styles.heroItemText}>{time}</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Triage Status Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Priority Status</Text>
            
            <View style={[styles.triageCard, { backgroundColor: triageConfig.bgColor }]}>
              <View style={styles.triageLeft}>
                <View style={[styles.triageIconContainer, { backgroundColor: triageConfig.colors[0] }]}>
                  <FontAwesome5 
                    name={triageConfig.icon} 
                    size={20} 
                    color="#FFFFFF" 
                  />
                </View>
                <View>
                  <Text style={styles.triageLabel}>Triage Level</Text>
                  <Text style={[styles.triageValue, { color: triageConfig.textColor }]}>
                    {triageConfig.label}
                  </Text>
                </View>
              </View>
              
              <View style={[styles.triageBadge, { backgroundColor: triageConfig.colors[0] }]}>
                <Text style={styles.triageBadgeText}>{triageLevel.toUpperCase()}</Text>
              </View>
            </View>
          </View>

          {/* AI Insights Card */}
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.cardHeader}
              onPress={() => setInsightsOpen(!insightsOpen)}
              activeOpacity={0.7}
            >
              <View style={styles.cardTitleContainer}>
                <View style={[styles.iconContainer, { backgroundColor: '#DBEAFE' }]}>
                  <FontAwesome5 name="brain" size={16} color="#3B82F6" />
                </View>
                <Text style={styles.cardTitle}>AI Health Insights</Text>
              </View>
              <FontAwesome5
                name={insightsOpen ? "chevron-up" : "chevron-down"}
                size={16}
                color="#94A3B8"
              />
            </TouchableOpacity>

            {!record.ai_summary && !loadingInsight && (
              <TouchableOpacity 
                style={styles.generateButton}
                onPress={generateAIInsight}
                activeOpacity={0.8}
                disabled={loadingInsight || aiBlocked}
              >
                <LinearGradient
                  colors={["#3B82F6", "#2563EB"]}
                  style={styles.generateGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <FontAwesome5 name="magic" size={14} color="#FFFFFF" />
                  <Text style={styles.generateBtnText}>Generate AI Analysis</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {insightsOpen && (
              <View style={styles.insightsContainer}>
                {loadingInsight ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                    <Text style={styles.loadingText}>Analyzing health data...</Text>
                  </View>
                ) : record.ai_summary ? (
                  <>
                    {/* Summary */}
                    <View style={styles.insightSection}>
                      <View style={styles.insightHeader}>
                        <FontAwesome5 name="file-medical" size={14} color="#3B82F6" />
                        <Text style={styles.insightTitle}>Clinical Summary</Text>
                      </View>
                      <Text style={styles.insightText}>{record.ai_summary}</Text>
                    </View>

                    {/* Risk Level */}
                    {record.ai_risk_level && (
                      <View style={styles.insightSection}>
                        <View style={styles.insightHeader}>
                          <FontAwesome5 name="shield-alt" size={14} color="#F59E0B" />
                          <Text style={styles.insightTitle}>Risk Assessment</Text>
                        </View>
                        <Text style={styles.insightText}>{record.ai_risk_level}</Text>
                      </View>
                    )}

                    {/* Recommendation */}
                    {(record.ai_recommendation || record.recommended_advice) && (
                      <View style={styles.insightSection}>
                        <View style={styles.insightHeader}>
                          <FontAwesome5 name="user-md" size={14} color="#10B981" />
                          <Text style={styles.insightTitle}>Medical Recommendation</Text>
                        </View>
                        <Text style={styles.insightText}>
                          {record.ai_recommendation || record.recommended_advice}
                        </Text>
                      </View>
                    )}
                  </>
                ) : (
                  <View style={styles.emptyInsights}>
                    <FontAwesome5 name="robot" size={32} color="#CBD5E1" />
                    <Text style={styles.emptyText}>No AI insights available</Text>
                    <Text style={styles.emptySubtext}>Generate analysis for detailed health insights</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Medications Card */}
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.cardHeader}
              onPress={() => setMedicationsOpen(!medicationsOpen)}
              activeOpacity={0.7}
            >
              <View style={styles.cardTitleContainer}>
                <View style={[styles.iconContainer, { backgroundColor: '#D1FAE5' }]}>
                  <FontAwesome5 name="pills" size={16} color="#10B981" />
                </View>
                <Text style={styles.cardTitle}>Suggested Medications</Text>
              </View>
              <FontAwesome5
                name={medicationsOpen ? "chevron-up" : "chevron-down"}
                size={16}
                color="#94A3B8"
              />
            </TouchableOpacity>

            {medicationsOpen && (
              <View style={styles.medicationsContainer}>
                {medications.length > 0 ? (
                  medications.map((med, index) => (
                    <View key={index} style={styles.medicationCard}>
                      <View style={styles.medHeader}>
                        <View style={styles.medHeaderLeft}>
                          <View style={styles.medIcon}>
                            <FontAwesome5 name="capsules" size={16} color="#10B981" />
                          </View>
                          <View style={styles.medInfo}>
                            <Text style={styles.medName}>{med.name}</Text>
                            <Text style={styles.medType}>{med.type || "Prescription"}</Text>
                          </View>
                        </View>
                        <View style={styles.medDosageBadge}>
                          <Text style={styles.medDosageText}>{med.dosage}</Text>
                        </View>
                      </View>

                      <View style={styles.medDetails}>
                        <View style={styles.medDetailRow}>
                          <FontAwesome5 name="clock" size={12} color="#64748B" />
                          <Text style={styles.medDetailLabel}>Frequency:</Text>
                          <Text style={styles.medDetailValue}>{med.frequency}</Text>
                        </View>

                        <View style={styles.medDetailRow}>
                          <FontAwesome5 name="calendar-alt" size={12} color="#64748B" />
                          <Text style={styles.medDetailLabel}>Duration:</Text>
                          <Text style={styles.medDetailValue}>{med.duration}</Text>
                        </View>

                        {med.instructions && (
                          <View style={styles.medInstructions}>
                            <FontAwesome5 name="info-circle" size={12} color="#3B82F6" />
                            <Text style={styles.medInstructionsText}>{med.instructions}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyMedications}>
                    <FontAwesome5 name="prescription-bottle" size={32} color="#CBD5E1" />
                    <Text style={styles.emptyText}>No medications suggested</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={styles.primaryActionButton}
              onPress={downloadReport}
              activeOpacity={0.8}
              disabled={downloadingReport}
            >
              <LinearGradient
                colors={downloadingReport ? ["#94A3B8", "#64748B"] : ["#3B82F6", "#2563EB"]}
                style={styles.actionGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {downloadingReport ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.primaryActionText}>Generating PDF...</Text>
                  </>
                ) : (
                  <>
                    <FontAwesome5 name="file-download" size={16} color="#FFFFFF" />
                    <Text style={styles.primaryActionText}>Download Report</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryActionButton}
              onPress={shareWithDoctor}
              activeOpacity={0.8}
              disabled={sharingReport}
            >
              {sharingReport ? (
                <>
                  <ActivityIndicator size="small" color="#3B82F6" />
                  <Text style={styles.secondaryActionText}>Preparing...</Text>
                </>
              ) : (
                <>
                  <FontAwesome5 name="share-alt" size={14} color="#3B82F6" />
                  <Text style={styles.secondaryActionText}>Share with Doctor</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Disclaimer */}
          <View style={styles.disclaimer}>
            <FontAwesome5 name="exclamation-triangle" size={14} color="#92400E" />
            <Text style={styles.disclaimerText}>
              Medical Disclaimer: This AI-generated assessment is for informational purposes only and does not replace professional medical advice, diagnosis, or treatment. Always consult qualified healthcare professionals for medical concerns.
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#F8FAFC" 
  },
  safeArea: {
    backgroundColor: "#FFFFFF",
  },
  center: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center",
    backgroundColor: "#F8FAFC" 
  },
  errorText: {
    fontSize: 16,
    color: "#64748B",
    fontWeight: "500",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  moreButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },

  scroll: {
    padding: 20,
    paddingBottom: 40,
  },

  /* --- Hero Card --- */
  heroCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  heroContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  heroText: {
    flex: 1,
  },
  heroLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "600",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: 28,
  },
  heroFooter: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.2)",
    paddingTop: 16,
  },
  heroItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 24,
  },
  heroItemText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 8,
  },

  /* --- General Card --- */
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },

  /* --- Triage Specific --- */
  triageCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    marginTop: 16,
  },
  triageLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  triageIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  triageLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  triageValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  triageBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  triageBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  /* --- AI Insights --- */
  generateButton: {
    marginTop: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  generateGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  generateBtnText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 8,
  },
  insightsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  loadingContainer: {
    padding: 20,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#64748B",
    fontSize: 14,
  },
  insightSection: {
    marginBottom: 16,
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 12,
  },
  insightHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  insightTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginLeft: 8,
  },
  insightText: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 22,
  },
  emptyInsights: {
    alignItems: "center",
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 4,
    textAlign: "center",
  },

  /* --- Medications --- */
  medicationsContainer: {
    marginTop: 16,
  },
  medicationCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  medHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  medHeaderLeft: {
    flexDirection: "row",
    flex: 1,
  },
  medIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#D1FAE5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  medInfo: {
    flex: 1,
  },
  medName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  medType: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  medDosageBadge: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  medDosageText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#10B981",
  },
  medDetails: {
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 12,
  },
  medDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  medDetailLabel: {
    fontSize: 12,
    color: "#64748B",
    marginLeft: 8,
    marginRight: 4,
  },
  medDetailValue: {
    fontSize: 12,
    color: "#334155",
    fontWeight: "600",
  },
  medInstructions: {
    flexDirection: "row",
    backgroundColor: "#EFF6FF",
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  medInstructionsText: {
    flex: 1,
    fontSize: 12,
    color: "#1E40AF",
    marginLeft: 8,
    lineHeight: 18,
  },
  emptyMedications: {
    alignItems: "center",
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },

  /* --- Actions --- */
  actionButtonsContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  primaryActionButton: {
    flex: 2,
    height: 50,
    borderRadius: 25,
    overflow: "hidden",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  actionGradient: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  primaryActionText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    marginLeft: 8,
  },
  secondaryActionButton: {
    flex: 1.5,
    height: 50,
    borderRadius: 25,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  secondaryActionText: {
    color: "#2563EB",
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 8,
  },

  /* --- Disclaimer --- */
  disclaimer: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#FEF3C7",
    borderRadius: 12,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: "#FCD34D",
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: "#92400E",
    marginLeft: 10,
    lineHeight: 18,
  },
});