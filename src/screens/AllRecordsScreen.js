import React, {
  memo,
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
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
  useWindowDimensions,
} from 'react-native';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  useFocusEffect,
} from '@react-navigation/native';

import Ionicons from '@expo/vector-icons/Ionicons';

import {
  getRecords,
  deleteRecord,
} from '../services/api';

import {
  AuthContext,
} from '../context/AuthContext';


/* ============================================================
   CARESENSE BRAND / THEME

   Matches the Home screen theme:
   Dark:
   #0A0F1A
   #141C29
   #222E40

   Light:
   #F8F9FB
   #FFFFFF
   #E2E8F0

   Accent:
   #00D4C5
============================================================ */

const BRAND = {
  cyan: '#00D4C5',
  cyanDark: '#00B3A6',

  red: '#EF1023',
  yellow: '#F59E0B',
  green: '#10B981',
};


const getTheme = isDark => ({
  background: isDark
    ? '#0A0F1A'
    : '#F8F9FB',

  card: isDark
    ? '#141C29'
    : '#FFFFFF',

  border: isDark
    ? '#222E40'
    : '#E2E8F0',

  textPrimary: isDark
    ? '#FFFFFF'
    : '#111827',

  textSecondary: isDark
    ? '#8897AE'
    : '#64748B',

  cyanAccent: BRAND.cyan,

  emergencyBg: isDark
    ? '#32161B'
    : '#FEE2E2',

  emergencyText: isDark
    ? '#F87171'
    : '#DC2626',

  warningBg: isDark
    ? '#302713'
    : '#FEF3C7',

  warningText: isDark
    ? '#FBBF24'
    : '#D97706',

  routineBg: isDark
    ? '#102A25'
    : '#DFF8F1',

  routineText: isDark
    ? '#34D399'
    : '#059669',

  unknownBg: isDark
    ? '#17202D'
    : '#F1F5F9',

  unknownText: isDark
    ? '#A7B3C7'
    : '#64748B',

  mutedSurface: isDark
    ? '#101823'
    : '#F1F5F9',
});


/* ============================================================
   TRIAGE CONFIG

   IMPORTANT:
   We do not invent ROUTINE when the backend has no value.
============================================================ */

const TRIAGE_CONFIG = {
  EMERGENCY: {
    color: BRAND.red,
    backgroundKey: 'emergencyBg',
    textKey: 'emergencyText',
    icon: 'warning-outline',
    label: 'Emergency',
  },

  URGENT: {
    color: BRAND.yellow,
    backgroundKey: 'warningBg',
    textKey: 'warningText',
    icon: 'time-outline',
    label: 'Urgent',
  },

  WARNING: {
    color: BRAND.yellow,
    backgroundKey: 'warningBg',
    textKey: 'warningText',
    icon: 'warning-outline',
    label: 'Warning',
  },

  ROUTINE: {
    color: BRAND.green,
    backgroundKey: 'routineBg',
    textKey: 'routineText',
    icon: 'checkmark-circle-outline',
    label: 'Routine',
  },

  UNKNOWN: {
    color: '#64748B',
    backgroundKey: 'unknownBg',
    textKey: 'unknownText',
    icon: 'help-circle-outline',
    label: 'Not classified',
  },
};


/* ============================================================
   CONSTANTS
============================================================ */

const FILTERS = [
  {
    key: 'All',
    label: 'All',
  },
  {
    key: 'Emergency',
    label: 'Emergency',
  },
  {
    key: 'Warning',
    label: 'Warning',
  },
  {
    key: 'Routine',
    label: 'Routine',
  },
];

const DELETE_UNDO_MS = 4000;


/* ============================================================
   DATA HELPERS
============================================================ */

const normalizeText = value => {
  if (
    value === null ||
    value === undefined
  ) {
    return '';
  }

  return String(value).trim();
};


const getCreatedAt = record => (
  record?.created_at ||
  record?.createdAt ||
  record?.date ||
  null
);


const getRecordKey = (
  record,
  index,
) => (
  record?.id ||
  record?.audit_id ||
  record?.created_at ||
  record?.createdAt ||
  `record-${index}`
);


const getDateParts = record => {
  const raw = getCreatedAt(record);

  if (!raw) {
    return {
      date: 'Unknown date',
      time: '',
    };
  }

  const parsed = new Date(raw);

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return {
      date: 'Unknown date',
      time: '',
    };
  }

  return {
    date: parsed.toLocaleDateString(
      'en-US',
      {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      },
    ),

    time: parsed.toLocaleTimeString(
      'en-US',
      {
        hour: 'numeric',
        minute: '2-digit',
      },
    ),
  };
};


const getTriageLevel = record => {
  const raw = normalizeText(
    record?.triage_level ||
    record?.risk_level,
  );

  return raw
    ? raw.toUpperCase()
    : 'UNKNOWN';
};


const getTriage = record => {
  const level =
    getTriageLevel(record);

  return (
    TRIAGE_CONFIG[level] ||
    TRIAGE_CONFIG.UNKNOWN
  );
};


const joinValues = value => {
  if (Array.isArray(value)) {
    return value
      .map(item => {
        if (
          typeof item === 'string'
        ) {
          return item;
        }

        if (
          item?.name
        ) {
          return item.name;
        }

        if (
          item?.label
        ) {
          return item.label;
        }

        if (
          item?.symptom
        ) {
          return item.symptom;
        }

        return '';
      })
      .filter(Boolean)
      .join(', ');
  }

  if (
    typeof value === 'string'
  ) {
    return value.trim();
  }

  return '';
};


