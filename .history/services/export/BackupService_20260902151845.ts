import { File, Paths } from "expo-file-system";
import * as XLSX from "xlsx";

import type { BackupTableData } from "@/lib/database";

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function sanitizeSheetName(name: string): string {
  return name.replace(/[\\/?*\[\]:]/g, "").slice(0, 31);
}

function guessWidth(vals: unknown[]): number {
  let max = 8;
  for (const v of vals) {
    if (v == null) continue;
    const len = String(v).length;
    if (len > max) max = len;
  }
  return Math.min(max + 2, 40);
}

export type BackupResult = {
  uri: string;
  name: string;
  tableCount: number;
  rowCount: number;
};

export async function exportBackupToExcel(
  tables: BackupTableData[],
): Promise<BackupResult> {
  const wb = XLSX.utils.book_new();

  let totalRows = 0;
  for (const t of tables) {
    const aoa: unknown[][] = [t.columns];
    for (const row of t.rows) {
      aoa.push(t.columns.map((c) => row[c] ?? null));
    }
    totalRows += t.rows.length;

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    ws["!cols"] = t.columns.map((col, ci) => {
      const colVals = aoa.map((r) => r[ci]);
      return { wch: guessWidth(colVals) };
    });

    XLSX.utils.book_append_sheet(wb, ws, sanitizeSheetName(t.table));
  }

  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const bytes = new Uint8Array(buffer);

  const fileName = `Warungku_Backup_${todayIso()}.xlsx`;
  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true, intermediates: true });
  file.write(bytes);

  return { uri: file.uri, name: fileName, tableCount: tables.length, rowCount: totalRows };
}

export type ParsedBackupSheet = {
  table: string;
  rowCount: number;
};

/**
 * Baca file backup .xlsx (buatan fitur Backup) menjadi data tabel.
 * Setiap sheet dibaca sebagai satu tabel (kolom = baris pertama).
 */
export async function parseBackupFile(
  uri: string,
): Promise<BackupTableData[]> {
  const file = new File(uri);
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(new Uint8Array(buffer), { type: "array" });

  const result: BackupTableData[] = [];
  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: null,
      blankrows: false,
    });
    if (!rows || rows.length === 0) continue;
    const columns = rows[0].map((v) => String(v ?? ""));
    const dataRows = rows
      .slice(1)
      .filter((r) => (r ?? []).some((c) => c !== null && c !== ""));
    result.push({
      table: name,
      columns,
      rows: dataRows.map((r) => {
        const obj: Record<string, unknown> = {};
        columns.forEach((c, i) => {
          obj[c] = r[i] ?? null;
        });
        return obj;
      }),
    });
  }
  return result;
}
