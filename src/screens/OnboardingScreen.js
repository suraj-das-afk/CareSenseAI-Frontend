import React, {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Animated,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Pressable,
  View,
  StatusBar,
  useWindowDimensions,
} from 'react-native';

import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import { AuthContext } from '../context/AuthContext';
import { PopupContext } from '../context/PopupContext';
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

function AnimatedButton({
  children,
  onPress,
  onLongPress,
  style,
  pressableStyle,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  hitSlop,
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = toValue => {
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      speed: 45,
      bounciness: 4,
    }).start();
  };

  return (
    <Pressable
      style={pressableStyle}
      onPressIn={() => {
        if (!disabled) animateTo(0.975);
      }}
      onPressOut={() => {
        if (!disabled) animateTo(1);
      }}
      onPress={disabled ? undefined : onPress}
      onLongPress={disabled ? undefined : onLongPress}
      disabled={disabled}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
    >
      <Animated.View
        style={[
          style,
          {
            transform: [{ scale }],
          },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}


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


const formatListField = value => {
  if (Array.isArray(value)) {
    return value
      .map(item => String(item).trim())
      .filter(Boolean)
      .join(', ');
  }

  if (value === null || value === undefined) {
    return '';
  }

  return String(value);
};


const parseListField = value => {
  const source = Array.isArray(value)
    ? value
    : String(value || '').split(',');

  const seen = new Set();

  return source
    .map(item => String(item).trim())
    .filter(Boolean)
    .filter(item => {
      const key = item.toLowerCase();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
};


const getApiErrorMessage = error => {
  const data = error?.response?.data;

  if (!data) {
    return error?.message || 'Unable to save your profile right now.';
  }

  if (typeof data === 'string') {
    return data;
  }

  if (typeof data.detail === 'string') {
    return data.detail;
  }

  if (typeof data === 'object') {
    const messages = Object.entries(data)
      .flatMap(([field, value]) => {
        const values = Array.isArray(value)
          ? value
          : [value];

        return values
          .filter(Boolean)
          .map(message => `${field}: ${message}`);
      });

    if (messages.length > 0) {
      return messages.join('\n');
    }
  }

  return 'Unable to save your profile right now.';
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
    logout,
    isDarkMode,
  } = useContext(AuthContext);

  const { showPopup } = useContext(PopupContext) || {};

  const isDark = Boolean(isDarkMode);

  const theme = useMemo(
    () => getTheme(isDark),
    [isDark],
  );

  const {
    width: windowWidth,
  } = useWindowDimensions();

  const horizontalGutter =
    Math.min(24, Math.max(16, windowWidth * 0.055));

  const contentWidth =
    Math.min(620, Math.max(0, windowWidth - horizontalGutter * 2));

  const compactLayout =
    windowWidth < 390;

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

  const [photoLoadFailed, setPhotoLoadFailed] =
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

  const [
    keyboardVisible,
    setKeyboardVisible,
  ] = useState(false);

  // Native handle of the input that opened the keyboard.
  // We defer the scroll until the keyboard is actually visible so Android
  // has finished resizing the viewport before we calculate the target.
  const pendingKeyboardTargetRef = useRef(null);

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
        formatListField(
          profile?.medical_conditions,
        ),

      current_medications:
        formatListField(
          profile?.current_medications,
        ),

      allergies:
        formatListField(
          profile?.allergies,
        ),

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
   * Keep late-arriving backend profile values in sync without
   * overwriting anything the user has already typed.
   */
  useEffect(() => {
    if (!profile) {
      return;
    }

    setForm(previous => ({
      ...previous,

      first_name:
        previous.first_name ||
        profile.first_name ||
        user?.displayName?.split(' ')[0] ||
        '',

      last_name:
        previous.last_name ||
        profile.last_name ||
        user?.displayName
          ?.split(' ')
          .slice(1)
          .join(' ') ||
        '',

      date_of_birth:
        previous.date_of_birth ||
        formatDateOfBirth(profile.date_of_birth),

      gender:
        previous.gender ||
        profile.gender ||
        '',

      height_cm:
        previous.height_cm ||
        (profile.height_cm !== null &&
        profile.height_cm !== undefined
          ? String(profile.height_cm)
          : ''),

      weight_kg:
        previous.weight_kg ||
        (profile.weight_kg !== null &&
        profile.weight_kg !== undefined
          ? String(profile.weight_kg)
          : ''),

      blood_type:
        previous.blood_type ||
        profile.blood_type ||
        '',

      medical_conditions:
        previous.medical_conditions ||
        formatListField(profile.medical_conditions),

      current_medications:
        previous.current_medications ||
        formatListField(profile.current_medications),

      allergies:
        previous.allergies ||
        formatListField(profile.allergies),

      emergency_contact_name:
        previous.emergency_contact_name ||
        profile.emergency_contact_name ||
        '',

      emergency_contact_phone:
        previous.emergency_contact_phone ||
        profile.emergency_contact_phone ||
        '',

      emergency_contact_relation:
        previous.emergency_contact_relation ||
        profile.emergency_contact_relation ||
        '',
    }));

    setPhotoUri(previous =>
      previous ||
      profile.profile_photo_url ||
      null,
    );

  }, [profile, user]);


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
   * Animate onboarding step transitions,
   * progress, and the step identity icon.
   */
  const stepIconScale =
    useRef(
      new Animated.Value(0.9),
    ).current;

  const stepIconOpacity =
    useRef(
      new Animated.Value(0),
    ).current;

  useEffect(() => {
    const target =
      (step + 1) /
      STEPS.length;

    fadeAnim.stopAnimation();
    slideAnim.stopAnimation();
    progressAnim.stopAnimation();
    stepIconScale.stopAnimation();
    stepIconOpacity.stopAnimation();

    fadeAnim.setValue(0);
    slideAnim.setValue(12);
    stepIconScale.setValue(0.9);
    stepIconOpacity.setValue(0);

    const progressAnimation = Animated.timing(
      progressAnim,
      {
        toValue: target,
        duration: 320,
        useNativeDriver: false,
      },
    );

    const contentAnimation = Animated.parallel([
      Animated.timing(
        fadeAnim,
        {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        },
      ),
      Animated.spring(
        slideAnim,
        {
          toValue: 0,
          useNativeDriver: true,
          damping: 18,
          stiffness: 155,
          mass: 0.8,
        },
      ),
    ]);

    const iconAnimation = Animated.sequence([
      Animated.delay(55),
      Animated.parallel([
        Animated.timing(
          stepIconOpacity,
          {
            toValue: 1,
            duration: 180,
            useNativeDriver: true,
          },
        ),
        Animated.spring(
          stepIconScale,
          {
            toValue: 1,
            useNativeDriver: true,
            damping: 13,
            stiffness: 190,
            mass: 0.65,
          },
        ),
      ]),
    ]);

    progressAnimation.start();
    Animated.parallel([
      contentAnimation,
      iconAnimation,
    ]).start();

    const timeout = setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: 0,
        animated: true,
      });
    }, 0);

    return () => {
      clearTimeout(timeout);
      fadeAnim.stopAnimation();
      slideAnim.stopAnimation();
      progressAnim.stopAnimation();
      stepIconScale.stopAnimation();
      stepIconOpacity.stopAnimation();
    };
  }, [
    step,
    fadeAnim,
    progressAnim,
    slideAnim,
    stepIconScale,
    stepIconOpacity,
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
        /*
         * Every onboarding field is optional. Validate only when
         * a value is actually supplied by the user.
         */
        if (form.date_of_birth.trim()) {
          const normalized =
            normalizeDateOfBirth(
              form.date_of_birth,
            );

          if (!normalized) {
            showPopup?.(
              'Invalid date of birth',
              'Use DD/MM/YYYY, for example 18/09/2003, or leave it blank.',
              'warning',
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
          showPopup?.(
            'Check your height',
            'Please enter a height between 30 and 300 cm.',
            'warning',
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
          showPopup?.(
            'Check your weight',
            'Please enter a weight between 1 and 500 kg.',
            'warning',
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
          showPopup?.(
            'Check the phone number',
            'Please enter a valid emergency contact number or leave it blank.',
            'warning',
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
        photoUploading
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

    Keyboard.dismiss();
    setFocusedField(null);

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
      Keyboard.dismiss();
      setFocusedField(null);
      transitionToStep(
        step - 1,
      );
    }
  };

  const handleWrongAccount = async () => {
    if (saving || photoUploading) {
      return;
    }

    Keyboard.dismiss();

    showPopup?.(
      'Switch account?',
      'You will be signed out and returned to Login. From there you can choose the correct Google account or open Sign Up.',
      'warning',
      async () => {
        try {
          await logout();
        } catch (error) {
          console.error(
            'Onboarding account switch error:',
            error,
          );

          showPopup?.(
            'Unable to sign out',
            'Please try again.',
            'error',
          );
        }
      },
    );
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
          showPopup?.(
            'Photo permission needed',
            'CareSense only requests photo access when you choose to add a profile picture. Tap Confirm to open device settings.',
            'warning',
            () => {
              Linking.openSettings();
            },
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

        setPhotoLoadFailed(false);

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

        setPhotoLoadFailed(false);

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

        showPopup?.(
          'Photo upload failed',
          error?.message ||
            'Unable to upload your profile photo right now.',
          'error',
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

          showPopup?.(
            'Notifications enabled',
            'CareSense can now send important reminders and updates.',
            'success',
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
          showPopup?.(
            'Notifications are off',
            'Notifications are currently disabled for CareSense. Tap Confirm to open device settings.',
            'warning',
            () => {
              Linking.openSettings();
            },
          );

          return;
        }

        showPopup?.(
          'Not enabled',
          'You can continue onboarding and enable notifications later.',
          'info',
        );
      } catch (error) {
        console.error(
          'Notification permission error:',
          error,
        );

        if (
          mountedRef.current
        ) {
          showPopup?.(
            'Permission error',
            'We could not update notification permission right now. You can continue onboarding and try again later.',
            'error',
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
      if (saving || photoUploading) {
        return;
      }

      if (!validateCurrentStep()) {
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

        if (enteredDate && !dateOfBirth) {
          throw new Error(
            'Please enter a valid date of birth, for example 18/09/2003.',
          );
        }

        const heightText =
          form.height_cm.trim();

        const weightText =
          form.weight_kg.trim();

        const height =
          heightText
            ? Number(heightText)
            : null;

        const weight =
          weightText
            ? Number(weightText)
            : null;

        if (
          height !== null &&
          (!Number.isFinite(height) ||
            height < 30 ||
            height > 300)
        ) {
          throw new Error(
            'Please enter a valid height between 30 and 300 cm, or leave it blank.',
          );
        }

        if (
          weight !== null &&
          (!Number.isFinite(weight) ||
            weight < 1 ||
            weight > 500)
        ) {
          throw new Error(
            'Please enter a valid weight between 1 and 500 kg, or leave it blank.',
          );
        }

        const medicalConditions =
          parseListField(
            form.medical_conditions,
          );

        const currentMedications =
          parseListField(
            form.current_medications,
          );

        const allergies =
          parseListField(
            form.allergies,
          );

        const profilePhotoUrl =
          photoUri ||
          '';

        await saveProfile({
          first_name:
            form.first_name.trim(),

          last_name:
            form.last_name.trim(),

          profile_photo_url:
            profilePhotoUrl,

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
            medicalConditions,

          current_medications:
            currentMedications,

          allergies:
            allergies,

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
          error?.response?.data || error,
        );

        if (mountedRef.current) {
          showPopup?.(
            'Unable to save profile',
            getApiErrorMessage(error),
            'error',
          );
        }
      } finally {
        if (mountedRef.current) {
          setSaving(false);
        }
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

    const {
      minHeight,
      ...textInputOptions
    } = options;

    const isMultiline =
      textInputOptions.multiline === true;

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
        </View>

        <TextInput
          style={[
            styles.input,
            isMultiline
              ? styles.textArea
              : null,
            minHeight
              ? { minHeight }
              : null,
            isFocused
              ? styles.inputFocused
              : null,
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
            typeof form[field] === 'string'
              ? form[field]
              : formatListField(form[field])
          }
          onFocus={event => {
            setFocusedField(field);

            const nativeTarget =
              event?.nativeEvent?.target;

            pendingKeyboardTargetRef.current =
              nativeTarget || null;

            const scrollInputIntoView = () => {
              const target =
                pendingKeyboardTargetRef.current;

              const responder =
                scrollRef.current?.getScrollResponder?.();

              if (
                !target ||
                !responder?.scrollResponderScrollNativeHandleToKeyboard
              ) {
                return;
              }

              responder.scrollResponderScrollNativeHandleToKeyboard(
                target,
                Platform.OS === 'android' ? 72 : 32,
                true,
              );
            };

            requestAnimationFrame(scrollInputIntoView);
            setTimeout(scrollInputIntoView, Platform.OS === 'android' ? 220 : 120);
          }}
          onBlur={() => {
            setFocusedField(null);
            pendingKeyboardTargetRef.current = null;
          }}
          onChangeText={value =>
            updateField(
              field,
              value,
            )
          }
          accessibilityLabel={label}
          autoCorrect={
            textInputOptions.autoCorrect ?? false
          }
          autoCapitalize={
            textInputOptions.autoCapitalize ?? 'sentences'
          }
          blurOnSubmit={!isMultiline}
          {...textInputOptions}
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
    const activeStepKey = STEPS[step]?.key;

    switch (activeStepKey) {
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
              {
                (photoPreviewUri || photoUri) &&
                !photoLoadFailed ? (
                <Image
                  source={{
                    uri:
                      photoPreviewUri ||
                      photoUri,
                  }}
                  style={
                    styles.profilePhoto
                  }
                  onLoad={() => setPhotoLoadFailed(false)}
                  onError={() => setPhotoLoadFailed(true)}
                  accessibilityLabel="CareSense profile photo"
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
                    !photoPreviewUri &&
                    !photoLoadFailed
                      ? theme.successBg
                      : theme.inputBg,

                  borderColor:
                    photoUri &&
                    !photoPreviewUri &&
                    !photoLoadFailed
                      ? theme.successBorder
                      : theme.border,
                },
              ]}
            >
              <Ionicons
                name={
                  photoUri &&
                  !photoPreviewUri &&
                  !photoLoadFailed
                    ? 'checkmark-circle'
                    : 'image-outline'
                }
                size={15}
                color={
                  photoUri &&
                  !photoPreviewUri &&
                  !photoLoadFailed
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
                      !photoPreviewUri &&
                      !photoLoadFailed
                        ? '#10B981'
                        : theme.textSecondary,
                  },
                ]}
              >
                {photoUri &&
                !photoPreviewUri &&
                !photoLoadFailed
                  ? 'Profile photo ready'
                  : photoLoadFailed
                    ? 'Photo could not be loaded'
                    : 'No photo selected'}
              </Text>
            </View>

            <AnimatedButton
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
              accessibilityLabel="Choose profile photo"
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
            </AnimatedButton>

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
              {photoLoadFailed
                ? 'We could not display that image. Choose another photo or continue without one.'
                : 'Optional. You can skip this step and add a photo later from Settings.'}
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
                <AnimatedButton
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
                  accessibilityLabel="Enable notifications"
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
                </AnimatedButton>
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
    STEPS[step] || STEPS[0];

  const isLastStep =
    step ===
    STEPS.length - 1;

  const progressPercent =
    Math.round(
      ((step + 1) / STEPS.length) * 100,
    );

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios'
        ? 'keyboardWillShow'
        : 'keyboardDidShow';

    const hideEvent =
      Platform.OS === 'ios'
        ? 'keyboardWillHide'
        : 'keyboardDidHide';

    const scrollInputIntoView = () => {
      const target =
        pendingKeyboardTargetRef.current;

      const responder =
        scrollRef.current?.getScrollResponder?.();

      if (
        !target ||
        !responder?.scrollResponderScrollNativeHandleToKeyboard
      ) {
        return;
      }

      responder.scrollResponderScrollNativeHandleToKeyboard(
        target,
        Platform.OS === 'android' ? 72 : 32,
        true,
      );
    };

    const showSubscription =
      Keyboard.addListener(
        showEvent,
        () => {
          setKeyboardVisible(true);

          // Let Android finish the viewport resize before scrolling.
          requestAnimationFrame(() => {
            setTimeout(scrollInputIntoView, Platform.OS === 'android' ? 140 : 80);
          });
        },
      );

    const hideSubscription =
      Keyboard.addListener(
        hideEvent,
        () => {
          setKeyboardVisible(false);
        },
      );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const signedInLabel =
    user?.email ||
    user?.displayName ||
    'Signed-in account';

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
        style={styles.container}
      >
        {/* HEADER */}
        {!keyboardVisible && (
        <View
          style={[
            styles.header,
            {
              width: contentWidth,
              alignSelf: 'center',
            },
          ]}
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

            <Text
              style={[
                styles.accountEmail,
                {
                  color: theme.textSecondary,
                },
              ]}
              numberOfLines={1}
            >
              {signedInLabel}
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

        )}

        {!keyboardVisible && (
        <AnimatedButton
          style={[
            styles.accountSwitchButton,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
          onPress={handleWrongAccount}
          disabled={saving || photoUploading}
          accessibilityLabel="Use a different account"
          accessibilityHint="Signs out so you can choose another account"
          activeOpacity={0.78}
        >
          <Ionicons
            name="swap-horizontal-outline"
            size={16}
            color={theme.accent}
          />

          <Text
            style={[
              styles.accountSwitchText,
              {
                color: theme.textSecondary,
              },
            ]}
          >
            Signed in with the wrong account?
          </Text>

          <Text
            style={[
              styles.accountSwitchAction,
              {
                color: theme.textPrimary,
              },
            ]}
          >
            Use a different account
          </Text>
        </AnimatedButton>

        )}

        {/* PROGRESS */}
        <View
          style={[
            styles.progressWrap,
            keyboardVisible
              ? styles.progressWrapKeyboard
              : null,
            {
              width: contentWidth,
              alignSelf: 'center',
            },
          ]}
        >
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

          <View style={styles.progressMeta}>
            <Text
              style={[
                styles.progressMetaText,
                { color: theme.textSecondary },
              ]}
            >
              Step {step + 1} of {STEPS.length}
            </Text>

            <Text
              style={[
                styles.progressMetaText,
                { color: theme.accent, fontWeight: '800' },
              ]}
            >
              {progressPercent}% complete
            </Text>
          </View>
        </View>

        <KeyboardAvoidingView
          style={styles.contentArea}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            contentContainerStyle={[
              styles.scrollContent,
              keyboardVisible ? styles.scrollContentKeyboard : null,
              {
                paddingHorizontal: 0,
                paddingTop: keyboardVisible ? 8 : 0,
                paddingBottom: keyboardVisible ? 96 : 176,
              },
            ]}
        >
          <Animated.View
            style={[
              styles.contentColumn,
              {
                width: contentWidth,
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
          >
            {/* STEP IDENTITY */}
            <View
              style={
                styles.stepIdentity
              }
            >
              <Animated.View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor:
                      theme.accentSoft,

                    borderColor:
                      theme.accentBorder,

                    opacity:
                      stepIconOpacity,

                    transform: [
                      {
                        scale:
                          stepIconScale,
                      },
                    ],
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
              </Animated.View>

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
        </KeyboardAvoidingView>

        {/* FOOTER */}
        <View
          pointerEvents={keyboardVisible ? 'none' : 'auto'}
          style={[
            styles.footer,
            keyboardVisible ? styles.footerKeyboardHidden : null,
            {
              backgroundColor: isDark
                ? 'rgba(10, 15, 26, 0.98)'
                : 'rgba(255, 255, 255, 0.98)',

              borderTopColor:
                theme.border,
            },
          ]}
        >
          <View
            style={[
              styles.footerInner,
              {
                width: contentWidth,
                alignSelf: 'center',
              },
            ]}
          >
          <View style={styles.footerActions}>
          {step > 0 ? (
            <AnimatedButton
              style={[
                styles.backButton,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
              onPress={previousStep}
              disabled={saving || photoUploading}
              accessibilityLabel="Go to previous step"
            >
              <Ionicons
                name="arrow-back"
                size={20}
                color={theme.textPrimary}
              />
            </AnimatedButton>
          ) : null}

          <AnimatedButton
            pressableStyle={[
              styles.continuePressable,
              step === 0 ? styles.continuePressableFull : null,
            ]}
            style={[
              styles.continueButton,
              {
                backgroundColor:
                  theme.accent,

                opacity:
                  saving ||
                  photoUploading
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
              photoUploading
            }
            accessibilityLabel={
              isLastStep
                ? 'Finish profile setup'
                : 'Continue to next onboarding step'
            }
            activeOpacity={
              0.84
            }
          >
            <View style={styles.continueLabelWrap}>
              {(saving || photoUploading) ? (
                <ActivityIndicator
                  size="small"
                  color={BRAND.darkText}
                />
              ) : null}

              <Text style={styles.continueText}>
                {photoUploading
                  ? 'Uploading...'
                  : saving
                    ? 'Saving...'
                    : isLastStep
                      ? 'Finish setup'
                      : 'Continue'}
              </Text>
            </View>

            {!saving && !photoUploading ? (
              <View style={styles.continueIconBubble}>
                <Ionicons
                  name={
                    isLastStep
                      ? 'checkmark'
                      : 'arrow-forward'
                  }
                  size={21}
                  color={BRAND.darkText}
                />
              </View>
            ) : null}
          </AnimatedButton>
          </View>

          <Text
            style={[
              styles.footerHint,
              {
                color:
                  theme.textSecondary,
              },
            ]}
          >
            You can finish now and complete optional details later in Settings.
          </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    safeArea: { flex: 1 },
    container: { flex: 1 },

    header: {
      paddingTop: 12,
      paddingBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },

    brand: {
      fontSize: 19,
      lineHeight: 23,
      fontWeight: '900',
      letterSpacing: -0.3,
    },

    headerSubtext: {
      fontSize: 11,
      lineHeight: 15,
      fontWeight: '600',
      marginTop: 2,
    },

    accountEmail: {
      fontSize: 10.5,
      lineHeight: 14,
      fontWeight: '600',
      marginTop: 3,
      maxWidth: 230,
    },

    accountSwitchButton: {
      width: '100%',
      minHeight: 42,
      marginTop: 2,
      marginBottom: 10,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 14,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
    },

    accountSwitchText: {
      flexShrink: 1,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: '600',
    },

    accountSwitchAction: {
      flexShrink: 1,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: '900',
    },

    stepBadge: {
      minWidth: 60,
      height: 36,
      paddingHorizontal: 11,
      borderRadius: 18,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },

    stepBadgeText: { fontSize: 13, lineHeight: 16, fontWeight: '800' },
    stepBadgeSlash: { fontSize: 12, lineHeight: 15, marginHorizontal: 3 },
    stepBadgeTotal: { fontSize: 12, lineHeight: 15, fontWeight: '700' },

    progressWrap: {},

    progressWrapKeyboard: {
      marginTop: 2,
      marginBottom: 6,
    },
    progressTrack: {
      height: 5,
      width: '100%',
      borderRadius: 99,
      overflow: 'hidden',
    },
    progressFill: { height: '100%', borderRadius: 99 },

    progressMeta: {
      marginTop: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 2,
    },

    progressMetaText: {
      fontSize: 10,
      lineHeight: 13,
      fontWeight: '700',
    },

    scrollContent: {
      flexGrow: 1,
      alignItems: 'center',
      paddingTop: 22,
      paddingBottom: 150,
    },

    scrollContentKeyboard: {
      paddingTop: 16,
    },

    contentColumn: {
      alignSelf: 'center',
      width: '100%',
    },

    stepIdentity: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 18,
    },

    iconCircle: {
      width: 58,
      height: 58,
      borderRadius: 19,
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
      fontSize: 10,
      lineHeight: 13,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },

    title: {
      fontSize: 32,
      lineHeight: 38,
      fontWeight: '900',
      letterSpacing: -0.9,
    },

    subtitle: {
      fontSize: 14.5,
      lineHeight: 21,
      marginTop: 9,
      maxWidth: 520,
    },

    formContainer: { marginTop: 22, width: '100%' },

    sectionCard: {
      width: '100%',
      borderRadius: 22,
      borderWidth: 1,
      padding: 20,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 18,
      elevation: 4,
    },

    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 19,
    },

    sectionIcon: {
      width: 42,
      height: 42,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },

    sectionHeaderText: {
      flex: 1,
      minWidth: 0,
      marginLeft: 11,
    },

    sectionCardTitle: { fontSize: 15, lineHeight: 19, fontWeight: '800' },
    sectionCardSubtitle: { fontSize: 11.5, lineHeight: 17, marginTop: 3 },
    inputGroup: { marginBottom: 14 },

    inputLabelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      minHeight: 18,
      marginBottom: 6,
    },

    inputLabel: {
      flex: 1,
      fontSize: 11.5,
      lineHeight: 16,
      fontWeight: '800',
    },

    optionalLabel: {
      fontSize: 10,
      lineHeight: 13,
      fontWeight: '600',
      marginLeft: 10,
    },

    input: {
      width: '100%',
      minHeight: 54,
      borderRadius: 16,
      borderWidth: 1,
      paddingHorizontal: 14,
      paddingVertical: 0,
      fontSize: 14,
      lineHeight: 20,
    },

    inputFocused: { borderWidth: 1 },

    textArea: {
      minHeight: 92,
      paddingTop: 13,
      paddingBottom: 13,
      lineHeight: 20,
    },

    inputHelper: { fontSize: 10.5, lineHeight: 15, marginTop: 5 },

    photoStep: {
      width: '100%',
      alignItems: 'center',
      paddingTop: 4,
    },

    profilePhotoRing: {
      width: 176,
      height: 176,
      borderRadius: 88,
      borderWidth: 3,
      padding: 4,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },

    profilePhoto: { width: '100%', height: '100%', borderRadius: 84 },
    profilePhotoPlaceholder: {
      width: '100%',
      height: '100%',
      borderRadius: 84,
      alignItems: 'center',
      justifyContent: 'center',
    },

    photoOverlay: {
      position: 'absolute',
      left: 5,
      right: 5,
      top: 5,
      bottom: 5,
      borderRadius: 84,
      backgroundColor: 'rgba(10, 15, 26, 0.58)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    photoOverlayText: {
      color: '#FFFFFF',
      fontSize: 11,
      lineHeight: 14,
      fontWeight: '800',
      marginTop: 6,
    },

    photoStatusChip: {
      marginTop: 14,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 10,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },

    photoStatusText: { fontSize: 11, lineHeight: 14, fontWeight: '700' },

    primaryWideButton: {
      width: '100%',
      minHeight: 50,
      marginTop: 17,
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
      lineHeight: 18,
      fontWeight: '900',
    },

    securityNote: {
      width: '100%',
      marginTop: 13,
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
      maxWidth: 360,
      marginTop: 12,
    },

    notificationStep: { width: '100%' },

    notificationHero: {
      width: '100%',
      borderRadius: 22,
      borderWidth: 1,
      padding: 22,
      alignItems: 'center',
    },

    notificationHeroIcon: {
      width: 76,
      height: 76,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 17,
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
      maxWidth: 430,
    },

    notificationBenefits: { width: '100%', marginTop: 18 },

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
      flexShrink: 0,
    },

    benefitText: { flex: 1, fontSize: 12, lineHeight: 18 },

    permissionNote: {
      width: '100%',
      marginTop: 13,
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
      marginTop: 13,
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
      marginTop: 13,
      flexDirection: 'row',
      alignItems: 'flex-start',
    },

    emergencyNoteText: {
      flex: 1,
      fontSize: 10.8,
      lineHeight: 17,
      marginLeft: 8,
    },

    contentArea: {
      flex: 1,
      minHeight: 0,
    },

    footer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      borderTopWidth: 1,
      paddingTop: 12,
      paddingBottom: 12,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: -6 },
      shadowOpacity: 0.14,
      shadowRadius: 18,
      elevation: 16,
      zIndex: 100,
    },

    footerKeyboardHidden: {
      opacity: 0,
      transform: [{ translateY: 18 }],
    },

    footerInner: {
      alignItems: 'center',
    },

    footerActions: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 54,
    },

    continuePressable: {
      flex: 1,
      minWidth: 0,
      alignSelf: 'stretch',
    },

    continuePressableFull: {
      flex: 0,
      width: '100%',
    },

    backButton: {
      width: 54,
      height: 54,
      borderRadius: 16,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
      flexShrink: 0,
    },

    backPlaceholder: {
      width: 54,
      height: 54,
      marginRight: 10,
      flexShrink: 0,
    },

    continueButton: {
      width: '100%',
      height: 56,
      borderRadius: 16,
      paddingLeft: 20,
      paddingRight: 8,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(10, 15, 26, 0.14)',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 7 },
      shadowOpacity: 0.18,
      shadowRadius: 14,
      elevation: 6,
    },

    continueLabelWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
      paddingLeft: 2,
      minWidth: 0,
    },

    continueIconBubble: {
      width: 42,
      height: 42,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(10, 15, 26, 0.11)',
    },

    continueText: {
      color: BRAND.darkText,
      fontSize: 16,
      lineHeight: 20,
      fontWeight: '900',
      letterSpacing: -0.2,
    },

    footerHint: {
      width: '100%',
      fontSize: 10.5,
      lineHeight: 15,
      textAlign: 'center',
      marginTop: 8,
      paddingHorizontal: 4,
    },
  });
