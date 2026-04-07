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

const MEAL_SIZES = [
  { label: "Small", value: "small" },
  { label: "Medium", value: "medium" },
  { label: "Large", value: "large" },
  { label: "Extra Large", value: "extra_large" },
];

const normalizeOptionPriceMap = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const normalized = {};
  Object.entries(value).forEach(([key, raw]) => {
    const optionKey = String(key || "").trim();
    const amount = Number.parseFloat(String(raw ?? "").trim());
    if (!optionKey || !Number.isFinite(amount) || amount <= 0) return;
    normalized[optionKey] = Number(amount.toFixed(2));
  });

  return normalized;
};

const sanitizePriceInput = (value) =>
  String(value || "").replace(/[^0-9.]/g, "");

const parsePositivePrice = (value) => {
  const parsed = Number.parseFloat(String(value ?? "").trim());
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Number(parsed.toFixed(2));
};

export default function MealsManagementPage() {
  const { showSuccess, showError, showConfirm } = useNotification();
  const [meals, setMeals] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMeal, setEditingMeal] = useState(null);
  const [selectedImageUris, setSelectedImageUris] = useState([]);
  const [removedImageUrls, setRemovedImageUrls] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formData, setFormData] = useState({
    vendor_id: "",
    title: "",
    description: "",
    price: "",
    category: "",
    sizes: [],
    sizePrices: {},
    specifications: [{ name: "", price: "" }],
    status: "available",
    images: [],
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
    setSelectedImageUris([]);
    setRemovedImageUrls([]);
    setFormData({
      vendor_id: vendors[0]?.id || "",
      title: "",
      description: "",
      price: "",
      category: "",
      sizes: [],
      sizePrices: {},
      specifications: [{ name: "", price: "" }],
      status: "available",
      images: [],
    });
    setModalVisible(true);
  };

  const handleEdit = (meal) => {
    setEditingMeal(meal);
    setSelectedImageUris([]);
    setRemovedImageUrls([]);

    const existingImages = Array.isArray(meal.images)
      ? meal.images.filter(Boolean)
      : meal.image
        ? [meal.image]
        : [];

    const existingSpecs = Array.isArray(meal.specifications)
      ? meal.specifications.filter(Boolean)
      : meal.specifications
        ? [String(meal.specifications)]
        : [];

    const existingSpecPrices = normalizeOptionPriceMap(
      meal.specification_prices,
    );

    const existingSizes = Array.isArray(meal.sizes)
      ? meal.sizes.filter(Boolean)
      : meal.size
        ? [meal.size]
        : [];

    const existingSizePrices = normalizeOptionPriceMap(meal.size_prices);

    setFormData({
      vendor_id: meal.vendor_id || "",
      title: meal.title || "",
      description: meal.description || "",
      price: meal.price?.toString() || "",
      category: meal.category || "",
      sizes: existingSizes,
      sizePrices: existingSizes.reduce((acc, sizeValue) => {
        if (existingSizePrices[sizeValue] > 0) {
          acc[sizeValue] = String(existingSizePrices[sizeValue]);
        }
        return acc;
      }, {}),
      specifications: (existingSpecs.length ? existingSpecs : [""]).map(
        (name) => ({
          name,
          price:
            existingSpecPrices[name] > 0
              ? String(existingSpecPrices[name])
              : "",
        }),
      ),
      status: meal.status || "available",
      images: existingImages,
    });
    setModalVisible(true);
  };

  const pickImages = async () => {
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
        allowsMultipleSelection: true,
        selectionLimit: 8,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.length) {
        setSelectedImageUris((prev) => {
          const merged = [...prev, ...result.assets.map((asset) => asset.uri)];
          return merged.slice(0, 8);
        });
      }
    } catch (error) {
      console.error("Error picking image:", error);
      showError("Error", "Failed to pick image");
    }
  };

  const uploadMealImage = async (uri, vendorId) => {
    try {
      setUploadingImage(true);
      if (!vendorId) throw new Error("Vendor is required before uploading");

      const fileExt = uri.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `meal_${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${fileExt}`;
      const filePath = `meals/${vendorId}/${fileName}`;

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

  const removeExistingImage = (imageUrl) => {
    setFormData((prev) => ({
      ...prev,
      images: (prev.images || []).filter((url) => url !== imageUrl),
    }));

    setRemovedImageUrls((prev) =>
      prev.includes(imageUrl) ? prev : [...prev, imageUrl],
    );
  };

  const removeNewImage = (index) => {
    setSelectedImageUris((prev) => prev.filter((_, idx) => idx !== index));
  };

  const toggleSizeSelection = (sizeValue) => {
    setFormData((prev) => {
      const currentSizes = Array.isArray(prev.sizes) ? prev.sizes : [];
      const alreadySelected = currentSizes.includes(sizeValue);

      return {
        ...prev,
        sizePrices: alreadySelected
          ? Object.fromEntries(
              Object.entries(prev.sizePrices || {}).filter(
                ([size]) => size !== sizeValue,
              ),
            )
          : prev.sizePrices || {},
        sizes: alreadySelected
          ? currentSizes.filter((size) => size !== sizeValue)
          : [...currentSizes, sizeValue],
      };
    });
  };

  const updateSizePrice = (sizeValue, value) => {
    const sanitized = sanitizePriceInput(value);

    setFormData((prev) => ({
      ...prev,
      sizePrices: {
        ...(prev.sizePrices || {}),
        [sizeValue]: sanitized,
      },
    }));
  };

  const addSpecificationField = () => {
    setFormData((prev) => ({
      ...prev,
      specifications: [...(prev.specifications || []), { name: "", price: "" }],
    }));
  };

  const updateSpecificationField = (index, field, value) => {
    setFormData((prev) => {
      const next = [...(prev.specifications || [])];
      next[index] = {
        ...(next[index] || { name: "", price: "" }),
        [field]: field === "price" ? sanitizePriceInput(value) : value,
      };
      return { ...prev, specifications: next };
    });
  };

  const removeSpecificationField = (index) => {
    setFormData((prev) => {
      const next = [...(prev.specifications || [])].filter(
        (_, idx) => idx !== index,
      );
      return {
        ...prev,
        specifications: next.length ? next : [{ name: "", price: "" }],
      };
    });
  };

  const handleSave = async () => {
    if (!formData.title || !formData.price || !formData.vendor_id) {
      showError("Error", "Title, price, and vendor are required");
      return;
    }

    if (!formData.category) {
      showError("Error", "Please select a category");
      return;
    }

    const parsedPrice = parseFloat(formData.price);
    if (Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      showError("Error", "Please enter a valid price");
      return;
    }

    const normalizedSpecifications = (formData.specifications || [])
      .map((spec) => ({
        name: String(spec?.name || "").trim(),
        extraPrice: parsePositivePrice(spec?.price),
      }))
      .filter((spec) => Boolean(spec.name));

    const specificationsList = normalizedSpecifications.map(
      (spec) => spec.name,
    );
    const specificationPrices = normalizedSpecifications.reduce((acc, spec) => {
      if (spec.extraPrice > 0) {
        acc[spec.name] = spec.extraPrice;
      }
      return acc;
    }, {});

    const sizePrices = (formData.sizes || []).reduce((acc, sizeValue) => {
      const extraPrice = parsePositivePrice(formData.sizePrices?.[sizeValue]);
      if (extraPrice > 0) {
        acc[sizeValue] = extraPrice;
      }
      return acc;
    }, {});

    const uploadedImageUrls = [];
    for (const uri of selectedImageUris) {
      try {
        const uploadedUrl = await uploadMealImage(uri, formData.vendor_id);
        uploadedImageUrls.push(uploadedUrl);
      } catch (error) {
        showError("Error", "Failed to upload image. Please try again.");
        return;
      }
    }

    const finalImageUrls = [
      ...(formData.images || []).filter(Boolean),
      ...uploadedImageUrls,
    ];

    const data = {
      vendor_id: formData.vendor_id,
      title: formData.title,
      description: formData.description,
      price: parsedPrice,
      category: formData.category,
      sizes: formData.sizes || [],
      size:
        Array.isArray(formData.sizes) && formData.sizes.length
          ? formData.sizes[0]
          : null,
      specifications: specificationsList,
      size_prices: sizePrices,
      specification_prices: specificationPrices,
      status: formData.status,
      images: finalImageUrls,
      image: finalImageUrls[0] || null,
    };

    let result;
    if (editingMeal) {
      result = await updateMeal(editingMeal.id, data, {
        removedImageUrls,
      });
    } else {
      result = await createMeal(data);
    }

    if (result.success) {
      setModalVisible(false);
      setSelectedImageUris([]);
      setRemovedImageUrls([]);
      loadData();
      showSuccess(
        "Success",
        `Meal ${editingMeal ? "updated" : "created"} successfully`,
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
        contentContainerStyle={styles.scrollContentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {meals.map((meal) => (
          <View key={meal.id} style={styles.mealCard}>
            {(meal.image || (Array.isArray(meal.images) && meal.images[0])) && (
              <Image
                source={{ uri: meal.images?.[0] || meal.image }}
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
              <View style={styles.mealTags}>
                {meal.category ? (
                  <View style={styles.mealTag}>
                    <Text style={styles.mealTagText}>{meal.category}</Text>
                  </View>
                ) : null}
                {(Array.isArray(meal.sizes)
                  ? meal.sizes.filter(Boolean)
                  : meal.size
                    ? [meal.size]
                    : []
                ).map((sizeValue) => (
                  <View key={`${meal.id}-${sizeValue}`} style={styles.mealTag}>
                    <Text style={styles.mealTagText}>
                      {String(sizeValue)
                        .split("_")
                        .map(
                          (part) =>
                            part.charAt(0).toUpperCase() + part.slice(1),
                        )
                        .join(" ")}
                    </Text>
                  </View>
                ))}
              </View>
              {(
                Array.isArray(meal.specifications)
                  ? meal.specifications.length > 0
                  : !!meal.specifications
              ) ? (
                <Text style={styles.mealSpecs} numberOfLines={1}>
                  Specs:{" "}
                  {Array.isArray(meal.specifications)
                    ? meal.specifications.join(" • ")
                    : meal.specifications}
                </Text>
              ) : null}
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
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color:
                          meal.status === "available"
                            ? colors.success
                            : colors.error,
                      },
                    ]}
                  >
                    {meal.status}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.mealActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.editButton]}
                onPress={() => handleEdit(meal)}
              >
                <Text style={styles.actionButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => handleDelete(meal)}
              >
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
        onRequestClose={() => setModalVisible(false)}
      >
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
                    }
                  >
                    <Text
                      style={[
                        styles.pickerText,
                        formData.vendor_id === vendor.id &&
                          styles.pickerTextSelected,
                      ]}
                    >
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
                  contentContainerStyle={styles.categoryScrollContent}
                >
                  {MEAL_CATEGORIES.map((category) => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.categoryChip,
                        formData.category === category &&
                          styles.categoryChipActive,
                      ]}
                      onPress={() => setFormData({ ...formData, category })}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          formData.category === category &&
                            styles.categoryChipTextActive,
                        ]}
                      >
                        {category}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.categorySection}>
                <Text style={styles.categoryLabel}>Sizes (optional)</Text>
                <Text style={styles.sizeHelperText}>
                  {(formData.sizes || []).length > 0
                    ? `${formData.sizes.length} selected`
                    : "No size options"}
                </Text>
                <View style={styles.pickerContainer}>
                  {MEAL_SIZES.map((size) => {
                    const selected = (formData.sizes || []).includes(
                      size.value,
                    );

                    return (
                      <TouchableOpacity
                        key={size.value}
                        style={[
                          styles.pickerOption,
                          selected && styles.pickerOptionSelected,
                        ]}
                        onPress={() => toggleSizeSelection(size.value)}
                      >
                        <Text
                          style={[
                            styles.pickerText,
                            selected && styles.pickerTextSelected,
                          ]}
                        >
                          {size.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {(formData.sizes || []).map((sizeValue) => {
                  const sizeLabel =
                    MEAL_SIZES.find((size) => size.value === sizeValue)
                      ?.label || sizeValue;

                  return (
                    <View
                      key={`admin-size-price-${sizeValue}`}
                      style={styles.specRow}
                    >
                      <Text style={styles.sizePriceLabel}>
                        {sizeLabel} extra
                      </Text>
                      <TextInput
                        style={[styles.input, styles.specPriceInput]}
                        placeholder="0.00"
                        placeholderTextColor={colors.textMuted}
                        value={formData.sizePrices?.[sizeValue] || ""}
                        onChangeText={(text) =>
                          updateSizePrice(sizeValue, text)
                        }
                        keyboardType="decimal-pad"
                      />
                    </View>
                  );
                })}
              </View>

              {/* Image Upload Section */}
              <View style={styles.imageSection}>
                <Text style={styles.imageLabel}>Meal Photo</Text>
                {!!formData.images?.length && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.galleryRow}
                  >
                    {formData.images.map((imageUrl) => (
                      <View key={imageUrl} style={styles.galleryItem}>
                        <Image
                          source={{ uri: imageUrl }}
                          style={styles.galleryImage}
                          resizeMode="cover"
                        />
                        <TouchableOpacity
                          style={styles.removeImageButton}
                          onPress={() => removeExistingImage(imageUrl)}
                        >
                          <Text style={styles.removeImageText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                )}
                {!!selectedImageUris.length && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.galleryRow}
                  >
                    {selectedImageUris.map((uri, index) => (
                      <View key={`${uri}-${index}`} style={styles.galleryItem}>
                        <Image
                          source={{ uri }}
                          style={styles.galleryImage}
                          resizeMode="cover"
                        />
                        <TouchableOpacity
                          style={styles.removeImageButton}
                          onPress={() => removeNewImage(index)}
                        >
                          <Text style={styles.removeImageText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                )}
                <TouchableOpacity
                  style={styles.imagePickerButton}
                  onPress={pickImages}
                  disabled={uploadingImage}
                >
                  <Text style={styles.imagePickerIcon}>
                    {uploadingImage ? "⏳" : "📷"}
                  </Text>
                  <Text style={styles.imagePickerText}>Add Photos</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.categoryLabel}>Specifications</Text>
              {(formData.specifications || []).map((spec, index) => (
                <View key={`admin-spec-${index}`} style={styles.specRow}>
                  <TextInput
                    style={[styles.input, styles.specInput]}
                    placeholder={`Specification ${index + 1}`}
                    placeholderTextColor={colors.textMuted}
                    value={spec?.name || ""}
                    onChangeText={(text) =>
                      updateSpecificationField(index, "name", text)
                    }
                  />
                  <TextInput
                    style={[styles.input, styles.specPriceInput]}
                    placeholder="+0.00"
                    placeholderTextColor={colors.textMuted}
                    value={spec?.price || ""}
                    onChangeText={(text) =>
                      updateSpecificationField(index, "price", text)
                    }
                    keyboardType="decimal-pad"
                  />
                  {(formData.specifications || []).length > 1 && (
                    <TouchableOpacity
                      style={styles.specDeleteButton}
                      onPress={() => removeSpecificationField(index)}
                    >
                      <Text style={styles.removeImageText}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              <TouchableOpacity
                style={styles.addSpecButton}
                onPress={addSpecificationField}
              >
                <Text style={styles.addSpecText}>+ Add Specification</Text>
              </TouchableOpacity>
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
  scrollContentContainer: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxxl + spacing.xxxl + spacing.xxxl + spacing.xxxl,
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
  mealTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  mealTag: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  mealTagText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  mealSpecs: {
    fontSize: 12,
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
  galleryRow: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingRight: spacing.md,
  },
  galleryItem: {
    position: "relative",
  },
  galleryImage: {
    width: 96,
    height: 96,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
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
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
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
    fontSize: 14,
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
  specRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  specInput: {
    flex: 1,
  },
  specPriceInput: {
    width: 96,
  },
  sizePriceLabel: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: spacing.md,
  },
  specDeleteButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.error,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  addSpecButton: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  addSpecText: {
    color: colors.primary,
    fontWeight: "600",
    fontSize: 13,
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
  sizeHelperText: {
    fontSize: 12,
    color: colors.textSecondary,
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
