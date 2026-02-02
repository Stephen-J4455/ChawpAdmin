import React, { useState } from "react";
import { View, StyleSheet, TouchableOpacity, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii } from "../theme";
import VendorsManagementPage from "./VendorsManagementPage";
import MealsManagementPage from "./MealsManagementPage";

const TABS = [
  { id: "vendors", label: "Vendors", icon: "storefront-outline" },
  { id: "meals", label: "Meals", icon: "restaurant-outline" },
];

export default function CatalogPage() {
  const [activeTab, setActiveTab] = useState("vendors");

  const renderTabContent = () => {
    switch (activeTab) {
      case "vendors":
        return <VendorsManagementPage />;
      case "meals":
        return <MealsManagementPage />;
      default:
        return <VendorsManagementPage />;
    }
  };

  return (
    <View style={styles.container}>
      {/* Tab Header */}
      <View style={styles.tabHeader}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tabButton, isActive && styles.tabButtonActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Ionicons
                name={tab.icon}
                size={20}
                color={isActive ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[styles.tabLabel, isActive && styles.tabLabelActive]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Tab Content */}
      <View style={styles.content}>{renderTabContent()}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabHeader: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: "transparent",
  },
  tabButtonActive: {
    backgroundColor: `${colors.primary}15`,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabLabel: {
    marginLeft: spacing.xs,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "500",
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
});
