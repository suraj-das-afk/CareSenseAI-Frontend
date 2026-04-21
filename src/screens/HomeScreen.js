import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { auth } from '../../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { HealthService } from '../services/HealthService';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const SlidingHealthTip = memo(() => {
  const tips = [
    'Drink at least 8 glasses of water a day 💧',
    'Take a 5-minute stretch break every hour 🧘‍♀️',
    'Get 7-8 hours of sleep for better focus 😴',
    'Eat more fresh fruits and veggies 🥦',
    'Take a short walk after meals 🚶‍♂️',
    'Wash your hands regularly to stay healthy 👐',
    'Practice deep breathing for 2 minutes 🫁',
    'Limit screen time before bed 🌙',
  ];

  const [index, setIndex] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const timeoutRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    const runCycle = () => {
      if (!mounted) return;

      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: -30,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (!mounted) return;

        setIndex((prev) => (prev + 1) % tips.length);
        translateX.setValue(60);
        opacity.setValue(0);

        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 400,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(translateX, {
            toValue: 0,
            duration: 520,
            easing: Easing.out(Easing.exp),
            useNativeDriver: true,
          }),
        ]).start(() => {
          if (!mounted) return;
          timeoutRef.current = setTimeout(runCycle, 6000);
        });
      });
    };

    timeoutRef.current = setTimeout(runCycle, 6000);

    return () => {
      mounted = false;
      clearTimeout(timeoutRef.current);
      opacity.stopAnimation();
      translateX.stopAnimation();
    };
  }, [opacity, translateX, tips.length]);

  return (
    <View style={styles.tipContainer}>
      <Animated.Text
        numberOfLines={3}
        style={[
          styles.tipsText,
          {
            opacity,
            transform: [{ translateX }],
          },
        ]}
      >
        {tips[index]}
      </Animated.Text>
    </View>
  );
});

