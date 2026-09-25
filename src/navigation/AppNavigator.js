import React, { useContext, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import {
  createStackNavigator,
  TransitionPresets,
} from '@react-navigation/stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AuthContext } from '../context/AuthContext';

// Auth Screens
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';

// Main App Tabs
import MainTabs from './MainTabs';
import OnboardingScreen from '../screens/OnboardingScreen';

// Secondary Screens
import SymptomCheckerScreen from '../screens/SymptomCheckerScreen';
import HealthRecordDetail from '../screens/HealthRecordDetail';
import AllRecordsScreen from '../screens/AllRecordsScreen';
import DoctorsScreen from '../screens/DoctorsScreen';
import BookAppointmentScreen from '../screens/BookAppointmentScreen';
import MedicationScreen from '../screens/MedicationScreen';
import ProfileAccountScreen from '../screens/ProfileAccountScreen';
import HealthInformationScreen from '../screens/HealthInformationScreen';
import AppSettingsScreen from '../screens/AppSettingsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import NotificationCenterScreen from '../screens/NotificationCenterScreen';
import PrivacySecurityScreen from '../screens/PrivacySecurityScreen';
import EmergencyContactScreen from '../screens/EmergencyContactScreen';
import ConnectedDevicesScreen from '../screens/ConnectedDevicesScreen';
import HelpSupportScreen from '../screens/HelpSupportScreen';
import ContactSupportScreen from '../screens/ContactSupportScreen';
import AboutScreen from '../screens/AboutScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  const {
    user,
    loading,
    profile,
    profileLoading,
    profileError,
    onboardingCompleted,
    isDarkMode,
    isAppLocked,
    isBiometricsEnabled,
    passwordLockEnabled,
    authenticateBiometricsManually,
    verifyPasswordLock,
    refreshProfile,
  } = useContext(AuthContext);

  const [unlockPin, setUnlockPin] = useState('');
  const [unlockError, setUnlockError] = useState('');

  const headerBackground = isDarkMode
    ? '#0A0F1A'
    : '#FFFFFF';

  const headerText = isDarkMode
    ? '#FFFFFF'
    : '#111827';

  const screenBackground = isDarkMode
    ? '#0A0F1A'
    : '#F8F9FB';

  const statusBarStyle = isDarkMode
  ? 'light-content'
  : 'dark-content';

  /*
   * Wait for Firebase authentication to restore.
   */
  if (loading) {
    // The global animated splash owns startup presentation.
    // Keep the navigator visually quiet while Firebase restores the session.
    return (
      <View
        style={[
          styles.center,
          {
            backgroundColor: screenBackground,
          },
        ]}
      />
    );
  }

  /*
   * Wait for the backend profile before deciding whether
   * this authenticated user needs onboarding.
   *
   * This prevents:
   * user exists → profile still loading → Home opens
   */
  if (
    user &&
    profileLoading &&
    !profile
  ) {
    return (
      <View
        style={[
          styles.startupGate,
          {
            backgroundColor:
              screenBackground,
          },
        ]}
      >
        <View
          style={[
            styles.startupIcon,
            {
              backgroundColor:
                isDarkMode
                  ? '#141C29'
                  : '#FFFFFF',
              borderColor:
                isDarkMode
                  ? '#222E40'
                  : '#E2E8F0',
            },
          ]}
        >
          <Ionicons
            name="heart-outline"
            size={30}
            color="#00D4C5"
          />
        </View>

        <Text
          style={[
            styles.startupTitle,
            {
              color:
                isDarkMode
                  ? '#FFFFFF'
                  : '#111827',
            },
          ]}
        >
          Restoring CareSense
        </Text>

        <Text
          style={[
            styles.startupMessage,
            {
              color:
                isDarkMode
                  ? '#8897AE'
                  : '#64748B',
            },
          ]}
        >
          Preparing your health dashboard...
        </Text>

        <ActivityIndicator
          size="small"
          color="#00D4C5"
          style={{
            marginTop: 20,
          }}
        />
      </View>
    );
  }

  if (
    user &&
    !profile &&
    !profileLoading &&
    profileError
  ) {
    return (
      <View
        style={[
          styles.startupGate,
          {
            backgroundColor:
              screenBackground,
          },
        ]}
      >
        <View
          style={[
            styles.startupIcon,
            {
              backgroundColor:
                isDarkMode
                  ? '#141C29'
                  : '#FFFFFF',
              borderColor:
                isDarkMode
                  ? '#222E40'
                  : '#E2E8F0',
            },
          ]}
        >
          <Ionicons
            name="cloud-offline-outline"
            size={30}
            color="#00D4C5"
          />
        </View>

        <Text
          style={[
            styles.startupTitle,
            {
              color:
                isDarkMode
                  ? '#FFFFFF'
                  : '#111827',
            },
          ]}
        >
          You're offline
        </Text>

        <Text
          style={[
            styles.startupMessage,
            {
              color:
                isDarkMode
                  ? '#8897AE'
                  : '#64748B',
            },
          ]}
        >
          We can't verify your CareSense profile yet.
          Connect to the internet and try again.
        </Text>

        <TouchableOpacity
          style={styles.retryButton}
          onPress={() =>
            void refreshProfile()
          }
          activeOpacity={0.8}
        >
          <Ionicons
            name="refresh-outline"
            size={18}
            color="#0A0F1A"
          />

          <Text
            style={styles.retryButtonText}
          >
            Try Again
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  /*
   * APP LOCK SCREEN INTERCEPTOR
   */
  if (
    user &&
    isAppLocked
  ) {
    const handlePasswordUnlock = async () => {
      setUnlockError('');

      if (!unlockPin) {
        setUnlockError('Enter your app PIN.');
        return;
      }

      const result = await verifyPasswordLock?.(unlockPin);

      if (result?.success) {
        setUnlockPin('');
        setUnlockError('');
        return;
      }

      setUnlockError(
        result?.message ||
          'The PIN is incorrect.'
      );
    };

    return (
      <KeyboardAvoidingView
        style={styles.lockKeyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          style={[
            styles.lockContainer,
            {
              backgroundColor:
                isDarkMode
                  ? '#0A0F1A'
                  : '#F8F9FB',
            },
          ]}
        >
          <View style={styles.iconCircle}>
            <Ionicons
              name="lock-closed"
              size={48}
              color="#00D4C5"
            />
          </View>

          <Text
            style={[
              styles.lockTitle,
              {
                color:
                  isDarkMode
                    ? '#FFFFFF'
                    : '#111827',
              },
            ]}
          >
            CareSense AI Protected
          </Text>

          <Text
            style={[
              styles.lockSub,
              {
                color:
                  isDarkMode
                    ? '#8897AE'
                    : '#64748B',
              },
            ]}
          >
            Unlock the app to access your CareSense health information.
          </Text>

          {isBiometricsEnabled ? (
            <TouchableOpacity
              style={styles.unlockBtn}
              onPress={async () => {
                setUnlockError('');
                await authenticateBiometricsManually?.();
              }}
              activeOpacity={0.82}
            >
              <Ionicons
                name="scan-outline"
                size={22}
                color="#0A0F1A"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.unlockBtnText}>
                Unlock with Face / Biometrics
              </Text>
            </TouchableOpacity>
          ) : null}

          {isBiometricsEnabled && passwordLockEnabled ? (
            <Text style={styles.lockOrText}>OR</Text>
          ) : null}

          {passwordLockEnabled ? (
            <View style={styles.passwordUnlockBox}>
              <TextInput
                value={unlockPin}
                onChangeText={value => {
                  setUnlockError('');
                  setUnlockPin(
                    value
                      .replace(/\D/g, '')
                      .slice(0, 6)
                  );
                }}
                secureTextEntry
                keyboardType="number-pad"
                maxLength={6}
                placeholder="Enter app PIN"
                placeholderTextColor={
                  isDarkMode
                    ? '#8897AE'
                    : '#64748B'
                }
                style={[
                  styles.lockPinInput,
                  {
                    backgroundColor:
                      isDarkMode
                        ? '#141C29'
                        : '#FFFFFF',
                    borderColor:
                      isDarkMode
                        ? '#222E40'
                        : '#E2E8F0',
                    color:
                      isDarkMode
                        ? '#FFFFFF'
                        : '#111827',
                  },
                ]}
              />

              <TouchableOpacity
                style={styles.pinUnlockBtn}
                onPress={() => {
                  void handlePasswordUnlock();
                }}
                activeOpacity={0.82}
              >
                <Ionicons
                  name="keypad-outline"
                  size={20}
                  color="#0A0F1A"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.unlockBtnText}>
                  Unlock with PIN
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {unlockError ? (
            <Text style={styles.lockErrorText}>
              {unlockError}
            </Text>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <>
      <StatusBar
        barStyle={statusBarStyle}
        backgroundColor="transparent"
        translucent
      />
      <Stack.Navigator
        screenOptions={{
        headerStyle: {
          backgroundColor:
            headerBackground,
          elevation: 0,
          shadowOpacity: 0,
        },

        headerTintColor:
          headerText,

        headerTitleStyle: {
          fontWeight: '700',
          color: headerText,
        },

        cardStyle: {
          backgroundColor:
            screenBackground,
        },

        // Smooth slide & fade animation across transitions
        ...TransitionPresets.SlideFromRightIOS,
      }}
    >
      {user == null ? (
        <>
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{
              headerShown: false,
            }}
          />

          <Stack.Screen
            name="Signup"
            component={SignupScreen}
            options={{
              headerShown: false,
            }}
          />
        </>
      ) : (
        <>
          {onboardingCompleted ? (
            <Stack.Screen
              name="MainTabs"
              component={MainTabs}
              options={{
                headerShown: false,
              }}
            />
          ) : (
            <Stack.Screen
              name="Onboarding"
              component={OnboardingScreen}
              options={{
                headerShown: false,
              }}
            />
          )}

          <Stack.Screen
            name="SymptomChecker"
            component={SymptomCheckerScreen}
            options={{
              headerShown: false,
            }}
          />

          <Stack.Screen
            name="HealthRecordDetail"
            component={HealthRecordDetail}
            options={{
              headerShown: false,
            }}
          />

          <Stack.Screen
            name="AllRecords"
            component={AllRecordsScreen}
            options={{
              headerShown: false,
            }}
          />

          <Stack.Screen
            name="Doctors"
            component={DoctorsScreen}
            options={{
              headerShown: false,
            }}
          />

          <Stack.Screen
            name="BookAppointment"
            component={
              BookAppointmentScreen
            }
            options={{
              title: 'Book Appointment',
            }}
          />

          <Stack.Screen
            name="Medication"
            component={MedicationScreen}
            options={{
              headerShown: false,
            }}
          />

          <Stack.Screen
            name="ProfileAccount"
            component={ProfileAccountScreen}
            options={{
              headerShown: false,
              gestureEnabled: true,
            }}
          />

          <Stack.Screen
            name="HealthInformation"
            component={HealthInformationScreen}
            options={{
              headerShown: false,
              gestureEnabled: true,
            }}
          />

          <Stack.Screen
            name="AppSettings"
            component={AppSettingsScreen}
            options={{
              headerShown: false,
              gestureEnabled: true,
            }}
          />

          <Stack.Screen
            name="Notifications"
            component={NotificationsScreen}
            options={{
              headerShown: false,
              gestureEnabled: true,
            }}
          />

          <Stack.Screen
            name="NotificationCenter"
            component={NotificationCenterScreen}
            options={{
              headerShown: false,
              gestureEnabled: true,
            }}
          />

          <Stack.Screen
            name="PrivacySecurity"
            component={PrivacySecurityScreen}
            options={{
              headerShown: false,
              gestureEnabled: true,
            }}
          />

          <Stack.Screen
            name="EmergencyContact"
            component={EmergencyContactScreen}
            options={{
              headerShown: false,
              gestureEnabled: true,
            }}
          />

          <Stack.Screen
            name="ConnectedDevices"
            component={ConnectedDevicesScreen}
            options={{
              headerShown: false,
              gestureEnabled: true,
            }}
          />

          <Stack.Screen
            name="HelpSupport"
            component={HelpSupportScreen}
            options={{
              headerShown: false,
              gestureEnabled: true,
            }}
          />

          <Stack.Screen
            name="ContactSupport"
            component={ContactSupportScreen}
            options={{
              headerShown: false,
              gestureEnabled: true,
            }}
          />

          <Stack.Screen
            name="About"
            component={AboutScreen}
            options={{
              headerShown: false,
              gestureEnabled: true,
            }}
          />
        </>
      )}
      </Stack.Navigator>
    </>
  );
}

const styles = StyleSheet.create({
  lockKeyboard: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  lockContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },

  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor:
      'rgba(0, 212, 197, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor:
      'rgba(0, 212, 197, 0.3)',
  },

  lockTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },

  lockSub: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },

  unlockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00D4C5',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
  },

  lockOrText: {
    marginTop: 16,
    marginBottom: 12,
    color: '#8897AE',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  passwordUnlockBox: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'stretch',
  },
  lockPinInput: {
    width: '100%',
    minHeight: 54,
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 14,
    textAlign: 'center',
    fontSize: 20,
    letterSpacing: 5,
  },
  pinUnlockBtn: {
    marginTop: 10,
    minHeight: 52,
    paddingHorizontal: 18,
    borderRadius: 15,
    backgroundColor: '#00D4C5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockErrorText: {
    marginTop: 12,
    color: '#EF4444',
    fontSize: 12.5,
    fontWeight: '700',
    textAlign: 'center',
  },
  unlockBtnText: {
    color: '#0A0F1A',
    fontSize: 15,
    fontWeight: '700',
  },
  startupGate: {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: 32,
  },

  startupIcon: {
    width: 76,
    height: 76,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  startupTitle: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },

  startupMessage: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 340,
  },

  retryButton: {
    marginTop: 24,
    minHeight: 48,
    paddingHorizontal: 22,
    borderRadius: 15,
    backgroundColor: '#00D4C5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  retryButtonText: {
    color: '#0A0F1A',
    fontSize: 14,
    fontWeight: '800',
  },
});