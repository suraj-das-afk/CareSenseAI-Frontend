import React, { useCallback, useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  StatusBar,
  Dimensions,
  Alert,
  Modal,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { HealthService } from "../services/HealthService";
import { Ionicons } from "@expo/vector-icons";
import { usePopup } from "../contexts/PopupContext";

const { width } = Dimensions.get("window");

/* ---------------- CUSTOM SNACKBAR ---------------- */

const CustomSnackbar = ({ visible, message, onDismiss, onUndo }) => {
  const translateY = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();

      const timer = setTimeout(onDismiss, 5000);
      return () => clearTimeout(timer);
    } else {
      Animated.timing(translateY, {
        toValue: 100,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.snackbarContainer,
        { transform: [{ translateY }] },
      ]}
    >
      <View style={styles.snackbar}>
        <Ionicons name="checkmark-circle" size={20} color="#10B981" />
        <Text style={styles.snackbarText}>{message}</Text>
        <TouchableOpacity onPress={onUndo} style={styles.undoButton}>
          <Text style={styles.undoText}>UNDO</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

/* ---------------- HELPERS ---------------- */

const resolveTriageLevel = (item) => {
  if (!item) return null;
  return item.triage_level || item.ai_risk_level || "Pending";
};

const getTriageConfig = (level) => {
  const l = (level || "").toLowerCase();
  if (!l || l.includes("pending")) {
    return { 
      colors: ["#94A3B8", "#64748B"], 
      icon: "time-outline", 
      label: "Processing",
      bgColor: "#F1F5F9",
      textColor: "#64748B"
    };
  }
  if (l.includes("emergency")) {
    return { 
      colors: ["#EF4444", "#DC2626"], 
      icon: "alert-circle", 
      label: "Emergency",
      bgColor: "#FEE2E2",
      textColor: "#DC2626"
    };
  }
  if (l.includes("urgent") || l.includes("primary")) {
    return { 
      colors: ["#F59E0B", "#D97706"], 
      icon: "warning", 
      label: "Urgent",
      bgColor: "#FEF3C7",
      textColor: "#D97706"
    };
  }
  return { 
    colors: ["#3B82F6", "#2563EB"], 
    icon: "document-text", 
    label: "Routine",
    bgColor: "#DBEAFE",
    textColor: "#2563EB"
  };
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return date.toLocaleDateString("en-US", { 
    month: "short", 
    day: "numeric", 
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined 
  });
};

/* ---------------- SCREEN ---------------- */

export default function AllRecordsScreen() {
  const navigation = useNavigation();
  const { showPopup } = usePopup();


  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [lastDeleted, setLastDeleted] = useState(null);

  /* ---------------- FETCH ---------------- */

  const fetchRecords = async () => {
    try {
      const data = await HealthService.getHealthRecords();
      setRecords(
  [...data].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  )
);
    } catch (e) {
      console.error("❌ Load Error:", e);
      Alert.alert("Error", "Failed to load health records. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

const hasFetched = useRef(false);

useEffect(() => {
  if (hasFetched.current) return;
  hasFetched.current = true;
  fetchRecords();
}, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRecords();
  };

  /* ---------------- DELETE ---------------- */

  const handleDeletePress = (item) => {
    setRecordToDelete(item);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!recordToDelete) return;

    const triage = resolveTriageLevel(recordToDelete).toLowerCase();

    if (triage.includes("emergency")) {
      Alert.alert(
        "Protected Record",
        "Emergency health records cannot be deleted for safety reasons.",
        [{ text: "OK", style: "default" }]
      );
      setDeleteModalVisible(false);
      return;
    }

    setDeleting(true);

    try {
      setRecords((prev) => prev.filter((r) => r.id !== recordToDelete.id));
      setLastDeleted(recordToDelete);
      setSnackbarVisible(true);

      await HealthService.deleteHealthRecord(recordToDelete.id);

      setDeleteModalVisible(false);
      setRecordToDelete(null);
    } catch (e) {
      console.error("Delete error:", e);
      setRecords((prev) => [recordToDelete, ...prev]);
      Alert.alert("Delete Failed", "Unable to delete record. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

const undoDelete = async () => {
  if (!lastDeleted) return;

  try {
    await HealthService.restoreHealthRecord(lastDeleted.id);

    setRecords(prev =>
      [lastDeleted, ...prev].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      )
    );
  } catch (e) {
    console.error(e);
  } finally {
    setLastDeleted(null);
    setSnackbarVisible(false);
  }
};

  /* ---------------- RENDER HEADER ---------------- */

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="arrow-back" size={24} color="#1F2937" />
      </TouchableOpacity>
      
      <View style={styles.headerContent}>
        <Text style={styles.headerTitle}>Health Records</Text>
        <Text style={styles.headerSubtitle}>
          {records.length} {records.length === 1 ? 'record' : 'records'}
        </Text>
      </View>
    </View>
  );

  /* ---------------- RENDER EMPTY ---------------- */

const renderEmpty = useCallback(() => (
  <View style={styles.emptyContainer}>
    <View style={styles.emptyIconContainer}>
      <Ionicons name="folder-open-outline" size={64} color="#CBD5E1" />
    </View>
    <Text style={styles.emptyTitle}>No Health Records</Text>
    <Text style={styles.emptyText}>
      Your health records will appear here once you create them
    </Text>
  </View>
), []);

  /* ---------------- RENDER CARD ---------------- */

const renderCard = useCallback(({ item }) => {
  const config = getTriageConfig(resolveTriageLevel(item));

  return (
    <Animated.View style={styles.cardWrapper}>
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          navigation.navigate("HealthRecordDetail", { record: item })
        }
        activeOpacity={0.7}
      >
        <View style={styles.cardLeft}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: config.bgColor },
            ]}
          >
            <Ionicons
              name={config.icon}
              size={20}
              color={config.textColor}
            />
          </View>

          <View style={styles.cardContent}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.ai_summary ||
                item.symptoms_summary ||
                "Health Record"}
            </Text>

            <View style={styles.cardMeta}>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: config.bgColor },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    { color: config.textColor },
                  ]}
                >
                  {config.label}
                </Text>
              </View>

              <Text style={styles.dateText}>
                {formatDate(item.created_at)}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeletePress(item)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}, [navigation]);

  /* ---------------- MAIN RENDER ---------------- */

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading records...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {renderHeader()}

