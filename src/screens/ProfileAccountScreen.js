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
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { AuthContext } from '../context/AuthContext';
import { PopupContext } from '../context/PopupContext';
import { uploadProfileImage } from '../services/cloudinary';

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
  shadow: isDark ? '#000000' : '#64748B',
});

const formatValue = (value, fallback = 'Not set') => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  return String(value);
};

const getInitials = name => {
  const clean = String(name || '').trim();
  if (!clean) return 'U';
  const parts = clean.split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
};


export default function ProfileAccountScreen({ navigation }) {
  const {
    user,
    profile,
    profileLoading,
    profileError,
    refreshProfile,
    saveProfile,
    fullName,
    profilePhoto,
    logout,
    isDarkMode,
  } = useContext(AuthContext) || {};

  const { showPopup } = useContext(PopupContext) || {};
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;

  const isDark = Boolean(isDarkMode);
  const theme = useMemo(() => getTheme(isDark), [isDark]);
  const currentProfile = profile || {};

  const displayName =
    fullName ||
    user?.displayName ||
    user?.name ||
    user?.email?.split('@')[0] ||
    'User';

  const initials = getInitials(displayName);
  const effectivePhoto = previewPhoto || profilePhoto || null;
  const completionFields = [
    currentProfile.first_name || user?.displayName,
    currentProfile.date_of_birth,
    currentProfile.gender,
    currentProfile.height_cm,
    currentProfile.weight_kg,
    currentProfile.blood_type,
    currentProfile.allergies !== undefined,
    currentProfile.emergency_contact_name,
  ];

  const completedFields = completionFields.filter(
    value => value !== null && value !== undefined && value !== '',
  ).length;

  const profileCompletion = Math.round(
    (completedFields / completionFields.length) * 100,
  );

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

  const handleRefresh = useCallback(async () => {
    if (!refreshProfile || refreshing) return;
    try {
      setRefreshing(true);
      await refreshProfile();
    } catch (error) {
      console.error('Profile refresh failed:', error);
      showPopup?.(
        'Profile refresh failed',
        'We could not refresh your profile right now. Please try again.',
        'error',
      );
    } finally {
      setRefreshing(false);
    }
  }, [refreshProfile, refreshing, showPopup]);

  const handlePickImage = useCallback(async () => {
    if (uploadingPhoto) return;

    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        showPopup?.(
          'Photo permission needed',
          'CareSense needs photo-library access only when you choose a profile picture.',
          'warning',
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (result.canceled || !result.assets?.length) return;

      const selectedUri = result.assets[0].uri;
      setPreviewPhoto(selectedUri);
      setUploadingPhoto(true);

      const uploaded = await uploadProfileImage(selectedUri);

      if (!uploaded?.secure_url) {
        throw new Error('Cloudinary did not return a profile image URL.');
      }

      await saveProfile?.({
        profile_photo_url: uploaded.secure_url,
      });

      setPreviewPhoto(null);

      showPopup?.(
        'Profile photo updated',
        'Your profile picture has been saved successfully.',
        'success',
      );
    } catch (error) {
      console.error('Profile photo update error:', error);
      setPreviewPhoto(null);

      showPopup?.(
        'Photo update failed',
        error?.message || 'Unable to update your profile picture right now.',
        'error',
      );
    } finally {
      setUploadingPhoto(false);
    }
  }, [saveProfile, showPopup, uploadingPhoto]);

  const handleLogout = useCallback(() => {
    showPopup?.(
      'Sign out?',
      'Are you sure you want to sign out of CareSense AI?',
      'warning',
      async () => {
        try {
          await logout?.();
        } catch (error) {
          console.error('Sign out failed:', error);
          showPopup?.(
            'Sign out failed',
            'Unable to sign out right now.',
            'error',
          );
        }
      },
    );
  }, [logout, showPopup]);

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.safeArea, { backgroundColor: theme.background }]}
    >
      <Animated.ScrollView
        style={{
          flex: 1,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
            style={[styles.backButton, { backgroundColor: theme.inputBg, borderColor: theme.border }]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={20} color={theme.textPrimary} />
          </TouchableOpacity>

          <View style={styles.headerCopy}>
            <Text style={[styles.eyebrow, { color: theme.accent }]}>PROFILE & ACCOUNT</Text>
            <Text style={[styles.title, { color: theme.textPrimary }]}>Your CareSense profile</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Manage your account identity and profile picture.</Text>
          </View>

          <TouchableOpacity
            onPress={handleRefresh}
            disabled={refreshing || profileLoading}
            activeOpacity={0.8}
            style={[styles.refreshButton, { backgroundColor: theme.inputBg, borderColor: theme.border }]}
          >
            {refreshing || profileLoading ? (
              <ActivityIndicator size="small" color={theme.accent} />
            ) : (
              <Ionicons name="refresh" size={19} color={theme.accent} />
            )}
          </TouchableOpacity>
        </View>

        <View style={[styles.profileCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.profileTopRow}>
            <TouchableOpacity
              onPress={handlePickImage}
              disabled={uploadingPhoto}
              activeOpacity={0.82}
              style={styles.avatarContainer}
              accessibilityRole="button"
              accessibilityLabel="Change profile picture"
            >
              <View style={[styles.avatarWrapper, { borderColor: theme.accent }]}>
                {effectivePhoto ? (
                  <Image source={{ uri: effectivePhoto }} style={styles.avatarImage} />
                ) : (
                  <View style={[styles.avatarFallback, { backgroundColor: theme.inputBg }]}>
                    <Text style={[styles.avatarFallbackText, { color: theme.accent }]}>{initials}</Text>
                  </View>
                )}
              </View>

              <View style={[styles.cameraBadge, { backgroundColor: theme.accent }]}>
                {uploadingPhoto ? (
                  <ActivityIndicator size="small" color="#0A0F1A" />
                ) : (
                  <Ionicons name="camera" size={14} color="#0A0F1A" />
                )}
              </View>
            </TouchableOpacity>

            <View style={styles.identityBlock}>
              <Text style={[styles.userName, { color: theme.textPrimary }]} numberOfLines={2}>{displayName}</Text>
              <Text style={[styles.userEmail, { color: theme.textSecondary }]} numberOfLines={1}>{user?.email || 'No email address'}</Text>

              <View style={[styles.syncBadge, { backgroundColor: profileError ? theme.dangerBg : theme.successBg }]}>
                <View style={[styles.statusDot, { backgroundColor: profileError ? BRAND.red : theme.accent }]} />
                <Text style={[styles.syncText, { color: profileError ? BRAND.red : theme.accent }]}>
                  {profileError ? 'Profile sync delayed' : 'Profile synced'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.completionBlock}>
            <View style={styles.completionRow}>
              <Text style={[styles.completionLabel, { color: theme.textPrimary }]}>Profile completion</Text>
              <Text style={[styles.completionPercent, { color: theme.accent }]}>{profileCompletion}%</Text>
            </View>

            <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
              <View style={[styles.progressFill, { width: `${profileCompletion}%`, backgroundColor: theme.accent }]} />
            </View>

            <Text style={[styles.completionHint, { color: theme.textSecondary }]}>Complete your profile to make CareSense more personalized.</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Account</Text>

        <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <InfoRow icon="mail-outline" label="Email" value={user?.email || 'Not available'} theme={theme} />
          <InfoRow icon="shield-checkmark-outline" label="Authentication" value={user?.emailVerified ? 'Email verified' : 'Email verification pending'} theme={theme} />
          <InfoRow icon="cloud-done-outline" label="Profile storage" value="Secure backend profile" theme={theme} last />
        </View>

        <View style={[styles.quickCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.quickIcon, { backgroundColor: theme.inputBg }]}>
            <Ionicons name="heart-outline" size={20} color={theme.accent} />
          </View>
          <View style={styles.quickCopy}>
            <Text style={[styles.quickTitle, { color: theme.textPrimary }]}>Health information</Text>
            <Text style={[styles.quickText, { color: theme.textSecondary }]}>Your health details remain in Settings so they can be updated together.</Text>
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.logoutButton, { backgroundColor: theme.dangerBg, borderColor: BRAND.red }]}
            activeOpacity={0.82}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color={BRAND.red} style={{ marginRight: 8 }} />
            <Text style={[styles.logoutText, { color: BRAND.red }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value, theme, last = false }) {
  return (
    <View style={[styles.infoRow, { borderBottomColor: theme.border, borderBottomWidth: last ? 0 : 1 }]}>
      <View style={[styles.infoIcon, { backgroundColor: theme.inputBg }]}>
        <Ionicons name={icon} size={18} color={theme.accent} />
      </View>
      <View style={styles.infoCopy}>
        <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: theme.textPrimary }]} numberOfLines={3}>{formatValue(value)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  backButton: { width: 42, height: 42, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  headerCopy: { flex: 1, minWidth: 0 },
  eyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 3 },
  title: { fontSize: 23, fontWeight: '800', letterSpacing: -0.4 },
  subtitle: { fontSize: 12.5, lineHeight: 18, marginTop: 4 },
  refreshButton: { width: 42, height: 42, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
  profileCard: { borderRadius: 22, borderWidth: 1, padding: 18 },
  profileTopRow: { flexDirection: 'row', alignItems: 'center' },
  avatarContainer: { position: 'relative', marginRight: 15 },
  avatarWrapper: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, padding: 3, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 44 },
  avatarFallback: { width: '100%', height: '100%', borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  avatarFallbackText: { fontSize: 28, fontWeight: '800' },
  cameraBadge: { position: 'absolute', right: -2, bottom: 0, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#0A0F1A' },
  identityBlock: { flex: 1, minWidth: 0 },
  userName: { fontSize: 21, fontWeight: '800', marginBottom: 3 },
  userEmail: { fontSize: 12.5, marginBottom: 9 },
  syncBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', borderRadius: 16, paddingHorizontal: 9, paddingVertical: 5 },
  statusDot: { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
  syncText: { fontSize: 10.5, fontWeight: '700' },
  completionBlock: { marginTop: 18 },
  completionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  completionLabel: { fontSize: 12, fontWeight: '700' },
  completionPercent: { fontSize: 12, fontWeight: '800' },
  progressTrack: { height: 8, borderRadius: 6, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 6 },
  completionHint: { fontSize: 11, lineHeight: 16, marginTop: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '800', marginTop: 24, marginBottom: 10 },
  infoCard: { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14 },
  infoIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  infoCopy: { flex: 1, minWidth: 0 },
  infoLabel: { fontSize: 10.5, fontWeight: '700', marginBottom: 3 },
  infoValue: { fontSize: 13.5, lineHeight: 19, fontWeight: '600' },
  quickCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 18, borderWidth: 1, padding: 14, marginTop: 12 },
  quickIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  quickCopy: { flex: 1, minWidth: 0 },
  quickTitle: { fontSize: 13.5, fontWeight: '800', marginBottom: 3 },
  quickText: { fontSize: 11.5, lineHeight: 17 },
  actionsContainer: { marginTop: 24 },
  logoutButton: { minHeight: 52, borderRadius: 15, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  logoutText: { fontSize: 14, fontWeight: '800' },
});
