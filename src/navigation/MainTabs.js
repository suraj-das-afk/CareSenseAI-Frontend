import React from 'react';

import {
  StyleSheet,
  useColorScheme,
  useWindowDimensions,
} from 'react-native';

import {
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';

import Ionicons from '@expo/vector-icons/Ionicons';

import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import AppointmentsScreen from '../screens/AppointmentsScreen';
import SettingsScreen from '../screens/SettingsScreen';


/* ============================================================
   TAB NAVIGATOR
============================================================ */

const Tab =
  createBottomTabNavigator();


/* ============================================================
   COLORS
============================================================ */

const ACTIVE_COLOR =
  '#2166F3';


/* ============================================================
   MAIN TABS
============================================================ */

export default function MainTabs() {

  const isDark =
    useColorScheme() === 'dark';

  const { width } =
    useWindowDimensions();


  /* ==========================================================
     THEME
  ========================================================== */

  const background =
    isDark
      ? '#171717'
      : '#FFFFFF';

  const border =
    isDark
      ? '#303030'
      : '#E0E0E0';

  const inactive =
    isDark
      ? '#A0A0A0'
      : '#777777';


  /* ==========================================================
     RESPONSIVE HORIZONTAL POSITION
  ========================================================== */

  const horizontalMargin =
    width <= 360
      ? 16
      : width <= 390
        ? 20
        : 28;


  /* ==========================================================
     NAVIGATION
  ========================================================== */

  return (
    <Tab.Navigator

      screenOptions={({
        route,
      }) => ({

        /* ----------------------------------------------
           HEADER
        ---------------------------------------------- */

        headerShown: false,


        /* ----------------------------------------------
           KEYBOARD
        ---------------------------------------------- */

        tabBarHideOnKeyboard:
          true,


        /* ----------------------------------------------
           COLORS
        ---------------------------------------------- */

        tabBarActiveTintColor:
          ACTIVE_COLOR,

        tabBarInactiveTintColor:
          inactive,


        /* ----------------------------------------------
           LABEL
        ---------------------------------------------- */

        tabBarShowLabel: true,


        /* ----------------------------------------------
           BAR
        ---------------------------------------------- */

        tabBarStyle: [
          styles.tabBar,

          {
            left:
              horizontalMargin,

            right:
              horizontalMargin,

            backgroundColor:
              background,

            borderColor:
              border,
          },
        ],


        /* ----------------------------------------------
           ITEMS
        ---------------------------------------------- */

        tabBarItemStyle:
          styles.tabItem,


        /* ----------------------------------------------
           LABEL STYLE
        ---------------------------------------------- */

        tabBarLabelStyle:
          styles.tabLabel,


        /* ----------------------------------------------
           ICON
        ---------------------------------------------- */

        tabBarIcon: ({
          focused,
          color,
        }) => {

          let iconName;


          /* HOME */

          if (
            route.name ===
            'Home'
          ) {
            iconName =
              focused
                ? 'home'
                : 'home-outline';
          }


          /* SEARCH */

          else if (
            route.name ===
            'Search'
          ) {
            iconName =
              focused
                ? 'search'
                : 'search-outline';
          }


          /* APPOINTMENTS */

          else if (
            route.name ===
            'Appointments'
          ) {
            iconName =
              focused
                ? 'calendar'
                : 'calendar-outline';
          }


          /* SETTINGS */

          else {
            iconName =
              focused
                ? 'settings'
                : 'settings-outline';
          }


          return (
            <Ionicons
              name={iconName}
              size={27}
              color={color}
            />
          );
        },

      })}

    >


      {/* ==================================================
          HOME
      ================================================== */}

      <Tab.Screen
        name="Home"
        component={
          HomeScreen
        }
        options={{
          tabBarLabel: 'Home',
        }}
      />


      {/* ==================================================
          SEARCH
      ================================================== */}

      <Tab.Screen
        name="Search"
        component={
          SearchScreen
        }
        options={{
          tabBarLabel: 'Search',
        }}
      />


      {/* ==================================================
          APPOINTMENTS
      ================================================== */}

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


      {/* ==================================================
          SETTINGS
      ================================================== */}

      <Tab.Screen
        name="Settings"
        component={
          SettingsScreen
        }
        options={{
          tabBarLabel:
            'Settings',
        }}
      />

    </Tab.Navigator>
  );
}


/* ============================================================
   STYLES
============================================================ */

const styles =
  StyleSheet.create({

    /* ========================================================
       FLOATING TAB BAR
    ======================================================== */

    tabBar: {

      position:
        'absolute',

      /*
       * Lower than before.
       * This makes the bar visually centered
       * with the Android gesture/navigation area.
       */

      bottom: 8,

      height: 76,

      borderRadius: 26,

      borderWidth: 2,

      paddingTop: 3,

      paddingBottom: 3,

      paddingHorizontal: 2,

      elevation: 8,

      shadowColor:
        '#000',

      shadowOffset: {
        width: 0,
        height: 4,
      },

      shadowOpacity: 0.18,

      shadowRadius: 10,
    },


    /* ========================================================
       TAB ITEM
    ======================================================== */

    tabItem: {

      justifyContent:
        'center',

      alignItems:
        'center',

      paddingTop: 0,

      paddingBottom: 0,

    },


    /* ========================================================
       TAB LABEL
    ======================================================== */

    tabLabel: {

      fontSize: 11,

      lineHeight: 15,

      fontWeight: '500',

      marginTop: 0,

    },

  });