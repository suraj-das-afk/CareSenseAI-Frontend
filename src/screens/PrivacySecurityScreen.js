import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { PopupContext } from '../context/PopupContext';

const STORAGE_KEY = '@caresense_user_settings_v2';
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
  switchTrackActive: isDark ? '#00B3A6' : BRAND.cyan,
  switchTrackInactive: isDark ? '#222E40' : '#E2E8F0',
});

function SettingRow({ icon, title, subtitle, theme, children, tone = 'accent' }) {
  const color = tone === 'danger' ? BRAND.red : theme.accent;

  return (
    <View
      style={[
        styles.settingRow,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
        },
      ]}
    >
      <View
        style={[
          styles.settingIcon,
          {
            backgroundColor:
              tone === 'danger'
                ? 'rgba(239,68,68,0.10)'
                : theme.inputBg,
          },
        ]}
      >
        <Ionicons name={icon} size={21} color={color} />
      </View>
      <View style={styles.settingCopy}>
        <Text style={[styles.settingTitle, { color: theme.textPrimary }]}>
          {title}
        </Text>
        <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>
          {subtitle}
        </Text>
      </View>
      {children}
    </View>
  );
}

export default function PrivacySecurityScreen({ navigation }) {
  const auth = useContext(AuthContext) || {};
  const { showPopup } = useContext(PopupContext) || {};
  const {
    isDarkMode,
    isBiometricsEnabled,
    toggleBiometrics,
    isFaceLockEnabled,
    toggleFaceLock,
    passwordLockEnabled,
    passwordLockType,
    enablePasswordLock,
    disablePasswordLock,
  } = auth;

  const theme = useMemo(
    () => getTheme(Boolean(isDarkMode)),
    [isDarkMode],
  );

  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [passwordMode, setPasswordMode] = useState('set');
  const [lockTypeDraft, setLockTypeDraft] = useState('pin');
  const [secret, setSecret] = useState('');
  const [confirmSecret, setConfirmSecret] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;

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

      return undefined;
    }, [fadeAnim, slideAnim]),
  );

  useEffect(
    () => () => {
      fadeAnim.stopAnimation();
      slideAnim.stopAnimation();
    },
    [fadeAnim, slideAnim],
  );

  const handleFaceLockToggle = useCallback(async enabled => {
    const result = await toggleFaceLock?.(enabled);

    if (!result?.success) {
      showPopup?.(
        'Face Lock',
        result?.message || 'Unable to change Face Lock right now.',
        'error',
      );
      return;
    }

    if (enabled) {
      showPopup?.(
        'Face Lock enabled',
        'Your face is set up. CareSense will use your face to unlock the app.',
        'success',
      );
    } else {
      showPopup?.(
        'Face Lock disabled',
        'Face Lock has been turned off and your saved face setup was removed.',
        'success',
      );
    }
  }, [showPopup, toggleFaceLock]);

  const openPasswordSetup = () => {
    setPasswordMode(passwordLockEnabled ? 'disable' : 'set');
    setLockTypeDraft(
      passwordLockEnabled
        ? (passwordLockType === 'password' ? 'password' : 'pin')
        : 'pin',
    );
    setSecret('');
    setConfirmSecret('');
    setPasswordModalVisible(true);
  };

  const handlePasswordAction = useCallback(async () => {
    const activeType = passwordMode === 'disable'
      ? (passwordLockType === 'password' ? 'password' : 'pin')
      : lockTypeDraft;

    if (passwordMode === 'set') {
      if (
        activeType === 'pin' &&
        !/^\d{4,6}$/.test(secret)
      ) {
        showPopup?.(
          'PIN Lock',
          'Use 4 to 6 numbers for your PIN.',
          'warning',
        );
        return;
      }

      if (
        activeType === 'password' &&
        (secret.length < 8 || secret.length > 64)
      ) {
        showPopup?.(
          'Password Lock',
          'Use 8 to 64 characters for your password. Symbols such as ^ are allowed.',
          'warning',
        );
        return;
      }

      if (secret !== confirmSecret) {
        showPopup?.(
          activeType === 'password' ? 'Password Lock' : 'PIN Lock',
          'The entries do not match.',
          'warning',
        );
        return;
      }

      setSavingPassword(true);

      try {
        const result = await enablePasswordLock?.(
          secret,
          activeType,
        );

        if (!result?.success) {
          showPopup?.(
            activeType === 'password' ? 'Password Lock' : 'PIN Lock',
            result?.message || 'Unable to enable local protection.',
            'error',
          );
          return;
        }

        setPasswordModalVisible(false);
        showPopup?.(
          activeType === 'password'
            ? 'Password Lock enabled'
            : 'PIN Lock enabled',
          activeType === 'password'
            ? 'Your local app password is now available as an unlock option.'
            : 'Your 4–6 digit local PIN is now available as an unlock option.',
          'success',
        );
      } catch (error) {
        showPopup?.(
          activeType === 'password' ? 'Password Lock' : 'PIN Lock',
          error?.message || 'Unable to enable local protection.',
          'error',
        );
      } finally {
        setSavingPassword(false);
      }

      return;
    }

    const disableType =
      passwordLockType === 'password' ? 'password' : 'pin';

    if (!secret) {
      showPopup?.(
        disableType === 'password' ? 'Password Lock' : 'PIN Lock',
        disableType === 'password'
          ? 'Enter your current app password to disable the lock.'
          : 'Enter your current app PIN to disable the lock.',
        'warning',
      );
      return;
    }

    setSavingPassword(true);

    try {
      const result = await disablePasswordLock?.(secret);

      if (!result?.success) {
        showPopup?.(
          disableType === 'password' ? 'Password Lock' : 'PIN Lock',
          result?.message || 'The current credential is incorrect.',
          'error',
        );
        return;
      }

      setPasswordModalVisible(false);
      showPopup?.(
        disableType === 'password'
          ? 'Password Lock disabled'
          : 'PIN Lock disabled',
        'The local app credential has been removed from device protection.',
        'success',
      );
    } catch (error) {
      showPopup?.(
        disableType === 'password' ? 'Password Lock' : 'PIN Lock',
        error?.message || 'Unable to disable local protection.',
        'error',
      );
    } finally {
      setSavingPassword(false);
    }
  }, [
    passwordMode,
    passwordLockType,
    lockTypeDraft,
    secret,
    confirmSecret,
    enablePasswordLock,
    disablePasswordLock,
    showPopup,
  ]);

  const activeCredentialDescription = passwordLockEnabled
    ? passwordLockType === 'password'
      ? 'A local app password can unlock CareSense. It is stored in secure device storage.'
      : 'A local 4–6 digit PIN can unlock CareSense. It is stored in secure device storage.'
    : 'Add either a 4–6 digit PIN or an 8–64 character local password for app-only protection.';

  return (
    <SafeAreaView
      edges={['top']}
      style={[
        styles.safeArea,
        { backgroundColor: theme.background },
      ]}
    >
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
            style={[
              styles.headerButton,
              {
                backgroundColor: theme.inputBg,
                borderColor: theme.border,
              },
            ]}
          >
            <Ionicons
              name="arrow-back"
              size={21}
              color={theme.textPrimary}
            />
          </TouchableOpacity>

          <View style={styles.headerCopy}>
            <Text style={[styles.eyebrow, { color: theme.accent }]}>PRIVACY & SECURITY</Text>
            <Text style={[styles.title, { color: theme.textPrimary }]}>Your protection</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Choose how you want to protect CareSense on this device.</Text>
          </View>
        </View>

        <View style={[styles.statusCard, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
          <View style={[styles.statusIcon, { backgroundColor: theme.card }]}>
            <Ionicons name="shield-checkmark-outline" size={23} color={theme.accent} />
          </View>
          <View style={styles.statusCopy}>
            <Text style={[styles.statusTitle, { color: theme.textPrimary }]}>Security controls</Text>
            <Text style={[styles.statusText, { color: theme.textSecondary }]}>Choose fingerprint or another device biometric, Face Lock, or a PIN or password to protect the app.</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>App protection</Text>

        <SettingRow
          icon="finger-print-outline"
          title="Biometric Authentication"
          subtitle="Use your phone's fingerprint or built-in biometric security to unlock CareSense."
          theme={theme}
        >
          <Switch
            value={Boolean(isBiometricsEnabled)}
            onValueChange={enabled => { void toggleBiometrics?.(enabled); }}
            trackColor={{ false: theme.switchTrackInactive, true: theme.switchTrackActive }}
          />
        </SettingRow>

        <SettingRow
          icon="scan-outline"
          title="Face Lock"
          subtitle="Use your face to unlock CareSense. You'll set up your face with the camera first."
          theme={theme}
        >
          <Switch
            value={Boolean(isFaceLockEnabled)}
            onValueChange={enabled => { void handleFaceLockToggle(enabled); }}
            trackColor={{ false: theme.switchTrackInactive, true: theme.switchTrackActive }}
          />
        </SettingRow>

        <SettingRow
          icon="keypad-outline"
          title="Password / PIN Lock"
          subtitle={activeCredentialDescription}
          theme={theme}
        >
          <Switch
            value={Boolean(passwordLockEnabled)}
            onValueChange={() => openPasswordSetup()}
            trackColor={{ false: theme.switchTrackInactive, true: theme.switchTrackActive }}
          />
        </SettingRow>

        <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginTop: 24 }]}>Privacy</Text>

        <SettingRow
          icon="shield-outline"
          title="Data Sharing"
          subtitle="CareSense does not currently send app usage analytics. This feature is not active yet."
          theme={theme}
        >
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: isDarkMode ? '#1C2738' : '#F1F5F9',
                borderColor: theme.border,
              },
            ]}
          >
            <Text style={[styles.statusBadgeText, { color: theme.textSecondary }]}>
              Not active
            </Text>
          </View>
        </SettingRow>

        <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="information-circle-outline" size={19} color={theme.accent} />
          <Text style={[styles.infoText, { color: theme.textSecondary }]}>These options protect this app on your device. Face Lock uses your camera, while PINs and passwords stay on the device. Your CareSense account password is separate.</Text>
        </View>
      </Animated.ScrollView>

      <Modal
        visible={passwordModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => !savingPassword && setPasswordModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
          style={styles.modalKeyboard}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
            >
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderCopy}>
                  <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                    {passwordMode === 'set'
                      ? 'Set app credential'
                      : passwordLockType === 'password'
                        ? 'Disable app password'
                        : 'Disable app PIN'}
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                    {passwordMode === 'set'
                      ? 'Choose a PIN or password to unlock CareSense on this device. It is separate from your CareSense account password.'
                      : passwordLockType === 'password'
                        ? 'Enter your current password to turn off the app lock.'
                        : 'Enter your current PIN to turn off the app lock.'}
                  </Text>
                </View>

                <TouchableOpacity
                  disabled={savingPassword}
                  onPress={() => setPasswordModalVisible(false)}
                  style={[styles.closeButton, { backgroundColor: theme.inputBg }]}
                >
                  <Ionicons name="close" size={19} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              {passwordMode === 'set' ? (
                <>
                  <Text style={[styles.label, { color: theme.textSecondary }]}>Choose how to unlock</Text>
                  <View style={styles.typeRow}>
                    <TouchableOpacity
                      disabled={savingPassword}
                      onPress={() => {
                        setLockTypeDraft('pin');
                        setSecret('');
                        setConfirmSecret('');
                      }}
                      activeOpacity={0.82}
                      style={[
                        styles.typeOption,
                        {
                          backgroundColor:
                            lockTypeDraft === 'pin'
                              ? (isDarkMode ? '#0E2E2C' : '#E7FBF8')
                              : theme.inputBg,
                          borderColor:
                            lockTypeDraft === 'pin'
                              ? theme.accent
                              : theme.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name="keypad-outline"
                        size={18}
                        color={lockTypeDraft === 'pin' ? theme.accent : theme.textSecondary}
                      />
                      <Text style={[styles.typeOptionText, { color: lockTypeDraft === 'pin' ? theme.accent : theme.textSecondary }]}>PIN</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      disabled={savingPassword}
                      onPress={() => {
                        setLockTypeDraft('password');
                        setSecret('');
                        setConfirmSecret('');
                      }}
                      activeOpacity={0.82}
                      style={[
                        styles.typeOption,
                        {
                          backgroundColor:
                            lockTypeDraft === 'password'
                              ? (isDarkMode ? '#0E2E2C' : '#E7FBF8')
                              : theme.inputBg,
                          borderColor:
                            lockTypeDraft === 'password'
                              ? theme.accent
                              : theme.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name="lock-closed-outline"
                        size={18}
                        color={lockTypeDraft === 'password' ? theme.accent : theme.textSecondary}
                      />
                      <Text style={[styles.typeOptionText, { color: lockTypeDraft === 'password' ? theme.accent : theme.textSecondary }]}>Password</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : null}

              <Text style={[styles.label, { color: theme.textSecondary }]}>
                {passwordMode === 'set'
                  ? lockTypeDraft === 'password'
                    ? 'New password'
                    : 'New PIN'
                  : passwordLockType === 'password'
                    ? 'Current password'
                    : 'Current PIN'}
              </Text>

              <TextInput
                value={secret}
                onChangeText={value => {
                  if (
                    passwordMode === 'set' &&
                    lockTypeDraft === 'pin'
                  ) {
                    setSecret(value.replace(/\D/g, '').slice(0, 6));
                  } else {
                    setSecret(value.slice(0, 64));
                  }
                }}
                keyboardType={
                  passwordMode === 'set' && lockTypeDraft === 'pin'
                    ? 'number-pad'
                    : 'default'
                }
                secureTextEntry
                maxLength={
                  passwordMode === 'set' && lockTypeDraft === 'pin'
                    ? 6
                    : 64
                }
                autoCapitalize="none"
                autoCorrect={false}
                placeholder={
                  passwordMode === 'set'
                    ? lockTypeDraft === 'password'
                      ? '8–64 characters'
                      : '4–6 digits'
                    : passwordLockType === 'password'
                      ? 'Enter current password'
                      : 'Enter current PIN'
                }
                placeholderTextColor={theme.textSecondary}
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.inputBg,
                    borderColor: theme.border,
                    color: theme.textPrimary,
                    letterSpacing:
                      passwordMode === 'set' && lockTypeDraft === 'password'
                        ? 1.5
                        : 6,
                  },
                ]}
              />

              {passwordMode === 'set' ? (
                <>
                  <Text style={[styles.helperText, { color: theme.textSecondary }]}>
                    {lockTypeDraft === 'password'
                      ? '8–64 characters. Symbols such as ^ are allowed.'
                      : '4–6 digits only.'}
                  </Text>

                  <Text style={[styles.label, { color: theme.textSecondary }]}>Confirm</Text>
                  <TextInput
                    value={confirmSecret}
                    onChangeText={value => {
                      if (lockTypeDraft === 'pin') {
                        setConfirmSecret(value.replace(/\D/g, '').slice(0, 6));
                      } else {
                        setConfirmSecret(value.slice(0, 64));
                      }
                    }}
                    keyboardType={lockTypeDraft === 'pin' ? 'number-pad' : 'default'}
                    secureTextEntry
                    maxLength={lockTypeDraft === 'pin' ? 6 : 64}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder={lockTypeDraft === 'password' ? 'Confirm password' : 'Confirm PIN'}
                    placeholderTextColor={theme.textSecondary}
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.inputBg,
                        borderColor: theme.border,
                        color: theme.textPrimary,
                        letterSpacing: lockTypeDraft === 'password' ? 1.5 : 6,
                      },
                    ]}
                  />
                </>
              ) : null}

              <TouchableOpacity
                disabled={savingPassword}
                onPress={() => void handlePasswordAction()}
                activeOpacity={0.82}
                style={[
                  styles.saveButton,
                  {
                    backgroundColor: theme.accent,
                    opacity: savingPassword ? 0.65 : 1,
                  },
                ]}
              >
                {savingPassword ? (
                  <ActivityIndicator color="#0A0F1A" />
                ) : (
                  <Ionicons name="lock-closed-outline" size={18} color="#0A0F1A" />
                )}
                <Text style={styles.saveButtonText}>
                  {savingPassword
                    ? 'Saving…'
                    : passwordMode === 'set'
                      ? lockTypeDraft === 'password'
                        ? 'Enable Password Lock'
                        : 'Enable PIN Lock'
                      : passwordLockType === 'password'
                        ? 'Disable Password Lock'
                        : 'Disable PIN Lock'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 132 },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 22 },
  headerButton: { width: 48, height: 48, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 13 },
  headerCopy: { flex: 1 },
  eyebrow: { fontSize: 12.5, fontWeight: '800', letterSpacing: 1.5, marginBottom: 6 },
  title: { fontSize: 31, lineHeight: 36, fontWeight: '800', letterSpacing: -0.6 },
  subtitle: { marginTop: 7, fontSize: 14, lineHeight: 21 },
  statusCard: { borderWidth: 1, borderRadius: 20, padding: 15, flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  statusIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  statusCopy: { flex: 1, marginLeft: 12 },
  statusTitle: { fontSize: 15, fontWeight: '800' },
  statusBadge: {
    minWidth: 72,
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  statusText: { fontSize: 12.5, lineHeight: 18, marginTop: 3 },
  sectionTitle: { fontSize: 23, fontWeight: '800', marginBottom: 10 },
  settingRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 18, borderWidth: 1, marginBottom: 11 },
  settingIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  settingCopy: { flex: 1, minWidth: 0, paddingRight: 10 },
  settingTitle: { fontSize: 15, fontWeight: '800', marginBottom: 4 },
  settingSubtitle: { fontSize: 12.5, lineHeight: 18 },
  infoCard: { borderWidth: 1, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'flex-start', marginTop: 6 },
  infoText: { flex: 1, marginLeft: 10, fontSize: 12.5, lineHeight: 19 },
  modalKeyboard: { flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(2,6,23,0.58)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 24 },
  modalCard: { width: '100%', maxWidth: 420, borderRadius: 26, borderWidth: 1, padding: 18, paddingBottom: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 15 },
  modalHeaderCopy: { flex: 1, paddingRight: 8 },
  modalTitle: { fontSize: 21, fontWeight: '800' },
  modalSubtitle: { fontSize: 12.5, lineHeight: 18, marginTop: 4 },
  closeButton: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 12, fontWeight: '700', marginTop: 11, marginBottom: 7 },
  helperText: { fontSize: 11.5, lineHeight: 17, marginTop: -1, marginBottom: 2 },
  typeRow: { flexDirection: 'row', gap: 9, marginBottom: 2 },
  typeOption: { flex: 1, minHeight: 48, borderRadius: 14, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  typeOptionText: { fontSize: 13.5, fontWeight: '800' },
  input: { minHeight: 52, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, fontSize: 18, textAlign: 'center' },
  saveButton: { minHeight: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 20 },
  saveButtonText: { color: '#0A0F1A', fontSize: 14.5, fontWeight: '800' },
});
