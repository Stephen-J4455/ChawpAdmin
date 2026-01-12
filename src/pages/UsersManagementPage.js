import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii } from "../theme";
import {
  fetchAllUsers,
  fetchUserOrders,
  updateUserRole,
  fetchUserVendorBankDetails,
  verifyVendorBankDetails,
  fetchVendorPayouts,
  createVendorPayout,
  updatePayoutStatus,
} from "../services/adminApi";

export default function UsersManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userOrders, setUserOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [roleFilter, setRoleFilter] = useState("all");
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [updatingRole, setUpdatingRole] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [pendingRoleChange, setPendingRoleChange] = useState(null);
  const [notification, setNotification] = useState({
    visible: false,
    type: "",
    message: "",
  });

  // Bank details and payouts state
  const [bankDetails, setBankDetails] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [loadingBankDetails, setLoadingBankDetails] = useState(false);
  const [loadingPayouts, setLoadingPayouts] = useState(false);
  const [vendorId, setVendorId] = useState(null);
  const [verifyingBank, setVerifyingBank] = useState(false);

  // Payout modal state
  const [payoutModalVisible, setPayoutModalVisible] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutNotes, setPayoutNotes] = useState("");
  const [creatingPayout, setCreatingPayout] = useState(false);

  // Role priority for sorting (higher priority first)
  const rolePriority = {
    super_admin: 1,
    admin: 2,
    vendor: 3,
    delivery: 4,
    user: 5,
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const result = await fetchAllUsers();
    if (result.success) {
      // Sort users by role priority
      const sortedUsers = result.data.sort((a, b) => {
        const priorityA = rolePriority[a.role] || 999;
        const priorityB = rolePriority[b.role] || 999;
        return priorityA - priorityB;
      });
      setUsers(sortedUsers);
    }
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const handleViewUser = async (user) => {
    setSelectedUser(user);
    setModalVisible(true);
    setLoadingOrders(true);
    setShowRoleMenu(false);

    // Reset bank details and payouts
    setBankDetails(null);
    setPayouts([]);
    setVendorId(null);

    // Load orders
    const result = await fetchUserOrders(user.id);
    if (result.success) {
      setUserOrders(result.data);
    }
    setLoadingOrders(false);

    // If user is a vendor, load bank details and payouts
    if (user.role === "vendor") {
      loadVendorFinancialData(user.id);
    }
  };

  const loadVendorFinancialData = async (userId) => {
    // Load bank details
    setLoadingBankDetails(true);
    const bankResult = await fetchUserVendorBankDetails(userId);
    if (bankResult.success) {
      setBankDetails(bankResult.data);
      setVendorId(bankResult.vendorId);

      // Load payouts if vendor ID is available
      if (bankResult.vendorId) {
        setLoadingPayouts(true);
        const payoutsResult = await fetchVendorPayouts(bankResult.vendorId);
        if (payoutsResult.success) {
          setPayouts(payoutsResult.data);
        }
        setLoadingPayouts(false);
      }
    }
    setLoadingBankDetails(false);
  };

  const handleVerifyBankDetails = async () => {
    if (!bankDetails || !bankDetails.id) return;

    setVerifyingBank(true);
    const newVerifiedState = !bankDetails.is_verified;

    const result = await verifyVendorBankDetails(
      bankDetails.id,
      newVerifiedState
    );
    if (result.success) {
      setBankDetails({
        ...bankDetails,
        is_verified: newVerifiedState,
        verified_at: newVerifiedState ? new Date().toISOString() : null,
      });
      showNotification(
        "success",
        `Bank details ${
          newVerifiedState ? "verified" : "unverified"
        } successfully`
      );
    } else {
      showNotification(
        "error",
        result.error || "Failed to update verification status"
      );
    }
    setVerifyingBank(false);
  };

  const handleCreatePayout = async () => {
    if (!vendorId || !payoutAmount || parseFloat(payoutAmount) <= 0) {
      showNotification("error", "Please enter a valid payout amount");
      return;
    }

    setCreatingPayout(true);

    const payoutData = {
      vendorId: vendorId,
      amount: parseFloat(payoutAmount),
      status: "pending",
      paymentMethod: bankDetails?.payment_method || "bank_transfer",
      notes: payoutNotes,
    };

    const result = await createVendorPayout(payoutData);
    if (result.success) {
      // Refresh payouts list
      const payoutsResult = await fetchVendorPayouts(vendorId);
      if (payoutsResult.success) {
        setPayouts(payoutsResult.data);
      }

      showNotification("success", "Payout created successfully");
      setPayoutModalVisible(false);
      setPayoutAmount("");
      setPayoutNotes("");
    } else {
      showNotification("error", result.error || "Failed to create payout");
    }

    setCreatingPayout(false);
  };

  const handleUpdatePayoutStatus = async (payoutId, newStatus) => {
    const result = await updatePayoutStatus(payoutId, newStatus);
    if (result.success) {
      // Update local state
      setPayouts(
        payouts.map((p) =>
          p.id === payoutId ? { ...p, status: newStatus } : p
        )
      );
      showNotification("success", "Payout status updated");
    } else {
      showNotification(
        "error",
        result.error || "Failed to update payout status"
      );
    }
  };

  const handleRoleChange = (newRole) => {
    if (!selectedUser || newRole === selectedUser.role) {
      setShowRoleMenu(false);
      return;
    }

    setPendingRoleChange(newRole);
    setShowRoleMenu(false);
    setConfirmModalVisible(true);
  };

  const confirmRoleChange = async () => {
    if (!pendingRoleChange) return;

    setConfirmModalVisible(false);
    setUpdatingRole(true);

    const result = await updateUserRole(selectedUser.id, pendingRoleChange);

    if (result.success) {
      // Update local state
      setSelectedUser({ ...selectedUser, role: pendingRoleChange });
      setUsers(
        users.map((u) =>
          u.id === selectedUser.id ? { ...u, role: pendingRoleChange } : u
        )
      );
      showNotification("success", "User role updated successfully");
    } else {
      showNotification("error", result.error || "Failed to update user role");
    }

    setUpdatingRole(false);
    setPendingRoleChange(null);
  };

  const showNotification = (type, message) => {
    setNotification({ visible: true, type, message });
    setTimeout(() => {
      setNotification({ visible: false, type: "", message: "" });
    }, 3000);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const filteredUsers =
    roleFilter === "all"
      ? users
      : users.filter((user) => user.role === roleFilter);

  const getPayoutStatusColor = (status) => {
    switch (status) {
      case "completed":
        return colors.success;
      case "processing":
        return "#3B82F6";
      case "pending":
        return colors.warning;
      case "failed":
        return colors.error;
      case "cancelled":
        return colors.textSecondary;
      default:
        return colors.textSecondary;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case "super_admin":
        return "#EF4444";
      case "admin":
        return "#F59E0B";
      case "vendor":
        return "#8B5CF6";
      case "delivery":
        return "#10B981";
      case "user":
        return "#3B82F6";
      default:
        return "#6B7280";
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case "super_admin":
        return "Super Admin";
      case "admin":
        return "Admin";
      case "vendor":
        return "Vendor";
      case "delivery":
        return "Delivery";
      case "user":
        return "User";
      default:
        return role;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Users ({filteredUsers.length})</Text>
      </View>

      {/* Role Filter */}
      <ScrollView
        horizontal
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
        showsHorizontalScrollIndicator={false}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            roleFilter === "all" && styles.filterButtonActive,
          ]}
          onPress={() => setRoleFilter("all")}>
          <Text
            style={[
              styles.filterText,
              roleFilter === "all" && styles.filterTextActive,
            ]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            roleFilter === "super_admin" && styles.filterButtonActive,
          ]}
          onPress={() => setRoleFilter("super_admin")}>
          <Text
            style={[
              styles.filterText,
              roleFilter === "super_admin" && styles.filterTextActive,
            ]}>
            Super Admin
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            roleFilter === "admin" && styles.filterButtonActive,
          ]}
          onPress={() => setRoleFilter("admin")}>
          <Text
            style={[
              styles.filterText,
              roleFilter === "admin" && styles.filterTextActive,
            ]}>
            Admin
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            roleFilter === "vendor" && styles.filterButtonActive,
          ]}
          onPress={() => setRoleFilter("vendor")}>
          <Text
            style={[
              styles.filterText,
              roleFilter === "vendor" && styles.filterTextActive,
            ]}>
            Vendor
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            roleFilter === "delivery" && styles.filterButtonActive,
          ]}
          onPress={() => setRoleFilter("delivery")}>
          <Text
            style={[
              styles.filterText,
              roleFilter === "delivery" && styles.filterTextActive,
            ]}>
            Delivery
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            roleFilter === "user" && styles.filterButtonActive,
          ]}
          onPress={() => setRoleFilter("user")}>
          <Text
            style={[
              styles.filterText,
              roleFilter === "user" && styles.filterTextActive,
            ]}>
            User
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {filteredUsers.map((user) => (
          <TouchableOpacity
            key={user.id}
            style={styles.userCard}
            onPress={() => handleViewUser(user)}>
            <View style={styles.userInfo}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(user.full_name || user.username || "U")
                    .charAt(0)
                    .toUpperCase()}
                </Text>
              </View>
              <View style={styles.userDetails}>
                <View style={styles.userNameRow}>
                  <Text style={styles.userName}>
                    {user.full_name || user.username || "Unknown User"}
                  </Text>
                  {user.role && (
                    <View
                      style={[
                        styles.roleBadge,
                        { backgroundColor: getRoleColor(user.role) + "20" },
                      ]}>
                      <Text
                        style={[
                          styles.roleText,
                          { color: getRoleColor(user.role) },
                        ]}>
                        {getRoleLabel(user.role)}
                      </Text>
                    </View>
                  )}
                </View>
                {user.username && user.full_name && (
                  <Text style={styles.userUsername}>@{user.username}</Text>
                )}
                {user.email && (
                  <Text style={styles.userContact}>✉️ {user.email}</Text>
                )}
                {user.phone && (
                  <Text style={styles.userContact}>📞 {user.phone}</Text>
                )}
                {user.address && (
                  <Text style={styles.userContact}>📍 {user.address}</Text>
                )}
                <Text style={styles.userDate}>
                  Joined: {new Date(user.created_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
            <View style={styles.arrowIcon}>
              <Text style={styles.arrowText}>›</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* User Detail Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>User Details</Text>

            {selectedUser && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.modalAvatar}>
                  <Text style={styles.modalAvatarText}>
                    {(selectedUser.full_name || selectedUser.username || "U")
                      .charAt(0)
                      .toUpperCase()}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Full Name</Text>
                  <Text style={styles.detailValue}>
                    {selectedUser.full_name || "N/A"}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Username</Text>
                  <Text style={styles.detailValue}>
                    {selectedUser.username || "N/A"}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Email</Text>
                  <Text style={styles.detailValue}>
                    {selectedUser.email || "N/A"}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Role</Text>
                  <TouchableOpacity
                    style={styles.roleSelector}
                    onPress={() => setShowRoleMenu(!showRoleMenu)}
                    disabled={updatingRole}>
                    <View
                      style={[
                        styles.roleChip,
                        {
                          backgroundColor:
                            getRoleColor(selectedUser.role) + "20",
                        },
                      ]}>
                      <Text
                        style={[
                          styles.roleChipText,
                          { color: getRoleColor(selectedUser.role) },
                        ]}>
                        {getRoleLabel(selectedUser.role)}
                      </Text>
                    </View>
                    <Ionicons
                      name={showRoleMenu ? "chevron-up" : "chevron-down"}
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>

                  {showRoleMenu && (
                    <View style={styles.roleMenu}>
                      {[
                        "user",
                        "delivery",
                        "vendor",
                        "admin",
                        "super_admin",
                      ].map((role) => (
                        <TouchableOpacity
                          key={role}
                          style={[
                            styles.roleMenuItem,
                            selectedUser.role === role &&
                              styles.roleMenuItemActive,
                          ]}
                          onPress={() => handleRoleChange(role)}>
                          <View
                            style={[
                              styles.roleMenuDot,
                              { backgroundColor: getRoleColor(role) },
                            ]}
                          />
                          <Text
                            style={[
                              styles.roleMenuText,
                              selectedUser.role === role &&
                                styles.roleMenuTextActive,
                            ]}>
                            {getRoleLabel(role)}
                          </Text>
                          {selectedUser.role === role && (
                            <Ionicons
                              name="checkmark"
                              size={18}
                              color={colors.primary}
                            />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Phone</Text>
                  <Text style={styles.detailValue}>
                    {selectedUser.phone || "N/A"}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Address</Text>
                  <Text style={styles.detailValue}>
                    {selectedUser.address || "N/A"}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Joined</Text>
                  <Text style={styles.detailValue}>
                    {new Date(selectedUser.created_at).toLocaleString()}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>
                    Order History ({userOrders.length})
                  </Text>
                  {loadingOrders ? (
                    <ActivityIndicator
                      size="small"
                      color={colors.primary}
                      style={{ marginTop: spacing.md }}
                    />
                  ) : userOrders.length > 0 ? (
                    <View style={styles.ordersList}>
                      {userOrders.map((order) => (
                        <View key={order.id} style={styles.orderItem}>
                          <View style={styles.orderItemHeader}>
                            <Text style={styles.orderItemVendor}>
                              {order.chawp_vendors?.name || "Unknown"}
                            </Text>
                            <Text style={styles.orderItemAmount}>
                              GH₵
                              {parseFloat(order.total_amount || 0).toFixed(2)}
                            </Text>
                          </View>
                          <View style={styles.orderItemFooter}>
                            <Text style={styles.orderItemStatus}>
                              {order.status}
                            </Text>
                            <Text style={styles.orderItemDate}>
                              {new Date(order.created_at).toLocaleDateString()}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.emptyText}>No orders yet</Text>
                  )}
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

      {/* Confirmation Modal */}
      <Modal
        visible={confirmModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setConfirmModalVisible(false)}>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <View style={styles.confirmIconContainer}>
              <Ionicons
                name="shield-checkmark"
                size={48}
                color={colors.primary}
              />
            </View>
            <Text style={styles.confirmTitle}>Change User Role</Text>
            <Text style={styles.confirmMessage}>
              Are you sure you want to change{" "}
              <Text style={styles.confirmHighlight}>
                {selectedUser?.full_name ||
                  selectedUser?.username ||
                  "this user"}
              </Text>
              's role to{" "}
              <Text style={styles.confirmHighlight}>
                {getRoleLabel(pendingRoleChange)}
              </Text>
              ?
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.confirmCancelButton}
                onPress={() => {
                  setConfirmModalVisible(false);
                  setPendingRoleChange(null);
                }}>
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={confirmRoleChange}>
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create Payout Modal */}
      <Modal
        visible={payoutModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setPayoutModalVisible(false)}>
        <View style={styles.centeredModalOverlay}>
          <View style={styles.payoutModalContent}>
            <Text style={[styles.modalTitle, { color: "#FFFFFF" }]}>
              Create Payout
            </Text>

            <View style={styles.payoutModalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Payout Amount (GH₵)</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter amount"
                    placeholderTextColor={colors.textSecondary}
                    value={payoutAmount}
                    onChangeText={setPayoutAmount}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Payment Method</Text>
                <View style={styles.paymentMethodDisplay}>
                  <Ionicons
                    name={
                      bankDetails?.payment_method === "mobile_money"
                        ? "phone-portrait"
                        : "card"
                    }
                    size={20}
                    color={colors.primary}
                  />
                  <Text style={styles.paymentMethodText}>
                    {bankDetails?.payment_method === "mobile_money"
                      ? `Mobile Money (${bankDetails?.mobile_money_provider?.toUpperCase()})`
                      : `Bank Transfer (${bankDetails?.bank_name})`}
                  </Text>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Notes (Optional)</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Add notes about this payout"
                    placeholderTextColor={colors.textSecondary}
                    value={payoutNotes}
                    onChangeText={setPayoutNotes}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setPayoutModalVisible(false);
                  setPayoutAmount("");
                  setPayoutNotes("");
                }}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  (!payoutAmount || parseFloat(payoutAmount) <= 0) &&
                    styles.disabledButton,
                ]}
                onPress={handleCreatePayout}
                disabled={
                  creatingPayout ||
                  !payoutAmount ||
                  parseFloat(payoutAmount) <= 0
                }>
                {creatingPayout ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>Create Payout</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Notification Toast */}
      {notification.visible && (
        <View
          style={[
            styles.notification,
            notification.type === "success"
              ? styles.notificationSuccess
              : styles.notificationError,
          ]}>
          <Ionicons
            name={
              notification.type === "success"
                ? "checkmark-circle"
                : "alert-circle"
            }
            size={20}
            color={colors.card}
          />
          <Text style={styles.notificationText}>{notification.message}</Text>
        </View>
      )}
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
    maxHeight: 50,
  },
  filterContent: {
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    gap: spacing.sm,
    alignItems: "center",
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "600",
    lineHeight: 16,
  },
  filterTextActive: {
    color: colors.white,
  },
  scrollView: {
    flex: 1,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
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
  userInfo: {
    flexDirection: "row",
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.white,
  },
  userDetails: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
    flexWrap: "wrap",
  },
  userName: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.textPrimary,
  },
  roleBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  roleText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  userUsername: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  userContact: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  userDate: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  arrowIcon: {
    padding: spacing.sm,
  },
  arrowText: {
    fontSize: 24,
    color: colors.textTertiary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  centeredModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
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
    color: colors.textPrimary || "#1F2937",
    marginBottom: spacing.lg,
  },
  modalBody: {
    maxHeight: 500,
  },
  modalAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: spacing.xl,
  },
  modalAvatarText: {
    fontSize: 32,
    fontWeight: "bold",
    color: colors.white,
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
  ordersList: {
    marginTop: spacing.md,
  },
  orderItem: {
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  orderItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  orderItemVendor: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  orderItemAmount: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.primary,
  },
  orderItemFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  orderItemStatus: {
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: "capitalize",
  },
  orderItemDate: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: "italic",
    marginTop: spacing.md,
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
  roleSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  roleChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
  },
  roleChipText: {
    fontSize: 14,
    fontWeight: "600",
  },
  roleMenu: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  roleMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  roleMenuItemActive: {
    backgroundColor: colors.surface,
  },
  roleMenuDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  roleMenuText: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
  },
  roleMenuTextActive: {
    fontWeight: "600",
    color: colors.primary,
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  confirmBox: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.border,
  },
  confirmIconContainer: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  confirmTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  confirmMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  confirmHighlight: {
    color: colors.primary,
    fontWeight: "600",
  },
  confirmActions: {
    flexDirection: "row",
    gap: spacing.md,
  },
  confirmCancelButton: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: "center",
  },
  confirmCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: "center",
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  notification: {
    position: "absolute",
    top: spacing.xl,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 9999,
  },
  notificationSuccess: {
    backgroundColor: "#10B981",
  },
  notificationError: {
    backgroundColor: "#EF4444",
  },
  notificationText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: colors.card,
  },
  // Bank Details Styles
  bankDetailsCard: {
    backgroundColor: colors.cardBackground || "#F9FAFB",
    padding: spacing.md,
    borderRadius: radii.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border || "#E5E7EB",
  },
  bankDetailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border || "#E5E7EB",
  },
  bankLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  bankValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
  },
  verificationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border || "#E5E7EB",
  },
  verificationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  verificationText: {
    fontSize: 14,
    fontWeight: "600",
  },
  verifyButton: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    minWidth: 80,
    alignItems: "center",
  },
  unverifyButton: {
    backgroundColor: colors.warning,
  },
  verifyButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  verifiedDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    fontStyle: "italic",
  },
  // Payout Styles
  payoutHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  createPayoutButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    gap: spacing.xs,
  },
  createPayoutButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  payoutsList: {
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  payoutItem: {
    backgroundColor: colors.cardBackground || "#F9FAFB",
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border || "#E5E7EB",
  },
  payoutItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  payoutAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  statusBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  payoutItemDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  payoutMethod: {
    fontSize: 13,
    color: colors.textSecondary,
    textTransform: "capitalize",
  },
  payoutDate: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  payoutReference: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontStyle: "italic",
  },
  payoutNotes: {
    fontSize: 13,
    color: colors.text,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border || "#E5E7EB",
  },
  payoutActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  statusActionButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    alignItems: "center",
  },
  statusActionText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  // Payout Modal Styles
  payoutModalContent: {
    backgroundColor: "#1F2937",
    borderRadius: radii.lg,
    padding: spacing.xl,
    width: "90%",
    maxWidth: 500,
    alignSelf: "center",
  },
  payoutModalBody: {
    marginTop: spacing.lg,
    gap: spacing.lg,
  },
  inputGroup: {
    gap: spacing.sm,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  inputWrapper: {
    backgroundColor: "#374151",
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "#4B5563",
  },
  input: {
    padding: spacing.md,
    fontSize: 15,
    color: "#FFFFFF",
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  paymentMethodDisplay: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "#374151",
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "#4B5563",
  },
  paymentMethodText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  modalActions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#374151",
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  disabledButton: {
    opacity: 0.5,
  },
});
