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
  Easing,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';

import { AuthContext } from '../context/AuthContext';
import { getRecords } from '../services/api';

import {
  formatDate,
  formatDateTime,
  parseDateTime,
} from '../utils/dateTime';


/* ============================================================
   THEME
============================================================ */

const getTheme = isDark => ({
  background: isDark
    ? '#0A0F1A'
    : '#F8F9FB',

  card: isDark
    ? '#141C29'
    : '#FFFFFF',

  cardElevated: isDark
    ? '#182131'
    : '#FFFFFF',

  border: isDark
    ? '#222E40'
    : '#E2E8F0',

  textPrimary: isDark
    ? '#F8FAFC'
    : '#0F172A',

  textSecondary: isDark
    ? '#8897AE'
    : '#64748B',

  textMuted: isDark
    ? '#64748B'
    : '#94A3B8',

  inputBg: isDark
    ? '#101823'
    : '#F1F5F9',

  mutedBg: isDark
    ? '#111A28'
    : '#F1F5F9',

  cyanAccent: '#00D4C5',

  cyanSoft: isDark
    ? 'rgba(0, 212, 197, 0.11)'
    : '#E7FBF9',

  cyanBorder: isDark
    ? 'rgba(0, 212, 197, 0.22)'
    : '#BDEDEA',

  warning: '#F59E0B',

  warningSoft: isDark
    ? 'rgba(245, 158, 11, 0.10)'
    : '#FFF8E7',

  warningBorder: isDark
    ? 'rgba(245, 158, 11, 0.22)'
    : '#FDE68A',

  danger: '#EF4444',

  dangerSoft: isDark
    ? 'rgba(239, 68, 68, 0.10)'
    : '#FEF2F2',

  dangerBorder: isDark
    ? 'rgba(239, 68, 68, 0.22)'
    : '#FECACA',

  success: '#10B981',

  successSoft: isDark
    ? 'rgba(16, 185, 129, 0.10)'
    : '#ECFDF5',

  successBorder: isDark
    ? 'rgba(16, 185, 129, 0.22)'
    : '#A7F3D0',
});


/* ============================================================
   GENERIC HELPERS
============================================================ */

const safeText = (
  value,
  fallback = '',
) => {
  if (
    value === null ||
    value === undefined
  ) {
    return fallback;
  }

  if (
    typeof value === 'string'
  ) {
    const text = value.trim();

    return text || fallback;
  }

  if (
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return String(value);
  }

  if (Array.isArray(value)) {
    const items = value
      .map(item =>
        safeText(item, ''),
      )
      .filter(Boolean);

    return items.length
      ? items.join(', ')
      : fallback;
  }

  if (
    typeof value === 'object'
  ) {
    const preferredKeys = [
      'text',
      'name',
      'label',
      'title',
      'value',
      'description',
      'detail',
      'dosage',
      'dose',
      'medicine',
      'medication',
    ];

    for (
      const key of preferredKeys
    ) {
      if (
        value[key] !== null &&
        value[key] !== undefined
      ) {
        const extracted =
          safeText(
            value[key],
            '',
          );

        if (extracted) {
          return extracted;
        }
      }
    }

    return fallback;
  }

  return fallback;
};


const getRecordTimestamp = record => {
  const value =
    record?.created_at ||
    record?.createdAt ||
    record?.updated_at ||
    record?.updatedAt ||
    record?.date ||
    record?.timestamp ||
    null;

  if (!value) {
    return 0;
  }

  const parsed =
    parseDateTime(value);

  const timestamp =
    parsed?.getTime() || 0;

  return Number.isFinite(timestamp)
    ? timestamp
    : 0;
};


/* ============================================================
   RECORD NORMALIZATION
============================================================ */

const extractRecordArray = response => {
  if (
    Array.isArray(response)
  ) {
    return response;
  }

  if (
    Array.isArray(
      response?.results,
    )
  ) {
    return response.results;
  }

  if (
    Array.isArray(
      response?.records,
    )
  ) {
    return response.records;
  }

  if (
    Array.isArray(
      response?.data,
    )
  ) {
    return response.data;
  }

  return [];
};


const sortRecordsNewestFirst =
  records => {
    return [...records].sort(
      (a, b) =>
        getRecordTimestamp(b) -
        getRecordTimestamp(a),
    );
  };


/* ============================================================
   MEDICATION EXTRACTION
============================================================ */

const getRawMedicationSources =
  record => {
    const sources = [];

    const candidates = [
      record?.medicines,
      record?.medications,
      record?.result?.medicines,
      record?.result?.medications,
      record?.triage?.medicines,
      record?.triage?.medications,
      record?.analysis?.medicines,
      record?.analysis?.medications,
    ];

    candidates.forEach(
      candidate => {
        if (
          Array.isArray(candidate)
        ) {
          sources.push(...candidate);
        }
      },
    );

    return sources;
  };


