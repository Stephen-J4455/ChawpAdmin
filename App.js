import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import React, { useState, useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { colors, spacing } from "./src/theme";
import {
  AdminAuthProvider,
  useAdminAuth,
} from "./src/contexts/AdminAuthContext";
import {
  NotificationProvider,
  useNotification,
} from "./src/contexts/NotificationContext";
import AdminAuthScreen from "./src/components/AdminAuthScreen";
import ChawpLoading from "./src/components/ChawpLoading";
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

const bottomNavItems = [
  { id: "dashboard", label: "Dashboard", icon: "grid-outline" },
  { id: "catalog", label: "Catalog", icon: "albums-outline" },
  { id: "logistics", label: "Logistics", icon: "cube-outline" },
  { id: "users", label: "Users", icon: "people-outline" },
  { id: "activity", label: "Activity", icon: "layers-outline" },
];

function AppContent() {
  const insets = useSafeAreaInsets();
  const { user, userProfile, signIn, signOut, loading } = useAdminAuth();
  const { showConfirm, showSuccess } = useNotification();
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
      <>
        <ExpoStatusBar style="light" />
        <ChawpLoading />
      </>
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
            <DashboardPage
              onSignOut={handleSignOut}
              onOpenLogs={() => setShowDebugLogger(true)}
              canShowLogs={userProfile?.role === "super_admin"}
            />
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
      <View style={styles.container}>
        <ExpoStatusBar
          style="light"
          translucent
          backgroundColor="transparent"
        />

        {/* Page Content */}
        <View style={styles.content}>{renderPage()}</View>

        {/* Floating Bottom Navigation */}
        <View
          style={[
            styles.floatingNavContainer,
            { bottom: Math.max(insets.bottom, 10) + 12 },
          ]}
        >
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
                      name={
                        isActive ? item.icon.replace("-outline", "") : item.icon
                      }
                      size={20}
                      color={isActive ? colors.white : colors.textSecondary}
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
        </View>
      </View>

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
        <View
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
        </View>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <AdminAuthProvider>
          <NotificationProvider>
            <AppContent />
          </NotificationProvider>
        </AdminAuthProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  floatingNavContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  bottomNav: {
    flexDirection: "row",
    backgroundColor: "rgba(15, 21, 36, 0.95)",
    borderRadius: 25,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.44,
    shadowRadius: 10.32,
    elevation: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    width: "92%",
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    borderRadius: spacing.lg,
    flex: 1,
  },
  navIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  navIconContainerActive: {
    backgroundColor: colors.primary,
  },
  navIcon: {
    fontSize: 22,
  },
  navLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: "500",
  },
  navLabelActive: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: "700",
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
