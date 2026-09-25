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
  Alert,
  Animated,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  useBottomTabBarHeight,
} from '@react-navigation/bottom-tabs';

import Ionicons from '@expo/vector-icons/Ionicons';

import {
  AuthContext,
} from '../context/AuthContext';

import {
  getRecords,
  getNearbyHealthcarePlaces,
} from '../services/api';

import {
  formatDate,
} from '../utils/dateTime';


/* ============================================================
   CONSTANTS
============================================================ */

const SEARCH_HISTORY_PREFIX =
  '@caresense_search_history_v1';

const HEALTHCARE_RADIUS_METERS = 5000;

const SEARCH_FILTERS = [
  {
    id: 'all',
    label: 'All',
    icon: 'apps-outline',
  },
  {
    id: 'records',
    label: 'My Records',
    icon: 'pulse-outline',
  },
  {
    id: 'care',
    label: 'Nearby Care',
    icon: 'location-outline',
  },
];


/* ============================================================
   HELPERS
============================================================ */

const asArray = value =>
  Array.isArray(value) ? value : [];


const asObject = value =>
  value &&
  typeof value === 'object' &&
  !Array.isArray(value)
    ? value
    : null;


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

  if (typeof value === 'string') {
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
      .map(item => safeText(item, ''))
      .filter(Boolean);

    return items.length > 0
      ? items.join(', ')
      : fallback;
  }

  if (typeof value === 'object') {
    const preferredKeys = [
      'text',
      'symptom_text',
      'symptoms',
      'normalised',
      'normalized',
      'name',
      'title',
      'label',
      'condition',
      'disease',
      'summary',
      'description',
      'value',
    ];

    for (const key of preferredKeys) {
      if (
        value[key] !== null &&
        value[key] !== undefined
      ) {
        const extracted = safeText(
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


const normalizeText = value =>
  safeText(value)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();


const formatDistance = value => {
  const meters = Number(value);

  if (!Number.isFinite(meters)) {
    return 'Distance unavailable';
  }

  if (meters < 1000) {
    return `${Math.round(meters)} m away`;
  }

  return `${(
    meters / 1000
  ).toFixed(1)} km away`;
};


const getRecordId = (
  record,
  index,
) =>
  safeText(
    record?.id ||
      record?.record_id ||
      record?.pk ||
      record?._id,
    `record-${index}`,
  );


const getRecordTitle = record => {
  const candidates = [
    record?.symptom_summary,
    record?.symptoms,
    record?.symptom_text,
    record?.chief_complaint,
    record?.symptom_name,
    record?.title,
  ];

  for (const candidate of candidates) {
    const text = safeText(
      candidate,
      '',
    );

    if (text) {
      return text;
    }
  }

  return 'Health assessment';
};


const getRecordSummary = record => {
  const topDiseases =
    Array.isArray(
      record?.top_diseases,
    )
      ? record.top_diseases
      : [];

  const firstDisease =
    topDiseases[0];

  const candidates = [
    record?.condition,

    firstDisease?.condition,
    firstDisease?.disease,
    firstDisease?.name,

    record?.ai_summary,
    record?.summary,
    record?.explanation,
    record?.advice,
  ];

  for (const candidate of candidates) {
    const text = safeText(
      candidate,
      '',
    );

    if (text) {
      return text;
    }
  }

  return 'Open this assessment to see the complete CareSense result.';
};


const getRecordTriage = record => {
  const level = safeText(
    record?.triage_level,
    'ROUTINE',
  ).toUpperCase();

  if (level === 'EMERGENCY') {
    return {
      label: 'Emergency',
      color: '#EF4444',
      bg: '#FEE2E2',
      icon: 'warning-outline',
    };
  }

  if (level === 'URGENT') {
    return {
      label: 'Urgent',
      color: '#F59E0B',
      bg: '#FEF3C7',
      icon: 'time-outline',
    };
  }

  return {
    label: 'Routine',
    color: '#00A878',
    bg: '#E6F8F1',
    icon: 'checkmark-circle-outline',
  };
};


const getRecordDate =
  record =>
    record?.created_at ||
    record?.createdAt ||
    record?.date ||
    record?.timestamp ||
    record?.updated_at ||
    null;


const getPlacePresentation = place => {
  const category =
    normalizeText(
      place?.category,
    );

  if (category === 'doctor') {
    return {
      label: 'Doctor / Practice',
      icon: 'person-outline',
      color: '#00D4C5',
    };
  }

  if (category === 'hospital') {
    return {
      label: 'Hospital',
      icon: 'business-outline',
      color: '#EF4444',
    };
  }

  if (category === 'clinic') {
    return {
      label: 'Clinic',
      icon: 'medkit-outline',
      color: '#00A878',
    };
  }

  return {
    label: 'Healthcare',
    icon: 'medical-outline',
    color: '#00D4C5',
  };
};


const getPlaceSearchText = place =>
  [
    place?.name,
    place?.address,
    place?.primary_type,
    place?.category,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();


const buildMapsUrl = place => {
  const existing =
    place?.google_maps_uri ||
    place?.googleMapsUri;

  if (existing) {
    return existing;
  }

  const latitude = Number(
    place?.latitude,
  );

  const longitude = Number(
    place?.longitude,
  );

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }

  const query = encodeURIComponent(
    place?.name ||
      `${latitude},${longitude}`,
  );

  return (
    `https://www.google.com/maps/search/?api=1&query=${query}`
  );
};


/* ============================================================
   PRESSABLE ANIMATION
============================================================ */

function AnimatedPressable({
  children,
  onPress,
  style,
  disabled = false,
}) {
  const scale =
    useRef(
      new Animated.Value(1),
    ).current;

  const handlePressIn = () => {
    Animated.spring(
      scale,
      {
        toValue: 0.97,
        useNativeDriver: true,
        speed: 40,
        bounciness: 3,
      },
    ).start();
  };

  const handlePressOut = () => {
    Animated.spring(
      scale,
      {
        toValue: 1,
        useNativeDriver: true,
        speed: 35,
        bounciness: 4,
      },
    ).start();
  };

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
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
          },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}


/* ============================================================
   MAIN SCREEN
============================================================ */

export default function SearchScreen({
  navigation,
}) {
  const {
    user,
    isDarkMode,
  } =
    useContext(AuthContext) || {};

  const isDark =
    Boolean(isDarkMode);

  const insets =
    useSafeAreaInsets();

  const tabBarHeight =
    useBottomTabBarHeight();


  /* ==========================================================
     THEME
  ========================================================== */

  const theme = useMemo(
    () => ({
      background: isDark
        ? '#0A0F1A'
        : '#F7F9FC',

      surface: isDark
        ? '#101722'
        : '#FFFFFF',

      card: isDark
        ? '#141C29'
        : '#FFFFFF',

      cardAlt: isDark
        ? '#111827'
        : '#F8FAFC',

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

      danger: '#EF4444',

      dangerSoft: isDark
        ? '#32171C'
        : '#FFF1F2',

      warning: '#F59E0B',

      warningSoft: isDark
        ? '#30240F'
        : '#FFFBEB',

      success: '#00A878',

      successSoft: isDark
        ? '#10352B'
        : '#E8F8F3',

      successBorder: isDark
        ? '#246A58'
        : '#BCEBDD',
    }),
    [isDark],
  );


  /* ==========================================================
     STATE
  ========================================================== */

  const [
    searchQuery,
    setSearchQuery,
  ] = useState('');

  const [
    selectedFilter,
    setSelectedFilter,
  ] = useState('all');

  const [
    records,
    setRecords,
  ] = useState([]);

  const [
    places,
    setPlaces,
  ] = useState([]);

  const [
    recentSearches,
    setRecentSearches,
  ] = useState([]);

  const [
    loadingRecords,
    setLoadingRecords,
  ] = useState(true);

  const [
    loadingPlaces,
    setLoadingPlaces,
  ] = useState(false);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    locationLoading,
    setLocationLoading,
  ] = useState(false);

  const [
    locationDenied,
    setLocationDenied,
  ] = useState(false);

  const [
    recordsError,
    setRecordsError,
  ] = useState('');

  const [
    placesError,
    setPlacesError,
  ] = useState('');

  const [
    expandedRecordId,
    setExpandedRecordId,
  ] = useState(null);

  const fadeAnim =
    useRef(
      new Animated.Value(0),
    ).current;


  /* ==========================================================
     STORAGE KEY
  ========================================================== */

  const historyStorageKey = user?.uid
    ? `${SEARCH_HISTORY_PREFIX}_${user.uid}`
    : null;


  /* ==========================================================
     LOAD RECENT SEARCHES
  ========================================================== */

  const loadRecentSearches =
    useCallback(async () => {
      if (!historyStorageKey) {
        setRecentSearches([]);
        return;
      }

      try {
        const stored =
          await AsyncStorage.getItem(
            historyStorageKey,
          );

        if (!stored) {
          setRecentSearches([]);
          return;
        }

        const parsed =
          JSON.parse(stored);

        if (!Array.isArray(parsed)) {
          setRecentSearches([]);
          return;
        }

        setRecentSearches(
          parsed
            .filter(
              item =>
                item &&
                typeof item.term ===
                  'string',
            )
            .slice(0, 8),
        );
      } catch (error) {
        console.warn(
          'Unable to load search history:',
          error,
        );

        setRecentSearches([]);
      }
    }, [
      historyStorageKey,
    ]);


  useEffect(() => {
    void loadRecentSearches();
  }, [
    loadRecentSearches,
  ]);


  /* ==========================================================
     SAVE RECENT SEARCH
  ========================================================== */

  const saveSearch =
    useCallback(
      async term => {
        const cleanTerm =
          safeText(term);

        if (
          !cleanTerm ||
          !historyStorageKey
        ) {
          return;
        }

        const normalized =
          normalizeText(
            cleanTerm,
          );

        const next = [
          {
            id:
              `${Date.now()}`,
            term:
              cleanTerm,
          },

          ...recentSearches.filter(
            item =>
              normalizeText(
                item.term,
              ) !== normalized,
          ),
        ].slice(0, 8);

        setRecentSearches(next);

        try {
          await AsyncStorage.setItem(
            historyStorageKey,
            JSON.stringify(next),
          );
        } catch (error) {
          console.warn(
            'Unable to save search history:',
            error,
          );
        }
      },
      [
        historyStorageKey,
        recentSearches,
      ],
    );


  /* ==========================================================
     REMOVE SEARCH HISTORY ITEM
  ========================================================== */

  const removeRecentSearch =
    useCallback(
      async id => {
        if (!historyStorageKey) {
          return;
        }

        const next =
          recentSearches.filter(
            item =>
              item.id !== id,
          );

        setRecentSearches(next);

        try {
          await AsyncStorage.setItem(
            historyStorageKey,
            JSON.stringify(next),
          );
        } catch (error) {
          console.warn(
            'Unable to update search history:',
            error,
          );
        }
      },
      [
        historyStorageKey,
        recentSearches,
      ],
    );


  /* ==========================================================
     CLEAR SEARCH HISTORY
  ========================================================== */

  const clearSearchHistory =
    useCallback(async () => {
      setRecentSearches([]);

      if (!historyStorageKey) {
        return;
      }

      try {
        await AsyncStorage.removeItem(
          historyStorageKey,
        );
      } catch (error) {
        console.warn(
          'Unable to clear search history:',
          error,
        );
      }
    }, [
      historyStorageKey,
    ]);


  /* ==========================================================
     LOAD USER RECORDS
  ========================================================== */

  const loadRecords =
    useCallback(
      async ({
        force = false,
      } = {}) => {
        if (!user?.uid) {
          setRecords([]);
          setLoadingRecords(false);
          return;
        }

        try {
          setRecordsError('');

          if (!refreshing) {
            setLoadingRecords(true);
          }

          const response =
            await getRecords(
              user.uid,
              {
                force,
              },
            );

          const nextRecords =
            Array.isArray(response)
              ? response
              : Array.isArray(
                    response?.results,
                  )
                ? response.results
                : Array.isArray(
                      response?.records,
                    )
                  ? response.records
                  : [];

          setRecords(
            nextRecords,
          );
        } catch (error) {
          console.warn(
            'Search records error:',
            error?.message ||
              error,
          );

          setRecordsError(
            error?.message ||
              'Unable to load your health records.',
          );

          setRecords([]);
        } finally {
          setLoadingRecords(
            false,
          );
        }
      },
      [
        refreshing,
        user?.uid,
      ],
    );


  /* ==========================================================
     LOCATION + NEARBY CARE
  ========================================================== */

  const loadNearbyCare =
    useCallback(
      async ({
        force = false,
        showPermissionPrompt = false,
      } = {}) => {
        try {
          setPlacesError('');
          setLocationDenied(false);

          setLocationLoading(true);

          if (showPermissionPrompt) {
            // This intentionally happens only when the
            // user asks for nearby care.
          }

          const existingPermission =
            await Location.getForegroundPermissionsAsync();

          let permission =
            existingPermission;

          if (
            permission.status !==
            'granted'
          ) {
            permission =
              await Location.requestForegroundPermissionsAsync();
          }

          if (
            permission.status !==
            'granted'
          ) {
            setLocationDenied(true);

            throw new Error(
              'Location permission is needed to find real healthcare locations near you.',
            );
          }

          let position =
            await Location.getLastKnownPositionAsync(
              {
                maxAge: force
                  ? 0
                  : 120000,

                requiredAccuracy: 1000,
              },
            );

          if (!position) {
            position =
              await Location.getCurrentPositionAsync(
                {
                  accuracy:
                    Location.Accuracy.Balanced,
                },
              );
          }

          const latitude =
            Number(
              position?.coords
                ?.latitude,
            );

          const longitude =
            Number(
              position?.coords
                ?.longitude,
            );

          if (
            !Number.isFinite(
              latitude,
            ) ||
            !Number.isFinite(
              longitude,
            )
          ) {
            throw new Error(
              'Your current location could not be determined.',
            );
          }

          setLoadingPlaces(true);

          const response =
            await getNearbyHealthcarePlaces(
              {
                lat: latitude,
                lng: longitude,
                radius:
                  HEALTHCARE_RADIUS_METERS,
              },
            );

          const nextPlaces =
            Array.isArray(
              response?.places,
            )
              ? response.places
              : [];

          setPlaces(
            nextPlaces,
          );
        } catch (error) {
          console.warn(
            'Nearby healthcare error:',
            error?.message ||
              error,
          );

          setPlacesError(
            error?.message ||
              'Unable to load nearby healthcare locations.',
          );

          if (
            String(
              error?.message ||
                '',
            )
              .toLowerCase()
              .includes(
                'permission',
              )
          ) {
            setLocationDenied(
              true,
            );
          }

          setPlaces([]);
        } finally {
          setLocationLoading(
            false,
          );

          setLoadingPlaces(
            false,
          );
        }
      },
      [],
    );


  /* ==========================================================
     INITIAL DATA
  ========================================================== */

  useEffect(() => {
    void loadRecords();
  }, [
    loadRecords,
  ]);


  /* ==========================================================
     ANIMATION
  ========================================================== */

  useEffect(() => {
    if (
      !loadingRecords
    ) {
      Animated.timing(
        fadeAnim,
        {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        },
      ).start();
    }
  }, [
    fadeAnim,
    loadingRecords,
  ]);


  /* ==========================================================
     REFRESH
  ========================================================== */

  const handleRefresh =
    useCallback(async () => {
      if (!user?.uid) {
        return;
      }

      setRefreshing(true);

      try {
        await Promise.all([
          loadRecords({
            force: true,
          }),

          places.length > 0
            ? loadNearbyCare({
                force: true,
                showPermissionPrompt:
                  false,
              })
            : Promise.resolve(),
        ]);
      } finally {
        setRefreshing(false);
      }
    }, [
      loadNearbyCare,
      loadRecords,
      places.length,
      user?.uid,
    ]);


  /* ==========================================================
     SEARCH SUBMIT
  ========================================================== */

  const handleSearchSubmit =
    useCallback(async () => {
      const query =
        safeText(
          searchQuery,
        );

      if (!query) {
        return;
      }

      await saveSearch(query);

      /*
       * If the user explicitly searches while
       * viewing Nearby Care, load real locations.
       */
      if (
        selectedFilter === 'care'
      ) {
        if (
          places.length === 0
        ) {
          await loadNearbyCare({
            force: false,
            showPermissionPrompt:
              true,
          });
        }
      }
    }, [
      loadNearbyCare,
      places.length,
      saveSearch,
      searchQuery,
      selectedFilter,
    ]);


  /* ==========================================================
     FILTERED RECORDS
  ========================================================== */

  const filteredRecords =
    useMemo(() => {
      const query =
        normalizeText(
          searchQuery,
        );

      return records.filter(
        record => {
          if (!query) {
            return true;
          }

          const searchable =
            [
              record?.symptoms,
              record?.symptom_summary,
              record?.symptom_text,
              record?.chief_complaint,
              record?.ai_summary,
              record?.summary,
              record?.explanation,
              record?.triage_level,
              record?.advice,
            ]
              .filter(Boolean)
              .join(' ')
              .toLowerCase();

          return searchable.includes(
            query,
          );
        },
      );
    }, [
      records,
      searchQuery,
    ]);


  /* ==========================================================
     FILTERED PLACES
  ========================================================== */

  const filteredPlaces =
    useMemo(() => {
      const query =
        normalizeText(
          searchQuery,
        );

      return places.filter(
        place => {
          if (!query) {
            return true;
          }

          return getPlaceSearchText(
            place,
          ).includes(query);
        },
      );
    }, [
      places,
      searchQuery,
    ]);


  /* ==========================================================
     RESULTS COUNT
  ========================================================== */

  const resultCount =
    selectedFilter === 'records'
      ? filteredRecords.length
      : selectedFilter === 'care'
        ? filteredPlaces.length
        : filteredRecords.length +
          filteredPlaces.length;


  /* ==========================================================
     RESULT LABEL
  ========================================================== */

  const resultLabel =
    searchQuery.trim()
      ? `${resultCount} result${
          resultCount === 1
            ? ''
            : 's'
        }`
      : selectedFilter ===
          'records'
        ? `${records.length} saved assessment${
            records.length === 1
              ? ''
              : 's'
          }`
        : selectedFilter ===
            'care'
          ? `${places.length} nearby location${
              places.length === 1
                ? ''
                : 's'
            }`
          : 'Your CareSense data';


  /* ==========================================================
     ACTION: OPEN RECORD
  ========================================================== */

  const openRecord =
    useCallback(
      record => {
        if (!record) {
          return;
        }

        navigation.navigate(
          'HealthRecordDetail',
          {
            result: record,
          },
        );
      },
      [navigation],
    );


  /* ==========================================================
     ACTION: OPEN MAPS
  ========================================================== */

  const openDirections =
    useCallback(
      async place => {
        const url =
          buildMapsUrl(
            place,
          );

        if (!url) {
          Alert.alert(
            'Directions unavailable',
            'This healthcare location did not provide enough location information to open directions.',
          );

          return;
        }

        try {
          await Linking.openURL(
            url,
          );
        } catch (error) {
          console.warn(
            'Unable to open Google Maps:',
            error,
          );

          Alert.alert(
            'Unable to open Maps',
            'Please try again or open Google Maps manually.',
          );
        }
      },
      [],
    );


  /* ==========================================================
     QUICK ACTIONS
  ========================================================== */

  const openSymptoms =
    useCallback(() => {
      navigation.navigate(
        'SymptomChecker',
      );
    }, [
      navigation,
    ]);


  const openDoctors =
    useCallback(() => {
      navigation.navigate(
        'Doctors',
      );
    }, [
      navigation,
    ]);


  const openAllRecords =
    useCallback(() => {
      navigation.navigate(
        'AllRecords',
      );
    }, [
      navigation,
    ]);


  /* ==========================================================
     REQUEST LOCATION
  ========================================================== */

  const handleEnableNearbyCare =
    useCallback(async () => {
      setSelectedFilter(
        'care',
      );

      await loadNearbyCare({
        force: true,
        showPermissionPrompt:
          true,
      });
    }, [
      loadNearbyCare,
    ]);


  /* ==========================================================
     SEARCH SCREEN CONTENT
  ========================================================== */

  const showInitialLoading =
    loadingRecords &&
    records.length === 0;


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
        translucent={false}
      />

      <ScrollView
        style={[
          styles.container,
          {
            backgroundColor:
              theme.background,
          },
        ]}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom:
              tabBarHeight +
              insets.bottom +
              38,
          },
        ]}
        showsVerticalScrollIndicator={
          false
        }
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={
              handleRefresh
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
              styles.headerCopy
            }
          >
            <View
              style={
                styles.headerEyebrow
              }
            >
              <View
                style={[
                  styles.headerPulse,
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
                CARESENSE EXPLORE
              </Text>
            </View>

            <Text
              style={[
                styles.headerTitle,
                {
                  color:
                    theme.textPrimary,
                },
              ]}
            >
              Search your health
            </Text>

            <Text
              style={[
                styles.headerSubtitle,
                {
                  color:
                    theme.textSecondary,
                },
              ]}
            >
              Find your saved assessments or real
              healthcare locations near you.
            </Text>
          </View>

          <View
            style={[
              styles.headerIcon,
              {
                backgroundColor:
                  theme.accentSoft,
                borderColor:
                  theme.accentBorder,
              },
            ]}
          >
            <Ionicons
              name="search-outline"
              size={21}
              color={
                theme.accent
              }
            />
          </View>
        </View>


        {/* ==================================================
            SEARCH BAR
        ================================================== */}

        <View
          style={[
            styles.searchBar,
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
              styles.searchIconBox,
              {
                backgroundColor:
                  theme.accentSoft,
              },
            ]}
          >
            <Ionicons
              name="search-outline"
              size={17}
              color={
                theme.accent
              }
            />
          </View>

          <TextInput
            value={
              searchQuery
            }
            onChangeText={
              setSearchQuery
            }
            onSubmitEditing={
              handleSearchSubmit
            }
            placeholder={
              'Search your records or nearby care...'
            }
            placeholderTextColor={
              theme.textMuted
            }
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            style={[
              styles.searchInput,
              {
                color:
                  theme.textPrimary,
              },
            ]}
            accessibilityLabel="Search health records or nearby healthcare"
          />

          {searchQuery.length >
            0 && (
            <Pressable
              onPress={() =>
                setSearchQuery(
                  '',
                )
              }
              hitSlop={10}
              style={
                styles.searchClear
              }
            >
              <Ionicons
                name="close-circle"
                size={19}
                color={
                  theme.textMuted
                }
              />
            </Pressable>
          )}
        </View>


        {/* ==================================================
            FILTERS
        ================================================== */}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.filterScroll
          }
        >
          {SEARCH_FILTERS.map(
            filter => {
              const active =
                selectedFilter ===
                filter.id;

              return (
                <Pressable
                  key={
                    filter.id
                  }
                  onPress={async () => {
                    setSelectedFilter(
                      filter.id,
                    );

                    if (
                      filter.id ===
                        'care' &&
                      places.length ===
                        0
                    ) {
                      await loadNearbyCare({
                        force: false,
                        showPermissionPrompt:
                          true,
                      });
                    }
                  }}
                  style={({ pressed }) => [
                    styles.filterChip,
                    {
                      backgroundColor:
                        active
                          ? theme.accent
                          : theme.card,

                      borderColor:
                        active
                          ? theme.accent
                          : theme.border,

                      opacity:
                        pressed
                          ? 0.78
                          : 1,
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      filter.icon
                    }
                    size={14}
                    color={
                      active
                        ? '#06110F'
                        : theme.textSecondary
                    }
                  />

                  <Text
                    style={[
                      styles.filterText,
                      {
                        color:
                          active
                            ? '#06110F'
                            : theme.textSecondary,
                      },
                    ]}
                  >
                    {
                      filter.label
                    }
                  </Text>
                </Pressable>
              );
            },
          )}
        </ScrollView>


        {/* ==================================================
            QUICK ACTIONS
        ================================================== */}

        {!searchQuery.trim() &&
          selectedFilter ===
            'all' && (
            <View
              style={
                styles.quickSection
              }
            >
              <View
                style={
                  styles.sectionHeading
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
                    Quick actions
                  </Text>

                  <Text
                    style={[
                      styles.sectionSubtitle,
                      {
                        color:
                          theme.textMuted,
                      },
                    ]}
                  >
                    Go straight to what you need
                  </Text>
                </View>
              </View>

              <View
                style={
                  styles.quickGrid
                }
              >
                <AnimatedPressable
                  onPress={
                    openSymptoms
                  }
                  style={[
                    styles.quickCard,
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
                      styles.quickIcon,
                      {
                        backgroundColor:
                          theme.accentSoft,
                      },
                    ]}
                  >
                    <Ionicons
                      name="pulse-outline"
                      size={21}
                      color={
                        theme.accent
                      }
                    />
                  </View>

                  <Text
                    style={[
                      styles.quickTitle,
                      {
                        color:
                          theme.textPrimary,
                      },
                    ]}
                  >
                    Check Symptoms
                  </Text>

                  <Text
                    style={[
                      styles.quickSubtitle,
                      {
                        color:
                          theme.textSecondary,
                      },
                    ]}
                  >
                    Start a new assessment
                  </Text>
                </AnimatedPressable>


                <AnimatedPressable
                  onPress={
                    openDoctors
                  }
                  style={[
                    styles.quickCard,
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
                      styles.quickIcon,
                      {
                        backgroundColor:
                          theme.accentSoft,
                      },
                    ]}
                  >
                    <Ionicons
                      name="location-outline"
                      size={21}
                      color={
                        theme.accent
                      }
                    />
                  </View>

                  <Text
                    style={[
                      styles.quickTitle,
                      {
                        color:
                          theme.textPrimary,
                      },
                    ]}
                  >
                    Find Care
                  </Text>

                  <Text
                    style={[
                      styles.quickSubtitle,
                      {
                        color:
                          theme.textSecondary,
                      },
                    ]}
                  >
                    View real nearby care
                  </Text>
                </AnimatedPressable>
              </View>
            </View>
          )}


        {/* ==================================================
            SEARCH HISTORY
        ================================================== */}

        {!searchQuery.trim() &&
          selectedFilter ===
            'all' &&
          recentSearches.length >
            0 && (
            <View
              style={
                styles.section
              }
            >
              <View
                style={
                  styles.sectionHeaderRow
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
                    Recent searches
                  </Text>

                  <Text
                    style={[
                      styles.sectionSubtitle,
                      {
                        color:
                          theme.textMuted,
                      },
                    ]}
                  >
                    Searches from this account
                  </Text>
                </View>

                <Pressable
                  onPress={
                    clearSearchHistory
                  }
                >
                  <Text
                    style={[
                      styles.sectionAction,
                      {
                        color:
                          theme.accent,
                      },
                    ]}
                  >
                    Clear
                  </Text>
                </Pressable>
              </View>

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
                {recentSearches.map(
                  (
                    item,
                    index,
                  ) => (
                    <View
                      key={
                        item.id ||
                        `${item.term}-${index}`
                      }
                      style={[
                        styles.historyRow,
                        index <
                          recentSearches.length -
                            1 && {
                          borderBottomWidth: 1,
                          borderBottomColor:
                            theme.borderSoft,
                        },
                      ]}
                    >
                      <Pressable
                        style={
                          styles.historyMain
                        }
                        onPress={() =>
                          setSearchQuery(
                            item.term,
                          )
                        }
                      >
                        <View
                          style={[
                            styles.historyIcon,
                            {
                              backgroundColor:
                                theme.cardAlt,
                            },
                          ]}
                        >
                          <Ionicons
                            name="time-outline"
                            size={16}
                            color={
                              theme.textSecondary
                            }
                          />
                        </View>

                        <Text
                          style={[
                            styles.historyText,
                            {
                              color:
                                theme.textPrimary,
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {item.term}
                        </Text>
                      </Pressable>

                      <Pressable
                        hitSlop={10}
                        onPress={() =>
                          removeRecentSearch(
                            item.id,
                          )
                        }
                        style={
                          styles.historyDelete
                        }
                      >
                        <Ionicons
                          name="close"
                          size={16}
                          color={
                            theme.textMuted
                          }
                        />
                      </Pressable>
                    </View>
                  ),
                )}
              </View>
            </View>
          )}


        {/* ==================================================
            INITIAL LOADING
        ================================================== */}

        {showInitialLoading && (
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
            <View
              style={[
                styles.loadingIcon,
                {
                  backgroundColor:
                    theme.accentSoft,
                },
              ]}
            >
              <ActivityIndicator
                size="small"
                color={
                  theme.accent
                }
              />
            </View>

            <Text
              style={[
                styles.loadingTitle,
                {
                  color:
                    theme.textPrimary,
                },
              ]}
            >
              Loading your health data
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
              Fetching assessments saved to your CareSense account.
            </Text>
          </View>
        )}


        {/* ==================================================
            ERROR
        ================================================== */}

        {!loadingRecords &&
          recordsError && (
            <View
              style={[
                styles.errorCard,
                {
                  backgroundColor:
                    theme.dangerSoft,
                  borderColor:
                    isDark
                      ? '#642A31'
                      : '#FECDD3',
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
                        theme.textPrimary,
                    },
                  ]}
                >
                  Could not load your records
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
                  {recordsError}
                </Text>

                <Pressable
                  onPress={() =>
                    loadRecords({
                      force: true,
                    })
                  }
                  style={
                    styles.retryButton
                  }
                >
                  <Text
                    style={[
                      styles.retryText,
                      {
                        color:
                          theme.accentText,
                      },
                    ]}
                  >
                    Try again
                  </Text>
                </Pressable>
              </View>
            </View>
          )}


        {/* ==================================================
            ACTIVE SEARCH RESULT HEADER
        ================================================== */}

        {(searchQuery.trim() ||
          selectedFilter !==
            'all') &&
          !showInitialLoading && (
            <View
              style={
                styles.resultHeader
              }
            >
              <View>
                <Text
                  style={[
                    styles.resultTitle,
                    {
                      color:
                        theme.textPrimary,
                    },
                  ]}
                >
                  {searchQuery.trim()
                    ? `Results for “${searchQuery.trim()}”`
                    : selectedFilter ===
                        'records'
                      ? 'My health records'
                      : 'Nearby healthcare'}
                </Text>

                <Text
                  style={[
                    styles.resultSubtitle,
                    {
                      color:
                        theme.textMuted,
                    },
                  ]}
                >
                  {resultLabel}
                </Text>
              </View>
            </View>
          )}


        {/* ==================================================
            RECORDS
        ================================================== */}

        {(selectedFilter ===
          'all' ||
          selectedFilter ===
            'records') &&
          !showInitialLoading && (
            <View
              style={
                styles.section
              }
            >
              <View
                style={
                  styles.sectionHeaderRow
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
                    {searchQuery.trim()
                      ? 'Matching assessments'
                      : 'Your health records'}
                  </Text>

                  {!searchQuery.trim() && (
                    <Text
                      style={[
                        styles.sectionSubtitle,
                        {
                          color:
                            theme.textMuted,
                        },
                      ]}
                    >
                      Saved assessments from your account
                    </Text>
                  )}
                </View>

                {records.length >
                  0 && (
                  <Pressable
                    onPress={
                      openAllRecords
                    }
                  >
                    <Text
                      style={[
                        styles.sectionAction,
                        {
                          color:
                            theme.accent,
                        },
                      ]}
                    >
                      View all
                    </Text>
                  </Pressable>
                )}
              </View>


              {filteredRecords.length >
              0 ? (
                filteredRecords
                  .slice(
                    0,
                    searchQuery.trim()
                      ? 20
                      : 5,
                  )
                  .map(
                    (
                      record,
                      index,
                    ) => {
                      const id =
                        getRecordId(
                          record,
                          index,
                        );

                      const triage =
                        getRecordTriage(
                          record,
                        );

                      const expanded =
                        expandedRecordId ===
                        id;

                      return (
                        <AnimatedPressable
                          key={
                            id
                          }
                          onPress={() =>
                            openRecord(
                              record,
                            )
                          }
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
                          <View
                            style={
                              styles.recordAccent
                            }
                          />

                          <View
                            style={
                              styles.recordContent
                            }
                          >
                            <View
                              style={
                                styles.recordTopRow
                              }
                            >
                              <View
                                style={
                                  styles.recordIcon
                                }
                              >
                                <Ionicons
                                  name="pulse-outline"
                                  size={18}
                                  color={
                                    theme.accent
                                  }
                                />
                              </View>

                              <View
                                style={
                                  styles.recordTitleCopy
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
                                    1
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
                                        theme.textMuted,
                                    },
                                  ]}
                                >
                                  {formatDate(
                                    getRecordDate(
                                      record,
                                    ),
                                  )}
                                </Text>
                              </View>

                              <View
                                style={[
                                  styles.triageBadge,
                                  {
                                    backgroundColor:
                                      isDark
                                        ? `${triage.color}1A`
                                        : triage.bg,
                                  },
                                ]}
                              >
                                <View
                                  style={[
                                    styles.triageDot,
                                    {
                                      backgroundColor:
                                        triage.color,
                                    },
                                  ]}
                                />

                                <Text
                                  style={[
                                    styles.triageText,
                                    {
                                      color:
                                        triage.color,
                                    },
                                  ]}
                                >
                                  {
                                    triage.label
                                  }
                                </Text>
                              </View>
                            </View>


                            <Text
                              style={[
                                styles.recordSummary,
                                {
                                  color:
                                    theme.textSecondary,
                                },
                              ]}
                              numberOfLines={
                                expanded
                                  ? undefined
                                  : 2
                              }
                            >
                              {getRecordSummary(
                                record,
                              )}
                            </Text>


                            <View
                              style={
                                styles.recordBottomRow
                              }
                            >
                              <Text
                                style={[
                                  styles.recordOpenText,
                                  {
                                    color:
                                      theme.accentText,
                                  },
                                ]}
                              >
                                View full assessment
                              </Text>

                              <Ionicons
                                name="arrow-forward"
                                size={16}
                                color={
                                  theme.accent
                                }
                              />
                            </View>

                            {expanded && (
                              <View
                                style={[
                                  styles.recordExpanded,
                                  {
                                    backgroundColor:
                                      theme.cardAlt,
                                    borderColor:
                                      theme.border,
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.recordExpandedText,
                                    {
                                      color:
                                        theme.textSecondary,
                                    },
                                  ]}
                                >
                                  This is a saved CareSense assessment. Open it to view the complete result, safety information, and available report actions.
                                </Text>
                              </View>
                            )}
                          </View>
                        </AnimatedPressable>
                      );
                    },
                  )
              ) : (
                <EmptyState
                  colors={
                    theme
                  }
                  icon="search-outline"
                  title={
                    searchQuery.trim()
                      ? 'No matching assessments'
                      : 'No health records yet'
                  }
                  text={
                    searchQuery.trim()
                      ? 'Try another search phrase or check Nearby Care.'
                      : 'Your completed CareSense assessments will appear here.'
                  }
                  actionLabel={
                    !searchQuery.trim()
                      ? 'Check Symptoms'
                      : null
                  }
                  onAction={
                    openSymptoms
                  }
                />
              )}
            </View>
          )}


        {/* ==================================================
            NEARBY CARE
        ================================================== */}

        {(selectedFilter ===
          'all' ||
          selectedFilter ===
            'care') && (
          <View
            style={
              styles.section
            }
          >
            <View
              style={
                styles.sectionHeaderRow
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
                  {searchQuery.trim()
                    ? 'Matching nearby care'
                    : 'Nearby healthcare'}
                </Text>

                <Text
                  style={[
                    styles.sectionSubtitle,
                    {
                      color:
                        theme.textMuted,
                    },
                  ]}
                >
                  Real locations from your current area
                </Text>
              </View>

              {places.length >
                0 && (
                <Pressable
                  onPress={
                    openDoctors
                  }
                >
                  <Text
                    style={[
                      styles.sectionAction,
                      {
                        color:
                          theme.accent,
                      },
                    ]}
                  >
                    View map
                  </Text>
                </Pressable>
              )}
            </View>


            {/* LOCATION NOT LOADED */}
            {places.length ===
              0 &&
              !locationLoading &&
              !loadingPlaces && (
                <View
                  style={[
                    styles.locationCard,
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
                      styles.locationIcon,
                      {
                        backgroundColor:
                          theme.accentSoft,
                      },
                    ]}
                  >
                    <Ionicons
                      name="location-outline"
                      size={22}
                      color={
                        theme.accent
                      }
                    />
                  </View>

                  <Text
                    style={[
                      styles.locationTitle,
                      {
                        color:
                          theme.textPrimary,
                      },
                    ]}
                  >
                    Find real care near you
                  </Text>

                  <Text
                    style={[
                      styles.locationText,
                      {
                        color:
                          theme.textSecondary,
                      },
                    ]}
                  >
                    CareSense can use your device location
                    to find real doctors, hospitals, and
                    clinics nearby. No placeholder locations
                    are shown.
                  </Text>

                  <Pressable
                    onPress={
                      handleEnableNearbyCare
                    }
                    style={({ pressed }) => [
                      styles.locationButton,
                      {
                        backgroundColor:
                          theme.accent,
                        opacity:
                          pressed
                            ? 0.82
                            : 1,
                      },
                    ]}
                  >
                    <Ionicons
                      name="locate-outline"
                      size={17}
                      color="#06110F"
                    />

                    <Text
                      style={
                        styles.locationButtonText
                      }
                    >
                      {locationDenied
                        ? 'Allow Location'
                        : 'Find Nearby Care'}
                    </Text>
                  </Pressable>

                  {placesError && (
                    <Text
                      style={[
                        styles.locationError,
                        {
                          color:
                            theme.textMuted,
                        },
                      ]}
                    >
                      {placesError}
                    </Text>
                  )}
                </View>
              )}


            {/* LOCATION LOADING */}
            {(locationLoading ||
              loadingPlaces) && (
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
                <View
                  style={[
                    styles.loadingIcon,
                    {
                      backgroundColor:
                        theme.accentSoft,
                    },
                  ]}
                >
                  <ActivityIndicator
                    size="small"
                    color={
                      theme.accent
                    }
                  />
                </View>

                <Text
                  style={[
                    styles.loadingTitle,
                    {
                      color:
                        theme.textPrimary,
                    },
                  ]}
                >
                  Finding real healthcare locations
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
                  Using your current location to search within
                  {` ${HEALTHCARE_RADIUS_METERS / 1000} `}
                  km.
                </Text>
              </View>
            )}


            {/* NEARBY RESULTS */}
            {!locationLoading &&
              !loadingPlaces &&
              filteredPlaces.length >
                0 &&
              filteredPlaces
                .slice(
                  0,
                  searchQuery.trim()
                    ? 20
                    : 5,
                )
                .map(
                  (
                    place,
                    index,
                  ) => {
                    const presentation =
                      getPlacePresentation(
                        place,
                      );

                    return (
                      <AnimatedPressable
                        key={
                          place?.id ||
                          place?.place_id ||
                          `${place?.name}-${index}`
                        }
                        onPress={() =>
                          openDirections(
                            place,
                          )
                        }
                        style={[
                          styles.placeCard,
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
                            styles.placeIcon,
                            {
                              backgroundColor:
                                isDark
                                  ? `${presentation.color}18`
                                  : `${presentation.color}12`,
                            },
                          ]}
                        >
                          <Ionicons
                            name={
                              presentation.icon
                            }
                            size={20}
                            color={
                              presentation.color
                            }
                          />
                        </View>

                        <View
                          style={
                            styles.placeContent
                          }
                        >
                          <View
                            style={
                              styles.placeTopRow
                            }
                          >
                            <Text
                              style={[
                                styles.placeName,
                                {
                                  color:
                                    theme.textPrimary,
                                },
                              ]}
                              numberOfLines={2}
                            >
                              {safeText(
                                place?.name,
                                'Healthcare location',
                              )}
                            </Text>

                            <Ionicons
                              name="navigate-outline"
                              size={17}
                              color={
                                theme.accent
                              }
                            />
                          </View>

                          <View
                            style={[
                              styles.placeType,
                              {
                                backgroundColor:
                                  theme.cardAlt,
                                borderColor:
                                  theme.border,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.placeTypeText,
                                {
                                  color:
                                    theme.textSecondary,
                                },
                              ]}
                            >
                              {
                                presentation.label
                              }
                            </Text>
                          </View>

                          {place?.address && (
                            <Text
                              style={[
                                styles.placeAddress,
                                {
                                  color:
                                    theme.textSecondary,
                                },
                              ]}
                              numberOfLines={2}
                            >
                              {String(
                                place.address,
                              )}
                            </Text>
                          )}

                          <View
                            style={
                              styles.placeMeta
                            }
                          >
                            {Number.isFinite(
                              Number(
                                place?.distance_meters ||
                                  place?.distance ||
                                  place?.distanceMeters,
                              ),
                            ) && (
                              <View
                                style={
                                  styles.placeMetaItem
                                }
                              >
                                <Ionicons
                                  name="walk-outline"
                                  size={13}
                                  color={
                                    theme.accent
                                  }
                                />

                                <Text
                                  style={[
                                    styles.placeMetaText,
                                    {
                                      color:
                                        theme.textMuted,
                                    },
                                  ]}
                                >
                                  {formatDistance(
                                    place?.distance_meters ||
                                      place?.distance ||
                                      place?.distanceMeters,
                                  )}
                                </Text>
                              </View>
                            )}

                            {place?.primary_type && (
                              <View
                                style={
                                  styles.placeMetaItem
                                }
                              >
                                <Ionicons
                                  name="information-circle-outline"
                                  size={13}
                                  color={
                                    theme.textMuted
                                  }
                                />

                                <Text
                                  style={[
                                    styles.placeMetaText,
                                    {
                                      color:
                                        theme.textMuted,
                                    },
                                  ]}
                                  numberOfLines={1}
                                >
                                  {humanizePlaceType(
                                    place.primary_type,
                                  )}
                                </Text>
                              </View>
                            )}
                          </View>

                          <Text
                            style={[
                              styles.placeActionText,
                              {
                                color:
                                  theme.accentText,
                              },
                            ]}
                          >
                            Open in Maps
                          </Text>
                        </View>
                      </AnimatedPressable>
                    );
                  },
                )}


            {/* NEARBY EMPTY */}
            {!locationLoading &&
              !loadingPlaces &&
              places.length >
                0 &&
              filteredPlaces.length ===
                0 && (
                <EmptyState
                  colors={
                    theme
                  }
                  icon="search-outline"
                  title="No nearby match"
                  text="No healthcare location in the current results matches your search."
                />
              )}


            {/* BACKEND ERROR */}
            {!locationLoading &&
              !loadingPlaces &&
              places.length ===
                0 &&
              placesError && (
                <View
                  style={[
                    styles.errorCard,
                    {
                      backgroundColor:
                        theme.dangerSoft,
                      borderColor:
                        isDark
                          ? '#642A31'
                          : '#FECDD3',
                    },
                  ]}
                >
                  <Ionicons
                    name="alert-circle-outline"
                    size={20}
                    color={
                      theme.danger
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
                            theme.textPrimary,
                        },
                      ]}
                    >
                      Nearby care is unavailable
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
                      {placesError}
                    </Text>

                    <Pressable
                      onPress={
                        handleEnableNearbyCare
                      }
                      style={
                        styles.retryButton
                      }
                    >
                      <Text
                        style={[
                          styles.retryText,
                          {
                            color:
                              theme.accentText,
                          },
                        ]}
                      >
                        Try location again
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}
          </View>
        )}


        {/* ==================================================
            NO GLOBAL RESULTS
        ================================================== */}

        {!showInitialLoading &&
          searchQuery.trim() &&
          selectedFilter ===
            'all' &&
          filteredRecords.length ===
            0 &&
          filteredPlaces.length ===
            0 && (
            <EmptyState
              colors={
                theme
              }
              icon="search-outline"
              title="Nothing matched your search"
              text="Try a different phrase, or switch to Nearby Care to search real healthcare locations around you."
              actionLabel="Find Nearby Care"
              onAction={
                handleEnableNearbyCare
              }
            />
          )}


        {/* ==================================================
            USER SAFETY FOOTER
        ================================================== */}

        <View
          style={[
            styles.footerNotice,
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
              styles.footerIcon,
              {
                backgroundColor:
                  theme.accentSoft,
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
          </View>

          <View
            style={
              styles.footerCopy
            }
          >
            <Text
              style={[
                styles.footerTitle,
                {
                  color:
                    theme.textPrimary,
                },
              ]}
            >
              Your data, your search
            </Text>

            <Text
              style={[
                styles.footerText,
                {
                  color:
                    theme.textSecondary,
                },
              ]}
            >
              Personal results come from your authenticated
              CareSense account. Nearby care results come
              from real location data returned by the
              healthcare service.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}


/* ============================================================
   HUMANIZE PLACE TYPE
============================================================ */

function humanizePlaceType(
  value,
) {
  return safeText(
    value,
    'Healthcare',
  )
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char =>
      char.toUpperCase(),
    );
}


/* ============================================================
   EMPTY STATE
============================================================ */

function EmptyState({
  colors,
  icon,
  title,
  text,
  actionLabel,
  onAction,
}) {
  return (
    <View
      style={[
        styles.emptyCard,
        {
          backgroundColor:
            colors.card,
          borderColor:
            colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.emptyIcon,
          {
            backgroundColor:
              colors.cardAlt,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={24}
          color={
            colors.textMuted
          }
        />
      </View>

      <Text
        style={[
          styles.emptyTitle,
          {
            color:
              colors.textPrimary,
          },
        ]}
      >
        {title}
      </Text>

      <Text
        style={[
          styles.emptyText,
          {
            color:
              colors.textSecondary,
          },
        ]}
      >
        {text}
      </Text>

      {actionLabel &&
        onAction && (
          <Pressable
            onPress={
              onAction
            }
            style={({ pressed }) => [
              styles.emptyAction,
              {
                backgroundColor:
                  colors.accent,

                opacity:
                  pressed
                    ? 0.8
                    : 1,
              },
            ]}
          >
            <Text
              style={
                styles.emptyActionText
              }
            >
              {actionLabel}
            </Text>
          </Pressable>
        )}
    </View>
  );
}


/* ============================================================
   STYLES
============================================================ */

const styles =
  StyleSheet.create({
    /* --------------------------------------------------------
       ROOT
    -------------------------------------------------------- */

    safeArea: {
      flex: 1,
    },

    container: {
      flex: 1,
    },

    content: {
      paddingHorizontal: 18,
      paddingTop: 14,
    },


    /* --------------------------------------------------------
       HEADER
    -------------------------------------------------------- */

    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent:
        'space-between',
      marginBottom: 18,
    },

    headerCopy: {
      flex: 1,
      paddingRight: 14,
    },

    headerEyebrow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
      gap: 7,
    },

    headerPulse: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },

    headerEyebrowText: {
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 1,
    },

    headerTitle: {
      fontSize: 28,
      lineHeight: 34,
      fontWeight: '850',
      letterSpacing: -0.7,
    },

    headerSubtitle: {
      fontSize: 12.5,
      lineHeight: 19,
      marginTop: 5,
    },

    headerIcon: {
      width: 46,
      height: 46,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },


    /* --------------------------------------------------------
       SEARCH BAR
    -------------------------------------------------------- */

    searchBar: {
      minHeight: 56,
      borderWidth: 1,
      borderRadius: 17,
      paddingHorizontal: 9,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 13,

      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 4,
          },
          shadowOpacity: 0.06,
          shadowRadius: 12,
        },

        android: {
          elevation: 2,
        },
      }),
    },

    searchIconBox: {
      width: 36,
      height: 36,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
    },

    searchInput: {
      flex: 1,
      minHeight: 42,
      fontSize: 13,
      fontWeight: '550',
      paddingVertical: 0,
    },

    searchClear: {
      padding: 7,
    },


    /* --------------------------------------------------------
       FILTERS
    -------------------------------------------------------- */

    filterScroll: {
      gap: 8,
      paddingBottom: 19,
    },

    filterChip: {
      minHeight: 39,
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },

    filterText: {
      fontSize: 11,
      fontWeight: '750',
    },


    /* --------------------------------------------------------
       SECTIONS
    -------------------------------------------------------- */

    section: {
      marginBottom: 19,
    },

    quickSection: {
      marginBottom: 5,
    },

    sectionHeading: {
      marginBottom: 10,
    },

    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      marginBottom: 10,
    },

    sectionTitle: {
      fontSize: 15,
      fontWeight: '850',
      letterSpacing: -0.2,
    },

    sectionSubtitle: {
      fontSize: 9.5,
      lineHeight: 15,
      marginTop: 2,
    },

    sectionAction: {
      fontSize: 10.5,
      fontWeight: '800',
    },


    /* --------------------------------------------------------
       QUICK ACTIONS
    -------------------------------------------------------- */

    quickGrid: {
      flexDirection: 'row',
      gap: 9,
    },

    quickCard: {
      flex: 1,
      minHeight: 126,
      borderWidth: 1,
      borderRadius: 18,
      padding: 13,
    },

    quickIcon: {
      width: 37,
      height: 37,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },

    quickTitle: {
      fontSize: 12,
      fontWeight: '850',
      marginBottom: 4,
    },

    quickSubtitle: {
      fontSize: 9.5,
      lineHeight: 14,
    },


    /* --------------------------------------------------------
       HISTORY
    -------------------------------------------------------- */

    historyCard: {
      borderWidth: 1,
      borderRadius: 17,
      overflow: 'hidden',
    },

    historyRow: {
      minHeight: 54,
      paddingHorizontal: 11,
      flexDirection: 'row',
      alignItems: 'center',
    },

    historyMain: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },

    historyIcon: {
      width: 31,
      height: 31,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 9,
    },

    historyText: {
      flex: 1,
      fontSize: 11.5,
      fontWeight: '650',
    },

    historyDelete: {
      padding: 8,
    },


    /* --------------------------------------------------------
       LOADING
    -------------------------------------------------------- */

    loadingCard: {
      borderWidth: 1,
      borderRadius: 19,
      padding: 18,
      marginBottom: 17,
      alignItems: 'center',
    },

    loadingIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },

    loadingTitle: {
      fontSize: 13,
      fontWeight: '800',
      marginBottom: 4,
      textAlign: 'center',
    },

    loadingText: {
      fontSize: 10.5,
      lineHeight: 16,
      textAlign: 'center',
      maxWidth: 290,
    },


    /* --------------------------------------------------------
       ERRORS
    -------------------------------------------------------- */

    errorCard: {
      borderWidth: 1,
      borderRadius: 18,
      padding: 13,
      marginBottom: 16,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 9,
    },

    errorCopy: {
      flex: 1,
    },

    errorTitle: {
      fontSize: 11.5,
      fontWeight: '800',
      marginBottom: 3,
    },

    errorText: {
      fontSize: 10,
      lineHeight: 15,
    },

    retryButton: {
      alignSelf: 'flex-start',
      marginTop: 7,
    },

    retryText: {
      fontSize: 10.5,
      fontWeight: '850',
    },


    /* --------------------------------------------------------
       RESULTS HEADER
    -------------------------------------------------------- */

    resultHeader: {
      marginBottom: 12,
    },

    resultTitle: {
      fontSize: 17,
      lineHeight: 22,
      fontWeight: '850',
    },

    resultSubtitle: {
      fontSize: 10,
      marginTop: 3,
    },


    /* --------------------------------------------------------
       RECORD CARD
    -------------------------------------------------------- */

    recordCard: {
      borderWidth: 1,
      borderRadius: 18,
      marginBottom: 9,
      overflow: 'hidden',
    },

    recordAccent: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 3,
      backgroundColor:
        '#00D4C5',
    },

    recordContent: {
      padding: 13,
      paddingLeft: 15,
    },

    recordTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    recordIcon: {
      width: 36,
      height: 36,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        '#0E282D',
    },

    recordTitleCopy: {
      flex: 1,
      marginLeft: 9,
      marginRight: 7,
    },

    recordTitle: {
      fontSize: 12.5,
      lineHeight: 17,
      fontWeight: '800',
    },

    recordDate: {
      fontSize: 9.5,
      marginTop: 2,
    },

    triageBadge: {
      minHeight: 26,
      borderRadius: 999,
      paddingHorizontal: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },

    triageDot: {
      width: 5,
      height: 5,
      borderRadius: 3,
    },

    triageText: {
      fontSize: 8.5,
      fontWeight: '850',
    },

    recordSummary: {
      fontSize: 10.5,
      lineHeight: 16,
      marginTop: 11,
    },

    recordBottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'flex-end',
      gap: 5,
      marginTop: 10,
    },

    recordOpenText: {
      fontSize: 9.5,
      fontWeight: '800',
    },

    recordExpanded: {
      borderWidth: 1,
      borderRadius: 11,
      padding: 9,
      marginTop: 10,
    },

    recordExpandedText: {
      fontSize: 9.5,
      lineHeight: 15,
    },


    /* --------------------------------------------------------
       LOCATION CARD
    -------------------------------------------------------- */

    locationCard: {
      borderWidth: 1,
      borderRadius: 20,
      padding: 17,
      marginBottom: 10,
      alignItems: 'flex-start',
    },

    locationIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 11,
    },

    locationTitle: {
      fontSize: 14,
      fontWeight: '850',
      marginBottom: 4,
    },

    locationText: {
      fontSize: 10.5,
      lineHeight: 16,
    },

    locationButton: {
      minHeight: 44,
      borderRadius: 13,
      paddingHorizontal: 13,
      marginTop: 13,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },

    locationButtonText: {
      color: '#06110F',
      fontSize: 11,
      fontWeight: '850',
    },

    locationError: {
      fontSize: 9.5,
      lineHeight: 15,
      marginTop: 8,
    },


    /* --------------------------------------------------------
       PLACE CARD
    -------------------------------------------------------- */

    placeCard: {
      borderWidth: 1,
      borderRadius: 18,
      padding: 12,
      marginBottom: 9,
      flexDirection: 'row',
    },

    placeIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },

    placeContent: {
      flex: 1,
    },

    placeTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 7,
    },

    placeName: {
      flex: 1,
      fontSize: 12.5,
      lineHeight: 17,
      fontWeight: '800',
    },

    placeType: {
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 7,
      paddingVertical: 4,
      marginTop: 6,
    },

    placeTypeText: {
      fontSize: 8.5,
      fontWeight: '750',
    },

    placeAddress: {
      fontSize: 9.5,
      lineHeight: 15,
      marginTop: 6,
    },

    placeMeta: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: 7,
    },

    placeMetaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },

    placeMetaText: {
      fontSize: 8.5,
      maxWidth: 150,
    },

    placeActionText: {
      fontSize: 9.5,
      fontWeight: '850',
      marginTop: 8,
    },


    /* --------------------------------------------------------
       EMPTY
    -------------------------------------------------------- */

    emptyCard: {
      borderWidth: 1,
      borderRadius: 20,
      padding: 20,
      alignItems: 'center',
      marginBottom: 12,
    },

    emptyIcon: {
      width: 53,
      height: 53,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },

    emptyTitle: {
      fontSize: 13,
      fontWeight: '850',
      textAlign: 'center',
      marginBottom: 5,
    },

    emptyText: {
      fontSize: 10.5,
      lineHeight: 16,
      textAlign: 'center',
      maxWidth: 300,
    },

    emptyAction: {
      minHeight: 42,
      borderRadius: 12,
      paddingHorizontal: 13,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 12,
    },

    emptyActionText: {
      color: '#06110F',
      fontSize: 10.5,
      fontWeight: '850',
    },


    /* --------------------------------------------------------
       FOOTER
    -------------------------------------------------------- */

    footerNotice: {
      borderWidth: 1,
      borderRadius: 17,
      padding: 12,
      marginTop: 4,
      flexDirection: 'row',
      alignItems: 'flex-start',
    },

    footerIcon: {
      width: 34,
      height: 34,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 9,
    },

    footerCopy: {
      flex: 1,
    },

    footerTitle: {
      fontSize: 10.5,
      fontWeight: '850',
      marginBottom: 3,
    },

    footerText: {
      fontSize: 9,
      lineHeight: 14,
    },
  });