const normalizeMedication =
  (
    medication,
    index,
    record,
  ) => {
    if (
      medication === null ||
      medication === undefined
    ) {
      return null;
    }

    /*
     * Some backend responses may contain
     * plain strings while current CareSense
     * clinical results usually return objects.
     */
    if (
      typeof medication ===
      'string'
    ) {
      const name =
        medication.trim();

      if (!name) {
        return null;
      }

      return {
        id:
          `${record?.id || 'record'}-${index}-${name}`,
        name,
        dosage: '',
        purpose: '',
        instructions: '',
        status: '',
        time: '',
        sourceRecordId:
          record?.id ||
          record?.audit_id ||
          null,
        sourceDate:
          record?.created_at ||
          record?.updated_at ||
          record?.date ||
          null,
      };
    }

    if (
      typeof medication !==
      'object'
    ) {
      return null;
    }

    const name =
      safeText(
        medication?.name ??
          medication?.medicine ??
          medication?.medication ??
          medication?.title,
        '',
      );

    if (!name) {
      return null;
    }

    const dosage =
      safeText(
        medication?.dosage ??
          medication?.dose,
        '',
      );

    const purpose =
      safeText(
        medication?.purpose ??
          medication?.reason ??
          medication?.detail ??
          medication?.indication,
        '',
      );

    const instructions =
      safeText(
        medication?.instructions ??
          medication?.instruction ??
          medication?.directions ??
          medication?.how_to_take ??
          medication?.usage,
        '',
      );

    const status =
      safeText(
        medication?.status,
        '',
      ).toUpperCase();

    const time =
      safeText(
        medication?.time ??
          medication?.schedule,
        '',
      );

    const identifier =
      safeText(
        medication?.id ??
          medication?._id,
        '',
      );

    return {
      id:
        identifier ||
        `${record?.id || 'record'}-${index}-${name}`,

      name,

      dosage,

      purpose,

      instructions,

      status,

      time,

      sourceRecordId:
        record?.id ||
        record?.audit_id ||
        null,

      sourceDate:
        record?.created_at ||
        record?.updated_at ||
        record?.date ||
        null,
    };
  };


const extractMedications =
  records => {
    const medications = [];

    records.forEach(
      record => {
        const raw =
          getRawMedicationSources(
            record,
          );

        raw.forEach(
          (medication, index) => {
            const normalized =
              normalizeMedication(
                medication,
                index,
                record,
              );

            if (
              normalized
            ) {
              medications.push(
                normalized,
              );
            }
          },
        );
      },
    );

    /*
     * Remove exact duplicates.
     */
    const seen =
      new Set();

    return medications.filter(
      medication => {
        const key =
          [
            medication.name
              .toLowerCase(),
            medication.dosage
              .toLowerCase(),
            medication.sourceRecordId ||
              '',
          ].join('|');

        if (
          seen.has(key)
        ) {
          return false;
        }

        seen.add(key);

        return true;
      },
    );
  };


/* ============================================================
   STATUS PRESENTATION
============================================================ */

const getStatusMeta = (
  status,
  theme,
) => {
  const normalized =
    safeText(
      status,
      '',
    ).toUpperCase();

  if (
    normalized ===
      'TAKEN' ||
    normalized ===
      'COMPLETED' ||
    normalized ===
      'DONE'
  ) {
    return {
      label: 'Taken',
      icon: 'checkmark-circle',
      color: theme.success,
      background:
        theme.successSoft,
      border:
        theme.successBorder,
    };
  }

  if (
    normalized ===
      'MISSED' ||
    normalized ===
      'SKIPPED'
  ) {
    return {
      label: 'Missed',
      icon: 'close-circle',
      color: theme.danger,
      background:
        theme.dangerSoft,
      border:
        theme.dangerBorder,
    };
  }

  if (
    normalized ===
      'PENDING' ||
    normalized ===
      'DUE'
  ) {
    return {
      label: 'Pending',
      icon: 'time',
      color: theme.warning,
      background:
        theme.warningSoft,
      border:
        theme.warningBorder,
    };
  }

  if (
    normalized ===
      'UPCOMING' ||
    normalized ===
      'SCHEDULED'
  ) {
    return {
      label: 'Upcoming',
      icon: 'calendar-outline',
      color: theme.cyanAccent,
      background:
        theme.cyanSoft,
      border:
        theme.cyanBorder,
    };
  }

  return null;
};


/* ============================================================
   ANIMATED PRESSABLE
============================================================ */

