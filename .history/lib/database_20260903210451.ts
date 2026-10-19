import * as SQLite from "expo-sqlite";

// ---------------------------------------------------------------------------
// Database singleton with promise cache
// ---------------------------------------------------------------------------

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync("kasir_kita.db").catch((e) => {
      dbPromise = null; // Reset on failure
      throw e;
    });
  }
  return dbPromise;
}

// ---------------------------------------------------------------------------
// Init lock to prevent parallel execution
// ---------------------------------------------------------------------------

let initRunning: Promise<void> | null = null;

export async function initDatabase(): Promise<void> {
  if (initRunning) return initRunning;

  initRunning = doInitDatabase();
  try {
    await initRunning;
  } finally {
    initRunning = null;
  }
}

// ---------------------------------------------------------------------------
// Ensure all base tables exist with latest schema
// ---------------------------------------------------------------------------

async function ensureBaseTables(
  database: SQLite.SQLiteDatabase,
): Promise<void> {
  // Create all base tables with latest schema
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL,
      username   TEXT    NOT NULL UNIQUE,
      pin        TEXT    NOT NULL,
      role       TEXT    NOT NULL CHECK(role IN ('owner','kasir')) DEFAULT 'kasir',
      is_active  INTEGER NOT NULL DEFAULT 1,
      created_at TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS store (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT    NOT NULL DEFAULT '',
      address       TEXT    NOT NULL DEFAULT '',
      phone         TEXT    NOT NULL DEFAULT '',
      receipt_footer TEXT   NOT NULL DEFAULT 'Terima kasih atas kunjungan Anda!',
      updated_at    TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL,
      icon       TEXT    NOT NULL DEFAULT '📦',
      created_at TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
    );

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

    CREATE TABLE IF NOT EXISTS customers (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL,
      phone      TEXT,
      address    TEXT,
      created_at TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
    );

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

    CREATE TABLE IF NOT EXISTS discount_products (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      discount_id INTEGER NOT NULL,
      product_id  INTEGER NOT NULL,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      UNIQUE(discount_id, product_id),
      FOREIGN KEY (discount_id) REFERENCES discounts(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

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
      pricing_type  TEXT    NOT NULL DEFAULT 'NORMAL',
      wholesale_price_snapshot INTEGER NOT NULL DEFAULT 0,
      wholesale_min_qty_snapshot INTEGER NOT NULL DEFAULT 0,
      consignment_id INTEGER,
      consignor_id   INTEGER,
      buy_price_snapshot INTEGER NOT NULL DEFAULT 0,
      consignor_price_snapshot INTEGER NOT NULL DEFAULT 0,
      consignor_profit_snapshot INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS transaction_payments (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id  INTEGER NOT NULL,
      method          TEXT    NOT NULL,
      amount          INTEGER NOT NULL DEFAULT 0,
      reference       TEXT,
      created_at      TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
    );

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

    CREATE TABLE IF NOT EXISTS wholesale_prices (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id       INTEGER NOT NULL UNIQUE,
      wholesale_price  INTEGER NOT NULL,
      min_qty          INTEGER NOT NULL,
      created_at       TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at       TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS consignors (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL,
      phone      TEXT,
      address    TEXT,
      notes      TEXT,
      created_at TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS consignments (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      consignor_id   INTEGER NOT NULL,
      product_id     INTEGER NOT NULL,
      qty_in         INTEGER NOT NULL DEFAULT 0,
      qty_sold       INTEGER NOT NULL DEFAULT 0,
      qty_returned   INTEGER NOT NULL DEFAULT 0,
      selling_price  INTEGER NOT NULL DEFAULT 0,
      consignor_price INTEGER NOT NULL DEFAULT 0,
      entry_date     TEXT    NOT NULL,
      notes          TEXT,
      status         TEXT    NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','COMPLETED')),
      created_at     TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at     TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (consignor_id) REFERENCES consignors(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      category     TEXT    NOT NULL CHECK(category IN ('RENT','ELECTRICITY','TRANSPORT','OTHER')),
      description  TEXT    NOT NULL,
      amount       INTEGER NOT NULL DEFAULT 0,
      expense_date TEXT    NOT NULL,
      created_at   TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at   TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS piutang (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id  INTEGER NOT NULL,
      customer_id     INTEGER,
      customer_name   TEXT    NOT NULL,
      invoice_number  TEXT    NOT NULL,
      total_amount    INTEGER NOT NULL DEFAULT 0,
      paid_amount     INTEGER NOT NULL DEFAULT 0,
      remaining_amount INTEGER NOT NULL DEFAULT 0,
      due_date        TEXT,
      status          TEXT    NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','PARTIAL','PAID')),
      created_at      TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at      TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS piutang_payments (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      piutang_id INTEGER NOT NULL,
      amount     INTEGER NOT NULL DEFAULT 0,
      method     TEXT    NOT NULL DEFAULT 'tunai',
      note       TEXT,
      created_at TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (piutang_id) REFERENCES piutang(id) ON DELETE CASCADE
    );
  `);
}

// ---------------------------------------------------------------------------
// Init — buat tabel + migrasi jika perlu
// ---------------------------------------------------------------------------

async function doInitDatabase(): Promise<void> {
  const database = await getDb();

  // FIRST: Ensure all base tables exist with latest schema
  await ensureBaseTables(database);

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
    // Guard: hanya jalan jika tabel transactions ada
    const txTableExists = await database.getFirstAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='transactions'",
    );
    if (txTableExists) {
      await database.runAsync(
        "UPDATE transactions SET subtotal = total_amount WHERE subtotal = 0 AND total_amount > 0",
      );
    }

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

    // Guard: hanya jalan jika tabel transaction_items ada
    const tiTableExists = await database.getFirstAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='transaction_items'",
    );
    if (tiTableExists) {
      await database.runAsync(
        "UPDATE transaction_items SET total = subtotal WHERE total = 0 AND subtotal > 0",
      );
    }

    await database.execAsync("PRAGMA user_version = 4");
  }

  // Migrasi v5: tabel wholesale_prices
  if (version < 5) {
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS wholesale_prices (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id       INTEGER NOT NULL UNIQUE,
        wholesale_price  INTEGER NOT NULL,
        min_qty          INTEGER NOT NULL,
        created_at       TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
        updated_at       TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      );
    `);

    // Tambah kolom pricing_type, wholesale_price_snapshot, wholesale_min_qty_snapshot di transaction_items
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

    await addColumnIfMissing(
      "transaction_items",
      "pricing_type",
      "TEXT DEFAULT 'NORMAL'",
    );
    await addColumnIfMissing(
      "transaction_items",
      "wholesale_price_snapshot",
      "INTEGER DEFAULT 0",
    );
    await addColumnIfMissing(
      "transaction_items",
      "wholesale_min_qty_snapshot",
      "INTEGER DEFAULT 0",
    );

    await database.execAsync("PRAGMA user_version = 5");
  }

  // Migrasi v6: tabel consignors + consignments + snapshot konsinyasi di transaction_items
  if (version < 6) {
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS consignors (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        name       TEXT    NOT NULL,
        phone      TEXT,
        address    TEXT,
        notes      TEXT,
        created_at TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
        updated_at TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
      );
    `);

    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS consignments (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        consignor_id   INTEGER NOT NULL,
        product_id     INTEGER NOT NULL,
        qty_in         INTEGER NOT NULL DEFAULT 0,
        qty_sold       INTEGER NOT NULL DEFAULT 0,
        qty_returned   INTEGER NOT NULL DEFAULT 0,
        selling_price  INTEGER NOT NULL DEFAULT 0,
        consignor_price INTEGER NOT NULL DEFAULT 0,
        entry_date     TEXT    NOT NULL,
        notes          TEXT,
        status         TEXT    NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','COMPLETED')),
        created_at     TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
        updated_at     TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
        FOREIGN KEY (consignor_id) REFERENCES consignors(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      );
    `);

    // Tambah kolom snapshot konsinyasi di transaction_items jika ada (kasus DB lama)
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

    await addColumnIfMissing("transaction_items", "consignment_id", "INTEGER");
    await addColumnIfMissing("transaction_items", "consignor_id", "INTEGER");
    await addColumnIfMissing(
      "transaction_items",
      "consignor_price_snapshot",
      "INTEGER DEFAULT 0",
    );
    await addColumnIfMissing(
      "transaction_items",
      "consignor_profit_snapshot",
      "INTEGER DEFAULT 0",
    );

    await database.execAsync("PRAGMA user_version = 6");
  }

  // Migrasi v7: tabel expenses
  if (version < 7) {
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS expenses (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        category     TEXT    NOT NULL CHECK(category IN ('RENT','ELECTRICITY','TRANSPORT','OTHER')),
        description  TEXT    NOT NULL,
        amount       INTEGER NOT NULL DEFAULT 0,
        expense_date TEXT    NOT NULL,
        created_at   TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
        updated_at   TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
      );
    `);
    await database.execAsync("PRAGMA user_version = 7");
  }

  // Migrasi v8: snapshot harga modal di transaction_items
  if (version < 8) {
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
    await addColumnIfMissing(
      "transaction_items",
      "buy_price_snapshot",
      "INTEGER DEFAULT 0",
    );
    await database.execAsync("PRAGMA user_version = 8");
  }

  // Migrasi v9: tabel piutang & pembayaran piutang
  if (version < 9) {
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS piutang (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id  INTEGER NOT NULL,
        customer_id     INTEGER,
        customer_name   TEXT    NOT NULL,
        invoice_number  TEXT    NOT NULL,
        total_amount    INTEGER NOT NULL DEFAULT 0,
        paid_amount     INTEGER NOT NULL DEFAULT 0,
        remaining_amount INTEGER NOT NULL DEFAULT 0,
        due_date        TEXT,
        status          TEXT    NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','PARTIAL','PAID')),
        created_at      TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
        updated_at      TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
        FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS piutang_payments (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        piutang_id INTEGER NOT NULL,
        amount     INTEGER NOT NULL DEFAULT 0,
        method     TEXT    NOT NULL DEFAULT 'tunai',
        note       TEXT,
        created_at TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
        FOREIGN KEY (piutang_id) REFERENCES piutang(id) ON DELETE CASCADE
      );
    `);

    // Backfill: buat piutang untuk transaksi hutang yang belum lunas
    // Guard: hanya jalan jika tabel transactions ada
    const txTableExists = await database.getFirstAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='transactions'",
    );

    if (txTableExists) {
      const hutangRows = await database.getAllAsync<{
        id: number;
        customer_id: number | null;
        customer_name: string | null;
        invoice_number: string;
        total_amount: number;
        paid_amount: number;
        created_at: string;
      }>(
        `SELECT id, customer_id, customer_name, invoice_number, total_amount, paid_amount, created_at
         FROM transactions
         WHERE payment_method = 'hutang' AND status IN ('UNPAID','PARTIAL')`,
      );
      for (const row of hutangRows) {
        const remaining = Math.max(row.total_amount - row.paid_amount, 0);
        const status =
          remaining <= 0 ? "PAID" : row.paid_amount > 0 ? "PARTIAL" : "OPEN";
        const due = new Date(row.created_at);
        due.setDate(due.getDate() + 30);
        const dueStr = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, "0")}-${String(due.getDate()).padStart(2, "0")}`;
        await database.runAsync(
          `INSERT INTO piutang (transaction_id, customer_id, customer_name, invoice_number, total_amount, paid_amount, remaining_amount, due_date, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            row.id,
            row.customer_id ?? null,
            row.customer_name ?? "Pelanggan",
            row.invoice_number,
            row.total_amount,
            row.paid_amount,
            remaining,
            dueStr,
            status,
          ],
        );
      }
    }

    await database.execAsync("PRAGMA user_version = 9");
  }
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
// Wholesale Price helpers
// ---------------------------------------------------------------------------

