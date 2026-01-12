import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, spacing, radii, typography } from "../theme";

export default function AdminAuthScreen({ onSignIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignIn = async () => {
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    setLoading(true);
    setError("");

    const result = await onSignIn(email, password);

    if (!result.success) {
      setError(result.error || "Failed to sign in");
    }

    setLoading(false);
  };

  return (
    <LinearGradient
      colors={[colors.background, colors.surface, colors.card]}
      style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoIcon}>🍽️</Text>
            </View>
            <Text style={styles.title}>CHAWP ADMIN</Text>
            <Text style={styles.subtitle}>
              Manage your food delivery platform
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>📧 Email</Text>
              <TextInput
                style={styles.input}
                placeholder="admin@chawp.com"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>🔒 Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>

            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>⚠️ {error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSignIn}
              disabled={loading}>
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                style={styles.buttonGradient}>
                {loading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.buttonText}>Sign In 🚀</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>🔐 Secure admin access only</Text>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.xxl,
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.xxxl * 1.5,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.lg,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  logoIcon: {
    fontSize: 50,
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    color: colors.textPrimary,
    letterSpacing: 3,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    opacity: 0.9,
    textAlign: "center",
  },
  form: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
  },
  errorContainer: {
    backgroundColor: colors.error + "20",
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.error + "40",
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    textAlign: "center",
    fontWeight: "500",
  },
  button: {
    borderRadius: radii.md,
    overflow: "hidden",
    marginTop: spacing.md,
  },
  buttonGradient: {
    padding: spacing.lg,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  infoBox: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.primary + "15",
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.primary + "30",
  },
  infoText: {
    color: colors.primary,
    fontSize: 13,
    textAlign: "center",
    fontWeight: "500",
  },
});
