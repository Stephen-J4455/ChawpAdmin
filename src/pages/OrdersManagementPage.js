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
  TextInput,
  Linking,
} from "react-native";
import { colors, spacing, radii } from "../theme";
import { useNotification } from "../contexts/NotificationContext";
import {
  fetchAllOrders,
  updateOrderStatus,
  fetchAllDeliveryPersonnel,
  assignDeliveryToOrder,
  unassignDeliveryFromOrder,
  createDeliveryPayout,
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
  const [contactVendorModalVisible, setContactVendorModalVisible] =
    useState(false);
  const [contactMessage, setContactMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [contactMethod, setContactMethod] = useState("sms"); // 'sms' or 'call'

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
        result.data.filter((p) => p.is_verified && p.is_available),
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
      // Create delivery payout if order is delivered
      if (newStatus === "delivered" && selectedOrder?.delivery_personnel_id) {
        const deliveryFee = selectedOrder.delivery_fee || 0;
        if (deliveryFee > 0) {
          const payoutResult = await createDeliveryPayout({
            deliveryPersonnelId: selectedOrder.delivery_personnel_id,
            orderId: orderId,
            amount: deliveryFee,
            type: "delivery_fee",
            description: `Delivery fee for order #${selectedOrder.order_number || orderId}`,
            status: "pending",
          });

          if (payoutResult.success) {
            showSuccess(
              "Success",
              "Order delivered and payout created for delivery personnel",
            );
          } else {
            showSuccess(
              "Success",
              "Order status updated (payout creation failed)",
            );
          }
        } else {
          showSuccess("Success", "Order status updated successfully");
        }
      } else {
        showSuccess("Success", "Order status updated successfully");
      }

      loadOrders();
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
      deliveryPersonnelId,
    );

    if (result.success) {
      // Update local state directly instead of reloading all orders
      const updatedOrder = {
        ...selectedOrder,
        delivery_personnel_id: deliveryPersonnelId,
      };
      setSelectedOrder(updatedOrder);
      setOrders(
        orders.map((o) => (o.id === selectedOrder.id ? updatedOrder : o)),
      );
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
      // Update local state directly instead of reloading all orders
      const updatedOrder = { ...selectedOrder, delivery_personnel_id: null };
      setSelectedOrder(updatedOrder);
      setOrders(
        orders.map((o) => (o.id === selectedOrder.id ? updatedOrder : o)),
      );
      showSuccess("Success", "Delivery personnel unassigned");
    } else {
      showError("Error", result.error || "Failed to unassign delivery");
    }
    setAssigningDelivery(false);
  };

  const handleContactVendor = () => {
    setContactMessage("");
    setContactMethod("sms");
    setContactVendorModalVisible(true);
  };

  const handleCallVendor = async () => {
    if (!selectedOrder?.chawp_vendors?.phone) {
      showError("Error", "Vendor phone number not available");
      return;
    }

    setSendingMessage(true);
    let phoneNumber = selectedOrder.chawp_vendors.phone;
    // Clean phone number - remove spaces, dashes, parentheses
    phoneNumber = phoneNumber.replace(/[\s\-\(\)]/g, "");
    const phoneUrl = `tel:${phoneNumber}`;

    try {
      const canOpen = await Linking.canOpenURL(phoneUrl);
      // Try to open even if canOpenURL returns false, as it may still work
      if (canOpen) {
        await Linking.openURL(phoneUrl);
        showSuccess("Success", `Calling ${phoneNumber}`);
        setContactVendorModalVisible(false);
      } else {
        // Try anyway - sometimes canOpenURL doesn't work but the actual call does
        try {
          await Linking.openURL(phoneUrl);
          showSuccess("Success", `Calling ${phoneNumber}`);
          setContactVendorModalVisible(false);
        } catch (tryError) {
          showError("Error", "Cannot initiate call on this device");
        }
      }
    } catch (error) {
      showError("Error", "Failed to initiate call");
    } finally {
      setSendingMessage(false);
    }
  };

  const handleSendSMS = async () => {
    if (!selectedOrder?.chawp_vendors?.phone) {
      showError("Error", "Vendor phone number not available");
      return;
    }

    if (!contactMessage.trim()) {
      showError("Error", "Please enter a message");
      return;
    }

    setSendingMessage(true);
    let phoneNumber = selectedOrder.chawp_vendors.phone;
    // Clean phone number - remove spaces, dashes, parentheses
    phoneNumber = phoneNumber.replace(/[\s\-\(\)]/g, "");
    const message = encodeURIComponent(contactMessage);
    const smsUrl = `sms:${phoneNumber}?body=${message}`;

    try {
      const canOpen = await Linking.canOpenURL(smsUrl);
      if (canOpen) {
        await Linking.openURL(smsUrl);
        showSuccess(
          "Success",
          `SMS sent to ${selectedOrder.chawp_vendors?.name || "vendor"}`,
        );
        setContactMessage("");
        setContactVendorModalVisible(false);
      } else {
        // Try anyway - sometimes canOpenURL doesn't work but the actual SMS does
        try {
          await Linking.openURL(smsUrl);
          showSuccess(
            "Success",
            `SMS sent to ${selectedOrder.chawp_vendors?.name || "vendor"}`,
          );
          setContactMessage("");
          setContactVendorModalVisible(false);
        } catch (tryError) {
          showError("Error", "Cannot send SMS on this device");
        }
      }
    } catch (error) {
      showError("Error", "Failed to send SMS");
    } finally {
      setSendingMessage(false);
    }
  };

  const handleSendVendorMessage = async () => {
    if (contactMethod === "sms") {
      await handleSendSMS();
    } else if (contactMethod === "call") {
      await handleCallVendor();
    }
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
        showsHorizontalScrollIndicator={false}
      >
        <TouchableOpacity
          style={[
            styles.filterButton,
            filterStatus === "all" && styles.filterButtonActive,
          ]}
          onPress={() => setFilterStatus("all")}
        >
          <Text
            style={[
              styles.filterText,
              filterStatus === "all" && styles.filterTextActive,
            ]}
          >
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
            onPress={() => setFilterStatus(status.value)}
          >
            <Text
              style={[
                styles.filterText,
                filterStatus === status.value && styles.filterTextActive,
              ]}
            >
              {status.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredOrders.map((order) => (
          <TouchableOpacity
            key={order.id}
            style={styles.orderCard}
            onPress={() => handleViewOrder(order)}
          >
            <View style={styles.orderHeader}>
              <Text style={styles.orderVendor} numberOfLines={2}>
                {order.chawp_vendors?.name || "Unknown Vendor"}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(order.status) + "20" },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: getStatusColor(order.status) },
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit={true}
                  minimumFontScale={0.8}
                >
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
                        })`,
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
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Order Details</Text>

            {selectedOrder && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.detailSection}>
                  <View style={styles.vendorHeaderContainer}>
                    <View style={styles.vendorInfoContainer}>
                      <Text style={styles.detailLabel}>Vendor</Text>
                      <Text style={styles.detailValue}>
                        {selectedOrder.chawp_vendors?.name || "Unknown"}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.contactVendorButton}
                      onPress={handleContactVendor}
                    >
                      <Text style={styles.contactVendorButtonText}>
                        📞 Contact
                      </Text>
                    </TouchableOpacity>
                  </View>
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
                        item.price || item.chawp_meals?.price || 0,
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
                        disabled={assigningDelivery}
                      >
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
                      onPress={() => setDeliveryModalVisible(true)}
                    >
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
                        }
                      >
                        <Text
                          style={[
                            styles.statusButtonText,
                            {
                              color:
                                selectedOrder.status === status.value
                                  ? colors.white
                                  : colors.textPrimary,
                            },
                          ]}
                        >
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
              onPress={() => setModalVisible(false)}
            >
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
        onRequestClose={() => setDeliveryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Assign Delivery Personnel</Text>

            <ScrollView style={styles.deliveryList}>
              {assigningDelivery && (
                <View style={styles.assigningOverlay}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.assigningText}>
                    Assigning delivery...
                  </Text>
                </View>
              )}
              {deliveryPersonnel.length > 0 ? (
                deliveryPersonnel.map((person) => (
                  <TouchableOpacity
                    key={person.id}
                    style={[
                      styles.deliveryPersonCard,
                      assigningDelivery && styles.deliveryPersonCardDisabled,
                    ]}
                    onPress={() => handleAssignDelivery(person.id)}
                    disabled={assigningDelivery || !person.is_available}
                  >
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
              onPress={() => setDeliveryModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Contact Vendor Modal */}
      <Modal
        visible={contactVendorModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setContactVendorModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.contactModalContent}>
            <Text style={styles.modalTitle}>
              Contact {selectedOrder?.chawp_vendors?.name || "Vendor"}
            </Text>

            <View style={styles.contactMethodContainer}>
              <Text style={styles.contactLabel}>Choose Contact Method:</Text>
              <View style={styles.methodButtonsRow}>
                <TouchableOpacity
                  style={[
                    styles.methodButton,
                    contactMethod === "sms" && styles.methodButtonActive,
                  ]}
                  onPress={() => setContactMethod("sms")}
                  disabled={sendingMessage}
                >
                  <Text
                    style={[
                      styles.methodButtonText,
                      contactMethod === "sms" && styles.methodButtonTextActive,
                    ]}
                  >
                    📱 SMS
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.methodButton,
                    contactMethod === "call" && styles.methodButtonActive,
                  ]}
                  onPress={() => setContactMethod("call")}
                  disabled={sendingMessage}
                >
                  <Text
                    style={[
                      styles.methodButtonText,
                      contactMethod === "call" && styles.methodButtonTextActive,
                    ]}
                  >
                    ☎️ Call
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.contactModalBody}>
              {contactMethod === "sms" && (
                <>
                  <Text style={styles.contactLabel}>Message:</Text>
                  <TextInput
                    style={styles.messageInput}
                    placeholder="Type your SMS message..."
                    placeholderTextColor={colors.textMuted}
                    multiline={true}
                    numberOfLines={5}
                    value={contactMessage}
                    onChangeText={setContactMessage}
                    editable={!sendingMessage}
                  />
                </>
              )}

              {contactMethod === "call" && (
                <View style={styles.callInfoContainer}>
                  <Text style={styles.callInfoText}>
                    📞 Tap "Call Vendor" to initiate a phone call
                  </Text>
                  <Text style={styles.callInfoSubtext}>
                    The vendor's phone will ring on your device
                  </Text>
                </View>
              )}

              <Text style={styles.vendorInfoText}>
                Vendor: {selectedOrder?.chawp_vendors?.name}
              </Text>
              {selectedOrder?.chawp_vendors?.phone && (
                <Text style={styles.vendorInfoText}>
                  📞 {selectedOrder.chawp_vendors.phone}
                </Text>
              )}
            </View>

            <View style={styles.contactButtonsContainer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setContactVendorModalVisible(false)}
                disabled={sendingMessage}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.sendButton,
                  sendingMessage && styles.sendButtonDisabled,
                ]}
                onPress={handleSendVendorMessage}
                disabled={
                  sendingMessage || !selectedOrder?.chawp_vendors?.phone
                }
              >
                {sendingMessage ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.sendButtonText}>
                    {contactMethod === "sms" ? "Send SMS" : "Call Vendor"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
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
    position: "relative",
  },
  assigningOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    borderRadius: radii.md,
  },
  assigningText: {
    marginTop: spacing.md,
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
  },
  deliveryPersonCard: {
    backgroundColor: colors.card,
    padding: spacing.lg,
    borderRadius: radii.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deliveryPersonCardDisabled: {
    opacity: 0.5,
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
  // Contact Vendor Styles
  vendorHeaderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  vendorInfoContainer: {
    flex: 1,
  },
  contactVendorButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 80,
  },
  contactVendorButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "600",
  },
  contactModalContent: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.xl * 2,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    maxHeight: "80%",
  },
  contactModalBody: {
    paddingVertical: spacing.lg,
  },
  contactLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  messageInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    backgroundColor: colors.background,
    textAlignVertical: "top",
    marginBottom: spacing.lg,
    fontFamily: "System",
    fontSize: 14,
  },
  vendorInfoText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginVertical: spacing.xs,
    fontWeight: "500",
  },
  contactButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.background,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  sendButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "600",
  },
  contactMethodContainer: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  methodButtonsRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  methodButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  methodButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "15",
  },
  methodButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  methodButtonTextActive: {
    color: colors.primary,
  },
  callInfoContainer: {
    backgroundColor: colors.primary + "10",
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  callInfoText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  callInfoSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
