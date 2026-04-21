import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  StatusBar,
} from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";

const COLORS = {
  success: "#22C55E",
  error: "#EF4444",
  warning: "#F59E0B",
  info: "#3B82F6",
};

const ICONS = {
  success: "check-circle",
  error: "times-circle",
  warning: "exclamation-triangle",
  info: "info-circle",
};

export default function AppPopup({ popup, onClose }) {
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (popup?.visible) {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scale.setValue(0.8);
      opacity.setValue(0);
    }
  }, [popup?.visible]);

  if (!popup?.visible) return null;

  return (
    <Modal
      transparent
      visible={popup.visible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent={true}
      hardwareAccelerated={true}
    >
      <StatusBar backgroundColor="rgba(0,0,0,0.55)" />
      <Animated.View style={[styles.overlay, { opacity }]}>
        <Animated.View
          style={[
            styles.card,
            { transform: [{ scale }] },
          ]}
        >
          {popup.type && ICONS[popup.type] && (
            <FontAwesome5
              name={ICONS[popup.type]}
              size={44}
              color={COLORS[popup.type] || COLORS.info}
              style={styles.icon}
            />
          )}
          <Text style={styles.title}>{popup.title || "Confirm"}</Text>
          {popup.message && (
            <Text style={styles.message}>{popup.message}</Text>
          )}
          <View style={styles.actions}>
            {popup.cancelText && (
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelText}>
                  {popup.cancelText}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.confirmBtn,
                {
                  backgroundColor:
                    popup.type && COLORS[popup.type]
                      ? COLORS[popup.type]
                      : "#3B82F6",
                },
              ]}
              onPress={() => {
                if (popup.onConfirm) {
                  popup.onConfirm();
                }
                onClose();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmText}>
                {popup.confirmText || "OK"}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  card: {
    width: "85%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.44,
    shadowRadius: 10.32,
    elevation: 16,
    zIndex: 10000,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 10,
    textAlign: "center",
  },
  message: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 4,
  },
  actions: {
    flexDirection: "row",
    marginTop: 24,
    gap: 12,
    width: "100%",
    justifyContent: "center",
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    color: "#475569",
    fontWeight: "700",
    fontSize: 16,
  },
});