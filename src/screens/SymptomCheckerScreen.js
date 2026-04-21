// src/screens/SymptomCheckerScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
  Modal,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import api from '../services/api';
import AppPopup from "../components/AppPopup";

const { width } = Dimensions.get('window');

export default function SymptomCheckerScreen() {
  const navigation = useNavigation();

  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [customSymptomDetail, setCustomSymptomDetail] = useState('');
  const [duration, setDuration] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [showMedicineModal, setShowMedicineModal] = useState(false);
  const [popup, setPopup] = useState({
  visible: false,
  type: 'success',
  title: '',
  message: '',
});

  // ---------------- EXPANDED SYMPTOMS ----------------
  const symptomCategories = [
    {
      category: 'General & Pain',
      icon: 'thermometer-half',
      color: '#FF6B6B',
      symptoms: [
        { name: 'Fever', severity: 'HIGH', emergency: true },
        { name: 'Headache', severity: 'MODERATE', emergency: false },
        { name: 'Fatigue', severity: 'LOW', emergency: false },
        { name: 'Chest Pain', severity: 'CRITICAL', emergency: true },
        { name: 'Body Aches', severity: 'LOW', emergency: false },
        { name: 'Chills', severity: 'MODERATE', emergency: false },
      ],
    },
    {
      category: 'Respiratory',
      icon: 'lungs',
      color: '#4ECDC4',
      symptoms: [
        { name: 'Cough', severity: 'MODERATE', emergency: false },
        { name: 'Shortness of Breath', severity: 'CRITICAL', emergency: true },
        { name: 'Sore Throat', severity: 'LOW', emergency: false },
        { name: 'Runny Nose', severity: 'LOW', emergency: false },
        { name: 'Wheezing', severity: 'HIGH', emergency: true },
        { name: 'Congestion', severity: 'LOW', emergency: false },
      ],
    },
    {
      category: 'Digestive',
      icon: 'apple-alt',
      color: '#FFD93D',
      symptoms: [
        { name: 'Nausea', severity: 'MODERATE', emergency: false },
        { name: 'Vomiting', severity: 'MODERATE', emergency: false },
        { name: 'Diarrhea', severity: 'MODERATE', emergency: false },
        { name: 'Abdominal Pain', severity: 'HIGH', emergency: false },
        { name: 'Loss of Appetite', severity: 'LOW', emergency: false },
        { name: 'Bloating', severity: 'LOW', emergency: false },
      ],
    },
    {
      category: 'Neurological',
      icon: 'brain',
      color: '#A8E6CF',
      symptoms: [
        { name: 'Dizziness', severity: 'MODERATE', emergency: false },
        { name: 'Confusion', severity: 'CRITICAL', emergency: true },
        { name: 'Vision Changes', severity: 'HIGH', emergency: true },
        { name: 'Numbness', severity: 'HIGH', emergency: true },
        { name: 'Memory Issues', severity: 'MODERATE', emergency: false },
        { name: 'Seizures', severity: 'CRITICAL', emergency: true },
      ],
    },
    {
      category: 'Skin & External',
      icon: 'hand-paper',
      color: '#C7A3FF',
      symptoms: [
        { name: 'Rash', severity: 'MODERATE', emergency: false },
        { name: 'Swelling', severity: 'HIGH', emergency: false },
        { name: 'Bruising', severity: 'MODERATE', emergency: false },
        { name: 'Itching', severity: 'LOW', emergency: false },
        { name: 'Pale Skin', severity: 'HIGH', emergency: false },
        { name: 'Jaundice', severity: 'CRITICAL', emergency: true },
      ],
    },
  ];

  const toggleSymptom = symptom => {
    setAiResult(null);
    const isSelected = selectedSymptoms.some(s => s.name === symptom.name);
    
    setSelectedSymptoms(prev =>
      isSelected
        ? prev.filter(s => s.name !== symptom.name)
        : [...prev, symptom]
    );

    // Check for emergency symptoms
    if (!isSelected && symptom.emergency) {
      setTimeout(() => setShowEmergencyModal(true), 300);
    }
  };

  // ---------------- AI ANALYSIS ----------------
  const analyzeSymptoms = async () => {
    if (selectedSymptoms.length === 0 && !customSymptomDetail.trim()) {
      Alert.alert('Input Required', 'Please select or describe at least one symptom.');
      return;
    }

    setLoading(true);
    setAiResult(null);

    const summary = selectedSymptoms
      .map(s => `${s.name} (${s.severity})`)
      .join(', ');

    const fullQuery = customSymptomDetail
      ? `${summary}. Details: ${customSymptomDetail}. Duration: ${duration || 'Not specified'}`
      : `${summary}. Duration: ${duration || 'Not specified'}`;

    try {
      const triageRes = await api.post('/api/v1/ai/triage/', {
        symptoms: fullQuery,
      });

      const recordId = triageRes.data.record_id;

      const insightRes = await api.post('/api/v1/ai/triage-insight/', {
        record_id: recordId,
      });

      const result = {
        triage: triageRes.data.triage,
        summary: insightRes.data.summary,
        risk: insightRes.data.risk_level,
        recommendation: insightRes.data.recommendation,
        recordId: recordId,
        // Backend returns these fields
        medications: insightRes.data.medications || [],
        ai_explanation: insightRes.data.ai_explanation || '',
        doctor_warning: insightRes.data.doctor_warning || false,
        homeCare: generateHomeCare(selectedSymptoms),
        doctorSpecialties: suggestDoctors(selectedSymptoms),
        redFlags: checkRedFlags(selectedSymptoms),
      };

      setAiResult(result);

      // Show emergency modal if critical
      if (result.risk === 'CRITICAL' || result.triage === 'EMERGENCY') {
        setShowEmergencyModal(true);
      }

    } catch (e) {
      Alert.alert('AI Error', 'Unable to analyze symptoms right now.');
    } finally {
      setLoading(false);
    }
  };

  // ---------------- HOME CARE SUGGESTIONS ----------------
  const generateHomeCare = (symptoms) => {
    const care = [];
    
    if (symptoms.some(s => s.name === 'Fever')) {
      care.push({
        icon: 'thermometer-half',
        title: 'Fever Management',
        color: '#FF6B6B',
        tips: [
          'Rest and stay hydrated with water or electrolyte drinks',
          'Use fever-reducing medication (acetaminophen/ibuprofen) as directed',
          'Apply cool compress to forehead',
          'Wear light clothing and keep room temperature comfortable',
        ],
      });
    }

    if (symptoms.some(s => s.name.includes('Cough') || s.name.includes('Throat'))) {
      care.push({
        icon: 'lungs',
        title: 'Respiratory Care',
        color: '#4ECDC4',
        tips: [
          'Stay hydrated with warm fluids (tea, soup, warm water)',
          'Use humidifier or breathe steam from hot shower',
          'Gargle with warm salt water for sore throat',
          'Avoid irritants like smoke and strong odors',
        ],
      });
    }

    if (symptoms.some(s => s.name === 'Headache')) {
      care.push({
        icon: 'brain',
        title: 'Headache Relief',
        color: '#A8E6CF',
        tips: [
          'Rest in a quiet, dark room',
          'Apply cold or warm compress to head or neck',
          'Stay hydrated and avoid caffeine',
          'Practice relaxation techniques or gentle stretching',
        ],
      });
    }

    if (symptoms.some(s => ['Nausea', 'Vomiting', 'Diarrhea'].includes(s.name))) {
      care.push({
        icon: 'apple-alt',
        title: 'Digestive Support',
        color: '#FFD93D',
        tips: [
          'Follow BRAT diet: Bananas, Rice, Applesauce, Toast',
          'Sip clear fluids frequently (water, clear broth, ginger tea)',
          'Avoid dairy, fatty, and spicy foods temporarily',
          'Rest and avoid strenuous activity',
        ],
      });
    }

    // General care
    care.push({
      icon: 'heart',
      title: 'General Wellness',
      color: '#95E1D3',
      tips: [
        'Get adequate sleep (7-9 hours)',
        'Wash hands frequently to prevent spread',
        'Monitor your symptoms and note any changes',
        'Avoid contact with others if contagious',
      ],
    });

    return care;
  };

  // ---------------- RED FLAGS ----------------
  const checkRedFlags = (symptoms) => {
    const flags = [];
    
    if (symptoms.some(s => s.name === 'Chest Pain')) {
      flags.push({
        icon: 'exclamation-triangle',
        warning: 'Chest Pain',
        action: 'Seek immediate emergency care - could indicate heart attack',
      });
    }

    if (symptoms.some(s => s.name === 'Shortness of Breath')) {
      flags.push({
        icon: 'exclamation-triangle',
        warning: 'Severe Breathing Difficulty',
        action: 'Call emergency services if breathing is severely impaired',
      });
    }

    if (symptoms.some(s => ['Confusion', 'Seizures'].includes(s.name))) {
      flags.push({
        icon: 'exclamation-triangle',
        warning: 'Neurological Emergency',
        action: 'Immediate medical attention required',
      });
    }

    if (symptoms.some(s => s.name === 'Jaundice')) {
      flags.push({
        icon: 'exclamation-triangle',
        warning: 'Liver Function Concern',
        action: 'Consult doctor within 24 hours',
      });
    }

    return flags;
  };

  // ---------------- DOCTOR SUGGESTIONS ----------------
  const suggestDoctors = (symptoms) => {
    const specialties = [];

    if (symptoms.some(s => ['Cough', 'Shortness of Breath', 'Wheezing'].includes(s.name))) {
      specialties.push({
        specialty: 'Pulmonologist',
        reason: 'Respiratory symptoms',
        icon: 'lungs',
        color: '#4ECDC4',
      });
    }

    if (symptoms.some(s => ['Chest Pain'].includes(s.name))) {
      specialties.push({
        specialty: 'Cardiologist',
        reason: 'Chest pain evaluation',
        icon: 'heartbeat',
        color: '#FF6B6B',
      });
    }

    if (symptoms.some(s => ['Nausea', 'Vomiting', 'Diarrhea', 'Abdominal Pain'].includes(s.name))) {
      specialties.push({
        specialty: 'Gastroenterologist',
        reason: 'Digestive system issues',
        icon: 'apple-alt',
        color: '#FFD93D',
      });
    }

    if (symptoms.some(s => ['Dizziness', 'Confusion', 'Seizures', 'Numbness'].includes(s.name))) {
      specialties.push({
        specialty: 'Neurologist',
        reason: 'Neurological symptoms',
        icon: 'brain',
        color: '#A8E6CF',
      });
    }

    if (symptoms.some(s => ['Rash', 'Itching', 'Jaundice'].includes(s.name))) {
      specialties.push({
        specialty: 'Dermatologist',
        reason: 'Skin conditions',
        icon: 'hand-paper',
        color: '#C7A3FF',
      });
    }

    // Default to general practitioner
    if (specialties.length === 0) {
      specialties.push({
        specialty: 'General Practitioner',
        reason: 'General health assessment',
        icon: 'user-md',
        color: '#4A90E2',
      });
    }

    return specialties;
  };

  // ---------------- PDF EXPORT ----------------
  const generatePDF = async () => {
    const html = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 30px; color: #2C3E50; }
            h1 { color: #4A90E2; border-bottom: 3px solid #4A90E2; padding-bottom: 10px; }
            .section { margin: 25px 0; }
            .label { font-weight: bold; color: #2C3E50; }
            .value { margin-left: 10px; color: #555; }
            .emergency { background: #FFE5E5; padding: 15px; border-left: 5px solid #E74C3C; margin: 20px 0; }
            .medicine-card { background: #F0F7FF; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #4A90E2; }
            .home-care { background: #F0F7FF; padding: 15px; margin: 15px 0; border-radius: 8px; }
            ul { margin: 10px 0; padding-left: 20px; }
            li { margin: 5px 0; line-height: 1.6; }
            .header { text-align: center; margin-bottom: 30px; }
            .badge { display: inline-block; padding: 5px 15px; border-radius: 15px; font-size: 14px; font-weight: bold; }
            .badge-triage { background: #E8F4F8; color: #4A90E2; }
            .badge-risk { background: #FFE5E5; color: #E74C3C; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🏥 Health Assessment Report</h1>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
          </div>
          
          <div class="section">
            <h2>📋 Symptoms Reported</h2>
            <p><strong>Selected Symptoms:</strong> ${selectedSymptoms.map(s => s.name).join(', ')}</p>
            ${customSymptomDetail ? `<p><strong>Additional Details:</strong> ${customSymptomDetail}</p>` : ''}
            ${duration ? `<p><strong>Duration:</strong> ${duration}</p>` : ''}
          </div>

          <div class="section">
            <h2>🎯 Assessment Results</h2>
            <p><span class="label">Triage Level:</span> <span class="badge badge-triage">${aiResult.triage}</span></p>
            <p><span class="label">Risk Level:</span> <span class="badge badge-risk">${aiResult.risk}</span></p>
            <p><span class="label">Summary:</span> ${aiResult.summary}</p>
          </div>

          ${aiResult.medications && aiResult.medications.length > 0 ? `
            <div class="section">
              <h2>💊 AI Recommended Medications</h2>
              ${aiResult.ai_explanation ? `<p><em>${aiResult.ai_explanation}</em></p>` : ''}
              ${aiResult.medications.map(med => `
                <div class="medicine-card">
                  <h3>${med.name}</h3>
                  <p><strong>Dosage:</strong> ${med.dosage}</p>
                  <p><strong>Timing:</strong> ${med.timing}</p>
                  <p><strong>Duration:</strong> ${med.duration}</p>
                  <p><strong>Reason:</strong> ${med.reason}</p>
                  ${med.warning ? `<p style="color: #E74C3C;"><strong>⚠️ Warning:</strong> ${med.warning}</p>` : ''}
                </div>
              `).join('')}
            </div>
          ` : ''}

          ${aiResult.redFlags.length > 0 ? `
            <div class="emergency">
              <h2>⚠️ Emergency Warnings</h2>
              ${aiResult.redFlags.map(flag => `
                <p><strong>${flag.warning}:</strong> ${flag.action}</p>
              `).join('')}
            </div>
          ` : ''}

          <div class="section">
            <h2>💊 Medical Recommendations</h2>
            <p>${aiResult.recommendation}</p>
          </div>

          <div class="section">
            <h2>🏠 Home Care Instructions</h2>
            ${aiResult.homeCare.map(care => `
              <div class="home-care">
                <h3>${care.title}</h3>
                <ul>
                  ${care.tips.map(tip => `<li>${tip}</li>`).join('')}
                </ul>
              </div>
            `).join('')}
          </div>

          <div class="section">
            <h2>👨‍⚕️ Recommended Medical Specialists</h2>
            <ul>
              ${aiResult.doctorSpecialties.map(doc => `
                <li><strong>${doc.specialty}</strong> - ${doc.reason}</li>
              `).join('')}
            </ul>
          </div>

          <div style="margin-top: 50px; padding: 20px; background: #F8F9FA; border-radius: 8px; font-size: 12px; color: #666;">
            <strong>⚠️ Medical Disclaimer:</strong> This assessment is for informational purposes only and does not replace professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.
          </div>
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { 
        mimeType: 'application/pdf',
        dialogTitle: 'Share Health Assessment Report'
      });
    } catch (error) {
      Alert.alert('Error', 'Could not generate PDF report');
    }
  };

  // ---------------- SAVE ----------------
  const handleSaveResults = () => {
    if (saving) return;
    setSaving(true);

    setPopup({
  visible: true,
  type: 'success',
  title: 'Saved Successfully',
  message: 'Your health assessment has been saved to your medical records.',
});
    
    setTimeout(() => {
      setSaving(false);
      navigation.navigate('AllRecords', { refresh: true });
    }, 1000);
  };

  const resetAll = () => {
    setSelectedSymptoms([]);
    setCustomSymptomDetail('');
    setDuration('');
    setAiResult(null);
  };

  // ---------------- SEVERITY COLOR ----------------
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'CRITICAL': return '#E74C3C';
      case 'HIGH': return '#E67E22';
      case 'MODERATE': return '#F39C12';
      case 'LOW': return '#27AE60';
      default: return '#95A5A6';
    }
  };

  // ---------------- UI ----------------
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Custom Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <View style={styles.iconCircle}>
              <FontAwesome5 name="stethoscope" size={24} color="#4A90E2" />
            </View>
            <View>
              <Text style={styles.headerLabel}>HEALTH CHECKER</Text>
              <Text style={styles.headerTitle}>Symptom Analyzer</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.infoButton}>
            <FontAwesome5 name="info-circle" size={20} color="#4A90E2" />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>AI-powered health assessment and medical guidance</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >

        {/* Duration Input Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <FontAwesome5 name="clock" size={18} color="#4A90E2" />
            <Text style={styles.cardTitle}>Symptom Duration</Text>
          </View>
          <TextInput
            style={styles.durationInput}
            placeholder="e.g., 2 days, 1 week, this morning..."
            value={duration}
            onChangeText={setDuration}
            placeholderTextColor="#95A5A6"
          />
        </View>

        {/* Symptom Categories */}
        {symptomCategories.map(category => (
          <View key={category.category} style={styles.categorySection}>
            <View style={styles.categoryHeaderBox}>
              <View style={[styles.categoryIconCircle, { backgroundColor: category.color + '20' }]}>
                <FontAwesome5 name={category.icon} size={20} color={category.color} />
              </View>
              <Text style={styles.categoryTitle}>{category.category}</Text>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{category.symptoms.length}</Text>
              </View>
            </View>

            <View style={styles.symptomsGrid}>
              {category.symptoms.map(symptom => {
                const selected = selectedSymptoms.some(s => s.name === symptom.name);
                return (
                  <TouchableOpacity
                    key={symptom.name}
                    style={[
                      styles.symptomCard,
                      selected && styles.symptomCardSelected,
                    ]}
                    onPress={() => toggleSymptom(symptom)}
                    activeOpacity={0.7}
                  >
                    {symptom.emergency && (
                      <View style={styles.emergencyBadge}>
                        <FontAwesome5 name="exclamation" size={10} color="#FFF" />
                      </View>
                    )}
                    <Text style={[styles.symptomName, selected && styles.symptomNameSelected]}>
                      {symptom.name}
                    </Text>
                    <View 
                      style={[
                        styles.severityPill,
                        { backgroundColor: getSeverityColor(symptom.severity) }
                      ]}
                    >
                      <Text style={styles.severityText}>{symptom.severity}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        {/* Custom Symptoms */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <FontAwesome5 name="edit" size={18} color="#4A90E2" />
            <Text style={styles.cardTitle}>Additional Details</Text>
          </View>
          <TextInput
            style={styles.textArea}
            placeholder="Describe any other symptoms, pain intensity, or specific concerns..."
            multiline
            numberOfLines={4}
            value={customSymptomDetail}
            onChangeText={setCustomSymptomDetail}
            placeholderTextColor="#95A5A6"
          />
        </View>

        {/* Loading State */}
        {loading && (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#4A90E2" />
            <Text style={styles.loadingText}>Analyzing your symptoms...</Text>
            <Text style={styles.loadingSubtext}>This may take a few moments</Text>
          </View>
        )}

        {/* Results Section */}
        {aiResult && (
          <View style={styles.resultsContainer}>
            
            {/* ========== NEW: DOCTOR WARNING BANNER ========== */}
            {aiResult.doctor_warning && (
              <View style={styles.doctorWarningBanner}>
                <FontAwesome5 name="user-md" size={24} color="#FFF" />
                <View style={styles.doctorWarningContent}>
                  <Text style={styles.doctorWarningTitle}>Doctor Consultation Required</Text>
                  <Text style={styles.doctorWarningText}>
                    Based on your symptoms, we strongly recommend seeing a healthcare professional for proper diagnosis and treatment.
                  </Text>
                  <TouchableOpacity 
                    style={styles.bookDoctorButton}
                    onPress={() => {
                      Alert.alert('Book Doctor', 'Navigate to doctor booking screen');
                    }}
                  >
                    <FontAwesome5 name="calendar-check" size={14} color="#FFF" />
                    <Text style={styles.bookDoctorButtonText}>Book Doctor</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            {/* ========== END NEW: DOCTOR WARNING BANNER ========== */}

            {/* Emergency Warnings */}
            {aiResult.redFlags.length > 0 && (
              <View style={styles.emergencyCard}>
                <View style={styles.emergencyHeader}>
                  <FontAwesome5 name="exclamation-triangle" size={28} color="#FFF" />
                  <Text style={styles.emergencyHeaderText}>URGENT WARNINGS</Text>
                </View>
                {aiResult.redFlags.map((flag, idx) => (
                  <View key={idx} style={styles.flagBox}>
                    <Text style={styles.flagWarningText}>{flag.warning}</Text>
                    <Text style={styles.flagActionText}>{flag.action}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Assessment Results */}
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <FontAwesome5 name="clipboard-list" size={24} color="#4A90E2" />
                <Text style={styles.resultHeaderText}>AI Health Assessment</Text>
              </View>

              <View style={styles.resultGrid}>
                <View style={styles.resultItem}>
                  <Text style={styles.resultLabel}>Triage Level</Text>
                  <View style={[styles.resultBadge, styles.triageBadge]}>
                    <Text style={styles.resultBadgeText}>{aiResult.triage}</Text>
                  </View>
                </View>

                <View style={styles.resultItem}>
                  <Text style={styles.resultLabel}>Risk Level</Text>
                  <View style={[styles.resultBadge, styles.riskBadge]}>
                    <Text style={styles.resultBadgeText}>{aiResult.risk}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.resultSection}>
                <Text style={styles.resultSectionTitle}>📊 Summary</Text>
                <Text style={styles.resultSectionText}>{aiResult.summary}</Text>
              </View>

              <View style={styles.resultSection}>
                <Text style={styles.resultSectionTitle}>💊 Recommendation</Text>
                <Text style={styles.resultSectionText}>{aiResult.recommendation}</Text>
              </View>
            </View>

            {/* ========== NEW: AI EXPLANATION CARD ========== */}
            {aiResult.ai_explanation && (
              <View style={styles.aiExplanationCard}>
                <View style={styles.aiExplanationHeader}>
                  <FontAwesome5 name="robot" size={22} color="#4A90E2" />
                  <Text style={styles.aiExplanationTitle}>Why AI Suggested This</Text>
                </View>
                <Text style={styles.aiExplanationText}>{aiResult.ai_explanation}</Text>
              </View>
            )}
            {/* ========== END NEW: AI EXPLANATION CARD ========== */}

{/* ========== NEW: MEDICATIONS SECTION WITH TIMELINE ========== */}
            {aiResult.medications && aiResult.medications.length > 0 && (
              <View style={styles.medicationsSection}>
                <View style={styles.medicationsHeader}>
                  <FontAwesome5 name="pills" size={22} color="#27AE60" />
                  <Text style={styles.medicationsTitle}>AI Recommended Medications</Text>
                  <TouchableOpacity 
                    style={styles.viewAllButton}
                    onPress={() => setShowMedicineModal(true)}
                  >
                    <Text style={styles.viewAllText}>View All</Text>
                    <FontAwesome5 name="chevron-right" size={12} color="#4A90E2" />
                  </TouchableOpacity>
                </View>

                {/* Medicine Timeline Preview (First 2 medicines) */}
                <View style={styles.medicineTimeline}>
                  {aiResult.medications.slice(0, 2).map((med, idx) => (
                    <View key={idx} style={styles.medicineTimelineItem}>
                      <View style={styles.timelineDot}>
                        <FontAwesome5 name="capsules" size={12} color="#FFF" />
                      </View>
                      {idx < aiResult.medications.length - 1 && idx < 1 && (
                        <View style={styles.timelineLine} />
                      )}
                      <View style={styles.medicineTimelineCard}>
                        <View style={styles.medicineCardHeader}>
                          <Text style={styles.medicineName} numberOfLines={2}>{med.name}</Text>
                          <View style={styles.medicineBadge}>
                            <Text style={styles.medicineBadgeText} numberOfLines={1}>{med.dosage}</Text>
                          </View>
                        </View>
                        <View style={styles.medicineDetails}>
                          <View style={styles.medicineDetailRow}>
                            <FontAwesome5 name="clock" size={12} color="#7F8C8D" />
                            <Text style={styles.medicineDetailText} numberOfLines={2}>{med.timing}</Text>
                          </View>
                          <View style={styles.medicineDetailRow}>
                            <FontAwesome5 name="calendar" size={12} color="#7F8C8D" />
                            <Text style={styles.medicineDetailText} numberOfLines={1}>{med.duration}</Text>
                          </View>
                        </View>
                        <Text style={styles.medicineReason} numberOfLines={3}>{med.reason}</Text>
                        {med.warning && (
                          <View style={styles.medicineWarningBox}>
                            <FontAwesome5 name="exclamation-triangle" size={10} color="#E67E22" />
                            <Text style={styles.medicineWarningText} numberOfLines={3}>{med.warning}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  ))}
                </View>

                {aiResult.medications.length > 2 && (
                  <TouchableOpacity 
                    style={styles.viewMoreMedicines}
                    onPress={() => setShowMedicineModal(true)}
                  >
                    <Text style={styles.viewMoreText}>
                      +{aiResult.medications.length - 2} more medications
                    </Text>
                    <FontAwesome5 name="arrow-right" size={14} color="#4A90E2" />
                  </TouchableOpacity>
                )}
              </View>
            )}
            {/* ========== END NEW: MEDICATIONS SECTION ========== */}

            {/* Home Care Instructions */}
            <View style={styles.homeCareCard}>
              <View style={styles.homeCareHeader}>
                <FontAwesome5 name="home" size={22} color="#4A90E2" />
                <Text style={styles.homeCareTitle}>Home Care Instructions</Text>
              </View>
              
              {aiResult.homeCare.map((care, idx) => (
                <View key={idx} style={styles.careBox}>
                  <View style={styles.careBoxHeader}>
                    <View style={[styles.careIconCircle, { backgroundColor: care.color + '20' }]}>
                      <FontAwesome5 name={care.icon} size={16} color={care.color} />
                    </View>
                    <Text style={styles.careBoxTitle}>{care.title}</Text>
                  </View>
                  {care.tips.map((tip, tipIdx) => (
                    <View key={tipIdx} style={styles.tipRow}>
                      <View style={styles.tipBullet} />
                      <Text style={styles.tipText}>{tip}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>

            {/* Doctor Recommendations Button */}
            <TouchableOpacity 
              style={styles.doctorButton}
              onPress={() => setShowDoctorModal(true)}
              activeOpacity={0.8}
            >
              <FontAwesome5 name="user-md" size={22} color="#FFF" />
              <Text style={styles.doctorButtonText}>View Recommended Specialists</Text>
              <FontAwesome5 name="chevron-right" size={18} color="#FFF" />
            </TouchableOpacity>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleSaveResults}
                disabled={saving}
                activeOpacity={0.8}
              >
                <FontAwesome5 name="save" size={20} color="#FFF" />
                <Text style={styles.saveButtonText}>
                  {saving ? 'Saving...' : 'Save to Records'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.pdfButton}
                onPress={generatePDF}
                activeOpacity={0.8}
              >
                <FontAwesome5 name="file-pdf" size={20} color="#FFF" />
                <Text style={styles.pdfButtonText}>Export PDF</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.resetButton}
              onPress={resetAll}
              activeOpacity={0.8}
            >
              <FontAwesome5 name="redo" size={16} color="#4A90E2" />
              <Text style={styles.resetButtonText}>Start New Assessment</Text>
            </TouchableOpacity>

          </View>
        )}

        {/* Analyze Button */}
        {!loading && !aiResult && (
          <TouchableOpacity 
            style={styles.analyzeButton}
            onPress={analyzeSymptoms}
            activeOpacity={0.8}
          >
            <FontAwesome5 name="brain" size={22} color="#FFF" />
            <Text style={styles.analyzeButtonText}>Analyze with AI</Text>
            <FontAwesome5 name="arrow-right" size={18} color="#FFF" />
          </TouchableOpacity>
        )}

        {/* Bottom Spacing */}
        <View style={{ height: 40 }} />

      </ScrollView>

      {/* Emergency Modal */}
      <Modal
        visible={showEmergencyModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEmergencyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.emergencyModal}>
            <View style={styles.emergencyModalIcon}>
              <FontAwesome5 name="exclamation-triangle" size={48} color="#E74C3C" />
            </View>
            <Text style={styles.emergencyModalTitle}>Emergency Symptom Detected</Text>
            <Text style={styles.emergencyModalText}>
              You've selected symptoms that may require immediate medical attention. 
              If you're experiencing severe distress, please call emergency services immediately.
            </Text>
            <TouchableOpacity 
              style={styles.emergencyCallButton}
              onPress={() => {
                Alert.alert('Emergency Services', 'Call emergency services (108 or 112) immediately if needed.');
                setShowEmergencyModal(false);
              }}
            >
              <FontAwesome5 name="phone-alt" size={20} color="#FFF" />
              <Text style={styles.emergencyCallButtonText}>Call Emergency</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.emergencyUnderstandButton}
              onPress={() => setShowEmergencyModal(false)}
            >
              <Text style={styles.emergencyUnderstandButtonText}>I Understand</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ========== NEW: FULL MEDICATIONS MODAL ========== */}
      <Modal
        visible={showMedicineModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMedicineModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.medicineModal}>
            <View style={styles.medicineModalHeader}>
              <View style={styles.medicineModalHeaderLeft}>
                <FontAwesome5 name="pills" size={24} color="#27AE60" />
                <Text style={styles.medicineModalTitle}>Medication Plan</Text>
              </View>
              <TouchableOpacity onPress={() => setShowMedicineModal(false)}>
                <FontAwesome5 name="times" size={24} color="#2C3E50" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.medicineModalScroll}>
              {/* Timeline Header */}
              <View style={styles.timelineHeaderBadge}>
                <FontAwesome5 name="calendar-day" size={14} color="#4A90E2" />
                <Text style={styles.timelineHeaderText}>Today's Medication Schedule</Text>
              </View>

              {/* Full Medicine Timeline */}
              <View style={styles.fullMedicineTimeline}>
                {aiResult?.medications.map((med, idx) => (
                  <View key={idx} style={styles.fullMedicineItem}>
                    <View style={styles.fullTimelineDot}>
                      <Text style={styles.timelineDotNumber}>{idx + 1}</Text>
                    </View>
                    {idx < aiResult.medications.length - 1 && (
                      <View style={styles.fullTimelineLine} />
                    )}
                    <View style={styles.fullMedicineCard}>
                      <View style={styles.fullMedicineHeader}>
                        <View style={styles.medicineIconCircle}>
                          <FontAwesome5 name="capsules" size={18} color="#27AE60" />
                        </View>
                        <View style={styles.fullMedicineHeaderText}>
                          <Text style={styles.fullMedicineName}>{med.name}</Text>
                          <View style={styles.fullMedicineDosageBadge}>
                            <FontAwesome5 name="prescription" size={10} color="#4A90E2" />
                            <Text style={styles.fullMedicineDosage}>{med.dosage}</Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.fullMedicineDetailsBox}>
                        <View style={styles.fullMedicineDetailItem}>
                          <FontAwesome5 name="clock" size={14} color="#7F8C8D" />
                          <View style={styles.fullDetailTextBox}>
                            <Text style={styles.fullDetailLabel}>Timing</Text>
                            <Text style={styles.fullDetailValue}>{med.timing}</Text>
                          </View>
                        </View>

                        <View style={styles.fullMedicineDetailItem}>
                          <FontAwesome5 name="calendar-alt" size={14} color="#7F8C8D" />
                          <View style={styles.fullDetailTextBox}>
                            <Text style={styles.fullDetailLabel}>Duration</Text>
                            <Text style={styles.fullDetailValue}>{med.duration}</Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.fullMedicineReasonBox}>
                        <FontAwesome5 name="info-circle" size={12} color="#4A90E2" />
                        <Text style={styles.fullMedicineReason}>{med.reason}</Text>
                      </View>

                      {med.warning && (
                        <View style={styles.fullMedicineWarning}>
                          <FontAwesome5 name="exclamation-triangle" size={14} color="#E67E22" />
                          <Text style={styles.fullWarningText}>{med.warning}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>

              <View style={styles.medicineDisclaimer}>
                <FontAwesome5 name="shield-alt" size={16} color="#7F8C8D" />
                <Text style={styles.disclaimerText}>
                  These recommendations are AI-generated suggestions. Always consult a healthcare professional before starting any medication.
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity 
              style={styles.closeModalButton}
              onPress={() => setShowMedicineModal(false)}
            >
              <Text style={styles.closeModalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* ========== END NEW: FULL MEDICATIONS MODAL ========== */}

      {/* Doctor Specialties Modal */}
      <Modal
        visible={showDoctorModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDoctorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.doctorModal}>
            <View style={styles.doctorModalHeader}>
              <Text style={styles.doctorModalTitle}>Recommended Specialists</Text>
              <TouchableOpacity onPress={() => setShowDoctorModal(false)}>
                <FontAwesome5 name="times" size={24} color="#2C3E50" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {aiResult?.doctorSpecialties.map((doc, idx) => (
                <View key={idx} style={styles.doctorCard}>
                  <View style={[styles.doctorIconCircle, { backgroundColor: doc.color + '20' }]}>
                    <FontAwesome5 name={doc.icon} size={28} color={doc.color} />
                  </View>
                  <View style={styles.doctorInfo}>
                    <Text style={styles.doctorSpecialty}>{doc.specialty}</Text>
                    <Text style={styles.doctorReason}>{doc.reason}</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.bookButton}
                    onPress={() => {
                      setShowDoctorModal(false);
                      Alert.alert('Book Appointment', `Navigate to book ${doc.specialty}`);
                    }}
                  >
                    <Text style={styles.bookButtonText}>Book</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity 
              style={styles.closeModalButton}
              onPress={() => setShowDoctorModal(false)}
            >
              <Text style={styles.closeModalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
            {/* ✅ APP POPUP — ADD HERE */}
      <AppPopup
        visible={popup.visible}
        type={popup.type}
        title={popup.title}
        message={popup.message}
        onClose={() =>
          setPopup(prev => ({ ...prev, visible: false }))
        }
      />

    </SafeAreaView>
  );
}

// ---------------- STYLES ----------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F0EBFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4A90E2',
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2C3E50',
    marginTop: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
    lineHeight: 20,
  },
  infoButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0EBFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginLeft: 10,
  },
  durationInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#2C3E50',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  textArea: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#2C3E50',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  categorySection: {
    marginBottom: 20,
  },
  categoryHeaderBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2C3E50',
    flex: 1,
  },
  categoryBadge: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  symptomsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  symptomCard: {
    width: (width - 52) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    margin: 6,
    borderWidth: 2,
    borderColor: '#E8E8E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  symptomCardSelected: {
    borderColor: '#4A90E2',
    backgroundColor: '#F0EBFF',
  },
  emergencyBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E74C3C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  symptomName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8,
  },
  symptomNameSelected: {
    color: '#4A90E2',
  },
  severityPill: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  severityText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  loadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    marginVertical: 20,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginTop: 16,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 4,
  },
  resultsContainer: {
    marginTop: 20,
  },
  // ========== NEW STYLES: DOCTOR WARNING BANNER ==========
  doctorWarningBanner: {
    backgroundColor: '#E67E22',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#E67E22',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  doctorWarningContent: {
    flex: 1,
    marginLeft: 14,
  },
  doctorWarningTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  doctorWarningText: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
    marginBottom: 12,
  },
  bookDoctorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    alignSelf: 'flex-start',
    gap: 8,
  },
  bookDoctorButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  // ========== END NEW STYLES ==========
  emergencyCard: {
    backgroundColor: '#E74C3C',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  emergencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  emergencyHeaderText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  flagBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  flagWarningText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  flagActionText: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  resultHeaderText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3E50',
    marginLeft: 12,
  },
  resultGrid: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  resultItem: {
    flex: 1,
    alignItems: 'center',
  },
  resultLabel: {
    fontSize: 13,
    color: '#7F8C8D',
    marginBottom: 8,
    fontWeight: '500',
  },
  resultBadge: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  triageBadge: {
    backgroundColor: '#E8F4F8',
  },
  riskBadge: {
    backgroundColor: '#FFE5E5',
  },
  resultBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2C3E50',
  },
  resultSection: {
    marginBottom: 20,
  },
  resultSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 8,
  },
  resultSectionText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
  },
  // ========== NEW STYLES: AI EXPLANATION CARD ==========
  aiExplanationCard: {
    backgroundColor: '#F0F7FF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  aiExplanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  aiExplanationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E50',
    marginLeft: 10,
  },
  aiExplanationText: {
    fontSize: 14,
    color: '#34495E',
    lineHeight: 22,
  },
  // ========== END NEW STYLES ==========
  // ========== NEW STYLES: MEDICATIONS SECTION ==========
  medicationsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  medicationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  medicationsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3E50',
    marginLeft: 12,
    flex: 1,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F7FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A90E2',
  },
  medicineTimeline: {
    marginBottom: 12,
  },
  medicineTimelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#27AE60',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 8,
  },
  timelineLine: {
    position: 'absolute',
    left: 15,
    top: 40,
    width: 2,
    height: '100%',
    backgroundColor: '#E8E8E8',
  },
  medicineTimelineCard: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 14,
  },
  medicineCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  medicineName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C3E50',
    flex: 1,
  },
  medicineBadge: {
    backgroundColor: '#E8F4F8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  medicineBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4A90E2',
  },
  medicineDetails: {
    marginBottom: 10,
  },
  medicineDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  medicineDetailText: {
    fontSize: 13,
    color: '#555',
  },
  medicineReason: {
    fontSize: 13,
    color: '#7F8C8D',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  medicineWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5E5',
    padding: 8,
    borderRadius: 8,
    gap: 8,
  },
  medicineWarningText: {
    flex: 1,
    fontSize: 11,
    color: '#E67E22',
    fontWeight: '600',
  },
  viewMoreMedicines: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F7FF',
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  viewMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90E2',
  },
  // ========== END NEW STYLES ==========
  homeCareCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  homeCareHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  homeCareTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3E50',
    marginLeft: 12,
  },
  careBox: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  careBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  careIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  careBoxTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E50',
  },
  tipRow: {
    flexDirection: 'row',
    marginBottom: 10,
    paddingLeft: 8,
  },
  tipBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4A90E2',
    marginTop: 7,
    marginRight: 10,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  doctorButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    marginBottom: 16,
  },
  doctorButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 12,
    marginRight: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#27AE60',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#27AE60',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 10,
  },
  pdfButton: {
    flex: 1,
    backgroundColor: '#9B59B6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#9B59B6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  pdfButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 10,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  resetButtonText: {
    color: '#4A90E2',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  analyzeButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    marginVertical: 10,
  },
  analyzeButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginHorizontal: 12,
  },
  
  // ---------------- MODAL STYLES ----------------
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  
  // Emergency Modal
  emergencyModal: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  emergencyModalIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFE5E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emergencyModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#E74C3C',
    textAlign: 'center',
    marginBottom: 12,
  },
  emergencyModalText: {
    fontSize: 16,
    color: '#2C3E50',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  emergencyCallButton: {
    width: '100%',
    backgroundColor: '#E74C3C',
    padding: 18,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#E74C3C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  emergencyCallButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 10,
  },
  emergencyUnderstandButton: {
    padding: 16,
  },
  emergencyUnderstandButtonText: {
    color: '#7F8C8D',
    fontSize: 16,
    fontWeight: '600',
  },

  // ========== NEW STYLES: MEDICINE MODAL ==========
  medicineModal: {
    width: '100%',
    height: '85%',
    backgroundColor: '#F8F9FA',
    borderRadius: 24,
    overflow: 'hidden',
    marginTop: 'auto',
  },
  medicineModalHeader: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  medicineModalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  medicineModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C3E50',
  },
  medicineModalScroll: {
    flex: 1,
    padding: 20,
  },
  timelineHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F4F8',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
    gap: 8,
  },
  timelineHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4A90E2',
  },
  fullMedicineTimeline: {
    marginBottom: 20,
  },
  fullMedicineItem: {
    flexDirection: 'row',
    marginBottom: 24,
    minHeight: 100,
  },
  fullTimelineDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#27AE60',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    marginRight: 16,
  },
  timelineDotNumber: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  fullTimelineLine: {
    position: 'absolute',
    left: 17,
    top: 36,
    width: 2,
    height: '110%',
    backgroundColor: '#E8E8E8',
    zIndex: 1,
  },
  fullMedicineCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  fullMedicineHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  medicineIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F6EF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  fullMedicineHeaderText: {
    flex: 1,
  },
  fullMedicineName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 4,
  },
  fullMedicineDosageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F4F8',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 6,
  },
  fullMedicineDosage: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A90E2',
  },
  fullMedicineDetailsBox: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    marginBottom: 12,
  },
  fullMedicineDetailItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fullDetailTextBox: {
    flex: 1,
  },
  fullDetailLabel: {
    fontSize: 11,
    color: '#95A5A6',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  fullDetailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2C3E50',
  },
  fullMedicineReasonBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  fullMedicineReason: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    flex: 1,
    fontStyle: 'italic',
  },
  fullMedicineWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5E5',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  fullWarningText: {
    fontSize: 12,
    color: '#E67E22',
    fontWeight: '600',
    flex: 1,
  },
  medicineDisclaimer: {
    flexDirection: 'row',
    backgroundColor: '#F0F2F5',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 30,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: '#7F8C8D',
    lineHeight: 18,
  },
  closeModalButton: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  closeModalButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E50',
  },
  // ========== END NEW STYLES ==========

  // Doctor Modal
  doctorModal: {
    width: '100%',
    height: '80%',
    backgroundColor: '#F8F9FA',
    borderRadius: 24,
    marginTop: 'auto',
    overflow: 'hidden',
  },
  doctorModalHeader: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  doctorModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C3E50',
  },
  doctorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  doctorIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doctorInfo: {
    flex: 1,
    marginLeft: 16,
  },
  doctorSpecialty: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 4,
  },
  doctorReason: {
    fontSize: 13,
    color: '#7F8C8D',
  },
  bookButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});