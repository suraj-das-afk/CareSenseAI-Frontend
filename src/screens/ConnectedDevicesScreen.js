import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useContext,
} from 'react';

import {
  ActivityIndicator,
  Animated,
  AppState,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { PopupContext } from '../context/PopupContext';
import { AuthContext } from '../context/AuthContext';
import {
  connectBluetoothDevice,
  disconnectBluetoothDevice,
  enableBluetooth,
  getBluetoothState,
  getConnectedBluetoothDevices,
  initializeBluetooth,
  readBluetoothBatteryLevel,
  requestBalancedConnectionPriority,
  runNativeGattDiagnostics,
  stopNativeHeartRateNotifications,
  startHeartRateNotifications,
  stopHeartRateNotifications,
  startBluetoothScan,
  stopBluetoothScan,
  subscribeToBluetoothEvents,
} from '../services/bluetoothDeviceService';

const STORAGE_KEY = '@caresense_user_settings_v2';
const DEVICE_STORAGE_VERSION = 3;

const BRAND = {
  cyan: '#00D4C5',
  darkBg: '#0A0F1A',
  darkCard: '#141C29',
  darkBorder: '#222E40',
  lightBg: '#F8F9FB',
  lightCard: '#FFFFFF',
  lightBorder: '#E2E8F0',
  danger: '#EF4444',
};

const getTheme = isDark => ({
  background: isDark ? BRAND.darkBg : BRAND.lightBg,
  card: isDark ? BRAND.darkCard : BRAND.lightCard,
  border: isDark ? BRAND.darkBorder : BRAND.lightBorder,
  inputBg: isDark ? '#1C2738' : '#F1F5F9',
  textPrimary: isDark ? '#FFFFFF' : '#111827',
  textSecondary: isDark ? '#8897AE' : '#64748B',
  accent: BRAND.cyan,
});

const getUserDeviceKey = uid =>
  `${STORAGE_KEY}:devices:v${DEVICE_STORAGE_VERSION}:${uid || 'anonymous'}`;

const formatTime = value => {
  if (!value) return '—';

  try {
    return new Date(value).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
};

const formatDisconnectStatus = status => {
  if (typeof status !== 'number') {
    return 'Unknown disconnect reason';
  }

  return `Android BLE status ${status}`;
};

const parseHeartRateMeasurement = value => {
  if (!Array.isArray(value) || value.length < 2) {
    return null;
  }

  const flags = value[0] & 0xff;
  const is16Bit = (flags & 0x01) === 0x01;

  if (is16Bit) {
    if (value.length < 3) return null;
    return (value[1] & 0xff) | ((value[2] & 0xff) << 8);
  }

  return value[1] & 0xff;
};

const normalizePeripheral = peripheral => {
  if (!peripheral?.id) return null;

  const advertising = peripheral.advertising || {};
  const name =
    peripheral.name ||
    advertising.localName ||
    advertising.completeLocalName ||
    'Bluetooth device';

  return {
    id: peripheral.id,
    name,
    rssi: typeof peripheral.rssi === 'number' ? peripheral.rssi : null,
    advertising,
    isConnectable:
      typeof advertising.isConnectable === 'boolean'
        ? advertising.isConnectable
        : true,
  };
};

export default function ConnectedDevicesScreen({ navigation }) {
  const { user, fullName, isDarkMode } = useContext(AuthContext) || {};
  const { showPopup } = useContext(PopupContext) || {};

  const isDark = Boolean(isDarkMode);
  const theme = useMemo(() => getTheme(isDark), [isDark]);

  const uid = user?.uid || 'anonymous';
  const userDeviceKey = useMemo(() => getUserDeviceKey(uid), [uid]);

  const [devices, setDevices] = useState([]);
  const [discoveredDevices, setDiscoveredDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bluetoothState, setBluetoothState] = useState('unknown');
  const [scanning, setScanning] = useState(false);
  const [scanVisible, setScanVisible] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [connectingId, setConnectingId] = useState(null);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [liveHeartRate, setLiveHeartRate] = useState(null);
  const [nativeDiagnostic, setNativeDiagnostic] = useState(null);
  const [nativeDiagnosticLoading, setNativeDiagnosticLoading] = useState(false);
  const [nativeDiagnosticError, setNativeDiagnosticError] = useState(null);

  const batteryKeepAliveRef = useRef(new Map());

  const devicesRef = useRef([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  const loadDevices = useCallback(async () => {
    try {
      const scopedRaw = await AsyncStorage.getItem(userDeviceKey);

      if (!scopedRaw) {
        setDevices([]);
        setLastSyncedAt(null);
        return;
      }

      const scoped = JSON.parse(scopedRaw);
      const next = Array.isArray(scoped?.devices) ? scoped.devices : [];

      setDevices(next);
      setLastSyncedAt(scoped?.updatedAt || null);
    } catch (error) {
      console.warn('Failed to load user devices:', error);
      showPopup?.(
        'Unable to load devices',
        'Your saved Bluetooth device profiles could not be loaded right now.',
        'error',
      );
    } finally {
      setLoading(false);
    }
  }, [showPopup, userDeviceKey]);

  const persistDevices = useCallback(
    async updated => {
      const updatedAt = new Date().toISOString();

      await AsyncStorage.setItem(
        userDeviceKey,
        JSON.stringify({
          userId: uid,
          userEmail: user?.email || null,
          devices: updated,
          updatedAt,
        }),
      );

      devicesRef.current = updated;
      setLastSyncedAt(updatedAt);
    },
    [uid, user?.email, userDeviceKey],
  );

  useEffect(() => {
    devicesRef.current = devices;
  }, [devices]);

  const stopBatteryKeepAlive = useCallback(async nativeId => {
    const timer = batteryKeepAliveRef.current.get(nativeId);

    if (timer) {
      clearInterval(timer);
      batteryKeepAliveRef.current.delete(nativeId);
    }

    try {
      await requestBalancedConnectionPriority(nativeId);
    } catch {
      // Best effort.
    }
  }, []);

  const startBatteryKeepAlive = useCallback(
    nativeId => {
      if (!nativeId) return;

      const existing = batteryKeepAliveRef.current.get(nativeId);
      if (existing) {
        clearInterval(existing);
      }

      const timer = setInterval(async () => {
        if (!mountedRef.current) return;

        const current = devicesRef.current.find(
          item => item.nativeId === nativeId,
        );

        if (!current || current.status !== 'connected') {
          await stopBatteryKeepAlive(nativeId);
          return;
        }

        const batteryLevel = await readBluetoothBatteryLevel(nativeId);

        if (typeof batteryLevel === 'number') {
          setDevices(latest => {
            const updated = latest.map(device =>
              device.nativeId === nativeId
                ? {
                    ...device,
                    batteryLevel,
                    lastSeenAt: new Date().toISOString(),
                  }
                : device,
            );

            devicesRef.current = updated;
            return updated;
          });
        }
      }, 12000);

      batteryKeepAliveRef.current.set(nativeId, timer);
    },
    [stopBatteryKeepAlive],
  );

  const refreshConnectedState = useCallback(async () => {
    try {
      const connected = await getConnectedBluetoothDevices();

      setDevices(current =>
        current.map(device => {
          if (!device.nativeId) return device;

          const match = connected.find(item => item?.id === device.nativeId);

          return {
            ...device,
            status: match ? 'connected' : 'saved',
            lastSeenAt: match
              ? new Date().toISOString()
              : device.lastSeenAt || null,
            rssi:
              match && typeof match.rssi === 'number'
                ? match.rssi
                : device.rssi ?? null,
          };
        }),
      );
    } catch (error) {
      console.debug('Unable to refresh BLE connection state:', error);
    }
  }, []);

  const initialize = useCallback(async () => {
    try {
      await initializeBluetooth();
      const state = await getBluetoothState();
      setBluetoothState(state);
      await refreshConnectedState();
    } catch (error) {
      console.warn('Bluetooth initialization failed:', error);
      setBluetoothState('unavailable');
    }
  }, [refreshConnectedState]);

  useEffect(() => {
    let mounted = true;
    const setup = async () => {
      await initialize();
      if (!mounted) return;

      const subscriptions = subscribeToBluetoothEvents({
        onDiscoverPeripheral: peripheral => {
          const normalized = normalizePeripheral(peripheral);
          if (!normalized) return;

          setDiscoveredDevices(current => {
            const existing = current.find(item => item.id === normalized.id);

            if (!existing) {
              return [...current, normalized].sort((a, b) => {
                const arssi = typeof a.rssi === 'number' ? a.rssi : -999;
                const brssi = typeof b.rssi === 'number' ? b.rssi : -999;
                return brssi - arssi;
              });
            }

            return current
              .map(item => (item.id === normalized.id ? { ...item, ...normalized } : item))
              .sort((a, b) => {
                const arssi = typeof a.rssi === 'number' ? a.rssi : -999;
                const brssi = typeof b.rssi === 'number' ? b.rssi : -999;
                return brssi - arssi;
              });
          });
        },

        onStopScan: () => {
          setScanning(false);
        },

        onStateChange: state => {
          setBluetoothState(state);
          if (state === 'off') {
            setScanning(false);
          }
        },

        onCharacteristicUpdate: event => {
          const service = String(event?.service || '').toLowerCase();
          const characteristic = String(
            event?.characteristic || '',
          ).toLowerCase();

          if (service !== '180d' || characteristic !== '2a37') {
            return;
          }

          const heartRate = parseHeartRateMeasurement(event?.value);

          if (typeof heartRate === 'number' && heartRate > 0) {
            setLiveHeartRate(heartRate);
          }
        },

        onDisconnect: peripheral => {
          const nativeId = peripheral?.peripheral || peripheral?.id;
          if (!nativeId) return;

          const disconnectedAt = new Date().toISOString();
          const disconnectStatus =
            typeof peripheral?.status === 'number'
              ? peripheral.status
              : null;

          setDevices(current => {
            const updated = current.map(device =>
              device.nativeId === nativeId
                ? {
                    ...device,
                    status: 'saved',
                    disconnectedAt,
                    disconnectStatus,
                  }
                : device,
            );
            devicesRef.current = updated;
            return updated;
          });
        },

        onConnect: peripheral => {
          const nativeId = peripheral?.peripheral || peripheral?.id;
          if (!nativeId) return;

          setDevices(current => {
            const updated = current.map(device =>
              device.nativeId === nativeId
                ? {
                    ...device,
                    status: 'connected',
                    lastConnectedAt: new Date().toISOString(),
                    lastSeenAt: new Date().toISOString(),
                  }
                : device,
            );
            devicesRef.current = updated;
            return updated;
          });

          startBatteryKeepAlive(nativeId);
          void startHeartRateNotifications(nativeId);
        },
      });

      return () => {
        subscriptions.forEach(listener => {
          try {
            listener?.remove?.();
          } catch {
            // Listener cleanup is best effort.
          }
        });
      };
    };

    const cleanupPromise = setup();

    return () => {
      mounted = false;
      void cleanupPromise;
    };
  }, [initialize]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        void initialize();
        void loadDevices();
      }
    });

    return () => subscription.remove();
  }, [initialize, loadDevices]);

  useFocusEffect(
    useCallback(() => {
      void loadDevices();

      fadeAnim.setValue(0);
      slideAnim.setValue(16);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 320,
          useNativeDriver: true,
        }),
      ]).start();

      return undefined;
    }, [fadeAnim, slideAnim, loadDevices]),
  );

  useEffect(
    () => () => {
      fadeAnim.stopAnimation();
      slideAnim.stopAnimation();
      void stopBluetoothScan();

      batteryKeepAliveRef.current.forEach(timer => clearInterval(timer));
      batteryKeepAliveRef.current.clear();
      setLiveHeartRate(null);
    },
    [fadeAnim, slideAnim],
  );

  const ensureBluetoothOn = useCallback(async () => {
    if (Platform.OS !== 'android') return true;

    const state = await getBluetoothState();
    setBluetoothState(state);

    if (state === 'on') return true;

    try {
      await enableBluetooth();
      const nextState = await getBluetoothState();
      setBluetoothState(nextState);
      return nextState === 'on';
    } catch {
      return false;
    }
  }, []);

  const openScanner = useCallback(async () => {
    try {
      const ready = await ensureBluetoothOn();

      if (!ready) {
        showPopup?.(
          'Bluetooth is off',
          'Turn on Bluetooth and try again so CareSense can discover nearby health devices.',
          'warning',
        );
        return;
      }

      setDiscoveredDevices([]);
      setScanVisible(true);
      setScanning(true);

      await startBluetoothScan(10);
    } catch (error) {
      setScanning(false);
      setScanVisible(false);

      showPopup?.(
        'Bluetooth scan failed',
        error?.message ||
          'CareSense could not start a Bluetooth scan on this device.',
        'error',
      );
    }
  }, [ensureBluetoothOn, showPopup]);

  const closeScanner = useCallback(async () => {
    try {
      await stopBluetoothScan();
    } catch {
      // Best effort.
    } finally {
      setScanning(false);
      setScanVisible(false);
    }
  }, []);

  const closeNativeGattDiagnostics = useCallback(async () => {
    try {
      await stopNativeHeartRateNotifications();
    } catch {
      // Best effort.
    } finally {
      setNativeDiagnostic(null);
      setNativeDiagnosticError(null);
    }
  }, []);

  const openNativeGattDiagnostics = useCallback(
    async device => {
      if (!device?.nativeId) return;

      try {
        setNativeDiagnosticLoading(true);
        setNativeDiagnosticError(null);
        setNativeDiagnostic(null);

        const result = await runNativeGattDiagnostics(device.nativeId);

        setNativeDiagnostic(result);
      } catch (error) {
        setNativeDiagnosticError(
          error?.message ||
            'Native Android GATT diagnostics could not be completed.',
        );
      } finally {
        setNativeDiagnosticLoading(false);
      }
    },
    [],
  );

  const saveRealDevice = useCallback(
    async (peripheral, connection) => {
      const now = new Date().toISOString();
      const nativeId = connection?.nativeId || peripheral.id;
      const existing = devicesRef.current.find(
        device => device.nativeId === nativeId,
      );

      const nextDevice = {
        id: `ble-${nativeId}`,
        userId: uid,
        userEmail: user?.email || null,
        nativeId,
        name: connection?.name || peripheral.name || 'Bluetooth device',
        type: 'smartwatch',
        typeLabel: 'Smartwatch',
        connectionType: 'Bluetooth',
        status: 'connected',
        rssi:
          typeof connection?.rssi === 'number'
            ? connection.rssi
            : typeof peripheral.rssi === 'number'
              ? peripheral.rssi
              : null,
        serviceUUIDs: Array.isArray(connection?.serviceUUIDs)
          ? connection.serviceUUIDs
          : existing?.serviceUUIDs || [],
        characteristicUUIDs: Array.isArray(connection?.characteristicUUIDs)
          ? connection.characteristicUUIDs
          : existing?.characteristicUUIDs || [],
        serviceCount:
          connection?.serviceCount ?? existing?.serviceCount ?? 0,
        addedAt: existing?.addedAt || now,
        lastConnectedAt: now,
        lastSeenAt: now,
        batteryLevel:
          typeof connection?.batteryLevel === 'number'
            ? connection.batteryLevel
            : existing?.batteryLevel ?? null,
      };

      const updated = [
        nextDevice,
        ...devicesRef.current.filter(
          device => device.nativeId !== nativeId,
        ),
      ];

      await persistDevices(updated);
      setDevices(updated);
    },
    [persistDevices, uid, user?.email],
  );

  const connectToPeripheral = useCallback(
    async peripheral => {
      if (!peripheral?.id) return;

      try {
        setConnectingId(peripheral.id);

        await stopBluetoothScan();
        setScanning(false);

        const connection = await connectBluetoothDevice(peripheral.id, { autoConnect: false, bond: true });

        await saveRealDevice(peripheral, connection);
        await refreshConnectedState();
        startBatteryKeepAlive(peripheral.id);
        await startHeartRateNotifications(peripheral.id);

        setScanVisible(false);

        showPopup?.(
          'Device connected',
          `${connection?.name || peripheral.name || 'The device'} is now connected to your CareSense account on this device.`,
          'success',
        );
      } catch (error) {
        showPopup?.(
          'Unable to connect',
          error?.message ||
            'The device could not be connected. Make sure it is nearby and not exclusively connected to another app.',
          'error',
        );
      } finally {
        setConnectingId(null);
      }
    },
    [refreshConnectedState, saveRealDevice, showPopup],
  );

  const reconnectSavedDevice = useCallback(
    async device => {
      if (!device?.nativeId) return;

      try {
        setConnectingId(device.nativeId);

        const ready = await ensureBluetoothOn();
        if (!ready) {
          throw new Error('Bluetooth is turned off.');
        }

        const connection = await connectBluetoothDevice(device.nativeId, { autoConnect: false, bond: true });

        await saveRealDevice(
          {
            id: device.nativeId,
            name: device.name,
            rssi: device.rssi,
          },
          connection,
        );
        startBatteryKeepAlive(device.nativeId);
        await startHeartRateNotifications(device.nativeId);

        showPopup?.(
          'Device reconnected',
          `${device.name} is connected again.`,
          'success',
        );
      } catch (error) {
        showPopup?.(
          'Reconnect failed',
          error?.message ||
            'CareSense could not reconnect to this device. Try scanning again.',
          'error',
        );
      } finally {
        setConnectingId(null);
      }
    },
    [ensureBluetoothOn, saveRealDevice, showPopup],
  );

  const disconnectDevice = useCallback(
    device => {
      showPopup?.(
        'Disconnect device',
        `Disconnect ${device.name} from CareSense?`,
        'warning',
        async () => {
          try {
            await stopBatteryKeepAlive(device.nativeId);
            await stopHeartRateNotifications(device.nativeId);
            setLiveHeartRate(null);
            await disconnectBluetoothDevice(device.nativeId, false);

            const updated = devices.map(item =>
              item.id === device.id
                ? {
                    ...item,
                    status: 'saved',
                    disconnectedAt: new Date().toISOString(),
                  }
                : item,
            );

            await persistDevices(updated);
            setDevices(updated);

            showPopup?.(
              'Device disconnected',
              `${device.name} is no longer connected to CareSense.`,
              'success',
            );
          } catch (error) {
            showPopup?.(
              'Disconnect failed',
              error?.message || 'The device could not be disconnected.',
              'error',
            );
          }
        },
      );
    },
    [devices, persistDevices, showPopup],
  );

  const forgetDevice = useCallback(
    device => {
      showPopup?.(
        'Forget device',
        `Remove ${device.name} from this signed-in account?`,
        'warning',
        async () => {
          try {
            if (device.status === 'connected') {
              await stopBatteryKeepAlive(device.nativeId);
              await stopHeartRateNotifications(device.nativeId);
              setLiveHeartRate(null);
              await disconnectBluetoothDevice(device.nativeId, false).catch(() => {});
            }

            const updated = devices.filter(item => item.id !== device.id);
            await persistDevices(updated);
            setDevices(updated);

            showPopup?.(
              'Device forgotten',
              `${device.name} was removed from this account.`,
              'success',
            );
          } catch (error) {
            showPopup?.(
              'Unable to remove device',
              error?.message || 'The device could not be removed.',
              'error',
            );
          }
        },
      );
    },
    [devices, persistDevices, showPopup],
  );

  const openDeviceDetails = useCallback(device => {
    setSelectedDevice(device);
    setDetailsVisible(true);
  }, []);

  const closeDeviceDetails = useCallback(() => {
    setDetailsVisible(false);
    setSelectedDevice(null);
  }, []);

  const syncLabel = lastSyncedAt
    ? `Updated ${formatTime(lastSyncedAt)}`
    : 'No device sync yet';

  const bluetoothEnabled = bluetoothState === 'on';

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.safeArea, { backgroundColor: theme.background }]}
    >
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
            style={[
              styles.headerButton,
              {
                backgroundColor: theme.inputBg,
                borderColor: theme.border,
              },
            ]}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color={theme.textPrimary}
            />
          </TouchableOpacity>

          <View style={styles.headerCopy}>
            <Text style={[styles.eyebrow, { color: theme.accent }]}>
              CARE & SAFETY
            </Text>
            <Text style={[styles.title, { color: theme.textPrimary }]}>
              Connected devices
            </Text>
            <Text
              style={[styles.subtitle, { color: theme.textSecondary }]}
            >
              Connect a supported health device to your signed-in
              CareSense account.
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.accountCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View
            style={[styles.accountIcon, { backgroundColor: theme.inputBg }]}
          >
            <Ionicons
              name="person-circle-outline"
              size={25}
              color={theme.accent}
            />
          </View>

          <View style={styles.accountCopy}>
            <Text
              style={[styles.accountTitle, { color: theme.textPrimary }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {fullName || 'Signed-in account'}
            </Text>
            <Text
              style={[styles.accountSubtitle, { color: theme.textSecondary }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {user?.email || 'No email available'}
            </Text>
          </View>

          <View
            style={[
              styles.accountBadge,
              {
                backgroundColor: bluetoothEnabled
                  ? isDark
                    ? '#0E2E2C'
                    : '#E7FBF8'
                  : isDark
                    ? '#2A2020'
                    : '#FEF2F2',
              },
            ]}
          >
            <View
              style={[
                styles.accountBadgeDot,
                {
                  backgroundColor: bluetoothEnabled
                    ? theme.accent
                    : BRAND.danger,
                },
              ]}
            />
            <Text
              style={[
                styles.accountBadgeText,
                {
                  color: bluetoothEnabled
                    ? theme.accent
                    : BRAND.danger,
                },
              ]}
            >
              {bluetoothEnabled ? 'Bluetooth ready' : 'Bluetooth off'}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.liveCard,
            {
              backgroundColor: theme.inputBg,
              borderColor: theme.border,
            },
          ]}
        >
          <View
            style={[styles.liveIcon, { backgroundColor: theme.card }]}
          >
            <Ionicons
              name="bluetooth"
              size={27}
              color={theme.accent}
            />
          </View>

          <View style={styles.liveCopy}>
            <Text
              style={[styles.liveTitle, { color: theme.textPrimary }]}
            >
              Bluetooth device connection
            </Text>
            <Text
              style={[styles.liveText, { color: theme.textSecondary }]}
            >
              Connect a nearby health device and keep its Bluetooth
              connection linked to this signed-in CareSense account.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => void openScanner()}
          activeOpacity={0.84}
          style={[
            styles.scanButton,
            {
              backgroundColor: theme.accent,
              opacity: scanning ? 0.72 : 1,
            },
          ]}
          disabled={scanning}
        >
          {scanning ? (
            <ActivityIndicator color="#0A0F1A" />
          ) : (
            <Ionicons
              name="bluetooth"
              size={20}
              color="#0A0F1A"
            />
          )}
          <Text style={styles.scanButtonText}>
            {scanning ? 'Scanning nearby devices…' : 'Scan & connect device'}
          </Text>
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <View>
            <Text
              style={[
                styles.sectionTitle,
                { color: theme.textPrimary },
              ]}
            >
              Your devices
            </Text>
            <Text
              style={[
                styles.sectionSubtitle,
                { color: theme.textSecondary },
              ]}
            >
              {devices.length
                ? `${devices.length} device${devices.length === 1 ? '' : 's'} saved for this account`
                : 'No connected devices yet'}
            </Text>
          </View>

          <Text
            style={[styles.syncText, { color: theme.textSecondary }]}
          >
            {syncLabel}
          </Text>
        </View>

        {loading ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <ActivityIndicator size="small" color={theme.accent} />
            <Text
              style={[styles.emptyTitle, { color: theme.textPrimary }]}
            >
              Loading your devices…
            </Text>
          </View>
        ) : devices.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <View
              style={[
                styles.emptyIcon,
                { backgroundColor: theme.inputBg },
              ]}
            >
              <Ionicons
                name="bluetooth-outline"
                size={30}
                color={theme.textSecondary}
              />
            </View>

            <Text
              style={[styles.emptyTitle, { color: theme.textPrimary }]}
            >
              No connected devices
            </Text>

            <Text
              style={[styles.emptyText, { color: theme.textSecondary }]}
            >
              Tap “Scan & connect device” and select a real nearby BLE
              smartwatch or health device.
            </Text>
          </View>
        ) : (
          <View style={styles.deviceList}>
            {devices.map(device => {
              const isConnected = device.status === 'connected';
              const isConnecting = connectingId === device.nativeId;

              return (
                <View
                  key={device.id}
                  style={[
                    styles.deviceCard,
                    {
                      backgroundColor: theme.card,
                      borderColor: isConnected
                        ? theme.accent
                        : theme.border,
                    },
                  ]}
                >
                  <View style={styles.deviceMainRow}>
                  <View
                    style={[
                      styles.deviceIcon,
                      { backgroundColor: theme.inputBg },
                    ]}
                  >
                    <Ionicons
                      name="watch-outline"
                      size={25}
                      color={theme.accent}
                    />
                  </View>

                  <View style={styles.deviceInfo}>
                    <View style={styles.deviceTitleRow}>
                      <Text
                        style={[
                          styles.deviceName,
                          { color: theme.textPrimary },
                        ]}
                        numberOfLines={1}
                      >
                        {device.name}
                      </Text>

                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: isConnected
                              ? isDark
                                ? '#0E2E2C'
                                : '#E7FBF8'
                              : theme.inputBg,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.statusDot,
                            {
                              backgroundColor: isConnected
                                ? theme.accent
                                : theme.textSecondary,
                            },
                          ]}
                        />
                        <Text
                          style={[
                            styles.statusBadgeText,
                            {
                              color: isConnected
                                ? theme.accent
                                : theme.textSecondary,
                            },
                          ]}
                        >
                          {isConnected ? 'Connected' : 'Saved'}
                        </Text>
                      </View>
                    </View>

                    <Text
                      style={[
                        styles.deviceType,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {device.typeLabel || 'Smartwatch'}
                    </Text>

                    <Text
                      style={[
                        styles.deviceMeta,
                        { color: theme.textSecondary },
                      ]}
                      numberOfLines={1}
                    >
                      {typeof device.rssi === 'number'
                        ? `Bluetooth • ${device.rssi} dBm`
                        : 'Bluetooth'}
                    </Text>

                    {device.status === 'connected' &&
                    typeof liveHeartRate === 'number' ? (
                      <Text
                        style={[
                          styles.deviceMeta,
                          { color: theme.accent },
                        ]}
                        numberOfLines={1}
                      >
                        Heart rate {liveHeartRate} BPM
                      </Text>
                    ) : null}

                    {typeof device.batteryLevel === 'number' ? (
                      <Text
                        style={[
                          styles.deviceMeta,
                          { color: theme.textSecondary },
                        ]}
                        numberOfLines={1}
                      >
                        Battery {device.batteryLevel}%
                      </Text>
                    ) : null}

                    <Text
                      style={[
                        styles.deviceMeta,
                        { color: theme.textSecondary },
                      ]}
                      numberOfLines={1}
                    >
                      {device.serviceCount || 0} service
                      {device.serviceCount === 1 ? '' : 's'}
                      {device.lastConnectedAt
                        ? ` • Connected ${formatTime(device.lastConnectedAt)}`
                        : ''}
                    </Text>

                    {device.status !== 'connected' && device.disconnectedAt ? (
                      <View style={styles.disconnectInfoRow}>
                        <View
                          style={[
                            styles.disconnectInfoDot,
                            { backgroundColor: BRAND.danger },
                          ]}
                        />
                        <Text
                          style={[
                            styles.disconnectInfoText,
                            { color: BRAND.danger },
                          ]}
                          numberOfLines={1}
                        >
                          {formatDisconnectStatus(device.disconnectStatus)}
                          {' • '}
                          {formatTime(device.disconnectedAt)}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  </View>

                  <View style={styles.deviceActions}>
                    <TouchableOpacity
                      onPress={() => void openNativeGattDiagnostics(device)}
                      activeOpacity={0.8}
                      style={[
                        styles.nativeDiagnosticButton,
                        {
                          backgroundColor: isDark ? '#151F2C' : '#F4F7FA',
                          borderColor: theme.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name="hardware-chip-outline"
                        size={16}
                        color={theme.textPrimary}
                      />
                      <Text
                        style={[
                          styles.nativeDiagnosticButtonText,
                          { color: theme.textPrimary },
                        ]}
                      >
                        Native
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => openDeviceDetails(device)}
                      activeOpacity={0.8}
                      style={[
                        styles.detailsButton,
                        {
                          backgroundColor: isDark ? '#10282D' : '#ECFEFF',
                          borderColor: isDark
                            ? 'rgba(0,212,197,0.24)'
                            : '#B7F4F0',
                        },
                      ]}
                    >
                      <Ionicons
                        name="information-circle-outline"
                        size={17}
                        color={theme.accent}
                      />
                      <Text
                        style={[
                          styles.detailsButtonText,
                          { color: theme.accent },
                        ]}
                      >
                        Details
                      </Text>
                    </TouchableOpacity>

                    {isConnected ? (
                      <TouchableOpacity
                        onPress={() => disconnectDevice(device)}
                        activeOpacity={0.8}
                        style={[
                          styles.secondaryAction,
                          {
                            backgroundColor: theme.inputBg,
                            borderColor: theme.border,
                          },
                        ]}
                      >
                        <Ionicons
                          name="bluetooth-outline"
                          size={17}
                          color={theme.textPrimary}
                        />
                        <Text
                          style={[
                            styles.secondaryActionText,
                            { color: theme.textPrimary },
                          ]}
                        >
                          Disconnect
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        onPress={() => void reconnectSavedDevice(device)}
                        disabled={isConnecting}
                        activeOpacity={0.8}
                        style={[
                          styles.secondaryAction,
                          {
                            backgroundColor: theme.inputBg,
                            borderColor: theme.border,
                            opacity: isConnecting ? 0.65 : 1,
                          },
                        ]}
                      >
                        {isConnecting ? (
                          <ActivityIndicator size="small" color={theme.accent} />
                        ) : (
                          <Ionicons
                            name="refresh-outline"
                            size={17}
                            color={theme.accent}
                          />
                        )}
                        <Text
                          style={[
                            styles.secondaryActionText,
                            { color: theme.accent },
                          ]}
                        >
                          {isConnecting ? 'Connecting' : 'Reconnect'}
                        </Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      onPress={() => forgetDevice(device)}
                      activeOpacity={0.8}
                      style={[
                        styles.forgetButton,
                        {
                          backgroundColor: isDark
                            ? 'rgba(239,68,68,0.10)'
                            : '#FEF2F2',
                        },
                      ]}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={17}
                        color={BRAND.danger}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View
          style={[
            styles.note,
            {
              backgroundColor: theme.inputBg,
              borderColor: theme.border,
            },
          ]}
        >
          <Ionicons
            name="information-circle-outline"
            size={19}
            color={theme.accent}
          />
          <Text
            style={[styles.noteText, { color: theme.textSecondary }]}
          >
            This device is linked to your signed-in CareSense account. If the
            Bluetooth link drops, CareSense will keep it saved and let you
            reconnect manually rather than repeatedly reconnecting in the
            background.
          </Text>
        </View>
      </Animated.ScrollView>

      <Modal
        visible={scanVisible}
        transparent
        animationType="fade"
        onRequestClose={() => void closeScanner()}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.scanModalCard,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.modalTitle,
                    { color: theme.textPrimary },
                  ]}
                >
                  Nearby Bluetooth devices
                </Text>
                <Text
                  style={[
                    styles.modalSubtitle,
                    { color: theme.textSecondary },
                  ]}
                >
                  Keep the health device nearby and awake while it is
                  discoverable.
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => void closeScanner()}
                style={[
                  styles.closeButton,
                  { backgroundColor: theme.inputBg },
                ]}
              >
                <Ionicons
                  name="close"
                  size={19}
                  color={theme.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {scanning && (
              <View
                style={[
                  styles.scanningBanner,
                  {
                    backgroundColor: isDark ? '#0E2E2C' : '#E7FBF8',
                  },
                ]}
              >
                <ActivityIndicator size="small" color={theme.accent} />
                <Text
                  style={[
                    styles.scanningText,
                    { color: theme.accent },
                  ]}
                >
                  Scanning for nearby BLE devices…
                </Text>
              </View>
            )}

            <ScrollView
              style={styles.discoveryList}
              contentContainerStyle={
                discoveredDevices.length === 0
                  ? styles.discoveryEmptyContent
                  : styles.discoveryContent
              }
              showsVerticalScrollIndicator={false}
            >
              {discoveredDevices.length === 0 ? (
                <>
                  <View
                    style={[
                      styles.discoveryEmptyIcon,
                      { backgroundColor: theme.inputBg },
                    ]}
                  >
                    <Ionicons
                      name="bluetooth-outline"
                      size={30}
                      color={theme.textSecondary}
                    />
                  </View>

                  <Text
                    style={[
                      styles.emptyTitle,
                      { color: theme.textPrimary },
                    ]}
                  >
                    {scanning
                      ? 'Looking for devices…'
                      : 'No devices discovered'}
                  </Text>

                  <Text
                    style={[
                      styles.emptyText,
                      { color: theme.textSecondary },
                    ]}
                  >
                    A device must advertise Bluetooth before
                    CareSense can connect to it.
                  </Text>
                </>
              ) : (
                discoveredDevices.map(device => {
                  const alreadySaved = devices.some(
                    item => item.nativeId === device.id,
                  );
                  const isConnecting = connectingId === device.id;

                  return (
                    <View
                      key={device.id}
                      style={[
                        styles.discoveredCard,
                        {
                          backgroundColor: theme.inputBg,
                          borderColor: theme.border,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.discoveryIcon,
                          { backgroundColor: theme.card },
                        ]}
                      >
                        <Ionicons
                          name="watch-outline"
                          size={23}
                          color={theme.accent}
                        />
                      </View>

                      <View style={styles.discoveryInfo}>
                        <Text
                          style={[
                            styles.discoveryName,
                            { color: theme.textPrimary },
                          ]}
                          numberOfLines={1}
                        >
                          {device.name}
                        </Text>
                        <Text
                          style={[
                            styles.deviceMeta,
                            { color: theme.textSecondary },
                          ]}
                          numberOfLines={1}
                        >
                          {device.id}
                        </Text>
                        <Text
                          style={[
                            styles.deviceMeta,
                            { color: theme.textSecondary },
                          ]}
                        >
                          {typeof device.rssi === 'number'
                            ? `${device.rssi} dBm`
                            : 'Signal unavailable'}
                          {device.isConnectable === false
                            ? ' • Not connectable'
                            : ''}
                        </Text>
                      </View>

                      <TouchableOpacity
                        disabled={isConnecting || device.isConnectable === false}
                        onPress={() => void connectToPeripheral(device)}
                        activeOpacity={0.82}
                        style={[
                          styles.connectButton,
                          {
                            backgroundColor: theme.accent,
                            opacity:
                              isConnecting || device.isConnectable === false
                                ? 0.55
                                : 1,
                          },
                        ]}
                      >
                        {isConnecting ? (
                          <ActivityIndicator
                            size="small"
                            color="#0A0F1A"
                          />
                        ) : (
                          <Ionicons
                            name={
                              alreadySaved
                                ? 'refresh-outline'
                                : 'bluetooth'
                            }
                            size={17}
                            color="#0A0F1A"
                          />
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </ScrollView>

            <View style={styles.scanFooter}>
              <TouchableOpacity
                onPress={() => void closeScanner()}
                activeOpacity={0.82}
                style={[
                  styles.modalFooterButton,
                  {
                    backgroundColor: theme.inputBg,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.modalFooterButtonText,
                    { color: theme.textPrimary },
                  ]}
                >
                  Close
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={detailsVisible}
        transparent
        animationType="fade"
        onRequestClose={closeDeviceDetails}
      >
        <View style={styles.detailsOverlay}>
          <View
            style={[
              styles.detailsModalCard,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.modalTitle,
                    { color: theme.textPrimary },
                  ]}
                >
                  Device details
                </Text>
                <Text
                  style={[
                    styles.modalSubtitle,
                    { color: theme.textSecondary },
                  ]}
                >
                  Real Bluetooth and GATT information discovered from the
                  connected device.
                </Text>
              </View>

              <TouchableOpacity
                onPress={closeDeviceDetails}
                style={[
                  styles.closeButton,
                  { backgroundColor: theme.inputBg },
                ]}
              >
                <Ionicons
                  name="close"
                  size={19}
                  color={theme.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.detailsContent}
            >
              {selectedDevice ? (
                <>
                  <View
                    style={[
                      styles.detailsHero,
                      {
                        backgroundColor: theme.inputBg,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.detailsHeroIcon,
                        { backgroundColor: theme.card },
                      ]}
                    >
                      <Ionicons
                        name="bluetooth"
                        size={28}
                        color={theme.accent}
                      />
                    </View>

                    <View style={styles.detailsHeroCopy}>
                      <Text
                        style={[
                          styles.detailsHeroTitle,
                          { color: theme.textPrimary },
                        ]}
                        numberOfLines={2}
                      >
                        {selectedDevice.name || 'Bluetooth device'}
                      </Text>

                      <View style={styles.detailsStatusRow}>
                        <View
                          style={[
                            styles.statusDot,
                            {
                              backgroundColor:
                                selectedDevice.status === 'connected'
                                  ? theme.accent
                                  : theme.textSecondary,
                            },
                          ]}
                        />
                        <Text
                          style={[
                            styles.detailsStatusText,
                            {
                              color:
                                selectedDevice.status === 'connected'
                                  ? theme.accent
                                  : theme.textSecondary,
                            },
                          ]}
                        >
                          {selectedDevice.status === 'connected'
                            ? 'Connected now'
                            : 'Saved device'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.detailGrid}>
                    <View
                      style={[
                        styles.detailStat,
                        {
                          backgroundColor: theme.inputBg,
                          borderColor: theme.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.detailStatLabel,
                          { color: theme.textSecondary },
                        ]}
                      >
                        Signal
                      </Text>
                      <Text
                        style={[
                          styles.detailStatValue,
                          { color: theme.textPrimary },
                        ]}
                      >
                        {typeof selectedDevice.rssi === 'number'
                          ? `${selectedDevice.rssi} dBm`
                          : 'Unavailable'}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.detailStat,
                        {
                          backgroundColor: theme.inputBg,
                          borderColor: theme.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.detailStatLabel,
                          { color: theme.textSecondary },
                        ]}
                      >
                        GATT services
                      </Text>
                      <Text
                        style={[
                          styles.detailStatValue,
                          { color: theme.textPrimary },
                        ]}
                      >
                        {selectedDevice.serviceCount || 0}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.detailStat,
                        {
                          backgroundColor: theme.inputBg,
                          borderColor: theme.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.detailStatLabel,
                          { color: theme.textSecondary },
                        ]}
                      >
                        Characteristics
                      </Text>
                      <Text
                        style={[
                          styles.detailStatValue,
                          { color: theme.textPrimary },
                        ]}
                      >
                        {Array.isArray(selectedDevice.characteristicUUIDs)
                          ? selectedDevice.characteristicUUIDs.length
                          : 0}
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={[
                      styles.detailsSectionTitle,
                      { color: theme.textPrimary },
                    ]}
                  >
                    Bluetooth identifier
                  </Text>

                  <View
                    style={[
                      styles.detailBlock,
                      {
                        backgroundColor: theme.inputBg,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name="finger-print-outline"
                      size={18}
                      color={theme.accent}
                    />
                    <Text
                      style={[
                        styles.detailBlockValue,
                        { color: theme.textPrimary },
                      ]}
                      selectable
                    >
                      {selectedDevice.nativeId || 'Unavailable'}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.detailsSectionTitle,
                      { color: theme.textPrimary },
                    ]}
                  >
                    GATT services
                  </Text>

                  {Array.isArray(selectedDevice.serviceUUIDs) &&
                  selectedDevice.serviceUUIDs.length > 0 ? (
                    <View style={styles.uuidList}>
                      {selectedDevice.serviceUUIDs.map((uuid, index) => (
                        <View
                          key={`service-${uuid}-${index}`}
                          style={[
                            styles.uuidRow,
                            {
                              backgroundColor: theme.inputBg,
                              borderColor: theme.border,
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.uuidIndex,
                              { backgroundColor: theme.card },
                            ]}
                          >
                            <Text
                              style={[
                                styles.uuidIndexText,
                                { color: theme.accent },
                              ]}
                            >
                              {index + 1}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.uuidText,
                              { color: theme.textPrimary },
                            ]}
                            selectable
                          >
                            {String(uuid)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text
                      style={[
                        styles.noDataText,
                        { color: theme.textSecondary },
                      ]}
                    >
                      No GATT service identifiers were saved from this
                      connection.
                    </Text>
                  )}

                  <Text
                    style={[
                      styles.detailsSectionTitle,
                      { color: theme.textPrimary },
                    ]}
                  >
                    Characteristics
                  </Text>

                  {Array.isArray(selectedDevice.characteristicUUIDs) &&
                  selectedDevice.characteristicUUIDs.length > 0 ? (
                    <View style={styles.uuidList}>
                      {selectedDevice.characteristicUUIDs.map(
                        (uuid, index) => (
                          <View
                            key={`characteristic-${uuid}-${index}`}
                            style={[
                              styles.uuidRow,
                              {
                                backgroundColor: theme.inputBg,
                                borderColor: theme.border,
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.uuidIndex,
                                { backgroundColor: theme.card },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.uuidIndexText,
                                  { color: theme.accent },
                                ]}
                              >
                                {index + 1}
                              </Text>
                            </View>
                            <Text
                              style={[
                                styles.uuidText,
                                { color: theme.textPrimary },
                              ]}
                              selectable
                            >
                              {String(uuid)}
                            </Text>
                          </View>
                        ),
                      )}
                    </View>
                  ) : (
                    <Text
                      style={[
                        styles.noDataText,
                        { color: theme.textSecondary },
                      ]}
                    >
                      No characteristic identifiers were returned by the
                      device during service discovery.
                    </Text>
                  )}

                  <View
                    style={[
                      styles.detailsNote,
                      {
                        backgroundColor: isDark ? '#10282D' : '#ECFEFF',
                        borderColor: isDark
                          ? 'rgba(0,212,197,0.24)'
                          : '#B7F4F0',
                      },
                    ]}
                  >
                    <Ionicons
                      name="information-circle-outline"
                      size={18}
                      color={theme.accent}
                    />
                    <Text
                      style={[
                        styles.detailsNoteText,
                        { color: theme.textSecondary },
                      ]}
                    >
                      These UUIDs are the actual Bluetooth GATT identifiers
                      discovered from this device. We will use them to
                      identify readable or notification-based health data in
                      the next step.
                    </Text>
                  </View>
                </>
              ) : (
                <Text
                  style={[
                    styles.noDataText,
                    { color: theme.textSecondary },
                  ]}
                >
                  No device selected.
                </Text>
              )}
            </ScrollView>

            <TouchableOpacity
              onPress={closeDeviceDetails}
              activeOpacity={0.82}
              style={[
                styles.modalFooterButton,
                {
                  backgroundColor: theme.accent,
                },
              ]}
            >
              <Text
                style={[
                  styles.modalFooterButtonText,
                  { color: '#0A0F1A' },
                ]}
              >
                Done
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(nativeDiagnostic || nativeDiagnosticLoading || nativeDiagnosticError)}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!nativeDiagnosticLoading) {
            void closeNativeGattDiagnostics();
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.nativeDiagnosticModal,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.modalTitle, { color: theme.textPrimary }]}
                >
                  Native Android GATT
                </Text>
                <Text
                  style={[styles.modalSubtitle, { color: theme.textSecondary }]}
                >
                  Direct Android BluetoothGatt inspection plus a native Heart Rate
                  notification test. The native HR session stays open until Done.
                </Text>
              </View>

              {!nativeDiagnosticLoading ? (
                <TouchableOpacity
                  onPress={() => {
                    void closeNativeGattDiagnostics();
                  }}
                  style={[
                    styles.closeButton,
                    { backgroundColor: theme.inputBg },
                  ]}
                >
                  <Ionicons
                    name="close"
                    size={19}
                    color={theme.textSecondary}
                  />
                </TouchableOpacity>
              ) : null}
            </View>

            {nativeDiagnosticLoading ? (
              <View style={styles.nativeDiagnosticLoading}>
                <ActivityIndicator size="large" color={theme.accent} />
                <Text
                  style={[
                    styles.nativeDiagnosticLoadingTitle,
                    { color: theme.textPrimary },
                  ]}
                >
                  Inspecting native GATT…
                </Text>
                <Text
                  style={[
                    styles.nativeDiagnosticLoadingText,
                    { color: theme.textSecondary },
                  ]}
                >
                  Android is opening a native GATT connection, discovering its
                  real services, and testing Heart Rate CCCD 0x2902 directly.
                </Text>
              </View>
            ) : nativeDiagnosticError ? (
              <View style={styles.nativeDiagnosticErrorBox}>
                <Ionicons
                  name="alert-circle-outline"
                  size={32}
                  color={BRAND.danger}
                />
                <Text
                  style={[
                    styles.nativeDiagnosticErrorTitle,
                    { color: theme.textPrimary },
                  ]}
                >
                  Diagnostic failed
                </Text>
                <Text
                  style={[
                    styles.nativeDiagnosticErrorText,
                    { color: BRAND.danger },
                  ]}
                >
                  {nativeDiagnosticError}
                </Text>
              </View>
            ) : nativeDiagnostic ? (
              <ScrollView
                style={styles.nativeDiagnosticScroll}
                contentContainerStyle={styles.nativeDiagnosticContent}
                showsVerticalScrollIndicator={false}
              >
                <View
                  style={[
                    styles.nativeSummaryCard,
                    {
                      backgroundColor: theme.inputBg,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.nativeSummaryTitle,
                      { color: theme.textPrimary },
                    ]}
                  >
                    Connection result
                  </Text>

                  <Text
                    style={[
                      styles.nativeSummaryValue,
                      { color: nativeDiagnostic.connected ? theme.accent : BRAND.danger },
                    ]}
                  >
                    {nativeDiagnostic.connected ? 'Connected during inspection' : 'Disconnected'}
                  </Text>

                  {typeof nativeDiagnostic.disconnectStatus === 'number' ? (
                    <Text
                      style={[
                        styles.nativeSummaryMeta,
                        { color: theme.textSecondary },
                      ]}
                    >
                      Disconnect status {nativeDiagnostic.disconnectStatus}
                      {nativeDiagnostic.disconnectStatusHex
                        ? ` (${nativeDiagnostic.disconnectStatusHex})`
                        : ''}
                      {nativeDiagnostic.disconnectStatusName
                        ? ` • ${nativeDiagnostic.disconnectStatusName}`
                        : ''}
                    </Text>
                  ) : null}

                  {typeof nativeDiagnostic.serviceDiscoveryStatus === 'number' ? (
                    <Text
                      style={[
                        styles.nativeSummaryMeta,
                        { color: theme.textSecondary },
                      ]}
                    >
                      Service discovery: {nativeDiagnostic.serviceDiscoveryStatus}
                      {nativeDiagnostic.serviceDiscoveryStatusName
                        ? ` • ${nativeDiagnostic.serviceDiscoveryStatusName}`
                        : ''}
                    </Text>
                  ) : null}
                </View>

                {nativeDiagnostic.heartRateNotification ? (
                  <View
                    style={[
                      styles.nativeSummaryCard,
                      {
                        backgroundColor: theme.inputBg,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.nativeSummaryTitle,
                        { color: theme.textPrimary },
                      ]}
                    >
                      Native Heart Rate notification
                    </Text>

                    <Text
                      style={[
                        styles.nativeSummaryValue,
                        {
                          color: nativeDiagnostic.heartRateNotification.success
                            ? theme.accent
                            : BRAND.danger,
                        },
                      ]}
                    >
                      {nativeDiagnostic.heartRateNotification.success
                        ? 'CCCD write succeeded'
                        : 'Notification setup failed'}
                    </Text>

                    {nativeDiagnostic.heartRateNotification.success ? (
                      <Text
                        style={[
                          styles.nativeSummaryMeta,
                          { color: theme.textSecondary },
                        ]}
                        selectable
                      >
                        180D • 2A37 • 2902
                        {typeof nativeDiagnostic.heartRateNotification.characteristicInstanceId === 'number'
                          ? ` • characteristic instance ${nativeDiagnostic.heartRateNotification.characteristicInstanceId}`
                          : ''}
                        {nativeDiagnostic.heartRateNotification.usedNotifications
                          ? ' • NOTIFY enabled'
                          : nativeDiagnostic.heartRateNotification.usedIndications
                            ? ' • INDICATE enabled'
                            : ''}
                      </Text>
                    ) : null}

                    {nativeDiagnostic.heartRateNotification.error ? (
                      <Text
                        style={[
                          styles.nativeSummaryMeta,
                          { color: BRAND.danger },
                        ]}
                      >
                        {nativeDiagnostic.heartRateNotification.error}
                      </Text>
                    ) : null}
                  </View>
                ) : null}

                {(nativeDiagnostic.services || []).map((serviceItem, index) => (
                  <View
                    key={`${serviceItem.uuid}-${serviceItem.instanceId}-${index}`}
                    style={[
                      styles.nativeServiceCard,
                      {
                        backgroundColor: theme.inputBg,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <View style={styles.nativeServiceHeader}>
                      <View
                        style={[
                          styles.uuidIndex,
                          { backgroundColor: theme.card },
                        ]}
                      >
                        <Text
                          style={[
                            styles.uuidIndexText,
                            { color: theme.accent },
                          ]}
                        >
                          {index + 1}
                        </Text>
                      </View>

                      <View style={styles.nativeServiceCopy}>
                        <Text
                          style={[
                            styles.uuidText,
                            { color: theme.textPrimary },
                          ]}
                          selectable
                        >
                          {serviceItem.uuid}
                        </Text>
                        <Text
                          style={[
                            styles.nativeSummaryMeta,
                            { color: theme.textSecondary },
                          ]}
                        >
                          {serviceItem.type || 'unknown'} service
                          {typeof serviceItem.instanceId === 'number' &&
                          serviceItem.instanceId >= 0
                            ? ` • instance ${serviceItem.instanceId}`
                            : ''}
                        </Text>
                      </View>
                    </View>

                    {(serviceItem.characteristics || []).map(
                      (characteristic, charIndex) => (
                        <View
                          key={`${characteristic.uuid}-${characteristic.instanceId}-${charIndex}`}
                          style={[
                            styles.nativeCharacteristicCard,
                            { backgroundColor: theme.card },
                          ]}
                        >
                          <Text
                            style={[
                              styles.uuidText,
                              { color: theme.textPrimary },
                            ]}
                            selectable
                          >
                            {characteristic.uuid}
                          </Text>

                          <Text
                            style={[
                              styles.capabilityProperties,
                              { color: theme.accent },
                            ]}
                          >
                            {characteristic.properties || 'NONE'}
                          </Text>

                          {Array.isArray(characteristic.descriptors) &&
                          characteristic.descriptors.length > 0 ? (
                            <Text
                              style={[
                                styles.capabilityDescriptors,
                                { color: theme.textSecondary },
                              ]}
                              selectable
                            >
                              Descriptors:{' '}
                              {characteristic.descriptors
                                .map(item => item.uuid)
                                .join(' • ')}
                            </Text>
                          ) : (
                            <Text
                              style={[
                                styles.capabilityDescriptors,
                                { color: theme.textSecondary },
                              ]}
                            >
                              No descriptors
                            </Text>
                          )}

                          {typeof characteristic.instanceId === 'number' &&
                          characteristic.instanceId >= 0 ? (
                            <Text
                              style={[
                                styles.capabilityDescriptors,
                                { color: theme.textSecondary },
                              ]}
                            >
                              Instance {characteristic.instanceId}
                            </Text>
                          ) : null}
                        </View>
                      ),
                    )}
                  </View>
                ))}
              </ScrollView>
            ) : null}

            {!nativeDiagnosticLoading ? (
              <TouchableOpacity
                onPress={() => {
                  void closeNativeGattDiagnostics();
                }}
                activeOpacity={0.84}
                style={[
                  styles.scanButton,
                  { backgroundColor: theme.accent, marginTop: 10 },
                ]}
              >
                <Text style={styles.scanButtonText}>Done</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 132,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 18,
  },

  headerButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  headerCopy: { flex: 1 },

  eyebrow: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 5,
  },

  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    letterSpacing: -0.6,
  },

  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
  },

  accountCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  accountIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  accountCopy: {
    flex: 1,
    minWidth: 0,
    marginLeft: 11,
    paddingRight: 7,
  },

  accountTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
  },

  accountSubtitle: {
    fontSize: 10.8,
    lineHeight: 15,
    marginTop: 3,
  },

  accountBadge: {
    maxWidth: 122,
    minHeight: 32,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },

  accountBadgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 5,
  },

  accountBadgeText: {
    fontSize: 8.8,
    lineHeight: 11,
    fontWeight: '800',
    flexShrink: 1,
  },

  liveCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  liveIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  liveCopy: {
    flex: 1,
    marginLeft: 12,
  },

  liveTitle: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '800',
  },

  liveText: {
    fontSize: 11.6,
    lineHeight: 17,
    marginTop: 3,
  },

  scanButton: {
    minHeight: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    marginBottom: 22,
  },

  scanButtonText: {
    color: '#0A0F1A',
    fontSize: 14.2,
    fontWeight: '800',
    marginLeft: 8,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '800',
  },

  sectionSubtitle: {
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 2,
  },

  syncText: {
    fontSize: 9.5,
    lineHeight: 13,
    fontWeight: '700',
    textAlign: 'right',
  },

  emptyCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
  },

  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  emptyTitle: {
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '800',
    textAlign: 'center',
  },

  emptyText: {
    fontSize: 12.2,
    lineHeight: 18,
    marginTop: 6,
    textAlign: 'center',
    maxWidth: 320,
  },

  deviceList: {
    gap: 10,
  },

  deviceCard: {
    minHeight: 158,
    borderWidth: 1,
    borderRadius: 18,
    padding: 13,
  },

  deviceIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  deviceMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  deviceInfo: {
    flex: 1,
    minWidth: 0,
    marginLeft: 12,
  },

  deviceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  deviceName: {
    flex: 1,
    minWidth: 0,
    fontSize: 14.5,
    lineHeight: 18,
    fontWeight: '800',
  },

  deviceType: {
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 3,
  },

  deviceMeta: {
    fontSize: 10.2,
    lineHeight: 15,
    marginTop: 2,
  },

  disconnectInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    minWidth: 0,
  },

  disconnectInfoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },

  disconnectInfoText: {
    flex: 1,
    minWidth: 0,
    fontSize: 9.8,
    lineHeight: 14,
    fontWeight: '700',
  },

  statusBadge: {
    marginLeft: 8,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },

  statusBadgeText: {
    fontSize: 8.6,
    lineHeight: 10,
    fontWeight: '800',
  },

  deviceActions: {
    width: '100%',
    marginTop: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  secondaryAction: {
    flex: 1,
    minHeight: 38,
    borderRadius: 11,
    borderWidth: 1,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  secondaryActionText: {
    fontSize: 10.2,
    fontWeight: '800',
    marginLeft: 5,
  },

  forgetButton: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  note: {
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 17,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  noteText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    marginLeft: 9,
  },

  nativeDiagnosticModal: {
    width: '100%',
    maxHeight: '90%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
  },

  nativeDiagnosticScroll: {
    maxHeight: 520,
  },

  nativeDiagnosticContent: {
    paddingBottom: 4,
  },

  nativeDiagnosticLoading: {
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },

  nativeDiagnosticLoadingTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 13,
  },

  nativeDiagnosticLoadingText: {
    fontSize: 11.7,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 290,
  },

  nativeDiagnosticErrorBox: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },

  nativeDiagnosticErrorTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginTop: 11,
  },

  nativeDiagnosticErrorText: {
    fontSize: 11.5,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 6,
  },

  nativeSummaryCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 9,
  },

  nativeSummaryTitle: {
    fontSize: 12,
    fontWeight: '800',
  },

  nativeSummaryValue: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
  },

  nativeSummaryMeta: {
    fontSize: 9.5,
    lineHeight: 14,
    marginTop: 3,
  },

  nativeServiceCard: {
    borderWidth: 1,
    borderRadius: 15,
    padding: 10,
    marginBottom: 7,
  },

  nativeServiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  nativeServiceCopy: {
    flex: 1,
    minWidth: 0,
    marginLeft: 8,
  },

  nativeCharacteristicCard: {
    borderRadius: 12,
    padding: 9,
    marginTop: 7,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.58)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 28,
  },

  scanModalCard: {
    width: '100%',
    maxHeight: '88%',
    borderRadius: 25,
    borderWidth: 1,
    padding: 18,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },

  modalTitle: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '800',
  },

  modalSubtitle: {
    fontSize: 12.3,
    lineHeight: 18,
    marginTop: 3,
  },

  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },

  scanningBanner: {
    borderRadius: 13,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  scanningText: {
    marginLeft: 8,
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '800',
  },

  discoveryList: {
    maxHeight: 430,
  },

  discoveryContent: {
    paddingBottom: 8,
  },

  discoveryEmptyContent: {
    minHeight: 250,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },

  discoveryEmptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  discoveredCard: {
    minHeight: 78,
    borderWidth: 1,
    borderRadius: 16,
    padding: 11,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  discoveryIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  discoveryInfo: {
    flex: 1,
    minWidth: 0,
    marginLeft: 10,
    paddingRight: 8,
  },

  discoveryName: {
    fontSize: 13.5,
    lineHeight: 17,
    fontWeight: '800',
  },

  connectButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scanFooter: {
    marginTop: 12,
  },

  modalFooterButton: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalFooterButtonText: {
    fontSize: 13,
    fontWeight: '800',
  },

  nativeDiagnosticButton: {
    minWidth: 68,
    minHeight: 38,
    borderRadius: 11,
    borderWidth: 1,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  nativeDiagnosticButtonText: {
    fontSize: 9.8,
    fontWeight: '800',
    marginLeft: 4,
  },

  detailsButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: 11,
    borderWidth: 1,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  detailsButtonText: {
    fontSize: 10.2,
    fontWeight: '800',
    marginLeft: 5,
  },

  detailsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.58)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 24,
  },

  detailsModalCard: {
    width: '100%',
    maxHeight: '92%',
    borderRadius: 26,
    borderWidth: 1,
    padding: 18,
  },

  detailsContent: {
    paddingBottom: 14,
  },

  detailsHero: {
    borderWidth: 1,
    borderRadius: 19,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },

  detailsHeroIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  detailsHeroCopy: {
    flex: 1,
    marginLeft: 12,
  },

  detailsHeroTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
  },

  detailsStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },

  detailsStatusText: {
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: '800',
  },

  detailGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },

  detailStat: {
    flex: 1,
    minHeight: 70,
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 10,
    justifyContent: 'space-between',
  },

  detailStatLabel: {
    fontSize: 9.5,
    lineHeight: 13,
    fontWeight: '700',
  },

  detailStatValue: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '800',
    marginTop: 6,
  },

  detailsSectionTitle: {
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: '800',
    marginTop: 18,
    marginBottom: 8,
  },

  detailBlock: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  detailBlockValue: {
    flex: 1,
    marginLeft: 9,
    fontSize: 11.2,
    lineHeight: 16,
    fontWeight: '700',
  },

  uuidList: {
    gap: 7,
  },

  uuidRow: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 8,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },

  uuidIndex: {
    width: 26,
    height: 26,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  uuidIndexText: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '800',
  },

  uuidText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 10.2,
    lineHeight: 14,
    fontWeight: '700',
  },

  noDataText: {
    fontSize: 11.5,
    lineHeight: 17,
  },

  detailsNote: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 15,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  detailsNoteText: {
    flex: 1,
    fontSize: 10.8,
    lineHeight: 16,
    marginLeft: 8,
  },
});
