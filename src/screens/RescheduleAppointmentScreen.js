import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { AppointmentsService } from '../services/AppointmentsService';

export default function RescheduleAppointmentScreen({ route, navigation }) {
  const { appointment } = route.params;
  
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const timeSlots = [
    '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
    '11:00 AM', '11:30 AM', '02:00 PM', '02:30 PM',
    '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM',
  ];

  const getNextDays = () => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push({
        full: date,
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        date: date.getDate(),
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        isToday: i === 0,
      });
    }
    return days;
  };

  const nextDays = getNextDays();

  // Format current appointment date
  const currentDate = new Date(appointment.datetime);
  const currentDateFormatted = currentDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const currentTimeFormatted = currentDate.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

const handleReschedule = async () => {
  if (!selectedDate || !selectedTime) {
    Alert.alert(
      'Missing Information',
      'Please select a new date and time'
    );
    return;
  }

  try {
    setLoading(true);

    const appointmentDate = new Date(selectedDate.full);

    const [time, period] = selectedTime.split(' ');
    let [hours, minutes] = time.split(':').map(Number);

    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    appointmentDate.setHours(hours, minutes, 0, 0);

    const formattedDatetime = appointmentDate.toISOString(); // ✅ FIX

    await AppointmentsService.updateAppointment(appointment.id, {
      datetime: formattedDatetime, // ✅ ONLY this
    });

    Alert.alert(
      'Success 🎉',
      'Appointment rescheduled successfully',
      [{ text: 'OK', onPress: () => navigation.pop() }]
    );
  } catch (e) {
    console.error(e);
    Alert.alert(
      'Error',
      'Unable to reschedule appointment'
    );
  } finally {
    setLoading(false);
  }
};

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
          <Text style={styles.headerTitle}>Reschedule Appointment</Text>
        </View>
        <View style={styles.placeholderButton} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Current Appointment Info */}
        <View style={styles.currentAppointmentCard}>
          <View style={styles.currentAppointmentHeader}>
            <FontAwesome5 name="calendar-times" size={20} color="#E74C3C" />
            <Text style={styles.currentAppointmentTitle}>Current Appointment</Text>
          </View>

          <View style={styles.doctorInfoBox}>
            <View style={styles.doctorIconCircle}>
              <FontAwesome5 name="user-md" size={24} color="#4A90E2" />
            </View>
            <View style={styles.doctorDetails}>
              <Text style={styles.doctorName}>{appointment.doctor_name}</Text>
              <Text style={styles.doctorSpecialty}>{appointment.specialization}</Text>
            </View>
          </View>

          <View style={styles.appointmentDetailsBox}>
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <FontAwesome5 name="calendar" size={14} color="#7F8C8D" />
              </View>
              <Text style={styles.detailLabel}>Date:</Text>
              <Text style={styles.detailValue}>{currentDateFormatted}</Text>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <FontAwesome5 name="clock" size={14} color="#7F8C8D" />
              </View>
              <Text style={styles.detailLabel}>Time:</Text>
              <Text style={styles.detailValue}>{currentTimeFormatted}</Text>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <FontAwesome5 
                  name={appointment.mode === 'video' ? 'video' : 'hospital'} 
                  size={14} 
                  color="#7F8C8D" 
                />
              </View>
              <Text style={styles.detailLabel}>Mode:</Text>
              <Text style={styles.detailValue}>
                {appointment.mode === 'video' ? 'Video Call' : 'In-Person Visit'}
              </Text>
            </View>
          </View>
        </View>

        {/* Arrow Indicator */}
        <View style={styles.arrowContainer}>
          <View style={styles.arrowLine} />
          <View style={styles.arrowCircle}>
            <FontAwesome5 name="arrow-down" size={16} color="#4A90E2" />
          </View>
          <View style={styles.arrowLine} />
        </View>

        {/* New Appointment Selection */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <FontAwesome5 name="calendar-plus" size={18} color="#27AE60" />
            <Text style={styles.sectionTitle}>Select New Date & Time</Text>
          </View>

          {/* Date Selection */}
          <Text style={styles.inputLabel}>Choose New Date</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.dateScroll}
          >
            {nextDays.map((day, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.dateCard,
                  selectedDate === day && styles.dateCardActive,
                ]}
                onPress={() => setSelectedDate(day)}
              >
                <Text style={[
                  styles.dateDay,
                  selectedDate === day && styles.dateDayActive
                ]}>
                  {day.day}
                </Text>
                <Text style={[
                  styles.dateNumber,
                  selectedDate === day && styles.dateNumberActive
                ]}>
                  {day.date}
                </Text>
                <Text style={[
                  styles.dateMonth,
                  selectedDate === day && styles.dateMonthActive
                ]}>
                  {day.month}
                </Text>
                {day.isToday && (
                  <View style={styles.todayBadge}>
                    <Text style={styles.todayBadgeText}>Today</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Time Selection */}
          <Text style={styles.inputLabel}>Choose New Time</Text>
          <View style={styles.timeGrid}>
            {timeSlots.map((time) => (
              <TouchableOpacity
                key={time}
                style={[
                  styles.timeSlot,
                  selectedTime === time && styles.timeSlotActive,
                ]}
                onPress={() => setSelectedTime(time)}
              >
                <FontAwesome5 
                  name="clock" 
                  size={14} 
                  color={selectedTime === time ? '#4A90E2' : '#95A5A6'}
                  style={styles.timeIcon}
                />
                <Text style={[
                  styles.timeText,
                  selectedTime === time && styles.timeTextActive
                ]}>
                  {time}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Reason for Rescheduling */}
        <View style={styles.section}>
          <Text style={styles.inputLabel}>Reason for Rescheduling (Optional)</Text>
          <View style={styles.textAreaContainer}>
            <TextInput
              placeholder="Please let us know why you're rescheduling..."
              style={styles.textArea}
              value={reason}
              onChangeText={setReason}
              placeholderTextColor="#95A5A6"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* New Appointment Summary */}
        {selectedDate && selectedTime && (
          <View style={styles.newAppointmentCard}>
            <View style={styles.newAppointmentHeader}>
              <FontAwesome5 name="calendar-check" size={20} color="#27AE60" />
              <Text style={styles.newAppointmentTitle}>New Appointment Details</Text>
            </View>

            <View style={styles.summaryRow}>
              <FontAwesome5 name="user-md" size={16} color="#7F8C8D" />
              <Text style={styles.summaryLabel}>Doctor:</Text>
              <Text style={styles.summaryValue}>{appointment.doctor_name}</Text>
            </View>

            <View style={styles.summaryRow}>
              <FontAwesome5 name="calendar" size={16} color="#7F8C8D" />
              <Text style={styles.summaryLabel}>New Date:</Text>
              <Text style={styles.summaryValue}>
                {selectedDate.day}, {selectedDate.month} {selectedDate.date}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <FontAwesome5 name="clock" size={16} color="#7F8C8D" />
              <Text style={styles.summaryLabel}>New Time:</Text>
              <Text style={styles.summaryValue}>{selectedTime}</Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[
              styles.rescheduleButton,
              loading && styles.rescheduleButtonDisabled
            ]}
            onPress={handleReschedule}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <>
                <FontAwesome5 name="spinner" size={20} color="#FFF" />
                <Text style={styles.rescheduleButtonText}>Rescheduling...</Text>
              </>
            ) : (
              <>
                <FontAwesome5 name="calendar-check" size={20} color="#FFF" />
                <Text style={styles.rescheduleButtonText}>Confirm Reschedule</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <FontAwesome5 name="times-circle" size={20} color="#E74C3C" />
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <FontAwesome5 name="info-circle" size={18} color="#4A90E2" />
          <Text style={styles.infoText}>
            Your doctor will be notified about the rescheduling. You will receive a confirmation message shortly.
          </Text>
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
  placeholderButton: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  currentAppointmentCard: {
    backgroundColor: '#FFF5F5',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#FFE5E5',
  },
  currentAppointmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE5E5',
  },
  currentAppointmentTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E74C3C',
    marginLeft: 10,
  },
  doctorInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  doctorIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  doctorDetails: {
    flex: 1,
  },
  doctorName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 4,
  },
  doctorSpecialty: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  appointmentDetailsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailIcon: {
    width: 24,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7F8C8D',
    marginLeft: 8,
    width: 60,
  },
  detailValue: {
    fontSize: 14,
    color: '#2C3E50',
    flex: 1,
    fontWeight: '600',
  },
  arrowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  arrowLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E8E8E8',
  },
  arrowCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
    borderWidth: 2,
    borderColor: '#4A90E2',
  },
  section: {
    marginBottom: 28,
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
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
    marginTop: 16,
  },
  dateScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  dateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    alignItems: 'center',
    minWidth: 80,
    borderWidth: 2,
    borderColor: '#E8E8E8',
  },
  dateCardActive: {
    borderColor: '#4A90E2',
    backgroundColor: '#4A90E2',
  },
  dateDay: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7F8C8D',
    marginBottom: 6,
  },
  dateDayActive: {
    color: '#FFFFFF',
  },
  dateNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 4,
  },
  dateNumberActive: {
    color: '#FFFFFF',
  },
  dateMonth: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7F8C8D',
  },
  dateMonthActive: {
    color: '#FFFFFF',
  },
  todayBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#27AE60',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  todayBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  timeSlot: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#E8E8E8',
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: '30%',
  },
  timeSlotActive: {
    borderColor: '#4A90E2',
    backgroundColor: '#F0F7FF',
  },
  timeIcon: {
    marginRight: 6,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2C3E50',
  },
  timeTextActive: {
    color: '#4A90E2',
  },
  textAreaContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    padding: 16,
  },
  textArea: {
    fontSize: 14,
    color: '#2C3E50',
    minHeight: 80,
  },
  newAppointmentCard: {
    backgroundColor: '#F0FFF4',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#27AE60',
  },
  newAppointmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#D4EDDA',
  },
  newAppointmentTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#27AE60',
    marginLeft: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7F8C8D',
    marginLeft: 10,
    width: 90,
  },
  summaryValue: {
    fontSize: 14,
    color: '#2C3E50',
    flex: 1,
    fontWeight: '600',
  },
  actionButtons: {
    gap: 12,
    marginBottom: 20,
  },
  rescheduleButton: {
    backgroundColor: '#27AE60',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    gap: 10,
    shadowColor: '#27AE60',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  rescheduleButtonDisabled: {
    opacity: 0.7,
  },
  rescheduleButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cancelButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    gap: 10,
    borderWidth: 2,
    borderColor: '#E74C3C',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E74C3C',
  },
  infoCard: {
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    fontSize: 13,
    color: '#4A90E2',
    lineHeight: 20,
    flex: 1,
  },
});