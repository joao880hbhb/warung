import * as SQLite from "expo-sqlite";

// ---------------------------------------------------------------------------
// Database singleton
// ---------------------------------------------------------------------------

let db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync("warungku.db");
  }
  return db;
}

// ---------------------------------------------------------------------------
// Init — buat tabel + migrasi jika perlu
// ---------------------------------------------------------------------------

export async function initDatabase(): Promise<void> {
  const database = await getDb();

  // Cek versi schema saat ini
  const result = await database.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version",
  );
  const version = result?.user_version ?? 0;

  if (version < 1) {
    // Migrasi: drop tabel lama (constraint 'karyawan'), buat baru
    await database.execAsync(`
      DROP TABLE IF EXISTS users;
      CREATE TABLE users (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        name       TEXT    NOT NULL,
        username   TEXT    NOT NULL UNIQUE,
        pin        TEXT    NOT NULL,
        role       TEXT    NOT NULL CHECK(role IN ('owner','kasir')) DEFAULT 'kasir',
        is_active  INTEGER NOT NULL DEFAULT 1,
        created_at TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
        updated_at TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
      );
    `);
    await database.execAsync("PRAGMA user_version = 1");
  }

  // Migrasi v2: tambah tabel customers + kolom customer_id di transactions
  if (version < 2) {
    // customers table (idempotent)
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS customers (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        name       TEXT    NOT NULL,
        phone      TEXT,
        address    TEXT,
        created_at TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
        updated_at TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
      );
    `);

    // Tambah kolom customer_id jika belum ada (kasus DB lama).
    // Hanya jika tabel transactions sudah ada (fresh install akan dibuat
    // lewat CREATE TABLE IF NOT EXISTS di bawah dengan kolom ini).
    const txTable = await database.getFirstAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='transactions'",
    );
    if (txTable) {
      const cols = await database.getAllAsync<{ name: string }>(
        "PRAGMA table_info(transactions)",
      );
      if (!cols.some((c) => c.name === "customer_id")) {
        await database.execAsync(
          "ALTER TABLE transactions ADD COLUMN customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL",
        );
      }
    }

    await database.execAsync("PRAGMA user_version = 2");
  }

  // Migrasi v3: tabel discounts + discount_products + kolom diskon di transaction_items
  if (version < 3) {
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS discounts (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        name             TEXT    NOT NULL,
        type             TEXT    NOT NULL CHECK(type IN ('percent','nominal')),
        value            REAL    NOT NULL DEFAULT 0,
        minimum_purchase REAL,
        is_active        INTEGER NOT NULL DEFAULT 1,
        created_at       TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
        updated_at       TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
      );
    `);

    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS discount_products (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        discount_id INTEGER NOT NULL,
        product_id  INTEGER NOT NULL,
        created_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
        UNIQUE(discount_id, product_id),
        FOREIGN KEY (discount_id) REFERENCES discounts(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      );
    `);

    // Tambah kolom diskon di transaction_items jika belum ada (kasus DB lama)
    const tiTable = await database.getFirstAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='transaction_items'",
    );
    if (tiTable) {
      const cols = await database.getAllAsync<{ name: string }>(
        "PRAGMA table_info(transaction_items)",
      );
      const addCol = (col: string, def: string) => {
        if (!cols.some((c) => c.name === col)) {
          return database.execAsync(
            `ALTER TABLE transaction_items ADD COLUMN ${col} ${def}`,
          );
        }
        return Promise.resolve();
      };
      await addCol("discount_id", "INTEGER");
      await addCol("discount_name", "TEXT");
    }

    await database.execAsync("PRAGMA user_version = 3");
  }

  // Migrasi v4: snapshot diskon di transactions + transaction_items
  if (version < 4) {
    const addColumnIfMissing = async (
      table: string,
      col: string,
      def: string,
    ) => {
      const tbl = await database.getFirstAsync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
        [table],
      );
      if (!tbl) return;
      const cols = await database.getAllAsync<{ name: string }>(
        `PRAGMA table_info(${table})`,
      );
      if (!cols.some((c) => c.name === col)) {
        await database.execAsync(
          `ALTER TABLE ${table} ADD COLUMN ${col} ${def}`,
        );
      }
    };

    // transactions: subtotal (sebelum diskon) + discount_amount (total diskon)
    await addColumnIfMissing(
      "transactions",
      "subtotal",
      "INTEGER NOT NULL DEFAULT 0",
    );
    await addColumnIfMissing(
      "transactions",
      "discount_amount",
      "INTEGER NOT NULL DEFAULT 0",
    );
    // Backfill transaksi lama (belum ada fitur diskon): subtotal = total_amount
    await database.runAsync(
      "UPDATE transactions SET subtotal = total_amount WHERE subtotal = 0 AND total_amount > 0",
    );

    // transaction_items: discount_amount (nominal diskon item) + total (setelah diskon)
    await addColumnIfMissing(
      "transaction_items",
      "discount_amount",
      "INTEGER NOT NULL DEFAULT 0",
    );
    await addColumnIfMissing(
      "transaction_items",
      "total",
      "INTEGER NOT NULL DEFAULT 0",
    );
    await database.runAsync(
      "UPDATE transaction_items SET total = subtotal WHERE total = 0 AND subtotal > 0",
    );

    await database.execAsync("PRAGMA user_version = 4");
  }

  // Pastikan tabel store ada
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS store (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT    NOT NULL DEFAULT '',
      address       TEXT    NOT NULL DEFAULT '',
      phone         TEXT    NOT NULL DEFAULT '',
      receipt_footer TEXT   NOT NULL DEFAULT 'Terima kasih atas kunjungan Anda!',
      updated_at    TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
    );
  `);

  // Pastikan tabel categories ada
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS categories (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL,
      icon       TEXT    NOT NULL DEFAULT '📦',
      created_at TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
    );
  `);

  // Pastikan tabel products ada
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS products (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      barcode     TEXT    UNIQUE,
      image_uri   TEXT,
      unit        TEXT    NOT NULL DEFAULT 'pcs',
      sell_price  REAL    NOT NULL DEFAULT 0,
      buy_price   REAL    DEFAULT 0,
      stock       INTEGER NOT NULL DEFAULT 0,
      category_id INTEGER,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );
  `);

  // Pastikan tabel customers ada
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS customers (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL,
      phone      TEXT,
      address    TEXT,
      created_at TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
    );
  `);

  // Pastikan tabel discounts ada
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS discounts (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      name             TEXT    NOT NULL,
      type             TEXT    NOT NULL CHECK(type IN ('percent','nominal')),
      value            REAL    NOT NULL DEFAULT 0,
      minimum_purchase REAL,
      is_active        INTEGER NOT NULL DEFAULT 1,
      created_at       TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at       TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
    );
  `);

  // Pastikan tabel discount_products ada
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS discount_products (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      discount_id INTEGER NOT NULL,
      product_id  INTEGER NOT NULL,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      UNIQUE(discount_id, product_id),
      FOREIGN KEY (discount_id) REFERENCES discounts(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );
  `);

  // Pastikan tabel transactions ada
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS transactions (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number  TEXT    NOT NULL UNIQUE,
      subtotal        INTEGER NOT NULL DEFAULT 0,
      discount_amount INTEGER NOT NULL DEFAULT 0,
      total_amount    INTEGER NOT NULL DEFAULT 0,
      paid_amount     INTEGER NOT NULL DEFAULT 0,
      change_amount   INTEGER NOT NULL DEFAULT 0,
      payment_method  TEXT    NOT NULL DEFAULT 'tunai',
      status          TEXT    NOT NULL DEFAULT 'PAID' CHECK(status IN ('PAID','UNPAID','PARTIAL')),
      customer_name   TEXT,
      customer_id     INTEGER,
      cashier_name    TEXT,
      notes           TEXT,
      created_at      TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
    );
  `);

  // Pastikan tabel transaction_items ada
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS transaction_items (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER NOT NULL,
      product_id    INTEGER NOT NULL,
      product_name  TEXT    NOT NULL,
      unit_price    INTEGER NOT NULL DEFAULT 0,
      quantity      INTEGER NOT NULL DEFAULT 0,
      subtotal      INTEGER NOT NULL DEFAULT 0,
      discount_id   INTEGER,
      discount_name TEXT,
      discount_amount INTEGER NOT NULL DEFAULT 0,
      total         INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
    );
  `);

  // Pastikan tabel transaction_payments ada
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS transaction_payments (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id  INTEGER NOT NULL,
      method          TEXT    NOT NULL,
      amount          INTEGER NOT NULL DEFAULT 0,
      reference       TEXT,
      created_at      TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
    );
  `);

  // Pastikan tabel stock_movements ada
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS stock_movements (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id    INTEGER NOT NULL,
      quantity      INTEGER NOT NULL DEFAULT 0,
      type          TEXT    NOT NULL DEFAULT 'OUT' CHECK(type IN ('IN','OUT','ADJUST')),
      reference     TEXT,
      notes         TEXT,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );
  `);
}

// ---------------------------------------------------------------------------
// User helpers
// ---------------------------------------------------------------------------

export type UserRole = "owner" | "kasir";

export type User = {
  id: number;
  name: string;
  username: string;
  pin: string;
  role: UserRole;
  is_active: number;
  created_at: string;
  updated_at: string;
};

/** Cek apakah sudah ada user di tabel. */
export async function hasUsers(): Promise<boolean> {
  const database = await getDb();
  const row = await database.getFirstAsync<{ cnt: number }>(
    "SELECT COUNT(*) as cnt FROM users",
  );
  return (row?.cnt ?? 0) > 0;
}

/** Ambil semua user (tanpa pin). */
export async function getAllUsers(): Promise<
  Pick<User, "id" | "name" | "username" | "role" | "is_active" | "created_at">[]
> {
  const database = await getDb();
  return await database.getAllAsync(
    "SELECT id, name, username, role, is_active, created_at FROM users ORDER BY id ASC",
  );
}

/** Tambah user baru. */
export async function addUser(params: {
  name: string;
  username: string;
  pin: string;
  role: UserRole;
}): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    "INSERT INTO users (name, username, pin, role) VALUES (?, ?, ?, ?)",
    [params.name, params.username, params.pin, params.role],
  );
}

/** Ambil user berdasarkan id (termasuk pin). */
export async function getUserById(id: number): Promise<User | null> {
  const database = await getDb();
  return (
    (await database.getFirstAsync<User>("SELECT * FROM users WHERE id = ?", [
      id,
    ])) ?? null
  );
}

/** Verifikasi PIN user. Return user (tanpa pin) jika cocok, null jika gagal. */
export async function verifyUserPin(
  userId: number,
  pin: string,
): Promise<Omit<User, "pin"> | null> {
  const database = await getDb();
  const user = await database.getFirstAsync<User>(
    "SELECT * FROM users WHERE id = ? AND pin = ? AND is_active = 1",
    [userId, pin],
  );
  if (!user) return null;
  const { pin: _, ...rest } = user;
  return rest;
}

/** Ganti PIN sendiri (tanpa cek pin lama). */
export async function changeOwnPin(
  userId: number,
  newPin: string,
): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    "UPDATE users SET pin = ?, updated_at = datetime('now','localtime') WHERE id = ?",
    [newPin, userId],
  );
}

/** Update user. */
export async function updateUser(
  id: number,
  params: {
    name: string;
    username: string;
    role: UserRole;
    is_active: number;
    pin?: string;
  },
): Promise<void> {
  const database = await getDb();
  if (params.pin) {
    await database.runAsync(
      "UPDATE users SET name=?, username=?, role=?, is_active=?, pin=?, updated_at=datetime('now','localtime') WHERE id=?",
      [
        params.name,
        params.username,
        params.role,
        params.is_active,
        params.pin,
        id,
      ],
    );
  } else {
    await database.runAsync(
      "UPDATE users SET name=?, username=?, role=?, is_active=?, updated_at=datetime('now','localtime') WHERE id=?",
      [params.name, params.username, params.role, params.is_active, id],
    );
  }
}

/** Hapus user (hard delete). */
export async function deleteUser(id: number): Promise<void> {
  const database = await getDb();
  await database.runAsync("DELETE FROM users WHERE id = ?", [id]);
}

// ---------------------------------------------------------------------------
// Store helpers
// ---------------------------------------------------------------------------

export type StoreInfo = {
  id: number;
  name: string;
  address: string;
  phone: string;
  receipt_footer: string;
};

/** Ambil data toko (selalu return 1 baris). */
export async function getStore(): Promise<StoreInfo> {
  const database = await getDb();
  const row = await database.getFirstAsync<StoreInfo>(
    "SELECT * FROM store LIMIT 1",
  );
  if (row) return row;
  // Belum ada data → insert baris default lalu return
  await database.runAsync("INSERT INTO store (name) VALUES ('')");
  return (await database.getFirstAsync<StoreInfo>(
    "SELECT * FROM store LIMIT 1",
  ))!;
}

/** Simpan / update data toko. */
export async function saveStore(params: {
  name: string;
  address: string;
  phone: string;
  receipt_footer: string;
}): Promise<void> {
  const database = await getDb();
  const existing = await database.getFirstAsync<{ id: number }>(
    "SELECT id FROM store LIMIT 1",
  );
  if (existing) {
    await database.runAsync(
      "UPDATE store SET name=?, address=?, phone=?, receipt_footer=?, updated_at=datetime('now','localtime') WHERE id=?",
      [
        params.name,
        params.address,
        params.phone,
        params.receipt_footer,
        existing.id,
      ],
    );
  } else {
    await database.runAsync(
      "INSERT INTO store (name, address, phone, receipt_footer) VALUES (?, ?, ?, ?)",
      [params.name, params.address, params.phone, params.receipt_footer],
    );
  }
}

// ---------------------------------------------------------------------------
// Category helpers
// ---------------------------------------------------------------------------

export type Category = {
  id: number;
  name: string;
  icon: string;
  created_at: string;
  updated_at: string;
};

/** Ambil semua kategori. */
export async function getAllCategories(): Promise<Category[]> {
  const database = await getDb();
  return await database.getAllAsync<Category>(
    "SELECT * FROM categories ORDER BY id ASC",
  );
}

/** Cek apakah nama kategori sudah ada (case-insensitive). */
export async function isCategoryNameExists(
  name: string,
  excludeId?: number,
): Promise<boolean> {
  const database = await getDb();
  let query =
    "SELECT COUNT(*) as cnt FROM categories WHERE LOWER(name) = LOWER(?)";
  const params: any[] = [name];
  if (excludeId) {
    query += " AND id != ?";
    params.push(excludeId);
  }
  const row = await database.getFirstAsync<{ cnt: number }>(query, params);
  return (row?.cnt ?? 0) > 0;
}

/** Tambah kategori baru. */
export async function addCategory(params: {
  name: string;
  icon: string;
}): Promise<void> {
  const database = await getDb();
  await database.runAsync("INSERT INTO categories (name, icon) VALUES (?, ?)", [
    params.name,
    params.icon,
  ]);
}

/** Update kategori. */
export async function updateCategory(
  id: number,
  params: { name: string; icon: string },
): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    "UPDATE categories SET name=?, icon=?, updated_at=datetime('now','localtime') WHERE id=?",
    [params.name, params.icon, id],
  );
}

/** Hapus kategori. */
export async function deleteCategory(id: number): Promise<void> {
  const database = await getDb();
  await database.runAsync("DELETE FROM categories WHERE id = ?", [id]);
}

// ---------------------------------------------------------------------------
// Customer helpers
// ---------------------------------------------------------------------------

export type Customer = {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
};

/** Ambil semua pelanggan. */
export async function getAllCustomers(): Promise<Customer[]> {
  const database = await getDb();
  return await database.getAllAsync<Customer>(
    "SELECT * FROM customers ORDER BY name ASC",
  );
}

/** Cari pelanggan berdasarkan nama atau nomor HP. */
export async function searchCustomers(query: string): Promise<Customer[]> {
  const database = await getDb();
  const q = `%${query.trim()}%`;
  return await database.getAllAsync<Customer>(
    `SELECT * FROM customers
     WHERE name LIKE ? OR phone LIKE ?
     ORDER BY name ASC
     LIMIT 50`,
    [q, q],
  );
}

/** Ambil pelanggan berdasarkan id. */
export async function getCustomerById(id: number): Promise<Customer | null> {
  const database = await getDb();
  return (
    (await database.getFirstAsync<Customer>(
      "SELECT * FROM customers WHERE id = ?",
      [id],
    )) ?? null
  );
}

/** Tambah pelanggan baru. */
export async function addCustomer(params: {
  name: string;
  phone?: string;
  address?: string;
}): Promise<number> {
  const database = await getDb();
  const result = await database.runAsync(
    `INSERT INTO customers (name, phone, address)
     VALUES (?, ?, ?)`,
    [
      params.name,
      params.phone?.trim() ? params.phone.trim() : null,
      params.address?.trim() ? params.address.trim() : null,
    ],
  );
  return result.lastInsertRowId;
}

/** Update pelanggan. */
export async function updateCustomer(
  id: number,
  params: { name: string; phone?: string; address?: string },
): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    `UPDATE customers
     SET name=?, phone=?, address=?, updated_at=datetime('now','localtime')
     WHERE id=?`,
    [
      params.name,
      params.phone?.trim() ? params.phone.trim() : null,
      params.address?.trim() ? params.address.trim() : null,
      id,
    ],
  );
}

/** Hapus pelanggan. */
export async function deleteCustomer(id: number): Promise<void> {
  const database = await getDb();
  await database.runAsync("DELETE FROM customers WHERE id = ?", [id]);
}

// ---------------------------------------------------------------------------
// Discount helpers
// ---------------------------------------------------------------------------

export type DiscountType = "percent" | "nominal";

export type Discount = {
  id: number;
  name: string;
  type: DiscountType;
  value: number;
  minimum_purchase: number | null;
  is_active: number;
  created_at: string;
  updated_at: string;
};

export type DiscountWithCount = Discount & {
  product_count: number;
};

/** Format nilai diskon jadi label, mis. "10%" atau "Rp 5.000". */
export function formatDiscountLabel(type: DiscountType, value: number): string {
  if (type === "percent") return `${value}%`;
  return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
}

/** Ambil semua diskon (dengan jumlah produk terhubung). */
export async function getAllDiscounts(): Promise<DiscountWithCount[]> {
  const database = await getDb();
  return await database.getAllAsync<DiscountWithCount>(
    `SELECT d.*,
            (SELECT COUNT(*) FROM discount_products dp WHERE dp.discount_id = d.id) as product_count
     FROM discounts d
     ORDER BY d.id DESC`,
  );
}

/** Tambah diskon baru. Return id. */
export async function addDiscount(params: {
  name: string;
  type: DiscountType;
  value: number;
  minimumPurchase: number | null;
  isActive: boolean;
}): Promise<number> {
  const database = await getDb();
  const result = await database.runAsync(
    `INSERT INTO discounts (name, type, value, minimum_purchase, is_active)
     VALUES (?, ?, ?, ?, ?)`,
    [
      params.name,
      params.type,
      params.value,
      params.minimumPurchase,
      params.isActive ? 1 : 0,
    ],
  );
  return result.lastInsertRowId;
}

/** Update diskon. */
export async function updateDiscount(
  id: number,
  params: {
    name: string;
    type: DiscountType;
    value: number;
    minimumPurchase: number | null;
    isActive: boolean;
  },
): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    `UPDATE discounts
     SET name=?, type=?, value=?, minimum_purchase=?, is_active=?, updated_at=datetime('now','localtime')
     WHERE id=?`,
    [
      params.name,
      params.type,
      params.value,
      params.minimumPurchase,
      params.isActive ? 1 : 0,
      id,
    ],
  );
}

/** Hapus diskon (relasi produk ikut terhapus via ON DELETE CASCADE). */
export async function deleteDiscount(id: number): Promise<void> {
  const database = await getDb();
  await database.withTransactionAsync(async () => {
    await database.runAsync(
      "DELETE FROM discount_products WHERE discount_id = ?",
      [id],
    );
    await database.runAsync("DELETE FROM discounts WHERE id = ?", [id]);
  });
}

/** Ambil id produk yang terhubung dengan diskon. */
export async function getDiscountProductIds(
  discountId: number,
): Promise<number[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<{ product_id: number }>(
    "SELECT product_id FROM discount_products WHERE discount_id = ?",
    [discountId],
  );
  return rows.map((r) => r.product_id);
}

/**
 * Simpan relasi diskon <-> produk.
 * Menghapus relasi yang di-uncheck lalu menambah relasi baru (tanpa duplikat
 * berkat UNIQUE constraint + INSERT OR IGNORE).
 */
export async function saveDiscountProducts(
  discountId: number,
  productIds: number[],
): Promise<void> {
  const database = await getDb();
  await database.withTransactionAsync(async () => {
    await database.runAsync(
      "DELETE FROM discount_products WHERE discount_id = ?",
      [discountId],
    );
    for (const pid of productIds) {
      await database.runAsync(
        "INSERT OR IGNORE INTO discount_products (discount_id, product_id) VALUES (?, ?)",
        [discountId, pid],
      );
    }
  });
}

/**
 * Ambil semua diskon aktif yang terhubung ke produk, dikelompokkan per produk.
 * Karena satu produk bisa punya beberapa diskon aktif, kembalikan array.
 */
export async function getActiveDiscountsMap(): Promise<
  Map<number, Discount[]>
> {
  const database = await getDb();
  const rows = await database.getAllAsync<{
    product_id: number;
    id: number;
    name: string;
    type: DiscountType;
    value: number;
    minimum_purchase: number | null;
    is_active: number;
  }>(
    `SELECT dp.product_id, d.id, d.name, d.type, d.value, d.minimum_purchase, d.is_active
     FROM discount_products dp
     JOIN discounts d ON d.id = dp.discount_id
     WHERE d.is_active = 1
     ORDER BY d.id`,
  );
  const map = new Map<number, Discount[]>();
  for (const r of rows) {
    const discount: Discount = {
      id: r.id,
      name: r.name,
      type: r.type,
      value: r.value,
      minimum_purchase: r.minimum_purchase,
      is_active: r.is_active,
      created_at: "",
      updated_at: "",
    };
    const list = map.get(r.product_id);
    if (list) list.push(discount);
    else map.set(r.product_id, [discount]);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Product helpers
// ---------------------------------------------------------------------------

export type Product = {
  id: number;
  name: string;
  barcode: string | null;
  image_uri: string | null;
  unit: string;
  sell_price: number;
  buy_price: number;
  stock: number;
  category_id: number | null;
  created_at: string;
  updated_at: string;
};

export type ProductWithCategory = Product & {
  category_name: string | null;
  category_icon: string | null;
  discount_id: number | null;
  discount_name: string | null;
  discount_type: DiscountType | null;
  discount_value: number | null;
};

/** Subquery untuk diskon aktif pertama (by id) dari sebuah produk. */
const DISCOUNT_SUBQUERY = `
  (SELECT d.id FROM discount_products dp
    JOIN discounts d ON d.id = dp.discount_id
    WHERE dp.product_id = p.id AND d.is_active = 1
    ORDER BY d.id LIMIT 1)
