import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "warungku_printer_config";

export type PaperWidth = "58mm" | "80mm";

export type PrinterConfig = {
  deviceAddress: string | null;
  deviceName: string | null;
  paperWidth: PaperWidth;
  autoConnect: boolean;
};

const DEFAULT_CONFIG: PrinterConfig = {
  deviceAddress: null,
  deviceName: null,
  paperWidth: "58mm",
  autoConnect: true,
};

export async function loadPrinterConfig(): Promise<PrinterConfig> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function savePrinterConfig(
  config: Partial<PrinterConfig>,
): Promise<void> {
  const current = await loadPrinterConfig();
  const merged = { ...current, ...config };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
}

export async function clearPrinterConfig(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
