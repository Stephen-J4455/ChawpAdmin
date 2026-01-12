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
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { colors, spacing, radii } from "../theme";
import { useNotification } from "../contexts/NotificationContext";
import { supabase } from "../config/supabase";
import {
  fetchAllMeals,
  fetchAllVendors,
  createMeal,
  updateMeal,
  deleteMeal,
} from "../services/adminApi";

// Available meal categories
const MEAL_CATEGORIES = [
  "Pizza",
  "Burger",
  "Italian",
  "Chinese",
  "Japanese",
  "Mexican",
  "Indian",
  "American",
  "Thai",
  "Mediterranean",
  "Fast Food",
  "Healthy",
  "Dessert",
  "Beverage",
  "Salads",
  "Seafood",
  "Grilled",
  "Pasta",
  "Sushi",
  "Ramen",
  "Noodles",
  "Rice",
  "Soup",
  "Sandwich",
  "Breakfast",
  "Snacks",
  "Vegan",
  "Vegetarian",
].sort();

export default function MealsManagementPage() {
  const { showSuccess, showError, showConfirm } = useNotification();
  const [meals, setMeals] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMeal, setEditingMeal] = useState(null);
  const [selectedImageUri, setSelectedImageUri] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formData, setFormData] = useState({
    vendor_id: "",
    title: "",
    description: "",
    price: "",
    category: "",
    status: "available",
    image: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [mealsResult, vendorsResult] = await Promise.all([
      fetchAllMeals(),
      fetchAllVendors(),
    ]);

    if (mealsResult.success) setMeals(mealsResult.data);
    if (vendorsResult.success) setVendors(vendorsResult.data);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleAdd = () => {
    setEditingMeal(null);
    setSelectedImageUri(null);
    setFormData({
      vendor_id: vendors[0]?.id || "",
      title: "",
      description: "",
      price: "",
      category: "",
      status: "available",
      image: "",
    });
    setModalVisible(true);
  };

  const handleEdit = (meal) => {
    setEditingMeal(meal);
    setSelectedImageUri(null); // Reset selected image
    setFormData({
      vendor_id: meal.vendor_id || "",
      title: meal.title || "",
      description: meal.description || "",
      price: meal.price?.toString() || "",
      category: meal.category || "",
      status: meal.status || "available",
      image: meal.image || "",
    });
    setModalVisible(true);
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

  const uploadMealImage = async (uri) => {
    try {
      setUploadingImage(true);
      const fileName = `meal_${Date.now()}.jpg`;
      const filePath = `meals/${fileName}`;

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
    if (!formData.title || !formData.price || !formData.vendor_id) {
      showError("Error", "Title, price, and vendor are required");
      return;
    }

    // Upload image if one was selected
    let imageUrl = formData.image;
    if (selectedImageUri) {
      try {
        imageUrl = await uploadMealImage(selectedImageUri);
      } catch (error) {
        showError("Error", "Failed to upload image. Please try again.");
        return;
      }
    }

    const data = {
      ...formData,
      price: parseFloat(formData.price),
      image: imageUrl,
    };

    let result;
    if (editingMeal) {
      result = await updateMeal(editingMeal.id, data);
    } else {
      result = await createMeal(data);
    }

    if (result.success) {
      setModalVisible(false);
      loadData();
      showSuccess(
        "Success",
        `Meal ${editingMeal ? "updated" : "created"} successfully`
      );
    } else {
      showError("Error", result.error || "Failed to save meal");
    }
  };

  const handleDelete = (meal) => {
    showConfirm({
      type: "error",
      title: "Delete Meal",
      message: `Are you sure you want to delete ${meal.title}?`,
      confirmText: "Delete",
      cancelText: "Cancel",
      confirmStyle: "destructive",
      onConfirm: async () => {
        const result = await deleteMeal(meal.id);
        if (result.success) {
          loadData();
          showSuccess("Success", "Meal deleted successfully");
        } else {
          showError("Error", result.error || "Failed to delete meal");
        }
      },
    });
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
        <Text style={styles.headerTitle}>Meals ({meals.length})</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
          <Text style={styles.addButtonText}>+ Add Meal</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {meals.map((meal) => (
          <View key={meal.id} style={styles.mealCard}>
            {meal.image && (
              <Image
                source={{ uri: meal.image }}
                style={styles.mealImage}
                resizeMode="cover"
              />
            )}
            <View style={styles.mealInfo}>
              <Text style={styles.mealTitle}>{meal.title}</Text>
              <Text style={styles.mealVendor}>
                🏪 {meal.chawp_vendors?.name || "Unknown"}
              </Text>
              <Text style={styles.mealDescription}>{meal.description}</Text>
              <View style={styles.mealFooter}>
                <Text style={styles.mealPrice}>
                  GH₵{parseFloat(meal.price || 0).toFixed(2)}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        meal.status === "available"
                          ? colors.success + "20"
                          : colors.error + "20",
                    },
                  ]}>
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color:
                          meal.status === "available"
                            ? colors.success
                            : colors.error,
                      },
                    ]}>
                    {meal.status}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.mealActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.editButton]}
                onPress={() => handleEdit(meal)}>
                <Text style={styles.actionButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => handleDelete(meal)}>
                <Text style={styles.actionButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingMeal ? "Edit Meal" : "Add Meal"}
            </Text>

            <ScrollView style={styles.modalForm}>
              <Text style={styles.label}>Vendor *</Text>
              <View style={styles.pickerContainer}>
                {vendors.map((vendor) => (
                  <TouchableOpacity
                    key={vendor.id}
                    style={[
                      styles.pickerOption,
                      formData.vendor_id === vendor.id &&
                        styles.pickerOptionSelected,
                    ]}
                    onPress={() =>
                      setFormData({ ...formData, vendor_id: vendor.id })
                    }>
                    <Text
                      style={[
                        styles.pickerText,
                        formData.vendor_id === vendor.id &&
                          styles.pickerTextSelected,
                      ]}>
                      {vendor.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={styles.input}
                placeholder="Meal Title *"
                placeholderTextColor={colors.textMuted}
                value={formData.title}
                onChangeText={(text) =>
                  setFormData({ ...formData, title: text })
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
                placeholder="Price *"
                placeholderTextColor={colors.textMuted}
                value={formData.price}
                onChangeText={(text) =>
                  setFormData({ ...formData, price: text })
                }
                keyboardType="decimal-pad"
              />
              {/* Category Selection */}
              <View style={styles.categorySection}>
                <Text style={styles.categoryLabel}>
                  Category {formData.category && `(${formData.category})`}
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.categoryScroll}
                  contentContainerStyle={styles.categoryScrollContent}>
                  {MEAL_CATEGORIES.map((category) => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.categoryChip,
                        formData.category === category &&
                          styles.categoryChipActive,
                      ]}
                      onPress={() => setFormData({ ...formData, category })}>
                      <Text
                        style={[
                          styles.categoryChipText,
                          formData.category === category &&
                            styles.categoryChipTextActive,
                        ]}>
                        {category}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Image Upload Section */}
              <View style={styles.imageSection}>
                <Text style={styles.imageLabel}>Meal Photo</Text>
                {(selectedImageUri || formData.image) && (
                  <View style={styles.imagePreviewContainer}>
                    <Image
                      source={{ uri: selectedImageUri || formData.image }}
                      style={styles.imagePreview}
                      resizeMode="cover"
                    />
                    {selectedImageUri && (
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => setSelectedImageUri(null)}>
                        <Text style={styles.removeImageText}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
                <TouchableOpacity
                  style={styles.imagePickerButton}
                  onPress={pickImage}
                  disabled={uploadingImage}>
                  <Text style={styles.imagePickerIcon}>
                    {uploadingImage ? "⏳" : "📷"}
                  </Text>
                  <Text style={styles.imagePickerText}>
                    {selectedImageUri || formData.image
                      ? "Change Photo"
                      : "Add Photo"}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSave}>
                <Text style={styles.saveButtonText}>Save</Text>
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
  mealCard: {
    backgroundColor: colors.card,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
    overflow: "hidden",
  },
  mealImage: {
    width: "100%",
    height: 180,
    backgroundColor: colors.surface,
  },
  mealInfo: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  mealTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  mealVendor: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  mealDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  mealFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mealPrice: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.primary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  mealActions: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.lg,
    paddingTop: 0,
  },
  actionButton: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: radii.md,
    alignItems: "center",
  },
  editButton: {
    backgroundColor: colors.info,
  },
  deleteButton: {
    backgroundColor: colors.error,
  },
  actionButtonText: {
    color: colors.white,
    fontWeight: "600",
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
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  pickerContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  pickerOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickerOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pickerText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  pickerTextSelected: {
    color: colors.white,
    fontWeight: "600",
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
  imageSection: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  imageLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  imagePreviewContainer: {
    position: "relative",
    marginBottom: spacing.md,
  },
  imagePreview: {
    width: "100%",
    height: 200,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  removeImageButton: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.error,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
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
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: "dashed",
    gap: spacing.sm,
  },
  imagePickerIcon: {
    fontSize: 24,
  },
  imagePickerText: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: "600",
  },
  categorySection: {
    marginBottom: spacing.md,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  categoryScroll: {
    marginHorizontal: -spacing.md,
    paddingHorizontal: spacing.md,
  },
  categoryScrollContent: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingRight: spacing.xl * 2,
  },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  categoryChipTextActive: {
    color: colors.white,
    fontWeight: "600",
  },
});
