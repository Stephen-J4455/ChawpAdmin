import { supabase } from "../config/supabase";

// ========================================
// DASHBOARD ANALYTICS
// ========================================

export async function getDashboardStats() {
  try {
    // Get total vendors
    const { count: vendorsCount } = await supabase
      .from("chawp_vendors")
      .select("*", { count: "exact", head: true });

    // Get total meals
    const { count: mealsCount } = await supabase
      .from("chawp_meals")
      .select("*", { count: "exact", head: true });

    // Get total orders
    const { count: ordersCount } = await supabase
      .from("chawp_orders")
      .select("*", { count: "exact", head: true });

    // Get total users
    const { count: usersCount } = await supabase
      .from("chawp_user_profiles")
      .select("*", { count: "exact", head: true });

    // Get total revenue
    const { data: revenueData } = await supabase
      .from("chawp_orders")
      .select("total_amount");

    const totalRevenue =
      revenueData?.reduce(
        (sum, order) => sum + parseFloat(order.total_amount || 0),
        0
      ) || 0;

    // Get orders by status
    const { data: ordersByStatus } = await supabase
      .from("chawp_orders")
      .select("status");

    const statusCounts =
      ordersByStatus?.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {}) || {};

    // Get recent orders (last 10)
    const { data: recentOrders } = await supabase
      .from("chawp_orders")
      .select(
        `
        *,
        chawp_vendors(name),
        chawp_user_profiles(full_name, username)
      `
      )
      .order("created_at", { ascending: false })
      .limit(10);

    return {
      success: true,
      data: {
        vendorsCount: vendorsCount || 0,
        mealsCount: mealsCount || 0,
        ordersCount: ordersCount || 0,
        usersCount: usersCount || 0,
        totalRevenue,
        statusCounts,
        recentOrders: recentOrders || [],
      },
    };
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return { success: false, error: error.message };
  }
}

// ========================================
// VENDORS MANAGEMENT
// ========================================

export async function fetchAllVendors() {
  try {
    const { data, error } = await supabase
      .from("chawp_vendors")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error("Error fetching vendors:", error);
    return { success: false, error: error.message };
  }
}

