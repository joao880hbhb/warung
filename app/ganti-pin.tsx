import { useRouter } from "expo-router";
import { ChevronLeft, Delete, Eye, EyeOff, Shield } from "lucide-react-native";
import React, { useState } from "react";
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
import { changeOwnPin } from "@/lib/database";

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

export default function GantiPinScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [step, setStep] = useState<"new" | "confirm">("new");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);

  const currentPin = step === "new" ? newPin : confirmPin;

  const handleKeyPress = (key: string) => {
    if (step === "new") {
      if (newPin.length < PIN_LENGTH) setNewPin((p) => p + key);
    } else {
      if (confirmPin.length < PIN_LENGTH) setConfirmPin((p) => p + key);
    }
  };

  const handleKeyDelete = () => {
    if (step === "new") setNewPin((p) => p.slice(0, -1));
    else setConfirmPin((p) => p.slice(0, -1));
  };

  const handleSubmit = async () => {
    if (newPin !== confirmPin) {
      Alert.alert("PIN Tidak Cocok", "Konfirmasi PIN harus sama dengan PIN baru", [
        { text: "OK", onPress: () => setConfirmPin("") },
      ]);
      return;
    }
    if (!user) return;

    setLoading(true);
    Keyboard.dismiss();
    try {
      await changeOwnPin(user.id, newPin);
      Alert.alert("Berhasil", "PIN berhasil diubah", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert("Gagal", e?.message ?? "Terjadi kesalahan");
      setNewPin("");
      setConfirmPin("");
      setStep("new");
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (step === "confirm") {
      setStep("new");
      setConfirmPin("");
    } else {
      router.back();
    }
  };

  // New PIN step: 6 digit → show Lanjut button (no auto-advance)
  return (
    <Pressable
      style={[styles.screen, { paddingTop: insets.top + 12 }]}
      onPress={Keyboard.dismiss}
    >
      {/* Back */}
      <Pressable style={styles.backBtn} onPress={goBack} hitSlop={10}>
        <ChevronLeft color="#111827" size={24} />
      </Pressable>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Shield color={Colors.primary} size={28} />
        </View>
        <Text style={styles.title}>
          {step === "new" ? "Buat PIN Baru" : "Konfirmasi PIN"}
        </Text>
        <Text style={styles.subtitle}>
          {step === "new"
            ? "Masukkan PIN 6 digit baru kamu"
            : "Masukkan ulang PIN yang sama"}
        </Text>
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
          <Text style={styles.pinText}>{currentPin}</Text>
        ) : (
          <PinDots length={currentPin.length} max={PIN_LENGTH} />
        )}

        {loading && (
          <Text style={styles.loadingText}>Menyimpan...</Text>
        )}

        <PinKeypad onPress={handleKeyPress} onDelete={handleKeyDelete} />
      </View>

      {/* Buttons */}
      <View style={styles.footer}>
        {step === "new" && newPin.length === PIN_LENGTH && (
          <Pressable
            style={({ pressed }) => [
              styles.submitBtn,
              pressed && styles.submitBtnPressed,
            ]}
            onPress={() => setStep("confirm")}
          >
            <Text style={styles.submitBtnText}>Lanjut</Text>
          </Pressable>
        )}
        {step === "confirm" && confirmPin.length === PIN_LENGTH && (
          <Pressable
            style={({ pressed }) => [
              styles.submitBtn,
              pressed && styles.submitBtnPressed,
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitBtnText}>
              {loading ? "Menyimpan..." : "Ubah PIN"}
            </Text>
          </Pressable>
        )}
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
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E8F0FE",
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
  footer: {
    flex: 1,
    justifyContent: "flex-end",
    paddingBottom: 32,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnPressed: {
    opacity: 0.85,
  },
  submitBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
});
