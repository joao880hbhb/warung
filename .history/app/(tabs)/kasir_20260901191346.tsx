import { CameraView, useCameraPermissions } from "expo-camera";
import { useFocusEffect } from "expo-router";
import {
  AlertCircle,
  Check,
  CreditCard,
  Hand,
  Minus,
  Package,
  Plus,
  ScanBarcode,
  Search,
  ShoppingCart,
  Smartphone,
  Trash2,
  Wallet,
  X,
} from "lucide-react-native";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";
import { useAuthStore } from "@/lib/auth-store";
import {
  getAllProducts,
  initDatabase,
  processTransaction,
  type ProductWithCategory,
  type TransactionResult,
} from "@/lib/database";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRupiah(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

function parseRupiahInput(text: string) {
  const nums = text.replace(/[^0-9]/g, "");
  if (!nums) return "";
  return parseInt(nums, 10).toLocaleString("id-ID");
}

function parseRupiah(text: string): number {
  return parseInt(text.replace(/[^0-9]/g, ""), 10) || 0;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CartItem = {
  product: ProductWithCategory;
  qty: number;
};

type PaymentMethod = "tunai" | "transfer" | "qris" | "hutang";

const PAYMENT_METHODS: {
  key: PaymentMethod;
  label: string;
  icon: any;
  color: string;
  bg: string;
}[] = [
  {
    key: "tunai",
    label: "Tunai",
    icon: Wallet,
    color: Colors.primary,
    bg: "#E8F0FE",
  },
  {
    key: "transfer",
    label: "Transfer",
    icon: CreditCard,
    color: "#2563EB",
    bg: "#EFF6FF",
  },
  {
    key: "qris",
    label: "QRIS",
    icon: Smartphone,
    color: "#7C3AED",
    bg: "#F5F3FF",
  },
  {
    key: "hutang",
    label: "Hutang",
    icon: AlertCircle,
    color: "#D97706",
    bg: "#FFFBEB",
  },
];

const QUICK_AMOUNTS = [15000, 20000, 50000];

// ---------------------------------------------------------------------------
// Cart Bottom Sheet
// ---------------------------------------------------------------------------

function CartSheet({
  visible,
  cart,
  totalItems,
  totalAmount,
  onAdd,
  onRemove,
  onDelete,
  onClear,
  onBayar,
  onClose,
}: {
  visible: boolean;
  cart: CartItem[];
  totalItems: number;
  totalAmount: number;
  onAdd: (p: ProductWithCategory) => void;
  onRemove: (id: number) => void;
  onDelete: (id: number) => void;
  onClear: () => void;
  onBayar: () => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={sheetStyles.overlay}>
        <View style={sheetStyles.content}>
          {/* Handle */}
          <View style={sheetStyles.handle} />

          {/* Header */}
          <View style={sheetStyles.header}>
            <View style={sheetStyles.headerLeft}>
              <View style={sheetStyles.headerIcon}>
                <ShoppingCart color={Colors.primary} size={18} />
              </View>
              <View>
                <Text style={sheetStyles.headerTitle}>Keranjang</Text>
                <Text style={sheetStyles.headerSubtitle}>
                  {totalItems} item
                </Text>
              </View>
            </View>
            <View style={sheetStyles.headerRight}>
              <Pressable style={sheetStyles.clearBtn} onPress={onClear}>
                <Trash2 color="#DC2626" size={14} />
                <Text style={sheetStyles.clearBtnText}>Kosongkan</Text>
              </Pressable>
              <Pressable onPress={onClose} hitSlop={10}>
                <X color="#6B7280" size={22} />
              </Pressable>
            </View>
          </View>

          {/* Cart items */}
          {cart.length === 0 ? (
            <View style={sheetStyles.emptyCart}>
              <ShoppingCart color="#D1D5DB" size={40} />
              <Text style={sheetStyles.emptyCartText}>Keranjang kosong</Text>
            </View>
          ) : (
            <FlatList
              data={cart}
              keyExtractor={(c) => String(c.product.id)}
              showsVerticalScrollIndicator={false}
              style={sheetStyles.cartList}
              ItemSeparatorComponent={() => (
                <View style={sheetStyles.separator} />
              )}
              renderItem={({ item }) => {
                const subtotal = item.product.sell_price * item.qty;
                return (
                  <View style={sheetStyles.cartRow}>
                    <View style={sheetStyles.cartImageWrap}>
                      {item.product.image_uri ? (
                        <Image
                          source={{ uri: item.product.image_uri }}
                          style={sheetStyles.cartImage}
                        />
                      ) : (
                        <View
                          style={[
                            sheetStyles.cartImage,
                            sheetStyles.cartImagePlaceholder,
                          ]}
                        >
                          <Package color="#9CA3AF" size={18} />
                        </View>
                      )}
                    </View>

                    <View style={sheetStyles.cartInfo}>
                      <Text style={sheetStyles.cartName} numberOfLines={1}>
                        {item.product.name}
                      </Text>
                      <Text style={sheetStyles.cartPrice}>
                        {formatRupiah(item.product.sell_price)}
                      </Text>
                    </View>

                    <View style={sheetStyles.cartStepper}>
                      <Pressable
                        style={sheetStyles.cartQtyBtn}
                        onPress={() => onRemove(item.product.id)}
                      >
                        <Minus color={Colors.primary} size={14} />
                      </Pressable>
                      <Text style={sheetStyles.cartQty}>{item.qty}</Text>
                      <Pressable
                        style={sheetStyles.cartQtyBtn}
                        onPress={() => onAdd(item.product)}
                      >
                        <Plus color={Colors.primary} size={14} />
                      </Pressable>
                    </View>

                    <Text style={sheetStyles.cartSubtotal}>
                      {formatRupiah(subtotal)}
                    </Text>

                    <Pressable
                      style={sheetStyles.cartDeleteBtn}
                      onPress={() => onDelete(item.product.id)}
                    >
                      <Trash2 color="#DC2626" size={13} />
                    </Pressable>
                  </View>
                );
              }}
            />
          )}

          {/* Footer */}
          {cart.length > 0 && (
            <View style={sheetStyles.footer}>
              <View style={sheetStyles.totalRow}>
                <Text style={sheetStyles.totalLabel}>Total</Text>
                <Text style={sheetStyles.totalValue}>
                  {formatRupiah(totalAmount)}
                </Text>
              </View>
              <Pressable
                style={({ pressed }) => [
                  sheetStyles.bayarBtn,
                  pressed && { opacity: 0.85 },
                ]}
                onPress={onBayar}
              >
                <Check color="#FFF" size={18} />
                <Text style={sheetStyles.bayarBtnText}>Bayar</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const sheetStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  content: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    marginTop: 10,
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#E8F0FE",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  clearBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#DC2626",
  },
  emptyCart: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 10,
  },
  emptyCartText: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  cartList: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  separator: {
    height: 1,
    backgroundColor: "#F3F4F6",
  },
  cartRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 10,
  },
  cartImageWrap: {
    width: 42,
    height: 42,
  },
  cartImage: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
  },
  cartImagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  cartInfo: {
    flex: 1,
  },
  cartName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  cartPrice: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
  },
  cartStepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cartQtyBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: "#E8F0FE",
    alignItems: "center",
    justifyContent: "center",
  },
  cartQty: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    minWidth: 18,
    textAlign: "center",
  },
  cartSubtotal: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#111827",
    minWidth: 70,
    textAlign: "right",
  },
  cartDeleteBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  totalValue: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.primary,
  },
  bayarBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: 26,
  },
  bayarBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
});

