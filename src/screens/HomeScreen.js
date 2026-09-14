import React, { memo, useContext, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  useColorScheme,
  useWindowDimensions,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AuthContext } from '../context/AuthContext';
import { getRecords } from '../services/api'; // Ensure this endpoint returns the mixed data needed

/* ============================================================
   COLORS & THEMES
============================================================ */

const BRAND = { cyan: '#00D4C5', blue: '#2166F3', red: '#EF1023', yellow: '#F59E0B' };

const getTheme = (isDark) => ({
  background: isDark ? '#0A0F1A' : '#F8F9FB',
  card: isDark ? '#141C29' : '#FFFFFF',
  border: isDark ? '#222E40' : '#E2E8F0',
  textPrimary: isDark ? '#FFFFFF' : '#111827',
  textSecondary: isDark ? '#8897AE' : '#64748B',
  cyanAccent: BRAND.cyan,
  urgentBg: isDark ? '#2C1518' : '#FEE2E2',
  urgentText: isDark ? '#F87171' : '#DC2626',
  warningBg: isDark ? '#2B2313' : '#FEF3C7',
  warningText: isDark ? '#FBBF24' : '#D97706',
});

const TRIAGE_CONFIG = {
  EMERGENCY: { color: BRAND.red, label: 'Emergency' },
  URGENT: { color: BRAND.yellow, label: 'Urgent' },
  WARNING: { color: BRAND.yellow, label: 'Warning' },
  ROUTINE: { color: BRAND.cyan, label: 'Routine' },
};

const QUICK_ACTIONS = [
  { id: 'symptoms', label: 'Check\nSymptoms', icon: 'shield-checkmark-outline', hasAI: true, route: 'SymptomChecker' },
  { id: 'doctor', label: 'Find a\nDoctor', icon: 'search-outline', route: 'Doctors' },
  { id: 'records', label: 'My\nRecords', icon: 'folder-outline', route: 'AllRecords' },
  { id: 'meds', label: 'Medications', icon: 'medical-outline', route: 'Medication' },
];

/* ============================================================
   COMPONENTS
============================================================ */

const ActionCard = memo(({ action, theme, width, onPress }) => (
  <TouchableOpacity
    activeOpacity={0.8}
    onPress={() => onPress(action.route)}
    style={[
      styles.actionCard,
      {
        width: width,
        backgroundColor: action.hasAI ? (theme.background === '#0A0F1A' ? '#0F2930' : '#E6FBFA') : theme.card,
        borderColor: action.hasAI ? theme.cyanAccent : theme.border,
      },
    ]}
  >
    <View style={styles.actionIconRow}>
      <Ionicons name={action.icon} size={24} color={theme.cyanAccent} />
      {action.hasAI && (
        <View style={styles.aiBadge}>
          <Text style={styles.aiBadgeText}>AI</Text>
        </View>
      )}
    </View>
    <Text style={[styles.actionText, { color: theme.textPrimary }]}>{action.label}</Text>
  </TouchableOpacity>
));

/* ============================================================
   HOME SCREEN
============================================================ */

