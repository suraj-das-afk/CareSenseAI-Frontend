import React, {
  useState,
  useContext,
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
  Image,
  Switch,
  useColorScheme,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Linking,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

import { AuthContext } from '../context/AuthContext';
import { uploadProfileImage } from '../services/cloudinary';


/* ============================================================
   LOCAL SETTINGS
============================================================ */

const STORAGE_KEY = '@caresense_user_settings_v2';


/* ============================================================
   EXISTING CARESENSE THEME
   DO NOT CHANGE
============================================================ */

const BRAND = {
  cyan: '#00D4C5',
  cyanDark: '#00B3A6',
  red: '#EF4444',

  darkBg: '#0A0F1A',
  darkCard: '#141C29',
  darkBorder: '#222E40',

  lightBg: '#F8F9FB',
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
    : '#111827',

  textSecondary: isDark
    ? '#8897AE'
    : '#64748B',

  inputBg: isDark
    ? '#1C2738'
    : '#F1F5F9',

  accent: BRAND.cyan,

  switchTrackActive: isDark
    ? '#00B3A6'
    : BRAND.cyan,

  switchTrackInactive: isDark
    ? '#222E40'
    : '#E2E8F0',

  logoutBtnBg: isDark
    ? 'rgba(239, 68, 68, 0.08)'
    : '#FEF2F2',

  logoutBtnBorder: BRAND.red,

  logoutBtnText: BRAND.red,
});


/* ============================================================
   HELPERS
============================================================ */

const formatValue = (
  value,
  fallback = 'Not set',
) => {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return fallback;
  }

  return String(value);
};


const normalizeDateOfBirth = value => {
  if (!value) {
    return null;
  }

  const cleaned = String(value)
    .trim()
    .replace(/[.\-]/g, '/');

  const parts = cleaned.split('/');

  let day;
  let month;
  let year;

  // DD/MM/YYYY
  if (
    parts.length === 3 &&
    parts[0].length <= 2 &&
    parts[1].length <= 2 &&
    parts[2].length === 4
  ) {
    day = Number(parts[0]);
    month = Number(parts[1]);
    year = Number(parts[2]);
  }

  // YYYY/MM/DD
  else if (
    parts.length === 3 &&
    parts[0].length === 4
  ) {
    year = Number(parts[0]);
    month = Number(parts[1]);
    day = Number(parts[2]);
  }

  else {
    return null;
  }

  const date = new Date(
    year,
    month - 1,
    day,
  );

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return [
    String(year),
    String(month).padStart(2, '0'),
    String(day).padStart(2, '0'),
  ].join('-');
};


const formatDateOfBirthForDisplay = value => {
  if (!value) {
    return '';
  }

  const normalized =
    normalizeDateOfBirth(value);

  if (!normalized) {
    return String(value);
  }

  const [
    year,
    month,
    day,
  ] = normalized.split('-');

  return `${day}/${month}/${year}`;
};


const calculateAge = dateOfBirth => {
  if (!dateOfBirth) {
    return null;
  }

  const birthDate = new Date(
    `${dateOfBirth}T00:00:00`,
  );

  if (Number.isNaN(birthDate.getTime())) {
    return null;
  }

  const today = new Date();

  let age =
    today.getFullYear() -
    birthDate.getFullYear();

  const monthDifference =
    today.getMonth() -
    birthDate.getMonth();

  if (
    monthDifference < 0 ||
    (
      monthDifference === 0 &&
      today.getDate() < birthDate.getDate()
    )
  ) {
    age -= 1;
  }

  return age >= 0 ? age : null;
};


const getInitials = name => {
  const cleanName =
    String(name || '')
      .trim();

  if (!cleanName) {
    return 'U';
  }

  const parts =
    cleanName.split(/\s+/);

  if (parts.length === 1) {
    return parts[0]
      .charAt(0)
      .toUpperCase();
  }

  return (
    parts[0].charAt(0) +
    parts[parts.length - 1].charAt(0)
  ).toUpperCase();
};


const parseNumberOrNull = value => {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ''
  ) {
    return null;
  }

  const parsed =
    Number(String(value).trim());

  return Number.isFinite(parsed)
    ? parsed
    : null;
};


/* ============================================================
   REUSABLE COMPONENTS
============================================================ */

