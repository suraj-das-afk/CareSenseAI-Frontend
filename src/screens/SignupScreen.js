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
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
  useWindowDimensions,
} from 'react-native';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import Ionicons from '@expo/vector-icons/Ionicons';

import {
  AuthContext,
} from '../context/AuthContext';

import {
  PopupContext,
} from '../context/PopupContext';


/* ============================================================
   BRAND
============================================================ */

const BRAND = {
  cyan: '#00D4C5',
  cyanDark: '#00B3A6',

  darkBg: '#0A0F1A',
  darkCard: '#141C29',
  darkBorder: '#222E40',

  lightBg: '#F8F9FB',
  lightCard: '#FFFFFF',
  lightBorder: '#E2E8F0',
};


/* ============================================================
   THEME
============================================================ */

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

  textMuted: isDark
    ? '#64748B'
    : '#94A3B8',

  inputBg: isDark
    ? '#101823'
    : '#FFFFFF',

  inputFocus: isDark
    ? '#18333A'
    : '#F2FFFD',

  accent: BRAND.cyan,

  danger: isDark
    ? '#F87171'
    : '#DC2626',

  success: isDark
    ? '#34D399'
    : '#059669',

  googleBg: isDark
    ? '#192331'
    : '#FFFFFF',
});


/* ============================================================
   ERROR MESSAGES
============================================================ */

const getSignupErrorMessage =
  error => {
    const code =
      error?.code || '';

    switch (code) {
      case 'auth/email-already-in-use':
        return 'An account already exists with this email address.';

      case 'auth/invalid-email':
        return 'Please enter a valid email address.';

      case 'auth/weak-password':
        return 'The password is too weak. Use a stronger password.';

      case 'auth/network-request-failed':
        return 'Network error. Please check your connection.';

      case 'auth/operation-not-allowed':
        return 'Email signup is currently unavailable.';

      case 'auth/too-many-requests':
        return 'Too many signup attempts. Please wait and try again later.';

      case 'auth/verification-email-failed':
        return 'Account was created, but we could not send the verification email. Please try signing up again later.';

      case 'auth/google-account-already-exists':
        return 'That Google account already has a CareSense AI account. Please use Log In instead.';

      default:
        return 'Unable to create your account right now. Please try again.';
    }
  };


/* ============================================================
   HELPERS
============================================================ */

const normalizeEmail =
  value =>
    String(value || '')
      .trim()
      .toLowerCase();

const isValidEmail =
  email =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email,
    );

const getPasswordChecks =
  password => ({
    length:
      password.length >= 8,

    lowercase:
      /[a-z]/.test(
        password,
      ),

    uppercase:
      /[A-Z]/.test(
        password,
      ),

    number:
      /\d/.test(
        password,
      ),

    special:
      /[^A-Za-z0-9]/.test(
        password,
      ),
});


/* ============================================================
   PRESSABLE
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

  const onPressIn =
    useCallback(() => {
      if (disabled) {
        return;
      }

      Animated.spring(
        scale,
        {
          toValue: 0.97,
          useNativeDriver: true,
          speed: 55,
          bounciness: 3,
        },
      ).start();
    }, [
      disabled,
      scale,
    ]);

  const onPressOut =
    useCallback(() => {
      if (disabled) {
        return;
      }

      Animated.spring(
        scale,
        {
          toValue: 1,
          useNativeDriver: true,
          speed: 45,
          bounciness: 4,
        },
      ).start();
    }, [
      disabled,
      scale,
    ]);

  return (
    <Pressable
      disabled={disabled}
      onPress={
        disabled
          ? undefined
          : onPress
      }
      onPressIn={
        onPressIn
      }
      onPressOut={
        onPressOut
      }
    >
      {({ pressed }) => (
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
                pressed &&
                !disabled
                  ? 0.84
                  : 1,
            },
          ]}
        >
          {children}
        </Animated.View>
      )}
    </Pressable>
  );
}


/* ============================================================
   PASSWORD STRENGTH
============================================================ */

