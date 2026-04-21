// src/screens/SearchScreen.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Animated,
  Keyboard,
  Platform,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';

export default function SearchScreen() {
  const [searchText, setSearchText] = useState('');
  const [focused, setFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const headerScale = useRef(new Animated.Value(1)).current;
  const searchElev = useRef(new Animated.Value(0)).current;
  const contentFade = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const categories = [
    { name: 'Doctors', icon: 'user-md', color: '#4A90E2' },
    { name: 'Hospitals', icon: 'hospital', color: '#52C17C' },
    { name: 'Symptoms', icon: 'heartbeat', color: '#FF6B9D' },
    { name: 'Labs', icon: 'flask', color: '#FF9500' },
    { name: 'Prescriptions', icon: 'pills', color: '#9B59B6' },
    { name: 'Wellness', icon: 'leaf', color: '#4A90E2' },
  ];

  useEffect(() => {
    loadRecentSearches();
    
    // Pulse animation for search icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // animate when focus changes
  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerScale, {
        toValue: focused ? 0.92 : 1,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(searchElev, {
        toValue: focused ? 10 : 0,
        duration: 260,
        useNativeDriver: false,
      }),
      Animated.timing(contentFade, {
        toValue: focused ? 1 : 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [focused]);

  const loadRecentSearches = async () => {
    try {
      const stored = await AsyncStorage.getItem('recentSearches');
      if (stored) setRecentSearches(JSON.parse(stored));
    } catch (err) {
      console.warn('Failed loading recent searches', err);
    }
  };

  const saveSearch = async (query) => {
    if (!query || !query.trim()) return;
    const filtered = recentSearches.filter((s) => s !== query);
    const updated = [query, ...filtered].slice(0, 8);
    setRecentSearches(updated);
    try {
      await AsyncStorage.setItem('recentSearches', JSON.stringify(updated));
    } catch (err) {
      console.warn('Failed saving recent search', err);
    }
  };

  const clearRecent = async () => {
    try {
      await AsyncStorage.removeItem('recentSearches');
      setRecentSearches([]);
    } catch (err) {
      console.warn('Failed clearing recent searches', err);
    }
  };

  const onFocus = () => {
    setFocused(true);
    setShowSuggestions(true);
  };

  const onBlur = () => {
    if (!searchText.trim()) {
      setFocused(false);
      setShowSuggestions(false);
    }
  };

  const onSubmit = () => {
    if (!searchText.trim()) return;
    saveSearch(searchText.trim());
    Keyboard.dismiss();
    setFocused(false);
    setShowSuggestions(false);
  };

  const handleCategoryPress = (cat) => {
    setSearchText(cat);
    saveSearch(cat);
    Keyboard.dismiss();
    setFocused(false);
    setShowSuggestions(false);
  };

  const renderCategories = () => (
    <View style={styles.categoryWrapper}>
      {categories.map((c, index) => (
        <TouchableOpacity
          key={c.name}
          style={styles.categoryCard}
          activeOpacity={0.85}
          onPress={() => handleCategoryPress(c.name)}
        >
          <View style={[styles.categoryIconContainer, { backgroundColor: c.color + '15' }]}>
            <FontAwesome5 name={c.icon} size={20} color={c.color} />
          </View>
          <View style={styles.categoryInfo}>
            <Text style={styles.categoryLabel}>{c.name}</Text>
            <FontAwesome5 name="chevron-right" size={12} color="#C0C0C0" />
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderRecent = () => {
    if (recentSearches.length === 0) {
      return (
        <View style={styles.placeholderBox}>
          <View style={styles.placeholderHeader}>
            <View style={styles.placeholderIconBadge}>
              <FontAwesome5 name="lightbulb" size={16} color="#FF9500" />
            </View>
            <Text style={styles.placeholderTitle}>Try searching for</Text>
          </View>
          <View style={styles.suggestionRow}>
            {['Flu symptoms', 'Cardiologist', 'Blood test', 'Cough'].map((s, idx) => {
              const colors = ['#4A90E2', '#52C17C', '#FF6B9D', '#9B59B6'];
              return (
                <TouchableOpacity
                  key={s}
                  style={[styles.suggestionChip, { borderColor: colors[idx] }]}
                  onPress={() => {
                    setSearchText(s);
                    saveSearch(s);
                    setFocused(false);
                    setShowSuggestions(false);
                  }}
                >
                  <Text style={[styles.suggestionText, { color: colors[idx] }]}>{s}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      );
    }

    return (
      <>
        <View style={styles.recentHeader}>
          <View style={styles.recentHeaderLeft}>
            <View style={styles.recentIconBadge}>
              <FontAwesome5 name="history" size={14} color="#4A90E2" />
            </View>
            <Text style={styles.sectionTitle}>Recent Searches</Text>
          </View>
          <TouchableOpacity style={styles.clearButton} onPress={clearRecent}>
            <Text style={styles.clearText}>Clear All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.recentList}>
          {recentSearches.map((item, idx) => (
            <TouchableOpacity
              key={`${item}-${idx}`}
              style={styles.recentRow}
              onPress={() => {
                setSearchText(item);
                setShowSuggestions(false);
                setFocused(false);
              }}
            >
              <View style={styles.recentLeft}>
                <View style={styles.recentItemIcon}>
                  <FontAwesome5 name="search" size={12} color="#6B7A8A" />
                </View>
                <Text style={styles.recentText}>{item}</Text>
              </View>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={async () => {
                  const newList = recentSearches.filter((s) => s !== item);
                  setRecentSearches(newList);
                  await AsyncStorage.setItem('recentSearches', JSON.stringify(newList));
                }}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <FontAwesome5 name="times" size={14} color="#C0C0C0" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>
      </>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F8FC" />
      
      {/* Modern Header Card */}
      <Animated.View style={[styles.headerCard, { transform: [{ scale: headerScale }] }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerLabel}>HEALTH SEARCH</Text>
            <Text style={styles.title}>Find Anything</Text>
            <Text style={styles.subtitle}>Doctors, hospitals, and health info</Text>
          </View>
          <Animated.View 
            style={[
              styles.headerIconContainer,
              { transform: [{ scale: pulseAnim }] }
            ]}
          >
            <View style={styles.iconRing1} />
            <View style={styles.iconRing2} />
            <View style={styles.iconCore}>
              <FontAwesome5 name="search" size={24} color="#FFFFFF" />
            </View>
          </Animated.View>
        </View>
      </Animated.View>

      {/* Enhanced Search Box */}
      <Animated.View
        style={[
          styles.searchBox,
          {
            shadowOpacity: searchElev.interpolate({
              inputRange: [0, 10],
              outputRange: [0.06, 0.18],
            }),
            elevation: focused ? 6 : 2,
            transform: [{ translateY: focused ? -6 : 0 }],
          },
        ]}
      >
        <View style={styles.searchIconContainer}>
          <FontAwesome5 name="search" size={16} color="#4A90E2" />
        </View>
        <TextInput
          style={styles.searchInput}
          placeholder="Search for doctors, symptoms, hospitals..."
          placeholderTextColor="#A9A9A9"
          value={searchText}
          onChangeText={(t) => {
            setSearchText(t);
            if (t.trim()) {
              setShowSuggestions(true);
              setFocused(true);
            } else {
              if (!focused) setShowSuggestions(false);
            }
          }}
          onFocus={onFocus}
          onBlur={onBlur}
          returnKeyType="search"
          onSubmitEditing={onSubmit}
        />
        {searchText.length > 0 ? (
          <TouchableOpacity
            style={styles.clearInputButton}
            onPress={() => {
              setSearchText('');
              setShowSuggestions(true);
              setFocused(true);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <FontAwesome5 name="times-circle" size={18} color="#C0C0C0" />
          </TouchableOpacity>
        ) : null}
      </Animated.View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
      >
        {showSuggestions ? (
          <Animated.View style={[styles.suggestions, { opacity: contentFade }]}>
            {renderRecent()}
          </Animated.View>
        ) : (
          <View style={styles.defaultArea}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <View style={styles.sectionIconBadge}>
                  <FontAwesome5 name="th-large" size={14} color="#4A90E2" />
                </View>
                <Text style={styles.sectionTitle}>Quick Categories</Text>
              </View>
            </View>
            {renderCategories()}
            
            <View style={styles.hintBox}>
              <View style={styles.hintHeader}>
                <View style={styles.hintIconBadge}>
                  <FontAwesome5 name="info-circle" size={14} color="#52C17C" />
                </View>
                <Text style={styles.hintTitle}>Quick tips</Text>
              </View>
              <Text style={styles.hintText}>Tap a category to auto-fill the search and save it to recents.</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F8FC' },
  
  // Modern Header Card
  headerCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
    borderRadius: 24,
    padding: 20,
    elevation: 6,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: '#E8F2FF',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
    paddingRight: 12,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4A90E2',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: { 
    fontSize: 24, 
    fontWeight: '800', 
    color: '#0F2340',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: { 
    fontSize: 13, 
    color: '#6B7A8A',
    lineHeight: 18,
  },
  headerIconContainer: {
    position: 'relative',
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconRing1: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#4A90E215',
    borderWidth: 1,
    borderColor: '#4A90E230',
  },
  iconRing2: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#4A90E225',
    borderWidth: 1,
    borderColor: '#4A90E240',
  },
  iconCore: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },

  // Enhanced Search Box
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5EAF0',
  },
  searchIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4A90E215',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  searchInput: { 
    flex: 1, 
    fontSize: 15, 
    color: '#0F2340',
    fontWeight: '500',
  },
  clearInputButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  container: { flex: 1 },
  defaultArea: { paddingHorizontal: 16, paddingTop: 8 },

  // Section Headers
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4A90E215',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sectionTitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#0F2340',
  },

  // Enhanced Categories
  categoryWrapper: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  categoryCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#F0F4F8',
  },
  categoryIconContainer: { 
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    alignItems: 'center', 
    justifyContent: 'center',
    marginBottom: 12,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryLabel: { 
    fontSize: 15, 
    color: '#0F2340', 
    fontWeight: '700',
    flex: 1,
  },

  // Enhanced Hint Box
  hintBox: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 18,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F4F8',
    borderLeftWidth: 4,
    borderLeftColor: '#52C17C',
  },
  hintHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  hintIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#52C17C15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  hintTitle: { 
    fontWeight: '700', 
    color: '#0F2340',
    fontSize: 14,
  },
  hintText: { 
    color: '#6B7A8A',
    fontSize: 13,
    lineHeight: 18,
  },

  // Enhanced Suggestions
  suggestions: { paddingHorizontal: 16, paddingTop: 8 },
  placeholderBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    elevation: 2,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F0F4F8',
  },
  placeholderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  placeholderIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF950015',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  placeholderTitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#0F2340',
  },
  suggestionRow: { 
    flexDirection: 'row', 
    flexWrap: 'wrap',
  },
  suggestionChip: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 2,
    elevation: 1,
  },
  suggestionText: { 
    fontWeight: '700',
    fontSize: 13,
  },

  // Enhanced Recent Searches
  recentHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 14,
  },
  recentHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4A90E215',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  clearButton: {
    backgroundColor: '#4A90E215',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  clearText: { 
    color: '#4A90E2', 
    fontWeight: '700',
    fontSize: 13,
  },

  recentList: { marginBottom: 12 },
  recentRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#F0F4F8',
  },
  recentLeft: { 
    flexDirection: 'row', 
    alignItems: 'center',
    flex: 1,
  },
  recentItemIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F2F4F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recentText: { 
    color: '#0F2340', 
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F2F4F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
});