import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Image,
} from "react-native";
import { colors, spacing, radii } from "../theme";
import { useNotification } from "../contexts/NotificationContext";
import {
  fetchAllOrders,
  updateOrderStatus,
  fetchAllDeliveryPersonnel,
  assignDeliveryToOrder,
  unassignDeliveryFromOrder,
} from "../services/adminApi";

const ORDER_STATUSES = [
  { value: "pending", label: "Pending", color: "#F59E0B" },
  { value: "confirmed", label: "Confirmed", color: "#3B82F6" },
  { value: "preparing", label: "Preparing", color: "#8B5CF6" },
  { value: "ready", label: "Ready", color: "#10B981" },
  { value: "out_for_delivery", label: "Out for Delivery", color: "#06B6D4" },
  { value: "delivered", label: "Delivered", color: "#10B981" },
  { value: "cancelled", label: "Cancelled", color: "#EF4444" },
];

export default function OrdersManagementPage() {
  const { showSuccess, showError } = useNotification();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [deliveryPersonnel, setDeliveryPersonnel] = useState([]);
  const [deliveryModalVisible, setDeliveryModalVisible] = useState(false);
  const [assigningDelivery, setAssigningDelivery] = useState(false);

  useEffect(() => {
    loadOrders();
    loadDeliveryPersonnel();
  }, []);

  const loadOrders = async () => {
    const result = await fetchAllOrders();
    if (result.success) {
      setOrders(result.data);
    }
    setLoading(false);
  };

  const loadDeliveryPersonnel = async () => {
    const result = await fetchAllDeliveryPersonnel();
    if (result.success) {
      setDeliveryPersonnel(
        result.data.filter((p) => p.is_verified && p.is_available)
      );
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setModalVisible(true);
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    const result = await updateOrderStatus(orderId, newStatus);
    if (result.success) {
      loadOrders();
      showSuccess("Success", "Order status updated successfully");
      setModalVisible(false);
    } else {
      showError("Error", result.error || "Failed to update order status");
    }
  };

  const handleAssignDelivery = async (deliveryPersonnelId) => {
    if (!selectedOrder) return;

    setAssigningDelivery(true);
    const result = await assignDeliveryToOrder(
      selectedOrder.id,
      deliveryPersonnelId
    );

    if (result.success) {
      await loadOrders();
      setSelectedOrder({
        ...selectedOrder,
        delivery_personnel_id: deliveryPersonnelId,
      });
      showSuccess("Success", "Delivery personnel assigned successfully");
      setDeliveryModalVisible(false);
    } else {
      showError("Error", result.error || "Failed to assign delivery");
    }
    setAssigningDelivery(false);
  };

  const handleUnassignDelivery = async () => {
    if (!selectedOrder) return;

    setAssigningDelivery(true);
    const result = await unassignDeliveryFromOrder(selectedOrder.id);

    if (result.success) {
      await loadOrders();
      setSelectedOrder({ ...selectedOrder, delivery_personnel_id: null });
      showSuccess("Success", "Delivery personnel unassigned");
    } else {
      showError("Error", result.error || "Failed to unassign delivery");
    }
    setAssigningDelivery(false);
  };

  const getStatusColor = (status) => {
    const statusObj = ORDER_STATUSES.find((s) => s.value === status);
    return statusObj?.color || "#9CA3AF";
  };

  const filteredOrders =
    filterStatus === "all"
      ? orders
      : orders.filter((order) => order.status === filterStatus);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Orders ({filteredOrders.length})</Text>
      </View>

      {/* Status Filter */}
      <ScrollView
        horizontal
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
        showsHorizontalScrollIndicator={false}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filterStatus === "all" && styles.filterButtonActive,
          ]}
          onPress={() => setFilterStatus("all")}>
          <Text
            style={[
              styles.filterText,
              filterStatus === "all" && styles.filterTextActive,
            ]}>
            All
          </Text>
        </TouchableOpacity>
        {ORDER_STATUSES.map((status) => (
          <TouchableOpacity
            key={status.value}
            style={[
              styles.filterButton,
              filterStatus === status.value && styles.filterButtonActive,
            ]}
            onPress={() => setFilterStatus(status.value)}>
            <Text
              style={[
                styles.filterText,
                filterStatus === status.value && styles.filterTextActive,
              ]}>
              {status.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {filteredOrders.map((order) => (
          <TouchableOpacity
            key={order.id}
            style={styles.orderCard}
            onPress={() => handleViewOrder(order)}>
            <View style={styles.orderHeader}>
              <Text style={styles.orderVendor} numberOfLines={2}>
                {order.chawp_vendors?.name || "Unknown Vendor"}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(order.status) + "20" },
                ]}>
                <Text
                  style={[
                    styles.statusText,
                    { color: getStatusColor(order.status) },
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit={true}
                  minimumFontScale={0.8}>
                  {order.status.replace(/_/g, " ")}
                </Text>
              </View>
            </View>

            <Text style={styles.orderMeals}>
              🍽️{" "}
              {order.items && order.items.length > 0
                ? order.items
                    .map(
                      (item) =>
                        `${item.chawp_meals?.title || "Unknown"} (x${
                          item.quantity
                        })`
                    )
                    .join(", ")
                : "No items"}
            </Text>
            <Text style={styles.orderCustomer}>
              👤{" "}
              {order.chawp_user_profiles?.full_name ||
                order.chawp_user_profiles?.username ||
                "Guest"}
            </Text>
            <Text style={styles.orderAddress}>📍 {order.delivery_address}</Text>
            <Text style={styles.orderPhone}>
              📞 {order.chawp_user_profiles?.phone || "N/A"}
            </Text>

            <View style={styles.orderFooter}>
              <Text style={styles.orderAmount}>
                GH₵{parseFloat(order.total_amount || 0).toFixed(2)}
              </Text>
              <Text style={styles.orderDate}>
                {new Date(order.created_at).toLocaleString()}
              </Text>
            </View>
          </TouchableOpacity>
        ))}

        {filteredOrders.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No orders found</Text>
          </View>
        )}
      </ScrollView>

      {/* Order Detail Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Order Details</Text>

            {selectedOrder && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Vendor</Text>
                  <Text style={styles.detailValue}>
                    {selectedOrder.chawp_vendors?.name || "Unknown"}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Customer</Text>
                  <Text style={styles.detailValue}>
                    {selectedOrder.chawp_user_profiles?.full_name ||
                      selectedOrder.chawp_user_profiles?.username ||
                      "Guest"}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Phone</Text>
                  <Text style={styles.detailValue}>
                    {selectedOrder.chawp_user_profiles?.phone || "N/A"}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Delivery Address</Text>
                  <Text style={styles.detailValue}>
                    {selectedOrder.delivery_address}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Order Items</Text>
                  {selectedOrder.items && selectedOrder.items.length > 0 ? (
                    selectedOrder.items.map((item, index) => {
                      const itemPrice = parseFloat(
                        item.price || item.chawp_meals?.price || 0
                      );
                      return (
                        <View key={index} style={styles.orderItemCard}>
                          {item.chawp_meals?.image && (
                            <Image
                              source={{ uri: item.chawp_meals.image }}
                              style={styles.orderItemImage}
                              resizeMode="cover"
                            />
                          )}
                          <View style={styles.orderItemInfo}>
                            <Text style={styles.orderItemName}>
                              {item.chawp_meals?.title || "Unknown Item"}
                            </Text>
                            <Text style={styles.orderItemDetails}>
                              GH₵{itemPrice.toFixed(2)} × {item.quantity} = GH₵
                              {(itemPrice * item.quantity).toFixed(2)}
                            </Text>
                          </View>
                        </View>
                      );
                    })
                  ) : (
                    <Text style={styles.detailValue}>No items</Text>
                  )}
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Total Amount</Text>
                  <Text style={[styles.detailValue, styles.amountText]}>
                    GH₵{parseFloat(selectedOrder.total_amount || 0).toFixed(2)}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Payment Method</Text>
                  <Text style={styles.detailValue}>
                    {selectedOrder.payment_method}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Created At</Text>
                  <Text style={styles.detailValue}>
                    {new Date(selectedOrder.created_at).toLocaleString()}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Delivery Personnel</Text>
                  {selectedOrder.delivery_personnel_id ? (
                    <View style={styles.deliveryAssignedContainer}>
                      <Text style={styles.detailValue}>Assigned</Text>
                      <TouchableOpacity
                        style={styles.unassignButton}
                        onPress={handleUnassignDelivery}
                        disabled={assigningDelivery}>
                        {assigningDelivery ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.unassignButtonText}>
                            Unassign
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.assignButton}
                      onPress={() => setDeliveryModalVisible(true)}>
                      <Text style={styles.assignButtonText}>
                        + Assign Delivery
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Update Status</Text>
                  <View style={styles.statusButtons}>
                    {ORDER_STATUSES.map((status) => (
                      <TouchableOpacity
                        key={status.value}
                        style={[
                          styles.statusButton,
                          {
                            backgroundColor:
                              selectedOrder.status === status.value
                                ? status.color
                                : colors.card,
                            borderWidth: 1,
                            borderColor:
                              selectedOrder.status === status.value
                                ? status.color
                                : colors.border,
                          },
                        ]}
                        onPress={() =>
                          handleUpdateStatus(selectedOrder.id, status.value)
                        }>
                        <Text
                          style={[
                            styles.statusButtonText,
                            {
                              color:
                                selectedOrder.status === status.value
                                  ? colors.white
                                  : colors.textPrimary,
                            },
                          ]}>
                          {status.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delivery Assignment Modal */}
      <Modal
        visible={deliveryModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDeliveryModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Assign Delivery Personnel</Text>

            <ScrollView style={styles.deliveryList}>
              {deliveryPersonnel.length > 0 ? (
                deliveryPersonnel.map((person) => (
                  <TouchableOpacity
                    key={person.id}
                    style={styles.deliveryPersonCard}
                    onPress={() => handleAssignDelivery(person.id)}
                    disabled={assigningDelivery || !person.is_available}>
                    <View style={styles.deliveryPersonInfo}>
                      <Text style={styles.deliveryPersonName}>
                        {person.chawp_user_profiles?.full_name ||
                          person.chawp_user_profiles?.username ||
                          "Unknown"}
                      </Text>
                      <Text style={styles.deliveryPersonDetails}>
                        🚗 {person.vehicle_type} • ⭐ {person.rating.toFixed(1)}{" "}
                        • 📦 {person.completed_deliveries} deliveries
                      </Text>
                      {person.chawp_user_profiles?.phone && (
                        <Text style={styles.deliveryPersonPhone}>
                          📞 {person.chawp_user_profiles.phone}
                        </Text>
                      )}
                      <View style={styles.deliveryPersonBadges}>
                        {person.is_available && (
                          <View style={styles.availableBadge}>
                            <Text style={styles.availableBadgeText}>
                              Available
                            </Text>
                          </View>
                        )}
                        {person.is_verified && (
                          <View style={styles.verifiedBadge}>
                            <Text style={styles.verifiedBadgeText}>
                              ✓ Verified
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>
                    No available delivery personnel online
                  </Text>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setDeliveryModalVisible(false)}>
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
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
  header: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.textPrimary,
  },
  filterContainer: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    maxHeight: 40,
  },
  filterContent: {
    alignItems: "center",
    paddingVertical: 4,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    marginRight: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    height: 28,
    justifyContent: "center",
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: 12,
    color: colors.textPrimary,
    lineHeight: 14,
  },
  filterTextActive: {
    color: colors.white,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  orderCard: {
    backgroundColor: colors.card,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  orderVendor: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.textPrimary,
    flex: 1,
    flexShrink: 1,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    flexShrink: 0,
    alignSelf: "flex-start",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    flexWrap: "nowrap",
  },
  orderMeals: {
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    fontWeight: "500",
  },
  orderCustomer: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  orderAddress: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  orderPhone: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  orderFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  orderAmount: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.primary,
  },
  orderDate: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  emptyState: {
    padding: spacing.xxxl,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    padding: spacing.xl,
    maxHeight: "90%",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  modalBody: {
    maxHeight: 500,
  },
  detailSection: {
    marginBottom: spacing.lg,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: "uppercase",
  },
  detailValue: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  orderItemRow: {
    marginBottom: spacing.sm,
    paddingLeft: spacing.sm,
  },
  orderItemCard: {
    flexDirection: "row",
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  orderItemImage: {
    width: 80,
    height: 80,
    backgroundColor: colors.background,
  },
  orderItemInfo: {
    flex: 1,
    padding: spacing.sm,
    justifyContent: "center",
  },
  orderItemName: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: "600",
    marginBottom: spacing.xs / 2,
  },
  orderItemDetails: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  amountText: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.primary,
  },
  statusButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  statusButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  statusButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  closeButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    borderRadius: radii.md,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  closeButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
  deliveryAssignedContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  assignButton: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: radii.md,
    alignItems: "center",
  },
  assignButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "600",
  },
  unassignButton: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
  },
  unassignButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "600",
  },
  deliveryList: {
    maxHeight: 400,
  },
  deliveryPersonCard: {
    backgroundColor: colors.card,
    padding: spacing.lg,
    borderRadius: radii.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deliveryPersonInfo: {
    flex: 1,
  },
  deliveryPersonName: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  deliveryPersonDetails: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  deliveryPersonPhone: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  deliveryPersonBadges: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  availableBadge: {
    backgroundColor: colors.success + "20",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: radii.xs,
  },
  availableBadgeText: {
    color: colors.success,
    fontSize: 11,
    fontWeight: "600",
  },
  verifiedBadge: {
    backgroundColor: colors.primary + "20",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: radii.xs,
  },
  verifiedBadgeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "600",
  },
});
