import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  Image,
  Linking,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii } from "../theme";
import { useNotification } from "../contexts/NotificationContext";
import { supabase } from "../config/supabase";

// Available tags for vendors (based on Chawp app)
const AVAILABLE_TAGS = [
  "Japanese",
  "Sushi",
  "Ramen",
  "Healthy",
  "Popular",
  "American",
  "Burgers",
  "Fast Food",
  "Comfort Food",
  "Italian",
  "Pizza",
  "Pasta",
  "Authentic",
  "Family",
  "Vegan",
  "Vegetarian",
  "Organic",
  "Bowls",
  "Indian",
  "Spicy",
  "Curry",
  "Mexican",
  "Tacos",
  "Burritos",
  "Street Food",
  "Quick",
  "Chinese",
  "Dim Sum",
  "Wok",
  "Noodles",
  "Mediterranean",
  "Greek",
  "Seafood",
  "Grilled",
  "Fresh",
];
import {
  fetchAllVendors,
  createVendor,
  updateVendor,
  fetchVendorHours,
  createVendorHours,
  updateVendorHours,
  deleteVendorHours,
  updateVendorOperationalStatus,
  fetchUserVendorBankDetails,
  verifyVendorBankDetails,
  fetchVendorPayouts,
  createVendorPayout,
  updatePayoutStatus,
} from "../services/adminApi";

