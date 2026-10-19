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
  Easing,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
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
  onLayout,
}: {
  route: any;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onLayout: (e: LayoutChangeEvent) => void;
}) {
  const Icon = TAB_ICONS[route.name] ?? LayoutDashboard;
  const label = TAB_LABELS[route.name] ?? route.name;

  const pressAnim = useRef(new Animated.Value(1)).current;
  // 0 = inactive, 1 = active — drives icon scale, label opacity/translate, color-ish emphasis
  const focusAnim = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(focusAnim, {
      toValue: isFocused ? 1 : 0,
      useNativeDriver: true,
      friction: 7,
      tension: 90,
    }).start();
  }, [isFocused]);

  const handlePressIn = () => {
    Animated.spring(pressAnim, {
      toValue: 0.88,
      useNativeDriver: true,
      friction: 6,
    }).start();
  };
  const handlePressOut = () => {
    Animated.spring(pressAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 4,
      tension: 140,
    }).start();
  };

  const color = isFocused ? Colors.secondary : "rgba(255,255,255,0.65)";

  const iconTranslateY = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [4, 0],
  });
  const iconScale = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.12],
  });
  const labelOpacity = focusAnim;
  const labelTranslateY = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-4, 0],
  });
  const dotScale = focusAnim;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLayout={onLayout}
      style={styles.tabButton}
    >
      <Animated.View
        style={[styles.content, { transform: [{ scale: pressAnim }] }]}
      >
        <Animated.View
          style={{
            transform: [{ translateY: iconTranslateY }, { scale: iconScale }],
          }}
        >
          <Icon color={color} size={21} strokeWidth={isFocused ? 2.4 : 2} />
        </Animated.View>

        <Animated.Text
          numberOfLines={1}
          style={[
            styles.tabLabel,
            {
              color,
              fontWeight: isFocused ? "700" : "500",
              opacity: labelOpacity,
              transform: [{ translateY: labelTranslateY }],
            },
          ]}
        >
          {label}
        </Animated.Text>

        <Animated.View
          style={[
            styles.activeDot,
            { transform: [{ scale: dotScale }], opacity: dotScale },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const [tabWidths, setTabWidths] = useState<number[]>(
    new Array(state.routes.length).fill(0),
  );
  const [tabX, setTabX] = useState<number[]>(
    new Array(state.routes.length).fill(0),
  );

  const indicatorX = useRef(new Animated.Value(0)).current;
  const indicatorWidth = useRef(new Animated.Value(0)).current;
  const barEntrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(barEntrance, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    const width = tabWidths[state.index];
    const x = tabX[state.index];
    if (!width) return;

    Animated.parallel([
      Animated.spring(indicatorX, {
        toValue: x,
        useNativeDriver: false,
        friction: 8,
        tension: 90,
      }),
      Animated.spring(indicatorWidth, {
        toValue: width,
        useNativeDriver: false,
        friction: 8,
        tension: 90,
      }),
    ]).start();
  }, [state.index, tabWidths, tabX]);

  const handleTabLayout = (index: number) => (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    setTabWidths((prev) => {
      const next = [...prev];
      next[index] = width;
      return next;
    });
    setTabX((prev) => {
      const next = [...prev];
      next[index] = x;
      return next;
    });
  };

  return (
    <View
      style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 12) }]}
      pointerEvents="box-none"
    >
      <Animated.View
        style={[
          styles.container,
          {
            opacity: barEntrance,
            transform: [
              {
                translateY: barEntrance.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                }),
              },
            ],
          },
        ]}
      >
        {/* Sliding pill indicator behind the focused tab */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.indicator,
            {
              width: indicatorWidth,
              transform: [{ translateX: indicatorX }],
            },
          ]}
        />

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
              onLayout={handleTabLayout(index)}
            />
          );
        })}
      </Animated.View>
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
    backgroundColor: Colors.p,
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    marginHorizontal: 20,
    height: 66,
    borderRadius: 24,
    overflow: "hidden",
    // subtle floating shadow so the bar lifts off the screen
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 10,
  },
  indicator: {
    position: "absolute",
    top: 8,
    bottom: 8,
    left: 0,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.14)",
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
  activeDot: {
    position: "absolute",
    bottom: -6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.secondary,
  },
});