// ---------------------------------------------------------------------------
// Payment Bottom Sheet
// ---------------------------------------------------------------------------

function PaymentSheet({
  visible,
  totalItems,
  totalAmount,
  onBayar,
  onClose,
}: {
  visible: boolean;
  totalItems: number;
  totalAmount: number;
  onBayar: (
    method: PaymentMethod,
    paidAmount: number,
    customer: string,
  ) => void;
  onClose: () => void;
}) {
  const [method, setMethod] = useState<PaymentMethod>("tunai");
  const [paidText, setPaidText] = useState("");
  const [customer, setCustomer] = useState("");

  const paidAmount = parseRupiah(paidText);
  const showAmountInput = method !== "hutang";
  const change = showAmountInput ? Math.max(paidAmount - totalAmount, 0) : 0;
  const isEnough = !showAmountInput || paidAmount >= totalAmount;

  const handleQuickAmount = (amount: number) => {
    setPaidText(parseRupiahInput(String(amount)));
  };

  const handleBayar = () => {
    if (showAmountInput && !isEnough) {
      Alert.alert("Uang Tidak Cukup", "Jumlah uang kurang dari total");
      return;
    }
    onBayar(method, paidAmount, customer);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={payStyles.overlay}>
          <View style={payStyles.content}>
            {/* Handle */}
            <View style={payStyles.handle} />

            {/* Header */}
            <View style={payStyles.header}>
              <Text style={payStyles.headerTitle}>Konfirmasi Pembayaran</Text>
              <Pressable onPress={onClose} hitSlop={10}>
                <X color="#6B7280" size={22} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Summary */}
              <View style={payStyles.summaryCard}>
                <View style={payStyles.summaryRow}>
                  <Text style={payStyles.summaryLabel}>Total Pembayaran</Text>
                  <Text style={payStyles.summaryValue}>
                    {formatRupiah(totalAmount)}
                  </Text>
                </View>
                <View style={payStyles.summaryRow}>
                  <Text style={payStyles.summaryLabel}>Jumlah Item</Text>
                  <Text style={payStyles.summarySub}>{totalItems} item</Text>
                </View>
              </View>

              {/* Customer */}
              <View style={payStyles.section}>
                <Text style={payStyles.sectionLabel}>PELANGGAN (opsional)</Text>
                <TextInput
                  style={payStyles.input}
                  value={customer}
                  onChangeText={setCustomer}
                  placeholder="Nama pelanggan"
                  placeholderTextColor="#C4C4C4"
                />
              </View>

              {/* Payment method */}
              <View style={payStyles.section}>
                <Text style={payStyles.sectionLabel}>METODE PEMBAYARAN</Text>
                <View style={payStyles.methodRow}>
                  {PAYMENT_METHODS.map((m) => {
                    const Icon = m.icon;
                    const active = method === m.key;
                    return (
                      <Pressable
                        key={m.key}
                        style={[
                          payStyles.methodBtn,
                          active && {
                            backgroundColor: m.bg,
                            borderColor: m.color,
                          },
                        ]}
                        onPress={() => setMethod(m.key)}
                      >
                        <Icon color={active ? m.color : "#9CA3AF"} size={20} />
                        <Text
                          style={[
                            payStyles.methodLabel,
                            active && { color: m.color, fontWeight: "700" },
                          ]}
                        >
                          {m.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Amount input (for tunai, transfer, qris — not hutang) */}
              {showAmountInput && (
                <View style={payStyles.section}>
                  <Text style={payStyles.sectionLabel}>JUMLAH UANG</Text>
                  <View style={payStyles.rupiahInput}>
                    <Text style={payStyles.rupiahPrefix}>Rp</Text>
                    <TextInput
                      style={payStyles.rupiahField}
                      value={paidText}
                      onChangeText={(t) => setPaidText(parseRupiahInput(t))}
                      placeholder="0"
                      placeholderTextColor="#C4C4C4"
                      keyboardType="number-pad"
                    />
                    {paidText.length > 0 && (
                      <Pressable onPress={() => setPaidText("")} hitSlop={6}>
                        <X color="#9CA3AF" size={16} />
                      </Pressable>
                    )}
                  </View>

                  {/* Quick amounts */}
                  <View style={payStyles.quickRow}>
                    <Pressable
                      style={payStyles.quickBtn}
                      onPress={() =>
                        setPaidText(parseRupiahInput(String(totalAmount)))
                      }
                    >
                      <Text style={payStyles.quickBtnText}>Uang Pas</Text>
                    </Pressable>
                    {QUICK_AMOUNTS.map((amt) => (
                      <Pressable
                        key={amt}
                        style={payStyles.quickBtn}
                        onPress={() => handleQuickAmount(amt)}
                      >
                        <Text style={payStyles.quickBtnText}>
                          {formatRupiah(amt)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  {/* Change */}
                  {paidAmount > 0 && (
                    <View
                      style={[
                        payStyles.changeBox,
                        { backgroundColor: isEnough ? "#E8F0FE" : "#FEF2F2" },
                      ]}
                    >
                      <Text
                        style={[
                          payStyles.changeLabel,
                          { color: isEnough ? Colors.primary : "#DC2626" },
                        ]}
                      >
                        {isEnough ? "Kembalian" : "Kurang"}
                      </Text>
                      <Text
                        style={[
                          payStyles.changeValue,
                          { color: isEnough ? Colors.primary : "#DC2626" },
                        ]}
                      >
                        {isEnough
                          ? formatRupiah(change)
                          : formatRupiah(totalAmount - paidAmount)}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>

            {/* Pay button */}
            <View style={payStyles.footer}>
              <Pressable
                style={({ pressed }) => [
                  payStyles.payBtn,
                  pressed && { opacity: 0.85 },
                ]}
                onPress={handleBayar}
              >
                <Check color="#FFF" size={18} />
                <Text style={payStyles.payBtnText}>Bayar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const payStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  content: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    marginTop: 10,
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },

  // Summary
  summaryCard: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 13,
    color: "#6B7280",
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.primary,
  },
  summarySub: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },

  // Section
  section: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9CA3AF",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#111827",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  // Method
  methodRow: {
    flexDirection: "row",
    gap: 8,
  },
  methodBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    borderWidth: 1.5,
    borderColor: "transparent",
    gap: 4,
  },
  methodLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
  },

  // Rupiah input
  rupiahInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  rupiahPrefix: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.primary,
    marginRight: 8,
  },
  rupiahField: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",
    fontWeight: "600",
  },

  // Quick amounts
  quickRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  quickBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#E8F0FE",
  },
  quickBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.primary,
  },

  // Change
  changeBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 10,
  },
  changeLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  changeValue: {
    fontSize: 16,
    fontWeight: "800",
  },

  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  payBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    height: 54,
    borderRadius: 27,
  },
  payBtnText: {
    color: "#FFF",
    fontSize: 17,
    fontWeight: "700",
  },
});

