import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { FontAwesome5 } from "@expo/vector-icons";
import HomeScreen from "../screens/HomeScreen";
import ChatScreen from "../screens/ChatScreen";
import SettingsScreen from "../screens/SettingsScreen";

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          position: "absolute",
          bottom: 10,
          left: 16,
          right: 16,
          elevation: 10,
          height: 70,
          shadowColor: "#4A90E2",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
        },
        tabBarIcon: ({ focused }) => {
          let iconName;
          let iconColor = focused ? "#4A90E2" : "#9CA3AF";
          let iconBg = focused ? "#E8F2FF" : "transparent";

          if (route.name === "Home") iconName = "home";
          else if (route.name === "Chat") iconName = "comments";
          else if (route.name === "Settings") iconName = "cog";

          return (
            <FontAwesome5
              name={iconName}
              size={22}
              color={iconColor}
              style={{
                backgroundColor: iconBg,
                padding: 10,
                borderRadius: 20,
                overflow: "hidden",
              }}
            />
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
