import React, { useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AuthContext } from '../context/AuthContext';

const BRAND = { cyan: '#00D4C5', darkBg: '#0A0F1A', darkCard: '#141C29', darkBorder: '#222E40', lightBg: '#F8F9FB', lightCard: '#FFFFFF', lightBorder: '#E2E8F0' };
const getTheme = isDark => ({ background: isDark ? BRAND.darkBg : BRAND.lightBg, card: isDark ? BRAND.darkCard : BRAND.lightCard, border: isDark ? BRAND.darkBorder : BRAND.lightBorder, inputBg: isDark ? '#1C2738' : '#F1F5F9', textPrimary: isDark ? '#FFFFFF' : '#111827', textSecondary: isDark ? '#8897AE' : '#64748B', accent: BRAND.cyan });

export default function AppSettingsScreen({ navigation }) {
  const { isDarkMode } = useContext(AuthContext) || {};
  const systemDark = useColorScheme() === 'dark';
  const dark = typeof isDarkMode === 'boolean' ? isDarkMode : systemDark;
  const theme = useMemo(() => getTheme(dark), [dark]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

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
          <View style={styles.headerCopy}><Text style={[styles.eyebrow, { color: theme.accent }]}>PREFERENCES</Text><Text style={[styles.title, { color: theme.textPrimary }]}>App Settings</Text><Text style={[styles.subtitle, { color: theme.textSecondary }]}>General CareSense app behavior and device appearance.</Text></View>
        </View>

        <View style={[styles.hero, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
          <View style={[styles.heroIcon, { backgroundColor: theme.card }]}><Ionicons name="options-outline" size={27} color={theme.accent} /></View>
          <View style={styles.heroCopy}><Text style={[styles.heroTitle, { color: theme.textPrimary }]}>App preferences</Text><Text style={[styles.heroText, { color: theme.textSecondary }]}>Focused controls stay in their dedicated Settings sections so this screen remains simple.</Text></View>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>General</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.row}>
            <View style={[styles.iconBox, { backgroundColor: theme.inputBg }]}><Ionicons name="phone-portrait-outline" size={21} color={theme.accent} /></View>
            <View style={styles.rowCopy}><Text style={[styles.rowTitle, { color: theme.textPrimary }]}>Appearance</Text><Text style={[styles.rowText, { color: theme.textSecondary }]}>CareSense follows your device appearance automatically.</Text></View>
            <View style={[styles.statusPill, { backgroundColor: theme.inputBg }]}><Text style={[styles.statusText, { color: theme.textSecondary }]}>Device</Text></View>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginTop: 24 }]}>Dedicated controls</Text>
        <View style={styles.list}>
          <NavRow icon="notifications-outline" title="Notifications" subtitle="Alerts, reminders and health updates." onPress={() => navigation.navigate('Notifications')} theme={theme} />
          <NavRow icon="shield-checkmark-outline" title="Privacy & Security" subtitle="Face/biometric lock, password lock and data sharing." onPress={() => navigation.navigate('PrivacySecurity')} theme={theme} />
        </View>

        <View style={[styles.note, { backgroundColor: theme.inputBg, borderColor: theme.border }]}><Ionicons name="information-circle-outline" size={19} color={theme.accent} /><Text style={[styles.noteText, { color: theme.textSecondary }]}>Emergency Contact and Connected Devices now have their own Care & Safety screens.</Text></View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

function NavRow({ icon, title, subtitle, onPress, theme }) {
  return <TouchableOpacity onPress={onPress} activeOpacity={0.78} style={[styles.navRow, { backgroundColor: theme.card, borderColor: theme.border }]}><View style={[styles.iconBox, { backgroundColor: theme.inputBg }]}><Ionicons name={icon} size={21} color={theme.accent} /></View><View style={styles.rowCopy}><Text style={[styles.rowTitle, { color: theme.textPrimary }]}>{title}</Text><Text style={[styles.rowText, { color: theme.textSecondary }]}>{subtitle}</Text></View><View style={[styles.chevron, { backgroundColor: theme.inputBg }]}><Ionicons name="chevron-forward" size={17} color={theme.textSecondary} /></View></TouchableOpacity>;
}

const styles = StyleSheet.create({ safeArea: { flex: 1 }, content: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 132 }, header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 22 }, headerButton: { width: 48, height: 48, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 13 }, headerCopy: { flex: 1 }, eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 1.5, marginBottom: 5 }, title: { fontSize: 31, lineHeight: 37, fontWeight: '800', letterSpacing: -0.7 }, subtitle: { fontSize: 14, lineHeight: 21, marginTop: 6 }, hero: { borderRadius: 20, borderWidth: 1, padding: 15, flexDirection: 'row', alignItems: 'center', marginBottom: 22 }, heroIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, heroCopy: { flex: 1, marginLeft: 12 }, heroTitle: { fontSize: 15.5, fontWeight: '800' }, heroText: { fontSize: 12.5, lineHeight: 18, marginTop: 3 }, sectionTitle: { fontSize: 23, fontWeight: '800', marginBottom: 10 }, card: { borderWidth: 1, borderRadius: 20, padding: 15 }, row: { flexDirection: 'row', alignItems: 'center' }, navRow: { minHeight: 86, borderRadius: 18, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 10 }, iconBox: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, rowCopy: { flex: 1, minWidth: 0, marginLeft: 12, paddingRight: 8 }, rowTitle: { fontSize: 15.5, fontWeight: '800' }, rowText: { fontSize: 12.5, lineHeight: 19, marginTop: 3 }, statusPill: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999 }, statusText: { fontSize: 10.5, fontWeight: '700' }, chevron: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }, list: { gap: 0 }, note: { marginTop: 6, borderWidth: 1, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'flex-start' }, noteText: { flex: 1, marginLeft: 10, fontSize: 12.5, lineHeight: 19 } });
