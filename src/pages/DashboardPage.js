import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { colors, spacing, radii, typography } from "../theme";
import {
  getDashboardStats,
  getOrdersAnalytics,
  getDeliveriesAnalytics,
} from "../services/adminApi";
import { BarChart, LineChart, DonutChart } from "../components/Charts";

export default function DashboardPage({
  onSignOut,
  onOpenLogs,
  canShowLogs = false,
}) {
  const [stats, setStats] = useState(null);
  const [ordersAnalytics, setOrdersAnalytics] = useState([]);
  const [deliveriesAnalytics, setDeliveriesAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ordersPeriod, setOrdersPeriod] = useState("day");
  const [deliveriesPeriod, setDeliveriesPeriod] = useState("day");

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadOrdersAnalytics(ordersPeriod);
  }, [ordersPeriod]);

  useEffect(() => {
    loadDeliveriesAnalytics(deliveriesPeriod);
  }, [deliveriesPeriod]);

  const loadInitialData = async () => {
    setLoading(true);
    await Promise.all([
      loadStats(),
      loadOrdersAnalytics(ordersPeriod),
      loadDeliveriesAnalytics(deliveriesPeriod),
    ]);
    setLoading(false);
  };

  const loadStats = async () => {
    const result = await getDashboardStats();
    if (result.success) {
      setStats(result.data);
    }
  };

  const loadOrdersAnalytics = async (period) => {
    const result = await getOrdersAnalytics(period);
    if (result.success) {
      setOrdersAnalytics(result.data);
    }
  };

  const loadDeliveriesAnalytics = async (period) => {
    const result = await getDeliveriesAnalytics(period);
    if (result.success) {
      setDeliveriesAnalytics(result.data);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    const statusColors = {
      pending: colors.statusPending,
      confirmed: colors.statusConfirmed,
      preparing: colors.statusPreparing,
      ready: colors.statusReady,
      out_for_delivery: colors.statusDelivering,
      delivered: colors.statusDelivered,
      cancelled: colors.statusCancelled,
    };
    return statusColors[status] || colors.textMuted;
  };

  const statusChartData = useMemo(
    () =>
      Object.entries(stats?.statusCounts || {})
        .filter(([, count]) => count > 0)
        .map(([status, count]) => ({
          label: status.replace(/_/g, " "),
          value: count,
          color: getStatusColor(status),
        })),
    [stats],
  );

  const statsBarData = [
    {
      label: "Vendors",
      value: stats?.vendorsCount || 0,
      color: colors.primary,
    },
    { label: "Meals", value: stats?.mealsCount || 0, color: "#FF6B6B" },
    { label: "Orders", value: stats?.ordersCount || 0, color: colors.success },
    { label: "Users", value: stats?.usersCount || 0, color: colors.accent },
  ];

  const todayLabel = new Date().toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const spotlightMetrics = [
    { label: "Pending", value: stats?.pendingOrders || 0, tone: "#FFB547" },
    {
      label: "Revenue Today",
      value: `GHc${stats?.revenueTodayAmount || "0"}`,
      tone: colors.success,
    },
    {
      label: "Active Drivers",
      value: stats?.activeDriversToday || 0,
      tone: colors.primaryLight,
    },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      <LinearGradient
        colors={["#1C2B4A", "#0B1227", "#070B16"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <View style={styles.heroHeader}>
          <View>
            <Text style={styles.heroEyebrow}>Admin Command Center</Text>
            <Text style={styles.heroTitle}>Platform at a glance</Text>
            <Text style={styles.heroSubtitle}>{todayLabel}</Text>
          </View>
          <View style={styles.heroActions}>
            {canShowLogs && (
              <TouchableOpacity
                style={styles.heroActionButton}
                onPress={onOpenLogs}
              >
                <Ionicons
                  name="bug-outline"
                  size={16}
                  color={colors.primaryLight}
                />
                <Text style={styles.heroActionText}>Logs</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.heroActionButton, styles.heroSignOutButton]}
              onPress={onSignOut}
            >
              <Ionicons
                name="log-out-outline"
                size={16}
                color={colors.statusCancelled}
              />
              <Text style={styles.heroSignOutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.heroMetricsRow}>
          {spotlightMetrics.map((metric) => (
            <View key={metric.label} style={styles.heroMetricChip}>
              <View
                style={[
                  styles.heroMetricDot,
                  { backgroundColor: metric.tone + "AA" },
                ]}
              />
              <Text style={styles.heroMetricValue}>{metric.value}</Text>
              <Text style={styles.heroMetricLabel}>{metric.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      <View style={styles.statsGrid}>
        {[
          {
            label: "Vendors",
            value: stats?.vendorsCount || 0,
            accent: colors.primary,
          },
          { label: "Meals", value: stats?.mealsCount || 0, accent: "#FF6B6B" },
          {
            label: "Orders",
            value: stats?.ordersCount || 0,
            accent: colors.success,
          },
          {
            label: "Users",
            value: stats?.usersCount || 0,
            accent: colors.accent,
          },
        ].map((item) => (
          <View key={item.label} style={styles.statCard}>
            <View style={styles.statHeaderRow}>
              <View
                style={[styles.statAccentBar, { backgroundColor: item.accent }]}
              />
              <Text style={styles.statLabel}>{item.label}</Text>
            </View>
            <Text style={styles.statValue}>{item.value}</Text>
          </View>
        ))}
      </View>

      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        style={styles.revenueCard}
      >
        <Text style={styles.revenueLabel}>Total Revenue</Text>
        <Text style={styles.revenueValue}>
          GHc{stats?.totalRevenue?.toFixed(2) || "0.00"}
        </Text>
        <Text style={styles.revenueSubtext}>
          from {stats?.ordersCount || 0} total orders
        </Text>
      </LinearGradient>

      <View style={styles.chartSection}>
        <BarChart data={statsBarData} title="Platform Overview" height={220} />
      </View>

      {statusChartData.length > 0 ? (
        <View style={styles.chartSection}>
          <DonutChart
            data={statusChartData}
            title="Orders by Status"
            size={200}
          />
        </View>
      ) : (
        <View style={styles.chartSection}>
          <Text style={styles.emptyChartText}>No orders available</Text>
        </View>
      )}

      <View style={styles.chartSection}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Orders Trend</Text>
          <View style={styles.periodToggle}>
            {["day", "week", "month"].map((period) => (
              <TouchableOpacity
                key={period}
                style={[
                  styles.periodButton,
                  ordersPeriod === period && styles.periodButtonActive,
                ]}
                onPress={() => setOrdersPeriod(period)}
              >
                <Text
                  style={[
                    styles.periodButtonText,
                    ordersPeriod === period && styles.periodButtonTextActive,
                  ]}
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        {ordersAnalytics.length > 0 ? (
          <LineChart data={ordersAnalytics} title="" height={220} />
        ) : (
          <Text style={styles.emptyChartText}>No order data available</Text>
        )}
      </View>

      <View style={styles.chartSection}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Deliveries Trend</Text>
          <View style={styles.periodToggle}>
            {["day", "week", "month"].map((period) => (
              <TouchableOpacity
                key={period}
                style={[
                  styles.periodButton,
                  deliveriesPeriod === period && styles.periodButtonActive,
                ]}
                onPress={() => setDeliveriesPeriod(period)}
              >
                <Text
                  style={[
                    styles.periodButtonText,
                    deliveriesPeriod === period &&
                      styles.periodButtonTextActive,
                  ]}
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        {deliveriesAnalytics.length > 0 ? (
          <BarChart data={deliveriesAnalytics} title="" height={220} />
        ) : (
          <Text style={styles.emptyChartText}>No delivery data available</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xxxl + spacing.xxxl + spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  heroCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.3,
    color: colors.primaryLight,
    marginBottom: spacing.xs,
  },
  heroTitle: {
    ...typography.headline,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  heroSubtitle: {
    fontSize: 13,
    color: colors.gray200,
    lineHeight: 19,
  },
  heroActions: {
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  heroActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: "rgba(255,255,255,0.07)",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  heroActionText: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: "700",
  },
  heroSignOutButton: {
    borderColor: colors.statusCancelled + "66",
    backgroundColor: colors.statusCancelled + "1F",
  },
  heroSignOutText: {
    color: colors.statusCancelled,
    fontSize: 12,
    fontWeight: "700",
  },
  heroMetricsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  heroMetricChip: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  heroMetricDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: spacing.xs,
  },
  heroMetricValue: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.white,
  },
  heroMetricLabel: {
    marginTop: spacing.xs / 2,
    fontSize: 10,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: spacing.md,
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  statHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  statAccentBar: {
    width: 6,
    height: 18,
    borderRadius: radii.full,
    marginRight: spacing.sm,
  },
  statValue: {
    fontSize: 32,
    fontWeight: "bold",
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  revenueCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.xl,
    borderRadius: radii.lg,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  revenueLabel: {
    fontSize: 14,
    color: colors.white,
    opacity: 0.95,
    marginBottom: spacing.sm,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  revenueValue: {
    fontSize: 36,
    fontWeight: "bold",
    color: colors.white,
  },
  revenueSubtext: {
    fontSize: 13,
    color: colors.white,
    opacity: 0.8,
    marginTop: spacing.xs,
  },
  chartSection: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  emptyChartText: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
    textAlign: "center",
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "500",
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  periodToggle: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  periodButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  periodButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  periodButtonText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  periodButtonTextActive: {
    color: colors.white,
  },
});
