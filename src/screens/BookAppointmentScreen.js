import React, {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useFocusEffect } from '@react-navigation/native';

import Ionicons from '@expo/vector-icons/Ionicons';
import * as Location from 'expo-location';

import {
  formatApiDateTime,
  formatLongDate as formatDate,
  formatTime,
} from '../utils/dateTime';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { AuthContext } from '../context/AuthContext';
import { PopupContext } from '../context/PopupContext';
import {
  getNearbyHealthcarePlaces,
  getRecords,
} from '../services/api';

import api from '../services/api';

import {
  sendAppointmentBookedNotification,
  sendAppointmentRescheduledNotification,
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

  accentSoft: isDark
    ? '#0E282D'
    : '#E8FBF8',

  accentBorder: isDark
    ? '#1B4746'
    : '#B8EEE8',

  accentText: isDark
    ? '#8FF7ED'
    : '#007F77',

  selectedBg: isDark
    ? '#102A36'
    : '#EAFBF9',

  selectedBorder: '#00D4C5',

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
   HELPERS
============================================================ */

const pad = value =>
  String(value).padStart(2, '0');


const getDateKey = date => {
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-');
};


const formatDistance = meters => {
  const value = Number(meters);

  if (!Number.isFinite(value)) {
    return '';
  }

  if (value < 1000) {
    return `${Math.round(value)} m away`;
  }

  return `${(value / 1000).toFixed(1)} km away`;
};


const humanizeCategory = category => {
  const value = String(
    category || 'healthcare',
  )
    .trim()
    .toLowerCase();

  switch (value) {
    case 'doctor':
      return 'Doctor / Practice';

    case 'clinic':
      return 'Clinic';

    case 'hospital':
      return 'Hospital';

    default:
      return 'Healthcare';
  }
};


const getProviderIcon = category => {
  switch (
    String(category || '').toLowerCase()
  ) {
    case 'doctor':
      return 'person-outline';

    case 'hospital':
      return 'business-outline';

    case 'clinic':
      return 'medkit-outline';

    default:
      return 'medical-outline';
  }
};


const getProviderAccent = category => {
  switch (
    String(category || '').toLowerCase()
  ) {
    case 'hospital':
      return '#F87171';

    case 'clinic':
      return '#34D399';

    default:
      return '#00D4C5';
  }
};


const safeText = (
  value,
  fallback = '',
) => {
  if (value == null) {
    return fallback;
  }

  if (
    typeof value === 'string'
  ) {
    return value.trim() || fallback;
  }

  if (
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return String(value);
  }

  if (Array.isArray(value)) {
    const values = value
      .map(item =>
        safeText(item, ''),
      )
      .filter(Boolean);

    return values.length
      ? values.join(', ')
      : fallback;
  }

  if (
    typeof value === 'object'
  ) {
    const keys = [
      'text',
      'name',
      'title',
      'label',
      'symptom_text',
      'symptoms',
      'normalised',
      'normalized',
      'condition',
      'summary',
      'description',
      'value',
    ];

    for (const key of keys) {
      if (value[key] != null) {
        const result = safeText(
          value[key],
          '',
        );

        if (result) {
          return result;
        }
      }
    }
  }

  return fallback;
};


const getRecordTitle = record => {
  const symptoms =
    safeText(
      record?.symptoms,
      '',
    );

  if (symptoms) {
    return symptoms.length > 60
      ? `${symptoms.slice(0, 60)}…`
      : symptoms;
  }

  const condition =
    safeText(
      record?.condition,
      '',
    ) ||
    safeText(
      record?.ai_summary,
      '',
    );

  return condition ||
    'Health assessment';
};


const getRecordDate = record => {
  const raw =
    record?.created_at ||
    record?.createdAt ||
    null;

  if (!raw) {
    return 'Date unavailable';
  }

  const date =
    new Date(raw);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return 'Date unavailable';
  }

  return date.toLocaleDateString(
    [],
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    },
  );
};


const getRecordStatus = record => {
  const status = String(
    record?.triage_level ||
    record?.triageLevel ||
    record?.triage ||
    '',
  ).toUpperCase();

  switch (status) {
    case 'EMERGENCY':
      return {
        label: 'Emergency',
        icon: 'warning-outline',
        color: '#F87171',
      };

    case 'URGENT':
      return {
        label: 'Urgent',
        icon: 'alert-circle-outline',
        color: '#FBBF24',
      };

    case 'ROUTINE':
      return {
        label: 'Routine',
        icon: 'checkmark-circle-outline',
        color: '#34D399',
      };

    default:
      return {
        label: 'Assessment',
        icon: 'document-text-outline',
        color: '#00D4C5',
      };
  }
};


/* ============================================================
   DATE OPTIONS
============================================================ */

const buildDateOptions = () => {
  const now = new Date();

  return Array.from(
    { length: 14 },
    (_, index) => {
      const date =
        new Date(now);

      date.setHours(
        0,
        0,
        0,
        0,
      );

      date.setDate(
        now.getDate() + index,
      );

      return {
        key: getDateKey(date),
        date,
        day: date.toLocaleDateString(
          [],
          {
            weekday: 'short',
          },
        ),
        number:
          date.getDate(),
        month:
          date.toLocaleDateString(
            [],
            {
              month: 'short',
            },
          ),
        isToday:
          index === 0,
      };
    },
  );
};


/* ============================================================
   TIME OPTIONS
============================================================ */

const buildTimeOptions = (
  selectedDate,
) => {
  if (!selectedDate) {
    return [];
  }

  const now = new Date();

  const options = [];

  /*
   * Booking window:
   * 08:00 AM → 08:00 PM
   * every 30 minutes.
   *
   * Only future slots are shown for today.
   */
  for (
    let hour = 8;
    hour <= 20;
    hour += 0.5
  ) {
    const minutes =
      hour % 1 === 0
        ? 0
        : 30;

    const actualHour =
      Math.floor(hour);

    const date =
      new Date(
        selectedDate,
      );

    date.setHours(
      actualHour,
      minutes,
      0,
      0,
    );

    if (
      getDateKey(date) ===
        getDateKey(now) &&
      date <= now
    ) {
      continue;
    }

    options.push(date);
  }

  return options;
};


/* ============================================================
   MAIN SCREEN
============================================================ */

