import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator, 
  ScrollView, 
  StyleSheet,
  Animated,
  Dimensions
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import { auth } from '../../firebaseConfig';
import { 
  signOut, 
  sendPasswordResetEmail, 
  onAuthStateChanged 
} from 'firebase/auth';

const { width } = Dimensions.get('window');

export default function SettingsScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Observe auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, { 
        toValue: 1, 
        duration: 600, 
        useNativeDriver: true 
      }),
      Animated.spring(slideAnim, { 
        toValue: 0, 
        friction: 8, 
        tension: 40, 
        useNativeDriver: true 
      }),
    ]).start();

    // Pulse animation for header icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    return unsubscribe;
  }, []);

  // Reset password
  const handleChangePassword = async () => {
    if (!user?.email) {
      Alert.alert('Error', 'No email found for this account.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, user.email);
      Alert.alert('Success', `Password reset email sent to ${user.email}`);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  // Logout
  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
              Alert.alert('Logged Out', 'You have been signed out successfully.');
              
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingRing}>
          <ActivityIndicator size="large" color="#4A90E2" />
        </View>
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F8FC" />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Modern Header Card */}
      <Animated.View 
        style={[
          styles.headerCard,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerLabel}>ACCOUNT MANAGEMENT</Text>
            <Text style={styles.headerTitle}>Settings</Text>
            <Text style={styles.headerSubtitle}>Manage your preferences</Text>
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
              <FontAwesome5 name="cog" size={24} color="#FFFFFF" />
            </View>
          </Animated.View>
        </View>
      </Animated.View>

      {user ? (
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Enhanced Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                <View style={styles.avatarCircle}>
                  <FontAwesome5 name="user" size={36} color="#4A90E2" />
                </View>
                <View style={styles.statusBadge}>
                  <View style={styles.statusDot} />
                </View>
              </View>
            </View>
            
            <Text style={styles.userEmail}>{user.email}</Text>
            
            <View style={styles.accountInfoRow}>
              <View style={styles.infoCard}>
                <View style={styles.infoIconBadge}>
                  <FontAwesome5 name="calendar-alt" size={12} color="#4A90E2" />
                </View>
                <Text style={styles.infoLabel}>Member since</Text>
                <Text style={styles.infoValue}>
                  {new Date(user.metadata.creationTime).toLocaleDateString('en-US', { 
                    month: 'short', 
                    year: 'numeric' 
                  })}
                </Text>
              </View>
              <View style={styles.infoCard}>
                <View style={styles.infoIconBadge}>
                  <FontAwesome5 name="shield-alt" size={12} color="#52C17C" />
                </View>
                <Text style={styles.infoLabel}>Status</Text>
                <Text style={styles.infoValue}>Active</Text>
              </View>
            </View>
          </View>

          {/* Account Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <View style={styles.sectionIconBadge}>
                  <FontAwesome5 name="user-circle" size={14} color="#4A90E2" />
                </View>
                <Text style={styles.sectionTitle}>Account</Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={handleChangePassword}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIconContainer, { backgroundColor: '#FF950015' }]}>
                  <FontAwesome5 name="key" size={18} color="#FF9500" />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuTitle}>Change Password</Text>
                  <Text style={styles.menuSubtitle}>Reset via email</Text>
                </View>
              </View>
              <View style={styles.menuArrow}>
                <FontAwesome5 name="chevron-right" size={14} color="#C0C0C0" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIconContainer, { backgroundColor: '#4A90E215' }]}>
                  <FontAwesome5 name="bell" size={18} color="#4A90E2" />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuTitle}>Notifications</Text>
                  <Text style={styles.menuSubtitle}>Manage preferences</Text>
                </View>
              </View>
              <View style={styles.menuArrow}>
                <FontAwesome5 name="chevron-right" size={14} color="#C0C0C0" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIconContainer, { backgroundColor: '#52C17C15' }]}>
                  <FontAwesome5 name="shield-alt" size={18} color="#52C17C" />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuTitle}>Privacy & Security</Text>
                  <Text style={styles.menuSubtitle}>Control your data</Text>
                </View>
              </View>
              <View style={styles.menuArrow}>
                <FontAwesome5 name="chevron-right" size={14} color="#C0C0C0" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Health Data Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <View style={styles.sectionIconBadge}>
                  <FontAwesome5 name="heartbeat" size={14} color="#FF6B9D" />
                </View>
                <Text style={styles.sectionTitle}>Health Data</Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.menuItem}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIconContainer, { backgroundColor: '#9B59B615' }]}>
                  <FontAwesome5 name="file-medical" size={18} color="#9B59B6" />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuTitle}>Medical Records</Text>
                  <Text style={styles.menuSubtitle}>View and manage</Text>
                </View>
              </View>
              <View style={styles.menuArrow}>
                <FontAwesome5 name="chevron-right" size={14} color="#C0C0C0" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIconContainer, { backgroundColor: '#FF6B9D15' }]}>
                  <FontAwesome5 name="download" size={18} color="#FF6B9D" />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuTitle}>Export Data</Text>
                  <Text style={styles.menuSubtitle}>Download information</Text>
                </View>
              </View>
              <View style={styles.menuArrow}>
                <FontAwesome5 name="chevron-right" size={14} color="#C0C0C0" />
              </View>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
  style={styles.menuItem}
  activeOpacity={0.7}
  onPress={() => navigation.navigate('AICacheManager')}
>
  <View style={styles.menuItemLeft}>
    <View style={[styles.menuIconContainer, { backgroundColor: '#00BFA615' }]}>
      <FontAwesome5 name="brain" size={18} color="#00BFA6" />
    </View>
    <View style={styles.menuTextContainer}>
      <Text style={styles.menuTitle}>AI Cache Manager</Text>
      <Text style={styles.menuSubtitle}>View, export, and clear AI results</Text>
    </View>
  </View>
  <View style={styles.menuArrow}>
    <FontAwesome5 name="chevron-right" size={14} color="#C0C0C0" />
  </View>
</TouchableOpacity>

          {/* Support Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <View style={styles.sectionIconBadge}>
                  <FontAwesome5 name="life-ring" size={14} color="#52C17C" />
                </View>
                <Text style={styles.sectionTitle}>Support</Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.menuItem}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIconContainer, { backgroundColor: '#4A90E215' }]}>
                  <FontAwesome5 name="question-circle" size={18} color="#4A90E2" />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuTitle}>Help Center</Text>
                  <Text style={styles.menuSubtitle}>Get answers</Text>
                </View>
              </View>
              <View style={styles.menuArrow}>
                <FontAwesome5 name="chevron-right" size={14} color="#C0C0C0" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIconContainer, { backgroundColor: '#FF950015' }]}>
                  <FontAwesome5 name="comment-alt" size={18} color="#FF9500" />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuTitle}>Contact Support</Text>
                  <Text style={styles.menuSubtitle}>Reach our team</Text>
                </View>
              </View>
              <View style={styles.menuArrow}>
                <FontAwesome5 name="chevron-right" size={14} color="#C0C0C0" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIconContainer, { backgroundColor: '#52C17C15' }]}>
                  <FontAwesome5 name="info-circle" size={18} color="#52C17C" />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuTitle}>About</Text>
                  <Text style={styles.menuSubtitle}>Version & info</Text>
                </View>
              </View>
              <View style={styles.menuArrow}>
                <FontAwesome5 name="chevron-right" size={14} color="#C0C0C0" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Enhanced Logout Button */}
          <TouchableOpacity 
            style={styles.logoutButton} 
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <View style={styles.logoutIconContainer}>
              <FontAwesome5 name="sign-out-alt" size={18} color="#FF6B9D" />
            </View>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>

          {/* Version Info */}
          <View style={styles.versionContainer}>
            <View style={styles.versionBadge}>
              <FontAwesome5 name="code" size={12} color="#6B7A8A" />
              <Text style={styles.versionText}>CareSense AI v1.0.0</Text>
            </View>
            <Text style={styles.copyrightText}>© 2025 CareSense. All rights reserved.</Text>
          </View>
        </Animated.View>
      ) : (
        <View style={styles.noUserContainer}>
          <View style={styles.noUserIconContainer}>
            <FontAwesome5 name="user-slash" size={48} color="#C0C0C0" />
          </View>
          <Text style={styles.noUserTitle}>No user logged in</Text>
          <Text style={styles.noUserText}>Please login to access settings</Text>
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.8}
          >
            <FontAwesome5 name="sign-in-alt" size={16} color="#FFF" />
            <Text style={styles.loginButtonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F8FC',
  },
  container: { 
    flex: 1, 
    backgroundColor: '#F5F8FC' 
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#F5F8FC',
  },
  loadingRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    marginBottom: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#6B7A8A',
    fontWeight: '600',
  },

  // Modern Header Card
  headerCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 20,
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
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F2340',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
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

  // Enhanced Profile Card
  profileCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#F0F4F8',
  },
  profileHeader: {
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4A90E215',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#E8F4FF',
  },
  statusBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 2,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#52C17C',
  },
  userEmail: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F2340',
    marginBottom: 20,
    textAlign: 'center',
  },
  accountInfoRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#F9FBFF',
    padding: 14,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8F2FF',
  },
  infoIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 11,
    color: '#6B7A8A',
    fontWeight: '600',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    color: '#0F2340',
    fontWeight: '700',
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F2F4F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F2340',
  },

  // Enhanced Menu Items
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 18,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F4F8',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F2340',
    marginBottom: 3,
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#6B7A8A',
    fontWeight: '500',
  },
  menuArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F2F4F8',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Enhanced Logout Button
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#FF6B9D',
    marginTop: 8,
    elevation: 2,
  },
  logoutIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B9D15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  logoutButtonText: {
    color: '#FF6B9D',
    fontSize: 16,
    fontWeight: '700',
  },

  // Version Info
  versionContainer: {
    alignItems: 'center',
    marginTop: 32,
    paddingBottom: 20,
  },
  versionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F4F8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  versionText: {
    fontSize: 13,
    color: '#6B7A8A',
    fontWeight: '700',
    marginLeft: 8,
  },
  copyrightText: {
    fontSize: 11,
    color: '#A0A0A0',
    fontWeight: '500',
  },

  // No User State
  noUserContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 60,
  },
  noUserIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F2F4F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  noUserTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F2340',
    marginBottom: 8,
  },
  noUserText: {
    fontSize: 14,
    color: '#6B7A8A',
    marginBottom: 24,
    fontWeight: '500',
    textAlign: 'center',
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A90E2',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 20,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    gap: 10,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});