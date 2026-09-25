import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { AuthContext } from '../context/AuthContext';
import { PopupContext } from '../context/PopupContext';

const BRAND = {
  cyan: '#00D4C5',
  red: '#EF4444',
  darkBg: '#0A0F1A',
  darkCard: '#141C29',
  darkBorder: '#222E40',
  lightBg: '#F8F9FB',
  lightCard: '#FFFFFF',
  lightBorder: '#E2E8F0',
};

const getTheme = isDark => ({
  background: isDark ? BRAND.darkBg : BRAND.lightBg,
  card: isDark ? BRAND.darkCard : BRAND.lightCard,
  border: isDark ? BRAND.darkBorder : BRAND.lightBorder,
  inputBg: isDark ? '#1C2738' : '#F1F5F9',
  textPrimary: isDark ? '#FFFFFF' : '#111827',
  textSecondary: isDark ? '#8897AE' : '#64748B',
  accent: BRAND.cyan,
  dangerBg: isDark ? 'rgba(239, 68, 68, 0.08)' : '#FEF2F2',
  successBg: isDark ? '#102923' : '#E9FBF7',
});

const formatValue = (value, fallback = 'Not set') => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  return String(value);
};

const normalizeDateOfBirth = value => {
  if (!value) return null;

  const cleaned = String(value).trim().replace(/[.\-]/g, '/');
  const parts = cleaned.split('/');

  let day;
  let month;
  let year;

  if (
    parts.length === 3 &&
    parts[0].length <= 2 &&
    parts[1].length <= 2 &&
    parts[2].length === 4
  ) {
    day = Number(parts[0]);
    month = Number(parts[1]);
    year = Number(parts[2]);
  } else if (parts.length === 3 && parts[0].length === 4) {
    year = Number(parts[0]);
    month = Number(parts[1]);
    day = Number(parts[2]);
  } else {
    return null;
  }

  const date = new Date(year, month - 1, day);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return [
    String(year),
    String(month).padStart(2, '0'),
    String(day).padStart(2, '0'),
  ].join('-');
};

const formatDateOfBirthForDisplay = value => {
  if (!value) return '';

  const normalized = normalizeDateOfBirth(value);
  if (!normalized) return String(value);

  const [year, month, day] = normalized.split('-');
  return `${day}/${month}/${year}`;
};

const calculateAge = dateOfBirth => {
  if (!dateOfBirth) return null;

  const birthDate = new Date(`${dateOfBirth}T00:00:00`);
  if (Number.isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return age >= 0 ? age : null;
};

const parseNumberOrNull = value => {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ''
  ) {
    return null;
  }

  const parsed = Number(String(value).trim());
  return Number.isFinite(parsed) ? parsed : null;
};

