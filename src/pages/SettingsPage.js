import React, { useState, useEffect } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, typography } from "../theme";
import { fetchAppSettings, updateAppSettings } from "../services/adminApi";
import { useAdminAuth } from "../contexts/AdminAuthContext";

export default function SettingsPage() {
  const { userProfile } = useAdminAuth();
  const [serviceFee, setServiceFee] = useState("6");
  const [deliveryFee, setDeliveryFee] = useState("5");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const settings = await fetchAppSettings();
      setServiceFee(String(settings.serviceFee));
      setDeliveryFee(String(settings.deliveryFee));
    } catch (err) {
      setError(err.message || "Failed to load settings");
      console.error("Error loading settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      // Validate inputs
      const serviceFeeNum = parseFloat(serviceFee);
      const deliveryFeeNum = parseFloat(deliveryFee);

      if (isNaN(serviceFeeNum) || serviceFeeNum < 0) {
        Alert.alert("Invalid Input", "Service fee must be a valid number");
        return;
      }

      if (isNaN(deliveryFeeNum) || deliveryFeeNum < 0) {
        Alert.alert("Invalid Input", "Delivery fee must be a valid number");
        return;
      }

      setSaving(true);
      setError(null);

      await updateAppSettings(serviceFeeNum, deliveryFeeNum);

      Alert.alert("Success", "Settings updated successfully");
    } catch (err) {
      const errorMsg = err.message || "Failed to save settings";
      setError(errorMsg);
      Alert.alert("Error", errorMsg);
      console.error("Error saving settings:", err);
    } finally {
      setSaving(false);
    }
  };

  const isAdmin =
    userProfile?.role === "admin" || userProfile?.role === "super_admin";

  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons
            name="lock-closed"
            size={48}
            color={colors.error}
            style={styles.errorIcon}
          />
          <Text style={styles.errorTitle}>Access Denied</Text>
          <Text style={styles.errorMessage}>
            Only admin users can access settings.
          </Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>App Settings</Text>
        <Text style={styles.subtitle}>Configure delivery and service fees</Text>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Ionicons
            name="alert-circle"
            size={20}
            color={colors.error}
            style={styles.errorIcon}
          />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Settings Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Fees Configuration</Text>

        {/* Service Fee */}
        <View style={styles.settingItem}>
          <View style={styles.settingHeader}>
            <Ionicons
              name="settings"
              size={20}
              color={colors.primary}
              style={styles.settingIcon}
            />
            <View style={styles.settingLabelContainer}>
              <Text style={styles.settingLabel}>Service Fee</Text>
              <Text style={styles.settingDescription}>
                Charged per order (GH₵)
              </Text>
            </View>
          </View>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              value={serviceFee}
              onChangeText={setServiceFee}
              keyboardType="decimal-pad"
              editable={!saving}
              placeholderTextColor={colors.textSecondary}
            />
            <Text style={styles.currencySymbol}>GH₵</Text>
          </View>
        </View>

        {/* Delivery Fee */}
        <View style={styles.settingItem}>
          <View style={styles.settingHeader}>
            <Ionicons
              name="bicycle"
              size={20}
              color={colors.primary}
              style={styles.settingIcon}
            />
            <View style={styles.settingLabelContainer}>
              <Text style={styles.settingLabel}>Delivery Fee</Text>
              <Text style={styles.settingDescription}>
                Charged per order (GH₵)
              </Text>
            </View>
          </View>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              value={deliveryFee}
              onChangeText={setDeliveryFee}
              keyboardType="decimal-pad"
              editable={!saving}
              placeholderTextColor={colors.textSecondary}
            />
            <Text style={styles.currencySymbol}>GH₵</Text>
          </View>
        </View>
      </View>

      {/* Preview Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Fee Preview</Text>
        <View style={styles.previewCard}>
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Service Fee:</Text>
            <Text style={styles.previewValue}>
              GH₵ {parseFloat(serviceFee || 0).toFixed(2)}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Delivery Fee:</Text>
            <Text style={styles.previewValue}>
              GH₵ {parseFloat(deliveryFee || 0).toFixed(2)}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Total Fees:</Text>
            <Text style={styles.previewTotal}>
              GH₵{" "}
              {(
                parseFloat(serviceFee || 0) + parseFloat(deliveryFee || 0)
              ).toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={[
            styles.button,
            styles.saveButton,
            saving && styles.buttonDisabled,
          ]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.card} />
          ) : (
            <>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={colors.card}
                style={styles.buttonIcon}
              />
              <Text style={styles.buttonText}>Save Settings</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.resetButton]}
          onPress={loadSettings}
          disabled={saving}
        >
          <Ionicons
            name="refresh-circle"
            size={20}
            color={colors.primary}
            style={styles.buttonIcon}
          />
          <Text style={[styles.buttonText, styles.resetButtonText]}>Reset</Text>
        </TouchableOpacity>
      </View>

      {/* Info Message */}
      <View style={styles.infoBox}>
        <Ionicons
          name="information-circle"
          size={20}
          color={colors.primary}
          style={styles.infoIcon}
        />
        <Text style={styles.infoText}>
          These fees will be applied to all new orders. Existing orders will not
          be affected.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingTop: Platform.OS === "android" ? spacing.xl : spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.headline,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  errorBanner: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
  },
  errorIcon: {
    marginRight: spacing.md,
  },
  errorText: {
    color: colors.error,
    flex: 1,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.subheadline,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textTransform: "uppercase",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  settingItem: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  settingHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  settingIcon: {
    marginRight: spacing.md,
  },
  settingLabelContainer: {
    flex: 1,
  },
  settingLabel: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  settingDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingRight: spacing.md,
  },
  input: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    fontSize: 16,
  },
  currencySymbol: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  previewCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  previewLabel: {
    color: colors.textSecondary,
    ...typography.body,
  },
  previewValue: {
    color: colors.textPrimary,
    ...typography.body,
    fontWeight: "600",
  },
  previewTotal: {
    color: colors.primary,
    ...typography.headline,
    fontWeight: "700",
  },
  buttonGroup: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  resetButton: {
    backgroundColor: colors.background,
    borderColor: colors.primary,
  },
  buttonIcon: {
    marginRight: spacing.sm,
  },
  buttonText: {
    color: colors.card,
    fontWeight: "600",
    fontSize: 14,
  },
  resetButtonText: {
    color: colors.primary,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  infoBox: {
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    borderRadius: radii.md,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  infoIcon: {
    marginRight: spacing.md,
    marginTop: spacing.xs,
  },
  infoText: {
    color: colors.textSecondary,
    flex: 1,
    ...typography.caption,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorTitle: {
    ...typography.headline,
    color: colors.error,
    marginTop: spacing.md,
  },
  errorMessage: {
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: "center",
  },
});
