import React, { useState, useEffect, useContext, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Animated,
  useColorScheme,
  Pressable,
  ScrollView,
  TextInput,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { getRecords, deleteRecord } from '../services/api';
import { AuthContext } from '../context/AuthContext';

/* ============================================================
   MICRO-INTERACTION PRESSABLE WRAPPER
============================================================ */
function AnimatedPressable({ children, onPress, onLongPress, style, disabled, hitSlop }) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    if (disabled) return;
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  };

  const onPressOut = () => {
    if (disabled) return;
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
  };

  return (
    <Pressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={disabled ? null : onPress}
      onLongPress={disabled ? null : onLongPress}
      hitSlop={hitSlop}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

const UNDO_TIMEOUT_MS = 4000;
const FILTERS = ['All', 'Emergency', 'Warning', 'Routine'];

/* ============================================================
   ENHANCED RECORD CARD
============================================================ */
const RecordCard = React.memo(({ record, onPress, onDelete, theme, isDark }) => {
  const TRIAGE_CONFIG = {
    EMERGENCY: { color: theme.danger, label: 'EMERGENCY', icon: 'alert-circle-outline' },
    WARNING: { color: theme.warning, label: 'WARNING', icon: 'warning-outline' },
    URGENT: { color: theme.warning, label: 'WARNING', icon: 'warning-outline' },
    ROUTINE: { color: theme.accent, label: 'ROUTINE', icon: 'checkmark-circle-outline' },
  };

  const triageLevel = String(record?.triage_level || 'ROUTINE').toUpperCase();
  const triage = TRIAGE_CONFIG[triageLevel] || TRIAGE_CONFIG.ROUTINE;

  const dateObject = new Date(record?.created_at || Date.now());
  const dateStr = dateObject.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const timeStr = dateObject.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const title = record?.ai_summary?.split('.')[0]?.trim() || record?.disease_name || 'Health Assessment';
  
  // Safe symptoms string conversion
  const symptomsRaw = record?.symptoms;
  const symptomsText = typeof symptomsRaw === 'string'
    ? symptomsRaw
    : Array.isArray(symptomsRaw) && symptomsRaw.length > 0
      ? symptomsRaw.join(', ')
      : 'No symptoms recorded';

  return (
    <AnimatedPressable
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: isDark ? theme.border : `${triage.color}40`,
        },
      ]}
      onPress={onPress}
      onLongPress={onDelete}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.badge, { backgroundColor: `${triage.color}15` }]}>
          <Ionicons name={triage.icon} size={12} color={triage.color} style={{ marginRight: 4 }} />
          <Text style={[styles.badgeText, { color: triage.color }]}>{triage.label}</Text>
        </View>

        <Text style={[styles.dateText, { color: theme.textSecondary }]}>
          {dateStr} • {timeStr}
        </Text>
      </View>

      <Text style={[styles.cardTitle, { color: theme.textPrimary }]} numberOfLines={1}>
        {title}
      </Text>

      <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]} numberOfLines={2}>
        {symptomsText}
      </Text>
    </AnimatedPressable>
  );
});

