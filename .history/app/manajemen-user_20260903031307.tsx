import { useRouter } from "expo-router";
import {
  ChevronLeft,
  Pencil,
  Plus,
  Shield,
  Trash2,
  User,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";
import { useAuthStore } from "@/lib/auth-store";
import {
  addUser,
  deleteUser,
  getAllUsers,
  initDatabase,
  updateUser,
  type UserRole,
} from "@/lib/database";

type UserRow = {
  id: number;
  name: string;
  username: string;
  role: UserRole;
  is_active: number;
  created_at: string;
};

// ---------------------------------------------------------------------------
// Form Modal
// ---------------------------------------------------------------------------

function UserFormModal({
  visible,
  onClose,
  onSave,
  initial,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  initial?: UserRow | null;
}) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [role, setRole] = useState<UserRole>("kasir");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const isEdit = !!initial;
  const isOwner = initial?.role === "owner";

  useEffect(() => {
    if (initial) {
      setName(initial.name);
      setUsername(initial.username);
      setRole(initial.role);
      setIsActive(!!initial.is_active);
      setPin("");
    } else {
      setName("");
      setUsername("");
      setPin("");
      setRole("kasir");
      setIsActive(true);
    }
  }, [initial, visible]);

  const handleSave = async () => {
    if (!name.trim()) return Alert.alert("Peringatan", "Nama wajib diisi");
    if (!username.trim())
      return Alert.alert("Peringatan", "Username wajib diisi");
    if (!isEdit && !pin) return Alert.alert("Peringatan", "PIN wajib diisi");
    if (pin && pin.length < 6)
      return Alert.alert("Peringatan", "PIN harus minimal 6 digit");

    setSaving(true);
    try {
      if (isEdit) {
        await updateUser(initial!.id, {
          name: name.trim(),
          username: username.trim(),
          role,
          is_active: isActive ? 1 : 0,
          ...(pin ? { pin } : {}),
        });
      } else {
        await addUser({
          name: name.trim(),
          username: username.trim(),
          pin,
          role,
        });
      }
      onSave();
      onClose();
    } catch (e: any) {
      Alert.alert("Gagal", e?.message ?? "Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={modalStyles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        <View style={modalStyles.content}>
          {/* Header */}
          <View style={modalStyles.header}>
            <Text style={modalStyles.headerTitle}>
              {isEdit ? "Edit User" : "Tambah User"}
            </Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <X color="#6B7280" size={22} />
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Name */}
            <View style={modalStyles.field}>
              <Text style={modalStyles.label}>NAMA</Text>
              <TextInput
                style={modalStyles.input}
                value={name}
                onChangeText={setName}
                placeholder="Nama lengkap"
                placeholderTextColor="#C4C4C4"
              />
            </View>

            {/* Username */}
            <View style={modalStyles.field}>
              <Text style={modalStyles.label}>USERNAME</Text>
              <TextInput
                style={modalStyles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="Username untuk login"
                placeholderTextColor="#C4C4C4"
                autoCapitalize="none"
              />
            </View>

            {/* PIN */}
            <View style={modalStyles.field}>
              <Text style={modalStyles.label}>
                {isEdit ? "PIN BARU (kosongkan jika tidak ubah)" : "PIN"}
              </Text>
              <TextInput
                style={modalStyles.input}
                value={pin}
                onChangeText={setPin}
                placeholder={isEdit ? "Minimal 6 digit" : "6 digit PIN"}
                placeholderTextColor="#C4C4C4"
                keyboardType="number-pad"
                maxLength={12}
                secureTextEntry
              />
            </View>

            {/* Role */}
            <View style={modalStyles.field}>
              <Text style={modalStyles.label}>ROLE</Text>
              {isOwner ? (
                <View style={modalStyles.readOnlyField}>
                  <Shield color={Colors.primary} size={16} />
                  <Text style={modalStyles.readOnlyText}>Owner</Text>
                </View>
              ) : (
                <View style={modalStyles.roleRow}>
                  {(["owner", "kasir"] as UserRole[]).map((r) => (
                    <Pressable
                      key={r}
                      style={[
                        modalStyles.roleBtn,
                        role === r && modalStyles.roleBtnActive,
                      ]}
                      onPress={() => setRole(r)}
                    >
                      {r === "owner" ? (
                        <Shield
                          color={role === r ? Colors.white : Colors.primary}
                          size={16}
                        />
                      ) : (
                        <User
                          color={role === r ? Colors.white : "#2563EB"}
                          size={16}
                        />
                      )}
                      <Text
                        style={[
                          modalStyles.roleBtnText,
                          role === r && modalStyles.roleBtnTextActive,
                        ]}
                      >
                        {r === "owner" ? "Owner" : "Kasir"}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {/* Active toggle — hidden for owner */}
            {isEdit && !isOwner && (
              <View style={modalStyles.toggleRow}>
                <Text style={modalStyles.label}>STATUS AKTIF</Text>
                <Switch
                  value={isActive}
                  onValueChange={setIsActive}
                  trackColor={{ true: Colors.primary, false: "#D1D5DB" }}
                />
              </View>
            )}

            {/* Save */}
            <Pressable
              style={({ pressed }) => [
                modalStyles.saveBtn,
                pressed && modalStyles.saveBtnPressed,
              ]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={modalStyles.saveBtnText}>
                  {isEdit ? "Simpan Perubahan" : "Tambah User"}
                </Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
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
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.neutral,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  readOnlyField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#E8F0FE",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  readOnlyText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.secondary,
  },
  roleRow: {
    flexDirection: "row",
    gap: 10,
  },
  roleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  roleBtnActive: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  roleBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  roleBtnTextActive: {
    color: Colors.white,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  saveBtn: {
    backgroundColor: Colors.secondary,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  saveBtnPressed: {
    opacity: 0.85,
  },
  saveBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
});

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function ManajemenUserScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const authUser = useAuthStore((s) => s.user);

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      await initDatabase();
      const data = await getAllUsers();
      setUsers(data as UserRow[]);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Owner-only guard
  if (authUser?.role !== "owner") {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <Pressable
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={10}
          >
            <ChevronLeft color="#111827" size={24} />
          </Pressable>
          <Text style={styles.headerTitle}>Manajemen User</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <Text style={styles.emptyText}>Hanya owner yang bisa mengakses</Text>
        </View>
      </View>
    );
  }

  const handleDelete = (user: UserRow) => {
    Alert.alert("Hapus User", `Yakin ingin menghapus "${user.name}"?`, [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteUser(user.id);
            loadUsers();
          } catch (e: any) {
            Alert.alert("Gagal", e?.message ?? "Terjadi kesalahan");
          }
        },
      },
    ]);
  };

  const handleEdit = (user: UserRow) => {
    setEditingUser(user);
    setModalVisible(true);
  };

  const handleAdd = () => {
    setEditingUser(null);
    setModalVisible(true);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={10}
        >
          <ChevronLeft color="#111827" size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Manajemen User</Text>
        <Pressable style={styles.addBtn} onPress={handleAdd}>
          <Plus color={Colors.white} size={20} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 100,
            paddingTop: 12,
          }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>Belum ada user</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.userCard}>
              <View
                style={[
                  styles.avatar,
                  {
                    backgroundColor:
                      item.role === "owner" ? "#E8F0FE" : "#EFF6FF",
                  },
                ]}
              >
                {item.role === "owner" ? (
                  <Shield color={Colors.primary} size={22} />
                ) : (
                  <User color="#2563EB" size={22} />
                )}
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.name}</Text>
                <Text style={styles.userMeta}>
                  @{item.username} · {item.role}
                </Text>
              </View>
              <View style={styles.actions}>
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: item.is_active ? "#E8F0FE" : "#FEF2F2",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      { color: item.is_active ? Colors.primary : "#DC2626" },
                    ]}
                  >
                    {item.is_active ? "Aktif" : "Nonaktif"}
                  </Text>
                </View>
                {item.role !== "owner" && (
                  <View style={styles.actionBtns}>
                    <Pressable
                      style={styles.actionBtn}
                      onPress={() => handleEdit(item)}
                    >
                      <Pencil color={Colors.primary} size={16} />
                    </Pressable>
                    <Pressable
                      style={styles.actionBtn}
                      onPress={() => handleDelete(item)}
                    >
                      <Trash2 color="#DC2626" size={16} />
                    </Pressable>
                  </View>
                )}
              </View>
            </View>
          )}
        />
      )}

      <UserFormModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setEditingUser(null);
        }}
        onSave={loadUsers}
        initial={editingUser}
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 14,
    color: Colors.neutral,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  userMeta: {
    fontSize: 12,
    color: Colors.neutral,
    marginTop: 2,
  },
  actions: {
    alignItems: "flex-end",
    gap: 6,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  actionBtns: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
});
