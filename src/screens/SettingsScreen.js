import React, { useContext, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  useColorScheme,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AuthContext } from '../context/AuthContext';

const BRAND = {
  cyan: '#00D4C5',
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
  textPrimary: isDark ? '#FFFFFF' : '#111827',
  textSecondary: isDark ? '#8897AE' : '#64748B',
  inputBg: isDark ? '#1C2738' : '#F1F5F9',
  accent: BRAND.cyan,
});

const getInitials = name => {
  const clean = String(name || '').trim();
  if (!clean) return 'U';
  const parts = clean.split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
};

const calculateCompletion = profile => {
  const values = [
    profile?.first_name,
    profile?.date_of_birth,
    profile?.gender,
    profile?.height_cm,
    profile?.weight_kg,
    profile?.blood_type,
    profile?.allergies !== undefined ? true : null,
    profile?.emergency_contact_name,
  ];

  const completed = values.filter(value => value !== null && value !== undefined && value !== '').length;
  return Math.round((completed / values.length) * 100);
};

function SettingsSectionTitle({ title, theme }) {
  return (
    <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
      {title}
    </Text>
  );
}

function SettingsCard({
  icon,
  title,
  subtitle,
  theme,
  onPress,
  tone = 'accent',
  meta,
  imageUri,
  initials,
}) {
  const iconColor = tone === 'danger' ? '#EF4444' : theme.accent;
  const iconBackground = tone === 'danger'
    ? 'rgba(239, 68, 68, 0.10)'
    : theme.inputBg;

  return (
    <TouchableOpacity
      activeOpacity={0.78}
      onPress={onPress}
      style={[
        styles.menuCard,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
        },
      ]}
    >
      <View style={[styles.menuIcon, { backgroundColor: iconBackground }]}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.menuAvatarImage} />
        ) : initials ? (
          <Text style={[styles.menuAvatarText, { color: theme.accent }]}>{initials}</Text>
        ) : (
          <Ionicons name={icon} size={22} color={iconColor} />
        )}
      </View>

      <View style={styles.menuContent}>
        <View style={styles.menuTitleRow}>
          <Text
            style={[styles.menuTitle, { color: theme.textPrimary }]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {meta ? (
            <View style={[styles.metaPill, { backgroundColor: theme.inputBg }]}>
              <Text style={[styles.metaText, { color: theme.textSecondary }]} numberOfLines={1}>
                {meta}
              </Text>
            </View>
          ) : null}
        </View>

        <Text
          style={[styles.menuSubtitle, { color: theme.textSecondary }]}
          numberOfLines={2}
        >
          {subtitle}
        </Text>
      </View>

      <View style={[styles.chevronBox, { backgroundColor: theme.inputBg }]}>
        <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
      </View>
    </TouchableOpacity>
  );
}