export default function HomeScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const hasFetched = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setUserName(currentUser.displayName || currentUser.email || '');
        loadHealthRecords(currentUser);
      } else {
        setLoading(false);
      }
    });

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 400, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ])
    ).start();

    return unsubscribe;
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (records.length === 0) {
        loadHealthRecords();
      }
    }, [records.length])
  );

  const loadHealthRecords = async (currentUser = null) => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    setLoading(true);
    setError(null);

    try {
      const userToUse = currentUser || user || auth.currentUser;
      if (!userToUse) throw new Error('No user logged in.');

      const data = await HealthService.getHealthRecords();
      setRecords(Array.isArray(data) ? data.slice(0, 3) : []);
    } catch (err) {
      setError(err.message || 'Failed to load health records');
    } finally {
      setLoading(false);
    }
  };

  const AnimatedCard = memo(({ children, delay = 0, style }) => {
    const cardAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: 600,
        delay,
        useNativeDriver: true,
      }).start();
    }, []);

    return (
      <Animated.View
        style={[
          {
            opacity: cardAnim,
            transform: [
              {
                translateY: cardAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
              {
                scale: cardAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.95, 1],
                }),
              },
            ],
          },
          style,
        ]}
      >
        {children}
      </Animated.View>
    );
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFB' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFB" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.headerCard}>
            <View style={styles.headerTop}>
              <View style={styles.headerLeft}>
                <View style={styles.headerIconContainer}>
                  <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                    <FontAwesome5 name="heartbeat" size={32} color="#FF6B9D" />
                  </Animated.View>
                </View>
                <View style={styles.headerTextContainer}>
                  <Text style={styles.greeting}>Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}</Text>
                  <Text style={styles.title}>Welcome Back!</Text>
                  <Text style={styles.subtitle}>How are you feeling today?</Text>
                </View>
              </View>
            </View>
            <View style={styles.userContainer}>
              <View style={styles.userIconBadge}>
                <FontAwesome5 name="user-circle" size={20} color="#3B82F6" />
              </View>
              <Text style={styles.userName}>{userName}</Text>
              <View style={styles.verifiedBadge}>
                <FontAwesome5 name="check-circle" size={14} color="#10B981" />
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Quick Actions */}
        <AnimatedCard delay={200}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={[styles.quickAction, { backgroundColor: '#EFF6FF' }]} 
              onPress={() => navigation.navigate('Checker')}
              activeOpacity={0.7}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#3B82F6' }]}>
                <FontAwesome5 name="robot" size={26} color="#FFF" />
              </View>
              <Text style={styles.quickActionText}>Symptom Check</Text>
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.quickAction, { backgroundColor: '#F0FDF4' }]} 
              onPress={() => navigation.navigate('Doctors')}
              activeOpacity={0.7}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#10B981' }]}>
                <FontAwesome5 name="user-md" size={26} color="#FFF" />
              </View>
              <Text style={styles.quickActionText}>Find Doctor</Text>
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.quickAction, { backgroundColor: '#FFF7ED' }]}
              onPress={() => navigation.navigate("Appointments")}
              activeOpacity={0.7}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#F59E0B' }]}>
                <FontAwesome5 name="calendar-check" size={26} color="#FFF" />
              </View>
              <Text style={styles.quickActionText}>Appointments</Text>
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: '#F5F3FF' }]}
              onPress={() =>
                navigation.navigate("Medications", {
                  recordId: records[0]?.id,
                })
              }
              activeOpacity={0.7}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#8B5CF6' }]}>
                <FontAwesome5 name="pills" size={26} color="#FFF" />
              </View>
              <Text style={styles.quickActionText}>Medications</Text>
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            </TouchableOpacity>
          </View>
        </AnimatedCard>

        {/* Secure Health Records */}
        <AnimatedCard delay={300} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconBadge}>
              <FontAwesome5 name="shield-alt" size={20} color="#10B981" />
            </View>
            <Text style={styles.cardTitle}>Health Records</Text>
            <View style={styles.encryptedBadge}>
              <FontAwesome5 name="lock" size={10} color="#10B981" />
              <Text style={styles.encryptedText}>Encrypted</Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <View style={styles.loadingRing}>
                <ActivityIndicator size="large" color="#3B82F6" />
              </View>
              <Text style={styles.loadingText}>Securely loading your records...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <View style={styles.errorIcon}>
                <FontAwesome5 name="exclamation-triangle" size={40} color="#EF4444" />
              </View>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => loadHealthRecords()}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : records.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <FontAwesome5 name="folder-open" size={56} color="#3B82F6" />
              </View>
              <Text style={styles.emptyTitle}>No Records Yet</Text>
              <Text style={styles.noRecords}>Start your health journey by checking your symptoms with our AI assistant</Text>
              <TouchableOpacity 
                style={styles.emptyActionButton}
                onPress={() => navigation.navigate('Checker')}
              >
                <FontAwesome5 name="robot" size={16} color="#FFF" />
                <Text style={styles.emptyActionText}>Check Symptoms Now</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {records.slice(0, 3).map((record, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.recordItem}
                  onPress={() => navigation.navigate('HealthRecordDetail', { record })}
                  activeOpacity={0.7}
                >
                  <View style={styles.recordIconContainer}>
                    <FontAwesome5 name="file-medical-alt" size={22} color="#3B82F6" />
                  </View>
                  <View style={styles.recordContent}>
                    <Text style={styles.recordText}>{record.record_name || record.record_type || 'Health Record'}</Text>
                    <View style={styles.recordMetaContainer}>
                      <FontAwesome5 name="clock" size={11} color="#9CA3AF" />
                      <Text style={styles.recordDate}>
                        {new Date(record.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • {new Date(record.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.recordArrow}>
                    <FontAwesome5 name="chevron-right" size={16} color="#9CA3AF" />
                  </View>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => navigation.navigate('AllRecords')}
                activeOpacity={0.8}
              >
                <Text style={styles.viewAllText}>View All Records</Text>
                <FontAwesome5 name="arrow-right" size={14} color="#FFF" />
              </TouchableOpacity>
            </>
          )}
        </AnimatedCard>

        {/* Health Tip */}
        <AnimatedCard delay={400} style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <View style={styles.tipIconBadge}>
              <FontAwesome5 name="lightbulb" size={20} color="#F59E0B" />
            </View>
            <Text style={styles.tipsTitle}>Daily Health Tip</Text>
            <View style={styles.tipRefreshBadge}>
              <FontAwesome5 name="sync-alt" size={10} color="#F59E0B" />
            </View>
          </View>
          <SlidingHealthTip />
        </AnimatedCard>

        {/* Features */}
        <AnimatedCard delay={500} style={styles.featuresCard}>
          <View style={styles.featuresHeader}>
            <View style={styles.featureHeaderIcon}>
              <FontAwesome5 name="star" size={20} color="#3B82F6" />
            </View>
            <Text style={styles.featuresTitle}>Platform Features</Text>
            <View style={styles.versionBadge}>
              <Text style={styles.versionText}>v3.0</Text>
            </View>
          </View>
          {[
            { icon: 'robot', color: '#3B82F6', title: 'AI Symptom Checker', badge: 'LIVE', badgeColor: '#10B981' },
            { icon: 'video', color: '#10B981', title: 'Video Consultations', badge: 'LIVE', badgeColor: '#10B981' },
            { icon: 'prescription-bottle', color: '#F59E0B', title: 'Smart Prescription Manager', badge: 'LIVE', badgeColor: '#10B981' },
            { icon: 'chart-line', color: '#8B5CF6', title: 'Health Analytics Dashboard', badge: 'SOON', badgeColor: '#6B7280' },
          ].map((f, i) => (
            <View key={i} style={[styles.featureItem, i === 3 && { borderBottomWidth: 0 }]}>
              <View style={[styles.featureIconContainer, { backgroundColor: f.color + '15' }]}>
                <FontAwesome5 name={f.icon} size={22} color={f.color} />
              </View>
              <Text style={styles.featureText}>{f.title}</Text>
              <View style={[styles.featureBadge, { backgroundColor: f.badgeColor }]}>
                <Text style={styles.featureBadgeText}>{f.badge}</Text>
              </View>
            </View>
          ))}
        </AnimatedCard>

        {/* Footer Info */}
        <View style={styles.footerInfo}>
          <FontAwesome5 name="shield-alt" size={14} color="#10B981" />
          <Text style={styles.footerText}>Your health data is encrypted and secure</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8FAFB' 
  },

  // Header
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
  },
  headerCard: {
    backgroundColor: '#FFF',
    borderRadius: 28,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  headerTop: {
    marginBottom: 18,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTextContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: { 
    fontSize: 26, 
    fontWeight: '800', 
    color: '#111827',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: { 
    fontSize: 14, 
    color: '#6B7280', 
    fontWeight: '500',
    lineHeight: 20,
  },
  userContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  userIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  userName: { 
    fontSize: 15, 
    color: '#1E40AF', 
    fontWeight: '700',
    marginRight: 8,
  },
  verifiedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Section Title
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginHorizontal: 16,
    marginTop: 28,
    marginBottom: 16,
    letterSpacing: -0.5,
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 12,
  },
  quickAction: {
    width: (width - 36) / 2,
    padding: 20,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  quickActionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  quickActionText: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: '#111827', 
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.5,
  },

  // Card
  card: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: 28,
    padding: 24,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardHeader: { 
    flexDirection: 'row', 
    alignItems: 'center',
    marginBottom: 20,
  },
  cardIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitle: { 
    fontSize: 19, 
    fontWeight: '800', 
    color: '#111827',
    flex: 1,
    letterSpacing: -0.3,
  },
  encryptedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 5,
  },
  encryptedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },

  // Loading
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  loadingRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    borderWidth: 2,
    borderColor: '#DBEAFE',
  },
  loadingText: {
    marginTop: 8,
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },

  // Error
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    textAlign: 'center',
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 20,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
  },
  retryText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIconContainer: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#DBEAFE',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
  },
  noRecords: { 
    color: '#6B7280', 
    textAlign: 'center', 
    fontSize: 14,
    fontWeight: '500',
    paddingHorizontal: 32,
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 18,
    gap: 10,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyActionText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },

  // Record Item
  recordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  recordIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  recordContent: {
    flex: 1,
  },
  recordText: { 
    fontSize: 15, 
    fontWeight: '700', 
    color: '#111827', 
    textTransform: 'capitalize',
    marginBottom: 6,
  },
  recordMetaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recordDate: { 
    fontSize: 12, 
    color: '#9CA3AF',
    fontWeight: '500',
  },
  recordArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // View All Button
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 18,
    gap: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  viewAllText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // Health Tip Card
  tipsCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: 20,
    padding: 24,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  tipIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  tipsTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
    flex: 1,
  },
  tipRefreshBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipContainer: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 16,
    minHeight: 80,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  tipsText: {
    fontSize: 15,
    color: '#92400E',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Features Card
  featuresCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
    padding: 24,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  featuresHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  featureHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    flex: 1,
  },
  versionBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  versionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  featureIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  featureText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  featureBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  featureBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.5,
  },

  // Footer
  footerInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
    opacity: 0.6,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
});