export type WholesalePrice = {
  id: number;
  product_id: number;
  wholesale_price: number;
  min_qty: number;
  created_at: string;
  updated_at: string;
};

/** Ambil harga grosir untuk satu produk. */
export async function getWholesalePriceByProductId(
  productId: number,
): Promise<WholesalePrice | null> {
  const database = await getDb();
  return (
    (await database.getFirstAsync<WholesalePrice>(
      "SELECT * FROM wholesale_prices WHERE product_id = ?",
      [productId],
    )) ?? null
  );
}

/** Ambil semua harga grosir (untuk dashboard). */
export async function getAllWholesalePrices(): Promise<WholesalePrice[]> {
  const database = await getDb();
  return await database.getAllAsync<WholesalePrice>(
    "SELECT * FROM wholesale_prices ORDER BY product_id ASC",
  );
}

/** Ambil wholesale price map: product_id -> WholesalePrice. */
export async function getWholesalePricesMap(): Promise<
  Map<number, WholesalePrice>
> {
  const database = await getDb();
  const rows = await getAllWholesalePrices();
  const map = new Map<number, WholesalePrice>();
  for (const row of rows) {
    map.set(row.product_id, row);
  }
  return map;
}

/** Simpan/update harga grosir untuk produk. */
export async function saveWholesalePrice(params: {
  product_id: number;
  wholesale_price: number;
  min_qty: number;
}): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    `INSERT INTO wholesale_prices (product_id, wholesale_price, min_qty)
     VALUES (?, ?, ?)
     ON CONFLICT(product_id) DO UPDATE SET
       wholesale_price = excluded.wholesale_price,
       min_qty = excluded.min_qty,
       updated_at = datetime('now','localtime')`,
    [params.product_id, params.wholesale_price, params.min_qty],
  );
}

/** Hapus harga grosir (produk kembali normal). */
export async function deleteWholesalePrice(productId: number): Promise<void> {
  const database = await getDb();
  await database.runAsync("DELETE FROM wholesale_prices WHERE product_id = ?", [
    productId,
  ]);
}

// ---------------------------------------------------------------------------
// Consignor (konsinyer) helpers
// ---------------------------------------------------------------------------