function SectionHeader({
  title,
  actionLabel,
  actionIcon,
  actionColor,
  onAction,
  theme,
}) {
  return (
    <View style={styles.sectionHeaderRow}>
      <Text
        style={[
          styles.sectionTitle,
          {
            color: theme.textPrimary,
          },
        ]}
      >
        {title}
      </Text>

      {onAction && (
        <TouchableOpacity
          onPress={onAction}
          activeOpacity={0.75}
          style={styles.actionBtn}
        >
          <Ionicons
            name={actionIcon}
            size={18}
            color={actionColor || theme.accent}
          />

          <Text
            style={[
              styles.actionBtnText,
              {
                color:
                  actionColor ||
                  theme.accent,
              },
            ]}
          >
            {actionLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}


function InfoRow({
  icon,
  label,
  value,
  theme,
  last = false,
}) {
  return (
    <View
      style={[
        styles.infoRow,
        {
          borderBottomColor:
            theme.border,
          borderBottomWidth:
            last ? 0 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.infoIcon,
          {
            backgroundColor:
              theme.inputBg,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={18}
          color={theme.accent}
        />
      </View>

      <View style={styles.infoText}>
        <Text
          style={[
            styles.infoLabel,
            {
              color:
                theme.textSecondary,
            },
          ]}
        >
          {label}
        </Text>

        <Text
          style={[
            styles.infoValue,
            {
              color:
                theme.textPrimary,
            },
          ]}
          numberOfLines={3}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}


function SettingRow({
  icon,
  title,
  subtitle,
  theme,
  children,
}) {
  return (
    <View
      style={[
        styles.settingRow,
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
          styles.settingIcon,
          {
            backgroundColor:
              theme.inputBg,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={19}
          color={theme.accent}
        />
      </View>

      <View style={styles.settingTextContainer}>
        <Text
          style={[
            styles.settingTitle,
            {
              color:
                theme.textPrimary,
            },
          ]}
        >
          {title}
        </Text>

        <Text
          style={[
            styles.settingSub,
            {
              color:
                theme.textSecondary,
            },
          ]}
        >
          {subtitle}
        </Text>
      </View>

      {children}
    </View>
  );
}


/* ============================================================
   SETTINGS SCREEN
============================================================ */

export default function SettingsScreen() {

  const authContext =
    useContext(AuthContext) || {};

  const {
    user,
    profile,
    profileLoading,
    profileError,

    refreshProfile,
    saveProfile,

    fullName,
    profilePhoto,

    isBiometricsEnabled,
    toggleBiometrics,

    logout,
  } = authContext;


  /* ==========================================================
     THEME
  ========================================================== */

  const systemColorScheme =
    useColorScheme();

  const isDark =
    systemColorScheme === 'dark';

  const theme =
    useMemo(
      () => getTheme(isDark),
      [isDark],
    );


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


  /*
   * Keep animation ref stable.
   */
  useEffect(() => {
    return () => {
      fadeAnim.stopAnimation();
      slideAnim.stopAnimation();
    };
  }, [
    fadeAnim,
    slideAnim,
  ]);


  /* ==========================================================
     LOCAL APP PREFERENCES
  ========================================================== */

  const [
    notifications,
    setNotifications,
  ] = useState(true);

  const [
    dataSharing,
    setDataSharing,
  ] = useState(false);

  const [
    devices,
    setDevices,
  ] = useState([]);


  /* ==========================================================
     PROFILE PHOTO
  ========================================================== */

  const [
    previewPhoto,
    setPreviewPhoto,
  ] = useState(null);


  /* ==========================================================
     HEALTH EDIT MODAL
  ========================================================== */

  const [
    healthModalVisible,
    setHealthModalVisible,
  ] = useState(false);


  const [
    healthForm,
    setHealthForm,
  ] = useState({
    date_of_birth: '',
    gender: '',
    height_cm: '',
    weight_kg: '',
    blood_type: '',
    medical_conditions: '',
    current_medications: '',
    allergies: '',
  });


  /* ==========================================================
     EMERGENCY CONTACT MODAL
  ========================================================== */

  const [
    contactModalVisible,
    setContactModalVisible,
  ] = useState(false);


  const [
    contactForm,
    setContactForm,
  ] = useState({
    name: '',
    phone: '',
    relation: '',
  });


  /* ==========================================================
     DEVICE MODAL
  ========================================================== */

  const [
    deviceModalVisible,
    setDeviceModalVisible,
  ] = useState(false);

  const [
    newDeviceName,
    setNewDeviceName,
  ] = useState('');


  /* ==========================================================
     LOADING STATES
  ========================================================== */

  const [
    savingHealth,
    setSavingHealth,
  ] = useState(false);

  const [
    savingContact,
    setSavingContact,
  ] = useState(false);

  const [
    profileRefreshing,
    setProfileRefreshing,
  ] = useState(false);


  /* ==========================================================
     PROFILE REFRESH GUARD
  ========================================================== */

  const hasLoadedProfile =
    useRef(false);


  /* ==========================================================
     LOAD DEVICE SETTINGS
  ========================================================== */

  useEffect(() => {

    const loadLocalSettings =
      async () => {

        try {

          const raw =
            await AsyncStorage.getItem(
              STORAGE_KEY,
            );

          if (!raw) {
            return;
          }

          const parsed =
            JSON.parse(raw);

          if (
            typeof parsed.notifications ===
            'boolean'
          ) {
            setNotifications(
              parsed.notifications,
            );
          }

          if (
            typeof parsed.dataSharing ===
            'boolean'
          ) {
            setDataSharing(
              parsed.dataSharing,
            );
          }

          if (
            Array.isArray(
              parsed.devices,
            )
          ) {
            setDevices(
              parsed.devices,
            );
          }

        } catch (error) {

          console.error(
            'Failed to load local settings:',
            error,
          );
        }
      };

    void loadLocalSettings();

  }, []);


  /* ==========================================================
     LOCAL SETTINGS PERSISTENCE
  ========================================================== */

  const persistLocalSettings =
    useCallback(
      async updatedValues => {

        try {

          const existing =
            await AsyncStorage.getItem(
              STORAGE_KEY,
            );

          const parsed =
            existing
              ? JSON.parse(existing)
              : {};

          await AsyncStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
              ...parsed,

              notifications:
                notifications,

              dataSharing:
                dataSharing,

              devices:
                devices,

              ...updatedValues,
            }),
          );

        } catch (error) {

          console.error(
            'Failed to persist local settings:',
            error,
          );
        }
      },
      [
        notifications,
        dataSharing,
        devices,
      ],
    );


  /* ==========================================================
     PROFILE DATA
  ========================================================== */

  const currentProfile =
    profile || {};

  const effectivePhoto =
    previewPhoto ||
    profilePhoto ||
    null;

  const displayName =
    fullName ||
    user?.displayName ||
    user?.name ||
    user?.email?.split('@')[0] ||
    'User';

  const initials =
    getInitials(displayName);

  const age =
    calculateAge(
      currentProfile.date_of_birth,
    );


  /* ==========================================================
     PROFILE COMPLETION
  ========================================================== */

  const completionFields = [
    currentProfile.first_name ||
      user?.displayName,

    currentProfile.date_of_birth,

    currentProfile.gender,

    currentProfile.height_cm,

    currentProfile.weight_kg,

    currentProfile.blood_type,

    currentProfile.allergies !==
      undefined,

    currentProfile.emergency_contact_name,
  ];

  const completedFields =
    completionFields.filter(
      value =>
        value !== null &&
        value !== undefined &&
        value !== '',
    ).length;

  const profileCompletion =
    Math.round(
      (
        completedFields /
        completionFields.length
      ) * 100,
    );


  /* ==========================================================
     SYNC FORM FROM PROFILE
  ========================================================== */

  useEffect(() => {

    setHealthForm({
    date_of_birth:
      formatDateOfBirthForDisplay(
        currentProfile.date_of_birth,
      ),

      gender:
        currentProfile.gender ||
        '',

      height_cm:
        currentProfile.height_cm !==
        null &&
        currentProfile.height_cm !==
        undefined
          ? String(
              currentProfile.height_cm,
            )
          : '',

      weight_kg:
        currentProfile.weight_kg !==
        null &&
        currentProfile.weight_kg !==
        undefined
          ? String(
              currentProfile.weight_kg,
            )
          : '',

      blood_type:
        currentProfile.blood_type ||
        '',

      medical_conditions:
        currentProfile.medical_conditions ||
        '',

      current_medications:
        currentProfile.current_medications ||
        '',

      allergies:
        currentProfile.allergies ||
        '',
    });


    setContactForm({
      name:
        currentProfile.emergency_contact_name ||
        '',

      phone:
        currentProfile.emergency_contact_phone ||
        '',

      relation:
        currentProfile.emergency_contact_relation ||
        '',
    });

  }, [
    currentProfile.date_of_birth,
    currentProfile.gender,
    currentProfile.height_cm,
    currentProfile.weight_kg,
    currentProfile.blood_type,
    currentProfile.medical_conditions,
    currentProfile.current_medications,
    currentProfile.allergies,
    currentProfile.emergency_contact_name,
    currentProfile.emergency_contact_phone,
    currentProfile.emergency_contact_relation,
  ]);


  /* ==========================================================
     FOCUS / PROFILE REFRESH
  ========================================================== */

  useFocusEffect(
    useCallback(() => {

      fadeAnim.setValue(0);
      slideAnim.setValue(18);

      Animated.parallel([
        Animated.timing(
          fadeAnim,
          {
            toValue: 1,
            duration: 280,
            useNativeDriver: true,
          },
        ),

        Animated.timing(
          slideAnim,
          {
            toValue: 0,
            duration: 320,
            useNativeDriver: true,
          },
        ),
      ]).start();


      /*
       * AuthContext already loads the profile.
       * Do not hit the API on every tab focus.
       */
      if (
        !hasLoadedProfile.current &&
        refreshProfile
      ) {

        hasLoadedProfile.current =
          true;

        void refreshProfile();
      }

      return undefined;

    }, [
      fadeAnim,
      slideAnim,
      refreshProfile,
    ]),
  );


  /* ==========================================================
     MANUAL PROFILE REFRESH
  ========================================================== */

  const handleRefreshProfile =
    useCallback(async () => {

      if (!refreshProfile) {
        return;
      }

      try {

        setProfileRefreshing(true);

        await refreshProfile();

      } catch (error) {

        console.error(
          'Profile refresh failed:',
          error,
        );

      } finally {

        setProfileRefreshing(false);
      }

    }, [
      refreshProfile,
    ]);


  /* ==========================================================
     PROFILE PHOTO PICKER
  ========================================================== */

  const handlePickImage =
    useCallback(async () => {

      try {

        const permission =
          await ImagePicker
            .requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {

          Alert.alert(
            'Photo Permission',
            'CareSense needs photo-library permission only when you choose a profile picture.',
          );

          return;
        }


        const result =
          await ImagePicker
            .launchImageLibraryAsync({
              mediaTypes:
                ImagePicker
                  .MediaTypeOptions
                  .Images,

              allowsEditing:
                true,

              aspect:
                [1, 1],

              quality:
                0.85,
            });


        if (
          result.canceled ||
          !result.assets?.length
        ) {
          return;
        }


        const selectedUri =
          result.assets[0].uri;


        /*
        * Show the selected image immediately.
        */
        setPreviewPhoto(
          selectedUri,
        );


        /*
        * Upload to Cloudinary.
        */
        const uploaded =
          await uploadProfileImage(
            selectedUri,
          );


        /*
        * Save the permanent HTTPS URL
        * in the CareSense backend.
        */
        await saveProfile({
          profile_photo_url:
            uploaded.secure_url,
        });


        /*
        * The backend is now the source of truth.
        */
        setPreviewPhoto(null);


        Alert.alert(
          'Profile Photo Updated',
          'Your profile picture has been saved and will sync across your devices.',
        );

      } catch (error) {

        console.error(
          'Profile photo update error:',
          error,
        );

        /*
        * Remove the temporary local preview
        * when upload/save fails.
        */
        setPreviewPhoto(null);


        Alert.alert(
          'Photo Update Failed',
          error?.message ||
            'Unable to update your profile picture right now.',
        );
      }

    }, [
      saveProfile,
    ]);


  /* ==========================================================
     SAVE HEALTH PROFILE
  ========================================================== */

  const handleSaveHealth =
    useCallback(async () => {

      if (!saveProfile) {
        return;
      }


      const enteredDate =
        healthForm.date_of_birth.trim();

      const dateOfBirth =
        enteredDate
          ? normalizeDateOfBirth(
              enteredDate,
            )
          : null;


      if (
        enteredDate &&
        !dateOfBirth
      ) {
        Alert.alert(
          'Invalid Date',
          'Please enter a valid date such as 18/09/2003.',
        );

        return;
      }


      const height =
        parseNumberOrNull(
          healthForm.height_cm,
        );

      const weight =
        parseNumberOrNull(
          healthForm.weight_kg,
        );


      if (
        height !== null &&
        (height < 30 || height > 300)
      ) {

        Alert.alert(
          'Invalid Height',
          'Please enter a height between 30 and 300 cm.',
        );

        return;
      }


      if (
        weight !== null &&
        (weight < 1 || weight > 500)
      ) {

        Alert.alert(
          'Invalid Weight',
          'Please enter a weight between 1 and 500 kg.',
        );

        return;
      }


      try {

        setSavingHealth(true);

        await saveProfile({
          date_of_birth:
            dateOfBirth || null,

          gender:
            healthForm.gender.trim(),

          height_cm:
            height,

          weight_kg:
            weight,

          blood_type:
            healthForm.blood_type
              .trim()
              .toUpperCase(),

          medical_conditions:
            healthForm.medical_conditions
              .trim(),

          current_medications:
            healthForm.current_medications
              .trim(),

          allergies:
            healthForm.allergies
              .trim(),
        });


        setHealthModalVisible(
          false,
        );

        Alert.alert(
          'Profile Updated',
          'Your health information has been securely saved.',
        );

      } catch (error) {

        Alert.alert(
          'Unable to Save',
          error?.message ||
            'Your profile could not be updated right now.',
        );

      } finally {

        setSavingHealth(false);
      }

    }, [
      healthForm,
      saveProfile,
    ]);


  /* ==========================================================
     SAVE EMERGENCY CONTACT
  ========================================================== */

  const handleSaveContact =
    useCallback(async () => {

      if (!saveProfile) {
        return;
      }


      const name =
        contactForm.name.trim();

      const phone =
        contactForm.phone.trim();

      const relation =
        contactForm.relation.trim();


      if (!name || !phone) {

        Alert.alert(
          'Missing Information',
          'Please provide the emergency contact name and phone number.',
        );

        return;
      }


      try {

        setSavingContact(true);

        await saveProfile({
          emergency_contact_name:
            name,

          emergency_contact_phone:
            phone,

          emergency_contact_relation:
            relation ||
            'Emergency Contact',
        });


        setContactModalVisible(
          false,
        );

        Alert.alert(
          'Contact Saved',
          'Your emergency contact has been updated.',
        );

      } catch (error) {

        Alert.alert(
          'Unable to Save',
          error?.message ||
            'The emergency contact could not be saved.',
        );

      } finally {

        setSavingContact(false);
      }

    }, [
      contactForm,
      saveProfile,
    ]);


  /* ==========================================================
     DEVICE HANDLERS
  ========================================================== */

  const handleAddDevice =
    useCallback(async () => {

      const name =
        newDeviceName.trim();

      if (!name) {

        Alert.alert(
          'Device Name Required',
          'Please enter a device name or model.',
        );

        return;
      }


      const device = {
        id:
          `${Date.now()}`,

        name,

        addedAt:
          new Date().toISOString(),
      };


      const updated = [
        ...devices,
        device,
      ];


      setDevices(
        updated,
      );


      await persistLocalSettings({
        devices:
          updated,
      });


      setNewDeviceName('');

      setDeviceModalVisible(
        false,
      );

    }, [
      newDeviceName,
      devices,
      persistLocalSettings,
    ]);


  const handleRemoveDevice =
    useCallback(async id => {

      const updated =
        devices.filter(
          device =>
            device.id !== id,
        );


      setDevices(
        updated,
      );


      await persistLocalSettings({
        devices:
          updated,
      });

    }, [
      devices,
      persistLocalSettings,
    ]);


  /* ==========================================================
     NOTIFICATIONS
  ========================================================== */

  const handleNotificationsToggle =
    useCallback(async enabled => {

      setNotifications(
        enabled,
      );

      await persistLocalSettings({
        notifications:
          enabled,
      });

    }, [
      persistLocalSettings,
    ]);


  /* ==========================================================
     DATA SHARING
  ========================================================== */

  const handleDataSharingToggle =
    useCallback(async enabled => {

      setDataSharing(
        enabled,
      );

      await persistLocalSettings({
        dataSharing:
          enabled,
      });

    }, [
      persistLocalSettings,
    ]);


  /* ==========================================================
     BIOMETRIC
  ========================================================== */

  const handleBiometricToggle =
    useCallback(async enabled => {

      if (!toggleBiometrics) {
        return;
      }

      const result =
        await toggleBiometrics(
          enabled,
        );


      if (!result?.success) {

        Alert.alert(
          'Biometric Authentication',
          result?.message ||
            'Unable to change biometric protection.',
        );
      }

    }, [
      toggleBiometrics,
    ]);


  /* ==========================================================
     SIGN OUT
  ========================================================== */

  const handleLogout =
    useCallback(() => {

      Alert.alert(
        'Sign Out',
        'Are you sure you want to sign out of CareSense AI?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },

          {
            text: 'Sign Out',
            style: 'destructive',

            onPress: async () => {

              try {
                await logout();
              } catch (error) {
                Alert.alert(
                  'Sign Out Failed',
                  'Unable to sign out right now.',
                );
              }

            },
          },
        ],
      );

    }, [
      logout,
    ]);


  /* ==========================================================
     UI VALUES
  ========================================================== */

  const bloodType =
    formatValue(
      currentProfile.blood_type,
      '—',
    );

  const height =
    currentProfile.height_cm
      ? `${currentProfile.height_cm} cm`
      : '—';

  const weight =
    currentProfile.weight_kg
      ? `${currentProfile.weight_kg} kg`
      : '—';

  const emergencyName =
    currentProfile
      .emergency_contact_name;

  const emergencyPhone =
    currentProfile
      .emergency_contact_phone;

  const emergencyRelation =
    currentProfile
      .emergency_contact_relation;


  /* ==========================================================
     RENDER
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
            paddingBottom:
              130,
          },
        ]}
        showsVerticalScrollIndicator={
          false
        }
      >

        {/* ==================================================
            PROFILE HEADER
        ================================================== */}

        <View
          style={[
            styles.profileHeader,
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
              styles.profileTopRow
            }
          >

            <TouchableOpacity
              onPress={
                handlePickImage
              }
              activeOpacity={
                0.82
              }
              style={
                styles.avatarContainer
              }
            >

              <View
                style={[
                  styles.avatarWrapper,
                  {
                    borderColor:
                      theme.accent,
                  },
                ]}
              >

                {effectivePhoto ? (
                  <Image
                    source={{
                      uri:
                        effectivePhoto,
                    }}
                    style={
                      styles.avatarImage
                    }
                  />
                ) : (
                  <View
                    style={[
                      styles.avatarFallback,
                      {
                        backgroundColor:
                          theme.inputBg,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.avatarFallbackText,
                        {
                          color:
                            theme.accent,
                        },
                      ]}
                    >
                      {getInitials(
                        displayName,
                      )}
                    </Text>
                  </View>
                )}

              </View>


              <View
                style={[
                  styles.cameraBadge,
                  {
                    backgroundColor:
                      theme.accent,
                  },
                ]}
              >
                <Ionicons
                  name="camera"
                  size={14}
                  color="#0A0F1A"
                />
              </View>

            </TouchableOpacity>


            <View
              style={
                styles.profileIdentity
              }
            >

              <Text
                style={[
                  styles.userName,
                  {
                    color:
                      theme.textPrimary,
                  },
                ]}
                numberOfLines={2}
              >
                {displayName}
              </Text>

              <Text
                style={[
                  styles.userEmail,
                  {
                    color:
                      theme.textSecondary,
                  },
                ]}
                numberOfLines={1}
              >
                {user?.email ||
                  'No email address'}
              </Text>


              <View
                style={[
                  styles.profileStatus,
                  {
                    backgroundColor:
                      isDark
                        ? '#102923'
                        : '#E9FBF7',
                  },
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor:
                        theme.accent,
                    },
                  ]}
                />

                <Text
                  style={[
                    styles.profileStatusText,
                    {
                      color:
                        theme.accent,
                    },
                  ]}
                >
                  Profile synced
                </Text>

              </View>

            </View>


            <TouchableOpacity
              onPress={
                handleRefreshProfile
              }
              disabled={
                profileRefreshing ||
                profileLoading
              }
              activeOpacity={
                0.75
              }
              style={[
                styles.refreshButton,
                {
                  borderColor:
                    theme.border,

                  backgroundColor:
                    theme.inputBg,
                },
              ]}
            >

              {profileRefreshing ? (
                <ActivityIndicator
                  size="small"
                  color={
                    theme.accent
                  }
                />
              ) : (
                <Ionicons
                  name="refresh"
                  size={19}
                  color={
                    theme.accent
                  }
                />
              )}

            </TouchableOpacity>

          </View>


          {/* PROFILE COMPLETION */}

          <View
            style={
              styles.completionContainer
            }
          >

            <View
              style={
                styles.completionHeader
              }
            >

              <Text
                style={[
                  styles.completionTitle,
                  {
                    color:
                      theme.textPrimary,
                  },
                ]}
              >
                Profile completion
              </Text>

              <Text
                style={[
                  styles.completionPercent,
                  {
                    color:
                      theme.accent,
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
                    theme.border,
                },
              ]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    width:
                      `${profileCompletion}%`,
                    backgroundColor:
                      theme.accent,
                  },
                ]}
              />
            </View>

            <Text
              style={[
                styles.completionHint,
                {
                  color:
                    theme.textSecondary,
                },
              ]}
            >
              Complete your health profile to make
              CareSense more personalized.
            </Text>

          </View>

        </View>


        {/* PROFILE ERROR */}

        {profileError && (
          <View
            style={[
              styles.errorBanner,
              {
                backgroundColor:
                  isDark
                    ? '#29171A'
                    : '#FEF2F2',

                borderColor:
                  isDark
                    ? '#5B252B'
                    : '#FECACA',
              },
            ]}
          >
            <Ionicons
              name="cloud-offline-outline"
              size={20}
              color={BRAND.red}
            />

            <View
              style={
                styles.errorTextContainer
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
                Profile sync delayed
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
                Your account is still usable. Pull
                your profile again when the server is
                available.
              </Text>
            </View>
          </View>
        )}


        {/* ==================================================
            PHYSICAL SUMMARY
        ================================================== */}

        <SectionHeader
          title="Physical Summary"
          actionLabel="Edit"
          actionIcon="create-outline"
          theme={theme}
          onAction={() => {
            setHealthForm({
              date_of_birth:
                formatDateOfBirthForDisplay(
                  currentProfile.date_of_birth,
                ),

              gender:
                currentProfile.gender ||
                '',

              height_cm:
                currentProfile.height_cm !==
                null &&
                currentProfile.height_cm !==
                undefined
                  ? String(
                      currentProfile.height_cm,
                    )
                  : '',

              weight_kg:
                currentProfile.weight_kg !==
                null &&
                currentProfile.weight_kg !==
                undefined
                  ? String(
                      currentProfile.weight_kg,
                    )
                  : '',

              blood_type:
                currentProfile.blood_type ||
                '',

              medical_conditions:
                currentProfile.medical_conditions ||
                '',

              current_medications:
                currentProfile.current_medications ||
                '',

              allergies:
                currentProfile.allergies ||
                '',
            });

            setHealthModalVisible(
              true,
            );
          }}
        />


        <View
          style={[
            styles.vitalsCard,
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
              styles.vitalItem,
              styles.vitalBorderRight,
              {
                borderColor:
                  theme.border,
              },
            ]}
          >
            <Text
              style={[
                styles.vitalValue,
                {
                  color:
                    theme.accent,
                },
              ]}
            >
              {age ?? '—'}
            </Text>

            <Text
              style={[
                styles.vitalLabel,
                {
                  color:
                    theme.textSecondary,
                },
              ]}
            >
              Age
            </Text>
          </View>


          <View
            style={[
              styles.vitalItem,
              styles.vitalBorderRight,
              {
                borderColor:
                  theme.border,
              },
            ]}
          >
            <Text
              style={[
                styles.vitalValue,
                {
                  color:
                    theme.accent,
                },
              ]}
            >
              {bloodType}
            </Text>

            <Text
              style={[
                styles.vitalLabel,
                {
                  color:
                    theme.textSecondary,
                },
              ]}
            >
              Blood Type
            </Text>
          </View>


          <View
            style={[
              styles.vitalItem,
              styles.vitalBorderRight,
              {
                borderColor:
                  theme.border,
              },
            ]}
          >
            <Text
              style={[
                styles.vitalValue,
                {
                  color:
                    theme.accent,
                },
              ]}
            >
              {height}
            </Text>

            <Text
              style={[
                styles.vitalLabel,
                {
                  color:
                    theme.textSecondary,
                },
              ]}
            >
              Height
            </Text>
          </View>


          <View
            style={
              styles.vitalItem
            }
          >
            <Text
              style={[
                styles.vitalValue,
                {
                  color:
                    theme.accent,
                },
              ]}
            >
              {weight}
            </Text>

            <Text
              style={[
                styles.vitalLabel,
                {
                  color:
                    theme.textSecondary,
                },
              ]}
            >
              Weight
            </Text>
          </View>

        </View>


        {/* ==================================================
            HEALTH DETAILS
        ================================================== */}

        <SectionHeader
          title="Health Information"
          actionLabel="Edit"
          actionIcon="create-outline"
          theme={theme}
          onAction={() => {
            setHealthModalVisible(
              true,
            );
          }}
        />


        <View
          style={[
            styles.infoCard,
            {
              backgroundColor:
                theme.card,

              borderColor:
                theme.border,
            },
          ]}
        >

          <InfoRow
            icon="person-outline"
            label="Gender"
            value={formatValue(
              currentProfile.gender,
            )}
            theme={theme}
          />

          <InfoRow
            icon="medkit-outline"
            label="Medical Conditions"
            value={formatValue(
              currentProfile.medical_conditions,
            )}
            theme={theme}
          />

          <InfoRow
            icon="medical-outline"
            label="Current Medications"
            value={formatValue(
              currentProfile.current_medications,
            )}
            theme={theme}
          />

          <InfoRow
            icon="warning-outline"
            label="Allergies"
            value={formatValue(
              currentProfile.allergies,
            )}
            theme={theme}
            last
          />

        </View>


        {/* ==================================================
            CONNECTED DEVICES
        ================================================== */}

        <SectionHeader
          title="Connected Devices"
          actionLabel="Add Device"
          actionIcon="add-circle-outline"
          theme={theme}
          onAction={() =>
            setDeviceModalVisible(
              true,
            )
          }
        />


        {devices.length === 0 ? (

          <View
            style={[
              styles.emptyBox,
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
                    theme.inputBg,
                },
              ]}
            >
              <Ionicons
                name="hardware-chip-outline"
                size={25}
                color={
                  theme.textSecondary
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
              No devices added
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
              Add a smartwatch, blood pressure
              monitor, or other health device profile.
            </Text>

          </View>

        ) : (

          devices.map(device => (

            <View
              key={device.id}
              style={[
                styles.deviceCard,
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
                  styles.deviceLeft
                }
              >

                <View
                  style={[
                    styles.deviceIconBg,
                    {
                      backgroundColor:
                        isDark
                          ? '#0F2930'
                          : '#E6FBFA',
                    },
                  ]}
                >
                  <Ionicons
                    name="watch-outline"
                    size={24}
                    color={
                      theme.accent
                    }
                  />
                </View>

                <View
                  style={
                    styles.deviceInfo
                  }
                >
                  <Text
                    style={[
                      styles.deviceName,
                      {
                        color:
                          theme.textPrimary,
                      },
                    ]}
                  >
                    {device.name}
                  </Text>

                  <Text
                    style={[
                      styles.deviceStatus,
                      {
                        color:
                          theme.accent,
                      },
                    ]}
                  >
                    Saved on this device
                  </Text>
                </View>

              </View>


              <TouchableOpacity
                onPress={() =>
                  handleRemoveDevice(
                    device.id,
                  )
                }
                activeOpacity={
                  0.75
                }
                style={
                  styles.deviceDelete
                }
              >
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color={
                    BRAND.red
                  }
                />
              </TouchableOpacity>

            </View>

          ))

        )}


        {/* ==================================================
            APP SETTINGS
        ================================================== */}

        <Text
          style={[
            styles.sectionTitle,
            {
              color:
                theme.textPrimary,

              marginTop: 24,
            },
          ]}
        >
          App Settings
        </Text>


        <View
          style={
            styles.settingsGroup
          }
        >

          <SettingRow
            icon="finger-print-outline"
            title="Biometric Authentication"
            subtitle="Secure CareSense AI with your device authentication."
            theme={theme}
          >
            <Switch
              value={
                isBiometricsEnabled
              }
              onValueChange={
                handleBiometricToggle
              }
              trackColor={{
                false:
                  theme.switchTrackInactive,

                true:
                  theme.switchTrackActive,
              }}
            />
          </SettingRow>


          <SettingRow
            icon="notifications-outline"
            title="Notifications"
            subtitle="Alerts, medication reminders and health updates."
            theme={theme}
          >
            <Switch
              value={
                notifications
              }
              onValueChange={
                handleNotificationsToggle
              }
              trackColor={{
                false:
                  theme.switchTrackInactive,

                true:
                  theme.switchTrackActive,
              }}
            />
          </SettingRow>


          <SettingRow
            icon="shield-checkmark-outline"
            title="Data Sharing"
            subtitle="Allow anonymized analytics for improving CareSense."
            theme={theme}
          >
            <Switch
              value={
                dataSharing
              }
              onValueChange={
                handleDataSharingToggle
              }
              trackColor={{
                false:
                  theme.switchTrackInactive,

                true:
                  theme.switchTrackActive,
              }}
            />
          </SettingRow>

        </View>


        {/* ==================================================
            EMERGENCY CONTACT
        ================================================== */}

        <SectionHeader
          title="Emergency Contact"
          actionLabel={
            emergencyName
              ? 'Edit'
              : 'Add Contact'
          }
          actionIcon={
            emergencyName
              ? 'create-outline'
              : 'person-add-outline'
          }
          actionColor={
            BRAND.red
          }
          theme={theme}
          onAction={() =>
            setContactModalVisible(
              true,
            )
          }
        />


        <View
          style={[
            styles.emergencyCard,
            {
              backgroundColor:
                theme.card,

              borderColor:
                theme.border,
            },
          ]}
        >

          {emergencyName ? (

            <>
              <View
                style={
                  styles.emergencyLeft
                }
              >

                <View
                  style={
                    styles.callIconBg
                  }
                >
                  <Ionicons
                    name="call"
                    size={18}
                    color={
                      BRAND.red
                    }
                  />
                </View>

                <View
                  style={
                    styles.emergencyInfo
                  }
                >
                  <Text
                    style={[
                      styles.emergencyName,
                      {
                        color:
                          theme.textPrimary,
                      },
                    ]}
                  >
                    {emergencyName}
                  </Text>

                  <Text
                    style={[
                      styles.emergencySub,
                      {
                        color:
                          theme.textSecondary,
                      },
                    ]}
                  >
                    {emergencyPhone}
                    {' • '}
                    {emergencyRelation ||
                      'Emergency Contact'}
                  </Text>
                </View>

              </View>

              <TouchableOpacity
                style={
                  styles.callButton
                }
                activeOpacity={
                  0.8
                }
                onPress={() => {
                  if (!emergencyPhone) {
                    return;
                  }

                  const phoneUrl =
                    `tel:${emergencyPhone.replace(
                      /[^0-9+]/g,
                      '',
                    )}`;

                  Linking
                    .canOpenURL(
                      phoneUrl,
                    )
                    .then(canOpen => {
                      if (canOpen) {
                        return Linking.openURL(
                          phoneUrl,
                        );
                      }

                      Alert.alert(
                        'Calling',
                        `Unable to open the phone application for ${emergencyPhone}.`,
                      );

                      return null;
                    })
                    .catch(() => {
                      Alert.alert(
                        'Calling',
                        `Unable to start the call.`,
                      );
                    });
                }}
              >
                <Ionicons
                  name="call"
                  size={16}
                  color={
                    BRAND.red
                  }
                />
              </TouchableOpacity>
            </>

          ) : (

            <View
              style={
                styles.emergencyEmpty
              }
            >

              <View
                style={
                  styles.callIconBg
                }
              >
                <Ionicons
                  name="person-add-outline"
                  size={18}
                  color={
                    BRAND.red
                  }
                />
              </View>

              <View
                style={
                  styles.emergencyInfo
                }
              >
                <Text
                  style={[
                    styles.emergencyName,
                    {
                      color:
                        theme.textPrimary,
                    },
                  ]}
                >
                  No personal emergency contact
                </Text>

                <Text
                  style={[
                    styles.emergencySub,
                    {
                      color:
                        theme.textSecondary,
                    },
                  ]}
                >
                  Add someone you trust to contact in
                  an emergency.
                </Text>
              </View>

            </View>

          )}

        </View>


        {/* ==================================================
            SYSTEM EMERGENCY
        ================================================== */}

        <View
          style={[
            styles.systemEmergencyCard,
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
              styles.emergencyLeft
            }
          >

            <View
              style={[
                styles.callIconBg,
                {
                  backgroundColor:
                    'rgba(239, 68, 68, 0.20)',
                },
              ]}
            >
              <Ionicons
                name="call"
                size={18}
                color={
                  BRAND.red
                }
              />
            </View>

            <View
              style={
                styles.emergencyInfo
              }
            >
              <Text
                style={[
                  styles.emergencyName,
                  {
                    color:
                      theme.textPrimary,
                  },
                ]}
              >
                National Emergency Services
              </Text>

              <Text
                style={[
                  styles.emergencySub,
                  {
                    color:
                      theme.textSecondary,
                  },
                ]}
              >
                India emergency number • 112
              </Text>
            </View>

          </View>


          <TouchableOpacity
            style={
              styles.callButton
            }
            activeOpacity={
              0.8
            }
            onPress={() => {
              Linking
                .canOpenURL(
                  'tel:112',
                )
                .then(canOpen => {

                  if (canOpen) {
                    return Linking.openURL(
                      'tel:112',
                    );
                  }

                  Alert.alert(
                    'Emergency Call',
                    'Unable to open the phone application.',
                  );

                  return null;
                })
                .catch(() => {
                  Alert.alert(
                    'Emergency Call',
                    'Unable to start the emergency call.',
                  );
                });
            }}
          >
            <Ionicons
              name="call"
              size={16}
              color={
                BRAND.red
              }
            />
          </TouchableOpacity>

        </View>


        {/* ==================================================
            ACCOUNT INFORMATION
        ================================================== */}

        <Text
          style={[
            styles.sectionTitle,
            {
              color:
                theme.textPrimary,

              marginTop: 24,
            },
          ]}
        >
          Account
        </Text>


        <View
          style={[
            styles.infoCard,
            {
              backgroundColor:
                theme.card,

              borderColor:
                theme.border,
            },
          ]}
        >

          <InfoRow
            icon="mail-outline"
            label="Email"
            value={
              user?.email ||
              'Not available'
            }
            theme={theme}
          />

          <InfoRow
            icon="shield-checkmark-outline"
            label="Authentication"
            value={
              user?.emailVerified
                ? 'Email verified'
                : 'Email verification pending'
            }
            theme={theme}
          />

          <InfoRow
            icon="cloud-done-outline"
            label="Profile Storage"
            value="Secure backend profile"
            theme={theme}
            last
          />

        </View>


        {/* ==================================================
            SIGN OUT
        ================================================== */}

        <View
          style={
            styles.actionsContainer
          }
        >

          <TouchableOpacity
            style={[
              styles.logoutBtn,
              {
                backgroundColor:
                  theme.logoutBtnBg,

                borderColor:
                  theme.logoutBtnBorder,
              },
            ]}
            activeOpacity={
              0.82
            }
            onPress={
              handleLogout
            }
          >

            <Ionicons
              name="log-out-outline"
              size={20}
              color={
                theme.logoutBtnText
              }
              style={{
                marginRight:
                  8,
              }}
            />

            <Text
              style={[
                styles.logoutBtnText,
                {
                  color:
                    theme.logoutBtnText,
                },
              ]}
            >
              Sign Out
            </Text>

          </TouchableOpacity>

        </View>

      </Animated.ScrollView>


      {/* =====================================================
          HEALTH PROFILE MODAL
      ===================================================== */}

      <Modal
        visible={
          healthModalVisible
        }
        animationType="slide"
        transparent
        onRequestClose={() =>
          setHealthModalVisible(
            false,
          )
        }
      >

        <KeyboardAvoidingView
          style={
            styles.modalOverlay
          }
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : undefined
          }
        >

          <View
            style={[
              styles.modalContent,
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
                styles.modalHeader
              }
            >

              <View>
                <Text
                  style={[
                    styles.modalTitle,
                    {
                      color:
                        theme.textPrimary,
                    },
                  ]}
                >
                  Health Profile
                </Text>

                <Text
                  style={[
                    styles.modalSubtitle,
                    {
                      color:
                        theme.textSecondary,
                    },
                  ]}
                >
                  Update the information CareSense uses
                  to personalize your experience.
                </Text>
              </View>

              <TouchableOpacity
                onPress={() =>
                  setHealthModalVisible(
                    false,
                  )
                }
                style={[
                  styles.modalClose,
                  {
                    backgroundColor:
                      theme.inputBg,
                  },
                ]}
              >
                <Ionicons
                  name="close"
                  size={20}
                  color={
                    theme.textSecondary
                  }
                />
              </TouchableOpacity>

            </View>


            <ScrollView
              showsVerticalScrollIndicator={
                false
              }
              contentContainerStyle={{
                paddingBottom:
                  8,
              }}
            >

              <Text
                style={[
                  styles.inputLabel,
                  {
                    color:
                      theme.textSecondary,
                  },
                ]}
              >
                Date of Birth
              </Text>

              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor:
                      theme.inputBg,

                    color:
                      theme.textPrimary,

                    borderColor:
                      theme.border,
                  },
                ]}
                placeholder="DD/MM/YYYY"
                placeholderTextColor={
                  theme.textSecondary
                }
                value={
                  healthForm.date_of_birth
                }
                onChangeText={value =>
                  setHealthForm(
                    previous => ({
                      ...previous,
                      date_of_birth:
                        value,
                    }),
                  )
                }
                maxLength={10}
                keyboardType="numbers-and-punctuation"
              />


              <Text
                style={[
                  styles.inputLabel,
                  {
                    color:
                      theme.textSecondary,
                  },
                ]}
              >
                Gender
              </Text>

              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor:
                      theme.inputBg,

                    color:
                      theme.textPrimary,

                    borderColor:
                      theme.border,
                  },
                ]}
                placeholder="e.g. Male, Female, Other"
                placeholderTextColor={
                  theme.textSecondary
                }
                value={
                  healthForm.gender
                }
                onChangeText={value =>
                  setHealthForm(
                    previous => ({
                      ...previous,
                      gender:
                        value,
                    }),
                  )
                }
              />


              <View
                style={
                  styles.twoColumnRow
                }
              >

                <View
                  style={
                    styles.twoColumnItem
                  }
                >

                  <Text
                    style={[
                      styles.inputLabel,
                      {
                        color:
                          theme.textSecondary,
                      },
                    ]}
                  >
                    Height (cm)
                  </Text>

                  <TextInput
                    style={[
                      styles.modalInput,
                      {
                        backgroundColor:
                          theme.inputBg,

                        color:
                          theme.textPrimary,

                        borderColor:
                          theme.border,
                      },
                    ]}
                    placeholder="e.g. 175"
                    placeholderTextColor={
                      theme.textSecondary
                    }
                    value={
                      healthForm.height_cm
                    }
                    onChangeText={value =>
                      setHealthForm(
                        previous => ({
                          ...previous,
                          height_cm:
                            value,
                        }),
                      )
                    }
                    keyboardType="decimal-pad"
                  />

                </View>


                <View
                  style={
                    styles.twoColumnItem
                  }
                >

                  <Text
                    style={[
                      styles.inputLabel,
                      {
                        color:
                          theme.textSecondary,
                      },
                    ]}
                  >
                    Weight (kg)
                  </Text>

                  <TextInput
                    style={[
                      styles.modalInput,
                      {
                        backgroundColor:
                          theme.inputBg,

                        color:
                          theme.textPrimary,

                        borderColor:
                          theme.border,
                      },
                    ]}
                    placeholder="e.g. 70"
                    placeholderTextColor={
                      theme.textSecondary
                    }
                    value={
                      healthForm.weight_kg
                    }
                    onChangeText={value =>
                      setHealthForm(
                        previous => ({
                          ...previous,
                          weight_kg:
                            value,
                        }),
                      )
                    }
                    keyboardType="decimal-pad"
                  />

                </View>

              </View>


              <Text
                style={[
                  styles.inputLabel,
                  {
                    color:
                      theme.textSecondary,
                  },
                ]}
              >
                Blood Type
              </Text>

              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor:
                      theme.inputBg,

                    color:
                      theme.textPrimary,

                    borderColor:
                      theme.border,
                  },
                ]}
                placeholder="e.g. O+"
                placeholderTextColor={
                  theme.textSecondary
                }
                value={
                  healthForm.blood_type
                }
                onChangeText={value =>
                  setHealthForm(
                    previous => ({
                      ...previous,
                      blood_type:
                        value,
                    }),
                  )
                }
                autoCapitalize="characters"
                maxLength={5}
              />


              <Text
                style={[
                  styles.inputLabel,
                  {
                    color:
                      theme.textSecondary,
                  },
                ]}
              >
                Medical Conditions
              </Text>

              <TextInput
                style={[
                  styles.modalInput,
                  styles.multilineInput,
                  {
                    backgroundColor:
                      theme.inputBg,

                    color:
                      theme.textPrimary,

                    borderColor:
                      theme.border,
                  },
                ]}
                placeholder="e.g. Asthma, diabetes, hypertension"
                placeholderTextColor={
                  theme.textSecondary
                }
                value={
                  healthForm.medical_conditions
                }
                onChangeText={value =>
                  setHealthForm(
                    previous => ({
                      ...previous,
                      medical_conditions:
                        value,
                    }),
                  )
                }
                multiline
                textAlignVertical="top"
              />


              <Text
                style={[
                  styles.inputLabel,
                  {
                    color:
                      theme.textSecondary,
                  },
                ]}
              >
                Current Medications
              </Text>

              <TextInput
                style={[
                  styles.modalInput,
                  styles.multilineInput,
                  {
                    backgroundColor:
                      theme.inputBg,

                    color:
                      theme.textPrimary,

                    borderColor:
                      theme.border,
                  },
                ]}
                placeholder="List medicines you currently take"
                placeholderTextColor={
                  theme.textSecondary
                }
                value={
                  healthForm.current_medications
                }
                onChangeText={value =>
                  setHealthForm(
                    previous => ({
                      ...previous,
                      current_medications:
                        value,
                    }),
                  )
                }
                multiline
                textAlignVertical="top"
              />


              <Text
                style={[
                  styles.inputLabel,
                  {
                    color:
                      theme.textSecondary,
                  },
                ]}
              >
                Allergies
              </Text>

              <TextInput
                style={[
                  styles.modalInput,
                  styles.multilineInput,
                  {
                    backgroundColor:
                      theme.inputBg,

                    color:
                      theme.textPrimary,

                    borderColor:
                      theme.border,
                  },
                ]}
                placeholder="e.g. Penicillin, peanuts, pollen"
                placeholderTextColor={
                  theme.textSecondary
                }
                value={
                  healthForm.allergies
                }
                onChangeText={value =>
                  setHealthForm(
                    previous => ({
                      ...previous,
                      allergies:
                        value,
                    }),
                  )
                }
                multiline
                textAlignVertical="top"
              />


              <View
                style={
                  styles.modalBtnRow
                }
              >

                <TouchableOpacity
                  style={
                    styles.modalCancelBtn
                  }
                  onPress={() =>
                    setHealthModalVisible(
                      false,
                    )
                  }
                >
                  <Text
                    style={[
                      styles.modalCancelText,
                      {
                        color:
                          theme.textSecondary,
                      },
                    ]}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>


                <TouchableOpacity
                  style={[
                    styles.modalSaveBtn,
                    {
                      backgroundColor:
                        theme.accent,
                    },
                  ]}
                  onPress={
                    handleSaveHealth
                  }
                  disabled={
                    savingHealth
                  }
                >

                  {savingHealth ? (
                    <ActivityIndicator
                      size="small"
                      color="#0A0F1A"
                    />
                  ) : (
                    <Text
                      style={
                        styles.modalSaveText
                      }
                    >
                      Save Changes
                    </Text>
                  )}

                </TouchableOpacity>

              </View>

            </ScrollView>

          </View>

        </KeyboardAvoidingView>

      </Modal>


      {/* =====================================================
          EMERGENCY CONTACT MODAL
      ===================================================== */}

      <Modal
        visible={
          contactModalVisible
        }
        animationType="slide"
        transparent
        onRequestClose={() =>
          setContactModalVisible(
            false,
          )
        }
      >

        <KeyboardAvoidingView
          style={
            styles.modalOverlay
          }
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : undefined
          }
        >

          <View
            style={[
              styles.modalContent,
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
                styles.modalHeader
              }>

              <View>
                <Text
                  style={[
                    styles.modalTitle,
                    {
                      color:
                        theme.textPrimary,
                    },
                  ]}
                >
                  Emergency Contact
                </Text>

                <Text
                  style={[
                    styles.modalSubtitle,
                    {
                      color:
                        theme.textSecondary,
                    },
                  ]}
                >
                  Keep one trusted contact available for
                  urgent situations.
                </Text>
              </View>

              <TouchableOpacity
                onPress={() =>
                  setContactModalVisible(
                    false,
                  )
                }
                style={[
                  styles.modalClose,
                  {
                    backgroundColor:
                      theme.inputBg,
                  },
                ]}
              >
                <Ionicons
                  name="close"
                  size={20}
                  color={
                    theme.textSecondary
                  }
                />
              </TouchableOpacity>

            </View>


            <Text
              style={[
                styles.inputLabel,
                {
                  color:
                    theme.textSecondary,
                },
              ]}
            >
              Contact Name
            </Text>

            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor:
                    theme.inputBg,

                  color:
                    theme.textPrimary,

                  borderColor:
                    theme.border,
                },
              ]}
              placeholder="e.g. Parent, spouse, sibling"
              placeholderTextColor={
                theme.textSecondary
              }
              value={
                contactForm.name
              }
              onChangeText={value =>
                setContactForm(
                  previous => ({
                    ...previous,
                    name:
                      value,
                  }),
                )
              }
            />


            <Text
              style={[
                styles.inputLabel,
                {
                  color:
                    theme.textSecondary,
                },
              ]}
            >
              Relationship
            </Text>

            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor:
                    theme.inputBg,

                  color:
                    theme.textPrimary,

                  borderColor:
                    theme.border,
                },
              ]}
              placeholder="e.g. Father"
              placeholderTextColor={
                theme.textSecondary
              }
              value={
                contactForm.relation
              }
              onChangeText={value =>
                setContactForm(
                  previous => ({
                    ...previous,
                    relation:
                      value,
                  }),
                )
              }
            />


            <Text
              style={[
                styles.inputLabel,
                {
                  color:
                    theme.textSecondary,
                },
              ]}
            >
              Phone Number
            </Text>

            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor:
                    theme.inputBg,

                  color:
                    theme.textPrimary,

                  borderColor:
                    theme.border,
                },
              ]}
              placeholder="+91 12345 67890"
              placeholderTextColor={
                theme.textSecondary
              }
              value={
                contactForm.phone
              }
              onChangeText={value =>
                setContactForm(
                  previous => ({
                    ...previous,
                    phone:
                      value,
                  }),
                )
              }
              keyboardType="phone-pad"
            />


            <View
              style={
                styles.modalBtnRow
              }>

              <TouchableOpacity
                style={
                  styles.modalCancelBtn
                }
                onPress={() =>
                  setContactModalVisible(
                    false,
                  )
                }
              >
                <Text
                  style={[
                    styles.modalCancelText,
                    {
                      color:
                        theme.textSecondary,
                    },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>


              <TouchableOpacity
                style={[
                  styles.modalSaveBtn,
                  {
                    backgroundColor:
                      BRAND.red,
                  },
                ]}
                onPress={
                  handleSaveContact
                }
                disabled={
                  savingContact
                }
              >

                {savingContact ? (
                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                  />
                ) : (
                  <Text
                    style={[
                      styles.modalSaveText,
                      {
                        color:
                          '#FFFFFF',
                      },
                    ]}
                  >
                    Save Contact
                  </Text>
                )}

              </TouchableOpacity>

            </View>

          </View>

        </KeyboardAvoidingView>

      </Modal>


      {/* =====================================================
          DEVICE MODAL
      ===================================================== */}

      <Modal
        visible={
          deviceModalVisible
        }
        animationType="slide"
        transparent
        onRequestClose={() =>
          setDeviceModalVisible(
            false,
          )
        }
      >

        <KeyboardAvoidingView
          style={
            styles.modalOverlay
          }
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : undefined
          }
        >

          <View
            style={[
              styles.modalContent,
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
                styles.modalHeader
              }>

              <View>
                <Text
                  style={[
                    styles.modalTitle,
                    {
                      color:
                        theme.textPrimary,
                    },
                  ]}
                >
                  Add Device
                </Text>

                <Text
                  style={[
                    styles.modalSubtitle,
                    {
                      color:
                        theme.textSecondary,
                    },
                  ]}
                >
                  Save a health device profile on this
                  device.
                </Text>
              </View>

              <TouchableOpacity
                onPress={() =>
                  setDeviceModalVisible(
                    false,
                  )
                }
                style={[
                  styles.modalClose,
                  {
                    backgroundColor:
                      theme.inputBg,
                  },
                ]}
              >
                <Ionicons
                  name="close"
                  size={20}
                  color={
                    theme.textSecondary
                  }
                />
              </TouchableOpacity>

            </View>


            <Text
              style={[
                styles.inputLabel,
                {
                  color:
                    theme.textSecondary,
                },
              ]}
            >
              Device Name / Model
            </Text>

            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor:
                    theme.inputBg,

                  color:
                    theme.textPrimary,

                  borderColor:
                    theme.border,
                },
              ]}
              placeholder="e.g. Galaxy Watch"
              placeholderTextColor={
                theme.textSecondary
              }
              value={
                newDeviceName
              }
              onChangeText={
                setNewDeviceName
              }
            />


            <View
              style={
                styles.modalBtnRow
              }>

              <TouchableOpacity
                style={
                  styles.modalCancelBtn
                }
                onPress={() =>
                  setDeviceModalVisible(
                    false,
                  )
                }
              >
                <Text
                  style={[
                    styles.modalCancelText,
                    {
                      color:
                        theme.textSecondary,
                    },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>


              <TouchableOpacity
                style={[
                  styles.modalSaveBtn,
                  {
                    backgroundColor:
                      theme.accent,
                  },
                ]}
                onPress={
                  handleAddDevice
                }
              >
                <Text
                  style={
                    styles.modalSaveText
                  }
                >
                  Add Device
                </Text>
              </TouchableOpacity>

            </View>

          </View>

        </KeyboardAvoidingView>

      </Modal>

    </SafeAreaView>
  );
}


