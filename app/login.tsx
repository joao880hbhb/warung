import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, Delete, Eye, EyeOff, Shield, User } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";
import { useAuthStore } from "@/lib/auth-store";
import {
  getUserById,
  initDatabase,
  verifyUserPin,
  type UserRole,
} from "@/lib/database";

// ---------------------------------------------------------------------------
// PIN Keypad
// ---------------------------------------------------------------------------

const KEYS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["", "0", "del"],
];

function PinKeypad({
  onPress,
  onDelete,
}: {
  onPress: (key: string) => void;
  onDelete: () => void;
}) {
  return (
    <View style={keypadStyles.grid}>
      {KEYS.map((row, ri) => (
        <View key={ri} style={keypadStyles.row}>
          {row.map((key) => {
            if (key === "")
              return <View key={key + ri} style={keypadStyles.cell} />;
            if (key === "del") {
              return (
                <Pressable
                  key={key}
                  style={keypadStyles.cell}
                  onPress={onDelete}
                  hitSlop={8}
                >
                  <Delete color={Colors.neutral} size={22} />
                </Pressable>
              );
            }
            return (
              <Pressable
                key={key}
                style={({ pressed }) => [
                  keypadStyles.cell,
                  pressed && keypadStyles.cellPressed,
                ]}
                onPress={() => onPress(key)}
              >
                <Text style={keypadStyles.keyText}>{key}</Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const keypadStyles = StyleSheet.create({
  grid: {
    alignSelf: "center",
    gap: 10,
  },
  row: {
    flexDirection: "row",
    gap: 20,
    justifyContent: "center",
  },
  cell: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  cellPressed: {
    backgroundColor: "#E5E7EB",
  },
  keyText: {
    fontSize: 24,
    fontWeight: "600",
    color: "#111827",
  },
});

// ---------------------------------------------------------------------------
// PIN dots
// ---------------------------------------------------------------------------

function PinDots({ length, max }: { length: number; max: number }) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: max }).map((_, i) => (
        <View key={i} style={[styles.dot, i < length && styles.dotFilled]} />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

const PIN_LENGTH = 6;

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const setUser = useAuthStore((s) => s.setUser);

  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState<UserRole>("kasir");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const id = Number(userId);

  // Load user info
  useEffect(() => {
    (async () => {
      await initDatabase();
      const user = await getUserById(id);
      if (user) {
        setUserName(user.name);
        setUserRole(user.role);
      }
    })();
  }, [id]);

  // Auto-verify when PIN is full
  useEffect(() => {
    if (pin.length === PIN_LENGTH && !verifying) {
      handleVerify(pin);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  const handleKeyPress = (key: string) => {
    if (pin.length < PIN_LENGTH) setPin((p) => p + key);
  };

  const handleKeyDelete = () => {
    setPin((p) => p.slice(0, -1));
  };

  const handleVerify = async (pinToVerify: string) => {
    setVerifying(true);
    setLoading(true);
    Keyboard.dismiss();
    try {
      const result = await verifyUserPin(id, pinToVerify);
      if (result) {
        setUser(result);
        router.replace("/(tabs)");
      } else {
        Alert.alert("PIN Salah", "PIN yang dimasukkan tidak cocok", [
          { text: "OK", onPress: () => setPin("") },
        ]);
      }
    } catch (e: any) {
      Alert.alert("Gagal", e?.message ?? "Terjadi kesalahan");
      setPin("");
    } finally {
      setLoading(false);
      setVerifying(false);
    }
  };

  return (
    <Pressable
      style={[styles.screen, { paddingTop: insets.top + 12 }]}
      onPress={Keyboard.dismiss}
    >
      {/* Back */}
      <Pressable
        style={styles.backBtn}
        onPress={() => router.back()}
        hitSlop={10}
      >
        <ChevronLeft color="#111827" size={24} />
      </Pressable>

      {/* Header */}
      <View style={styles.header}>
        <View
          style={[
            styles.avatar,
            { backgroundColor: userRole === "owner" ? "#E8F0FE" : "#EFF6FF" },
          ]}
        >
          {userRole === "owner" ? (
            <Shield color={Colors.primary} size={28} />
          ) : (
            <User color="#2563EB" size={28} />
          )}
        </View>
        <Text style={styles.title}>Halo, {userName}</Text>
        <Text style={styles.subtitle}>Masukkan PIN 6 digit untuk masuk</Text>
      </View>

      {/* PIN area */}
      <View style={styles.pinArea}>
        <Pressable
          style={styles.eyeToggle}
          onPress={() => setShowPin(!showPin)}
        >
          {showPin ? (
            <EyeOff color={Colors.neutral} size={20} />
          ) : (
            <Eye color={Colors.neutral} size={20} />
          )}
          <Text style={styles.eyeLabel}>
            {showPin ? "Sembunyikan" : "Tampilkan"}
          </Text>
        </Pressable>

        {showPin ? (
          <Text style={styles.pinText}>{pin}</Text>
        ) : (
          <PinDots length={pin.length} max={PIN_LENGTH} />
        )}

        {loading && (
          <Text style={styles.loadingText}>Memverifikasi...</Text>
        )}

        <PinKeypad onPress={handleKeyPress} onDelete={handleKeyDelete} />
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 24,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
    gap: 10,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },
  subtitle: {
    fontSize: 14,
    color: Colors.neutral,
  },
  pinArea: {
    alignItems: "center",
    gap: 24,
  },
  eyeToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  eyeLabel: {
    fontSize: 12,
    color: Colors.neutral,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 14,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    backgroundColor: Colors.white,
  },
  dotFilled: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  pinText: {
    fontSize: 32,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: 10,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.neutral,
    marginTop: 8,
  },
});
