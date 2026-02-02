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
import {
  getDashboardStats,
  getOrdersAnalytics,
  getDeliveriesAnalytics,
  getOrderCompletionRate,
  getDeliveryTimePerformance,
  getOrdersByHour,
  getTopMealCategories,
  getVendorPerformance,
  getNewUsersTrend,
  getUserRetentionRate,
  getCustomerLifetimeValue,
  getTopMeals,
  getVendorJoinTrend,
  getPlatformGrowth,
  getCustomerSatisfactionTrend,
  getStockIssues,
} from "../services/adminApi";
import { BarChart, LineChart, DonutChart } from "../components/Charts";

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [ordersAnalytics, setOrdersAnalytics] = useState([]);
  const [deliveriesAnalytics, setDeliveriesAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ordersPeriod, setOrdersPeriod] = useState("day");
  const [deliveriesPeriod, setDeliveriesPeriod] = useState("day");
  const [newUsersPeriod, setNewUsersPeriod] = useState("day");
  const [vendorJoinPeriod, setVendorJoinPeriod] = useState("day");
  const [platformGrowthPeriod, setPlatformGrowthPeriod] = useState("day");

  // Performance metrics
  const [completionRate, setCompletionRate] = useState(null);
  const [deliveryTime, setDeliveryTime] = useState(null);
  const [ordersByHour, setOrdersByHour] = useState([]);
  const [topCategories, setTopCategories] = useState([]);
  const [vendorPerformance, setVendorPerformance] = useState([]);

  // User & Growth analytics
  const [newUsersTrend, setNewUsersTrend] = useState([]);
  const [userRetention, setUserRetention] = useState(null);
  const [customerCLV, setCustomerCLV] = useState(null);

  // Business health
  const [topMeals, setTopMeals] = useState([]);
  const [vendorJoinTrend, setVendorJoinTrend] = useState([]);
  const [platformGrowthData, setPlatformGrowthData] = useState({});
  const [customerSatisfaction, setCustomerSatisfaction] = useState([]);
  const [stockIssues, setStockIssues] = useState(null);

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    loadOrdersAnalytics(ordersPeriod);
  }, [ordersPeriod]);

  useEffect(() => {
    loadDeliveriesAnalytics(deliveriesPeriod);
  }, [deliveriesPeriod]);

  useEffect(() => {
    loadNewUsersTrend(newUsersPeriod);
  }, [newUsersPeriod]);

  useEffect(() => {
    loadVendorJoinTrend(vendorJoinPeriod);
  }, [vendorJoinPeriod]);

  useEffect(() => {
    loadPlatformGrowth(platformGrowthPeriod);
  }, [platformGrowthPeriod]);

  const loadAllData = async () => {
    await Promise.all([
      loadStats(),
      loadPerformanceMetrics(),
      loadUserGrowthMetrics(),
      loadBusinessHealthMetrics(),
    ]);
  };

  const loadStats = async () => {
    const result = await getDashboardStats();
    if (result.success) {
      setStats(result.data);
    }
    setLoading(false);
  };

  const loadPerformanceMetrics = async () => {
    const [
      completionRes,
      deliveryTimeRes,
      hourlyRes,
      categoriesRes,
      vendorPerfRes,
    ] = await Promise.all([
      getOrderCompletionRate(),
      getDeliveryTimePerformance(),
      getOrdersByHour(),
      getTopMealCategories(),
      getVendorPerformance(),
    ]);

    if (completionRes.success) setCompletionRate(completionRes);
    if (deliveryTimeRes.success) setDeliveryTime(deliveryTimeRes);
    if (hourlyRes.success) setOrdersByHour(hourlyRes.data);
    if (categoriesRes.success) setTopCategories(categoriesRes.data);
    if (vendorPerfRes.success) setVendorPerformance(vendorPerfRes.data);
  };

  const loadUserGrowthMetrics = async () => {
    const [newUsersRes, retentionRes, clvRes] = await Promise.all([
      getNewUsersTrend(newUsersPeriod),
      getUserRetentionRate(),
      getCustomerLifetimeValue(),
    ]);

    if (newUsersRes.success) setNewUsersTrend(newUsersRes.data);
    if (retentionRes.success) setUserRetention(retentionRes);
    if (clvRes.success) setCustomerCLV(clvRes);
  };

  const loadBusinessHealthMetrics = async () => {
    const [mealsRes, vendorJoinRes, growthRes, satisfactionRes, stockRes] =
      await Promise.all([
        getTopMeals(5),
        getVendorJoinTrend(vendorJoinPeriod),
        getPlatformGrowth(platformGrowthPeriod),
        getCustomerSatisfactionTrend(),
        getStockIssues(),
      ]);

    if (mealsRes.success) setTopMeals(mealsRes.data);
    if (vendorJoinRes.success) setVendorJoinTrend(vendorJoinRes.data);
    if (growthRes.success) setPlatformGrowthData(growthRes.data);
    if (satisfactionRes.success) setCustomerSatisfaction(satisfactionRes.data);
    if (stockRes.success) setStockIssues(stockRes);
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

  const loadNewUsersTrend = async (period) => {
    const result = await getNewUsersTrend(period);
    if (result.success) setNewUsersTrend(result.data);
  };

  const loadVendorJoinTrend = async (period) => {
    const result = await getVendorJoinTrend(period);
    if (result.success) setVendorJoinTrend(result.data);
  };

  const loadPlatformGrowth = async (period) => {
    const result = await getPlatformGrowth(period);
    if (result.success) setPlatformGrowthData(result.data);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    await loadOrdersAnalytics(ordersPeriod);
    await loadDeliveriesAnalytics(deliveriesPeriod);
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
  const statusChartData = Object.entries(stats?.statusCounts || {})
    .filter(([status, count]) => count > 0) // Only include statuses with orders
    .map(([status, count]) => ({
      label: status.replace(/_/g, " "),
      value: count,
      color: getStatusColor(status),
    }));

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
      }
    >
      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={styles.statCard}
        >
          <Text style={styles.statValue}>{stats?.vendorsCount || 0}</Text>
          <Text style={styles.statLabel}>Vendors</Text>
        </LinearGradient>

        <LinearGradient colors={["#FF6B6B", "#EE5A6F"]} style={styles.statCard}>
          <Text style={styles.statValue}>{stats?.mealsCount || 0}</Text>
          <Text style={styles.statLabel}>Meals</Text>
        </LinearGradient>

        <LinearGradient
          colors={[colors.success, colors.successDark]}
          style={styles.statCard}
        >
          <Text style={styles.statValue}>{stats?.ordersCount || 0}</Text>
          <Text style={styles.statLabel}>Orders</Text>
        </LinearGradient>

        <LinearGradient
          colors={[colors.accent, colors.accentMuted]}
          style={styles.statCard}
        >
          <Text style={styles.statValue}>{stats?.usersCount || 0}</Text>
          <Text style={styles.statLabel}>Users</Text>
        </LinearGradient>
      </View>

      {/* Revenue Card */}
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        style={styles.revenueCard}
      >
        <Text style={styles.revenueLabel}>💰 Total Revenue</Text>
        <Text style={styles.revenueValue}>
          GH₵{stats?.totalRevenue?.toFixed(2) || "0.00"}
        </Text>
        <Text style={styles.revenueSubtext}>
          from {stats?.ordersCount || 0} orders
        </Text>
      </LinearGradient>

      {/* Statistics Bar Chart - Platform Overview */}
      <View style={styles.chartSection}>
        <BarChart
          data={statsBarData}
          title="📊 Platform Overview"
          height={220}
        />
      </View>

      {/* Orders Status Donut Chart */}
      {statusChartData.length > 0 ? (
        <View style={styles.chartSection}>
          <DonutChart
            data={statusChartData}
            title="📦 Orders by Status"
            size={200}
          />
        </View>
      ) : (
        <View style={styles.chartSection}>
          <Text style={styles.emptyChartText}>No orders available</Text>
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

      {/* Orders Analytics with Period Toggle */}
      <View style={styles.chartSection}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>📊 Total Orders</Text>
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

      {/* Deliveries Analytics with Period Toggle */}
      <View style={styles.chartSection}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>🚚 Total Deliveries</Text>
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

      {/* Delivery Personnel Today */}
      {stats?.deliveryPersonnelToday?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚗 Delivery Personnel Today</Text>
          {stats.deliveryPersonnelToday.map((person) => (
            <View key={person.id} style={styles.deliveryPersonCard}>
              <View style={styles.deliveryPersonInfo}>
                <View style={styles.deliveryPersonAvatar}>
                  <Text style={styles.deliveryPersonAvatarText}>
                    {(
                      person.chawp_user_profiles?.full_name ||
                      person.chawp_user_profiles?.username ||
                      "D"
                    )
                      .charAt(0)
                      .toUpperCase()}
                  </Text>
                </View>
                <View style={styles.deliveryPersonDetails}>
                  <Text style={styles.deliveryPersonName}>
                    {person.chawp_user_profiles?.full_name ||
                      person.chawp_user_profiles?.username ||
                      "Unknown"}
                  </Text>
                  <Text style={styles.deliveryPersonVehicle}>
                    🚗 {person.vehicle_type}
                    {person.vehicle_registration &&
                      ` - ${person.vehicle_registration}`}
                  </Text>
                </View>
              </View>
              <View style={styles.deliveryPersonStats}>
                <Text style={styles.deliveryCountBadge}>
                  {person.deliveries_today}
                </Text>
                <Text style={styles.deliveryCountLabel}>deliveries</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Quick Stat Cards - NEW */}
      <View style={styles.quickStatsGrid}>
        <LinearGradient
          colors={["#FF9500", "#FF7F00"]}
          style={styles.quickStatCard}
        >
          <Text style={styles.quickStatValue}>{stats?.pendingOrders || 0}</Text>
          <Text style={styles.quickStatLabel}>Pending Orders</Text>
        </LinearGradient>

        <LinearGradient
          colors={["#34C759", "#30B050"]}
          style={styles.quickStatCard}
        >
          <Text style={styles.quickStatValue}>
            GH₵{stats?.revenueTodayAmount || "0"}
          </Text>
          <Text style={styles.quickStatLabel}>Revenue Today</Text>
        </LinearGradient>

        <LinearGradient
          colors={["#5AC8FA", "#4BA3D0"]}
          style={styles.quickStatCard}
        >
          <Text style={styles.quickStatValue}>
            {stats?.activeDriversToday || 0}
          </Text>
          <Text style={styles.quickStatLabel}>Drivers On-Duty</Text>
        </LinearGradient>

        <LinearGradient
          colors={["#FF3B30", "#E53935"]}
          style={styles.quickStatCard}
        >
          <Text style={styles.quickStatValue}>
            {stats?.newUsersTodayCount || 0}
          </Text>
          <Text style={styles.quickStatLabel}>New Users Today</Text>
        </LinearGradient>
      </View>

      {/* PERFORMANCE METRICS */}
      <Text style={styles.sectionDivider}>📈 Performance Metrics</Text>

      {/* Order Completion & Cancellation Rate */}
      {completionRate && (
        <View style={styles.metricsGrid}>
          <LinearGradient
            colors={["#34C759", "#30B050"]}
            style={styles.metricCard}
          >
            <Text style={styles.metricValue}>
              {completionRate.completionRate}%
            </Text>
            <Text style={styles.metricLabel}>Completion Rate</Text>
            <Text style={styles.metricSubtext}>
              {completionRate.deliveredCount} delivered
            </Text>
          </LinearGradient>

          <LinearGradient
            colors={["#FF3B30", "#E53935"]}
            style={styles.metricCard}
          >
            <Text style={styles.metricValue}>
              {completionRate.cancellationRate}%
            </Text>
            <Text style={styles.metricLabel}>Cancellation Rate</Text>
            <Text style={styles.metricSubtext}>
              {completionRate.cancelledCount} cancelled
            </Text>
          </LinearGradient>
        </View>
      )}

      {/* Delivery Time Performance */}
      {deliveryTime && (
        <View style={styles.metricsGrid}>
          <LinearGradient
            colors={["#5AC8FA", "#4BA3D0"]}
            style={styles.metricCard}
          >
            <Text style={styles.metricValue}>
              {deliveryTime.averageMinutes}
            </Text>
            <Text style={styles.metricLabel}>Avg Delivery Time</Text>
            <Text style={styles.metricSubtext}>
              {deliveryTime.totalDeliveries} deliveries
            </Text>
          </LinearGradient>

          <LinearGradient
            colors={["#AF52DE", "#9933CC"]}
            style={styles.metricCard}
          >
            <Text style={styles.metricValue}>{deliveryTime.medianMinutes}</Text>
            <Text style={styles.metricLabel}>Median Delivery Time</Text>
            <Text style={styles.metricSubtext}>Typical duration</Text>
          </LinearGradient>
        </View>
      )}

      {/* Orders by Hour */}
      {ordersByHour.length > 0 && (
        <View style={styles.chartSection}>
          <BarChart
            data={ordersByHour}
            title="🕐 Orders by Hour of Day"
            height={240}
          />
        </View>
      )}

      {/* Top Meal Categories */}
      {topCategories.length > 0 && (
        <View style={styles.chartSection}>
          <BarChart
            data={topCategories}
            title="🍽️ Top Meal Categories"
            height={240}
          />
        </View>
      )}

      {/* Vendor Performance Scorecard */}
      {vendorPerformance.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⭐ Vendor Performance</Text>
          {vendorPerformance.slice(0, 5).map((vendor) => (
            <View key={vendor.id} style={styles.vendorPerformanceCard}>
              <View style={styles.vendorNameRating}>
                <Text style={styles.vendorName}>{vendor.name}</Text>
                <Text style={styles.vendorRating}>⭐ {vendor.rating}</Text>
              </View>
              <View style={styles.vendorMetrics}>
                <Text style={styles.vendorMetricText}>
                  {vendor.completedOrders}/{vendor.totalOrders} orders completed
                </Text>
                <View
                  style={[
                    styles.completionBar,
                    { width: `${vendor.completionRate}%` },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      )}

      {/* USER & GROWTH ANALYTICS */}
      <Text style={styles.sectionDivider}>👥 User & Growth Analytics</Text>

      {/* New Users Trend */}
      {newUsersTrend.length > 0 && (
        <View style={styles.chartSection}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>📱 New Users Trend</Text>
            <View style={styles.periodToggle}>
              {["day", "week", "month"].map((period) => (
                <TouchableOpacity
                  key={period}
                  style={[
                    styles.periodButton,
                    newUsersPeriod === period && styles.periodButtonActive,
                  ]}
                  onPress={() => setNewUsersPeriod(period)}
                >
                  <Text
                    style={[
                      styles.periodButtonText,
                      newUsersPeriod === period &&
                        styles.periodButtonTextActive,
                    ]}
                  >
                    {period.charAt(0).toUpperCase() + period.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <BarChart data={newUsersTrend} title="" height={220} />
        </View>
      )}

      {/* User Retention & CLV */}
      {userRetention && customerCLV && (
        <View style={styles.metricsGrid}>
          <LinearGradient
            colors={["#5AC8FA", "#4BA3D0"]}
            style={styles.metricCard}
          >
            <Text style={styles.metricValue}>
              {userRetention.retentionRate}%
            </Text>
            <Text style={styles.metricLabel}>User Retention Rate</Text>
            <Text style={styles.metricSubtext}>
              {userRetention.repeatCustomers} repeat customers
            </Text>
          </LinearGradient>

          <LinearGradient
            colors={["#FF9500", "#FF7F00"]}
            style={styles.metricCard}
          >
            <Text style={styles.metricValue}>GH₵{customerCLV.averageCLV}</Text>
            <Text style={styles.metricLabel}>Avg Customer Value</Text>
            <Text style={styles.metricSubtext}>
              {customerCLV.totalCustomers} customers
            </Text>
          </LinearGradient>
        </View>
      )}

      {/* BUSINESS HEALTH */}
      <Text style={styles.sectionDivider}>🔥 Business Health</Text>

      {/* Top 5 Meals */}
      {topMeals.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏆 Top 5 Meals</Text>
          {topMeals.map((meal, idx) => (
            <View key={meal.id} style={styles.topMealCard}>
              <Text style={styles.mealRank}>#{idx + 1}</Text>
              <View style={styles.mealInfo}>
                <Text style={styles.mealName}>{meal.name}</Text>
                <Text style={styles.mealPrice}>
                  GH₵{parseFloat(meal.price).toFixed(2)}
                </Text>
              </View>
              <Text style={styles.mealOrders}>{meal.orders} orders</Text>
            </View>
          ))}
        </View>
      )}

      {/* Vendor Join Trend */}
      {vendorJoinTrend.length > 0 && (
        <View style={styles.chartSection}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>🏪 Vendor Join Trend</Text>
            <View style={styles.periodToggle}>
              {["day", "week", "month"].map((period) => (
                <TouchableOpacity
                  key={period}
                  style={[
                    styles.periodButton,
                    vendorJoinPeriod === period && styles.periodButtonActive,
                  ]}
                  onPress={() => setVendorJoinPeriod(period)}
                >
                  <Text
                    style={[
                      styles.periodButtonText,
                      vendorJoinPeriod === period &&
                        styles.periodButtonTextActive,
                    ]}
                  >
                    {period.charAt(0).toUpperCase() + period.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <BarChart data={vendorJoinTrend} title="" height={220} />
        </View>
      )}

      {/* Platform Growth */}
      {Object.keys(platformGrowthData).length > 0 && (
        <View style={styles.chartSection}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>📈 Platform Growth</Text>
            <View style={styles.periodToggle}>
              {["day", "week", "month"].map((period) => (
                <TouchableOpacity
                  key={period}
                  style={[
                    styles.periodButton,
                    platformGrowthPeriod === period &&
                      styles.periodButtonActive,
                  ]}
                  onPress={() => setPlatformGrowthPeriod(period)}
                >
                  <Text
                    style={[
                      styles.periodButtonText,
                      platformGrowthPeriod === period &&
                        styles.periodButtonTextActive,
                    ]}
                  >
                    {period.charAt(0).toUpperCase() + period.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.growthMetricsContainer}>
            {Object.entries(platformGrowthData)
              .slice(-10)
              .map(([date, data]) => (
                <View key={date} style={styles.growthMetricItem}>
                  <Text style={styles.growthMetricDate}>{date}</Text>
                  <View style={styles.growthMetricRow}>
                    <Text style={styles.growthMetricSmall}>
                      👥 {data.users}
                    </Text>
                    <Text style={styles.growthMetricSmall}>
                      🏪 {data.vendors}
                    </Text>
                    <Text style={styles.growthMetricSmall}>
                      📦 {data.orders}
                    </Text>
                  </View>
                </View>
              ))}
          </View>
        </View>
      )}

      {/* Customer Satisfaction Trend */}
      {customerSatisfaction.length > 0 && (
        <View style={styles.chartSection}>
          <LineChart
            data={customerSatisfaction}
            title="⭐ Customer Satisfaction Trend"
            height={220}
          />
        </View>
      )}

      {/* Stock Issues */}
      {stockIssues && stockIssues.outOfStockCount > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            ⚠️ Stock Issues ({stockIssues.outOfStockCount} meals)
          </Text>
          {stockIssues.meals.slice(0, 5).map((meal) => (
            <View key={meal.id} style={styles.stockIssueCard}>
              <Text style={styles.stockIssueMeal}>{meal.name}</Text>
              <View style={styles.stockIssueBadge}>
                <Text style={styles.stockIssueStatus}>Out of Stock</Text>
              </View>
            </View>
          ))}
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
                ]}
              >
                <Text
                  style={[
                    styles.orderStatusText,
                    { color: getStatusColor(order.status) },
                  ]}
                >
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
    fontSize: 16,
    fontWeight: "600",
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
  deliveryPersonCard: {
    backgroundColor: colors.card,
    padding: spacing.lg,
    borderRadius: radii.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
    elevation: 2,
  },
  deliveryPersonInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  deliveryPersonAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  deliveryPersonAvatarText: {
    color: colors.white,
    fontSize: 20,
    fontWeight: "bold",
  },
  deliveryPersonDetails: {
    flex: 1,
  },
  deliveryPersonName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.xs / 2,
  },
  deliveryPersonVehicle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  deliveryPersonStats: {
    alignItems: "center",
  },
  deliveryCountBadge: {
    fontSize: 28,
    fontWeight: "bold",
    color: colors.success,
  },
  deliveryCountLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: spacing.xs / 2,
  },
  // New styles for additional metrics
  sectionDivider: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg * 2,
    marginBottom: spacing.md,
  },
  quickStatsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: spacing.md,
    gap: spacing.md,
  },
  quickStatCard: {
    flex: 0.48,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  quickStatValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.white,
  },
  quickStatLabel: {
    fontSize: 12,
    color: colors.white,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  metricsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  metricCard: {
    flex: 1,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: colors.white,
  },
  metricLabel: {
    fontSize: 13,
    color: colors.white,
    marginTop: spacing.xs,
    textAlign: "center",
    fontWeight: "600",
  },
  metricSubtext: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: spacing.xs / 2,
  },
  vendorPerformanceCard: {
    backgroundColor: colors.card,
    padding: spacing.lg,
    borderRadius: radii.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  vendorNameRating: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  vendorName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    flex: 1,
  },
  vendorRating: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.accent,
  },
  vendorMetrics: {
    backgroundColor: colors.background,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    overflow: "hidden",
  },
  vendorMetricText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  completionBar: {
    height: 6,
    backgroundColor: colors.success,
    borderRadius: 3,
    marginHorizontal: spacing.sm,
  },
  topMealCard: {
    backgroundColor: colors.card,
    padding: spacing.lg,
    borderRadius: radii.lg,
    marginBottom: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  mealRank: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.primary,
    marginRight: spacing.md,
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.xs / 2,
  },
  mealPrice: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  mealOrders: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.accent,
  },
  growthMetricsContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    marginHorizontal: spacing.lg,
    borderRadius: radii.lg,
    marginBottom: spacing.lg,
  },
  growthMetricItem: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  growthMetricDate: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  growthMetricRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  growthMetricSmall: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  stockIssueCard: {
    backgroundColor: colors.card,
    padding: spacing.lg,
    borderRadius: radii.lg,
    marginBottom: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: colors.statusCancelled,
  },
  stockIssueMeal: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
    flex: 1,
  },
  stockIssueBadge: {
    backgroundColor: colors.statusCancelled + "20",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  stockIssueStatus: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.statusCancelled,
  },
});