function SectionHeader({ title, actionLabel, onAction, theme }) {
  return (
    <View style={styles.sectionHeaderRow}>
      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
        {title}
      </Text>

      {onAction ? (
        <TouchableOpacity
          onPress={onAction}
          activeOpacity={0.75}
          style={styles.actionButton}
        >
          <Ionicons name="create-outline" size={18} color={theme.accent} />
          <Text style={[styles.actionText, { color: theme.accent }]}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function InfoRow({ icon, label, value, theme, last = false }) {
  return (
    <View
      style={[
        styles.infoRow,
        {
          borderBottomColor: theme.border,
          borderBottomWidth: last ? 0 : 1,
        },
      ]}
    >
      <View style={[styles.infoIcon, { backgroundColor: theme.inputBg }]}>
        <Ionicons name={icon} size={18} color={theme.accent} />
      </View>

      <View style={styles.infoCopy}>
        <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
          {label}
        </Text>
        <Text
          style={[styles.infoValue, { color: theme.textPrimary }]}
          numberOfLines={3}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

export default function HealthInformationScreen({ navigation }) {
  const {
    profile,
    profileLoading,
    profileError,
    refreshProfile,
    saveProfile,
    isDarkMode,
  } = useContext(AuthContext) || {};

  const { showPopup } = useContext(PopupContext) || {};

  const [healthModalVisible, setHealthModalVisible] = useState(false);
  const [savingHealth, setSavingHealth] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [healthForm, setHealthForm] = useState({
    date_of_birth: '',
    gender: '',
    height_cm: '',
    weight_kg: '',
    blood_type: '',
    medical_conditions: '',
    current_medications: '',
    allergies: '',
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;

  const isDark = Boolean(isDarkMode);
  const theme = useMemo(() => getTheme(isDark), [isDark]);
  const currentProfile = profile || {};

  const age = calculateAge(currentProfile.date_of_birth);
  const bloodType = formatValue(currentProfile.blood_type, '—');
  const height = currentProfile.height_cm ? `${currentProfile.height_cm} cm` : '—';
  const weight = currentProfile.weight_kg ? `${currentProfile.weight_kg} kg` : '—';

  useFocusEffect(
    useCallback(() => {
      fadeAnim.setValue(0);
      slideAnim.setValue(18);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 320,
          useNativeDriver: true,
        }),
      ]).start();

      if (refreshProfile) {
        void refreshProfile();
      }

      return undefined;
    }, [fadeAnim, slideAnim, refreshProfile]),
  );

  useEffect(() => {
    return () => {
      fadeAnim.stopAnimation();
      slideAnim.stopAnimation();
    };
  }, [fadeAnim, slideAnim]);

  const openHealthEditor = useCallback(() => {
    setHealthForm({
      date_of_birth: formatDateOfBirthForDisplay(currentProfile.date_of_birth),
      gender: currentProfile.gender || '',
      height_cm:
        currentProfile.height_cm !== null && currentProfile.height_cm !== undefined
          ? String(currentProfile.height_cm)
          : '',
      weight_kg:
        currentProfile.weight_kg !== null && currentProfile.weight_kg !== undefined
          ? String(currentProfile.weight_kg)
          : '',
      blood_type: currentProfile.blood_type || '',
      medical_conditions: currentProfile.medical_conditions || '',
      current_medications: currentProfile.current_medications || '',
      allergies: currentProfile.allergies || '',
    });
    setHealthModalVisible(true);
  }, [currentProfile]);

  const handleRefresh = useCallback(async () => {
    if (!refreshProfile || refreshing) return;

    try {
      setRefreshing(true);
      await refreshProfile();
    } catch (error) {
      console.error('Health profile refresh failed:', error);
      showPopup?.(
        'Refresh failed',
        'We could not refresh your health information right now.',
        'error',
      );
    } finally {
      setRefreshing(false);
    }
  }, [refreshProfile, refreshing, showPopup]);

  const handleSaveHealth = useCallback(async () => {
    if (!saveProfile || savingHealth) return;

    const enteredDate = healthForm.date_of_birth.trim();
    const dateOfBirth = enteredDate ? normalizeDateOfBirth(enteredDate) : null;

    if (enteredDate && !dateOfBirth) {
      showPopup?.(
        'Invalid Date',
        'Please enter a valid date such as 18/09/2003.',
        'warning',
      );
      return;
    }

    const heightValue = parseNumberOrNull(healthForm.height_cm);
    const weightValue = parseNumberOrNull(healthForm.weight_kg);

    if (heightValue !== null && (heightValue < 30 || heightValue > 300)) {
      showPopup?.(
        'Invalid Height',
        'Please enter a height between 30 and 300 cm.',
        'warning',
      );
      return;
    }

    if (weightValue !== null && (weightValue < 1 || weightValue > 500)) {
      showPopup?.(
        'Invalid Weight',
        'Please enter a weight between 1 and 500 kg.',
        'warning',
      );
      return;
    }

    try {
      setSavingHealth(true);

      await saveProfile({
        date_of_birth: dateOfBirth || null,
        gender: healthForm.gender.trim(),
        height_cm: heightValue,
        weight_kg: weightValue,
        blood_type: healthForm.blood_type.trim().toUpperCase(),
        medical_conditions: healthForm.medical_conditions.trim(),
        current_medications: healthForm.current_medications.trim(),
        allergies: healthForm.allergies.trim(),
      });

      setHealthModalVisible(false);

      showPopup?.(
        'Profile Updated',
        'Your health information has been securely saved.',
        'success',
      );
    } catch (error) {
      console.error('Health profile save error:', error);
      showPopup?.(
        'Unable to Save',
        error?.message || 'Your health information could not be updated right now.',
        'error',
      );
    } finally {
      setSavingHealth(false);
    }
  }, [healthForm, saveProfile, savingHealth, showPopup]);

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.safeArea, { backgroundColor: theme.background }]}
    >
      <Animated.ScrollView
        style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
            style={[styles.headerButton, { backgroundColor: theme.inputBg, borderColor: theme.border }]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={20} color={theme.textPrimary} />
          </TouchableOpacity>

          <View style={styles.headerCopy}>
            <Text style={[styles.eyebrow, { color: theme.accent }]}>HEALTH INFORMATION</Text>
            <Text style={[styles.title, { color: theme.textPrimary }]}>Your health profile</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Manage the physical and medical details CareSense uses to personalize your experience.</Text>
          </View>

          <TouchableOpacity
            onPress={handleRefresh}
            disabled={refreshing || profileLoading}
            activeOpacity={0.8}
            style={[styles.headerButton, { backgroundColor: theme.inputBg, borderColor: theme.border }]}
          >
            {refreshing || profileLoading ? (
              <ActivityIndicator size="small" color={theme.accent} />
            ) : (
              <Ionicons name="refresh" size={19} color={theme.accent} />
            )}
          </TouchableOpacity>
        </View>

        <View style={[styles.syncBanner, { backgroundColor: profileError ? theme.dangerBg : theme.successBg, borderColor: theme.border }]}>
          <Ionicons
            name={profileError ? 'cloud-offline-outline' : 'shield-checkmark-outline'}
            size={19}
            color={profileError ? BRAND.red : theme.accent}
          />
          <View style={styles.syncCopy}>
            <Text style={[styles.syncTitle, { color: profileError ? BRAND.red : theme.textPrimary }]}>
              {profileError ? 'Profile sync delayed' : 'Health profile synced'}
            </Text>
            <Text style={[styles.syncSubtitle, { color: theme.textSecondary }]}>
              {profileError ? 'Your last saved information remains available on this device.' : 'Your latest saved health information is shown below.'}
            </Text>
          </View>
        </View>

        <SectionHeader title="Physical Summary" actionLabel="Edit" onAction={openHealthEditor} theme={theme} />

        <View style={[styles.vitalsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.vitalItem, styles.vitalBorderRight, { borderColor: theme.border }]}>
            <Text style={[styles.vitalValue, { color: theme.accent }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} ellipsizeMode="clip">{age ?? '—'}</Text>
            <Text style={[styles.vitalLabel, { color: theme.textSecondary }]}>Age</Text>
          </View>
          <View style={[styles.vitalItem, styles.vitalBorderRight, { borderColor: theme.border }]}>
            <Text style={[styles.vitalValue, { color: theme.accent }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} ellipsizeMode="clip">{bloodType}</Text>
            <Text style={[styles.vitalLabel, { color: theme.textSecondary }]}>Blood Type</Text>
          </View>
          <View style={[styles.vitalItem, styles.vitalBorderRight, { borderColor: theme.border }]}>
            <Text style={[styles.vitalValue, styles.compactVitalValue, { color: theme.accent }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.55} ellipsizeMode="clip">{height}</Text>
            <Text style={[styles.vitalLabel, { color: theme.textSecondary }]}>Height</Text>
          </View>
          <View style={styles.vitalItem}>
            <Text style={[styles.vitalValue, styles.compactVitalValue, { color: theme.accent }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.55} ellipsizeMode="clip">{weight}</Text>
            <Text style={[styles.vitalLabel, { color: theme.textSecondary }]}>Weight</Text>
          </View>
        </View>

        <SectionHeader title="Health Details" actionLabel="Edit" onAction={openHealthEditor} theme={theme} />

        <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <InfoRow icon="person-outline" label="Gender" value={formatValue(currentProfile.gender)} theme={theme} />
          <InfoRow icon="medkit-outline" label="Medical Conditions" value={formatValue(currentProfile.medical_conditions)} theme={theme} />
          <InfoRow icon="medical-outline" label="Current Medications" value={formatValue(currentProfile.current_medications)} theme={theme} />
          <InfoRow icon="warning-outline" label="Allergies" value={formatValue(currentProfile.allergies)} theme={theme} last />
        </View>

        <View style={[styles.noteCard, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
          <Ionicons name="information-circle-outline" size={19} color={theme.accent} />
          <Text style={[styles.noteText, { color: theme.textSecondary }]}>Keep this information updated so CareSense can use the latest profile context when personalizing health guidance.</Text>
        </View>
      </Animated.ScrollView>

      <Modal
        visible={healthModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          if (!savingHealth) setHealthModalVisible(false);
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderCopy}>
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Health Profile</Text>
                <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>Update the information CareSense uses to personalize your experience.</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  if (!savingHealth) setHealthModalVisible(false);
                }}
                disabled={savingHealth}
                style={[styles.closeButton, { backgroundColor: theme.inputBg }]}
              >
                <Ionicons name="close" size={18} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.modalScrollContent}
            >
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Date of Birth</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.border }]}
                placeholder="DD/MM/YYYY"
                placeholderTextColor={theme.textSecondary}
                value={healthForm.date_of_birth}
                onChangeText={value => setHealthForm(previous => ({ ...previous, date_of_birth: value }))}
                keyboardType="numeric"
              />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Gender</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.border }]}
                placeholder="e.g. Male, Female, Other"
                placeholderTextColor={theme.textSecondary}
                value={healthForm.gender}
                onChangeText={value => setHealthForm(previous => ({ ...previous, gender: value }))}
              />

              <View style={styles.twoColumnRow}>
                <View style={styles.twoColumnItem}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Height (cm)</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.border }]}
                    placeholder="e.g. 175"
                    placeholderTextColor={theme.textSecondary}
                    value={healthForm.height_cm}
                    onChangeText={value => setHealthForm(previous => ({ ...previous, height_cm: value }))}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.twoColumnItem}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Weight (kg)</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.border }]}
                    placeholder="e.g. 70"
                    placeholderTextColor={theme.textSecondary}
                    value={healthForm.weight_kg}
                    onChangeText={value => setHealthForm(previous => ({ ...previous, weight_kg: value }))}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Blood Type</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.border }]}
                placeholder="e.g. O+"
                placeholderTextColor={theme.textSecondary}
                value={healthForm.blood_type}
                onChangeText={value => setHealthForm(previous => ({ ...previous, blood_type: value }))}
                autoCapitalize="characters"
                maxLength={5}
              />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Medical Conditions</Text>
              <TextInput
                style={[styles.modalInput, styles.multilineInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.border }]}
                placeholder="e.g. Asthma, diabetes, hypertension"
                placeholderTextColor={theme.textSecondary}
                value={healthForm.medical_conditions}
                onChangeText={value => setHealthForm(previous => ({ ...previous, medical_conditions: value }))}
                multiline
                textAlignVertical="top"
              />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Current Medications</Text>
              <TextInput
                style={[styles.modalInput, styles.multilineInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.border }]}
                placeholder="List medicines you currently take"
                placeholderTextColor={theme.textSecondary}
                value={healthForm.current_medications}
                onChangeText={value => setHealthForm(previous => ({ ...previous, current_medications: value }))}
                multiline
                textAlignVertical="top"
              />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Allergies</Text>
              <TextInput
                style={[styles.modalInput, styles.multilineInput, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.border }]}
                placeholder="e.g. Penicillin, peanuts, pollen"
                placeholderTextColor={theme.textSecondary}
                value={healthForm.allergies}
                onChangeText={value => setHealthForm(previous => ({ ...previous, allergies: value }))}
                multiline
                textAlignVertical="top"
              />

              <View style={styles.modalButtonRow}>
                <TouchableOpacity
                  onPress={() => setHealthModalVisible(false)}
                  disabled={savingHealth}
                  style={[styles.cancelButton, { backgroundColor: theme.inputBg, borderColor: theme.border }]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSaveHealth}
                  disabled={savingHealth}
                  style={[styles.saveButton, { backgroundColor: theme.accent, opacity: savingHealth ? 0.65 : 1 }]}
                  activeOpacity={0.8}
                >
                  {savingHealth ? (
                    <ActivityIndicator size="small" color="#0A0F1A" />
                  ) : (
                    <Ionicons name="checkmark" size={18} color="#0A0F1A" />
                  )}
                  <Text style={styles.saveButtonText}>{savingHealth ? 'Saving…' : 'Save changes'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 36 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  headerButton: {
    width: 52,
    height: 52,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { flex: 1, paddingHorizontal: 14, paddingTop: 2 },
  eyebrow: { fontSize: 13, fontWeight: '800', letterSpacing: 1.5, marginBottom: 6 },
  title: { fontSize: 31, lineHeight: 36, fontWeight: '800', letterSpacing: -0.6 },
  subtitle: { marginTop: 7, fontSize: 15.5, lineHeight: 22 },
  syncBanner: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  syncCopy: { flex: 1, marginLeft: 11 },
  syncTitle: { fontSize: 14.5, fontWeight: '800' },
  syncSubtitle: { marginTop: 3, fontSize: 12.5, lineHeight: 18 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 11,
    marginTop: 7,
  },
  sectionTitle: { fontSize: 27, fontWeight: '800', letterSpacing: -0.4 },
  actionButton: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { fontSize: 16, fontWeight: '800' },
  vitalsCard: {
    flexDirection: 'row',
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 22,
  },
  vitalItem: { flex: 1, minHeight: 122, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, minWidth: 0 },
  vitalBorderRight: { borderRightWidth: 1 },
  vitalValue: { fontSize: 18, lineHeight: 22, fontWeight: '800', textAlign: 'center', width: '100%', flexShrink: 1, includeFontPadding: false },
  compactVitalValue: { fontSize: 16.5, lineHeight: 20, letterSpacing: -0.2 },
  vitalLabel: { marginTop: 7, fontSize: 12, fontWeight: '600', textAlign: 'center', includeFontPadding: false },
  infoCard: { borderRadius: 22, borderWidth: 1, overflow: 'hidden', marginBottom: 18 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 15 },
  infoIcon: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  infoCopy: { flex: 1, marginLeft: 13 },
  infoLabel: { fontSize: 13.5, fontWeight: '700' },
  infoValue: { marginTop: 5, fontSize: 16, lineHeight: 22, fontWeight: '700' },
  noteCard: { borderRadius: 18, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'flex-start' },
  noteText: { flex: 1, marginLeft: 10, fontSize: 13, lineHeight: 19 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.62)', justifyContent: 'flex-end' },
  modalContent: { maxHeight: '92%', borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, paddingTop: 18 },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 18, paddingBottom: 12 },
  modalHeaderCopy: { flex: 1, paddingRight: 10 },
  modalTitle: { fontSize: 23, fontWeight: '800' },
  modalSubtitle: { marginTop: 5, fontSize: 13.5, lineHeight: 19 },
  closeButton: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  modalScrollContent: { paddingHorizontal: 18, paddingBottom: 28 },
  inputLabel: { marginTop: 13, marginBottom: 7, fontSize: 13, fontWeight: '700' },
  modalInput: { minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15.5 },
  multilineInput: { minHeight: 84, paddingTop: 12 },
  twoColumnRow: { flexDirection: 'row', gap: 10 },
  twoColumnItem: { flex: 1 },
  modalButtonRow: { flexDirection: 'row', gap: 10, marginTop: 22 },
  cancelButton: { flex: 1, minHeight: 50, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cancelButtonText: { fontSize: 15, fontWeight: '800' },
  saveButton: { flex: 1.3, minHeight: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 },
  saveButtonText: { color: '#0A0F1A', fontSize: 15, fontWeight: '900' },
});
