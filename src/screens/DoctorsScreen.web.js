import React, {
  useCallback,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';

import Ionicons from '@expo/vector-icons/Ionicons';

import {
  getNearbyHealthcarePlaces,
} from '../services/api';

/* ============================================================
   THEME
============================================================ */

const BRAND = {
  cyan: '#00D4C5',
  red: '#EF4444',
  green: '#10B981',

  darkBg: '#090E17',
  darkCard: '#131C2A',
  darkBorder: '#1F2C3F',

  lightBg: '#F8FAF9',
  lightCard: '#FFFFFF',
  lightBorder: '#E2E8F0',
};

const getTheme = isDark => ({
  background: isDark
    ? BRAND.darkBg
    : BRAND.lightBg,

  card: isDark
    ? BRAND.darkCard
    : BRAND.lightCard,

  border: isDark
    ? BRAND.darkBorder
    : BRAND.lightBorder,

  textPrimary: isDark
    ? '#FFFFFF'
    : '#0F172A',

  textSecondary: isDark
    ? '#8292A6'
    : '#64748B',

  inputBg: isDark
    ? '#131C2A'
    : '#FFFFFF',

  accent: BRAND.cyan,

  selectedBg: isDark
    ? '#0C272C'
    : '#E6FBF9',

  mutedBg: isDark
    ? '#111827'
    : '#F1F5F9',

  dangerBg: isDark
    ? '#2C1518'
    : '#FEE2E2',

  dangerText: isDark
    ? '#FCA5A5'
    : '#B91C1C',
});

/* ============================================================
   FILTERS
============================================================ */

const FILTERS = [
  {
    id: 'all',
    label: 'All',
    icon: 'apps-outline',
  },
  {
    id: 'doctor',
    label: 'Doctors',
    icon: 'person-outline',
  },
  {
    id: 'hospital',
    label: 'Hospitals',
    icon: 'business-outline',
  },
  {
    id: 'clinic',
    label: 'Clinics',
    icon: 'medkit-outline',
  },
];

/* ============================================================
   HELPERS
============================================================ */

const DEFAULT_RADIUS_METERS = 5000;

const getPlacePresentation = place => {
  switch (place?.category) {
    case 'doctor':
      return {
        label: 'Doctor / Practice',
        icon: 'person-outline',
        color: BRAND.cyan,
      };

    case 'hospital':
      return {
        label: 'Hospital',
        icon: 'business-outline',
        color: BRAND.red,
      };

    case 'clinic':
      return {
        label: 'Clinic',
        icon: 'medkit-outline',
        color: BRAND.green,
      };

    default:
      return {
        label: 'Healthcare',
        icon: 'medical-outline',
        color: BRAND.cyan,
      };
  }
};

const formatDistance = meters => {
  const value = Number(meters);

  if (!Number.isFinite(value)) {
    return 'Distance unavailable';
  }

  if (value < 1000) {
    return `${Math.round(value)} m away`;
  }

  return `${(value / 1000).toFixed(1)} km away`;
};

const buildFallbackMapsUrl = place => {
  const lat = Number(place?.latitude);
  const lng = Number(place?.longitude);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    return null;
  }

  const query = encodeURIComponent(
    place?.name ||
      `${lat},${lng}`,
  );

  return `https://www.google.com/maps/search/?api=1&query=${query}`;
};

/* ============================================================
   WEB SCREEN
============================================================ */

