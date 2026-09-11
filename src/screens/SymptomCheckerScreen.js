import React, { useState, useContext } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { submitSymptoms } from '../services/api';
import { AuthContext } from '../context/AuthContext';

// 60+ symptoms organised by body system
const SYMPTOM_CATEGORIES = [
  {
    label: 'General',
    icon: 'body-outline',
    color: '#60a5fa',
    symptoms: ['Fever','High Fever','Fatigue','Weakness','Night Sweats','Weight Loss',
               'Chills','Loss of Appetite','Sweating','Pallor','Malaise','Lethargy'],
  },
  {
    label: 'Head & Neuro',
    icon: 'pulse-outline',
    color: '#a78bfa',
    symptoms: ['Headache','Migraine','Dizziness','Confusion','Memory Loss',
               'Stiff Neck','Fainting','Blurred Vision','Numbness','Tingling',
               'Ear Pain','Ringing in Ears','Slurred Speech'],
  },
  {
    label: 'Respiratory',
    icon: 'cloud-outline',
    color: '#34d399',
    symptoms: ['Cough','Dry Cough','Productive Cough','Coughing Blood','Sore Throat',
               'Shortness of Breath','Wheezing','Runny Nose','Nasal Congestion',
               'Loss of Smell','Loss of Taste','Sneezing'],
  },
  {
    label: 'Chest & Heart',
    icon: 'heart-outline',
    color: '#f87171',
    symptoms: ['Chest Pain','Chest Tightness','Chest Pressure','Palpitations',
               'Rapid Heart Rate','Shortness of Breath'],
  },
  {
    label: 'Stomach & GI',
    icon: 'nutrition-outline',
    color: '#fbbf24',
    symptoms: ['Nausea','Vomiting','Vomiting Blood','Diarrhea','Constipation',
               'Abdominal Pain','Bloating','Heartburn','Indigestion',
               'Blood in Stool','Dark Urine','Yellowing Skin'],
  },
  {
    label: 'Skin',
    icon: 'contrast-outline',
    color: '#f472b6',
    symptoms: ['Rash','Itching','Hives','Skin Redness','Blisters','Swelling',
               'Bruising','Cold Sweats','Flushed Skin'],
  },
  {
    label: 'Muscles & Joints',
    icon: 'barbell-outline',
    color: '#fb923c',
    symptoms: ['Back Pain','Joint Pain','Muscle Pain','Neck Pain','Leg Pain',
               'Leg Swelling','Muscle Weakness','Stiffness','Muscle Cramps'],
  },
  {
    label: 'Urinary',
    icon: 'water-outline',
    color: '#38bdf8',
    symptoms: ['Frequent Urination','Burning Urination','Dark Urine',
               'Blood in Urine','Excessive Thirst','Pelvic Pain'],
  },
];


