import React, {
  useCallback,
  useMemo,
  useRef,
  useEffect,
  useContext,
} from 'react';

import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
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
  inputBg: isDark ? '#1C2738' : '#F1F5F9',
  textPrimary: isDark ? '#FFFFFF' : '#111827',
  textSecondary: isDark ? '#8897AE' : '#64748B',
  accent: BRAND.cyan,
});

const HELP_TOPICS = [
  {
    icon: 'person-circle-outline',
    title: 'Profile & health information',
    text: 'Update your profile photo, personal details, physical measurements, medical conditions, medications and allergies from Settings.',
  },
  {
    icon: 'sparkles-outline',
    title: 'Symptoms & AI guidance',
    text: 'Describe your symptoms clearly and include useful details such as when they started, how severe they are and what has changed.',
  },
  {
    icon: 'calendar-outline',
    title: 'Appointments',
    text: 'Use Appointments to review upcoming care, book available appointments, and manage existing appointments.',
  },
  {
    icon: 'shield-checkmark-outline',
    title: 'Privacy & security',
    text: 'Use Privacy & Security to manage biometric protection, Face Lock, PIN protection and data-sharing preferences.',
  },
  {
    icon: 'watch-outline',
    title: 'Connected devices',
    text: 'Connected Devices stores device profiles under the currently signed-in CareSense account. Hardware pairing is separate from these saved profiles.',
  },
];

export default function HelpSupportScreen({ navigation }) {
  const { fullName, user, isDarkMode } = useContext(AuthContext) || {};
  const theme = useMemo(
    () => getTheme(Boolean(isDarkMode)),
    [isDarkMode],
  );

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useFocusEffect(
    useCallback(() => {
      fadeAnim.setValue(0);
      slideAnim.setValue(16);

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

  useEffect(
    () => () => {
      fadeAnim.stopAnimation();
      slideAnim.stopAnimation();
    },
    [fadeAnim, slideAnim],
  );

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.safeArea, { backgroundColor: theme.background }]}
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
              size={22}
              color={theme.textPrimary}
            />
          </TouchableOpacity>

          <View style={styles.headerCopy}>
            <Text style={[styles.eyebrow, { color: theme.accent }]}>SUPPORT</Text>
            <Text style={[styles.title, { color: theme.textPrimary }]}>Help & support</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Get practical guidance for using CareSense and a separate path to contact support.</Text>
          </View>
        </View>

        <View
          style={[
            styles.accountCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={[styles.accountIcon, { backgroundColor: theme.inputBg }]}>
            <Ionicons
              name="person-circle-outline"
              size={25}
              color={theme.accent}
            />
          </View>
          <View style={styles.accountCopy}>
            <Text
              style={[styles.accountTitle, { color: theme.textPrimary }]}
              numberOfLines={1}
            >
              {fullName || 'CareSense user'}
            </Text>
            <Text
              style={[styles.accountSubtitle, { color: theme.textSecondary }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {user?.email || 'No email available'}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.hero,
            {
              backgroundColor: theme.inputBg,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={[styles.heroIcon, { backgroundColor: theme.card }]}>
            <Ionicons
              name="help-circle-outline"
              size={27}
              color={theme.accent}
            />
          </View>
          <View style={styles.heroCopy}>
            <Text style={[styles.heroTitle, { color: theme.textPrimary }]}>Need help using CareSense?</Text>
            <Text style={[styles.heroText, { color: theme.textSecondary }]}>Use the guides below for the most common parts of the app.</Text>
          </View>
        </View>

        <View style={styles.topicList}>
          {HELP_TOPICS.map(topic => (
            <View
              key={topic.title}
              style={[
                styles.topicCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
            >
              <View style={[styles.iconBox, { backgroundColor: theme.inputBg }]}>
                <Ionicons
                  name={topic.icon}
                  size={22}
                  color={theme.accent}
                />
              </View>
              <View style={styles.topicCopy}>
                <Text style={[styles.topicTitle, { color: theme.textPrimary }]}>{topic.title}</Text>
                <Text style={[styles.topicText, { color: theme.textSecondary }]}>{topic.text}</Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate('ContactSupport')}
          activeOpacity={0.82}
          style={[styles.supportButton, { backgroundColor: theme.accent }]}
        >
          <Ionicons name="mail-outline" size={19} color="#0A0F1A" />
          <View style={styles.supportButtonCopy}>
            <Text style={styles.supportButtonTitle}>Contact support</Text>
            <Text style={styles.supportButtonText}>Open the dedicated support request screen.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#0A0F1A" />
        </TouchableOpacity>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 132 },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18 },
  headerButton: { width: 48, height: 48, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 13 },
  headerCopy: { flex: 1 },
  eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 1.5, marginBottom: 5 },
  title: { fontSize: 31, lineHeight: 37, fontWeight: '800', letterSpacing: -0.7 },
  subtitle: { fontSize: 14, lineHeight: 21, marginTop: 6 },
  accountCard: { borderWidth: 1, borderRadius: 18, padding: 13, flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  accountIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  accountCopy: { flex: 1, minWidth: 0, marginLeft: 11 },
  accountTitle: { fontSize: 14, lineHeight: 18, fontWeight: '800' },
  accountSubtitle: { fontSize: 10.8, lineHeight: 15, marginTop: 3 },
  hero: { borderWidth: 1, borderRadius: 20, padding: 15, flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  heroIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  heroCopy: { flex: 1, marginLeft: 12 },
  heroTitle: { fontSize: 15.5, lineHeight: 20, fontWeight: '800' },
  heroText: { fontSize: 12.2, lineHeight: 18, marginTop: 3 },
  topicList: { gap: 10 },
  topicCard: { borderWidth: 1, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'flex-start' },
  iconBox: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  topicCopy: { flex: 1, minWidth: 0, marginLeft: 12 },
  topicTitle: { fontSize: 15, lineHeight: 19, fontWeight: '800' },
  topicText: { fontSize: 12.1, lineHeight: 18, marginTop: 4 },
  supportButton: { minHeight: 64, borderRadius: 18, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  supportButtonCopy: { flex: 1, minWidth: 0, marginLeft: 10, marginRight: 8 },
  supportButtonTitle: { color: '#0A0F1A', fontSize: 15, lineHeight: 19, fontWeight: '800' },
  supportButtonText: { color: 'rgba(10,15,26,0.70)', fontSize: 11.5, lineHeight: 16, marginTop: 2 },
});