function PasswordStrength({
  password,
  theme,
}) {
  if (
    !password
  ) {
    return null;
  }

  const checks =
    getPasswordChecks(
      password,
    );

  const score =
    Object.values(
      checks,
    ).filter(
      Boolean,
    ).length;

  const label =
    score <= 2
      ? 'Weak'
      : score === 3
        ? 'Fair'
        : score === 4
          ? 'Good'
          : 'Strong';

  const color =
    score <= 2
      ? theme.danger
      : score === 3
        ? '#F59E0B'
        : theme.success;

  return (
    <View
      style={
        styles.strengthWrap
      }
    >
      <View
        style={
          styles.strengthBarRow
        }
      >
        {[0, 1, 2, 3, 4].map(
          segment => (
            <View
              key={
                segment
              }
              style={[
                styles.strengthSegment,
                {
                  backgroundColor:
                    segment <
                    score
                      ? color
                      : theme.border,
                },
              ]}
            />
          ),
        )}

        <Text
          style={[
            styles.strengthLabel,
            {
              color,
            },
          ]}
        >
          {label}
        </Text>
      </View>

      <View
        style={
          styles.requirementGrid
        }
      >
        {[
          [
            checks.length,
            '8+ characters',
          ],
          [
            checks.lowercase,
            'Lowercase',
          ],
          [
            checks.uppercase,
            'Uppercase',
          ],
          [
            checks.number,
            'Number',
          ],
          [
            checks.special,
            'Special',
          ],
        ].map(
          ([valid, labelText]) => (
            <View
              key={
                labelText
              }
              style={
                styles.requirementItem
              }
            >
              <Ionicons
                name={
                  valid
                    ? 'checkmark-circle'
                    : 'ellipse-outline'
                }
                size={13}
                color={
                  valid
                    ? theme.success
                    : theme.textMuted
                }
              />

              <Text
                style={[
                  styles.requirementText,
                  {
                    color:
                      valid
                        ? theme.textSecondary
                        : theme.textMuted,
                  },
                ]}
              >
                {labelText}
              </Text>
            </View>
          ),
        )}
      </View>
    </View>
  );
}


/* ============================================================
   SCREEN
============================================================ */

