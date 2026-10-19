import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Tabs } from "expo-router";
import {
  ChartNoAxesCombined,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
} from "lucide-react-native";
import React, { useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";

const TAB_ICONS: Record<string, any> = {
  index: LayoutDashboard,
  produk: Package,
  kasir: ShoppingCart,
  laporan: ChartNoAxesCombined,
  setting: Settings,
};

const TAB_LABELS: Record<string, string> = {
  index: "Dashboard",
  produk: "Produk",
  kasir: "Kasir",
  laporan: "Laporan",
  setting: "Setting",
};

function TabButton({
  route,
  isFocused,
  onPress,
  onLongPress,
}: {
  route: any;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const Icon = TAB_ICONS[route.name] ?? LayoutDashboard;
  const label = TAB_LABELS[route.name] ?? route.name;

  const pressAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(pressAnim, {
      toValue: 0.92,
      useNativeDriver: true,
      friction: 6,
    }).start();
  };
  const handlePressOut = () => {
    Animated.spring(pressAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 5,
    }).start();
  };

  const color = isFocused ? Colors.terang : Colors.white;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.tabButton}
    >
      <Animated.View
        style={[styles.content, { transform: [{ scale: pressAnim }] }]}
      >
        <Icon color={color} size={20} />
        <Animated.Text
          style={[
            styles.tabLabel,
            { color, fontWeight: isFocused ? "700" : "500" },
          ]}
        >
          {label}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 12) }]}
      pointerEvents="box-none"
    >
      <View style={styles.container}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({ type: "tabLongPress", target: route.key });
          };

          return (
            <TabButton
              key={route.key}
              route={route}
              isFocused={isFocused}
              onPress={onPress}
              onLongPress={onLongPress}
            />
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: "Dashboard" }} />
      <Tabs.Screen name="produk" options={{ title: "Produk" }} />
      <Tabs.Screen name="kasir" options={{ title: "Kasir" }} />
      <Tabs.Screen name="laporan" options={{ title: "Laporan" }} />
      <Tabs.Screen name="setting" options={{ title: "Setting" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    backgroundColor: "#FDD035",
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FDD035",
    marginHorizontal: 20,
    height: 64,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  tabLabel: {
    fontSize: 10,
  },
});