// ---------------------------------------------------------------------------
// Success Bottom Sheet
// ---------------------------------------------------------------------------

function SuccessSheet({
  visible,
  result,
  onClose,
}: {
  visible: boolean;
  result: TransactionResult | null;
  onClose: () => void;
}) {
  if (!result) return null;

  const isHutang = result.payment_method === "hutang";
  const statusLabel =
    result.status === "UNPAID"
      ? "Belum Dibayar"
      : result.status === "PARTIAL"
        ? "Bayar Sebagian"
        : "Lunas";
  const statusColor =
    result.status === "PAID"
      ? Colors.primary
      : result.status === "PARTIAL"
        ? "#D97706"
        : "#DC2626";

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={successStyles.overlay}>
        <View style={successStyles.content}>
          {/* Handle */}
          <View style={successStyles.handle} />

          {/* Success icon */}
          <View style={successStyles.iconWrap}>
            <View style={successStyles.iconCircle}>
              <Check color="#FFF" size={36} strokeWidth={3} />
            </View>
          </View>

          <Text style={successStyles.title}>Transaksi Berhasil!</Text>

          {/* Invoice number */}
          <View style={successStyles.invoiceBox}>
            <Text style={successStyles.invoiceLabel}>Nomor Invoice</Text>
            <Text style={successStyles.invoiceValue}>
              {result.invoice_number}
            </Text>
          </View>

          {/* Summary cards */}
          <View style={successStyles.summaryRow}>
            <View style={successStyles.summaryCard}>
              <Text style={successStyles.summaryLabel}>Total</Text>
              <Text style={successStyles.summaryValue}>
                {formatRupiah(result.total_amount)}
              </Text>
            </View>
            <View style={successStyles.summaryCard}>
              <Text style={successStyles.summaryLabel}>Dibayar</Text>
              <Text style={successStyles.summaryValue}>
                {formatRupiah(result.paid_amount)}
              </Text>
            </View>
            {result.change_amount > 0 && (
              <View style={successStyles.summaryCard}>
                <Text style={successStyles.summaryLabel}>Kembalian</Text>
                <Text
                  style={[successStyles.summaryValue, { color: "#D97706" }]}
                >
                  {formatRupiah(result.change_amount)}
                </Text>
              </View>
            )}
          </View>

          {/* Status badge */}
          {isHutang && (
            <View
              style={[
                successStyles.statusBadge,
                { backgroundColor: statusColor + "15" },
              ]}
            >
              <Text style={[successStyles.statusText, { color: statusColor }]}>
                {statusLabel}
              </Text>
            </View>
          )}

          {/* Items list */}
          <View style={successStyles.itemsSection}>
            <Text style={successStyles.itemsLabel}>Item yang dibeli</Text>
            {result.items.map((item, idx) => (
              <View key={idx} style={successStyles.itemRow}>
                <Text style={successStyles.itemName} numberOfLines={1}>
                  {item.product_name}
                </Text>
                <Text style={successStyles.itemQty}>x{item.quantity}</Text>
                <Text style={successStyles.itemSubtotal}>
                  {formatRupiah(item.subtotal)}
                </Text>
              </View>
            ))}
          </View>

          {/* Close button */}
          <View style={successStyles.footer}>
            <Pressable
              style={({ pressed }) => [
                successStyles.closeBtn,
                pressed && { opacity: 0.85 },
              ]}
              onPress={onClose}
            >
              <Text style={successStyles.closeBtnText}>Selesai</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const successStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  content: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    marginTop: 10,
    marginBottom: 8,
  },
  iconWrap: {
    alignItems: "center",
    paddingTop: 16,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    marginTop: 14,
  },
  invoiceBox: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
  },
  invoiceLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9CA3AF",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  invoiceValue: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 8,
    marginHorizontal: 20,
    marginTop: 14,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
    marginTop: 4,
  },
  statusBadge: {
    alignSelf: "center",
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "700",
  },
  itemsSection: {
    marginHorizontal: 20,
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 14,
  },
  itemsLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9CA3AF",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    gap: 8,
  },
  itemName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  itemQty: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9CA3AF",
    minWidth: 28,
    textAlign: "center",
  },
  itemSubtotal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    minWidth: 80,
    textAlign: "right",
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  closeBtn: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    height: 54,
    borderRadius: 27,
  },
  closeBtnText: {
    color: "#FFF",
    fontSize: 17,
    fontWeight: "700",
  },
});