`;

/** Ambil semua produk (dengan nama kategori + info diskon aktif). */
export async function getAllProducts(): Promise<ProductWithCategory[]> {
  const database = await getDb();
  return await database.getAllAsync<ProductWithCategory>(
    `SELECT p.*, c.name as category_name, c.icon as category_icon,
            ${DISCOUNT_SUBQUERY} as discount_id,
            (SELECT d.name FROM discount_products dp
              JOIN discounts d ON d.id = dp.discount_id
              WHERE dp.product_id = p.id AND d.is_active = 1
              ORDER BY d.id LIMIT 1) as discount_name,
            (SELECT d.type FROM discount_products dp
              JOIN discounts d ON d.id = dp.discount_id
              WHERE dp.product_id = p.id AND d.is_active = 1
              ORDER BY d.id LIMIT 1) as discount_type,
            (SELECT d.value FROM discount_products dp
              JOIN discounts d ON d.id = dp.discount_id
              WHERE dp.product_id = p.id AND d.is_active = 1
              ORDER BY d.id LIMIT 1) as discount_value
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     ORDER BY p.id DESC`,
  );
}

/** Ambil produk berdasarkan id. */
export async function getProductById(
  id: number,
): Promise<ProductWithCategory | null> {
  const database = await getDb();
  return (
    (await database.getFirstAsync<ProductWithCategory>(
      `SELECT p.*, c.name as category_name, c.icon as category_icon,
              ${DISCOUNT_SUBQUERY} as discount_id,
              (SELECT d.name FROM discount_products dp
                JOIN discounts d ON d.id = dp.discount_id
                WHERE dp.product_id = p.id AND d.is_active = 1
                ORDER BY d.id LIMIT 1) as discount_name,
              (SELECT d.type FROM discount_products dp
                JOIN discounts d ON d.id = dp.discount_id
                WHERE dp.product_id = p.id AND d.is_active = 1
                ORDER BY d.id LIMIT 1) as discount_type,
              (SELECT d.value FROM discount_products dp
                JOIN discounts d ON d.id = dp.discount_id
                WHERE dp.product_id = p.id AND d.is_active = 1
                ORDER BY d.id LIMIT 1) as discount_value
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = ?`,
      [id],
    )) ?? null
  );
}

/** Cek apakah barcode sudah ada (kecuali id tertentu). */
export async function isBarcodeExists(
  barcode: string,
  excludeId?: number,
): Promise<boolean> {
  const database = await getDb();
  let query = "SELECT COUNT(*) as cnt FROM products WHERE barcode = ?";
  const params: any[] = [barcode];
  if (excludeId) {
    query += " AND id != ?";
    params.push(excludeId);
  }
  const row = await database.getFirstAsync<{ cnt: number }>(query, params);
  return (row?.cnt ?? 0) > 0;
}

/** Generate barcode unik. */
export async function generateUniqueBarcode(): Promise<string> {
  let barcode: string;
  let exists = true;
  while (exists) {
    barcode = String(Date.now()).slice(-12);
    exists = await isBarcodeExists(barcode);
  }
  return barcode!;
}

/** Tambah produk baru. */
export async function addProduct(params: {
  name: string;
  barcode: string | null;
  image_uri: string | null;
  unit: string;
  sell_price: number;
  buy_price: number;
  stock: number;
  category_id: number | null;
}): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    `INSERT INTO products (name, barcode, image_uri, unit, sell_price, buy_price, stock, category_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      params.name,
      params.barcode,
      params.image_uri,
      params.unit,
      params.sell_price,
      params.buy_price,
      params.stock,
      params.category_id,
    ],
  );
}

