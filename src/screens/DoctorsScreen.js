import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  useColorScheme,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { getDoctors } from '../services/api';

/* ============================================================
   THEME CONFIGURATION
============================================================ */

const BRAND = { 
  cyan: '#00D4C5', 
  cyanDark: '#00B3A6', 
  yellow: '#F59E0B',
  darkBg: '#090E17',
  darkCard: '#131C2A',
  darkBorder: '#1F2C3F',
  lightBg: '#F8FAF9',
  lightCard: '#FFFFFF',
  lightBorder: '#E2E8F0',
};

const getTheme = (isDark) => ({
  background: isDark ? BRAND.darkBg : BRAND.lightBg,
  card: isDark ? BRAND.darkCard : BRAND.lightCard,
  border: isDark ? BRAND.darkBorder : BRAND.lightBorder,
  textPrimary: isDark ? '#FFFFFF' : '#0F172A',
  textSecondary: isDark ? '#8292A6' : '#64748B',
  inputBg: isDark ? '#131C2A' : '#FFFFFF',
  accent: BRAND.cyan,
  chipSelectedBg: isDark ? '#0C272C' : '#E6FBF9',
  chipSelectedBorder: BRAND.cyan,
  chipUnselectedBg: isDark ? '#131C2A' : '#FFFFFF',
  bookBtnBg: BRAND.cyan,
  bookBtnText: '#090E17',
  mapFooterBg: isDark ? 'rgba(19, 28, 42, 0.94)' : 'rgba(255, 255, 255, 0.94)',
});

const CATEGORIES = ['Cardiologist', 'Primary Care', 'Dermatologist', 'Neurologist', 'Pediatrician'];

const INITIAL_DOCTORS = [
  {
    id: '1',
    name: 'Dr. Sarah Chen',
    specialty: 'Cardiologist',
    distance: '1.2 mi',
    rating: '4.9',
    nextSlot: 'Today 10:30 AM',
    avatar: 'https://i.pravatar.cc/150?img=32',
  },
  {
    id: '2',
    name: 'Dr. Marcus Vance',
    specialty: 'Dermatologist',
    distance: '2.4 mi',
    rating: '4.8',
    nextSlot: 'Tomorrow 2:00 PM',
    avatar: 'https://i.pravatar.cc/150?img=12',
  },
  {
    id: '3',
    name: 'Dr. Ananya Naidu',
    specialty: 'Primary Care',
    distance: '3.1 mi',
    rating: '4.7',
    nextSlot: 'Friday 9:00 AM',
    avatar: 'https://i.pravatar.cc/150?img=47',
  },
];

/* ============================================================
   MAIN COMPONENT
============================================================ */

