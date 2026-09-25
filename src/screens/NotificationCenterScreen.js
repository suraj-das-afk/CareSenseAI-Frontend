import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Animated,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';

import {
  formatDateTime,
  formatRecordDate,
  formatTime,
} from '../utils/dateTime';
import { auth } from '../config/firebase';
import api, { getRecords } from '../services/api';
import {
  getInAppNotifications,
  markAllInAppNotificationsRead,
  markInAppNotificationRead,
  syncMedicationReminders,
  syncUpcomingAppointmentReminders,
} from '../services/notificationService';

const BRAND = {
  cyan: '#00D4C5',
  darkBg: '#0A0F1A',
  darkCard: '#141C29',
  darkBorder: '#222E40',
  lightBg: '#F8F9FB',
  lightCard: '#FFFFFF',
  lightBorder: '#E2E8F0',
};

const ACTIVE_APPOINTMENT_STATUSES = [
  'SCHEDULED',
  'UPCOMING',
  'CONFIRMED',
  'PENDING',
];

const INACTIVE_MEDICATION_STATUSES = [
  'INACTIVE',
  'STOPPED',
  'DISCONTINUED',
  'CANCELLED',
];

const getTheme = isDark => ({
  background: isDark ? BRAND.darkBg : BRAND.lightBg,
  card: isDark ? BRAND.darkCard : BRAND.lightCard,
  border: isDark ? BRAND.darkBorder : BRAND.lightBorder,
  textPrimary: isDark ? '#FFFFFF' : '#111827',
  textSecondary: isDark ? '#8897AE' : '#64748B',
  mutedBg: isDark ? '#1C2738' : '#F1F5F9',
  unreadBg: isDark ? '#102D2B' : '#ECFEFB',
  accent: BRAND.cyan,
});

function getNotificationIcon(type) {
  switch (type) {
    case 'appointment_booked':
      return 'calendar-outline';
    case 'appointment_rescheduled':
    case 'appointment_cancelled':
      return 'calendar';
    case 'appointment_reminder':
      return 'time-outline';
    case 'medication_reminder':
      return 'medical-outline';
    default:
      return 'notifications-outline';
  }
}

function getNotificationLabel(type) {
  switch (type) {
    case 'appointment_booked':
    case 'appointment_rescheduled':
    case 'appointment_cancelled':
      return 'Appointment';
    case 'appointment_reminder':
      return 'Reminder';
    case 'medication_reminder':
      return 'Medication';
    default:
      return 'CareSense';
  }
}

