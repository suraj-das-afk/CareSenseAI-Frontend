package com.caresenseai.app

import android.Manifest
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCallback
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattDescriptor
import android.bluetooth.BluetoothGattService
import android.content.pm.PackageManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import java.util.Locale

class CareSenseBleDiagnosticModule(
  reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  companion object {
    const val NAME = "CareSenseBleDiagnostic"
    private const val TIMEOUT_MS = 15_000L
    private const val HEART_RATE_SERVICE_UUID = "0000180d-0000-1000-8000-00805f9b34fb"
    private const val HEART_RATE_CHARACTERISTIC_UUID = "00002a37-0000-1000-8000-00805f9b34fb"
    private const val HEART_RATE_CCCD_UUID = "00002902-0000-1000-8000-00805f9b34fb"
  }

  private val handler = Handler(Looper.getMainLooper())
  private var activeGatt: BluetoothGatt? = null
  private var activePromise: Promise? = null

  private var heartRateGatt: BluetoothGatt? = null
  private var heartRatePeripheralId: String? = null
  private var heartRatePromise: Promise? = null

  override fun getName(): String = NAME

  @ReactMethod
  fun inspect(peripheralId: String, promise: Promise) {
    if (peripheralId.isBlank()) {
      promise.reject("BLE_DIAGNOSTIC_INVALID_ID", "Bluetooth device id is missing.")
      return
    }

    if (
      Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
      reactApplicationContext.checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT) !=
        PackageManager.PERMISSION_GRANTED
    ) {
      promise.reject(
        "BLE_DIAGNOSTIC_PERMISSION",
        "BLUETOOTH_CONNECT permission is required.",
      )
      return
    }

    cleanup()

    val adapter = BluetoothAdapter.getDefaultAdapter()

    if (adapter == null) {
      promise.reject(
        "BLE_DIAGNOSTIC_UNAVAILABLE",
        "Bluetooth is not available.",
      )
      return
    }

    val device = try {
      adapter.getRemoteDevice(peripheralId)
    } catch (error: IllegalArgumentException) {
      promise.reject(
        "BLE_DIAGNOSTIC_DEVICE",
        "Invalid Bluetooth device identifier: $peripheralId",
        error,
      )
      return
    }

    activePromise = promise

    val timeout = Runnable {
      val pending = activePromise
      activePromise = null
      pending?.reject(
        "BLE_DIAGNOSTIC_TIMEOUT",
        "Native GATT inspection timed out after 15 seconds.",
      )
      cleanup()
    }

    val callback = object : BluetoothGattCallback() {

      override fun onConnectionStateChange(
        gatt: BluetoothGatt,
        status: Int,
        newState: Int,
      ) {
        if (newState == BluetoothGatt.STATE_CONNECTED && status == BluetoothGatt.GATT_SUCCESS) {
          try {
            if (!gatt.discoverServices()) {
              handler.removeCallbacks(timeout)
              val pending = activePromise
              activePromise = null
              pending?.reject(
                "BLE_DIAGNOSTIC_DISCOVERY_START",
                "Android could not start native GATT service discovery.",
              )
              cleanup()
            }
          } catch (error: SecurityException) {
            handler.removeCallbacks(timeout)
            val pending = activePromise
            activePromise = null
            pending?.reject(
              "BLE_DIAGNOSTIC_SECURITY",
              error.message,
              error,
            )
            cleanup()
          }
          return
        }

        if (newState == BluetoothGatt.STATE_DISCONNECTED) {
          handler.removeCallbacks(timeout)

          val result = Arguments.createMap().apply {
            putString("deviceId", peripheralId)
            putBoolean("connected", false)
            putInt("connectionState", newState)
            putInt("disconnectStatus", status)
            putString(
              "disconnectStatusHex",
              String.format(Locale.US, "0x%02X", status),
            )
            putString("disconnectStatusName", statusName(status))
          }

          val pending = activePromise
          activePromise = null
          pending?.resolve(result)
          cleanup()
        }
      }

      override fun onServicesDiscovered(
        gatt: BluetoothGatt,
        status: Int,
      ) {
        handler.removeCallbacks(timeout)
        val pending = activePromise ?: return

        if (status != BluetoothGatt.GATT_SUCCESS) {
          val result = Arguments.createMap().apply {
            putString("deviceId", peripheralId)
            putBoolean("connected", true)
            putInt("serviceDiscoveryStatus", status)
            putString(
              "serviceDiscoveryStatusHex",
              String.format(Locale.US, "0x%02X", status),
            )
            putString(
              "serviceDiscoveryStatusName",
              statusName(status),
            )
            putInt("serviceCount", 0)
            putArray("services", Arguments.createArray())
          }

          activePromise = null
          pending.resolve(result)
          cleanup()
          return
        }

        val services = Arguments.createArray()
        for (service in gatt.services.orEmpty()) {
          services.pushMap(serviceToMap(service))
        }

        val result = Arguments.createMap().apply {
          putString("deviceId", peripheralId)
          putBoolean("connected", true)
          putInt("serviceDiscoveryStatus", status)
          putString(
            "serviceDiscoveryStatusName",
            statusName(status),
          )
          putInt("serviceCount", gatt.services?.size ?: 0)
          putArray("services", services)
        }

        activePromise = null
        pending.resolve(result)
        cleanup()
      }
    }

    try {
      val gatt = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        device.connectGatt(
          reactApplicationContext,
          false,
          callback,
          BluetoothDevice.TRANSPORT_LE,
          BluetoothDevice.PHY_LE_1M_MASK,
        )
      } else {
        device.connectGatt(
          reactApplicationContext,
          false,
          callback,
          BluetoothDevice.TRANSPORT_LE,
        )
      }

      if (gatt == null) {
        handler.removeCallbacks(timeout)
        activePromise = null
        promise.reject(
          "BLE_DIAGNOSTIC_CONNECT",
          "Android could not create the native GATT connection.",
        )
        return
      }

      activeGatt = gatt
      handler.postDelayed(timeout, TIMEOUT_MS)
    } catch (error: SecurityException) {
      handler.removeCallbacks(timeout)
      activePromise = null
      promise.reject(
        "BLE_DIAGNOSTIC_SECURITY",
        error.message,
        error,
      )
    } catch (error: Exception) {
      handler.removeCallbacks(timeout)
      activePromise = null
      promise.reject(
        "BLE_DIAGNOSTIC_CONNECT",
        error.message,
        error,
      )
    }
  }

  @ReactMethod
  fun enableHeartRateNotifications(
    peripheralId: String,
    promise: Promise,
  ) {
    if (peripheralId.isBlank()) {
      promise.reject("BLE_HR_INVALID_ID", "Bluetooth device id is missing.")
      return
    }

    if (
      Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
      reactApplicationContext.checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT) !=
        PackageManager.PERMISSION_GRANTED
    ) {
      promise.reject(
        "BLE_HR_PERMISSION",
        "BLUETOOTH_CONNECT permission is required.",
      )
      return
    }

    stopHeartRateSession()

    val adapter = BluetoothAdapter.getDefaultAdapter()
    if (adapter == null) {
      promise.reject("BLE_HR_UNAVAILABLE", "Bluetooth is not available.")
      return
    }

    val device = try {
      adapter.getRemoteDevice(peripheralId)
    } catch (error: IllegalArgumentException) {
      promise.reject(
        "BLE_HR_DEVICE",
        "Invalid Bluetooth device identifier: $peripheralId",
        error,
      )
      return
    }

    heartRatePromise = promise

    val timeout = Runnable {
      val pending = heartRatePromise
      heartRatePromise = null
      pending?.reject(
        "BLE_HR_TIMEOUT",
        "Native Heart Rate GATT setup timed out after 15 seconds.",
      )
      stopHeartRateSession()
    }

    val callback = object : BluetoothGattCallback() {

      override fun onConnectionStateChange(
        gatt: BluetoothGatt,
        status: Int,
        newState: Int,
      ) {
        if (
          newState == BluetoothGatt.STATE_CONNECTED &&
          status == BluetoothGatt.GATT_SUCCESS
        ) {
          try {
            if (!gatt.discoverServices()) {
              handler.removeCallbacks(timeout)
              val pending = heartRatePromise
              heartRatePromise = null
              pending?.reject(
                "BLE_HR_DISCOVERY_START",
                "Android could not start Heart Rate GATT service discovery.",
              )
              try {
                gatt.disconnect()
                gatt.close()
              } catch (_: Exception) {
                // Best effort.
              }
            }
          } catch (error: SecurityException) {
            handler.removeCallbacks(timeout)
            val pending = heartRatePromise
            heartRatePromise = null
            pending?.reject(
              "BLE_HR_SECURITY",
              error.message,
              error,
            )
            try {
              gatt.disconnect()
              gatt.close()
            } catch (_: Exception) {
              // Best effort.
            }
          }
          return
        }

        if (newState == BluetoothGatt.STATE_DISCONNECTED) {
          handler.removeCallbacks(timeout)

          val pending = heartRatePromise
          heartRatePromise = null

          if (pending != null) {
            pending.reject(
              "BLE_HR_DISCONNECTED",
              "Native Heart Rate GATT connection disconnected before notifications were enabled. " +
                "status=${status} (${statusName(status)})",
            )
          }

          if (heartRateGatt === gatt) {
            heartRateGatt = null
            heartRatePeripheralId = null
          }

          try {
            gatt.close()
          } catch (_: Exception) {
            // Best effort.
          }
        }
      }

      override fun onServicesDiscovered(
        gatt: BluetoothGatt,
        status: Int,
      ) {
        if (status != BluetoothGatt.GATT_SUCCESS) {
          handler.removeCallbacks(timeout)
          val pending = heartRatePromise
          heartRatePromise = null
          pending?.reject(
            "BLE_HR_DISCOVERY",
            "Heart Rate GATT service discovery failed. status=${status} (${statusName(status)})",
          )
          try {
            gatt.disconnect()
            gatt.close()
          } catch (_: Exception) {
            // Best effort.
          }
          return
        }

        val service = gatt.services.orEmpty().firstOrNull {
          it.uuid.toString().equals(HEART_RATE_SERVICE_UUID, ignoreCase = true)
        }

        val characteristic = service?.characteristics.orEmpty().firstOrNull {
          it.uuid.toString().equals(
            HEART_RATE_CHARACTERISTIC_UUID,
            ignoreCase = true,
          )
        }

        val descriptor = characteristic?.descriptors.orEmpty().firstOrNull {
          it.uuid.toString().equals(HEART_RATE_CCCD_UUID, ignoreCase = true)
        }

        if (service == null || characteristic == null || descriptor == null) {
          handler.removeCallbacks(timeout)
          val pending = heartRatePromise
          heartRatePromise = null
          pending?.reject(
            "BLE_HR_CHARACTERISTIC_NOT_FOUND",
            "Native Android GATT discovered the device but could not find Heart Rate service 180D, characteristic 2A37, and CCCD 2902 together.",
          )
          try {
            gatt.disconnect()
            gatt.close()
          } catch (_: Exception) {
            // Best effort.
          }
          return
        }

        val supportsNotify =
          (characteristic.properties and BluetoothGattCharacteristic.PROPERTY_NOTIFY) != 0
        val supportsIndicate =
          (characteristic.properties and BluetoothGattCharacteristic.PROPERTY_INDICATE) != 0

        if (!supportsNotify && !supportsIndicate) {
          handler.removeCallbacks(timeout)
          val pending = heartRatePromise
          heartRatePromise = null
          pending?.reject(
            "BLE_HR_UNSUPPORTED",
            "Heart Rate characteristic 2A37 does not advertise NOTIFY or INDICATE.",
          )
          try {
            gatt.disconnect()
            gatt.close()
          } catch (_: Exception) {
            // Best effort.
          }
          return
        }

        try {
          val localNotificationSet =
            gatt.setCharacteristicNotification(characteristic, true)

          if (!localNotificationSet) {
            handler.removeCallbacks(timeout)
            val pending = heartRatePromise
            heartRatePromise = null
            pending?.reject(
              "BLE_HR_LOCAL_NOTIFICATION",
              "Android could not enable the local BluetoothGatt notification flag for 2A37.",
            )
            try {
              gatt.disconnect()
              gatt.close()
            } catch (_: Exception) {
              // Best effort.
            }
            return
          }

          descriptor.value = if (supportsNotify) {
            BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
          } else {
            BluetoothGattDescriptor.ENABLE_INDICATION_VALUE
          }

          if (!gatt.writeDescriptor(descriptor)) {
            handler.removeCallbacks(timeout)
            val pending = heartRatePromise
            heartRatePromise = null
            pending?.reject(
              "BLE_HR_CCCD_WRITE_START",
              "Android could not start the native CCCD write for 2A37.",
            )
            try {
              gatt.disconnect()
              gatt.close()
            } catch (_: Exception) {
              // Best effort.
            }
          }
        } catch (error: SecurityException) {
          handler.removeCallbacks(timeout)
          val pending = heartRatePromise
          heartRatePromise = null
          pending?.reject(
            "BLE_HR_SECURITY",
            error.message,
            error,
          )
          try {
            gatt.disconnect()
            gatt.close()
          } catch (_: Exception) {
            // Best effort.
          }
        }
      }

      override fun onDescriptorWrite(
        gatt: BluetoothGatt,
        descriptor: BluetoothGattDescriptor,
        status: Int,
      ) {
        handler.removeCallbacks(timeout)

        val pending = heartRatePromise
        heartRatePromise = null

        if (status != BluetoothGatt.GATT_SUCCESS) {
          pending?.reject(
            "BLE_HR_CCCD_WRITE",
            "Native CCCD write for 2A37 failed. status=${status} (${statusName(status)})",
          )
          try {
            gatt.disconnect()
            gatt.close()
          } catch (_: Exception) {
            // Best effort.
          }
          return
        }

        heartRateGatt = gatt
        heartRatePeripheralId = peripheralId

        val service = gatt.getService(java.util.UUID.fromString(HEART_RATE_SERVICE_UUID))
        val characteristic = service?.getCharacteristic(
          java.util.UUID.fromString(HEART_RATE_CHARACTERISTIC_UUID)
        )

        val result = Arguments.createMap().apply {
          putString("deviceId", peripheralId)
          putBoolean("success", true)
          putBoolean("connected", true)
          putBoolean("localNotificationEnabled", true)
          putString("serviceUuid", service?.uuid?.toString() ?: HEART_RATE_SERVICE_UUID)
          putInt(
            "serviceInstanceId",
            if (service != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
              service.instanceId
            } else {
              -1
            },
          )
          putString(
            "characteristicUuid",
            characteristic?.uuid?.toString() ?: HEART_RATE_CHARACTERISTIC_UUID,
          )
          putInt(
            "characteristicInstanceId",
            if (characteristic != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
              characteristic.instanceId
            } else {
              -1
            },
          )
          putString("descriptorUuid", descriptor.uuid.toString())
          putBoolean(
            "usedNotifications",
            descriptor.value?.contentEquals(
              BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE,
            ) == true,
          )
          putBoolean(
            "usedIndications",
            descriptor.value?.contentEquals(
              BluetoothGattDescriptor.ENABLE_INDICATION_VALUE,
            ) == true,
          )
          putInt("descriptorWriteStatus", status)
          putString("descriptorWriteStatusName", statusName(status))
        }

        pending?.resolve(result)
      }
    }

    try {
      val gatt = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        device.connectGatt(
          reactApplicationContext,
          false,
          callback,
          BluetoothDevice.TRANSPORT_LE,
          BluetoothDevice.PHY_LE_1M_MASK,
        )
      } else {
        device.connectGatt(
          reactApplicationContext,
          false,
          callback,
          BluetoothDevice.TRANSPORT_LE,
        )
      }

      if (gatt == null) {
        handler.removeCallbacks(timeout)
        heartRatePromise = null
        promise.reject(
          "BLE_HR_CONNECT",
          "Android could not create the native Heart Rate GATT connection.",
        )
        return
      }

      heartRateGatt = gatt
      heartRatePeripheralId = peripheralId
      handler.postDelayed(timeout, TIMEOUT_MS)
    } catch (error: SecurityException) {
      handler.removeCallbacks(timeout)
      heartRatePromise = null
      promise.reject(
        "BLE_HR_SECURITY",
        error.message,
        error,
      )
    } catch (error: Exception) {
      handler.removeCallbacks(timeout)
      heartRatePromise = null
      promise.reject(
        "BLE_HR_CONNECT",
        error.message,
        error,
      )
    }
  }

  @ReactMethod
  fun stopHeartRateNotifications(promise: Promise) {
    handler.removeCallbacksAndMessages(null)
    heartRatePromise = null

    val gatt = heartRateGatt
    heartRateGatt = null
    heartRatePeripheralId = null

    if (gatt == null) {
      promise.resolve(false)
      return
    }

    try {
      val service = gatt.getService(java.util.UUID.fromString(HEART_RATE_SERVICE_UUID))
      val characteristic = service?.getCharacteristic(
        java.util.UUID.fromString(HEART_RATE_CHARACTERISTIC_UUID)
      )
      if (characteristic != null) {
        try {
          gatt.setCharacteristicNotification(characteristic, false)
        } catch (_: Exception) {
          // Best effort.
        }
      }
      gatt.disconnect()
      gatt.close()
    } catch (_: Exception) {
      // Best effort.
    }

    promise.resolve(true)
  }

  private fun serviceToMap(
    service: BluetoothGattService,
  ): WritableMap {
    val serviceMap = Arguments.createMap()
    serviceMap.putString("uuid", service.uuid.toString())
    serviceMap.putInt(
      "instanceId",
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) service.instanceId else -1,
    )

    val characteristics = Arguments.createArray()
    for (characteristic in service.characteristics.orEmpty()) {
      characteristics.pushMap(characteristicToMap(characteristic))
    }

    serviceMap.putArray("characteristics", characteristics)
    return serviceMap
  }

  private fun characteristicToMap(
    characteristic: BluetoothGattCharacteristic,
  ): WritableMap {
    val map = Arguments.createMap()
    map.putString("uuid", characteristic.uuid.toString())
    map.putInt(
      "instanceId",
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) characteristic.instanceId else -1,
    )
    map.putInt("propertiesMask", characteristic.properties)
    map.putString("properties", propertiesName(characteristic.properties))

    val descriptors = Arguments.createArray()
    for (descriptor in characteristic.descriptors.orEmpty()) {
      val descriptorMap = Arguments.createMap()
      descriptorMap.putString("uuid", descriptor.uuid.toString())
      descriptors.pushMap(descriptorMap)
    }

    map.putArray("descriptors", descriptors)
    return map
  }

  private fun propertiesName(properties: Int): String {
    val names = mutableListOf<String>()

    if ((properties and BluetoothGattCharacteristic.PROPERTY_READ) != 0) names.add("READ")
    if ((properties and BluetoothGattCharacteristic.PROPERTY_WRITE) != 0) names.add("WRITE")
    if ((properties and BluetoothGattCharacteristic.PROPERTY_WRITE_NO_RESPONSE) != 0) {
      names.add("WRITE_NO_RESPONSE")
    }
    if ((properties and BluetoothGattCharacteristic.PROPERTY_NOTIFY) != 0) names.add("NOTIFY")
    if ((properties and BluetoothGattCharacteristic.PROPERTY_INDICATE) != 0) names.add("INDICATE")
    if ((properties and BluetoothGattCharacteristic.PROPERTY_SIGNED_WRITE) != 0) {
      names.add("SIGNED_WRITE")
    }
    if ((properties and BluetoothGattCharacteristic.PROPERTY_EXTENDED_PROPS) != 0) {
      names.add("EXTENDED_PROPS")
    }

    return if (names.isEmpty()) "NONE" else names.joinToString(" • ")
  }

  private fun statusName(status: Int): String {
    return when (status) {
      BluetoothGatt.GATT_SUCCESS -> "GATT_SUCCESS"
      0x01 -> "GATT_INVALID_HANDLE"
      0x02 -> "GATT_READ_NOT_PERMITTED"
      0x03 -> "GATT_WRITE_NOT_PERMITTED"
      0x04 -> "GATT_INVALID_PDU"
      0x05 -> "GATT_INSUFFICIENT_AUTHENTICATION"
      0x06 -> "GATT_REQUEST_NOT_SUPPORTED"
      0x07 -> "GATT_INVALID_OFFSET"
      0x08 -> "GATT_INSUFFICIENT_AUTHORIZATION"
      0x09 -> "GATT_PREPARE_Q_FULL"
      0x0A -> "GATT_NOT_FOUND"
      0x0B -> "GATT_NOT_LONG"
      0x0C -> "GATT_INSUFFICIENT_KEY_SIZE"
      0x0D -> "GATT_INVALID_ATTRIBUTE_LENGTH"
      0x0E -> "GATT_ERR_UNLIKELY"
      0x0F -> "GATT_INSUFFICIENT_ENCRYPTION"
      0x10 -> "GATT_UNSUPPORTED_GRP_TYPE"
      0x11 -> "GATT_UNKNOWN_ERROR"
      0x12 -> "GATT_ERR_UNDEFINED"
      0x13 -> "GATT_CONN_TERMINATE_PEER_USER"
      0x16 -> "GATT_CONN_TERMINATE_LOCAL_HOST"
      0x22 -> "GATT_CONN_L2C_FAILURE"
      0x3E -> "GATT_CONN_TIMEOUT"
      else -> "GATT_STATUS_$status"
    }
  }

  private fun cleanup() {
    try {
      activeGatt?.disconnect()
      activeGatt?.close()
    } catch (_: Exception) {
      // Best effort.
    } finally {
      activeGatt = null
    }
  }

  override fun invalidate() {
    super.invalidate()
    handler.removeCallbacksAndMessages(null)
    activePromise = null
    cleanup()
    stopHeartRateSession()
  }

  private fun stopHeartRateSession() {
    heartRatePromise = null
    val gatt = heartRateGatt
    heartRateGatt = null
    heartRatePeripheralId = null

    if (gatt != null) {
      try {
        gatt.disconnect()
      } catch (_: Exception) {
        // Best effort.
      }
      try {
        gatt.close()
      } catch (_: Exception) {
        // Best effort.
      }
    }
  }
}