export type Consignor = {
  id: number;
  name: string;
  phone: string;
  address: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

/** Ambil semua konsinyer. */
export async function getAllConsignors(): Promise<Consignor[]> {
  const database = await getDb();
  return await database.getAllAsync<Consignor>(
    "SELECT * FROM consignors ORDER BY name COLLATE NOCASE ASC",
  );
}

/** Cari konsinyer berdasarkan nama/telepon. */
export async function searchConsignors(query: string): Promise<Consignor[]> {
  const database = await getDb();
  if (!query.trim()) return await getAllConsignors();
  const q = `%${query.trim()}%`;
  return await database.getAllAsync<Consignor>(
    `SELECT * FROM consignors
     WHERE name LIKE ? OR phone LIKE ?
     ORDER BY name COLLATE NOCASE ASC`,
    [q, q],
  );
}

/** Tambah konsinyer. */
export async function addConsignor(params: {
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
}): Promise<Consignor> {
  const database = await getDb();
  const res = await database.runAsync(
    `INSERT INTO consignors (name, phone, address, notes)
     VALUES (?, ?, ?, ?)`,
    [params.name, params.phone ?? "", params.address ?? "", params.notes ?? ""],
  );
  const row = await database.getFirstAsync<Consignor>(
    "SELECT * FROM consignors WHERE id = ?",
    [res.lastInsertRowId],
  );
  return row!;
}

/** Update konsinyer. */
export async function updateConsignor(
  id: number,
  params: {
    name: string;
    phone?: string;
    address?: string;
    notes?: string;
  },
): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    `UPDATE consignors
     SET name=?, phone=?, address=?, notes=?,
         updated_at=datetime('now','localtime')
     WHERE id=?`,
    [
      params.name,
      params.phone ?? "",
      params.address ?? "",
      params.notes ?? "",
      id,
    ],
  );
}

/** Hapus konsinyer (konsinyasi ikut terhapus via CASCADE). */
export async function deleteConsignor(id: number): Promise<void> {
  const database = await getDb();
  await database.runAsync("DELETE FROM consignors WHERE id = ?", [id]);
}

// ---------------------------------------------------------------------------
// Consignment (konsinyasi) helpers
// ---------------------------------------------------------------------------

export type ConsignmentStatus = "ACTIVE" | "COMPLETED";

export type Consignment = {
  id: number;
  consignor_id: number;
  consignor_name: string;
  product_id: number;
  product_name: string;
  product_unit: string;
  qty_in: number;
  qty_sold: number;
  qty_returned: number;
  qty_remaining: number;
  selling_price: number;
  consignor_price: number;
  profit_per_item: number;
  total_titipan: number;
  entry_date: string;
  notes: string;
  status: ConsignmentStatus;
  created_at: string;
  updated_at: string;
};

/** Konsinyasi aktif ringkas untuk kasir (per produk). */
export type ActiveConsignment = {
  id: number;
  consignor_id: number;
  consignor_name: string;
  product_id: number;
  selling_price: number;
  consignor_price: number;
  qty_remaining: number;
};

/** Ambil konsinyasi aktif untuk satu produk (maksimal satu). */
export async function getActiveConsignmentByProductId(
  productId: number,
): Promise<ActiveConsignment | null> {
  const database = await getDb();
  const rows = await database.getAllAsync<ActiveConsignment>(
    `SELECT c.id, c.consignor_id, s.name AS consignor_name, c.product_id,
            c.selling_price, c.consignor_price,
            (c.qty_in - c.qty_sold - c.qty_returned) AS qty_remaining
     FROM consignments c
     JOIN consignors s ON s.id = c.consignor_id
     WHERE c.product_id = ? AND c.status = 'ACTIVE'
       AND (c.qty_in - c.qty_sold - c.qty_returned) > 0
     ORDER BY c.id ASC
     LIMIT 1`,
    [productId],
  );
  return rows[0] ?? null;
}

/** Ambil peta konsinyasi aktif per produk (untuk kasir/dashboard). */
export async function getActiveConsignmentsMap(): Promise<
  Map<number, ActiveConsignment>
> {
  const database = await getDb();
  const rows = await database.getAllAsync<ActiveConsignment>(
    `SELECT c.id, c.consignor_id, s.name AS consignor_name, c.product_id,
            c.selling_price, c.consignor_price,
            (c.qty_in - c.qty_sold - c.qty_returned) AS qty_remaining
     FROM consignments c
     JOIN consignors s ON s.id = c.consignor_id
     WHERE c.status = 'ACTIVE'
       AND (c.qty_in - c.qty_sold - c.qty_returned) > 0
     ORDER BY c.id ASC`,
  );
  const map = new Map<number, ActiveConsignment>();
  for (const row of rows) {
    if (!map.has(row.product_id)) map.set(row.product_id, row);
  }
  return map;
}

const CONSIGNMENT_SELECT = `
  SELECT c.id, c.consignor_id, s.name AS consignor_name,
         c.product_id, p.name AS product_name, p.unit AS product_unit,
         c.qty_in, c.qty_sold, c.qty_returned,
         (c.qty_in - c.qty_sold - c.qty_returned) AS qty_remaining,
         c.selling_price, c.consignor_price,
         (c.selling_price - c.consignor_price) AS profit_per_item,
         (c.qty_in * c.consignor_price) AS total_titipan,
         c.entry_date, c.notes, c.status, c.created_at, c.updated_at
  FROM consignments c
  JOIN consignors s ON s.id = c.consignor_id
  JOIN products p ON p.id = c.product_id
`;

/** Ambil semua konsinyasi (dengan info konsinyer & produk). */
export async function getAllConsignments(): Promise<Consignment[]> {
  const database = await getDb();
  return await database.getAllAsync<Consignment>(
    CONSIGNMENT_SELECT + " ORDER BY c.created_at DESC, c.id DESC",
  );
}

/** Cari konsinyasi berdasarkan status/teks. */
export async function getConsignmentsFiltered(params: {
  status?: ConsignmentStatus | "SEMUA";
  query?: string;
}): Promise<Consignment[]> {
  const database = await getDb();
  const clauses: string[] = [];
  const vals: any[] = [];
  const status = params.status ?? "SEMUA";
  const query = params.query?.trim() ?? "";
  if (status === "ACTIVE" || status === "COMPLETED") {
    clauses.push("c.status = ?");
    vals.push(status);
  }
  if (query) {
    clauses.push("(s.name LIKE ? OR p.name LIKE ?)");
    vals.push(`%${query}%`, `%${query}%`);
  }
  const where = clauses.length ? "WHERE " + clauses.join(" AND ") : "";
  return await database.getAllAsync<Consignment>(
    CONSIGNMENT_SELECT + " " + where + " ORDER BY c.created_at DESC, c.id DESC",
    vals,
  );
}

