import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { PopupContext } from '../context/PopupContext';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function AppPopup() {
  const { popup, hidePopup } = useContext(PopupContext);

  if (!popup) return null;

  const getPopupColor = () => {
    switch (popup.type) {
      case 'error': return '#ef4444';
      case 'success': return '#10b981';
      case 'warning': return '#f59e0b';
      default: return '#3b82f6';
    }
  };

  const getPopupIcon = () => {
    switch (popup.type) {
      case 'error': return 'alert-circle';
      case 'success': return 'checkmark-circle';
      case 'warning': return 'warning';
      default: return 'information-circle';
    }
  };

  return (
    <Modal transparent animationType="fade" visible={!!popup}>
      <View style={styles.overlay}>
        <View style={styles.popupContainer}>
          <View style={[styles.iconContainer, { backgroundColor: getPopupColor() }]}>
            <Ionicons name={getPopupIcon()} size={40} color="#fff" />
          </View>
          <Text style={styles.title}>{popup.title}</Text>
          <Text style={styles.message}>{popup.message}</Text>
          <TouchableOpacity style={[styles.button, { backgroundColor: getPopupColor() }]} onPress={hidePopup}>
            <Text style={styles.buttonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popupContainer: {
    width: '80%',
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    marginTop: -40,
    borderWidth: 4,
    borderColor: '#1f2937',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  message: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
