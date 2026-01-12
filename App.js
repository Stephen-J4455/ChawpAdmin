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
import VendorsManagementPage from "./src/pages/VendorsManagementPage";
import MealsManagementPage from "./src/pages/MealsManagementPage";
import OrdersManagementPage from "./src/pages/OrdersManagementPage";
import UsersManagementPage from "./src/pages/UsersManagementPage";
import DeliveryManagementPage from "./src/pages/DeliveryManagementPage";

const topInset =
  Platform.OS === "android"
    ? (NativeStatusBar.currentHeight || 0) + spacing.md
    : spacing.xl;

const bottomNavItems = [
  { id: "dashboard", label: "Dashboard", icon: "grid-outline" },
  { id: "vendors", label: "Vendors", icon: "storefront-outline" },
  { id: "meals", label: "Meals", icon: "restaurant-outline" },
  { id: "orders", label: "Orders", icon: "receipt-outline" },
  { id: "delivery", label: "Delivery", icon: "bicycle-outline" },
  { id: "users", label: "Users", icon: "people-outline" },
];

function AppContent() {
  const { user, signIn, signOut } = useAdminAuth();
  const { showConfirm } = useNotification();
  const [selectedNav, setSelectedNav] = useState("dashboard");

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

  if (!user) {
    return <AdminAuthScreen onSignIn={handleSignIn} />;
  }

  const renderPage = () => {
    switch (selectedNav) {
      case "dashboard":
        return <DashboardPage />;
      case "vendors":
        return <VendorsManagementPage />;
      case "meals":
        return <MealsManagementPage />;
      case "orders":
        return <OrdersManagementPage />;
      case "delivery":
        return <DeliveryManagementPage />;
      case "users":
        return <UsersManagementPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ExpoStatusBar style="light" />

      {/* Header */}
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        style={[styles.header, { paddingTop: topInset }]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>CHAWP ADMIN</Text>
            <Text style={styles.headerSubtitle}>
              {bottomNavItems.find((item) => item.id === selectedNav)?.label ||
                "Dashboard"}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={18} color={colors.card} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
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
              onPress={() => setSelectedNav(item.id)}>
              <View
                style={[
                  styles.navIconContainer,
                  isActive && styles.navIconContainerActive,
                ]}>
                <Ionicons
                  name={item.icon}
                  size={24}
                  color={isActive ? colors.primary : colors.textSecondary}
                />
              </View>
              <Text
                style={[styles.navLabel, isActive && styles.navLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
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
          }}>
          <ExpoStatusBar style="light" />
          <Text style={{ fontSize: 48, marginBottom: 20 }}>⚠️</Text>
          <Text
            style={{
              fontSize: 24,
              color: "#FFFFFF",
              fontWeight: "bold",
              marginBottom: 10,
            }}>
            App Error
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: "#6C7796",
              textAlign: "center",
              marginBottom: 20,
            }}>
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
            }}>
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
        }}>
        <ExpoStatusBar style="light" />
        <Text style={{ fontSize: 48, marginBottom: 20 }}>⚠️</Text>
        <Text
          style={{
            fontSize: 24,
            color: "#FFFFFF",
            fontWeight: "bold",
            marginBottom: 10,
          }}>
          Initialization Error
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: "#6C7796",
            textAlign: "center",
            marginBottom: 20,
          }}>
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
          }}>
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
        }}>
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
});