/** Update produk. */
export async function updateProduct(
  id: number,
  params: {
    name: string;
    barcode: string | null;
    image_uri: string | null;
    unit: string;
    sell_price: number;
    buy_price: number;
    stock: number;
    category_id: number | null;
  },
): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    `UPDATE products SET name=?, barcode=?, image_uri=?, unit=?, sell_price=?, buy_price=?, stock=?, category_id=?, updated_at=datetime('now','localtime')
     WHERE id=?`,
    [
      params.name,
      params.barcode,
      params.image_uri,
      params.unit,
      params.sell_price,
      params.buy_price,
      params.stock,
      params.category_id,
      id,
    ],
  );
}

/** Hapus produk. */
export async function deleteProduct(id: number): Promise<void> {
  const database = await getDb();
  await database.runAsync("DELETE FROM products WHERE id = ?", [id]);
}

/** Update stok produk. */
export async function updateProductStock(
  id: number,
  newStock: number,
): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    "UPDATE products SET stock=?, updated_at=datetime('now','localtime') WHERE id=?",
    [newStock, id],
  );
}

// ---------------------------------------------------------------------------
// Transaction helpers
// ---------------------------------------------------------------------------

export type PaymentMethodType = "tunai" | "transfer" | "qris" | "hutang";

export type TransactionResult = {
  invoice_number: string;
  subtotal: number;
  total_discount: number;
  total_amount: number;
  paid_amount: number;
  change_amount: number;
  payment_method: PaymentMethodType;
  status: "PAID" | "UNPAID" | "PARTIAL";
  items: {
    product_name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    discount_amount: number;
    discount_name: string | null;
    total: number;
  }[];
};
/** Generate invoice number unik: INV-YYYYMMDD-HHmmss */
function generateInvoiceNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const rand = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
  return `INV-${y}${m}${d}-${hh}${mm}${ss}-${rand}`;
}

