import React, {
  memo,
  useContext,
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
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  useColorScheme,
  useWindowDimensions,
  Animated,
  RefreshControl,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AuthContext } from '../context/AuthContext';
import { getDashboard } from '../services/api';

/* ============================================================
   COLORS & THEME
============================================================ */

const BRAND = {
  cyan: '#00D4C5',
  blue: '#2166F3',
  red: '#EF1023',
  yellow: '#F59E0B',
  green: '#10B981',
  purple: '#7C27F5',
};

const HOME_CACHE_TTL_MS = 30 * 1000;
const HEALTH_TIP_ROTATION_MS = 35 * 1000;

const getTheme = isDark => ({
  background: isDark ? '#0A0F1A' : '#F8F9FB',
  card: isDark ? '#141C29' : '#FFFFFF',
  border: isDark ? '#222E40' : '#E2E8F0',
  textPrimary: isDark ? '#FFFFFF' : '#111827',
  textSecondary: isDark ? '#8897AE' : '#64748B',
  cyanAccent: BRAND.cyan,
  blueAccent: BRAND.blue,
  urgentBg: isDark ? '#2C1518' : '#FEE2E2',
  warningBg: isDark ? '#2B2313' : '#FEF3C7',
  warningText: isDark ? '#FBBF24' : '#B45309',
  successBg: isDark ? '#0F2930' : '#E6FBFA',
  mutedBg: isDark ? '#111827' : '#F1F5F9',
});

const TRIAGE_CONFIG = {
  EMERGENCY: {
    color: BRAND.red,
    bgKey: 'urgentBg',
    label: 'Emergency',
    icon: 'warning-outline',
  },
  URGENT: {
    color: BRAND.yellow,
    bgKey: 'warningBg',
    label: 'Urgent',
    icon: 'time-outline',
  },
  WARNING: {
    color: BRAND.yellow,
    bgKey: 'warningBg',
    label: 'Warning',
    icon: 'alert-circle-outline',
  },
  ROUTINE: {
    color: BRAND.green,
    bgKey: 'successBg',
    label: 'Routine',
    icon: 'checkmark-circle-outline',
  },
};

const QUICK_ACTIONS = [
  {
    id: 'symptoms',
    label: 'Check Symptoms',
    description: 'AI-powered health triage',
    icon: 'shield-checkmark-outline',
    hasAI: true,
    route: 'SymptomChecker',
  },
  {
    id: 'doctor',
    label: 'Find a Doctor',
    description: 'Find care near you',
    icon: 'search-outline',
    route: 'Doctors',
  },
  {
    id: 'records',
    label: 'My Records',
    description: 'View your health history',
    icon: 'folder-outline',
    route: 'AllRecords',
  },
  {
    id: 'meds',
    label: 'Medications',
    description: 'Manage your medicines',
    icon: 'medical-outline',
    route: 'Medication',
  },
];

/* ============================================================
   SMALL HELPERS
============================================================ */

const clamp = (value, min, max) =>
  Math.min(Math.max(value, min), max);