export async function createVendor(vendorData) {
  try {
    // Extract password from vendorData (don't store it in vendor table)
    const { password, email, name, phone, ...vendorInfo } = vendorData;

    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    if (!name) {
      throw new Error("Vendor name is required");
    }

    // Step 1: Create the auth user account
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        emailRedirectTo: undefined, // Prevent email confirmation for admin-created accounts
        data: {
          role: "vendor", // Store role in user metadata
          email: email,
        },
      },
    });

    if (authError) {
      console.error("Auth error:", authError);
      throw new Error(`Failed to create account: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error("Failed to create user account");
    }

    const userId = authData.user.id;

    // Step 2: Create user profile in chawp_user_profiles with role='vendor'
    const { error: profileError } = await supabase
      .from("chawp_user_profiles")
      .insert([
        {
          id: userId,
          full_name: name, // Use vendor name as full name
          phone: phone || null,
          role: "vendor", // Set role as vendor
        },
      ]);

    if (profileError) {
      console.error("Profile creation error:", profileError);
      throw new Error(`Failed to create user profile: ${profileError.message}`);
    }

    // Step 3: Create the vendor record with the user_id
    const vendorRecord = {
      ...vendorInfo,
      name: name,
      email: email,
      phone: phone,
      user_id: userId, // Link vendor to auth account
    };

    const { data, error } = await supabase
      .from("chawp_vendors")
      .insert([vendorRecord])
      .select()
      .single();

    if (error) {
      // If vendor creation fails, we should ideally delete the auth user and profile
      // but admin API would be needed for that
      console.error("Vendor creation error:", error);
      throw new Error(`Failed to create vendor: ${error.message}`);
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error creating vendor:", error);
    return { success: false, error: error.message };
  }
}

export async function updateVendor(vendorId, vendorData) {
  try {
    // Remove password from vendorData if it exists (shouldn't be in updates)
    const { password, ...updateData } = vendorData;

    const { data, error } = await supabase
      .from("chawp_vendors")
      .update(updateData)
      .eq("id", vendorId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error updating vendor:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteVendor(vendorId) {
  try {
    const { error } = await supabase
      .from("chawp_vendors")
      .delete()
      .eq("id", vendorId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error deleting vendor:", error);
    return { success: false, error: error.message };
  }
}

// ========================================
// VENDOR HOURS MANAGEMENT
// ========================================

export async function fetchVendorHours(vendorId) {
  try {
    const { data, error } = await supabase
      .from("chawp_vendor_hours")
      .select("*")
      .eq("vendor_id", vendorId)
      .order("day_of_week", { ascending: true });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error("Error fetching vendor hours:", error);
    return { success: false, error: error.message };
  }
}

export async function createVendorHours(hoursData) {
  try {
    const { data, error } = await supabase
      .from("chawp_vendor_hours")
      .insert([hoursData])
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error creating vendor hours:", error);
    return { success: false, error: error.message };
  }
}

export async function updateVendorHours(hoursId, hoursData) {
  try {
    const { data, error } = await supabase
      .from("chawp_vendor_hours")
      .update(hoursData)
      .eq("id", hoursId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error updating vendor hours:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteVendorHours(hoursId) {
  try {
    const { error } = await supabase
      .from("chawp_vendor_hours")
      .delete()
      .eq("id", hoursId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error deleting vendor hours:", error);
    return { success: false, error: error.message };
  }
}

// ========================================
// MEALS MANAGEMENT
// ========================================

export async function fetchAllMeals() {
  try {
    const { data, error } = await supabase
      .from("chawp_meals")
      .select(
        `
        *,
        chawp_vendors(name)
      `
      )
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error("Error fetching meals:", error);
    return { success: false, error: error.message };
  }
}

export async function fetchMealsByVendor(vendorId) {
  try {
    const { data, error } = await supabase
      .from("chawp_meals")
      .select("*")
      .eq("vendor_id", vendorId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error("Error fetching meals:", error);
    return { success: false, error: error.message };
  }
}

export async function createMeal(mealData) {
  try {
    const { data, error } = await supabase
      .from("chawp_meals")
      .insert([mealData])
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error creating meal:", error);
    return { success: false, error: error.message };
  }
}

export async function updateMeal(mealId, mealData) {
  try {
    const { data, error } = await supabase
      .from("chawp_meals")
      .update(mealData)
      .eq("id", mealId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error updating meal:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteMeal(mealId) {
  try {
    const { error } = await supabase
      .from("chawp_meals")
      .delete()
      .eq("id", mealId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error deleting meal:", error);
    return { success: false, error: error.message };
  }
}

// ========================================
// ORDERS MANAGEMENT
// ========================================

export async function fetchAllOrders() {
  try {
    const { data: orders, error } = await supabase
      .from("chawp_orders")
      .select(
        `
        *,
        chawp_vendors(name, image),
        chawp_user_profiles(full_name, username, phone)
      `
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Fetch order items with meal details for each order
    const ordersWithItems = await Promise.all(
      (orders || []).map(async (order) => {
        const { data: items } = await supabase
          .from("chawp_order_items")
          .select(
            `
            *,
            chawp_meals(title, image, price)
          `
          )
          .eq("order_id", order.id);

        return { ...order, items: items || [] };
      })
    );

    return { success: true, data: ordersWithItems };
  } catch (error) {
    console.error("Error fetching orders:", error);
    return { success: false, error: error.message };
  }
}

export async function fetchOrderDetails(orderId) {
  try {
    const { data: order, error: orderError } = await supabase
      .from("chawp_orders")
      .select(
        `
        *,
        chawp_vendors(name, image, phone),
        chawp_user_profiles(full_name, username, phone, address)
      `
      )
      .eq("id", orderId)
      .single();

    if (orderError) throw orderError;

    const { data: items, error: itemsError } = await supabase
      .from("chawp_order_items")
      .select(
        `
        *,
        chawp_meals(title, image)
      `
      )
      .eq("order_id", orderId);

    if (itemsError) throw itemsError;

    return {
      success: true,
      data: {
        ...order,
        items: items || [],
      },
    };
  } catch (error) {
    console.error("Error fetching order details:", error);
    return { success: false, error: error.message };
  }
}

export async function updateOrderStatus(orderId, status) {
  try {
    const { data, error } = await supabase
      .from("chawp_orders")
      .update({ status })
      .eq("id", orderId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error updating order status:", error);
    return { success: false, error: error.message };
  }
}

// ========================================
// USERS MANAGEMENT
// ========================================

export async function fetchAllUsers() {
  try {
    // First get user profiles
    const { data: profiles, error: profileError } = await supabase
      .from("chawp_user_profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (profileError) throw profileError;

    // Try to get auth users to fetch emails (requires service role)
    // If this fails due to insufficient permissions, we'll just return profiles
    try {
      const {
        data: { users: authUsers },
        error: authError,
      } = await supabase.auth.admin.listUsers();

      if (authError) {
        console.warn(
          "Could not fetch auth users (requires service role):",
          authError.message
        );
        // Return profiles without emails if auth fetch fails
        return { success: true, data: profiles || [] };
      }

      // Merge email data into profiles
      const usersWithEmails = (profiles || []).map((profile) => {
        const authUser = authUsers?.find((u) => u.id === profile.id);
        return {
          ...profile,
          email: authUser?.email || null,
        };
      });

      return { success: true, data: usersWithEmails };
    } catch (authException) {
      console.warn("Auth admin API not available:", authException.message);
      // Return profiles without emails
      return { success: true, data: profiles || [] };
    }
  } catch (error) {
    console.error("Error fetching users:", error);
    return { success: false, error: error.message };
  }
}

export async function fetchUserOrders(userId) {
  try {
    const { data, error } = await supabase
      .from("chawp_orders")
      .select(
        `
        *,
        chawp_vendors(name)
      `
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error("Error fetching user orders:", error);
    return { success: false, error: error.message };
  }
}

export async function updateUserRole(userId, newRole) {
  try {
    const { data, error } = await supabase
      .from("chawp_user_profiles")
      .update({ role: newRole })
      .eq("id", userId)
      .select();

    if (error) throw error;
    return { success: true, data: data?.[0] };
  } catch (error) {
    console.error("Error updating user role:", error);
    return { success: false, error: error.message };
  }
}

// ========================================
// DELIVERY PERSONNEL MANAGEMENT
// ========================================

const ALLOWED_VEHICLE_TYPES = ["bicycle", "motorcycle", "car", "scooter"];

export async function fetchAllDeliveryPersonnel() {
  try {
    // Fetch delivery personnel
    const { data: personnel, error } = await supabase
      .from("chawp_delivery_personnel")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Fetch user profiles for each personnel
    if (personnel && personnel.length > 0) {
      const userIds = personnel.map((p) => p.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("chawp_user_profiles")
        .select("id, full_name, username, phone")
        .in("id", userIds);

      if (profilesError) {
        console.warn("Could not fetch user profiles:", profilesError);
      }

      // Merge profiles into personnel data
      const personnelWithProfiles = personnel.map((person) => {
        const profile = profiles?.find((p) => p.id === person.user_id);
        return {
          ...person,
          chawp_user_profiles: profile || null,
        };
      });

      return { success: true, data: personnelWithProfiles };
    }

    return { success: true, data: personnel || [] };
  } catch (error) {
    console.error("Error fetching delivery personnel:", error);
    return { success: false, error: error.message };
  }
}

export async function createDeliveryPersonnel(deliveryData) {
  try {
    const {
      email,
      password,
      vehicle_type = "motorcycle",
      phone,
      full_name,
      ...rest
    } = deliveryData;

    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    if (!ALLOWED_VEHICLE_TYPES.includes(vehicle_type)) {
      throw new Error(
        `Invalid vehicle_type. Allowed: ${ALLOWED_VEHICLE_TYPES.join(", ")}`
      );
    }

    // Step 1: create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: undefined,
        data: { role: "delivery", email },
      },
    });

    if (authError) {
      console.error("Auth error (createDeliveryPersonnel):", authError);
      throw new Error(`Failed to create account: ${authError.message}`);
    }

    if (!authData?.user) {
      throw new Error("Failed to create auth user");
    }

    const userId = authData.user.id;

    // Step 2: create user profile with role 'delivery'
    const { error: profileError } = await supabase
      .from("chawp_user_profiles")
      .insert([
        {
          id: userId,
          full_name: full_name || null,
          phone: phone || null,
          role: "delivery",
        },
      ]);

    if (profileError) {
      console.error("Profile creation error (delivery):", profileError);
      throw new Error(`Failed to create user profile: ${profileError.message}`);
    }

    // Step 3: create delivery personnel record
    const deliveryRecord = {
      user_id: userId,
      vehicle_type,
      vehicle_registration: rest.vehicle_registration || null,
      vehicle_color: rest.vehicle_color || null,
      is_available: rest.is_available || false,
      is_verified: rest.is_verified || false,
    };

    const { data, error } = await supabase
      .from("chawp_delivery_personnel")
      .insert([deliveryRecord])
      .select()
      .single();

    if (error) {
      console.error("Delivery personnel creation error:", error);
      throw new Error(`Failed to create delivery personnel: ${error.message}`);
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error creating delivery personnel:", error);
    return { success: false, error: error.message };
  }
}

export async function updateDeliveryPersonnel(personnelId, updateData) {
  try {
    if (
      updateData.vehicle_type &&
      !ALLOWED_VEHICLE_TYPES.includes(updateData.vehicle_type)
    ) {
      throw new Error(
        `Invalid vehicle_type. Allowed: ${ALLOWED_VEHICLE_TYPES.join(", ")}`
      );
    }

    const { data, error } = await supabase
      .from("chawp_delivery_personnel")
      .update(updateData)
      .eq("id", personnelId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error updating delivery personnel:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteDeliveryPersonnel(personnelId) {
  try {
    // Fetch the personnel record first to get user_id
    const { data: personnel, error: fetchError } = await supabase
      .from("chawp_delivery_personnel")
      .select("user_id")
      .eq("id", personnelId)
      .single();

    if (fetchError) throw fetchError;

    // Delete the delivery personnel record
    const { error } = await supabase
      .from("chawp_delivery_personnel")
      .delete()
      .eq("id", personnelId);

    if (error) throw error;

    // Optionally, downgrade user role back to 'user'
    if (personnel?.user_id) {
      await supabase
        .from("chawp_user_profiles")
        .update({ role: "user" })
        .eq("id", personnel.user_id);
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting delivery personnel:", error);
    return { success: false, error: error.message };
  }
}

export async function fetchDeliveryEarnings(deliveryPersonnelId) {
  try {
    const { data, error } = await supabase
      .from("chawp_delivery_earnings")
      .select("*")
      .eq("delivery_personnel_id", deliveryPersonnelId)
      .order("earned_at", { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error("Error fetching delivery earnings:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetch all delivery earnings (for admin overview)
 */
export async function fetchAllDeliveryEarnings() {
  try {
    // Fetch all earnings
    const { data: earnings, error } = await supabase
      .from("chawp_delivery_earnings")
      .select("*")
      .order("earned_at", { ascending: false });

    if (error) throw error;

    // Fetch delivery personnel details
    if (earnings && earnings.length > 0) {
      const personnelIds = [
        ...new Set(earnings.map((e) => e.delivery_personnel_id)),
      ];
      const { data: personnel } = await supabase
        .from("chawp_delivery_personnel")
        .select("id, user_id, vehicle_type")
        .in("id", personnelIds);

      // Fetch user profiles
      if (personnel && personnel.length > 0) {
        const userIds = personnel.map((p) => p.user_id);
        const { data: profiles } = await supabase
          .from("chawp_user_profiles")
          .select("id, full_name, username, phone")
          .in("id", userIds);

        // Merge profiles into personnel
        const personnelWithProfiles = personnel.map((person) => {
          const profile = profiles?.find((p) => p.id === person.user_id);
          return {
            ...person,
            chawp_user_profiles: profile || null,
          };
        });

        // Merge personnel into earnings
        const earningsWithDetails = earnings.map((earning) => {
          const person = personnelWithProfiles.find(
            (p) => p.id === earning.delivery_personnel_id
          );
          return {
            ...earning,
            chawp_delivery_personnel: person || null,
          };
        });

        return { success: true, data: earningsWithDetails };
      }
    }

    return { success: true, data: earnings || [] };
  } catch (error) {
    console.error("Error fetching all delivery earnings:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Create delivery payout/earning
 */
export async function createDeliveryPayout(payoutData) {
  try {
    const { data, error } = await supabase
      .from("chawp_delivery_earnings")
      .insert({
        delivery_personnel_id: payoutData.deliveryPersonnelId,
        order_id: payoutData.orderId || null,
        amount: payoutData.amount,
        type: payoutData.type || "delivery_fee",
        description: payoutData.description || null,
        status: payoutData.status || "pending",
        payment_method: payoutData.paymentMethod || null,
        reference_number: payoutData.referenceNumber || null,
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error creating delivery payout:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Update delivery earning/payout status
 */
export async function updateDeliveryEarningStatus(
  earningId,
  status,
  referenceNumber = null
) {
  try {
    const updateData = {
      status,
      ...(status === "paid" && { paid_at: new Date().toISOString() }),
      ...(referenceNumber && { reference_number: referenceNumber }),
    };

    const { data, error } = await supabase
      .from("chawp_delivery_earnings")
      .update(updateData)
      .eq("id", earningId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error updating delivery earning status:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Assign delivery personnel to an order
 */
export async function assignDeliveryToOrder(orderId, deliveryPersonnelId) {
  try {
    const { data, error } = await supabase
      .from("chawp_orders")
      .update({
        delivery_personnel_id: deliveryPersonnelId,
        status: "preparing", // Update status when delivery is assigned
      })
      .eq("id", orderId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error assigning delivery to order:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Unassign delivery personnel from an order
 */
export async function unassignDeliveryFromOrder(orderId) {
  try {
    const { data, error } = await supabase
      .from("chawp_orders")
      .update({ delivery_personnel_id: null })
      .eq("id", orderId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error unassigning delivery from order:", error);
    return { success: false, error: error.message };
  }
}

// ========================================
// DELIVERY BANK DETAILS
// ========================================

/**
 * Fetch delivery personnel bank details
 * @param {string} deliveryPersonnelId - Delivery personnel ID
 */
export async function fetchDeliveryBankDetails(deliveryPersonnelId) {
  try {
    const { data, error } = await supabase
      .from("chawp_delivery_bank_details")
      .select("*")
      .eq("delivery_personnel_id", deliveryPersonnelId)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    return { success: true, data: data || null };
  } catch (error) {
    console.error("Error fetching delivery bank details:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Verify delivery personnel bank details
 * @param {string} bankDetailsId - Bank details ID
 * @param {boolean} isVerified - Verification status
 */
export async function verifyDeliveryBankDetails(bankDetailsId, isVerified) {
  try {
    const { data, error } = await supabase
      .from("chawp_delivery_bank_details")
      .update({
        is_verified: isVerified,
        verified_at: isVerified ? new Date().toISOString() : null,
      })
      .eq("id", bankDetailsId)
      .select();

    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (error) {
    console.error("Error verifying delivery bank details:", error);
    return { success: false, error: error.message };
  }
}

// ========================================
// REVIEWS MANAGEMENT
// ========================================

export async function fetchAllReviews() {
  try {
    const { data, error } = await supabase
      .from("chawp_reviews")
      .select(
        `
        *,
        chawp_user_profiles(full_name, username),
        chawp_vendors(name),
        chawp_meals(title)
      `
      )
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteReview(reviewId) {
  try {
    const { error } = await supabase
      .from("chawp_reviews")
      .delete()
      .eq("id", reviewId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error deleting review:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Update vendor operational status (open/closed)
 * @param {string} vendorId - Vendor ID
 * @param {string} status - "open" or "closed"
 */
export async function updateVendorOperationalStatus(vendorId, status) {
  try {
    const { data, error } = await supabase
      .from("chawp_vendors")
      .update({ operational_status: status })
      .eq("id", vendorId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error updating vendor operational status:", error);
    return { success: false, error: error.message };
  }
}

// ========================================
// VENDOR BANK DETAILS & PAYOUTS
// ========================================

/**
 * Fetch vendor bank details for a specific user
 * @param {string} userId - User ID
 */
export async function fetchUserVendorBankDetails(userId) {
  try {
    // First get the vendor associated with this user
    const { data: vendor, error: vendorError } = await supabase
      .from("chawp_vendors")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (vendorError || !vendor) {
      return { success: true, data: null, message: "User is not a vendor" };
    }

    // Get bank details for this vendor
    const { data, error } = await supabase
      .from("chawp_vendor_bank_details")
      .select("*")
      .eq("vendor_id", vendor.id)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 is "no rows returned"
      throw error;
    }

    return { success: true, data: data || null, vendorId: vendor.id };
  } catch (error) {
    console.error("Error fetching vendor bank details:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Verify vendor bank details
 * @param {string} bankDetailsId - Bank details ID
 * @param {boolean} isVerified - Verification status
 */
export async function verifyVendorBankDetails(bankDetailsId, isVerified) {
  try {
    const { data, error } = await supabase
      .from("chawp_vendor_bank_details")
      .update({
        is_verified: isVerified,
        verified_at: isVerified ? new Date().toISOString() : null,
      })
      .eq("id", bankDetailsId)
      .select();

    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (error) {
    console.error("Error verifying bank details:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetch vendor payout history
 * @param {string} vendorId - Vendor ID
 */
export async function fetchVendorPayouts(vendorId) {
  try {
    const { data, error } = await supabase
      .from("chawp_vendor_payouts")
      .select("*")
      .eq("vendor_id", vendorId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error("Error fetching vendor payouts:", error);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * Create a new payout for vendor
 * @param {Object} payoutData - Payout information
 */
export async function createVendorPayout(payoutData) {
  try {
    const { data, error } = await supabase
      .from("chawp_vendor_payouts")
      .insert({
        vendor_id: payoutData.vendorId,
        amount: payoutData.amount,
        status: payoutData.status || "pending",
        payment_method: payoutData.paymentMethod,
        reference_number: payoutData.referenceNumber || null,
        notes: payoutData.notes || null,
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error creating payout:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Update payout status
 * @param {string} payoutId - Payout ID
 * @param {string} status - New status (pending, processing, completed, failed)
 */
export async function updatePayoutStatus(
  payoutId,
  status,
  referenceNumber = null
) {
  try {
    const updateData = {
      status,
      ...(status === "completed" && { completed_at: new Date().toISOString() }),
      ...(referenceNumber && { reference_number: referenceNumber }),
    };

    const { data, error } = await supabase
      .from("chawp_vendor_payouts")
      .update(updateData)
      .eq("id", payoutId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error updating payout status:", error);
    return { success: false, error: error.message };
  }
}
