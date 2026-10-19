/**
 * Encoder CODE128 subset B murni (tanpa dependensi).
 *
 * Dipakai untuk preview barcode label harga di aplikasi.
 * (Untuk cetak ke printer thermal, barcode dibuat oleh firmware printer
 * via perintah ESC/POS `GS k 73` — lihat `lib/label-print.ts`.)
 *
 * Tabel pola diambil dari JsBarcode (MIT):
 * 107 simbol (103 data + 3 start + 1 stop), tiap simbol = 11 modul
 * ("1" = bar hitam, "0" = spasi putih), stop = 13 modul.
 */

// Pola bar per indeks simbol (0-106). Indeks 103/104/105 = Start A/B/C,
// indeks 106 = Stop.
const BARS: readonly string[] = [
  "11011001100", "11001101100", "11001100110", "10010011000", "10010001100",
  "10001001100", "10011001000", "10011000100", "10001100100", "11001001000",
  "11001000100", "11000100100", "10110011100", "10011011100", "10011001110",
  "10111001100", "10011101100", "10011100110", "11001110010", "11001011100",
  "11001001110", "11011100100", "11001110100", "11101101110", "11101001100",
  "11100101100", "11100100110", "11101100100", "11100110100", "11100110010",
  "11011011000", "11011000110", "11000110110", "10100011000", "10001011000",
  "10001000110", "10110001000", "10001101000", "10001100010", "11010001000",
  "11000101000", "11000100010", "10110111000", "10110001110", "10001101110",
  "10111011000", "10111000110", "10001110110", "11101110110", "11010001110",
  "11000101110", "11011101000", "11011100010", "11011101110", "11101011000",
  "11101000110", "11100010110", "11101101000", "11101100010", "11100011010",
  "11101111010", "11001000010", "11110001010", "10100110000", "10100001100",
  "10010110000", "10010000110", "10000101100", "10000100110", "10110010000",
  "10110000100", "10011010000", "10011000010", "10000110100", "10000110010",
  "11000010010", "11001010000", "11110111010", "11000010100", "10001111010",
  "10100111100", "10010111100", "10010011110", "10111100100", "10011110100",
  "10011110010", "11110100100", "11110010100", "11110010010", "11011011110",
  "11011110110", "11110110110", "10101111000", "10100011110", "10001011110",
  "10111101000", "10111100010", "11110101000", "11110100010", "10111011110",
  "10111101110", "11101011110", "11110101110", "11010000100", "11010010000",
  "11010011100", "1100011101011",
];

const START_B = 104;
const STOP = 106;
const MODULO = 103;

export type Code128Bar = { x: number; width: number };

/** Cek apakah string bisa di-encode sebagai CODE128-B (ASCII 32-126/127). */
export function isCode128BEncodable(data: string): boolean {
  if (data.length === 0) return false;
  for (let i = 0; i < data.length; i++) {
    const code = data.charCodeAt(i);
    if (code < 32 || code > 127) return false;
  }
  return true;
}

/**
 * Encode string menjadi rangkaian bit CODE128-B
 * ("1" = modul hitam, "0" = modul putih).
 * Throw jika ada karakter di luar ASCII 32-127.
 */
export function encodeCode128B(data: string): string {
  if (!isCode128BEncodable(data)) {
    throw new Error(
      "Barcode hanya mendukung karakter ASCII 32-127 untuk CODE128-B",
    );
  }

  let bits = BARS[START_B];
  let checksum = START_B;

  for (let pos = 0; pos < data.length; pos++) {
    const index = data.charCodeAt(pos) - 32;
    bits += BARS[index];
    checksum += index * (pos + 1);
  }

  bits += BARS[checksum % MODULO];
  bits += BARS[STOP];
  return bits;
}

/**
 * Ubah rangkaian bit menjadi daftar bar (x + lebar dalam modul)
 * siap digambar sebagai Rect SVG.
 */
export function bitsToBars(bits: string): Code128Bar[] {
  const bars: Code128Bar[] = [];
  let i = 0;
  while (i < bits.length) {
    if (bits[i] === "1") {
      const start = i;
      while (i < bits.length && bits[i] === "1") i++;
      bars.push({ x: start, width: i - start });
    } else {
      i++;
    }
  }
  return bars;
}