/** Tambah konsinyasi baru. */
export async function addConsignment(params: {
  consignor_id: number;
  product_id: number;
  qty_in: number;
  selling_price: number;
  consignor_price: number;
  entry_date: string;
  notes?: string;
}): Promise<Consignment> {
  const database = await getDb();
  const res = await database.runAsync(
    `INSERT INTO consignments
       (consignor_id, product_id, qty_in, qty_sold, qty_returned,
        selling_price, consignor_price, entry_date, notes, status)
     VALUES (?, ?, ?, 0, 0, ?, ?, ?, ?, 'ACTIVE')`,
    [
      params.consignor_id,
      params.product_id,
      params.qty_in,
      params.selling_price,
      params.consignor_price,
      params.entry_date,
      params.notes ?? "",
    ],
  );
  return (await getConsignmentById(Number(res.lastInsertRowId)))!;
}

/** Ambil satu konsinyasi by id. */
export async function getConsignmentById(
  id: number,
): Promise<Consignment | null> {
  const database = await getDb();
  const row = await database.getFirstAsync<Consignment>(
    CONSIGNMENT_SELECT + " WHERE c.id = ?",
    [id],
  );
  return row ?? null;
}

/** Update konsinyasi yang belum pernah terjual (dapat diedit penuh). */
export async function updateConsignment(
  id: number,
  params: {
    consignor_id: number;
    product_id: number;
    qty_in: number;
    selling_price: number;
    consignor_price: number;
    entry_date: string;
    notes?: string;
  },
): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    `UPDATE consignments
     SET consignor_id=?, product_id=?, qty_in=?, selling_price=?,
         consignor_price=?, entry_date=?, notes=?,
         updated_at=datetime('now','localtime')
     WHERE id=?`,
    [
      params.consignor_id,
      params.product_id,
      params.qty_in,
      params.selling_price,
      params.consignor_price,
      params.entry_date,
      params.notes ?? "",
      id,
    ],
  );
}

/**
 * Hapus konsinyasi jika belum pernah terjual, atau jadikan COMPLETED
 * jika sudah ada penjualan (agar riwayat tetap benar).
 */
export async function deleteOrCompleteConsignment(id: number): Promise<void> {
  const database = await getDb();
  const row = await database.getFirstAsync<{ qty_sold: number }>(
    "SELECT qty_sold FROM consignments WHERE id = ?",
    [id],
  );
  if (!row) return;
  if (row.qty_sold > 0) {
    await database.runAsync(
      `UPDATE consignments
       SET status='COMPLETED', qty_returned=qty_in-qty_sold,
           updated_at=datetime('now','localtime')
       WHERE id=?`,
      [id],
    );
  } else {
    await database.runAsync("DELETE FROM consignments WHERE id = ?", [id]);
  }
}

// ---------------------------------------------------------------------------
// Consignment report helpers
// ---------------------------------------------------------------------------

export type ConsignmentSummary = {
  totalKonsinyasi: number;
  totalTerjual: number;
  totalTitipan: number;
  bagiHasil: number; // total (qty_sold * consignor_price) -> hak konsinyer
  keuntungan: number; // total (qty_sold * profit) -> laba toko dari konsinyasi
  nilaiSisa: number; // total (qty_remaining * consignor_price) -> nilai barang belum terjual
};

export type PerConsignorSummary = {
  consignor_id: number;
  name: string;
  phone: string;
  totalKonsinyasi: number;
  totalMasuk: number;
  totalTerjual: number;
  totalSisa: number;
  bagiHasil: number;
  keuntungan: number;
  nilaiSisa: number;
};

/** Ringkasan keseluruhan konsinyasi. */
export async function getConsignmentSummary(): Promise<ConsignmentSummary> {
  const database = await getDb();
  const row = await database.getFirstAsync<{
    totalKonsinyasi: number;
    totalTerjual: number;
    bagiHasil: number;
    keuntungan: number;
    totalMasuk: number;
    totalSisa: number;
  }>(
    `SELECT COUNT(*) AS totalKonsinyasi,
            COALESCE(SUM(c.qty_sold), 0) AS totalTerjual,
            COALESCE(SUM(c.qty_sold * c.consignor_price), 0) AS bagiHasil,
            COALESCE(SUM(c.qty_sold * (c.selling_price - c.consignor_price)), 0) AS keuntungan,
            COALESCE(SUM(c.qty_in), 0) AS totalMasuk,
            COALESCE(SUM(c.qty_in - c.qty_sold - c.qty_returned), 0) AS totalSisa
     FROM consignments c`,
  );
  const totalTitipan = await database.getFirstAsync<{ v: number }>(
    "SELECT COALESCE(SUM(c.qty_in * c.consignor_price), 0) AS v FROM consignments c",
  );
  const nilaiSisa = await database.getFirstAsync<{ v: number }>(
    "SELECT COALESCE(SUM((c.qty_in - c.qty_sold - c.qty_returned) * c.consignor_price), 0) AS v FROM consignments c",
  );
  return {
    totalKonsinyasi: row?.totalKonsinyasi ?? 0,
    totalTerjual: row?.totalTerjual ?? 0,
    totalTitipan: totalTitipan?.v ?? 0,
    bagiHasil: row?.bagiHasil ?? 0,
    keuntungan: row?.keuntungan ?? 0,
    nilaiSisa: nilaiSisa?.v ?? 0,
  };
}

/** Ringkasan per konsinyer. */
export async function getPerConsignorSummaries(): Promise<
  PerConsignorSummary[]
> {
  const database = await getDb();
  return await database.getAllAsync<PerConsignorSummary>(
    `SELECT s.id AS consignor_id, s.name, s.phone,
            COUNT(c.id) AS totalKonsinyasi,
            COALESCE(SUM(c.qty_in), 0) AS totalMasuk,
            COALESCE(SUM(c.qty_sold), 0) AS totalTerjual,
            COALESCE(SUM(c.qty_in - c.qty_sold - c.qty_returned), 0) AS totalSisa,
            COALESCE(SUM(c.qty_sold * c.consignor_price), 0) AS bagiHasil,
            COALESCE(SUM(c.qty_sold * (c.selling_price - c.consignor_price)), 0) AS keuntungan,
            COALESCE(SUM((c.qty_in - c.qty_sold - c.qty_returned) * c.consignor_price), 0) AS nilaiSisa
     FROM consignors s
     LEFT JOIN consignments c ON c.consignor_id = s.id
     GROUP BY s.id, s.name, s.phone
     ORDER BY s.name COLLATE NOCASE ASC`,
  );
}

// ---------------------------------------------------------------------------
// Expense (pengeluaran) helpers
// ---------------------------------------------------------------------------

export type ExpenseCategory = "RENT" | "ELECTRICITY" | "TRANSPORT" | "OTHER";

export type Expense = {
  id: number;
  category: ExpenseCategory;
  description: string;
  amount: number;
  expense_date: string;
  created_at: string;
  updated_at: string;
};

/** Ambil semua pengeluaran (terbaru dulu). */
export async function getAllExpenses(): Promise<Expense[]> {
  const database = await getDb();
  return await database.getAllAsync<Expense>(
    "SELECT * FROM expenses ORDER BY expense_date DESC, id DESC",
  );
}

