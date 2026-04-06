import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  StatusBar as NativeStatusBar,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { colors, spacing, radii } from "./src/theme";
import {
  AdminAuthProvider,
  useAdminAuth,
} from "./src/contexts/AdminAuthContext";
import {
  NotificationProvider,
  useNotification,
} from "./src/contexts/NotificationContext";
import AdminAuthScreen from "./src/components/AdminAuthScreen";
import DashboardPage from "./src/pages/DashboardPage";
import CatalogPage from "./src/pages/CatalogPage";
import LogisticsPage from "./src/pages/LogisticsPage";
import PeoplePage from "./src/pages/PeoplePage";
import ActivityPage from "./src/pages/ActivityPage";
import DebugLogger from "./src/components/DebugLogger";
import {
  registerForPushNotifications,
  setupNotificationListeners,
} from "./src/services/notifications";

const topInset =
  Platform.OS === "android"
    ? (NativeStatusBar.currentHeight || 0) + spacing.md
    : spacing.xl;

const bottomNavItems = [
  { id: "dashboard", label: "Dashboard", icon: "grid-outline" },
  { id: "catalog", label: "Catalog", icon: "albums-outline" },
  { id: "logistics", label: "Logistics", icon: "cube-outline" },
  { id: "users", label: "Users", icon: "people-outline" },
  { id: "activity", label: "Activity", icon: "layers-outline" },
];

