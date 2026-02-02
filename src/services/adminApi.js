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
        0,
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
      `,
      )
      .order("created_at", { ascending: false })
      .limit(10);

    // Get delivery personnel who delivered today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.toISOString();

    const { data: todayDeliveries, error: deliveryError } = await supabase
      .from("chawp_orders")
      .select(
        `
        delivery_personnel_id,
        updated_at,
        chawp_delivery_personnel(
          id,
          user_id,
          vehicle_type,
          vehicle_registration
        )
      `,
      )
      .eq("status", "delivered")
      .gte("updated_at", todayStart)
      .not("delivery_personnel_id", "is", null);

    console.log("Today deliveries raw:", {
      todayDeliveries,
      deliveryError,
      todayStart,
    });

    // Count deliveries per person and get user IDs
    const deliveryPersonnelToday = {};
    const userIds = new Set();

    todayDeliveries?.forEach((order) => {
      if (order.delivery_personnel_id && order.chawp_delivery_personnel) {
        const personnelId = order.delivery_personnel_id;
        const personnel = order.chawp_delivery_personnel;

        if (!deliveryPersonnelToday[personnelId]) {
          deliveryPersonnelToday[personnelId] = {
            id: personnel.id,
            user_id: personnel.user_id,
            vehicle_type: personnel.vehicle_type,
            vehicle_registration: personnel.vehicle_registration,
            deliveries_today: 0,
          };
        }
        deliveryPersonnelToday[personnelId].deliveries_today += 1;
        if (personnel.user_id) {
          userIds.add(personnel.user_id);
        }
      }
    });

    // Get user profiles
    let userProfiles = {};
    if (userIds.size > 0) {
      const { data: profiles } = await supabase
        .from("chawp_user_profiles")
        .select("id, full_name, username, avatar_url")
        .in("id", Array.from(userIds));

      console.log("User profiles:", profiles);

      profiles?.forEach((profile) => {
        userProfiles[profile.id] = profile;
      });
    }

    // Combine personnel data with user profiles
    const deliveryPersonnelList = Object.values(deliveryPersonnelToday)
      .map((person) => ({
        ...person,
        chawp_user_profiles: userProfiles[person.user_id] || null,
      }))
      .sort((a, b) => b.deliveries_today - a.deliveries_today);

    // Get pending orders (not delivered or cancelled)
    const pendingOrders = Object.entries(statusCounts)
      .filter(([status]) => !["delivered", "cancelled"].includes(status))
      .reduce((sum, [, count]) => sum + count, 0);

    // Get revenue today (reuse todayStart from above)
    const { data: todayRevenue } = await supabase
      .from("chawp_orders")
      .select("total_amount")
      .gte("created_at", todayStart);

    const revenueTodayAmount =
      todayRevenue?.reduce(
        (sum, order) => sum + parseFloat(order.total_amount || 0),
        0,
      ) || 0;

    // Get new users today
    const { count: newUsersTodayCount } = await supabase
      .from("chawp_user_profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayStart);

    // Count active delivery personnel (any deliveries today)
    const activeDriversToday = new Set(
      todayDeliveries?.map((d) => d.delivery_personnel_id) || [],
    ).size;

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
        deliveryPersonnelToday: deliveryPersonnelList || [],
        // New quick stat cards
        pendingOrders,
        revenueTodayAmount: revenueTodayAmount.toFixed(2),
        newUsersTodayCount: newUsersTodayCount || 0,
        activeDriversToday,
      },
    };
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get orders grouped by time period
 * @param {string} period - 'day', 'week', or 'month'
 */
export async function getOrdersAnalytics(period = "day") {
  try {
    const { data, error } = await supabase
      .from("chawp_orders")
      .select("created_at, total_amount, status")
      .order("created_at", { ascending: true });

    if (error) throw error;

    const grouped = {};
    const now = new Date();

    data?.forEach((order) => {
      const date = new Date(order.created_at);
      let key;

      if (period === "day") {
        key = date.toISOString().split("T")[0]; // YYYY-MM-DD
      } else if (period === "week") {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split("T")[0];
      } else if (period === "month") {
        key = date.toISOString().substring(0, 7); // YYYY-MM
      }

      if (!grouped[key]) {
        grouped[key] = { count: 0, amount: 0 };
      }
      grouped[key].count += 1;
      grouped[key].amount += parseFloat(order.total_amount || 0);
    });

    // Convert to array and sort
    const chartData = Object.entries(grouped)
      .map(([date, stats]) => ({
        label: period === "day" ? new Date(date).toLocaleDateString() : date,
        value: stats.count,
        amount: stats.amount,
      }))
      .sort((a, b) => new Date(a.label) - new Date(b.label))
      .slice(-30); // Last 30 periods

    return { success: true, data: chartData };
  } catch (error) {
    console.error("Error fetching orders analytics:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get deliveries grouped by time period
 * @param {string} period - 'day', 'week', or 'month'
 */
export async function getDeliveriesAnalytics(period = "day") {
  try {
    const { data, error } = await supabase
      .from("chawp_orders")
      .select("updated_at, delivery_fee")
      .eq("status", "delivered")
      .order("updated_at", { ascending: true });

    if (error) throw error;

    const grouped = {};

    data?.forEach((order) => {
      const date = new Date(order.updated_at);
      let key;

      if (period === "day") {
        key = date.toISOString().split("T")[0]; // YYYY-MM-DD
      } else if (period === "week") {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split("T")[0];
      } else if (period === "month") {
        key = date.toISOString().substring(0, 7); // YYYY-MM
      }

      if (!grouped[key]) {
        grouped[key] = { count: 0 };
      }
      grouped[key].count += 1;
    });

    // Convert to array and sort
    const chartData = Object.entries(grouped)
      .map(([date, stats]) => ({
        label: period === "day" ? new Date(date).toLocaleDateString() : date,
        value: stats.count,
      }))
      .sort((a, b) => new Date(a.label) - new Date(b.label))
      .slice(-30); // Last 30 periods

    return { success: true, data: chartData };
  } catch (error) {
    console.error("Error fetching deliveries analytics:", error);
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
      `,
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
        chawp_vendors(id, name, image, phone),
        chawp_user_profiles(full_name, username, phone)
      `,
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
          `,
          )
          .eq("order_id", order.id);

        return { ...order, items: items || [] };
      }),
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
      `,
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
      `,
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
    // Update the order status and get full order details
    const { data, error } = await supabase
      .from("chawp_orders")
      .update({ status })
      .eq("id", orderId)
      .select(
        `
        *,
        chawp_user_profiles(push_token, full_name, username),
        chawp_vendors(name),
        order_items:chawp_order_items(
          quantity,
          meal:chawp_meals(title)
        )
      `,
      )
      .single();

    if (error) throw error;

    // Send push notification to customer
    if (data?.chawp_user_profiles) {
      try {
        const userName =
          data.chawp_user_profiles.username ||
          data.chawp_user_profiles.full_name ||
          "Customer";
        const firstName = userName.split(" ")[0];
        const vendorName = data.chawp_vendors?.name || "the vendor";

        // Get order items summary
        const items = data.order_items || [];
        let itemsSummary = "";

        if (items.length > 0) {
          const firstItem = items[0].meal?.title || "your order";
          if (items.length === 1) {
            itemsSummary = `"${firstItem}"`;
          } else if (items.length === 2) {
            const secondItem = items[1].meal?.title;
            itemsSummary = `"${firstItem}" and "${secondItem}"`;
          } else {
            itemsSummary = `"${firstItem}" and ${items.length - 1} other item${items.length > 2 ? "s" : ""}`;
          }
        } else {
          itemsSummary = "your order";
        }

        // Create personalized messages based on status
        let title = "Order Update";
        let message = "";

        switch (status) {
          case "confirmed":
            title = "🎉 Order Confirmed";
            message = `Hello ${firstName}, your order for ${itemsSummary} from ${vendorName} has been confirmed!`;
            break;
          case "preparing":
            title = "👨‍🍳 Order Being Prepared";
            message = `Hello ${firstName}, ${vendorName} is now preparing your order for ${itemsSummary}.`;
            break;
          case "ready":
            title = "✅ Order Ready";
            message = `Hello ${firstName}, your order for ${itemsSummary} is ready for pickup from ${vendorName}!`;
            break;
          case "out_for_delivery":
            title = "🚚 Out for Delivery";
            message = `Hello ${firstName}, your order for ${itemsSummary} is on its way to you!`;
            break;
          case "delivered":
            title = "📦 Order Delivered";
            message = `Hello ${firstName}, your order for ${itemsSummary} has been delivered. Enjoy your meal!`;
            break;
          case "cancelled":
            title = "❌ Order Cancelled";
            message = `Hello ${firstName}, your order for ${itemsSummary} has been cancelled.`;
            break;
          default:
            message = `Hello ${firstName}, your order status has been updated.`;
        }

        // Get all device tokens for this customer from device_tokens table
        const { data: deviceTokens } = await supabase
          .from("chawp_device_tokens")
          .select("push_token")
          .eq("user_id", data.user_id)
          .eq("device_type", "customer");

        // Collect all tokens (device_tokens + fallback to user_profiles)
        const tokens = [
          ...(deviceTokens || []).map((t) => t.push_token),
          data.chawp_user_profiles?.push_token,
        ].filter(Boolean);

        if (tokens.length > 0) {
          console.log(
            `Sending notification to ${tokens.length} customer device(s)`,
          );

          const { data: notifResult, error: notifError } =
            await supabase.functions.invoke("send-push-notification", {
              body: {
                tokens: tokens,
                title: title,
                body: message,
                data: {
                  orderId: orderId,
                  type: "order_update",
                  status: status,
                  channelId: "orders",
                },
              },
            });

          if (notifError) {
            console.error("Error sending notification:", notifError);
          } else {
            console.log("Notification sent successfully:", notifResult);
          }
        } else {
          console.log("No push tokens found for customer");
        }
      } catch (notifError) {
        console.error("Failed to send push notification:", notifError);
        // Don't fail the whole operation if notification fails
      }
    } else {
      console.log("No user profile found for customer");
    }

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
    // Get user profiles with email included
    const { data: profiles, error: profileError } = await supabase
      .from("chawp_user_profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (profileError) throw profileError;

    return { success: true, data: profiles || [] };
  } catch (error) {
    console.error("Error fetching users:", error);
    return { success: false, error: error.message };
  }
}