/** Ambil pengeluaran berdasarkan rentang periode (berdasarkan expense_date). */
export async function getExpensesByPeriod(params: {
  period: ReportPeriod;
  customStart?: string;
  customEnd?: string;
}): Promise<Expense[]> {
  const database = await getDb();
  const { where, vals } = expensePeriodWhere(
    params.period,
    params.customStart,
    params.customEnd,
  );
  return await database.getAllAsync<Expense>(
    "SELECT * FROM expenses" + where + " ORDER BY expense_date DESC, id DESC",
    vals,
  );
}

/** Total pengeluaran berdasarkan rentang periode (berdasarkan expense_date). */
export async function getTotalExpensesByPeriod(params: {
  period: ReportPeriod;
  customStart?: string;
  customEnd?: string;
}): Promise<number> {
  const database = await getDb();
  const { where, vals } = expensePeriodWhere(
    params.period,
    params.customStart,
    params.customEnd,
  );
  const row = await database.getFirstAsync<{ v: number }>(
    "SELECT COALESCE(SUM(amount), 0) AS v FROM expenses" + where,
    vals,
  );
  return row?.v ?? 0;
}

/**
 * Bangun klausa WHERE untuk periode berdasarkan expense_date.
 * ("Hari Ini", "Minggu Ini", "Bulan Ini", "Custom")
 */
function expensePeriodWhere(
  period: ReportPeriod,
  customStart?: string,
  customEnd?: string,
): { where: string; vals: any[] } {
  const now = new Date();
  if (period === "Hari Ini") {
    const d = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    return { where: " WHERE DATE(expense_date) = ?", vals: [d] };
  }
  if (period === "Minggu Ini") {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now);
    monday.setDate(diff);
    const d = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
    return { where: " WHERE DATE(expense_date) >= ?", vals: [d] };
  }
  if (period === "Bulan Ini") {
    const m = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return { where: " WHERE strftime('%Y-%m', expense_date) = ?", vals: [m] };
  }
  if (period === "Custom" && customStart && customEnd) {
    return {
      where: " WHERE DATE(expense_date) BETWEEN ? AND ?",
      vals: [customStart, customEnd],
    };
  }
  return { where: "", vals: [] };
}

/** Tambah pengeluaran. */
export async function addExpense(params: {
  category: ExpenseCategory;
  description: string;
  amount: number;
  expense_date: string;
}): Promise<Expense> {
  const database = await getDb();
  const res = await database.runAsync(
    `INSERT INTO expenses (category, description, amount, expense_date)
     VALUES (?, ?, ?, ?)`,
    [params.category, params.description, params.amount, params.expense_date],
  );
  const row = await database.getFirstAsync<Expense>(
    "SELECT * FROM expenses WHERE id = ?",
    [res.lastInsertRowId],
  );
  return row!;
}

/** Update pengeluaran. */
export async function updateExpense(
  id: number,
  params: {
    category: ExpenseCategory;
    description: string;
    amount: number;
    expense_date: string;
  },
): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    `UPDATE expenses
     SET category=?, description=?, amount=?, expense_date=?,
         updated_at=datetime('now','localtime')
     WHERE id=?`,
    [
      params.category,
      params.description,
      params.amount,
      params.expense_date,
      id,
    ],
  );
}

