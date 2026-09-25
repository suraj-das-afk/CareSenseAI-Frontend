import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../config/firebase';

export const CARESENSE_NOTIFICATION_CHANNEL_ID = 'caresense';
export const CARESENSE_SETTINGS_KEY = '@caresense_user_settings_v2';
export const CARESENSE_IN_APP_NOTIFICATIONS_KEY =
  '@caresense_in_app_notifications_v2';
export const CARESENSE_IN_APP_NOTIFICATIONS_LEGACY_KEY =
  '@caresense_in_app_notifications_v1';
export const CARESENSE_IN_APP_NOTIFICATIONS_OWNER_KEY =
  '@caresense_in_app_notifications_owner_v1';

const MAX_IN_APP_NOTIFICATIONS = 100;

const ACTIVE_APPOINTMENT_STATUSES = [
  'SCHEDULED',
  'UPCOMING',
  'CONFIRMED',
  'PENDING',
];

let handlerConfigured = false;

function createInAppNotificationId(type = 'general') {
  return `${type}:${Date.now()}:${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function getCurrentUserId() {
  return auth.currentUser?.uid || null;
}

async function readStoredNotifications(key) {
  try {
    const raw = await AsyncStorage.getItem(key);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn(
      'Unable to read stored CareSense notifications:',
      error,
    );

    return [];
  }
}

async function migrateLegacyNotificationsForCurrentUser(userId) {
  if (!userId) {
    return [];
  }

  const current = await readStoredNotifications(
    CARESENSE_IN_APP_NOTIFICATIONS_KEY,
  );

  if (current.length > 0) {
    return current.filter(
      item => item?.ownerUid === userId,
    );
  }

  const legacy = await readStoredNotifications(
    CARESENSE_IN_APP_NOTIFICATIONS_LEGACY_KEY,
  );

  if (legacy.length === 0) {
    return [];
  }

  const claimedOwner = await AsyncStorage.getItem(
    CARESENSE_IN_APP_NOTIFICATIONS_OWNER_KEY,
  );

  /*
   * The previous notification-center version stored local history
   * without an account id. Claim that legacy history once for the
   * currently signed-in account so an existing user's history is not
   * silently lost. A different account can never inherit it.
   */
  if (claimedOwner && claimedOwner !== userId) {
    return [];
  }

  if (!claimedOwner) {
    await AsyncStorage.setItem(
      CARESENSE_IN_APP_NOTIFICATIONS_OWNER_KEY,
      userId,
    );
  }

  const migrated = legacy
    .filter(item => item && item.id && item.title)
    .map(item => ({
      ...item,
      ownerUid: userId,
    }));

  if (migrated.length > 0) {
    await AsyncStorage.setItem(
      CARESENSE_IN_APP_NOTIFICATIONS_KEY,
      JSON.stringify(migrated),
    );
  }

  return migrated;
}

async function readInAppNotifications() {
  const userId = getCurrentUserId();

  if (!userId) {
    return [];
  }

  try {
    const notifications =
      await migrateLegacyNotificationsForCurrentUser(
        userId,
      );

    return notifications
      .filter(
        item =>
          item &&
          item.id &&
          item.title &&
          item.ownerUid === userId,
      )
      .sort((a, b) => {
        const aTime = new Date(
          a.scheduledFor || a.createdAt || 0,
        ).getTime();
        const bTime = new Date(
          b.scheduledFor || b.createdAt || 0,
        ).getTime();

        return bTime - aTime;
      });
  } catch (error) {
    console.warn(
      'Unable to read in-app notifications:',
      error,
    );

    return [];
  }
}

export async function getInAppNotifications() {
  return readInAppNotifications();
}

export async function addInAppNotification({
  id,
  title,
  body = '',
  type = 'general',
  createdAt = new Date().toISOString(),
  scheduledFor = null,
  data = null,
  read,
  userId = getCurrentUserId(),
}) {
  if (!title || !userId) {
    return null;
  }

  const notifications = await readInAppNotifications();
  const notificationId =
    id || createInAppNotificationId(type);

  const existing = notifications.find(
    item => item.id === notificationId,
  );

  const nextNotification = {
    ...(existing || {}),
    id: notificationId,
    ownerUid: userId,
    title: String(title),
    body: String(body || ''),
    type: String(type || 'general'),
    createdAt: existing?.createdAt || createdAt,
    scheduledFor: scheduledFor || null,
    data: {
      ...(existing?.data || {}),
      ...(data || {}),
      userId,
    },
    read:
      typeof read === 'boolean'
        ? read
        : Boolean(existing?.read),
  };

  const next = [
    nextNotification,
    ...notifications.filter(
      item => item.id !== notificationId,
    ),
  ].slice(0, MAX_IN_APP_NOTIFICATIONS);

  await AsyncStorage.setItem(
    CARESENSE_IN_APP_NOTIFICATIONS_KEY,
    JSON.stringify(next),
  );

  return nextNotification;
}

async function removeInAppNotificationsWhere(predicate) {
  const notifications = await readInAppNotifications();
  const next = notifications.filter(
    item => !predicate(item),
  );

  if (next.length === notifications.length) {
    return 0;
  }

  await AsyncStorage.setItem(
    CARESENSE_IN_APP_NOTIFICATIONS_KEY,
    JSON.stringify(next),
  );

  return notifications.length - next.length;
}

export async function markInAppNotificationRead(
  notificationId,
) {
  if (!notificationId) {
    return false;
  }

  const notifications = await readInAppNotifications();
  let changed = false;

  const next = notifications.map(item => {
    if (item.id !== notificationId || item.read) {
      return item;
    }

    changed = true;
    return {
      ...item,
      read: true,
    };
  });

  if (!changed) {
    return false;
  }

  await AsyncStorage.setItem(
    CARESENSE_IN_APP_NOTIFICATIONS_KEY,
    JSON.stringify(next),
  );

  return true;
}

export async function markAllInAppNotificationsRead() {
  const notifications = await readInAppNotifications();

  if (notifications.every(item => item.read)) {
    return false;
  }

  const next = notifications.map(item => ({
    ...item,
    read: true,
  }));

  await AsyncStorage.setItem(
    CARESENSE_IN_APP_NOTIFICATIONS_KEY,
    JSON.stringify(next),
  );

  return true;
}

export function configureNotificationHandler() {
  if (handlerConfigured) {
    return;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  handlerConfigured = true;
}

export async function ensureNotificationChannel() {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync(
    CARESENSE_NOTIFICATION_CHANNEL_ID,
    {
      name: 'CareSense notifications',
      description: 'CareSense reminders and important app updates.',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 150, 250],
      lightColor: '#00D4C5',
    },
  );
}

export async function getNotificationPermissionStatus() {
  configureNotificationHandler();
  await ensureNotificationChannel();

  return Notifications.getPermissionsAsync();
}

export async function requestNotificationPermission() {
  configureNotificationHandler();
  await ensureNotificationChannel();

  const current = await Notifications.getPermissionsAsync();

  if (current.granted) {
    return current;
  }

  return Notifications.requestPermissionsAsync();
}

export async function areCareSenseNotificationsEnabled() {
  try {
    const permission = await getNotificationPermissionStatus();

    if (!permission?.granted) {
      return false;
    }

    const raw = await AsyncStorage.getItem(
      CARESENSE_SETTINGS_KEY,
    );

    if (!raw) {
      return true;
    }

    const parsed = JSON.parse(raw);

    if (typeof parsed?.notifications === 'boolean') {
      return parsed.notifications;
    }

    return true;
  } catch (error) {
    console.warn(
      'Unable to read CareSense notification preference:',
      error,
    );

    return false;
  }
}

function getAppointmentId(item) {
  return item?.id ?? item?._id ?? null;
}

function getAppointmentDate(item) {
  if (item?.appointmentDate instanceof Date) {
    return new Date(item.appointmentDate.getTime());
  }

  return new Date(
    item?.appointment_date ||
      item?.appointmentDate ||
      item?.date,
  );
}

function getDoctorName(item) {
  return String(
    item?.doctor_name ||
      item?.doctorName ||
      'your healthcare provider',
  ).trim();
}

async function cancelNotificationsWhere(predicate) {
  const scheduled =
    await Notifications.getAllScheduledNotificationsAsync();

  const matching = scheduled.filter(predicate);

  await Promise.all(
    matching.map(request =>
      Notifications.cancelScheduledNotificationAsync(
        request.identifier,
      ),
    ),
  );

  return matching.length;
}

export async function cancelAppointmentReminders(
  appointmentId,
) {
  if (!appointmentId) {
    return 0;
  }

  const cancelled = await cancelNotificationsWhere(
    request => {
      const data = request?.content?.data;

      return (
        data?.type === 'appointment_reminder' &&
        String(data?.appointmentId) === String(appointmentId)
      );
    },
  );

  await removeInAppNotificationsWhere(item =>
    item?.type === 'appointment_reminder' &&
    String(item?.data?.appointmentId) === String(appointmentId),
  );

  return cancelled;
}

export async function scheduleAppointmentReminders({
  appointmentId,
  appointmentDate,
  doctorName,
}) {
  const enabled =
    await areCareSenseNotificationsEnabled();

  if (!enabled) {
    return [];
  }

  const date =
    appointmentDate instanceof Date
      ? new Date(appointmentDate.getTime())
      : new Date(appointmentDate);

  if (
    !appointmentId ||
    Number.isNaN(date.getTime()) ||
    date.getTime() <= Date.now()
  ) {
    return [];
  }

  configureNotificationHandler();
  await ensureNotificationChannel();

  await cancelAppointmentReminders(appointmentId);

  const provider =
    String(doctorName || 'your healthcare provider').trim();

  const reminders = [
    {
      offsetMs: 24 * 60 * 60 * 1000,
      title: 'Appointment tomorrow',
      body: `Your appointment with ${provider} is tomorrow.`,
    },
    {
      offsetMs: 60 * 60 * 1000,
      title: 'Appointment in 1 hour',
      body: `Your appointment with ${provider} starts in 1 hour.`,
    },
  ];

  const identifiers = [];

  for (const reminder of reminders) {
    const triggerDate = new Date(
      date.getTime() - reminder.offsetMs,
    );

    if (triggerDate.getTime() <= Date.now()) {
      continue;
    }

    const identifier =
      await Notifications.scheduleNotificationAsync({
        content: {
          title: reminder.title,
          body: reminder.body,
          sound: 'default',
          data: {
            type: 'appointment_reminder',
            userId: getCurrentUserId(),
            appointmentId: String(appointmentId),
            appointmentDate: date.toISOString(),
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
          channelId: CARESENSE_NOTIFICATION_CHANNEL_ID,
        },
      });

    identifiers.push(identifier);

    await addInAppNotification({
      id: `appointment_reminder:${appointmentId}:${triggerDate.toISOString()}`,
      title: reminder.title,
      body: reminder.body,
      type: 'appointment_reminder',
      scheduledFor: triggerDate.toISOString(),
      data: {
        appointmentId: String(appointmentId),
        appointmentDate: date.toISOString(),
        targetScreen: 'Appointments',
      },
    });
  }

  return identifiers;
}

export async function syncUpcomingAppointmentReminders(
  appointments = [],
) {
  const enabled =
    await areCareSenseNotificationsEnabled();

  if (!enabled) {
    return {
      scheduled: 0,
      cancelled: 0,
    };
  }

  configureNotificationHandler();
  await ensureNotificationChannel();

  const cancelled =
    await cancelNotificationsWhere(
      request =>
        request?.content?.data?.type ===
        'appointment_reminder',
    );

  await removeInAppNotificationsWhere(
    item => item?.type === 'appointment_reminder',
  );

  let scheduledCount = 0;

  for (const item of Array.isArray(appointments)
    ? appointments
    : []) {
    const status = String(
      item?.status || '',
    )
      .trim()
      .toUpperCase();

    if (!ACTIVE_APPOINTMENT_STATUSES.includes(status)) {
      continue;
    }

    const appointmentId = getAppointmentId(item);
    const appointmentDate = getAppointmentDate(item);

    if (
      !appointmentId ||
      Number.isNaN(appointmentDate.getTime()) ||
      appointmentDate.getTime() <= Date.now()
    ) {
      continue;
    }

    const reminderIds =
      await scheduleAppointmentReminders({
        appointmentId,
        appointmentDate,
        doctorName: getDoctorName(item),
      });

    scheduledCount += reminderIds.length;
  }

  return {
    scheduled: scheduledCount,
    cancelled,
  };
}


const INACTIVE_MEDICATION_STATUSES = [
  'INACTIVE',
  'STOPPED',
  'DISCONTINUED',
  'CANCELLED',
];

function getMedicationId(item) {
  return item?.id ?? item?._id ?? null;
}

function getMedicationName(item) {
  return String(
    item?.name ||
      item?.medicine ||
      item?.medication ||
      'scheduled medication',
  ).trim();
}

function getMedicationSchedule(item) {
  return String(
    item?.time ||
      item?.schedule ||
      '',
  ).trim();
}

function parseMedicationTimes(scheduleText) {
  if (!scheduleText) {
    return [];
  }

  const matches = [];

  /*
   * Only accept explicit clock times. We intentionally do not
   * turn vague instructions such as "morning" or "twice daily"
   * into guessed medication times.
   *
   * Supported examples:
   *   8 AM
   *   08:00 AM
   *   8:30 PM
   *   20:30
   *   8 AM, 8 PM
   */
  const pattern = /\b(\d{1,2})(?::([0-5]\d))?\s*(AM|PM)\b|\b([01]?\d|2[0-3]):([0-5]\d)\b/gi;
  let match;

  while ((match = pattern.exec(scheduleText)) !== null) {
    let hour;
    let minute;

    if (match[1] !== undefined) {
      hour = Number(match[1]);
      minute = Number(match[2] || 0);

      const period = String(match[3] || '').toUpperCase();

      if (period === 'AM') {
        if (hour === 12) {
          hour = 0;
        }
      } else if (period === 'PM') {
        if (hour !== 12) {
          hour += 12;
        }
      }
    } else {
      hour = Number(match[4]);
      minute = Number(match[5]);
    }

    if (
      !Number.isInteger(hour) ||
      !Number.isInteger(minute) ||
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59
    ) {
      continue;
    }

    matches.push({ hour, minute });
  }

  const seen = new Set();

  return matches.filter(item => {
    const key = `${item.hour}:${item.minute}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function getNextDailyOccurrence(hour, minute) {
  const next = new Date();
  next.setHours(hour, minute, 0, 0);

  if (next.getTime() <= Date.now()) {
    next.setDate(next.getDate() + 1);
  }

  return next;
}

async function cancelMedicationReminders() {
  return cancelNotificationsWhere(
    request =>
      request?.content?.data?.type ===
      'medication_reminder',
  );
}

export async function syncMedicationReminders(
  medications = [],
) {
  const enabled =
    await areCareSenseNotificationsEnabled();

  if (!enabled) {
    return {
      scheduled: 0,
      cancelled: 0,
      skipped: 0,
    };
  }

  configureNotificationHandler();
  await ensureNotificationChannel();

  const cancelled =
    await cancelMedicationReminders();

  await removeInAppNotificationsWhere(
    item => item?.type === 'medication_reminder',
  );

  let scheduled = 0;
  let skipped = 0;

  for (const medication of Array.isArray(medications)
    ? medications
    : []) {
    const status = String(
      medication?.status || '',
    )
      .trim()
      .toUpperCase();

    if (INACTIVE_MEDICATION_STATUSES.includes(status)) {
      continue;
    }

    const medicationId = getMedicationId(medication);
    const medicationName = getMedicationName(medication);
    const scheduleText = getMedicationSchedule(medication);
    const times = parseMedicationTimes(scheduleText);

    if (!medicationId || times.length === 0) {
      skipped += 1;
      continue;
    }

    for (const time of times) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Medication reminder',
          body: 'It\'s time for your scheduled medication.',
          sound: 'default',
          data: {
            type: 'medication_reminder',
            userId: getCurrentUserId(),
            medicationId: String(medicationId),
            medicationName,
            scheduledTime: `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: time.hour,
          minute: time.minute,
          channelId: CARESENSE_NOTIFICATION_CHANNEL_ID,
        },
      });

      const nextOccurrence = getNextDailyOccurrence(
        time.hour,
        time.minute,
      );

      await addInAppNotification({
        id: `medication_reminder:${medicationId}:${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`,
        title: 'Medication reminder',
        body: 'It\'s time for your scheduled medication.',
        type: 'medication_reminder',
        scheduledFor: nextOccurrence.toISOString(),
        data: {
          medicationId: String(medicationId),
          scheduledTime: `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`,
          targetScreen: 'Medication',
        },
      });

      scheduled += 1;
    }
  }

  return {
    scheduled,
    cancelled,
    skipped,
  };
}

export async function sendAppointmentBookedNotification({
  appointmentId,
  appointmentDate,
  doctorName,
}) {
  const enabled =
    await areCareSenseNotificationsEnabled();

  if (!enabled) {
    return null;
  }

  const permission = await requestNotificationPermission();

  if (!permission?.granted) {
    const error = new Error(
      'CareSense notifications are not permitted.',
    );
    error.code = 'NOTIFICATION_PERMISSION_DENIED';
    throw error;
  }

  const date =
    appointmentDate instanceof Date
      ? new Date(appointmentDate.getTime())
      : new Date(appointmentDate);

  const provider =
    String(doctorName || 'your healthcare provider').trim();

  const notificationId =
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Appointment booked',
        body: `Your appointment with ${provider} has been booked successfully.`,
        sound: 'default',
        data: {
          type: 'appointment_booked',
          userId: getCurrentUserId(),
          appointmentId:
            appointmentId != null
              ? String(appointmentId)
              : null,
          appointmentDate:
            Number.isNaN(date.getTime())
              ? null
              : date.toISOString(),
        },
      },
      trigger: null,
    });

  await addInAppNotification({
    id: `appointment_booked:${appointmentId || 'unknown'}:${Date.now()}`,
    title: 'Appointment booked',
    body: `Your appointment with ${provider} has been booked successfully.`,
    type: 'appointment_booked',
    data: {
      appointmentId:
        appointmentId != null
          ? String(appointmentId)
          : null,
      appointmentDate:
        Number.isNaN(date.getTime())
          ? null
          : date.toISOString(),
      targetScreen: 'Appointments',
    },
  });

  return notificationId;
}

export async function sendAppointmentRescheduledNotification({
  appointmentId,
  appointmentDate,
  doctorName,
}) {
  const enabled =
    await areCareSenseNotificationsEnabled();

  if (!enabled) {
    return null;
  }

  const permission = await requestNotificationPermission();

  if (!permission?.granted) {
    const error = new Error(
      'CareSense notifications are not permitted.',
    );
    error.code = 'NOTIFICATION_PERMISSION_DENIED';
    throw error;
  }

  const date =
    appointmentDate instanceof Date
      ? new Date(appointmentDate.getTime())
      : new Date(appointmentDate);

  const provider =
    String(doctorName || 'your healthcare provider').trim();

  const notificationId =
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Appointment rescheduled',
        body: `Your appointment with ${provider} has been moved to a new time.`,
        sound: 'default',
        data: {
          type: 'appointment_rescheduled',
          userId: getCurrentUserId(),
          appointmentId:
            appointmentId != null
              ? String(appointmentId)
              : null,
          appointmentDate:
            Number.isNaN(date.getTime())
              ? null
              : date.toISOString(),
        },
      },
      trigger: null,
    });

  await addInAppNotification({
    id: `appointment_rescheduled:${appointmentId || 'unknown'}:${Date.now()}`,
    title: 'Appointment rescheduled',
    body: `Your appointment with ${provider} has been moved to a new time.`,
    type: 'appointment_rescheduled',
    data: {
      appointmentId:
        appointmentId != null
          ? String(appointmentId)
          : null,
      appointmentDate:
        Number.isNaN(date.getTime())
          ? null
          : date.toISOString(),
      targetScreen: 'Appointments',
    },
  });

  return notificationId;
}

export async function sendAppointmentCancelledNotification({
  appointmentId,
  appointmentDate,
  doctorName,
}) {
  const enabled =
    await areCareSenseNotificationsEnabled();

  if (!enabled) {
    return null;
  }

  const permission = await requestNotificationPermission();

  if (!permission?.granted) {
    const error = new Error(
      'CareSense notifications are not permitted.',
    );
    error.code = 'NOTIFICATION_PERMISSION_DENIED';
    throw error;
  }

  const date =
    appointmentDate instanceof Date
      ? new Date(appointmentDate.getTime())
      : new Date(appointmentDate);

  const provider =
    String(doctorName || 'your healthcare provider').trim();

  const body =
    `Your appointment with ${provider} has been cancelled.`;

  const notificationId =
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Appointment cancelled',
        body,
        sound: 'default',
        data: {
          type: 'appointment_cancelled',
          userId: getCurrentUserId(),
          appointmentId:
            appointmentId != null
              ? String(appointmentId)
              : null,
          appointmentDate:
            Number.isNaN(date.getTime())
              ? null
              : date.toISOString(),
        },
      },
      trigger: null,
    });

  await addInAppNotification({
    id: `appointment_cancelled:${appointmentId || 'unknown'}:${Date.now()}`,
    title: 'Appointment cancelled',
    body,
    type: 'appointment_cancelled',
    data: {
      appointmentId:
        appointmentId != null
          ? String(appointmentId)
          : null,
      appointmentDate:
        Number.isNaN(date.getTime())
          ? null
          : date.toISOString(),
      targetScreen: 'Appointments',
    },
  });

  return notificationId;
}

export async function cancelAllCareSenseLocalNotifications() {
  return Notifications.cancelAllScheduledNotificationsAsync();
}
