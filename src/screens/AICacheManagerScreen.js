// src/screens/settings/AICacheManagerScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const CACHE_KEY = 'AI_TRIAGE_CACHE_V1';

export default function AICacheManagerScreen({ navigation }) {
  const [cacheData, setCacheData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCache();
  }, []);

  // 📦 Load cache from AsyncStorage
  const loadCache = async () => {
    try {
      setLoading(true);
      const data = await AsyncStorage.getItem(CACHE_KEY);
      if (data) {
        setCacheData(JSON.parse(data));
      } else {
        setCacheData({});
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load cache');
    } finally {
      setLoading(false);
    }
  };

  // ❌ Delete single item
  const deleteItem = async (symptom) => {
    Alert.alert(
      'Delete Entry',
      `Remove cached AI result for "${symptom}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updated = { ...cacheData };
            delete updated[symptom];
            setCacheData(updated);
            await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(updated));
          },
        },
      ]
    );
  };

  // 🧹 Clear all cache
  const clearCache = async () => {
    Alert.alert('Clear All Cache', 'Are you sure you want to delete all cached AI results?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem(CACHE_KEY);
          setCacheData({});
        },
      },
    ]);
  };

  // 📤 Export cache as JSON file
  const exportCache = async () => {
    try {
      const fileUri = `${FileSystem.documentDirectory}AI_Cache_${Date.now()}.json`;
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(cacheData, null, 2));
      await Sharing.shareAsync(fileUri);
    } catch (error) {
      Alert.alert('Error', 'Failed to export cache');
    }
  };

  const renderItem = ({ item }) => {
    const [symptom, result] = item;
    return (
      <View className="bg-white rounded-2xl shadow p-4 mb-3 border border-gray-200">
        <Text className="text-lg font-semibold text-gray-800">{symptom}</Text>
        <Text className="text-gray-500 text-sm mt-1">
          {result.triage_level || 'No triage level'}
        </Text>
        <Text className="text-gray-600 mt-1">{result.advice?.slice(0, 80)}...</Text>

        <TouchableOpacity
          onPress={() => deleteItem(symptom)}
          className="bg-red-500 rounded-xl p-2 mt-3 self-end"
        >
          <Text className="text-white text-center">Delete</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-gray-50 p-4">
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-2xl font-bold text-gray-800">🧠 AI Cache Manager</Text>
        <TouchableOpacity onPress={loadCache}>
          <Text className="text-blue-600 font-medium">↻ Refresh</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <Text className="text-gray-500 mt-10 text-center">Loading cache...</Text>
      ) : Object.keys(cacheData).length === 0 ? (
        <Text className="text-gray-500 mt-10 text-center">No AI cache found.</Text>
      ) : (
        <FlatList
          data={Object.entries(cacheData)}
          renderItem={renderItem}
          keyExtractor={([symptom]) => symptom}
        />
      )}

      <View className="mt-6 space-y-3">
        <TouchableOpacity
          onPress={exportCache}
          className="bg-green-500 rounded-2xl p-3"
        >
          <Text className="text-white text-center font-semibold">📤 Export Cache</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={clearCache}
          className="bg-red-600 rounded-2xl p-3"
        >
          <Text className="text-white text-center font-semibold">🧹 Clear All</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
