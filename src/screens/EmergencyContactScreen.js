import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { PopupContext } from '../context/PopupContext';

const BRAND = {
  cyan: '#00D4C5',
  red: '#EF4444',
  darkBg: '#0A0F1A',
  darkCard: '#141C29',
  darkBorder: '#222E40',
  lightBg: '#F8F9FB',
  lightCard: '#FFFFFF',
  lightBorder: '#E2E8F0',
};

const getEmergencyContactsStorageKey = uid =>
  uid ? `@caresense_emergency_contacts_${uid}` : null;

const getTheme = isDark => ({
  background: isDark ? BRAND.darkBg : BRAND.lightBg,
  card: isDark ? BRAND.darkCard : BRAND.lightCard,
  border: isDark ? BRAND.darkBorder : BRAND.lightBorder,
  inputBg: isDark ? '#1C2738' : '#F1F5F9',
  textPrimary: isDark ? '#FFFFFF' : '#111827',
  textSecondary: isDark ? '#8897AE' : '#64748B',
  accent: BRAND.cyan,
});

export default function EmergencyContactScreen({ navigation }) {
  const auth = useContext(AuthContext) || {};
  const { showPopup } = useContext(PopupContext) || {};
  const { isDarkMode, profile, saveProfile, profileLoading } = auth;
  const theme = useMemo(() => getTheme(Boolean(isDarkMode)), [isDarkMode]);

  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', relation: '' });

  const [contacts, setContacts] = useState([]);
  const [editingContactId, setEditingContactId] = useState(null);
  const [contactsLoading, setContactsLoading] = useState(true);

  const userUid = auth.user?.uid || auth.user?.user?.uid || null;
  const contactsStorageKey = getEmergencyContactsStorageKey(userUid);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  const currentProfile = profile || {};
  const emergencyName = currentProfile.emergency_contact_name || '';
  const emergencyPhone = currentProfile.emergency_contact_phone || '';
  const emergencyRelation = currentProfile.emergency_contact_relation || '';

  useEffect(() => {
    setForm({
      name: emergencyName,
      phone: emergencyPhone,
      relation: emergencyRelation,
    });

    setContacts(previous => {
      const primary = emergencyName || emergencyPhone
        ? {
            id: 'primary',
            name: emergencyName,
            phone: emergencyPhone,
            relation: emergencyRelation || 'Emergency Contact',
            source: 'profile',
          }
        : null;

      const extras = previous.filter(item => item.id !== 'primary');

      return primary ? [primary, ...extras] : extras;
    });
  }, [emergencyName, emergencyPhone, emergencyRelation]);

  useEffect(() => {
    let active = true;

    const loadAdditionalContacts = async () => {
      if (!contactsStorageKey) {
        if (active) {
          setContactsLoading(false);
        }
        return;
      }

      try {
        const raw = await AsyncStorage.getItem(contactsStorageKey);
        const parsed = raw ? JSON.parse(raw) : [];
        const extras = Array.isArray(parsed)
          ? parsed.filter(item => item && item.id !== 'primary')
          : [];

        if (active) {
          setContacts(previous => {
            const primary = previous.find(item => item.id === 'primary');
            return primary ? [primary, ...extras] : extras;
          });
        }
      } catch (error) {
        console.warn('Emergency contact local storage load error:', error?.message || error);
        if (active) {
          showPopup?.(
            'Contacts',
            'Additional emergency contacts could not be loaded from this device.',
            'warning',
          );
        }
      } finally {
        if (active) {
          setContactsLoading(false);
        }
      }
    };

    void loadAdditionalContacts();

    return () => {
      active = false;
    };
  }, [contactsStorageKey, showPopup]);

  useFocusEffect(useCallback(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(16);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 320, useNativeDriver: true }),
    ]).start();
    return undefined;
  }, [fadeAnim, slideAnim]));

  useEffect(() => () => {
    fadeAnim.stopAnimation();
    slideAnim.stopAnimation();
  }, [fadeAnim, slideAnim]);

  const openEditor = contact => {
    if (contact?.id === 'primary') {
      setEditingContactId('primary');
      setForm({
        name: emergencyName,
        phone: emergencyPhone,
        relation: emergencyRelation,
      });
    } else {
      setEditingContactId(contact?.id || null);
      setForm({
        name: contact?.name || '',
        phone: contact?.phone || '',
        relation: contact?.relation || '',
      });
    }

    setModalVisible(true);
  };

  const persistAdditionalContacts = useCallback(async nextContacts => {
    if (!contactsStorageKey) {
      return;
    }

    const extras = nextContacts
      .filter(item => item.id !== 'primary')
      .map(item => ({
        id: item.id,
        name: item.name,
        phone: item.phone,
        relation: item.relation,
        source: 'device',
      }));

    await AsyncStorage.setItem(
      contactsStorageKey,
      JSON.stringify(extras),
    );
  }, [contactsStorageKey]);

  const saveContact = useCallback(async () => {
    const name = form.name.trim();
    const phone = form.phone.trim();
    const relation = form.relation.trim() || 'Emergency Contact';

    if (!name || !phone) {
      showPopup?.(
        'Missing information',
        'Please provide the emergency contact name and phone number.',
        'warning',
      );
      return;
    }

    try {
      setSaving(true);

      if (editingContactId === 'primary') {
        if (!saveProfile) {
          throw new Error('Your profile service is not available right now.');
        }

        await saveProfile({
          emergency_contact_name: name,
          emergency_contact_phone: phone,
          emergency_contact_relation: relation,
        });

        const nextContacts = contacts.map(contact =>
          contact.id === 'primary'
            ? {
                ...contact,
                name,
                phone,
                relation,
                source: 'profile',
              }
            : contact,
        );

        setContacts(nextContacts);
        await persistAdditionalContacts(nextContacts);

        setModalVisible(false);
        showPopup?.(
          'Contact updated',
          'Your primary emergency contact has been updated.',
          'success',
        );
        return;
      }

      const contactId =
        editingContactId ||
        `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const nextContact = {
        id: contactId,
        name,
        phone,
        relation,
        source: 'device',
      };

      setContacts(previous => {
        const withoutCurrent = previous.filter(
          item => item.id !== contactId,
        );

        const primary = withoutCurrent.find(
          item => item.id === 'primary',
        );

        const extras = withoutCurrent.filter(
          item => item.id !== 'primary',
        );

        return primary
          ? [primary, ...extras, nextContact]
          : [...extras, nextContact];
      });

      const nextContacts = contacts.some(
        item => item.id === contactId,
      )
        ? contacts.map(item =>
            item.id === contactId ? nextContact : item,
          )
        : [...contacts, nextContact];

      await persistAdditionalContacts(nextContacts);

      setModalVisible(false);
      showPopup?.(
        editingContactId
          ? 'Contact updated'
          : 'Contact added',
        editingContactId
          ? 'The emergency contact has been updated on this device.'
          : 'The additional emergency contact has been saved on this device.',
        'success',
      );
    } catch (error) {
      showPopup?.(
        'Unable to save',
        error?.message || 'The emergency contact could not be saved.',
        'error',
      );
    } finally {
      setSaving(false);
    }
  }, [
    contacts,
    editingContactId,
    form,
    persistAdditionalContacts,
    saveProfile,
    showPopup,
  ]);

  const handleDeleteAdditionalContact = useCallback(
    async contactId => {
      if (!contactId || contactId === 'primary') {
        return;
      }

      const target = contacts.find(
        item => item.id === contactId,
      );

      if (!target) {
        return;
      }

      const nextContacts = contacts.filter(
        item => item.id !== contactId,
      );

      setContacts(nextContacts);

      try {
        await persistAdditionalContacts(nextContacts);
        showPopup?.(
          'Contact removed',
          `${target.name}'s emergency contact was removed from this device.`,
          'success',
        );
      } catch (error) {
        setContacts(contacts);
        showPopup?.(
          'Unable to remove',
          'The additional contact could not be removed.',
          'error',
        );
      }
    },
    [contacts, persistAdditionalContacts, showPopup],
  );

  const callNumber = useCallback(async number => {
    if (!number) return;
    const phoneUrl = `tel:${number.replace(/[^0-9+]/g, '')}`;
    try {
      const canOpen = await Linking.canOpenURL(phoneUrl);
      if (canOpen) {
        await Linking.openURL(phoneUrl);
      } else {
        showPopup?.('Calling', 'Unable to open the phone application.', 'error');
      }
    } catch {
      showPopup?.('Calling', 'Unable to start the call.', 'error');
    }
  }, [showPopup]);

  const call112 = useCallback(async () => {
    try {
      const canOpen = await Linking.canOpenURL('tel:112');
      if (canOpen) {
        await Linking.openURL('tel:112');
      } else {
        showPopup?.('Emergency Call', 'Unable to open the phone application.', 'error');
      }
    } catch {
      showPopup?.('Emergency Call', 'Unable to start the emergency call.', 'error');
    }
  }, [showPopup]);

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
            style={[styles.headerButton, { backgroundColor: theme.inputBg, borderColor: theme.border }]}
          >
            <Ionicons name="arrow-back" size={22} color={theme.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={[styles.eyebrow, { color: theme.accent }]}>CARE & SAFETY</Text>
            <Text style={[styles.title, { color: theme.textPrimary }]}>Emergency contact</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Keep a trusted person ready for urgent situations and quick calling.</Text>
          </View>
        </View>

        <View style={[styles.heroCard, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
          <View style={[styles.heroIcon, { backgroundColor: theme.card }]}>
            <Ionicons name="shield-checkmark-outline" size={26} color={theme.accent} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={[styles.heroTitle, { color: theme.textPrimary }]}>Your emergency support</Text>
            <Text style={[styles.heroText, { color: theme.textSecondary }]}>This contact stays with your CareSense health profile.</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Emergency contacts</Text>

        <View style={styles.contactsHeaderRow}>
          <Text style={[styles.sectionHint, { color: theme.textSecondary }]}>
            Your primary contact syncs with your CareSense profile. Additional contacts are stored securely on this device.
          </Text>

          <TouchableOpacity
            onPress={() => openEditor(null)}
            activeOpacity={0.8}
            style={[styles.addButton, { backgroundColor: theme.accent }]}
          >
            <Ionicons name="person-add-outline" size={17} color="#0A0F1A" />
            <Text style={styles.addButtonText}>Add another</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {contactsLoading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="small" color={theme.accent} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                Loading emergency contacts...
              </Text>
            </View>
          ) : contacts.length ? (
            contacts.map((contact, index) => (
              <View
                key={contact.id}
                style={[
                  styles.contactItem,
                  index > 0 ? styles.contactItemDivider : null,
                  { borderColor: theme.border },
                ]}
              >
                <View style={[styles.contactIcon, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
                  <Ionicons name="person-outline" size={22} color={BRAND.red} />
                </View>

                <View style={styles.contactInfo}>
                  <View style={styles.contactTitleRow}>
                    <Text
                      style={[styles.contactName, { color: theme.textPrimary }]}
                      numberOfLines={1}
                    >
                      {contact.name}
                    </Text>

                    {contact.id === 'primary' ? (
                      <View style={[styles.primaryTag, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                        <Text style={[styles.primaryTagText, { color: theme.accent }]}>
                          Primary
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <Text
                    style={[styles.contactMeta, { color: theme.textSecondary }]}
                    numberOfLines={2}
                  >
                    {contact.phone}
                    {contact.relation ? ` • ${contact.relation}` : ''}
                  </Text>

                  {contact.source === 'device' ? (
                    <Text style={[styles.deviceSavedText, { color: theme.textSecondary }]}>
                      Saved on this device
                    </Text>
                  ) : null}

                  <View style={styles.itemActions}>
                    <TouchableOpacity
                      onPress={() => openEditor(contact)}
                      activeOpacity={0.8}
                      style={[styles.secondaryButtonSmall, { backgroundColor: theme.inputBg, borderColor: theme.border }]}
                    >
                      <Ionicons name="create-outline" size={16} color={theme.accent} />
                      <Text style={[styles.secondaryButtonTextSmall, { color: theme.textPrimary }]}>
                        Edit
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => callNumber(contact.phone)}
                      activeOpacity={0.8}
                      style={[styles.primaryButtonSmall, { backgroundColor: theme.accent }]}
                    >
                      <Ionicons name="call-outline" size={16} color="#0A0F1A" />
                      <Text style={styles.primaryButtonTextSmall}>Call</Text>
                    </TouchableOpacity>

                    {contact.id !== 'primary' ? (
                      <TouchableOpacity
                        onPress={() => void handleDeleteAdditionalContact(contact.id)}
                        activeOpacity={0.8}
                        style={[styles.deleteButtonSmall, { backgroundColor: 'rgba(239,68,68,0.08)' }]}
                      >
                        <Ionicons name="trash-outline" size={16} color={BRAND.red} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: theme.inputBg }]}>
                <Ionicons name="person-add-outline" size={25} color={theme.accent} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
                No emergency contacts added
              </Text>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                Add someone you trust so their details are available when you need them.
              </Text>
              <TouchableOpacity
                onPress={() => openEditor(null)}
                activeOpacity={0.8}
                style={[styles.primaryButton, { backgroundColor: theme.accent }]}
              >
                <Ionicons name="person-add-outline" size={18} color="#0A0F1A" />
                <Text style={styles.primaryButtonText}>Add emergency contact</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginTop: 24 }]}>National emergency service</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.contactTop}>
            <View style={[styles.contactIcon, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
              <Ionicons name="call-outline" size={24} color={BRAND.red} />
            </View>
            <View style={styles.contactInfo}>
              <Text style={[styles.contactName, { color: theme.textPrimary }]}>India Emergency Services</Text>
              <Text style={[styles.contactMeta, { color: theme.textSecondary }]}>Emergency number • 112</Text>
            </View>
          </View>
          <TouchableOpacity onPress={call112} activeOpacity={0.8} style={[styles.dangerButton, { borderColor: BRAND.red, backgroundColor: 'rgba(239,68,68,0.08)' }]}>
            <Ionicons name="call" size={18} color={BRAND.red} />
            <Text style={[styles.dangerButtonText, { color: BRAND.red }]}>Call 112</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.noteCard, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
          <Ionicons name="information-circle-outline" size={19} color={theme.accent} />
          <Text style={[styles.noteText, { color: theme.textSecondary }]}>CareSense is a decision-support application. For a life-threatening emergency, contact emergency services directly.</Text>
        </View>
      </Animated.ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!saving) {
            setModalVisible(false);
            setEditingContactId(null);
          }
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior="padding"
          keyboardVerticalOffset={0}
        >
          <StatusBar
            translucent={false}
            backgroundColor={theme.card}
            barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          />
          <SafeAreaView
            edges={['top', 'bottom']}
            style={[
              styles.modalSafeArea,
              {
                backgroundColor: theme.card,
              },
            ]}
          >
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
            >
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderCopy}>
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Emergency contact</Text>
                <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>Keep one trusted person available for urgent situations.</Text>
              </View>
              <TouchableOpacity
                disabled={saving}
                onPress={() => {
                  setModalVisible(false);
                  setEditingContactId(null);
                }} style={[styles.closeButton, { backgroundColor: theme.inputBg }]}>
                <Ionicons name="close" size={19} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              keyboardDismissMode="on-drag"
              contentContainerStyle={styles.modalScroll}
            >
              <Text style={[styles.label, { color: theme.textSecondary }]}>Contact name</Text>
              <TextInput
                value={form.name}
                onChangeText={name => setForm(previous => ({ ...previous, name }))}
                placeholder="e.g. Father or Mother"
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.textPrimary }]}
              />
              <Text style={[styles.label, { color: theme.textSecondary }]}>Phone number</Text>
              <TextInput
                value={form.phone}
                onChangeText={phone => setForm(previous => ({ ...previous, phone }))}
                placeholder="+91 12345 67890"
                placeholderTextColor={theme.textSecondary}
                keyboardType="phone-pad"
                style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.textPrimary }]}
              />
              <Text style={[styles.label, { color: theme.textSecondary }]}>Relationship</Text>
              <TextInput
                value={form.relation}
                onChangeText={relation => setForm(previous => ({ ...previous, relation }))}
                placeholder="e.g. Father, Mother, Spouse"
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.textPrimary }]}
              />

              <TouchableOpacity disabled={saving || profileLoading} onPress={() => void saveContact()} activeOpacity={0.82} style={[styles.saveButton, { backgroundColor: theme.accent, opacity: saving || profileLoading ? 0.65 : 1 }]}>
                {saving || profileLoading ? <ActivityIndicator color="#0A0F1A" /> : <Ionicons name="checkmark" size={18} color="#0A0F1A" />}
                <Text style={styles.saveButtonText}>
                   {saving || profileLoading
                     ? 'Saving…'
                     : editingContactId
                       ? 'Save changes'
                       : 'Add contact'}
                 </Text>
              </TouchableOpacity>
            </ScrollView>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 132 },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 22 },
  headerButton: { width: 48, height: 48, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 13 },
  headerCopy: { flex: 1 },
  eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 1.5, marginBottom: 5 },
  title: { fontSize: 31, lineHeight: 37, fontWeight: '800', letterSpacing: -0.7 },
  subtitle: { fontSize: 14, lineHeight: 21, marginTop: 6 },
  heroCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 20, padding: 15, marginBottom: 24 },
  heroIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  heroCopy: { flex: 1, marginLeft: 12 },
  heroTitle: { fontSize: 15.5, fontWeight: '800' },
  heroText: { marginTop: 3, fontSize: 12.5, lineHeight: 18 },
  sectionTitle: { fontSize: 23, fontWeight: '800', marginBottom: 10 },
  card: { borderWidth: 1, borderRadius: 20, padding: 16 },
  contactTop: { flexDirection: 'row', alignItems: 'center' },
  contactIcon: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  contactInfo: { flex: 1, marginLeft: 12, minWidth: 0 },
  contactName: { fontSize: 16, fontWeight: '800' },
  contactMeta: { fontSize: 12.5, lineHeight: 19, marginTop: 4 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  secondaryButton: { flex: 1, minHeight: 48, borderRadius: 14, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  secondaryButtonText: { fontSize: 14, fontWeight: '800' },
  primaryButton: { minHeight: 48, paddingHorizontal: 16, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryButtonText: { color: '#0A0F1A', fontSize: 14, fontWeight: '800' },
  emptyState: { alignItems: 'center', paddingVertical: 16 },
  emptyIcon: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '800', textAlign: 'center' },
  emptyText: { maxWidth: 300, marginTop: 5, fontSize: 12.5, lineHeight: 19, textAlign: 'center', marginBottom: 15 },
  dangerButton: { minHeight: 48, borderRadius: 14, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 },
  dangerButtonText: { fontSize: 14, fontWeight: '800' },
  noteCard: { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderRadius: 18, padding: 14, marginTop: 16 },
  contactsHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 },
  sectionHint: { flex: 1, fontSize: 11.5, lineHeight: 17 },
  addButton: { minHeight: 42, paddingHorizontal: 13, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  addButtonText: { color: '#0A0F1A', fontSize: 12, fontWeight: '800' },
  loadingState: { minHeight: 120, alignItems: 'center', justifyContent: 'center', gap: 9 },
  contactItem: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 7 },
  contactItemDivider: { borderTopWidth: 1, marginTop: 7, paddingTop: 15 },
  contactTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  primaryTag: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  primaryTagText: { fontSize: 9, fontWeight: '800' },
  deviceSavedText: { marginTop: 4, fontSize: 10, fontWeight: '600' },
  itemActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  secondaryButtonSmall: { minHeight: 38, paddingHorizontal: 11, borderRadius: 11, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  secondaryButtonTextSmall: { fontSize: 12, fontWeight: '800' },
  primaryButtonSmall: { minHeight: 38, paddingHorizontal: 12, borderRadius: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  primaryButtonTextSmall: { color: '#0A0F1A', fontSize: 12, fontWeight: '800' },
  deleteButtonSmall: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  noteText: { flex: 1, marginLeft: 10, fontSize: 12.5, lineHeight: 19 },
  modalOverlay: {
    flex: 1,
    width: '100%',
    backgroundColor: 'rgba(2, 6, 23, 0.58)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalSafeArea: {
    flex: 1,
    width: '100%',
  },

  modalCard: {
    flex: 1,
    width: '100%',
    height: '100%',
    alignSelf: 'stretch',
    borderRadius: 0,
    borderWidth: 0,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 28,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  modalHeaderCopy: { flex: 1, paddingRight: 10 },
  modalTitle: { fontSize: 22, fontWeight: '800' },
  modalSubtitle: { marginTop: 5, fontSize: 12.5, lineHeight: 18 },
  closeButton: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  modalScroll: { paddingBottom: 28 },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 7, marginTop: 12 },
  input: { minHeight: 50, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, fontSize: 14 },
  saveButton: { minHeight: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 20 },
  saveButtonText: { color: '#0A0F1A', fontSize: 15, fontWeight: '800' },
});