export default function BookAppointmentScreen({
  navigation,
  route,
}) {
  const {
    user,
    isDarkMode,
  } = useContext(
    AuthContext,
  ) || {};

  const isDark =
    Boolean(isDarkMode);

  const theme = useMemo(
    () =>
      getTheme(isDark),
    [isDark],
  );

  const insets =
    useSafeAreaInsets();

  const {
    showPopup,
  } = useContext(
    PopupContext,
  ) || {};


  /* ==========================================================
     SCREEN ENTRANCE ANIMATION
  ========================================================== */

  const fadeAnim = useRef(
    new Animated.Value(0),
  ).current;

  const slideAnim = useRef(
    new Animated.Value(18),
  ).current;

  useFocusEffect(
    useCallback(() => {
      fadeAnim.setValue(0);
      slideAnim.setValue(18);

      const animation =
        Animated.parallel([
          Animated.timing(
            fadeAnim,
            {
              toValue: 1,
              duration: 380,
              useNativeDriver: true,
            },
          ),

          Animated.spring(
            slideAnim,
            {
              toValue: 0,
              friction: 8,
              tension: 42,
              useNativeDriver: true,
            },
          ),
        ]);

      animation.start();

      return () => {
        animation.stop();
      };
    }, [
      fadeAnim,
      slideAnim,
    ]),
  );


  /* ==========================================================
     POPUP HELPER
  ========================================================== */

  const notify = useCallback(
    (
      title,
      message,
      type = 'info',
      onConfirm = null,
      confirmText = 'OK',
    ) => {
      showPopup?.(
        title,
        message,
        type,
        onConfirm,
        confirmText,
      );
    },
    [showPopup],
  );

  /* ==========================================================
     HIDE DEFAULT ROOT-STACK HEADER
  ========================================================== */

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);


  /* ==========================================================
     ROUTE PARAMS
  ========================================================== */

  const isReschedule =
    route?.params?.mode ===
    'reschedule';

  const routeAppointmentId =
    route?.params?.appointmentId ??
    null;

  const routeProvider =
    route?.params?.provider ||
    null;

  const routeDoctorName =
    safeText(
      route?.params?.doctorName,
      '',
    );

  const routeRecordId =
    route?.params?.recordId ??
    null;

  const routeAppointmentDate =
    route?.params?.appointmentDate
      ? new Date(
          route.params.appointmentDate
        )
      : null;

  const hasValidRouteAppointmentDate =
    routeAppointmentDate &&
    !Number.isNaN(
      routeAppointmentDate.getTime()
    );


  /* ==========================================================
     STATE
  ========================================================== */

  const [
    providers,
    setProviders,
  ] = useState([]);

  const [
    records,
    setRecords,
  ] = useState([]);

  const [
    selectedProvider,
    setSelectedProvider,
  ] = useState(
    routeProvider ||
      null,
  );

  const [
    selectedRecord,
    setSelectedRecord,
  ] = useState(
    routeRecordId != null
      ? {
          id: routeRecordId,
        }
      : null,
  );

  const [
    selectedDate,
    setSelectedDate,
  ] = useState(() => {
    if (
      isReschedule &&
      hasValidRouteAppointmentDate
    ) {
      return new Date(
        routeAppointmentDate
      );
    }

    return buildDateOptions()[0].date;
  });

  const [
    selectedTime,
    setSelectedTime,
  ] = useState(() => {
    if (
      isReschedule &&
      hasValidRouteAppointmentDate
    ) {
      return new Date(
        routeAppointmentDate
      );
    }

    return null;
  });

  const [
    loadingProviders,
    setLoadingProviders,
  ] = useState(true);

  const [
    loadingRecords,
    setLoadingRecords,
  ] = useState(true);

  const [
    booking,
    setBooking,
  ] = useState(false);

  const [
    providerError,
    setProviderError,
  ] = useState('');

  const [
    recordsError,
    setRecordsError,
  ] = useState('');

  const [
    activeProviderId,
    setActiveProviderId,
  ] = useState(
    routeProvider?.id ||
      null,
  );


  /* ==========================================================
     DATE OPTIONS
  ========================================================== */

  const dateOptions = useMemo(
    () => buildDateOptions(),
    [],
  );


  const timeOptions =
    useMemo(
      () =>
        buildTimeOptions(
          selectedDate,
        ),
      [selectedDate],
    );


  /* ==========================================================
     LOAD PROVIDERS
  ========================================================== */

  const loadProviders =
    useCallback(
      async () => {
        try {
          setProviderError(
            '',
          );

          setLoadingProviders(
            true,
          );

          /*
           * Ask for location permission.
           *
           * This is the user's device location;
           * no location is hard-coded.
           */
          const {
            status,
          } =
            await Location.requestForegroundPermissionsAsync();

          if (
            status !==
            Location.PermissionStatus.GRANTED
          ) {
            throw new Error(
              'Location permission is required to find nearby healthcare providers.',
            );
          }

          const location =
            await Location.getCurrentPositionAsync(
              {
                accuracy:
                  Location.Accuracy.Balanced,
              },
            );

          const latitude =
            location?.coords
              ?.latitude;

          const longitude =
            location?.coords
              ?.longitude;

          if (
            !Number.isFinite(
              Number(latitude),
            ) ||
            !Number.isFinite(
              Number(longitude),
            )
          ) {
            throw new Error(
              'Unable to determine your current location.',
            );
          }

          const response =
            await getNearbyHealthcarePlaces(
              {
                lat: latitude,
                lng: longitude,
                radius: 5000,
              },
            );

          const places =
            Array.isArray(
              response?.places,
            )
              ? response.places
              : [];

          /*
           * Google Places results are already sorted by
           * distance by the backend.
           */
          setProviders(
            places,
          );

          /*
           * If a provider was passed through navigation,
           * keep it selected.
           */
          if (
            routeDoctorName &&
            !selectedProvider
          ) {
            const match =
              places.find(
                item =>
                  safeText(
                    item?.name,
                    '',
                  ) ===
                  routeDoctorName,
              );

            if (match) {
              setSelectedProvider(
                match,
              );

              setActiveProviderId(
                match.id,
              );
            }
          }
        } catch (error) {
          console.error(
            'BookAppointment provider error:',
            error,
          );

          setProviderError(
            error?.message ||
              'Unable to load nearby healthcare providers.',
          );
        } finally {
          setLoadingProviders(
            false,
          );
        }
      },
      [
        routeDoctorName,
        selectedProvider,
      ],
    );


  /* ==========================================================
     LOAD HEALTH RECORDS
  ========================================================== */

  const loadRecords =
    useCallback(
      async () => {
        try {
          setRecordsError(
            '',
          );

          setLoadingRecords(
            true,
          );

          if (!user?.uid) {
            throw new Error(
              'Please sign in to book an appointment.',
            );
          }

          const response =
            await getRecords(
              user.uid,
              {
                force: true,
              },
            );

          let result = [];

          if (
            Array.isArray(
              response,
            )
          ) {
            result =
              response;
          } else if (
            Array.isArray(
              response?.records,
            )
          ) {
            result =
              response.records;
          } else if (
            Array.isArray(
              response?.data,
            )
          ) {
            result =
              response.data;
          }

          /*
           * Most recent records first.
           */
          result =
            [...result].sort(
              (a, b) => {
                const aTime =
                  new Date(
                    a?.created_at ||
                      a?.createdAt ||
                      0,
                  ).getTime();

                const bTime =
                  new Date(
                    b?.created_at ||
                      b?.createdAt ||
                      0,
                  ).getTime();

                return (
                  bTime -
                  aTime
                );
              },
            );

          setRecords(
            result,
          );

          /*
           * Restore requested record when possible.
           */
          if (
            routeRecordId !=
              null &&
            result.length
          ) {
            const matching =
              result.find(
                record =>
                  String(
                    record?.id,
                  ) ===
                  String(
                    routeRecordId,
                  ),
              );

            if (matching) {
              setSelectedRecord(
                matching,
              );
            }
          }
        } catch (error) {
          console.error(
            'BookAppointment records error:',
            error,
          );

          setRecordsError(
            error?.message ||
              'Unable to load your health records.',
          );
        } finally {
          setLoadingRecords(
            false,
          );
        }
      },
      [
        routeRecordId,
        user?.uid,
      ],
    );


  /* ==========================================================
     LOAD DATA
  ========================================================== */

  useEffect(() => {
    void loadProviders();
    void loadRecords();
  }, [
    loadProviders,
    loadRecords,
  ]);


  /* ==========================================================
     SELECT PROVIDER
  ========================================================== */

  const handleSelectProvider =
    useCallback(
      provider => {
        if (isReschedule) {
          return;
        }

        setSelectedProvider(
          provider
        );

        setActiveProviderId(
          provider?.id ||
            null
        );
      },
      [isReschedule]
    );


  /* ==========================================================
     SELECT RECORD
  ========================================================== */

  const handleSelectRecord =
    useCallback(
      record => {
        if (isReschedule) {
          return;
        }

        setSelectedRecord(
          record
        );
      },
      [isReschedule]
    );


  /* ==========================================================
     SELECT DATE
  ========================================================== */

  const handleSelectDate =
    useCallback(
      date => {
        setSelectedDate(
          date,
        );

        /*
         * Changing the date invalidates the
         * previously selected time.
         */
        setSelectedTime(
          null,
        );
      },
      [],
    );


  /* ==========================================================
     BOOK
  ========================================================== */

  const handleBook =
    useCallback(
      async () => {
        if (booking) {
          return;
        }

        /*
        * --------------------------------------------------------
        * RESCHEDULE MODE
        * --------------------------------------------------------
        */

        if (isReschedule) {
          if (!routeAppointmentId) {
            notify(
              'Appointment unavailable',
              'The appointment ID is missing. Please return and try again.',
              'warning',
            );
            return;
          }

          if (!selectedTime) {
            notify(
              'Choose a time',
              'Please select the new appointment time.',
              'warning',
            );
            return;
          }

          const newAppointmentDate =
            new Date(
              selectedTime
            );

          if (
            Number.isNaN(
              newAppointmentDate.getTime()
            )
          ) {
            notify(
              'Invalid time',
              'The selected appointment time is invalid.',
              'warning',
            );
            return;
          }

          if (
            newAppointmentDate <=
            new Date()
          ) {
            notify(
              'Invalid appointment time',
              'Please choose a future appointment time.',
              'warning',
            );
            return;
          }

          try {
            setBooking(true);

            await api.patch(
              `appointments/${routeAppointmentId}/reschedule/`,
              {
                appointment_date:
                  formatApiDateTime(
                    newAppointmentDate
                  ),
              }
            );

            try {
              await sendAppointmentRescheduledNotification({
                appointmentId: routeAppointmentId,
                appointmentDate: newAppointmentDate,
                doctorName:
                  safeText(
                    route?.params?.doctorName ||
                      route?.params?.appointmentDoctorName,
                    'your healthcare provider',
                  ),
              });
            } catch (notificationError) {
              console.warn(
                'Appointment reschedule notification could not be sent:',
                notificationError,
              );
            }

            notify(
              'Appointment rescheduled',
              `Your appointment has been moved to ${formatDate(
                newAppointmentDate,
              )} at ${formatTime(
                newAppointmentDate,
              )}.`,
              'success',
              () => navigation.goBack(),
              'Done',
            );
          } catch (error) {
            console.error(
              'Reschedule appointment error:',
              error
            );

            const status =
              error?.response?.status;

            const serverMessage =
              error?.response?.data
                ?.error;

            if (
              status === 401 ||
              status === 403
            ) {
              notify(
                'Session required',
                'Your session could not be verified. Please sign in again.',
                'warning',
              );
            } else if (
              status === 400
            ) {
              notify(
                'Unable to reschedule',
                serverMessage ||
                  'Please choose another future date and time.',
                'warning',
              );
            } else if (
              status >= 500
            ) {
              notify(
                'Rescheduling unavailable',
                'The rescheduling service is temporarily unavailable. Please try again shortly.',
                'error',
              );
            } else {
              notify(
                'Rescheduling failed',
                serverMessage ||
                  'Unable to reschedule the appointment.',
                'error',
              );
            }
          } finally {
            setBooking(false);
          }

          return;
        }

        /*
        * --------------------------------------------------------
        * NORMAL BOOKING MODE
        * --------------------------------------------------------
        */

        if (!selectedProvider) {
          notify(
            'Choose a provider',
            'Please select a healthcare provider before continuing.',
            'warning',
          );
          return;
        }

        if (!selectedRecord?.id) {
          notify(
            'Choose a health record',
            'Please select the health record related to this appointment.',
            'warning',
          );
          return;
        }

        if (!selectedDate) {
          notify(
            'Choose a date',
            'Please select an appointment date.',
            'warning',
          );
          return;
        }

        if (!selectedTime) {
          notify(
            'Choose a time',
            'Please select an available appointment time.',
            'warning',
          );
          return;
        }

        const appointmentDate =
          new Date(
            selectedTime
          );

        if (
          Number.isNaN(
            appointmentDate.getTime()
          )
        ) {
          notify(
            'Invalid time',
            'The selected appointment time is invalid. Please choose another time.',
            'warning',
          );
          return;
        }

        if (
          appointmentDate <=
          new Date()
        ) {
          notify(
            'Invalid appointment time',
            'Please choose a future appointment time.',
            'warning',
          );
          return;
        }

        const doctorName =
          safeText(
            selectedProvider?.name,
            ''
          );

        if (!doctorName) {
          notify(
            'Provider unavailable',
            'The selected healthcare location does not have a usable name.',
            'warning',
          );
          return;
        }

        try {
          setBooking(true);

          const response =
            await api.post(
              'appointments/',
              {
                doctor_name:
                  doctorName,

                appointment_date:
                  formatApiDateTime(
                    appointmentDate
                  ),

                record:
                  Number(
                    selectedRecord.id
                  ),
              }
            );

          try {
            await sendAppointmentBookedNotification({
              appointmentId:
                response?.data?.id ??
                response?.data?._id ??
                null,
              appointmentDate,
              doctorName,
            });
          } catch (notificationError) {
            console.warn(
              'Appointment booking notification could not be sent:',
              notificationError,
            );
          }

          notify(
            'Appointment booked',
            `Your appointment with ${doctorName} is scheduled for ${formatDate(
              appointmentDate,
            )} at ${formatTime(
              appointmentDate,
            )}.`,
            'success',
            () => navigation.goBack(),
            'Done',
          );
        } catch (error) {
          console.error(
            'Book appointment error:',
            error
          );

          const status =
            error?.response?.status;

          const serverMessage =
            error?.response?.data
              ?.error;

          if (
            status === 401 ||
            status === 403
          ) {
            notify(
              'Session required',
              'Your session could not be verified. Please sign in again and try again.',
              'warning',
            );
          } else if (
            status === 400
          ) {
            notify(
              'Unable to book',
              serverMessage ||
                'Please check the provider, date, time, and health record and try again.',
              'warning',
            );
          } else if (
            status >= 500
          ) {
            notify(
              'Booking unavailable',
              'The booking service is temporarily unavailable. Please try again shortly.',
              'error',
            );
          } else {
            notify(
              'Booking failed',
              serverMessage ||
                'Unable to create the appointment. Please try again.',
              'error',
            );
          }
        } finally {
          setBooking(false);
        }
      },
      [
        booking,
        isReschedule,
        navigation,
        notify,
        routeAppointmentId,
        selectedProvider,
        selectedRecord,
        selectedTime,
      ]
    );


  /* ==========================================================
     BOOKING SUMMARY
  ========================================================== */

  const selectedProviderName =
    safeText(
      selectedProvider?.name,
      'Select a provider',
    );

  const selectedRecordTitle =
    selectedRecord
      ? getRecordTitle(
          selectedRecord,
        )
      : 'Select a health record';

  const selectedRecordDate =
    selectedRecord
      ? getRecordDate(
          selectedRecord,
        )
      : '';


  /* ==========================================================
     UI
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
          isDark
            ? 'light-content'
            : 'dark-content'
        }
        backgroundColor={
          theme.background
        }
      />

      <KeyboardAvoidingView
        style={
          styles.keyboardContainer
        }
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <Animated.ScrollView
          style={[
            styles.scroll,
            {
              backgroundColor:
                theme.background,
            },
            {
              opacity:
                fadeAnim,

              transform: [
                {
                  translateY:
                    slideAnim,
                },
              ],
            },
          ]}
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom:
                insets.bottom +
                42,
            },
          ]}
          showsVerticalScrollIndicator={
            false
          }
          keyboardShouldPersistTaps="handled"
        >

          {/* =================================================
              HEADER
          ================================================= */}

          <View
            style={
              styles.header
            }
          >
            <TouchableOpacity
              activeOpacity={
                0.8
              }
              onPress={() =>
                navigation.goBack()
              }
              style={[
                styles.backButton,
                {
                  backgroundColor:
                    theme.card,
                  borderColor:
                    theme.border,
                },
              ]}
            >
              <Ionicons
                name="arrow-back"
                size={20}
                color={
                  theme.textPrimary
                }
              />
            </TouchableOpacity>

            <View
              style={
                styles.headerTextBlock
              }
            >
              <View
                style={
                  styles.eyebrowRow
                }
              >
                <View
                  style={[
                    styles.eyebrowDot,
                    {
                      backgroundColor:
                        theme.accent,
                    },
                  ]}
                />

                <Text
                  style={[
                    styles.eyebrowText,
                    {
                      color:
                        theme.accentText,
                    },
                  ]}
                >
                  CARE PLANNING
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
                {isReschedule
                  ? 'Reschedule appointment'
                  : 'Book an appointment'}
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
                {isReschedule
                  ? 'Choose a new date and time for your existing appointment.'
                  : 'Choose a real nearby healthcare provider, your health record, and a future time.'}
              </Text>
            </View>
          </View>


          {/* =================================================
              PROGRESS
          ================================================= */}

          <View
            style={[
              styles.progressCard,
              {
                backgroundColor:
                  theme.card,
                borderColor:
                  theme.border,
              },
            ]}
          >
            <View
              style={
                styles.progressStep
              }
            >
              <View
                style={[
                  styles.progressNumber,
                  {
                    backgroundColor:
                      selectedProvider
                        ? theme.accent
                        : theme.accentSoft,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.progressNumberText,
                    {
                      color:
                        selectedProvider
                          ? '#06110F'
                          : theme.accentText,
                    },
                  ]}
                >
                  1
                </Text>
              </View>

              <Text
                style={[
                  styles.progressLabel,
                  {
                    color:
                      theme.textPrimary,
                  },
                ]}
              >
                Provider
              </Text>
            </View>

            <View
              style={[
                styles.progressLine,
                {
                  backgroundColor:
                    selectedProvider
                      ? theme.accent
                      : theme.border,
                },
              ]}
            />

            <View
              style={
                styles.progressStep
              }
            >
              <View
                style={[
                  styles.progressNumber,
                  {
                    backgroundColor:
                      selectedRecord
                        ? theme.accent
                        : theme.accentSoft,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.progressNumberText,
                    {
                      color:
                        selectedRecord
                          ? '#06110F'
                          : theme.accentText,
                    },
                  ]}
                >
                  2
                </Text>
              </View>

              <Text
                style={[
                  styles.progressLabel,
                  {
                    color:
                      theme.textPrimary,
                  },
                ]}
              >
                Record
              </Text>
            </View>

            <View
              style={[
                styles.progressLine,
                {
                  backgroundColor:
                    selectedRecord
                      ? theme.accent
                      : theme.border,
                },
              ]}
            />

            <View
              style={
                styles.progressStep
              }
            >
              <View
                style={[
                  styles.progressNumber,
                  {
                    backgroundColor:
                      selectedTime
                        ? theme.accent
                        : theme.accentSoft,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.progressNumberText,
                    {
                      color:
                        selectedTime
                          ? '#06110F'
                          : theme.accentText,
                    },
                  ]}
                >
                  3
                </Text>
              </View>

              <Text
                style={[
                  styles.progressLabel,
                  {
                    color:
                      theme.textPrimary,
                  },
                ]}
              >
                Time
              </Text>
            </View>
          </View>


          {/* =================================================
              PROVIDER
          ================================================= */}

          <View
            style={
              styles.section
            }
          >
            <View
              style={
                styles.sectionHeader
              }
            >
              <View
                style={
                  styles.sectionHeaderLeft
                }
              >
                <View
                  style={[
                    styles.sectionIcon,
                    {
                      backgroundColor:
                        theme.accentSoft,
                    },
                  ]}
                >
                  <Ionicons
                    name="location-outline"
                    size={17}
                    color={
                      theme.accent
                    }
                  />
                </View>

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
                    Choose a provider
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
                    Nearby results from live healthcare data
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={
                  0.8
                }
                onPress={() =>
                  void loadProviders()
                }
              >
                <Ionicons
                  name="refresh-outline"
                  size={19}
                  color={
                    theme.accent
                  }
                />
              </TouchableOpacity>
            </View>


            {loadingProviders ? (
              <View
                style={[
                  styles.loadingCard,
                  {
                    backgroundColor:
                      theme.card,
                    borderColor:
                      theme.border,
                  },
                ]}
              >
                <ActivityIndicator
                  size="small"
                  color={
                    theme.accent
                  }
                />

                <Text
                  style={[
                    styles.loadingCardText,
                    {
                      color:
                        theme.textSecondary,
                    },
                  ]}
                >
                  Finding nearby healthcare providers...
                </Text>
              </View>
            ) : providerError ? (
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
                <Ionicons
                  name="location-outline"
                  size={20}
                  color={
                    theme.dangerText
                  }
                />

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
                    Nearby providers unavailable
                  </Text>

                  <Text
                    style={[
                      styles.errorText,
                      {
                        color:
                          theme.dangerText,
                      },
                    ]}
                  >
                    {providerError}
                  </Text>

                  <TouchableOpacity
                    activeOpacity={
                      0.8
                    }
                    onPress={() =>
                      void loadProviders()
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
                        styles.retryText,
                        {
                          color:
                            theme.dangerText
                        },
                      ]}
                    >
                      Try again
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : providers.length ===
              0 ? (
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
                    name="medical-outline"
                    size={28}
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
                  No nearby providers found
                </Text>

                <Text
                  style={[
                    styles.emptyText,
                    {
                      color:
                        theme.textSecondary,
                    },
                  ]}
                >
                  CareSense could not find a healthcare
                  location within 5 km of your current
                  location.
                </Text>

                <TouchableOpacity
                  activeOpacity={
                    0.8
                  }
                  onPress={() =>
                    void loadProviders()
                  }
                  style={[
                    styles.primarySmallButton,
                    {
                      backgroundColor:
                        theme.accent,
                    },
                  ]}
                >
                  <Ionicons
                    name="refresh-outline"
                    size={17}
                    color="#06110F"
                  />

                  <Text
                    style={
                      styles.primarySmallButtonText
                    }
                  >
                    Search again
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View
                style={
                  styles.providerList
                }
              >
                {providers.map(
                  provider => {
                    const selected =
                      activeProviderId ===
                      provider?.id;

                    const providerName =
                      safeText(
                        provider?.name,
                        'Healthcare provider',
                      );

                    const providerCategory =
                      humanizeCategory(
                        provider?.category,
                      );

                    const accent =
                      getProviderAccent(
                        provider?.category,
                      );

                    return (
                      <TouchableOpacity
                        key={
                          String(
                            provider?.id ||
                              providerName,
                          )
                        }
                        activeOpacity={
                          0.86
                        }
                        onPress={() =>
                          handleSelectProvider(
                            provider,
                          )
                        }
                        style={[
                          styles.providerCard,
                          {
                            backgroundColor:
                              theme.card,
                            borderColor:
                              selected
                                ? theme.accent
                                : theme.border,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.providerIcon,
                            {
                              backgroundColor:
                                selected
                                  ? theme.accentSoft
                                  : theme.surface,
                              borderColor:
                                selected
                                  ? theme.accentBorder
                                  : theme.border,
                            },
                          ]}
                        >
                          <Ionicons
                            name={getProviderIcon(
                              provider?.category,
                            )}
                            size={23}
                            color={
                              selected
                                ? theme.accent
                                : accent
                            }
                          />
                        </View>

                        <View
                          style={
                            styles.providerBody
                          }
                        >
                          <View
                            style={
                              styles.providerTitleRow
                            }
                          >
                            <Text
                              style={[
                                styles.providerName,
                                {
                                  color:
                                    theme.textPrimary,
                                },
                              ]}
                              numberOfLines={
                                2
                              }
                            >
                              {providerName}
                            </Text>

                            {selected ? (
                              <View
                                style={[
                                  styles.checkCircle,
                                  {
                                    backgroundColor:
                                      theme.accent,
                                  },
                                ]}
                              >
                                <Ionicons
                                  name="checkmark"
                                  size={12}
                                  color="#06110F"
                                />
                              </View>
                            ) : null}
                          </View>

                          <Text
                            style={[
                              styles.providerCategory,
                              {
                                color:
                                  selected
                                    ? theme.accentText
                                    : accent,
                              },
                            ]}
                          >
                            {providerCategory}
                          </Text>

                          <Text
                            style={[
                              styles.providerAddress,
                              {
                                color:
                                  theme.textSecondary,
                              },
                            ]}
                            numberOfLines={
                              2
                            }
                          >
                            {safeText(
                              provider?.address,
                              'Address unavailable',
                            )}
                          </Text>

                          {provider?.distance_meters !=
                          null ? (
                            <View
                              style={
                                styles.providerDistance
                              }
                            >
                              <Ionicons
                                name="navigate-outline"
                                size={12}
                                color={
                                  theme.textMuted
                                }
                              />

                              <Text
                                style={[
                                  styles.providerDistanceText,
                                  {
                                    color:
                                      theme.textMuted,
                                  },
                                ]}
                              >
                                {formatDistance(
                                  provider.distance_meters,
                                )}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      </TouchableOpacity>
                    );
                  },
                )}
              </View>
            )}
          </View>


          {/* =================================================
              HEALTH RECORD
          ================================================= */}

          <View
            style={
              styles.section
            }
          >
            <View
              style={
                styles.sectionHeader
              }
            >
              <View
                style={
                  styles.sectionHeaderLeft
                }
              >
                <View
                  style={[
                    styles.sectionIcon,
                    {
                      backgroundColor:
                        theme.accentSoft,
                    },
                  ]}
                >
                  <Ionicons
                    name="document-text-outline"
                    size={17}
                    color={
                      theme.accent
                    }
                  />
                </View>

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
                    Select a health record
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
                    Connect the appointment to your real CareSense record
                  </Text>
                </View>
              </View>

              <Text
                style={[
                  styles.requiredLabel,
                  {
                    color:
                      theme.accentText,
                  },
                ]}
              >
                REQUIRED
              </Text>
            </View>


            {loadingRecords ? (
              <View
                style={[
                  styles.loadingCard,
                  {
                    backgroundColor:
                      theme.card,
                    borderColor:
                      theme.border,
                  },
                ]}
              >
                <ActivityIndicator
                  size="small"
                  color={
                    theme.accent
                  }
                />

                <Text
                  style={[
                    styles.loadingCardText,
                    {
                      color:
                        theme.textSecondary,
                    },
                  ]}
                >
                  Loading your health records...
                </Text>
              </View>
            ) : recordsError ? (
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
                <Ionicons
                  name="document-outline"
                  size={20}
                  color={
                    theme.dangerText
                  }
                />

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
                    Health records unavailable
                  </Text>

                  <Text
                    style={[
                      styles.errorText,
                      {
                        color:
                          theme.dangerText,
                      },
                    ]}
                  >
                    {recordsError}
                  </Text>

                  <TouchableOpacity
                    activeOpacity={
                      0.8
                    }
                    onPress={() =>
                      void loadRecords()
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
                        styles.retryText,
                        {
                          color:
                            theme.dangerText,
                        },
                      ]}
                    >
                      Reload
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : records.length ===
              0 ? (
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
                    name="document-text-outline"
                    size={28}
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
                  No health records yet
                </Text>

                <Text
                  style={[
                    styles.emptyText,
                    {
                      color:
                        theme.textSecondary,
                    },
                  ]}
                >
                  Complete a CareSense symptom assessment
                  first. Your saved record can then be
                  attached to an appointment.
                </Text>

                <TouchableOpacity
                  activeOpacity={
                    0.8
                  }
                  onPress={() => {
                    navigation.navigate(
                      'SymptomChecker',
                    );
                  }}
                  style={[
                    styles.primarySmallButton,
                    {
                      backgroundColor:
                        theme.accent,
                    },
                  ]}
                >
                  <Ionicons
                    name="pulse-outline"
                    size={17}
                    color="#06110F"
                  />

                  <Text
                    style={
                      styles.primarySmallButtonText
                    }
                  >
                    Check Symptoms
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View
                style={
                  styles.recordList
                }
              >
                {records
                  .slice(0, 8)
                  .map(
                    record => {
                      const selected =
                        String(
                          selectedRecord?.id,
                        ) ===
                        String(
                          record?.id,
                        );

                      const status =
                        getRecordStatus(
                          record,
                        );

                      return (
                        <TouchableOpacity
                          key={String(
                            record?.id,
                          )}
                          activeOpacity={
                            0.86
                          }
                          onPress={() =>
                            handleSelectRecord(
                              record,
                            )
                          }
                          style={[
                            styles.recordCard,
                            {
                              backgroundColor:
                                theme.card,
                              borderColor:
                                selected
                                  ? theme.accent
                                  : theme.border,
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.recordIcon,
                              {
                                backgroundColor:
                                  selected
                                    ? theme.accentSoft
                                    : theme.surface,
                              },
                            ]}
                          >
                            <Ionicons
                              name="pulse-outline"
                              size={21}
                              color={
                                selected
                                  ? theme.accent
                                  : status.color
                              }
                            />
                          </View>

                          <View
                            style={
                              styles.recordBody
                            }
                          >
                            <Text
                              style={[
                                styles.recordTitle,
                                {
                                  color:
                                    theme.textPrimary,
                                },
                              ]}
                              numberOfLines={
                                2
                              }
                            >
                              {getRecordTitle(
                                record,
                              )}
                            </Text>

                            <Text
                              style={[
                                styles.recordDate,
                                {
                                  color:
                                    theme.textSecondary,
                                },
                              ]}
                            >
                              {getRecordDate(
                                record,
                              )}
                            </Text>

                            <View
                              style={
                                styles.recordMetaRow
                              }
                            >
                              <View
                                style={[
                                  styles.recordStatus,
                                  {
                                    backgroundColor:
                                      `${status.color}18`,
                                  },
                                ]}
                              >
                                <Ionicons
                                  name={
                                    status.icon
                                  }
                                  size={11}
                                  color={
                                    status.color
                                  }
                                />

                                <Text
                                  style={[
                                    styles.recordStatusText,
                                    {
                                      color:
                                        status.color,
                                    },
                                  ]}
                                >
                                  {
                                    status.label
                                  }
                                </Text>
                              </View>
                            </View>
                          </View>

                          <View
                            style={[
                              styles.radio,
                              {
                                borderColor:
                                  selected
                                    ? theme.accent
                                    : theme.border,
                                backgroundColor:
                                  selected
                                    ? theme.accent
                                    : 'transparent',
                              },
                            ]}
                          >
                            {selected ? (
                              <View
                                style={
                                  styles.radioInner
                                }
                              />
                            ) : null}
                          </View>
                        </TouchableOpacity>
                      );
                    },
                  )}
              </View>
            )}
          </View>


          {/* =================================================
              DATE
          ================================================= */}

          <View
            style={
              styles.section
            }
          >
            <View
              style={
                styles.sectionHeader
              }
            >
              <View
                style={
                  styles.sectionHeaderLeft
                }
              >
                <View
                  style={[
                    styles.sectionIcon,
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
                    Choose a date
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
                    Select an upcoming day
                  </Text>
                </View>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={
                false
              }
              contentContainerStyle={
                styles.dateList
              }
            >
              {dateOptions.map(
                option => {
                  const selected =
                    getDateKey(
                      selectedDate,
                    ) ===
                    option.key;

                  return (
                    <TouchableOpacity
                      key={
                        option.key
                      }
                      activeOpacity={
                        0.85
                      }
                      onPress={() =>
                        handleSelectDate(
                          option.date,
                        )
                      }
                      style={[
                        styles.dateCard,
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
                          styles.dateDay,
                          {
                            color:
                              selected
                                ? '#06110F'
                                : theme.textMuted,
                          },
                        ]}
                      >
                        {option.isToday
                          ? 'TODAY'
                          : option.day.toUpperCase()}
                      </Text>

                      <Text
                        style={[
                          styles.dateNumber,
                          {
                            color:
                              selected
                                ? '#06110F'
                                : theme.textPrimary,
                          },
                        ]}
                      >
                        {
                          option.number
                        }
                      </Text>

                      <Text
                        style={[
                          styles.dateMonth,
                          {
                            color:
                              selected
                                ? '#06110F'
                                : theme.textSecondary,
                          },
                        ]}
                      >
                        {
                          option.month
                        }
                      </Text>
                    </TouchableOpacity>
                  );
                },
              )}
            </ScrollView>
          </View>


          {/* =================================================
              TIME
          ================================================= */}

          <View
            style={
              styles.section
            }
          >
            <View
              style={
                styles.sectionHeader
              }
            >
              <View
                style={
                  styles.sectionHeaderLeft
                }
              >
                <View
                  style={[
                    styles.sectionIcon,
                    {
                      backgroundColor:
                        theme.accentSoft,
                    },
                  ]}
                >
                  <Ionicons
                    name="time-outline"
                    size={17}
                    color={
                      theme.accent
                    }
                  />
                </View>

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
                    Choose a time
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
                    Available booking slots
                  </Text>
                </View>
              </View>
            </View>

            {timeOptions.length ===
            0 ? (
              <View
                style={[
                  styles.emptyTimeCard,
                  {
                    backgroundColor:
                      theme.card,
                    borderColor:
                      theme.border,
                  },
                ]}
              >
                <Ionicons
                  name="time-outline"
                  size={25}
                  color={
                    theme.textMuted
                  }
                />

                <Text
                  style={[
                    styles.emptyTimeTitle,
                    {
                      color:
                        theme.textPrimary,
                    },
                  ]}
                >
                  No future slots for this day
                </Text>

                <Text
                  style={[
                    styles.emptyTimeText,
                    {
                      color:
                        theme.textSecondary,
                    },
                  ]}
                >
                  Choose another date to continue booking.
                </Text>
              </View>
            ) : (
              <View
                style={
                  styles.timeGrid
                }
              >
                {timeOptions.map(
                  time => {
                    const selected =
                      selectedTime?.getTime() ===
                      time.getTime();

                    return (
                      <TouchableOpacity
                        key={time.toISOString()}
                        activeOpacity={
                          0.85
                        }
                        onPress={() =>
                          setSelectedTime(
                            time,
                          )
                        }
                        style={[
                          styles.timeCard,
                          {
                            backgroundColor:
                              selected
                                ? theme.selectedBg
                                : theme.card,
                            borderColor:
                              selected
                                ? theme.accent
                                : theme.border,
                          },
                        ]}
                      >
                        <Ionicons
                          name={
                            selected
                              ? 'checkmark-circle'
                              : 'time-outline'
                          }
                          size={15}
                          color={
                            selected
                              ? theme.accent
                              : theme.textMuted
                          }
                        />

                        <Text
                          style={[
                            styles.timeText,
                            {
                              color:
                                selected
                                  ? theme.accentText
                                  : theme.textPrimary,
                            },
                          ]}
                        >
                          {formatTime(
                            time,
                          )}
                        </Text>
                      </TouchableOpacity>
                    );
                  },
                )}
              </View>
            )}
          </View>


          {/* =================================================
              SUMMARY
          ================================================= */}

          <View
            style={[
              styles.summaryCard,
              {
                backgroundColor:
                  theme.card,
                borderColor:
                  selectedProvider &&
                  selectedRecord &&
                  selectedTime
                    ? theme.accentBorder
                    : theme.border,
              },
            ]}
          >
            <View
              style={
                styles.summaryHeader
              }
            >
              <View
                style={[
                  styles.summaryIcon,
                  {
                    backgroundColor:
                      theme.accentSoft,
                  },
                ]}
              >
                <Ionicons
                  name="clipboard-outline"
                  size={18}
                  color={
                    theme.accent
                  }
                />
              </View>

              <View
                style={
                  styles.summaryHeaderCopy
                }
              >
                <Text
                  style={[
                    styles.summaryTitle,
                    {
                      color:
                        theme.textPrimary,
                    },
                  ]}
                >
                  Appointment summary
                </Text>

                <Text
                  style={[
                    styles.summarySubtitle,
                    {
                      color:
                        theme.textSecondary,
                    },
                  ]}
                >
                  Review before booking
                </Text>
              </View>
            </View>

            <View
              style={
                styles.summaryRow
              }
            >
              <Text
                style={[
                  styles.summaryLabel,
                  {
                    color:
                      theme.textSecondary,
                  },
                ]}
              >
                Provider
              </Text>

              <Text
                style={[
                  styles.summaryValue,
                  {
                    color:
                      selectedProvider
                        ? theme.textPrimary
                        : theme.textMuted,
                  },
                ]}
                numberOfLines={2}
              >
                {
                  selectedProviderName
                }
              </Text>
            </View>

            <View
              style={[
                styles.summaryDivider,
                {
                  backgroundColor:
                    theme.borderSoft,
                },
              ]}
            />

            <View
              style={
                styles.summaryRow
              }
            >
              <Text
                style={[
                  styles.summaryLabel,
                  {
                    color:
                      theme.textSecondary,
                  },
                ]}
              >
                Health record
              </Text>

              <Text
                style={[
                  styles.summaryValue,
                  {
                    color:
                      selectedRecord
                        ? theme.textPrimary
                        : theme.textMuted,
                  },
                ]}
                numberOfLines={2}
              >
                {
                  selectedRecordTitle
                }
              </Text>
            </View>

            {selectedRecordDate ? (
              <Text
                style={[
                  styles.summaryMeta,
                  {
                    color:
                      theme.textMuted,
                  },
                ]}
              >
                Record created on{' '}
                {
                  selectedRecordDate
                }
              </Text>
            ) : null}

            <View
              style={[
                styles.summaryDivider,
                {
                  backgroundColor:
                    theme.borderSoft,
                },
              ]}
            />

            <View
              style={
                styles.summaryRow
              }
            >
              <Text
                style={[
                  styles.summaryLabel,
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
                  styles.summaryValue,
                  {
                    color:
                      theme.textPrimary,
                  },
                ]}
              >
                {formatDate(
                  selectedDate,
                )}
              </Text>
            </View>

            <View
              style={[
                styles.summaryDivider,
                {
                  backgroundColor:
                    theme.borderSoft,
                },
              ]}
            />

            <View
              style={
                styles.summaryRow
              }
            >
              <Text
                style={[
                  styles.summaryLabel,
                  {
                    color:
                      theme.textSecondary,
                  },
                ]}
              >
                Time
              </Text>

              <Text
                style={[
                  styles.summaryValue,
                  {
                    color:
                      selectedTime
                        ? theme.textPrimary
                        : theme.textMuted,
                  },
                ]}
              >
                {selectedTime
                  ? formatTime(
                      selectedTime,
                    )
                  : 'Select a time'}
              </Text>
            </View>
          </View>


          {/* =================================================
              SAFETY / PRIVACY NOTE
          ================================================= */}

          <View
            style={[
              styles.infoCard,
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
              size={17}
              color={
                theme.accent
              }
            />

            <Text
              style={[
                styles.infoText,
                {
                  color:
                    theme.textSecondary,
                },
              ]}
            >
              Your appointment is linked to your authenticated
              CareSense account and the selected health record.
              CareSense does not invent provider or appointment
              information.
            </Text>
          </View>


          {/* =================================================
              BOOK BUTTON
          ================================================= */}

          <TouchableOpacity
            activeOpacity={
              0.85
            }
            disabled={
              booking ||
              !selectedTime ||
              (
                !isReschedule &&
                (
                  !selectedProvider ||
                  !selectedRecord
                )
              )
            }
            onPress={
              handleBook
            }
            style={[
              styles.bookButton,
              {
                backgroundColor:
                  theme.accent,

                opacity:
                  booking ||
                  !selectedProvider ||
                  !selectedRecord ||
                  !selectedTime
                    ? 0.45
                    : 1,
              },
            ]}
          >
            {booking ? (
              <>
                <ActivityIndicator
                  size="small"
                  color="#06110F"
                />

                <Text style={styles.bookButtonText}>
                  {isReschedule
                    ? 'Rescheduling...'
                    : 'Booking...'}
                </Text>
              </>
            ) : (
              <>
                <Ionicons
                  name={
                    isReschedule
                      ? 'calendar-outline'
                      : 'calendar'
                  }
                  size={18}
                  color="#06110F"
                />

                <Text style={styles.bookButtonText}>
                  {isReschedule
                    ? 'Reschedule appointment'
                    : 'Book appointment'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <Text
            style={[
              styles.disclaimer,
              {
                color:
                  theme.textMuted,
              },
            ]}
          >
            CareSense is a healthcare decision-support
            application. Appointment availability is based
            on the providers returned by the current
            healthcare search service.
          </Text>

        </Animated.ScrollView>
      </KeyboardAvoidingView>
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

  keyboardContainer: {
    flex: 1,
  },

  scroll: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 7,
  },


  /* ==========================================================
     HEADER
  ========================================================== */

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 19,
  },

  backButton: {
    width: 43,
    height: 43,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  headerTextBlock: {
    flex: 1,
    paddingTop: 1,
  },

  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 5,
  },

  eyebrowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  eyebrowText: {
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 1.3,
  },

  title: {
    fontSize: 27,
    lineHeight: 33,
    fontWeight: '900',
    letterSpacing: -0.7,
  },

  subtitle: {
    fontSize: 11,
    lineHeight: 17,
    marginTop: 5,
    maxWidth: 330,
  },


  /* ==========================================================
     PROGRESS
  ========================================================== */

  progressCard: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },

  progressStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  progressNumber: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  progressNumberText: {
    fontSize: 10,
    fontWeight: '900',
  },

  progressLabel: {
    fontSize: 9.5,
    fontWeight: '750',
  },

  progressLine: {
    flex: 1,
    height: 1,
    marginHorizontal: 8,
  },


  /* ==========================================================
     SECTION
  ========================================================== */

  section: {
    marginBottom: 23,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 11,
  },

  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  sectionIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '850',
  },

  sectionSubtitle: {
    fontSize: 9.5,
    lineHeight: 15,
    marginTop: 2,
  },

  requiredLabel: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },


  /* ==========================================================
     PROVIDERS
  ========================================================== */

  providerList: {
    gap: 9,
  },

  providerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
  },

  providerIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  providerBody: {
    flex: 1,
    minWidth: 0,
    marginLeft: 10,
  },

  providerTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  providerName: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    paddingRight: 7,
  },

  providerCategory: {
    fontSize: 9.5,
    fontWeight: '750',
    marginTop: 3,
  },

  providerAddress: {
    fontSize: 9.5,
    lineHeight: 15,
    marginTop: 4,
  },

  providerDistance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
  },

  providerDistanceText: {
    fontSize: 8.5,
    fontWeight: '650',
  },

  checkCircle: {
    width: 21,
    height: 21,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },


  /* ==========================================================
     LOADING
  ========================================================== */

  loadingCard: {
    minHeight: 75,
    borderWidth: 1,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 15,
    gap: 10,
  },

  loadingCardText: {
    fontSize: 10.5,
    fontWeight: '650',
  },


  /* ==========================================================
     ERROR
  ========================================================== */

  errorCard: {
    borderWidth: 1,
    borderRadius: 17,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },

  errorCopy: {
    flex: 1,
  },

  errorTitle: {
    fontSize: 11.5,
    fontWeight: '850',
  },

  errorText: {
    fontSize: 9.5,
    lineHeight: 15,
    marginTop: 4,
  },

  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 9,
    paddingVertical: 6,
    marginTop: 8,
  },

  retryText: {
    fontSize: 9,
    fontWeight: '800',
  },


  /* ==========================================================
     EMPTY
  ========================================================== */

  emptyCard: {
    borderWidth: 1,
    borderRadius: 20,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 26,
  },

  emptyIcon: {
    width: 57,
    height: 57,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 11,
  },

  emptyTitle: {
    fontSize: 14,
    fontWeight: '850',
    textAlign: 'center',
  },

  emptyText: {
    fontSize: 10,
    lineHeight: 16,
    textAlign: 'center',
    maxWidth: 300,
    marginTop: 5,
  },

  primarySmallButton: {
    minHeight: 42,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 15,
    marginTop: 15,
  },

  primarySmallButtonText: {
    color: '#06110F',
    fontSize: 10.5,
    fontWeight: '850',
  },


  /* ==========================================================
     RECORDS
  ========================================================== */

  recordList: {
    gap: 9,
  },

  recordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 17,
    borderWidth: 1,
    padding: 11,
  },

  recordIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  recordBody: {
    flex: 1,
    minWidth: 0,
    marginLeft: 9,
  },

  recordTitle: {
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '800',
  },

  recordDate: {
    fontSize: 8.8,
    marginTop: 3,
  },

  recordMetaRow: {
    flexDirection: 'row',
    marginTop: 5,
  },

  recordStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 7,
    minHeight: 20,
  },

  recordStatusText: {
    fontSize: 7.8,
    fontWeight: '800',
  },

  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#06110F',
  },


  /* ==========================================================
     DATES
  ========================================================== */

  dateList: {
    gap: 8,
    paddingRight: 10,
  },

  dateCard: {
    width: 68,
    minHeight: 77,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },

  dateDay: {
    fontSize: 7.8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  dateNumber: {
    fontSize: 20,
    fontWeight: '900',
    marginVertical: 1,
  },

  dateMonth: {
    fontSize: 8.5,
    fontWeight: '650',
  },


  /* ==========================================================
     TIME
  ========================================================== */

  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  timeCard: {
    width: '31%',
    minHeight: 43,
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },

  timeText: {
    fontSize: 9.5,
    fontWeight: '750',
  },

  emptyTimeCard: {
    minHeight: 110,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },

  emptyTimeTitle: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 7,
  },

  emptyTimeText: {
    fontSize: 9.5,
    textAlign: 'center',
    marginTop: 4,
  },


  /* ==========================================================
     SUMMARY
  ========================================================== */

  summaryCard: {
    borderRadius: 21,
    borderWidth: 1,
    padding: 15,
    marginBottom: 13,
  },

  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 13,
  },

  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  summaryHeaderCopy: {
    marginLeft: 9,
  },

  summaryTitle: {
    fontSize: 13,
    fontWeight: '850',
  },

  summarySubtitle: {
    fontSize: 9,
    marginTop: 2,
  },

  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },

  summaryLabel: {
    fontSize: 9.5,
    fontWeight: '650',
    width: 84,
  },

  summaryValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 10.5,
    lineHeight: 15,
    fontWeight: '780',
  },

  summaryMeta: {
    textAlign: 'right',
    fontSize: 8.5,
    marginTop: 3,
  },

  summaryDivider: {
    height: 1,
    marginVertical: 11,
  },


  /* ==========================================================
     INFO
  ========================================================== */

  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderWidth: 1,
    borderRadius: 16,
    padding: 11,
    marginBottom: 13,
  },

  infoText: {
    flex: 1,
    fontSize: 9.5,
    lineHeight: 15,
  },


  /* ==========================================================
     BOOK
  ========================================================== */

  bookButton: {
    minHeight: 56,
    borderRadius: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,

    elevation: 5,

    shadowOffset: {
      width: 0,
      height: 6,
    },

    shadowOpacity: 0.22,
    shadowRadius: 12,
  },

  bookButtonText: {
    color: '#06110F',
    fontSize: 13,
    fontWeight: '900',
  },

  disclaimer: {
    fontSize: 8.8,
    lineHeight: 14,
    textAlign: 'center',
    paddingHorizontal: 12,
    marginTop: 10,
  },
});