export async function fetchAdminLoginHistory() {
  try {
    const { data: profiles, error: profileError } = await supabase
      .from("chawp_user_profiles")
      .select("*")
      .in("role", ["admin", "super_admin"])
      .order("last_login_at", { ascending: false, nullsFirst: false });

    if (profileError) throw profileError;

    return { success: true, data: profiles || [] };
  } catch (error) {
    console.error("Error fetching admin login history:", error);
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
      `,
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
        `Invalid vehicle_type. Allowed: ${ALLOWED_VEHICLE_TYPES.join(", ")}`,
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
        `Invalid vehicle_type. Allowed: ${ALLOWED_VEHICLE_TYPES.join(", ")}`,
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
            (p) => p.id === earning.delivery_personnel_id,
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
 * Fetch orders for a specific delivery personnel
 */
export async function fetchDeliveryPersonnelOrders(deliveryPersonnelId) {
  try {
    const { data, error } = await supabase
      .from("chawp_orders")
      .select(
        `
        id,
        status,
        total_amount,
        delivery_fee,
        created_at,
        delivered_at,
        delivery_rating,
        chawp_vendors(name),
        chawp_user_profiles(full_name, username, phone)
      `,
      )
      .eq("delivery_personnel_id", deliveryPersonnelId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error("Error fetching delivery personnel orders:", error);
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
  referenceNumber = null,
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
      .select(
        `
        *,
        chawp_delivery_personnel(user_id)
      `,
      )
      .single();

    if (error) throw error;

    // Send notification to delivery person when payout is marked as paid
    if (status === "paid" && data?.chawp_delivery_personnel?.user_id) {
      try {
        const userId = data.chawp_delivery_personnel.user_id;

        // Get all device tokens for this delivery person from device_tokens table
        const { data: deviceTokens } = await supabase
          .from("chawp_device_tokens")
          .select("push_token")
          .eq("user_id", userId)
          .eq("device_type", "delivery");

        // Get fallback token from user_profiles if needed
        const { data: userProfile } = await supabase
          .from("chawp_user_profiles")
          .select("push_token")
          .eq("id", userId)
          .single();

        // Collect all tokens (device_tokens + fallback to user_profiles)
        const tokens = [
          ...(deviceTokens || []).map((t) => t.push_token),
          userProfile?.push_token,
        ].filter(Boolean);

        if (tokens.length > 0) {
          await supabase.functions.invoke("send-push-notification", {
            body: {
              tokens: tokens,
              title: "💰 Payout Completed",
              body: `Your payout of GHS ${data.amount} has been processed${referenceNumber ? ` (Ref: ${referenceNumber})` : ""}`,
              data: {
                earningId: earningId,
                type: "payout_completed",
                channelId: "earnings",
              },
            },
          });
          console.log(`Payout notification sent to ${tokens.length} device(s)`);
        }
      } catch (notifError) {
        console.error("Failed to send payout notification:", notifError);
      }
    }

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
      })
      .eq("id", orderId)
      .select(
        `
        *,
        chawp_vendors(name),
        chawp_user_profiles(username, full_name)
      `,
      )
      .single();

    if (error) throw error;

    // Send notification to delivery personnel
    try {
      const { data: deliveryPerson } = await supabase
        .from("chawp_delivery_personnel")
        .select("user_id")
        .eq("id", deliveryPersonnelId)
        .single();

      if (deliveryPerson?.user_id) {
        // Get all device tokens for this delivery person from device_tokens table
        const { data: deviceTokens } = await supabase
          .from("chawp_device_tokens")
          .select("push_token")
          .eq("user_id", deliveryPerson.user_id)
          .eq("device_type", "delivery");

        // Get fallback token from user_profiles if needed
        const { data: userProfile } = await supabase
          .from("chawp_user_profiles")
          .select("push_token")
          .eq("id", deliveryPerson.user_id)
          .single();

        // Collect all tokens (device_tokens + fallback to user_profiles)
        const tokens = [
          ...(deviceTokens || []).map((t) => t.push_token),
          userProfile?.push_token,
        ].filter(Boolean);

        if (tokens.length > 0) {
          const customerName =
            data.chawp_user_profiles?.username ||
            data.chawp_user_profiles?.full_name ||
            "Customer";
          const vendorName = data.chawp_vendors?.name || "a vendor";

          await supabase.functions.invoke("send-push-notification", {
            body: {
              tokens: tokens,
              title: "🚚 New Delivery Assignment",
              body: `You've been assigned to deliver order from ${vendorName} to ${customerName}`,
              data: {
                orderId: orderId,
                type: "delivery_assigned",
                channelId: "orders",
              },
            },
          });
          console.log(
            `Delivery assignment notification sent to ${tokens.length} device(s)`,
          );
        }
      }
    } catch (notifError) {
      console.error("Failed to send delivery notification:", notifError);
    }

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
      `,
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
  referenceNumber = null,
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
      .select(
        `
        *,
        chawp_vendors(user_id, name)
      `,
      )
      .single();

    if (error) throw error;

    // Send notification to vendor when payout is marked as completed
    if (status === "completed" && data?.chawp_vendors?.user_id) {
      try {
        const userId = data.chawp_vendors.user_id;

        // Get all device tokens for this vendor from device_tokens table
        const { data: deviceTokens } = await supabase
          .from("chawp_device_tokens")
          .select("push_token")
          .eq("user_id", userId)
          .eq("device_type", "vendor");

        // Get fallback token from user_profiles if needed
        const { data: userProfile } = await supabase
          .from("chawp_user_profiles")
          .select("push_token")
          .eq("id", userId)
          .single();

        // Collect all tokens (device_tokens + fallback to user_profiles)
        const tokens = [
          ...(deviceTokens || []).map((t) => t.push_token),
          userProfile?.push_token,
        ].filter(Boolean);

        if (tokens.length > 0) {
          await supabase.functions.invoke("send-push-notification", {
            body: {
              tokens: tokens,
              title: "💰 Payout Completed",
              body: `Your payout of GHS ${data.amount} has been processed${referenceNumber ? ` (Ref: ${referenceNumber})` : ""}`,
              data: {
                payoutId: payoutId,
                type: "payout_completed",
                channelId: "earnings",
              },
            },
          });
          console.log(
            `Vendor payout notification sent to ${tokens.length} device(s)`,
          );
        }
      } catch (notifError) {
        console.error("Failed to send vendor payout notification:", notifError);
      }
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error updating payout status:", error);
    return { success: false, error: error.message };
  }
}

// ========================================
// PUSH NOTIFICATIONS
// ========================================

export async function sendPushNotification({ recipients, title, message }) {
  try {
    // Build query based on recipients
    let query = supabase
      .from("chawp_user_profiles")
      .select("id, push_token, role, full_name, username");

    if (recipients !== "all") {
      query = query.eq("role", recipients);
    }

    const { data: users, error } = await query;

    if (error) throw error;

    // Filter users with push tokens
    const usersWithTokens = users.filter((user) => user.push_token);

    if (usersWithTokens.length === 0) {
      return {
        success: false,
        error: "No users with push tokens found for selected recipients",
      };
    }

    // Send notification via Supabase Edge Function
    const tokens = usersWithTokens.map((user) => user.push_token);

    const { data: result, error: notifError } = await supabase.functions.invoke(
      "send-push-notification",
      {
        body: {
          tokens: tokens,
          title: title,
          body: message,
          data: {
            type: "admin_broadcast",
            channelId: "general",
          },
        },
      },
    );

    if (notifError) throw notifError;

    console.log(
      `Push notification sent to ${tokens.length} user(s) (${recipients})`,
    );

    return { success: true, count: tokens.length, data: result };
  } catch (error) {
    console.error("Error sending push notification:", error);
    return { success: false, error: error.message };
  }
}

// ========================================
// ADVERTISEMENT MANAGEMENT
// ========================================

export async function fetchAdverts() {
  try {
    const { data, error } = await supabase
      .from("chawp_hero_cards")
      .select("*")
      .order("order_index", { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching advertisements:", error);
    throw error;
  }
}

export async function createAdvert(advertData) {
  try {
    const { data, error } = await supabase
      .from("chawp_hero_cards")
      .insert([advertData])
      .select();

    if (error) throw error;
    return data?.[0];
  } catch (error) {
    console.error("Error creating advertisement:", error);
    throw error;
  }
}

export async function updateAdvert(advertId, advertData) {
  try {
    const { data, error } = await supabase
      .from("chawp_hero_cards")
      .update(advertData)
      .eq("id", advertId)
      .select();

    if (error) throw error;
    return data?.[0];
  } catch (error) {
    console.error("Error updating advertisement:", error);
    throw error;
  }
}

export async function deleteAdvert(advertId) {
  try {
    const { error } = await supabase
      .from("chawp_hero_cards")
      .delete()
      .eq("id", advertId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting advertisement:", error);
    throw error;
  }
}

export async function uploadAdvertImage(imageAsset) {
  try {
    if (!imageAsset) throw new Error("No image selected");

    const fileExt = imageAsset.uri.split(".").pop() || "jpg";
    const fileName = `advert_${Date.now()}.${fileExt}`;
    const filePath = `advertisements/${fileName}`;

    console.log("[Advertisement Upload] Starting upload for:", fileName);
    console.log("[Advertisement Upload] Asset URI:", imageAsset.uri);

    // For React Native, we need to use FormData with the file object
    const formDataUpload = new FormData();
    formDataUpload.append("file", {
      uri: imageAsset.uri,
      type: "image/jpeg",
      name: fileName,
    });

    // Upload to Supabase storage using FormData (same as meals/vendors)
    console.log(
      "[Advertisement Upload] Uploading to Supabase:",
      filePath,
      "using FormData",
    );
    const { data, error: uploadError } = await supabase.storage
      .from("chawp")
      .upload(filePath, formDataUpload, {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      console.error(
        "[Advertisement Upload] Upload failed:",
        uploadError.message,
      );
      throw uploadError;
    }

    console.log("[Advertisement Upload] Upload successful, path:", data.path);

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("chawp").getPublicUrl(filePath);

    console.log("[Advertisement Upload] Public URL generated:", publicUrl);
    return publicUrl;
  } catch (error) {
    console.error("Error uploading advertisement image:", error);
    throw error;
  }
}

// ========================================
// PERFORMANCE METRICS
// ========================================

export async function getOrderCompletionRate() {
  try {
    const { data: allOrders } = await supabase
      .from("chawp_orders")
      .select("status");

    const total = allOrders?.length || 0;
    const delivered =
      allOrders?.filter((o) => o.status === "delivered").length || 0;
    const cancelled =
      allOrders?.filter((o) => o.status === "cancelled").length || 0;

    return {
      success: true,
      completionRate: total > 0 ? ((delivered / total) * 100).toFixed(1) : 0,
      cancellationRate: total > 0 ? ((cancelled / total) * 100).toFixed(1) : 0,
      deliveredCount: delivered,
      cancelledCount: cancelled,
      totalOrders: total,
    };
  } catch (error) {
    console.error("Error fetching order completion rate:", error);
    return { success: false, error };
  }
}

export async function getDeliveryTimePerformance() {
  try {
    const { data: deliveredOrders } = await supabase
      .from("chawp_orders")
      .select("created_at, updated_at, status")
      .eq("status", "delivered");

    if (!deliveredOrders || deliveredOrders.length === 0) {
      return {
        success: true,
        averageMinutes: 0,
        medianMinutes: 0,
        totalDeliveries: 0,
      };
    }

    const deliveryTimes = deliveredOrders.map((order) => {
      const created = new Date(order.created_at);
      const updated = new Date(order.updated_at);
      return (updated - created) / (1000 * 60); // Convert to minutes
    });

    const sortedTimes = [...deliveryTimes].sort((a, b) => a - b);
    const avgTime =
      deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length;
    const medianTime = sortedTimes[Math.floor(sortedTimes.length / 2)];

    return {
      success: true,
      averageMinutes: Math.round(avgTime),
      medianMinutes: Math.round(medianTime),
      totalDeliveries: deliveredOrders.length,
    };
  } catch (error) {
    console.error("Error fetching delivery time performance:", error);
    return { success: false, error };
  }
}

export async function getOrdersByHour() {
  try {
    const { data: allOrders } = await supabase
      .from("chawp_orders")
      .select("created_at");

    const hourCounts = {};
    for (let i = 0; i < 24; i++) {
      hourCounts[i] = 0;
    }

    allOrders?.forEach((order) => {
      const hour = new Date(order.created_at).getHours();
      hourCounts[hour]++;
    });

    const chartData = Object.entries(hourCounts).map(([hour, count]) => ({
      label: `${hour.toString().padStart(2, "0")}:00`,
      value: count,
    }));

    return { success: true, data: chartData };
  } catch (error) {
    console.error("Error fetching orders by hour:", error);
    return { success: false, error };
  }
}

export async function getTopMealCategories() {
  try {
    const { data: orderItems } = await supabase
      .from("chawp_order_items")
      .select(`chawp_meals(category)`);

    const categoryCounts = {};
    orderItems?.forEach((item) => {
      const category = item.chawp_meals?.category || "Uncategorized";
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });

    const chartData = Object.entries(categoryCounts)
      .map(([category, count]) => ({
        label: category,
        value: count,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    return { success: true, data: chartData };
  } catch (error) {
    console.error("Error fetching top meal categories:", error);
    return { success: false, error };
  }
}

export async function getVendorPerformance() {
  try {
    const { data: vendors } = await supabase.from("chawp_vendors").select(`
        id,
        name,
        rating,
        chawp_orders(
          id,
          status
        )
      `);

    const vendorStats = vendors
      ?.map((vendor) => ({
        id: vendor.id,
        name: vendor.name,
        rating: parseFloat(vendor.rating || 0).toFixed(1),
        totalOrders: vendor.chawp_orders?.length || 0,
        completedOrders:
          vendor.chawp_orders?.filter((o) => o.status === "delivered").length ||
          0,
        completionRate:
          vendor.chawp_orders?.length > 0
            ? (
                (vendor.chawp_orders.filter((o) => o.status === "delivered")
                  .length /
                  vendor.chawp_orders.length) *
                100
              ).toFixed(1)
            : 0,
      }))
      .sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));

    return { success: true, data: vendorStats || [] };
  } catch (error) {
    console.error("Error fetching vendor performance:", error);
    return { success: false, error };
  }
}

// ========================================
// USER & GROWTH ANALYTICS
// ========================================

export async function getNewUsersTrend(period = "day") {
  try {
    const now = new Date();
    let dateFormat = (date) => new Date(date).toISOString().split("T")[0]; // YYYY-MM-DD for day

    if (period === "week") {
      // Group by week
      dateFormat = (date) => {
        const d = new Date(date);
        const week = Math.ceil((d.getDate() - d.getDay() + 1) / 7);
        return `Week ${week}`;
      };
    } else if (period === "month") {
      // Group by month
      dateFormat = (date) =>
        new Date(date).toLocaleDateString("en-US", { month: "short" });
    }

    const { data: users } = await supabase
      .from("chawp_user_profiles")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1000);

    const groupedUsers = {};
    users?.forEach((user) => {
      const dateKey = dateFormat(user.created_at);
      groupedUsers[dateKey] = (groupedUsers[dateKey] || 0) + 1;
    });

    const chartData = Object.entries(groupedUsers)
      .map(([label, value]) => ({
        label,
        value,
      }))
      .reverse()
      .slice(-30);

    return { success: true, data: chartData };
  } catch (error) {
    console.error("Error fetching new users trend:", error);
    return { success: false, error };
  }
}

export async function getUserRetentionRate() {
  try {
    const { data: users } = await supabase
      .from("chawp_user_profiles")
      .select("id");

    const totalUsers = users?.length || 0;

    const { data: userOrders } = await supabase
      .from("chawp_orders")
      .select("user_id");

    const userOrderCounts = {};
    userOrders?.forEach((order) => {
      userOrderCounts[order.user_id] =
        (userOrderCounts[order.user_id] || 0) + 1;
    });

    const repeatUsers = Object.values(userOrderCounts).filter(
      (count) => count > 1,
    ).length;

    return {
      success: true,
      retentionRate:
        totalUsers > 0 ? ((repeatUsers / totalUsers) * 100).toFixed(1) : 0,
      repeatCustomers: repeatUsers,
      totalUsers,
    };
  } catch (error) {
    console.error("Error fetching user retention rate:", error);
    return { success: false, error };
  }
}

export async function getCustomerLifetimeValue() {
  try {
    const { data: users } = await supabase
      .from("chawp_user_profiles")
      .select("id");

    const { data: orders } = await supabase
      .from("chawp_orders")
      .select("user_id, total_amount");

    const userSpending = {};
    orders?.forEach((order) => {
      userSpending[order.user_id] =
        (userSpending[order.user_id] || 0) +
        parseFloat(order.total_amount || 0);
    });

    const values = Object.values(userSpending);
    const avgCLV =
      values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    const medianCLV =
      values.length > 0
        ? values.sort((a, b) => a - b)[Math.floor(values.length / 2)]
        : 0;

    return {
      success: true,
      averageCLV: avgCLV.toFixed(2),
      medianCLV: medianCLV.toFixed(2),
      totalCustomers: Object.keys(userSpending).length,
    };
  } catch (error) {
    console.error("Error fetching customer lifetime value:", error);
    return { success: false, error };
  }
}

// ========================================
// BUSINESS HEALTH
// ========================================

export async function getTopMeals(limit = 5) {
  try {
    const { data: orderItems } = await supabase.from("chawp_order_items")
      .select(`
        meal_id,
        chawp_meals(
          id,
          name,
          price,
          image_url
        )
      `);

    const mealCounts = {};
    orderItems?.forEach((item) => {
      const mealId = item.meal_id;
      if (!mealCounts[mealId]) {
        mealCounts[mealId] = {
          id: item.chawp_meals?.id,
          name: item.chawp_meals?.name,
          price: item.chawp_meals?.price,
          image_url: item.chawp_meals?.image_url,
          orders: 0,
        };
      }
      mealCounts[mealId].orders++;
    });

    const topMeals = Object.values(mealCounts)
      .sort((a, b) => b.orders - a.orders)
      .slice(0, limit);

    return { success: true, data: topMeals };
  } catch (error) {
    console.error("Error fetching top meals:", error);
    return { success: false, error };
  }
}

export async function getVendorJoinTrend(period = "day") {
  try {
    const dateFormat =
      period === "week"
        ? (date) => {
            const d = new Date(date);
            const week = Math.ceil((d.getDate() - d.getDay() + 1) / 7);
            return `Week ${week}`;
          }
        : period === "month"
          ? (date) =>
              new Date(date).toLocaleDateString("en-US", { month: "short" })
          : (date) => new Date(date).toISOString().split("T")[0];

    const { data: vendors } = await supabase
      .from("chawp_vendors")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(500);

    const groupedVendors = {};
    vendors?.forEach((vendor) => {
      const dateKey = dateFormat(vendor.created_at);
      groupedVendors[dateKey] = (groupedVendors[dateKey] || 0) + 1;
    });

    const chartData = Object.entries(groupedVendors)
      .map(([label, value]) => ({
        label,
        value,
      }))
      .reverse()
      .slice(-30);

    return { success: true, data: chartData };
  } catch (error) {
    console.error("Error fetching vendor join trend:", error);
    return { success: false, error };
  }
}

export async function getPlatformGrowth(period = "day") {
  try {
    const dateFormat =
      period === "week"
        ? (date) => {
            const d = new Date(date);
            const week = Math.ceil((d.getDate() - d.getDay() + 1) / 7);
            return `Week ${week}`;
          }
        : period === "month"
          ? (date) =>
              new Date(date).toLocaleDateString("en-US", { month: "short" })
          : (date) => new Date(date).toISOString().split("T")[0];

    const [usersResult, vendorsResult, ordersResult] = await Promise.all([
      supabase.from("chawp_user_profiles").select("created_at"),
      supabase.from("chawp_vendors").select("created_at"),
      supabase.from("chawp_orders").select("created_at"),
    ]);

    const users = usersResult.data || [];
    const vendors = vendorsResult.data || [];
    const orders = ordersResult.data || [];

    const groupedData = {};

    users.forEach((u) => {
      const key = dateFormat(u.created_at);
      if (!groupedData[key])
        groupedData[key] = { users: 0, vendors: 0, orders: 0 };
      groupedData[key].users++;
    });

    vendors.forEach((v) => {
      const key = dateFormat(v.created_at);
      if (!groupedData[key])
        groupedData[key] = { users: 0, vendors: 0, orders: 0 };
      groupedData[key].vendors++;
    });

    orders.forEach((o) => {
      const key = dateFormat(o.created_at);
      if (!groupedData[key])
        groupedData[key] = { users: 0, vendors: 0, orders: 0 };
      groupedData[key].orders++;
    });

    return { success: true, data: groupedData };
  } catch (error) {
    console.error("Error fetching platform growth:", error);
    return { success: false, error };
  }
}

export async function getCustomerSatisfactionTrend() {
  try {
    const { data: orders } = await supabase
      .from("chawp_orders")
      .select("rating, created_at")
      .not("rating", "is", null)
      .order("created_at", { ascending: false })
      .limit(500);

    const dailyRatings = {};
    orders?.forEach((order) => {
      const date = order.created_at.split("T")[0];
      if (!dailyRatings[date]) dailyRatings[date] = [];
      dailyRatings[date].push(parseFloat(order.rating));
    });

    const chartData = Object.entries(dailyRatings)
      .map(([date, ratings]) => ({
        label: date,
        value: (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1),
      }))
      .reverse()
      .slice(-30);

    return { success: true, data: chartData };
  } catch (error) {
    console.error("Error fetching customer satisfaction:", error);
    return { success: false, error };
  }
}

export async function getStockIssues() {
  try {
    const { data: meals } = await supabase
      .from("chawp_meals")
      .select("id, name, available")
      .eq("available", false);

    return {
      success: true,
      outOfStockCount: meals?.length || 0,
      meals: meals || [],
    };
  } catch (error) {
    console.error("Error fetching stock issues:", error);
    return { success: false, error };
  }
}

// ========================================
// APP SETTINGS
// ========================================

export async function fetchAppSettings() {
  try {
    const { data, error } = await supabase
      .from("chawp_app_settings")
      .select("service_fee, delivery_fee")
      .single();

    if (error) throw error;

    return {
      serviceFee: parseFloat(data.service_fee) || 6,
      deliveryFee: parseFloat(data.delivery_fee) || 5,
    };
  } catch (error) {
    console.error("Error fetching app settings:", error);
    // Return defaults if fetch fails
    return {
      serviceFee: 6,
      deliveryFee: 5,
    };
  }
}

export async function updateAppSettings(serviceFee, deliveryFee) {
  try {
    const parsedServiceFee = parseFloat(serviceFee);
    const parsedDeliveryFee = parseFloat(deliveryFee);

    // First, check if the row exists using maybeSingle to avoid error on no rows
    const { data: existingData, error: checkError } = await supabase
      .from("chawp_app_settings")
      .select("id")
      .eq("id", 1)
      .maybeSingle();

    if (checkError) throw checkError;

    if (!existingData) {
      // Row doesn't exist, insert it
      const { error } = await supabase.from("chawp_app_settings").insert({
        id: 1,
        service_fee: parsedServiceFee,
        delivery_fee: parsedDeliveryFee,
      });

      if (error) throw error;
    } else {
      // Row exists, update it
      const { error } = await supabase
        .from("chawp_app_settings")
        .update({
          service_fee: parsedServiceFee,
          delivery_fee: parsedDeliveryFee,
          updated_at: new Date().toISOString(),
        })
        .eq("id", 1);

      if (error) throw error;
    }

    // Return the values we set (we know they were saved since there was no error)
    return {
      success: true,
      serviceFee: parsedServiceFee,
      deliveryFee: parsedDeliveryFee,
    };
  } catch (error) {
    console.error("Error updating app settings:", error);
    throw error;
  }
}
