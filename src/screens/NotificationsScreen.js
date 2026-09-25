import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  useColorScheme,
  Animated,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getNotificationPermissionStatus,
  requestNotificationPermission,
  cancelAllCareSenseLocalNotifications,
  syncUpcomingAppointmentReminders,
  syncMedicationReminders,
} from '../services/notificationService';

import api, { getRecords } from '../services/api';
import { AuthContext } from '../context/AuthContext';

const STORAGE_KEY = '@caresense_user_settings_v2';

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
  switchTrackActive: isDark ? '#00B3A6' : BRAND.cyan,
  switchTrackInactive: isDark ? '#222E40' : '#E2E8F0',
});

export default function NotificationsScreen({ navigation }) {
  const { user } = React.useContext(AuthContext) || {};
  const isDark = useColorScheme() === 'dark';
  const theme = useMemo(() => getTheme(isDark), [isDark]);

  const [notifications, setNotifications] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setMessage('');

      const [raw, permission] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        getNotificationPermissionStatus(),
      ]);

      const parsed = raw ? JSON.parse(raw) : {};
      const storedPreference =
        typeof parsed.notifications === 'boolean'
          ? parsed.notifications
          : permission.granted;

      setPermissionGranted(Boolean(permission.granted));
      setNotifications(Boolean(permission.granted && storedPreference));
    } catch (error) {
      console.error('Failed to load notification settings:', error);
      setMessage('We could not load your notification settings. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadNotifications();
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
    }, [fadeAnim, slideAnim, loadNotifications]),
  );

  useEffect(() => () => {
    fadeAnim.stopAnimation();
    slideAnim.stopAnimation();
  }, [fadeAnim, slideAnim]);

  const savePreference = useCallback(async enabled => {
    const existing = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = existing ? JSON.parse(existing) : {};
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...parsed,
        notifications: enabled,
      }),
    );
  }, []);

  const syncRealAppointmentReminders = useCallback(async () => {
    const response = await api.get('appointments/', {
      timeout: 10000,
    });

    const payload = response?.data;

    const appointments =
      Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.results)
          ? payload.results
          : [];

    return syncUpcomingAppointmentReminders(
      appointments,
    );
  }, []);

  const syncRealMedicationReminders = useCallback(async () => {
    if (!user?.uid) {
      return {
        scheduled: 0,
        cancelled: 0,
        skipped: 0,
      };
    }

    const response = await getRecords(
      user.uid,
      { force: true },
    );

    const records =
      Array.isArray(response)
        ? response
        : Array.isArray(response?.results)
          ? response.results
          : Array.isArray(response?.records)
            ? response.records
            : Array.isArray(response?.data)
              ? response.data
              : [];

    const medications = [];

    const getSources = record => [
      record?.medicines,
      record?.medications,
      record?.result?.medicines,
      record?.result?.medications,
      record?.triage?.medicines,
      record?.triage?.medications,
      record?.analysis?.medicines,
      record?.analysis?.medications,
    ].filter(Array.isArray);

    records.forEach(record => {
      getSources(record).forEach(source => {
        source.forEach((item, index) => {
          if (typeof item === 'string') {
            const name = item.trim();
            if (name) {
              medications.push({
                id: `${record?.id || 'record'}-${index}-${name}`,
                name,
                time: '',
                status: '',
              });
            }
            return;
          }

          if (!item || typeof item !== 'object') {
            return;
          }

          medications.push({
            id:
              item?.id ??
              item?._id ??
              `${record?.id || 'record'}-${index}-${item?.name || item?.medicine || item?.medication || 'medication'}`,
            name:
              item?.name ||
              item?.medicine ||
              item?.medication ||
              item?.title ||
              'scheduled medication',
            time:
              item?.time ||
              item?.schedule ||
              '',
            status: item?.status || '',
          });
        });
      });
    });

    return syncMedicationReminders(medications);
  }, [user?.uid]);

  const handleNotificationsToggle = useCallback(async enabled => {
    if (actionLoading) {
      return;
    }

    setMessage('');
    setActionLoading(true);

    try {
      if (enabled) {
        const result = await requestNotificationPermission();

        setPermissionGranted(Boolean(result?.granted));

        if (!result?.granted) {
          setNotifications(false);

          if (result?.canAskAgain === false) {
            setMessage('Notifications are blocked for CareSense. Open device settings to allow them.');
          } else {
            setMessage('Notifications were not enabled.');
          }

          return;
        }

        await savePreference(true);
        setNotifications(true);

        try {
          const appointmentResult =
            await syncRealAppointmentReminders();

          const medicationResult =
            await syncRealMedicationReminders();

          const scheduledCount =
            Number(appointmentResult?.scheduled || 0) +
            Number(medicationResult?.scheduled || 0);

          if (scheduledCount > 0) {
            setMessage(
              'Notifications are on. CareSense has set up the reminders it can schedule right now.',
            );
          } else {
            setMessage(
              'Notifications are on. Reminders will be set when CareSense has a time to use.',
            );
          }
        } catch (syncError) {
          console.warn(
            'Unable to sync appointment reminders after enabling notifications:',
            syncError,
          );
          setMessage(
            'Notifications are on, but we could not refresh your appointment reminders right now. Please try again later.',
          );
        }

        return;
      }

      await savePreference(false);
      await cancelAllCareSenseLocalNotifications();
      setNotifications(false);
      setMessage('CareSense reminders are off.');
    } catch (error) {
      console.error('Failed to update notification settings:', error);
      setMessage('We could not change your notification settings. Please try again.');
    } finally {
      setActionLoading(false);
    }
  }, [
    actionLoading,
    savePreference,
    syncRealAppointmentReminders,
    syncRealMedicationReminders,
  ]);

  const handleOpenSettings = useCallback(() => {
    Linking.openSettings().catch(error => {
      console.error('Unable to open device settings:', error);
    });
  }, []);

  const statusTitle =
    notifications && permissionGranted
      ? 'Notifications are on'
      : 'Notifications are off';

  const statusText =
    notifications && permissionGranted
      ? 'CareSense can send reminders and important updates to your phone.'
      : permissionGranted
        ? 'Your phone allows notifications, but CareSense reminders are turned off.'
        : 'CareSense is not allowed to show notifications on your phone.';

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.safeArea, { backgroundColor: theme.background }]}
    >
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.78}
            onPress={() => navigation.goBack()}
            style={[
              styles.headerButton,
              {
                backgroundColor: theme.inputBg,
                borderColor: theme.border,
              },
            ]}
          >
            <Ionicons name="arrow-back" size={22} color={theme.textPrimary} />
          </TouchableOpacity>

          <View style={styles.headerTextWrap}>
            <Text style={[styles.eyebrow, { color: theme.accent }]}>NOTIFICATION SETTINGS</Text>
            <Text style={[styles.title, { color: theme.textPrimary }]}>Notifications</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Choose whether CareSense can send you reminders and important updates.</Text>
          </View>
        </View>

        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={[styles.heroIcon, { backgroundColor: theme.inputBg }]}>
            {loading ? (
              <ActivityIndicator size="small" color={theme.accent} />
            ) : (
              <Ionicons
                name={notifications ? 'notifications' : 'notifications-off-outline'}
                size={28}
                color={theme.accent}
              />
            )}
          </View>

          <View style={styles.heroCopy}>
            <Text style={[styles.heroTitle, { color: theme.textPrimary }]}>CareSense reminders</Text>
            <Text style={[styles.heroSubtitle, { color: theme.textSecondary }]}>Appointment reminders, medicine reminders and important updates.</Text>
          </View>

          <Switch
            value={notifications}
            onValueChange={handleNotificationsToggle}
            disabled={loading || actionLoading}
            trackColor={{
              false: theme.switchTrackInactive,
              true: theme.switchTrackActive,
            }}
          />
        </View>

        <View
          style={[
            styles.statusCard,
            {
              backgroundColor: theme.inputBg,
              borderColor: theme.border,
            },
          ]}
        >
          <View
            style={[
              styles.statusIcon,
              {
                backgroundColor: notifications
                  ? 'rgba(0,212,197,0.12)'
                  : theme.card,
              },
            ]}
          >
            <Ionicons
              name={notifications ? 'checkmark-circle-outline' : 'pause-circle-outline'}
              size={22}
              color={notifications ? theme.accent : theme.textSecondary}
            />
          </View>

          <View style={styles.statusCopy}>
            <Text style={[styles.statusTitle, { color: theme.textPrimary }]}>{statusTitle}</Text>
            <Text style={[styles.statusText, { color: theme.textSecondary }]}>{statusText}</Text>
          </View>
        </View>

        <View style={[styles.typesCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.typesTitle, { color: theme.textPrimary }]}>What you will receive</Text>

          {[
            ['calendar-outline', 'Appointments', 'Booking confirmations, changes, and reminders.'],
            ['medical-outline', 'Medication reminders', 'Reminders to take your medicines at your scheduled times.'],
            ['shield-checkmark-outline', 'Important CareSense alerts', 'Important CareSense account, app, and health updates.'],
          ].map(([icon, title, description]) => (
            <View key={title} style={styles.typeRow}>
              <View style={[styles.typeIcon, { backgroundColor: theme.inputBg }]}>
                <Ionicons name={icon} size={18} color={theme.accent} />
              </View>
              <View style={styles.typeCopy}>
                <Text style={[styles.typeTitle, { color: theme.textPrimary }]}>{title}</Text>
                <Text style={[styles.typeDescription, { color: theme.textSecondary }]}>{description}</Text>
              </View>
            </View>
          ))}
        </View>

        {message ? (
          <View style={[styles.messageCard, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
            <Ionicons name="information-circle-outline" size={19} color={theme.accent} />
            <Text style={[styles.messageText, { color: theme.textSecondary }]}>{message}</Text>
          </View>
        ) : null}

        {!permissionGranted ? (
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={handleOpenSettings}
            style={[styles.settingsButton, { borderColor: theme.border }]}
          >
            <Ionicons name="settings-outline" size={18} color={theme.accent} />
            <Text style={[styles.settingsButtonText, { color: theme.textPrimary }]}>Open phone notification settings</Text>
          </TouchableOpacity>
        ) : null}

        <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="information-circle-outline" size={20} color={theme.accent} />
          <Text style={[styles.infoText, { color: theme.textSecondary }]}>You can change this anytime in your phone settings. CareSense only sends notifications you allow.</Text>
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 100 },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 22 },
  headerButton: { width: 46, height: 46, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  headerTextWrap: { flex: 1, paddingTop: 1 },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 4 },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, lineHeight: 19, marginTop: 5 },
  heroCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 22, borderWidth: 1 },
  heroIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  heroCopy: { flex: 1, paddingHorizontal: 13 },
  heroTitle: { fontSize: 16, fontWeight: '800' },
  heroSubtitle: { fontSize: 12.5, lineHeight: 18, marginTop: 4 },
  statusCard: { flexDirection: 'row', alignItems: 'center', marginTop: 12, padding: 15, borderRadius: 18, borderWidth: 1 },
  statusIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  statusCopy: { flex: 1, paddingLeft: 12 },
  statusTitle: { fontSize: 14, fontWeight: '800' },
  statusText: { fontSize: 12, lineHeight: 18, marginTop: 3 },
  typesCard: { marginTop: 12, padding: 16, borderRadius: 20, borderWidth: 1 },
  typesTitle: { fontSize: 15, fontWeight: '800', marginBottom: 5 },
  typeRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 15 },
  typeIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  typeCopy: { flex: 1, paddingLeft: 11 },
  typeTitle: { fontSize: 13.5, fontWeight: '800' },
  typeDescription: { fontSize: 12, lineHeight: 18, marginTop: 3 },
  messageCard: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 12, padding: 14, borderRadius: 16, borderWidth: 1 },
  messageText: { flex: 1, fontSize: 12, lineHeight: 18, marginLeft: 9 },
  settingsButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 48, marginTop: 12, borderRadius: 15, borderWidth: 1, paddingHorizontal: 16 },
  settingsButtonText: { marginLeft: 8, fontSize: 13, fontWeight: '800' },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 12, padding: 14, borderRadius: 16, borderWidth: 1 },
  infoText: { flex: 1, fontSize: 12, lineHeight: 18, marginLeft: 10 },
});
