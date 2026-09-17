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

// ─── Step 2: Adaptive Clarifying Question Screen ─────────────────────────────
function StepClarify({ data, symptoms, onSubmit, loading }) {
  const question = data?.question || null;
  const progress = data?.progress || {};
  const knownStates = data?.known_states || {};

  const [selectedAnswer, setSelectedAnswer] = useState(null);

  const options = question?.options || [
    'Yes',
    'No',
    'Not sure',
    'Skip',
  ];

  const handleAnswer = (option) => {
    setSelectedAnswer(option);
  };

  const handleContinue = () => {
    if (!question || !selectedAnswer) return;

    onSubmit({
      [question.id]: selectedAnswer,
    });
  };

  if (!question) {
    return (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.stepContainer}
      >
        <View style={styles.stepHeader}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>
              2 of 2
            </Text>
          </View>

          <Text style={styles.stepTitle}>
            Analysis complete
          </Text>

          <Text style={styles.stepSubtitle}>
            We have enough information to continue with your assessment.
          </Text>
        </View>
      </ScrollView>
    );
  }

  const answered = progress.answered || 0;
  const maximum = progress.maximum_recommended || 5;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#0f172a' }}
      contentContainerStyle={styles.stepContainer}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.stepHeader}>
        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>
            Follow-up {Math.min(answered + 1, maximum)} of {maximum}
          </Text>
        </View>

        <Text style={styles.stepTitle}>
          A quick follow-up
        </Text>

        <Text style={styles.stepSubtitle}>
          This question is selected based on the symptoms and answers you
          have already provided.
        </Text>
      </View>

      {/* Progress */}
      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>
            Question progress
          </Text>

          <Text style={styles.progressValue}>
            {answered}/{maximum}
          </Text>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(
                  (answered / maximum) * 100,
                  100
                )}%`,
              },
            ]}
          />
        </View>
      </View>

      {/* Danger notice */}
      {question.danger && (
        <View style={styles.redFlagCard}>
          <Ionicons
            name="warning"
            size={17}
            color="#ef4444"
          />

          <Text style={styles.redFlagText}>
            This question checks for symptoms that may require urgent
            medical attention. Answer as accurately as you can.
          </Text>
        </View>
      )}

      {/* Question */}
      <View style={styles.questionCard}>
        <Text style={styles.questionLabel}>
          QUESTION
        </Text>

        <Text style={styles.questionText}>
          {question.text}
        </Text>

        <View style={styles.optionsWrap}>
          {options.map((option) => {
            const selected = selectedAnswer === option;

            return (
              <TouchableOpacity
                key={option}
                style={[
                  styles.optionBtn,
                  selected && styles.optionSelected,
                ]}
                onPress={() => handleAnswer(option)}
                disabled={loading}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.optionRadio,
                    selected &&
                      styles.optionRadioSelected,
                  ]}
                >
                  {selected && (
                    <View style={styles.optionRadioDot} />
                  )}
                </View>

                <Text
                  style={[
                    styles.optionText,
                    selected &&
                      styles.optionTextSelected,
                  ]}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Known state summary */}
      {(knownStates.absent?.length > 0 ||
        knownStates.unknown?.length > 0 ||
        knownStates.skipped?.length > 0) && (
        <View style={styles.stateCard}>
          <Text style={styles.stateCardTitle}>
            Your previous answers are being considered
          </Text>

          {knownStates.absent?.length > 0 && (
            <Text style={styles.stateCardText}>
              Denied: {knownStates.absent
                .map((item) =>
                  item.replace(/_/g, ' ')
                )
                .join(', ')}
            </Text>
          )}

          {knownStates.unknown?.length > 0 && (
            <Text style={styles.stateCardText}>
              Not sure: {knownStates.unknown
                .map((item) =>
                  item.replace(/_/g, ' ')
                )
                .join(', ')}
            </Text>
          )}

          {knownStates.skipped?.length > 0 && (
            <Text style={styles.stateCardText}>
              Skipped: {knownStates.skipped
                .map((item) =>
                  item.replace(/_/g, ' ')
                )
                .join(', ')}
            </Text>
          )}
        </View>
      )}

      {/* Continue */}
      <TouchableOpacity
        style={[
          styles.primaryBtn,
          (!selectedAnswer || loading) &&
            styles.btnDisabled,
        ]}
        onPress={handleContinue}
        disabled={!selectedAnswer || loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons
              name={
                selectedAnswer === 'Skip'
                  ? 'play-forward'
                  : 'arrow-forward-circle'
              }
              size={18}
              color="#fff"
            />

            <Text style={styles.primaryBtnText}>
              {selectedAnswer === 'Skip'
                ? 'Skip Question'
                : 'Continue'}
            </Text>
          </>
        )}
      </TouchableOpacity>

      <Text style={styles.disclaimer}>
        You can choose Skip or Not sure at any time. CareSense AI is a
        decision-support tool and does not provide a diagnosis.
      </Text>
    </ScrollView>
  );
}


// ─── Main Wrapper ─────────────────────────────────────────────────────────
export default function SymptomCheckerScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [step, setStep] = useState('entry');
  const [symptoms, setSymptoms] = useState('');
  const [loading, setLoading] = useState(false);
  const [clarifyData, setClarifyData] = useState(null);
  const [clarifications, setClarifications] = useState({});

  const handleInitialAnalyze = async () => {
    if (!symptoms.trim()) return;

    setLoading(true);

    try {
      // Always send only the user's original symptom description.
      const data = await submitSymptoms(
        symptoms.trim(),
        user?.uid || 'anonymous',
        {},
        {}
      );

      if (data.needs_clarification) {
        setClarifyData(
          data.clarification_data || {}
        );

        setClarifications({});

        setStep('clarify');
      } else {
        navigation.navigate(
          'HealthRecordDetail',
          { result: data }
        );
      }
    } catch (error) {
      console.error(
        'Initial symptom analysis failed:',
        error
      );

      Alert.alert(
        'Connection Error',
        'Unable to reach CareSense AI server. Check that the backend is running.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClarifySubmit = async (answer) => {
  if (!answer || !Object.keys(answer).length) {
    return;
  }

  setLoading(true);

  try {
    // Preserve every previous answer.
    const updatedClarifications = {
      ...clarifications,
      ...answer,
    };

    setClarifications(
      updatedClarifications
    );

    // IMPORTANT:
    // Send the ORIGINAL symptoms unchanged.
    // Answers travel separately as structured data.
    const data = await submitSymptoms(
      symptoms.trim(),
      user?.uid || 'anonymous',
      updatedClarifications,
      {}
    );

    if (data.needs_clarification) {
      setClarifyData(
        data.clarification_data || {}
      );

      // Stay on the clarification screen.
      // StepClarify resets its local selected answer
      // for the newly returned question.
      setStep('clarify');
    } else {
      navigation.navigate(
        'HealthRecordDetail',
        { result: data }
      );
    }
  } catch (error) {
    console.error(
      'Clarification submission failed:',
      error
    );

    Alert.alert(
      'Error',
      'Analysis failed. Please try again.'
    );
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

    progressCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },

  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  progressLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },

  progressValue: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '700',
  },

  progressTrack: {
    height: 6,
    backgroundColor: '#0f172a',
    borderRadius: 4,
    overflow: 'hidden',
  },

  progressFill: {
    height: 6,
    backgroundColor: '#2563eb',
    borderRadius: 4,
  },

  questionLabel: {
    color: '#60a5fa',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },

  stateCard: {
    backgroundColor: '#172033',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#293548',
  },

  stateCardTitle: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },

  stateCardText: {
    color: '#64748b',
    fontSize: 11,
    lineHeight: 18,
    marginTop: 3,
  },
});
