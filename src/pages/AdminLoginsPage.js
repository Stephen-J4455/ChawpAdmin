import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import { colors, spacing, radii, typography } from "../theme";
import { fetchAdminLoginHistory } from "../services/adminApi";

export default function AdminLoginsPage() {
  const [adminLogins, setAdminLogins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAdminLogins();
  }, []);

  const loadAdminLogins = async () => {
    setLoading(true);
    const result = await fetchAdminLoginHistory();
    if (result.success) {
      setAdminLogins(result.data);
    }
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAdminLogins();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading admin logins...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {adminLogins.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No admin login history</Text>
          </View>
        ) : (
          adminLogins.map((admin) => (
            <View key={admin.id} style={styles.adminCard}>
              <View style={styles.adminInfo}>
                {admin.avatar_url ? (
                  <Image
                    source={{ uri: admin.avatar_url }}
                    style={styles.adminImage}
                  />
                ) : (
                  <View style={styles.adminAvatar}>
                    <Text style={styles.adminAvatarText}>
                      {(admin.full_name || admin.username || "U")
                        .charAt(0)
                        .toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.adminDetails}>
                  <Text style={styles.adminName}>
                    {admin.full_name || admin.username}
                  </Text>
                  <Text style={styles.adminRole}>{admin.role}</Text>
                  <Text style={styles.adminEmail}>{admin.email}</Text>
                  {admin.last_login_at ? (
                    <Text style={styles.lastLoginText}>
                      Last login:{" "}
                      {new Date(admin.last_login_at).toLocaleString()}
                    </Text>
                  ) : (
                    <Text
                      style={[
                        styles.lastLoginText,
                        { color: colors.textMuted },
                      ]}
                    >
                      Never logged in
                    </Text>
                  )}
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    fontSize: typography.body.fontSize,
  },
  emptyContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: typography.body.fontSize,
  },
  adminCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  adminInfo: {
    flexDirection: "row",
    gap: spacing.md,
  },
  adminImage: {
    width: 50,
    height: 50,
    borderRadius: radii.md,
  },
  adminAvatar: {
    width: 50,
    height: 50,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  adminAvatarText: {
    color: colors.card,
    fontSize: 18,
    fontWeight: "bold",
  },
  adminDetails: {
    flex: 1,
    justifyContent: "center",
  },
  adminName: {
    color: colors.textPrimary,
    fontSize: typography.body.fontSize,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  adminRole: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "500",
    marginBottom: spacing.xs,
  },
  adminEmail: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: spacing.xs,
  },
  lastLoginText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontStyle: "italic",
  },
});
