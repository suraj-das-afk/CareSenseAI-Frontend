import React, { useState, useContext, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Switch,
  Animated,
  useColorScheme,
  Alert,
  Linking,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

import { AuthContext } from '../context/AuthContext';

const STORAGE_KEY = '@vitasync_user_settings_v2';

const BRAND = {
  cyan: '#00D4C5',
  cyanDark: '#00B3A6',
  red: '#EF4444',
  darkBg: '#0A0F1A',
  darkCard: '#141C29',
  darkBorder: '#222E40',
  lightBg: '#F8F9FB',
  lightCard: '#FFFFFF',
  lightBorder: '#E2E8F0',
};

const getTheme = (isDark) => ({
  background: isDark ? BRAND.darkBg : BRAND.lightBg,
  card: isDark ? BRAND.darkCard : BRAND.lightCard,
  border: isDark ? BRAND.darkBorder : BRAND.lightBorder,
  textPrimary: isDark ? '#FFFFFF' : '#111827',
  textSecondary: isDark ? '#8897AE' : '#64748B',
  inputBg: isDark ? '#1C2738' : '#F1F5F9',
  accent: BRAND.cyan,
  switchTrackActive: isDark ? '#00B3A6' : BRAND.cyan,
  switchTrackInactive: isDark ? '#222E40' : '#E2E8F0',
  logoutBtnBg: isDark ? 'rgba(239, 68, 68, 0.08)' : '#FEF2F2',
  logoutBtnBorder: BRAND.red,
  logoutBtnText: BRAND.red,
});

export default function SettingsScreen({ navigation }) {
  const authContext = useContext(AuthContext) || {};
  const { user, logout, toggleGlobalTheme, isDarkMode: globalDarkMode } = authContext;
  
  const systemColorScheme = useColorScheme();
  const [darkTheme, setDarkTheme] = useState(
    globalDarkMode !== undefined ? globalDarkMode : systemColorScheme === 'dark'
  );

  const theme = useMemo(() => getTheme(darkTheme), [darkTheme]);

  // Persistent States
  const [profileImage, setProfileImage] = useState(user?.photoURL || 'https://i.pravatar.cc/300?img=11');
  const [vitals, setVitals] = useState({
    age: user?.age || '28',
    bloodType: user?.bloodType || 'O+',
    height: user?.height || '182 cm',
    weight: user?.weight || '76 kg',
  });
  const [devices, setDevices] = useState([]);
  const [emergencyContacts, setEmergencyContacts] = useState([
    {
      id: '112-india',
      name: 'National Emergency Services',
      relation: 'India Direct Helpline',
      phone: '112',
      isSystemDefault: true,
    },
  ]);
  const [notifications, setNotifications] = useState(true);
  const [biometrics, setBiometrics] = useState(true);
  const [dataSharing, setDataSharing] = useState(false);

  // Modals
  const [isVitalsModalVisible, setIsVitalsModalVisible] = useState(false);
  const [tempVitals, setTempVitals] = useState(vitals);
  const [isDeviceModalVisible, setIsDeviceModalVisible] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [isContactModalVisible, setIsContactModalVisible] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', relation: '', phone: '' });

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  // 1. LOAD SETTINGS FROM STORAGE ON MOUNT
  useEffect(() => {
    const loadSavedSettings = async () => {
      try {
        const savedData = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedData !== null) {
          const parsed = JSON.parse(savedData);
          if (parsed.profileImage) setProfileImage(parsed.profileImage);
          if (parsed.vitals) setVitals(parsed.vitals);
          if (parsed.devices) setDevices(parsed.devices);
          if (parsed.emergencyContacts) setEmergencyContacts(parsed.emergencyContacts);
          if (parsed.notifications !== undefined) setNotifications(parsed.notifications);
          if (parsed.biometrics !== undefined) setBiometrics(parsed.biometrics);
          if (parsed.dataSharing !== undefined) setDataSharing(parsed.dataSharing);
          if (parsed.darkTheme !== undefined) {
            setDarkTheme(parsed.darkTheme);
            if (toggleGlobalTheme) toggleGlobalTheme(parsed.darkTheme);
          }
        }
      } catch (e) {
        console.error('Failed to load local settings:', e);
      }
    };
    loadSavedSettings();
  }, []);

  // 2. HELPER TO SAVE SETTINGS
  const persistSettings = async (updatedValues) => {
    try {
      const payload = {
        profileImage,
        vitals,
        devices,
        emergencyContacts,
        notifications,
        darkTheme,
        biometrics,
        dataSharing,
        ...updatedValues,
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.error('Failed to persist settings:', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fadeAnim.setValue(0);
      slideAnim.setValue(20);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    }, [fadeAnim, slideAnim])
  );

  // Profile Image Picker
  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Denied', 'Permission to access gallery is required to select a profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedUri = result.assets[0].uri;
        setProfileImage(selectedUri);
        persistSettings({ profileImage: selectedUri });
      }
    } catch (err) {
      Alert.alert('Error', 'Unable to pick image. Please verify expo-image-picker is installed.');
    }
  };

  // Dark Theme Toggle
  const handleDarkThemeToggle = (value) => {
    setDarkTheme(value);
    if (toggleGlobalTheme) toggleGlobalTheme(value);
    persistSettings({ darkTheme: value });
  };

  // Vitals Saver
  const handleSaveVitals = () => {
    setVitals(tempVitals);
    persistSettings({ vitals: tempVitals });
    setIsVitalsModalVisible(false);
  };

  // Device Handlers
  const handleAddDevice = () => {
    if (!newDeviceName.trim()) {
      Alert.alert('Device Name Required', 'Please enter a device name.');
      return;
    }
    const updated = [
      ...devices,
      { id: Date.now().toString(), name: newDeviceName.trim(), syncedAt: 'Connected • synced just now' },
    ];
    setDevices(updated);
    persistSettings({ devices: updated });
    setNewDeviceName('');
    setIsDeviceModalVisible(false);
  };

  const handleRemoveDevice = (id) => {
    const updated = devices.filter((d) => d.id !== id);
    setDevices(updated);
    persistSettings({ devices: updated });
  };

  // Contact Handlers
  const handleAddContact = () => {
    if (!newContact.name.trim() || !newContact.phone.trim()) {
      Alert.alert('Missing Info', 'Please provide a name and contact number.');
      return;
    }
    const customCount = emergencyContacts.filter((c) => !c.isSystemDefault).length;
    if (customCount >= 3) {
      Alert.alert('Limit Reached', 'You can add up to 3 custom emergency contacts.');
      return;
    }

    const updated = [
      ...emergencyContacts,
      {
        id: Date.now().toString(),
        name: newContact.name.trim(),
        relation: newContact.relation.trim() || 'Emergency Contact',
        phone: newContact.phone.trim(),
        isSystemDefault: false,
      },
    ];
    setEmergencyContacts(updated);
    persistSettings({ emergencyContacts: updated });
    setNewContact({ name: '', relation: '', phone: '' });
    setIsContactModalVisible(false);
  };

  const handleRemoveContact = (id) => {
    const updated = emergencyContacts.filter((c) => c.id !== id);
    setEmergencyContacts(updated);
    persistSettings({ emergencyContacts: updated });
  };

  const handleEmergencyCall = async (phoneNumber) => {
    const phoneUrl = `tel:${phoneNumber.replace(/[^0-9+]/g, '')}`;
    const canOpen = await Linking.canOpenURL(phoneUrl);
    if (canOpen) {
      await Linking.openURL(phoneUrl);
    } else {
      Alert.alert('Emergency Call', `Dialing ${phoneNumber}...`);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <Animated.ScrollView
        style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        contentContainerStyle={[styles.content, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* PROFILE HEADER WITH CHANGE PHOTO BUTTON */}
        <View style={styles.profileHeader}>
          <TouchableOpacity onPress={handlePickImage} activeOpacity={0.8} style={styles.avatarContainer}>
            <View style={[styles.avatarWrapper, { borderColor: theme.accent }]}>
              <Image source={{ uri: profileImage }} style={styles.avatarImage} />
            </View>
            <View style={[styles.cameraBadge, { backgroundColor: theme.accent }]}>
              <Ionicons name="camera" size={14} color="#0A0F1A" />
            </View>
          </TouchableOpacity>
          <Text style={[styles.userName, { color: theme.textPrimary }]}>{user?.name || 'Suraj Das'}</Text>
          <Text style={[styles.userEmail, { color: theme.textSecondary }]}>
            {user?.email || 'suraj.das@vitasync.io'}
          </Text>
        </View>

        {/* VITALS SECTION */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Physical Summary</Text>
          <TouchableOpacity
            onPress={() => {
              setTempVitals(vitals);
              setIsVitalsModalVisible(true);
            }}
            style={styles.actionBtn}
          >
            <Ionicons name="create-outline" size={18} color={theme.accent} />
            <Text style={[styles.actionBtnText, { color: theme.accent }]}>Edit</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.vitalsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.vitalItem, styles.vitalBorderRight, { borderColor: theme.border }]}>
            <Text style={[styles.vitalValue, { color: theme.accent }]}>{vitals.age}</Text>
            <Text style={[styles.vitalLabel, { color: theme.textSecondary }]}>Age</Text>
          </View>
          <View style={[styles.vitalItem, styles.vitalBorderRight, { borderColor: theme.border }]}>
            <Text style={[styles.vitalValue, { color: theme.accent }]}>{vitals.bloodType}</Text>
            <Text style={[styles.vitalLabel, { color: theme.textSecondary }]}>Blood Type</Text>
          </View>
          <View style={[styles.vitalItem, styles.vitalBorderRight, { borderColor: theme.border }]}>
            <Text style={[styles.vitalValue, { color: theme.accent }]}>{vitals.height}</Text>
            <Text style={[styles.vitalLabel, { color: theme.textSecondary }]}>Height</Text>
          </View>
          <View style={styles.vitalItem}>
            <Text style={[styles.vitalValue, { color: theme.accent }]}>{vitals.weight}</Text>
            <Text style={[styles.vitalLabel, { color: theme.textSecondary }]}>Weight</Text>
          </View>
        </View>

        {/* CONNECTED DEVICES */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Connected Devices</Text>
          <TouchableOpacity onPress={() => setIsDeviceModalVisible(true)} style={styles.actionBtn}>
            <Ionicons name="add-circle-outline" size={18} color={theme.accent} />
            <Text style={[styles.actionBtnText, { color: theme.accent }]}>Add Device</Text>
          </TouchableOpacity>
        </View>

        {devices.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="hardware-chip-outline" size={24} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No devices paired. Tap "Add Device" to add your smartwatch or monitor.
            </Text>
          </View>
        ) : (
          devices.map((device) => (
            <View key={device.id} style={[styles.deviceCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.deviceLeft}>
                <View style={[styles.deviceIconBg, { backgroundColor: darkTheme ? '#0F2930' : '#E6FBFA' }]}>
                  <Ionicons name="watch-outline" size={24} color={theme.accent} />
                </View>
                <View style={styles.deviceInfo}>
                  <Text style={[styles.deviceName, { color: theme.textPrimary }]}>{device.name}</Text>
                  <Text style={[styles.deviceStatus, { color: theme.accent }]}>{device.syncedAt}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => handleRemoveDevice(device.id)}>
                <Ionicons name="trash-outline" size={18} color={BRAND.red} />
              </TouchableOpacity>
            </View>
          ))
        )}

        {/* SETTINGS TOGGLES */}
        <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginTop: 24 }]}>App Settings</Text>
        <View style={styles.settingsGroup}>
          <View style={[styles.settingRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: theme.textPrimary }]}>Notifications</Text>
              <Text style={[styles.settingSub, { color: theme.textSecondary }]}>Alerts, meds & reminders</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={(val) => {
                setNotifications(val);
                persistSettings({ notifications: val });
              }}
              trackColor={{ false: theme.switchTrackInactive, true: theme.switchTrackActive }}
            />
          </View>

          <View style={[styles.settingRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: theme.textPrimary }]}>Dark Theme</Text>
              <Text style={[styles.settingSub, { color: theme.textSecondary }]}>Deep obsidian UI</Text>
            </View>
            <Switch
              value={darkTheme}
              onValueChange={handleDarkThemeToggle}
              trackColor={{ false: theme.switchTrackInactive, true: theme.switchTrackActive }}
            />
          </View>

          <View style={[styles.settingRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: theme.textPrimary }]}>Biometric Login</Text>
              <Text style={[styles.settingSub, { color: theme.textSecondary }]}>Fingerprint & FaceID</Text>
            </View>
            <Switch
              value={biometrics}
              onValueChange={(val) => {
                setBiometrics(val);
                persistSettings({ biometrics: val });
              }}
              trackColor={{ false: theme.switchTrackInactive, true: theme.switchTrackActive }}
            />
          </View>

          <View style={[styles.settingRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: theme.textPrimary }]}>Data Sharing</Text>
              <Text style={[styles.settingSub, { color: theme.textSecondary }]}>Anonymized diagnostic logs</Text>
            </View>
            <Switch
              value={dataSharing}
              onValueChange={(val) => {
                setDataSharing(val);
                persistSettings({ dataSharing: val });
              }}
              trackColor={{ false: theme.switchTrackInactive, true: theme.switchTrackActive }}
            />
          </View>
        </View>

        {/* EMERGENCY CONTACTS */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Emergency Contacts</Text>
          <TouchableOpacity onPress={() => setIsContactModalVisible(true)} style={styles.actionBtn}>
            <Ionicons name="person-add-outline" size={18} color={BRAND.red} />
            <Text style={[styles.actionBtnText, { color: BRAND.red }]}>Add Contact</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.contactsGroup}>
          {emergencyContacts.map((contact) => (
            <View key={contact.id} style={[styles.emergencyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.emergencyLeft}>
                <View style={[styles.callIconBg, contact.isSystemDefault && { backgroundColor: 'rgba(239, 68, 68, 0.25)' }]}>
                  <Ionicons name="call" size={18} color={BRAND.red} />
                </View>
                <View style={styles.emergencyInfo}>
                  <Text style={[styles.emergencyName, { color: theme.textPrimary }]}>{contact.name}</Text>
                  <Text style={[styles.emergencySub, { color: theme.textSecondary }]}>
                    {contact.phone} • {contact.relation}
                  </Text>
                </View>
              </View>
              <View style={styles.contactActions}>
                <TouchableOpacity style={styles.callButton} onPress={() => handleEmergencyCall(contact.phone)}>
                  <Ionicons name="call" size={16} color={BRAND.red} />
                </TouchableOpacity>
                {!contact.isSystemDefault && (
                  <TouchableOpacity style={styles.deleteContactBtn} onPress={() => handleRemoveContact(contact.id)}>
                    <Ionicons name="trash-outline" size={16} color={theme.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* LOGOUT */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.logoutBtn, { backgroundColor: theme.logoutBtnBg, borderColor: theme.logoutBtnBorder }]}
            onPress={logout}
          >
            <Ionicons name="log-out-outline" size={20} color={theme.logoutBtnText} style={{ marginRight: 8 }} />
            <Text style={[styles.logoutBtnText, { color: theme.logoutBtnText }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </Animated.ScrollView>

      {/* EDIT VITALS MODAL */}
      <Modal visible={isVitalsModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Edit Physical Vitals</Text>
            
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Age</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.inputBg, color: theme.textPrimary }]}
              value={tempVitals.age}
              onChangeText={(val) => setTempVitals({ ...tempVitals, age: val })}
              keyboardType="numeric"
            />

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Blood Type</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.inputBg, color: theme.textPrimary }]}
              value={tempVitals.bloodType}
              onChangeText={(val) => setTempVitals({ ...tempVitals, bloodType: val })}
            />

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Height</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.inputBg, color: theme.textPrimary }]}
              value={tempVitals.height}
              onChangeText={(val) => setTempVitals({ ...tempVitals, height: val })}
            />

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Weight</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.inputBg, color: theme.textPrimary }]}
              value={tempVitals.weight}
              onChangeText={(val) => setTempVitals({ ...tempVitals, weight: val })}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setIsVitalsModalVisible(false)}>
                <Text style={{ color: theme.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalSaveBtn, { backgroundColor: theme.accent }]} onPress={handleSaveVitals}>
                <Text style={{ color: '#0A0F1A', fontWeight: '700' }}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ADD DEVICE MODAL */}
      <Modal visible={isDeviceModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Add New Device</Text>
            
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Device Name / Model</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.inputBg, color: theme.textPrimary }]}
              placeholder="e.g. Fitbit Charge 6, Galaxy Watch"
              placeholderTextColor={theme.textSecondary}
              value={newDeviceName}
              onChangeText={setNewDeviceName}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setIsDeviceModalVisible(false)}>
                <Text style={{ color: theme.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalSaveBtn, { backgroundColor: theme.accent }]} onPress={handleAddDevice}>
                <Text style={{ color: '#0A0F1A', fontWeight: '700' }}>Add Device</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ADD CONTACT MODAL */}
      <Modal visible={isContactModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Add Emergency Contact</Text>
            
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Contact Name</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.inputBg, color: theme.textPrimary }]}
              placeholder="e.g. Priya Das"
              placeholderTextColor={theme.textSecondary}
              value={newContact.name}
              onChangeText={(val) => setNewContact({ ...newContact, name: val })}
            />

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Relationship / Tag</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.inputBg, color: theme.textPrimary }]}
              placeholder="e.g. Spouse, Brother, Doctor"
              placeholderTextColor={theme.textSecondary}
              value={newContact.relation}
              onChangeText={(val) => setNewContact({ ...newContact, relation: val })}
            />

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Phone Number</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.inputBg, color: theme.textPrimary }]}
              placeholder="e.g. +91 98765 43210"
              placeholderTextColor={theme.textSecondary}
              keyboardType="phone-pad"
              value={newContact.phone}
              onChangeText={(val) => setNewContact({ ...newContact, phone: val })}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setIsContactModalVisible(false)}>
                <Text style={{ color: theme.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalSaveBtn, { backgroundColor: BRAND.red }]} onPress={handleAddContact}>
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Save Contact</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16 },

  profileHeader: { alignItems: 'center', marginBottom: 20 },
  avatarContainer: { position: 'relative', marginBottom: 10 },
  avatarWrapper: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 3,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: { width: '100%', height: '100%', borderRadius: 43 },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0A0F1A',
  },
  userName: { fontSize: 22, fontWeight: '700', marginBottom: 2 },
  userEmail: { fontSize: 13, fontWeight: '400' },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionBtnText: { fontSize: 13, fontWeight: '700' },

  vitalsCard: { flexDirection: 'row', borderRadius: 16, borderWidth: 1, paddingVertical: 16 },
  vitalItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  vitalBorderRight: { borderRightWidth: 1 },
  vitalValue: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  vitalLabel: { fontSize: 11, fontWeight: '500' },

  emptyBox: { padding: 18, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { marginTop: 6, fontSize: 12, textAlign: 'center' },

  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  deviceLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  deviceIconBg: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  deviceInfo: { flex: 1 },
  deviceName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  deviceStatus: { fontSize: 11, fontWeight: '600' },

  settingsGroup: { gap: 10, marginTop: 12 },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  settingTextContainer: { flex: 1, paddingRight: 10 },
  settingTitle: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  settingSub: { fontSize: 12 },

  contactsGroup: { gap: 10 },
  emergencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  emergencyLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  callIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  emergencyInfo: { flex: 1 },
  emergencyName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  emergencySub: { fontSize: 12 },
  contactActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  callButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteContactBtn: { padding: 6 },

  actionsContainer: { marginTop: 28 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
  },
  logoutBtnText: { fontSize: 14, fontWeight: '700' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalContent: { borderRadius: 20, borderWidth: 1, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  inputLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4, marginTop: 8 },
  modalInput: { height: 44, borderRadius: 10, paddingHorizontal: 12, fontSize: 14 },
  modalBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 20, gap: 12 },
  modalCancelBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  modalSaveBtn: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10 },
});