import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  FlatList,
  Image,
  Alert,
  Platform,
  BackHandler,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { colors, spacing, radii } from "../theme";
import {
  fetchAdverts,
  createAdvert,
  updateAdvert,
  deleteAdvert,
  uploadAdvertImage,
} from "../services/adminApi";
import { useNotification } from "../contexts/NotificationContext";

// Color palette for gradients
const COLOR_PALETTE = [
  { name: "Dark Blue", start: "#2a2f4a", end: "#6366f1" },
  { name: "Sunset", start: "#ff6b6b", end: "#feca57" },
  { name: "Ocean", start: "#00b4db", end: "#0083b0" },
  { name: "Forest", start: "#134e5e", end: "#71b280" },
  { name: "Coral", start: "#ff6348", end: "#ff8c42" },
  { name: "Grape", start: "#9b59b6", end: "#8e44ad" },
  { name: "Mint", start: "#00d2d3", end: "#54a0ff" },
  { name: "Rose", start: "#ff6b9d", end: "#c92a2a" },
  { name: "Peach", start: "#ffa502", end: "#ffc837" },
  { name: "Teal", start: "#00d2fc", end: "#3a7bd5" },
  { name: "Berry", start: "#ee0979", end: "#ff6a00" },
  { name: "Mint Green", start: "#00f2fe", end: "#4facfe" },
];

// Icon list for button icons
const ICON_LIST = [
  { name: "arrow-forward", label: "Arrow Right" },
  { name: "arrow-back", label: "Arrow Left" },
  { name: "chevron-forward", label: "Chevron Right" },
  { name: "chevron-back", label: "Chevron Left" },
  { name: "play", label: "Play" },
  { name: "home", label: "Home" },
  { name: "heart", label: "Heart" },
  { name: "star", label: "Star" },
  { name: "search", label: "Search" },
  { name: "settings", label: "Settings" },
  { name: "cart", label: "Cart" },
  { name: "download", label: "Download" },
  { name: "share-social", label: "Share" },
  { name: "call", label: "Call" },
  { name: "mail", label: "Email" },
  { name: "open", label: "Open" },
  { name: "open-outline", label: "Open Outline" },
  { name: "information-circle", label: "Info" },
  { name: "help-circle", label: "Help" },
];

