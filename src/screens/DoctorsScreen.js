import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Animated } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

export default function DoctorsScreen() {
  const [selectedSpecialty, setSelectedSpecialty] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Pulse animation for header icon
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

  const specialties = [
    { name: 'All', icon: 'hospital', color: '#4A90E2' },
    { name: 'General', icon: 'user-md', color: '#52C17C' },
    { name: 'Cardiology', icon: 'heartbeat', color: '#FF6B9D' },
    { name: 'Dermatology', icon: 'hand-holding-medical', color: '#FF9500' },
    { name: 'Pediatrics', icon: 'baby', color: '#9B59B6' },
    { name: 'Orthopedics', icon: 'bone', color: '#4A90E2' },
    { name: 'Neurology', icon: 'brain', color: '#FF6B9D' },
    { name: 'Dentistry', icon: 'tooth', color: '#52C17C' },
  ];

  const doctors = [
    {
      name: 'Dr. Sarah Johnson',
      specialty: 'Cardiologist',
      experience: '15 years',
      rating: 4.9,
      reviews: 287,
      availability: 'Available Today',
      consultationFee: '₹500',
      image: '👩‍⚕️',
      languages: ['English', 'Hindi'],
      nextAvailable: '2:00 PM'
    },
    {
      name: 'Dr. Rajesh Kumar',
      specialty: 'General Physician',
      experience: '12 years',
      rating: 4.8,
      reviews: 342,
      availability: 'Available Now',
      consultationFee: '₹400',
      image: '👨‍⚕️',
      languages: ['English', 'Hindi', 'Tamil'],
      nextAvailable: 'Now'
    },
    {
      name: 'Dr. Priya Sharma',
      specialty: 'Dermatologist',
      experience: '10 years',
      rating: 4.9,
      reviews: 198,
      availability: 'Available Tomorrow',
      consultationFee: '₹600',
      image: '👩‍⚕️',
      languages: ['English', 'Hindi'],
      nextAvailable: 'Tomorrow 10:00 AM'
    },
    {
      name: 'Dr. Michael Chen',
      specialty: 'Pediatrician',
      experience: '18 years',
      rating: 5.0,
      reviews: 456,
      availability: 'Available Today',
      consultationFee: '₹550',
      image: '👨‍⚕️',
      languages: ['English', 'Hindi'],
      nextAvailable: '4:30 PM'
    },
  ];

  const filteredDoctors = doctors.filter(doctor => 
    doctor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doctor.specialty.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Modern Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerLabel}>FIND SPECIALISTS</Text>
            <Text style={styles.title}>Top Doctors</Text>
            <Text style={styles.subtitle}>Book appointments with specialists</Text>
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
              <FontAwesome5 name="user-md" size={24} color="#FFFFFF" />
            </View>
          </Animated.View>
        </View>
      </View>

      {/* Enhanced Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchIconContainer}>
          <FontAwesome5 name="search" size={16} color="#4A90E2" />
        </View>
        <TextInput
          style={styles.searchInput}
          placeholder="Search doctors, specialties..."
          placeholderTextColor="#A9A9A9"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={() => setSearchQuery('')}
          >
            <FontAwesome5 name="times-circle" size={18} color="#C0C0C0" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Enhanced Specialties Section */}
        <View style={styles.specialtiesSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <View style={styles.sectionIconBadge}>
                <FontAwesome5 name="stethoscope" size={14} color="#4A90E2" />
              </View>
              <Text style={styles.sectionTitle}>Specialties</Text>
            </View>
          </View>

          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.specialtiesContent}
          >
            {specialties.map((specialty, index) => {
              const isActive = selectedSpecialty === specialty.name;
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.specialtyCard,
                    isActive && { 
                      backgroundColor: specialty.color,
                      borderColor: specialty.color,
                    }
                  ]}
                  onPress={() => setSelectedSpecialty(specialty.name)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.specialtyIconContainer,
                    isActive 
                      ? { backgroundColor: 'rgba(255,255,255,0.25)' } 
                      : { backgroundColor: specialty.color + '20' }
                  ]}>
                    <FontAwesome5 
                      name={specialty.icon} 
                      size={20} 
                      color={isActive ? '#FFFFFF' : specialty.color} 
                    />
                  </View>
                  <Text style={[
                    styles.specialtyText,
                    isActive && { color: '#FFFFFF', fontWeight: '700' }
                  ]}>
                    {specialty.name}
                  </Text>
                  {isActive && (
                    <View style={styles.activeCheckmark}>
                      <FontAwesome5 name="check-circle" size={14} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Enhanced Stats Cards */}
        <View style={styles.statsSection}>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#4A90E215' }]}>
              <FontAwesome5 name="user-md" size={24} color="#4A90E2" />
            </View>
            <Text style={styles.statNumber}>500+</Text>
            <Text style={styles.statLabel}>Doctors</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#FF950015' }]}>
              <FontAwesome5 name="star" size={24} color="#FF9500" />
            </View>
            <Text style={styles.statNumber}>4.8</Text>
            <Text style={styles.statLabel}>Avg Rating</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#52C17C15' }]}>
              <FontAwesome5 name="calendar-check" size={24} color="#52C17C" />
            </View>
            <Text style={styles.statNumber}>1000+</Text>
            <Text style={styles.statLabel}>Bookings</Text>
          </View>
        </View>

        {/* Enhanced Doctors List */}
        <View style={styles.doctorsSection}>
          <View style={styles.doctorsSectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <View style={styles.sectionIconBadge}>
                <FontAwesome5 name="users" size={14} color="#4A90E2" />
              </View>
              <Text style={styles.sectionTitle}>
                {searchQuery ? 'Search Results' : 'Available Doctors'}
              </Text>
            </View>
            <View style={styles.resultsBadge}>
              <Text style={styles.resultsCount}>{filteredDoctors.length}</Text>
            </View>
          </View>
          
          {filteredDoctors.map((doctor, index) => (
            <View key={index} style={styles.doctorCard}>
              {/* Doctor Header */}
              <View style={styles.doctorHeader}>
                <View style={styles.doctorImageContainer}>
                  <Text style={styles.doctorImage}>{doctor.image}</Text>
                  <View style={[
                    styles.statusDot,
                    doctor.availability.includes('Now') ? styles.statusOnline : styles.statusBusy
                  ]} />
                </View>
                
                <View style={styles.doctorInfo}>
                  <Text style={styles.doctorName}>{doctor.name}</Text>
                  <View style={styles.specialtyBadge}>
                    <Text style={styles.doctorSpecialty}>{doctor.specialty}</Text>
                  </View>
                  <View style={styles.experienceRow}>
                    <View style={styles.experienceIcon}>
                      <FontAwesome5 name="briefcase" size={10} color="#6B7A8A" />
                    </View>
                    <Text style={styles.experienceText}>{doctor.experience} experience</Text>
                  </View>
                </View>

                <View style={styles.ratingBox}>
                  <View style={styles.starIconContainer}>
                    <FontAwesome5 name="star" size={14} color="#FF9500" solid />
                  </View>
                  <Text style={styles.ratingText}>{doctor.rating}</Text>
                  <Text style={styles.reviewsText}>({doctor.reviews})</Text>
                </View>
              </View>

              {/* Doctor Details Grid */}
              <View style={styles.doctorDetailsGrid}>
                <View style={styles.detailItem}>
                  <View style={[styles.detailIconContainer, { backgroundColor: '#4A90E215' }]}>
                    <FontAwesome5 name="clock" size={12} color="#4A90E2" />
                  </View>
                  <Text style={styles.detailText}>{doctor.availability}</Text>
                </View>
                <View style={styles.detailItem}>
                  <View style={[styles.detailIconContainer, { backgroundColor: '#52C17C15' }]}>
                    <FontAwesome5 name="rupee-sign" size={12} color="#52C17C" />
                  </View>
                  <Text style={styles.detailText}>{doctor.consultationFee}</Text>
                </View>
                <View style={styles.detailItem}>
                  <View style={[styles.detailIconContainer, { backgroundColor: '#9B59B615' }]}>
                    <FontAwesome5 name="language" size={12} color="#9B59B6" />
                  </View>
                  <Text style={styles.detailText}>{doctor.languages.join(', ')}</Text>
                </View>
              </View>

              {/* Next Available Banner */}
              <View style={styles.availabilityBanner}>
                <View style={styles.availabilityIconBadge}>
                  <FontAwesome5 name="calendar" size={12} color="#4A90E2" />
                </View>
                <Text style={styles.availabilityText}>
                  Next Available: <Text style={styles.availabilityTime}>{doctor.nextAvailable}</Text>
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.viewProfileButton}>
                  <FontAwesome5 name="user" size={14} color="#4A90E2" />
                  <Text style={styles.viewProfileButtonText}>View Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.bookButton}>
                  <FontAwesome5 name="calendar-check" size={14} color="#FFF" />
                  <Text style={styles.bookButtonText}>Book Now</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Enhanced Emergency Banner */}
        <View style={styles.emergencyBanner}>
          <View style={styles.emergencyIconContainer}>
            <FontAwesome5 name="ambulance" size={28} color="#FF6B9D" />
          </View>
          <View style={styles.emergencyContent}>
            <Text style={styles.emergencyTitle}>Need Emergency Care?</Text>
            <Text style={styles.emergencyText}>24/7 emergency services available</Text>
          </View>
          <TouchableOpacity style={styles.emergencyButton}>
            <FontAwesome5 name="phone-alt" size={14} color="#FFF" />
            <Text style={styles.emergencyButtonText}>Call</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F8FC',
  },
  
  // Modern Header Card
  headerCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 50,
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
  
  // Enhanced Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
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
  clearButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Section Headers
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
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
  
  // Enhanced Specialties
  specialtiesSection: {
    marginBottom: 20,
  },
  specialtiesContent: {
    paddingHorizontal: 16,
  },
  specialtyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#E5EAF0',
    elevation: 1,
  },
  specialtyIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  specialtyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F2340',
    marginRight: 8,
  },
  activeCheckmark: {
    marginLeft: 4,
  },
  
  // Enhanced Stats
  statsSection: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F4F8',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F2340',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7A8A',
    marginTop: 4,
    fontWeight: '600',
  },
  
  // Enhanced Doctors List
  doctorsSection: {
    paddingHorizontal: 16,
  },
  doctorsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  resultsBadge: {
    backgroundColor: '#4A90E215',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  resultsCount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4A90E2',
  },
  doctorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F4F8',
  },
  doctorHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  doctorImageContainer: {
    position: 'relative',
  },
  doctorImage: {
    fontSize: 50,
    marginRight: 12,
  },
  statusDot: {
    position: 'absolute',
    bottom: 4,
    right: 12,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  statusOnline: {
    backgroundColor: '#52C17C',
  },
  statusBusy: {
    backgroundColor: '#FF9500',
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F2340',
    marginBottom: 6,
  },
  specialtyBadge: {
    backgroundColor: '#4A90E215',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 6,
  },
  doctorSpecialty: {
    fontSize: 13,
    color: '#4A90E2',
    fontWeight: '700',
  },
  experienceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  experienceIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F2F4F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  experienceText: {
    fontSize: 12,
    color: '#6B7A8A',
    fontWeight: '600',
  },
  ratingBox: {
    alignItems: 'center',
  },
  starIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF950015',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F2340',
  },
  reviewsText: {
    fontSize: 11,
    color: '#6B7A8A',
    fontWeight: '600',
  },
  
  // Details Grid
  doctorDetailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F0F4F8',
    marginBottom: 14,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  detailText: {
    fontSize: 11,
    color: '#6B7A8A',
    fontWeight: '600',
    flex: 1,
  },
  
  // Availability Banner
  availabilityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F4FF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  availabilityIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  availabilityText: {
    fontSize: 13,
    color: '#6B7A8A',
    fontWeight: '600',
  },
  availabilityTime: {
    fontWeight: '700',
    color: '#4A90E2',
  },
  
  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  viewProfileButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90E215',
    paddingVertical: 12,
    borderRadius: 16,
    gap: 8,
  },
  viewProfileButtonText: {
    color: '#4A90E2',
    fontSize: 14,
    fontWeight: '700',
  },
  bookButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90E2',
    paddingVertical: 12,
    borderRadius: 16,
    gap: 8,
    elevation: 2,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  bookButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  
  // Enhanced Emergency Banner
  emergencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 24,
    padding: 20,
    borderRadius: 20,
    borderLeftWidth: 5,
    borderLeftColor: '#FF6B9D',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  emergencyIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF6B9D15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  emergencyContent: {
    flex: 1,
  },
  emergencyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F2340',
    marginBottom: 4,
  },
  emergencyText: {
    fontSize: 13,
    color: '#6B7A8A',
    fontWeight: '500',
  },
  emergencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B9D',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 8,
    elevation: 2,
  },
  emergencyButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});