const getSymptoms = record => {
  const symptoms =
    record?.symptoms;

  /*
   * Normal API string
   */
  if (
    typeof symptoms === 'string' &&
    symptoms.trim()
  ) {
    return symptoms.trim();
  }

  /*
   * Array of symptoms
   */
  if (
    Array.isArray(symptoms)
  ) {
    const text =
      joinValues(symptoms);

    if (text) {
      return text;
    }
  }

  /*
   * Structured symptoms object
   */
  if (
    symptoms &&
    typeof symptoms === 'object'
  ) {
    const candidates = [
      symptoms.raw,
      symptoms.input,
      symptoms.text,
      symptoms.summary,
      symptoms.normalized,
      symptoms.normalised,
    ];

    for (
      const candidate of candidates
    ) {
      const text =
        joinValues(candidate);

      if (text) {
        return text;
      }
    }
  }

  /*
   * Other backend fields
   */
  const fallbackCandidates = [
    record?.symptoms_summary,
    record?.symptom_summary,
    record?.normalised_text,
    record?.normalized_text,
  ];

  for (
    const candidate of fallbackCandidates
  ) {
    const text =
      normalizeText(candidate);

    if (text) {
      return text;
    }
  }

  return 'No symptom text recorded';
};


const getCondition = record => {
  const summary =
    normalizeText(
      record?.ai_summary,
    );

  if (summary) {
    const firstSentence =
      summary
        .split(/[.!?]\s/)
        [0]
        ?.trim();

    if (firstSentence) {
      return firstSentence;
    }
  }

  const diseaseName =
    normalizeText(
      record?.disease_name,
    );

  if (diseaseName) {
    return diseaseName;
  }

  const topDisease =
    Array.isArray(
      record?.top_diseases,
    )
      ? record.top_diseases[0]
      : null;

  if (
    typeof topDisease === 'string' &&
    topDisease.trim()
  ) {
    return topDisease.trim();
  }

  if (
    topDisease?.name
  ) {
    return normalizeText(
      topDisease.name,
    );
  }

  return 'Health Assessment';
};


const getSearchText = record => {
  return [
    getCondition(record),
    getSymptoms(record),
    record?.ai_summary,
    record?.disease_name,
    record?.triage_level,
    record?.risk_level,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
};


const sortRecordsNewestFirst = records => {
  return [...records]
    .sort((a, b) => {
      const aTime =
        new Date(
          getCreatedAt(a) || 0,
        ).getTime();

      const bTime =
        new Date(
          getCreatedAt(b) || 0,
        ).getTime();

      return bTime - aTime;
    });
};


const extractRecordArray = data => {
  if (
    Array.isArray(data)
  ) {
    return data;
  }

  if (
    Array.isArray(data?.records)
  ) {
    return data.records;
  }

  if (
    Array.isArray(data?.data)
  ) {
    return data.data;
  }

  return [];
};


/* ============================================================
   PRESSABLE
============================================================ */

const AnimatedPressable = memo(
  function AnimatedPressable({
    children,
    onPress,
    style,
    disabled = false,
  }) {
    return (
      <Pressable
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          style,

          pressed &&
          !disabled
            ? {
                opacity: 0.76,
              }
            : null,
        ]}
      >
        {children}
      </Pressable>
    );
  },
);


/* ============================================================
   SUMMARY CARD
============================================================ */

const StatCard = memo(
  function StatCard({
    icon,
    label,
    value,
    tint,
    theme,
  }) {
    return (
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
                `${tint}18`,
            },
          ]}
        >
          <Ionicons
            name={icon}
            size={17}
            color={tint}
          />
        </View>

        <View
          style={
            styles.statTextWrap
          }
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
            {value}
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
            {label}
          </Text>
        </View>
      </View>
    );
  },
);


/* ============================================================
   RECORD CARD
============================================================ */