// ─── Step 1: Symptom Entry Screen ─────────────────────────────────────────
function StepEntry({ symptoms, setSymptoms, onAnalyze, loading }) {
  const [search, setSearch]           = useState('');
  const [activeCategory, setCategory] = useState(null); // null = show all

  // Which chips are already in the text box
  const selected = new Set(
    symptoms.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
  );

  const toggleTag = (tag) => {
    const tagLower = tag.toLowerCase();
    if (selected.has(tagLower)) {
      // Remove it
      const updated = symptoms
        .split(',')
        .map(s => s.trim())
        .filter(s => s.toLowerCase() !== tagLower)
        .join(', ');
      setSymptoms(updated);
    } else {
      setSymptoms(prev => prev.trim() ? `${prev.trim()}, ${tag}` : tag);
    }
  };

  // Filter logic
  const searchLower = search.toLowerCase();
  const visibleCategories = SYMPTOM_CATEGORIES
    .filter(cat => !activeCategory || cat.label === activeCategory)
    .map(cat => ({
      ...cat,
      symptoms: cat.symptoms.filter(s =>
        !searchLower || s.toLowerCase().includes(searchLower)
      ),
    }))
    .filter(cat => cat.symptoms.length > 0);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#0f172a' }}
      contentContainerStyle={styles.stepContainer}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.stepHeader}>
        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>1 of 2</Text>
        </View>
        <Text style={styles.stepTitle}>What are your symptoms?</Text>
        <Text style={styles.stepSubtitle}>
          Tap chips below or type in your own words.
        </Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color="#64748b" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search symptoms..."
          placeholderTextColor="#475569"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color="#475569" />
          </TouchableOpacity>
        )}
      </View>

      {/* Category filter pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 14 }}
        contentContainerStyle={{ gap: 8, paddingRight: 8 }}
      >
        <TouchableOpacity
          style={[styles.catPill, !activeCategory && styles.catPillActive]}
          onPress={() => setCategory(null)}
        >
          <Text style={[styles.catPillText, !activeCategory && styles.catPillTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        {SYMPTOM_CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.label}
            style={[styles.catPill, activeCategory === cat.label && styles.catPillActive,
                    activeCategory === cat.label && { borderColor: cat.color }]}
            onPress={() => setCategory(prev => prev === cat.label ? null : cat.label)}
          >
            <Ionicons name={cat.icon} size={12}
              color={activeCategory === cat.label ? cat.color : '#64748b'} />
            <Text style={[styles.catPillText,
              activeCategory === cat.label && { color: cat.color }]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Symptom chips by category */}
      {visibleCategories.map(cat => (
        <View key={cat.label} style={{ marginBottom: 14 }}>
          <View style={styles.catHeader}>
            <Ionicons name={cat.icon} size={13} color={cat.color} />
            <Text style={[styles.catLabel, { color: cat.color }]}>{cat.label}</Text>
          </View>
          <View style={styles.tagsWrap}>
            {cat.symptoms.map(tag => {
              const isSelected = selected.has(tag.toLowerCase());
              return (
                <TouchableOpacity
                  key={tag}
                  style={[styles.tag,
                    isSelected && { backgroundColor: '#1d4ed8', borderColor: '#3b82f6' }]}
                  onPress={() => toggleTag(tag)}
                >
                  {isSelected && (
                    <Ionicons name="checkmark" size={11} color="#93c5fd" />
                  )}
                  <Text style={[styles.tagText, isSelected && { color: '#bfdbfe' }]}>
                    {tag}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}

      {/* Selected summary */}
      {selected.size > 0 && (
        <View style={styles.selectedBar}>
          <Text style={styles.selectedBarText}>
            {selected.size} symptom{selected.size > 1 ? 's' : ''} selected
          </Text>
          <TouchableOpacity onPress={() => setSymptoms('')}>
            <Text style={styles.clearBtn}>Clear all</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Free-text input */}
      <TextInput
        style={styles.textInput}
        multiline
        placeholder={'Add extra details (duration, severity, location)…\n\nE.g. "Throbbing headache on right side for 2 days"'}
        placeholderTextColor="#4b5563"
        value={symptoms}
        onChangeText={setSymptoms}
        textAlignVertical="top"
      />

      <TouchableOpacity
        style={[styles.primaryBtn, (!symptoms.trim() || loading) && styles.btnDisabled]}
        onPress={onAnalyze}
        disabled={!symptoms.trim() || loading}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <>
              <Ionicons name="search" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>Analyse Symptoms</Text>
            </>
        }
      </TouchableOpacity>

      <Text style={styles.disclaimer}>
        CareSense AI is a decision-support tool. Always seek professional help in an emergency.
      </Text>
    </ScrollView>
  );
}

// ─── Step 2: Clarifying Questions Screen ──────────────────────────────────
function StepClarify({ data, symptoms, onSubmit, loading }) {
  const [answers, setAnswers] = useState({});

  const answer = (questionId, option) =>
    setAnswers(prev => ({ ...prev, [questionId]: option }));

  const allAnswered = data.questions.every(q => answers[q.id]);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.stepContainer}>
      {/* Possible conditions banner */}
      <View style={styles.possibleBanner}>
        <Text style={styles.possibleTitle}>Possible Causes of "{symptoms}"</Text>
        <View style={styles.possibleList}>
          {(data.possible_conditions || []).map((cond, i) => (
            <View key={i} style={styles.possibleItem}>
              <Ionicons name="ellipse" size={6} color="#60a5fa" />
              <Text style={styles.possibleText}>{cond}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.stepHeader}>
        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>2 of 2</Text>
        </View>
        <Text style={styles.stepTitle}>A few quick questions</Text>
        <Text style={styles.stepSubtitle}>{data.message}</Text>
      </View>

      {/* Red flag warning */}
      {data.red_flags && data.red_flags.length > 0 && (
        <View style={styles.redFlagCard}>
          <Ionicons name="warning" size={16} color="#ef4444" />
          <Text style={styles.redFlagText}>
            Go to ER immediately if you have:{' '}
            <Text style={{ fontWeight: 'bold' }}>{data.red_flags.slice(0, 3).join(', ')}</Text>
          </Text>
        </View>
      )}

      {/* Questions */}
      {(data.questions || []).map((q, qi) => (
        <View key={q.id} style={styles.questionCard}>
          <Text style={styles.questionText}>
            <Text style={styles.questionNum}>Q{qi + 1}. </Text>{q.text}
          </Text>
          <View style={styles.optionsWrap}>
            {q.options.map(opt => {
              const selected = answers[q.id] === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  style={[styles.optionBtn, selected && styles.optionSelected]}
                  onPress={() => answer(q.id, opt)}
                >
                  <View style={[styles.optionRadio, selected && styles.optionRadioSelected]}>
                    {selected && <View style={styles.optionRadioDot} />}
                  </View>
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}

      <TouchableOpacity
        style={[styles.primaryBtn, (!allAnswered || loading) && styles.btnDisabled]}
        onPress={() => onSubmit(answers)}
        disabled={!allAnswered || loading}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <>
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>Get My Analysis</Text>
            </>
        }
      </TouchableOpacity>
    </ScrollView>
  );
}


// ─── Main Wrapper ─────────────────────────────────────────────────────────
export default function SymptomCheckerScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [step, setStep]           = useState('entry');   // 'entry' | 'clarify'
  const [symptoms, setSymptoms]   = useState('');
  const [loading, setLoading]     = useState(false);
  const [clarifyData, setClarifyData] = useState(null);

  const handleInitialAnalyze = async () => {
    if (!symptoms.trim()) return;
    setLoading(true);
    try {
      const data = await submitSymptoms(symptoms, user?.uid || 'anonymous');

      if (data.needs_clarification) {
        setClarifyData(data.clarification_data);
        setStep('clarify');
      } else {
        navigation.navigate('HealthRecordDetail', { result: data });
      }
    } catch {
      Alert.alert('Connection Error', 'Unable to reach CareSense AI server. Check backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleClarifySubmit = async (answers) => {
    setLoading(true);
    try {
      // Build an enriched, clinically phrased symptom string from the answers
      // so Gemini NLP normalises it correctly into multiple symptoms.
      const answerPhrases = Object.values(answers).filter(Boolean);
      const enrichedSymptoms = [symptoms, ...answerPhrases].join(', ');
      const data = await submitSymptoms(
        enrichedSymptoms,
        user?.uid || 'anonymous',
        answers  // pass raw answers dict too for the Gemini explainer
      );
      navigation.navigate('HealthRecordDetail', { result: data });
    } catch {
      Alert.alert('Error', 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 80}
    >
      {step === 'entry' ? (
        <StepEntry
          symptoms={symptoms}
          setSymptoms={setSymptoms}
          onAnalyze={handleInitialAnalyze}
          loading={loading}
        />
      ) : (
        <StepClarify
          data={clarifyData}
          symptoms={symptoms}
          onSubmit={handleClarifySubmit}
          loading={loading}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#0f172a' },
  stepContainer: { padding: 20, paddingBottom: 50 },

  stepHeader:    { marginBottom: 20 },
  stepBadge: {
    backgroundColor: '#1e3a5f', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, alignSelf: 'flex-start', marginBottom: 10,
  },
  stepBadgeText: { color: '#60a5fa', fontSize: 11, fontWeight: '700' },
  stepTitle:     { color: '#f1f5f9', fontSize: 24, fontWeight: 'bold', marginBottom: 6 },
  stepSubtitle:  { color: '#64748b', fontSize: 14, lineHeight: 22 },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: '#334155', marginBottom: 12, gap: 8,
  },
  searchInput: { flex: 1, color: '#f1f5f9', fontSize: 14 },

  catPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: '#334155',
    backgroundColor: '#1e293b',
  },
  catPillActive:    { backgroundColor: '#172554', borderColor: '#3b82f6' },
  catPillText:      { color: '#64748b', fontSize: 12 },
  catPillTextActive:{ color: '#93c5fd', fontWeight: '700' },

  catHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  catLabel:  { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#1e293b', paddingVertical: 6, paddingHorizontal: 12,
    borderRadius: 20, borderWidth: 1, borderColor: '#334155',
  },
  tagText: { color: '#94a3b8', fontSize: 13 },

  selectedBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#172554', borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: '#1d4ed8', marginBottom: 14,
  },
  selectedBarText: { color: '#93c5fd', fontSize: 13, fontWeight: '600' },
  clearBtn:        { color: '#f87171', fontSize: 13, fontWeight: '600' },

  textInput: {
    backgroundColor: '#1e293b', color: '#f1f5f9', borderRadius: 14,
    padding: 16, height: 160, fontSize: 15, borderWidth: 1,
    borderColor: '#334155', marginBottom: 20,
  },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#2563eb', paddingVertical: 16, borderRadius: 14,
    gap: 8, marginBottom: 16,
  },
  btnDisabled:     { opacity: 0.4 },
  primaryBtnText:  { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  disclaimer:      { color: '#475569', fontSize: 12, textAlign: 'center', lineHeight: 18 },

  possibleBanner: {
    backgroundColor: '#1e293b', borderRadius: 14, padding: 16,
    marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#3b82f6',
  },
  possibleTitle:  { color: '#93c5fd', fontWeight: 'bold', fontSize: 14, marginBottom: 10 },
  possibleList:   { gap: 6 },
  possibleItem:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  possibleText:   { color: '#cbd5e1', fontSize: 13 },

  redFlagCard: {
    backgroundColor: '#450a0a', borderRadius: 12, padding: 12,
    flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: 16,
    borderWidth: 1, borderColor: '#7f1d1d',
  },
  redFlagText: { color: '#fca5a5', fontSize: 13, flex: 1, lineHeight: 20 },

  questionCard: {
    backgroundColor: '#1e293b', borderRadius: 14, padding: 16, marginBottom: 14,
  },
  questionNum:  { color: '#60a5fa', fontWeight: 'bold' },
  questionText: { color: '#f1f5f9', fontSize: 15, marginBottom: 12, lineHeight: 22 },
  optionsWrap:  { gap: 8 },
  optionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#0f172a', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#334155',
  },
  optionSelected:     { borderColor: '#3b82f6', backgroundColor: '#172554' },
  optionRadio: {
    width: 18, height: 18, borderRadius: 9, borderWidth: 2,
    borderColor: '#475569', justifyContent: 'center', alignItems: 'center',
  },
  optionRadioSelected:{ borderColor: '#3b82f6' },
  optionRadioDot:     { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3b82f6' },
  optionText:         { color: '#94a3b8', fontSize: 14, flex: 1 },
  optionTextSelected: { color: '#f1f5f9' },
});
