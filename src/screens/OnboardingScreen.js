import React, {
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
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import { AuthContext } from '../context/AuthContext';
import { uploadProfileImage } from '../services/cloudinary';

import {
  getNotificationPermissionStatus,
  requestNotificationPermission,
} from '../services/permissions';

const BRAND = {
  cyan: '#00D4C5',
  cyanDark: '#00B3A6',

  darkBg: '#0A0F1A',
  darkCard: '#141C29',
  darkBorder: '#222E40',

  lightBg: '#F8F9FB',
  lightCard: '#FFFFFF',
  lightBorder: '#E2E8F0',

  white: '#FFFFFF',
  darkText: '#0A0F1A',
  danger: '#EF4444',
};

const getTheme = isDark => ({
  background: isDark ? BRAND.darkBg : BRAND.lightBg,
  card: isDark ? BRAND.darkCard : BRAND.lightCard,
  border: isDark ? BRAND.darkBorder : BRAND.lightBorder,

  textPrimary: isDark ? '#FFFFFF' : '#111827',
  textSecondary: isDark ? '#8897AE' : '#64748B',

  inputBg: isDark ? '#1C2738' : '#F1F5F9',
  inputFocusBg: isDark ? '#223044' : '#FFFFFF',

  accent: BRAND.cyan,

  accentSoft: isDark
    ? 'rgba(0, 212, 197, 0.12)'
    : '#E6FBFA',

  accentBorder: isDark
    ? 'rgba(0, 212, 197, 0.30)'
    : '#B7F2EE',

  successBg: isDark
    ? 'rgba(16, 185, 129, 0.12)'
    : '#ECFDF5',

  successBorder: isDark
    ? 'rgba(16, 185, 129, 0.30)'
    : '#A7F3D0',

  dangerBg: isDark
    ? 'rgba(239, 68, 68, 0.12)'
    : '#FEF2F2',
});

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

const formatDateOfBirth = value => {
  if (!value) {
    return '';
  }

  const raw = String(value).trim();

  if (
    /^\d{2}\/\d{2}\/\d{4}$/.test(raw)
  ) {
    return raw;
  }

  const normalized =
    normalizeDateOfBirth(raw);

  if (!normalized) {
    return raw;
  }

  const [year, month, day] =
    normalized.split('-');

  return `${day}/${month}/${year}`;
};

const STEPS = [
  {
    key: 'basic',
    title: 'Let’s get to know you',
    subtitle:
      'A few details help CareSense personalize your experience.',
    icon: 'person-outline',
    badge: 'Personal profile',
  },

  {
    key: 'photo',
    title: 'Make your profile yours',
    subtitle:
      'Add a profile photo for a more personal CareSense experience.',
    icon: 'camera-outline',
    badge: 'Optional',
  },

  {
    key: 'notifications',
    title: 'Stay connected with CareSense',
    subtitle:
      'Enable notifications for reminders and important CareSense updates.',
    icon: 'notifications-outline',
    badge: 'Optional',
  },

  {
    key: 'physical',
    title: 'Your physical profile',
    subtitle:
      'These details help CareSense understand your health context.',
    icon: 'body-outline',
    badge: 'Health context',
  },

  {
    key: 'health',
    title: 'Your health background',
    subtitle:
      'Tell us about conditions, medicines, and allergies that matter.',
    icon: 'medkit-outline',
    badge: 'Health context',
  },

  {
    key: 'emergency',
    title: 'Emergency contact',
    subtitle:
      'Add someone CareSense can show when emergency support may be needed.',
    icon: 'call-outline',
    badge: 'Safety',
  },
];

export default function OnboardingScreen() {
  const {
    user,
    profile,
    saveProfile,
    isDarkMode,
  } = useContext(AuthContext);

  const isDark = Boolean(isDarkMode);

  const theme = useMemo(
    () => getTheme(isDark),
    [isDark],
  );

  const scrollRef = useRef(null);

  const fadeAnim =
    useRef(
      new Animated.Value(1),
    ).current;

  const slideAnim =
    useRef(
      new Animated.Value(0),
    ).current;

  const progressAnim =
    useRef(
      new Animated.Value(
        1 / STEPS.length,
      ),
    ).current;

  const mountedRef =
    useRef(true);

  const [step, setStep] =
    useState(0);

  const [saving, setSaving] =
    useState(false);

  // Permanent Cloudinary URL.
  const [photoUri, setPhotoUri] =
    useState(
      profile?.profile_photo_url ||
        null,
    );

  // Temporary local preview.
  const [photoPreviewUri, setPhotoPreviewUri] =
    useState(null);

  const [photoUploading, setPhotoUploading] =
    useState(false);

  const [
    notificationsEnabled,
    setNotificationsEnabled,
  ] = useState(false);

  const [
    notificationsLoading,
    setNotificationsLoading,
  ] = useState(false);

  const [
    notificationChecked,
    setNotificationChecked,
  ] = useState(false);

  const [
    focusedField,
    setFocusedField,
  ] = useState(null);

  const [form, setForm] =
    useState({
      first_name:
        profile?.first_name ||
        user?.displayName
          ?.split(' ')[0] ||
        '',

      last_name:
        profile?.last_name ||
        user?.displayName
          ?.split(' ')
          .slice(1)
          .join(' ') ||
        '',

      date_of_birth:
        formatDateOfBirth(
          profile?.date_of_birth,
        ),

      gender:
        profile?.gender || '',

      height_cm:
        profile?.height_cm
          ? String(
              profile.height_cm,
            )
          : '',

      weight_kg:
        profile?.weight_kg
          ? String(
              profile.weight_kg,
            )
          : '',

      blood_type:
        profile?.blood_type || '',

      medical_conditions:
        profile?.medical_conditions ||
        '',

      current_medications:
        profile?.current_medications ||
        '',

      allergies:
        profile?.allergies || '',

      emergency_contact_name:
        profile?.emergency_contact_name ||
        '',

      emergency_contact_phone:
        profile?.emergency_contact_phone ||
        '',

      emergency_contact_relation:
        profile?.emergency_contact_relation ||
        '',
    });

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  /*
   * Check notification permission
   * only when the notification step opens.
   */
  useEffect(() => {
    if (
      STEPS[step]?.key !==
      'notifications'
    ) {
      return;
    }

    let active = true;

    const loadNotificationPermission =
      async () => {
        try {
          setNotificationsLoading(
            true,
          );

          const result =
            await getNotificationPermissionStatus();

          if (!active) {
            return;
          }

          setNotificationsEnabled(
            Boolean(
              result?.granted,
            ),
          );

          setNotificationChecked(
            true,
          );
        } catch (error) {
          console.error(
            'Notification permission status error:',
            error,
          );

          if (active) {
            setNotificationChecked(
              true,
            );
          }
        } finally {
          if (active) {
            setNotificationsLoading(
              false,
            );
          }
        }
      };

    loadNotificationPermission();

    return () => {
      active = false;
    };
  }, [step]);

  /*
   * Animate step transitions
   * and progress bar.
   */
  useEffect(() => {
    const target =
      (step + 1) /
      STEPS.length;

    Animated.parallel([
      Animated.timing(
        progressAnim,
        {
          toValue: target,
          duration: 300,
          useNativeDriver: false,
        },
      ),

      Animated.sequence([
        Animated.parallel([
          Animated.timing(
            fadeAnim,
            {
              toValue: 0,
              duration: 90,
              useNativeDriver: true,
            },
          ),

          Animated.timing(
            slideAnim,
            {
              toValue: 10,
              duration: 90,
              useNativeDriver: true,
            },
          ),
        ]),

        Animated.parallel([
          Animated.timing(
            fadeAnim,
            {
              toValue: 1,
              duration: 220,
              useNativeDriver: true,
            },
          ),

          Animated.timing(
            slideAnim,
            {
              toValue: 0,
              duration: 220,
              useNativeDriver: true,
            },
          ),
        ]),
      ]),
    ]).start();

    requestAnimationFrame(
      () => {
        scrollRef.current?.scrollTo({
          y: 0,
          animated: true,
        });
      },
    );
  }, [
    step,
    fadeAnim,
    progressAnim,
    slideAnim,
  ]);

  const updateField = (
    field,
    value,
  ) => {
    setForm(previous => ({
      ...previous,
      [field]: value,
    }));
  };

  const validateCurrentStep =
    () => {
      const currentKey =
        STEPS[step]?.key;

      if (
        currentKey === 'basic'
      ) {
        if (
          !form.first_name.trim()
        ) {
          Alert.alert(
            'First name required',
            'Please enter your first name to continue.',
          );

          return false;
        }

        if (
          !form.last_name.trim()
        ) {
          Alert.alert(
            'Last name required',
            'Please enter your last name to continue.',
          );

          return false;
        }

        if (
          form.date_of_birth.trim()
        ) {
          const normalized =
            normalizeDateOfBirth(
              form.date_of_birth,
            );

          if (!normalized) {
            Alert.alert(
              'Invalid date of birth',
              'Please use DD/MM/YYYY, for example 18/09/2003.',
            );

            return false;
          }
        }

        return true;
      }

      if (
        currentKey === 'physical'
      ) {
        const height =
          form.height_cm.trim()
            ? Number(
                form.height_cm,
              )
            : null;

        const weight =
          form.weight_kg.trim()
            ? Number(
                form.weight_kg,
              )
            : null;

        if (
          height !== null &&
          (
            !Number.isFinite(
              height,
            ) ||
            height < 30 ||
            height > 300
          )
        ) {
          Alert.alert(
            'Check your height',
            'Please enter a height between 30 and 300 cm.',
          );

          return false;
        }

        if (
          weight !== null &&
          (
            !Number.isFinite(
              weight,
            ) ||
            weight < 1 ||
            weight > 500
          )
        ) {
          Alert.alert(
            'Check your weight',
            'Please enter a weight between 1 and 500 kg.',
          );

          return false;
        }

        return true;
      }

      if (
        currentKey === 'emergency'
      ) {
        if (
          form.emergency_contact_phone.trim() &&
          form.emergency_contact_phone
            .trim()
            .length < 7
        ) {
          Alert.alert(
            'Check the phone number',
            'Please enter a valid emergency contact number or leave it blank.',
          );

          return false;
        }
      }

      return true;
    };

  const transitionToStep =
    nextStepValue => {
      if (
        nextStepValue < 0 ||
        nextStepValue >= STEPS.length ||
        nextStepValue === step ||
        saving ||
        photoUploading ||
        notificationsLoading
      ) {
        return;
      }

      setStep(
        nextStepValue,
      );
    };

  const nextStep = () => {
    if (!validateCurrentStep()) {
      return;
    }

    if (
      step <
      STEPS.length - 1
    ) {
      transitionToStep(
        step + 1,
      );
    }
  };

  const previousStep = () => {
    if (step > 0) {
      transitionToStep(
        step - 1,
      );
    }
  };

  /*
   * PROFILE PHOTO
   */
  const handlePickPhoto =
    async () => {
      try {
        const permission =
          await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (
          !permission.granted
        ) {
          Alert.alert(
            'Photo permission needed',
            'CareSense only requests photo access when you choose to add a profile picture.',
            [
              {
                text: 'Not now',
                style: 'cancel',
              },
              {
                text: 'Open settings',
                onPress: () =>
                  Linking.openSettings(),
              },
            ],
          );

          return;
        }

        const result =
          await ImagePicker.launchImageLibraryAsync(
            {
              mediaTypes:
                ImagePicker.MediaTypeOptions.Images,

              allowsEditing:
                true,

              aspect:
                [1, 1],

              quality:
                0.85,
            },
          );

        if (
          result.canceled ||
          !result.assets?.length
        ) {
          return;
        }

        const selectedUri =
          result.assets[0].uri;

        setPhotoPreviewUri(
          selectedUri,
        );

        setPhotoUploading(
          true,
        );

        const uploaded =
          await uploadProfileImage(
            selectedUri,
          );

        if (
          !uploaded?.secure_url
        ) {
          throw new Error(
            'Cloudinary did not return a profile image URL.',
          );
        }

        setPhotoUri(
          uploaded.secure_url,
        );

        setPhotoPreviewUri(
          null,
        );
      } catch (error) {
        console.error(
          'Onboarding photo upload error:',
          error,
        );

        setPhotoPreviewUri(
          null,
        );

        Alert.alert(
          'Photo upload failed',
          error?.message ||
            'Unable to upload your profile photo right now.',
        );
      } finally {
        setPhotoUploading(
          false,
        );
      }
    };

  /*
   * NOTIFICATION PERMISSION
   *
   * IMPORTANT:
   * This function is intentionally OUTSIDE
   * the permission-status useEffect so the
   * notification button can access it.
   */
  const handleEnableNotifications =
    async () => {
      if (notificationsLoading) {
        return;
      }

      try {
        setNotificationsLoading(
          true,
        );

        const result =
          await requestNotificationPermission();

        if (
          !mountedRef.current
        ) {
          return;
        }

        if (
          result?.granted
        ) {
          setNotificationsEnabled(
            true,
          );

          setNotificationChecked(
            true,
          );

          Alert.alert(
            'Notifications enabled',
            'CareSense can now send important reminders and updates.',
          );

          return;
        }

        setNotificationChecked(
          true,
        );

        if (
          result?.canAskAgain ===
          false
        ) {
          Alert.alert(
            'Notifications are off',
            'Notifications are currently disabled for CareSense. You can enable them later from device settings.',
            [
              {
                text: 'Later',
                style: 'cancel',
              },
              {
                text: 'Open settings',
                onPress: () =>
                  Linking.openSettings(),
              },
            ],
          );

          return;
        }

        Alert.alert(
          'Not enabled',
          'You can continue onboarding and enable notifications later.',
        );
      } catch (error) {
        console.error(
          'Notification permission error:',
          error,
        );

        if (
          mountedRef.current
        ) {
          Alert.alert(
            'Permission error',
            'We could not update notification permission right now. You can continue onboarding and try again later.',
          );
        }
      } finally {
        if (
          mountedRef.current
        ) {
          setNotificationsLoading(
            false,
          );
        }
      }
    };

  /*
   * FINAL PROFILE SAVE
   */
  const finishOnboarding =
    async () => {
      if (
        !validateCurrentStep()
      ) {
        return;
      }

      try {
        setSaving(true);

        const enteredDate =
          form.date_of_birth.trim();

        const dateOfBirth =
          enteredDate
            ? normalizeDateOfBirth(
                enteredDate,
              )
            : null;

        const height =
          form.height_cm.trim()
            ? Number(
                form.height_cm,
              )
            : null;

        const weight =
          form.weight_kg.trim()
            ? Number(
                form.weight_kg,
              )
            : null;

        await saveProfile({
          first_name:
            form.first_name.trim(),

          last_name:
            form.last_name.trim(),

          profile_photo_url:
            photoUri || null,

          date_of_birth:
            dateOfBirth,

          gender:
            form.gender.trim(),

          height_cm:
            height,

          weight_kg:
            weight,

          blood_type:
            form.blood_type
              .trim()
              .toUpperCase(),

          medical_conditions:
            form.medical_conditions.trim(),

          current_medications:
            form.current_medications.trim(),

          allergies:
            form.allergies.trim(),

          emergency_contact_name:
            form.emergency_contact_name.trim(),

          emergency_contact_phone:
            form.emergency_contact_phone.trim(),

          emergency_contact_relation:
            form.emergency_contact_relation.trim(),

          onboarding_completed:
            true,
        });
      } catch (error) {
        console.error(
          'Onboarding save error:',
          error?.response
            ?.data || error,
        );

        Alert.alert(
          'Unable to save profile',
          error?.response?.data
            ? JSON.stringify(
                error.response.data,
              )
            : error?.message ||
                'Please check your information and try again.',
        );
      } finally {
        setSaving(false);
      }
    };

  const renderInput = (
    label,
    field,
    placeholder,
    options = {},
    helperText = '',
  ) => {
    const isFocused =
      focusedField === field;

    return (
      <View
        style={
          styles.inputGroup
        }
      >
        <View
          style={
            styles.inputLabelRow
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
            {label}
          </Text>

          {(
            field ===
              'date_of_birth' ||
            field === 'gender'
          ) && (
            <Text
              style={[
                styles.optionalLabel,
                {
                  color:
                    theme.textSecondary,
                },
              ]}
            >
              Optional
            </Text>
          )}
        </View>

        <TextInput
          style={[
            styles.input,
            {
              backgroundColor:
                isFocused
                  ? theme.inputFocusBg
                  : theme.inputBg,

              color:
                theme.textPrimary,

              borderColor:
                isFocused
                  ? theme.accent
                  : theme.border,
            },
          ]}
          placeholder={
            placeholder
          }
          placeholderTextColor={
            theme.textSecondary
          }
          value={
            form[field]
          }
          onFocus={() =>
            setFocusedField(
              field,
            )
          }
          onBlur={() =>
            setFocusedField(
              null,
            )
          }
          onChangeText={value =>
            updateField(
              field,
              value,
            )
          }
          {...options}
        />

        {helperText ? (
          <Text
            style={[
              styles.inputHelper,
              {
                color:
                  theme.textSecondary,
              },
            ]}
          >
            {helperText}
          </Text>
        ) : null}
      </View>
    );
  };

  const renderStep = () => {
    switch (
      STEPS[step].key
    ) {
      /*
       * BASIC
       */
      case 'basic':
        return (
          <View>
            <View
              style={[
                styles.sectionCard,
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
                  styles.sectionHeader
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
                    name="person-outline"
                    size={18}
                    color={
                      theme.accent
                    }
                  />
                </View>

                <View
                  style={
                    styles.sectionHeaderText
                  }
                >
                  <Text
                    style={[
                      styles.sectionCardTitle,
                      {
                        color:
                          theme.textPrimary,
                      },
                    ]}
                  >
                    Basic information
                  </Text>

                  <Text
                    style={[
                      styles.sectionCardSubtitle,
                      {
                        color:
                          theme.textSecondary,
                      },
                    ]}
                  >
                    Your name helps us personalize CareSense.
                  </Text>
                </View>
              </View>

              {renderInput(
                'First name',
                'first_name',
                'Your first name',
              )}

              {renderInput(
                'Last name',
                'last_name',
                'Your last name',
              )}

              {renderInput(
                'Date of birth',
                'date_of_birth',
                'DD/MM/YYYY',
                {
                  keyboardType:
                    'numbers-and-punctuation',

                  autoCapitalize:
                    'none',
                },
                'Used for age-aware health context.',
              )}

              {renderInput(
                'Gender',
                'gender',
                'Male, Female, Other',
                {
                  autoCapitalize:
                    'words',
                },
              )}
            </View>
          </View>
        );

      /*
       * PHOTO
       */
      case 'photo':
        return (
          <View
            style={
              styles.photoStep
            }
          >
            <View
              style={[
                styles.profilePhotoRing,
                {
                  borderColor:
                    theme.accent,

                  backgroundColor:
                    theme.card,
                },
              ]}
            >
              {photoPreviewUri ||
              photoUri ? (
                <Image
                  source={{
                    uri:
                      photoPreviewUri ||
                      photoUri,
                  }}
                  style={
                    styles.profilePhoto
                  }
                />
              ) : (
                <View
                  style={[
                    styles.profilePhotoPlaceholder,
                    {
                      backgroundColor:
                        theme.inputBg,
                    },
                  ]}
                >
                  <Ionicons
                    name="person-outline"
                    size={58}
                    color={
                      theme.textSecondary
                    }
                  />
                </View>
              )}

              {photoUploading && (
                <View
                  style={
                    styles.photoOverlay
                  }
                >
                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                  />

                  <Text
                    style={
                      styles.photoOverlayText
                    }
                  >
                    Uploading
                  </Text>
                </View>
              )}
            </View>

            <View
              style={[
                styles.photoStatusChip,
                {
                  backgroundColor:
                    photoUri &&
                    !photoPreviewUri
                      ? theme.successBg
                      : theme.inputBg,

                  borderColor:
                    photoUri &&
                    !photoPreviewUri
                      ? theme.successBorder
                      : theme.border,
                },
              ]}
            >
              <Ionicons
                name={
                  photoUri &&
                  !photoPreviewUri
                    ? 'checkmark-circle'
                    : 'image-outline'
                }
                size={15}
                color={
                  photoUri &&
                  !photoPreviewUri
                    ? '#10B981'
                    : theme.textSecondary
                }
              />

              <Text
                style={[
                  styles.photoStatusText,
                  {
                    color:
                      photoUri &&
                      !photoPreviewUri
                        ? '#10B981'
                        : theme.textSecondary,
                  },
                ]}
              >
                {photoUri &&
                !photoPreviewUri
                  ? 'Profile photo ready'
                  : 'No photo selected'}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.primaryWideButton,
                {
                  backgroundColor:
                    theme.accent,

                  opacity:
                    photoUploading
                      ? 0.65
                      : 1,
                },
              ]}
              onPress={
                handlePickPhoto
              }
              disabled={
                photoUploading
              }
              activeOpacity={0.84}
            >
              {photoUploading ? (
                <ActivityIndicator
                  size="small"
                  color={
                    BRAND.darkText
                  }
                />
              ) : (
                <Ionicons
                  name="camera-outline"
                  size={20}
                  color={
                    BRAND.darkText
                  }
                />
              )}

              <Text
                style={
                  styles.primaryWideButtonText
                }
              >
                {photoUploading
                  ? 'Uploading photo...'
                  : photoUri
                    ? 'Change profile photo'
                    : 'Choose profile photo'}
              </Text>
            </TouchableOpacity>

            <View
              style={[
                styles.securityNote,
                {
                  backgroundColor:
                    theme.inputBg,

                  borderColor:
                    theme.border,
                },
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={16}
                color={
                  theme.accent
                }
              />

              <Text
                style={[
                  styles.securityNoteText,
                  {
                    color:
                      theme.textSecondary,
                  },
                ]}
              >
                Your profile image is uploaded securely and the app
                stores only the permanent image URL.
              </Text>
            </View>

            <Text
              style={[
                styles.centerHint,
                {
                  color:
                    theme.textSecondary,
                },
              ]}
            >
              Optional. You can skip this step and add a photo
              later from Settings.
            </Text>
          </View>
        );

      /*
       * NOTIFICATIONS
       */
      case 'notifications':
        return (
          <View
            style={
              styles.notificationStep
            }
          >
            <View
              style={[
                styles.notificationHero,
                {
                  backgroundColor:
                    notificationsEnabled
                      ? theme.successBg
                      : theme.accentSoft,

                  borderColor:
                    notificationsEnabled
                      ? theme.successBorder
                      : theme.accentBorder,
                },
              ]}
            >
              <View
                style={[
                  styles.notificationHeroIcon,
                  {
                    backgroundColor:
                      notificationsEnabled
                        ? 'rgba(16, 185, 129, 0.14)'
                        : 'rgba(0, 212, 197, 0.14)',
                  },
                ]}
              >
                <Ionicons
                  name={
                    notificationsEnabled
                      ? 'notifications'
                      : 'notifications-outline'
                  }
                  size={36}
                  color={
                    notificationsEnabled
                      ? '#10B981'
                      : theme.accent
                  }
                />
              </View>

              <Text
                style={[
                  styles.notificationHeroTitle,
                  {
                    color:
                      theme.textPrimary,
                  },
                ]}
              >
                {notificationsEnabled
                  ? 'You’re all set'
                  : 'Stay on top of your care'}
              </Text>

              <Text
                style={[
                  styles.notificationHeroDescription,
                  {
                    color:
                      theme.textSecondary,
                  },
                ]}
              >
                {notificationsEnabled
                  ? 'CareSense has permission to send notifications on this device.'
                  : 'Get reminders and important CareSense updates without needing to keep the app open.'}
              </Text>

              <View
                style={
                  styles.notificationBenefits
                }
              >
                {[
                  'Medication and care reminders',
                  'Appointment updates',
                  'Important CareSense alerts',
                ].map(item => (
                  <View
                    key={item}
                    style={
                      styles.notificationBenefit
                    }
                  >
                    <View
                      style={[
                        styles.benefitCheck,
                        {
                          backgroundColor:
                            theme.accent,
                        },
                      ]}
                    >
                      <Ionicons
                        name="checkmark"
                        size={11}
                        color={
                          BRAND.darkText
                        }
                      />
                    </View>

                    <Text
                      style={[
                        styles.benefitText,
                        {
                          color:
                            theme.textSecondary,
                        },
                      ]}
                    >
                      {item}
                    </Text>
                  </View>
                ))}
              </View>

              {!notificationsEnabled && (
                <TouchableOpacity
                  style={[
                    styles.primaryWideButton,
                    {
                      backgroundColor:
                        theme.accent,

                      opacity:
                        notificationsLoading
                          ? 0.65
                          : 1,
                    },
                  ]}
                  onPress={
                    handleEnableNotifications
                  }
                  disabled={
                    notificationsLoading
                  }
                  activeOpacity={0.84}
                >
                  {notificationsLoading ? (
                    <ActivityIndicator
                      size="small"
                      color={
                        BRAND.darkText
                      }
                    />
                  ) : (
                    <Ionicons
                      name="notifications-outline"
                      size={20}
                      color={
                        BRAND.darkText
                      }
                    />
                  )}

                  <Text
                    style={
                      styles.primaryWideButtonText
                    }
                  >
                    Enable notifications
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View
              style={[
                styles.permissionNote,
                {
                  backgroundColor:
                    theme.inputBg,

                  borderColor:
                    theme.border,
                },
              ]}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={18}
                color={
                  theme.accent
                }
              />

              <Text
                style={[
                  styles.permissionNoteText,
                  {
                    color:
                      theme.textSecondary,
                  },
                ]}
              >
                Notifications are optional. You can change
                notification permissions anytime from your device
                settings.
              </Text>
            </View>
          </View>
        );

      /*
       * PHYSICAL
       */
      case 'physical':
        return (
          <View>
            <View
              style={[
                styles.sectionCard,
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
                  styles.sectionHeader
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
                    name="body-outline"
                    size={18}
                    color={
                      theme.accent
                    }
                  />
                </View>

                <View
                  style={
                    styles.sectionHeaderText
                  }
                >
                  <Text
                    style={[
                      styles.sectionCardTitle,
                      {
                        color:
                          theme.textPrimary,
                      },
                    ]}
                  >
                    Physical information
                  </Text>

                  <Text
                    style={[
                      styles.sectionCardSubtitle,
                      {
                        color:
                          theme.textSecondary,
                      },
                    ]}
                  >
                    Add what you’re comfortable sharing.
                  </Text>
                </View>
              </View>

              {renderInput(
                'Height (cm)',
                'height_cm',
                'e.g. 175',
                {
                  keyboardType:
                    'decimal-pad',
                },
              )}

              {renderInput(
                'Weight (kg)',
                'weight_kg',
                'e.g. 70',
                {
                  keyboardType:
                    'decimal-pad',
                },
              )}

              {renderInput(
                'Blood type',
                'blood_type',
                'e.g. O+',
                {
                  autoCapitalize:
                    'characters',

                  autoCorrect:
                    false,
                },
              )}
            </View>

            <View
              style={[
                styles.infoBox,
                {
                  backgroundColor:
                    theme.inputBg,

                  borderColor:
                    theme.border,
                },
              ]}
            >
              <Ionicons
                name="information-circle-outline"
                size={18}
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
                Leaving these fields blank is okay. You can
                complete your health profile later.
              </Text>
            </View>
          </View>
        );

      /*
       * HEALTH
       */
      case 'health':
        return (
          <View>
            <View
              style={[
                styles.sectionCard,
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
                  styles.sectionHeader
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
                    name="medkit-outline"
                    size={18}
                    color={
                      theme.accent
                    }
                  />
                </View>

                <View
                  style={
                    styles.sectionHeaderText
                  }
                >
                  <Text
                    style={[
                      styles.sectionCardTitle,
                      {
                        color:
                          theme.textPrimary,
                      },
                    ]}
                  >
                    Health background
                  </Text>

                  <Text
                    style={[
                      styles.sectionCardSubtitle,
                      {
                        color:
                          theme.textSecondary,
                      },
                    ]}
                  >
                    These details help provide relevant context.
                  </Text>
                </View>
              </View>

              {renderInput(
                'Medical conditions',
                'medical_conditions',
                'e.g. Asthma, diabetes, hypertension',
                {
                  multiline: true,
                  textAlignVertical:
                    'top',
                  minHeight: 80,
                },
                'List known conditions separated by commas.',
              )}

              {renderInput(
                'Current medications',
                'current_medications',
                'List medicines you currently take',
                {
                  multiline: true,
                  textAlignVertical:
                    'top',
                  minHeight: 80,
                },
              )}

              {renderInput(
                'Allergies',
                'allergies',
                'e.g. Penicillin, peanuts, pollen',
                {
                  multiline: true,
                  textAlignVertical:
                    'top',
                  minHeight: 80,
                },
              )}
            </View>

            <View
              style={[
                styles.infoBox,
                {
                  backgroundColor:
                    theme.inputBg,

                  borderColor:
                    theme.border,
                },
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={18}
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
                Share only information you are comfortable storing
                in your CareSense health profile.
              </Text>
            </View>
          </View>
        );

      /*
       * EMERGENCY
       */
      case 'emergency':
        return (
          <View>
            <View
              style={[
                styles.sectionCard,
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
                  styles.sectionHeader
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
                    name="shield-checkmark-outline"
                    size={18}
                    color={
                      theme.accent
                    }
                  />
                </View>

                <View
                  style={
                    styles.sectionHeaderText
                  }
                >
                  <Text
                    style={[
                      styles.sectionCardTitle,
                      {
                        color:
                          theme.textPrimary,
                      },
                    ]}
                  >
                    Emergency support
                  </Text>

                  <Text
                    style={[
                      styles.sectionCardSubtitle,
                      {
                        color:
                          theme.textSecondary,
                      },
                    ]}
                  >
                    Add someone you trust to keep on file.
                  </Text>
                </View>
              </View>

              {renderInput(
                'Contact name',
                'emergency_contact_name',
                'e.g. Father',
              )}

              {renderInput(
                'Phone number',
                'emergency_contact_phone',
                '+91 12345 67890',
                {
                  keyboardType:
                    'phone-pad',
                },
              )}

              {renderInput(
                'Relationship',
                'emergency_contact_relation',
                'e.g. Father, Mother, Spouse',
              )}
            </View>

            <View
              style={[
                styles.emergencyNote,
                {
                  backgroundColor:
                    theme.dangerBg,

                  borderColor:
                    isDark
                      ? 'rgba(239, 68, 68, 0.30)'
                      : '#FECACA',
                },
              ]}
            >
              <Ionicons
                name="warning-outline"
                size={18}
                color={
                  BRAND.danger
                }
              />

              <Text
                style={[
                  styles.emergencyNoteText,
                  {
                    color:
                      theme.textSecondary,
                  },
                ]}
              >
                For life-threatening emergencies, contact your local
                emergency service. CareSense is a decision-support
                application and does not replace emergency care.
              </Text>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  const currentStep =
    STEPS[step];

  const isLastStep =
    step ===
    STEPS.length - 1;

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor:
            theme.background,
        },
      ]}
    >
      <KeyboardAvoidingView
        style={
          styles.container
        }
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : 'height'
        }
      >
        {/* HEADER */}
        <View
          style={
            styles.header
          }
        >
          <View>
            <Text
              style={[
                styles.brand,
                {
                  color:
                    theme.accent,
                },
              ]}
            >
              CareSense AI
            </Text>

            <Text
              style={[
                styles.headerSubtext,
                {
                  color:
                    theme.textSecondary,
                },
              ]}
            >
              Your health profile
            </Text>
          </View>

          <View
            style={[
              styles.stepBadge,
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
                styles.stepBadgeText,
                {
                  color:
                    theme.textPrimary,
                },
              ]}
            >
              {step + 1}
            </Text>

            <Text
              style={[
                styles.stepBadgeSlash,
                {
                  color:
                    theme.textSecondary,
                },
              ]}
            >
              /
            </Text>

            <Text
              style={[
                styles.stepBadgeTotal,
                {
                  color:
                    theme.textSecondary,
                },
              ]}
            >
              {STEPS.length}
            </Text>
          </View>
        </View>

        {/* PROGRESS */}
        <View
          style={[
            styles.progressTrack,
            {
              backgroundColor:
                theme.border,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.progressFill,
              {
                backgroundColor:
                  theme.accent,

                width:
                  progressAnim.interpolate(
                    {
                      inputRange: [
                        0,
                        1,
                      ],

                      outputRange: [
                        '0%',
                        '100%',
                      ],
                    },
                  ),
              },
            ]}
          />
        </View>

        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={
            false
          }
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={
            styles.scrollContent
          }
        >
          <Animated.View
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
            {/* STEP IDENTITY */}
            <View
              style={
                styles.stepIdentity
              }
            >
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor:
                      theme.accentSoft,

                    borderColor:
                      theme.accentBorder,
                  },
                ]}
              >
                <Ionicons
                  name={
                    currentStep.icon
                  }
                  size={29}
                  color={
                    theme.accent
                  }
                />
              </View>

              <View
                style={[
                  styles.badge,
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
                    styles.badgeText,
                    {
                      color:
                        theme.textSecondary,
                    },
                  ]}
                >
                  {
                    currentStep.badge
                  }
                </Text>
              </View>
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
              {
                currentStep.title
              }
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
              {
                currentStep.subtitle
              }
            </Text>

            <View
              style={
                styles.formContainer
              }
            >
              {renderStep()}
            </View>
          </Animated.View>
        </ScrollView>

        {/* FOOTER */}
        <View
          style={[
            styles.footer,
            {
              backgroundColor:
                theme.background,

              borderTopColor:
                theme.border,
            },
          ]}
        >
          {step > 0 ? (
            <TouchableOpacity
              style={[
                styles.backButton,
                {
                  backgroundColor:
                    theme.card,

                  borderColor:
                    theme.border,
                },
              ]}
              onPress={
                previousStep
              }
              disabled={
                saving ||
                photoUploading ||
                notificationsLoading
              }
              activeOpacity={
                0.8
              }
            >
              <Ionicons
                name="arrow-back"
                size={20}
                color={
                  theme.textPrimary
                }
              />
            </TouchableOpacity>
          ) : (
            <View
              style={
                styles.backPlaceholder
              }
            />
          )}

          <TouchableOpacity
            style={[
              styles.continueButton,
              {
                backgroundColor:
                  theme.accent,

                opacity:
                  saving ||
                  photoUploading ||
                  notificationsLoading
                    ? 0.65
                    : 1,
              },
            ]}
            onPress={
              isLastStep
                ? finishOnboarding
                : nextStep
            }
            disabled={
              saving ||
              photoUploading ||
              notificationsLoading
            }
            activeOpacity={
              0.84
            }
          >
            <Text
              style={
                styles.continueText
              }
            >
              {photoUploading
                ? 'Uploading...'
                : notificationsLoading
                  ? 'Checking...'
                  : saving
                    ? 'Saving...'
                    : isLastStep
                      ? 'Finish setup'
                      : 'Continue'}
            </Text>

            {!saving &&
              !photoUploading &&
              !notificationsLoading && (
                <Ionicons
                  name={
                    isLastStep
                      ? 'checkmark'
                      : 'arrow-forward'
                  }
                  size={20}
                  color={
                    BRAND.darkText
                  }
                />
              )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,
    },

    container: {
      flex: 1,
    },

    header: {
      paddingHorizontal: 22,
      paddingTop: 9,
      paddingBottom: 10,

      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },

    brand: {
      fontSize: 19,
      fontWeight: '900',
      letterSpacing: -0.3,
    },

    headerSubtext: {
      fontSize: 11,
      fontWeight: '600',
      marginTop: 2,
    },

    stepBadge: {
      minWidth: 58,
      height: 36,
      paddingHorizontal: 11,
      borderRadius: 18,
      borderWidth: 1,

      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },

    stepBadgeText: {
      fontSize: 13,
      fontWeight: '800',
    },

    stepBadgeSlash: {
      fontSize: 12,
      marginHorizontal: 3,
    },

    stepBadgeTotal: {
      fontSize: 12,
      fontWeight: '700',
    },

    progressTrack: {
      height: 4,
      marginHorizontal: 22,
      borderRadius: 99,
      overflow: 'hidden',
    },

    progressFill: {
      height: '100%',
      borderRadius: 99,
    },

    scrollContent: {
      paddingHorizontal: 22,
      paddingTop: 28,
      paddingBottom: 34,
    },

    stepIdentity: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 18,
    },

    iconCircle: {
      width: 62,
      height: 62,
      borderRadius: 21,
      borderWidth: 1,

      alignItems: 'center',
      justifyContent: 'center',
    },

    badge: {
      marginLeft: 10,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 9,
      borderWidth: 1,
    },

    badgeText: {
      fontSize: 10.5,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },

    title: {
      fontSize: 30,
      lineHeight: 36,
      fontWeight: '900',
      letterSpacing: -0.9,
    },

    subtitle: {
      fontSize: 14,
      lineHeight: 21,
      marginTop: 9,
      maxWidth: 370,
    },

    formContainer: {
      marginTop: 28,
    },

    sectionCard: {
      borderRadius: 20,
      borderWidth: 1,
      padding: 18,
    },

    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
    },

    sectionIcon: {
      width: 42,
      height: 42,
      borderRadius: 13,

      alignItems: 'center',
      justifyContent: 'center',
    },

    sectionHeaderText: {
      flex: 1,
      marginLeft: 11,
    },

    sectionCardTitle: {
      fontSize: 15,
      fontWeight: '800',
    },

    sectionCardSubtitle: {
      fontSize: 11.5,
      lineHeight: 17,
      marginTop: 2,
    },

    inputGroup: {
      marginBottom: 15,
    },

    inputLabelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },

    inputLabel: {
      fontSize: 11.5,
      fontWeight: '800',
    },

    optionalLabel: {
      fontSize: 10,
      fontWeight: '600',
    },

    input: {
      minHeight: 50,
      borderRadius: 14,
      borderWidth: 1,
      paddingHorizontal: 14,
      fontSize: 14,
    },

    inputHelper: {
      fontSize: 10.5,
      lineHeight: 15,
      marginTop: 5,
    },

    photoStep: {
      alignItems: 'center',
    },

    profilePhotoRing: {
      width: 182,
      height: 182,
      borderRadius: 91,
      borderWidth: 3,
      padding: 4,

      alignItems: 'center',
      justifyContent: 'center',

      overflow: 'hidden',
    },

    profilePhoto: {
      width: '100%',
      height: '100%',
      borderRadius: 87,
    },

    profilePhotoPlaceholder: {
      width: '100%',
      height: '100%',
      borderRadius: 87,

      alignItems: 'center',
      justifyContent: 'center',
    },

    photoOverlay: {
      position: 'absolute',
      left: 5,
      right: 5,
      top: 5,
      bottom: 5,

      borderRadius: 87,

      backgroundColor:
        'rgba(10, 15, 26, 0.58)',

      alignItems: 'center',
      justifyContent: 'center',
    },

    photoOverlayText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '800',
      marginTop: 6,
    },

    photoStatusChip: {
      marginTop: 16,
      paddingHorizontal: 12,
      paddingVertical: 7,

      borderRadius: 10,
      borderWidth: 1,

      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },

    photoStatusText: {
      fontSize: 11,
      fontWeight: '700',
    },

    primaryWideButton: {
      width: '100%',
      minHeight: 50,
      marginTop: 18,
      paddingHorizontal: 18,

      borderRadius: 14,

      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',

      gap: 8,
    },

    primaryWideButtonText: {
      color: BRAND.darkText,
      fontSize: 13.5,
      fontWeight: '900',
    },

    securityNote: {
      width: '100%',
      marginTop: 14,
      padding: 13,

      borderRadius: 14,
      borderWidth: 1,

      flexDirection: 'row',
      alignItems: 'flex-start',
    },

    securityNoteText: {
      flex: 1,
      fontSize: 10.8,
      lineHeight: 16,
      marginLeft: 8,
    },

    centerHint: {
      fontSize: 11,
      lineHeight: 17,
      textAlign: 'center',

      maxWidth: 315,
      marginTop: 13,
    },

    notificationStep: {
      width: '100%',
    },

    notificationHero: {
      width: '100%',
      borderRadius: 22,
      borderWidth: 1,
      padding: 22,

      alignItems: 'center',
    },

    notificationHeroIcon: {
      width: 78,
      height: 78,
      borderRadius: 25,

      alignItems: 'center',
      justifyContent: 'center',

      marginBottom: 18,
    },

    notificationHeroTitle: {
      fontSize: 21,
      lineHeight: 26,
      fontWeight: '900',
      textAlign: 'center',
    },

    notificationHeroDescription: {
      fontSize: 12.5,
      lineHeight: 19,
      textAlign: 'center',
      marginTop: 9,
      maxWidth: 315,
    },

    notificationBenefits: {
      width: '100%',
      marginTop: 19,
    },

    notificationBenefit: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
    },

    benefitCheck: {
      width: 20,
      height: 20,
      borderRadius: 10,

      alignItems: 'center',
      justifyContent: 'center',

      marginRight: 9,
    },

    benefitText: {
      flex: 1,
      fontSize: 12,
      lineHeight: 18,
    },

    permissionNote: {
      width: '100%',
      marginTop: 14,
      padding: 13,

      borderRadius: 14,
      borderWidth: 1,

      flexDirection: 'row',
      alignItems: 'flex-start',
    },

    permissionNoteText: {
      flex: 1,
      fontSize: 10.8,
      lineHeight: 16,
      marginLeft: 8,
    },

    infoBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',

      borderRadius: 14,
      borderWidth: 1,

      padding: 13,
      marginTop: 14,
    },

    infoText: {
      flex: 1,
      fontSize: 11.2,
      lineHeight: 17,
      marginLeft: 9,
    },

    emergencyNote: {
      borderRadius: 15,
      borderWidth: 1,
      padding: 14,
      marginTop: 14,

      flexDirection: 'row',
      alignItems: 'flex-start',
    },

    emergencyNoteText: {
      flex: 1,
      fontSize: 10.8,
      lineHeight: 17,
      marginLeft: 8,
    },

    footer: {
      flexDirection: 'row',
      alignItems: 'center',

      paddingHorizontal: 22,
      paddingTop: 10,
      paddingBottom: 12,

      borderTopWidth: 1,
    },

    backButton: {
      width: 50,
      height: 50,

      borderRadius: 15,
      borderWidth: 1,

      alignItems: 'center',
      justifyContent: 'center',

      marginRight: 10,
    },

    backPlaceholder: {
      width: 50,
      marginRight: 10,
    },

    continueButton: {
      flex: 1,
      height: 50,

      borderRadius: 15,

      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',

      gap: 8,
    },

    continueText: {
      color: BRAND.darkText,
      fontSize: 14,
      fontWeight: '900',
    },
  });