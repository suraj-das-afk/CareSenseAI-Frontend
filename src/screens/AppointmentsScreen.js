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
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useFocusEffect } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

import Ionicons from '@expo/vector-icons/Ionicons';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { AuthContext } from '../context/AuthContext';
import { PopupContext } from '../context/PopupContext';
import api from '../services/api';
import {
  cancelAppointmentReminders,
  sendAppointmentCancelledNotification,
} from '../services/notificationService';


/* ============================================================
   THEME
============================================================ */

const getTheme = isDark => ({
  background: isDark
    ? '#0A0F1A'
    : '#F7F9FC',

  surface: isDark
    ? '#101722'
    : '#FFFFFF',

  card: isDark
    ? '#141C29'
    : '#FFFFFF',

  cardElevated: isDark
    ? '#182231'
    : '#FFFFFF',

  border: isDark
    ? '#243044'
    : '#E2E8F0',

  borderSoft: isDark
    ? '#1B2636'
    : '#EEF2F7',

  textPrimary: isDark
    ? '#F8FAFC'
    : '#111827',

  textSecondary: isDark
    ? '#94A3B8'
    : '#64748B',

  textMuted: isDark
    ? '#64748B'
    : '#94A3B8',

  accent: '#00D4C5',

  accentDark: '#00B8AA',

  accentSoft: isDark
    ? '#0E282D'
    : '#E8FBF8',

  accentBorder: isDark
    ? '#1B4746'
    : '#B8EEE8',

  accentText: isDark
    ? '#8FF7ED'
    : '#007F77',

  successBg: isDark
    ? '#10271F'
    : '#ECFDF5',

  successBorder: isDark
    ? '#1B4B39'
    : '#A7F3D0',

  successText: isDark
    ? '#86EFAC'
    : '#047857',

  warningBg: isDark
    ? '#30240F'
    : '#FFFBEB',

  warningBorder: isDark
    ? '#604817'
    : '#FDE68A',

  warningText: isDark
    ? '#FCD34D'
    : '#B45309',

  dangerBg: isDark
    ? '#32171C'
    : '#FFF1F2',

  dangerBorder: isDark
    ? '#642A31'
    : '#FECDD3',

  dangerText: isDark
    ? '#FDA4AF'
    : '#BE123C',

  shadow: isDark
    ? '#000000'
    : '#64748B',
});


/* ============================================================
   DATE HELPERS
============================================================ */

const pad = value =>
  String(value).padStart(2, '0');


const getLocalDateKey = date => {
  if (!date) {
    return '';
  }

  const year =
    date.getFullYear();

  const month =
    pad(date.getMonth() + 1);

  const day =
    pad(date.getDate());

  return `${year}-${month}-${day}`;
};


const parseAppointmentDate = value => {
  if (!value) {
    return null;
  }

  const parsed =
    new Date(value);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return null;
  }

  return parsed;
};


const formatTime = date => {
  if (!date) {
    return 'Time unavailable';
  }

  return date.toLocaleTimeString(
    [],
    {
      hour: 'numeric',
      minute: '2-digit',
    }
  );
};


const formatFullDate = date => {
  if (!date) {
    return 'Date unavailable';
  }

  return date.toLocaleDateString(
    [],
    {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }
  );
};


const formatShortDate = date => {
  if (!date) {
    return 'Date unavailable';
  }

  return date.toLocaleDateString(
    [],
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }
  );
};


const formatRelativeDate = date => {
  if (!date) {
    return 'Date unavailable';
  }

  const today =
    new Date();

  const todayKey =
    getLocalDateKey(today);

  const dateKey =
    getLocalDateKey(date);

  if (dateKey === todayKey) {
    return 'Today';
  }

  const tomorrow =
    new Date(today);

  tomorrow.setDate(
    today.getDate() + 1
  );

  if (
    dateKey ===
    getLocalDateKey(tomorrow)
  ) {
    return 'Tomorrow';
  }

  return date.toLocaleDateString(
    [],
    {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }
  );
};


/* ============================================================
   WEEK GENERATOR
============================================================ */

const generateWeekDays = () => {
  const today =
    new Date();

  const day =
    today.getDay();

  const offset =
    day === 0
      ? -6
      : 1 - day;

  const monday =
    new Date(today);

  monday.setHours(
    0,
    0,
    0,
    0
  );

  monday.setDate(
    today.getDate() + offset
  );

  return Array.from(
    {
      length: 7,
    },
    (_, index) => {
      const date =
        new Date(monday);

      date.setDate(
        monday.getDate() + index
      );

      return {
        fullDate:
          getLocalDateKey(date),

        dayName:
          date.toLocaleDateString(
            [],
            {
              weekday: 'short',
            }
          ),

        dateNumber:
          date.getDate(),

        monthName:
          date.toLocaleDateString(
            [],
            {
              month: 'short',
            }
          ),

        isToday:
          getLocalDateKey(date) ===
          getLocalDateKey(today),
      };
    }
  );
};


/* ============================================================
   DATA NORMALIZATION
============================================================ */

const normalizeAppointment = item => {
  const parsedDate =
    parseAppointmentDate(
      item?.appointment_date ||
      item?.appointmentDate ||
      item?.date
    );

  const rawStatus =
    String(
      item?.status ||
      'UNKNOWN'
    ).trim();

  const status =
    rawStatus.toUpperCase();

  const doctorName =
    String(
      item?.doctor_name ||
      item?.doctorName ||
      'Doctor'
    ).trim();

  return {
    ...item,

    id:
      item?.id ??
      item?._id ??
      `${parsedDate?.getTime() || Date.now()}`,

    doctorName,

    appointmentDate:
      parsedDate,

    status,
  };
};


/* ============================================================
   STATUS HELPERS
============================================================ */

const rawStatusToLabel = status => {
  const normalized =
    String(status || '')
      .trim()
      .toLowerCase();

  if (!normalized) {
    return 'Unknown';
  }

  return normalized
    .split('_')
    .map(word =>
      word
        ? word.charAt(0).toUpperCase() +
          word.slice(1)
        : ''
    )
    .join(' ');
};


const getStatusConfig = (
  status,
  theme
) => {
  switch (
    String(status || '').toUpperCase()
  ) {
    case 'SCHEDULED':
    case 'UPCOMING':
      return {
        label: 'Scheduled',
        backgroundColor:
          theme.accentSoft,
        borderColor:
          theme.accentBorder,
        textColor:
          theme.accentText,
        icon:
          'calendar-outline',
      };

    case 'CONFIRMED':
      return {
        label: 'Confirmed',
        backgroundColor:
          theme.successBg,
        borderColor:
          theme.successBorder,
        textColor:
          theme.successText,
        icon:
          'checkmark-circle-outline',
      };

    case 'COMPLETED':
      return {
        label: 'Completed',
        backgroundColor:
          theme.successBg,
        borderColor:
          theme.successBorder,
        textColor:
          theme.successText,
        icon:
          'checkmark-done-outline',
      };

    case 'CANCELLED':
    case 'CANCELED':
      return {
        label: 'Cancelled',
        backgroundColor:
          theme.dangerBg,
        borderColor:
          theme.dangerBorder,
        textColor:
          theme.dangerText,
        icon:
          'close-circle-outline',
      };

    case 'PENDING':
      return {
        label: 'Pending',
        backgroundColor:
          theme.warningBg,
        borderColor:
          theme.warningBorder,
        textColor:
          theme.warningText,
        icon:
          'time-outline',
      };

    default:
      return {
        label:
          rawStatusToLabel(status),
        backgroundColor:
          theme.surface,
        borderColor:
          theme.border,
        textColor:
          theme.textSecondary,
        icon:
          'help-circle-outline',
      };
  }
};


