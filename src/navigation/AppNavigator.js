import React, { useState, useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../firebaseConfig';

// Screens
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import HomeScreen from '../screens/HomeScreen';
import AllRecordsScreen from '../screens/AllRecordsScreen';
import HealthRecordDetail from '../screens/HealthRecordDetail';
import SearchScreen from '../screens/SearchScreen';
import SymptomCheckerScreen from '../screens/SymptomCheckerScreen';
import DoctorsScreen from '../screens/DoctorsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AICacheManagerScreen from '../screens/AICacheManagerScreen';
import AppointmentsScreen from '../screens/AppointmentsScreen';
import BookAppointmentScreen from '../screens/BookAppointmentScreen';
import RescheduleAppointmentScreen from '../screens/RescheduleAppointmentScreen';
import MedicationScreen from "../screens/MedicationScreen";


const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// -----------------------------
// 🔹 Main Bottom Tabs
// -----------------------------
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#2D8CFF',
        tabBarInactiveTintColor: '#6B7A8A',
        tabBarStyle: {
          height: 70,
          paddingBottom: 10,
          paddingTop: 10,
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#F0F0F0',
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 4,
        },
        tabBarIcon: ({ focused, color }) => {
          let iconName;
          const iconSize = focused ? 26 : 22;

          if (route.name === 'Home') iconName = 'home';
          else if (route.name === 'Search') iconName = 'search';
          else if (route.name === 'Doctors') iconName = 'user-md';
          else if (route.name === 'Checker') iconName = 'stethoscope';
          else if (route.name === 'Settings') iconName = 'cog';

          return (
            <View
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                width: 50,
                height: 50,
                borderRadius: 25,
                backgroundColor: focused ? '#E8F4FF' : 'transparent',
              }}
            >
              <FontAwesome5 name={iconName} size={iconSize} color={color} solid={focused} />
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ unmountOnBlur: false }} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Doctors" component={DoctorsScreen} />
      <Tab.Screen name="Checker" component={SymptomCheckerScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

// -----------------------------
// 🔹 Root Navigator
// -----------------------------
export default function AppNavigator() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log('🔍 Auth state changed:', currentUser?.email || 'No user');
      setUser(currentUser);
      if (initializing) setInitializing(false);
    });
    return unsubscribe;
  }, []);

  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FBFF' }}>
        <ActivityIndicator size="large" color="#2D8CFF" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          {/* ✅ Correctly show bottom tabs when logged in */}
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="AllRecords" component={AllRecordsScreen} />
          <Stack.Screen name="HealthRecordDetail" component={HealthRecordDetail} />
          <Stack.Screen name="Appointments" component={AppointmentsScreen} />
          <Stack.Screen name="AICacheManager" component={AICacheManagerScreen} options={{ title: 'AI Cache Manager' }} />
          <Stack.Screen name="BookAppointment" component={BookAppointmentScreen} />
          <Stack.Screen name="RescheduleAppointment" component={RescheduleAppointmentScreen} />
          <Stack.Screen name="Medications" component={MedicationScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

