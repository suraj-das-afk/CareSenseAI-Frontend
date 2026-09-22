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
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  useColorScheme,
  Animated,
  Linking,
  RefreshControl,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';

import MapView, {
  Marker,
  Callout,
  PROVIDER_GOOGLE,
} from 'react-native-maps';

import * as Location from 'expo-location';

import {
  getNearbyHealthcarePlaces,
} from '../services/api';

/* ============================================================
   THEME
============================================================ */

const BRAND = {
  cyan: '#00D4C5',
  cyanDark: '#00B3A6',
  yellow: '#F59E0B',
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

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  const query = encodeURIComponent(
    place?.name ||
      `${lat},${lng}`,
  );

  return `https://www.google.com/maps/search/?api=1&query=${query}`;
};

/* ============================================================
   MAIN SCREEN
============================================================ */

export default function SearchScreen({
  navigation,
}) {
  const isDark =
    useColorScheme() === 'dark';

  const theme = useMemo(
    () => getTheme(isDark),
    [isDark],
  );

  const mapRef = useRef(null);
  const loadedOnceRef = useRef(false);
  const lastLoadRef = useRef(0);

  const fadeAnim = useRef(
    new Animated.Value(0),
  ).current;

  const slideAnim = useRef(
    new Animated.Value(18),
  ).current;

  const [searchQuery, setSearchQuery] =
    useState('');

  const [selectedFilter, setSelectedFilter] =
    useState('all');

  const [places, setPlaces] =
    useState([]);

  const [selectedPlaceId, setSelectedPlaceId] =
    useState(null);

  const [coordinates, setCoordinates] =
    useState(null);

  const [mapRegion, setMapRegion] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState('');

  const [locationPermissionDenied, setLocationPermissionDenied] =
    useState(false);

  const [mapExpanded, setMapExpanded] =
    useState(false);

  /* ==========================================================
     ENTRANCE ANIMATION
  ========================================================== */

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
              duration: 350,
              useNativeDriver: true,
            },
          ),

          Animated.timing(
            slideAnim,
            {
              toValue: 0,
              duration: 400,
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
     LOCATION
  ========================================================== */

  const getCurrentUserLocation =
    useCallback(async () => {
      setLocationPermissionDenied(false);

      const permission =
        await Location.requestForegroundPermissionsAsync();

      if (permission.status !== 'granted') {
        setLocationPermissionDenied(true);

        throw new Error(
          'Location permission is required to find healthcare providers near you.',
        );
      }

      let position =
        await Location.getLastKnownPositionAsync({
          maxAge: 120000,
          requiredAccuracy: 1000,
        });

      if (!position) {
        position =
          await Location.getCurrentPositionAsync({
            accuracy:
              Location.Accuracy.Balanced,
          });
      }

      const nextCoordinates = {
        latitude:
          position.coords.latitude,
        longitude:
          position.coords.longitude,
      };

      setCoordinates(
        nextCoordinates,
      );

      const nextRegion = {
        ...nextCoordinates,
        latitudeDelta: 0.06,
        longitudeDelta: 0.06,
      };

      setMapRegion(nextRegion);

      return nextCoordinates;
    }, []);

  /* ==========================================================
     LOAD REAL HEALTHCARE DATA
  ========================================================== */

  const loadNearbyPlaces =
    useCallback(
      async ({
        force = false,
      } = {}) => {
        const now = Date.now();

        if (
          !force &&
          lastLoadRef.current > 0 &&
          now - lastLoadRef.current <
            60 * 1000 &&
          loadedOnceRef.current
        ) {
          return;
        }

        try {
          setError('');

          if (!force) {
            setLoading(true);
          }

          const userLocation =
            await getCurrentUserLocation();

          const response =
            await getNearbyHealthcarePlaces({
              lat:
                userLocation.latitude,
              lng:
                userLocation.longitude,
              radius:
                DEFAULT_RADIUS_METERS,
            });

          const returnedPlaces =
            Array.isArray(response?.places)
              ? response.places
              : [];

          setPlaces(
            returnedPlaces,
          );

          loadedOnceRef.current = true;
          lastLoadRef.current =
            Date.now();

          if (
            response?.location &&
            !mapRegion
          ) {
            const nextRegion = {
              latitude:
                response.location.latitude,
              longitude:
                response.location.longitude,
              latitudeDelta: 0.06,
              longitudeDelta: 0.06,
            };

            setMapRegion(
              nextRegion,
            );
          }
        } catch (loadError) {
          if (__DEV__) {
            console.warn(
              'Nearby healthcare search error:',
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
      [
        getCurrentUserLocation,
        mapRegion,
      ],
    );

  /* ==========================================================
     INITIAL LOAD
  ========================================================== */

  useFocusEffect(
    useCallback(() => {
      void loadNearbyPlaces();

      return undefined;
    }, [loadNearbyPlaces]),
  );

  /* ==========================================================
     REFRESH
  ========================================================== */

  const handleRefresh =
    useCallback(() => {
      setRefreshing(true);

      void loadNearbyPlaces({
        force: true,
      });
    }, [loadNearbyPlaces]);

  /* ==========================================================
     FILTERED RESULTS
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

          const searchableText =
            [
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
     SELECT PLACE
  ========================================================== */

  const selectPlace =
    useCallback(
      place => {
        setSelectedPlaceId(
          place.id,
        );

        const latitude =
          Number(place.latitude);

        const longitude =
          Number(place.longitude);

        if (
          !Number.isFinite(
            latitude,
          ) ||
          !Number.isFinite(
            longitude,
          )
        ) {
          return;
        }

        mapRef.current?.animateToRegion(
          {
            latitude,
            longitude,
            latitudeDelta:
              0.015,
            longitudeDelta:
              0.015,
          },
          450,
        );
      },
      [],
    );

  /* ==========================================================
     OPEN GOOGLE MAPS
  ========================================================== */

  const openDirections =
    useCallback(
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
          await Linking.openURL(
            url,
          );
        } catch (openError) {
          if (__DEV__) {
            console.warn(
              'Unable to open Maps:',
              openError?.message ||
                'Unknown error.',
            );
          }
        }
      },
      [],
    );

  /* ==========================================================
     CENTER ON USER
  ========================================================== */

  const centerOnUser =
    useCallback(() => {
      if (!coordinates) {
        return;
      }

      mapRef.current?.animateToRegion(
        {
          ...coordinates,
          latitudeDelta:
            0.06,
          longitudeDelta:
            0.06,
        },
        450,
      );
    }, [coordinates]);

  /* ==========================================================
     SELECTED MARKER COLOR
  ========================================================== */

  const getMarkerColor =
    place => {
      const presentation =
        getPlacePresentation(
          place,
        );

      return presentation.color;
    };

  const mapHeight =
    mapExpanded
      ? 360
      : 245;

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
            paddingBottom: 130,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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
          />
        }
      >
        {/* ======================================================
            HEADER
        ====================================================== */}

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
            accessibilityRole="button"
            accessibilityLabel="Center map on my location"
            onPress={
              centerOnUser
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
              color={
                theme.accent
              }
            />
          </TouchableOpacity>
        </View>

        {/* ======================================================
            SEARCH
        ====================================================== */}

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
            value={
              searchQuery
            }
            onChangeText={
              setSearchQuery
            }
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />

          {searchQuery.length >
          0 ? (
            <TouchableOpacity
              onPress={() =>
                setSearchQuery('')
              }
              hitSlop={{
                top: 10,
                right: 10,
                bottom: 10,
                left: 10,
              }}
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

        {/* ======================================================
            FILTERS
        ====================================================== */}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.filtersRow
          }
        >
          {FILTERS.map(
            filter => {
              const selected =
                selectedFilter ===
                filter.id;

              return (
                <TouchableOpacity
                  key={
                    filter.id
                  }
                  activeOpacity={
                    0.82
                  }
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
                    name={
                      filter.icon
                    }
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
                    {
                      filter.label
                    }
                  </Text>
                </TouchableOpacity>
              );
            },
          )}
        </ScrollView>

        {/* ======================================================
            LOCATION STATUS
        ====================================================== */}

        {locationPermissionDenied ? (
          <View
            style={[
              styles.notice,
              {
                backgroundColor:
                  theme.dangerBg,
                borderColor:
                  theme.border,
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
                styles.noticeBody
              }
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
                Location permission needed
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
                CareSense needs your location to find nearby healthcare providers.
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() =>
                void loadNearbyPlaces({
                  force: true,
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

        {/* ======================================================
            ERROR
        ====================================================== */}

        {error &&
        !locationPermissionDenied ? (
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
              color={
                theme.dangerText
              }
            />

            <View
              style={
                styles.noticeBody
              }
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
                numberOfLines={3}
              >
                {error}
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() =>
                void loadNearbyPlaces({
                  force: true,
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

        {/* ======================================================
            MAP
        ====================================================== */}

        <View
          style={styles.mapHeader}
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
              Nearby Healthcare
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
              Based on your current location
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() =>
              setMapExpanded(
                current =>
                  !current,
              )
            }
          >
            <Text
              style={[
                styles.mapActionText,
                {
                  color:
                    theme.accent,
                },
              ]}
            >
              {mapExpanded
                ? 'Collapse'
                : 'Expand'}
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.mapCard,
            {
              height:
                mapHeight,
              borderColor:
                theme.border,
              backgroundColor:
                theme.card,
            },
          ]}
        >
          {mapRegion ? (
            <>
              <MapView
                ref={mapRef}
                provider={
                  PROVIDER_GOOGLE
                }
                style={
                  styles.map
                }
                initialRegion={
                  mapRegion
                }
                showsUserLocation
                showsMyLocationButton={
                  false
                }
                showsCompass
                loadingEnabled
                onPress={() =>
                  setSelectedPlaceId(
                    null,
                  )
                }
              >
                {filteredPlaces.map(
                  place => {
                    const latitude =
                      Number(
                        place.latitude,
                      );

                    const longitude =
                      Number(
                        place.longitude,
                      );

                    if (
                      !Number.isFinite(
                        latitude,
                      ) ||
                      !Number.isFinite(
                        longitude,
                      )
                    ) {
                      return null;
                    }

                    return (
                      <Marker
                        key={
                          place.id
                        }
                        coordinate={{
                          latitude,
                          longitude,
                        }}
                        pinColor={getMarkerColor(
                          place,
                        )}
                        onPress={() =>
                          setSelectedPlaceId(
                            place.id,
                          )
                        }
                      >
                        <Callout
                          onPress={() =>
                            openDirections(
                              place,
                            )
                          }
                        >
                          <View
                            style={
                              styles.callout
                            }
                          >
                            <Text
                              style={
                                styles.calloutTitle
                              }
                              numberOfLines={
                                2
                              }
                            >
                              {
                                place.name
                              }
                            </Text>

                            <Text
                              style={
                                styles.calloutMeta
                              }
                            >
                              {
                                getPlacePresentation(
                                  place,
                                ).label
                              }
                            </Text>

                            <Text
                              style={
                                styles.calloutAddress
                              }
                              numberOfLines={
                                2
                              }
                            >
                              {
                                place.address
                              }
                            </Text>

                            <Text
                              style={
                                styles.calloutAction
                              }
                            >
                              Open in Google Maps
                            </Text>
                          </View>
                        </Callout>
                      </Marker>
                    );
                  },
                )}
              </MapView>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={
                  centerOnUser
                }
                style={[
                  styles.mapLocateButton,
                  {
                    backgroundColor:
                      theme.card,
                    borderColor:
                      theme.border,
                  },
                ]}
              >
                <Ionicons
                  name="locate-outline"
                  size={21}
                  color={
                    theme.accent
                  }
                />
              </TouchableOpacity>

              <View
                style={[
                  styles.mapAttribution,
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
                    styles.mapAttributionText,
                    {
                      color:
                        theme.textSecondary,
                    },
                  ]}
                >
                  Healthcare data from Google Maps
                </Text>
              </View>
            </>
          ) : (
            <View
              style={[
                styles.mapLoading,
                {
                  backgroundColor:
                    theme.card,
                },
              ]}
            >
              <ActivityIndicator
                size="large"
                color={
                  theme.accent
                }
              />

              <Text
                style={[
                  styles.mapLoadingTitle,
                  {
                    color:
                      theme.textPrimary,
                  },
                ]}
              >
                Finding your location...
              </Text>

              <Text
                style={[
                  styles.mapLoadingText,
                  {
                    color:
                      theme.textSecondary,
                  },
                ]}
              >
                CareSense is looking for nearby healthcare locations.
              </Text>
            </View>
          )}
        </View>

        {/* ======================================================
            RESULTS HEADER
        ====================================================== */}

        <View
          style={
            styles.resultsHeader
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
            color={
              theme.accent
            }
          />
        </View>

        {/* ======================================================
            LOADING
        ====================================================== */}

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
              color={
                theme.accent
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
              Please wait while CareSense loads real nearby locations.
            </Text>
          </View>
        ) : null}

        {/* ======================================================
            EMPTY RESULTS
        ====================================================== */}

        {!loading &&
        filteredPlaces.length ===
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
              Try another filter or search term. CareSense only displays healthcare locations returned by the live provider search.
            </Text>
          </View>
        ) : null}

        {/* ======================================================
            PLACE CARDS
        ====================================================== */}

        {filteredPlaces.map(
          place => {
            const presentation =
              getPlacePresentation(
                place,
              );

            const selected =
              selectedPlaceId ===
              place.id;

            return (
              <TouchableOpacity
                key={
                  place.id
                }
                activeOpacity={
                  0.86
                }
                onPress={() =>
                  selectPlace(
                    place,
                  )
                }
                style={[
                  styles.placeCard,
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
                  style={
                    styles.placeTopRow
                  }
                >
                  <View
                    style={[
                      styles.placeIcon,
                      {
                        backgroundColor:
                          selected
                            ? theme.selectedBg
                            : theme.mutedBg,
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
                      {
                        place.name
                      }
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
                    {
                      place.address
                    }
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
                      color={
                        theme.accent
                      }
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
                    activeOpacity={
                      0.82
                    }
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
                      Directions
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          },
        )}

        {/* ======================================================
            SOURCE NOTE
        ====================================================== */}

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
              Results are live healthcare locations returned from Google Places. Appointment availability and individual doctor schedules are not inferred.
            </Text>
          </View>
        ) : null}
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
    alignItems: 'center',
    justifyContent:
      'space-between',
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

  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },

  sectionSubtitle: {
    fontSize: 11,
    marginTop: 3,
  },

  mapActionText: {
    fontSize: 12,
    fontWeight: '800',
  },

  mapCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 24,
  },

  map: {
    width: '100%',
    height: '100%',
  },

  mapLocateButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 42,
    height: 42,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  mapAttribution: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  mapAttributionText: {
    fontSize: 9,
    fontWeight: '600',
  },

  mapLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },

  mapLoadingTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 12,
  },

  mapLoadingText: {
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 5,
  },

  callout: {
    width: 230,
    padding: 12,
  },

  calloutTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },

  calloutMeta: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00A89D',
    marginTop: 3,
  },

  calloutAddress: {
    fontSize: 10,
    lineHeight: 15,
    color: '#64748B',
    marginTop: 5,
  },

  calloutAction: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2166F3',
    marginTop: 8,
  },

  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
    marginBottom: 14,
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
    justifyContent:
      'space-between',
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