// ---------------------------------------------------------------------------
// Barcode Scanner Modal
// ---------------------------------------------------------------------------

function BarcodeScannerModal({
  visible,
  onClose,
  onScanned,
}: {
  visible: boolean;
  onClose: () => void;
  onScanned: (code: string) => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const scannedRef = useRef(false); // 👈 ganti dari useState(false)

  useEffect(() => {
    if (visible) {
      scannedRef.current = false; // 👈 reset synchronous
      if (!permission?.granted) {
        requestPermission();
      }
    }
  }, [visible, permission, requestPermission]);

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={scannerStyles.center}>
          <Text style={scannerStyles.permText}>
            Izinkan akses kamera untuk scan barcode
          </Text>
          <Pressable style={scannerStyles.permBtn} onPress={requestPermission}>
            <Text style={scannerStyles.permBtnText}>Izinkan Kamera</Text>
          </Pressable>
          <Pressable onPress={onClose}>
            <Text style={scannerStyles.cancelText}>Batal</Text>
          </Pressable>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide">
      <View style={scannerStyles.container}>
        <CameraView
          style={StyleSheet.absoluteFill}
          barcodeScannerSettings={{
            barcodeTypes: [
              "ean13",
              "ean8",
              "upc_a",
              "upc_e",
              "code128",
              "code39",
              "code93",
              "itf14",
              "codabar",
            ],
          }}
          onBarcodeScanned={
            scanned
              ? undefined
              : ({ data }) => {
                  setScanned(true);
                  onScanned(data);
                }
          }
        />
        <View style={scannerStyles.overlay}>
          <View style={scannerStyles.scanFrame} />
          <Text style={scannerStyles.hint}>Arahkan ke barcode</Text>
          <Text style={scannerStyles.hintSub}>
            Pastikan barcode terlihat jelas dan mendekat
          </Text>
        </View>
        <Pressable style={scannerStyles.closeBtn} onPress={onClose}>
          <X color="#FFF" size={24} />
        </Pressable>
      </View>
    </Modal>
  );
}

const scannerStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 40,
  },
  permText: { fontSize: 15, color: "#374151", textAlign: "center" },
  permBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  permBtnText: { color: "#FFF", fontWeight: "700" },
  cancelText: { color: Colors.neutral, fontSize: 14 },
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scanFrame: {
    width: 260,
    height: 260,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 16,
    backgroundColor: "transparent",
  },
  hint: {
    color: "#FFF",
    fontSize: 14,
    marginTop: 20,
    fontWeight: "600",
  },
  hintSub: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
  },
  closeBtn: {
    position: "absolute",
    top: 60,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
});

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function KasirScreen() {
  const insets = useSafeAreaInsets();

  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Semua");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [successResult, setSuccessResult] = useState<TransactionResult | null>(
    null,
  );
  const [showSuccess, setShowSuccess] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const user = useAuthStore((s) => s.user);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        await initDatabase();
        const prods = await getAllProducts();
        setProducts(prods);
        setLoading(false);
      })();
    }, []),
  );

  const categories = useMemo(
    () => [
      "Semua",
      ...Array.from(
        new Set(
          products.map((p) => p.category_name).filter((x): x is string => !!x),
        ),
      ),
    ],
    [products],
  );

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory =
        activeCategory === "Semua" || p.category_name === activeCategory;
      const q = query.trim().toLowerCase();
      const matchesQuery =
        p.name.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q));
      return matchesCategory && matchesQuery;
    });
  }, [query, activeCategory, products]);

  const cartMap = useMemo(() => {
    const map = new Map<number, number>();
    cart.forEach((c) => map.set(c.product.id, c.qty));
    return map;
  }, [cart]);

  const totalItems = useMemo(
    () => cart.reduce((sum, c) => sum + c.qty, 0),
    [cart],
  );
  const totalAmount = useMemo(
    () => cart.reduce((sum, c) => sum + c.product.sell_price * c.qty, 0),
    [cart],
  );

  const addToCart = (product: ProductWithCategory) => {
    setCart((prev) => {
      const found = prev.find((c) => c.product.id === product.id);
      if (found) {
        // Jangan melebihi stok
        if (found.qty >= product.stock) {
          return prev;
        }
        return prev.map((c) =>
          c.product.id === product.id ? { ...c, qty: c.qty + 1 } : c,
        );
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) =>
      prev
        .map((c) => (c.product.id === productId ? { ...c, qty: c.qty - 1 } : c))
        .filter((c) => c.qty > 0),
    );
  };

  const deleteFromCart = (productId: number) => {
    setCart((prev) => prev.filter((c) => c.product.id !== productId));
  };

  const clearCart = () => setCart([]);

  const handleBarcodeScanned = (code: string) => {
    setShowScanner(false);
    const product = products.find((p) => p.barcode === code);
    if (product) {
      addToCart(product);
      Alert.alert(
        "Produk Ditemukan",
        `${product.name} ditambahkan ke keranjang`,
      );
    } else {
      Alert.alert(
        "Tidak Ditemukan",
        `Barcode "${code}" tidak cocok dengan produk mana pun`,
      );
    }
  };

  const handleBayar = async (
    method: PaymentMethod,
    paidAmount: number,
    customerName: string,
  ) => {
    if (cart.length === 0) return;

    try {
      const result = await processTransaction({
        cart,
        totalAmount,
        paidAmount,
        paymentMethod: method,
        customerName,
        cashierName: user?.name ?? "Kasir",
      });

      setShowPayment(false);
      setCart([]);
      setSuccessResult(result);
      setShowSuccess(true);
    } catch (err: any) {
      Alert.alert("Gagal Memproses", err?.message ?? "Terjadi kesalahan");
    }
  };

  const CATEGORIES_COLOR: Record<string, string> = {
    Makanan: "#D97706",
    Minuman: "#2563EB",
    Snack: "#DB2777",
    "Kebutuhan Rumah": "#7C3AED",
    Lainnya: "#6B7280",
  };

  return (
    <View style={styles.screen}>
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        columnWrapperStyle={styles.productRowCol}
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 16,
          paddingBottom: cart.length > 0 ? 100 : 120,
        }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* Header */}
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.headerTitle}>Kasir</Text>
                <Text style={styles.headerSubtitle}>
                  {totalItems > 0
                    ? `${totalItems} item · ${formatRupiah(totalAmount)}`
                    : "Pilih produk untuk transaksi baru"}
                </Text>
              </View>
              <Pressable
                style={styles.headerCartIcon}
                onPress={() => cart.length > 0 && setShowCart(true)}
              >
                <ShoppingCart color={Colors.primary} size={20} />
                {totalItems > 0 && (
                  <View style={styles.headerCartBadge}>
                    <Text style={styles.headerCartBadgeText}>
                      {totalItems > 99 ? "99+" : totalItems}
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>

            {/* Search bar */}
            <View style={styles.searchBar}>
              <Search color="#9CA3AF" size={18} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Cari produk..."
                placeholderTextColor="#9CA3AF"
                style={styles.searchInput}
              />
              <Pressable
                onPress={() => setShowScanner(true)}
                style={styles.barcodeScanBtn}
                hitSlop={8}
              >
                <ScanBarcode color={Colors.primary} size={20} />
              </Pressable>
              {query.length > 0 && (
                <Pressable onPress={() => setQuery("")} hitSlop={8}>
                  <X color="#9CA3AF" size={16} />
                </Pressable>
              )}
            </View>

            {/* Category chips */}
            <FlatList
              data={categories}
              horizontal
              keyExtractor={(item) => item}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryList}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => setActiveCategory(item)}
                  style={[
                    styles.categoryChip,
                    activeCategory === item && styles.categoryChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      activeCategory === item && styles.categoryChipTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                </Pressable>
              )}
            />

            <Text style={styles.listLabel}>
              {filteredProducts.length} produk{" "}
              {activeCategory !== "Semua" ? `· ${activeCategory}` : ""}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Package color="#9CA3AF" size={40} />
            <Text style={styles.emptyTitle}>Produk tidak ditemukan</Text>
          </View>
        }
        renderItem={({ item }) => {
          const qty = cartMap.get(item.id) ?? 0;
          const inCart = qty > 0;
          const catColor =
            CATEGORIES_COLOR[item.category_name ?? ""] || "#6B7280";

          return (
            <Pressable
              style={({ pressed }) => [
                styles.productCard,
                inCart && { borderColor: Colors.primary, borderWidth: 1.5 },
                pressed && { opacity: 0.85 },
              ]}
              onPress={() => addToCart(item)}
            >
              <View style={styles.productImageWrap}>
                {item.image_uri ? (
                  <Image
                    source={{ uri: item.image_uri }}
                    style={styles.productImage}
                  />
                ) : (
                  <View
                    style={[
                      styles.productImage,
                      styles.productImagePlaceholder,
                    ]}
                  >
                    <Package color="#D1D5DB" size={24} />
                  </View>
                )}
                {item.category_icon && (
                  <View style={styles.categoryDot}>
                    <Text style={styles.categoryDotText}>
                      {item.category_icon}
                    </Text>
                  </View>
                )}
                {inCart && (
                  <View style={styles.qtyBadge}>
                    <Text style={styles.qtyBadgeText}>{qty}</Text>
                  </View>
                )}
              </View>

              <Text style={styles.productName} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={[styles.productCategory, { color: catColor }]}>
                {item.category_name}
              </Text>
              <Text style={styles.productPrice}>
                {formatRupiah(item.sell_price)}
              </Text>

              {inCart ? (
                <View style={styles.qtyStepper}>
                  <Pressable
                    style={styles.qtyBtn}
                    onPress={() => removeFromCart(item.id)}
                  >
                    <Minus color={Colors.primary} size={14} />
                  </Pressable>
                  <Text style={styles.qtyText}>{qty}</Text>
                  <Pressable
                    style={styles.qtyBtn}
                    onPress={() => addToCart(item)}
                  >
                    <Plus color={Colors.primary} size={14} />
                  </Pressable>
                </View>
              ) : (
                <View style={styles.addCircle}>
                  <Plus color="#FFF" size={16} />
                </View>
              )}
            </Pressable>
          );
        }}
      />

      {/* Bottom action bar */}
      <View
        style={[
          styles.bottomBar,
          { bottom: 100, paddingBottom: Math.max(insets.bottom, 10) },
        ]}
      >
        <Pressable
          style={({ pressed }) => [
            styles.actionBtn,
            styles.cartBtn,
            pressed && { opacity: 0.7 },
          ]}
          onPress={() => setShowCart(true)}
        >
          <View style={styles.cartBtnIconWrap}>
            <ShoppingCart color="#FFF" size={20} />
            {totalItems > 0 && (
              <View style={styles.cartBtnBadge}>
                <Text style={styles.cartBtnBadgeText}>{totalItems}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.actionBtnText, { color: "#FFF" }]}>
            Keranjang
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.actionBtn,
            styles.payBtn,
            pressed && { opacity: 0.7 },
          ]}
          onPress={() => {
            if (cart.length === 0) {
              Alert.alert(
                "Keranjang Kosong",
                "Tambahkan produk terlebih dahulu",
              );
              return;
            }
            setShowPayment(true);
          }}
        >
          <Hand color="#FFF" size={20} />
          <Text style={[styles.actionBtnText, { color: "#FFF" }]}>Bayar</Text>
        </Pressable>
      </View>

      {/* Cart sheet */}
      <CartSheet
        visible={showCart}
        cart={cart}
        totalItems={totalItems}
        totalAmount={totalAmount}
        onAdd={addToCart}
        onRemove={removeFromCart}
        onDelete={deleteFromCart}
        onClear={clearCart}
        onBayar={() => {
          setShowCart(false);
          setShowPayment(true);
        }}
        onClose={() => setShowCart(false)}
      />

      {/* Payment sheet */}
      <PaymentSheet
        visible={showPayment}
        totalItems={totalItems}
        totalAmount={totalAmount}
        onBayar={handleBayar}
        onClose={() => setShowPayment(false)}
      />

      {/* Success sheet */}
      <SuccessSheet
        visible={showSuccess}
        result={successResult}
        onClose={() => {
          setShowSuccess(false);
          setSuccessResult(null);
          // Refresh produk untuk update stok
          (async () => {
            const prods = await getAllProducts();
            setProducts(prods);
          })();
        }}
      />

      {/* Barcode scanner */}
      <BarcodeScannerModal
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onScanned={handleBarcodeScanned}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },

  // Header
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: 12.5,
    color: "#9CA3AF",
    marginTop: 2,
  },
  headerCartIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#E8F0FE",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCartBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#F3F4F6",
  },
  headerCartBadgeText: {
    color: "#FFF",
    fontSize: 9,
    fontWeight: "700",
  },

  // Search
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: "#111827",
    padding: 0,
  },
  barcodeScanBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#E8F0FE",
    alignItems: "center",
    justifyContent: "center",
  },

  // Category chips
  categoryList: {
    gap: 8,
    paddingBottom: 14,
  },
  categoryChip: {
    backgroundColor: Colors.white,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
  },
  categoryChipText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#6B7280",
  },
  categoryChipTextActive: {
    color: "#FFF",
  },

  listLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9CA3AF",
    marginBottom: 4,
  },

  // Product grid
  productRowCol: {
    gap: 10,
    marginBottom: 10,
  },
  productCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  productImageWrap: {
    width: "100%",
    aspectRatio: 1,
    marginBottom: 8,
  },
  productImage: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  productImagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  categoryDot: {
    position: "absolute",
    bottom: -3,
    right: -3,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  categoryDotText: {
    fontSize: 11,
  },
  qtyBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 5,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  qtyBadgeText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "700",
  },
  productName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    textAlign: "center",
    minHeight: 34,
  },
  productCategory: {
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  productPrice: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.primary,
    marginTop: 4,
  },
  addCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  qtyStepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#E8F0FE",
    alignItems: "center",
    justifyContent: "center",
  },
  qtyText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    minWidth: 18,
    textAlign: "center",
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#9CA3AF",
  },

  // Bottom bar
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 12,
  },
  actionBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 14,
    gap: 4,
  },
  holdBtn: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1.5,
    borderColor: "#FDE68A",
  },
  cartBtn: {
    backgroundColor: Colors.primary,
    flexDirection: "row",
    gap: 6,
  },
  cartBtnIconWrap: {
    position: "relative",
  },
  cartBtnBadge: {
    position: "absolute",
    top: -6,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },
  cartBtnBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: Colors.primary,
  },
  payBtn: {
    backgroundColor: Colors.primary,
    flexDirection: "row",
    gap: 6,
  },
  actionBtnText: {
    fontSize: 10,
    fontWeight: "700",
  },
});
