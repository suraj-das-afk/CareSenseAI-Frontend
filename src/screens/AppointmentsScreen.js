import React, { useState, useEffect, useCallback, useContext, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AuthContext } from '../context/AuthContext';
import api from '../services/api';


const BRAND = {
  cyan: '#00D4C5',
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
  accent: BRAND.cyan,
  btnOutlineBg: isDark ? '#1C2738' : '#FFFFFF',
  btnOutlineBorder: isDark ? '#2D3C52' : '#E2E8F0',
  badgeBg: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
  badgeText: isDark ? '#8897AE' : '#64748B',
});

const generateWeekDays = () => {
  const days = [];
  const today = new Date();
  const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 1));

  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    days.push({
      fullDate: d.toISOString().split('T')[0],
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dateNumber: d.getDate(),
    });
  }
  return days;
};

// RELIABLE NATIVE-DRIVER ENTRANCE ANIMATION COMPONENT
function AnimatedItem({ children, delay = 0, index = 0, triggerKey }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    translateY.setValue(24);

    const animation = Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 380,
        delay: delay + index * 65,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        friction: 7,
        tension: 45,
        delay: delay + index * 65,
        useNativeDriver: true,
      }),
    ]);

    animation.start();

    return () => animation.stop();
  }, [triggerKey, delay, index]);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

