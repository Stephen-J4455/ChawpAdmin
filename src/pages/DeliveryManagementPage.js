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
  TextInput,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii } from "../theme";
import { useNotification } from "../contexts/NotificationContext";
import {
  fetchAllDeliveryPersonnel,
  fetchDeliveryEarnings,
  createDeliveryPayout,
  updateDeliveryEarningStatus,
  updateDeliveryPersonnel,
  fetchDeliveryBankDetails,
  verifyDeliveryBankDetails,
  fetchDeliveryPersonnelOrders,
} from "../services/adminApi";

export default function DeliveryManagementPage() {
  const { showSuccess, showError } = useNotification();
  const [personnel, setPersonnel] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [earnings, setEarnings] = useState([]);
  const [loadingEarnings, setLoadingEarnings] = useState(false);
  const [bankDetails, setBankDetails] = useState(null);
  const [loadingBankDetails, setLoadingBankDetails] = useState(false);
  const [verifyingBank, setVerifyingBank] = useState(false);
  const [deliveryOrders, setDeliveryOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [activeTab, setActiveTab] = useState("earnings"); // 'earnings' or 'history'

  // Payout modal state
  const [payoutModalVisible, setPayoutModalVisible] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutType, setPayoutType] = useState("delivery_fee");
  const [payoutDescription, setPayoutDescription] = useState("");
  const [creatingPayout, setCreatingPayout] = useState(false);

  // Contact personnel state
  const [contactPersonnelModalVisible, setContactPersonnelModalVisible] =
    useState(false);
  const [contactMessage, setContactMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [contactMethod, setContactMethod] = useState("sms"); // 'sms' or 'call'

  useEffect(() => {
    loadPersonnel();
  }, []);

  const loadPersonnel = async () => {
    const result = await fetchAllDeliveryPersonnel();
    if (result.success) {
      setPersonnel(result.data);
    }
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPersonnel();
    setRefreshing(false);
  };

  const handleViewPerson = async (person) => {
    setSelectedPerson(person);
    setModalVisible(true);
    setLoadingEarnings(true);
    setLoadingBankDetails(true);
    setLoadingOrders(true);

    const [earningsResult, bankDetailsResult, ordersResult] = await Promise.all(
      [
        fetchDeliveryEarnings(person.id),
        fetchDeliveryBankDetails(person.id),
        fetchDeliveryPersonnelOrders(person.id),
      ],
    );

    if (earningsResult.success) {
      setEarnings(earningsResult.data);
    }
    if (bankDetailsResult.success) {
      setBankDetails(bankDetailsResult.data);
    }
    if (ordersResult.success) {
      setDeliveryOrders(ordersResult.data);
    }

    setLoadingEarnings(false);
    setLoadingBankDetails(false);
    setLoadingOrders(false);
  };

  const handleToggleBankVerification = async () => {
    if (!bankDetails?.id) return;

    setVerifyingBank(true);
    const result = await verifyDeliveryBankDetails(
      bankDetails.id,
      !bankDetails.is_verified,
    );
    setVerifyingBank(false);

    if (result.success) {
      setBankDetails(result.data);
      showSuccess(
        "Success",
        `Payment details ${
          !bankDetails.is_verified ? "verified" : "unverified"
        }`,
      );
    } else {
      showError("Error", result.error || "Failed to update verification");
    }
  };

  const handleToggleVerification = async (personId, currentStatus) => {
    const result = await updateDeliveryPersonnel(personId, {
      is_verified: !currentStatus,
      verified_at: !currentStatus ? new Date().toISOString() : null,
    });

    if (result.success) {
      await loadPersonnel();
      if (selectedPerson?.id === personId) {
        setSelectedPerson({
          ...selectedPerson,
          is_verified: !currentStatus,
          verified_at: !currentStatus ? new Date().toISOString() : null,
        });
      }
      showSuccess(
        "Success",
        `Delivery personnel ${!currentStatus ? "verified" : "unverified"}`,
      );
    } else {
      showError("Error", result.error || "Failed to update verification");
    }
  };

  const handleCreatePayout = async () => {
    if (!selectedPerson || !payoutAmount || parseFloat(payoutAmount) <= 0) {
      showError("Error", "Please enter a valid payout amount");
      return;
    }

    if (!bankDetails) {
      showError(
        "Error",
        "Delivery personnel has not added payment details yet",
      );
      return;
    }

    if (!bankDetails.is_verified) {
      showError(
        "Error",
        "Payment details must be verified before creating payouts",
      );
      return;
    }

    setCreatingPayout(true);

    const payoutData = {
      deliveryPersonnelId: selectedPerson.id,
      amount: parseFloat(payoutAmount),
      type: payoutType,
      description: payoutDescription || `${payoutType} payment`,
      status: "pending",
    };

    const result = await createDeliveryPayout(payoutData);
    if (result.success) {
      // Refresh earnings list
      const earningsResult = await fetchDeliveryEarnings(selectedPerson.id);
      if (earningsResult.success) {
        setEarnings(earningsResult.data);
      }

      showSuccess("Success", "Payout created successfully");
      setPayoutModalVisible(false);
      setPayoutAmount("");
      setPayoutDescription("");
      setPayoutType("delivery_fee");
    } else {
      showError("Error", result.error || "Failed to create payout");
    }

    setCreatingPayout(false);
  };

  const handleUpdateEarningStatus = async (earningId, newStatus) => {
    const result = await updateDeliveryEarningStatus(earningId, newStatus);
    if (result.success) {
      // Update local state
      setEarnings(
        earnings.map((e) =>
          e.id === earningId ? { ...e, status: newStatus } : e,
        ),
      );
      showSuccess("Success", "Earning status updated");
    } else {
      showError("Error", result.error || "Failed to update status");
    }
  };

  const handleContactPersonnel = async () => {
    setContactPersonnelModalVisible(true);
    setContactMethod("sms");
    setContactMessage("");
  };

  const handleCallPersonnel = async () => {
    if (!selectedPerson?.chawp_user_profiles?.phone) {
      showError("Error", "Personnel phone number not available");
      return;
    }

    setSendingMessage(true);
    let phoneNumber = selectedPerson.chawp_user_profiles.phone;
    // Clean phone number - remove spaces, dashes, parentheses
    phoneNumber = phoneNumber.replace(/[\s\-\(\)]/g, "");
    const phoneUrl = `tel:${phoneNumber}`;

    try {
      const canOpen = await Linking.canOpenURL(phoneUrl);
      if (canOpen) {
        await Linking.openURL(phoneUrl);
        showSuccess("Success", `Calling ${phoneNumber}`);
        setContactPersonnelModalVisible(false);
      } else {
        // Try anyway - sometimes canOpenURL doesn't work but the actual call does
        try {
          await Linking.openURL(phoneUrl);
          showSuccess("Success", `Calling ${phoneNumber}`);
          setContactPersonnelModalVisible(false);
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
    if (!selectedPerson?.chawp_user_profiles?.phone) {
      showError("Error", "Personnel phone number not available");
      return;
    }

    if (!contactMessage.trim()) {
      showError("Error", "Please enter a message");
      return;
    }

    setSendingMessage(true);
    let phoneNumber = selectedPerson.chawp_user_profiles.phone;
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
          `SMS sent to ${selectedPerson.chawp_user_profiles?.full_name || "personnel"}`,
        );
        setContactMessage("");
        setContactPersonnelModalVisible(false);
      } else {
        // Try anyway - sometimes canOpenURL doesn't work but the actual SMS does
        try {
          await Linking.openURL(smsUrl);
          showSuccess(
            "Success",
            `SMS sent to ${selectedPerson.chawp_user_profiles?.full_name || "personnel"}`,
          );
          setContactMessage("");
          setContactPersonnelModalVisible(false);
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

  const handleSendPersonnelMessage = async () => {
    if (contactMethod === "sms") {
      await handleSendSMS();
    } else if (contactMethod === "call") {
      await handleCallPersonnel();
    }
  };

  const getEarningStatusColor = (status) => {
    switch (status) {
      case "paid":
        return colors.success;
      case "pending":
        return colors.warning;
      case "cancelled":
        return colors.textSecondary;
      default:
        return colors.textSecondary;
    }
  };

  const calculateTotalEarnings = () => {
    return earnings
      .filter((e) => e.status !== "cancelled")
      .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  };

  const calculatePendingEarnings = () => {
    return earnings
      .filter((e) => e.status === "pending")
      .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  };

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
        <Text style={styles.headerTitle}>
          Delivery Personnel ({personnel.length})
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {personnel.map((person) => (
          <TouchableOpacity
            key={person.id}
            style={styles.personCard}
            onPress={() => handleViewPerson(person)}
          >
            <View style={styles.personInfo}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(
                    person.chawp_user_profiles?.full_name ||
                    person.chawp_user_profiles?.username ||
                    "D"
                  )
                    .charAt(0)
                    .toUpperCase()}
                </Text>
              </View>
              <View style={styles.personDetails}>
                <Text style={styles.personName}>
                  {person.chawp_user_profiles?.full_name ||
                    person.chawp_user_profiles?.username ||
                    "Unknown"}
                </Text>
                <Text style={styles.personVehicle}>
                  🚗 {person.vehicle_type}{" "}
                  {person.vehicle_registration &&
                    `• ${person.vehicle_registration}`}
                </Text>
                <Text style={styles.personStats}>
                  ⭐ {person.rating.toFixed(1)} • 📦{" "}
                  {person.completed_deliveries} deliveries
                </Text>
                <View style={styles.personBadges}>
                  {person.is_available && (
                    <View style={styles.availableBadge}>
                      <Text style={styles.availableBadgeText}>Available</Text>
                    </View>
                  )}
                  {person.is_verified ? (
                    <View style={styles.verifiedBadge}>
                      <Text style={styles.verifiedBadgeText}>✓ Verified</Text>
                    </View>
                  ) : (
                    <View style={styles.unverifiedBadge}>
                      <Text style={styles.unverifiedBadgeText}>
                        ⚠ Unverified
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={24}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        ))}

        {personnel.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No delivery personnel found</Text>
          </View>
        )}
      </ScrollView>

      {/* Person Detail Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delivery Personnel Details</Text>

            {selectedPerson && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.modalAvatar}>
                  <Text style={styles.modalAvatarText}>
                    {(
                      selectedPerson.chawp_user_profiles?.full_name ||
                      selectedPerson.chawp_user_profiles?.username ||
                      "D"
                    )
                      .charAt(0)
                      .toUpperCase()}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Name</Text>
                  <Text style={styles.detailValue}>
                    {selectedPerson.chawp_user_profiles?.full_name ||
                      selectedPerson.chawp_user_profiles?.username ||
                      "N/A"}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Phone</Text>
                  <Text style={styles.detailValue}>
                    {selectedPerson.chawp_user_profiles?.phone || "N/A"}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Vehicle</Text>
                  <Text style={styles.detailValue}>
                    {selectedPerson.vehicle_type} •{" "}
                    {selectedPerson.vehicle_color || "N/A"} •{" "}
                    {selectedPerson.vehicle_registration || "No Reg"}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Performance</Text>
                  <View style={styles.performanceGrid}>
                    <View style={styles.performanceCard}>
                      <View style={styles.performanceIconContainer}>
                        <Text style={styles.performanceIcon}>⭐</Text>
                      </View>
                      <Text style={styles.performanceValue}>
                        {selectedPerson.rating.toFixed(2)}
                      </Text>
                      <Text style={styles.performanceLabel}>Rating</Text>
                    </View>
                    <View style={styles.performanceCard}>
                      <View style={styles.performanceIconContainer}>
                        <Text style={styles.performanceIcon}>📦</Text>
                      </View>
                      <Text style={styles.performanceValue}>
                        {selectedPerson.total_deliveries}
                      </Text>
                      <Text style={styles.performanceLabel}>Total</Text>
                    </View>
                    <View style={styles.performanceCard}>
                      <View style={styles.performanceIconContainer}>
                        <Text style={styles.performanceIcon}>✅</Text>
                      </View>
                      <Text style={styles.performanceValue}>
                        {selectedPerson.completed_deliveries}
                      </Text>
                      <Text style={styles.performanceLabel}>Completed</Text>
                    </View>
                    <View style={styles.performanceCard}>
                      <View style={styles.performanceIconContainer}>
                        <Text style={styles.performanceIcon}>❌</Text>
                      </View>
                      <Text style={styles.performanceValue}>
                        {selectedPerson.cancelled_deliveries}
                      </Text>
                      <Text style={styles.performanceLabel}>Cancelled</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <View style={styles.statusRow}>
                    <View
                      style={[
                        styles.statusBadgeLarge,
                        {
                          backgroundColor: selectedPerson.is_available
                            ? colors.success + "20"
                            : colors.textSecondary + "20",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          {
                            color: selectedPerson.is_available
                              ? colors.success
                              : colors.textSecondary,
                          },
                        ]}
                      >
                        {selectedPerson.is_available
                          ? "Available"
                          : "Unavailable"}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Verification</Text>
                  <View style={styles.verificationRow}>
                    <View
                      style={[
                        styles.statusBadgeLarge,
                        {
                          backgroundColor: selectedPerson.is_verified
                            ? colors.primary + "20"
                            : colors.warning + "20",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          {
                            color: selectedPerson.is_verified
                              ? colors.primary
                              : colors.warning,
                          },
                        ]}
                      >
                        {selectedPerson.is_verified
                          ? "✓ Verified"
                          : "⚠ Unverified"}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.verifyButton,
                        selectedPerson.is_verified && styles.unverifyButton,
                      ]}
                      onPress={() =>
                        handleToggleVerification(
                          selectedPerson.id,
                          selectedPerson.is_verified,
                        )
                      }
                    >
                      <Text style={styles.verifyButtonText}>
                        {selectedPerson.is_verified ? "Unverify" : "Verify"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Payment Details Section */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Payment Details</Text>
                  {loadingBankDetails ? (
                    <ActivityIndicator
                      size="small"
                      color={colors.primary}
                      style={{ marginTop: spacing.md }}
                    />
                  ) : bankDetails ? (
                    <View style={styles.bankDetailsCard}>
                      <View style={styles.bankDetailRow}>
                        <Text style={styles.bankDetailLabel}>
                          Payment Method
                        </Text>
                        <Text style={styles.bankDetailValue}>
                          {bankDetails.payment_method === "bank"
                            ? "Bank Account"
                            : "Mobile Money"}
                        </Text>
                      </View>

                      {bankDetails.payment_method === "bank" ? (
                        <>
                          <View style={styles.bankDetailRow}>
                            <Text style={styles.bankDetailLabel}>Bank</Text>
                            <Text style={styles.bankDetailValue}>
                              {bankDetails.bank_name}
                            </Text>
                          </View>
                          <View style={styles.bankDetailRow}>
                            <Text style={styles.bankDetailLabel}>
                              Account Name
                            </Text>
                            <Text style={styles.bankDetailValue}>
                              {bankDetails.account_name}
                            </Text>
                          </View>
                          <View style={styles.bankDetailRow}>
                            <Text style={styles.bankDetailLabel}>
                              Account Number
                            </Text>
                            <Text style={styles.bankDetailValue}>
                              {bankDetails.account_number}
                            </Text>
                          </View>
                        </>
                      ) : (
                        <>
                          <View style={styles.bankDetailRow}>
                            <Text style={styles.bankDetailLabel}>Provider</Text>
                            <Text style={styles.bankDetailValue}>
                              {bankDetails.mobile_money_provider?.toUpperCase()}
                            </Text>
                          </View>
                          <View style={styles.bankDetailRow}>
                            <Text style={styles.bankDetailLabel}>Number</Text>
                            <Text style={styles.bankDetailValue}>
                              {bankDetails.mobile_money_number}
                            </Text>
                          </View>
                          <View style={styles.bankDetailRow}>
                            <Text style={styles.bankDetailLabel}>Name</Text>
                            <Text style={styles.bankDetailValue}>
                              {bankDetails.mobile_money_name}
                            </Text>
                          </View>
                        </>
                      )}

                      <View style={styles.verificationRow}>
                        <View style={styles.verificationBadge}>
                          <Ionicons
                            name={
                              bankDetails.is_verified
                                ? "checkmark-circle"
                                : "alert-circle"
                            }
                            size={16}
                            color={
                              bankDetails.is_verified
                                ? colors.success
                                : colors.warning
                            }
                          />
                          <Text
                            style={[
                              styles.verificationText,
                              {
                                color: bankDetails.is_verified
                                  ? colors.success
                                  : colors.warning,
                              },
                            ]}
                          >
                            {bankDetails.is_verified
                              ? "Verified"
                              : "Not Verified"}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={[
                            styles.verifyButton,
                            bankDetails.is_verified && styles.unverifyButton,
                          ]}
                          onPress={handleToggleBankVerification}
                          disabled={verifyingBank}
                        >
                          {verifyingBank ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Text style={styles.verifyButtonText}>
                              {bankDetails.is_verified ? "Unverify" : "Verify"}
                            </Text>
                          )}
                        </TouchableOpacity>
                      </View>

                      {bankDetails.verified_at && (
                        <Text style={styles.verifiedDate}>
                          Verified on:{" "}
                          {new Date(bankDetails.verified_at).toLocaleString()}
                        </Text>
                      )}
                    </View>
                  ) : (
                    <Text style={styles.noBankDetails}>
                      No payment details added yet
                    </Text>
                  )}
                </View>

                {/* Tabs for Earnings and History */}
                <View style={styles.tabsContainer}>
                  <TouchableOpacity
                    style={[
                      styles.tab,
                      activeTab === "earnings" && styles.tabActive,
                    ]}
                    onPress={() => setActiveTab("earnings")}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        activeTab === "earnings" && styles.tabTextActive,
                      ]}
                    >
                      Earnings
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.tab,
                      activeTab === "history" && styles.tabActive,
                    ]}
                    onPress={() => setActiveTab("history")}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        activeTab === "history" && styles.tabTextActive,
                      ]}
                    >
                      History
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Earnings Tab */}
                {activeTab === "earnings" && (
                  <View style={styles.detailSection}>
                    <View style={styles.earningsHeader}>
                      <Text style={styles.detailLabel}>
                        Earnings ({earnings.length})
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.createPayoutButton,
                          (!bankDetails || !bankDetails.is_verified) &&
                            styles.createPayoutButtonDisabled,
                        ]}
                        onPress={() => setPayoutModalVisible(true)}
                        disabled={!bankDetails || !bankDetails.is_verified}
                      >
                        <Ionicons name="add-circle" size={20} color="#fff" />
                        <Text style={styles.createPayoutButtonText}>
                          Create Payout
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {(!bankDetails || !bankDetails.is_verified) && (
                      <Text style={styles.payoutWarning}>
                        ⚠ Payment details must be verified before creating
                        payouts
                      </Text>
                    )}

                    {!loadingEarnings && earnings.length > 0 && (
                      <View style={styles.earningsSummary}>
                        <View style={styles.summaryItem}>
                          <Text style={styles.summaryLabel}>Total Earned</Text>
                          <Text style={styles.summaryValue}>
                            GH₵{calculateTotalEarnings().toFixed(2)}
                          </Text>
                        </View>
                        <View style={styles.summaryItem}>
                          <Text style={styles.summaryLabel}>Pending</Text>
                          <Text
                            style={[
                              styles.summaryValue,
                              { color: colors.warning },
                            ]}
                          >
                            GH₵{calculatePendingEarnings().toFixed(2)}
                          </Text>
                        </View>
                      </View>
                    )}

                    {loadingEarnings ? (
                      <ActivityIndicator
                        size="small"
                        color={colors.primary}
                        style={{ marginTop: spacing.md }}
                      />
                    ) : earnings.length > 0 ? (
                      <View style={styles.earningsList}>
                        {earnings.map((earning) => (
                          <View key={earning.id} style={styles.earningItem}>
                            <View style={styles.earningItemHeader}>
                              <Text style={styles.earningAmount}>
                                GH₵{parseFloat(earning.amount).toFixed(2)}
                              </Text>
                              <View
                                style={[
                                  styles.earningStatusBadge,
                                  {
                                    backgroundColor:
                                      getEarningStatusColor(earning.status) +
                                      "20",
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.earningStatusText,
                                    {
                                      color: getEarningStatusColor(
                                        earning.status,
                                      ),
                                    },
                                  ]}
                                >
                                  {earning.status}
                                </Text>
                              </View>
                            </View>
                            <Text style={styles.earningType}>
                              {earning.type}
                            </Text>
                            {earning.description && (
                              <Text style={styles.earningDescription}>
                                {earning.description}
                              </Text>
                            )}
                            <Text style={styles.earningDate}>
                              {new Date(earning.earned_at).toLocaleString()}
                            </Text>

                            {earning.status === "pending" && (
                              <View style={styles.earningActions}>
                                <TouchableOpacity
                                  style={styles.markPaidButton}
                                  onPress={() =>
                                    handleUpdateEarningStatus(
                                      earning.id,
                                      "paid",
                                    )
                                  }
                                >
                                  <Text style={styles.markPaidButtonText}>
                                    Mark as Paid
                                  </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={styles.cancelButton}
                                  onPress={() =>
                                    handleUpdateEarningStatus(
                                      earning.id,
                                      "cancelled",
                                    )
                                  }
                                >
                                  <Text style={styles.cancelButtonText}>
                                    Cancel
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            )}
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.emptyText}>No earnings yet</Text>
                    )}
                  </View>
                )}

                {/* History Tab */}
                {activeTab === "history" && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Delivery History</Text>
                    {loadingOrders ? (
                      <ActivityIndicator
                        size="small"
                        color={colors.primary}
                        style={{ marginTop: spacing.md }}
                      />
                    ) : deliveryOrders.length > 0 ? (
                      <View style={styles.ordersList}>
                        {deliveryOrders.map((order) => (
                          <View key={order.id} style={styles.orderItem}>
                            <View style={styles.orderItemHeader}>
                              <Text style={styles.orderVendor}>
                                {order.chawp_vendors?.name || "Unknown Vendor"}
                              </Text>
                              <View
                                style={[
                                  styles.orderStatusBadge,
                                  {
                                    backgroundColor:
                                      order.status === "delivered"
                                        ? colors.success + "20"
                                        : colors.warning + "20",
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.orderStatusText,
                                    {
                                      color:
                                        order.status === "delivered"
                                          ? colors.success
                                          : colors.warning,
                                    },
                                  ]}
                                >
                                  {order.status}
                                </Text>
                              </View>
                            </View>
                            <Text style={styles.orderCustomer}>
                              Customer:{" "}
                              {order.chawp_user_profiles?.full_name ||
                                order.chawp_user_profiles?.username ||
                                "N/A"}
                            </Text>
                            <Text style={styles.orderAmount}>
                              Order: GH₵
                              {parseFloat(order.total_amount).toFixed(2)}
                            </Text>
                            {order.delivery_rating && (
                              <Text style={styles.orderRating}>
                                ⭐ Rating: {order.delivery_rating}/5
                              </Text>
                            )}
                            <Text style={styles.orderDate}>
                              {new Date(
                                order.delivered_at || order.created_at,
                              ).toLocaleString()}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.emptyText}>No delivery history</Text>
                    )}
                  </View>
                )}

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Joined</Text>
                  <Text style={styles.detailValue}>
                    {new Date(selectedPerson.created_at).toLocaleString()}
                  </Text>
                </View>
              </ScrollView>
            )}

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleContactPersonnel}
              >
                <Text style={styles.actionButtonText}>📞 Contact</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create Payout Modal */}
      <Modal
        visible={payoutModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPayoutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Payout</Text>

            <View style={styles.formSection}>
              <Text style={styles.inputLabel}>Amount (GH₵)</Text>
              <TextInput
                style={styles.input}
                value={payoutAmount}
                onChangeText={setPayoutAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.textTertiary}
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.inputLabel}>Type</Text>
              <View style={styles.typeButtons}>
                {["delivery_fee", "tip", "bonus", "incentive"].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeButton,
                      payoutType === type && styles.typeButtonActive,
                    ]}
                    onPress={() => setPayoutType(type)}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        payoutType === type && styles.typeButtonTextActive,
                      ]}
                    >
                      {type.replace("_", " ")}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.inputLabel}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={payoutDescription}
                onChangeText={setPayoutDescription}
                placeholder="Enter description..."
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelModalButton}
                onPress={() => setPayoutModalVisible(false)}
              >
                <Text style={styles.cancelModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.createButton}
                onPress={handleCreatePayout}
                disabled={creatingPayout}
              >
                {creatingPayout ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.createButtonText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Contact Personnel Modal */}
      <Modal
        visible={contactPersonnelModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setContactPersonnelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.contactModalContent}>
            <Text style={styles.modalTitle}>
              Contact{" "}
              {selectedPerson?.chawp_user_profiles?.full_name ||
                selectedPerson?.chawp_user_profiles?.username ||
                "Personnel"}
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
                    📞 Tap "Call Personnel" to initiate a phone call
                  </Text>
                  <Text style={styles.callInfoSubtext}>
                    The personnel's phone will ring on your device
                  </Text>
                </View>
              )}

              <Text style={styles.vendorInfoText}>
                Personnel:{" "}
                {selectedPerson?.chawp_user_profiles?.full_name ||
                  selectedPerson?.chawp_user_profiles?.username}
              </Text>
              {selectedPerson?.chawp_user_profiles?.phone && (
                <Text style={styles.vendorInfoText}>
                  📞 {selectedPerson.chawp_user_profiles.phone}
                </Text>
              )}
            </View>

            <View style={styles.contactButtonsContainer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setContactPersonnelModalVisible(false)}
                disabled={sendingMessage}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.sendButton,
                  sendingMessage && styles.sendButtonDisabled,
                ]}
                onPress={handleSendPersonnelMessage}
                disabled={
                  sendingMessage || !selectedPerson?.chawp_user_profiles?.phone
                }
              >
                {sendingMessage ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.sendButtonText}>
                    {contactMethod === "sms" ? "Send SMS" : "Call Personnel"}
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
  scrollView: {
    flex: 1,
  },
  personCard: {
    backgroundColor: colors.card,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
  },
  personInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
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
    color: colors.white,
    fontSize: 20,
    fontWeight: "bold",
  },
  personDetails: {
    flex: 1,
  },
  personName: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: spacing.xs / 2,
  },
  personVehicle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.xs / 2,
  },
  personStats: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  personBadges: {
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
  unverifiedBadge: {
    backgroundColor: colors.warning + "20",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: radii.xs,
  },
  unverifiedBadgeText: {
    color: colors.warning,
    fontSize: 11,
    fontWeight: "600",
  },
  emptyState: {
    padding: spacing.xxxl,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    padding: spacing.xl,
    marginTop: 60,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  modalBody: {
    flex: 1,
  },
  modalAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: spacing.lg,
  },
  modalAvatarText: {
    color: colors.white,
    fontSize: 32,
    fontWeight: "bold",
  },
  tabsContainer: {
    flexDirection: "row",
    marginBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
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
    marginBottom: spacing.xs / 2,
  },
  performanceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  performanceCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  performanceIconContainer: {
    marginBottom: spacing.sm,
  },
  performanceIcon: {
    fontSize: 32,
  },
  performanceValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  performanceLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: "uppercase",
  },
  statusRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  statusBadgeLarge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
  },
  statusBadgeText: {
    fontSize: 14,
    fontWeight: "600",
  },
  verifyButton: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    elevation: 3,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  unverifyButton: {
    backgroundColor: colors.warning,
    shadowColor: colors.warning,
  },
  verifyButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  verifiedDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    fontStyle: "italic",
  },
  earningsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  createPayoutButton: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    elevation: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  createPayoutButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  createPayoutButtonDisabled: {
    backgroundColor: "#B0B0B0",
    opacity: 0.6,
    elevation: 1,
    shadowOpacity: 0.1,
  },
  payoutWarning: {
    fontSize: 12,
    color: colors.warning,
    backgroundColor: colors.warning + "15",
    padding: spacing.sm,
    borderRadius: radii.sm,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  earningsSummary: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  summaryItem: {
    flex: 1,
    backgroundColor: colors.surface || "#FFFFFF",
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border || "#E5E7EB",
  },
  summaryLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: spacing.xs / 2,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.primary,
  },
  earningsList: {
    gap: spacing.md,
  },
  earningItem: {
    backgroundColor: colors.surface || "#FFFFFF",
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border || "#E5E7EB",
  },
  earningItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  earningAmount: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.textPrimary,
  },
  earningStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: radii.xs,
  },
  earningStatusText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  earningType: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.xs / 2,
  },
  earningDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.xs / 2,
  },
  earningDate: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  earningActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  markPaidButton: {
    flex: 1,
    backgroundColor: colors.success,
    padding: spacing.md,
    borderRadius: radii.md,
    alignItems: "center",
    elevation: 3,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  markPaidButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.error,
    padding: spacing.md,
    borderRadius: radii.md,
    alignItems: "center",
    elevation: 3,
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  cancelButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  closeButton: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.textSecondary,
    padding: spacing.xl,
    borderRadius: radii.md,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  closeButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  bankDetailsCard: {
    backgroundColor: colors.surface || "#FFFFFF",
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border || "#E5E7EB",
    marginTop: spacing.sm,
  },
  bankDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border || "#E5E7EB",
  },
  bankDetailLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  bankDetailValue: {
    fontSize: 14,
    color: colors.textPrimary,
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
  noBankDetails: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: "italic",
    marginTop: spacing.sm,
  },
  formSection: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  typeButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  typeButton: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.sm,
  },
  typeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    elevation: 3,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  typeButtonText: {
    fontSize: 13,
    color: colors.textPrimary,
    textTransform: "capitalize",
    fontWeight: "600",
  },
  typeButtonTextActive: {
    color: colors.white,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  modalButtons: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  cancelModalButton: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.textSecondary,
    padding: spacing.lg,
    borderRadius: radii.md,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cancelModalButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  createButton: {
    flex: 1,
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: radii.md,
    alignItems: "center",
    elevation: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  createButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  ordersList: {
    marginTop: spacing.sm,
  },
  orderItem: {
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  orderItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  orderVendor: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
    flex: 1,
  },
  orderStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: radii.xs,
  },
  orderStatusText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  orderCustomer: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  orderDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  orderAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  orderFee: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },
  orderRating: {
    fontSize: 13,
    color: colors.warning,
    marginBottom: spacing.xs,
  },
  orderDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  // Contact Modal Styles
  contactModalContent: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    margin: spacing.lg,
    marginTop: spacing.xl * 2,
  },
  contactMethodContainer: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  methodButtonsRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  methodButton: {
    flex: 1,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    backgroundColor: colors.card,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  methodButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.card,
    elevation: 3,
    shadowColor: colors.primary,
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  methodButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textSecondary,
    letterSpacing: 0.2,
  },
  methodButtonTextActive: {
    color: colors.primary,
    fontWeight: "700",
  },
  contactModalBody: {
    marginVertical: spacing.lg,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  contactLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  messageInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    color: colors.textPrimary,
    fontSize: 14,
    minHeight: 120,
    textAlignVertical: "top",
    marginBottom: spacing.lg,
  },
  callInfoContainer: {
    backgroundColor: colors.primary + "10",
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    marginBottom: spacing.lg,
  },
  callInfoText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  callInfoSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  vendorInfoText: {
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  contactButtonsContainer: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    backgroundColor: colors.card,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  sendButton: {
    flex: 1,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  sendButtonDisabled: {
    opacity: 0.6,
    elevation: 1,
  },
  sendButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.white,
    letterSpacing: 0.3,
  },
  actionButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.primary,
    elevation: 2,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
    letterSpacing: 0.2,
  },
  modalButtonsRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
});