export default function SearchScreen() {
  const isDark =
    useColorScheme() === 'dark';

  const theme = useMemo(
    () => getTheme(isDark),
    [isDark],
  );

  const [searchQuery, setSearchQuery] =
    useState('');

  const [selectedFilter, setSelectedFilter] =
    useState('all');

  const [places, setPlaces] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState('');

  /* ==========================================================
     LOAD HEALTHCARE DATA
  ========================================================== */

  const loadPlaces = useCallback(
    async ({
      forceLocation = false,
    } = {}) => {
      try {
        setError('');

        if (!navigator?.geolocation) {
          throw new Error(
            'Location is not available in this browser.',
          );
        }

        if (!refreshing) {
          setLoading(true);
        }

        const position =
          await new Promise(
            (resolve, reject) => {
              navigator.geolocation.getCurrentPosition(
                resolve,
                reject,
                {
                  enableHighAccuracy: true,
                  timeout: 15000,
                  maximumAge:
                    forceLocation
                      ? 0
                      : 120000,
                },
              );
            },
          );

        const latitude =
          position.coords.latitude;

        const longitude =
          position.coords.longitude;

        const response =
          await getNearbyHealthcarePlaces({
            lat: latitude,
            lng: longitude,
            radius:
              DEFAULT_RADIUS_METERS,
          });

        setPlaces(
          Array.isArray(
            response?.places,
          )
            ? response.places
            : [],
        );
      } catch (loadError) {
        if (__DEV__) {
          console.warn(
            'Web healthcare search error:',
            loadError?.message ||
              'Request failed.',
          );
        }

        setError(
          loadError?.message ||
            'Unable to load nearby healthcare locations.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [refreshing],
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);

    void loadPlaces({
      forceLocation: true,
    });
  }, [loadPlaces]);

  /* ==========================================================
     FILTER
  ========================================================== */

  const filteredPlaces =
    useMemo(() => {
      const query =
        searchQuery
          .trim()
          .toLowerCase();

      return places.filter(
        place => {
          const categoryMatches =
            selectedFilter === 'all' ||
            place?.category ===
              selectedFilter;

          if (!categoryMatches) {
            return false;
          }

          if (!query) {
            return true;
          }

          const searchableText = [
            place?.name,
            place?.address,
            place?.primary_type,
            place?.category,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

          return searchableText.includes(
            query,
          );
        },
      );
    }, [
      places,
      searchQuery,
      selectedFilter,
    ]);

  /* ==========================================================
     OPEN MAPS
  ========================================================== */

  const openDirections = useCallback(
    async place => {
      const url =
        place?.google_maps_uri ||
        buildFallbackMapsUrl(
          place,
        );

      if (!url) {
        return;
      }

      try {
        await Linking.openURL(url);
      } catch (openError) {
        if (__DEV__) {
          console.warn(
            'Unable to open Google Maps:',
            openError?.message ||
              'Unknown error.',
          );
        }
      }
    },
    [],
  );

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <ScrollView
      style={[
        styles.safeArea,
        {
          backgroundColor:
            theme.background,
        },
      ]}
      contentContainerStyle={[
        styles.content,
        {
          paddingBottom: 80,
        },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={theme.accent}
        />
      }
    >
      {/* HEADER */}

      <View style={styles.header}>
        <View
          style={
            styles.headerText
          }
        >
          <Text
            style={[
              styles.title,
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
              styles.subtitle,
              {
                color:
                  theme.textSecondary,
              },
            ]}
          >
            Real healthcare locations near you
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() =>
            void loadPlaces({
              forceLocation: true,
            })
          }
          style={[
            styles.locationButton,
            {
              backgroundColor:
                theme.mutedBg,
              borderColor:
                theme.border,
            },
          ]}
        >
          <Ionicons
            name="navigate-outline"
            size={20}
            color={theme.accent}
          />
        </TouchableOpacity>
      </View>

      {/* SEARCH */}

      <View
        style={[
          styles.searchContainer,
          {
            backgroundColor:
              theme.inputBg,
            borderColor:
              theme.border,
          },
        ]}
      >
        <Ionicons
          name="search-outline"
          size={20}
          color={
            theme.textSecondary
          }
        />

        <TextInput
          placeholder="Search doctors, hospitals, clinics..."
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
          value={searchQuery}
          onChangeText={
            setSearchQuery
          }
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />

        {searchQuery.length > 0 ? (
          <TouchableOpacity
            onPress={() =>
              setSearchQuery('')
            }
          >
            <Ionicons
              name="close-circle"
              size={19}
              color={
                theme.textSecondary
              }
            />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* FILTERS */}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.filtersRow
        }
      >
        {FILTERS.map(filter => {
          const selected =
            selectedFilter ===
            filter.id;

          return (
            <TouchableOpacity
              key={filter.id}
              activeOpacity={0.82}
              onPress={() =>
                setSelectedFilter(
                  filter.id,
                )
              }
              style={[
                styles.filterChip,
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
                name={filter.icon}
                size={15}
                color={
                  selected
                    ? theme.accent
                    : theme.textSecondary
                }
              />

              <Text
                style={[
                  styles.filterText,
                  {
                    color:
                      selected
                        ? theme.accent
                        : theme.textSecondary,
                  },
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* WEB MAP NOTICE */}

      <View
        style={[
          styles.webMapCard,
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
            styles.webMapIcon,
            {
              backgroundColor:
                theme.selectedBg,
            },
          ]}
        >
          <Ionicons
            name="map-outline"
            size={30}
            color={theme.accent}
          />
        </View>

        <Text
          style={[
            styles.webMapTitle,
            {
              color:
                theme.textPrimary,
            },
          ]}
        >
          Map available in the Android app
        </Text>

        <Text
          style={[
            styles.webMapText,
            {
              color:
                theme.textSecondary,
            },
          ]}
        >
          The mobile app uses the native Google Maps
          experience with your live location and
          healthcare markers. The web version keeps
          provider search available without loading
          the native map module.
        </Text>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() =>
            void loadPlaces({
              forceLocation: true,
            })
          }
          style={[
            styles.loadButton,
            {
              backgroundColor:
                theme.accent,
            },
          ]}
        >
          <Ionicons
            name="location-outline"
            size={17}
            color="#0A0F1A"
          />

          <Text
            style={
              styles.loadButtonText
            }
          >
            Find Nearby Care
          </Text>
        </TouchableOpacity>
      </View>

      {/* ERROR */}

      {error ? (
        <View
          style={[
            styles.notice,
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
            color={theme.dangerText}
          />

          <View
            style={styles.noticeBody}
          >
            <Text
              style={[
                styles.noticeTitle,
                {
                  color:
                    theme.textPrimary,
                },
              ]}
            >
              Couldn't load nearby care
            </Text>

            <Text
              style={[
                styles.noticeText,
                {
                  color:
                    theme.textSecondary,
                },
              ]}
            >
              {error}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() =>
              void loadPlaces({
                forceLocation: true,
              })
            }
          >
            <Text
              style={[
                styles.retryText,
                {
                  color:
                    theme.accent,
                },
              ]}
            >
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* RESULTS HEADER */}

      <View
        style={styles.resultsHeader}
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
            {selectedFilter ===
            'all'
              ? 'Healthcare Near You'
              : FILTERS.find(
                  item =>
                    item.id ===
                    selectedFilter,
                )?.label ||
                'Healthcare'}
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
            {filteredPlaces.length}{' '}
            location
            {filteredPlaces.length ===
            1
              ? ''
              : 's'}{' '}
            found within 5 km
          </Text>
        </View>

        <Ionicons
          name="shield-checkmark-outline"
          size={20}
          color={theme.accent}
        />
      </View>

      {/* LOADING */}

      {loading &&
      places.length === 0 ? (
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
            color={theme.accent}
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
            Searching nearby healthcare
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
            Please wait while CareSense loads
            real nearby locations.
          </Text>
        </View>
      ) : null}

      {/* EMPTY */}

      {!loading &&
      filteredPlaces.length ===
        0 &&
      !error ? (
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
            name="search-outline"
            size={34}
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
            No nearby locations found
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
            Try another filter or search term.
          </Text>
        </View>
      ) : null}

      {/* PLACE CARDS */}

      {filteredPlaces.map(place => {
        const presentation =
          getPlacePresentation(
            place,
          );

        return (
          <TouchableOpacity
            key={place.id}
            activeOpacity={0.86}
            onPress={() =>
              void openDirections(
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
              style={
                styles.placeTopRow
              }
            >
              <View
                style={[
                  styles.placeIcon,
                  {
                    backgroundColor:
                      theme.mutedBg,
                  },
                ]}
              >
                <Ionicons
                  name={
                    presentation.icon
                  }
                  size={22}
                  color={
                    presentation.color
                  }
                />
              </View>

              <View
                style={
                  styles.placeBody
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
                  numberOfLines={
                    2
                  }
                >
                  {place.name}
                </Text>

                <Text
                  style={[
                    styles.placeType,
                    {
                      color:
                        presentation.color,
                    },
                  ]}
                >
                  {
                    presentation.label
                  }
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={19}
                color={
                  theme.textSecondary
                }
              />
            </View>

            <View
              style={
                styles.placeMetaRow
              }
            >
              <Ionicons
                name="location-outline"
                size={15}
                color={
                  theme.textSecondary
                }
              />

              <Text
                style={[
                  styles.placeAddress,
                  {
                    color:
                      theme.textSecondary,
                  },
                ]}
                numberOfLines={
                  2
                }
              >
                {place.address}
              </Text>
            </View>

            <View
              style={
                styles.placeBottomRow
              }
            >
              <View
                style={
                  styles.distanceRow
                }
              >
                <Ionicons
                  name="navigate-outline"
                  size={14}
                  color={theme.accent}
                />

                <Text
                  style={[
                    styles.distanceText,
                    {
                      color:
                        theme.textSecondary,
                    },
                  ]}
                >
                  {formatDistance(
                    place.distance_meters,
                  )}
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.82}
                onPress={event => {
                  event.stopPropagation?.();

                  void openDirections(
                    place,
                  );
                }}
                style={[
                  styles.directionButton,
                  {
                    backgroundColor:
                      theme.accent,
                  },
                ]}
              >
                <Ionicons
                  name="navigate-outline"
                  size={15}
                  color="#0A0F1A"
                />

                <Text
                  style={
                    styles.directionButtonText
                  }
                >
                  Open Maps
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        );
      })}

      {/* SOURCE NOTE */}

      {places.length > 0 ? (
        <View
          style={[
            styles.sourceNote,
            {
              backgroundColor:
                theme.mutedBg,
            },
          ]}
        >
          <Ionicons
            name="information-circle-outline"
            size={17}
            color={
              theme.textSecondary
            }
          />

          <Text
            style={[
              styles.sourceNoteText,
              {
                color:
                  theme.textSecondary,
              },
            ]}
          >
            Results are live healthcare locations
            returned from Google Places. Appointment
            availability and individual doctor schedules
            are not inferred.
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

/* ============================================================
   STYLES
============================================================ */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },

  headerText: {
    flex: 1,
    paddingRight: 12,
  },

  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.4,
  },

  subtitle: {
    fontSize: 13,
    marginTop: 4,
  },

  locationButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchContainer: {
    minHeight: 52,
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 14,
    gap: 9,
  },

  searchInput: {
    flex: 1,
    fontSize: 14,
    minHeight: 50,
  },

  filtersRow: {
    gap: 9,
    paddingBottom: 20,
  },

  filterChip: {
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  filterText: {
    fontSize: 12,
    fontWeight: '700',
  },

  webMapCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 22,
    marginBottom: 24,
    alignItems: 'center',
  },

  webMapIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  webMapTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },

  webMapText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 620,
  },

  loadButton: {
    minHeight: 42,
    borderRadius: 11,
    paddingHorizontal: 16,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  loadButtonText: {
    color: '#0A0F1A',
    fontSize: 12,
    fontWeight: '900',
  },

  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
    borderRadius: 15,
    borderWidth: 1,
    marginBottom: 16,
    gap: 10,
  },

  noticeBody: {
    flex: 1,
  },

  noticeTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 3,
  },

  noticeText: {
    fontSize: 11,
    lineHeight: 16,
  },

  retryText: {
    fontSize: 12,
    fontWeight: '800',
  },

  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },

  sectionSubtitle: {
    fontSize: 11,
    marginTop: 3,
  },

  emptyCard: {
    borderRadius: 17,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingVertical: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 11,
  },

  emptyText: {
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 7,
  },

  placeCard: {
    borderRadius: 17,
    borderWidth: 1,
    padding: 15,
    marginBottom: 12,
  },

  placeTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  placeIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  placeBody: {
    flex: 1,
    marginLeft: 11,
    paddingRight: 8,
  },

  placeName: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
  },

  placeType: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },

  placeMetaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    gap: 6,
  },

  placeAddress: {
    flex: 1,
    fontSize: 11,
    lineHeight: 17,
  },

  placeBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#222E40',
  },

  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },

  distanceText: {
    fontSize: 11,
    fontWeight: '700',
  },

  directionButton: {
    minHeight: 36,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },

  directionButtonText: {
    color: '#0A0F1A',
    fontSize: 11,
    fontWeight: '900',
  },

  sourceNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 13,
    padding: 12,
    marginTop: 5,
    gap: 8,
  },

  sourceNoteText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 15,
  },
});