/**
 * Proses transaksi dalam satu SQLite transaction.
 * Jika salah satu gagal, seluruh proses di-rollback.
 */
export async function processTransaction(params: {
  cart: { product: ProductWithCategory; qty: number }[];
  cartLines?: Array<{
    product: ProductWithCategory;
    qty: number;
    unit_price: number;
    subtotal: number;
    discount_id: number | null;
    discount_name: string | null;
    discount_label: string | null;
    discount_amount: number;
    total: number;
  }>;
  subtotal: number;
  totalDiscount: number;
  totalAmount: number;
  paidAmount: number;
  paymentMethod: PaymentMethodType;
  customerName: string;
  customerId?: number | null;
  cashierName: string;
}): Promise<TransactionResult> {
  const database = await getDb();
  const invoiceNumber = generateInvoiceNumber();

  const change = Math.max(params.paidAmount - params.totalAmount, 0);

  // Tentukan status
  let status: "PAID" | "UNPAID" | "PARTIAL";
  if (params.paymentMethod === "hutang") {
    if (params.paidAmount <= 0) {
      status = "UNPAID";
    } else if (params.paidAmount < params.totalAmount) {
      status = "PARTIAL";
    } else {
      status = "PAID";
    }
  } else {
    status = "PAID";
  }

  // Validasi stok sebelum transaksi
  for (const item of params.cart) {
    if (item.product.stock < item.qty) {
      throw new Error(
        `Stok "${item.product.name}" tidak cukup (tersisa ${item.product.stock})`,
      );
    }
  }

  const snapshotMap = new Map(
    (params.cartLines ?? []).map((line) => [line.product.id, line]),
  );

  // Jalankan semua dalam satu transaction
  let txResult!: TransactionResult;

  await database.withTransactionAsync(async () => {
    // 1. Insert transactions
    await database.runAsync(
      `INSERT INTO transactions (invoice_number, subtotal, discount_amount, total_amount, paid_amount, change_amount, payment_method, status, customer_name, customer_id, cashier_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invoiceNumber,
        params.subtotal,
        params.totalDiscount,
        params.totalAmount,
        params.paidAmount,
        change,
        params.paymentMethod,
        status,
        params.customerName || null,
        params.customerId ?? null,
        params.cashierName,
      ],
    );

    // Ambil transaction id
    const txRow = await database.getFirstAsync<{ id: number }>(
      "SELECT id FROM transactions WHERE invoice_number = ?",
      [invoiceNumber],
    );
    const transactionId = txRow!.id;

    // 2. Insert transaction_items + kurangi stok + catat stock_movements
    for (const item of params.cart) {
      const snapshot = snapshotMap.get(item.product.id);
      const unit_price = snapshot?.unit_price ?? item.product.sell_price;
      const subtotal = snapshot?.subtotal ?? unit_price * item.qty;
      const discount_id = snapshot?.discount_id ?? null;
      const discount_name = snapshot?.discount_name ?? null;
      const discount_amount = snapshot?.discount_amount ?? 0;
      const total = snapshot?.total ?? Math.max(subtotal - discount_amount, 0);

      await database.runAsync(
        `INSERT INTO transaction_items (transaction_id, product_id, product_name, unit_price, quantity, subtotal, discount_id, discount_name, discount_amount, total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          transactionId,
          item.product.id,
          item.product.name,
          unit_price,
          item.qty,
          subtotal,
          discount_id,
          discount_name,
          discount_amount,
          total,
        ],
      );

      // Kurangi stok
      const newStock = item.product.stock - item.qty;
      await database.runAsync(
        "UPDATE products SET stock=?, updated_at=datetime('now','localtime') WHERE id=?",
        [newStock, item.product.id],
      );

      // Catat stock movement
      await database.runAsync(
        `INSERT INTO stock_movements (product_id, quantity, type, reference, notes)
         VALUES (?, ?, 'OUT', ?, ?)`,
        [
          item.product.id,
          -item.qty,
          invoiceNumber,
          `Penjualan ${item.product.name}`,
        ],
      );
    }

    // 3. Insert transaction_payments
    await database.runAsync(
      `INSERT INTO transaction_payments (transaction_id, method, amount, reference)
       VALUES (?, ?, ?, ?)`,
      [transactionId, params.paymentMethod, params.paidAmount, invoiceNumber],
    );

    // Build result
    const items = params.cart.map((c) => {
      const snapshot = snapshotMap.get(c.product.id);
      const unit_price = snapshot?.unit_price ?? c.product.sell_price;
      const subtotal = snapshot?.subtotal ?? unit_price * c.qty;
      const discount_amount = snapshot?.discount_amount ?? 0;
      const total = snapshot?.total ?? Math.max(subtotal - discount_amount, 0);
      return {
        product_name: c.product.name,
        quantity: c.qty,
        unit_price,
        subtotal,
        discount_amount,
        discount_name: snapshot?.discount_name ?? null,
        total,
      };
    });

    txResult = {
      invoice_number: invoiceNumber,
      subtotal: params.subtotal,
      total_discount: params.totalDiscount,
      total_amount: params.totalAmount,
      paid_amount: params.paidAmount,
      change_amount: change,
      payment_method: params.paymentMethod,
      status,
      items,
    };
  });

  return txResult;
}

