import React, { useContext } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthContext } from '../context/AuthContext';

// Auth Screens
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';

// Main App Tabs
import MainTabs from './MainTabs';

// Secondary Screens
import SymptomCheckerScreen from '../screens/SymptomCheckerScreen';
import HealthRecordDetail from '../screens/HealthRecordDetail';
import AllRecordsScreen from '../screens/AllRecordsScreen';
import DoctorsScreen from '../screens/DoctorsScreen';
import BookAppointmentScreen from '../screens/BookAppointmentScreen';
import MedicationScreen from '../screens/MedicationScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return null; // Or a splash screen
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1F2937' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      {user == null ? (
        // Auth Stack
        <>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Signup" component={SignupScreen} options={{ headerShown: false }} />
        </>
      ) : (
        // Main Stack
        <>
          <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen name="SymptomChecker" component={SymptomCheckerScreen} options={{ title: 'Check Symptoms' }} />
          <Stack.Screen name="HealthRecordDetail" component={HealthRecordDetail} options={{ title: 'Analysis Result' }} />
          <Stack.Screen name="AllRecords" component={AllRecordsScreen} options={{ title: 'My Records' }} />
          <Stack.Screen name="Doctors" component={DoctorsScreen} options={{ title: 'Find a Doctor' }} />
          <Stack.Screen name="BookAppointment" component={BookAppointmentScreen} options={{ title: 'Book Appointment' }} />
          <Stack.Screen name="Medication" component={MedicationScreen} options={{ title: 'My Medications' }} />
        </>
      )}
    </Stack.Navigator>
  );
}