export default function AppointmentsScreen({ navigation }) {
  const { isDarkMode, user } = useContext(AuthContext) || {};
  const theme = useMemo(() => getTheme(isDarkMode), [isDarkMode]);

  const weekDays = useMemo(() => generateWeekDays(), []);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [appointments, setAppointments] = useState([]);

  // FAB Entrance Animation
  const fabScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(fabScale, {
      toValue: 1,
      friction: 5,
      tension: 40,
      delay: 300,
      useNativeDriver: true,
    }).start();
  }, [fabScale]);

  const fetchAppointments = useCallback(async () => {
    try {
      const response = await api.get('appointments/', {
        params: {
          user_id: user?.uid || '',
        },
        timeout: 4000,
      });

      const data = response.data;
      setAppointments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Appointments Error:', error);
      setAppointments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAppointments();
  }, [fetchAppointments]);

  const upcomingAppointments = useMemo(() => {
    return appointments.filter(
      (item) => item.status === 'upcoming' || item.status === 'scheduled'
    );
  }, [appointments]);

  const pastAppointments = useMemo(() => {
    return appointments.filter((item) => item.status === 'completed');
  }, [appointments]);

  const hasNoAppointments = appointments.length === 0;

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <AnimatedItem delay={0} triggerKey="header">
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>My Appointments</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Manage your upcoming consults</Text>
        </View>
      </AnimatedItem>

      {/* HORIZONTAL CALENDAR STRIP */}
      <AnimatedItem delay={60} triggerKey="calendar">
        <View style={styles.daysRow}>
          {weekDays.map((item) => {
            const isSelected = item.fullDate === selectedDate;
            return (
              <TouchableOpacity
                key={item.fullDate}
                onPress={() => setSelectedDate(item.fullDate)}
                activeOpacity={0.7}
                style={[
                  styles.dayCard,
                  { backgroundColor: theme.card, borderColor: theme.border },
                  isSelected && { borderColor: theme.accent, backgroundColor: isDarkMode ? '#1A293B' : '#E6FAF8' },
                ]}
              >
                <Text style={[styles.dayText, { color: isSelected ? theme.accent : theme.textSecondary }]}>
                  {item.dayName}
                </Text>
                <Text style={[styles.dateText, { color: isSelected ? theme.accent : theme.textPrimary }]}>
                  {item.dateNumber}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </AnimatedItem>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />
        }
      >
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={theme.accent} />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading appointments...</Text>
          </View>
        ) : hasNoAppointments ? (
          <AnimatedItem delay={100} triggerKey={`empty-${selectedDate}`}>
            <View style={[styles.globalEmptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={[styles.iconCircle, { backgroundColor: theme.badgeBg }]}>
                <Ionicons name="calendar-outline" size={42} color={theme.accent} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No Bookings Found</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                You don't have any upcoming or past appointments scheduled.
              </Text>
              <TouchableOpacity
                style={[styles.bookNowBtn, { backgroundColor: theme.accent }]}
                onPress={() => navigation?.navigate('BookAppointment')}
                activeOpacity={0.8}
              >
                <Text style={styles.bookNowText}>Book an Appointment</Text>
              </TouchableOpacity>
            </View>
          </AnimatedItem>
        ) : (
          <>
            <AnimatedItem delay={100} triggerKey={`title-up-${selectedDate}`}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Upcoming appointments</Text>
            </AnimatedItem>

            {upcomingAppointments.length === 0 ? (
              <AnimatedItem delay={140} triggerKey={`empty-up-${selectedDate}`}>
                <View style={[styles.emptyBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                    No upcoming appointments for this date.
                  </Text>
                </View>
              </AnimatedItem>
            ) : (
              upcomingAppointments.map((item, index) => (
                <AnimatedItem
                  key={item.id || item._id || index}
                  index={index}
                  delay={120}
                  triggerKey={`card-up-${selectedDate}-${item.id || index}`}
                >
                  <View
                    style={[styles.appointmentCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                  >
                    <View style={styles.doctorInfoRow}>
                      <Image
                        source={{
                          uri: item.doctorAvatar || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150',
                        }}
                        style={styles.avatar}
                      />
                      <View style={styles.doctorText}>
                        <Text style={[styles.doctorName, { color: theme.textPrimary }]}>
                          {item.doctorName || 'Dr. Medical Specialist'}
                        </Text>
                        <Text style={[styles.doctorSub, { color: theme.textSecondary }]}>
                          {item.specialty || 'General Physician'} • {item.type || 'Video Call'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.timeRow}>
                      <Ionicons name="time-outline" size={16} color={theme.accent} style={{ marginRight: 6 }} />
                      <Text style={[styles.timeText, { color: theme.accent }]}>
                        {item.scheduledTime || 'Today, 10:30 AM'}
                      </Text>
                    </View>

                    <View style={styles.buttonRow}>
                      <TouchableOpacity
                        style={[
                          styles.btn,
                          { backgroundColor: theme.btnOutlineBg, borderColor: theme.btnOutlineBorder },
                        ]}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.btnOutlineText, { color: theme.textPrimary }]}>Reschedule</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.btn, { borderColor: theme.accent, borderWidth: 1 }]}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.btnAccentText, { color: theme.accent }]}>
                          {item.type === 'In-Person' ? 'Directions' : 'Join Call'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </AnimatedItem>
              ))
            )}

            <AnimatedItem delay={200} triggerKey={`title-past-${selectedDate}`}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginTop: 24 }]}>Past consults</Text>
            </AnimatedItem>

            {pastAppointments.length === 0 ? (
              <AnimatedItem delay={240} triggerKey={`empty-past-${selectedDate}`}>
                <View style={[styles.emptyBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No previous consult records.</Text>
                </View>
              </AnimatedItem>
            ) : (
              pastAppointments.map((item, index) => (
                <AnimatedItem
                  key={item.id || item._id || index}
                  index={index}
                  delay={220}
                  triggerKey={`card-past-${selectedDate}-${item.id || index}`}
                >
                  <View
                    style={[styles.pastCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                  >
                    <View>
                      <Text style={[styles.doctorName, { color: theme.textPrimary }]}>
                        {item.doctorName || 'Dr. Specialist'}
                      </Text>
                      <Text style={[styles.doctorSub, { color: theme.textSecondary, marginTop: 2 }]}>
                        {item.specialty || 'Consultant'} • {item.date || 'Completed'}
                      </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: theme.badgeBg }]}>
                      <Text style={[styles.badgeText, { color: theme.badgeText }]}>Completed</Text>
                    </View>
                  </View>
                </AnimatedItem>
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* FLOATING ACTION BUTTON */}
      <Animated.View style={[styles.fabWrapper, { transform: [{ scale: fabScale }] }]}>
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.accent }]}
          onPress={() => navigation?.navigate('BookAppointment')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color="#0A0F1A" />
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 16, marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 14 },

  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  dayCard: {
    width: 44,
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: { fontSize: 11, fontWeight: '500', marginBottom: 2 },
  dateText: { fontSize: 15, fontWeight: '700' },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 110 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },

  centerBox: { height: 250, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },

  globalEmptyCard: {
    marginTop: 20,
    padding: 28,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 19, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  bookNowBtn: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
  },
  bookNowText: { color: '#0A0F1A', fontWeight: '700', fontSize: 14 },

  emptyBox: { padding: 16, borderRadius: 14, borderWidth: 1, alignItems: 'center' },
  emptyText: { fontSize: 13, textAlign: 'center' },

  appointmentCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  doctorInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  doctorText: { flex: 1 },
  doctorName: { fontSize: 16, fontWeight: '700' },
  doctorSub: { fontSize: 13, marginTop: 2 },

  timeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  timeText: { fontSize: 13, fontWeight: '600' },

  buttonRow: { flexDirection: 'row', gap: 10 },
  btn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnOutlineText: { fontSize: 13, fontWeight: '600' },
  btnAccentText: { fontSize: 13, fontWeight: '700' },

  pastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: { fontSize: 11, fontWeight: '600' },

  fabWrapper: {
    position: 'absolute',
    bottom: 90,
    right: 20,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#00D4C5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
});