// ---------------------------------------------------------------------------
// Report helpers
// ---------------------------------------------------------------------------

export type ReportPeriod = "Hari Ini" | "Minggu Ini" | "Bulan Ini" | "Custom";

function periodWhere(
  period: ReportPeriod,
  customStart?: string,
  customEnd?: string,
): { where: string; params: any[] } {
  const now = new Date();
  if (period === "Hari Ini") {
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    return {
      where: "AND DATE(t.created_at) = ?",
      params: [dateStr],
    };
  }
  if (period === "Minggu Ini") {
    // Monday of this week
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now);
    monday.setDate(diff);
    const dateStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
    return {
      where: "AND DATE(t.created_at) >= ?",
      params: [dateStr],
    };
  }
  if (period === "Bulan Ini") {
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return {
      where: "AND strftime('%Y-%m', t.created_at) = ?",
      params: [monthStr],
    };
  }
  if (customStart && customEnd) {
    return {
      where: "AND DATE(t.created_at) BETWEEN ? AND ?",
      params: [customStart, customEnd],
    };
  }
  return { where: "", params: [] };
}

export type ReportSummary = {
  omset: number;
  labaKotor: number;
  jumlahTransaksi: number;
  itemTerjual: number;
};

export async function getReportSummary(
  period: ReportPeriod,
  customStart?: string,
  customEnd?: string,
): Promise<ReportSummary> {
  const database = await getDb();
  const { where, params } = periodWhere(period, customStart, customEnd);

  // Omset = total paid_amount dari transaksi PAID
  const omsetRow = await database.getFirstAsync<{ v: number }>(
    `SELECT COALESCE(SUM(t.paid_amount), 0) as v FROM transactions t WHERE t.status = 'PAID' ${where}`,
    params,
  );

  // Laba kotor = omset - total (buy_price * quantity) dari item yang terjual
  const labaRow = await database.getFirstAsync<{ v: number }>(
    `SELECT COALESCE(SUM(ti.quantity * p.buy_price), 0) as v
     FROM transaction_items ti
     JOIN transactions t ON t.id = ti.transaction_id
     JOIN products p ON p.id = ti.product_id
     WHERE t.status = 'PAID' ${where}`,
    params,
  );

  // Jumlah transaksi
  const txRow = await database.getFirstAsync<{ v: number }>(
    `SELECT COUNT(*) as v FROM transactions t WHERE t.status = 'PAID' ${where}`,
    params,
  );

  // Item terjual
  const itemRow = await database.getFirstAsync<{ v: number }>(
    `SELECT COALESCE(SUM(ti.quantity), 0) as v
     FROM transaction_items ti
     JOIN transactions t ON t.id = ti.transaction_id
     WHERE t.status = 'PAID' ${where}`,
    params,
  );

  return {
    omset: omsetRow?.v ?? 0,
    labaKotor: (omsetRow?.v ?? 0) - (labaRow?.v ?? 0),
    jumlahTransaksi: txRow?.v ?? 0,
    itemTerjual: itemRow?.v ?? 0,
  };
}