const RecordCard = memo(
  function RecordCard({
    record,
    index,
    theme,
    onPress,
    onDelete,
  }) {
    const triage =
      getTriage(record);

    const dateParts =
      getDateParts(record);

    const condition =
      getCondition(record);

    const symptoms =
      getSymptoms(record);

    return (
      <View
        style={[
          styles.recordCard,
          {
            backgroundColor:
              theme.card,

            borderColor:
              theme.border,
          },
        ]}
      >
        {/* Accent rail */}
        <View
          style={[
            styles.recordAccent,
            {
              backgroundColor:
                triage.color,
            },
          ]}
        />

        <View
          style={
            styles.recordCardBody
          }
        >
          {/* ------------------------------------------------
             TOP
          ------------------------------------------------ */}
          <View
            style={
              styles.recordTopRow
            }
          >
            <View
              style={[
                styles.triagePill,
                {
                  backgroundColor:
                    theme[
                      triage.backgroundKey
                    ],

                  borderColor:
                    `${triage.color}55`,
                },
              ]}
            >
              <Ionicons
                name={triage.icon}
                size={14}
                color={
                  theme[
                    triage.textKey
                  ]
                }
              />

              <Text
                style={[
                  styles.triagePillText,
                  {
                    color:
                      theme[
                        triage.textKey
                      ],
                  },
                ]}
              >
                {triage.label}
              </Text>
            </View>

            <Text
              style={[
                styles.recordDate,
                {
                  color:
                    theme.textSecondary,
                },
              ]}
              numberOfLines={1}
            >
              {dateParts.date}

              {dateParts.time
                ? ` • ${dateParts.time}`
                : ''}
            </Text>
          </View>


          {/* ------------------------------------------------
             CONDITION
          ------------------------------------------------ */}
          <Text
            style={[
              styles.recordTitle,
              {
                color:
                  theme.textPrimary,
              },
            ]}
            numberOfLines={2}
          >
            {condition}
          </Text>


          {/* ------------------------------------------------
             SYMPTOMS
          ------------------------------------------------ */}
          <View
            style={
              styles.symptomRow
            }
          >
            <View
              style={[
                styles.symptomIcon,
                {
                  backgroundColor:
                    theme.mutedSurface,
                },
              ]}
            >
              <Ionicons
                name="pulse-outline"
                size={14}
                color={
                  theme.cyanAccent
                }
              />
            </View>

            <View
              style={
                styles.symptomContent
              }
            >
              <Text
                style={[
                  styles.symptomLabel,
                  {
                    color:
                      theme.textSecondary,
                  },
                ]}
              >
                Symptoms
              </Text>

              <Text
                style={[
                  styles.symptomText,
                  {
                    color:
                      theme.textPrimary,
                  },
                ]}
                numberOfLines={2}
              >
                {symptoms}
              </Text>
            </View>
          </View>


          {/* ------------------------------------------------
             FOOTER
          ------------------------------------------------ */}
          <View
            style={[
              styles.cardFooter,
              {
                borderTopColor:
                  theme.border,
              },
            ]}
          >
            <View
              style={
                styles.recordMeta
              }
            >
              <Ionicons
                name="document-text-outline"
                size={14}
                color={
                  theme.textSecondary
                }
              />

              <Text
                style={[
                  styles.recordMetaText,
                  {
                    color:
                      theme.textSecondary,
                  },
                ]}
              >
                Assessment #{index + 1}
              </Text>
            </View>

            <View
              style={
                styles.cardActions
              }
            >
              {/* View */}
              <AnimatedPressable
                onPress={onPress}
                style={
                  styles.openActionWrap
                }
              >
                <View
                  style={[
                    styles.openAction,
                    {
                      backgroundColor:
                        theme.mutedSurface,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.openActionText,
                      {
                        color:
                          theme.textPrimary,
                      },
                    ]}
                  >
                    View
                  </Text>

                  <Ionicons
                    name="chevron-forward"
                    size={14}
                    color={
                      theme.textSecondary
                    }
                  />
                </View>
              </AnimatedPressable>

              {/* Delete */}
              <Pressable
                onPress={
                  onDelete
                }
                hitSlop={8}
                style={({ pressed }) => [
                  styles.deleteButtonWrap,

                  pressed
                    ? {
                        opacity: 0.72,
                      }
                    : null,
                ]}
              >
                <View
                  style={[
                    styles.deleteButton,
                    {
                      backgroundColor:
                        theme.emergencyBg,

                      borderColor:
                        `${BRAND.red}30`,
                    },
                  ]}
                >
                  <Ionicons
                    name="trash-outline"
                    size={16}
                    color={
                      theme.emergencyText
                    }
                  />
                </View>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    );
  },
);


/* ============================================================
   MAIN SCREEN
============================================================ */

export default function AllRecordsScreen({
  navigation,
}) {
  const {
    user,
  } = useContext(
    AuthContext,
  ) || {};

  const isDark =
    useColorScheme() === 'dark';

  const {
    width,
  } = useWindowDimensions();

  const insets =
    useSafeAreaInsets();

  const theme = useMemo(
    () => getTheme(isDark),
    [isDark],
  );


  /* ==========================================================
     RESPONSIVE LAYOUT
  ========================================================== */

  const contentWidth =
    Math.min(
      width,
      720,
    );

  const horizontalPadding =
    width <= 360
      ? 16
      : width <= 420
        ? 18
        : 22;


  /* ==========================================================
     STATE
  ========================================================== */

  const [
    records,
    setRecords,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    activeFilter,
    setActiveFilter,
  ] = useState('All');

  const [
    searchQuery,
    setSearchQuery,
  ] = useState('');

  const [
    isSearching,
    setIsSearching,
  ] = useState(false);

  const [
    pendingDelete,
    setPendingDelete,
  ] = useState(null);


  /* ==========================================================
     REFS
  ========================================================== */

  const searchInputRef =
    useRef(null);

  const mountedRef =
    useRef(true);

  const isFetchingRef =
    useRef(false);

  const lastLoadedAtRef =
    useRef(0);

  const deleteTimerRef =
    useRef(null);


  /* ==========================================================
     NAVIGATION HEADER FIX

     Explicitly turn off stack header.
     This screen renders its own header.
  ========================================================== */

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);


  /* ==========================================================
     CLEANUP
  ========================================================== */

  useEffect(() => {
    return () => {
      mountedRef.current = false;

      if (
        deleteTimerRef.current
      ) {
        clearTimeout(
          deleteTimerRef.current,
        );
      }
    };
  }, []);


  /* ==========================================================
     RESET WHEN USER CHANGES
  ========================================================== */

  useEffect(() => {
    lastLoadedAtRef.current = 0;

    if (
      mountedRef.current
    ) {
      setRecords([]);
      setLoading(true);
    }
  }, [user?.uid]);


  /* ==========================================================
     FETCH RECORDS

     Optimizations:
     - only one focus-driven fetch
     - no mount + focus double-fetch
     - prevents concurrent requests
     - avoids refetching within 20 seconds
     - pull-to-refresh forces fetch
     - no fake data
  ========================================================== */

  const fetchRecords =
    useCallback(
      async (
        force = false,
      ) => {
        const now =
          Date.now();

        /*
         * No authenticated user
         */
        if (!user?.uid) {
          if (
            mountedRef.current
          ) {
            setRecords([]);
            setLoading(false);
            setRefreshing(false);
          }

          return;
        }


        /*
         * Avoid unnecessary refetch
         */
        if (
          !force &&
          lastLoadedAtRef.current > 0 &&
          now -
            lastLoadedAtRef.current <
            20_000
        ) {
          return;
        }


        /*
         * Prevent concurrent requests
         */
        if (
          isFetchingRef.current
        ) {
          return;
        }

        isFetchingRef.current =
          true;


        if (
          mountedRef.current
        ) {
          if (force) {
            setRefreshing(
              true,
            );
          } else if (
            lastLoadedAtRef.current ===
            0
          ) {
            setLoading(true);
          }
        }


        try {
          const data =
            await getRecords(
              user.uid,
            );

          const result =
            sortRecordsNewestFirst(
              extractRecordArray(
                data,
              ),
            );

          lastLoadedAtRef.current =
            Date.now();

          if (
            mountedRef.current
          ) {
            setRecords(
              result,
            );
          }
        } catch (error) {
          console.error(
            'AllRecordsScreen fetch error:',
            error,
          );

          /*
           * Don't destroy already
           * visible records when a
           * background refresh fails.
           */
          if (
            mountedRef.current &&
            records.length === 0
          ) {
            Alert.alert(
              'Unable to load records',
              'Please check your connection and try again.',
            );
          }
        } finally {
          isFetchingRef.current =
            false;

          if (
            mountedRef.current
          ) {
            setLoading(false);
            setRefreshing(false);
          }
        }
      },
      [
        user?.uid,
        records.length,
      ],
    );


  /* ==========================================================
     IMPORTANT:
     Focus effect is the ONLY lifecycle fetch.
  ========================================================== */

  useFocusEffect(
    useCallback(
      () => {
        fetchRecords(false);
      },
      [fetchRecords],
    ),
  );


  /* ==========================================================
     FILTER COUNTS
  ========================================================== */

  const filterCounts =
    useMemo(() => {
      let emergency = 0;
      let warning = 0;
      let routine = 0;

      records.forEach(
        record => {
          const level =
            getTriageLevel(
              record,
            );

          if (
            level ===
            'EMERGENCY'
          ) {
            emergency += 1;
          } else if (
            level === 'URGENT' ||
            level === 'WARNING'
          ) {
            warning += 1;
          } else if (
            level === 'ROUTINE'
          ) {
            routine += 1;
          }
        },
      );

      return {
        all: records.length,
        emergency,
        warning,
        routine,
      };
    }, [records]);


  /* ==========================================================
     FILTERED RECORDS
  ========================================================== */

  const filteredRecords =
    useMemo(() => {
      const query =
        searchQuery
          .trim()
          .toLowerCase();

      return records.filter(
        record => {
          const level =
            getTriageLevel(
              record,
            );


          let filterMatch =
            true;

          if (
            activeFilter ===
            'Emergency'
          ) {
            filterMatch =
              level ===
              'EMERGENCY';
          } else if (
            activeFilter ===
            'Warning'
          ) {
            filterMatch =
              level ===
                'URGENT' ||
              level ===
                'WARNING';
          } else if (
            activeFilter ===
            'Routine'
          ) {
            filterMatch =
              level ===
              'ROUTINE';
          }


          if (
            !filterMatch
          ) {
            return false;
          }


          if (!query) {
            return true;
          }


          return getSearchText(
            record,
          ).includes(query);
        },
      );
    }, [
      records,
      activeFilter,
      searchQuery,
    ]);


  /* ==========================================================
     HEADER SUBTITLE
  ========================================================== */

  const headerSubtitle =
    useMemo(() => {
      if (
        searchQuery.trim()
      ) {
        return `${filteredRecords.length} matching ${
          filteredRecords.length === 1
            ? 'record'
            : 'records'
        }`;
      }

      if (
        records.length === 0
      ) {
        return 'Your health assessments in one place';
      }

      return `${records.length} saved ${
        records.length === 1
          ? 'assessment'
          : 'assessments'
      }`;
    }, [
      searchQuery,
      filteredRecords.length,
      records.length,
    ]);


  /* ==========================================================
     SEARCH TOGGLE
  ========================================================== */

  const toggleSearch =
    useCallback(() => {
      setIsSearching(
        current => {
          const next =
            !current;

          if (!next) {
            setSearchQuery('');
          } else {
            setTimeout(
              () => {
                searchInputRef
                  .current
                  ?.focus();
              },
              120,
            );
          }

          return next;
        },
      );
    }, []);


  /* ==========================================================
     DELETE COMMIT
  ========================================================== */

  const commitDelete =
    useCallback(
      async record => {
        if (
          !record?.id
        ) {
          return;
        }

        try {
          await deleteRecord(
            record.id,
          );

          /*
           * Keep our local cache
           * current without
           * making another GET.
           */
          lastLoadedAtRef.current =
            Date.now();
        } catch (error) {
          console.error(
            'AllRecordsScreen delete error:',
            error,
          );

          if (
            mountedRef.current
          ) {
            setRecords(
              previous => {
                const exists =
                  previous.some(
                    item =>
                      item.id ===
                      record.id,
                  );

                if (
                  exists
                ) {
                  return previous;
                }

                return sortRecordsNewestFirst(
                  [
                    ...previous,
                    record,
                  ],
                );
              },
            );

            Alert.alert(
              'Delete failed',
              'The record could not be deleted. Your record has been restored.',
            );
          }
        }
      },
      [],
    );


  /* ==========================================================
     DELETE WITH UNDO
  ========================================================== */

  const handleDelete =
    useCallback(
      record => {
        if (
          !record?.id
        ) {
          return;
        }


        /*
         * If another delete is
         * waiting for commit,
         * commit that previous one.
         */
        if (
          deleteTimerRef.current
        ) {
          clearTimeout(
            deleteTimerRef.current,
          );

          deleteTimerRef.current =
            null;
        }


        if (
          pendingDelete
            ?.record
        ) {
          commitDelete(
            pendingDelete.record,
          );
        }


        /*
         * Optimistically remove
         */
        setRecords(
          previous =>
            previous.filter(
              item =>
                item.id !==
                record.id,
            ),
        );


        setPendingDelete({
          record,
        });


        /*
         * Commit automatically
         * after 4 seconds.
         */
        deleteTimerRef.current =
          setTimeout(
            async () => {
              await commitDelete(
                record,
              );

              deleteTimerRef.current =
                null;

              if (
                mountedRef.current
              ) {
                setPendingDelete(
                  null,
                );
              }
            },
            DELETE_UNDO_MS,
          );
      },
      [
        pendingDelete,
        commitDelete,
      ],
    );


  /* ==========================================================
     UNDO DELETE
  ========================================================== */

  const handleUndo =
    useCallback(() => {
      if (
        !pendingDelete
      ) {
        return;
      }

      if (
        deleteTimerRef.current
      ) {
        clearTimeout(
          deleteTimerRef.current,
        );

        deleteTimerRef.current =
          null;
      }


      setRecords(
        previous => {
          const alreadyExists =
            previous.some(
              item =>
                item.id ===
                pendingDelete
                  .record
                  .id,
            );

          if (
            alreadyExists
          ) {
            return previous;
          }

          return sortRecordsNewestFirst(
            [
              ...previous,
              pendingDelete.record,
            ],
          );
        },
      );


      setPendingDelete(
        null,
      );
    }, [
      pendingDelete,
    ]);


  /* ==========================================================
     RENDER RECORD
  ========================================================== */

  const renderRecord =
    useCallback(
      ({
        item,
        index,
      }) => (
        <RecordCard
          record={item}
          index={index}
          theme={theme}

          onPress={() =>
            navigation.navigate(
              'HealthRecordDetail',
              {
                result: item,
              },
            )
          }

          onDelete={() =>
            handleDelete(
              item,
            )
          }
        />
      ),
      [
        theme,
        navigation,
        handleDelete,
      ],
    );


  /* ==========================================================
     KEY EXTRACTOR
  ========================================================== */

  const keyExtractor =
    useCallback(
      (item, index) =>
        String(
          getRecordKey(
            item,
            index,
          ),
        ),
      [],
    );


  /* ==========================================================
     FILTER DATA
  ========================================================== */

  const filters =
    useMemo(
      () => [
        {
          ...FILTERS[0],
          count:
            filterCounts.all,
        },

        {
          ...FILTERS[1],
          count:
            filterCounts.emergency,
        },

        {
          ...FILTERS[2],
          count:
            filterCounts.warning,
        },

        {
          ...FILTERS[3],
          count:
            filterCounts.routine,
        },
      ],
      [filterCounts],
    );


  /* ==========================================================
     HEADER
  ========================================================== */

  const renderHeader =
    useCallback(
      () => (
        <View
          style={
            styles.headerContent
          }
        >
          {/* ------------------------------------------------
             TITLE ROW
          ------------------------------------------------ */}
          <View
            style={
              styles.titleRow
            }
          >
            <View
              style={
                styles.headerTitleWrap
              }
            >
              <Text
                style={[
                  styles.screenTitle,
                  {
                    color:
                      theme.textPrimary,
                  },
                ]}
              >
                My Records
              </Text>

              <Text
                style={[
                  styles.screenSubtitle,
                  {
                    color:
                      theme.textSecondary,
                  },
                ]}
              >
                {headerSubtitle}
              </Text>
            </View>


            <View
              style={
                styles.headerActions
              }
            >
              {/* Search */}
              <AnimatedPressable
                onPress={
                  toggleSearch
                }
              >
                <View
                  style={[
                    styles.headerIconButton,
                    {
                      backgroundColor:
                        theme.card,

                      borderColor:
                        theme.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      isSearching
                        ? 'close-outline'
                        : 'search-outline'
                    }
                    size={20}
                    color={
                      theme.textPrimary
                    }
                  />
                </View>
              </AnimatedPressable>


              {/* New Record */}
              <AnimatedPressable
                onPress={() =>
                  navigation.navigate(
                    'SymptomChecker',
                  )
                }
              >
                <View
                  style={[
                    styles.headerAddButton,
                    {
                      backgroundColor:
                        theme.cyanAccent,
                    },
                  ]}
                >
                  <Ionicons
                    name="add"
                    size={22}
                    color="#06110F"
                  />
                </View>
              </AnimatedPressable>
            </View>
          </View>


          {/* ------------------------------------------------
             SEARCH
          ------------------------------------------------ */}
          {isSearching && (
            <View
              style={[
                styles.searchContainer,
                {
                  backgroundColor:
                    theme.card,

                  borderColor:
                    theme.border,
                },
              ]}
            >
              <Ionicons
                name="search-outline"
                size={17}
                color={
                  theme.textSecondary
                }
              />

              <TextInput
                ref={
                  searchInputRef
                }

                value={
                  searchQuery
                }

                onChangeText={
                  setSearchQuery
                }

                placeholder="Search symptoms, conditions..."
                placeholderTextColor={
                  theme.textSecondary
                }

                style={[
                  styles.searchInput,
                  {
                    color:
                      theme.textPrimary,
                  },
                ]}

                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
              />

              {searchQuery.length >
                0 && (
                <Pressable
                  onPress={() =>
                    setSearchQuery('')
                  }
                  hitSlop={8}
                >
                  <Ionicons
                    name="close-circle"
                    size={17}
                    color={
                      theme.textSecondary
                    }
                  />
                </Pressable>
              )}
            </View>
          )}


          {/* ------------------------------------------------
             SUMMARY
          ------------------------------------------------ */}
          <View
            style={
              styles.statsRow
            }
          >
            <StatCard
              icon="documents-outline"
              label="Total"
              value={
                filterCounts.all
              }
              tint={
                theme.cyanAccent
              }
              theme={theme}
            />

            <StatCard
              icon="alert-circle-outline"
              label="Attention"
              value={
                filterCounts.emergency +
                filterCounts.warning
              }
              tint={
                BRAND.yellow
              }
              theme={theme}
            />

            <StatCard
              icon="checkmark-circle-outline"
              label="Routine"
              value={
                filterCounts.routine
              }
              tint={
                BRAND.green
              }
              theme={theme}
            />
          </View>


          {/* ------------------------------------------------
             FILTER HEADER
          ------------------------------------------------ */}
          <View
            style={
              styles.filterHeaderRow
            }
          >
            <Text
              style={[
                styles.sectionLabel,
                {
                  color:
                    theme.textPrimary,
                },
              ]}
            >
              Filter records
            </Text>

            <Text
              style={[
                styles.resultCount,
                {
                  color:
                    theme.textSecondary,
                },
              ]}
            >
              {filteredRecords.length}{' '}
              shown
            </Text>
          </View>


          {/* ------------------------------------------------
             FILTERS
          ------------------------------------------------ */}
          <FlatList
            horizontal
            data={filters}
            keyExtractor={
              item =>
                item.key
            }
            showsHorizontalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.filterList
            }
            renderItem={({
              item,
            }) => {
              const selected =
                activeFilter ===
                item.key;

              return (
                <AnimatedPressable
                  onPress={() =>
                    setActiveFilter(
                      item.key,
                    )
                  }
                >
                  <View
                    style={[
                      styles.filterPill,
                      {
                        backgroundColor:
                          selected
                            ? theme.cyanAccent
                            : theme.card,

                        borderColor:
                          selected
                            ? theme.cyanAccent
                            : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        {
                          color:
                            selected
                              ? '#06110F'
                              : theme.textSecondary,
                        },
                      ]}
                    >
                      {item.label}
                    </Text>

                    <View
                      style={[
                        styles.filterCount,
                        {
                          backgroundColor:
                            selected
                              ? 'rgba(6,17,15,0.12)'
                              : theme.mutedSurface,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterCountText,
                          {
                            color:
                              selected
                                ? '#06110F'
                                : theme.textSecondary,
                          },
                        ]}
                      >
                        {item.count}
                      </Text>
                    </View>
                  </View>
                </AnimatedPressable>
              );
            }}
          />
        </View>
      ),
      [
        theme,
        headerSubtitle,
        toggleSearch,
        isSearching,
        navigation,
        searchQuery,
        filterCounts,
        filters,
        filteredRecords.length,
        activeFilter,
      ],
    );


  /* ==========================================================
     EMPTY STATE
  ========================================================== */

  const renderEmpty =
    useCallback(
      () => (
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
                  `${theme.cyanAccent}14`,
              },
            ]}
          >
            <Ionicons
              name={
                searchQuery.trim() ||
                activeFilter !==
                  'All'
                  ? 'search-outline'
                  : 'folder-open-outline'
              }
              size={29}
              color={
                theme.cyanAccent
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
            {searchQuery.trim() ||
            activeFilter !==
              'All'
              ? 'No matching records'
              : 'No health records yet'}
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
            {searchQuery.trim() ||
            activeFilter !==
              'All'
              ? 'Try another search term or choose a different filter.'
              : 'Your completed symptom assessments will appear here.'}
          </Text>

          {!searchQuery.trim() &&
            activeFilter ===
              'All' && (
              <AnimatedPressable
                onPress={() =>
                  navigation.navigate(
                    'SymptomChecker',
                  )
                }
              >
                <View
                  style={[
                    styles.emptyButton,
                    {
                      backgroundColor:
                        theme.cyanAccent,
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
                      styles.emptyButtonText
                    }
                  >
                    Start a health check
                  </Text>
                </View>
              </AnimatedPressable>
            )}
        </View>
      ),
      [
        theme,
        searchQuery,
        activeFilter,
        navigation,
      ],
    );


  /* ==========================================================
     LOADING SCREEN
  ========================================================== */

  if (
    loading &&
    records.length === 0
  ) {
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
            styles.loadingScreen
          }
        >
          <View
            style={[
              styles.loadingLogo,
              {
                backgroundColor:
                  `${theme.cyanAccent}14`,
              },
            ]}
          >
            <Ionicons
              name="folder-open-outline"
              size={30}
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
            style={
              styles.loadingSpinner
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
            Loading your records
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
            Securely syncing your health history
          </Text>
        </View>
      </SafeAreaView>
    );
  }


  /* ==========================================================
     SCREEN
  ========================================================== */

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

      <FlatList
        data={
          filteredRecords
        }

        keyExtractor={
          keyExtractor
        }

        renderItem={
          renderRecord
        }

        ListHeaderComponent={
          renderHeader
        }

        ListEmptyComponent={
          renderEmpty
        }

        showsVerticalScrollIndicator={
          false
        }

        contentContainerStyle={[
          styles.listContent,
          {
            width: '100%',

            maxWidth:
              contentWidth,

            alignSelf:
              'center',

            paddingHorizontal:
              horizontalPadding,

            paddingBottom:
              insets.bottom +
              (
                pendingDelete
                  ? 118
                  : 74
              ),
          },
        ]}

        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }

            onRefresh={() =>
              fetchRecords(
                true,
              )
            }

            tintColor={
              theme.cyanAccent
            }

            colors={[
              theme.cyanAccent,
            ]}

            progressBackgroundColor={
              theme.card
            }
          />
        }

        ListFooterComponent={
          filteredRecords.length >
          0 ? (
            <Text
              style={[
                styles.footerText,
                {
                  color:
                    theme.textSecondary,
                },
              ]}
            >
              Your records are securely stored in CareSense AI.
            </Text>
          ) : null
        }
      />


      {/* ======================================================
         UNDO DELETE BAR
      ====================================================== */}

      {pendingDelete && (
        <View
          style={[
            styles.undoBar,
            {
              backgroundColor:
                theme.card,

              borderColor:
                theme.border,

              bottom:
                insets.bottom +
                18,
            },
          ]}
        >
          <View
            style={
              styles.undoBarLeft
            }
          >
            <View
              style={[
                styles.undoIcon,
                {
                  backgroundColor:
                    theme.emergencyBg,
                },
              ]}
            >
              <Ionicons
                name="trash-outline"
                size={15}
                color={
                  theme.emergencyText
                }
              />
            </View>

            <Text
              style={[
                styles.undoText,
                {
                  color:
                    theme.textPrimary,
                },
              ]}
            >
              Record removed
            </Text>
          </View>

          <AnimatedPressable
            onPress={
              handleUndo
            }
          >
            <View
              style={
                styles.undoButtonWrap
              }
            >
              <Text
                style={[
                  styles.undoButton,
                  {
                    color:
                      theme.cyanAccent,
                  },
                ]}
              >
                Undo
              </Text>
            </View>
          </AnimatedPressable>
        </View>
      )}
    </SafeAreaView>
  );
}


