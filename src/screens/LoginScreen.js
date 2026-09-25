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
  sendPasswordResetEmail,
} from 'firebase/auth';

import {
  AuthContext,
} from '../context/AuthContext';

import {
  PopupContext,
} from '../context/PopupContext';

import {
  auth,
} from '../config/firebase';


/* ============================================================
   CARESENSE BRAND
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
   FIREBASE ERROR MESSAGES
============================================================ */

const getLoginErrorMessage = error => {
  const code =
    error?.code || '';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'The email or password is incorrect.';

    case 'auth/invalid-email':
      return 'Please enter a valid email address.';

    case 'auth/email-not-verified':
      return error?.verificationEmailSent
        ? 'Your email is not verified yet. We sent a new verification email. Verify it, then log in again.'
        : 'Your email is not verified yet. Please verify it before signing in.';

    case 'auth/too-many-requests':
      return 'Too many sign-in attempts. Please wait and try again later.';

    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection.';

    case 'auth/user-disabled':
      return 'This account has been disabled.';

    case 'auth/operation-not-allowed':
      return 'Email sign-in is currently unavailable.';

    case 'auth/google-account-not-found':
      return 'No CareSense AI account exists for this Google account. Please use Sign Up first.';

    default:
      return 'Unable to sign in right now. Please try again.';
  }
};


/* ============================================================
   HELPERS
============================================================ */

const normalizeEmail = value =>
  String(value || '')
    .trim()
    .toLowerCase();

const isValidEmail = email =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email,
  );


/* ============================================================
   ANIMATED PRESSABLE
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
   SCREEN
============================================================ */

