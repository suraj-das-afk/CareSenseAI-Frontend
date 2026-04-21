import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { AppointmentsService } from '../services/AppointmentsService';
import { usePopup } from "../contexts/PopupContext";

export default function BookAppointmentScreen({ navigation, route }) {
  const { specialty, doctorPreset } = route?.params || {};

  const [doctorName, setDoctorName] = useState(doctorPreset || '');
  const [specialization, setSpecialization] = useState(specialty || '');
  const [datetime, setDatetime] = useState('');
  const [mode, setMode] = useState('video');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const { showPopup } = usePopup();

  // Date selection helpers
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);

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

  const specializations = [
    { name: 'General Physician', icon: 'user-md', color: '#4A90E2' },
    { name: 'Cardiologist', icon: 'heartbeat', color: '#FF6B6B' },
    { name: 'Dermatologist', icon: 'hand-paper', color: '#C7A3FF' },
    { name: 'Neurologist', icon: 'brain', color: '#A8E6CF' },
    { name: 'Pediatrician', icon: 'baby', color: '#FFD93D' },
    { name: 'Orthopedic', icon: 'bone', color: '#95E1D3' },
  ];

  const submit = async () => {
  if (!doctorName || !specialization) {
    showPopup({
      type: "error",
      title: "Missing Information",
      message: "Please enter doctor name and select specialization.",
    });
    return;
  }

  if (!selectedDate || !selectedTime) {
    showPopup({
      type: "warning",
      title: "Select Date & Time",
      message: "Please choose appointment date and time.",
    });
    return;
  }

  showPopup({
    type: "confirm",
    title: "Confirm Appointment",
    message: "Do you want to book this appointment?",
    confirmText: "Yes, Book",
    cancelText: "Cancel",

    onConfirm: async () => {
      try {
        setLoading(true);

        // ⏱ Format datetime
        const appointmentDate = new Date(selectedDate.full);
        const [time, period] = selectedTime.split(" ");
        let [hours, minutes] = time.split(":").map(Number);

        if (period === "PM" && hours !== 12) hours += 12;
        if (period === "AM" && hours === 12) hours = 0;

        appointmentDate.setHours(hours, minutes, 0);

        const formattedDatetime = appointmentDate
          .toISOString()
          .slice(0, 16)
          .replace("T", " ");

        await AppointmentsService.createAppointment({
          doctor_name: doctorName,
          specialization,
          datetime: formattedDatetime,
          mode,
          reason: reason || "General consultation",
        });

        showPopup({
          type: "success",
          title: "Appointment Booked 🎉",
          message:
            "Your appointment has been booked successfully. You will receive confirmation shortly.",
          confirmText: "View Appointments",
          cancelText: "Done",

          onConfirm: () => navigation.navigate("Appointments"),
          onCancel: () => navigation.goBack(),
        });

      } catch (e) {
        showPopup({
          type: "error",
          title: "Booking Failed",
          message: "Unable to book appointment. Please try again.",
        });
      } finally {
        setLoading(false);
      }
    },
  });
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
          <Text style={styles.headerTitle}>Book Appointment</Text>
        </View>
        <View style={styles.placeholderButton} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Appointment Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Consultation Type</Text>
          <View style={styles.modeContainer}>
            <TouchableOpacity
              style={[
                styles.modeCard,
                mode === 'video' && styles.modeCardActive,
              ]}
              onPress={() => setMode('video')}
            >
              <View style={[
                styles.modeIconCircle,
                mode === 'video' && styles.modeIconCircleActive
              ]}>
                <FontAwesome5 
                  name="video" 
                  size={24} 
                  color={mode === 'video' ? '#4A90E2' : '#95A5A6'} 
                />
              </View>
              <Text style={[
                styles.modeTitle,
                mode === 'video' && styles.modeTitleActive
              ]}>
                Video Call
              </Text>
              <Text style={styles.modeSubtitle}>Consult from home</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeCard,
                mode === 'in_person' && styles.modeCardActive,
              ]}
              onPress={() => setMode('in_person')}
            >
              <View style={[
                styles.modeIconCircle,
                mode === 'in_person' && styles.modeIconCircleActive
              ]}>
                <FontAwesome5 
                  name="hospital" 
                  size={24} 
                  color={mode === 'in_person' ? '#4A90E2' : '#95A5A6'} 
                />
              </View>
              <Text style={[
                styles.modeTitle,
                mode === 'in_person' && styles.modeTitleActive
              ]}>
                In-Person
              </Text>
              <Text style={styles.modeSubtitle}>Visit clinic</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Doctor Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Doctor Information</Text>
          
          <View style={styles.inputContainer}>
            <View style={styles.inputIconCircle}>
              <FontAwesome5 name="user-md" size={18} color="#4A90E2" />
            </View>
            <TextInput
              placeholder="Enter doctor's name"
              style={styles.input}
              value={doctorName}
              onChangeText={setDoctorName}
              placeholderTextColor="#95A5A6"
            />
          </View>

          <Text style={styles.inputLabel}>Specialization</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.specializationScroll}
          >
            {specializations.map((spec) => (
              <TouchableOpacity
                key={spec.name}
                style={[
                  styles.specializationCard,
                  specialization === spec.name && styles.specializationCardActive,
                ]}
                onPress={() => setSpecialization(spec.name)}
              >
                <View style={[
                  styles.specializationIcon,
                  { backgroundColor: spec.color + '20' }
                ]}>
                  <FontAwesome5 name={spec.icon} size={20} color={spec.color} />
                </View>
                <Text style={[
                  styles.specializationText,
                  specialization === spec.name && styles.specializationTextActive
                ]}>
                  {spec.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Date Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Date</Text>
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
        </View>

        {/* Time Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Time</Text>
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

        {/* Reason */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reason for Visit (Optional)</Text>
          <View style={styles.textAreaContainer}>
            <TextInput
              placeholder="Describe your symptoms or reason for consultation..."
              style={styles.textArea}
              value={reason}
              onChangeText={setReason}
              placeholderTextColor="#95A5A6"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Summary Card */}
        {selectedDate && selectedTime && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <FontAwesome5 name="calendar-check" size={20} color="#4A90E2" />
              <Text style={styles.summaryTitle}>Appointment Summary</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <FontAwesome5 name="user-md" size={16} color="#7F8C8D" />
              <Text style={styles.summaryLabel}>Doctor:</Text>
              <Text style={styles.summaryValue}>{doctorName || 'Not specified'}</Text>
            </View>

            <View style={styles.summaryRow}>
              <FontAwesome5 name="stethoscope" size={16} color="#7F8C8D" />
              <Text style={styles.summaryLabel}>Specialization:</Text>
              <Text style={styles.summaryValue}>{specialization || 'Not selected'}</Text>
            </View>

            <View style={styles.summaryRow}>
              <FontAwesome5 name="calendar" size={16} color="#7F8C8D" />
              <Text style={styles.summaryLabel}>Date:</Text>
              <Text style={styles.summaryValue}>
                {selectedDate.day}, {selectedDate.month} {selectedDate.date}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <FontAwesome5 name="clock" size={16} color="#7F8C8D" />
              <Text style={styles.summaryLabel}>Time:</Text>
              <Text style={styles.summaryValue}>{selectedTime}</Text>
            </View>

            <View style={styles.summaryRow}>
              <FontAwesome5 name={mode === 'video' ? 'video' : 'hospital'} size={16} color="#7F8C8D" />
              <Text style={styles.summaryLabel}>Mode:</Text>
              <Text style={styles.summaryValue}>
                {mode === 'video' ? 'Video Consultation' : 'In-Person Visit'}
              </Text>
            </View>
          </View>
        )}

        {/* Book Button */}
        <TouchableOpacity
          style={[
            styles.bookButton,
            loading && styles.bookButtonDisabled
          ]}
          onPress={submit}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <>
              <FontAwesome5 name="spinner" size={20} color="#FFF" />
              <Text style={styles.bookButtonText}>Booking...</Text>
            </>
          ) : (
            <>
              <FontAwesome5 name="check-circle" size={20} color="#FFF" />
              <Text style={styles.bookButtonText}>Confirm Appointment</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <FontAwesome5 name="info-circle" size={18} color="#4A90E2" />
          <Text style={styles.infoText}>
            You will receive a confirmation message with appointment details and doctor's information.
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
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 16,
  },
  modeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  modeCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E8E8E8',
  },
  modeCardActive: {
    borderColor: '#4A90E2',
    backgroundColor: '#F0F7FF',
  },
  modeIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modeIconCircleActive: {
    backgroundColor: '#E8F4F8',
  },
  modeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 4,
  },
  modeTitleActive: {
    color: '#4A90E2',
  },
  modeSubtitle: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  inputIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#2C3E50',
    paddingVertical: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
  },
  specializationScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  specializationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    alignItems: 'center',
    minWidth: 120,
    borderWidth: 2,
    borderColor: '#E8E8E8',
  },
  specializationCardActive: {
    borderColor: '#4A90E2',
    backgroundColor: '#F0F7FF',
  },
  specializationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  specializationText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2C3E50',
    textAlign: 'center',
  },
  specializationTextActive: {
    color: '#4A90E2',
  },
  dateScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
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
    minHeight: 100,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#4A90E2',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E50',
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
    width: 120,
  },
  summaryValue: {
    fontSize: 14,
    color: '#2C3E50',
    flex: 1,
    fontWeight: '600',
  },
  bookButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    gap: 10,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  bookButtonDisabled: {
    opacity: 0.7,
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  infoCard: {
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    gap: 12,
  },
  infoText: {
    fontSize: 13,
    color: '#4A90E2',
    lineHeight: 20,
    flex: 1,
  },
});