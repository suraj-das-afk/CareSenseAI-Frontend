import React, { useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
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

const Stack = createStackNavigator();

export default function AppNavigator() {
  const {
    user,
    loading,
    profile,
    profileLoading,
    onboardingCompleted,
    isDarkMode,
    isAppLocked,
    authenticateBiometricsManually,
  } = useContext(AuthContext);

  const headerBackground = isDarkMode
    ? '#0A0F1A'
    : '#FFFFFF';

  const headerText = isDarkMode
    ? '#FFFFFF'
    : '#111827';

  const screenBackground = isDarkMode
    ? '#0A0F1A'
    : '#F8F9FB';

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
    !profile
  ) {
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
   * BIOMETRIC LOCK SCREEN INTERCEPTOR
   */
  if (
    user &&
    isAppLocked
  ) {
    return (
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
          Biometric verification required to access your medical records.
        </Text>

        <TouchableOpacity
          style={styles.unlockBtn}
          onPress={
            authenticateBiometricsManually
          }
        >
          <Ionicons
            name="finger-print-outline"
            size={22}
            color="#0A0F1A"
            style={{
              marginRight: 8,
            }}
          />

          <Text style={styles.unlockBtnText}>
            Unlock with Biometrics
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
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
            component={
              SymptomCheckerScreen
            }
            options={{
              title: 'Check Symptoms',
            }}
          />

          <Stack.Screen
            name="HealthRecordDetail"
            component={
              HealthRecordDetail
            }
            options={{
              title: 'Analysis Result',
            }}
          />

          <Stack.Screen
            name="AllRecords"
            component={
              AllRecordsScreen
            }
            options={{
              title: 'My Records',
            }}
          />

          <Stack.Screen
            name="Doctors"
            component={
              DoctorsScreen
            }
            options={{
              title: 'Find a Doctor',
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
            component={
              MedicationScreen
            }
            options={{
              title: 'My Medications',
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
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

  unlockBtnText: {
    color: '#0A0F1A',
    fontSize: 15,
    fontWeight: '700',
  },
});