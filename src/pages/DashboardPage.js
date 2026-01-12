import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, spacing, radii, typography } from "../theme";
import { getDashboardStats } from "../services/adminApi";
import { BarChart, LineChart, DonutChart } from "../components/Charts";

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const result = await getDashboardStats();
    if (result.success) {
      setStats(result.data);
    }
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

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

  // Prepare chart data
  const statusChartData = Object.entries(stats?.statusCounts || {}).map(
    ([status, count]) => ({
      label: status.replace(/_/g, " "),
      value: count,
      color: getStatusColor(status),
    })
  );

  const statsBarData = [
    {
      label: "Vendors",
      value: stats?.vendorsCount || 0,
      color: colors.primary,
    },
    { label: "Meals", value: stats?.mealsCount || 0, color: colors.info },
    { label: "Orders", value: stats?.ordersCount || 0, color: colors.success },
    { label: "Users", value: stats?.usersCount || 0, color: colors.accent },
  ];

  // Recent orders trend (last 7 orders for line chart)
  const recentOrdersData = (stats?.recentOrders || [])
    .slice(0, 7)
    .reverse()
    .map((order, index) => ({
      label: `O${index + 1}`,
      value: parseFloat(order.total_amount || 0),
    }));

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }>
      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={styles.statCard}>
          <Text style={styles.statValue}>{stats?.vendorsCount || 0}</Text>
          <Text style={styles.statLabel}>Vendors</Text>
        </LinearGradient>

        <LinearGradient
          colors={[colors.info, "#1F4FCC"]}
          style={styles.statCard}>
          <Text style={styles.statValue}>{stats?.mealsCount || 0}</Text>
          <Text style={styles.statLabel}>Meals</Text>
        </LinearGradient>

        <LinearGradient
          colors={[colors.success, colors.successDark]}
          style={styles.statCard}>
          <Text style={styles.statValue}>{stats?.ordersCount || 0}</Text>
          <Text style={styles.statLabel}>Orders</Text>
        </LinearGradient>

        <LinearGradient
          colors={[colors.accent, colors.accentMuted]}
          style={styles.statCard}>
          <Text style={styles.statValue}>{stats?.usersCount || 0}</Text>
          <Text style={styles.statLabel}>Users</Text>
        </LinearGradient>
      </View>

      {/* Revenue Card */}
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        style={styles.revenueCard}>
        <Text style={styles.revenueLabel}>💰 Total Revenue</Text>
        <Text style={styles.revenueValue}>
          GH₵{stats?.totalRevenue?.toFixed(2) || "0.00"}
        </Text>
        <Text style={styles.revenueSubtext}>
          from {stats?.ordersCount || 0} orders
        </Text>
      </LinearGradient>

      {/* Statistics Bar Chart */}
      <View style={styles.chartSection}>
        <BarChart
          data={statsBarData}
          title="📊 Platform Overview"
          height={220}
        />
      </View>

      {/* Orders Status Donut Chart */}
      {statusChartData.length > 0 && (
        <View style={styles.chartSection}>
          <DonutChart
            data={statusChartData}
            title="📦 Orders by Status"
            size={200}
          />
        </View>
      )}

      {/* Recent Orders Trend */}
      {recentOrdersData.length > 0 && (
        <View style={styles.chartSection}>
          <LineChart
            data={recentOrdersData}
            title="📈 Recent Orders Trend"
            height={220}
          />
        </View>
      )}

      {/* Recent Orders List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🕒 Recent Orders</Text>
        {stats?.recentOrders?.map((order) => (
          <View key={order.id} style={styles.orderCard}>
            <View style={styles.orderHeader}>
              <Text style={styles.orderVendor}>
                {order.chawp_vendors?.name || "Unknown Vendor"}
              </Text>
              <View
                style={[
                  styles.orderStatusBadge,
                  { backgroundColor: getStatusColor(order.status) + "20" },
                ]}>
                <Text
                  style={[
                    styles.orderStatusText,
                    { color: getStatusColor(order.status) },
                  ]}>
                  {order.status}
                </Text>
              </View>
            </View>
            <Text style={styles.orderCustomer}>
              👤{" "}
              {order.chawp_user_profiles?.full_name ||
                order.chawp_user_profiles?.username ||
                "Guest"}
            </Text>
            <View style={styles.orderFooter}>
              <Text style={styles.orderAmount}>
                GH₵{parseFloat(order.total_amount || 0).toFixed(2)}
              </Text>
              <Text style={styles.orderDate}>
                {new Date(order.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
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
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  statValue: {
    fontSize: 32,
    fontWeight: "bold",
    color: colors.white,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: 14,
    color: colors.white,
    opacity: 0.95,
    fontWeight: "500",
  },
  revenueCard: {
    margin: spacing.md,
    marginTop: 0,
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
    fontSize: 16,
    color: colors.white,
    opacity: 0.95,
    marginBottom: spacing.sm,
    fontWeight: "600",
  },
  revenueValue: {
    fontSize: 42,
    fontWeight: "bold",
    color: colors.white,
  },
  revenueSubtext: {
    fontSize: 14,
    color: colors.white,
    opacity: 0.8,
    marginTop: spacing.xs,
  },
  chartSection: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  section: {
    margin: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  orderCard: {
    backgroundColor: colors.card,
    padding: spacing.lg,
    borderRadius: radii.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  orderVendor: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    flex: 1,
  },
  orderStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
  },
  orderStatusText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  orderCustomer: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  orderFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  orderAmount: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.accent,
  },
  orderDate: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