export default function LoginScreen({
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
    login,
    googleLogin,
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
    email,
    setEmail,
  ] = useState('');

  const [
    password,
    setPassword,
  ] = useState('');

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    emailFocused,
    setEmailFocused,
  ] = useState(false);

  const [
    passwordFocused,
    setPasswordFocused,
  ] = useState(false);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    googleSubmitting,
    setGoogleSubmitting,
  ] = useState(false);

  const [
    resettingPassword,
    setResettingPassword,
  ] = useState(false);

  const [
    fieldError,
    setFieldError,
  ] = useState('');

  const passwordRef =
    useRef(null);

  const submitLock =
    useRef(false);

  const googleLock =
    useRef(false);


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
     RESPONSIVE WIDTH
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
     EMAIL LOGIN
  ========================================================== */

  const handleLogin =
    useCallback(
      async () => {
        if (
          submitLock.current ||
          googleLock.current
        ) {
          return;
        }

        const cleanEmail =
          normalizeEmail(
            email,
          );

        if (!cleanEmail) {
          setFieldError(
            'Enter your email address.',
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

        if (!password) {
          setFieldError(
            'Enter your password.',
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
            typeof login !==
            'function'
          ) {
            throw new Error(
              'Login service is unavailable.',
            );
          }

          await login(
            cleanEmail,
            password,
          );

          notify(
            'Welcome back',
            'You have been signed in successfully.',
            'success',
          );
        } catch (error) {
          const message =
            getLoginErrorMessage(
              error,
            );

          setFieldError(
            message,
          );

          notify(
            'Sign in failed',
            message,
            'error',
          );
        } finally {
          setSubmitting(false);
          submitLock.current =
            false;
        }
      },
      [
        email,
        password,
        login,
        notify,
      ],
    );


  /* ==========================================================
     GOOGLE LOGIN
============================================================ */

  const handleGoogleLogin =
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
            typeof googleLogin !==
            'function'
          ) {
            throw new Error(
              'Google sign-in is not configured yet.',
            );
          }

          const result =
            await googleLogin();

          /*
           * false means the user
           * cancelled Google sign-in.
           */
          if (
            result === false
          ) {
            return;
          }
        } catch (error) {
          notify(
            'Google sign in failed',
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
        googleLogin,
        notify,
      ],
    );


  /* ==========================================================
     FORGOT PASSWORD
============================================================ */

  const handleForgotPassword =
    useCallback(
      async () => {
        const cleanEmail =
          normalizeEmail(
            email,
          );

        if (!cleanEmail) {
          setFieldError(
            'Enter your email address first.',
          );
          return;
        }

        if (
          !isValidEmail(
            cleanEmail,
          )
        ) {
          setFieldError(
            'Enter a valid email address first.',
          );
          return;
        }

        setResettingPassword(
          true,
        );

        Keyboard.dismiss();

        try {
          await sendPasswordResetEmail(
            auth,
            cleanEmail,
          );

          /*
           * Deliberately generic.
           * This avoids revealing whether
           * an email is registered.
           */
          notify(
            'Password reset',
            'If an account exists for that email, password-reset instructions have been sent.',
            'success',
          );
        } catch (error) {
          let message =
            'Unable to send the password reset email. Please try again.';

          if (
            error?.code ===
            'auth/invalid-email'
          ) {
            message =
              'Please enter a valid email address.';
          } else if (
            error?.code ===
            'auth/network-request-failed'
          ) {
            message =
              'Network error. Please check your connection.';
          } else if (
            error?.code ===
            'auth/too-many-requests'
          ) {
            message =
              'Too many reset attempts. Please wait before trying again.';
          }

          notify(
            'Password reset',
            message,
            'error',
          );
        } finally {
          setResettingPassword(
            false,
          );
        }
      },
      [
        email,
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
                  name="pulse"
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
                CareSense AI
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
                Your intelligent health companion
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
                  name="shield-checkmark-outline"
                  size={18}
                  color={
                    theme.accent
                  }
                />
              </View>

              <View
                style={
                  styles.securityTextWrap
                }
              >
                <Text
                  style={[
                    styles.securityTitle,
                    {
                      color:
                        theme.textPrimary,
                    },
                  ]}
                >
                  Secure sign in
                </Text>

                <Text
                  style={[
                    styles.securityText,
                    {
                      color:
                        theme.textSecondary,
                    },
                  ]}
                >
                  Your account is protected by CareSense AI.
                </Text>
              </View>
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
                Sign in
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
                Access your health dashboard and records.
              </Text>


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
                        emailFocused
                          ? theme.inputFocus
                          : theme.inputBg,

                      borderColor:
                        emailFocused
                          ? theme.accent
                          : theme.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="mail-outline"
                    size={19}
                    color={
                      emailFocused
                        ? theme.accent
                        : theme.textSecondary
                    }
                  />

                  <TextInput
                    value={
                      email
                    }
                    onChangeText={
                      value => {
                        setEmail(
                          value,
                        );

                        if (
                          fieldError
                        ) {
                          setFieldError(
                            '',
                          );
                        }
                      }
                    }
                    onFocus={() =>
                      setEmailFocused(
                        true,
                      )
                    }
                    onBlur={() =>
                      setEmailFocused(
                        false,
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

                  {email.length >
                    0 && (
                    <Pressable
                      hitSlop={
                        8
                      }
                      onPress={() =>
                        setEmail(
                          '',
                        )
                      }
                    >
                      <Ionicons
                        name="close-circle"
                        size={17}
                        color={
                          theme.textMuted
                        }
                      />
                    </Pressable>
                  )}
                </View>
              </View>


              {/* PASSWORD */}

              <View
                style={
                  styles.fieldGroup
                }
              >
                <View
                  style={
                    styles.labelRow
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

                  <Pressable
                    hitSlop={
                      8
                    }
                    disabled={
                      resettingPassword
                    }
                    onPress={
                      handleForgotPassword
                    }
                  >
                    <Text
                      style={[
                        styles.forgotText,
                        {
                          color:
                            theme.accent,
                        },
                      ]}
                    >
                      {resettingPassword
                        ? 'Sending...'
                        : 'Forgot password?'}
                    </Text>
                  </Pressable>
                </View>

                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor:
                        passwordFocused
                          ? theme.inputFocus
                          : theme.inputBg,

                      borderColor:
                        passwordFocused
                          ? theme.accent
                          : theme.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={19}
                    color={
                      passwordFocused
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

                        if (
                          fieldError
                        ) {
                          setFieldError(
                            '',
                          );
                        }
                      }
                    }
                    onFocus={() =>
                      setPasswordFocused(
                        true,
                      )
                    }
                    onBlur={() =>
                      setPasswordFocused(
                        false,
                      )
                    }
                    placeholder="Enter your password"
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
                    autoComplete="password"
                    textContentType="password"
                    returnKeyType="done"
                    onSubmitEditing={
                      handleLogin
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
              </View>


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


              {/* LOGIN BUTTON */}

              <AnimatedPressable
                onPress={
                  handleLogin
                }
                disabled={
                  submitting ||
                  googleSubmitting ||
                  resettingPassword
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
                      Sign in
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
                  handleGoogleLogin
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
                      Continue with Google
                    </Text>
                  </>
                )}
              </AnimatedPressable>


              {/* SECURITY NOTE */}

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
                  name="shield-outline"
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
                  Never share your password or verification codes.
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
                Don't have an account?
              </Text>

              <Pressable
                hitSlop={
                  10
                }
                onPress={() =>
                  navigation.navigate(
                    'Signup',
                  )
                }
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
                  Create one
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
      fontSize: 28,
      lineHeight: 34,
      fontWeight: '800',
      letterSpacing: -0.7,
    },

    brandSubtitle: {
      marginTop: 5,
      fontSize: 13,
      lineHeight: 19,
      fontWeight: '500',
      textAlign: 'center',
    },

    securityBanner: {
      minHeight: 64,
      borderRadius: 17,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 11,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },

    securityIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },

    securityTextWrap: {
      flex: 1,
    },

    securityTitle: {
      fontSize: 12,
      fontWeight: '800',
    },

    securityText: {
      marginTop: 2,
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

    labelRow: {
      minHeight: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 7,
    },

    fieldLabel: {
      fontSize: 11,
      lineHeight: 16,
      fontWeight: '700',
    },

    forgotText: {
      fontSize: 10,
      lineHeight: 15,
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
      minHeight: 50,
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