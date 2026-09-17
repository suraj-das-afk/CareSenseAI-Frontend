import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
  Animated,
  RefreshControl,
  Pressable,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AuthContext } from '../context/AuthContext';
import { searchSymptoms, getRecords } from '../services/api';

const CATEGORIES = ['All', 'Symptoms', 'Doctors', 'Articles', 'Meds'];

// Reusable micro-interaction press wrapper
function AnimatedPressable({ children, onPress, style }) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();
  };

  return (
    <Pressable onPressIn={onPressIn} onPressOut={onPressOut} onPress={onPress}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

export default function SearchScreen({ navigation }) {
  const { user, isDarkMode } = useContext(AuthContext) || {};
  const isDark = !!isDarkMode;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Dynamic backend state
  const [articles, setArticles] = useState([]);
  const [specialists, setSpecialists] = useState([]);
  const [recentSearches, setRecentSearches] = useState([
    { id: '1', term: 'Headache remedies' },
    { id: '2', term: 'Dr. Patel Cardiology' },
    { id: '3', term: 'Vitamin D deficiency' },
    { id: '4', term: 'Blood pressure monitor' },
  ]);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Modern UI Palette
  const theme = {
    background: isDark ? '#080C14' : '#F8FAFC',
    card: isDark ? '#121826' : '#FFFFFF',
    border: isDark ? '#1E293B' : '#E2E8F0',
    textPrimary: isDark ? '#F8FAFC' : '#0F172A',
    textSecondary: isDark ? '#94A3B8' : '#64748B',
    textMuted: isDark ? '#64748B' : '#94A3B8',
    inputBg: isDark ? '#121826' : '#FFFFFF',
    accent: '#00D4C5',
    accentSoft: isDark ? 'rgba(0, 212, 197, 0.12)' : 'rgba(0, 212, 197, 0.08)',
    activeChipBg: '#00D4C5',
    activeChipText: '#0A0F1A',
    inactiveChipBg: isDark ? '#121826' : '#F1F5F9',
    inactiveChipText: isDark ? '#94A3B8' : '#475569',
  };

  const fetchLiveData = useCallback(async () => {
    try {
      await getRecords(user?.uid || 'guest');

      setArticles([
        {
          id: '1',
          title: 'Managing Seasonal Flu Symptoms',
          subtitle: 'Practical steps for rapid recovery and immune health.',
          readTime: '4 min read',
          category: 'Wellness',
          imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300',
        },
        {
          id: '2',
          title: 'Heart Health Tips for 2026',
          subtitle: 'Preventative cardiology advice from leading specialists.',
          readTime: '6 min read',
          category: 'Cardiology',
          imageUrl: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=300',
        },
        {
          id: '3',
          title: 'Optimizing Sleep Hygiene',
          subtitle: 'Science-backed techniques to achieve restorative rest.',
          readTime: '5 min read',
          category: 'Lifestyle',
          imageUrl: 'https://images.unsplash.com/photo-1511295742362-92c96b124e52?w=300',
        },
      ]);

      setSpecialists([
        { id: '1', specialty: 'Cardiology', doctorsCount: '12 Doctors', avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150' },
        { id: '2', specialty: 'Dermatology', doctorsCount: '8 Doctors', avatarUrl: 'https://images.unsplash.com/photo-1594824813566-7885a3977336?w=150' },
        { id: '3', specialty: 'Neurology', doctorsCount: '5 Doctors', avatarUrl: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150' },
        { id: '4', specialty: 'Dentistry', doctorsCount: '15 Doctors', avatarUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150' },
      ]);
    } catch (err) {
      console.log('Backend sync notice:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    fetchLiveData();
  }, [fetchLiveData]);

  useEffect(() => {
    if (!loading) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [loading, fadeAnim]);

  const handleSearchSubmit = async () => {
    if (!searchQuery.trim()) return;

    setRecentSearches(prev => [
      { id: Date.now().toString(), term: searchQuery.trim() },
      ...prev.filter(item => item.term.toLowerCase() !== searchQuery.trim().toLowerCase()),
    ]);

    try {
      await searchSymptoms(searchQuery);
    } catch (err) {
      console.log('Search query failed:', err);
    }
  };

  const handleRemoveSearch = (searchId) => {
    setRecentSearches(prev => prev.filter(item => item.id !== searchId));
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchLiveData();
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
      >
        {/* Screen Header */}
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Explore</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            Search conditions, doctors, and medical knowledge
          </Text>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchBarContainer, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
          <Ionicons name="search-outline" size={20} color={theme.textSecondary} style={{ marginRight: 10 }} />
          <TextInput
            style={[styles.searchInput, { color: theme.textPrimary }]}
            placeholder="Search symptoms, doctors, articles..."
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
            </Pressable>
          )}
        </View>

        {/* Filter Categories */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        >
          {CATEGORIES.map(cat => {
            const isActive = selectedCategory === cat;
            return (
              <AnimatedPressable
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isActive ? theme.activeChipBg : theme.inactiveChipBg,
                    borderColor: isActive ? theme.accent : theme.border,
                  },
                ]}
              >
                <Text style={[styles.chipText, { color: isActive ? theme.activeChipText : theme.inactiveChipText }]}>
                  {cat}
                </Text>
              </AnimatedPressable>
            );
          })}
        </ScrollView>

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={theme.accent} />
          </View>
        ) : (
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Trending Articles Section */}
            {(selectedCategory === 'All' || selectedCategory === 'Articles') && (
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Trending Articles</Text>
                  <Text style={[styles.sectionLink, { color: theme.accent }]}>See All</Text>
                </View>

                {articles.map(article => (
                  <AnimatedPressable
                    key={article.id}
                    onPress={() => navigation.navigate('HealthRecordDetail', { recordId: article.id })}
                    style={[styles.articleCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                  >
                    <Image source={{ uri: article.imageUrl }} style={styles.articleImage} />
                    <View style={styles.articleContent}>
                      <View style={styles.metaRow}>
                        <View style={[styles.categoryBadge, { backgroundColor: theme.accentSoft }]}>
                          <Text style={[styles.categoryBadgeText, { color: theme.accent }]}>{article.category}</Text>
                        </View>
                        <Text style={[styles.readTimeText, { color: theme.textMuted }]}>• {article.readTime}</Text>
                      </View>
                      <Text style={[styles.articleTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                        {article.title}
                      </Text>
                      <Text style={[styles.articleSubtitle, { color: theme.textSecondary }]} numberOfLines={2}>
                        {article.subtitle}
                      </Text>
                    </View>
                  </AnimatedPressable>
                ))}
              </View>
            )}

            {/* Popular Specialties Section (FIXED) */}
            {(selectedCategory === 'All' || selectedCategory === 'Doctors') && (
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Popular Specialties</Text>
                  <Text style={[styles.sectionLink, { color: theme.accent }]}>View All</Text>
                </View>

                <View style={styles.specialistsGrid}>
                  {specialists.map(doc => (
                    <AnimatedPressable
                      key={doc.id}
                      onPress={() => navigation.navigate('Doctors', { specialty: doc.specialty })}
                      style={[styles.specialistCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                    >
                      <Image source={{ uri: doc.avatarUrl }} style={styles.specialistAvatar} />
                      <Text style={[styles.specialistName, { color: theme.textPrimary }]} numberOfLines={1}>
                        {doc.specialty}
                      </Text>
                      <Text style={[styles.specialistCount, { color: theme.textMuted }]} numberOfLines={1}>
                        {doc.doctorsCount}
                      </Text>
                    </AnimatedPressable>
                  ))}
                </View>
              </View>
            )}

            {/* Recent Searches Section */}
            {recentSearches.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginBottom: 12 }]}>Recent Searches</Text>
                <View style={[styles.recentContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  {recentSearches.map((item, index) => (
                    <View
                      key={item.id}
                      style={[
                        styles.recentRow,
                        index !== recentSearches.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
                      ]}
                    >
                      <Pressable
                        style={styles.recentTextPressable}
                        onPress={() => {
                          setSearchQuery(item.term);
                          handleSearchSubmit();
                        }}
                      >
                        <Ionicons name="time-outline" size={18} color={theme.textMuted} style={{ marginRight: 12 }} />
                        <Text style={[styles.recentText, { color: theme.textPrimary }]}>{item.term}</Text>
                      </Pressable>
                      <Pressable onPress={() => handleRemoveSearch(item.id)} hitSlop={10} style={styles.deleteBtn}>
                        <Ionicons name="close" size={16} color={theme.textMuted} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  loaderContainer: {
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRow: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    marginTop: 4,
    lineHeight: 20,
  },
  searchBarContainer: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    height: '100%',
  },
  clearBtn: {
    padding: 4,
  },
  categoriesContainer: {
    gap: 10,
    paddingBottom: 24,
  },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: '600',
  },
  articleCard: {
    flexDirection: 'row',
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  articleImage: {
    width: 80,
    height: 80,
    borderRadius: 14,
    marginRight: 14,
  },
  articleContent: {
    flex: 1,
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 6,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  readTimeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  articleTitle: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 4,
  },
  articleSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },

  /* SPECIALITIES GRID STYLES */
  specialistsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  specialistCard: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  specialistAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 10,
  },
  specialistName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
    textAlign: 'center',
    width: '100%',
  },
  specialistCount: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    width: '100%',
  },

  recentContainer: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  recentTextPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  recentText: {
    fontSize: 14,
    fontWeight: '500',
  },
  deleteBtn: {
    padding: 4,
  },
});