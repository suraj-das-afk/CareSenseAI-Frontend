import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const NOTIFICATION_CHANNEL_ID = 'caresense';

export const configureNotificationChannel = async () => {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync(
    NOTIFICATION_CHANNEL_ID,
    {
      name: 'CareSense Notifications',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250],
      lightColor: '#00D4C5',
    }
  );
};

export const getNotificationPermissionStatus = async () => {
  try {
    await configureNotificationChannel();

    const permissions =
      await Notifications.getPermissionsAsync();

    const iosGranted =
      permissions.ios?.status ===
      Notifications.IosAuthorizationStatus.PROVISIONAL ||
      permissions.ios?.status ===
      Notifications.IosAuthorizationStatus.AUTHORIZED;

    return {
      granted:
        permissions.granted || iosGranted,
      status:
        permissions.status,
      canAskAgain:
        permissions.canAskAgain,
    };
  } catch (error) {
    console.error(
      'Notification permission status error:',
      error
    );

    return {
      granted: false,
      status: 'unknown',
      canAskAgain: true,
    };
  }
};

export const requestNotificationPermission = async () => {
  try {
    /*
     * Android 13+ requires a notification channel
     * before the notification permission prompt can appear.
     */
    await configureNotificationChannel();

    const existing =
      await Notifications.getPermissionsAsync();

    const existingIosStatus =
      existing.ios?.status;

    const alreadyGranted =
      existing.granted ||
      existingIosStatus ===
        Notifications.IosAuthorizationStatus.AUTHORIZED ||
      existingIosStatus ===
        Notifications.IosAuthorizationStatus.PROVISIONAL;

    if (alreadyGranted) {
      return {
        granted: true,
        status: existing.status,
        canAskAgain: existing.canAskAgain,
      };
    }

    const result =
      await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });

    const iosGranted =
      result.ios?.status ===
        Notifications.IosAuthorizationStatus.AUTHORIZED ||
      result.ios?.status ===
        Notifications.IosAuthorizationStatus.PROVISIONAL;

    return {
      granted:
        result.granted || iosGranted,
      status:
        result.status,
      canAskAgain:
        result.canAskAgain,
    };
  } catch (error) {
    console.error(
      'Notification permission request error:',
      error
    );

    return {
      granted: false,
      status: 'error',
      canAskAgain: true,
    };
  }
};