export default function SignupScreen({
  navigation,
}) {
  const isDark =
    useColorScheme() === 'dark';

  const {
    width,
  } = useWindowDimensions();

  const theme =
    useMemo(
      () =>
        getTheme(isDark),
      [isDark],
    );

  const {
    signup,
    googleSignup,
  } =
    useContext(
      AuthContext,
    ) || {};

  const {
    showPopup,
  } =
    useContext(
      PopupContext,
    ) || {};


  /* ==========================================================
     STATE
  ========================================================== */

  const [
    name,
    setName,
  ] = useState('');

  const [
    email,
    setEmail,
  ] = useState('');

  const [
    password,
    setPassword,
  ] = useState('');

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState('');

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [
    focusedField,
    setFocusedField,
  ] = useState('');

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    googleSubmitting,
    setGoogleSubmitting,
  ] = useState(false);

  const [
    fieldError,
    setFieldError,
  ] = useState('');

  const submitLock =
    useRef(false);

  const googleLock =
    useRef(false);

  const emailRef =
    useRef(null);

  const passwordRef =
    useRef(null);

  const confirmPasswordRef =
    useRef(null);


  /* ==========================================================
     ANIMATION
  ========================================================== */

  const fade =
    useRef(
      new Animated.Value(0),
    ).current;

  const slide =
    useRef(
      new Animated.Value(18),
    ).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(
        fade,
        {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        },
      ),

      Animated.timing(
        slide,
        {
          toValue: 0,
          duration: 450,
          useNativeDriver: true,
        },
      ),
    ]).start();
  }, [
    fade,
    slide,
  ]);


  /* ==========================================================
     WIDTH
  ========================================================== */

  const contentWidth =
    Math.min(
      width - 32,
      440,
    );


  /* ==========================================================
     POPUP
  ========================================================== */

  const notify =
    useCallback(
      (
        title,
        message,
        type,
      ) => {
        showPopup?.(
          title,
          message,
          type,
        );
      },
      [showPopup],
    );


  /* ==========================================================
     SIGNUP
  ========================================================== */

  const handleSignup =
    useCallback(
      async () => {
        if (
          submitLock.current ||
          googleLock.current
        ) {
          return;
        }

        const cleanName =
          name.trim();

        const cleanEmail =
          normalizeEmail(
            email,
          );

        if (
          cleanName.length <
          2
        ) {
          setFieldError(
            'Please enter your full name.',
          );
          return;
        }

        if (
          !isValidEmail(
            cleanEmail,
          )
        ) {
          setFieldError(
            'Enter a valid email address.',
          );
          return;
        }

        const checks =
          getPasswordChecks(
            password,
          );

        const strongEnough =
          checks.length &&
          checks.lowercase &&
          checks.uppercase &&
          checks.number;

        if (
          !strongEnough
        ) {
          setFieldError(
            'Use at least 8 characters with uppercase, lowercase, and a number.',
          );
          return;
        }

        if (
          password !==
          confirmPassword
        ) {
          setFieldError(
            'Your passwords do not match.',
          );
          return;
        }

        setFieldError('');

        submitLock.current =
          true;

        setSubmitting(true);

        Keyboard.dismiss();

        try {
          if (
            typeof signup !==
            'function'
          ) {
            throw new Error(
              'Signup service is unavailable.',
            );
          }

          const signupResult =
            await signup(
              cleanName,
              cleanEmail,
              password,
            );

          if (
            signupResult?.requiresEmailVerification
          ) {
            notify(
              'Verify your email',
              `We sent a verification link to ${signupResult.email || cleanEmail}. Verify it, then log in to CareSense AI.`,
              'success',
            );
          } else {
            notify(
              'Account created',
              'Welcome to CareSense AI.',
              'success',
            );
          }
        } catch (error) {
          const message =
            getSignupErrorMessage(
              error,
            );

          setFieldError(
            message,
          );

          notify(
            'Sign up failed',
            message,
            'error',
          );
        } finally {
          setSubmitting(
            false,
          );

          submitLock.current =
            false;
        }
      },
      [
        name,
        email,
        password,
        confirmPassword,
        signup,
        notify,
      ],
    );


  /* ==========================================================
     GOOGLE SIGNUP
  ========================================================== */

  const handleGoogleSignup =
    useCallback(
      async () => {
        if (
          googleLock.current ||
          submitLock.current
        ) {
          return;
        }

        googleLock.current =
          true;

        setGoogleSubmitting(
          true,
        );

        Keyboard.dismiss();

        try {
          if (
            typeof googleSignup !==
            'function'
          ) {
            throw new Error(
              'Google sign-up is not configured yet.',
            );
          }

          const result =
            await googleSignup();

          if (
            result === false
          ) {
            return;
          }
        } catch (error) {
          notify(
            'Google sign up failed',
            error?.message ||
              'Unable to continue with Google.',
            'error',
          );
        } finally {
          setGoogleSubmitting(
            false,
          );

          googleLock.current =
            false;
        }
      },
      [
        googleSignup,
        notify,
      ],
    );


  /* ==========================================================
     RENDER
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
      <KeyboardAvoidingView
        style={
          styles.flex
        }
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : 'height'
        }
        keyboardVerticalOffset={
          0
        }
      >
        <ScrollView
          style={
            styles.flex
          }
          contentContainerStyle={[
            styles.scrollContent,
            {
              width:
                contentWidth,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          nestedScrollEnabled
          showsVerticalScrollIndicator={
            false
          }
        >
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fade,
                transform: [
                  {
                    translateY:
                      slide,
                  },
                ],
              },
            ]}
          >

            {/* HEADER */}

            <View
              style={
                styles.header
              }
            >
              <View
                style={[
                  styles.brandIcon,
                  {
                    backgroundColor:
                      `${theme.accent}16`,
                    borderColor:
                      `${theme.accent}32`,
                  },
                ]}
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={30}
                  color={
                    theme.accent
                  }
                />
              </View>

              <Text
                style={[
                  styles.brandTitle,
                  {
                    color:
                      theme.textPrimary,
                  },
                ]}
              >
                Create your account
              </Text>

              <Text
                style={[
                  styles.brandSubtitle,
                  {
                    color:
                      theme.textSecondary,
                  },
                ]}
              >
                Set up your secure CareSense AI profile.
              </Text>
            </View>


            {/* SECURITY BANNER */}

            <View
              style={[
                styles.securityBanner,
                {
                  backgroundColor:
                    isDark
                      ? '#102A2A'
                      : '#E9FBF8',

                  borderColor:
                    `${theme.accent}30`,
                },
              ]}
            >
              <View
                style={[
                  styles.securityIcon,
                  {
                    backgroundColor:
                      `${theme.accent}20`,
                  },
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={17}
                  color={
                    theme.accent
                  }
                />
              </View>

              <Text
                style={[
                  styles.securityText,
                  {
                    color:
                      theme.textSecondary,
                  },
                ]}
              >
                Use a unique password that you do not reuse on other services.
              </Text>
            </View>


            {/* FORM */}

            <View
              style={[
                styles.formCard,
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
                  styles.formTitle,
                  {
                    color:
                      theme.textPrimary,
                  },
                ]}
              >
                Your details
              </Text>

              <Text
                style={[
                  styles.formSubtitle,
                  {
                    color:
                      theme.textSecondary,
                  },
                ]}
              >
                We'll use these details to personalize your account.
              </Text>


              {/* NAME */}

              <View
                style={
                  styles.fieldGroup
                }
              >
                <Text
                  style={[
                    styles.fieldLabel,
                    {
                      color:
                        theme.textSecondary,
                    },
                  ]}
                >
                  Full name
                </Text>

                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor:
                        focusedField ===
                        'name'
                          ? theme.inputFocus
                          : theme.inputBg,

                      borderColor:
                        focusedField ===
                        'name'
                          ? theme.accent
                          : theme.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="person-outline"
                    size={19}
                    color={
                      focusedField ===
                      'name'
                        ? theme.accent
                        : theme.textSecondary
                    }
                  />

                  <TextInput
                    value={
                      name
                    }
                    onChangeText={
                      value => {
                        setName(
                          value,
                        );
                        setFieldError(
                          '',
                        );
                      }
                    }
                    onFocus={() =>
                      setFocusedField(
                        'name',
                      )
                    }
                    onBlur={() =>
                      setFocusedField(
                        '',
                      )
                    }
                    placeholder="Your full name"
                    placeholderTextColor={
                      theme.textMuted
                    }
                    autoCapitalize="words"
                    autoCorrect={
                      false
                    }
                    autoComplete="name"
                    textContentType="name"
                    returnKeyType="next"
                    onSubmitEditing={() =>
                      emailRef.current?.focus()
                    }
                    style={[
                      styles.input,
                      {
                        color:
                          theme.textPrimary,
                      },
                    ]}
                  />
                </View>
              </View>


              {/* EMAIL */}

              <View
                style={
                  styles.fieldGroup
                }
              >
                <Text
                  style={[
                    styles.fieldLabel,
                    {
                      color:
                        theme.textSecondary,
                    },
                  ]}
                >
                  Email address
                </Text>

                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor:
                        focusedField ===
                        'email'
                          ? theme.inputFocus
                          : theme.inputBg,

                      borderColor:
                        focusedField ===
                        'email'
                          ? theme.accent
                          : theme.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="mail-outline"
                    size={19}
                    color={
                      focusedField ===
                      'email'
                        ? theme.accent
                        : theme.textSecondary
                    }
                  />

                  <TextInput
                    ref={
                      emailRef
                    }
                    value={
                      email
                    }
                    onChangeText={
                      value => {
                        setEmail(
                          value,
                        );
                        setFieldError(
                          '',
                        );
                      }
                    }
                    onFocus={() =>
                      setFocusedField(
                        'email',
                      )
                    }
                    onBlur={() =>
                      setFocusedField(
                        '',
                      )
                    }
                    placeholder="you@example.com"
                    placeholderTextColor={
                      theme.textMuted
                    }
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={
                      false
                    }
                    autoComplete="email"
                    textContentType="emailAddress"
                    returnKeyType="next"
                    onSubmitEditing={() =>
                      passwordRef.current?.focus()
                    }
                    style={[
                      styles.input,
                      {
                        color:
                          theme.textPrimary,
                      },
                    ]}
                  />
                </View>
              </View>


              {/* PASSWORD */}

              <View
                style={
                  styles.fieldGroup
                }
              >
                <Text
                  style={[
                    styles.fieldLabel,
                    {
                      color:
                        theme.textSecondary,
                    },
                  ]}
                >
                  Password
                </Text>

                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor:
                        focusedField ===
                        'password'
                          ? theme.inputFocus
                          : theme.inputBg,

                      borderColor:
                        focusedField ===
                        'password'
                          ? theme.accent
                          : theme.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={19}
                    color={
                      focusedField ===
                      'password'
                        ? theme.accent
                        : theme.textSecondary
                    }
                  />

                  <TextInput
                    ref={
                      passwordRef
                    }
                    value={
                      password
                    }
                    onChangeText={
                      value => {
                        setPassword(
                          value,
                        );
                        setFieldError(
                          '',
                        );
                      }
                    }
                    onFocus={() =>
                      setFocusedField(
                        'password',
                      )
                    }
                    onBlur={() =>
                      setFocusedField(
                        '',
                      )
                    }
                    placeholder="Create a password"
                    placeholderTextColor={
                      theme.textMuted
                    }
                    secureTextEntry={
                      !showPassword
                    }
                    autoCapitalize="none"
                    autoCorrect={
                      false
                    }
                    autoComplete="new-password"
                    textContentType="newPassword"
                    returnKeyType="next"
                    onSubmitEditing={() =>
                      confirmPasswordRef.current?.focus()
                    }
                    style={[
                      styles.input,
                      {
                        color:
                          theme.textPrimary,
                      },
                    ]}
                  />

                  <Pressable
                    hitSlop={
                      10
                    }
                    onPress={() =>
                      setShowPassword(
                        value =>
                          !value,
                      )
                    }
                  >
                    <Ionicons
                      name={
                        showPassword
                          ? 'eye-off-outline'
                          : 'eye-outline'
                      }
                      size={19}
                      color={
                        theme.textSecondary
                      }
                    />
                  </Pressable>
                </View>

                <PasswordStrength
                  password={
                    password
                  }
                  theme={
                    theme
                  }
                />
              </View>


              {/* CONFIRM PASSWORD */}

              <View
                style={
                  styles.fieldGroup
                }
              >
                <Text
                  style={[
                    styles.fieldLabel,
                    {
                      color:
                        theme.textSecondary,
                    },
                  ]}
                >
                  Confirm password
                </Text>

                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor:
                        focusedField ===
                        'confirm'
                          ? theme.inputFocus
                          : theme.inputBg,

                      borderColor:
                        focusedField ===
                        'confirm'
                          ? theme.accent
                          : theme.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={19}
                    color={
                      focusedField ===
                      'confirm'
                        ? theme.accent
                        : theme.textSecondary
                    }
                  />

                  <TextInput
                    ref={
                      confirmPasswordRef
                    }
                    value={
                      confirmPassword
                    }
                    onChangeText={
                      value => {
                        setConfirmPassword(
                          value,
                        );
                        setFieldError(
                          '',
                        );
                      }
                    }
                    onFocus={() =>
                      setFocusedField(
                        'confirm',
                      )
                    }
                    onBlur={() =>
                      setFocusedField(
                        '',
                      )
                    }
                    placeholder="Re-enter your password"
                    placeholderTextColor={
                      theme.textMuted
                    }
                    secureTextEntry={
                      !showConfirmPassword
                    }
                    autoCapitalize="none"
                    autoCorrect={
                      false
                    }
                    autoComplete="new-password"
                    textContentType="newPassword"
                    returnKeyType="done"
                    onSubmitEditing={
                      handleSignup
                    }
                    style={[
                      styles.input,
                      {
                        color:
                          theme.textPrimary,
                      },
                    ]}
                  />

                  <Pressable
                    hitSlop={
                      10
                    }
                    onPress={() =>
                      setShowConfirmPassword(
                        value =>
                          !value,
                      )
                    }
                  >
                    <Ionicons
                      name={
                        showConfirmPassword
                          ? 'eye-off-outline'
                          : 'eye-outline'
                      }
                      size={19}
                      color={
                        theme.textSecondary
                      }
                    />
                  </Pressable>
                </View>
              </View>


              {/* PASSWORD MATCH */}

              {confirmPassword.length >
                0 && (
                <View
                  style={[
                    styles.matchRow,
                    {
                      backgroundColor:
                        password ===
                        confirmPassword
                          ? isDark
                            ? '#102A25'
                            : '#ECFDF5'
                          : isDark
                            ? '#30171B'
                            : '#FEF2F2',

                      borderColor:
                        password ===
                        confirmPassword
                          ? `${theme.success}25`
                          : `${theme.danger}25`,
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      password ===
                      confirmPassword
                        ? 'checkmark-circle'
                        : 'alert-circle-outline'
                    }
                    size={16}
                    color={
                      password ===
                      confirmPassword
                        ? theme.success
                        : theme.danger
                    }
                  />

                  <Text
                    style={[
                      styles.matchText,
                      {
                        color:
                          password ===
                          confirmPassword
                            ? theme.success
                            : theme.danger,
                      },
                    ]}
                  >
                    {password ===
                    confirmPassword
                      ? 'Passwords match'
                      : 'Passwords do not match'}
                  </Text>
                </View>
              )}


              {/* ERROR */}

              {fieldError ? (
                <View
                  style={[
                    styles.errorBox,
                    {
                      backgroundColor:
                        isDark
                          ? '#30171B'
                          : '#FEF2F2',

                      borderColor:
                        `${theme.danger}30`,
                    },
                  ]}
                >
                  <Ionicons
                    name="alert-circle-outline"
                    size={17}
                    color={
                      theme.danger
                    }
                  />

                  <Text
                    style={[
                      styles.errorText,
                      {
                        color:
                          theme.danger,
                      },
                    ]}
                  >
                    {fieldError}
                  </Text>
                </View>
              ) : null}


              {/* CREATE ACCOUNT */}

              <AnimatedPressable
                onPress={
                  handleSignup
                }
                disabled={
                  submitting ||
                  googleSubmitting
                }
                style={[
                  styles.primaryButton,
                  {
                    backgroundColor:
                      theme.accent,

                    opacity:
                      submitting
                        ? 0.75
                        : 1,
                  },
                ]}
              >
                {submitting ? (
                  <ActivityIndicator
                    color="#06110F"
                  />
                ) : (
                  <>
                    <Text
                      style={
                        styles.primaryButtonText
                      }
                    >
                      Create account
                    </Text>

                    <Ionicons
                      name="arrow-forward"
                      size={18}
                      color="#06110F"
                    />
                  </>
                )}
              </AnimatedPressable>


              {/* DIVIDER */}

              <View
                style={
                  styles.divider
                }
              >
                <View
                  style={[
                    styles.dividerLine,
                    {
                      backgroundColor:
                        theme.border,
                    },
                  ]}
                />

                <Text
                  style={[
                    styles.dividerText,
                    {
                      color:
                        theme.textMuted,
                    },
                  ]}
                >
                  OR
                </Text>

                <View
                  style={[
                    styles.dividerLine,
                    {
                      backgroundColor:
                        theme.border,
                    },
                  ]}
                />
              </View>


              {/* GOOGLE */}

              <AnimatedPressable
                onPress={
                  handleGoogleSignup
                }
                disabled={
                  submitting ||
                  googleSubmitting
                }
                style={[
                  styles.googleButton,
                  {
                    backgroundColor:
                      theme.googleBg,

                    borderColor:
                      theme.border,
                  },
                ]}
              >
                {googleSubmitting ? (
                  <ActivityIndicator
                    color={
                      theme.textPrimary
                    }
                  />
                ) : (
                  <>
                    <View
                      style={
                        styles.googleIcon
                      }
                    >
                      <Text
                        style={
                          styles.googleG
                        }
                      >
                        G
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.googleText,
                        {
                          color:
                            theme.textPrimary,
                        },
                      ]}
                    >
                      Sign up with Google
                    </Text>
                  </>
                )}
              </AnimatedPressable>


              {/* SECURITY */}

              <View
                style={[
                  styles.infoRow,
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
                  Your authentication is handled by CareSense AI. Never share your password or verification codes.
                </Text>
              </View>
            </View>


            {/* FOOTER */}

            <View
              style={
                styles.footer
              }
            >
              <Text
                style={[
                  styles.footerText,
                  {
                    color:
                      theme.textSecondary,
                  },
                ]}
              >
                Already have an account?
              </Text>

              <Pressable
                hitSlop={
                  10
                }
                onPress={() => {
                  if (
                    navigation.canGoBack()
                  ) {
                    navigation.goBack();
                  } else {
                    navigation.navigate(
                      'Login',
                    );
                  }
                }}
              >
                <Text
                  style={[
                    styles.footerLink,
                    {
                      color:
                        theme.accent,
                    },
                  ]}
                >
                  Sign in
                </Text>
              </Pressable>
            </View>

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
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

    flex: {
      flex: 1,
    },

    scrollContent: {
      flexGrow: 1,
      alignSelf: 'center',
      paddingTop: 20,
      paddingBottom: 70,
    },

    content: {
      width: '100%',
    },

    header: {
      alignItems: 'center',
      marginBottom: 18,
    },

    brandIcon: {
      width: 68,
      height: 68,
      borderRadius: 22,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 13,
    },

    brandTitle: {
      fontSize: 27,
      lineHeight: 33,
      fontWeight: '800',
      letterSpacing: -0.7,
      textAlign: 'center',
    },

    brandSubtitle: {
      marginTop: 5,
      maxWidth: 330,
      fontSize: 13,
      lineHeight: 19,
      fontWeight: '500',
      textAlign: 'center',
    },

    securityBanner: {
      minHeight: 56,
      borderRadius: 17,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
      marginBottom: 12,
    },

    securityIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },

    securityText: {
      flex: 1,
      fontSize: 10,
      lineHeight: 15,
      fontWeight: '500',
    },

    formCard: {
      borderRadius: 22,
      borderWidth: 1,
      padding: 18,
    },

    formTitle: {
      fontSize: 23,
      lineHeight: 29,
      fontWeight: '800',
      letterSpacing: -0.45,
    },

    formSubtitle: {
      marginTop: 4,
      marginBottom: 20,
      fontSize: 12,
      lineHeight: 18,
      fontWeight: '500',
    },

    fieldGroup: {
      marginBottom: 15,
    },

    fieldLabel: {
      marginBottom: 7,
      fontSize: 11,
      lineHeight: 16,
      fontWeight: '700',
    },

    inputContainer: {
      minHeight: 52,
      borderRadius: 14,
      borderWidth: 1,
      paddingHorizontal: 13,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },

    input: {
      flex: 1,
      minHeight: 50,
      paddingVertical: 0,
      fontSize: 14,
      fontWeight: '500',
    },

    strengthWrap: {
      marginTop: 9,
    },

    strengthBarRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },

    strengthSegment: {
      height: 4,
      flex: 1,
      borderRadius: 2,
    },

    strengthLabel: {
      width: 42,
      marginLeft: 5,
      fontSize: 9,
      fontWeight: '800',
    },

    requirementGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 7,
      marginTop: 7,
    },

    requirementItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },

    requirementText: {
      fontSize: 9,
      fontWeight: '500',
    },

    matchRow: {
      minHeight: 38,
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      marginBottom: 12,
    },

    matchText: {
      fontSize: 10,
      fontWeight: '700',
    },

    errorBox: {
      borderRadius: 13,
      borderWidth: 1,
      paddingHorizontal: 11,
      paddingVertical: 9,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      marginBottom: 12,
    },

    errorText: {
      flex: 1,
      fontSize: 11,
      lineHeight: 17,
      fontWeight: '600',
    },

    primaryButton: {
      minHeight: 54,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
      marginTop: 2,
    },

    primaryButtonText: {
      color: '#06110F',
      fontSize: 14,
      fontWeight: '800',
    },

    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginVertical: 17,
    },

    dividerLine: {
      flex: 1,
      height: 1,
    },

    dividerText: {
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.7,
    },

    googleButton: {
      minHeight: 54,
      borderRadius: 15,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },

    googleIcon: {
      width: 25,
      height: 25,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FFFFFF',
    },

    googleG: {
      color: '#4285F4',
      fontSize: 15,
      fontWeight: '900',
    },

    googleText: {
      fontSize: 13,
      fontWeight: '700',
    },

    infoRow: {
      minHeight: 58,
      borderRadius: 13,
      borderWidth: 1,
      paddingHorizontal: 11,
      paddingVertical: 9,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 12,
    },

    infoText: {
      flex: 1,
      fontSize: 10,
      lineHeight: 15,
      fontWeight: '500',
    },

    footer: {
      marginTop: 17,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 5,
    },

    footerText: {
      fontSize: 12,
      fontWeight: '500',
    },

    footerLink: {
      fontSize: 12,
      fontWeight: '800',
    },
  });