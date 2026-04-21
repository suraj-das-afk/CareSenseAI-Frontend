import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
  Animated,
  Keyboard,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesome } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { auth } from "../../firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";

// Memoized Input Component for Performance
const InputField = React.memo(
  ({
    icon,
    placeholder,
    value,
    onChangeText,
    secureTextEntry,
    showToggle,
    onToggleSecure,
    keyboardType,
  }) => (
    <View style={styles.inputWrapper}>
      <View style={styles.inputContainer}>
        <View style={styles.iconWrapper}>
          <FontAwesome name={icon} size={20} color="#667eea" />
        </View>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
        />
        {showToggle && (
          <TouchableOpacity onPress={onToggleSecure} style={styles.eyeButton}>
            <FontAwesome
              name={secureTextEntry ? "eye-slash" : "eye"}
              size={18}
              color="#667eea"
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
);

// Decorative Circle Component
const DecorativeCircle = React.memo(({ style }) => <View style={style} />);

export default function SignupScreen() {
  const navigation = useNavigation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Keyboard listener
  useEffect(() => {
    const showListener = Keyboard.addListener("keyboardDidShow", () =>
      setKeyboardVisible(true)
    );
    const hideListener = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardVisible(false)
    );

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  // Animated glow effect
  const glowAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1.08,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [glowAnim]);

  // Memoized handlers
  const handleSignup = useCallback(async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      console.log("✅ User registered:", userCredential.user.email);
      Alert.alert("Welcome!", "Your account has been created successfully!");
    } catch (error) {
      console.error("❌ Signup error:", error);
      let message = "Something went wrong. Please try again.";
      if (error.code === "auth/email-already-in-use")
        message = "This email is already registered.";
      else if (error.code === "auth/invalid-email")
        message = "Invalid email address.";
      else if (error.code === "auth/weak-password")
        message = "Password must be at least 6 characters.";
      Alert.alert("Sign Up Failed", message);
    } finally {
      setLoading(false);
    }
  }, [email, password, confirmPassword]);

  const togglePassword = useCallback(() => setShowPassword((prev) => !prev), []);
  const toggleConfirm = useCallback(() => setShowConfirm((prev) => !prev), []);
  const navigateToLogin = useCallback(() => navigation.navigate("Login"), [navigation]);

  return (
    <LinearGradient
      colors={["#667eea", "#764ba2", "#f093fb"]}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 20}
        >
          <ScrollView
            contentContainerStyle={[
              styles.scrollContainer,
              { paddingBottom: keyboardVisible ? 30 : 70 },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Decorative Background Circles */}
            <DecorativeCircle style={styles.decorativeCircle1} />
            <DecorativeCircle style={styles.decorativeCircle2} />

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <LinearGradient
                  colors={["rgba(255,255,255,0.3)", "rgba(255,255,255,0.1)"]}
                  style={styles.iconGradient}
                >
                  <Text style={styles.iconEmoji}>🌱</Text>
                </LinearGradient>
              </View>
              <Text style={styles.headerTitle}>Join CareSense</Text>
              <Text style={styles.headerSubtitle}>
                Create your account and start your wellness journey
              </Text>
            </View>

            {/* Card */}
            <View style={styles.card}>
              <LinearGradient
                colors={["rgba(102,126,234,0.05)", "rgba(240,147,251,0.05)"]}
                style={styles.cardGradient}
              >
                <Text style={styles.title}>Sign Up</Text>

                {/* Email Input */}
                <InputField
                  icon="envelope"
                  placeholder="Email Address"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                />

                {/* Password Input */}
                <InputField
                  icon="lock"
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  showToggle
                  onToggleSecure={togglePassword}
                  keyboardType="default"
                />

                {/* Confirm Password Input */}
                <InputField
                  icon="lock"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirm}
                  showToggle
                  onToggleSecure={toggleConfirm}
                  keyboardType="default"
                />

                {/* Signup Button with Glow Animation */}
                <Animated.View style={{ transform: [{ scale: glowAnim }] }}>
                  <TouchableOpacity
                    style={styles.signupButton}
                    onPress={handleSignup}
                    activeOpacity={0.85}
                    disabled={loading}
                  >
                    <LinearGradient
                      colors={["#667eea", "#764ba2"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.buttonGradient}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <View style={styles.buttonContent}>
                          <Text style={styles.signupButtonText}>
                            Create Account
                          </Text>
                          <FontAwesome
                            name="arrow-right"
                            size={16}
                            color="#fff"
                            style={styles.buttonIcon}
                          />
                        </View>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              </LinearGradient>
            </View>

            {/* Bottom Section */}
            <View
              style={[
                styles.bottomSection,
                { marginBottom: keyboardVisible ? 10 : 20 },
              ]}
            >
              <Text style={styles.bottomText}>Already have an account?</Text>
              <TouchableOpacity
                onPress={navigateToLogin}
                style={styles.loginButton}
                activeOpacity={0.7}
              >
                <Text style={styles.loginText}>Log In</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  decorativeCircle1: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    top: -50,
    right: -50,
  },
  decorativeCircle2: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    bottom: 100,
    left: -40,
  },
  header: {
    marginBottom: 36,
    alignItems: "center",
  },
  iconContainer: {
    marginBottom: 16,
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  iconEmoji: {
    fontSize: 40,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.95)",
    marginTop: 8,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 20,
    fontWeight: "500",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
    overflow: "hidden",
  },
  cardGradient: {
    padding: 32,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 28,
    textAlign: "center",
    letterSpacing: 0.3,
  },
  inputWrapper: {
    marginBottom: 18,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    shadowColor: "#667eea",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(102,126,234,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  eyeButton: {
    padding: 6,
  },
  input: {
    flex: 1,
    marginLeft: 12,
    color: "#1E293B",
    fontSize: 15,
    fontWeight: "500",
  },
  signupButton: {
    marginTop: 12,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#667eea",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  signupButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 17,
    letterSpacing: 0.3,
  },
  buttonIcon: {
    marginLeft: 8,
  },
  bottomSection: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 28,
  },
  bottomText: {
    fontSize: 15,
    color: "rgba(255,255,255,0.95)",
    fontWeight: "500",
  },
  loginButton: {
    marginLeft: 6,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  loginText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
    textDecorationLine: "underline",
    letterSpacing: 0.3,
  },
});