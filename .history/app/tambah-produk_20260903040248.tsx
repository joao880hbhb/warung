import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";

import { useRouter } from "expo-router";
import {
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  ScanBarcode,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import {
  addProduct,
  generateUniqueBarcode,
  getAllCategories,
  initDatabase,
  isBarcodeExists,
  type Category,
} from "@/lib/database";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const UNITS = ["pcs", "kg", "liter", "bungkus", "botol", "kotak"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRupiahInput(text: string) {
  const nums = text.replace(/[^0-9]/g, "");
  if (!nums) return "";
  const n = parseInt(nums, 10);
  return n.toLocaleString("id-ID");
}

function parseRupiah(text: string): number {
  return parseInt(text.replace(/[^0-9]/g, ""), 10) || 0;
}

function formatRupiah(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

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
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (visible) {
      setScanned(false);
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
// Category Picker Modal
// ---------------------------------------------------------------------------

function CategoryPickerModal({
  visible,
  categories,
  selectedId,
  onSelect,
  onClose,
}: {
  visible: boolean;
  categories: Category[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={catStyles.overlay}>
        <View style={catStyles.content}>
          <View style={catStyles.header}>
            <Text style={catStyles.headerTitle}>Pilih Kategori</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <X color="#6B7280" size={22} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {categories.map((cat) => (
              <Pressable
                key={cat.id}
                style={[
                  catStyles.item,
                  selectedId === cat.id && catStyles.itemActive,
                ]}
                onPress={() => {
                  onSelect(cat.id);
                  onClose();
                }}
              >
                <Text style={catStyles.itemIcon}>{cat.icon}</Text>
                <Text style={catStyles.itemName}>{cat.name}</Text>
                {selectedId === cat.id && (
                  <Check color={Colors.primary} size={18} />
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const catStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  content: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: "60%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 12,
    marginBottom: 4,
  },
  itemActive: { backgroundColor: "#E8F0FE" },
  itemIcon: { fontSize: 24 },
  itemName: { flex: 1, fontSize: 15, fontWeight: "600", color: "#111827" },
});

// ---------------------------------------------------------------------------
// Unit Picker Modal
// ---------------------------------------------------------------------------

function UnitPickerModal({
  visible,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selected: string;
  onSelect: (unit: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={catStyles.overlay}>
        <View style={catStyles.content}>
          <View style={catStyles.header}>
            <Text style={catStyles.headerTitle}>Pilih Satuan</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <X color="#6B7280" size={22} />
            </Pressable>
          </View>
          {UNITS.map((u) => (
            <Pressable
              key={u}
              style={[catStyles.item, selected === u && catStyles.itemActive]}
              onPress={() => {
                onSelect(u);
                onClose();
              }}
            >
              <Text
                style={[catStyles.itemName, { textTransform: "capitalize" }]}
              >
                {u}
              </Text>
              {selected === u && <Check color={Colors.primary} size={18} />}
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function TambahProdukScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Form state
  const [name, setName] = useState("");
  const [barcode, setBarcode] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [unit, setUnit] = useState("pcs");
  const [sellPrice, setSellPrice] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [stock, setStock] = useState("0");
  const [categoryId, setCategoryId] = useState<number | null>(null);

  // Modal states
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      await initDatabase();
      const cats = await getAllCategories();
      setCategories(cats);
      setLoadingCategories(false);
    })();
  }, []);

  // Image picker
  const pickImage = async (useCamera: boolean) => {
    if (useCamera) {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Izin Diperlukan",
          "Izinkan akses kamera untuk mengambil foto produk",
        );
        return;
      }
    } else {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Izin Diperlukan",
          "Izinkan akses galeri untuk memilih foto produk",
        );
        return;
      }
    }

    const method = useCamera
      ? ImagePicker.launchCameraAsync
      : ImagePicker.launchImageLibraryAsync;

    const result = await method({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  // Barcode generate
  const handleGenerateBarcode = async () => {
    const code = await generateUniqueBarcode();
    setBarcode(code);
  };

  // Barcode scanned
  const handleBarcodeScanned = async (code: string) => {
    setShowBarcodeScanner(false);
    const exists = await isBarcodeExists(code);
    if (exists) {
      Alert.alert("Duplikat", `Barcode "${code}" sudah digunakan produk lain`);
      return;
    }
    setBarcode(code);
  };

  // Save
  const handleSave = async () => {
    if (!name.trim()) {
      return Alert.alert("Peringatan", "Nama produk wajib diisi");
    }
    if (!categoryId) {
      return Alert.alert("Peringatan", "Kategori wajib dipilih");
    }
    if (parseRupiah(sellPrice) <= 0) {
      return Alert.alert("Peringatan", "Harga jual harus lebih dari 0");
    }
    if (barcode && (await isBarcodeExists(barcode))) {
      return Alert.alert("Duplikat", "Barcode sudah digunakan");
    }

    setSaving(true);
    try {
      await addProduct({
        name: name.trim(),
        barcode: barcode || null,
        image_uri: imageUri,
        unit,
        sell_price: parseRupiah(sellPrice),
        buy_price: parseRupiah(buyPrice),
        stock: parseInt(stock, 10) || 0,
        category_id: categoryId,
      });
      Alert.alert("Berhasil", "Produk berhasil ditambahkan", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert("Gagal", e?.message ?? "Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  };

  const selectedCategory = categories.find((c) => c.id === categoryId);

  if (loadingCategories) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={{ paddingTop: insets.top + 12, flex: 1 }}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={10}
          >
            <ChevronLeft color="#111827" size={24} />
          </Pressable>
          <Text style={styles.headerTitle}>Tambah Produk</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Foto Produk */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>FOTO PRODUK</Text>
            <View style={styles.photoRow}>
              <Pressable
                style={styles.photoBtn}
                onPress={() => pickImage(true)}
              >
                <Camera color={Colors.primary} size={22} />
                <Text style={styles.photoBtnText}>Kamera</Text>
              </Pressable>
              <Pressable
                style={styles.photoBtn}
                onPress={() => pickImage(false)}
              >
                <ImageIcon color="#2563EB" size={22} />
                <Text style={styles.photoBtnText}>Galeri</Text>
              </Pressable>
            </View>
            {imageUri ? (
              <View style={styles.imagePreviewCard}>
                <Image
                  source={{ uri: imageUri }}
                  style={styles.imagePreviewImg}
                />
                <View style={styles.imagePreviewOverlay}>
                  <Pressable
                    style={styles.imageRemoveBtn}
                    onPress={() => setImageUri(null)}
                    hitSlop={8}
                  >
                    <X color="#FFF" size={16} />
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.imagePlaceholder}>
                <ImageIcon color="#D1D5DB" size={40} />
                <Text style={styles.imagePlaceholderText}>Belum ada foto</Text>
              </View>
            )}
          </View>

          {/* Barcode */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>BARCODE</Text>
            <TextInput
              style={styles.input}
              value={barcode}
              onChangeText={setBarcode}
              placeholder="Ketik atau scan barcode"
              placeholderTextColor="#C4C4C4"
              autoCapitalize="none"
            />
            <View style={styles.barcodeBtns}>
              <Pressable
                style={styles.barcodeBtn}
                onPress={() => setShowBarcodeScanner(true)}
              >
                <ScanBarcode color={Colors.primary} size={16} />
                <Text style={styles.barcodeBtnText}>Scan Barcode</Text>
              </Pressable>
              <Pressable
                style={styles.barcodeBtn}
                onPress={handleGenerateBarcode}
              >
                <Sparkles color="#7C3AED" size={16} />
                <Text style={styles.barcodeBtnText}>Generate</Text>
              </Pressable>
            </View>
          </View>

          {/* Nama Produk */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>NAMA PRODUK</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Nama produk"
              placeholderTextColor="#C4C4C4"
            />
          </View>

          {/* Satuan */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>SATUAN</Text>
            <Pressable
              style={styles.pickerBtn}
              onPress={() => setShowUnitPicker(true)}
            >
              <Text
                style={[styles.pickerText, { textTransform: "capitalize" }]}
              >
                {unit}
              </Text>
              <ChevronRight color="#9CA3AF" size={18} />
            </Pressable>
          </View>

          {/* Harga Jual */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>HARGA JUAL</Text>
            <View style={styles.rupiahInput}>
              <Text style={styles.rupiahPrefix}>Rp</Text>
              <TextInput
                style={styles.rupiahField}
                value={sellPrice}
                onChangeText={(t) => setSellPrice(formatRupiahInput(t))}
                placeholder="0"
                placeholderTextColor="#C4C4C4"
                keyboardType="number-pad"
              />
            </View>
          </View>

          {/* Harga Modal */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>HARGA MODAL (opsional)</Text>
            <View style={styles.rupiahInput}>
              <Text style={styles.rupiahPrefix}>Rp</Text>
              <TextInput
                style={styles.rupiahField}
                value={buyPrice}
                onChangeText={(t) => setBuyPrice(formatRupiahInput(t))}
                placeholder="0"
                placeholderTextColor="#C4C4C4"
                keyboardType="number-pad"
              />
            </View>
            {parseRupiah(sellPrice) > 0 && parseRupiah(buyPrice) > 0 && (
              <View style={styles.marginBox}>
                <TrendingUp color={Colors.primary} size={16} />
                <Text style={styles.marginLabel}>Margin</Text>
                <Text style={styles.marginValue}>
                  {formatRupiah(parseRupiah(sellPrice) - parseRupiah(buyPrice))}
                </Text>
                <Text style={styles.marginPercent}>
                  (
                  {Math.round(
                    ((parseRupiah(sellPrice) - parseRupiah(buyPrice)) /
                      parseRupiah(sellPrice)) *
                      100,
                  )}
                  %)
                </Text>
              </View>
            )}
          </View>

          {/* Stok Awal */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>STOK AWAL</Text>
            <TextInput
              style={styles.input}
              value={stock}
              onChangeText={setStock}
              placeholder="0"
              placeholderTextColor="#C4C4C4"
              keyboardType="number-pad"
            />
          </View>

          {/* Kategori */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>KATEGORI</Text>
            <Pressable
              style={styles.pickerBtn}
              onPress={() => setShowCategoryPicker(true)}
            >
              {selectedCategory ? (
                <View style={styles.pickerWithIcon}>
                  <Text style={styles.pickerIcon}>{selectedCategory.icon}</Text>
                  <Text style={styles.pickerText}>{selectedCategory.name}</Text>
                </View>
              ) : (
                <Text style={[styles.pickerText, { color: "#C4C4C4" }]}>
                  Pilih kategori
                </Text>
              )}
              <ChevronRight color="#9CA3AF" size={18} />
            </Pressable>
          </View>
        </ScrollView>

        {/* Save button */}
        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <Pressable
            style={({ pressed }) => [
              styles.saveBtn,
              pressed && styles.saveBtnPressed,
            ]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.saveBtnText}>Simpan Produk</Text>
            )}
          </Pressable>
        </View>
      </View>

      {/* Modals */}
      <CategoryPickerModal
        visible={showCategoryPicker}
        categories={categories}
        selectedId={categoryId}
        onSelect={setCategoryId}
        onClose={() => setShowCategoryPicker(false)}
      />
      <UnitPickerModal
        visible={showUnitPicker}
        selected={unit}
        onSelect={setUnit}
        onClose={() => setShowUnitPicker(false)}
      />
      <BarcodeScannerModal
        visible={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onScanned={handleBarcodeScanned}
      />
    </KeyboardAvoidingView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F3F4F6" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  // Header
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#111827" },

  // Scroll
  scrollContent: { paddingHorizontal: 16, paddingBottom: 100 },

  // Section
  section: { marginBottom: 20 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.neutral,
    letterSpacing: 0.5,
    marginBottom: 8,
  },

  // Input
  input: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#111827",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  // Photo
  photoRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  photoBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  photoBtnText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  imagePreview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: "#D1FAE5",
  },
  imagePreviewText: { flex: 1, fontSize: 13, color: "#374151" },
  imagePreviewCard: {
    position: "relative",
    backgroundColor: Colors.white,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  imagePreviewImg: {
    width: "100%",
    height: 180,
    resizeMode: "cover",
  },
  imagePreviewOverlay: {
    position: "absolute",
    top: 10,
    right: 10,
  },
  imageRemoveBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingVertical: 30,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    gap: 8,
  },
  imagePlaceholderText: { fontSize: 13, color: "#9CA3AF" },

  // Barcode
  barcodeBtns: { flexDirection: "row", gap: 10, marginTop: 10 },
  barcodeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  barcodeBtnText: { fontSize: 12, fontWeight: "600", color: "#374151" },

  // Rupiah input
  rupiahInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingHorizontal: 16,
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
    paddingVertical: 14,
    fontSize: 15,
    color: "#111827",
  },

  // Margin display
  marginBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F0FE",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
    gap: 6,
  },
  marginLabel: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "600",
  },
  marginValue: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: "700",
  },
  marginPercent: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: "500",
  },

  // Picker
  pickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  pickerText: { fontSize: 15, color: "#111827", fontWeight: "500" },
  pickerWithIcon: { flexDirection: "row", alignItems: "center", gap: 8 },
  pickerIcon: { fontSize: 20 },

  // Footer
  footer: { paddingHorizontal: 16 },
  saveBtn: {
    backgroundColor: Colors.secondary,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnPressed: { opacity: 0.85 },
  saveBtnText: { color: Colors.white, fontSize: 16, fontWeight: "700" },
});
