import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii } from "../theme";
import { sendPushNotification } from "../services/adminApi";
import { useNotification } from "../contexts/NotificationContext";

export default function NotificationsPage() {
  const { showSuccess, showError } = useNotification();
  const [selectedRecipients, setSelectedRecipients] = useState("all");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [lastSent, setLastSent] = useState(null);

  const recipientOptions = [
    { id: "all", label: "All Users", icon: "people" },
    { id: "user", label: "Users", icon: "person" },
    { id: "vendor", label: "Vendors", icon: "storefront" },
    { id: "delivery", label: "Delivery Personnel", icon: "bicycle" },
    { id: "admin", label: "Admins", icon: "shield-checkmark" },
  ];

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      showError("Missing Fields", "Please enter both title and message");
      return;
    }

    setSending(true);
    const result = await sendPushNotification({
      recipients: selectedRecipients,
      title: title.trim(),
      message: message.trim(),
    });

    setSending(false);

    if (result.success) {
      setLastSent({
        recipients: selectedRecipients,
        title,
        message,
        count: result.count,
        timestamp: new Date(),
      });
      setTitle("");
      setMessage("");
      showSuccess(
        "Notification Sent",
        `Successfully sent to ${result.count} user${result.count !== 1 ? "s" : ""}!`,
      );
    } else {
      showError("Send Failed", result.error || "Failed to send notification");
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Ionicons
          name="notifications-outline"
          size={32}
          color={colors.primary}
        />
        <Text style={styles.headerTitle}>Send Push Notifications</Text>
        <Text style={styles.headerSubtitle}>
          Send notifications to users based on their role
        </Text>
      </View>

      {/* Recipients Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Recipients</Text>
        <View style={styles.recipientsGrid}>
          {recipientOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.recipientCard,
                selectedRecipients === option.id && styles.recipientCardActive,
              ]}
              onPress={() => setSelectedRecipients(option.id)}
            >
              <Ionicons
                name={option.icon}
                size={32}
                color={
                  selectedRecipients === option.id
                    ? colors.primary
                    : colors.textSecondary
                }
              />
              <Text
                style={[
                  styles.recipientLabel,
                  selectedRecipients === option.id &&
                    styles.recipientLabelActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Notification Content */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notification Content</Text>

        <Text style={styles.inputLabel}>Title</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Enter notification title"
          placeholderTextColor={colors.textMuted}
          maxLength={100}
        />

        <Text style={styles.inputLabel}>Message</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={message}
          onChangeText={setMessage}
          placeholder="Enter notification message"
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          maxLength={500}
        />

        <View style={styles.characterCount}>
          <Text style={styles.characterCountText}>
            Title: {title.length}/100 | Message: {message.length}/500
          </Text>
        </View>
      </View>

      {/* Preview */}
      {(title || message) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preview</Text>
          <View style={styles.preview}>
            <View style={styles.previewHeader}>
              <Ionicons name="notifications" size={20} color={colors.primary} />
              <Text style={styles.previewTitle}>{title || "Title"}</Text>
            </View>
            <Text style={styles.previewMessage}>{message || "Message"}</Text>
          </View>
        </View>
      )}

      {/* Send Button */}
      <TouchableOpacity
        style={[
          styles.sendButton,
          (!title.trim() || !message.trim() || sending) &&
            styles.sendButtonDisabled,
        ]}
        onPress={handleSend}
        disabled={!title.trim() || !message.trim() || sending}
      >
        {sending ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <>
            <Ionicons name="send" size={20} color={colors.white} />
            <Text style={styles.sendButtonText}>Send Notification</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Last Sent */}
      {lastSent && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Last Sent Notification</Text>
          <View style={styles.lastSentCard}>
            <View style={styles.lastSentHeader}>
              <Text style={styles.lastSentTitle}>{lastSent.title}</Text>
              <Text style={styles.lastSentTime}>
                {lastSent.timestamp.toLocaleTimeString()}
              </Text>
            </View>
            <Text style={styles.lastSentMessage}>{lastSent.message}</Text>
            <View style={styles.lastSentFooter}>
              <Text style={styles.lastSentRecipients}>
                Sent to:{" "}
                {recipientOptions.find((o) => o.id === lastSent.recipients)
                  ?.label || lastSent.recipients}
              </Text>
              <Text style={styles.lastSentCount}>
                {lastSent.count} recipient{lastSent.count !== 1 ? "s" : ""}
              </Text>
            </View>
          </View>
        </View>
      )}

      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.xl,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  section: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  recipientsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  recipientCard: {
    flex: 1,
    minWidth: "30%",
    backgroundColor: colors.card,
    padding: spacing.lg,
    borderRadius: radii.lg,
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.border,
  },
  recipientCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "10",
  },
  recipientLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  recipientLabelActive: {
    color: colors.primary,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    fontSize: 15,
    color: colors.textPrimary,
  },
  textArea: {
    minHeight: 100,
    paddingTop: spacing.md,
  },
  characterCount: {
    alignItems: "flex-end",
    marginTop: spacing.xs,
  },
  characterCountText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  preview: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.textPrimary,
  },
  previewMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  sendButton: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    borderRadius: radii.lg,
    marginHorizontal: spacing.lg,
    gap: spacing.sm,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  sendButtonDisabled: {
    backgroundColor: colors.textMuted,
    elevation: 0,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.white,
  },
  lastSentCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lastSentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  lastSentTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.textPrimary,
    flex: 1,
  },
  lastSentTime: {
    fontSize: 12,
    color: colors.textMuted,
  },
  lastSentMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  lastSentFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  lastSentRecipients: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  lastSentCount: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.success,
  },
});
