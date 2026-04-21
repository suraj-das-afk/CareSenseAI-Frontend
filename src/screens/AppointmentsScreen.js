import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  StatusBar,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { FontAwesome5 } from '@expo/vector-icons';
import { AppointmentsService } from '../services/AppointmentsService';
import { usePopup } from "../contexts/PopupContext";

export default function AppointmentsScreen({ navigation }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [activeTab, setActiveTab] = useState('upcoming');
  const { showPopup } = usePopup();

  useFocusEffect(
    React.useCallback(() => {
      loadAppointments();
    }, [])
  );

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const data = await AppointmentsService.getAppointments();
      setAppointments(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load appointments', e);
    } finally {
      setLoading(false);
    }
  };

const cancelAppointment = async (id) => {
  showPopup({
    type: "warning",
    title: "Cancel Appointment",
    message: "Are you sure you want to cancel this appointment?",
    confirmText: "Yes, Cancel",
    cancelText: "No",
    onConfirm: async () => {
      try {
        setActionLoadingId(id);

        await AppointmentsService.cancelAppointment(id);
        await loadAppointments();

        showPopup({
          type: "success",
          title: "Appointment Cancelled",
          message: "Your appointment has been cancelled successfully.",
          autoClose: true,
        });

      } catch (e) {
        showPopup({
          type: "error",
          title: "Failed",
          message: "Unable to cancel appointment. Please try again.",
        });
      } finally {
        setActionLoadingId(null);
      }
    },
  });
};
  const filteredAppointments = useMemo(() => {
    return appointments.filter(a => a.status === activeTab);
  }, [appointments, activeTab]);

  // ✅ FIXED renderAppointment FUNCTION
  const renderAppointment = ({ item }) => {
    const date = new Date(item.datetime);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.doctorName}>{item.doctor_name}</Text>

          <View style={styles.modeBadge}>
            <FontAwesome5
              name={item.mode === 'video' ? 'video' : 'hospital'}
              size={12}
              color="#2563EB"
            />
            <Text style={styles.modeText}>
              {item.mode === 'video' ? 'Video' : 'In Person'}
            </Text>
          </View>
        </View>

        <Text style={styles.specialization}>{item.specialization}</Text>

        <View style={styles.datetimeRow}>
          <FontAwesome5 name="calendar" size={14} color="#64748B" />
          <Text style={styles.datetimeText}>
            {date.toDateString()} •{' '}
            {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>

        {/* ✅ ACTIONS */}
        {item.status === 'upcoming' && (
          <View style={styles.actions}>

            {/* 🎥 JOIN VIDEO */}
            {item.mode === 'video' && item.video_link && (
              <TouchableOpacity
                style={[styles.primaryBtn, { marginRight: 10 }]}
                onPress={() => Linking.openURL(item.video_link)}
              >
                <Text style={styles.primaryText}>Join Video</Text>
              </TouchableOpacity>
            )}

            {/* ❌ CANCEL */}
            <TouchableOpacity
              style={styles.secondaryBtn}
              disabled={actionLoadingId === item.id}
              onPress={() => cancelAppointment(item.id)}
            >
              <Text style={styles.secondaryText}>
                {actionLoadingId === item.id ? 'Cancelling...' : 'Cancel'}
              </Text>
            </TouchableOpacity>

            {/* 🔁 RESCHEDULE */}
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() =>
                navigation.navigate('RescheduleAppointment', { appointment: item })
              }
            >
              <Text style={styles.primaryText}>Reschedule</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <FontAwesome5 name="arrow-left" size={18} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Appointments</Text>
        <View style={{ width: 18 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {['upcoming', 'completed', 'cancelled'].map(tab => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.activeTabText,
              ]}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredAppointments}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderAppointment}
        contentContainerStyle={{ padding: 16 }}
        refreshing={loading}
        onRefresh={loadAppointments}
        ListEmptyComponent={
          !loading && (
            <View style={styles.empty}>
              <FontAwesome5 name="calendar-times" size={36} color="#CBD5E1" />
              <Text style={styles.emptyText}>No appointments found</Text>
            </View>
          )
        }
      />

      {/* ➕ FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('BookAppointment')}
      >
        <FontAwesome5 name="plus" size={18} color="#FFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },


  fab: {
  position: 'absolute',
  bottom: 24,
  right: 24,
  backgroundColor: '#2563EB',
  padding: 16,
  borderRadius: 50,
  elevation: 6,
  shadowColor: '#000',
  shadowOpacity: 0.2,
  shadowRadius: 6,
},

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },

  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#2563EB' },
  tabText: { fontSize: 14, color: '#64748B', fontWeight: '600' },
  activeTabText: { color: '#2563EB' },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  doctorName: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  specialization: { marginTop: 4, color: '#64748B', fontSize: 13 },

  datetimeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  datetimeText: { marginLeft: 8, color: '#475569', fontSize: 13 },

  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  modeText: { marginLeft: 6, fontSize: 12, fontWeight: '600', color: '#2563EB' },

  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 },

  secondaryBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    marginRight: 10,
  },
  secondaryText: { color: '#475569', fontWeight: '600' },

  primaryBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#2563EB',
  },
  primaryText: { color: '#FFFFFF', fontWeight: '700' },

  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { marginTop: 12, color: '#64748B', fontWeight: '600' },
});