/** Hapus pengeluaran. */
export async function deleteExpense(id: number): Promise<void> {
  const database = await getDb();
  await database.runAsync("DELETE FROM expenses WHERE id = ?", [id]);
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
  cartLines?: {
    product: ProductWithCategory;
    qty: number;
    normal_price: number;
    wholesale_price: number | null;
    wholesale_min_qty: number | null;
    pricing_type: "NORMAL" | "WHOLESALE" | "KONSINYASI";
    unit_price: number;
    subtotal: number;
    discount_id: number | null;
    discount_name: string | null;
    discount_label: string | null;
    discount_amount: number;
    total: number;
    consignment: {
      id: number;
      consignor_id: number;
      selling_price: number;
      consignor_price: number;
    } | null;
  }[];
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
      const pricing_type = snapshot?.pricing_type ?? "NORMAL";
      const wholesale_price_snapshot = snapshot?.wholesale_price ?? 0;
      const wholesale_min_qty_snapshot = snapshot?.wholesale_min_qty ?? 0;
      const consignment = snapshot?.consignment ?? null;
      const consignment_id = consignment?.id ?? null;
      const consignor_id = consignment?.consignor_id ?? null;
      const consignor_price_snapshot = consignment?.consignor_price ?? 0;
      const consignor_profit_snapshot = consignment
        ? Math.max(consignment.selling_price - consignment.consignor_price, 0)
        : 0;

      await database.runAsync(
        `INSERT INTO transaction_items (transaction_id, product_id, product_name, unit_price, quantity, subtotal, discount_id, discount_name, discount_amount, total, pricing_type, wholesale_price_snapshot, wholesale_min_qty_snapshot, consignment_id, consignor_id, buy_price_snapshot, consignor_price_snapshot, consignor_profit_snapshot)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          pricing_type,
          wholesale_price_snapshot,
          wholesale_min_qty_snapshot,
          consignment_id,
          consignor_id,
          item.product.buy_price ?? 0,
          consignor_price_snapshot,
          consignor_profit_snapshot,
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

      // Naikkan qty_sold konsinyasi & tandai COMPLETED bila habis
      if (consignment_id != null) {
        const rem = await database.getFirstAsync<{ q: number }>(
          `SELECT (qty_in - qty_sold - qty_returned) AS q FROM consignments WHERE id = ?`,
          [consignment_id],
        );
        if (rem && item.qty >= rem.q) {
          await database.runAsync(
            `UPDATE consignments
             SET qty_sold = qty_sold + ?, status='COMPLETED',
                 updated_at=datetime('now','localtime')
             WHERE id=?`,
            [item.qty, consignment_id],
          );
        } else {
          await database.runAsync(
            `UPDATE consignments
             SET qty_sold = qty_sold + ?, updated_at=datetime('now','localtime')
             WHERE id=?`,
            [item.qty, consignment_id],
          );
        }
      }
    }

    // 3. Insert transaction_payments
    await database.runAsync(
      `INSERT INTO transaction_payments (transaction_id, method, amount, reference)
       VALUES (?, ?, ?, ?)`,
      [transactionId, params.paymentMethod, params.paidAmount, invoiceNumber],
    );

    // 4. Jika pembayaran hutang/piutang, buat catatan piutang
    if (params.paymentMethod === "hutang") {
      const remaining = Math.max(params.totalAmount - params.paidAmount, 0);
      const piutangStatus =
        remaining <= 0 ? "PAID" : params.paidAmount > 0 ? "PARTIAL" : "OPEN";
      const due = new Date();
      due.setDate(due.getDate() + 30);
      const dueStr = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, "0")}-${String(due.getDate()).padStart(2, "0")}`;
      await database.runAsync(
        `INSERT INTO piutang (transaction_id, customer_id, customer_name, invoice_number, total_amount, paid_amount, remaining_amount, due_date, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          transactionId,
          params.customerId ?? null,
          params.customerName || "Pelanggan",
          invoiceNumber,
          params.totalAmount,
          params.paidAmount,
          remaining,
          dueStr,
          piutangStatus,
        ],
      );
    }

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
  pengeluaran: number;
  labaBersih: number;
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
  // Gunakan snapshot harga modal dari transaction_items bila tersedia,
  // fallback ke products.buy_price untuk data lama (sebelum migrasi v8).
  const labaRow = await database.getFirstAsync<{ v: number }>(
    `SELECT COALESCE(SUM(ti.quantity * CASE WHEN ti.buy_price_snapshot > 0 THEN ti.buy_price_snapshot ELSE p.buy_price END), 0) as v
     FROM transaction_items ti
     JOIN transactions t ON t.id = ti.transaction_id
     JOIN products p ON p.id = ti.product_id
     WHERE t.status = 'PAID' ${where}`,
    params,
  );

  // Pengeluaran berdasarkan expense_date pada periode yang sama
  const pengeluaran = await getTotalExpensesByPeriod({
    period,
    customStart,
    customEnd,
  });

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

  const omset = omsetRow?.v ?? 0;
  const labaKotor = omset - (labaRow?.v ?? 0);

  return {
    omset,
    labaKotor,
    pengeluaran,
    labaBersih: labaKotor - pengeluaran,
    jumlahTransaksi: txRow?.v ?? 0,
    itemTerjual: itemRow?.v ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Excel export helpers
// ---------------------------------------------------------------------------

export type ExportTransactionRow = {
  invoice_number: string;
  created_at: string;
  cashier_name: string | null;
  customer_name: string | null;
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  payment_method: string;
  paid_amount: number;
  change_amount: number;
  status: string;
};

export async function getExportTransactions(
  period: ReportPeriod,
  customStart?: string,
  customEnd?: string,
): Promise<ExportTransactionRow[]> {
  const database = await getDb();
  const { where, params } = periodWhere(period, customStart, customEnd);
  return await database.getAllAsync<ExportTransactionRow>(
    `SELECT t.invoice_number, t.created_at, t.cashier_name, t.customer_name,
            t.subtotal, t.discount_amount, t.total_amount, t.payment_method,
            t.paid_amount, t.change_amount, t.status
     FROM transactions t
     WHERE t.status = 'PAID' ${where}
     ORDER BY t.created_at ASC, t.id ASC`,
    params,
  );
}

export type ExportTransactionItemRow = {
  invoice_number: string;
  created_at: string;
  product_name: string;
  quantity: number;
  product_unit: string;
  unit_price: number;
  buy_price: number;
  discount_amount: number;
  subtotal: number;
  laba: number;
};

export async function getExportTransactionItems(
  period: ReportPeriod,
  customStart?: string,
  customEnd?: string,
): Promise<ExportTransactionItemRow[]> {
  const database = await getDb();
  const { where, params } = periodWhere(period, customStart, customEnd);
  const rows = await database.getAllAsync<{
    invoice_number: string;
    created_at: string;
    product_name: string;
    quantity: number;
    product_unit: string | null;
    unit_price: number;
    buy_price: number;
    discount_amount: number;
    subtotal: number;
  }>(
    `SELECT t.invoice_number, t.created_at, ti.product_name, ti.quantity,
            p.unit AS product_unit, ti.unit_price,
            CASE WHEN ti.buy_price_snapshot > 0 THEN ti.buy_price_snapshot ELSE p.buy_price END AS buy_price,
            ti.discount_amount, ti.subtotal
     FROM transaction_items ti
     JOIN transactions t ON t.id = ti.transaction_id
     LEFT JOIN products p ON p.id = ti.product_id
     WHERE t.status = 'PAID' ${where}
     ORDER BY t.created_at ASC, t.id ASC, ti.id ASC`,
    params,
  );
  return rows.map((r) => ({
    ...r,
    product_unit: r.product_unit ?? "",
    laba: Math.max(
      (r.unit_price - r.buy_price) * r.quantity - r.discount_amount,
      0,
    ),
  }));
}

export type ExportExpenseRow = {
  id: number;
  expense_date: string;
  category: string;
  description: string;
  amount: number;
};

export async function getExportExpenses(
  period: ReportPeriod,
  customStart?: string,
  customEnd?: string,
): Promise<ExportExpenseRow[]> {
  const database = await getDb();
  const { where, vals } = expensePeriodWhere(period, customStart, customEnd);
  return await database.getAllAsync<ExportExpenseRow>(
    "SELECT id, expense_date, category, description, amount FROM expenses" +
      where +
      " ORDER BY expense_date ASC, id ASC",
    vals,
  );
}

export type ExportProductRow = {
  product_id: number;
  product_name: string;
  product_unit: string | null;
  quantity: number;
  omzet: number;
  labaKotor: number;
};

export async function getExportProducts(
  period: ReportPeriod,
  customStart?: string,
  customEnd?: string,
): Promise<ExportProductRow[]> {
  const database = await getDb();
  const { where, params } = periodWhere(period, customStart, customEnd);
  const rows = await database.getAllAsync<{
    product_id: number | null;
    product_name: string;
    product_unit: string | null;
    quantity: number;
    omzet: number;
    labaKotor: number;
  }>(
    `SELECT ti.product_id,
            MAX(ti.product_name) AS product_name,
            MAX(p.unit) AS product_unit,
            SUM(ti.quantity) AS quantity,
            SUM(ti.total) AS omzet,
            SUM((ti.unit_price - CASE WHEN ti.buy_price_snapshot > 0 THEN ti.buy_price_snapshot ELSE p.buy_price END) * ti.quantity - ti.discount_amount) AS labaKotor
     FROM transaction_items ti
     JOIN transactions t ON t.id = ti.transaction_id
     LEFT JOIN products p ON p.id = ti.product_id
     WHERE t.status = 'PAID' ${where}
     GROUP BY ti.product_id
     ORDER BY quantity DESC`,
    params,
  );
  return rows.map((r) => ({
    product_id: r.product_id ?? 0,
    product_name: r.product_name,
    product_unit: r.product_unit ?? "",
    quantity: r.quantity,
    omzet: r.omzet,
    labaKotor: Math.max(r.labaKotor ?? 0, 0),
  }));
}

export type ExportSummaryReport = ReportSummary & {
  totalDiskon: number;
};

export async function getExportSummaryReport(
  period: ReportPeriod,
  customStart?: string,
  customEnd?: string,
): Promise<ExportSummaryReport> {
  const database = await getDb();
  const summary = await getReportSummary(period, customStart, customEnd);
  const { where, params } = periodWhere(period, customStart, customEnd);
  const diskonRow = await database.getFirstAsync<{ v: number }>(
    `SELECT COALESCE(SUM(t.discount_amount), 0) as v FROM transactions t WHERE t.status = 'PAID' ${where}`,
    params,
  );
  return { ...summary, totalDiskon: diskonRow?.v ?? 0 };
}

// ---------------------------------------------------------------------------
// Backup helpers
// ---------------------------------------------------------------------------

export type BackupTableData = {
  table: string;
  columns: string[];
  rows: Record<string, unknown>[];
};

export const BACKUP_TABLES: readonly string[] = [
  "users",
  "store",
  "categories",
  "products",
  "customers",
  "discounts",
  "discount_products",
  "wholesale_prices",
  "transactions",
  "transaction_items",
  "transaction_payments",
  "stock_movements",
  "expenses",
  "consignors",
  "consignments",
  "piutang",
  "piutang_payments",
];

export async function getBackupData(): Promise<BackupTableData[]> {
  const database = await getDb();
  const tables: BackupTableData[] = [];
  for (const table of BACKUP_TABLES) {
    const exists = await database.getFirstAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
      [table],
    );
    if (!exists) continue;
    const colRows = await database.getAllAsync<{ name: string }>(
      `PRAGMA table_info(${table})`,
    );
    const columns = colRows.map((c) => c.name);
    const rows = await database.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM ${table}`,
    );
    tables.push({ table, columns, rows });
  }
  return tables;
}

