import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parse angka yang diketik user. Koma dan titik sama-sama diterima sebagai
 * pemisah desimal, tetapi pemisah ribuan tidak diterima agar input ambigu
 * seperti "1.000,5" tidak salah dibaca sebagai angka lain.
 */
export function parseDecimalInput(value: string): number | null {
  const normalized = value.trim().replace(',', '.')
  if (!/^\d+(?:\.\d{0,3})?$/.test(normalized)) return null

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

export function formatDecimal(value: number): string {
  return value.toLocaleString('id-ID', {maximumFractionDigits: 3})
}
