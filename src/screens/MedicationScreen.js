import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { MedicationService } from "../services/MedicationService";

export default function MedicationScreen({ route, navigation }) {
  const recordId = route?.params?.recordId;
  const [loading, setLoading] = useState(true);
  const [meds, setMeds] = useState([]);
  const [warning, setWarning] = useState("");

  useEffect(() => {
    if (!recordId) {
      setLoading(false);
      return;
    }
    loadMedication();
  }, [recordId]);

  const loadMedication = async () => {
    try {
      const data = await MedicationService.getMedication(recordId);
      setMeds(Array.isArray(data?.medicines) ? data.medicines : []);
      setWarning(data?.warning || "");
    } catch (e) {
      console.log("Medication error", e);
    } finally {
      setLoading(false);
    }
  };

  // Get icon based on medication type
  const getMedicationIcon = (name) => {
    const lowerName = name?.toLowerCase() || '';
    if (lowerName.includes('tablet') || lowerName.includes('pill')) return 'pills';
    if (lowerName.includes('syrup') || lowerName.includes('liquid')) return 'prescription-bottle';
    if (lowerName.includes('injection') || lowerName.includes('inject')) return 'syringe';
    if (lowerName.includes('cream') || lowerName.includes('ointment')) return 'hand-holding-medical';
    if (lowerName.includes('drop')) return 'eye-dropper';
    return 'prescription-bottle-alt';
  };

  // Get color based on timing
  const getTimingColor = (timing) => {
    const lowerTiming = timing?.toLowerCase() || '';
    if (lowerTiming.includes('morning')) return '#FFD93D';
    if (lowerTiming.includes('afternoon') || lowerTiming.includes('noon')) return '#FF6B6B';
    if (lowerTiming.includes('evening') || lowerTiming.includes('night')) return '#A8E6CF';
    return '#4A90E2';
  };

  // ⛔ NO RECORD SELECTED
  if (!recordId && !loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <FontAwesome5 name="chevron-left" size={20} color="#2C3E50" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Medications</Text>
          </View>
          <View style={styles.placeholderButton} />
        </View>

        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <FontAwesome5 name="capsules" size={48} color="#95A5A6" />
          </View>
          <Text style={styles.emptyTitle}>No Record Selected</Text>
          <Text style={styles.emptyText}>
            Please open medications from a health record to view prescribed medicines.
          </Text>
          <TouchableOpacity 
            style={styles.emptyButton}
            onPress={() => navigation.goBack()}
          >
            <FontAwesome5 name="arrow-left" size={16} color="#4A90E2" />
            <Text style={styles.emptyButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ⏳ LOADING
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <FontAwesome5 name="chevron-left" size={20} color="#2C3E50" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Medications</Text>
          </View>
          <View style={styles.placeholderButton} />
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Loading medications...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <FontAwesome5 name="chevron-left" size={20} color="#2C3E50" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Medications</Text>
        </View>
        <TouchableOpacity style={styles.infoButton}>
          <FontAwesome5 name="info-circle" size={20} color="#4A90E2" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Warning Card */}
        {warning ? (
          <View style={styles.warningCard}>
            <View style={styles.warningIconCircle}>
              <FontAwesome5 name="exclamation-triangle" size={24} color="#E74C3C" />
            </View>
            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>Important Notice</Text>
              <Text style={styles.warningText}>{warning}</Text>
            </View>
          </View>
        ) : null}

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <View style={[styles.summaryIconCircle, { backgroundColor: '#F0F7FF' }]}>
                <FontAwesome5 name="capsules" size={20} color="#4A90E2" />
              </View>
              <Text style={styles.summaryValue}>{meds.length}</Text>
              <Text style={styles.summaryLabel}>Medicines</Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryItem}>
              <View style={[styles.summaryIconCircle, { backgroundColor: '#FFF5F5' }]}>
                <FontAwesome5 name="clock" size={20} color="#E74C3C" />
              </View>
              <Text style={styles.summaryValue}>
                {meds.filter(m => m.timing?.toLowerCase().includes('daily')).length || meds.length}
              </Text>
              <Text style={styles.summaryLabel}>Daily Doses</Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryItem}>
              <View style={[styles.summaryIconCircle, { backgroundColor: '#F0FFF4' }]}>
                <FontAwesome5 name="calendar-check" size={20} color="#27AE60" />
              </View>
              <Text style={styles.summaryValue}>Active</Text>
              <Text style={styles.summaryLabel}>Status</Text>
            </View>
          </View>
        </View>

        {/* Section Title */}
        <View style={styles.sectionHeader}>
          <FontAwesome5 name="prescription-bottle" size={18} color="#4A90E2" />
          <Text style={styles.sectionTitle}>Prescribed Medications</Text>
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionBadgeText}>{meds.length}</Text>
          </View>
        </View>

        {/* Medications List */}
        {meds.length === 0 ? (
          <View style={styles.emptyMedicationCard}>
            <FontAwesome5 name="pills" size={40} color="#95A5A6" />
            <Text style={styles.emptyMedicationTitle}>No Medications</Text>
            <Text style={styles.emptyMedicationText}>
              No medicines have been prescribed for this record yet.
            </Text>
          </View>
        ) : (
          <View style={styles.medicationsList}>
            {meds.map((item, index) => (
              <View key={index} style={styles.medicationCard}>
                {/* Header */}
                <View style={styles.medicationHeader}>
                  <View style={[
                    styles.medicationIconCircle,
                    { backgroundColor: getTimingColor(item.timing) + '20' }
                  ]}>
                    <FontAwesome5 
                      name={getMedicationIcon(item.name)} 
                      size={24} 
                      color={getTimingColor(item.timing)} 
                    />
                  </View>
                  <View style={styles.medicationHeaderText}>
                    <Text style={styles.medicationName}>{item.name}</Text>
                    <View style={styles.dosageBadge}>
                      <FontAwesome5 name="pills" size={10} color="#4A90E2" />
                      <Text style={styles.dosageText}>{item.dosage}</Text>
                    </View>
                  </View>
                </View>

                {/* Details */}
                <View style={styles.medicationDetails}>
                  <View style={styles.detailRow}>
                    <View style={styles.detailIconBox}>
                      <FontAwesome5 name="clock" size={14} color="#7F8C8D" />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Timing</Text>
                      <Text style={styles.detailValue}>{item.timing}</Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <View style={styles.detailIconBox}>
                      <FontAwesome5 name="calendar-alt" size={14} color="#7F8C8D" />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Duration</Text>
                      <Text style={styles.detailValue}>{item.duration}</Text>
                    </View>
                  </View>
                </View>

                {/* Instructions */}
                {item.instructions && (
                  <View style={styles.instructionsBox}>
                    <FontAwesome5 name="info-circle" size={12} color="#4A90E2" />
                    <Text style={styles.instructionsText}>{item.instructions}</Text>
                  </View>
                )}

                {/* Footer Actions */}
                <View style={styles.medicationFooter}>
                  <TouchableOpacity style={styles.reminderButton}>
                    <FontAwesome5 name="bell" size={14} color="#4A90E2" />
                    <Text style={styles.reminderButtonText}>Set Reminder</Text>
                  </TouchableOpacity>
                  
                  <View style={styles.footerDivider} />
                  
                  <TouchableOpacity style={styles.infoDetailButton}>
                    <FontAwesome5 name="info-circle" size={14} color="#7F8C8D" />
                    <Text style={styles.infoDetailButtonText}>Details</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Important Information Card */}
        <View style={styles.importantCard}>
          <View style={styles.importantHeader}>
            <FontAwesome5 name="shield-alt" size={18} color="#4A90E2" />
            <Text style={styles.importantTitle}>Important Information</Text>
          </View>
          
          <View style={styles.importantItem}>
            <FontAwesome5 name="check-circle" size={14} color="#27AE60" />
            <Text style={styles.importantText}>
              Take medications exactly as prescribed by your doctor
            </Text>
          </View>

          <View style={styles.importantItem}>
            <FontAwesome5 name="check-circle" size={14} color="#27AE60" />
            <Text style={styles.importantText}>
              Complete the full course even if you feel better
            </Text>
          </View>

          <View style={styles.importantItem}>
            <FontAwesome5 name="check-circle" size={14} color="#27AE60" />
            <Text style={styles.importantText}>
              Store medicines in a cool, dry place away from children
            </Text>
          </View>

          <View style={styles.importantItem}>
            <FontAwesome5 name="exclamation-circle" size={14} color="#E74C3C" />
            <Text style={styles.importantText}>
              Contact your doctor if you experience any side effects
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3E50',
  },
  infoButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0EBFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderButton: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#7F8C8D',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F7FF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4A90E2',
  },
  warningCard: {
    backgroundColor: '#FFF5F5',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    borderWidth: 2,
    borderColor: '#FFE5E5',
  },
  warningIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFE5E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#E74C3C',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 13,
    color: '#E74C3C',
    lineHeight: 20,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E8E8E8',
    marginHorizontal: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E50',
    marginLeft: 10,
    flex: 1,
  },
  sectionBadge: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  sectionBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  medicationsList: {
    gap: 16,
  },
  medicationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  medicationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  medicationIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  medicationHeaderText: {
    flex: 1,
  },
  medicationName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 6,
  },
  dosageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F7FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    gap: 6,
  },
  dosageText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A90E2',
  },
  medicationDetails: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
  },
  instructionsBox: {
    backgroundColor: '#F0F7FF',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  instructionsText: {
    flex: 1,
    fontSize: 13,
    color: '#4A90E2',
    lineHeight: 20,
  },
  medicationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    paddingTop: 12,
  },
  reminderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  reminderButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A90E2',
  },
  footerDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E8E8E8',
  },
  infoDetailButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  infoDetailButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7F8C8D',
  },
  emptyMedicationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E8E8E8',
    borderStyle: 'dashed',
  },
  emptyMedicationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E50',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMedicationText: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
  },
  importantCard: {
    backgroundColor: '#F0F7FF',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
  },
  importantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#D4E9FF',
  },
  importantTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E50',
    marginLeft: 10,
  },
  importantItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 10,
  },
  importantText: {
    flex: 1,
    fontSize: 13,
    color: '#4A90E2',
    lineHeight: 20,
  },
});