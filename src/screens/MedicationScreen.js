import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function MedicationTimelineScreen({ route }) {
  const medicines = route?.params?.medicines || [];

  // Mock timeline generation based on dosage string
  const generateTimeline = (meds) => {
    const timeline = [];
    meds.forEach(med => {
      // Very basic mock logic for visual purposes
      timeline.push({ time: '08:00 AM', event: `Take ${med.name}`, detail: med.dosage, color: '#3b82f6' });
      if (med.dosage.toLowerCase().includes('twice') || med.dosage.toLowerCase().includes('2 times')) {
        timeline.push({ time: '08:00 PM', event: `Take ${med.name}`, detail: med.dosage, color: '#8b5cf6' });
      }
    });
    return timeline.sort((a, b) => a.time.localeCompare(b.time));
  };

  const timelineEvents = generateTimeline(medicines);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Your Care Schedule</Text>
      <View style={styles.timelineContainer}>
        {timelineEvents.map((item, index) => (
          <View key={index} style={styles.timelineRow}>
            <View style={styles.timeColumn}>
              <Text style={styles.timeText}>{item.time}</Text>
            </View>
            <View style={styles.dividerColumn}>
              <View style={[styles.dot, { backgroundColor: item.color }]} />
              {index !== timelineEvents.length - 1 && <View style={styles.line} />}
            </View>
            <View style={styles.eventColumn}>
              <View style={styles.eventCard}>
                <Text style={styles.eventText}>{item.event}</Text>
                <Text style={styles.detailText}>{item.detail}</Text>
              </View>
            </View>
          </View>
        ))}
        {timelineEvents.length === 0 && (
          <Text style={styles.noMedsText}>No specific schedule required. Take as needed.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f9fafb',
    marginBottom: 30,
    textAlign: 'center',
  },
  timelineContainer: {
    flex: 1,
  },
  timelineRow: {
    flexDirection: 'row',
    minHeight: 80,
  },
  timeColumn: {
    width: 80,
    alignItems: 'flex-end',
    paddingRight: 15,
    paddingTop: 15,
  },
  timeText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '600',
  },
  dividerColumn: {
    width: 20,
    alignItems: 'center',
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginTop: 15,
    zIndex: 10,
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: '#374151',
    marginTop: -8,
    marginBottom: -15,
  },
  eventColumn: {
    flex: 1,
    paddingLeft: 15,
    paddingBottom: 20,
  },
  eventCard: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 15,
    borderLeftWidth: 4,
    borderColor: '#3b82f6',
  },
  eventText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  detailText: {
    color: '#9ca3af',
    fontSize: 14,
    marginTop: 5,
  },
  noMedsText: {
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 20,
  }
});