const humanizeStatus = value => {
  const text = String(value || 'Pending')
    .replace(/_/g, ' ')
    .trim();

  if (!text) return 'Pending';

  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

const getRecordKey = (record, index) =>
  record?.id ||
  record?.audit_id ||
  record?.created_at ||
  record?.createdAt ||
  `record-${index}`;

const getTriage = record => {
  const level = String(
    record?.triage_level ||
      record?.severity ||
      'ROUTINE',
  ).toUpperCase();

  return (
    TRIAGE_CONFIG[level] ||
    TRIAGE_CONFIG.ROUTINE
  );
};

const getSymptomName = record => {
  const symptoms = record?.symptoms;

  if (typeof symptoms === 'string' && symptoms.trim()) {
    return symptoms.trim();
  }

  if (Array.isArray(symptoms) && symptoms.length) {
    return symptoms
      .map(item => String(item).trim())
      .filter(Boolean)
      .join(', ');
  }

  if (symptoms && typeof symptoms === 'object') {
    const value =
      symptoms.text ||
      symptoms.normalised ||
      symptoms.normalized;

    if (value) return String(value).trim();
  }

  return (
    record?.symptom_name ||
    'Symptoms recorded'
  );
};

const getRecordSummary = record => {
  if (record?.condition) {
    return String(record.condition).trim();
  }

  const diseases = record?.top_diseases;

  if (Array.isArray(diseases) && diseases.length) {
    const first = diseases[0];

    if (typeof first === 'string') {
      return first;
    }

    if (first && typeof first === 'object') {
      return (
        first.condition ||
        first.disease ||
        first.name ||
        'CareSense analysis'
      );
    }
  }

  const summary = String(record?.ai_summary || '').trim();

  if (summary) {
    const firstSentence = summary
      .split(/[.!?]/)[0]
      .trim();

    if (firstSentence) return firstSentence;
  }

  return 'CareSense analysis';
};

const formatRecordDate = value => {
  if (!value) return 'Recently';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Recently';
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const relativeUpdatedTime = value => {
  if (!value) return 'Not available';

  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return 'Not available';
  }

  const diff = Math.max(0, Date.now() - timestamp);

  if (diff < 60 * 1000) {
    return 'Updated just now';
  }

  if (diff < 60 * 60 * 1000) {
    return `Updated ${Math.floor(diff / (60 * 1000))}m ago`;
  }

  if (diff < 24 * 60 * 60 * 1000) {
    return `Updated ${Math.floor(diff / (60 * 60 * 1000))}h ago`;
  }

  return `Updated ${Math.floor(diff / (24 * 60 * 60 * 1000))}d ago`;
};

/* ============================================================
   MEMOIZED ACTION CARD
============================================================ */

const ActionCard = memo(
  ({ action, theme, width, onPress }) => {
    const isAI = action.hasAI === true;

    return (
      <TouchableOpacity
        activeOpacity={0.86}
        onPress={() => onPress(action.route)}
        accessibilityRole="button"
        accessibilityLabel={action.label}
        accessibilityHint={action.description}
        style={[
          styles.actionCard,
          {
            width,
            backgroundColor: isAI
              ? theme.background === '#0A0F1A'
                ? '#0F2930'
                : '#E6FBFA'
              : theme.card,
            borderColor: isAI
              ? theme.cyanAccent
              : theme.border,
          },
        ]}
      >
        <View style={styles.actionTopRow}>
          <View
            style={[
              styles.actionIconCircle,
              {
                backgroundColor: isAI
                  ? theme.cyanAccent
                  : theme.mutedBg,
              },
            ]}
          >
            <Ionicons
              name={action.icon}
              size={23}
              color={
                isAI
                  ? '#0A0F1A'
                  : theme.cyanAccent
              }
            />
          </View>

          <View style={styles.actionRightContent}>
            {isAI ? (
              <View
                style={[
                  styles.aiBadge,
                  {
                    backgroundColor:
                      theme.cyanAccent,
                  },
                ]}
              >
                <Ionicons
                  name="sparkles-outline"
                  size={11}
                  color="#0A0F1A"
                />

                <Text style={styles.aiBadgeText}>
                  AI
                </Text>
              </View>
            ) : null}

            <Ionicons
              name="chevron-forward"
              size={18}
              color={
                isAI
                  ? theme.cyanAccent
                  : theme.textSecondary
              }
            />
          </View>
        </View>

        <View style={styles.actionCopy}>
          <Text
            style={[
              styles.actionText,
              {
                color: theme.textPrimary,
              },
            ]}
            numberOfLines={1}
          >
            {action.label}
          </Text>

          <Text
            style={[
              styles.actionDescription,
              {
                color: theme.textSecondary,
              },
            ]}
            numberOfLines={2}
          >
            {action.description}
          </Text>
        </View>
      </TouchableOpacity>
    );
  },
);

/* ============================================================
   HOME SCREEN
============================================================ */

export default function HomeScreen({ navigation }) {
  const {
    user,
    profilePhoto,
    fullName,
  } = useContext(AuthContext) || {};

  const isDark = useColorScheme() === 'dark';
  const { width } = useWindowDimensions();
  const theme = useMemo(
    () => getTheme(isDark),
    [isDark],
  );

  const [avatarImageFailed, setAvatarImageFailed] =
    useState(false);

  const fadeAnim = useRef(
    new Animated.Value(0),
  ).current;

  const slideAnim = useRef(
    new Animated.Value(20),
  ).current;

  const lastDashboardFetchRef =
    useRef(0);

  const dashboardRequestRef =
    useRef(null);

  const seenHealthTipIdsRef =
    useRef(new Set());

  const healthTipTimerRef =
    useRef(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [dashboardError, setDashboardError] =
    useState('');

  const [recentRecords, setRecentRecords] =
    useState([]);

  const [healthStats, setHealthStats] =
    useState([]);

  const [todaysSchedule, setTodaysSchedule] =
    useState([]);

  const [upcomingConsult, setUpcomingConsult] =
    useState(null);

  const [careSenseScore, setCareSenseScore] =
    useState(null);

  const [scoreLabel, setScoreLabel] =
    useState('Not enough data');

  const [scoreDescription, setScoreDescription] =
    useState('');

  const [scoreBasisCount, setScoreBasisCount] =
    useState(0);

  const [scoreUpdatedAt, setScoreUpdatedAt] =
    useState(null);

  const [healthTips, setHealthTips] =
    useState([]);

  const [activeHealthTip, setActiveHealthTip] =
    useState(null);

  const [profileSnapshot, setProfileSnapshot] =
    useState(null);

  const [currentMedications, setCurrentMedications] =
    useState([]);

  const actionCardWidth =
    (width - 40 - 12) / 2;

  const displayName =
    fullName?.trim() ||
    user?.displayName ||
    user?.name ||
    user?.email?.split('@')[0] ||
    'User';

  const avatarLetter =
    (
      displayName
        ?.trim()
        ?.charAt(0) || 'U'
    ).toUpperCase();

  const [today, setToday] = useState(() => new Date());

  useEffect(() => {
    const updateToday = () => setToday(new Date());

    updateToday();

    const timer = setInterval(
      updateToday,
      60 * 1000,
    );

    return () => clearInterval(timer);
  }, []);

  const todayLabel = useMemo(
    () =>
      today.toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    [today],
  );

  useEffect(() => {
    setAvatarImageFailed(false);
  }, [profilePhoto]);

  const selectNextHealthTip = useCallback(
    tips => {
      if (!Array.isArray(tips) || tips.length === 0) {
        setActiveHealthTip(null);
        return;
      }

      let nextTip = tips.find(
        tip =>
          tip?.id &&
          !seenHealthTipIdsRef.current.has(
            tip.id,
          ),
      );

      if (!nextTip) {
        seenHealthTipIdsRef.current.clear();

        nextTip = tips[0];
      }

      if (nextTip?.id) {
        seenHealthTipIdsRef.current.add(
          nextTip.id,
        );
      }

      setActiveHealthTip(nextTip || null);
    },
    [],
  );

  useEffect(() => {
    if (!healthTips.length) {
      return undefined;
    }

    healthTipTimerRef.current =
      setInterval(() => {
        selectNextHealthTip(healthTips);
      }, HEALTH_TIP_ROTATION_MS);

    return () => {
      if (healthTipTimerRef.current) {
        clearInterval(
          healthTipTimerRef.current,
        );
        healthTipTimerRef.current = null;
      }
    };
  }, [healthTips, selectNextHealthTip]);

  const fetchDashboardData = useCallback(
    async (isPullToRefresh = false) => {
      const now = Date.now();

      if (
        !isPullToRefresh &&
        lastDashboardFetchRef.current > 0 &&
        now -
          lastDashboardFetchRef.current <
          HOME_CACHE_TTL_MS
      ) {
        return;
      }

      if (dashboardRequestRef.current) {
        return dashboardRequestRef.current;
      }

      const request =
        (async () => {
          if (!isPullToRefresh) {
            setLoading(true);
          }

          try {
            setDashboardError('');

            const data =
              await getDashboard(30, {
                force: isPullToRefresh,
              });

            const records =
              Array.isArray(
                data?.recent_records,
              )
                ? data.recent_records
                : [];

            setRecentRecords(
              records.slice(0, 3),
            );

            setHealthStats(
              Array.isArray(
                data?.health_stats ||
                  data?.healthStats,
              )
                ? data.health_stats ||
                    data.healthStats
                : [],
            );

            setTodaysSchedule(
              Array.isArray(
                data?.today_schedule ||
                  data?.schedule,
              )
                ? data.today_schedule ||
                    data.schedule
                : [],
            );

            setUpcomingConsult(
              data?.upcoming_consult ||
                data?.upcomingConsult ||
                null,
            );

            setCareSenseScore(
              typeof data?.score === 'number'
                ? data.score
                : null,
            );

            setScoreLabel(
              data?.score_label ||
                'Not enough data',
            );

            setScoreDescription(
              data?.score_description || '',
            );

            setScoreBasisCount(
              Number(
                data?.score_basis_count || 0,
              ),
            );

            setScoreUpdatedAt(
              data?.score_updated_at ||
                null,
            );

            const tips =
              Array.isArray(data?.health_tips)
                ? data.health_tips
                : [];

            setHealthTips(tips);

            selectNextHealthTip(tips);

            setProfileSnapshot(
              data?.profile_snapshot ||
                null,
            );

            setCurrentMedications(
              Array.isArray(
                data?.current_medications,
              )
                ? data.current_medications
                : [],
            );

            lastDashboardFetchRef.current =
              Date.now();
          } catch (error) {
            if (__DEV__) {
              console.warn(
                'Dashboard Fetch Error:',
                error?.message ||
                  'Request failed.',
              );
            }

            setDashboardError(
              'Unable to refresh your health dashboard right now.',
            );
          } finally {
            setLoading(false);
            setRefreshing(false);
          }
        })();

      dashboardRequestRef.current =
        request;

      try {
        await request;
      } finally {
        dashboardRequestRef.current =
          null;
      }
    },
    [selectNextHealthTip],
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);

    void fetchDashboardData(true);
  }, [fetchDashboardData]);

  useFocusEffect(
    useCallback(() => {
      void fetchDashboardData();

      fadeAnim.setValue(0);
      slideAnim.setValue(15);

      const animation =
        Animated.parallel([
          Animated.timing(
            fadeAnim,
            {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            },
          ),
          Animated.timing(
            slideAnim,
            {
              toValue: 0,
              duration: 450,
              useNativeDriver: true,
            },
          ),
        ]);

      animation.start();

      return () => animation.stop();
    }, [
      fetchDashboardData,
      fadeAnim,
      slideAnim,
    ]),
  );

  const openAction = useCallback(
    route => navigation.navigate(route),
    [navigation],
  );

  const openRecord = useCallback(
    record => {
      navigation.navigate(
        'HealthRecordDetail',
        {
          result: record,
        },
      );
    },
    [navigation],
  );

  const profileCompletion =
    Number(
      profileSnapshot?.completion_percent ||
        0,
    );

  const hasCurrentMedications =
    currentMedications.length > 0;

  return (
    <SafeAreaView
      edges={['top']}
      style={[
        styles.safeArea,
        {
          backgroundColor:
            theme.background,
        },
      ]}
    >
      <Animated.ScrollView
        style={[
          styles.container,
          {
            opacity: fadeAnim,
            transform: [
              {
                translateY: slideAnim,
              },
            ],
          },
        ]}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: 130,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={
              theme.cyanAccent
            }
          />
        }
      >
        {/* ================= HEADER ================= */}
        <View style={styles.header}>
          <View
            style={
              styles.headerTextContainer
            }
          >
            <Text
              style={[
                styles.greeting,
                {
                  color:
                    theme.textPrimary,
                },
              ]}
              numberOfLines={1}
            >
              Hello, {displayName} 👋
            </Text>

            <Text
              style={[
                styles.subGreeting,
                {
                  color:
                    theme.textSecondary,
                },
              ]}
            >
              Your CareSense health dashboard
            </Text>

            <View
              style={[
                styles.todayDateRow,
                {
                  backgroundColor:
                    theme.mutedBg,
                  borderColor:
                    theme.border,
                },
              ]}
            >
              <Ionicons
                name="calendar-outline"
                size={14}
                color={theme.cyanAccent}
              />

              <Text
                style={[
                  styles.todayDateText,
                  {
                    color:
                      theme.textSecondary,
                  },
                ]}
                numberOfLines={1}
              >
                {todayLabel}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.avatarCircle,
              {
                backgroundColor:
                  theme.card,
                borderColor:
                  theme.border,
              },
            ]}
          >
            {profilePhoto &&
            !avatarImageFailed ? (
              <Image
                source={{
                  uri: profilePhoto,
                }}
                style={
                  styles.avatarImage
                }
                onError={() =>
                  setAvatarImageFailed(
                    true,
                  )
                }
              />
            ) : (
              <Text
                style={[
                  styles.avatarText,
                  {
                    color:
                      theme.cyanAccent,
                  },
                ]}
              >
                {avatarLetter}
              </Text>
            )}
          </View>
        </View>

        {/* ================= ERROR ================= */}
        {dashboardError ? (
          <View
            style={[
              styles.inlineNotice,
              {
                backgroundColor:
                  theme.card,
                borderColor:
                  theme.border,
              },
            ]}
          >
            <Ionicons
              name="cloud-offline-outline"
              size={20}
              color={theme.warningText}
            />

            <View
              style={
                styles.inlineNoticeText
              }
            >
              <Text
                style={[
                  styles.inlineNoticeTitle,
                  {
                    color:
                      theme.textPrimary,
                  },
                ]}
              >
                Dashboard refresh paused
              </Text>

              <Text
                style={[
                  styles.inlineNoticeBody,
                  {
                    color:
                      theme.textSecondary,
                  },
                ]}
              >
                Pull down to try again.
              </Text>
            </View>
          </View>
        ) : null}

        {/* ================= CARESENSE AI SCORE ================= */}
        <View
          style={[
            styles.careSenseCard,
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
              styles.scoreCircle,
              {
                borderColor:
                  theme.cyanAccent,
              },
            ]}
          >
            <Text
              style={[
                styles.scoreText,
                {
                  color:
                    theme.textPrimary,
                },
              ]}
            >
              {careSenseScore !== null
                ? careSenseScore
                : '—'}
            </Text>
          </View>

          <View
            style={
              styles.careSenseInfo
            }
          >
            <View
              style={
                styles.scoreTitleRow
              }
            >
              <Text
                style={[
                  styles.careSenseTitle,
                  {
                    color:
                      theme.textPrimary,
                  },
                ]}
              >
                CareSense AI Score
              </Text>

              <View
                style={[
                  styles.infoPill,
                  {
                    backgroundColor:
                      theme.mutedBg,
                  },
                ]}
              >
                <Ionicons
                  name="information-circle-outline"
                  size={14}
                  color={
                    theme.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.infoPillText,
                    {
                      color:
                        theme.textSecondary,
                    },
                  ]}
                >
                  Informational
                </Text>
              </View>
            </View>

            <Text
              style={[
                styles.scoreLabel,
                {
                  color:
                    theme.cyanAccent,
                },
              ]}
            >
              {scoreLabel}
            </Text>

            <Text
              style={[
                styles.careSenseDesc,
                {
                  color:
                    theme.textSecondary,
                },
              ]}
            >
              {scoreDescription ||
                'A score will appear after you have enough recent CareSense record data.'}
            </Text>

            <Text
              style={[
                styles.updatedText,
                {
                  color:
                    theme.textSecondary,
                },
              ]}
            >
              {scoreBasisCount > 0
                ? `${scoreBasisCount} recent check${
                    scoreBasisCount === 1
                      ? ''
                      : 's'
                  } • ${relativeUpdatedTime(
                    scoreUpdatedAt,
                  )}`
                : relativeUpdatedTime(
                    scoreUpdatedAt,
                  )}
            </Text>
          </View>
        </View>

        {/* ================= HEALTH SNAPSHOT ================= */}
        {healthStats.length > 0 && (
          <>
            <View
              style={
                styles.sectionHeaderRow
              }
            >
              <Text
                style={[
                  styles.sectionTitle,
                  {
                    color:
                      theme.textPrimary,
                    marginBottom: 0,
                  },
                ]}
              >
                Health Snapshot
              </Text>
            </View>

            <View
              style={styles.statsGrid}
            >
              {healthStats.map(
                (stat, index) => (
                  <View
                    key={
                      stat.key ||
                      `${stat.label}-${index}`
                    }
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
                    <Text
                      style={[
                        styles.statValue,
                        {
                          color:
                            theme.cyanAccent,
                        },
                      ]}
                    >
                      {stat.value ?? '—'}
                    </Text>

                    <Text
                      style={[
                        styles.statLabel,
                        {
                          color:
                            theme.textPrimary,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {stat.label}
                    </Text>

                    <Text
                      style={[
                        styles.statStatus,
                        {
                          color:
                            theme.textSecondary,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {stat.status}
                    </Text>
                  </View>
                ),
              )}
            </View>
          </>
        )}

        {/* ================= PROFILE COMPLETION ================= */}
        {profileSnapshot &&
        profileCompletion < 100 ? (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() =>
              openAction('Settings')
            }
            style={[
              styles.profileCard,
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
                styles.profileIcon,
                {
                  backgroundColor:
                    theme.successBg,
                },
              ]}
            >
              <Ionicons
                name="person-outline"
                size={21}
                color={
                  theme.cyanAccent
                }
              />
            </View>

            <View
              style={
                styles.profileCardBody
              }
            >
              <View
                style={
                  styles.profileTitleRow
                }
              >
                <Text
                  style={[
                    styles.profileTitle,
                    {
                      color:
                        theme.textPrimary,
                    },
                  ]}
                >
                  Complete your health profile
                </Text>

                <Text
                  style={[
                    styles.profilePercent,
                    {
                      color:
                        theme.cyanAccent,
                    },
                  ]}
                >
                  {profileCompletion}%
                </Text>
              </View>

              <View
                style={[
                  styles.progressTrack,
                  {
                    backgroundColor:
                      theme.mutedBg,
                  },
                ]}
              >
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(
                        profileCompletion,
                        100,
                      )}%`,
                      backgroundColor:
                        theme.cyanAccent,
                    },
                  ]}
                />
              </View>

              <Text
                style={[
                  styles.profileHint,
                  {
                    color:
                      theme.textSecondary,
                  },
                ]}
              >
                A more complete profile gives CareSense better context for future checks.
              </Text>
            </View>
          </TouchableOpacity>
        ) : null}

        {/* ================= QUICK ACTIONS ================= */}
        <Text
          style={[
            styles.sectionTitle,
            {
              color:
                theme.textPrimary,
            },
          ]}
        >
          Quick Actions
        </Text>

        <View style={styles.actionGrid}>
          {QUICK_ACTIONS.map(action => (
            <ActionCard
              key={action.id}
              action={action}
              theme={theme}
              width={actionCardWidth}
              onPress={openAction}
            />
          ))}
        </View>

        {/* ================= HEALTH TIP ================= */}
        <View
          style={
            styles.sectionHeaderRow
          }
        >
          <View
            style={
              styles.healthTipTitleRow
            }
          >
            <Ionicons
              name="bulb-outline"
              size={20}
              color={
                theme.cyanAccent
              }
            />

            <Text
              style={[
                styles.sectionTitle,
                {
                  color:
                    theme.textPrimary,
                  marginBottom: 0,
                  marginLeft: 8,
                },
              ]}
            >
              Health Tip
            </Text>
          </View>

          {healthTips.length > 1 ? (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() =>
                selectNextHealthTip(
                  healthTips,
                )
              }
            >
              <Text
                style={[
                  styles.seeTimelineText,
                  {
                    color:
                      theme.cyanAccent,
                  },
                ]}
              >
                Next
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View
          style={[
            styles.healthTipCard,
            {
              backgroundColor:
                theme.card,
              borderColor:
                theme.border,
            },
          ]}
        >
          {activeHealthTip ? (
            <>
              <Text
                style={[
                  styles.tipText,
                  {
                    color:
                      theme.textPrimary,
                  },
                ]}
              >
                {activeHealthTip.text}
              </Text>

              <View
                style={
                  styles.tipFooter
                }
              >
                <Ionicons
                  name="sparkles-outline"
                  size={14}
                  color={
                    theme.cyanAccent
                  }
                />
                <Text
                  style={[
                    styles.tipSource,
                    {
                      color:
                        theme.textSecondary,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {activeHealthTip.source ||
                    'CareSense'}
                </Text>
              </View>
            </>
          ) : (
            <Text
              style={[
                styles.tipText,
                {
                  color:
                    theme.textSecondary,
                },
              ]}
            >
              Care tips will appear as your dashboard gathers more real activity.
            </Text>
          )}
        </View>

        {/* ================= UPCOMING CONSULT ================= */}
        {upcomingConsult && (
          <>
            <Text
              style={[
                styles.sectionTitle,
                {
                  color:
                    theme.textPrimary,
                  marginTop: 12,
                },
              ]}
            >
              Upcoming Consult
            </Text>

            <View
              style={[
                styles.consultCard,
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
                  styles.consultTop
                }
              >
                <View
                  style={[
                    styles.doctorAvatarPlaceholder,
                    {
                      backgroundColor:
                        theme.successBg,
                    },
                  ]}
                >
                  <Ionicons
                    name="person-outline"
                    size={23}
                    color={
                      theme.cyanAccent
                    }
                  />
                </View>

                <View
                  style={
                    styles.doctorInfo
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
                  >
                    {upcomingConsult.doctor}
                  </Text>

                  <Text
                    style={[
                      styles.doctorSpecialty,
                      {
                        color:
                          theme.textSecondary,
                      },
                    ]}
                  >
                    {upcomingConsult.specialty}
                  </Text>

                  <Text
                    style={[
                      styles.consultTime,
                      {
                        color:
                          theme.cyanAccent,
                      },
                    ]}
                  >
                    {upcomingConsult.date} •{' '}
                    {upcomingConsult.time}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.consultStatus,
                  {
                    backgroundColor:
                      theme.mutedBg,
                  },
                ]}
              >
                <Ionicons
                  name="calendar-outline"
                  size={15}
                  color={
                    theme.textSecondary
                  }
                />

                <Text
                  style={[
                    styles.consultStatusText,
                    {
                      color:
                        theme.textSecondary,
                    },
                  ]}
                >
                  {humanizeStatus(
                    upcomingConsult.status,
                  )}
                </Text>
              </View>
            </View>
          </>
        )}

        {/* ================= TODAY'S SCHEDULE ================= */}
        <View
          style={[
            styles.sectionHeaderRow,
            { marginTop: 8 },
          ]}
        >
          <Text
            style={[
              styles.sectionTitle,
              {
                color:
                  theme.textPrimary,
                marginBottom: 0,
              },
            ]}
          >
            Today's Schedule
          </Text>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() =>
              openAction('Medication')
            }
          >
            <Text
              style={[
                styles.seeTimelineText,
                {
                  color:
                    theme.cyanAccent,
                },
              ]}
            >
              View care
            </Text>
          </TouchableOpacity>
        </View>

        {todaysSchedule.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.scheduleScroll
            }
          >
            {todaysSchedule.map(
              (item, index) => {
                const isAppointment =
                  item.kind ===
                  'appointment';

                return (
                  <View
                    key={
                      item.id ||
                      `${item.name}-${index}`
                    }
                    style={[
                      styles.scheduleCard,
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
                        styles.scheduleIconRow
                      }
                    >
                      <View
                        style={[
                          styles.scheduleIcon,
                          {
                            backgroundColor:
                              isAppointment
                                ? theme.successBg
                                : theme.mutedBg,
                          },
                        ]}
                      >
                        <Ionicons
                          name={
                            isAppointment
                              ? 'calendar-outline'
                              : 'medical-outline'
                          }
                          size={18}
                          color={
                            theme.cyanAccent
                          }
                        />
                      </View>

                      <Text
                        style={[
                          styles.scheduleKind,
                          {
                            color:
                              theme.textSecondary,
                          },
                        ]}
                      >
                        {isAppointment
                          ? 'Appointment'
                          : 'Medication'}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.medName,
                        {
                          color:
                            theme.textPrimary,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>

                    <Text
                      style={[
                        styles.medDosage,
                        {
                          color:
                            theme.textSecondary,
                        },
                      ]}
                      numberOfLines={2}
                    >
                      {item.subtitle ||
                        'Scheduled care'}
                    </Text>

                    <Text
                      style={[
                        styles.scheduleTime,
                        {
                          color:
                            theme.cyanAccent,
                        },
                      ]}
                    >
                      {item.time ||
                        'Time not set'}
                    </Text>

                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            theme.mutedBg,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color:
                              theme.textSecondary,
                          },
                        ]}
                      >
                        {humanizeStatus(
                          item.status,
                        )}
                      </Text>
                    </View>
                  </View>
                );
              },
            )}
          </ScrollView>
        ) : (
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
            <Ionicons
              name="calendar-clear-outline"
              size={31}
              color={
                theme.textSecondary
              }
            />

            <Text
              style={[
                styles.emptyTitle,
                {
                  color:
                    theme.textPrimary,
                },
              ]}
            >
              Nothing scheduled today
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
              CareSense only shows appointments or medication reminders that are actually stored in your account.
            </Text>
          </View>
        )}

        {/* ================= CURRENT MEDICATIONS ================= */}
        {hasCurrentMedications ? (
          <>
            <View
              style={[
                styles.sectionHeaderRow,
                { marginTop: 8 },
              ]}
            >
              <Text
                style={[
                  styles.sectionTitle,
                  {
                    color:
                      theme.textPrimary,
                    marginBottom: 0,
                  },
                ]}
              >
                Current Medications
              </Text>

              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() =>
                  openAction('Medication')
                }
              >
                <Text
                  style={[
                    styles.seeTimelineText,
                    {
                      color:
                        theme.cyanAccent,
                    },
                  ]}
                >
                  Manage
                </Text>
              </TouchableOpacity>
            </View>

            <View
              style={
                styles.currentMedsRow
              }
            >
              {currentMedications
                .slice(0, 5)
                .map(
                  (medication, index) => {
                    const name =
                      typeof medication ===
                      'string'
                        ? medication
                        : medication?.name ||
                          medication?.medicine ||
                          medication?.medication ||
                          'Medication';

                    return (
                      <View
                        key={`${name}-${index}`}
                        style={[
                          styles.medChip,
                          {
                            backgroundColor:
                              theme.card,
                            borderColor:
                              theme.border,
                          },
                        ]}
                      >
                        <Ionicons
                          name="medical-outline"
                          size={14}
                          color={
                            theme.cyanAccent
                          }
                        />

                        <Text
                          style={[
                            styles.medChipText,
                            {
                              color:
                                theme.textPrimary,
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {name}
                        </Text>
                      </View>
                    );
                  },
                )}
            </View>
          </>
        ) : null}

        {/* ================= RECENT RECORDS ================= */}
        <View
          style={[
            styles.sectionHeaderRow,
            { marginTop: 12 },
          ]}
        >
          <Text
            style={[
              styles.sectionTitle,
              {
                color:
                  theme.textPrimary,
                marginBottom: 0,
              },
            ]}
          >
            Recent Records
          </Text>

          {recentRecords.length > 0 && (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() =>
                openAction('AllRecords')
              }
            >
              <Text
                style={[
                  styles.seeTimelineText,
                  {
                    color:
                      theme.cyanAccent,
                  },
                ]}
              >
                See all
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View
          style={
            styles.logsContainer
          }
        >
          {loading ? (
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
              <ActivityIndicator
                size="small"
                color={
                  theme.cyanAccent
                }
              />

              <Text
                style={[
                  styles.emptyText,
                  {
                    color:
                      theme.textSecondary,
                  },
                ]}
              >
                Loading your records...
              </Text>
            </View>
          ) : recentRecords.length ===
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
              <Ionicons
                name="pulse-outline"
                size={36}
                color={
                  theme.textSecondary
                }
              />

              <Text
                style={[
                  styles.emptyTitle,
                  {
                    color:
                      theme.textPrimary,
                  },
                ]}
              >
                No recent records
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
                Your latest CareSense checks will appear here.
              </Text>

              <TouchableOpacity
                style={[
                  styles.startButton,
                  {
                    backgroundColor:
                      theme.cyanAccent,
                  },
                ]}
                activeOpacity={0.8}
                onPress={() =>
                  openAction(
                    'SymptomChecker',
                  )
                }
              >
                <Text
                  style={
                    styles.startButtonText
                  }
                >
                  Check Symptoms
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            recentRecords
              .slice(0, 3)
              .map(
                (record, index) => {
                  const tri =
                    getTriage(record);

                  const background =
                    theme[
                      tri.bgKey
                    ] ||
                    theme.mutedBg;

                  const symptomName =
                    getSymptomName(
                      record,
                    );

                  const summary =
                    getRecordSummary(
                      record,
                    );

                  return (
                    <TouchableOpacity
                      key={getRecordKey(
                        record,
                        index,
                      )}
                      activeOpacity={0.84}
                      onPress={() =>
                        openRecord(
                          record,
                        )
                      }
                      style={[
                        styles.logCard,
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
                          styles.recordAccent
                        }
                      >
                        <View
                          style={[
                            styles.logDot,
                            {
                              backgroundColor:
                                tri.color,
                            },
                          ]}
                        />
                      </View>

                      <View
                        style={
                          styles.recordBody
                        }
                      >
                        <View
                          style={
                            styles.recordTopRow
                          }
                        >
                          <View
                            style={
                              styles.recordTitleGroup
                            }
                          >
                            <Text
                              style={[
                                styles.logTitle,
                                {
                                  color:
                                    theme.textPrimary,
                                },
                              ]}
                              numberOfLines={
                                2
                              }
                            >
                              {symptomName}
                            </Text>

                            <Text
                              style={[
                                styles.recordSummary,
                                {
                                  color:
                                    theme.textSecondary,
                                },
                              ]}
                              numberOfLines={
                                1
                              }
                            >
                              {summary}
                            </Text>
                          </View>

                          <View
                            style={[
                              styles.severityBadge,
                              {
                                backgroundColor:
                                  background,
                              },
                            ]}
                          >
                            <Ionicons
                              name={
                                tri.icon
                              }
                              size={13}
                              color={
                                tri.color
                              }
                            />

                            <Text
                              style={[
                                styles.severityText,
                                {
                                  color:
                                    tri.color,
                                },
                              ]}
                            >
                              {tri.label}
                            </Text>
                          </View>
                        </View>

                        <View
                          style={
                            styles.recordFooter
                          }
                        >
                          <Ionicons
                            name="time-outline"
                            size={14}
                            color={
                              theme.textSecondary
                            }
                          />

                          <Text
                            style={[
                              styles.logTime,
                              {
                                color:
                                  theme.textSecondary,
                              },
                            ]}
                          >
                            {formatRecordDate(
                              record.created_at ||
                                record.createdAt,
                            )}
                          </Text>

                          <Ionicons
                            name="chevron-forward"
                            size={17}
                            color={
                              theme.textSecondary
                            }
                          />
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                },
              )
          )}
        </View>
      </Animated.ScrollView>
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

  container: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },

  headerTextContainer: {
    flex: 1,
    paddingRight: 12,
  },

  greeting: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 5,
  },

  subGreeting: {
    fontSize: 13,
    fontWeight: '500',
  },

  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
  },

  avatarImage: {
    width: '100%',
    height: '100%',
  },

  avatarText: {
    fontSize: 18,
    fontWeight: '800',
  },

  inlineNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },

  inlineNoticeText: {
    flex: 1,
    marginLeft: 10,
  },

  inlineNoticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },

  inlineNoticeBody: {
    fontSize: 12,
  },

  careSenseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 18,
  },

  scoreCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 6,
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [
      {
        rotate: '-45deg',
      },
    ],
  },

  scoreText: {
    fontSize: 24,
    fontWeight: '900',
    transform: [
      {
        rotate: '45deg',
      },
    ],
  },

  careSenseInfo: {
    flex: 1,
    marginLeft: 15,
  },

  scoreTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },

  careSenseTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
  },

  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
  },

  infoPillText: {
    fontSize: 9,
    fontWeight: '700',
  },

  scoreLabel: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 5,
  },

  careSenseDesc: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },

  updatedText: {
    fontSize: 10,
    marginTop: 5,
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 18,
  },

  statCard: {
    width: '48.5%',
    minHeight: 92,
    padding: 13,
    borderRadius: 15,
    borderWidth: 1,
    marginBottom: 10,
  },

  statValue: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 3,
  },

  statLabel: {
    fontSize: 12,
    fontWeight: '700',
  },

  statStatus: {
    fontSize: 10,
    marginTop: 4,
  },

  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },

  profileIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileCardBody: {
    flex: 1,
    marginLeft: 11,
  },

  profileTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },

  profileTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
  },

  profilePercent: {
    fontSize: 13,
    fontWeight: '900',
  },

  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 8,
  },

  progressFill: {
    height: '100%',
    borderRadius: 3,
  },

  profileHint: {
    fontSize: 10,
    lineHeight: 15,
    marginTop: 7,
  },

  todayDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 9,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 9,
    borderWidth: 1,
    maxWidth: '100%',
  },

  todayDateText: {
    fontSize: 11,
    fontWeight: '700',
    flexShrink: 1,
  },

  actionGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 12,
  marginBottom: 24,
  },

  actionCard: {
    minHeight: 142,
    padding: 15,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'space-between',
  },

  actionTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },

  actionIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  actionRightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  actionCopy: {
    marginTop: 13,
    paddingRight: 2,
  },

  actionText: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 19,
  },

  actionDescription: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },

  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },

  aiBadgeText: {
    color: '#0A0F1A',
    fontSize: 10,
    fontWeight: '900',
  },

  actionText: {
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
  },

  actionDescription: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },

  healthTipTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  healthTipCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },

  tipText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
  },

  tipFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },

  tipSource: {
    flex: 1,
    fontSize: 10,
  },

  seeTimelineText: {
    fontSize: 13,
    fontWeight: '800',
  },

  consultCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },

  consultTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  doctorInfo: {
    flex: 1,
    marginLeft: 12,
  },

  doctorAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },

  doctorName: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 3,
  },

  doctorSpecialty: {
    fontSize: 12,
  },

  consultTime: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 5,
  },

  consultStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9,
    marginTop: 13,
  },

  consultStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },

  scheduleScroll: {
    paddingBottom: 20,
    gap: 12,
  },

  scheduleCard: {
    width: 165,
    minHeight: 172,
    padding: 14,
    borderRadius: 15,
    borderWidth: 1,
  },

  scheduleIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  scheduleIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scheduleKind: {
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 8,
  },

  medName: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 5,
  },

  medDosage: {
    fontSize: 11,
    lineHeight: 16,
    minHeight: 32,
  },

  scheduleTime: {
    fontSize: 15,
    fontWeight: '900',
    marginTop: 9,
    marginBottom: 9,
  },

  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 7,
  },

  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },

  currentMedsRow: {
    gap: 8,
    marginBottom: 18,
  },

  medChip: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 7,
  },

  medChipText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
  },

  logsContainer: {
    gap: 10,
  },

  logCard: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    minHeight: 104,
  },

  recordAccent: {
    width: 14,
    alignItems: 'center',
    paddingTop: 3,
  },

  logDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  recordBody: {
    flex: 1,
    marginLeft: 8,
  },

  recordTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },

  recordTitleGroup: {
    flex: 1,
    minWidth: 0,
  },

  logTitle: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 19,
  },

  recordSummary: {
    fontSize: 11,
    marginTop: 3,
  },

  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },

  severityText: {
    fontSize: 10,
    fontWeight: '900',
  },

  recordFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 13,
    gap: 6,
  },

  logTime: {
    flex: 1,
    fontSize: 10,
  },

  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 28,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 22,
  },

  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 10,
  },

  emptyText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 7,
  },

  startButton: {
    minWidth: 150,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 10,
    marginTop: 14,
  },

  startButtonText: {
    color: '#0A0F1A',
    fontSize: 13,
    fontWeight: '900',
  },
});