/* ============================================================
   STYLES
============================================================ */

const styles =
  StyleSheet.create({

    /* ========================================================
       SCREEN
    ======================================================== */

    safeArea: {
      flex: 1,
    },

    listContent: {
      paddingTop: 4,
    },


    /* ========================================================
       HEADER
    ======================================================== */

    headerContent: {
      paddingTop: 8,
      paddingBottom: 18,
    },

    titleRow: {
      minHeight: 58,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },

    headerTitleWrap: {
      flex: 1,
      minWidth: 0,
      paddingRight: 14,
    },

    screenTitle: {
      fontSize: 28,
      lineHeight: 34,
      fontWeight: '800',
      letterSpacing: -0.8,
    },

    screenSubtitle: {
      marginTop: 5,
      fontSize: 13,
      lineHeight: 19,
      fontWeight: '500',
    },

    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },

    headerIconButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },

    headerAddButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },


    /* ========================================================
       SEARCH
    ======================================================== */

    searchContainer: {
      minHeight: 46,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
      marginTop: 14,
      paddingHorizontal: 13,
      borderRadius: 15,
      borderWidth: 1,
    },

    searchInput: {
      flex: 1,
      minHeight: 44,
      paddingVertical: 0,
      fontSize: 14,
      fontWeight: '500',
    },


    /* ========================================================
       STATS
    ======================================================== */

    statsRow: {
      flexDirection: 'row',
      gap: 9,
      marginTop: 18,
    },

    statCard: {
      flex: 1,
      minHeight: 76,
      borderRadius: 16,
      borderWidth: 1,
      paddingHorizontal: 11,
      paddingVertical: 11,
      flexDirection: 'row',
      alignItems: 'center',
    },

    statIcon: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
    },

    statTextWrap: {
      flex: 1,
      minWidth: 0,
    },

    statValue: {
      fontSize: 19,
      lineHeight: 23,
      fontWeight: '800',
    },

    statLabel: {
      marginTop: 1,
      fontSize: 11,
      lineHeight: 16,
      fontWeight: '500',
    },


    /* ========================================================
       FILTERS
    ======================================================== */

    filterHeaderRow: {
      marginTop: 24,
      marginBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },

    sectionLabel: {
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '800',
    },

    resultCount: {
      fontSize: 11,
      fontWeight: '600',
    },

    filterList: {
      paddingRight: 8,
      gap: 8,
    },

    filterPill: {
      minHeight: 36,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      paddingHorizontal: 12,
      borderRadius: 18,
      borderWidth: 1,
    },

    filterPillText: {
      fontSize: 12,
      fontWeight: '700',
    },

    filterCount: {
      minWidth: 20,
      height: 20,
      paddingHorizontal: 5,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },

    filterCountText: {
      fontSize: 10,
      fontWeight: '800',
    },


    /* ========================================================
       RECORD CARD
    ======================================================== */

    recordCard: {
      position: 'relative',
      overflow: 'hidden',
      borderRadius: 18,
      borderWidth: 1,
      marginBottom: 12,
    },

    recordAccent: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 4,
    },

    recordCardBody: {
      paddingHorizontal: 16,
      paddingTop: 15,
      paddingBottom: 13,
      paddingLeft: 18,
    },

    recordTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },

    triagePill: {
      minHeight: 28,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 9,
      borderRadius: 9,
      borderWidth: 1,
      flexShrink: 0,
    },

    triagePillText: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.35,
    },

    recordDate: {
      flexShrink: 1,
      fontSize: 11,
      fontWeight: '500',
      textAlign: 'right',
    },

    recordTitle: {
      marginTop: 13,
      fontSize: 17,
      lineHeight: 22,
      fontWeight: '800',
      letterSpacing: -0.25,
      paddingRight: 8,
    },

    symptomRow: {
      marginTop: 11,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 9,
      paddingRight: 4,
    },

    symptomIcon: {
      width: 30,
      height: 30,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },

    symptomContent: {
      flex: 1,
      minWidth: 0,
    },

    symptomLabel: {
      fontSize: 10,
      lineHeight: 14,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.35,
    },

    symptomText: {
      marginTop: 2,
      fontSize: 13,
      lineHeight: 19,
      fontWeight: '500',
    },

    cardFooter: {
      marginTop: 14,
      paddingTop: 11,
      borderTopWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },

    recordMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexShrink: 1,
    },

    recordMetaText: {
      fontSize: 10,
      fontWeight: '600',
    },

    cardActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },

    openActionWrap: {
      borderRadius: 10,
    },

    openAction: {
      minHeight: 34,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      borderRadius: 10,
    },

    openActionText: {
      fontSize: 11,
      fontWeight: '700',
    },

    deleteButtonWrap: {
      borderRadius: 10,
    },

    deleteButton: {
      width: 35,
      height: 35,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },


    /* ========================================================
       EMPTY STATE
    ======================================================== */

    emptyCard: {
      marginTop: 8,
      minHeight: 270,
      borderRadius: 20,
      borderWidth: 1,
      paddingHorizontal: 24,
      paddingVertical: 34,
      alignItems: 'center',
      justifyContent: 'center',
    },

    emptyIcon: {
      width: 64,
      height: 64,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },

    emptyTitle: {
      marginTop: 16,
      fontSize: 20,
      lineHeight: 26,
      fontWeight: '800',
      letterSpacing: -0.35,
      textAlign: 'center',
    },

    emptyText: {
      marginTop: 8,
      maxWidth: 300,
      fontSize: 13,
      lineHeight: 20,
      fontWeight: '500',
      textAlign: 'center',
    },

    emptyButton: {
      minHeight: 42,
      marginTop: 20,
      paddingHorizontal: 15,
      borderRadius: 13,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
    },

    emptyButtonText: {
      color: '#06110F',
      fontSize: 12,
      fontWeight: '800',
    },


    /* ========================================================
       FOOTER
    ======================================================== */

    footerText: {
      textAlign: 'center',
      paddingTop: 10,
      fontSize: 10,
      lineHeight: 16,
      fontWeight: '500',
    },


    /* ========================================================
       LOADING
    ======================================================== */

    loadingScreen: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 30,
    },

    loadingLogo: {
      width: 72,
      height: 72,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },

    loadingSpinner: {
      marginTop: 18,
    },

    loadingTitle: {
      marginTop: 12,
      fontSize: 18,
      lineHeight: 24,
      fontWeight: '800',
    },

    loadingText: {
      marginTop: 5,
      fontSize: 12,
      lineHeight: 18,
      textAlign: 'center',
    },


    /* ========================================================
       UNDO
    ======================================================== */

    undoBar: {
      position: 'absolute',
      left: 16,
      right: 16,
      minHeight: 58,
      borderRadius: 16,
      borderWidth: 1,
      paddingLeft: 10,
      paddingRight: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',

      elevation: 10,

      shadowColor: '#000',
      shadowOpacity: 0.18,
      shadowRadius: 14,
      shadowOffset: {
        width: 0,
        height: 8,
      },
    },

    undoBarLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },

    undoIcon: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },

    undoText: {
      fontSize: 13,
      fontWeight: '700',
    },

    undoButtonWrap: {
      minWidth: 54,
      minHeight: 38,
      paddingHorizontal: 10,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },

    undoButton: {
      fontSize: 13,
      fontWeight: '800',
    },

  });