function AnimatedButton({
  children,
  onPress,
  disabled = false,
  style,
}) {
  const scale =
    useRef(
      new Animated.Value(1),
    ).current;

  const handlePressIn =
    useCallback(() => {
      if (disabled) {
        return;
      }

      Animated.spring(
        scale,
        {
          toValue: 0.97,
          useNativeDriver: true,
          speed: 45,
          bounciness: 3,
        },
      ).start();
    }, [
      disabled,
      scale,
    ]);

  const handlePressOut =
    useCallback(() => {
      Animated.spring(
        scale,
        {
          toValue: 1,
          useNativeDriver: true,
          speed: 45,
          bounciness: 4,
        },
      ).start();
    }, [scale]);

  return (
    <TouchableOpacity
      disabled={disabled}
      activeOpacity={0.9}
      onPress={onPress}
      onPressIn={
        handlePressIn
      }
      onPressOut={
        handlePressOut
      }
    >
      <Animated.View
        style={[
          style,
          {
            transform: [
              {
                scale,
              },
            ],
            opacity:
              disabled
                ? 0.5
                : 1,
          },
        ]}
      >
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}


/* ============================================================
   SCREEN
============================================================ */

export default function MedicationScreen({
  route,
  navigation,
}) {
  const {
    user,
    isDarkMode,
  } =
    useContext(
      AuthContext,
    ) || {};

  const insets =
    useSafeAreaInsets();

  const isDark =
    Boolean(
      isDarkMode,
    );

  const theme =
    useMemo(
      () =>
        getTheme(isDark),
      [isDark],
    );


  /* ==========================================================
     STATE
  ========================================================== */

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
    records,
    setRecords,
  ] = useState([]);

  const [
    medications,
    setMedications,
  ] = useState([]);

  const [
    expandedId,
    setExpandedId,
  ] = useState(null);


  /* ==========================================================
     ANIMATION
  ========================================================== */

  const fadeAnim =
    useRef(
      new Animated.Value(0),
    ).current;

  const slideAnim =
    useRef(
      new Animated.Value(18),
    ).current;


  /* ==========================================================
     DISPLAY DATA
  ========================================================== */

  const latestRecord =
    records.length > 0
      ? records[0]
      : null;

  const latestMedicationDate =
    medications.reduce(
      (latest, item) => {
        const timestamp =
          getRecordTimestamp({
            created_at:
              item.sourceDate,
          });

        return Math.max(
          latest,
          timestamp,
        );
      },
      0,
    );

  const latestMedicationDateText =
    latestMedicationDate
      ? formatDateTime(
          latestMedicationDate,
        )
      : null;

  const uniqueMedicationNames =
    useMemo(() => {
      return [
        ...new Set(
          medications.map(
            item =>
              item.name
                .trim()
                .toLowerCase(),
          ),
        ),
      ];
    }, [medications]);


  const totalMedicines =
    uniqueMedicationNames.length;


  const recordsWithMedication =
    useMemo(() => {
      return records.filter(
        record =>
          getRawMedicationSources(
            record,
          ).length > 0,
      );
    }, [records]);


  const latestRecordId =
    latestRecord?.id ||
    latestRecord?.audit_id ||
    null;


  /* ==========================================================
     FETCH DATA
  ========================================================== */

  const fetchMedicationData =
    useCallback(
      async (
        force = false,
      ) => {
        if (
          !user?.uid
        ) {
          setRecords([]);
          setMedications([]);
          setLoading(false);
          setRefreshing(false);
          return;
        }

        try {
          setErrorMessage('');

          if (force) {
            setRefreshing(true);
          } else {
            setLoading(true);
          }

          const response =
            await getRecords(
              user.uid,
              {
                force,
              },
            );

          const extracted =
            extractRecordArray(
              response,
            );

          const sorted =
            sortRecordsNewestFirst(
              extracted,
            );

          /*
           * Route medication data is accepted
           * only as a real navigation payload.
           * It is never replaced with demo data.
           */
          const routeMedicines =
            Array.isArray(
              route?.params?.medicines,
            )
              ? route.params
                  .medicines
              : [];

          const routeRecord =
            routeMedicines.length > 0
              ? {
                  id:
                    route?.params
                      ?.recordId ||
                    'route-record',

                  created_at:
                    route?.params
                      ?.recordDate ||
                    null,

                  medicines:
                    routeMedicines,
                }
              : null;

          const dataRecords =
            routeRecord
              ? [
                  routeRecord,
                  ...sorted,
                ]
              : sorted;

          const normalized =
            extractMedications(
              dataRecords,
            );

          setRecords(
            dataRecords,
          );

          setMedications(
            normalized,
          );

          setExpandedId(
            null,
          );
        } catch (
          error
        ) {
          console.error(
            'MedicationScreen fetch error:',
            error,
          );

          setErrorMessage(
            'We could not load your medication information right now.',
          );

          /*
           * Keep old data visible during
           * a failed refresh instead of
           * replacing it with fake content.
           */
          if (
            !medications.length
          ) {
            setRecords([]);
            setMedications([]);
          }
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [
        user?.uid,
        route?.params?.medicines,
        route?.params?.recordId,
        route?.params?.recordDate,
        medications.length,
      ],
    );


  /* ==========================================================
     INITIAL + FOCUS REFRESH
  ========================================================== */

  useEffect(() => {
    void fetchMedicationData(
      false,
    );
  }, [
    fetchMedicationData,
  ]);


  useFocusEffect(
    useCallback(() => {
      void fetchMedicationData(
        false,
      );
    }, [
      fetchMedicationData,
    ]),
  );


  /* ==========================================================
     ENTRANCE ANIMATION
  ========================================================== */

  useEffect(() => {
    if (
      loading
    ) {
      return;
    }

    fadeAnim.setValue(0);
    slideAnim.setValue(18);

    Animated.parallel([
      Animated.timing(
        fadeAnim,
        {
          toValue: 1,
          duration: 420,
          easing:
            Easing.out(
              Easing.cubic,
            ),
          useNativeDriver: true,
        },
      ),

      Animated.timing(
        slideAnim,
        {
          toValue: 0,
          duration: 460,
          easing:
            Easing.out(
              Easing.cubic,
            ),
          useNativeDriver: true,
        },
      ),
    ]).start();
  }, [
    loading,
    medications.length,
    fadeAnim,
    slideAnim,
  ]);


  /* ==========================================================
     REFRESH
  ========================================================== */

  const handleRefresh =
    useCallback(() => {
      void fetchMedicationData(
        true,
      );
    }, [
      fetchMedicationData,
    ]);


  /* ==========================================================
     NAVIGATION
  ========================================================== */

  const openLatestRecord =
    useCallback(() => {
      if (
        !latestRecord
      ) {
        navigation.navigate(
          'SymptomChecker',
        );

        return;
      }

      navigation.navigate(
        'HealthRecordDetail',
        {
          result:
            latestRecord,
        },
      );
    }, [
      navigation,
      latestRecord,
    ]);


  const openSymptomChecker =
    useCallback(() => {
      navigation.navigate(
        'SymptomChecker',
      );
    }, [
      navigation,
    ]);


  /* ==========================================================
     LOADING SCREEN
  ========================================================== */

  if (
    loading &&
    records.length === 0
  ) {
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

        <View
          style={
            styles.loadingContainer
          }
        >
          <View
            style={[
              styles.loadingIcon,
              {
                backgroundColor:
                  theme.cyanSoft,
                borderColor:
                  theme.cyanBorder,
              },
            ]}
          >
            <Ionicons
              name="medkit-outline"
              size={34}
              color={
                theme.cyanAccent
              }
            />
          </View>

          <ActivityIndicator
            size="small"
            color={
              theme.cyanAccent
            }
            style={{
              marginTop: 18,
            }}
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
            Loading your medications
          </Text>

          <Text
            style={[
              styles.loadingText,
              {
                color:
                  theme.textSecondary,
              },
            ]}
          >
            Securely syncing medication
            information from your
            CareSense records.
          </Text>
        </View>
      </SafeAreaView>
    );
  }


  /* ==========================================================
     MAIN SCREEN
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

      <Animated.ScrollView
        showsVerticalScrollIndicator={
          false
        }
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={
              handleRefresh
            }
            tintColor={
              theme.cyanAccent
            }
            colors={[
              theme.cyanAccent,
            ]}
          />
        }
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom:
              Math.max(
                34,
                insets.bottom +
                  28,
              ),
          },
        ]}
        style={{
          opacity:
            fadeAnim,
          transform: [
            {
              translateY:
                slideAnim,
            },
          ],
        }}
      >

        {/* ==================================================
            HEADER
        ================================================== */}

        <View
          style={
            styles.header
          }
        >
          <View
            style={
              styles.headerText
            }
          >
            <View
              style={
                styles.eyebrowRow
              }
            >
              <View
                style={[
                  styles.liveDot,
                  {
                    backgroundColor:
                      theme.cyanAccent,
                  },
                ]}
              />

              <Text
                style={[
                  styles.eyebrow,
                  {
                    color:
                      theme.cyanAccent,
                  },
                ]}
              >
                YOUR MEDICATIONS
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
              Medications
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
              See the medicines listed in your CareSense health records.
            </Text>
          </View>

          <View
            style={[
              styles.headerIcon,
              {
                backgroundColor:
                  theme.cyanSoft,
                borderColor:
                  theme.cyanBorder,
              },
            ]}
          >
            <Ionicons
              name="medical-outline"
              size={24}
              color={
                theme.cyanAccent
              }
            />
          </View>
        </View>


        {/* ==================================================
            SAFETY / CONTEXT BANNER
        ================================================== */}

        <View
          style={[
            styles.infoBanner,
            {
              backgroundColor:
                theme.cyanSoft,
              borderColor:
                theme.cyanBorder,
            },
          ]}
        >
          <View
            style={[
              styles.infoBannerIcon,
              {
                backgroundColor:
                  theme.card,
              },
            ]}
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={19}
              color={
                theme.cyanAccent
              }
            />
          </View>

          <View
            style={
              styles.infoBannerContent
            }
          >
            <Text
              style={[
                styles.infoBannerTitle,
                {
                  color:
                    theme.textPrimary,
                },
              ]}
            >
              Real CareSense information
            </Text>

            <Text
              style={[
                styles.infoBannerText,
                {
                  color:
                    theme.textSecondary,
                },
              ]}
            >
              Only medication information
              returned by your health records
              is displayed here. This screen
              does not create prescriptions.
            </Text>
          </View>
        </View>


        {/* ==================================================
            ERROR STATE
        ================================================== */}

        {errorMessage ? (
          <View
            style={[
              styles.errorCard,
              {
                backgroundColor:
                  theme.dangerSoft,
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
                    theme.card,
                },
              ]}
            >
              <Ionicons
                name="cloud-offline-outline"
                size={20}
                color={
                  theme.danger
                }
              />
            </View>

            <View
              style={
                styles.errorContent
              }
            >
              <Text
                style={[
                  styles.errorTitle,
                  {
                    color:
                      theme.textPrimary,
                  },
                ]}
              >
                Unable to refresh
              </Text>

              <Text
                style={[
                  styles.errorText,
                  {
                    color:
                      theme.textSecondary,
                  },
                ]}
              >
                {errorMessage}
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() =>
                fetchMedicationData(
                  true,
                )
              }
              style={[
                styles.retryButton,
                {
                  backgroundColor:
                    theme.card,
                  borderColor:
                    theme.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.retryText,
                  {
                    color:
                      theme.cyanAccent,
                  },
                ]}
              >
                Retry
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}


        {medications.length > 0 ? (
          <>

            {/* ================================================
                SUMMARY CARD
            ================================================ */}

            <View
              style={[
                styles.summaryCard,
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
                  styles.summaryHeader
                }
              >
                <View>
                  <Text
                    style={[
                      styles.cardKicker,
                      {
                        color:
                          theme.cyanAccent,
                      },
                    ]}
                  >
                    MEDICATION OVERVIEW
                  </Text>

                  <Text
                    style={[
                      styles.summaryTitle,
                      {
                        color:
                          theme.textPrimary,
                      },
                    ]}
                  >
                    Your current information
                  </Text>
                </View>

                <View
                  style={[
                    styles.summaryIcon,
                    {
                      backgroundColor:
                        theme.cyanSoft,
                      borderColor:
                        theme.cyanBorder,
                    },
                  ]}
                >
                  <Ionicons
                    name="pulse-outline"
                    size={21}
                    color={
                      theme.cyanAccent
                    }
                  />
                </View>
              </View>


              <View
                style={
                  styles.statsRow
                }
              >

                <View
                  style={[
                    styles.statItem,
                    {
                      backgroundColor:
                        theme.mutedBg,
                      borderColor:
                        theme.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statValue,
                      {
                        color:
                          theme.textPrimary,
                      },
                    ]}
                  >
                    {totalMedicines}
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
                    {totalMedicines ===
                    1
                      ? 'Medicine'
                      : 'Medicines'}
                  </Text>
                </View>


                <View
                  style={[
                    styles.statItem,
                    {
                      backgroundColor:
                        theme.mutedBg,
                      borderColor:
                        theme.border,
                    },
                  ]}
                >
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
                      recordsWithMedication.length
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
                    {recordsWithMedication.length ===
                    1
                      ? 'Assessment'
                      : 'Assessments'}
                  </Text>
                </View>


                <View
                  style={[
                    styles.statItem,
                    {
                      backgroundColor:
                        theme.mutedBg,
                      borderColor:
                        theme.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="checkmark-done-outline"
                    size={22}
                    color={
                      theme.cyanAccent
                    }
                  />

                  <Text
                    style={[
                      styles.statLabel,
                      {
                        color:
                          theme.textSecondary,
                        marginTop: 4,
                      },
                    ]}
                  >
                    Verified data
                  </Text>
                </View>

              </View>


              {latestMedicationDateText ? (
                <View
                  style={[
                    styles.updatedRow,
                    {
                      borderTopColor:
                        theme.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="time-outline"
                    size={15}
                    color={
                      theme.textMuted
                    }
                  />

                  <Text
                    style={[
                      styles.updatedText,
                      {
                        color:
                          theme.textSecondary,
                      },
                    ]}
                  >
                    Last updated:{' '}
                    {latestMedicationDateText}
                  </Text>
                </View>
              ) : null}
            </View>


            {/* ================================================
                MEDICATION LIST
            ================================================ */}

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
                  Your medicines
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
                  These details come from your CareSense health records.
                </Text>
              </View>

              <View
                style={[
                  styles.countBadge,
                  {
                    backgroundColor:
                      theme.cyanSoft,
                    borderColor:
                      theme.cyanBorder,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.countBadgeText,
                    {
                      color:
                        theme.cyanAccent,
                    },
                  ]}
                >
                  {medications.length}
                </Text>
              </View>
            </View>


            <View
              style={
                styles.medicationList
              }
            >
              {medications.map(
                (
                  medication,
                  index,
                ) => {
                  const statusMeta =
                    getStatusMeta(
                      medication.status,
                      theme,
                    );

                  const isExpanded =
                    expandedId ===
                    medication.id;

                  return (
                    <View
                      key={`${medication.id}-${index}`}
                      style={[
                        styles.medicationCard,
                        {
                          backgroundColor:
                            theme.card,
                          borderColor:
                            theme.border,
                        },
                      ]}
                    >

                      <TouchableOpacity
                        activeOpacity={
                          0.88
                        }
                        onPress={() =>
                          setExpandedId(
                            isExpanded
                              ? null
                              : medication.id,
                          )
                        }
                        style={
                          styles.medicationTop
                        }
                      >

                        <View
                          style={[
                            styles.medicationIcon,
                            {
                              backgroundColor:
                                theme.cyanSoft,
                              borderColor:
                                theme.cyanBorder,
                            },
                          ]}
                        >
                          <Ionicons
                            name="medkit-outline"
                            size={22}
                            color={
                              theme.cyanAccent
                            }
                          />
                        </View>


                        <View
                          style={
                            styles.medicationMain
                          }
                        >
                          <Text
                            style={[
                              styles.medicationName,
                              {
                                color:
                                  theme.textPrimary,
                              },
                            ]}
                            numberOfLines={
                              isExpanded
                                ? undefined
                                : 2
                            }
                          >
                            {
                              medication.name
                            }
                          </Text>

                          {medication.dosage ? (
                            <Text
                              style={[
                                styles.dosageText,
                                {
                                  color:
                                    theme.textSecondary,
                                },
                              ]}
                              numberOfLines={
                                2
                              }
                            >
                              {
                                medication.dosage
                              }
                            </Text>
                          ) : null}

                          {medication.purpose ? (
                            <Text
                              style={[
                                styles.purposeText,
                                {
                                  color:
                                    theme.textMuted,
                                },
                              ]}
                              numberOfLines={
                                isExpanded
                                  ? undefined
                                  : 2
                              }
                            >
                              {
                                medication.purpose
                              }
                            </Text>
                          ) : null}
                        </View>


                        <View
                          style={
                            styles.medicationRight
                          }
                        >
                          {statusMeta ? (
                            <View
                              style={[
                                styles.statusBadge,
                                {
                                  backgroundColor:
                                    statusMeta.background,
                                  borderColor:
                                    statusMeta.border,
                                },
                              ]}
                            >
                              <Ionicons
                                name={
                                  statusMeta.icon
                                }
                                size={13}
                                color={
                                  statusMeta.color
                                }
                              />

                              <Text
                                style={[
                                  styles.statusText,
                                  {
                                    color:
                                      statusMeta.color,
                                  },
                                ]}
                              >
                                {
                                  statusMeta.label
                                }
                              </Text>
                            </View>
                          ) : null}

                          <Ionicons
                            name={
                              isExpanded
                                ? 'chevron-up'
                                : 'chevron-down'
                            }
                            size={18}
                            color={
                              theme.textMuted
                            }
                            style={{
                              marginTop: 8,
                            }}
                          />
                        </View>

                      </TouchableOpacity>


                      {isExpanded ? (
                        <View
                          style={[
                            styles.expandedContent,
                            {
                              borderTopColor:
                                theme.border,
                            },
                          ]}
                        >

                          {medication.time ? (
                            <View
                              style={
                                styles.detailRow
                              }
                            >
                              <View
                                style={[
                                  styles.detailIcon,
                                  {
                                    backgroundColor:
                                      theme.mutedBg,
                                  },
                                ]}
                              >
                                <Ionicons
                                  name="time-outline"
                                  size={16}
                                  color={
                                    theme.cyanAccent
                                  }
                                />
                              </View>

                              <View
                                style={
                                  styles.detailTextWrap
                                }
                              >
                                <Text
                                  style={[
                                    styles.detailLabel,
                                    {
                                      color:
                                        theme.textMuted,
                                    },
                                  ]}
                                >
                                  When to take it
                                </Text>

                                <Text
                                  style={[
                                    styles.detailValue,
                                    {
                                      color:
                                        theme.textPrimary,
                                    },
                                  ]}
                                >
                                  {
                                    medication.time
                                  }
                                </Text>
                              </View>
                            </View>
                          ) : null}


                          {medication.instructions ? (
                            <View
                              style={
                                styles.detailRow
                              }
                            >
                              <View
                                style={[
                                  styles.detailIcon,
                                  {
                                    backgroundColor:
                                      theme.mutedBg,
                                  },
                                ]}
                              >
                                <Ionicons
                                  name="information-circle-outline"
                                  size={16}
                                  color={
                                    theme.cyanAccent
                                  }
                                />
                              </View>

                              <View
                                style={
                                  styles.detailTextWrap
                                }
                              >
                                <Text
                                  style={[
                                    styles.detailLabel,
                                    {
                                      color:
                                        theme.textMuted,
                                    },
                                  ]}
                                >
                                  How to take it
                                </Text>

                                <Text
                                  style={[
                                    styles.detailValue,
                                    {
                                      color:
                                        theme.textSecondary,
                                    },
                                  ]}
                                >
                                  {
                                    medication.instructions
                                  }
                                </Text>
                              </View>
                            </View>
                          ) : null}


                          {medication.sourceDate ? (
                            <View
                              style={
                                styles.sourceRow
                              }
                            >
                              <Ionicons
                                name="document-text-outline"
                                size={14}
                                color={
                                  theme.textMuted
                                }
                              />

                              <Text
                                style={[
                                  styles.sourceText,
                                  {
                                    color:
                                      theme.textMuted,
                                  },
                                ]}
                              >
                                From CareSense assessment on{' '}
                                {formatDate(
                                  medication.sourceDate,
                                )}
                              </Text>
                            </View>
                          ) : null}

                        </View>
                      ) : null}

                    </View>
                  );
                },
              )}
            </View>


            {/* ================================================
                LATEST ASSESSMENT
            ================================================ */}

            {latestRecord ? (
              <View
                style={[
                  styles.latestCard,
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
                    styles.latestTop
                  }
                >
                  <View
                    style={[
                      styles.latestIcon,
                      {
                        backgroundColor:
                          theme.cyanSoft,
                        borderColor:
                          theme.cyanBorder,
                      },
                    ]}
                  >
                    <Ionicons
                      name="document-text-outline"
                      size={21}
                      color={
                        theme.cyanAccent
                      }
                    />
                  </View>

                  <View
                    style={
                      styles.latestTextWrap
                    }
                  >
                    <Text
                      style={[
                        styles.cardKicker,
                        {
                          color:
                            theme.cyanAccent,
                        },
                      ]}
                    >
                      SOURCE RECORD
                    </Text>

                    <Text
                      style={[
                        styles.latestTitle,
                        {
                          color:
                            theme.textPrimary,
                        },
                      ]}
                    >
                      Latest health assessment
                    </Text>

                    <Text
                      style={[
                        styles.latestSubtitle,
                        {
                          color:
                            theme.textSecondary,
                        },
                      ]}
                    >
                      {formatDateTime(
                        latestRecord
                          ?.created_at ||
                          latestRecord
                            ?.updated_at ||
                          latestRecord
                            ?.date,
                      )}
                    </Text>
                  </View>
                </View>

                <AnimatedButton
                  onPress={
                    openLatestRecord
                  }
                  style={[
                    styles.secondaryButton,
                    {
                      backgroundColor:
                        theme.mutedBg,
                      borderColor:
                        theme.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.secondaryButtonText,
                      {
                        color:
                          theme.textPrimary,
                      },
                    ]}
                  >
                    View assessment
                  </Text>

                  <Ionicons
                    name="arrow-forward"
                    size={17}
                    color={
                      theme.cyanAccent
                    }
                  />
                </AnimatedButton>
              </View>
            ) : null}


            {/* ================================================
                DISCLAIMER
            ================================================ */}

            <View
              style={[
                styles.disclaimer,
                {
                  backgroundColor:
                    theme.warningSoft,
                  borderColor:
                    theme.warningBorder,
                },
              ]}
            >
              <Ionicons
                name="alert-circle-outline"
                size={19}
                color={
                  theme.warning
                }
              />

              <Text
                style={[
                  styles.disclaimerText,
                  {
                    color:
                      theme.textSecondary,
                  },
                ]}
              >
                Your medicines shown here
                comes from your CareSense health
                records. Always follow instructions
                from a qualified healthcare
                professional and do not change
                medication without appropriate
                medical guidance.
              </Text>
            </View>

          </>
        ) : (

          /* =================================================
             EMPTY STATE
          ================================================== */

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
                styles.emptyGlow,
                {
                  backgroundColor:
                    theme.cyanSoft,
                  borderColor:
                    theme.cyanBorder,
                },
              ]}
            >
              <View
                style={[
                  styles.emptyIcon,
                  {
                    backgroundColor:
                      theme.cardElevated,
                  },
                ]}
              >
                <Ionicons
                  name="medical-outline"
                  size={38}
                  color={
                    theme.cyanAccent
                  }
                />
              </View>
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
              No medication information yet
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
              CareSense has not returned medication
              information in your available health
              assessments yet.
            </Text>

            <View
              style={
                styles.emptyFacts
              }
            >
              <View
                style={
                  styles.emptyFact
                }
              >
                <View
                  style={[
                    styles.emptyFactIcon,
                    {
                      backgroundColor:
                        theme.mutedBg,
                    },
                  ]}
                >
                  <Ionicons
                    name="document-text-outline"
                    size={16}
                    color={
                      theme.cyanAccent
                    }
                  />
                </View>

                <Text
                  style={[
                    styles.emptyFactText,
                    {
                      color:
                        theme.textSecondary,
                    },
                  ]}
                >
                  Data comes from your
                  CareSense assessments.
                </Text>
              </View>

              <View
                style={
                  styles.emptyFact
                }
              >
                <View
                  style={[
                    styles.emptyFactIcon,
                    {
                      backgroundColor:
                        theme.mutedBg,
                    },
                  ]}
                >
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={16}
                    color={
                      theme.cyanAccent
                    }
                  />
                </View>

                <Text
                  style={[
                    styles.emptyFactText,
                    {
                      color:
                        theme.textSecondary,
                    },
                  ]}
                >
                  No demo or placeholder
                  medications are shown.
                </Text>
              </View>
            </View>

            <AnimatedButton
              onPress={
                openSymptomChecker
              }
              style={[
                styles.primaryButton,
                {
                  backgroundColor:
                    theme.cyanAccent,
                },
              ]}
            >
              <Ionicons
                name="pulse-outline"
                size={19}
                color="#06110F"
              />

              <Text
                style={
                  styles.primaryButtonText
                }
              >
                Check Symptoms
              </Text>

              <Ionicons
                name="arrow-forward"
                size={18}
                color="#06110F"
              />
            </AnimatedButton>

            <Text
              style={[
                styles.emptyFootnote,
                {
                  color:
                    theme.textMuted,
                },
              ]}
            >
              After a health assessment returns
              medication information, it will
              appear here automatically.
            </Text>
          </View>
        )}

      </Animated.ScrollView>
    </SafeAreaView>
  );
}


/* ============================================================
   STYLES
============================================================ */

const styles =
  StyleSheet.create({

    safeArea: {
      flex: 1,
    },

    content: {
      paddingHorizontal: 20,
      paddingTop: 12,
    },


    /* ========================================================
       LOADING
    ======================================================== */

    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 40,
    },

    loadingIcon: {
      width: 78,
      height: 78,
      borderRadius: 25,
      borderWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },

    loadingTitle: {
      fontSize: 19,
      fontWeight: '800',
      marginTop: 16,
      textAlign: 'center',
    },

    loadingText: {
      fontSize: 14,
      lineHeight: 21,
      marginTop: 8,
      textAlign: 'center',
      maxWidth: 310,
    },


    /* ========================================================
       HEADER
    ======================================================== */

    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 18,
    },

    headerText: {
      flex: 1,
      paddingRight: 14,
    },

    eyebrowRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 7,
    },

    liveDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      marginRight: 7,
    },

    eyebrow: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.35,
    },

    title: {
      fontSize: 30,
      lineHeight: 35,
      fontWeight: '900',
      letterSpacing: -0.8,
    },

    subtitle: {
      fontSize: 14,
      lineHeight: 20,
      marginTop: 6,
      maxWidth: 340,
    },

    headerIcon: {
      width: 52,
      height: 52,
      borderRadius: 17,
      borderWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 4,
    },


    /* ========================================================
       INFO BANNER
    ======================================================== */

    infoBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      borderRadius: 18,
      borderWidth: 1,
      padding: 14,
      marginBottom: 14,
    },

    infoBannerIcon: {
      width: 38,
      height: 38,
      borderRadius: 13,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 11,
    },

    infoBannerContent: {
      flex: 1,
      paddingTop: 1,
    },

    infoBannerTitle: {
      fontSize: 13,
      fontWeight: '800',
      marginBottom: 4,
    },

    infoBannerText: {
      fontSize: 12,
      lineHeight: 18,
    },


    /* ========================================================
       ERROR
    ======================================================== */

    errorCard: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 17,
      borderWidth: 1,
      padding: 12,
      marginBottom: 14,
    },

    errorIcon: {
      width: 40,
      height: 40,
      borderRadius: 13,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 10,
    },

    errorContent: {
      flex: 1,
      paddingRight: 7,
    },

    errorTitle: {
      fontSize: 13,
      fontWeight: '800',
    },

    errorText: {
      fontSize: 11,
      lineHeight: 16,
      marginTop: 2,
    },

    retryButton: {
      minHeight: 36,
      paddingHorizontal: 13,
      borderRadius: 11,
      borderWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },

    retryText: {
      fontSize: 12,
      fontWeight: '800',
    },


    /* ========================================================
       SUMMARY
    ======================================================== */

    summaryCard: {
      borderRadius: 22,
      borderWidth: 1,
      padding: 17,
      marginBottom: 22,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 7,
      },
      shadowOpacity: 0.06,
      shadowRadius: 18,
      elevation: 3,
    },

    summaryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },

    cardKicker: {
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1.2,
      marginBottom: 5,
    },

    summaryTitle: {
      fontSize: 18,
      fontWeight: '850',
      letterSpacing: -0.2,
    },

    summaryIcon: {
      width: 43,
      height: 43,
      borderRadius: 14,
      borderWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },

    statsRow: {
      flexDirection: 'row',
      gap: 9,
      marginTop: 17,
    },

    statItem: {
      flex: 1,
      minHeight: 76,
      borderWidth: 1,
      borderRadius: 16,
      paddingHorizontal: 10,
      paddingVertical: 10,
      justifyContent: 'center',
    },

    statValue: {
      fontSize: 22,
      fontWeight: '900',
      letterSpacing: -0.4,
    },

    statLabel: {
      fontSize: 11,
      marginTop: 3,
      lineHeight: 14,
    },

    updatedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderTopWidth: 1,
      marginTop: 16,
      paddingTop: 13,
    },

    updatedText: {
      flex: 1,
      fontSize: 11,
      marginLeft: 7,
      lineHeight: 16,
    },


    /* ========================================================
       SECTION
    ======================================================== */

    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      marginBottom: 12,
    },

    sectionTitle: {
      fontSize: 20,
      fontWeight: '900',
      letterSpacing: -0.4,
    },

    sectionSubtitle: {
      fontSize: 12,
      lineHeight: 17,
      marginTop: 3,
      maxWidth: 310,
    },

    countBadge: {
      minWidth: 34,
      height: 30,
      borderRadius: 11,
      borderWidth: 1,
      paddingHorizontal: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },

    countBadgeText: {
      fontSize: 12,
      fontWeight: '900',
    },


    /* ========================================================
       MEDICATION CARD
    ======================================================== */

    medicationList: {
      marginBottom: 6,
    },

    medicationCard: {
      borderRadius: 20,
      borderWidth: 1,
      marginBottom: 11,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.045,
      shadowRadius: 12,
      elevation: 2,
    },

    medicationTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: 15,
    },

    medicationIcon: {
      width: 48,
      height: 48,
      borderRadius: 16,
      borderWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },

    medicationMain: {
      flex: 1,
      paddingRight: 8,
    },

    medicationName: {
      fontSize: 16,
      lineHeight: 21,
      fontWeight: '850',
      letterSpacing: -0.1,
    },

    dosageText: {
      fontSize: 13,
      lineHeight: 18,
      marginTop: 5,
      fontWeight: '600',
    },

    purposeText: {
      fontSize: 11,
      lineHeight: 16,
      marginTop: 4,
    },

    medicationRight: {
      alignItems: 'flex-end',
      marginLeft: 4,
    },

    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 9,
      borderWidth: 1,
      paddingHorizontal: 7,
      paddingVertical: 5,
    },

    statusText: {
      fontSize: 10,
      fontWeight: '800',
      marginLeft: 4,
    },

    expandedContent: {
      borderTopWidth: 1,
      paddingHorizontal: 15,
      paddingVertical: 13,
    },

    detailRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 13,
    },

    detailIcon: {
      width: 31,
      height: 31,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 9,
    },

    detailTextWrap: {
      flex: 1,
      paddingTop: 1,
    },

    detailLabel: {
      fontSize: 10,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 2,
    },

    detailValue: {
      fontSize: 13,
      lineHeight: 19,
    },

    sourceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 2,
    },

    sourceText: {
      flex: 1,
      fontSize: 10,
      lineHeight: 15,
      marginLeft: 6,
    },


    /* ========================================================
       LATEST RECORD
    ======================================================== */

    latestCard: {
      borderRadius: 20,
      borderWidth: 1,
      padding: 16,
      marginTop: 10,
      marginBottom: 14,
    },

    latestTop: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    latestIcon: {
      width: 46,
      height: 46,
      borderRadius: 15,
      borderWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 11,
    },

    latestTextWrap: {
      flex: 1,
    },

    latestTitle: {
      fontSize: 15,
      fontWeight: '800',
    },

    latestSubtitle: {
      fontSize: 11,
      marginTop: 3,
    },

    secondaryButton: {
      minHeight: 46,
      borderRadius: 13,
      borderWidth: 1,
      marginTop: 14,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },

    secondaryButtonText: {
      fontSize: 13,
      fontWeight: '800',
    },


    /* ========================================================
       DISCLAIMER
    ======================================================== */

    disclaimer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      borderRadius: 17,
      borderWidth: 1,
      padding: 13,
      marginTop: 2,
    },

    disclaimerText: {
      flex: 1,
      fontSize: 11,
      lineHeight: 17,
      marginLeft: 8,
    },


    /* ========================================================
       EMPTY STATE
    ======================================================== */

    emptyCard: {
      alignItems: 'center',
      borderRadius: 24,
      borderWidth: 1,
      paddingHorizontal: 22,
      paddingTop: 31,
      paddingBottom: 28,
      marginTop: 4,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 8,
      },
      shadowOpacity: 0.05,
      shadowRadius: 18,
      elevation: 2,
    },

    emptyGlow: {
      width: 92,
      height: 92,
      borderRadius: 30,
      borderWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 21,
    },

    emptyIcon: {
      width: 70,
      height: 70,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },

    emptyTitle: {
      fontSize: 21,
      fontWeight: '900',
      letterSpacing: -0.4,
      textAlign: 'center',
    },

    emptyText: {
      fontSize: 13,
      lineHeight: 20,
      textAlign: 'center',
      maxWidth: 315,
      marginTop: 8,
    },

    emptyFacts: {
      width: '100%',
      marginTop: 22,
      marginBottom: 23,
    },

    emptyFact: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 11,
    },

    emptyFactIcon: {
      width: 32,
      height: 32,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 9,
    },

    emptyFactText: {
      flex: 1,
      fontSize: 12,
      lineHeight: 17,
    },

    primaryButton: {
      width: '100%',
      minHeight: 51,
      borderRadius: 15,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },

    primaryButtonText: {
      color: '#06110F',
      fontSize: 14,
      fontWeight: '900',
      marginHorizontal: 8,
    },

    emptyFootnote: {
      fontSize: 10,
      lineHeight: 15,
      textAlign: 'center',
      maxWidth: 300,
      marginTop: 13,
    },
  });