function AppContent() {
  const { user, userProfile, signIn, signOut, loading } = useAdminAuth();
  const { showConfirm, showSuccess, showError } = useNotification();
  const [selectedNav, setSelectedNav] = useState("dashboard");
  const [mountedPages, setMountedPages] = useState(new Set(["dashboard"]));
  const [showDebugLogger, setShowDebugLogger] = useState(false);

  // Register for push notifications when user logs in
  useEffect(() => {
    if (user) {
      console.log(
        "[ChawpAdmin] User logged in, registering for notifications...",
      );
      registerForPushNotifications(user.id)
        .then((token) => {
          if (token) {
            console.log(
              "[ChawpAdmin] Successfully registered for notifications",
            );
          } else {
            console.log("[ChawpAdmin] Failed to get notification token");
          }
        })
        .catch((error) => {
          console.error(
            "[ChawpAdmin] Error registering for notifications:",
            error,
          );
        });

      // Setup notification listeners
      const listeners = setupNotificationListeners(
        (notification) => {
          // Handle notification received while app is in foreground
          console.log("[ChawpAdmin] Notification received:", notification);
          const { title, body } = notification.request.content;
          showSuccess(title || "New Notification", body || "");
        },
        (response) => {
          // Handle notification tapped
          console.log("[ChawpAdmin] Notification tapped:", response);
        },
      );

      return () => {
        listeners.remove();
      };
    }
  }, [user]);

  const handleNavigation = (pageId) => {
    setSelectedNav(pageId);
    setMountedPages((prev) => new Set([...prev, pageId]));
  };

  const handleSignIn = async (email, password) => {
    const result = await signIn(email, password);
    return result;
  };

  const handleSignOut = () => {
    showConfirm({
      type: "warning",
      title: "Sign Out",
      message: "Are you sure you want to sign out?",
      confirmText: "Sign Out",
      cancelText: "Cancel",
      confirmStyle: "destructive",
      onConfirm: async () => {
        await signOut();
      },
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ExpoStatusBar style="light" />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <>
        <ExpoStatusBar style="light" />
        <AdminAuthScreen onSignIn={handleSignIn} />
      </>
    );
  }

  const renderPage = () => {
    return (
      <>
        {mountedPages.has("dashboard") && (
          <View
            style={
              selectedNav === "dashboard"
                ? styles.pageVisible
                : styles.pageHidden
            }
          >
            <DashboardPage />
          </View>
        )}
        {mountedPages.has("catalog") && (
          <View
            style={
              selectedNav === "catalog" ? styles.pageVisible : styles.pageHidden
            }
          >
            <CatalogPage />
          </View>
        )}
        {mountedPages.has("logistics") && (
          <View
            style={
              selectedNav === "logistics"
                ? styles.pageVisible
                : styles.pageHidden
            }
          >
            <LogisticsPage />
          </View>
        )}
        {mountedPages.has("users") && (
          <View
            style={
              selectedNav === "users" ? styles.pageVisible : styles.pageHidden
            }
          >
            <PeoplePage />
          </View>
        )}
        {mountedPages.has("activity") && (
          <View
            style={
              selectedNav === "activity"
                ? styles.pageVisible
                : styles.pageHidden
            }
          >
            <ActivityPage />
          </View>
        )}
      </>
    );
  };

  return (
    <>
      <SafeAreaView style={styles.container}>
        <ExpoStatusBar style="light" />

        {/* Header */}
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={[styles.header, { paddingTop: topInset }]}
        >
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerTitle}>CHAWP ADMIN</Text>
              <Text style={styles.headerSubtitle}>
                {bottomNavItems.find((item) => item.id === selectedNav)
                  ?.label || "Dashboard"}
              </Text>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {userProfile?.role === "super_admin" && (
                <TouchableOpacity
                  style={styles.debugButton}
                  onPress={() => setShowDebugLogger(true)}
                >
                  <Ionicons name="bug-outline" size={18} color={colors.card} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.signOutButton}
                onPress={handleSignOut}
              >
                <Ionicons
                  name="log-out-outline"
                  size={18}
                  color={colors.card}
                />
                <Text style={styles.signOutText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        {/* Page Content */}
        <View style={styles.content}>{renderPage()}</View>

        {/* Bottom Navigation */}
        <View style={styles.bottomNav}>
          {bottomNavItems.map((item) => {
            const isActive = selectedNav === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.navItem}
                onPress={() => handleNavigation(item.id)}
              >
                <View
                  style={[
                    styles.navIconContainer,
                    isActive && styles.navIconContainerActive,
                  ]}
                >
                  <Ionicons
                    name={item.icon}
                    size={24}
                    color={isActive ? colors.primary : colors.textSecondary}
                  />
                </View>
                <Text
                  style={[styles.navLabel, isActive && styles.navLabelActive]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </SafeAreaView>

      {/* Debug Logger - Render outside SafeAreaView for full screen overlay */}
      <DebugLogger
        visible={showDebugLogger}
        onClose={() => setShowDebugLogger(false)}
      />
    </>
  );
}

// Error boundary component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("App crashed:", error, errorInfo);
    this.setState({ errorInfo });

    // Log to console for debugging
    console.error("Error details:", {
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView
          style={{
            flex: 1,
            backgroundColor: "#070B16",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <ExpoStatusBar style="light" />
          <Text style={{ fontSize: 48, marginBottom: 20 }}>⚠️</Text>
          <Text
            style={{
              fontSize: 24,
              color: "#FFFFFF",
              fontWeight: "bold",
              marginBottom: 10,
            }}
          >
            App Error
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: "#6C7796",
              textAlign: "center",
              marginBottom: 20,
            }}
          >
            {this.state.error?.message || "Unknown error occurred"}
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: "#2E6BFF",
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderRadius: 8,
            }}
            onPress={() => {
              this.setState({ hasError: false, error: null, errorInfo: null });
            }}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "600" }}>
              Try Again
            </Text>
          </TouchableOpacity>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const [appReady, setAppReady] = React.useState(false);
  const [appError, setAppError] = React.useState(null);

  React.useEffect(() => {
    // Initialize app with proper error handling
    const initApp = async () => {
      try {
        if (__DEV__) console.log("App initializing...");

        // Small delay to ensure everything is ready
        await new Promise((resolve) => setTimeout(resolve, 100));

        setAppReady(true);
        if (__DEV__) console.log("App ready");
      } catch (error) {
        console.error("App initialization error:", error);
        setAppError(error?.message || "Failed to initialize app");
      }
    };

    initApp();
  }, []);

  if (appError) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: "#070B16",
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}
      >
        <ExpoStatusBar style="light" />
        <Text style={{ fontSize: 48, marginBottom: 20 }}>⚠️</Text>
        <Text
          style={{
            fontSize: 24,
            color: "#FFFFFF",
            fontWeight: "bold",
            marginBottom: 10,
          }}
        >
          Initialization Error
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: "#6C7796",
            textAlign: "center",
            marginBottom: 20,
          }}
        >
          {appError}
        </Text>
        <TouchableOpacity
          style={{
            backgroundColor: "#2E6BFF",
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderRadius: 8,
          }}
          onPress={() => {
            setAppError(null);
            setAppReady(false);
          }}
        >
          <Text style={{ color: "#FFFFFF", fontWeight: "600" }}>Try Again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!appReady) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: "#070B16",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ExpoStatusBar style="light" />
        <ActivityIndicator size="large" color="#2E6BFF" />
        <Text style={{ fontSize: 14, color: "#6C7796", marginTop: 20 }}>
          Loading ChawpAdmin...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <ErrorBoundary>
      <AdminAuthProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </AdminAuthProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingBottom: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: colors.white,
    letterSpacing: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.white,
    opacity: 0.9,
    marginTop: spacing.xs,
    fontWeight: "500",
  },
  debugButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  signOutText: {
    color: colors.white,
    fontWeight: "600",
    fontSize: 13,
  },
  content: {
    flex: 1,
  },
  bottomNav: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: spacing.sm,
    paddingBottom: Platform.OS === "ios" ? spacing.lg : spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  navIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
    backgroundColor: "transparent",
  },
  navIconContainerActive: {
    backgroundColor: colors.primary + "15",
    borderRadius: 24,
  },
  navIcon: {
    fontSize: 22,
  },
  navLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "500",
  },
  navLabelActive: {
    color: colors.primary,
    fontWeight: "600",
  },
  pageVisible: {
    flex: 1,
  },
  pageHidden: {
    flex: 0,
    width: 0,
    height: 0,
    overflow: "hidden",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    fontSize: 14,
  },
});