export default function SearchScreen({ navigation }) {
  const isDark = useColorScheme() === 'dark';
  const theme = useMemo(() => getTheme(isDark), [isDark]);

  // Animated Entrance Effects
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  // Real-Time States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Cardiologist');
  const [doctors, setDoctors] = useState(INITIAL_DOCTORS);
  const [loading, setLoading] = useState(false);

  /* ==========================================================
     FETCH & REALTIME FILTER LOGIC
  ========================================================== */
  const fetchDoctorData = useCallback(async () => {
    try {
      const response = await getDoctors();
      if (response && Array.isArray(response) && response.length > 0) {
        setDoctors(response);
      }
    } catch (error) {
      console.log('Realtime Doctor Fetch Warning (using fallback):', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDoctorData();

      fadeAnim.setValue(0);
      slideAnim.setValue(16);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    }, [fetchDoctorData, fadeAnim, slideAnim])
  );

  const filteredDoctors = useMemo(() => {
    return doctors.filter(doc => {
      const matchesCategory =
        !selectedCategory || doc.specialty?.toLowerCase() === selectedCategory.toLowerCase();
      const matchesSearch =
        doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.specialty.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [doctors, selectedCategory, searchQuery]);

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <Animated.ScrollView
        style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        contentContainerStyle={[styles.content, { paddingBottom: 110 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ================= TOP HEADER ================= */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Find a Doctor</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Top medical professionals nearby
          </Text>
        </View>

        {/* ================= SEARCH & FILTER BAR ================= */}
        <View style={styles.searchRow}>
          <View style={[styles.searchInputContainer, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
            <Ionicons name="search" size={20} color={theme.textSecondary} style={styles.searchIcon} />
            <TextInput
              placeholder="Search specialties, clinics..."
              placeholderTextColor={theme.textSecondary}
              style={[styles.searchInput, { color: theme.textPrimary }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            activeOpacity={0.75}
            style={[styles.filterButton, { backgroundColor: theme.inputBg, borderColor: theme.border }]}
          >
            <Ionicons name="options-outline" size={20} color={theme.accent} />
          </TouchableOpacity>
        </View>

        {/* ================= CATEGORY CHIPS ================= */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        >
          {CATEGORIES.map(category => {
            const isSelected = selectedCategory === category;
            return (
              <TouchableOpacity
                key={category}
                activeOpacity={0.8}
                onPress={() => setSelectedCategory(isSelected ? '' : category)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected ? theme.chipSelectedBg : theme.chipUnselectedBg,
                    borderColor: isSelected ? theme.chipSelectedBorder : theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    {
                      color: isSelected ? theme.accent : theme.textSecondary,
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ================= MAP DISPLAY CARD ================= */}
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Doctors Near You</Text>
        <View style={[styles.mapCard, { borderColor: theme.border }]}>
          <Image
            source={{
              uri: isDark
                ? 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800&auto=format&fit=crop&q=60'
                : 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?w=800&auto=format&fit=crop&q=60',
            }}
            style={styles.mapImage}
            resizeMode="cover"
          />
          
          {/* Map Location Pins */}
          <View style={[styles.mapPin, { top: '22%', left: '26%' }]}>
            <Ionicons name="location" size={26} color={theme.accent} />
          </View>
          <View style={[styles.mapPin, { top: '38%', left: '52%' }]}>
            <Ionicons name="location" size={26} color={theme.accent} />
          </View>
          <View style={[styles.mapPin, { top: '24%', left: '76%' }]}>
            <Ionicons name="location" size={26} color={theme.accent} />
          </View>

          {/* Map Bottom Bar */}
          <View style={[styles.mapFooter, { backgroundColor: theme.mapFooterBg, borderColor: theme.border }]}>
            <Text style={[styles.mapFooterText, { color: theme.textSecondary }]}>
              Showing <Text style={{ color: theme.textPrimary, fontWeight: '700' }}>14 doctors</Text> within 5 miles
            </Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={[styles.expandMapText, { color: theme.accent }]}>Expand Map</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ================= TOP RATED SPECIALISTS ================= */}
        <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginTop: 24 }]}>
          Top Rated Specialists
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 24 }} />
        ) : filteredDoctors.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="search-outline" size={36} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No specialists match your search criteria.
            </Text>
          </View>
        ) : (
          filteredDoctors.map(doctor => (
            <View key={doctor.id} style={[styles.doctorCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.doctorMainRow}>
                <Image source={{ uri: doctor.avatar }} style={styles.avatar} />
                <View style={styles.doctorInfo}>
                  <Text style={[styles.doctorName, { color: theme.textPrimary }]}>{doctor.name}</Text>
                  <Text style={[styles.doctorMeta, { color: theme.textSecondary }]}>
                    {doctor.specialty} • {doctor.distance}
                  </Text>
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={14} color={BRAND.yellow} />
                    <Text style={[styles.ratingText, { color: theme.textPrimary }]}>{doctor.rating}</Text>
                  </View>
                </View>
              </View>

              <View style={[styles.cardBottomRow, { borderTopColor: theme.border }]}>
                <View>
                  <Text style={[styles.slotLabel, { color: theme.textSecondary }]}>Next Slot</Text>
                  <Text style={[styles.slotTime, { color: theme.accent }]}>{doctor.nextSlot}</Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.bookBtn, { backgroundColor: theme.bookBtnBg }]}
                  onPress={() => navigation?.navigate('DoctorDetail', { doctor })}
                >
                  <Text style={[styles.bookBtnText, { color: theme.bookBtnText }]}>Book</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
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
  content: { paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 12 : 8 },

  header: { marginBottom: 18 },
  title: { fontSize: 26, fontWeight: '700', letterSpacing: -0.3, marginBottom: 4 },
  subtitle: { fontSize: 14, fontWeight: '400' },

  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 15, height: '100%' },
  filterButton: {
    width: 50,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  categoriesContainer: { gap: 10, paddingBottom: 22 },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1.5,
  },
  chipText: { fontSize: 13 },

  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 14, letterSpacing: -0.2 },

  mapCard: {
    height: 180,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 8,
  },
  mapImage: { width: '100%', height: '100%', opacity: 0.75 },
  mapPin: { position: 'absolute' },
  mapFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  mapFooterText: { fontSize: 12 },
  expandMapText: { fontSize: 13, fontWeight: '700' },

  emptyCard: { padding: 32, alignItems: 'center', borderRadius: 16, borderWidth: 1 },
  emptyText: { marginTop: 10, fontSize: 14, textAlign: 'center' },

  doctorCard: { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 14 },
  doctorMainRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: { width: 54, height: 54, borderRadius: 27, marginRight: 14 },
  doctorInfo: { flex: 1 },
  doctorName: { fontSize: 17, fontWeight: '700', marginBottom: 3 },
  doctorMeta: { fontSize: 13, marginBottom: 5 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 13, fontWeight: '600' },

  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 14,
    borderTopWidth: 1,
  },
  slotLabel: { fontSize: 11, fontWeight: '500', marginBottom: 2 },
  slotTime: { fontSize: 14, fontWeight: '700' },
  bookBtn: { paddingHorizontal: 26, paddingVertical: 10, borderRadius: 12 },
  bookBtnText: { fontSize: 14, fontWeight: '700' },
});