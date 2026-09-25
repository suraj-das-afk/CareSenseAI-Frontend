import React, { useContext } from 'react';
import {
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import {
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';
import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AuthContext } from '../context/AuthContext';

import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import SymptomCheckerScreen from '../screens/SymptomCheckerScreen';
import AppointmentsScreen from '../screens/AppointmentsScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  const { isDarkMode } = useContext(AuthContext);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const activeColor = '#00D4C5';

  const inactive = isDarkMode
    ? '#8897AE'
    : '#64748B';

  const horizontalMargin =
    width <= 360
      ? 12
      : width <= 390
        ? 16
        : 24;

  /*
   * Android edge-to-edge means the system navigation area
   * can overlap an absolutely positioned tab bar.
   *
   * Move the floating bar above the safe-area inset.
   */
  const bottomOffset = Math.max(
    insets.bottom + 8,
    12
  );

  const labelSize =
    width <= 360
      ? 8.5
      : 9.5;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,

        tabBarHideOnKeyboard: true,

        tabBarActiveTintColor:
          activeColor,

        tabBarInactiveTintColor:
          inactive,

        tabBarShowLabel: true,

        tabBarBackground: () => (
          <View pointerEvents="none" style={styles.glassBackground}>
            <BlurView
              intensity={isDarkMode ? 58 : 52}
              tint={isDarkMode ? 'dark' : 'light'}
              experimentalBlurMethod="dimezisBlurView"
              style={styles.blurFill}
            />

            <View
              style={[
                styles.glassTint,
                {
                  backgroundColor: isDarkMode
                    ? 'rgba(18, 26, 39, 0.20)'
                    : 'rgba(255, 255, 255, 0.12)',
                  borderColor: isDarkMode
                    ? 'rgba(255, 255, 255, 0.30)'
                    : 'rgba(255, 255, 255, 0.82)',
                },
              ]}
            />

            <View
              style={[
                styles.glassHighlight,
                {
                  backgroundColor: isDarkMode
                    ? 'rgba(255, 255, 255, 0.13)'
                    : 'rgba(255, 255, 255, 0.52)',
                },
              ]}
            />
            <View
              style={[
                styles.glassBottomShade,
                {
                  backgroundColor: isDarkMode
                    ? 'rgba(0, 0, 0, 0.10)'
                    : 'rgba(15, 23, 42, 0.035)',
                },
              ]}
            />
          </View>
        ),

        tabBarStyle: [
          styles.tabBar,
          {
            left: horizontalMargin,
            right: horizontalMargin,
            bottom: bottomOffset,
            borderColor: isDarkMode
              ? 'rgba(255, 255, 255, 0.28)'
              : 'rgba(15, 23, 42, 0.14)',
          },
        ],

        tabBarItemStyle:
          styles.tabItem,

        tabBarLabelStyle: [
          styles.tabLabel,
          {
            fontSize: labelSize,
          },
        ],

        tabBarIcon: ({
          focused,
          color,
        }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused
              ? 'home'
              : 'home-outline';
          } else if (
            route.name === 'Search'
          ) {
            iconName = focused
              ? 'search'
              : 'search-outline';
          } else if (
            route.name ===
            'SymptomCheck'
          ) {
            iconName = focused
              ? 'medical'
              : 'medical-outline';
          } else if (
            route.name ===
            'Appointments'
          ) {
            iconName = focused
              ? 'calendar'
              : 'calendar-outline';
          } else {
            iconName = focused
              ? 'settings'
              : 'settings-outline';
          }

          return (
            <View
              style={[
                styles.iconPill,
                focused && [
                  styles.iconPillActive,
                  {
                    backgroundColor: isDarkMode
                      ? 'rgba(0, 212, 197, 0.26)'
                      : 'rgba(0, 212, 197, 0.20)',
                    borderColor: isDarkMode
                      ? 'rgba(0, 212, 197, 0.55)'
                      : 'rgba(0, 212, 197, 0.48)',
                  },
                ],
              ]}
            >
              <Ionicons
                name={iconName}
                size={22}
                color={color}
              />
            </View>
          );
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
        }}
      />

      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarLabel: 'Search',
        }}
      />

      <Tab.Screen
        name="SymptomCheck"
        component={
          SymptomCheckerScreen
        }
        options={{
          tabBarLabel:
            'Symptoms',
        }}
      />

      <Tab.Screen
        name="Appointments"
        component={
          AppointmentsScreen
        }
        options={{
          tabBarLabel:
            'Appointments',
        }}
      />

      <Tab.Screen
        name="Settings"
        component={
          SettingsScreen
        }
        options={{
          tabBarLabel: 'Settings',
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    height: 72,
    borderRadius: 24,
    borderWidth: 1,
    backgroundColor: 'transparent',
    paddingTop: 5,
    paddingBottom: 5,
    paddingHorizontal: 5,
    overflow: 'hidden',

    elevation: 0,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.22,
    shadowRadius: 22,
  },

  glassBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    overflow: 'hidden',
  },

  blurFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
  },

  glassTint: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    borderWidth: 1,
  },

  glassHighlight: {
    position: 'absolute',
    top: 1,
    left: 14,
    right: 14,
    height: 2,
    borderRadius: 999,
  },

  glassBottomShade: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 0,
    height: 2,
    borderRadius: 999,
  },

  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 0,
    borderRadius: 18,
  },

  iconPill: {
    width: 38,
    height: 30,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 1,
  },

  iconPillActive: {
    borderWidth: 1,
  },

  tabLabel: {
    fontWeight: '700',
    marginTop: 0,
    textAlign: 'center',
    includeFontPadding: false,
  },
});