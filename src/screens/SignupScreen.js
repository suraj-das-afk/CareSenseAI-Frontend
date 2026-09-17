import React, { useState, useContext, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Animated,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AuthContext } from '../context/AuthContext';
import { PopupContext } from '../context/PopupContext';

// Reusable micro-interaction press wrapper (Matching Login & Search Screens)
function AnimatedPressable({ children, onPress, style, disabled }) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    if (disabled) return;
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  };

  const onPressOut = () => {
    if (disabled) return;
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
  };

  return (
    <Pressable onPressIn={onPressIn} onPressOut={onPressOut} onPress={disabled ? null : onPress}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

export default function SignupScreen({ navigation }) {
  const isDark = useColorScheme() === 'dark';
  
  // CareSense AI Theme Palette - Kept perfectly in sync with LoginScreen
  const theme = {
    background: isDark ? '#080C14' : '#F8FAFC',
    card: isDark ? '#121826' : '#FFFFFF',
    border: isDark ? '#1E293B' : '#E2E8F0',
    textPrimary: isDark ? '#F8FAFC' : '#0F172A',
    textSecondary: isDark ? '#94A3B8' : '#64748B',
    textMuted: isDark ? '#475569' : '#94A3B8',
    inputBg: isDark ? '#0F172A' : '#FFFFFF',
    accent: '#00D4C5',
    googleBg: isDark ? '#1E293B' : '#FFFFFF',
  };

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  const { signup, googleLogin } = useContext(AuthContext) || {};
  const { showPopup } = useContext(PopupContext) || {};

  // Entry Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleSignup = async () => {
    if (!name.trim() || !email.trim() || !password) {
      showPopup?.('Missing Fields', 'Please fill in all fields.', 'warning');
      return;
    }
    
    setIsSubmitting(true);
    Keyboard.dismiss();

    try {
      // Ensure backend (e.g., your Django endpoints) expects these exact payload keys
      await signup?.(name.trim(), email.trim(), password);
      showPopup?.('Account Created', 'Welcome to CareSense AI!', 'success');
    } catch (error) {
      showPopup?.('Signup Failed', 'Unable to create account. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsGoogleSubmitting(true);
    Keyboard.dismiss();

    try {
      if (googleLogin) {
        await googleLogin();
      } else {
        await new Promise(res => setTimeout(res, 1500));
        showPopup?.('Info', 'Google Signup requires Expo AuthSession setup.', 'warning');
      }
    } catch (error) {
      showPopup?.('Google Auth Failed', 'Could not sign up with Google.', 'error');
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.container}
        >
          <Animated.View 
            style={[
              styles.content, 
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
            ]}
          >
            {/* Header Section */}
            <View style={styles.headerContainer}>
              <View style={[styles.iconWrapper, { backgroundColor: `${theme.accent}15` }]}>
                <Ionicons name="person-add" size={32} color={theme.accent} />
              </View>
              <Text style={[styles.title, { color: theme.textPrimary }]}>Create Account</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Join CareSense AI today
              </Text>
            </View>

            {/* Input Form */}
            <View style={styles.form}>
              
              {/* Name Input */}
              <View style={[styles.inputContainer, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                <Ionicons name="person-outline" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.textPrimary }]}
                  placeholder="Full Name"
                  placeholderTextColor={theme.textMuted}
                  autoCapitalize="words"
                  autoCorrect={false}
                  value={name}
                  onChangeText={setName}
                />
              </View>

              {/* Email Input */}
              <View style={[styles.inputContainer, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                <Ionicons name="mail-outline" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.textPrimary }]}
                  placeholder="Email Address"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              {/* Password Input */}
              <View style={[styles.inputContainer, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                <Ionicons name="lock-closed-outline" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.textPrimary }]}
                  placeholder="Password"
                  placeholderTextColor={theme.textMuted}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={15} style={styles.eyeIcon}>
                  <Ionicons 
                    name={showPassword ? "eye-off-outline" : "eye-outline"} 
                    size={20} 
                    color={theme.textSecondary} 
                  />
                </Pressable>
              </View>

              {/* Primary Signup Button */}
              <AnimatedPressable 
                style={[styles.primaryButton, { backgroundColor: theme.accent, marginTop: 12 }]} 
                onPress={handleSignup}
                disabled={isSubmitting || isGoogleSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#0A0F1A" />
                ) : (
                  <Text style={styles.primaryButtonText}>Sign Up</Text>
                )}
              </AnimatedPressable>

              {/* Divider */}
              <View style={styles.dividerContainer}>
                <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
                <Text style={[styles.dividerText, { color: theme.textMuted }]}>OR</Text>
                <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
              </View>

              {/* Google Signup Button */}
              <AnimatedPressable 
                style={[styles.googleButton, { backgroundColor: theme.googleBg, borderColor: theme.border }]} 
                onPress={handleGoogleAuth}
                disabled={isSubmitting || isGoogleSubmitting}
              >
                {isGoogleSubmitting ? (
                  <ActivityIndicator color={theme.textPrimary} />
                ) : (
                  <>
                    <Ionicons name="logo-google" size={20} color={theme.textPrimary} style={styles.googleIcon} />
                    <Text style={[styles.googleButtonText, { color: theme.textPrimary }]}>Sign up with Google</Text>
                  </>
                )}
              </AnimatedPressable>

              {/* Footer */}
              <View style={styles.footer}>
                <Text style={[styles.footerText, { color: theme.textSecondary }]}>Already have an account? </Text>
                <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
                  <Text style={[styles.footerLink, { color: theme.accent }]}>Sign in</Text>
                </Pressable>
              </View>

            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 24,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    height: '100%',
  },
  eyeIcon: {
    padding: 4,
  },
  primaryButton: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  primaryButtonText: {
    color: '#0A0F1A',
    fontSize: 16,
    fontWeight: '700',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 13,
    fontWeight: '600',
  },
  googleButton: {
    flexDirection: 'row',
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  googleIcon: {
    marginRight: 10,
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '700',
  },
});