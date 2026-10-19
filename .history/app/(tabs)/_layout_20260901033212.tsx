import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Tabs } from "expo-router";
import {
  ChartNoAxesCombined,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";

// ---- Icon & label tetap sama seperti kode asli ----
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

const CIRCLE_SIZE = 56;

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

  const focusAnim = useRef(new Animated.Value(isFocused ? 1 : 0)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(focusAnim, {
      toValue: isFocused ? 1 : 0,
      useNativeDriver: true,
      friction: 6,
      tension: 80,
    }).start();
  }, [isFocused, focusAnim]);

  const handlePressIn = () => {
    Animated.spring(pressAnim, {
      toValue: 0.85,
      useNativeDriver: true,
      friction: 5,
    }).start();
  };
  const handlePressOut = () => {
    Animated.spring(pressAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 4,
      tension: 120,
    }).start();
  };

  const color = isFocused ? Colors.primary : Colors.neutral;

  // icon asli disembunyikan pelan-pelan saat tab jadi aktif,
  // karena "pindah" ke lingkaran hijau yang mengambang di atas
  const iconOpacity = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  const labelShift = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 4],
  });

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.tabButton}
    >
      <Animated.View
        style={{ opacity: iconOpacity, transform: [{ scale: pressAnim }] }}
      >
        <Icon color={color} size={22} />
      </Animated.View>
      <Animated.Text
        style={[
          styles.tabLabel,
          { color, transform: [{ translateY: labelShift }] },
        ]}
      >
        {label}
      </Animated.Text>
    </Pressable>
  );
}

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [barWidth, setBarWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const bump = useRef(new Animated.Value(1)).current;

  const routeCount = state.routes.length;
  const tabWidth = barWidth / routeCount;

  useEffect(() => {
    if (!barWidth) return;
    const target = state.index * tabWidth + tabWidth / 2 - CIRCLE_SIZE / 2;

    // lingkaran hijau meluncur ke posisi tab yang aktif
    Animated.spring(translateX, {
      toValue: target,
      useNativeDriver: true,
      friction: 8,
      tension: 70,
    }).start();

    // efek "loncat" kecil tiap kali pindah tab
    bump.setValue(0.85);
    Animated.spring(bump, {
      toValue: 1,
      useNativeDriver: true,
      friction: 5,
      tension: 140,
    }).start();
  }, [state.index, barWidth, tabWidth, translateX, bump]);

  const onLayout = (e: LayoutChangeEvent) =>
    setBarWidth(e.nativeEvent.layout.width);

  const ActiveIcon =
    TAB_ICONS[state.routes[state.index].name] ?? LayoutDashboard;

  return (
    <View
      style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 12) }]}
      pointerEvents="box-none"
    >
      <View style={styles.container} onLayout={onLayout}>
        {barWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.circle,
              { transform: [{ translateX }, { scale: bump }] },
            ]}
          >
            <ActiveIcon color="#FFFFFF" size={24} />
          </Animated.View>
        )}

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
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    backgroundColor: "transparent",
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    height: 64,
    borderRadius: 32,
    paddingHorizontal: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },
  circle: {
    position: "absolute",
    top: -28,
    left: 0,
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 10,
  },
});