/* ============================================================
   MAIN SCREEN COMPONENT
============================================================ */
export default function AllRecordsScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const isDark = useColorScheme() === 'dark';
  const insets = useSafeAreaInsets();

  const theme = useMemo(() => ({
    background: isDark ? '#0A0B0E' : '#F8FAFC',
    card: isDark ? '#12141C' : '#FFFFFF',
    border: isDark ? '#1E2330' : '#E2E8F0',
    textPrimary: isDark ? '#F8FAFC' : '#0F172A',
    textSecondary: isDark ? '#94A3B8' : '#64748B',
    accent: '#00D4C5',
    danger: '#FF453A',
    warning: '#FF9F0A',
    pillInactive: isDark ? '#161922' : '#FFFFFF',
    pillBorder: isDark ? '#232836' : '#E2E8F0',
  }), [isDark]);

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  const countdownRef = useRef(null);
  const searchInputRef = useRef(null);

  const fetchRecords = useCallback(async () => {
    try {
      const data = await getRecords(user?.uid || 'anonymous');
      let result = Array.isArray(data) ? data : data?.records || data?.data || [];
      result = [...result].sort((a, b) => new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime());

      const mockEnhanced = result.map((r, i) => ({
        ...r,
        triage_level: r.triage_level || (i % 3 === 0 ? 'EMERGENCY' : i % 2 === 0 ? 'WARNING' : 'ROUTINE')
      }));

      setRecords(mockEnhanced);
    } catch (err) {
      console.log('Error fetching records:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRecords();
    const unsubscribe = navigation.addListener('focus', fetchRecords);
    return unsubscribe;
  }, [fetchRecords, navigation]);

  // Dynamic filter and safe search matching
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const matchesFilter =
        activeFilter === 'All' ? true :
        String(r.triage_level).toUpperCase() === activeFilter.toUpperCase();

      const title = (r?.ai_summary || r?.disease_name || '').toLowerCase();
      
      const symptomsRaw = r?.symptoms;
      const symptomsStr = typeof symptomsRaw === 'string'
        ? symptomsRaw
        : Array.isArray(symptomsRaw)
          ? symptomsRaw.join(' ')
          : '';

      const symptoms = symptomsStr.toLowerCase();
      const query = searchQuery.toLowerCase().trim();

      const matchesSearch = !query || title.includes(query) || symptoms.includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [records, activeFilter, searchQuery]);

  const commitDelete = useCallback(async (record) => {
    try { await deleteRecord(record.id); }
    catch (err) { setRecords((prev) => [record, ...prev]); }
  }, []);

  const handleDelete = useCallback((record) => {
    if (pendingDelete) {
      clearInterval(countdownRef.current);
      commitDelete(pendingDelete.record);
    }

    setRecords((prev) => prev.filter((item) => item.id !== record.id));
    setPendingDelete({ record });

    countdownRef.current = setTimeout(() => {
      commitDelete(record);
      setPendingDelete(null);
    }, UNDO_TIMEOUT_MS);
  }, [pendingDelete, commitDelete]);

  const handleUndo = useCallback(() => {
    if (!pendingDelete) return;
    clearTimeout(countdownRef.current);
    setRecords((prev) => [pendingDelete.record, ...prev].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    setPendingDelete(null);
  }, [pendingDelete]);

  const toggleSearch = () => {
    if (isSearching) {
      setSearchQuery('');
      setIsSearching(false);
    } else {
      setIsSearching(true);
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  };

  if (loading) {
    return (
      <View style={[styles.safeArea, styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />

      {/* Modern Integrated Header */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: theme.background }}>
        <View style={[styles.headerWrapper, { borderBottomColor: theme.border }]}>
          <View style={styles.topRow}>
            <AnimatedPressable
              hitSlop={10}
              onPress={() => navigation.goBack()}
              style={[styles.iconBtn, { backgroundColor: theme.pillInactive, borderColor: theme.pillBorder }]}
            >
              <Ionicons name="chevron-back" size={20} color={theme.textPrimary} />
            </AnimatedPressable>

            {isSearching ? (
              <View style={[styles.searchBar, { backgroundColor: theme.pillInactive, borderColor: theme.accent }]}>
                <Ionicons name="search-outline" size={16} color={theme.textSecondary} />
                <TextInput
                  ref={searchInputRef}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search diagnoses or symptoms..."
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.searchInput, { color: theme.textPrimary }]}
                />
                {searchQuery.length > 0 && (
                  <AnimatedPressable onPress={() => setSearchQuery('')} hitSlop={8}>
                    <Ionicons name="close-circle" size={16} color={theme.textSecondary} />
                  </AnimatedPressable>
                )}
              </View>
            ) : (
              <View style={styles.titleContainer}>
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>My Records</Text>
                <View style={[styles.liveBadge, { backgroundColor: `${theme.accent}15` }]}>
                  <View style={[styles.badgeDot, { backgroundColor: theme.accent }]} />
                  <Text style={[styles.liveBadgeText, { color: theme.accent }]}>{records.length}</Text>
                </View>
              </View>
            )}

            <AnimatedPressable
              hitSlop={10}
              onPress={toggleSearch}
              style={[styles.iconBtn, { backgroundColor: theme.pillInactive, borderColor: theme.pillBorder }]}
            >
              <Ionicons name={isSearching ? 'close' : 'search-outline'} size={18} color={theme.textPrimary} />
            </AnimatedPressable>
          </View>

          {/* Filter Pills */}
          <View style={styles.filterWrapper}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
              {FILTERS.map((f) => {
                const isActive = activeFilter === f;
                return (
                  <AnimatedPressable
                    key={f}
                    onPress={() => setActiveFilter(f)}
                    style={[
                      styles.filterPill,
                      {
                        backgroundColor: isActive ? theme.accent : theme.pillInactive,
                        borderColor: isActive ? theme.accent : theme.pillBorder,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        {
                          color: isActive ? '#000000' : theme.textSecondary,
                          fontWeight: isActive ? '700' : '500',
                        },
                      ]}
                    >
                      {f}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </SafeAreaView>

      {/* Record List */}
      <FlatList
        data={filteredRecords}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: pendingDelete ? insets.bottom + 90 : insets.bottom + 80 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchRecords(); }}
            tintColor={theme.accent}
          />
        }
        renderItem={({ item }) => (
          <RecordCard
            record={item}
            theme={theme}
            isDark={isDark}
            onPress={() => navigation.navigate('HealthRecordDetail', { result: item })}
            onDelete={() => handleDelete(item)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="folder-open-outline" size={48} color={theme.textSecondary} />
            <Text style={[styles.emptyTitle, { color: theme.textSecondary }]}>No matching health records found</Text>
          </View>
        }
      />

      {/* Undo Delete Notification */}
      {pendingDelete && (
        <Animated.View style={[styles.toast, { backgroundColor: theme.card, borderColor: theme.border, bottom: insets.bottom + 20 }]}>
          <Text style={[styles.toastText, { color: theme.textPrimary }]}>Record removed</Text>
          <AnimatedPressable onPress={handleUndo} style={styles.undoBtn}>
            <Text style={[styles.undoText, { color: theme.accent }]}>Undo</Text>
          </AnimatedPressable>
        </Animated.View>
      )}

      {/* Create New Record FAB */}
      <AnimatedPressable
        style={[styles.fab, { backgroundColor: theme.accent, bottom: insets.bottom + 20 }]}
        onPress={() => navigation.navigate('SymptomChecker')}
      >
        <Ionicons name="add" size={30} color="#000000" />
      </AnimatedPressable>
    </View>
  );
}

/* ============================================================
   STYLESHEET
============================================================ */
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerWrapper: {
    paddingTop: 6,
    borderBottomWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
    height: 40,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 5,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    padding: 0,
  },
  filterWrapper: {
    height: 38,
    marginBottom: 10,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterPillText: {
    fontSize: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '500',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    width: '90%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  toastText: { fontSize: 14, fontWeight: '600' },
  undoBtn: { paddingVertical: 2, paddingHorizontal: 6 },
  undoText: { fontSize: 14, fontWeight: '700' },
  fab: {
    position: 'absolute',
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00D4C5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyTitle: { marginTop: 12, fontSize: 15, fontWeight: '500' },
});