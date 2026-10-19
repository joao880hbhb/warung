import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Tabs } from "expo-router";
import {
  ChartNoAxesCombined,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
} from "lucide-react-native";
import React, { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";
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

/* ------------------------------------------------------------------ */
/*  Satu tombol tab: bubble yang "melompat" ke atas saat aktif, ring   */
/*  glow yang berdenyut, dan wobble icon tiap kali ditekan.            */
/* ------------------------------------------------------------------ */

function TabButton({
  route,
  index,
  isFocused,
  onPress,
  onLongPress,
}: {
  route: any;
  index: number;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const Icon = TAB_ICONS[route.name] ?? LayoutDashboard;
  const label = TAB_LABELS[route.name] ?? route.name;

  // 0 -> tidak fokus, 1 -> fokus. Menggerakkan lift, scale, warna, label.
  const focusAnim = useRef(new Animated.Value(isFocused ? 1 : 0)).current;
  // Squish saat ditekan.
  const pressAnim = useRef(new Animated.Value(1)).current;
  // Wobble rotasi kecil tiap tap.
  const wobbleAnim = useRef(new Animated.Value(0)).current;
  // Ring glow yang berdenyut pelan saat tab aktif.
  const glowAnim = useRef(new Animated.Value(0)).current;
  // Entrance stagger saat pertama kali mount.
  const mountAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(mountAnim, {
      toValue: 1,
      delay: index * 70,
      friction: 6,
      tension: 60,
      useNativeDriver: true,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    Animated.spring(focusAnim, {
      toValue: isFocused ? 1 : 0,
      friction: 7,
      tension: 90,
      useNativeDriver: true,
    }).start();
  }, [isFocused, focusAnim]);

  useEffect(() => {
    let loop: Animated.CompositeAnimation | undefined;
    if (isFocused) {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
    } else {
      glowAnim.setValue(0);
    }
    return () => loop?.stop();
  }, [isFocused, glowAnim]);

  const handlePressIn = () => {
    Animated.spring(pressAnim, {
      toValue: 0.85,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressAnim, {
      toValue: 1,
      friction: 4,
      tension: 140,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    wobbleAnim.setValue(0);
    Animated.sequence([
      Animated.timing(wobbleAnim, {
        toValue: 1,
        duration: 90,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(wobbleAnim, {
        toValue: 0,
        friction: 3,
        tension: 200,
        useNativeDriver: true,
      }),
    ]).start();
    onPress();
  };

  const lift = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -26],
  });
  const bubbleScale = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
  });
  const bubbleOpacity = focusAnim;
  const iconScale = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.12],
  });
  const labelOpacity = focusAnim.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [0, 0, 1],
  });
  const labelTranslateY = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [6, 0],
  });
  const iconColor = isFocused ? Colors.primary : "rgba(255,255,255,0.85)";

  const wobbleRotate = wobbleAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ["0deg", "-14deg", "0deg"],
  });

  const glowScale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.55],
  });
  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0],
  });

  const mountTranslateY = mountAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [40, 0],
  });

  return (
    <Animated.View
      style={{
        flex: 1,
        opacity: mountAnim,
        transform: [{ translateY: mountTranslateY }],
      }}
    >
      <Pressable
        onPress={handlePress}
        onLongPress={onLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.tabButton}
      >
        <Animated.View
          style={{
            alignItems: "center",
            justifyContent: "center",
            transform: [{ translateY: lift }, { scale: pressAnim }],
          }}
        >
          {/* Ring glow berdenyut, hanya muncul saat aktif */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.glow,
              {
                opacity: Animated.multiply(bubbleOpacity, glowOpacity),
                transform: [{ scale: glowScale }],
              },
            ]}
          />

          {/* Bubble putih di belakang icon aktif */}
          <Animated.View
            style={[
              styles.bubble,
              {
                opacity: bubbleOpacity,
                transform: [{ scale: bubbleScale }],
              },
            ]}
          />

          <Animated.View
            style={{
              transform: [
                { scale: Animated.multiply(iconScale, 1) },
                { rotate: wobbleRotate },
              ],
            }}
          >
            <Icon
              color={iconColor}
              size={21}
              strokeWidth={isFocused ? 2.4 : 2}
            />
          </Animated.View>
        </Animated.View>

        <Animated.Text
          numberOfLines={1}
          style={[
            styles.tabLabel,
            {
              opacity: labelOpacity,
              transform: [{ translateY: labelTranslateY }],
              color: Colors.white,
            },
          ]}
        >
          {label}
        </Animated.Text>
      </Pressable>
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ */
/*  Container bar: entrance slide-up + fade saat pertama kali render. */
/* ------------------------------------------------------------------ */

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const barAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(barAnim, {
      toValue: 1,
      friction: 8,
      tension: 50,
      useNativeDriver: true,
    }).start();
  }, [barAnim]);

  const barTranslateY = barAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [90, 0],
  });

  return (
    <View
      style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 12) }]}
      pointerEvents="box-none"
    >
      <Animated.View
        style={[
          styles.container,
          {
            opacity: barAnim,
            transform: [{ translateY: barTranslateY }],
          },
        ]}
      >
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
              index={index}
              isFocused={isFocused}
              onPress={onPress}
              onLongPress={onLongPress}
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
    backgroundColor: "transparent",
  },
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: Colors.primary,
    marginHorizontal: 20,
    height: 66,
    borderRadius: 26,
    paddingBottom: 10,
    // shadow biar bar terasa "mengambang"
    // shadowColor: "#000",
    // shadowOffset: { width: 0, height: 10 },
    // shadowOpacity: 0.25,
    // shadowRadius: 16,
    elevation: 12,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
  },
  bubble: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    // bayangan tipis di bawah bubble supaya kesannya benar-benar terangkat
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  glow: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "600",
  },
});