export default function AdvertisementManagementPage() {
  const [adverts, setAdverts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAdvert, setEditingAdvert] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const { showSuccess, showError, showConfirm } = useNotification();

  // Form states
  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    button_text: "Learn More",
    icon: "arrow-forward",
    gradient_start: "#2a2f4a",
    gradient_end: "#6366f1",
    action_type: "navigate",
    action_value: "discover",
    whatsapp_number: "",
    whatsapp_message: "",
    order_index: 0,
    is_active: true,
  });

  useEffect(() => {
    loadAdverts();
  }, []);

  // Handle Android back button to close modal
  useEffect(() => {
    const backAction = () => {
      if (showModal) {
        setShowModal(false);
        return true; // Prevent default behavior
      }
      return false; // Allow default behavior
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction,
    );

    return () => backHandler.remove();
  }, [showModal]);

  const loadAdverts = async () => {
    try {
      setLoading(true);
      const data = await fetchAdverts();
      setAdverts(data || []);
    } catch (error) {
      showError("Error", "Failed to load advertisements");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        setSelectedImage(result.assets[0]);
      }
    } catch (error) {
      showError("Error", "Failed to pick image");
    }
  };

  const openModal = (advert = null) => {
    if (advert) {
      setEditingAdvert(advert);
      setFormData({
        title: advert.title,
        subtitle: advert.subtitle,
        button_text: advert.button_text || "Learn More",
        icon: advert.icon || "arrow-forward",
        gradient_start: advert.gradient_start || "#2a2f4a",
        gradient_end: advert.gradient_end || "#6366f1",
        action_type: advert.action_type || "navigate",
        action_value: advert.action_value || "discover",
        whatsapp_number: advert.whatsapp_number || "",
        whatsapp_message: advert.whatsapp_message || "",
        order_index: advert.order_index.toString(),
        is_active: advert.is_active,
      });
      setSelectedImage(null);
    } else {
      setEditingAdvert(null);
      setFormData({
        title: "",
        subtitle: "",
        button_text: "Learn More",
        icon: "arrow-forward",
        gradient_start: "#2a2f4a",
        gradient_end: "#6366f1",
        action_type: "navigate",
        action_value: "discover",
        whatsapp_number: "",
        whatsapp_message: "",
        order_index: "0",
        is_active: true,
      });
      setSelectedImage(null);
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      if (!formData.title || !formData.subtitle) {
        showError("Validation", "Title and subtitle are required");
        return;
      }

      // Validate action_value based on action_type
      if (formData.action_type === "navigate" && !formData.action_value) {
        showError("Validation", "Please select a navigation destination");
        return;
      }

      if (formData.action_type === "whatsapp") {
        if (!formData.whatsapp_number) {
          showError("Validation", "Please enter the owner's WhatsApp number");
          return;
        }
        if (!formData.whatsapp_message) {
          showError("Validation", "Please enter a message for WhatsApp");
          return;
        }
      }

      if (formData.action_type === "url" && !formData.action_value) {
        showError("Validation", "Please enter a valid URL");
        return;
      }

      setUploading(true);

      let imageUrl = editingAdvert?.image_url;

      // Upload image if selected
      if (selectedImage) {
        imageUrl = await uploadAdvertImage(selectedImage);
      }

      const advertData = {
        ...formData,
        image_url: imageUrl,
        order_index: parseInt(formData.order_index),
      };

      if (editingAdvert) {
        await updateAdvert(editingAdvert.id, advertData);
        showSuccess("Success", "Advertisement updated");
      } else {
        await createAdvert(advertData);
        showSuccess("Success", "Advertisement created");
      }

      setShowModal(false);
      loadAdverts();
    } catch (error) {
      showError("Error", error.message || "Failed to save advertisement");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const handleToggleStatus = async (advert) => {
    try {
      const updatedData = {
        ...advert,
        is_active: !advert.is_active,
      };
      await updateAdvert(advert.id, updatedData);
      showSuccess(
        "Success",
        `Advertisement ${!advert.is_active ? "activated" : "deactivated"}`,
      );
      loadAdverts();
    } catch (error) {
      showError("Error", "Failed to update advertisement status");
      console.error(error);
    }
  };

  const handleDelete = (advert) => {
    showConfirm({
      type: "warning",
      title: "Delete Advertisement",
      message: `Are you sure you want to delete "${advert.title}"?`,
      confirmText: "Delete",
      cancelText: "Cancel",
      confirmStyle: "destructive",
      onConfirm: async () => {
        try {
          await deleteAdvert(advert.id);
          showSuccess("Success", "Advertisement deleted");
          loadAdverts();
        } catch (error) {
          showError("Error", "Failed to delete advertisement");
          console.error(error);
        }
      },
    });
  };

  const renderAdvertCard = ({ item }) => (
    <View style={styles.advertCard}>
      {/* Gradient Preview or Image */}
      <View style={styles.advertPreviewContainer}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.advertImage} />
        ) : (
          <LinearGradient
            colors={[
              item.gradient_start || "#2a2f4a",
              item.gradient_end || "#6366f1",
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.advertGradient}
          >
            <View style={styles.gradientPreviewText}>
              <Text style={styles.previewTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <View style={styles.previewButton}>
                <Ionicons
                  name={item.icon || "arrow-forward"}
                  size={12}
                  color="white"
                />
                <Text style={styles.previewButtonText}>{item.button_text}</Text>
              </View>
            </View>
          </LinearGradient>
        )}
      </View>

      {/* Card Content */}
      <View style={styles.advertContentWrapper}>
        <View style={styles.advertContent}>
          <View style={styles.advertHeader}>
            <View style={styles.advertTitleSection}>
              <Text style={styles.advertTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.advertSubtitle} numberOfLines={2}>
                {item.subtitle}
              </Text>
            </View>
            <View style={styles.statusBadgeContainer}>
              <View
                style={[
                  styles.statusBadge,
                  item.is_active ? styles.statusActive : styles.statusInactive,
                ]}
              >
                <Text style={styles.statusText}>
                  {item.is_active ? "Active" : "Inactive"}
                </Text>
              </View>
            </View>
          </View>

          {/* Meta Info */}
          <View style={styles.advertMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="link" size={14} color={colors.primary} />
              <Text style={styles.metaText}>
                {item.action_type === "navigate" && "Navigate"}
                {item.action_type === "whatsapp" && "WhatsApp"}
                {item.action_type === "url" && "External URL"}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="list-outline" size={14} color={colors.primary} />
              <Text style={styles.metaText}>Order: {item.order_index}</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => openModal(item)}
          >
            <Ionicons name="pencil" size={16} color={colors.primary} />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              item.is_active
                ? styles.toggleButtonActive
                : styles.toggleButtonInactive,
            ]}
            onPress={() => handleToggleStatus(item)}
          >
            <Ionicons
              name={item.is_active ? "toggle-outline" : "toggle-outline"}
              size={16}
              color={item.is_active ? colors.success : colors.textMuted}
            />
            <Text
              style={[
                styles.toggleButtonText,
                item.is_active
                  ? styles.toggleButtonTextActive
                  : styles.toggleButtonTextInactive,
              ]}
            >
              {item.is_active ? "Active" : "Off"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDelete(item)}
          >
            <Ionicons name="trash" size={16} color={colors.danger} />
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Advertisements</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => openModal()}>
          <Ionicons name="add-circle" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : adverts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="image-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyText}>No advertisements</Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => openModal()}
          >
            <Text style={styles.createButtonText}>Create First Ad</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={adverts}
          renderItem={renderAdvertCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          scrollEnabled={true}
        />
      )}

      {/* Modal */}
      <Modal visible={showModal} animationType="slide" transparent={false}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={24} color={colors.primary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingAdvert ? "Edit Advertisement" : "New Advertisement"}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Image Preview */}
            {(selectedImage || editingAdvert?.image_url) && (
              <View style={styles.imagePreviewContainer}>
                <Image
                  source={{
                    uri: selectedImage?.uri || editingAdvert?.image_url,
                  }}
                  style={styles.imagePreview}
                />
              </View>
            )}

            <TouchableOpacity
              style={styles.imagePickerButton}
              onPress={pickImage}
            >
              <Ionicons
                name="cloud-upload-outline"
                size={24}
                color={colors.primary}
              />
              <Text style={styles.imagePickerText}>
                {selectedImage || editingAdvert?.image_url
                  ? "Change Image"
                  : "Pick Image"}
              </Text>
            </TouchableOpacity>

            {/* Form Fields */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="Advertisement title"
                value={formData.title}
                onChangeText={(text) =>
                  setFormData({ ...formData, title: text })
                }
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Subtitle *</Text>
              <TextInput
                style={styles.input}
                placeholder="Brief description"
                value={formData.subtitle}
                onChangeText={(text) =>
                  setFormData({ ...formData, subtitle: text })
                }
                multiline
                numberOfLines={3}
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Button Text</Text>
              <TextInput
                style={styles.input}
                placeholder="Button label"
                value={formData.button_text}
                onChangeText={(text) =>
                  setFormData({ ...formData, button_text: text })
                }
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Button Icon</Text>
              <View style={styles.iconPickerContainer}>
                {ICON_LIST.map((iconItem) => (
                  <TouchableOpacity
                    key={iconItem.name}
                    style={[
                      styles.iconPickerItem,
                      formData.icon === iconItem.name &&
                        styles.iconPickerItemSelected,
                    ]}
                    onPress={() =>
                      setFormData({ ...formData, icon: iconItem.name })
                    }
                    title={iconItem.label}
                  >
                    <Ionicons
                      name={iconItem.name}
                      size={28}
                      color={
                        formData.icon === iconItem.name
                          ? colors.primary
                          : colors.textSecondary
                      }
                    />
                    <Text
                      style={[
                        styles.iconPickerLabel,
                        formData.icon === iconItem.name &&
                          styles.iconPickerLabelSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {iconItem.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Gradient Color Scheme</Text>
              <View style={styles.colorPaletteContainer}>
                {COLOR_PALETTE.map((palette) => (
                  <TouchableOpacity
                    key={palette.name}
                    style={[
                      styles.colorPaletteItem,
                      formData.gradient_start === palette.start &&
                        formData.gradient_end === palette.end &&
                        styles.colorPaletteItemSelected,
                    ]}
                    onPress={() =>
                      setFormData({
                        ...formData,
                        gradient_start: palette.start,
                        gradient_end: palette.end,
                      })
                    }
                  >
                    <LinearGradient
                      colors={[palette.start, palette.end]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.colorPaletteGradient}
                    >
                      {formData.gradient_start === palette.start &&
                        formData.gradient_end === palette.end && (
                          <View style={styles.colorPaletteCheckmark}>
                            <Ionicons
                              name="checkmark-circle"
                              size={20}
                              color="white"
                            />
                          </View>
                        )}
                    </LinearGradient>
                    <Text style={styles.colorPaletteName}>{palette.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Action Type</Text>
              <View style={styles.segmentedControl}>
                {["navigate", "whatsapp", "url"].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.segmentButton,
                      formData.action_type === type &&
                        styles.segmentButtonActive,
                    ]}
                    onPress={() =>
                      setFormData({
                        ...formData,
                        action_type: type,
                        action_value: "",
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.segmentButtonText,
                        formData.action_type === type &&
                          styles.segmentButtonTextActive,
                      ]}
                    >
                      {type === "navigate"
                        ? "Navigate"
                        : type === "whatsapp"
                          ? "WhatsApp"
                          : "URL"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Conditional Action Value Fields */}
            {formData.action_type === "navigate" && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Navigate To *</Text>
                <View style={styles.pickerContainer}>
                  {[
                    "discover",
                    "orders",
                    "vendors",
                    "meals",
                    "profile",
                    "settings",
                  ].map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.pickerOption,
                        formData.action_value === option &&
                          styles.pickerOptionActive,
                      ]}
                      onPress={() =>
                        setFormData({
                          ...formData,
                          action_value: option,
                        })
                      }
                    >
                      <Text
                        style={[
                          styles.pickerOptionText,
                          formData.action_value === option &&
                            styles.pickerOptionTextActive,
                        ]}
                      >
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {formData.action_type === "whatsapp" && (
              <View>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Owner WhatsApp Number *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter owner's WhatsApp number (e.g., +1234567890)"
                    value={formData.whatsapp_number}
                    onChangeText={(text) =>
                      setFormData({ ...formData, whatsapp_number: text })
                    }
                    keyboardType="phone-pad"
                    placeholderTextColor={colors.textMuted}
                  />
                  <Text style={styles.helperText}>
                    Include country code (e.g., +1, +44, +92)
                  </Text>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Message to Owner *</Text>
                  <TextInput
                    style={[styles.input, styles.messageInput]}
                    placeholder="Enter message for the owner..."
                    value={formData.whatsapp_message}
                    onChangeText={(text) =>
                      setFormData({ ...formData, whatsapp_message: text })
                    }
                    multiline
                    numberOfLines={4}
                    placeholderTextColor={colors.textMuted}
                  />
                  <Text style={styles.helperText}>
                    This message will be sent when a user clicks the button
                  </Text>
                </View>
              </View>
            )}

            {formData.action_type === "url" && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Web Link *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="https://example.com"
                  value={formData.action_value}
                  onChangeText={(text) =>
                    setFormData({ ...formData, action_value: text })
                  }
                  keyboardType="url"
                  placeholderTextColor={colors.textMuted}
                />
                <Text style={styles.helperText}>
                  Must start with http:// or https://
                </Text>
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={styles.label}>Order Index</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                value={formData.order_index}
                onChangeText={(text) =>
                  setFormData({ ...formData, order_index: text })
                }
                keyboardType="number-pad"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.formGroup}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() =>
                  setFormData({ ...formData, is_active: !formData.is_active })
                }
              >
                <Ionicons
                  name={formData.is_active ? "checkbox" : "square-outline"}
                  size={24}
                  color={colors.primary}
                />
                <Text style={styles.checkboxLabel}>Active</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color="white" />
                  <Text style={styles.saveButtonText}>Save Advertisement</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  addButton: {
    padding: spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  createButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    marginTop: spacing.md,
  },
  createButtonText: {
    color: "white",
    fontWeight: "600",
  },
  listContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  advertCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    overflow: "hidden",
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  advertPreviewContainer: {
    width: "100%",
    height: 140,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  advertImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  advertGradient: {
    width: "100%",
    height: "100%",
    padding: spacing.md,
    justifyContent: "flex-end",
  },
  gradientPreviewText: {
    gap: spacing.sm,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "white",
  },
  previewButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.md,
  },
  previewButtonText: {
    fontSize: 11,
    fontWeight: "600",
    color: "white",
  },
  advertContentWrapper: {
    padding: spacing.md,
    gap: spacing.md,
  },
  advertContent: {
    gap: spacing.md,
  },
  advertHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  advertTitleSection: {
    flex: 1,
    gap: spacing.xs,
  },
  advertTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  advertSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  statusBadgeContainer: {
    justifyContent: "center",
  },
  advertMeta: {
    flexDirection: "row",
    gap: spacing.md,
    flexWrap: "wrap",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
    flexDirection: "row",
    alignItems: "center",
  },
  statusActive: {
    backgroundColor: colors.success + "20",
  },
  statusInactive: {
    backgroundColor: colors.textMuted + "20",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  actionButtonsContainer: {
    flexDirection: "row",
    gap: spacing.md,
  },
  editButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary + "15",
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
  },
  toggleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  toggleButtonActive: {
    backgroundColor: colors.success + "15",
    borderColor: colors.success,
  },
  toggleButtonInactive: {
    backgroundColor: colors.textMuted + "15",
    borderColor: colors.textMuted,
  },
  toggleButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  toggleButtonTextActive: {
    color: colors.success,
  },
  toggleButtonTextInactive: {
    color: colors.textMuted,
  },
  deleteButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
    backgroundColor: colors.danger + "15",
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  deleteButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.danger,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === "android" ? 10 : 0,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  modalContent: {
    flex: 1,
    padding: spacing.lg,
  },
  imagePreviewContainer: {
    marginBottom: spacing.lg,
    borderRadius: radii.lg,
    overflow: "hidden",
  },
  imagePreview: {
    width: "100%",
    height: 200,
  },
  imagePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: "dashed",
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  imagePickerText: {
    color: colors.primary,
    fontWeight: "600",
    fontSize: 14,
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    fontSize: 14,
  },
  iconPickerContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  iconPickerItem: {
    width: "22%",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  iconPickerItemSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.primary + "15",
  },
  iconPickerLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  iconPickerLabelSelected: {
    color: colors.primary,
    fontWeight: "600",
  },
  segmentedControl: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    alignItems: "center",
  },
  segmentButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  segmentButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  segmentButtonTextActive: {
    color: "white",
  },
  pickerContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  pickerOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  pickerOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pickerOptionText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  pickerOptionTextActive: {
    color: "white",
  },
  helperText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: spacing.xs,
    fontStyle: "italic",
  },
  colorPaletteContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  colorPaletteItem: {
    width: "30%",
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.border,
    overflow: "hidden",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  colorPaletteGradient: {
    flex: 1,
    width: "100%",
    borderRadius: radii.lg,
    justifyContent: "flex-start",
    alignItems: "flex-end",
    padding: spacing.sm,
  },
  colorPaletteItemSelected: {
    borderColor: colors.primary,
    borderWidth: 3,
  },
  colorPaletteCheckmark: {
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 50,
    padding: spacing.xs,
  },
  colorPaletteName: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  messageInput: {
    paddingVertical: spacing.md,
    textAlignVertical: "top",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  checkboxLabel: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: "500",
  },
  saveButton: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  saveButtonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
});