/* ============================================================
   STYLES
   Existing visual language preserved
============================================================ */

const styles =
  StyleSheet.create({

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


    /* ========================================================
       PROFILE
    ======================================================== */

    profileHeader: {
      borderRadius: 18,
      borderWidth: 1,
      padding: 16,
      marginBottom: 4,
    },

    profileTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    avatarContainer: {
      position: 'relative',
      marginRight: 14,
    },

    avatarWrapper: {
      width: 82,
      height: 82,
      borderRadius: 41,
      borderWidth: 3,
      padding: 3,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },

    avatarImage: {
      width: '100%',
      height: '100%',
      borderRadius: 41,
    },

    avatarFallback: {
      width: '100%',
      height: '100%',
      borderRadius: 41,
      justifyContent: 'center',
      alignItems: 'center',
    },

    avatarFallbackText: {
      fontSize: 27,
      fontWeight: '800',
    },

    cameraBadge: {
      position: 'absolute',
      bottom: 0,
      right: -2,
      width: 27,
      height: 27,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: '#0A0F1A',
    },

    profileIdentity: {
      flex: 1,
      minWidth: 0,
    },

    userName: {
      fontSize: 21,
      fontWeight: '700',
      marginBottom: 3,
    },

    userEmail: {
      fontSize: 12.5,
      marginBottom: 8,
    },

    profileStatus: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 20,
    },

    statusDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      marginRight: 6,
    },

    profileStatusText: {
      fontSize: 10.5,
      fontWeight: '700',
    },

    refreshButton: {
      width: 38,
      height: 38,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 8,
    },


    /* ========================================================
       COMPLETION
    ======================================================== */

    completionContainer: {
      marginTop: 17,
    },

    completionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 7,
    },

    completionTitle: {
      fontSize: 12,
      fontWeight: '600',
    },

    completionPercent: {
      fontSize: 12,
      fontWeight: '800',
    },

    progressTrack: {
      height: 7,
      borderRadius: 5,
      overflow: 'hidden',
    },

    progressFill: {
      height: '100%',
      borderRadius: 5,
    },

    completionHint: {
      fontSize: 11,
      lineHeight: 16,
      marginTop: 7,
    },


    /* ========================================================
       ERRORS
    ======================================================== */

    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 14,
      borderWidth: 1,
      padding: 13,
      marginTop: 12,
    },

    errorTextContainer: {
      flex: 1,
      marginLeft: 10,
    },

    errorTitle: {
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 2,
    },

    errorText: {
      fontSize: 11,
      lineHeight: 16,
    },


    /* ========================================================
       SECTION
    ======================================================== */

    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 20,
      marginBottom: 12,
    },

    sectionTitle: {
      fontSize: 17,
      fontWeight: '700',
    },

    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },

    actionBtnText: {
      fontSize: 13,
      fontWeight: '700',
    },


    /* ========================================================
       PHYSICAL SUMMARY
    ======================================================== */

    vitalsCard: {
      flexDirection: 'row',
      borderRadius: 16,
      borderWidth: 1,
      paddingVertical: 16,
    },

    vitalItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },

    vitalBorderRight: {
      borderRightWidth: 1,
    },

    vitalValue: {
      fontSize: 15,
      fontWeight: '700',
      marginBottom: 4,
    },

    vitalLabel: {
      fontSize: 10.5,
      fontWeight: '500',
    },


    /* ========================================================
       INFORMATION CARD
    ======================================================== */

    infoCard: {
      borderRadius: 16,
      borderWidth: 1,
      overflow: 'hidden',
    },

    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 13,
      paddingVertical: 13,
    },

    infoIcon: {
      width: 38,
      height: 38,
      borderRadius: 11,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 11,
    },

    infoText: {
      flex: 1,
    },

    infoLabel: {
      fontSize: 10.5,
      fontWeight: '600',
      marginBottom: 3,
    },

    infoValue: {
      fontSize: 13,
      fontWeight: '600',
      lineHeight: 18,
    },


    /* ========================================================
       DEVICES
    ======================================================== */

    emptyBox: {
      padding: 18,
      borderRadius: 15,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },

    emptyIcon: {
      width: 48,
      height: 48,
      borderRadius: 15,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },

    emptyTitle: {
      fontSize: 14,
      fontWeight: '700',
      marginBottom: 3,
    },

    emptyText: {
      fontSize: 11.5,
      lineHeight: 17,
      textAlign: 'center',
    },

    deviceCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      marginBottom: 10,
    },

    deviceLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },

    deviceIconBg: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },

    deviceInfo: {
      flex: 1,
    },

    deviceName: {
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 2,
    },

    deviceStatus: {
      fontSize: 10.5,
      fontWeight: '600',
    },

    deviceDelete: {
      width: 34,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
    },


    /* ========================================================
       APP SETTINGS
    ======================================================== */

    settingsGroup: {
      gap: 10,
      marginTop: 12,
    },

    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 14,
      borderWidth: 1,
    },

    settingIcon: {
      width: 39,
      height: 39,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 11,
    },

    settingTextContainer: {
      flex: 1,
      paddingRight: 10,
    },

    settingTitle: {
      fontSize: 13.5,
      fontWeight: '600',
      marginBottom: 2,
    },

    settingSub: {
      fontSize: 11.5,
      lineHeight: 16,
    },


    /* ========================================================
       EMERGENCY
    ======================================================== */

    emergencyCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
    },

    emergencyEmpty: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },

    systemEmergencyCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      marginTop: 10,
    },

    emergencyLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },

    callIconBg: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor:
        'rgba(239, 68, 68, 0.12)',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },

    emergencyInfo: {
      flex: 1,
    },

    emergencyName: {
      fontSize: 13.5,
      fontWeight: '600',
      marginBottom: 2,
    },

    emergencySub: {
      fontSize: 11.5,
      lineHeight: 16,
    },

    callButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor:
        'rgba(239, 68, 68, 0.15)',
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 8,
    },


    /* ========================================================
       ACTIONS
    ======================================================== */

    actionsContainer: {
      marginTop: 28,
    },

    logoutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      height: 48,
      borderRadius: 14,
      borderWidth: 1,
    },

    logoutBtnText: {
      fontSize: 14,
      fontWeight: '700',
    },


    /* ========================================================
       MODALS
    ======================================================== */

    modalOverlay: {
      flex: 1,
      backgroundColor:
        'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      paddingHorizontal: 20,
    },

    modalContent: {
      maxHeight: '90%',
      borderRadius: 20,
      borderWidth: 1,
      padding: 20,
    },

    modalHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 14,
    },

    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 4,
    },

    modalSubtitle: {
      fontSize: 11.5,
      lineHeight: 17,
      paddingRight: 15,
    },

    modalClose: {
      width: 34,
      height: 34,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 10,
    },

    inputLabel: {
      fontSize: 12,
      fontWeight: '600',
      marginBottom: 5,
      marginTop: 9,
    },

    modalInput: {
      minHeight: 44,
      borderRadius: 10,
      borderWidth: 1,
      paddingHorizontal: 12,
      fontSize: 14,
    },

    multilineInput: {
      minHeight: 78,
      paddingTop: 11,
      paddingBottom: 11,
    },

    twoColumnRow: {
      flexDirection: 'row',
      gap: 10,
    },

    twoColumnItem: {
      flex: 1,
    },

    modalBtnRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      marginTop: 20,
      gap: 12,
    },

    modalCancelBtn: {
      paddingVertical: 10,
      paddingHorizontal: 16,
    },

    modalCancelText: {
      fontWeight: '600',
      fontSize: 13,
    },

    modalSaveBtn: {
      minWidth: 130,
      minHeight: 42,
      paddingVertical: 10,
      paddingHorizontal: 18,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },

    modalSaveText: {
      color: '#0A0F1A',
      fontWeight: '700',
      fontSize: 13,
    },

  });