export default function SettingsScreen({ navigation }) {
  const { user, profile, fullName, profilePhoto, profileError } = useContext(AuthContext) || {};
  const systemScheme = useColorScheme();
  const isDark = systemScheme === 'dark';
  const theme = useMemo(() => getTheme(isDark), [isDark]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(14)).current;

  useFocusEffect(
    React.useCallback(() => {
      fadeAnim.setValue(0);
      slideAnim.setValue(14);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 260,
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

  useEffect(() => () => {
    fadeAnim.stopAnimation();
    slideAnim.stopAnimation();
  }, [fadeAnim, slideAnim]);

  const currentProfile = profile || {};
  const displayName = fullName || user?.displayName || user?.name || user?.email?.split('@')[0] || 'User';
  const initials = getInitials(displayName);
  const completion = calculateCompletion(currentProfile);
  const photo = profilePhoto || currentProfile.profile_photo_url || currentProfile.photo_url || null;

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View style={styles.headerTextWrap}>
            <Text style={[styles.eyebrow, { color: theme.accent }]}>CARESENSE AI</Text>
            <Text style={[styles.title, { color: theme.textPrimary }]}>Settings</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Manage your account, health preferences, privacy and app experience.
            </Text>
          </View>
          <View style={[styles.headerIcon, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
            <Ionicons name="settings-outline" size={23} color={theme.accent} />
          </View>
        </View>


        <View style={styles.sectionBlock}>
          <SettingsSectionTitle title="Account & Health" theme={theme} />

          <SettingsCard
            icon="person-circle-outline"
            title="Profile / Account"
            subtitle="Identity, email verification, profile photo and account details."
            theme={theme}
            onPress={() => navigation.navigate('ProfileAccount')}
            imageUri={photo}
            initials={initials}
          />

          <SettingsCard
            icon="heart-outline"
            title="Health Information"
            subtitle="Physical summary, medical details, medications and allergies."
            theme={theme}
            onPress={() => navigation.navigate('HealthInformation')}
            meta="Health"
          />
        </View>

        <View style={styles.sectionBlock}>
          <SettingsSectionTitle title="Preferences" theme={theme} />

          <SettingsCard
            icon="options-outline"
            title="App Settings"
            subtitle="Biometric protection and general CareSense app controls."
            theme={theme}
            onPress={() => navigation.navigate('AppSettings')}
            meta="App"
          />

          <SettingsCard
            icon="notifications-outline"
            title="Notifications"
            subtitle="Manage CareSense alerts, reminders and health updates."
            theme={theme}
            onPress={() => navigation.navigate('Notifications')}
            meta="Alerts"
          />

          <SettingsCard
            icon="shield-checkmark-outline"
            title="Privacy & Security"
            subtitle="Biometric protection, data sharing and security controls."
            theme={theme}
            onPress={() => navigation.navigate('PrivacySecurity')}
          />
        </View>

        <View style={styles.sectionBlock}>
          <SettingsSectionTitle title="Care & Safety" theme={theme} />

          <SettingsCard
            icon="person-add-outline"
            title="Emergency Contact"
            subtitle="Manage the trusted person available for urgent situations."
            theme={theme}
            onPress={() => navigation.navigate('EmergencyContact')}
            tone="danger"
          />

          <SettingsCard
            icon="watch-outline"
            title="Connected Devices"
            subtitle="Manage saved health-device profiles such as watches and monitors."
            theme={theme}
            onPress={() => navigation.navigate('ConnectedDevices')}
          />
        </View>

        <View style={styles.sectionBlock}>
          <SettingsSectionTitle title="Support" theme={theme} />

          <SettingsCard
            icon="help-circle-outline"
            title="Help / Support"
            subtitle="Get assistance and find useful information about using CareSense."
            theme={theme}
            onPress={() => navigation.navigate('HelpSupport')}
          />

          <SettingsCard
            icon="information-circle-outline"
            title="About"
            subtitle="Learn about CareSense AI, app information and future updates."
            theme={theme}
            onPress={() => navigation.navigate('About')}
          />
        </View>

        <View style={[styles.footer, { borderTopColor: theme.border }]}>
          <Ionicons name="heart-outline" size={16} color={theme.accent} />
          <Text style={[styles.footerText, { color: theme.textSecondary }]}>CareSense AI • Your health, organized.</Text>
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 132 },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  headerTextWrap: { flex: 1, paddingRight: 12 },
  eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 1.5, marginBottom: 5 },
  title: { fontSize: 34, fontWeight: '800', letterSpacing: -0.7 },
  subtitle: { fontSize: 14, lineHeight: 20, marginTop: 5, maxWidth: 330 },
  headerIcon: { width: 48, height: 48, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  menuAvatarImage: { width: '100%', height: '100%', borderRadius: 16 },
  menuAvatarText: { fontSize: 18, fontWeight: '800' },
  sectionBlock: { marginBottom: 8 },
  sectionTitle: { fontSize: 20, fontWeight: '800', marginBottom: 10, marginTop: 8 },
  menuCard: { flexDirection: 'row', alignItems: 'center', minHeight: 88, padding: 14, borderRadius: 20, borderWidth: 1, marginBottom: 10 },
  menuIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 13 },
  menuContent: { flex: 1, minWidth: 0 },
  menuTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  menuTitle: { flex: 1, fontSize: 16, fontWeight: '800' },
  menuSubtitle: { fontSize: 12.5, lineHeight: 18, marginTop: 4, paddingRight: 4 },
  metaPill: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, maxWidth: 90 },
  metaText: { fontSize: 10, fontWeight: '700' },
  chevronBox: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  footer: { marginTop: 10, paddingTop: 18, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  footerText: { fontSize: 11, fontWeight: '600' },
});