<FlatList
  data={records}
  keyExtractor={(item) => String(item.id)}
  renderItem={renderCard}
  ListEmptyComponent={renderEmpty}
  initialNumToRender={8}
  maxToRenderPerBatch={8}
  windowSize={7}
  removeClippedSubviews
        contentContainerStyle={[
          styles.listContent,
          records.length === 0 && styles.listContentEmpty
        ]}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor="#3B82F6"
            colors={["#3B82F6"]}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* DELETE CONFIRMATION MODAL */}
      <Modal 
        visible={deleteModalVisible} 
        transparent 
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="trash" size={32} color="#EF4444" />
            </View>
            
            <Text style={styles.modalTitle}>Delete Health Record?</Text>
            <Text style={styles.modalDescription}>
              This action cannot be undone. The record will be permanently removed.
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setDeleteModalVisible(false)}
                disabled={deleting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalDeleteButton]}
                onPress={confirmDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.deleteButtonText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* CUSTOM SNACKBAR */}
      <CustomSnackbar
        visible={snackbarVisible}
        message="Record deleted successfully"
        onDismiss={() => {
          setSnackbarVisible(false);
          setLastDeleted(null);
        }}
        onUndo={undoDelete}
      />
    </SafeAreaView>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#FFFFFF" 
  },
  
  /* HEADER */
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 2,
  },

  /* LIST */
  listContent: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  listContentEmpty: {
    flexGrow: 1,
  },

  /* CARD */
  cardWrapper: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  cardLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
    lineHeight: 22,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  dateText: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "500",
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
  },

  /* EMPTY STATE */
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
  },

  /* LOADING */
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: "#64748B",
    fontWeight: "500",
  },

  /* MODAL */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  cancelButton: {
    backgroundColor: "#F1F5F9",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#475569",
  },
  modalDeleteButton: {
    backgroundColor: "#EF4444",
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  /* CUSTOM SNACKBAR */
  snackbarContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  snackbar: {
    backgroundColor: "#1F2937",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  snackbarText: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "500",
    marginLeft: 12,
  },
  undoButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  undoText: {
    color: "#3B82F6",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});