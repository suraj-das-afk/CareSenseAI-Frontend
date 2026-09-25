import { NativeModules, PermissionsAndroid, Platform } from 'react-native';
import BleManager from 'react-native-ble-manager';


let startPromise = null;

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function requestBluetoothPermissions() {
  if (Platform.OS !== 'android') {
    return true;
  }

  const permissions = [];

  if (Platform.Version >= 31) {
    permissions.push(
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    );
  } else if (Platform.Version >= 23) {
    permissions.push(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
  }

  if (!permissions.length) {
    return true;
  }

  const result = await PermissionsAndroid.requestMultiple(permissions);

  return permissions.every(
    permission =>
      result[permission] === PermissionsAndroid.RESULTS.GRANTED,
  );
}

export async function initializeBluetooth() {
  if (!startPromise) {
    startPromise = BleManager.start({ showAlert: false }).catch(error => {
      startPromise = null;
      throw error;
    });
  }

  await startPromise;
  return true;
}

export async function getBluetoothState() {
  await initializeBluetooth();
  return BleManager.checkState();
}

export async function enableBluetooth() {
  await initializeBluetooth();

  if (Platform.OS === 'android') {
    return BleManager.enableBluetooth();
  }

  return true;
}

export async function startBluetoothScan(seconds = 10) {
  const permitted = await requestBluetoothPermissions();

  if (!permitted) {
    throw new Error(
      'Bluetooth permission was not granted. Allow Bluetooth access and try again.',
    );
  }

  await initializeBluetooth();

  return BleManager.scan({
    serviceUUIDs: [],
    seconds,
    allowDuplicates: false,
  });
}

export async function stopBluetoothScan() {
  try {
    await initializeBluetooth();
    return await BleManager.stopScan();
  } catch {
    return undefined;
  }
}

export async function runNativeGattDiagnostics(peripheralId) {
  if (!peripheralId) {
    throw new Error('The Bluetooth device identifier is missing.');
  }

  if (Platform.OS !== 'android') {
    throw new Error('Native GATT diagnostics are currently supported on Android only.');
  }

  const diagnostic = NativeModules.CareSenseBleDiagnostic;

  if (!diagnostic?.inspect) {
    throw new Error(
      'CareSense native BLE diagnostic module is not installed in this Android build.',
    );
  }

  const permitted = await requestBluetoothPermissions();

  if (!permitted) {
    throw new Error(
      'Bluetooth permission is required for native GATT diagnostics.',
    );
  }

  const inspection = await diagnostic.inspect(peripheralId);

  let heartRateNotification = null;

  if (typeof diagnostic.enableHeartRateNotifications === 'function') {
    try {
      heartRateNotification =
        await diagnostic.enableHeartRateNotifications(peripheralId);
    } catch (error) {
      heartRateNotification = {
        success: false,
        error: error?.message || 'Native Heart Rate notification setup failed.',
      };
    }
  } else {
    heartRateNotification = {
      success: false,
      error: 'Native Heart Rate notification diagnostic is not installed in this Android build.',
    };
  }

  return {
    ...inspection,
    heartRateNotification,
  };
}

export async function stopNativeHeartRateNotifications() {
  if (Platform.OS !== 'android') return false;

  const diagnostic = NativeModules.CareSenseBleDiagnostic;

  if (!diagnostic?.stopHeartRateNotifications) {
    return false;
  }

  try {
    return await diagnostic.stopHeartRateNotifications();
  } catch {
    return false;
  }
}

export async function connectBluetoothDevice(
  peripheralId,
  { autoConnect = false, bond = false } = {},
) {
  if (!peripheralId) {
    throw new Error('The Bluetooth device identifier is missing.');
  }

  const permitted = await requestBluetoothPermissions();

  if (!permitted) {
    throw new Error(
      'Bluetooth connection permission was not granted.',
    );
  }

  await initializeBluetooth();

  if (bond && Platform.OS === 'android') {
    try {
      // Some wearables require an Android bond before encrypted/proprietary
      // GATT services remain available after the initial connection.
      // If the watch does not support bonding, continue normally.
      await BleManager.createBond(peripheralId);
    } catch (error) {
      console.debug(
        'BLE bonding was not established; continuing with a normal connection:',
        error,
      );
    }
  }

  await BleManager.connect(peripheralId, {
    autoconnect: Boolean(autoConnect),
  });

  if (Platform.OS === 'android') {
    try {
      // Ask Android for a short high-priority connection window while the
      // wearable completes GATT setup. We return to normal operation after
      // discovery rather than keeping the radio in high-priority mode.
      await BleManager.requestConnectionPriority(peripheralId, 1);
    } catch (error) {
      console.debug(
        'BLE high-priority connection request was not accepted:',
        error,
      );
    }
  }

  // Allow the Android GATT link / wearable firmware to settle before
  // touching the service cache.
  await wait(900);

  // Some Android/wearable combinations can return a visible GATT table from
  // one discovery call while later read/notify/descriptor lookups still use a
  // stale native cache. react-native-ble-manager exposes refreshCache()
  // specifically for this case.
  if (Platform.OS === 'android') {
    try {
      await BleManager.refreshCache(peripheralId);
      await wait(500);
    } catch (error) {
      console.debug(
        'BLE GATT cache refresh was not available:',
        error,
      );
    }
  }

  let serviceInfo = null;

  try {
    serviceInfo = await BleManager.retrieveServices(peripheralId);
  } catch (error) {
    console.warn('BLE service discovery warning:', error);
  }

  let rssi = null;

  try {
    rssi = await BleManager.readRSSI(peripheralId);
  } catch {
    // RSSI is optional.
  }

  const services = Array.isArray(serviceInfo?.services)
    ? serviceInfo.services
    : [];

  const serviceUUIDs = services
    .map(service => service?.uuid || service?.UUID || service)
    .filter(Boolean);

  const characteristics = Array.isArray(serviceInfo?.characteristics)
    ? serviceInfo.characteristics
    : [];

  const characteristicUUIDs = characteristics
    .map(item => item?.characteristic || item?.uuid || item?.UUID)
    .filter(Boolean);

  let batteryLevel = null;

  if (
    serviceUUIDs.some(uuid => String(uuid).toLowerCase() === '180f') &&
    characteristicUUIDs.some(uuid => String(uuid).toLowerCase() === '2a19')
  ) {
    try {
      const batteryBytes = await BleManager.read(
        peripheralId,
        '180F',
        '2A19',
      );

      if (Array.isArray(batteryBytes) && batteryBytes.length > 0) {
        const value = Number(batteryBytes[0]);
        if (Number.isFinite(value) && value >= 0 && value <= 100) {
          batteryLevel = value;
        }
      }
    } catch (error) {
      console.debug('BLE battery read was not available:', error);
    }
  }

  if (Platform.OS === 'android') {
    try {
      // Return to the normal balanced connection parameters after initial setup.
      await BleManager.requestConnectionPriority(peripheralId, 0);
    } catch {
      // Optional optimization only.
    }
  }

  return {
    nativeId: peripheralId,
    serviceCount: serviceUUIDs.length,
    serviceUUIDs,
    characteristicUUIDs,
    rssi: typeof rssi === 'number' ? rssi : null,
    batteryLevel,
    name:
      serviceInfo?.name ||
      serviceInfo?.localName ||
      'Bluetooth device',
  };
}

export async function readBluetoothBatteryLevel(peripheralId) {
  if (!peripheralId) return null;

  const permitted = await requestBluetoothPermissions();
  if (!permitted) return null;

  await initializeBluetooth();

  try {
    const value = await BleManager.read(
      peripheralId,
      '180F',
      '2A19',
    );

    if (!Array.isArray(value) || value.length === 0) {
      return null;
    }

    const battery = Number(value[0]);

    return Number.isFinite(battery) && battery >= 0 && battery <= 100
      ? battery
      : null;
  } catch {
    return null;
  }
}

export async function requestBalancedConnectionPriority(peripheralId) {
  if (!peripheralId || Platform.OS !== 'android') return;

  try {
    await BleManager.requestConnectionPriority(peripheralId, 0);
  } catch {
    // Best effort.
  }
}

const HEART_RATE_SERVICE_UUID = '180D';
const HEART_RATE_CHARACTERISTIC_UUID = '2A37';
const HEART_RATE_CCCD_UUID = '2902';

const HEART_RATE_SERVICE_FULL =
  '0000180d-0000-1000-8000-00805f9b34fb';
const HEART_RATE_CHARACTERISTIC_FULL =
  '00002a37-0000-1000-8000-00805f9b34fb';
const HEART_RATE_CCCD_FULL =
  '00002902-0000-1000-8000-00805f9b34fb';

async function writeHeartRateCccd(
  peripheralId,
  serviceUUID,
  characteristicUUID,
  descriptorUUID,
) {
  try {
    await BleManager.writeDescriptor(
      peripheralId,
      serviceUUID,
      characteristicUUID,
      descriptorUUID,
      [1, 0],
    );
    return true;
  } catch (error) {
    console.debug(
      `Heart-rate CCCD write failed for ${serviceUUID}/${characteristicUUID}/${descriptorUUID}:`,
      error,
    );
    return false;
  }
}

export async function startHeartRateNotifications(peripheralId) {
  if (!peripheralId) return false;

  const permitted = await requestBluetoothPermissions();
  if (!permitted) return false;

  await initializeBluetooth();

  const shortUuidSuccess = await writeHeartRateCccd(
    peripheralId,
    HEART_RATE_SERVICE_UUID,
    HEART_RATE_CHARACTERISTIC_UUID,
    HEART_RATE_CCCD_UUID,
  );

  if (shortUuidSuccess) {
    return true;
  }

  return writeHeartRateCccd(
    peripheralId,
    HEART_RATE_SERVICE_FULL,
    HEART_RATE_CHARACTERISTIC_FULL,
    HEART_RATE_CCCD_FULL,
  );
}

export async function stopHeartRateNotifications(peripheralId) {
  if (!peripheralId) return;

  const attempts = [
    [
      HEART_RATE_SERVICE_UUID,
      HEART_RATE_CHARACTERISTIC_UUID,
      HEART_RATE_CCCD_UUID,
    ],
    [
      HEART_RATE_SERVICE_FULL,
      HEART_RATE_CHARACTERISTIC_FULL,
      HEART_RATE_CCCD_FULL,
    ],
  ];

  for (const [serviceUUID, characteristicUUID, descriptorUUID] of attempts) {
    try {
      await BleManager.writeDescriptor(
        peripheralId,
        serviceUUID,
        characteristicUUID,
        descriptorUUID,
        [0, 0],
      );
      return;
    } catch {
      // Try fully-qualified UUIDs.
    }
  }
}

export async function disconnectBluetoothDevice(
  peripheralId,
  force = false,
) {
  if (!peripheralId) return;

  const permitted = await requestBluetoothPermissions();
  if (!permitted) {
    throw new Error(
      'Bluetooth connection permission was not granted.',
    );
  }

  await initializeBluetooth();

  try {
    await BleManager.disconnect(peripheralId, force);
  } catch (error) {
    const message = String(error?.message || error || '');

    if (
      !message.includes('not connected') &&
      !message.includes('Device is not connected')
    ) {
      throw error;
    }
  }
}

export async function getConnectedBluetoothDevices() {
  const permitted = await requestBluetoothPermissions();

  if (!permitted) {
    return [];
  }

  await initializeBluetooth();

  try {
    return await BleManager.getConnectedPeripherals([]);
  } catch (error) {
    const message = String(error?.message || error || '');

    if (
      message.includes('BLUETOOTH_CONNECT') ||
      message.includes('SecurityException') ||
      message.includes('permission')
    ) {
      return [];
    }

    throw error;
  }
}

export function subscribeToBluetoothEvents({
  onDiscoverPeripheral,
  onStopScan,
  onConnect,
  onDisconnect,
  onStateChange,
  onCharacteristicUpdate,
}) {
  const listeners = [];

  if (typeof onDiscoverPeripheral === 'function') {
    listeners.push(
      BleManager.onDiscoverPeripheral(onDiscoverPeripheral),
    );
  }

  if (typeof onStopScan === 'function') {
    listeners.push(BleManager.onStopScan(onStopScan));
  }

  if (typeof onConnect === 'function') {
    listeners.push(BleManager.onConnectPeripheral(onConnect));
  }

  if (typeof onDisconnect === 'function') {
    listeners.push(
      BleManager.onDisconnectPeripheral(onDisconnect),
    );
  }

  if (typeof onStateChange === 'function') {
    listeners.push(BleManager.onDidUpdateState(onStateChange));
  }

  if (typeof onCharacteristicUpdate === 'function') {
    listeners.push(
      BleManager.onDidUpdateValueForCharacteristic(
        onCharacteristicUpdate,
      ),
    );
  }

  return listeners;
}