export default function VendorsManagementPage() {
  const { showSuccess, showError, showConfirm } = useNotification();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [hoursModalVisible, setHoursModalVisible] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [vendorHours, setVendorHours] = useState([]);
  const [loadingHours, setLoadingHours] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    address: "",
    phone: "",
    email: "",
    password: "",
    delivery_time: "25-35 min",
    distance: "1.0 km",
    status: "active",
    image: "",
    tags: [], // Array of selected tags
  });

  // Payout and bank details state
  const [vendorDetailsModalVisible, setVendorDetailsModalVisible] =
    useState(false);
  const [bankDetails, setBankDetails] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [loadingBankDetails, setLoadingBankDetails] = useState(false);
  const [loadingPayouts, setLoadingPayouts] = useState(false);
  const [verifyingBank, setVerifyingBank] = useState(false);
  const [payoutModalVisible, setPayoutModalVisible] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutNotes, setPayoutNotes] = useState("");
  const [creatingPayout, setCreatingPayout] = useState(false);

  // Contact vendor state
  const [contactVendorModalVisible, setContactVendorModalVisible] =
    useState(false);
  const [contactMessage, setContactMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [contactMethod, setContactMethod] = useState("sms"); // 'sms' or 'call'

  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = async () => {
    const result = await fetchAllVendors();
    if (result.success) {
      setVendors(result.data);
    }
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadVendors();
    setRefreshing(false);
  };

  const handleAdd = () => {
    setEditingVendor(null);
    setSelectedImageUri(null);
    setFormData({
      name: "",
      description: "",
      address: "",
      phone: "",
      email: "",
      password: "",
      delivery_time: "25-35 min",
      distance: "1.0 km",
      status: "active",
      image: "",
      tags: [],
    });
    setModalVisible(true);
  };

  const handleEdit = (vendor) => {
    setEditingVendor(vendor);
    setSelectedImageUri(null);
    setFormData({
      name: vendor.name || "",
      description: vendor.description || "",
      address: vendor.address || "",
      phone: vendor.phone || "",
      email: vendor.email || "",
      password: "", // Don't populate password when editing
      delivery_time: vendor.delivery_time || "25-35 min",
      distance: vendor.distance || "1.0 km",
      status: vendor.status || "active",
      image: vendor.image || "",
      tags: vendor.tags || [], // Load existing tags
    });
    setModalVisible(true);
  };

  const toggleTag = (tag) => {
    const currentTags = formData.tags || [];
    if (currentTags.includes(tag)) {
      // Remove tag
      setFormData({
        ...formData,
        tags: currentTags.filter((t) => t !== tag),
      });
    } else {
      // Add tag
      setFormData({
        ...formData,
        tags: [...currentTags, tag],
      });
    }
  };

  const pickImage = async () => {
    try {
      // Request permission
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        showError("Error", "Camera roll permission is required");
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        setSelectedImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      showError("Error", "Failed to pick image");
    }
  };

  const uploadVendorImage = async (uri) => {
    try {
      setUploadingImage(true);
      const fileName = `vendor_${Date.now()}.jpg`;
      const filePath = `vendors/${fileName}`;

      // For React Native, we need to use FormData with the file object
      const formDataUpload = new FormData();
      formDataUpload.append("file", {
        uri: uri,
        type: "image/jpeg",
        name: fileName,
      });

      // Upload to Supabase storage using FormData
      const { data, error } = await supabase.storage
        .from("chawp")
        .upload(filePath, formDataUpload, {
          contentType: "image/jpeg",
          upsert: false,
        });

      if (error) throw error;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("chawp").getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error("Upload error:", error);
      throw error;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name) {
      showError("Error", "Vendor name is required");
      return;
    }

    if (!formData.email) {
      showError("Error", "Email is required");
      return;
    }

    // Validate password only when creating new vendor
    if (!editingVendor && !formData.password) {
      showError("Error", "Password is required for new vendors");
      return;
    }

    if (!editingVendor && formData.password.length < 6) {
      showError("Error", "Password must be at least 6 characters");
      return;
    }

    // Upload image if one was selected
    let imageUrl = formData.image;
    if (selectedImageUri) {
      try {
        imageUrl = await uploadVendorImage(selectedImageUri);
      } catch (error) {
        showError("Error", "Failed to upload image. Please try again.");
        return;
      }
    }

    const data = {
      ...formData,
      image: imageUrl,
    };

    let result;
    if (editingVendor) {
      result = await updateVendor(editingVendor.id, data);
    } else {
      result = await createVendor(data);
    }

    if (result.success) {
      setModalVisible(false);
      loadVendors();
      showSuccess(
        "Success",
        `Vendor ${editingVendor ? "updated" : "created"} successfully`,
      );
    } else {
      showError("Error", result.error || "Failed to save vendor");
    }
  };

  const handleToggleOpen = async (vendor) => {
    const newOpenStatus = !vendor.is_open;
    const result = await updateVendor(vendor.id, { is_open: newOpenStatus });

    if (result.success) {
      loadVendors();
      showSuccess(
        "Success",
        `Vendor is now ${newOpenStatus ? "OPEN" : "CLOSED"}`,
      );
    } else {
      showError("Error", result.error || "Failed to update vendor status");
    }
  };

  // Vendor Hours Management
  const handleManageHours = async (vendor) => {
    setSelectedVendor(vendor);
    setLoadingHours(true);
    setHoursModalVisible(true);

    const result = await fetchVendorHours(vendor.id);
    if (result.success) {
      setVendorHours(result.data);
    } else {
      showError("Error", result.error || "Failed to load vendor hours");
    }
    setLoadingHours(false);
  };

  const handleAddHours = async (dayOfWeek) => {
    const hoursData = {
      vendor_id: selectedVendor.id,
      day_of_week: dayOfWeek,
      open_time: "09:00",
      close_time: "22:00",
      is_closed: false,
    };

    const result = await createVendorHours(hoursData);
    if (result.success) {
      const updatedResult = await fetchVendorHours(selectedVendor.id);
      if (updatedResult.success) {
        setVendorHours(updatedResult.data);
      }
      showSuccess("Success", "Hours added successfully");
    } else {
      showError("Error", result.error || "Failed to add hours");
    }
  };

  const handleUpdateHours = async (hoursId, updates) => {
    const result = await updateVendorHours(hoursId, updates);
    if (result.success) {
      const updatedResult = await fetchVendorHours(selectedVendor.id);
      if (updatedResult.success) {
        setVendorHours(updatedResult.data);
      }
    } else {
      showError("Error", result.error || "Failed to update hours");
    }
  };

  const handleToggleVendorStatus = async () => {
    const currentStatus = selectedVendor.operational_status || "open";
    const newStatus = currentStatus === "open" ? "closed" : "open";

    const result = await updateVendorOperationalStatus(
      selectedVendor.id,
      newStatus,
    );
    if (result.success) {
      // Update the selected vendor with new status
      setSelectedVendor({ ...selectedVendor, operational_status: newStatus });
      // Refresh vendors list
      loadVendors();
      showSuccess("Success", `Vendor is now ${newStatus}`);
    } else {
      showError("Error", result.error || "Failed to update vendor status");
    }
  };

  const handleDeleteHours = async (hoursId) => {
    showConfirm({
      type: "error",
      title: "Delete Hours",
      message: "Are you sure you want to delete these hours?",
      confirmText: "Delete",
      cancelText: "Cancel",
      confirmStyle: "destructive",
      onConfirm: async () => {
        const result = await deleteVendorHours(hoursId);
        if (result.success) {
          const updatedResult = await fetchVendorHours(selectedVendor.id);
          if (updatedResult.success) {
            setVendorHours(updatedResult.data);
          }
          showSuccess("Success", "Hours deleted successfully");
        } else {
          showError("Error", result.error || "Failed to delete hours");
        }
      },
    });
  };

  const getDayName = (dayOfWeek) => {
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    return days[dayOfWeek];
  };

  const getAvailableDays = () => {
    const usedDays = vendorHours.map((h) => h.day_of_week);
    return [0, 1, 2, 3, 4, 5, 6].filter((day) => !usedDays.includes(day));
  };

  // Vendor Financial Details Handlers
  const handleViewVendorDetails = async (vendor) => {
    setSelectedVendor(vendor);
    setVendorDetailsModalVisible(true);
    setBankDetails(null);
    setPayouts([]);

    if (vendor.user_id) {
      // Load bank details
      setLoadingBankDetails(true);
      const bankResult = await fetchUserVendorBankDetails(vendor.user_id);
      if (bankResult.success) {
        setBankDetails(bankResult.data);

        // Load payouts
        if (vendor.id) {
          setLoadingPayouts(true);
          const payoutsResult = await fetchVendorPayouts(vendor.id);
          if (payoutsResult.success) {
            setPayouts(payoutsResult.data);
          }
          setLoadingPayouts(false);
        }
      }
      setLoadingBankDetails(false);
    }
  };

  const handleVerifyBankDetails = async () => {
    if (!bankDetails || !bankDetails.id) return;

    setVerifyingBank(true);
    const newVerifiedState = !bankDetails.is_verified;

    const result = await verifyVendorBankDetails(
      bankDetails.id,
      newVerifiedState,
    );
    if (result.success) {
      setBankDetails({
        ...bankDetails,
        is_verified: newVerifiedState,
        verified_at: newVerifiedState ? new Date().toISOString() : null,
      });
      showSuccess(
        "Success",
        `Bank details ${
          newVerifiedState ? "verified" : "unverified"
        } successfully`,
      );
    } else {
      showError(
        "Error",
        result.error || "Failed to update verification status",
      );
    }
    setVerifyingBank(false);
  };

  const handleCreatePayout = async () => {
    if (!selectedVendor?.id || !payoutAmount || parseFloat(payoutAmount) <= 0) {
      showError("Error", "Please enter a valid payout amount");
      return;
    }

    if (!bankDetails || !bankDetails.is_verified) {
      showError(
        "Error",
        "Bank details must be verified before creating payouts",
      );
      return;
    }

    setCreatingPayout(true);

    const payoutData = {
      vendorId: selectedVendor.id,
      amount: parseFloat(payoutAmount),
      status: "pending",
      paymentMethod: bankDetails?.payment_method || "bank_transfer",
      notes: payoutNotes,
    };

    const result = await createVendorPayout(payoutData);
    if (result.success) {
      // Refresh payouts list
      const payoutsResult = await fetchVendorPayouts(selectedVendor.id);
      if (payoutsResult.success) {
        setPayouts(payoutsResult.data);
      }

      showSuccess("Success", "Payout created successfully");
      setPayoutModalVisible(false);
      setPayoutAmount("");
      setPayoutNotes("");
    } else {
      showError("Error", result.error || "Failed to create payout");
    }

    setCreatingPayout(false);
  };

  const handleUpdatePayoutStatus = async (payoutId, newStatus) => {
    const result = await updatePayoutStatus(payoutId, newStatus);
    if (result.success) {
      // Refresh payouts
      const payoutsResult = await fetchVendorPayouts(selectedVendor.id);
      if (payoutsResult.success) {
        setPayouts(payoutsResult.data);
      }
      showSuccess("Success", "Payout status updated");
    } else {
      showError("Error", result.error || "Failed to update payout status");
    }
  };

  const handleContactVendor = async () => {
    setContactVendorModalVisible(true);
    setContactMethod("sms");
    setContactMessage("");
  };

  const handleCallVendor = async () => {
    if (!selectedVendor?.phone) {
      showError("Error", "Vendor phone number not available");
      return;
    }

    setSendingMessage(true);
    let phoneNumber = selectedVendor.phone;
    // Clean phone number - remove spaces, dashes, parentheses
    phoneNumber = phoneNumber.replace(/[\s\-\(\)]/g, "");
    const phoneUrl = `tel:${phoneNumber}`;

    try {
      const canOpen = await Linking.canOpenURL(phoneUrl);
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
    if (!selectedVendor?.phone) {
      showError("Error", "Vendor phone number not available");
      return;
    }

    if (!contactMessage.trim()) {
      showError("Error", "Please enter a message");
      return;
    }

    setSendingMessage(true);
    let phoneNumber = selectedVendor.phone;
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
          `SMS sent to ${selectedVendor?.name || "vendor"}`,
        );
        setContactMessage("");
        setContactVendorModalVisible(false);
      } else {
        // Try anyway - sometimes canOpenURL doesn't work but the actual SMS does
        try {
          await Linking.openURL(smsUrl);
          showSuccess(
            "Success",
            `SMS sent to ${selectedVendor?.name || "vendor"}`,
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

  const getPayoutStatusColor = (status) => {
    switch (status) {
      case "completed":
        return colors.success + "20";
      case "pending":
        return colors.warning + "20";
      case "processing":
        return colors.info + "20";
      case "failed":
        return colors.error + "20";
      default:
        return colors.textSecondary + "20";
    }
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
        <Text style={styles.headerTitle}>Vendors ({vendors.length})</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
          <Text style={styles.addButtonText}>+ Add Vendor</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {vendors.map((vendor) => (
          <TouchableOpacity
            key={vendor.id}
            style={styles.vendorCard}
            onPress={() => handleViewVendorDetails(vendor)}
          >
            <View style={styles.vendorMainInfo}>
              <View style={styles.vendorLeft}>
                {vendor.image ? (
                  <Image
                    source={{ uri: vendor.image }}
                    style={styles.vendorAvatar}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.vendorAvatarPlaceholder}>
                    <Text style={styles.vendorAvatarText}>
                      {vendor.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.vendorDetails}>
                  <Text style={styles.vendorName}>{vendor.name}</Text>
                  <Text style={styles.vendorDescription} numberOfLines={1}>
                    {vendor.description}
                  </Text>
                  <Text style={styles.vendorMeta}>📍 {vendor.address}</Text>
                  <Text style={styles.vendorMeta}>
                    ⭐ {vendor.rating?.toFixed(1) || "0.0"} • 📞 {vendor.phone}
                  </Text>
                  <View style={styles.vendorBadges}>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            vendor.status === "active"
                              ? colors.success + "20"
                              : colors.error + "20",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          {
                            color:
                              vendor.status === "active"
                                ? colors.success
                                : colors.error,
                          },
                        ]}
                      >
                        {vendor.status === "active" ? "Active" : "Inactive"}
                      </Text>
                    </View>
                    {vendor.tags && vendor.tags.length > 0 && (
                      <View style={styles.tagsCountBadge}>
                        <Text style={styles.tagsCountText}>
                          {vendor.tags.length} tags
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
              <View style={styles.vendorActions}>
                <TouchableOpacity
                  style={styles.actionIconButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleManageHours(vendor);
                  }}
                >
                  <Ionicons
                    name="time-outline"
                    size={18}
                    color={colors.textPrimary}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionIconButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleEdit(vendor);
                  }}
                >
                  <Ionicons
                    name="pencil-outline"
                    size={18}
                    color={colors.textPrimary}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingVendor ? "Edit Vendor" : "Add Vendor"}
            </Text>

            <ScrollView style={styles.modalForm}>
              <TextInput
                style={styles.input}
                placeholder="Vendor Name *"
                placeholderTextColor={colors.textMuted}
                value={formData.name}
                onChangeText={(text) =>
                  setFormData({ ...formData, name: text })
                }
              />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Description"
                placeholderTextColor={colors.textMuted}
                value={formData.description}
                onChangeText={(text) =>
                  setFormData({ ...formData, description: text })
                }
                multiline
                numberOfLines={3}
              />
              <TextInput
                style={styles.input}
                placeholder="Address"
                placeholderTextColor={colors.textMuted}
                value={formData.address}
                onChangeText={(text) =>
                  setFormData({ ...formData, address: text })
                }
              />
              <TextInput
                style={styles.input}
                placeholder="Phone"
                placeholderTextColor={colors.textMuted}
                value={formData.phone}
                onChangeText={(text) =>
                  setFormData({ ...formData, phone: text })
                }
                keyboardType="phone-pad"
              />
              <TextInput
                style={styles.input}
                placeholder="Email *"
                placeholderTextColor={colors.textMuted}
                value={formData.email}
                onChangeText={(text) =>
                  setFormData({ ...formData, email: text })
                }
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {!editingVendor && (
                <TextInput
                  style={styles.input}
                  placeholder="Password * (min 6 characters)"
                  placeholderTextColor={colors.textMuted}
                  value={formData.password}
                  onChangeText={(text) =>
                    setFormData({ ...formData, password: text })
                  }
                  secureTextEntry
                  autoCapitalize="none"
                />
              )}
              <TextInput
                style={styles.input}
                placeholder="Delivery Time (e.g., 25-35 min)"
                placeholderTextColor={colors.textMuted}
                value={formData.delivery_time}
                onChangeText={(text) =>
                  setFormData({ ...formData, delivery_time: text })
                }
              />
              <TextInput
                style={styles.input}
                placeholder="Distance (e.g., 1.0 km)"
                placeholderTextColor={colors.textMuted}
                value={formData.distance}
                onChangeText={(text) =>
                  setFormData({ ...formData, distance: text })
                }
              />

              {/* Image Upload */}
              <View style={styles.imageSection}>
                <Text style={styles.tagsLabel}>Vendor Image</Text>
                {(selectedImageUri || formData.image) && (
                  <View style={styles.imagePreviewContainer}>
                    <Image
                      source={{
                        uri: selectedImageUri || formData.image,
                      }}
                      style={styles.imagePreview}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => {
                        setSelectedImageUri(null);
                        setFormData({ ...formData, image: "" });
                      }}
                    >
                      <Text style={styles.removeImageText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.imagePickerButton}
                  onPress={pickImage}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      <Text style={styles.imagePickerIcon}>📷</Text>
                      <Text style={styles.imagePickerText}>
                        {selectedImageUri || formData.image
                          ? "Change Image"
                          : "Add Image"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Tags Selection */}
              <View style={styles.tagsSection}>
                <Text style={styles.tagsLabel}>
                  Tags ({formData.tags?.length || 0} selected)
                </Text>
                <View style={styles.tagsContainer}>
                  {AVAILABLE_TAGS.map((tag) => {
                    const isSelected = formData.tags?.includes(tag);
                    return (
                      <TouchableOpacity
                        key={tag}
                        style={[
                          styles.tagChip,
                          isSelected && styles.tagChipSelected,
                        ]}
                        onPress={() => toggleTag(tag)}
                      >
                        <Text
                          style={[
                            styles.tagText,
                            isSelected && styles.tagTextSelected,
                          ]}
                        >
                          {tag}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSave}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Vendor Hours Modal */}
      <Modal
        visible={hoursModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setHoursModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Manage Hours - {selectedVendor?.name}
            </Text>

            {loadingHours ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <ScrollView style={styles.hoursScrollView}>
                {vendorHours.map((hours) => (
                  <View key={hours.id} style={styles.hoursCard}>
                    <View style={styles.hoursHeader}>
                      <Text style={styles.dayText}>
                        {getDayName(hours.day_of_week)}
                      </Text>
                      <TouchableOpacity
                        style={styles.deleteHoursButton}
                        onPress={() => handleDeleteHours(hours.id)}
                      >
                        <Text style={styles.deleteHoursText}>✕</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.hoursRow}>
                      <View style={styles.timeInputContainer}>
                        <Text style={styles.timeLabel}>Open:</Text>
                        <TextInput
                          style={styles.timeInput}
                          value={hours.open_time}
                          placeholder="09:00"
                          placeholderTextColor={colors.textMuted}
                          onChangeText={(text) =>
                            handleUpdateHours(hours.id, { open_time: text })
                          }
                          onBlur={() => {}}
                        />
                      </View>

                      <View style={styles.timeInputContainer}>
                        <Text style={styles.timeLabel}>Close:</Text>
                        <TextInput
                          style={styles.timeInput}
                          value={hours.close_time}
                          placeholder="22:00"
                          placeholderTextColor={colors.textMuted}
                          onChangeText={(text) =>
                            handleUpdateHours(hours.id, { close_time: text })
                          }
                          onBlur={() => {}}
                        />
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.closedToggle,
                          {
                            backgroundColor: hours.is_closed
                              ? colors.error
                              : colors.success,
                          },
                        ]}
                        onPress={() =>
                          handleUpdateHours(hours.id, {
                            is_closed: !hours.is_closed,
                          })
                        }
                      >
                        <Text style={styles.closedToggleText}>
                          {hours.is_closed ? "Closed" : "Open"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}

                {getAvailableDays().length > 0 && (
                  <View style={styles.addDaySection}>
                    <Text style={styles.addDayTitle}>Add Hours for:</Text>
                    {getAvailableDays().map((day) => (
                      <TouchableOpacity
                        key={day}
                        style={styles.addDayButton}
                        onPress={() => handleAddHours(day)}
                      >
                        <Text style={styles.addDayButtonText}>
                          + {getDayName(day)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </ScrollView>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.closeButton]}
                onPress={() => setHoursModalVisible(false)}
              >
                <Text style={styles.saveButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Vendor Details Modal - Bank Details & Payouts */}
      <Modal
        visible={vendorDetailsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setVendorDetailsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedVendor?.name} - Financial Details
              </Text>
              <TouchableOpacity
                onPress={() => setVendorDetailsModalVisible(false)}
              >
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              {/* Bank Details Section */}
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Bank Details</Text>
                {loadingBankDetails ? (
                  <ActivityIndicator
                    size="small"
                    color={colors.primary}
                    style={{ marginTop: spacing.md }}
                  />
                ) : bankDetails ? (
                  <View style={styles.bankDetailsCard}>
                    <View style={styles.bankDetailsRow}>
                      <Text style={styles.bankLabel}>Payment Method:</Text>
                      <Text style={styles.bankValue}>
                        {bankDetails.payment_method === "mobile_money"
                          ? "Mobile Money"
                          : "Bank Account"}
                      </Text>
                    </View>

                    {bankDetails.payment_method === "bank" ? (
                      <>
                        <View style={styles.bankDetailsRow}>
                          <Text style={styles.bankLabel}>Bank Name:</Text>
                          <Text style={styles.bankValue}>
                            {bankDetails.bank_name || "N/A"}
                          </Text>
                        </View>
                        <View style={styles.bankDetailsRow}>
                          <Text style={styles.bankLabel}>Account Name:</Text>
                          <Text style={styles.bankValue}>
                            {bankDetails.account_name || "N/A"}
                          </Text>
                        </View>
                        <View style={styles.bankDetailsRow}>
                          <Text style={styles.bankLabel}>Account Number:</Text>
                          <Text style={styles.bankValue}>
                            {bankDetails.account_number || "N/A"}
                          </Text>
                        </View>
                      </>
                    ) : (
                      <>
                        <View style={styles.bankDetailsRow}>
                          <Text style={styles.bankLabel}>Provider:</Text>
                          <Text style={styles.bankValue}>
                            {bankDetails.mobile_money_provider?.toUpperCase() ||
                              "N/A"}
                          </Text>
                        </View>
                        <View style={styles.bankDetailsRow}>
                          <Text style={styles.bankLabel}>Name:</Text>
                          <Text style={styles.bankValue}>
                            {bankDetails.mobile_money_name || "N/A"}
                          </Text>
                        </View>
                        <View style={styles.bankDetailsRow}>
                          <Text style={styles.bankLabel}>Number:</Text>
                          <Text style={styles.bankValue}>
                            {bankDetails.mobile_money_number || "N/A"}
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
                        onPress={handleVerifyBankDetails}
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
                  <Text style={styles.emptyText}>No bank details provided</Text>
                )}
              </View>

              {/* Payouts Section */}
              <View style={styles.detailSection}>
                <View style={styles.payoutHeader}>
                  <Text style={styles.detailLabel}>
                    Payout History ({payouts.length})
                  </Text>
                  {bankDetails && bankDetails.is_verified && (
                    <TouchableOpacity
                      style={styles.createPayoutButton}
                      onPress={() => setPayoutModalVisible(true)}
                    >
                      <Ionicons name="add-circle" size={20} color="#fff" />
                      <Text style={styles.createPayoutButtonText}>
                        Create Payout
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {!bankDetails?.is_verified && bankDetails && (
                  <Text style={styles.payoutWarning}>
                    ⚠ Verify bank details before creating payouts
                  </Text>
                )}

                {loadingPayouts ? (
                  <ActivityIndicator
                    size="small"
                    color={colors.primary}
                    style={{ marginTop: spacing.md }}
                  />
                ) : payouts.length > 0 ? (
                  <View style={styles.payoutsList}>
                    {payouts.map((payout) => (
                      <View key={payout.id} style={styles.payoutItem}>
                        <View style={styles.payoutItemHeader}>
                          <Text style={styles.payoutAmount}>
                            GH₵{parseFloat(payout.amount).toFixed(2)}
                          </Text>
                          <View
                            style={[
                              styles.statusBadge,
                              {
                                backgroundColor: getPayoutStatusColor(
                                  payout.status,
                                ),
                              },
                            ]}
                          >
                            <Text style={styles.statusBadgeText}>
                              {payout.status}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.payoutItemDetails}>
                          <Text style={styles.payoutMethod}>
                            {payout.payment_method || "bank_transfer"}
                          </Text>
                          <Text style={styles.payoutDate}>
                            {new Date(payout.created_at).toLocaleDateString()}
                          </Text>
                        </View>
                        {payout.reference_number && (
                          <Text style={styles.payoutReference}>
                            Ref: {payout.reference_number}
                          </Text>
                        )}
                        {payout.notes && (
                          <Text style={styles.payoutNotes}>{payout.notes}</Text>
                        )}
                        {payout.status === "pending" && (
                          <TouchableOpacity
                            style={[
                              styles.statusActionButton,
                              {
                                backgroundColor: colors.success,
                                marginTop: spacing.sm,
                              },
                            ]}
                            onPress={() =>
                              handleUpdatePayoutStatus(payout.id, "completed")
                            }
                          >
                            <Text style={styles.statusActionText}>
                              Mark as Complete
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.emptyText}>No payouts yet</Text>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={[styles.modalButton, styles.contactButton]}
                onPress={handleContactVendor}
              >
                <Text style={styles.contactButtonText}>📞 Contact</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.closeButton]}
                onPress={() => setVendorDetailsModalVisible(false)}
              >
                <Text style={styles.saveButtonText}>Close</Text>
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
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Payout</Text>
              <TouchableOpacity onPress={() => setPayoutModalVisible(false)}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.inputLabel}>Amount (GH₵)</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                value={payoutAmount}
                onChangeText={setPayoutAmount}
                keyboardType="decimal-pad"
              />

              <Text style={styles.inputLabel}>Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add notes about this payout..."
                placeholderTextColor={colors.textMuted}
                value={payoutNotes}
                onChangeText={setPayoutNotes}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setPayoutModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.closeButton]}
                onPress={handleCreatePayout}
                disabled={creatingPayout}
              >
                {creatingPayout ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
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
              Contact {selectedVendor?.name || "Vendor"}
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
                Vendor: {selectedVendor?.name}
              </Text>
              {selectedVendor?.phone && (
                <Text style={styles.vendorInfoText}>
                  📞 {selectedVendor.phone}
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
                disabled={sendingMessage || !selectedVendor?.phone}
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  addButtonText: {
    color: colors.white,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  vendorCard: {
    backgroundColor: colors.card,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  vendorMainInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  vendorLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  vendorAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.surface,
    marginRight: spacing.md,
  },
  vendorAvatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  vendorAvatarText: {
    color: colors.white,
    fontSize: 24,
    fontWeight: "bold",
  },
  vendorDetails: {
    flex: 1,
  },
  vendorName: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: spacing.xs / 2,
  },
  vendorDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.xs / 2,
  },
  vendorMeta: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.xs / 2,
  },
  vendorBadges: {
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.xs,
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
  tagsCountBadge: {
    backgroundColor: colors.primary + "20",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: radii.xs,
  },
  tagsCountText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "600",
  },
  vendorActions: {
    flexDirection: "row",
    gap: spacing.xs,
    marginLeft: spacing.sm,
  },
  actionIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteIconButton: {
    backgroundColor: colors.error + "15",
    borderColor: colors.error + "40",
  },
  actionIcon: {
    fontSize: 16,
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
  modalForm: {
    maxHeight: 400,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  modalButton: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: radii.md,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    color: colors.textPrimary,
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  saveButtonText: {
    color: colors.white,
    fontWeight: "600",
  },
  hoursButton: {
    backgroundColor: colors.accent,
  },
  closeButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hoursScrollView: {
    maxHeight: 400,
    marginVertical: spacing.md,
  },
  hoursCard: {
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hoursHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  dayText: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.textPrimary,
  },
  deleteHoursButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.error + "20",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteHoursText: {
    color: colors.error,
    fontSize: 16,
    fontWeight: "bold",
  },
  hoursRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  timeInputContainer: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 4,
  },
  timeInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    padding: spacing.sm,
    color: colors.textPrimary,
    fontSize: 14,
  },
  closedToggle: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    minWidth: 70,
    alignItems: "center",
  },
  closedToggleText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "600",
  },
  addDaySection: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
  },
  addDayTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  addDayButton: {
    backgroundColor: colors.card,
    padding: spacing.sm,
    borderRadius: radii.sm,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.primary + "30",
  },
  addDayButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "500",
  },
  tagsSection: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  tagsLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  tagChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs,
  },
  tagChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tagText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  tagTextSelected: {
    color: colors.white,
    fontWeight: "600",
  },
  vendorTagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  vendorTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
    backgroundColor: colors.primary + "15",
    borderWidth: 1,
    borderColor: colors.primary + "30",
  },
  vendorTagText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: "500",
  },
  vendorTagMore: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "500",
    paddingHorizontal: spacing.xs,
    alignSelf: "center",
  },
  imageSection: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  imagePreviewContainer: {
    position: "relative",
    marginBottom: spacing.sm,
    borderRadius: radii.md,
    overflow: "hidden",
  },
  imagePreview: {
    width: "100%",
    height: 200,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
  },
  removeImageButton: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.error,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  removeImageText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "bold",
  },
  imagePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: "dashed",
    borderRadius: radii.md,
    gap: spacing.sm,
  },
  imagePickerIcon: {
    fontSize: 24,
  },
  imagePickerText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "600",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  closeText: {
    fontSize: 24,
    color: colors.textSecondary,
    fontWeight: "bold",
  },
  detailSection: {
    marginBottom: spacing.lg,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  bankDetailsCard: {
    borderRadius: radii.md,
    padding: spacing.md,
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
  verifyButton: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
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
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: "italic",
    marginTop: spacing.sm,
  },
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
  payoutWarning: {
    fontSize: 12,
    color: colors.warning,
    backgroundColor: colors.warning + "15",
    padding: spacing.sm,
    borderRadius: radii.sm,
    marginBottom: spacing.md,
  },
  payoutsList: {
    gap: spacing.md,
  },
  payoutItem: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  payoutItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  payoutAmount: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.textPrimary,
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
    color: colors.textPrimary,
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
  formSection: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.card,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    color: colors.textPrimary,
    fontWeight: "600",
  },

  // Contact Vendor Styles
  modalActionsRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  contactButton: {
    backgroundColor: colors.primary + "20",
    borderWidth: 1,
    borderColor: colors.primary,
  },
  contactButtonText: {
    color: colors.primary,
    fontWeight: "600",
  },
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
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
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
  sendButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.white,
  },
});
