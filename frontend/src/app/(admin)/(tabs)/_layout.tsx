import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

export default function AdminTabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="AdminDashboardScreen"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ size, color }) => (
            <Ionicons
              name="grid-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="InventoryDashboardScreen"
        options={{
          title: "Inventory",
          tabBarIcon: ({ size, color }) => (
            <Ionicons
              name="cube-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="ProductListScreen"
        options={{
          title: "Products",
          tabBarIcon: ({ size, color }) => (
            <Ionicons
              name="pricetag-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="CustomerListScreen"
        options={{
          title: "Customers",
          tabBarIcon: ({ size, color }) => (
            <Ionicons
              name="people-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}