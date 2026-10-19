import {
  isBluetoothEnabled,
  getBondedDevices,
  Printer,
  type BluetoothDevice,
} from "expo-bluetooth-thermal-printer";
import { Platform, PermissionsAndroid } from "react-native";
import {
  loadPrinterConfig,
  savePrinterConfig,
  type PaperWidth,
} from "@/lib/printer-config";

export type { BluetoothDevice };

let activePrinter: Printer | null = null;
let isPrinting = false;

export function isPrintingActive(): boolean {
  return isPrinting;
}

/**
 * Run a print task guarded by a single-flight lock.
 * Returns true if the task was executed; false if another print is already
 * in progress (the request is ignored, not queued).
 */
export async function runWithPrintLock(
  task: () => Promise<void>,
): Promise<boolean> {
  if (isPrinting) return false;
  isPrinting = true;
  try {
    await task();
    return true;
  } finally {
    isPrinting = false;
  }
}

async function requestBluetoothPermissions(): Promise<boolean> {
  if (Platform.OS !== "android") return true;
  if (Platform.Version < 31) return true;

  const result = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  ]);

  return (
    result["android.permission.BLUETOOTH_SCAN"] ===
      PermissionsAndroid.RESULTS.GRANTED &&
    result["android.permission.BLUETOOTH_CONNECT"] ===
      PermissionsAndroid.RESULTS.GRANTED
  );
}

export async function checkBluetoothEnabled(): Promise<boolean> {
  try {
    return isBluetoothEnabled();
  } catch {
    return false;
  }
}

export async function scanPairedDevices(): Promise<BluetoothDevice[]> {
  const hasPermission = await requestBluetoothPermissions();
  if (!hasPermission) throw new Error("Izin Bluetooth ditolak");

  if (!isBluetoothEnabled()) {
    throw new Error("Bluetooth tidak aktif. Aktifkan Bluetooth di pengaturan.");
  }

  return getBondedDevices();
}

export async function connectPrinter(
  deviceAddress: string,
  paperWidth: PaperWidth = "58mm",
): Promise<void> {
  if (activePrinter) {
    activePrinter.disconnect();
    activePrinter = null;
  }

  const printer = new Printer(paperWidth);
  await printer.connect(deviceAddress);
  activePrinter = printer;

  await savePrinterConfig({
    deviceAddress,
    paperWidth,
  });
}

export async function disconnectPrinter(): Promise<void> {
  if (activePrinter) {
    activePrinter.disconnect();
    activePrinter = null;
  }
  await savePrinterConfig({ deviceAddress: null, deviceName: null });
}

export function isPrinterConnected(): boolean {
  return activePrinter !== null;
}

export function getActivePrinter(): Printer | null {
  return activePrinter;
}

export async function reconnectLastPrinter(): Promise<boolean> {
  const config = await loadPrinterConfig();
  if (!config.deviceAddress || !config.autoConnect) return false;

  try {
    const hasPermission = await requestBluetoothPermissions();
    if (!hasPermission) return false;
    if (!isBluetoothEnabled()) return false;

    await connectPrinter(config.deviceAddress, config.paperWidth);
    return true;
  } catch {
    return false;
  }
}

export async function printTestReceipt(): Promise<void> {
  if (!activePrinter) throw new Error("Printer tidak terhubung");
  if (isPrinting) throw new Error("Sedang mencetak struk lain, tunggu sebentar");

  await runWithPrintLock(async () => {
    await activePrinter!.initialize();
    await activePrinter!.alignCenter();
    await activePrinter!.bold(true);
    await activePrinter!.println("UMKM POS");
    await activePrinter!.bold(false);
    await activePrinter!.separator();
    await activePrinter!.println("Struk Test");
    await activePrinter!.println(new Date().toLocaleString("id-ID"));
    await activePrinter!.separator();
    await activePrinter!.alignLeft();
    await activePrinter!.row("Kopi Susu", "18.000");
    await activePrinter!.row("Teh Manis", "8.000");
    await activePrinter!.separator();
    await activePrinter!.bold(true);
    await activePrinter!.row("TOTAL", "26.000");
    await activePrinter!.bold(false);
    await activePrinter!.feed(4);
  });
}
