/**
 * Push Notification Service for Chawp Admin App
 * Handles registration, permissions, and notification handling
 */

import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { supabase } from "../config/supabase";

// Configure how notifications are displayed when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(userId) {
  let token = null;

  console.log(
    "[Admin Notifications] Starting registration. Platform:",
    Platform.OS,
    "Device:",
    Device.isDevice,
  );

  if (Platform.OS === "android") {
    console.log(
      "[Admin Notifications] Creating Android notification channels...",
    );
    await Notifications.setNotificationChannelAsync("admin-alerts", {
      name: "Admin Alerts",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF0000",
      sound: "default",
    });

    await Notifications.setNotificationChannelAsync("system-alerts", {
      name: "System Alerts",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 500],
      lightColor: "#FF0000",
    });
    console.log("[Admin Notifications] Notification channels created");
  }

  if (Device.isDevice || Platform.OS === "web") {
    console.log("[Admin Notifications] Checking permissions...");
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    console.log(
      "[Admin Notifications] Existing permission status:",
      existingStatus,
    );
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      console.log("[Admin Notifications] Requesting permissions...");
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      console.log("[Admin Notifications] Permission request result:", status);
    }

    if (finalStatus !== "granted") {
      console.log(
        "[Admin Notifications] Failed to get push notification permission",
      );
      return null;
    }

    console.log("[Admin Notifications] Permission granted, getting token...");
    try {
      // Get FCM token (works for standalone apps)
      token = (await Notifications.getDevicePushTokenAsync()).data;
      console.log(
        "[Admin Notifications] FCM Push Token received:",
        token ? token.substring(0, 50) + "..." : "NULL",
      );

      // Save token to database
      if (userId && token) {
        console.log("[Admin Notifications] Saving token for user:", userId);
        const saveResult = await savePushToken(token, userId);
        console.log(
          "[Admin Notifications] Token save result:",
          saveResult ? "SUCCESS" : "FAILED",
        );
      } else {
        console.log(
          "[Admin Notifications] Missing userId or token. UserId:",
          userId,
          "Token:",
          token ? "EXISTS" : "NULL",
        );
      }
    } catch (error) {
      console.error("[Admin Notifications] Error getting push token:", error);
    }
  } else {
    console.log("[Admin Notifications] Not a physical device, skipping");
  }

  return token;
}

export async function savePushToken(token, userId) {
  if (!token || !userId) {
    console.log(
      "[Admin Notifications] Missing token or userId for saving. Token:",
      token ? "EXISTS" : "NULL",
      "UserId:",
      userId,
    );
    return;
  }

  try {
    console.log(
      "[Admin Notifications] Saving admin push token for user:",
      userId,
    );
    console.log(
      "[Admin Notifications] Token preview:",
      token.substring(0, 50) + "...",
    );

    // Test database connection first
    console.log("[Admin Notifications] Testing database connection...");
    const { data: testUser, error: testError } = await supabase
      .from("chawp_user_profiles")
      .select("id, role")
      .eq("id", userId)
      .single();

    if (testError) {
      console.error(
        "[Admin Notifications] ❌ Database connection test failed:",
        testError,
      );
    } else {
      console.log(
        "[Admin Notifications] ✅ Database connection OK. User role:",
        testUser?.role,
      );
    }

    // Get device info
    const deviceInfo = {
      brand: Device.brand || "unknown",
      model: Device.modelName || "unknown",
      os: Device.osName || "unknown",
      osVersion: Device.osVersion || "unknown",
    };
    console.log("[Admin Notifications] Device info:", deviceInfo);

    // Save to device_tokens table with device_type='admin'
    console.log(
      "[Admin Notifications] Attempting to save to chawp_device_tokens...",
    );
    const { error: deviceTokenError } = await supabase
      .from("chawp_device_tokens")
      .upsert(
        {
          user_id: userId,
          push_token: token,
          device_type: "admin",
          device_info: deviceInfo,
        },
        {
          onConflict: "user_id,device_type,push_token",
        },
      );

    if (deviceTokenError) {
      console.error(
        "[Admin Notifications] ❌ Error saving to device_tokens:",
        deviceTokenError.message,
      );
      console.error(
        "[Admin Notifications] Error details:",
        JSON.stringify(deviceTokenError),
      );
    } else {
      console.log(
        "[Admin Notifications] ✅ Admin push token saved to chawp_device_tokens",
      );
    }

    // Also update user profiles table as backup
    console.log(
      "[Admin Notifications] Attempting to save to chawp_user_profiles...",
    );
    const { error: profileError } = await supabase
      .from("chawp_user_profiles")
      .update({
        push_token: token,
        push_token_updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (profileError) {
      console.error(
        "[Admin Notifications] ❌ Error updating user profile:",
        profileError.message,
      );
      console.error(
        "[Admin Notifications] Error details:",
        JSON.stringify(profileError),
      );
      return false;
    } else {
      console.log(
        "[Admin Notifications] ✅ Admin push token also saved to chawp_user_profiles",
      );
      return true;
    }
  } catch (error) {
    console.error(
      "[Admin Notifications] ❌ Exception in savePushToken:",
      error,
    );
    console.error("[Admin Notifications] Exception stack:", error.stack);
    return false;
  }
}

export function setupNotificationListeners(
  onNotificationReceived,
  onNotificationTapped,
) {
  const notificationListener = Notifications.addNotificationReceivedListener(
    (notification) => {
      console.log("Admin notification received:", notification);
      if (onNotificationReceived) {
        onNotificationReceived(notification);
      }
    },
  );

  const responseListener =
    Notifications.addNotificationResponseReceivedListener((response) => {
      console.log("Admin notification tapped:", response);
      if (onNotificationTapped) {
        onNotificationTapped(response);
      }
    });

  return {
    notificationListener,
    responseListener,
    remove: () => {
      notificationListener.remove();
      responseListener.remove();
    },
  };
}

export async function sendLocalNotification(title, body, data = {}) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
      priority: "high",
    },
    trigger: null,
  });
}
