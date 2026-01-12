import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Modal,
} from "react-native";
import { colors, spacing, radii } from "../theme";

const { width } = Dimensions.get("window");

export default function Notification({
  visible,
  type = "info", // 'success', 'error', 'warning', 'info'
  title,
  message,
  onClose,
  duration = 3000,
  actions = [], // Array of { text, onPress, style }
}) {
  const slideAnim = useRef(new Animated.Value(-200)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Slide in and fade in
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto close after duration if no actions
      if (actions.length === 0 && duration > 0) {
        const timer = setTimeout(() => {
          handleClose();
        }, duration);

        return () => clearTimeout(timer);
      }
    } else {
      // Slide out and fade out
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -200,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -200,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onClose) onClose();
    });
  };

  const getTypeConfig = () => {
    switch (type) {
      case "success":
        return {
          icon: "✓",
          color: colors.success,
          bgColor: colors.success + "15",
          borderColor: colors.success,
        };
      case "error":
        return {
          icon: "✕",
          color: colors.error,
          bgColor: colors.error + "15",
          borderColor: colors.error,
        };
      case "warning":
        return {
          icon: "⚠",
          color: colors.accent,
          bgColor: colors.accent + "15",
          borderColor: colors.accent,
        };
      case "info":
      default:
        return {
          icon: "ⓘ",
          color: colors.primary,
          bgColor: colors.primary + "15",
          borderColor: colors.primary,
        };
    }
  };

  const typeConfig = getTypeConfig();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      statusBarTranslucent={true}
      onRequestClose={handleClose}>
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: opacityAnim,
          },
        ]}>
        <Animated.View
          style={[
            styles.container,
            {
              backgroundColor: typeConfig.bgColor,
              borderLeftColor: typeConfig.borderColor,
              transform: [{ translateY: slideAnim }],
            },
          ]}>
          <View style={styles.content}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: typeConfig.color },
              ]}>
              <Text style={styles.icon}>{typeConfig.icon}</Text>
            </View>

            <View style={styles.textContainer}>
              {title && (
                <Text style={[styles.title, { color: typeConfig.color }]}>
                  {title}
                </Text>
              )}
              {message && <Text style={styles.message}>{message}</Text>}

              {actions.length > 0 && (
                <View style={styles.actionsContainer}>
                  {actions.map((action, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.actionButton,
                        action.style === "destructive" &&
                          styles.destructiveButton,
                        action.style === "cancel" && styles.cancelButton,
                      ]}
                      onPress={() => {
                        if (action.onPress) action.onPress();
                        handleClose();
                      }}>
                      <Text
                        style={[
                          styles.actionButtonText,
                          action.style === "destructive" &&
                            styles.destructiveButtonText,
                          action.style === "cancel" && styles.cancelButtonText,
                        ]}>
                        {action.text}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {actions.length === 0 && (
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClose}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "transparent",
    paddingTop: 60,
    paddingHorizontal: spacing.md,
    backgroundColor: "#121f46b7",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  container: {
    width: width - spacing.md * 2,
    maxWidth: 500,
    borderRadius: radii.lg,
    borderLeftWidth: 4,
    backgroundColor: "#20283fff", // Solid darker background for better contrast
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.9,
    shadowRadius: 20,
    elevation: 999,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)", // Subtle light border
  },
  content: {
    flexDirection: "row",
    padding: spacing.lg,
    alignItems: "flex-start",
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  icon: {
    fontSize: 18,
    color: colors.white,
    fontWeight: "bold",
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
    color: "#FFFFFF", // Pure white for maximum visibility
  },
  message: {
    fontSize: 14,
    color: "#E8ECF7", // Very light gray for good readability
    lineHeight: 20,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: spacing.sm,
  },
  closeButtonText: {
    fontSize: 16,
    color: colors.textMuted,
    fontWeight: "bold",
  },
  actionsContainer: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    alignItems: "center",
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.white,
  },
  destructiveButton: {
    backgroundColor: colors.error,
  },
  destructiveButtonText: {
    color: colors.white,
  },
  cancelButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    color: colors.textPrimary,
  },
});
