import React, {
  useContext,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';

import Ionicons from '@expo/vector-icons/Ionicons';

import { PopupContext } from '../context/PopupContext';
import { AuthContext } from '../context/AuthContext';

export default function AppPopup() {
  const {
    popup,
    hidePopup,
  } = useContext(
    PopupContext,
  );

  const authCtx =
    useContext(
      AuthContext,
    );

  const isDarkMode =
    authCtx?.isDarkMode ?? true;

  if (!popup) {
    return null;
  }

  const theme = {
    cardBg: isDarkMode
      ? '#141C29'
      : '#FFFFFF',

    borderColor: isDarkMode
      ? '#222E40'
      : '#E2E8F0',

    titleColor: isDarkMode
      ? '#FFFFFF'
      : '#111827',

    messageColor: isDarkMode
      ? '#8897AE'
      : '#64748B',

    cancelBg: isDarkMode
      ? '#1C2738'
      : '#F1F5F9',

    cancelText: isDarkMode
      ? '#8897AE'
      : '#64748B',
  };

  const getTypeDetails = () => {
    switch (popup.type) {
      case 'error':
        return {
          color: '#EF4444',
          icon:
            'alert-circle-outline',
        };

      case 'success':
        return {
          color: '#10B981',
          icon:
            'checkmark-circle-outline',
        };

      case 'warning':
        return {
          color: '#F59E0B',
          icon:
            'warning-outline',
        };

      default:
        return {
          color: '#00D4C5',
          icon:
            'information-circle-outline',
        };
    }
  };

  const {
    color: accentColor,
    icon: iconName,
  } = getTypeDetails();

  const handleConfirm = () => {
    if (popup.onConfirm) {
      popup.onConfirm();
    }

    hidePopup();
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={!!popup}
      onRequestClose={
        hidePopup
      }
    >
      <View
        style={
          styles.overlay
        }
      >
        <View
          style={[
            styles.popupCard,
            {
              backgroundColor:
                theme.cardBg,
              borderColor:
                theme.borderColor,
            },
          ]}
        >
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor:
                  `${accentColor}1A`,
                borderColor:
                  accentColor,
              },
            ]}
          >
            <Ionicons
              name={iconName}
              size={32}
              color={accentColor}
            />
          </View>

          <Text
            style={[
              styles.title,
              {
                color:
                  theme.titleColor,
              },
            ]}
          >
            {popup.title}
          </Text>

          <Text
            style={[
              styles.message,
              {
                color:
                  theme.messageColor,
              },
            ]}
          >
            {popup.message}
          </Text>

          <View
            style={
              styles.buttonRow
            }
          >
            {popup.onConfirm && (
              <TouchableOpacity
                style={[
                  styles.btn,
                  {
                    backgroundColor:
                      theme.cancelBg,
                    flex: 1,
                    marginRight: 8,
                  },
                ]}
                onPress={
                  hidePopup
                }
              >
                <Text
                  style={[
                    styles.btnText,
                    {
                      color:
                        theme.cancelText,
                    },
                  ]}
                >
                  {popup.cancelText ||
                    'Cancel'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.btn,
                {
                  backgroundColor:
                    accentColor,

                  flex: popup.onConfirm
                    ? 1
                    : undefined,

                  width:
                    popup.onConfirm
                      ? undefined
                      : '100%',
                },
              ]}
              onPress={
                handleConfirm
              }
            >
              <Text
                style={[
                  styles.btnText,
                  {
                    color:
                      popup.type ===
                      'info'
                        ? '#0A0F1A'
                        : '#FFFFFF',
                  },
                ]}
              >
                {popup.onConfirm
                  ? (
                      popup.confirmText ||
                      'Confirm'
                    )
                  : (
                      popup.confirmText ||
                      'OK'
                    )}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles =
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor:
        'rgba(5, 8, 15, 0.75)',
      justifyContent:
        'center',
      alignItems:
        'center',
      paddingHorizontal: 24,
    },

    popupCard: {
      width: '100%',
      borderRadius: 20,
      borderWidth: 1,
      padding: 24,
      alignItems: 'center',
      elevation: 12,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 8,
      },
      shadowOpacity: 0.3,
      shadowRadius: 16,
    },

    iconCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      borderWidth: 1.5,
      justifyContent:
        'center',
      alignItems:
        'center',
      marginBottom: 16,
    },

    title: {
      fontSize: 18,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: 8,
    },

    message: {
      fontSize: 13,
      textAlign: 'center',
      lineHeight: 19,
      marginBottom: 24,
    },

    buttonRow: {
      flexDirection: 'row',
      width: '100%',
      justifyContent:
        'center',
    },

    btn: {
      height: 44,
      borderRadius: 12,
      justifyContent:
        'center',
      alignItems: 'center',
    },

    btnText: {
      fontSize: 14,
      fontWeight: '700',
    },
  });