/**
 * Urutan hapus: child dulu baru parent (aman relasi FK).
 * Urutan insert = BACKUP_TABLES (parent dulu baru child).
 */
const BACKUP_DELETE_ORDER: readonly string[] = [...BACKUP_TABLES].reverse();

async function tableExists(
  database: SQLite.SQLiteDatabase,
  name: string,
): Promise<boolean> {
  const row = await database.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
    [name],
  );
  return !!row;
}

async function withForeignKeysOff<T>(
  database: SQLite.SQLiteDatabase,
  fn: () => Promise<T>,
): Promise<T> {
  const fkRow = await database.getFirstAsync<{ foreign_keys: number }>(
    "PRAGMA foreign_keys",
  );
  const wasOn = fkRow?.foreign_keys === 1;
  if (wasOn) {
    await database.execAsync("PRAGMA foreign_keys = OFF");
  }
  try {
    return await fn();
  } finally {
    if (wasOn) {
      await database.execAsync("PRAGMA foreign_keys = ON");
    }
  }
}

export type RestoreResult = {
  tableCount: number;
  rowCount: number;
  tables: string[];
};

/**
 * Restore seluruh data dari backup ke SQLite di dalam satu transaksi.
 * Hanya tabel yang ada di dalam file backup yang diganti isinya.
 * Jika terjadi error, transaksi di-rollback (tidak ada restore sebagian).
 */
export async function restoreFromBackup(
  tables: BackupTableData[],
): Promise<RestoreResult> {
  const database = await getDb();

  // Simpan daftar tabel yang valid & ada di target DB
  const restoreTargets: { data: BackupTableData; columns: string[] }[] = [];
  for (const data of tables) {
    if (!BACKUP_TABLES.includes(data.table)) continue;
    if (!(await tableExists(database, data.table))) continue;
    const colRows = await database.getAllAsync<{ name: string }>(
      `PRAGMA table_info("${data.table}")`,
    );
    restoreTargets.push({ data, columns: colRows.map((c) => c.name) });
  }

  let rowCount = 0;

  await withForeignKeysOff(database, async () => {
    await database.withTransactionAsync(async () => {
      // 1. Hapus data lama untuk tabel yang akan direstore (child dulu)
      for (const table of BACKUP_DELETE_ORDER) {
        if (restoreTargets.some((t) => t.data.table === table)) {
          await database.execAsync(`DELETE FROM "${table}"`);
        }
      }

      // 2. Insert data backup (parent dulu, urutan = BACKUP_TABLES)
      for (const table of BACKUP_TABLES) {
        const target = restoreTargets.find((t) => t.data.table === table);
        if (!target) continue;
        const { data, columns: targetColumns } = target;
        const cols = data.columns.filter((c) => targetColumns.includes(c));
        if (cols.length === 0) continue;

        const placeholders = cols.map(() => "?").join(",");
        const colList = cols.map((c) => `"${c}"`).join(",");
        for (const rowData of data.rows) {
          const vals = cols.map((c) => rowData[c] ?? null);
          const res = await database.runAsync(
            `INSERT OR REPLACE INTO "${table}" (${colList}) VALUES (${placeholders})`,
            vals as SQLite.SQLiteBindValue[],
          );
          rowCount += res.changes;
        }
      }
    });
  });

  return {
    tableCount: restoreTargets.length,
    rowCount,
    tables: restoreTargets.map((t) => t.data.table),
  };
}

const RESET_TABLES: readonly string[] = [
  "piutang_payments",
  "piutang",
  "transaction_items",
  "transaction_payments",
  "stock_movements",
  "discount_products",
  "consignments",
  "wholesale_prices",
  "transactions",
  "expenses",
  "discounts",
  "products",
  "customers",
  "categories",
  "consignors",
];

/**
 * Reset seluruh data operasional (transaksi, produk, kategori, pelanggan,
 * diskon, pengeluaran, konsinyasi, dll.) di dalam satu transaksi.
 *
 * Struktur tabel TIDAK dihapus. Data users (login owner) dan store
 * (informasi toko) dipertahankan agar aplikasi tetap dapat digunakan.
 */
