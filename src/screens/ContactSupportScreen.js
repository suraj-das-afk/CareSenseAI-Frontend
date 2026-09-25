import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
  useEffect,
  useContext,
} from 'react';

import {
  ActivityIndicator,
  Animated,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { AuthContext } from '../context/AuthContext';
import { PopupContext } from '../context/PopupContext';

const SUPPORT_EMAIL = String(
  process.env.EXPO_PUBLIC_SUPPORT_EMAIL ||
    'team.caresenseai@gmail.com',
).trim();

const SUPPORT_DRAFT_KEY = '@caresense_support_draft_v1';

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

const CATEGORIES = [
  'General help',
  'Account & login',
  'Health profile',
  'Appointments',
  'Symptoms & AI',
  'Devices',
  'Privacy & security',
  'Something else',
];

export default function ContactSupportScreen({ navigation }) {
  const { user, fullName, profile, isDarkMode } = useContext(AuthContext) || {};
  const { showPopup } = useContext(PopupContext) || {};
  const theme = useMemo(() => getTheme(Boolean(isDarkMode)), [isDarkMode]);

  const [category, setCategory] = useState(CATEGORIES[0]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;
  const categoryScrollRef = useRef(null);
  const [categoryScrollOffset, setCategoryScrollOffset] = useState(0);
  const [categoryViewportWidth, setCategoryViewportWidth] = useState(0);
  const [categoryContentWidth, setCategoryContentWidth] = useState(0);

  const draftKey = `${SUPPORT_DRAFT_KEY}:${user?.uid || 'anonymous'}`;

  const maxCategoryOffset = Math.max(
    0,
    categoryContentWidth - categoryViewportWidth,
  );

  const canScrollCategoryLeft = categoryScrollOffset > 4;
  const canScrollCategoryRight =
    maxCategoryOffset > 4 &&
    categoryScrollOffset < maxCategoryOffset - 4;

  const scrollCategoryBy = useCallback(
    direction => {
      if (!categoryScrollRef.current || !categoryViewportWidth) {
        return;
      }

      const nextOffset = Math.min(
        maxCategoryOffset,
        Math.max(
          0,
          categoryScrollOffset +
            direction * categoryViewportWidth * 0.72,
        ),
      );

      categoryScrollRef.current.scrollTo({
        x: nextOffset,
        y: 0,
        animated: true,
      });
      setCategoryScrollOffset(nextOffset);
    },
    [categoryScrollOffset, categoryViewportWidth, maxCategoryOffset],
  );

  useFocusEffect(
    useCallback(() => {
      fadeAnim.setValue(0);
      slideAnim.setValue(16);

      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 320, useNativeDriver: true }),
      ]).start();

      return undefined;
    }, [fadeAnim, slideAnim]),
  );

  useEffect(() => {
    let active = true;

    const loadDraft = async () => {
      try {
        const raw = await AsyncStorage.getItem(draftKey);
        if (!active || !raw) return;
        const parsed = JSON.parse(raw);
        if (parsed?.category) setCategory(parsed.category);
        if (typeof parsed?.subject === 'string') setSubject(parsed.subject);
        if (typeof parsed?.message === 'string') setMessage(parsed.message);
      } catch {
        // Best-effort draft restore.
      }
    };

    void loadDraft();

    return () => {
      active = false;
      fadeAnim.stopAnimation();
      slideAnim.stopAnimation();
    };
  }, [draftKey, fadeAnim, slideAnim]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void AsyncStorage.setItem(
        draftKey,
        JSON.stringify({ category, subject, message }),
      ).catch(() => {});
    }, 250);

    return () => clearTimeout(timer);
  }, [category, message, subject, draftKey]);

  const sendSupportRequest = useCallback(async () => {
    const cleanSubject = subject.trim();
    const cleanMessage = message.trim();

    if (!cleanSubject || !cleanMessage) {
      showPopup?.(
        'More information needed',
        'Please enter a subject and describe the issue before contacting support.',
        'warning',
      );
      return;
    }

    if (!SUPPORT_EMAIL) {
      showPopup?.(
        'Support inbox not configured',
        'Set EXPO_PUBLIC_SUPPORT_EMAIL for this build before sending support requests.',
        'warning',
      );
      return;
    }

    try {
      setSending(true);

      const accountEmail = user?.email || profile?.email || 'Not available';
      const accountName = fullName || user?.name || 'CareSense user';
      const supportSubject = `[CareSense] ${category}: ${cleanSubject}`;
      const supportBody = [
        'Hello CareSense Support,',
        '',
        cleanMessage,
        '',
        '--- Account details ---',
        `Name: ${accountName}`,
        `Email: ${accountEmail}`,
        `Category: ${category}`,
        `Firebase UID: ${user?.uid || 'Not available'}`,
        '',
        'Sent from CareSense AI Help & Support.',
      ].join('\n');

      const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(supportSubject)}&body=${encodeURIComponent(supportBody)}`;
      await Linking.openURL(mailto);

      await AsyncStorage.removeItem(draftKey);
      setSubject('');
      setMessage('');

      showPopup?.(
        'Support request ready',
        'Your email application has been opened with the CareSense account details attached.',
        'success',
      );
    } catch (error) {
      showPopup?.(
        'Unable to contact support',
        error?.message || 'The support email could not be opened right now.',
        'error',
      );
    } finally {
      setSending(false);
    }
  }, [category, draftKey, fullName, message, profile?.email, showPopup, subject, user?.email, user?.name, user?.uid]);

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
            style={[styles.headerButton, { backgroundColor: theme.inputBg, borderColor: theme.border }]}
          >
            <Ionicons name="arrow-back" size={22} color={theme.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={[styles.eyebrow, { color: theme.accent }]}>SUPPORT</Text>
            <Text style={[styles.title, { color: theme.textPrimary }]}>Contact support</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Send a support request with your current CareSense account context.</Text>
          </View>
        </View>

        <View style={[styles.accountCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.accountIcon, { backgroundColor: theme.inputBg }]}>
            <Ionicons name="person-circle-outline" size={25} color={theme.accent} />
          </View>
          <View style={styles.accountCopy}>
            <Text style={[styles.accountTitle, { color: theme.textPrimary }]} numberOfLines={1}>{fullName || 'CareSense user'}</Text>
            <Text style={[styles.accountSubtitle, { color: theme.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">{user?.email || profile?.email || 'No email available'}</Text>
          </View>
        </View>

        <View style={[styles.infoCard, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
          <Ionicons name="information-circle-outline" size={18} color={theme.accent} />
          <Text style={[styles.infoText, { color: theme.textSecondary }]}>Your name, email, category and Firebase user ID are included automatically in the prepared support message.</Text>
        </View>

        <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Category</Text>
        <View
          style={styles.categoryViewport}
          onLayout={event => {
            setCategoryViewportWidth(event.nativeEvent.layout.width);
          }}
        >
          <ScrollView
            ref={categoryScrollRef}
            horizontal
            nestedScrollEnabled
            scrollEnabled
            directionalLockEnabled
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            decelerationRate="fast"
            bounces
            onContentSizeChange={width => {
              setCategoryContentWidth(width);
            }}
            onScroll={event => {
              setCategoryScrollOffset(event.nativeEvent.contentOffset.x);
            }}
            scrollEventThrottle={16}
            contentContainerStyle={styles.categoryRow}
          >
            {CATEGORIES.map(item => {
              const selected = item === category;

              return (
                <TouchableOpacity
                  key={item}
                  onPress={() => setCategory(item)}
                  activeOpacity={0.8}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: selected
                        ? isDarkMode
                          ? '#0E2E2C'
                          : '#E7FBF8'
                        : theme.inputBg,
                      borderColor: selected
                        ? theme.accent
                        : theme.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      {
                        color: selected
                          ? theme.accent
                          : theme.textSecondary,
                      },
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {canScrollCategoryLeft ? (
              <TouchableOpacity
                onPress={() => scrollCategoryBy(-1)}
                activeOpacity={0.85}
                style={[
                  styles.categoryArrow,
                  styles.categoryArrowLeft,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Ionicons
                  name="chevron-back"
                  size={16}
                  color={theme.textPrimary}
                />
              </TouchableOpacity>
          ) : null}

          {canScrollCategoryRight ? (
              <TouchableOpacity
                onPress={() => scrollCategoryBy(1)}
                activeOpacity={0.85}
                style={[
                  styles.categoryArrow,
                  styles.categoryArrowRight,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={theme.textPrimary}
                />
              </TouchableOpacity>
          ) : null}
        </View>

        <TextInput
          value={subject}
          onChangeText={setSubject}
          placeholder="Subject"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.textPrimary }]}
        />

        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Describe the issue, what you expected, and what happened."
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, styles.messageInput, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.textPrimary }]}
          multiline
          textAlignVertical="top"
        />

        {!SUPPORT_EMAIL ? (
          <View style={[styles.warningBox, { backgroundColor: isDarkMode ? 'rgba(245,158,11,0.10)' : '#FFFBEB', borderColor: isDarkMode ? 'rgba(245,158,11,0.28)' : '#FDE68A' }]}>
            <Ionicons name="warning-outline" size={18} color="#F59E0B" />
            <Text style={[styles.warningText, { color: theme.textSecondary }]}>Support email is not configured in this build. Add EXPO_PUBLIC_SUPPORT_EMAIL before testing the send action.</Text>
          </View>
        ) : null}

        <TouchableOpacity
          disabled={sending}
          onPress={() => void sendSupportRequest()}
          activeOpacity={0.82}
          style={[styles.primaryButton, { backgroundColor: theme.accent, opacity: sending ? 0.65 : 1 }]}
        >
          {sending ? <ActivityIndicator size="small" color="#0A0F1A" /> : <Ionicons name="mail-outline" size={18} color="#0A0F1A" />}
          <Text style={styles.primaryButtonText}>{sending ? 'Preparing…' : 'Open support email'}</Text>
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
  infoCard: { borderWidth: 1, borderRadius: 18, padding: 13, flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  infoText: { flex: 1, marginLeft: 8, fontSize: 11.8, lineHeight: 18 },
  fieldLabel: { fontSize: 12, fontWeight: '700', marginBottom: 8 },
  categoryViewport: {
    position: 'relative',
  },
  categoryRow: {
    paddingRight: 44,
    paddingBottom: 12,
    paddingLeft: 0,
    alignItems: 'center',
  },
  categoryChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginRight: 8,
  },
  categoryArrow: {
    position: 'absolute',
    top: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
    elevation: 4,
  },
  categoryArrowLeft: {
    left: 0,
  },
  categoryArrowRight: {
    right: 0,
  },
  categoryText: { fontSize: 11, fontWeight: '700' },
  input: { minHeight: 50, borderWidth: 1, borderRadius: 15, paddingHorizontal: 14, fontSize: 14.5, marginBottom: 12 },
  messageInput: { minHeight: 150, paddingTop: 12 },
  warningBox: { borderWidth: 1, borderRadius: 15, padding: 12, flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  warningText: { flex: 1, fontSize: 11.5, lineHeight: 17, marginLeft: 8 },
  primaryButton: { minHeight: 50, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, marginTop: 2 },
  primaryButtonText: { fontSize: 14, fontWeight: '800', color: '#0A0F1A', marginLeft: 7 },
});