function parseAppointmentDate(item) {
  const raw =
    item?.appointment_date ||
    item?.appointmentDate ||
    item?.date;

  if (!raw) {
    return null;
  }

  if (raw instanceof Date) {
    return new Date(raw.getTime());
  }

  const parsed = new Date(raw);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getDoctorName(item) {
  return String(
    item?.doctor_name ||
      item?.doctorName ||
      'Your healthcare provider',
  ).trim();
}

function normalizeAppointment(item) {
  const appointmentDate = parseAppointmentDate(item);
  const status = String(item?.status || '')
    .trim()
    .toUpperCase();

  return {
    ...item,
    id: item?.id ?? item?._id ?? null,
    doctorName: getDoctorName(item),
    appointmentDate,
    status,
  };
}

function getRawMedicationSources(record) {
  const sources = [];

  [
    record?.medicines,
    record?.medications,
    record?.result?.medicines,
    record?.result?.medications,
    record?.triage?.medicines,
    record?.triage?.medications,
    record?.analysis?.medicines,
    record?.analysis?.medications,
  ].forEach(candidate => {
    if (Array.isArray(candidate)) {
      sources.push(...candidate);
    }
  });

  return sources;
}

function getMedicationSourceDate(record) {
  const raw =
    record?.created_at ||
    record?.createdAt ||
    record?.updated_at ||
    record?.updatedAt ||
    record?.date ||
    record?.timestamp;

  if (!raw) {
    return '';
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
}

function normalizeMedication(medication, index, record) {
  if (medication === null || medication === undefined) {
    return null;
  }

  const sourceDate = getMedicationSourceDate(record);
  const recordId =
    record?.id || record?.audit_id || 'record';

  if (typeof medication === 'string') {
    const name = medication.trim();

    if (!name) {
      return null;
    }

    return {
      id: `${recordId}-${index}-${name}`,
      name,
      dosage: '',
      purpose: '',
      instructions: '',
      status: '',
      time: '',
      sourceRecordId: recordId,
      sourceDate,
    };
  }

  if (typeof medication !== 'object') {
    return null;
  }

  const name = String(
    medication?.name ??
      medication?.medicine ??
      medication?.medication ??
      medication?.title ??
      '',
  ).trim();

  if (!name) {
    return null;
  }

  return {
    id:
      medication?.id ??
      medication?._id ??
      `${recordId}-${index}-${name}`,
    name,
    dosage: String(
      medication?.dosage ?? medication?.dose ?? '',
    ).trim(),
    purpose: String(
      medication?.purpose ??
        medication?.reason ??
        medication?.detail ??
        medication?.indication ??
        '',
    ).trim(),
    instructions: String(
      medication?.instructions ??
        medication?.instruction ??
        medication?.directions ??
        medication?.how_to_take ??
        medication?.usage ??
        '',
    ).trim(),
    status: String(medication?.status ?? '').trim(),
    time: String(
      medication?.time ?? medication?.schedule ?? '',
    ).trim(),
    sourceRecordId: recordId,
    sourceDate,
  };
}

function extractMedications(records) {
  const medications = [];
  const seen = new Set();

  (Array.isArray(records) ? records : []).forEach(record => {
    getRawMedicationSources(record).forEach((item, index) => {
      const medication = normalizeMedication(
        item,
        index,
        record,
      );

      if (!medication) {
        return;
      }

      const status = String(medication.status || '')
        .trim()
        .toUpperCase();

      if (INACTIVE_MEDICATION_STATUSES.includes(status)) {
        return;
      }

      const key = `${String(medication.id)}:${medication.time}`;

      if (seen.has(key)) {
        return;
      }

      seen.add(key);
      medications.push(medication);
    });
  });

  return medications;
}

function getNotificationAppointmentDate(notification) {
  if (!notification) {
    return null;
  }

  const raw = notification?.data?.appointmentDate;

  if (!raw) {
    return null;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getTimeText(notification) {
  const appointmentDate = getNotificationAppointmentDate(notification);

  /*
   * Appointment reminders use scheduledFor for the notification trigger
   * (for example, 10:00 AM for an 11:00 AM appointment). The user should
   * see the actual appointment time in the notification center.
   */
  if (
    appointmentDate &&
    notification?.type?.startsWith('appointment')
  ) {
    return `Upcoming · ${formatDateTime(appointmentDate)}`;
  }

  if (notification?.scheduledFor) {
    const scheduled = new Date(notification.scheduledFor);

    if (!Number.isNaN(scheduled.getTime())) {
      if (scheduled.getTime() > Date.now()) {
        return `Upcoming · ${formatDateTime(scheduled)}`;
      }
    }
  }

  const created = new Date(notification?.createdAt || 0);

  if (Number.isNaN(created.getTime())) {
    return 'Recently';
  }

  const diffMs = Date.now() - created.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs >= 0 && diffMs < minute) {
    return 'Just now';
  }

  if (diffMs >= minute && diffMs < hour) {
    const minutes = Math.max(1, Math.floor(diffMs / minute));
    return `${minutes}m ago`;
  }

  if (diffMs >= hour && diffMs < day) {
    const hours = Math.floor(diffMs / hour);
    return `${hours}h ago`;
  }

  return formatRecordDate(notification?.createdAt);
}

function getAppointmentReminderProvider(notification) {
  const data = notification?.data || {};

  return String(
    data?.doctorName ||
      data?.doctor_name ||
      data?.providerName ||
      data?.provider_name ||
      data?.provider ||
      '',
  ).trim();
}

function getDisplayTitle(notification) {
  const appointmentDate = getNotificationAppointmentDate(notification);

  if (
    appointmentDate &&
    notification?.type === 'appointment_reminder'
  ) {
    return `Appointment at ${formatTime(appointmentDate)}`;
  }

  return notification?.title || 'CareSense notification';
}

function getDisplayBody(notification) {
  const appointmentDate = getNotificationAppointmentDate(notification);

  if (
    appointmentDate &&
    notification?.type === 'appointment_reminder'
  ) {
    const provider = getAppointmentReminderProvider(notification);

    if (provider) {
      return `Your appointment with ${provider} is scheduled for ${formatTime(appointmentDate)}.`;
    }

    return `Your appointment is scheduled for ${formatTime(appointmentDate)}.`;
  }

  return notification?.body || '';
}

function getTargetScreen(notification) {
  const target = notification?.data?.targetScreen;

  if (target) {
    return target;
  }

  switch (notification?.type) {
    case 'appointment_booked':
    case 'appointment_rescheduled':
    case 'appointment_cancelled':
    case 'appointment_reminder':
      return 'Appointments';
    case 'medication_reminder':
      return 'Medication';
    default:
      return null;
  }
}

function sortNotifications(items) {
  return [...items].sort((a, b) => {
    const aTime = new Date(
      a?.scheduledFor || a?.createdAt || 0,
    ).getTime();
    const bTime = new Date(
      b?.scheduledFor || b?.createdAt || 0,
    ).getTime();

    return bTime - aTime;
  });
}

export default function NotificationCenterScreen({ navigation }) {
  const isDark = useColorScheme() === 'dark';
  const theme = useMemo(() => getTheme(isDark), [isDark]);

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [working, setWorking] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;

  const syncLiveCareSenseData = useCallback(async () => {
    const user = auth.currentUser;

    if (!user?.uid) {
      setNotifications([]);
      setSyncMessage('Sign in to view your CareSense notifications.');
      return;
    }

    setSyncMessage('Syncing your CareSense data...');

    let appointments = [];
    let records = [];

    try {
      const appointmentsResponse = await api.get('appointments/', {
        timeout: 10000,
      });

      const payload = appointmentsResponse?.data;
      const rawAppointments = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.results)
          ? payload.results
          : [];

      appointments = rawAppointments
        .map(normalizeAppointment)
        .filter(item => item?.id && item?.appointmentDate);
    } catch (error) {
      console.warn(
        'Notification center appointment sync failed:',
        error?.message || error,
      );
    }

    try {
      const recordsResponse = await getRecords(user.uid, {
        force: true,
      });

      if (Array.isArray(recordsResponse)) {
        records = recordsResponse;
      } else if (Array.isArray(recordsResponse?.records)) {
        records = recordsResponse.records;
      } else if (Array.isArray(recordsResponse?.data)) {
        records = recordsResponse.data;
      }
    } catch (error) {
      console.warn(
        'Notification center medication sync failed:',
        error?.message || error,
      );
    }

    try {
      await syncUpcomingAppointmentReminders(
        appointments.filter(item =>
          ACTIVE_APPOINTMENT_STATUSES.includes(item.status),
        ),
      );
    } catch (error) {
      console.warn(
        'Notification center appointment reminder sync failed:',
        error?.message || error,
      );
    }

    try {
      await syncMedicationReminders(
        extractMedications(records),
      );
    } catch (error) {
      console.warn(
        'Notification center medication reminder sync failed:',
        error?.message || error,
      );
    }

    const result = await getInAppNotifications();
    setNotifications(
      Array.isArray(result) ? sortNotifications(result) : [],
    );

    setSyncMessage('Synced with your CareSense account.');
  }, []);

  const loadNotifications = useCallback(
    async ({ manual = false } = {}) => {
      if (manual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        await syncLiveCareSenseData();
      } catch (error) {
        console.error(
          'Failed to sync CareSense notifications:',
          error,
        );

        try {
          const result = await getInAppNotifications();
          setNotifications(
            Array.isArray(result)
              ? sortNotifications(result)
              : [],
          );
        } catch (readError) {
          console.error(
            'Failed to load stored CareSense notifications:',
            readError,
          );
          setNotifications([]);
        }

        setSyncMessage('Showing the latest notification data available on this device.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [syncLiveCareSenseData],
  );

  useFocusEffect(
    useCallback(() => {
      void loadNotifications();

      fadeAnim.setValue(0);
      slideAnim.setValue(18);

      const animation = Animated.parallel([
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
      ]);

      animation.start();

      return () => animation.stop();
    }, [fadeAnim, slideAnim, loadNotifications]),
  );

  const unreadCount = notifications.filter(
    item => !item?.read,
  ).length;

  const upcoming = notifications.filter(item => {
    const scheduled = new Date(item?.scheduledFor || 0);
    return (
      item?.scheduledFor &&
      !Number.isNaN(scheduled.getTime()) &&
      scheduled.getTime() > Date.now()
    );
  });

  const recent = notifications.filter(item => !upcoming.includes(item));

  const handleNotificationPress = useCallback(
    async notification => {
      const notificationId = notification?.id;

      if (!notificationId) {
        return;
      }

      try {
        await markInAppNotificationRead(notificationId);
      } catch (error) {
        console.warn(
          'Unable to mark notification as read:',
          error?.message || error,
        );
      }

      setNotifications(current =>
        current.map(item =>
          item.id === notificationId
            ? { ...item, read: true }
            : item,
        ),
      );

      const targetScreen = getTargetScreen(notification);

      if (targetScreen === 'Appointments') {
        navigation.navigate('MainTabs', {
          screen: 'Appointments',
        });
        return;
      }

      if (targetScreen === 'Medication') {
        navigation.navigate('Medication');
        return;
      }

      if (targetScreen === 'Notifications') {
        navigation.navigate('Notifications');
      }
    },
    [navigation],
  );

  const handleMarkAllRead = useCallback(async () => {
    if (working || unreadCount === 0) {
      return;
    }

    setWorking(true);

    try {
      await markAllInAppNotificationsRead();
      setNotifications(current =>
        current.map(item => ({
          ...item,
          read: true,
        })),
      );
    } catch (error) {
      console.error(
        'Failed to mark notifications as read:',
        error,
      );
    } finally {
      setWorking(false);
    }
  }, [working, unreadCount]);

  const renderCard = item => {
    const isUnread = !item?.read;
    const icon = getNotificationIcon(item?.type);
    const label = getNotificationLabel(item?.type);

    return (
      <TouchableOpacity
        key={item.id}
        activeOpacity={0.82}
        onPress={() => handleNotificationPress(item)}
        style={[
          styles.card,
          {
            backgroundColor: isUnread
              ? theme.unreadBg
              : theme.card,
            borderColor: isUnread
              ? theme.accent
              : theme.border,
          },
        ]}
      >
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: theme.mutedBg },
          ]}
        >
          <Ionicons
            name={icon}
            size={21}
            color={theme.accent}
          />
        </View>

        <View style={styles.cardBody}>
          <View style={styles.cardTopRow}>
            <Text
              style={[
                styles.label,
                { color: theme.accent },
              ]}
            >
              {label}
            </Text>

            {isUnread ? (
              <View
                style={[
                  styles.unreadDot,
                  { backgroundColor: theme.accent },
                ]}
              />
            ) : null}
          </View>

          <Text
            style={[
              styles.cardTitle,
              { color: theme.textPrimary },
            ]}
          >
            {getDisplayTitle(item)}
          </Text>

          {!!getDisplayBody(item) && (
            <Text
              style={[
                styles.cardBodyText,
                { color: theme.textSecondary },
              ]}
            >
              {getDisplayBody(item)}
            </Text>
          )}

          <Text
            style={[
              styles.timeText,
              { color: theme.textSecondary },
            ]}
          >
            {getTimeText(item)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadNotifications({ manual: true })}
            tintColor={theme.accent}
            colors={[theme.accent]}
          />
        }
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.78}
            onPress={() => navigation.goBack()}
            style={[
              styles.headerButton,
              {
                backgroundColor: theme.mutedBg,
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

          <View style={styles.headerTextWrap}>
            <Text
              style={[
                styles.eyebrow,
                { color: theme.accent },
              ]}
            >
              CARESENSE
            </Text>
            <Text
              style={[
                styles.title,
                { color: theme.textPrimary },
              ]}
            >
              Notifications
            </Text>
            <Text
              style={[
                styles.subtitle,
                { color: theme.textSecondary },
              ]}
            >
              Updates and reminders from your CareSense account.
            </Text>
          </View>

          {unreadCount > 0 ? (
            <TouchableOpacity
              activeOpacity={0.78}
              onPress={handleMarkAllRead}
              disabled={working}
              style={styles.markAllButton}
            >
              <Text
                style={[
                  styles.markAllText,
                  { color: theme.accent },
                ]}
              >
                {working ? '...' : 'Mark all read'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {!!syncMessage && !loading ? (
          <Text
            style={[
              styles.syncText,
              { color: theme.textSecondary },
            ]}
          >
            {syncMessage}
          </Text>
        ) : null}

        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator
              size="small"
              color={theme.accent}
            />
            <Text
              style={[
                styles.loadingText,
                { color: theme.textSecondary },
              ]}
            >
              Syncing your CareSense notifications...
            </Text>
          </View>
        ) : notifications.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}
          >
            <View
              style={[
                styles.emptyIcon,
                { backgroundColor: theme.mutedBg },
              ]}
            >
              <Ionicons
                name="notifications-outline"
                size={30}
                color={theme.accent}
              />
            </View>
            <Text
              style={[
                styles.emptyTitle,
                { color: theme.textPrimary },
              ]}
            >
              No notifications yet
            </Text>
            <Text
              style={[
                styles.emptyText,
                { color: theme.textSecondary },
              ]}
            >
              Appointment updates and medication reminders will appear here when they are created or scheduled in CareSense.
            </Text>
          </View>
        ) : (
          <>
            {upcoming.length > 0 ? (
              <View style={styles.section}>
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: theme.textPrimary },
                  ]}
                >
                  Upcoming
                </Text>
                {upcoming.map(renderCard)}
              </View>
            ) : null}

            {recent.length > 0 ? (
              <View style={styles.section}>
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: theme.textPrimary },
                  ]}
                >
                  Recent
                </Text>
                {recent.map(renderCard)}
              </View>
            ) : null}
          </>
        )}

        <Text
          style={[
            styles.footerText,
            { color: theme.textSecondary },
          ]}
        >
          Notification data is synced to your signed-in CareSense account on this device.
        </Text>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 34,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginRight: 12,
  },
  headerTextWrap: {
    flex: 1,
    paddingRight: 8,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
  markAllButton: {
    paddingTop: 8,
    paddingLeft: 4,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '800',
  },
  syncText: {
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 16,
  },
  section: {
    marginBottom: 22,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 10,
  },
  card: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 18,
    padding: 15,
    marginBottom: 10,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardBody: {
    flex: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginLeft: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 4,
    lineHeight: 20,
  },
  cardBodyText: {
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 4,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 8,
  },
  loadingState: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 12,
    marginTop: 10,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 26,
    paddingVertical: 38,
    marginTop: 6,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 7,
  },
  footerText: {
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 14,
  },
});