export async function resetAllData(): Promise<void> {
  const database = await getDb();
  await withForeignKeysOff(database, async () => {
    await database.withTransactionAsync(async () => {
      for (const table of RESET_TABLES) {
        if (await tableExists(database, table)) {
          await database.execAsync(`DELETE FROM "${table}"`);
        }
      }
    });
  });
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
  product_id: number;
  product_name: string;
  qty: number;
  total: number;
  has_wholesale: number;
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
    `SELECT ti.product_id, ti.product_name, SUM(ti.quantity) as qty, SUM(ti.subtotal) as total,
            CASE WHEN wp.id IS NOT NULL THEN 1 ELSE 0 END as has_wholesale
     FROM transaction_items ti
     JOIN transactions t ON t.id = ti.transaction_id
     LEFT JOIN wholesale_prices wp ON wp.product_id = ti.product_id
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
  pricing_type?: string;
  wholesale_price_snapshot?: number;
  wholesale_min_qty_snapshot?: number;
  consignment_id?: number | null;
  consignor_id?: number | null;
  consignor_price_snapshot?: number;
  consignor_profit_snapshot?: number;
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
    `SELECT product_name, unit_price, quantity, subtotal, discount_id, discount_name, discount_amount, total, pricing_type, wholesale_price_snapshot, wholesale_min_qty_snapshot, consignment_id, consignor_id, consignor_price_snapshot, consignor_profit_snapshot
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
// Piutang helpers
// ---------------------------------------------------------------------------

export type PiutangStatus = "OPEN" | "PARTIAL" | "PAID";

export type Piutang = {
  id: number;
  transaction_id: number;
  customer_id: number | null;
  customer_name: string;
  invoice_number: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  due_date: string | null;
  status: PiutangStatus;
  created_at: string;
  updated_at: string;
};

export type PiutangListItem = Piutang & {
  has_overdue: boolean;
};

export type PiutangSummary = {
  totalPiutang: number;
  belumDibayar: number;
  jatuhTempo: number;
  jumlahPelangganPiutang: number;
};

export type PiutangPaymentRow = {
  id: number;
  amount: number;
  method: string;
  note: string | null;
  created_at: string;
};

export type PiutangDetail = Piutang & {
  items: TransactionDetailItem[];
  payments: PiutangPaymentRow[];
};

export async function getPiutangList(): Promise<PiutangListItem[]> {
  const database = await getDb();
  const today = todayStr();
  const rows = await database.getAllAsync<PiutangListItem>(
    `SELECT *
     FROM piutang
     ORDER BY
       CASE WHEN remaining_amount > 0 AND due_date IS NOT NULL AND due_date < ? THEN 0 ELSE 1 END ASC,
       created_at DESC`,
    [today],
  );
  for (const r of rows) {
    r.has_overdue =
      r.remaining_amount > 0 &&
      !!r.due_date &&
      r.due_date < new Date().toISOString().slice(0, 10);
  }
  return rows;
}

export async function getPiutangSummary(): Promise<PiutangSummary> {
  const database = await getDb();
  const today = todayStr();

  const totalRow = await database.getFirstAsync<{ v: number }>(
    "SELECT COALESCE(SUM(total_amount), 0) as v FROM piutang WHERE status <> 'PAID'",
  );
  const belumRow = await database.getFirstAsync<{ v: number }>(
    "SELECT COALESCE(SUM(remaining_amount), 0) as v FROM piutang WHERE remaining_amount > 0",
  );
  const jatuhRow = await database.getFirstAsync<{ v: number }>(
    `SELECT COALESCE(SUM(remaining_amount), 0) as v
     FROM piutang
     WHERE remaining_amount > 0 AND due_date IS NOT NULL AND due_date < ?`,
    [today],
  );
  const custRow = await database.getFirstAsync<{ v: number }>(
    `SELECT COUNT(DISTINCT customer_id) as v
     FROM piutang
     WHERE remaining_amount > 0 AND customer_id IS NOT NULL`,
  );

  return {
    totalPiutang: totalRow?.v ?? 0,
    belumDibayar: belumRow?.v ?? 0,
    jatuhTempo: jatuhRow?.v ?? 0,
    jumlahPelangganPiutang: custRow?.v ?? 0,
  };
}

export async function getPiutangById(id: number): Promise<Piutang | null> {
  const database = await getDb();
  return await database.getFirstAsync<Piutang>(
    "SELECT * FROM piutang WHERE id = ?",
    [id],
  );
}

export async function getPiutangDetail(
  id: number,
): Promise<PiutangDetail | null> {
  const database = await getDb();
  const piutang = await getPiutangById(id);
  if (!piutang) return null;

  const items = await database.getAllAsync<TransactionDetailItem>(
    `SELECT product_name, unit_price, quantity, subtotal, discount_id, discount_name, discount_amount, total, pricing_type, wholesale_price_snapshot, wholesale_min_qty_snapshot, consignment_id, consignor_id, consignor_price_snapshot, consignor_profit_snapshot
     FROM transaction_items WHERE transaction_id = ?
     ORDER BY id ASC`,
    [piutang.transaction_id],
  );

  const payments = await database.getAllAsync<PiutangPaymentRow>(
    `SELECT id, amount, method, note, created_at
     FROM piutang_payments
     WHERE piutang_id = ?
     ORDER BY created_at ASC, id ASC`,
    [id],
  );

  // Pastikan pembayaran awal saat checkout (jika ada) masuk ke riwayat
  if (piutang.paid_amount > 0 && payments.length === 0) {
    payments.unshift({
      id: 0,
      amount: piutang.paid_amount,
      method: "hutang",
      note: "Pembayaran awal saat checkout",
      created_at: piutang.created_at,
    });
  }

  return { ...piutang, items, payments };
}

export type PayPiutangResult = {
  piutangId: number;
  remaining: number;
  status: PiutangStatus;
};

/**
 * Perbarui tanggal jatuh tempo piutang.
 */
export async function updatePiutangDueDate(
  piutangId: number,
  dueDate: string,
): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    `UPDATE piutang
     SET due_date = ?, updated_at = datetime('now','localtime')
     WHERE id = ?`,
    [dueDate, piutangId],
  );
}

/**
 * Bayar piutang (sebagian atau lunas) dalam satu transaksi.
 * Memperbarui piutang, mencatat piutang_payments, dan
 * menyinkronkan paid_amount/status pada transaksi asal.
 */
export async function payPiutang(
  piutangId: number,
  amount: number,
  options?: { method?: string; note?: string },
): Promise<PayPiutangResult> {
  const database = await getDb();
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Nominal pembayaran harus lebih dari 0");
  }

  let result!: PayPiutangResult;

  await database.withTransactionAsync(async () => {
    const piutang = await database.getFirstAsync<Piutang>(
      "SELECT * FROM piutang WHERE id = ?",
      [piutangId],
    );
    if (!piutang) throw new Error("Piutang tidak ditemukan");
    if (piutang.status === "PAID" || piutang.remaining_amount <= 0) {
      throw new Error("Piutang ini sudah lunas");
    }
    if (amount > piutang.remaining_amount) {
      throw new Error(
        `Nominal melebihi sisa piutang (sisa ${piutang.remaining_amount})`,
      );
    }

    const newPaid = piutang.paid_amount + amount;
    const newRemaining = piutang.remaining_amount - amount;
    const newStatus: PiutangStatus = newRemaining <= 0 ? "PAID" : "PARTIAL";

    await database.runAsync(
      `UPDATE piutang
       SET paid_amount = ?, remaining_amount = ?, status = ?, updated_at = datetime('now','localtime')
       WHERE id = ?`,
      [newPaid, newRemaining, newStatus, piutangId],
    );

    await database.runAsync(
      `INSERT INTO piutang_payments (piutang_id, amount, method, note)
       VALUES (?, ?, ?, ?)`,
      [piutangId, amount, options?.method ?? "tunai", options?.note ?? null],
    );

    // Sinkronkan transaksi asal
    const txNewPaid = Math.min(
      piutang.paid_amount + amount,
      piutang.total_amount,
    );
    const txStatus =
      txNewPaid >= piutang.total_amount
        ? "PAID"
        : txNewPaid > 0
          ? "PARTIAL"
          : "UNPAID";
    await database.runAsync(
      `UPDATE transactions
       SET paid_amount = ?, status = ?, change_amount = 0
       WHERE id = ?`,
      [txNewPaid, txStatus, piutang.transaction_id],
    );

    await database.runAsync(
      `INSERT INTO transaction_payments (transaction_id, method, amount, reference)
       VALUES (?, 'piutang', ?, ?)`,
      [piutang.transaction_id, amount, piutang.invoice_number],
    );

    result = { piutangId, remaining: newRemaining, status: newStatus };
  });

  return result;
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
  pengeluaran: number;
  labaBersih: number;
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
    `SELECT COALESCE(SUM(ti.quantity * CASE WHEN ti.buy_price_snapshot > 0 THEN ti.buy_price_snapshot ELSE p.buy_price END), 0) as v
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

  // Pengeluaran hari ini (berdasarkan expense_date)
  const pengeluaran = await getTotalExpensesByPeriod({
    period: "Hari Ini",
  });
  const labaBersih = labaKotor - pengeluaran;

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
    pengeluaran,
    labaBersih,
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
