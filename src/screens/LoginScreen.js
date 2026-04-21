import React, { useState } from "react";
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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesome } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { auth } from "../../firebaseConfig";
import { signInWithEmailAndPassword } from "firebase/auth";

export default function LoginScreen() {
  const navigation = useNavigation();

  // same logic
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

const handleLogin = async () => {
  if (!email || !password) {
    Alert.alert('Error', 'Please fill in both email and password');
    return;
  }

  setLoading(true);
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('✅ Logged in user:', userCredential.user.email);
    Alert.alert('Welcome back!', `You are now logged in as ${userCredential.user.email}`);
    // ✅ Do NOT navigate manually. The auth listener in AppNavigator will handle it.
  } catch (error) {
    console.error('❌ Login error:', error);
    let errorMessage = 'An error occurred during login';
    if (error.code === 'auth/user-not-found') {
      errorMessage = 'No account found with this email';
    } else if (error.code === 'auth/wrong-password') {
      errorMessage = 'Incorrect password';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email address';
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = 'Too many attempts. Please try again later';
    }
    Alert.alert('Login Failed', errorMessage);
  } finally {
    setLoading(false);
  }
};

  return (
    <LinearGradient
      colors={["#667eea", "#764ba2", "#f093fb"]}
      style={{ flex: 1 }}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Welcome Back 👋</Text>
              <Text style={styles.headerSubtitle}>
                Log in to continue your health journey
              </Text>
            </View>

            {/* Card */}
            <View style={styles.card}>
              <Text style={styles.title}>Log In</Text>

              {/* Email */}
              <View style={styles.inputContainer}>
                <FontAwesome name="envelope" size={18} color="#4A6572" />
                <TextInput
                  style={styles.input}
                  placeholder="Email Address"
                  placeholderTextColor="#9E9E9E"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              {/* Password */}
              <View style={styles.inputContainer}>
                <FontAwesome name="lock" size={20} color="#4A6572" />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#9E9E9E"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              {/* Forgot Password */}
              <TouchableOpacity
                onPress={() => navigation.navigate("ForgotPassword")} // 👈 change if your route name is different
              >
                <Text style={styles.forgotPasswordText}>
                  Forgot your password?
                </Text>
              </TouchableOpacity>

              {/* Login Button */}
              <TouchableOpacity
                style={styles.loginButton}
                onPress={handleLogin}
                activeOpacity={0.8}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.loginButtonText}>Log In</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Bottom Section */}
            <View style={styles.bottomSection}>
              <Text style={styles.bottomText}>Don’t have an account?</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("Signup")} // 👈 your existing Signup route
              >
                <Text style={styles.signUpText}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    marginBottom: 40,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.9)",
    marginTop: 6,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 24,
    textAlign: "center",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  input: {
    flex: 1,
    marginLeft: 10,
    color: "#1E293B",
    fontSize: 15,
  },
  forgotPasswordText: {
    color: "#667eea",
    fontWeight: "600",
    textAlign: "right",
    marginBottom: 24,
  },
  loginButton: {
    backgroundColor: "#667eea",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  loginButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  bottomSection: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 30,
  },
  bottomText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
  },
  signUpText: {
    color: "#fff",
    fontWeight: "700",
    marginLeft: 6,
    textDecorationLine: "underline",
  },
});