export default function HomeScreen({ navigation }) {
  const { user } = useContext(AuthContext) || {};
  const isDark = useColorScheme() === 'dark';
  const { width } = useWindowDimensions();
  const theme = useMemo(() => getTheme(isDark), [isDark]);

  // Smooth Animation Refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  // Real-Time States
  const [loading, setLoading] = useState(true);
  const [recentRecords, setRecentRecords] = useState([]);
  const [healthStats, setHealthStats] = useState([]);
  const [todaysSchedule, setTodaysSchedule] = useState([]);
  const [upcomingConsult, setUpcomingConsult] = useState(null);
  const [vitaSyncScore, setVitaSyncScore] = useState(82);

  // Responsive Grid
  const actionCardWidth = (width - 40 - 12) / 2;
  const displayName = user?.displayName || user?.name || user?.email?.split('@')[0] || 'Suraj';
  const avatarLetter = (displayName?.trim()?.charAt(0) || 'S').toUpperCase();

  /* ==========================================================
     FETCH REAL-TIME DASHBOARD DATA
  ========================================================== */
  const fetchDashboardData = useCallback(async () => {
    try {
      // setLoading(true); // Uncomment if you want skeleton loaders
      
      const data = await getRecords(user?.uid || 'anonymous');
      
      // 1. Parse Recent Logs
      let records = Array.isArray(data) ? data : (data?.records || data?.data || []);
      records = [...records].sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0)).slice(0, 3);
      setRecentRecords(records);

      // 2. Parse Health Stats (Replace with real API fields from your data object)
      setHealthStats(data?.healthStats || [
        { value: '72', label: 'Heart Rate', status: 'Normal' },
        { value: '120/80', label: 'BP', status: 'Optimal' },
        { value: '7h 23m', label: 'Sleep', status: 'Good' },
        { value: '8,432', label: 'Steps', status: 'Goal' },
      ]);

      // 3. Parse Schedule (Replace with real API fields)
      setTodaysSchedule(data?.schedule || [
        { id: '1', name: 'Lisinopril', dosage: '10mg', time: '08:00 AM', status: 'Taken' },
        { id: '2', name: 'Atorvastatin', dosage: '20mg', time: '09:30 AM', status: 'Taken' },
        { id: '3', name: 'Omega-3', dosage: '1000mg', time: '01:00 PM', status: 'Pending' },
      ]);

      // 4. Parse Upcoming Consult (Replace with real API fields)
      setUpcomingConsult(data?.upcomingConsult || {
        doctor: 'Dr. Sarah Chen',
        specialty: 'Cardiologist',
        time: 'tomorrow 10:30 AM',
        avatar: 'https://i.pravatar.cc/150?img=32'
      });

      setVitaSyncScore(data?.score || 82);

    } catch (error) {
      console.log('Dashboard Fetch Error:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  // Trigger animations & fetch on screen focus
  useFocusEffect(
    useCallback(() => {
      // 1. Fetch real data
      fetchDashboardData();

      // 2. Play smooth enter animation
      fadeAnim.setValue(0);
      slideAnim.setValue(15);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 450, useNativeDriver: true }),
      ]).start();
      
      return () => {
        // Optional: Reset animation states on unfocus
      };
    }, [fetchDashboardData, fadeAnim, slideAnim])
  );

  const openAction = useCallback(route => navigation.navigate(route), [navigation]);
  
  const getTriage = (record) => {
    const level = String(record?.triage_level || record?.severity || 'URGENT').toUpperCase();
    return TRIAGE_CONFIG[level] || TRIAGE_CONFIG.URGENT;
  };

  const getCondition = (record) => record?.condition || record?.log || 'Analysis complete';
  
  const getDate = (record) => {
    const date = new Date(record?.created_at || record?.time || Date.now());
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <Animated.ScrollView
        style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        contentContainerStyle={[styles.content, { paddingBottom: 130 }]}
        showsVerticalScrollIndicator={false}
      >
        
        {/* ================= HEADER ================= */}
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={[styles.greeting, { color: theme.textPrimary }]} numberOfLines={1}>
              Hello, {displayName} 👋
            </Text>
            <Text style={[styles.subGreeting, { color: theme.textSecondary }]}>
              How are you feeling today?
            </Text>
          </View>
          <View style={[styles.avatarCircle, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
            <Text style={[styles.avatarText, { color: theme.cyanAccent }]}>{avatarLetter}</Text>
          </View>
        </View>

        {/* ================= VITASYNC SCORE ================= */}
        <View style={[styles.vitaSyncCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.scoreCircle, { borderColor: theme.cyanAccent }]}>
            <Text style={[styles.scoreText, { color: theme.textPrimary }]}>{vitaSyncScore}</Text>
          </View>
          <View style={styles.vitaSyncInfo}>
            <Text style={[styles.vitaSyncTitle, { color: theme.textPrimary }]}>VitaSync Score</Text>
            <Text style={[styles.vitaSyncDesc, { color: theme.textSecondary }]}>
              Your health parameters are looking consistent this week.
            </Text>
          </View>
        </View>

        {/* ================= HEALTH STATS ================= */}
        <View style={styles.statsRow}>
          {healthStats.map((stat, idx) => (
            <View key={idx} style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.statValue, { color: theme.cyanAccent }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{stat.label}</Text>
              <Text style={[styles.statStatus, { color: theme.textSecondary }]}>{stat.status}</Text>
            </View>
          ))}
        </View>

        {/* ================= QUICK ACTIONS ================= */}
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          {QUICK_ACTIONS.map(action => (
            <ActionCard key={action.id} action={action} theme={theme} width={actionCardWidth} onPress={openAction} />
          ))}
        </View>

        {/* ================= UPCOMING CONSULT ================= */}
        {upcomingConsult && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginTop: 12 }]}>Upcoming Consult</Text>
            <View style={[styles.consultCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.consultTop}>
                <Image source={{ uri: upcomingConsult.avatar }} style={styles.doctorAvatar} />
                <View style={styles.doctorInfo}>
                  <Text style={[styles.doctorName, { color: theme.textPrimary }]}>{upcomingConsult.doctor}</Text>
                  <Text style={[styles.doctorSpecialty, { color: theme.textSecondary }]}>
                    {upcomingConsult.specialty} • {upcomingConsult.time}
                  </Text>
                </View>
              </View>
              <TouchableOpacity activeOpacity={0.8} style={[styles.joinButton, { backgroundColor: theme.cyanAccent }]}>
                <Text style={styles.joinButtonText}>Join Video Call</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ================= TODAY'S SCHEDULE ================= */}
        {todaysSchedule.length > 0 && (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginBottom: 0 }]}>Today's Schedule</Text>
              <TouchableOpacity onPress={() => openAction('Medication')}>
                <Text style={[styles.seeTimelineText, { color: theme.cyanAccent }]}>See timeline</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scheduleScroll}>
              {todaysSchedule.map((item, idx) => (
                <View key={item.id || idx} style={[styles.scheduleCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Text style={[styles.medName, { color: theme.textPrimary }]}>{item.name}</Text>
                  <Text style={[styles.medDosage, { color: theme.textSecondary }]}>{item.dosage} • {item.time}</Text>
                  <View style={[
                    styles.statusBadge, 
                    { backgroundColor: item.status === 'Taken' ? (isDark ? '#0F2930' : '#E6FBFA') : theme.background }
                  ]}>
                    <Text style={[
                      styles.statusText, 
                      { color: item.status === 'Taken' ? theme.cyanAccent : theme.textSecondary }
                    ]}>{item.status}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </>
        )}

        {/* ================= RECENT LOGS ================= */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginBottom: 0 }]}>Recent Logs</Text>
          {recentRecords.length > 0 && (
             <TouchableOpacity onPress={() => openAction('AllRecords')}>
               <Text style={[styles.seeTimelineText, { color: theme.cyanAccent }]}>See all</Text>
             </TouchableOpacity>
          )}
        </View>

        <View style={styles.logsContainer}>
          {loading ? (
            <ActivityIndicator size="large" color={theme.cyanAccent} style={{ marginTop: 20 }} />
          ) : recentRecords.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Ionicons name="pulse-outline" size={32} color={theme.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No recent activity found.</Text>
            </View>
          ) : (
            recentRecords.map((record, index) => {
              const tri = getTriage(record);
              const isUrgent = tri.label === 'Emergency' || tri.label === 'Urgent';
              return (
                <TouchableOpacity 
                  key={record?.id || index} 
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate('HealthRecordDetail', { result: record })}
                  style={[styles.logCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                >
                  <View style={styles.logLeft}>
                    <View style={[styles.logDot, { backgroundColor: tri.color }]} />
                    <View style={styles.logTextWrapper}>
                      <Text style={[styles.logTitle, { color: theme.textPrimary }]} numberOfLines={1}>{getCondition(record)}</Text>
                      <Text style={[styles.logTime, { color: theme.textSecondary }]}>{getDate(record)}</Text>
                    </View>
                  </View>
                  <View style={[styles.severityBadge, { backgroundColor: isUrgent ? theme.urgentBg : theme.warningBg }]}>
                    <Text style={[styles.severityText, { color: tri.color }]}>{tri.label}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

      </Animated.ScrollView>
    </SafeAreaView>
  );
}

/* ============================================================
   STYLES
============================================================ */

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16 },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  headerTextContainer: { flex: 1, paddingRight: 12 },
  greeting: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  subGreeting: { fontSize: 14, fontWeight: '400' },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: 'bold' },

  vitaSyncCard: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 16, borderWidth: 1, marginBottom: 20 },
  scoreCircle: { width: 68, height: 68, borderRadius: 34, borderWidth: 6, borderRightColor: 'transparent', borderBottomColor: 'transparent', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-45deg' }] },
  scoreText: { fontSize: 22, fontWeight: 'bold', transform: [{ rotate: '45deg' }] },
  vitaSyncInfo: { flex: 1, marginLeft: 16 },
  vitaSyncTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  vitaSyncDesc: { fontSize: 13, lineHeight: 18 },

  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 28 },
  statCard: { width: '23%', paddingVertical: 12, paddingHorizontal: 4, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  statLabel: { fontSize: 11, fontWeight: '500', marginBottom: 2 },
  statStatus: { fontSize: 10 },

  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },

  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  actionCard: { borderRadius: 14, borderWidth: 1, padding: 16, minHeight: 100, justifyContent: 'space-between' },
  actionIconRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  aiBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  aiBadgeText: { color: '#111827', fontSize: 10, fontWeight: 'bold' },
  actionText: { fontSize: 14, fontWeight: '600' },

  consultCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 28 },
  consultTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  doctorAvatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
  doctorInfo: { flex: 1 },
  doctorName: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  doctorSpecialty: { fontSize: 13 },
  joinButton: { width: '100%', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  joinButtonText: { color: '#0A0F1A', fontSize: 15, fontWeight: '700' },

  seeTimelineText: { fontSize: 14, fontWeight: '600' },
  scheduleScroll: { paddingBottom: 28, gap: 12 },
  scheduleCard: { width: 140, padding: 14, borderRadius: 14, borderWidth: 1 },
  medName: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  medDosage: { fontSize: 12, marginBottom: 12 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '600' },

  logsContainer: { gap: 12 },
  emptyCard: { alignItems: 'center', justifyContent: 'center', padding: 30, borderRadius: 14, borderWidth: 1 },
  emptyText: { fontSize: 14, textAlign: 'center', marginTop: 12 },
  logCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 14, borderWidth: 1 },
  logLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  logDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  logTextWrapper: { flex: 1, paddingRight: 10 },
  logTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  logTime: { fontSize: 12 },
  severityBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginLeft: 8 },
  severityText: { fontSize: 11, fontWeight: '700' },
});