export type SalesChartPoint = {
  label: string;
  value: number;
};

export async function getSalesChart(
  period: ReportPeriod,
  customStart?: string,
  customEnd?: string,
): Promise<SalesChartPoint[]> {
  const database = await getDb();
  const { where, params } = periodWhere(period, customStart, customEnd);

  if (period === "Custom") {
    if (!customStart || !customEnd) {
      return [];
    }

    const start = new Date(`${customStart}T00:00:00`);
    const end = new Date(`${customEnd}T23:59:59`);
    const diffDays = Math.max(
      1,
      Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1,
    );
    const rows = await database.getAllAsync<{ d: string; v: number }>(
      `SELECT DATE(t.created_at) as d, COALESCE(SUM(t.paid_amount), 0) as v
       FROM transactions t
       WHERE t.status = 'PAID' ${where}
       GROUP BY d ORDER BY d`,
      params,
    );

    const result: SalesChartPoint[] = [];
    const cursor = new Date(start);
    for (let i = 0; i < diffDays; i++) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
      const found = rows.find((r) => r.d === key);
      result.push({
        label: `${String(cursor.getDate()).padStart(2, "0")}`,
        value: found?.v ?? 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return result;
  }

  if (period === "Hari Ini") {
    // Per jam
    const rows = await database.getAllAsync<{ h: string; v: number }>(
      `SELECT strftime('%H', t.created_at) as h, COALESCE(SUM(t.paid_amount), 0) as v
       FROM transactions t
       WHERE t.status = 'PAID' ${where}
       GROUP BY h ORDER BY h`,
      params,
    );
    // Fill 06:00 - 23:00
    const result: SalesChartPoint[] = [];
    for (let i = 6; i <= 23; i++) {
      const hh = String(i).padStart(2, "0");
      const found = rows.find((r) => r.h === hh);
      result.push({ label: `${hh}.00`, value: found?.v ?? 0 });
    }
    return result;
  }

  if (period === "Minggu Ini") {
    // Per hari
    const rows = await database.getAllAsync<{ d: string; v: number }>(
      `SELECT strftime('%w', t.created_at) as d, COALESCE(SUM(t.paid_amount), 0) as v
       FROM transactions t
       WHERE t.status = 'PAID' ${where}
       GROUP BY d ORDER BY d`,
      params,
    );
    const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    const result: SalesChartPoint[] = dayNames.map((name, idx) => {
      const found = rows.find((r) => r.d === String(idx));
      return { label: name, value: found?.v ?? 0 };
    });
    return result;
  }

  // Bulan Ini — per minggu
  const rows = await database.getAllAsync<{ w: string; v: number }>(
    `SELECT (CAST(strftime('%d', t.created_at) AS INTEGER) - 1) / 7 + 1 as w,
            COALESCE(SUM(t.paid_amount), 0) as v
     FROM transactions t
     WHERE t.status = 'PAID' ${where}
     GROUP BY w ORDER BY w`,
    params,
  );
  const result: SalesChartPoint[] = ["Mg1", "Mg2", "Mg3", "Mg4", "Mg5"].map(
    (label, idx) => {
      const found = rows.find((r) => r.w === String(idx + 1));
      return { label, value: found?.v ?? 0 };
    },
  );
  return result;
}

export type TopProduct = {
  product_name: string;
  qty: number;
  total: number;
};

export async function getTopProducts(
  period: ReportPeriod,
  limit = 5,
  customStart?: string,
  customEnd?: string,
): Promise<TopProduct[]> {
  const database = await getDb();
  const { where, params } = periodWhere(period, customStart, customEnd);

  return await database.getAllAsync<TopProduct>(
    `SELECT ti.product_name, SUM(ti.quantity) as qty, SUM(ti.subtotal) as total
     FROM transaction_items ti
     JOIN transactions t ON t.id = ti.transaction_id
     WHERE t.status = 'PAID' ${where}
     GROUP BY ti.product_id
     ORDER BY qty DESC
     LIMIT ?`,
    [...params, limit],
  );
}

export type RecentTransaction = {
  invoice_number: string;
  created_at: string;
  total_amount: number;
  item_count: number;
  payment_method: string;
};

export async function getRecentTransactions(
  period: ReportPeriod,
  limit = 5,
  customStart?: string,
  customEnd?: string,
): Promise<RecentTransaction[]> {
  const database = await getDb();
  const { where, params } = periodWhere(period, customStart, customEnd);

  return await database.getAllAsync<RecentTransaction>(
    `SELECT t.invoice_number, t.created_at, t.total_amount, t.payment_method,
            (SELECT COUNT(*) FROM transaction_items ti WHERE ti.transaction_id = t.id) as item_count
     FROM transactions t
     WHERE t.status = 'PAID' ${where}
     ORDER BY t.created_at DESC
     LIMIT ?`,
    [...params, limit],
  );
}

export type TransactionDetailItem = {
  product_name: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
  discount_id: number | null;
  discount_name: string | null;
  discount_amount: number;
  total: number;
};

export type TransactionDetail = {
  id: number;
  invoice_number: string;
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  change_amount: number;
  payment_method: string;
  status: string;
  customer_name: string | null;
  customer_id: number | null;
  cashier_name: string | null;
  notes: string | null;
  created_at: string;
  items: TransactionDetailItem[];
};

export async function getTransactionDetail(
  invoiceNumber: string,
): Promise<TransactionDetail | null> {
  const database = await getDb();

  const tx = await database.getFirstAsync<Omit<TransactionDetail, "items">>(
    `SELECT * FROM transactions WHERE invoice_number = ?`,
    [invoiceNumber],
  );
  if (!tx) return null;

  const items = await database.getAllAsync<TransactionDetailItem>(
    `SELECT product_name, unit_price, quantity, subtotal, discount_id, discount_name, discount_amount, total
     FROM transaction_items WHERE transaction_id = ?
     ORDER BY id ASC`,
    [tx.id],
  );

  return { ...tx, items };
}

// ---------------------------------------------------------------------------
// History helpers
// ---------------------------------------------------------------------------

export type HistoryPeriod = "Hari Ini" | "Minggu Ini" | "Bulan Ini" | "Custom";

function historyWhere(
  period: HistoryPeriod,
  customStart?: string,
  customEnd?: string,
): { where: string; params: any[] } {
  const now = new Date();
  if (period === "Hari Ini") {
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    return {
      where: "AND DATE(t.created_at) = ?",
      params: [dateStr],
    };
  }
  if (period === "Minggu Ini") {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now);
    monday.setDate(diff);
    const dateStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
    return {
      where: "AND DATE(t.created_at) >= ?",
      params: [dateStr],
    };
  }
  if (period === "Bulan Ini") {
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return {
      where: "AND strftime('%Y-%m', t.created_at) = ?",
      params: [monthStr],
    };
  }
  // Custom
  if (customStart && customEnd) {
    return {
      where: "AND DATE(t.created_at) BETWEEN ? AND ?",
      params: [customStart, customEnd],
    };
  }
  return { where: "", params: [] };
}

export async function getHistoryTransactions(
  period: HistoryPeriod,
  customStart?: string,
  customEnd?: string,
): Promise<RecentTransaction[]> {
  const database = await getDb();
  const { where, params } = historyWhere(period, customStart, customEnd);

  return await database.getAllAsync<RecentTransaction>(
    `SELECT t.invoice_number, t.created_at, t.total_amount, t.payment_method,
            (SELECT COUNT(*) FROM transaction_items ti WHERE ti.transaction_id = t.id) as item_count
     FROM transactions t
     WHERE t.status = 'PAID' ${where}
     ORDER BY t.created_at DESC`,
    params,
  );
}

// ---------------------------------------------------------------------------
// Dashboard helpers
// ---------------------------------------------------------------------------

function todayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function yesterdayStr(): string {
  const now = new Date();
  now.setDate(now.getDate() - 1);
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export type DashboardSummary = {
  omsetHariIni: number;
  omsetKemarin: number;
  persenPerubahan: number; // positive = naik, negative = turun
  adaDataKemarin: boolean;
};

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const database = await getDb();
  const today = todayStr();
  const yesterday = yesterdayStr();

  const todayRow = await database.getFirstAsync<{ v: number }>(
    "SELECT COALESCE(SUM(paid_amount), 0) as v FROM transactions WHERE status = 'PAID' AND DATE(created_at) = ?",
    [today],
  );

  const yesterdayRow = await database.getFirstAsync<{ v: number }>(
    "SELECT COALESCE(SUM(paid_amount), 0) as v FROM transactions WHERE status = 'PAID' AND DATE(created_at) = ?",
    [yesterday],
  );

  const omsetHariIni = todayRow?.v ?? 0;
  const omsetKemarin = yesterdayRow?.v ?? 0;
  const adaDataKemarin = omsetKemarin > 0;
  const persenPerubahan = adaDataKemarin
    ? Math.round(((omsetHariIni - omsetKemarin) / omsetKemarin) * 100)
    : 0;

  return { omsetHariIni, omsetKemarin, persenPerubahan, adaDataKemarin };
}

export type DashboardStats = {
  jumlahTransaksi: number;
  itemTerjual: number;
  labaKotor: number;
  totalDiskon: number;
  stokMenipis: number;
};

const LOW_STOCK_THRESHOLD = 10;

export async function getDashboardStats(): Promise<DashboardStats> {
  const database = await getDb();
  const today = todayStr();

  // Jumlah transaksi hari ini
  const txRow = await database.getFirstAsync<{ v: number }>(
    "SELECT COUNT(*) as v FROM transactions WHERE status = 'PAID' AND DATE(created_at) = ?",
    [today],
  );

  // Item terjual hari ini
  const itemRow = await database.getFirstAsync<{ v: number }>(
    `SELECT COALESCE(SUM(ti.quantity), 0) as v
     FROM transaction_items ti
     JOIN transactions t ON t.id = ti.transaction_id
     WHERE t.status = 'PAID' AND DATE(t.created_at) = ?`,
    [today],
  );

  // Laba kotor hari ini = omset - total buy_price * qty
  const labaRow = await database.getFirstAsync<{ v: number }>(
    `SELECT COALESCE(SUM(ti.quantity * p.buy_price), 0) as v
     FROM transaction_items ti
     JOIN transactions t ON t.id = ti.transaction_id
     JOIN products p ON p.id = ti.product_id
     WHERE t.status = 'PAID' AND DATE(t.created_at) = ?`,
    [today],
  );
  const omsetRow = await database.getFirstAsync<{ v: number }>(
    "SELECT COALESCE(SUM(paid_amount), 0) as v FROM transactions WHERE status = 'PAID' AND DATE(created_at) = ?",
    [today],
  );
  const labaKotor = (omsetRow?.v ?? 0) - (labaRow?.v ?? 0);

  // Total diskon hari ini (diskon = total_amount - paid_amount, untuk transaksi yang bayar lebih)
  const diskonRow = await database.getFirstAsync<{ v: number }>(
    `SELECT COALESCE(SUM(change_amount), 0) as v
     FROM transactions
     WHERE status = 'PAID' AND DATE(created_at) = ? AND change_amount > 0`,
    [today],
  );

  // Stok menipis
  const stokRow = await database.getFirstAsync<{ v: number }>(
    "SELECT COUNT(*) as v FROM products WHERE stock <= ?",
    [LOW_STOCK_THRESHOLD],
  );

  return {
    jumlahTransaksi: txRow?.v ?? 0,
    itemTerjual: itemRow?.v ?? 0,
    labaKotor,
    totalDiskon: diskonRow?.v ?? 0,
    stokMenipis: stokRow?.v ?? 0,
  };
}

export type WeeklyDayData = {
  day: string;
  value: number;
  active: boolean;
  label: string;
};

export async function getDashboardWeeklyTrend(): Promise<WeeklyDayData[]> {
  const database = await getDb();
  const now = new Date();
  const dayNamesShort = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

  // Build 7 days ending today
  const days: { date: string; dayLabel: string; active: boolean }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    days.push({
      date,
      dayLabel: dayNamesShort[d.getDay()],
      active: i === 0, // today
    });
  }

  const placeholders = days.map(() => "?").join(",");
  const rows = await database.getAllAsync<{ d: string; v: number }>(
    `SELECT DATE(created_at) as d, COALESCE(SUM(paid_amount), 0) as v
     FROM transactions
     WHERE status = 'PAID' AND DATE(created_at) IN (${placeholders})
     GROUP BY d`,
    days.map((dd) => dd.date),
  );

  const rowMap = new Map(rows.map((r) => [r.d, r.v]));

  return days.map((dd) => {
    const value = rowMap.get(dd.date) ?? 0;
    const label =
      value >= 1000000
        ? `Rp ${(value / 1000000).toFixed(1)}jt`
        : value >= 1000
          ? `Rp ${Math.round(value / 1000)}rb`
          : value > 0
            ? `Rp ${value.toLocaleString("id-ID")}`
            : "Rp 0";
    return { day: dd.dayLabel, value, active: dd.active, label };
  });
}

export type LowStockProduct = {
  id: number;
  name: string;
  stock: number;
  unit: string;
  category_name: string | null;
};

export async function getLowStockProducts(): Promise<LowStockProduct[]> {
  const database = await getDb();
  return await database.getAllAsync<LowStockProduct>(
    `SELECT p.id, p.name, p.stock, p.unit, c.name as category_name
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     WHERE p.stock <= ?
     ORDER BY p.stock ASC`,
    [LOW_STOCK_THRESHOLD],
  );
}
