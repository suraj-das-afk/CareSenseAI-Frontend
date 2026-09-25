import React, { useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { AuthContext } from '../context/AuthContext';

const BRAND = { cyan: '#00D4C5', darkBg: '#0A0F1A', darkCard: '#141C29', darkBorder: '#222E40', lightBg: '#F8F9FB', lightCard: '#FFFFFF', lightBorder: '#E2E8F0' };
const getTheme = isDark => ({ background: isDark ? BRAND.darkBg : BRAND.lightBg, card: isDark ? BRAND.darkCard : BRAND.lightCard, border: isDark ? BRAND.darkBorder : BRAND.lightBorder, inputBg: isDark ? '#1C2738' : '#F1F5F9', textPrimary: isDark ? '#FFFFFF' : '#111827', textSecondary: isDark ? '#8897AE' : '#64748B', accent: BRAND.cyan });

export default function AboutScreen({ navigation }) {
  const { isDarkMode } = useContext(AuthContext) || {};
  const theme = useMemo(() => getTheme(Boolean(isDarkMode)), [isDarkMode]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;
  const version = Constants.expoConfig?.version || '1.0.0';
  useFocusEffect(useCallback(() => {
    fadeAnim.setValue(0); slideAnim.setValue(16);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 320, useNativeDriver: true }),
    ]).start();
    return undefined;
  }, [fadeAnim, slideAnim]));
  useEffect(() => () => { fadeAnim.stopAnimation(); slideAnim.stopAnimation(); }, [fadeAnim, slideAnim]);
  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <Animated.ScrollView showsVerticalScrollIndicator={false} style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.8} style={[styles.headerButton, { backgroundColor: theme.inputBg, borderColor: theme.border }]}><Ionicons name="arrow-back" size={22} color={theme.textPrimary} /></TouchableOpacity>
          <View style={styles.headerCopy}><Text style={[styles.eyebrow, { color: theme.accent }]}>CARESENSE AI</Text><Text style={[styles.title, { color: theme.textPrimary }]}>About</Text><Text style={[styles.subtitle, { color: theme.textSecondary }]}>Information about the CareSense AI application and this build.</Text></View>
        </View>
        <View style={[styles.hero, { backgroundColor: theme.card, borderColor: theme.border }]}><View style={[styles.logoCircle, { backgroundColor: theme.inputBg }]}><Ionicons name="heart-outline" size={34} color={theme.accent} /></View><Text style={[styles.appName, { color: theme.textPrimary }]}>CareSense AI</Text><Text style={[styles.tagline, { color: theme.textSecondary }]}>AI-powered healthcare decision support</Text><View style={[styles.versionPill, { backgroundColor: theme.inputBg }]}><Text style={[styles.versionText, { color: theme.textSecondary }]}>Version {version}</Text></View></View>
        <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}><InfoRow icon="shield-checkmark-outline" title="Designed for decision support" text="CareSense helps organize symptoms, health information, records and care workflows. It does not replace professional medical care." theme={theme} /><InfoRow icon="lock-closed-outline" title="Privacy-first experience" text="Account and health data are managed through the application's authentication and profile systems." theme={theme} /><InfoRow icon="sparkles-outline" title="Built to grow" text="The app architecture is designed to support future care, records, medication and provider features." theme={theme} last /></View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, title, text, theme, last }) {
  return <View style={[styles.infoRow, !last && { borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth }]}><View style={[styles.iconBox, { backgroundColor: theme.inputBg }]}><Ionicons name={icon} size={21} color={theme.accent} /></View><View style={styles.rowCopy}><Text style={[styles.rowTitle, { color: theme.textPrimary }]}>{title}</Text><Text style={[styles.rowText, { color: theme.textSecondary }]}>{text}</Text></View></View>;
}

const styles = StyleSheet.create({ safeArea: { flex: 1 }, content: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 132 }, header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 22 }, headerButton: { width: 48, height: 48, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 13 }, headerCopy: { flex: 1 }, eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 1.5, marginBottom: 5 }, title: { fontSize: 31, lineHeight: 37, fontWeight: '800', letterSpacing: -0.7 }, subtitle: { fontSize: 14, lineHeight: 21, marginTop: 6 }, hero: { borderRadius: 22, borderWidth: 1, padding: 22, alignItems: 'center' }, logoCircle: { width: 74, height: 74, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginBottom: 13 }, appName: { fontSize: 24, fontWeight: '800' }, tagline: { marginTop: 4, fontSize: 13, textAlign: 'center' }, versionPill: { marginTop: 15, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 }, versionText: { fontSize: 11.5, fontWeight: '700' }, infoCard: { borderRadius: 22, borderWidth: 1, marginTop: 16, paddingHorizontal: 14 }, infoRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 16 }, iconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, rowCopy: { flex: 1, marginLeft: 12 }, rowTitle: { fontSize: 15, fontWeight: '800' }, rowText: { fontSize: 12.5, lineHeight: 19, marginTop: 4 } });