/* ============================================================
   ANIMATION
============================================================ */

function AnimatedItem({
  children,
  delay = 0,
  index = 0,
  triggerKey,
}) {
  const opacity =
    useRef(
      new Animated.Value(0)
    ).current;

  const translateY =
    useRef(
      new Animated.Value(18)
    ).current;

  useEffect(() => {
    opacity.setValue(0);
    translateY.setValue(18);

    const animation =
      Animated.parallel([
        Animated.timing(
          opacity,
          {
            toValue: 1,
            duration: 320,
            delay:
              delay +
              index * 55,
            useNativeDriver: true,
          }
        ),

        Animated.spring(
          translateY,
          {
            toValue: 0,
            delay:
              delay +
              index * 55,
            friction: 8,
            tension: 55,
            useNativeDriver: true,
          }
        ),
      ]);

    animation.start();

    return () => {
      animation.stop();
    };
  }, [
    delay,
    index,
    opacity,
    translateY,
    triggerKey,
  ]);

  return (
    <Animated.View
      style={{
        opacity,
        transform: [
          {
            translateY,
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}


/* ============================================================
   DOCTOR AVATAR
============================================================ */

function DoctorAvatar({
  doctorName,
  theme,
  size = 56,
}) {
  const safeName =
    String(
      doctorName || 'Doctor'
    ).trim();

  const initials =
    safeName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(
        part =>
          part.charAt(0)
      )
      .join('')
      .toUpperCase();

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius:
            size / 2.8,
          backgroundColor:
            theme.accentSoft,
          borderColor:
            theme.accentBorder,
        },
      ]}
    >
      <Text
        style={[
          styles.avatarText,
          {
            color:
              theme.accentText,
            fontSize:
              size * 0.27,
          },
        ]}
      >
        {initials || 'DR'}
      </Text>
    </View>
  );
}


/* ============================================================
   STATUS BADGE
============================================================ */

function StatusBadge({
  appointment,
  theme,
}) {
  const config =
    getStatusConfig(
      appointment?.status,
      theme
    );

  return (
    <View
      style={[
        styles.statusBadge,
        {
          backgroundColor:
            config.backgroundColor,
          borderColor:
            config.borderColor,
        },
      ]}
    >
      <Ionicons
        name={config.icon}
        size={13}
        color={config.textColor}
      />

      <Text
        style={[
          styles.statusBadgeText,
          {
            color:
              config.textColor,
          },
        ]}
      >
        {config.label}
      </Text>
    </View>
  );
}


/* ============================================================
   MAIN SCREEN
============================================================ */

export default function AppointmentsScreen({
  navigation,
}) {
  const {
    isDarkMode,
  } =
    useContext(AuthContext) || {};

  const { showPopup } = useContext(PopupContext);

  const theme =
    useMemo(
      () =>
        getTheme(
          Boolean(isDarkMode)
        ),
      [isDarkMode]
    );

  const insets =
    useSafeAreaInsets();

  const tabBarHeight =
    useBottomTabBarHeight();

  const weekDays =
    useMemo(
      () =>
        generateWeekDays(),
      []
    );

  const todayKey =
    getLocalDateKey(
      new Date()
    );

  const [
    selectedDate,
    setSelectedDate,
  ] = useState(
    todayKey
  );

  const [
    appointments,
    setAppointments,
  ] = useState([]);

  const [
    cancellingId,
    setCancellingId,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');

  const [
    expandedId,
    setExpandedId,
  ] = useState(null);


  /* ==========================================================
     FETCH APPOINTMENTS
  ========================================================== */

  const fetchAppointments =
    useCallback(
      async () => {
        try {
          setErrorMessage('');

          const response =
            await api.get(
              'appointments/',
              {
                timeout: 10000,
              }
            );

          const payload =
            response?.data;

          const rawAppointments =
            Array.isArray(payload)
              ? payload
              : Array.isArray(
                  payload?.results
                )
                ? payload.results
                : [];

          const normalized =
            rawAppointments
              .map(
                normalizeAppointment
              )
              .sort(
                (a, b) => {
                  const aTime =
                    a.appointmentDate
                      ?.getTime() || 0;

                  const bTime =
                    b.appointmentDate
                      ?.getTime() || 0;

                  return (
                    aTime - bTime
                  );
                }
              );

          setAppointments(
            normalized
          );
        } catch (error) {
          console.error(
            'Appointments fetch error:',
            error
          );

          setAppointments([]);

          const status =
            error?.response
              ?.status;

          if (
            status === 401 ||
            status === 403
          ) {
            setErrorMessage(
              'Your session could not be verified. Please sign in again.'
            );
          } else if (
            status >= 500
          ) {
            setErrorMessage(
              'Appointments are temporarily unavailable. Please try again shortly.'
            );
          } else {
            setErrorMessage(
              'Unable to load your appointments. Check your connection and try again.'
            );
          }
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      []
    );


  /* ==========================================================
     REFRESH WHEN SCREEN GETS FOCUS
  ========================================================== */

  useFocusEffect(
    useCallback(
      () => {
        fetchAppointments();
      },
      [fetchAppointments]
    )
  );


  /* ==========================================================
     MANUAL REFRESH
  ========================================================== */

  const onRefresh =
    useCallback(
      () => {
        setRefreshing(true);
        fetchAppointments();
      },
      [fetchAppointments]
    );


  /* ==========================================================
     CANCEL APPOINTMENT
  ========================================================== */

  const handleCancelAppointment =
    useCallback(
      appointment => {
        const appointmentId =
          appointment?.id;

        if (
          !appointmentId ||
          cancellingId
        ) {
          return;
        }

        showPopup(
          'Cancel appointment?',
          `Are you sure you want to cancel your appointment with ${
            appointment?.doctorName ||
            'this provider'
          }?`,
          'warning',
          async () => {
            try {
              setCancellingId(
                appointmentId
              );

              await api.patch(
                `appointments/${appointmentId}/cancel/`
              );

              setExpandedId(
                current =>
                  current === appointmentId
                    ? null
                    : current
              );

              await cancelAppointmentReminders(
                appointmentId,
              );

              try {
                await sendAppointmentCancelledNotification({
                  appointmentId,
                  appointmentDate:
                    appointment?.appointment_date ||
                    appointment?.appointmentDate ||
                    appointment?.date,
                  doctorName:
                    appointment?.doctorName ||
                    appointment?.doctor_name,
                });
              } catch (notificationError) {
                console.warn(
                  'Unable to send appointment cancellation notification:',
                  notificationError?.message ||
                    notificationError,
                );
              }

              await fetchAppointments();

              showPopup(
                'Appointment cancelled',
                'Your appointment has been cancelled successfully.',
                'success'
              );
            } catch (error) {
              console.error(
                'Cancel appointment error:',
                error
              );

              const message =
                error?.response
                  ?.data?.error ||
                'We could not cancel this appointment. Please try again.';

              showPopup(
                'Cancellation failed',
                message,
                'error'
              );
            } finally {
              setCancellingId(
                null
              );
            }
          }
        );
      },
      [
        cancellingId,
        fetchAppointments,
        showPopup,
      ]
    );

  /* ==========================================================
   RESCHEDULE APPOINTMENT
========================================================== */

  const handleRescheduleAppointment =
    useCallback(
      appointment => {
        if (
          !appointment?.id ||
          !isCancellableAppointment(
            appointment
          )
        ) {
          return;
        }

        navigation.navigate(
          'BookAppointment',
          {
            mode: 'reschedule',

            appointmentId:
              appointment.id,

            appointmentDate:
              appointment.appointmentDate?.toISOString(),

            doctorName:
              appointment.doctorName,

            recordId:
              appointment.record ??
              null,
          }
        );
      },
      [
        navigation,
        isCancellableAppointment,
      ]
    );


  /* ==========================================================
     APPOINTMENT STATUS LOGIC
  ========================================================== */

  const isCancellableAppointment =
    useCallback(
      appointment => {
        const status =
          String(
            appointment?.status ||
              ''
          ).toUpperCase();

        const appointmentDate =
          appointment
            ?.appointmentDate;

        const allowedStatuses =
          [
            'SCHEDULED',
            'UPCOMING',
            'CONFIRMED',
            'PENDING',
          ];

        if (
          !appointmentDate ||
          !allowedStatuses.includes(
            status
          )
        ) {
          return false;
        }

        return (
          appointmentDate.getTime() >
          Date.now()
        );
      },
      []
    );


  /* ==========================================================
     UPCOMING
  ========================================================== */

  const upcomingAppointments =
    useMemo(
      () => {
        const now =
          Date.now();

        return appointments
          .filter(
            item => {
              const date =
                item?.appointmentDate;

              if (!date) {
                return false;
              }

              const status =
                String(
                  item?.status ||
                    ''
                ).toUpperCase();

              const active =
                [
                  'SCHEDULED',
                  'UPCOMING',
                  'CONFIRMED',
                  'PENDING',
                ].includes(
                  status
                );

              return (
                active &&
                date.getTime() >=
                  now
              );
            }
          )
          .sort(
            (a, b) =>
              a.appointmentDate.getTime() -
              b.appointmentDate.getTime()
          );
      },
      [appointments]
    );


  /* ==========================================================
     COMPLETED
  ========================================================== */

  const completedAppointments =
    useMemo(
      () =>
        appointments
          .filter(
            item =>
              String(
                item?.status ||
                  ''
              ).toUpperCase() ===
              'COMPLETED'
          )
          .sort(
            (a, b) => {
              const aTime =
                a.appointmentDate
                  ?.getTime() ||
                0;

              const bTime =
                b.appointmentDate
                  ?.getTime() ||
                0;

              return (
                bTime - aTime
              );
            }
          ),
      [appointments]
    );


  /* ==========================================================
     HISTORY
  ========================================================== */

  const historyAppointments =
    useMemo(
      () =>
        appointments
          .filter(
            item => {
              const status =
                String(
                  item?.status ||
                    ''
                ).toUpperCase();

              return (
                status ===
                  'COMPLETED' ||
                status ===
                  'CANCELLED' ||
                status ===
                  'CANCELED'
              );
            }
          )
          .sort(
            (a, b) => {
              const aTime =
                a.appointmentDate
                  ?.getTime() ||
                0;

              const bTime =
                b.appointmentDate
                  ?.getTime() ||
                0;

              return (
                bTime - aTime
              );
            }
          ),
      [appointments]
    );


  /* ==========================================================
     SELECTED DATE
  ========================================================== */

  const selectedDateAppointments =
    useMemo(
      () =>
        appointments
          .filter(
            item => {
              if (
                !item?.appointmentDate
              ) {
                return false;
              }

              return (
                getLocalDateKey(
                  item.appointmentDate
                ) ===
                selectedDate
              );
            }
          )
          .sort(
            (a, b) =>
              (
                a.appointmentDate
                  ?.getTime() || 0
              ) -
              (
                b.appointmentDate
                  ?.getTime() || 0
              )
          ),
      [
        appointments,
        selectedDate,
      ]
    );


  const nextAppointment =
    upcomingAppointments.length
      ? upcomingAppointments[0]
      : null;


  const selectedDateObject =
    useMemo(
      () => {
        const parsed =
          selectedDate
            ? new Date(
                `${selectedDate}T12:00:00`
              )
            : new Date();

        return Number.isNaN(
          parsed.getTime()
        )
          ? new Date()
          : parsed;
      },
      [selectedDate]
    );


  const selectedDateLabel =
    useMemo(
      () =>
        selectedDateObject
          .toLocaleDateString(
            [],
            {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            }
          ),
      [selectedDateObject]
    );


  /* ==========================================================
     UI ACTIONS
  ========================================================== */

  const toggleExpanded =
    useCallback(
      id => {
        setExpandedId(
          current =>
            current === id
              ? null
              : id
        );
      },
      []
    );


  const openBooking =
    useCallback(
      () => {
        navigation?.navigate(
          'BookAppointment'
        );
      },
      [navigation]
    );


  /* ==========================================================
     LOADING
  ========================================================== */

  if (loading) {
    return (
      <SafeAreaView
        edges={[
          'top',
          'bottom',
        ]}
        style={[
          styles.safeArea,
          {
            backgroundColor:
              theme.background,
          },
        ]}
      >
        <StatusBar
          barStyle={
            isDarkMode
              ? 'light-content'
              : 'dark-content'
          }
          backgroundColor={
            theme.background
          }
        />

        <View
          style={[
            styles.loadingScreen,
            {
              backgroundColor:
                theme.background,

              paddingBottom:
                insets.bottom +
                tabBarHeight,
            },
          ]}
        >
          <View
            style={[
              styles.loadingIcon,
              {
                backgroundColor:
                  theme.accentSoft,
                borderColor:
                  theme.accentBorder,
              },
            ]}
          >
            <Ionicons
              name="calendar-outline"
              size={28}
              color={
                theme.accent
              }
            />
          </View>

          <ActivityIndicator
            size="small"
            color={
              theme.accent
            }
          />

          <Text
            style={[
              styles.loadingTitle,
              {
                color:
                  theme.textPrimary,
              },
            ]}
          >
            Loading your appointments
          </Text>

          <Text
            style={[
              styles.loadingSubtitle,
              {
                color:
                  theme.textSecondary,
              },
            ]}
          >
            Fetching the latest information
            from your account.
          </Text>
        </View>
      </SafeAreaView>
    );
  }


  /* ==========================================================
     MAIN UI
  ========================================================== */

  return (
    <SafeAreaView
      edges={[
        'top',
        'bottom',
      ]}
      style={[
        styles.safeArea,
        {
          backgroundColor:
            theme.background,
        },
      ]}
    >
      <StatusBar
        barStyle={
          isDarkMode
            ? 'light-content'
            : 'dark-content'
        }
        backgroundColor={
          theme.background
        }
      />

      <ScrollView
        style={[
          styles.scroll,
          {
            backgroundColor:
              theme.background,
          },
        ]}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom:
              tabBarHeight +
              insets.bottom +
              42,
          },
        ]}
        showsVerticalScrollIndicator={
          false
        }
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={
              onRefresh
            }
            tintColor={
              theme.accent
            }
            colors={[
              theme.accent,
            ]}
          />
        }
      >

        {/* =====================================================
            HEADER
        ===================================================== */}

        <AnimatedItem
          triggerKey={
            'appointments-header'
          }
        >
          <View
            style={
              styles.header
            }
          >
            <View
              style={
                styles.headerTextBlock
              }
            >
              <View
                style={
                  styles.headerEyebrow
                }
              >
                <View
                  style={[
                    styles.headerEyebrowDot,
                    {
                      backgroundColor:
                        theme.accent,
                    },
                  ]}
                />

                <Text
                  style={[
                    styles.headerEyebrowText,
                    {
                      color:
                        theme.accentText,
                    },
                  ]}
                >
                  YOUR CARE
                </Text>
              </View>

              <Text
                style={[
                  styles.title,
                  {
                    color:
                      theme.textPrimary,
                  },
                ]}
              >
                Appointments
              </Text>

              <Text
                style={[
                  styles.subtitle,
                  {
                    color:
                      theme.textSecondary,
                  },
                ]}
              >
                Your scheduled consultations
                and care history.
              </Text>
            </View>

            <View
              style={[
                styles.headerCalendarIcon,
                {
                  backgroundColor:
                    theme.accentSoft,
                  borderColor:
                    theme.accentBorder,
                },
              ]}
            >
              <Ionicons
                name="calendar"
                size={22}
                color={
                  theme.accent
                }
              />
            </View>
          </View>
        </AnimatedItem>


        {/* =====================================================
            NEXT APPOINTMENT
        ===================================================== */}

        {nextAppointment && (
          <AnimatedItem
            delay={60}
            triggerKey={
              `next-${nextAppointment.id}`
            }
          >
            <View
              style={[
                styles.nextCard,
                {
                  backgroundColor:
                    theme.card,
                  borderColor:
                    theme.border,
                  shadowColor:
                    theme.shadow,
                },
              ]}
            >
              <View
                style={
                  styles.nextCardGlow
                }
              />

              <View
                style={
                  styles.nextCardHeader
                }
              >
                <View>
                  <Text
                    style={[
                      styles.nextEyebrow,
                      {
                        color:
                          theme.accentText,
                      },
                    ]}
                  >
                    NEXT APPOINTMENT
                  </Text>

                  <Text
                    style={[
                      styles.nextDateLabel,
                      {
                        color:
                          theme.textPrimary,
                      },
                    ]}
                  >
                    {formatRelativeDate(
                      nextAppointment.appointmentDate
                    )}
                  </Text>
                </View>

                <StatusBadge
                  appointment={
                    nextAppointment
                  }
                  theme={
                    theme
                  }
                />
              </View>

              <View
                style={
                  styles.nextDoctorRow
                }
              >
                <DoctorAvatar
                  doctorName={
                    nextAppointment.doctorName
                  }
                  theme={
                    theme
                  }
                  size={64}
                />

                <View
                  style={
                    styles.nextDoctorInfo
                  }
                >
                  <Text
                    style={[
                      styles.nextDoctorName,
                      {
                        color:
                          theme.textPrimary,
                      },
                    ]}
                    numberOfLines={2}
                  >
                    {
                      nextAppointment.doctorName
                    }
                  </Text>

                  <Text
                    style={[
                      styles.nextDoctorMeta,
                      {
                        color:
                          theme.textSecondary,
                      },
                    ]}
                  >
                    {formatFullDate(
                      nextAppointment.appointmentDate
                    )}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.nextTimeBox,
                  {
                    backgroundColor:
                      theme.accentSoft,
                    borderColor:
                      theme.accentBorder,
                  },
                ]}
              >
                <View
                  style={
                    styles.nextTimeIcon
                  }
                >
                  <Ionicons
                    name="time-outline"
                    size={18}
                    color={
                      theme.accent
                    }
                  />
                </View>

                <View
                  style={
                    styles.nextTimeCopy
                  }
                >
                  <Text
                    style={[
                      styles.nextTimeLabel,
                      {
                        color:
                          theme.textMuted,
                      },
                    ]}
                  >
                    Appointment time
                  </Text>

                  <Text
                    style={[
                      styles.nextTimeValue,
                      {
                        color:
                          theme.textPrimary,
                      },
                    ]}
                  >
                    {formatTime(
                      nextAppointment.appointmentDate
                    )}
                  </Text>
                </View>
              </View>
            </View>
          </AnimatedItem>
        )}


        {/* =====================================================
            STATS
        ===================================================== */}

        <AnimatedItem
          delay={100}
          triggerKey={
            `stats-${appointments.length}`
          }
        >
          <View
            style={
              styles.statsRow
            }
          >

            {/* Upcoming */}
            <View
              style={[
                styles.statCard,
                {
                  backgroundColor:
                    theme.card,
                  borderColor:
                    theme.border,
                },
              ]}
            >
              <View
                style={[
                  styles.statIcon,
                  {
                    backgroundColor:
                      theme.accentSoft,
                  },
                ]}
              >
                <Ionicons
                  name="calendar-outline"
                  size={17}
                  color={
                    theme.accent
                  }
                />
              </View>

              <Text
                style={[
                  styles.statValue,
                  {
                    color:
                      theme.textPrimary,
                  },
                ]}
              >
                {
                  upcomingAppointments.length
                }
              </Text>

              <Text
                style={[
                  styles.statLabel,
                  {
                    color:
                      theme.textSecondary,
                  },
                ]}
              >
                Upcoming
              </Text>
            </View>


            {/* Completed */}
            <View
              style={[
                styles.statCard,
                {
                  backgroundColor:
                    theme.card,
                  borderColor:
                    theme.border,
                },
              ]}
            >
              <View
                style={[
                  styles.statIcon,
                  {
                    backgroundColor:
                      theme.successBg,
                  },
                ]}
              >
                <Ionicons
                  name="checkmark-done-outline"
                  size={17}
                  color={
                    theme.successText
                  }
                />
              </View>

              <Text
                style={[
                  styles.statValue,
                  {
                    color:
                      theme.textPrimary,
                  },
                ]}
              >
                {
                  completedAppointments.length
                }
              </Text>

              <Text
                style={[
                  styles.statLabel,
                  {
                    color:
                      theme.textSecondary,
                  },
                ]}
              >
                Completed
              </Text>
            </View>


            {/* Total */}
            <View
              style={[
                styles.statCard,
                {
                  backgroundColor:
                    theme.card,
                  borderColor:
                    theme.border,
                },
              ]}
            >
              <View
                style={[
                  styles.statIcon,
                  {
                    backgroundColor:
                      theme.warningBg,
                  },
                ]}
              >
                <Ionicons
                  name="layers-outline"
                  size={17}
                  color={
                    theme.warningText
                  }
                />
              </View>

              <Text
                style={[
                  styles.statValue,
                  {
                    color:
                      theme.textPrimary,
                  },
                ]}
              >
                {
                  appointments.length
                }
              </Text>

              <Text
                style={[
                  styles.statLabel,
                  {
                    color:
                      theme.textSecondary,
                  },
                ]}
              >
                Total
              </Text>
            </View>
          </View>
        </AnimatedItem>


        {/* =====================================================
            CALENDAR
        ===================================================== */}

        <AnimatedItem
          delay={140}
          triggerKey={
            `calendar-${selectedDate}`
          }
        >
          <View
            style={
              styles.calendarSection
            }
          >
            <View
              style={
                styles.sectionHeader
              }
            >
              <View>
                <Text
                  style={[
                    styles.sectionTitle,
                    {
                      color:
                        theme.textPrimary,
                    },
                  ]}
                >
                  Your schedule
                </Text>

                <Text
                  style={[
                    styles.sectionSubtitle,
                    {
                      color:
                        theme.textSecondary,
                    },
                  ]}
                >
                  Select a date to view
                  appointments.
                </Text>
              </View>

              <View
                style={[
                  styles.monthPill,
                  {
                    backgroundColor:
                      theme.surface,
                    borderColor:
                      theme.border,
                  },
                ]}
              >
                <Ionicons
                  name="calendar-clear-outline"
                  size={14}
                  color={
                    theme.textSecondary
                  }
                />

                <Text
                  style={[
                    styles.monthPillText,
                    {
                      color:
                        theme.textSecondary,
                    },
                  ]}
                >
                  {selectedDateObject.toLocaleDateString(
                    [],
                    {
                      month: 'long',
                    }
                  )}
                </Text>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={
                false
              }
              contentContainerStyle={
                styles.daysContent
              }
            >
              {weekDays.map(
                day => {
                  const selected =
                    day.fullDate ===
                    selectedDate;

                  return (
                    <TouchableOpacity
                      key={
                        day.fullDate
                      }
                      activeOpacity={
                        0.8
                      }
                      onPress={() =>
                        setSelectedDate(
                          day.fullDate
                        )
                      }
                      style={[
                        styles.dayCard,
                        {
                          backgroundColor:
                            selected
                              ? theme.accent
                              : theme.card,

                          borderColor:
                            selected
                              ? theme.accent
                              : theme.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayName,
                          {
                            color:
                              selected
                                ? '#06110F'
                                : theme.textMuted,
                          },
                        ]}
                      >
                        {
                          day.dayName
                        }
                      </Text>

                      <Text
                        style={[
                          styles.dayNumber,
                          {
                            color:
                              selected
                                ? '#06110F'
                                : theme.textPrimary,
                          },
                        ]}
                      >
                        {
                          day.dateNumber
                        }
                      </Text>

                      {day.isToday && (
                        <View
                          style={[
                            styles.todayDot,
                            {
                              backgroundColor:
                                selected
                                  ? '#06110F'
                                  : theme.accent,
                            },
                          ]}
                        />
                      )}
                    </TouchableOpacity>
                  );
                }
              )}
            </ScrollView>
          </View>
        </AnimatedItem>


        {/* =====================================================
            SELECTED DATE
        ===================================================== */}

        <AnimatedItem
          delay={180}
          triggerKey={
            `selected-${selectedDate}-${selectedDateAppointments.length}`
          }
        >
          <View
            style={
              styles.selectedDateHeader
            }
          >
            <View>
              <Text
                style={[
                  styles.selectedDateTitle,
                  {
                    color:
                      theme.textPrimary,
                  },
                ]}
              >
                {selectedDateLabel}
              </Text>

              <Text
                style={[
                  styles.selectedDateSubtitle,
                  {
                    color:
                      theme.textSecondary,
                  },
                ]}
              >
                {
                  selectedDateAppointments.length
                }{' '}
                appointment
                {
                  selectedDateAppointments.length ===
                  1
                    ? ''
                    : 's'
                }
              </Text>
            </View>

            <View
              style={[
                styles.countPill,
                {
                  backgroundColor:
                    selectedDateAppointments.length
                      ? theme.accentSoft
                      : theme.surface,

                  borderColor:
                    selectedDateAppointments.length
                      ? theme.accentBorder
                      : theme.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.countPillText,
                  {
                    color:
                      selectedDateAppointments.length
                        ? theme.accentText
                        : theme.textMuted,
                  },
                ]}
              >
                {
                  selectedDateAppointments.length
                }
              </Text>
            </View>
          </View>
        </AnimatedItem>


        {/* =====================================================
            ERROR
        ===================================================== */}

        {errorMessage ? (
          <AnimatedItem
            delay={190}
            triggerKey={
              `error-${errorMessage}`
            }
          >
            <View
              style={[
                styles.errorCard,
                {
                  backgroundColor:
                    theme.dangerBg,
                  borderColor:
                    theme.dangerBorder,
                },
              ]}
            >
              <View
                style={[
                  styles.errorIcon,
                  {
                    backgroundColor:
                      theme.dangerBorder,
                  },
                ]}
              >
                <Ionicons
                  name="warning-outline"
                  size={18}
                  color={
                    theme.dangerText
                  }
                />
              </View>

              <View
                style={
                  styles.errorCopy
                }
              >
                <Text
                  style={[
                    styles.errorTitle,
                    {
                      color:
                        theme.dangerText,
                    },
                  ]}
                >
                  Couldn't load appointments
                </Text>

                <Text
                  style={[
                    styles.errorMessage,
                    {
                      color:
                        theme.dangerText,
                    },
                  ]}
                >
                  {errorMessage}
                </Text>

                <TouchableOpacity
                  onPress={
                    fetchAppointments
                  }
                  activeOpacity={
                    0.8
                  }
                  style={[
                    styles.retryButton,
                    {
                      borderColor:
                        theme.dangerBorder,
                    },
                  ]}
                >
                  <Ionicons
                    name="refresh-outline"
                    size={15}
                    color={
                      theme.dangerText
                    }
                  />

                  <Text
                    style={[
                      styles.retryButtonText,
                      {
                        color:
                          theme.dangerText,
                      },
                    ]}
                  >
                    Try again
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </AnimatedItem>
        ) : null}


        {/* =====================================================
            APPOINTMENT LIST
        ===================================================== */}

        {selectedDateAppointments.length >
        0 ? (
          selectedDateAppointments.map(
            (
              appointment,
              index
            ) => {
              const expanded =
                expandedId ===
                appointment.id;

              const statusConfig =
                getStatusConfig(
                  appointment.status,
                  theme
                );

              const canCancel =
                isCancellableAppointment(
                  appointment
                );

              return (
                <AnimatedItem
                  key={
                    String(
                      appointment.id
                    )
                  }
                  index={index}
                  delay={210}
                  triggerKey={
                    `appointment-${selectedDate}-${appointment.id}`
                  }
                >
                  <View
                    style={[
                      styles.appointmentCard,
                      {
                        backgroundColor:
                          theme.card,

                        borderColor:
                          expanded
                            ? theme.accentBorder
                            : theme.border,

                        shadowColor:
                          theme.shadow,
                      },
                    ]}
                  >

                    {/* TOP SUMMARY */}
                    <TouchableOpacity
                      activeOpacity={
                        0.9
                      }
                      onPress={() =>
                        toggleExpanded(
                          appointment.id
                        )
                      }
                    >
                      <View
                        style={
                          styles.appointmentTopRow
                        }
                      >
                        <DoctorAvatar
                          doctorName={
                            appointment.doctorName
                          }
                          theme={
                            theme
                          }
                          size={54}
                        />

                        <View
                          style={
                            styles.appointmentMain
                          }
                        >
                          <Text
                            style={[
                              styles.doctorName,
                              {
                                color:
                                  theme.textPrimary,
                              },
                            ]}
                            numberOfLines={2}
                          >
                            {
                              appointment.doctorName
                            }
                          </Text>

                          <Text
                            style={[
                              styles.doctorDate,
                              {
                                color:
                                  theme.textSecondary,
                              },
                            ]}
                          >
                            {formatRelativeDate(
                              appointment.appointmentDate
                            )}
                            {' • '}
                            {formatTime(
                              appointment.appointmentDate
                            )}
                          </Text>
                        </View>

                        <StatusBadge
                          appointment={
                            appointment
                          }
                          theme={
                            theme
                          }
                        />
                      </View>
                    </TouchableOpacity>


                    {/* DATE + TIME */}
                    <View
                      style={[
                        styles.appointmentDivider,
                        {
                          backgroundColor:
                            theme.borderSoft,
                        },
                      ]}
                    />

                    <View
                      style={
                        styles.appointmentInfoGrid
                      }
                    >
                      <View
                        style={
                          styles.infoItem
                        }
                      >
                        <View
                          style={[
                            styles.infoIcon,
                            {
                              backgroundColor:
                                theme.accentSoft,
                            },
                          ]}
                        >
                          <Ionicons
                            name="calendar-outline"
                            size={15}
                            color={
                              theme.accent
                            }
                          />
                        </View>

                        <View
                          style={
                            styles.infoCopy
                          }
                        >
                          <Text
                            style={[
                              styles.infoLabel,
                              {
                                color:
                                  theme.textMuted,
                              },
                            ]}
                          >
                            DATE
                          </Text>

                          <Text
                            style={[
                              styles.infoValue,
                              {
                                color:
                                  theme.textPrimary,
                              },
                            ]}
                          >
                            {formatShortDate(
                              appointment.appointmentDate
                            )}
                          </Text>
                        </View>
                      </View>


                      <View
                        style={
                          styles.infoItem
                        }
                      >
                        <View
                          style={[
                            styles.infoIcon,
                            {
                              backgroundColor:
                                theme.accentSoft,
                            },
                          ]}
                        >
                          <Ionicons
                            name="time-outline"
                            size={15}
                            color={
                              theme.accent
                            }
                          />
                        </View>

                        <View
                          style={
                            styles.infoCopy
                          }
                        >
                          <Text
                            style={[
                              styles.infoLabel,
                              {
                                color:
                                  theme.textMuted,
                              },
                            ]}
                          >
                            TIME
                          </Text>

                          <Text
                            style={[
                              styles.infoValue,
                              {
                                color:
                                  theme.textPrimary,
                              },
                            ]}
                          >
                            {formatTime(
                              appointment.appointmentDate
                            )}
                          </Text>
                        </View>
                      </View>
                    </View>


                    {/* LINKED RECORD */}
                    {appointment.record ? (
                      <View
                        style={[
                          styles.recordLink,
                          {
                            backgroundColor:
                              theme.surface,
                            borderColor:
                              theme.border,
                          },
                        ]}
                      >
                        <Ionicons
                          name="document-text-outline"
                          size={15}
                          color={
                            theme.textSecondary
                          }
                        />

                        <Text
                          style={[
                            styles.recordLinkText,
                            {
                              color:
                                theme.textSecondary,
                            },
                          ]}
                        >
                          Linked health record
                        </Text>

                        <View
                          style={
                            styles.recordDot
                          }
                        />

                        <Text
                          style={[
                            styles.recordIdText,
                            {
                              color:
                                theme.textMuted,
                            },
                          ]}
                        >
                          #
                          {String(
                            appointment.record
                          )}
                        </Text>
                      </View>
                    ) : null}


                    {/* EXPAND CONTROL */}
                    <TouchableOpacity
                      activeOpacity={
                        0.8
                      }
                      onPress={() =>
                        toggleExpanded(
                          appointment.id
                        )
                      }
                      style={
                        styles.expandRow
                      }
                    >
                      <Text
                        style={[
                          styles.expandText,
                          {
                            color:
                              theme.accentText,
                          },
                        ]}
                      >
                        {expanded
                          ? 'Hide details'
                          : 'View details'}
                      </Text>

                      <Ionicons
                        name={
                          expanded
                            ? 'chevron-up'
                            : 'chevron-down'
                        }
                        size={17}
                        color={
                          theme.accent
                        }
                      />
                    </TouchableOpacity>


                    {/* EXPANDED PANEL */}
                    {expanded && (
                      <View
                        style={[
                          styles.expandedPanel,
                          {
                            backgroundColor:
                              theme.surface,
                            borderColor:
                              theme.border,
                          },
                        ]}
                      >

                        <View
                          style={
                            styles.expandedRow
                          }
                        >
                          <Ionicons
                            name={
                              statusConfig.icon
                            }
                            size={16}
                            color={
                              statusConfig.textColor
                            }
                          />

                          <Text
                            style={[
                              styles.expandedLabel,
                              {
                                color:
                                  theme.textSecondary,
                              },
                            ]}
                          >
                            Status
                          </Text>

                          <Text
                            style={[
                              styles.expandedValue,
                              {
                                color:
                                  statusConfig.textColor,
                              },
                            ]}
                          >
                            {
                              statusConfig.label
                            }
                          </Text>
                        </View>


                        <View
                          style={
                            styles.expandedRow
                          }
                        >
                          <Ionicons
                            name="person-outline"
                            size={16}
                            color={
                              theme.textSecondary
                            }
                          />

                          <Text
                            style={[
                              styles.expandedLabel,
                              {
                                color:
                                  theme.textSecondary,
                              },
                            ]}
                          >
                            Doctor
                          </Text>

                          <Text
                            style={[
                              styles.expandedValue,
                              {
                                color:
                                  theme.textPrimary,
                              },
                            ]}
                            numberOfLines={2}
                          >
                            {
                              appointment.doctorName
                            }
                          </Text>
                        </View>


                        <View
                          style={
                            styles.expandedRow
                          }
                        >
                          <Ionicons
                            name="calendar-number-outline"
                            size={16}
                            color={
                              theme.textSecondary
                            }
                          />

                          <Text
                            style={[
                              styles.expandedLabel,
                              {
                                color:
                                  theme.textSecondary,
                              },
                            ]}
                          >
                            Date
                          </Text>

                          <Text
                            style={[
                              styles.expandedValue,
                              {
                                color:
                                  theme.textPrimary,
                              },
                            ]}
                          >
                            {formatFullDate(
                              appointment.appointmentDate
                            )}
                          </Text>
                        </View>

                        {/* RESCHEDULE BUTTON */}
                        {canCancel ? (
                          <TouchableOpacity
                            activeOpacity={0.82}
                            onPress={() =>
                              handleRescheduleAppointment(
                                appointment
                              )
                            }
                            disabled={
                              cancellingId ===
                              appointment.id
                            }
                            style={[
                              styles.rescheduleButton,
                              {
                                backgroundColor:
                                  theme.accentSoft,

                                borderColor:
                                  theme.accentBorder,

                                opacity:
                                  cancellingId ===
                                  appointment.id
                                    ? 0.65
                                    : 1,
                              },
                            ]}
                          >
                            <Ionicons
                              name="calendar-outline"
                              size={17}
                              color={theme.accentText}
                            />

                            <Text
                              style={[
                                styles.rescheduleButtonText,
                                {
                                  color:
                                    theme.accentText,
                                },
                              ]}
                            >
                              Reschedule appointment
                            </Text>
                          </TouchableOpacity>
                        ) : null}

                        {/* CANCEL BUTTON */}
                        {canCancel ? (
                          <TouchableOpacity
                            activeOpacity={
                              0.82
                            }
                            onPress={() =>
                              handleCancelAppointment(
                                appointment
                              )
                            }
                            disabled={
                              cancellingId ===
                              appointment.id
                            }
                            style={[
                              styles.cancelButton,
                              {
                                backgroundColor:
                                  theme.dangerBg,

                                borderColor:
                                  theme.dangerBorder,

                                opacity:
                                  cancellingId ===
                                  appointment.id
                                    ? 0.75
                                    : 1,
                              },
                            ]}
                          >
                            {cancellingId ===
                            appointment.id ? (
                              <>
                                <ActivityIndicator
                                  size="small"
                                  color={
                                    theme.dangerText
                                  }
                                />

                                <Text
                                  style={[
                                    styles.cancelButtonText,
                                    {
                                      color:
                                        theme.dangerText,
                                    },
                                  ]}
                                >
                                  Cancelling...
                                </Text>
                              </>
                            ) : (
                              <>
                                <Ionicons
                                  name="close-circle-outline"
                                  size={17}
                                  color={
                                    theme.dangerText
                                  }
                                />

                                <Text
                                  style={[
                                    styles.cancelButtonText,
                                    {
                                      color:
                                        theme.dangerText,
                                    },
                                  ]}
                                >
                                  Cancel appointment
                                </Text>
                              </>
                            )}
                          </TouchableOpacity>
                        ) : null}

                      </View>
                    )}
                  </View>
                </AnimatedItem>
              );
            }
          )
        ) : (
          /* ===================================================
             EMPTY DATE
          =================================================== */

          <AnimatedItem
            delay={220}
            triggerKey={
              `empty-${selectedDate}`
            }
          >
            <View
              style={[
                styles.emptyCard,
                {
                  backgroundColor:
                    theme.card,

                  borderColor:
                    theme.border,
                },
              ]}
            >
              <View
                style={[
                  styles.emptyIcon,
                  {
                    backgroundColor:
                      theme.accentSoft,

                    borderColor:
                      theme.accentBorder,
                  },
                ]}
              >
                <Ionicons
                  name="calendar-outline"
                  size={30}
                  color={
                    theme.accent
                  }
                />
              </View>

              <Text
                style={[
                  styles.emptyTitle,
                  {
                    color:
                      theme.textPrimary,
                  },
                ]}
              >
                No appointments here
              </Text>

              <Text
                style={[
                  styles.emptySubtitle,
                  {
                    color:
                      theme.textSecondary,
                  },
                ]}
              >
                There are no appointments stored
                for{' '}
                {selectedDateLabel.toLowerCase()}.
              </Text>

              <TouchableOpacity
                activeOpacity={
                  0.82
                }
                onPress={
                  openBooking
                }
                style={[
                  styles.emptyAction,
                  {
                    backgroundColor:
                      theme.accent,
                  },
                ]}
              >
                <Ionicons
                  name="add"
                  size={18}
                  color="#06110F"
                />

                <Text
                  style={
                    styles.emptyActionText
                  }
                >
                  Book an Appointment
                </Text>
              </TouchableOpacity>
            </View>
          </AnimatedItem>
        )}


        {/* =====================================================
            HISTORY
        ===================================================== */}

        {historyAppointments.length >
          0 && (
          <AnimatedItem
            delay={260}
            triggerKey={
              `history-${historyAppointments.length}`
            }
          >
            <View
              style={
                styles.historySection
              }
            >
              <View
                style={
                  styles.sectionHeader
                }
              >
                <View>
                  <Text
                    style={[
                      styles.sectionTitle,
                      {
                        color:
                          theme.textPrimary,
                      },
                    ]}
                  >
                    Recent history
                  </Text>

                  <Text
                    style={[
                      styles.sectionSubtitle,
                      {
                        color:
                          theme.textSecondary,
                      },
                    ]}
                  >
                    Your completed and cancelled
                    appointments.
                  </Text>
                </View>

                <View
                  style={[
                    styles.historyCount,
                    {
                      backgroundColor:
                        theme.surface,

                      borderColor:
                        theme.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="time-outline"
                    size={13}
                    color={
                      theme.textSecondary
                    }
                  />

                  <Text
                    style={[
                      styles.historyCountText,
                      {
                        color:
                          theme.textSecondary,
                      },
                    ]}
                  >
                    {
                      historyAppointments.length
                    }
                  </Text>
                </View>
              </View>

              {historyAppointments
                .slice(0, 5)
                .map(
                  (
                    appointment,
                    index
                  ) => {
                    const historyConfig =
                      getStatusConfig(
                        appointment.status,
                        theme
                      );

                    return (
                      <AnimatedItem
                        key={`history-${appointment.id}`}
                        index={
                          index
                        }
                        delay={
                          290
                        }
                        triggerKey={
                          `history-item-${appointment.id}`
                        }
                      >
                        <View
                          style={[
                            styles.historyCard,
                            {
                              backgroundColor:
                                theme.card,

                              borderColor:
                                theme.border,
                            },
                          ]}
                        >
                          <DoctorAvatar
                            doctorName={
                              appointment.doctorName
                            }
                            theme={
                              theme
                            }
                            size={46}
                          />

                          <View
                            style={
                              styles.historyMain
                            }
                          >
                            <Text
                              style={[
                                styles.historyDoctor,
                                {
                                  color:
                                    theme.textPrimary,
                                },
                              ]}
                              numberOfLines={1}
                            >
                              {
                                appointment.doctorName
                              }
                            </Text>

                            <Text
                              style={[
                                styles.historyDate,
                                {
                                  color:
                                    theme.textSecondary,
                                },
                              ]}
                            >
                              {formatShortDate(
                                appointment.appointmentDate
                              )}
                            </Text>
                          </View>

                          <View
                            style={[
                              styles.historyStatusPill,
                              {
                                backgroundColor:
                                  historyConfig.backgroundColor,

                                borderColor:
                                  historyConfig.borderColor,
                              },
                            ]}
                          >
                            <Ionicons
                              name={
                                historyConfig.icon
                              }
                              size={12}
                              color={
                                historyConfig.textColor
                              }
                            />

                            <Text
                              style={[
                                styles.historyStatusPillText,
                                {
                                  color:
                                    historyConfig.textColor,
                                },
                              ]}
                            >
                              {
                                historyConfig.label
                              }
                            </Text>
                          </View>
                        </View>
                      </AnimatedItem>
                    );
                  }
                )}
            </View>
          </AnimatedItem>
        )}


        {/* =====================================================
            DATA NOTE
        ===================================================== */}

        <AnimatedItem
          delay={330}
          triggerKey="data-note"
        >
          <View
            style={[
              styles.dataNote,
              {
                backgroundColor:
                  theme.surface,

                borderColor:
                  theme.border,
              },
            ]}
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={16}
              color={
                theme.accent
              }
            />

            <Text
              style={[
                styles.dataNoteText,
                {
                  color:
                    theme.textSecondary,
                },
              ]}
            >
              CareSense displays appointment information
              stored in your account. No doctor details or
              appointment times are invented when the backend
              does not provide them.
            </Text>
          </View>
        </AnimatedItem>

      </ScrollView>


      {/* =====================================================
          FLOATING BOOK BUTTON
      ===================================================== */}

      <TouchableOpacity
        activeOpacity={
          0.85
        }
        onPress={
          openBooking
        }
        style={[
          styles.fab,
          {
            backgroundColor:
              theme.accent,

            bottom:
              tabBarHeight +
              insets.bottom +
              18,

            shadowColor:
              theme.accent,
          },
        ]}
      >
        <Ionicons
          name="add"
          size={24}
          color="#06110F"
        />

        <Text
          style={
            styles.fabText
          }
        >
          Book
        </Text>
      </TouchableOpacity>

    </SafeAreaView>
  );
}


/* ============================================================
   STYLES
============================================================ */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  scroll: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 10,
  },


  /* ==========================================================
     LOADING
  ========================================================== */

  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },

  loadingIcon: {
    width: 64,
    height: 64,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  loadingTitle: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },

  loadingSubtitle: {
    marginTop: 7,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    maxWidth: 290,
  },


  /* ==========================================================
     HEADER
  ========================================================== */

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingTop: 7,
  },

  headerTextBlock: {
    flex: 1,
    paddingRight: 15,
  },

  headerEyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 7,
  },

  headerEyebrowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  headerEyebrowText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.4,
  },

  title: {
    fontSize: 30,
    lineHeight: 35,
    fontWeight: '850',
    letterSpacing: -0.8,
  },

  subtitle: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    maxWidth: 320,
  },

  headerCalendarIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },


  /* ==========================================================
     NEXT APPOINTMENT
  ========================================================== */

  nextCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 23,
    borderWidth: 1,
    padding: 17,
    marginBottom: 15,
    elevation: 5,
    shadowOffset: {
      width: 0,
      height: 7,
    },
    shadowOpacity: 0.12,
    shadowRadius: 18,
  },

  nextCardGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    right: -45,
    top: -45,
    backgroundColor:
      'rgba(0,212,197,0.08)',
  },

  nextCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 17,
  },

  nextEyebrow: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.15,
    marginBottom: 5,
  },

  nextDateLabel: {
    fontSize: 18,
    fontWeight: '820',
  },

  nextDoctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },

  nextDoctorInfo: {
    flex: 1,
    marginLeft: 13,
  },

  nextDoctorName: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '800',
  },

  nextDoctorMeta: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 17,
  },

  nextTimeBox: {
    minHeight: 61,
    borderRadius: 17,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },

  nextTimeIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      'rgba(0,212,197,0.08)',
  },

  nextTimeCopy: {
    marginLeft: 9,
  },

  nextTimeLabel: {
    fontSize: 9,
    fontWeight: '650',
    marginBottom: 2,
  },

  nextTimeValue: {
    fontSize: 16,
    fontWeight: '800',
  },


  /* ==========================================================
     AVATAR
  ========================================================== */

  avatar: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  avatarText: {
    fontWeight: '900',
    letterSpacing: 0.2,
  },


  /* ==========================================================
     STATUS BADGE
  ========================================================== */

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 28,
    paddingHorizontal: 9,
    borderRadius: 999,
    borderWidth: 1,
  },

  statusBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
  },


  /* ==========================================================
     STATS
  ========================================================== */

  statsRow: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 21,
  },

  statCard: {
    flex: 1,
    minHeight: 103,
    borderRadius: 17,
    borderWidth: 1,
    padding: 12,
  },

  statIcon: {
    width: 31,
    height: 31,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },

  statValue: {
    fontSize: 19,
    fontWeight: '850',
  },

  statLabel: {
    fontSize: 9.5,
    fontWeight: '650',
    marginTop: 2,
  },


  /* ==========================================================
     SECTION
  ========================================================== */

  calendarSection: {
    marginBottom: 20,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '820',
  },

  sectionSubtitle: {
    fontSize: 10.5,
    lineHeight: 16,
    marginTop: 3,
  },

  monthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 31,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
  },

  monthPillText: {
    fontSize: 9.5,
    fontWeight: '700',
  },


  /* ==========================================================
     CALENDAR
  ========================================================== */

  daysContent: {
    gap: 8,
    paddingVertical: 2,
  },

  dayCard: {
    width: 53,
    height: 72,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dayName: {
    fontSize: 9.5,
    fontWeight: '750',
    marginBottom: 6,
  },

  dayNumber: {
    fontSize: 19,
    fontWeight: '850',
  },

  todayDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 6,
  },


  /* ==========================================================
     SELECTED DATE
  ========================================================== */

  selectedDateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 11,
  },

  selectedDateTitle: {
    fontSize: 15,
    fontWeight: '820',
  },

  selectedDateSubtitle: {
    fontSize: 10.5,
    marginTop: 3,
  },

  countPill: {
    minWidth: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  countPillText: {
    fontSize: 13,
    fontWeight: '850',
  },


  /* ==========================================================
     ERROR
  ========================================================== */

  errorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 18,
    borderWidth: 1,
    padding: 13,
    marginBottom: 14,
  },

  errorIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  errorCopy: {
    flex: 1,
    marginLeft: 10,
  },

  errorTitle: {
    fontSize: 12,
    fontWeight: '850',
  },

  errorMessage: {
    fontSize: 10.5,
    lineHeight: 16,
    marginTop: 4,
  },

  retryButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 9,
    paddingVertical: 6,
    marginTop: 9,
  },

  retryButtonText: {
    fontSize: 10,
    fontWeight: '800',
  },


  /* ==========================================================
     APPOINTMENT CARD
  ========================================================== */

  appointmentCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },

  appointmentTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  appointmentMain: {
    flex: 1,
    minWidth: 0,
    marginLeft: 11,
    marginRight: 8,
  },

  doctorName: {
    fontSize: 14.5,
    fontWeight: '820',
    lineHeight: 19,
  },

  doctorDate: {
    fontSize: 10.5,
    marginTop: 5,
  },

  appointmentDivider: {
    height: 1,
    marginVertical: 13,
  },

  appointmentInfoGrid: {
    flexDirection: 'row',
    gap: 10,
  },

  infoItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  infoCopy: {
    flex: 1,
    marginLeft: 8,
  },

  infoLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 2,
  },

  infoValue: {
    fontSize: 10.5,
    fontWeight: '750',
  },

  recordLink: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    marginTop: 12,
  },

  recordLinkText: {
    fontSize: 9.5,
    fontWeight: '650',
    marginLeft: 6,
  },

  recordDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    marginHorizontal: 6,
    backgroundColor:
      '#64748B',
  },

  recordIdText: {
    fontSize: 9.5,
    fontWeight: '650',
  },

  expandRow: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 7,
  },

  expandText: {
    fontSize: 10.5,
    fontWeight: '800',
  },

  expandedPanel: {
    borderWidth: 1,
    borderRadius: 15,
    padding: 11,
    marginTop: 2,
  },

  expandedRow: {
    minHeight: 31,
    flexDirection: 'row',
    alignItems: 'center',
  },

  expandedLabel: {
    fontSize: 9.5,
    fontWeight: '650',
    width: 63,
    marginLeft: 8,
  },

  expandedValue: {
    flex: 1,
    fontSize: 10,
    fontWeight: '750',
    textAlign: 'right',
  },


  /* ==========================================================
     CANCEL BUTTON
  ========================================================== */

  cancelButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginTop: 12,
  },

  cancelButtonText: {
    fontSize: 10.5,
    fontWeight: '850',
  },


  /* ==========================================================
     EMPTY
  ========================================================== */

  emptyCard: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 24,
    paddingVertical: 31,
    marginTop: 2,
    marginBottom: 16,
  },

  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: '820',
  },

  emptySubtitle: {
    fontSize: 10.5,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 300,
  },

  emptyAction: {
    minHeight: 47,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 14,
    paddingHorizontal: 17,
    marginTop: 17,
  },

  emptyActionText: {
    color: '#06110F',
    fontSize: 11.5,
    fontWeight: '850',
  },


  /* ==========================================================
     HISTORY
  ========================================================== */

  historySection: {
    marginTop: 8,
    marginBottom: 14,
  },

  historyCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    height: 28,
  },

  historyCountText: {
    fontSize: 10,
    fontWeight: '850',
  },

  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 11,
    marginBottom: 9,
  },

  historyMain: {
    flex: 1,
    minWidth: 0,
    marginLeft: 10,
  },

  historyDoctor: {
    fontSize: 12,
    fontWeight: '780',
  },

  historyDate: {
    fontSize: 9.5,
    marginTop: 3,
  },

  historyStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    minHeight: 26,
  },

  historyStatusPillText: {
    fontSize: 8.5,
    fontWeight: '800',
  },


  /* ==========================================================
     DATA NOTE
  ========================================================== */

  dataNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: 15,
    padding: 11,
    marginTop: 4,
  },

  dataNoteText: {
    flex: 1,
    fontSize: 9,
    lineHeight: 14,
    marginLeft: 7,
  },


  /* ==========================================================
     FAB
  ========================================================== */

  fab: {
    position: 'absolute',
    right: 18,
    minHeight: 48,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15,
    gap: 6,
    elevation: 10,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.25,
    shadowRadius: 11,
  },

  fabText: {
    color: '#06110F',
    fontSize: 11,
    fontWeight: '900',
  },
  /* ==========================================================
   RESCHEDULE BUTTON
  ========================================================== */

  rescheduleButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginTop: 12,
  },

  rescheduleButtonText: {
    fontSize: 10.5,
    fontWeight: '850',
  },
});