'use client';

import React, {useMemo, useState} from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type {Transaction} from '../lib/types';
import {formatDecimal} from '../lib/utils';

interface ReportsProps {
  transactions: Transaction[];
}

type Granularity = 'day' | 'week' | 'month' | 'year';

const GRANULARITY_LABEL: Record<Granularity, string> = {
  day: 'Harian',
  week: 'Mingguan',
  month: 'Bulanan',
  year: 'Tahunan',
};

interface Bucket {
  key: string;
  label: string;
  fullLabel: string;
  total: number;
  profit: number;
  count: number;
}

// ---------------------------------------------------------------------------
// Helper tanggal (semua lokal, format YYYY-MM-DD)
// ---------------------------------------------------------------------------

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayISO(): string {
  return toISO(new Date());
}

function parseLocal(iso: string): Date | null {
  const [y, m, d] = iso.split('-').map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  return new Date(y, m - 1, d);
}

function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

/** Senin sebagai awal minggu (standar Indonesia). */
function startOfWeekMonday(d: Date): Date {
  const c = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const offset = (c.getDay() + 6) % 7;
  c.setDate(c.getDate() - offset);
  c.setHours(0, 0, 0, 0);
  return c;
}

function shortRp(v: number): string {
  if (Math.abs(v) >= 1_000_000_000) return `${(v / 1_000_000_000).toLocaleString('id-ID', {maximumFractionDigits: 1})} M`;
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toLocaleString('id-ID', {maximumFractionDigits: 1})} jt`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toLocaleString('id-ID', {maximumFractionDigits: 1})} rb`;
  return String(v);
}

function prettyDate(iso: string): string {
  const d = parseLocal(iso);
  if (!d) return iso;
  return d.toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'});
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('id-ID', {month: 'short', year: 'numeric'});
}

/** Bangun kerangka bucket kosong dari rentang + granularitas. */
function buildBuckets(fromISO: string, toISODate: string, g: Granularity): Bucket[] {
  const from = parseLocal(fromISO);
  const to = parseLocal(toISODate);
  if (!from || !to || from > to) return [];

  const out: Bucket[] = [];
  if (g === 'day') {
    for (let d = new Date(from); d <= to; d = addDays(d, 1)) {
      const key = toISO(d);
      out.push({
        key,
        label: d.toLocaleDateString('id-ID', {day: 'numeric', month: 'numeric'}),
        fullLabel: d.toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'}),
        total: 0,
        profit: 0,
        count: 0,
      });
    }
  } else if (g === 'week') {
    for (let s = startOfWeekMonday(from); s <= to; s = addDays(s, 7)) {
      const e = addDays(s, 6);
      const key = toISO(s);
      const label = `${s.getDate()}/${s.getMonth() + 1}`;
      const fullLabel = `${s.toLocaleDateString('id-ID', {day: 'numeric', month: 'short'})} – ${e.toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'})}`;
      out.push({key, label, fullLabel, total: 0, profit: 0, count: 0});
    }
  } else if (g === 'month') {
    const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
    const end = new Date(to.getFullYear(), to.getMonth(), 1);
    while (cursor <= end) {
      const key = monthKey(cursor);
      out.push({key, label: monthLabel(key), fullLabel: monthLabel(key), total: 0, profit: 0, count: 0});
      cursor.setMonth(cursor.getMonth() + 1);
    }
  } else {
    for (let y = from.getFullYear(); y <= to.getFullYear(); y++) {
      out.push({key: String(y), label: String(y), fullLabel: `Tahun ${y}`, total: 0, profit: 0, count: 0});
    }
  }
  return out;
}

/** Tentukan bucket key sebuah transaksi sesuai granularitas. */
function bucketKeyFor(dateISO: string, g: Granularity): string | null {
  const d = parseLocal(dateISO);
  if (!d) return null;
  if (g === 'day') return toISO(d);
  if (g === 'week') return toISO(startOfWeekMonday(d));
  if (g === 'month') return monthKey(d);
  return String(d.getFullYear());
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadCSV(filename: string, header: string[], rows: (string | number)[][]) {
  const csv = [header, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n');
  const blob = new Blob(['\uFEFF' + csv], {type: 'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Laporan penjualan detail: grafik + KPI + breakdown produk + tabel.
 * Profit memakai snapshot harga & modal di transaksi.
 */
export default function Reports({transactions}: Readonly<ReportsProps>) {
  const today = useMemo(() => todayISO(), []);
  const minTxDate = useMemo(() => {
    let min: string | null = null;
    for (const tx of transactions) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(tx.date)) continue;
      if (min === null || tx.date < min) min = tx.date;
    }
    return min;
  }, [transactions]);

  const defaultFrom = useMemo(() => {
    const t = parseLocal(today);
    if (!t) return today;
    return toISO(addDays(t, -29));
  }, [today]);

  const [granularity, setGranularity] = useState<Granularity>('day');
  const [from, setFrom] = useState<string>(defaultFrom);
  const [to, setTo] = useState<string>(today);
  const [activePreset, setActivePreset] = useState<string>('30d');
  const [showAllTx, setShowAllTx] = useState(false);

  // Sinkronkan default saat data pertama kali siap (tanpa menimpa pilihan user).
  const [initialized, setInitialized] = useState(false);
  React.useEffect(() => {
    if (!initialized) {
      setFrom(defaultFrom);
      setTo(today);
      setInitialized(true);
    }
  }, [defaultFrom, today, initialized]);

  function applyPreset(name: string) {
    const t = parseLocal(today) ?? new Date();
    const iso = (d: Date) => toISO(d);
    setActivePreset(name);
    setShowAllTx(false);
    if (name === 'today') {
      setFrom(today);
      setTo(today);
      setGranularity('day');
    } else if (name === '7d') {
      setFrom(iso(addDays(t, -6)));
      setTo(today);
      setGranularity('day');
    } else if (name === '30d') {
      setFrom(iso(addDays(t, -29)));
      setTo(today);
      setGranularity('day');
    } else if (name === '90d') {
      setFrom(iso(addDays(t, -89)));
      setTo(today);
      setGranularity('week');
    } else if (name === 'month') {
      setFrom(iso(new Date(t.getFullYear(), t.getMonth(), 1)));
      setTo(today);
      setGranularity('day');
    } else if (name === 'year') {
      setFrom(iso(new Date(t.getFullYear(), 0, 1)));
      setTo(today);
      setGranularity('month');
    } else if (name === 'all') {
      setFrom(minTxDate ?? iso(addDays(t, -364)));
      setTo(today);
      setGranularity('month');
    }
  }

  function applyMonthPicker(value: string) {
    // value: YYYY-MM
    if (!/^\d{4}-\d{2}$/.test(value)) return;
    const [y, m] = value.split('-').map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0);
    const now = parseLocal(today) ?? new Date();
    setFrom(toISO(start));
    setTo(toISO(end > now ? now : end));
    setGranularity('day');
    setActivePreset('custom');
  }

  function applyYearPicker(value: string) {
    const y = Number(value);
    if (!Number.isFinite(y) || y < 2000 || y > 2100) return;
    const now = parseLocal(today) ?? new Date();
    const endOfYear = new Date(y, 11, 31);
    setFrom(`${y}-01-01`);
    setTo(toISO(endOfYear > now ? now : endOfYear));
    setGranularity('month');
    setActivePreset('custom');
  }

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(tx.date)) return false;
      return tx.date >= from && tx.date <= to;
    });
  }, [transactions, from, to]);

  const series = useMemo(() => {
    const buckets = buildBuckets(from, to, granularity);
    const map = new Map(buckets.map((b) => [b.key, b]));
    for (const tx of filtered) {
      const key = bucketKeyFor(tx.date, granularity);
      if (!key) continue;
      // Bucket minggu/bulan bisa mulai sebelum `from`; tetap tampung agar
      // transaksi tepi tidak hilang, label dibuat dari key.
      let b = map.get(key);
      if (!b) {
        b = {
          key,
          label: granularity === 'month' ? monthLabel(key) : key,
          fullLabel: granularity === 'month' ? monthLabel(key) : key,
          total: 0,
          profit: 0,
          count: 0,
        };
        map.set(key, b);
      }
      const profit = (tx.unitPrice - tx.unitCost) * tx.quantity;
      b.total += tx.total;
      b.profit += profit;
      b.count += 1;
    }
    return Array.from(map.values()).sort((a, b) => (a.key < b.key ? -1 : 1));
  }, [filtered, from, to, granularity]);

  const totals = useMemo(() => {
    let total = 0;
    let profit = 0;
    let qty = 0;
    for (const tx of filtered) {
      total += tx.total;
      profit += (tx.unitPrice - tx.unitCost) * tx.quantity;
      qty += tx.quantity;
    }
    const count = filtered.length;
    return {total, profit, count, qty, avg: count ? total / count : 0, margin: total ? (profit / total) * 100 : 0};
  }, [filtered]);

  // Periode sebelumnya dengan panjang sama, untuk delta %.
  const prevTotals = useMemo(() => {
    const f = parseLocal(from);
    const t = parseLocal(to);
    if (!f || !t) return {total: 0, profit: 0, count: 0};
    const lenDays = Math.round((t.getTime() - f.getTime()) / 86_400_000) + 1;
    const prevTo = addDays(f, -1);
    const prevFrom = addDays(prevTo, -(lenDays - 1));
    let total = 0;
    let profit = 0;
    let count = 0;
    for (const tx of transactions) {
      const d = parseLocal(tx.date);
      if (!d) continue;
      if (d >= prevFrom && d <= prevTo) {
        total += tx.total;
        profit += (tx.unitPrice - tx.unitCost) * tx.quantity;
        count += 1;
      }
    }
    return {total, profit, count};
  }, [transactions, from, to]);

  const productRows = useMemo(() => {
    const map = new Map<string, {name: string; qty: number; omzet: number; profit: number; count: number}>();
    for (const tx of filtered) {
      const row = map.get(tx.productName) ?? {name: tx.productName, qty: 0, omzet: 0, profit: 0, count: 0};
      row.qty += tx.quantity;
      row.omzet += tx.total;
      row.profit += (tx.unitPrice - tx.unitCost) * tx.quantity;
      row.count += 1;
      map.set(tx.productName, row);
    }
    return Array.from(map.values()).sort((a, b) => b.omzet - a.omzet);
  }, [filtered]);

  const sortedTx = useMemo(() => [...filtered].sort((a, b) => (a.date < b.date ? 1 : -1)), [filtered]);
  const visibleTx = showAllTx ? sortedTx : sortedTx.slice(0, 50);

  const rangeDays = useMemo(() => {
    const f = parseLocal(from);
    const t = parseLocal(to);
    if (!f || !t || t < f) return 0;
    return Math.round((t.getTime() - f.getTime()) / 86_400_000) + 1;
  }, [from, to]);

  function pctChange(curr: number, prev: number): string | null {
    if (prev === 0) return curr > 0 ? '+100%' : null;
    const p = ((curr - prev) / Math.abs(prev)) * 100;
    const sign = p > 0 ? '+' : '';
    return `${sign}${p.toLocaleString('id-ID', {maximumFractionDigits: 1})}%`;
  }

  const invalidRange = !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to;

  const presets: {id: string; label: string}[] = [
    {id: 'today', label: 'Hari ini'},
    {id: '7d', label: '7 hari'},
    {id: '30d', label: '30 hari'},
    {id: '90d', label: '90 hari'},
    {id: 'month', label: 'Bulan ini'},
    {id: 'year', label: 'Tahun ini'},
    {id: 'all', label: 'Semua'},
  ];

  return (
    <section className="mb-8">
      <h2 className="text-2xl font-semibold mb-6 border-b border-gray-300 pb-2">Sales Reports</h2>

      {/* ---- Kontrol periode ---- */}
      <div className="border rounded-lg p-4 mb-6 bg-gray-50 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold mr-1">Tampilan:</span>
          {(Object.keys(GRANULARITY_LABEL) as Granularity[]).map((g) => (
            <button
              key={g}
              onClick={() => setGranularity(g)}
              className={`px-3 py-1.5 rounded text-sm font-semibold border transition ${
                granularity === g ? 'bg-black text-white border-black' : 'bg-white border-gray-300 hover:bg-gray-100'
              }`}
            >
              {GRANULARITY_LABEL[g]}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold mr-1">Cepat:</span>
          {presets.map((p) => (
            <button
              key={p.id}
              onClick={() => applyPreset(p.id)}
              className={`px-3 py-1.5 rounded text-sm border transition ${
                activePreset === p.id ? 'bg-black text-white border-black font-semibold' : 'bg-white border-gray-300 hover:bg-gray-100'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-3 text-sm">
          <label className="flex flex-col gap-1">
            <span className="font-semibold">Dari tanggal</span>
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => {
                setFrom(e.target.value);
                setActivePreset('custom');
                setShowAllTx(false);
              }}
              className="border border-gray-300 rounded px-2 py-1.5 bg-white"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-semibold">Sampai tanggal</span>
            <input
              type="date"
              value={to}
              min={from}
              max={today}
              onChange={(e) => {
                setTo(e.target.value);
                setActivePreset('custom');
                setShowAllTx(false);
              }}
              className="border border-gray-300 rounded px-2 py-1.5 bg-white"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-semibold">Pilih bulan</span>
            <input
              type="month"
              onChange={(e) => applyMonthPicker(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1.5 bg-white"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-semibold">Pilih tahun</span>
            <input
              type="number"
              placeholder="2026"
              min={2000}
              max={2100}
              onBlur={(e) => e.target.value && applyYearPicker(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applyYearPicker((e.target as HTMLInputElement).value);
              }}
              className="border border-gray-300 rounded px-2 py-1.5 bg-white w-28"
            />
          </label>
          <span className="text-gray-600 ml-auto">
            {invalidRange ? 'Rentang tanggal tidak valid.' : `${prettyDate(from)} – ${prettyDate(to)} (${rangeDays} hari)`}
          </span>
        </div>
      </div>

      {/* ---- KPI ---- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          {label: 'Omzet', value: `Rp ${formatDecimal(totals.total)}`, delta: pctChange(totals.total, prevTotals.total)},
          {label: `Profit (${totals.margin.toLocaleString('id-ID', {maximumFractionDigits: 1})}% margin)`, value: `Rp ${formatDecimal(totals.profit)}`, delta: pctChange(totals.profit, prevTotals.profit)},
          {label: 'Transaksi', value: String(totals.count), delta: pctChange(totals.count, prevTotals.count)},
          {label: 'Rata-rata / transaksi', value: `Rp ${formatDecimal(Math.round(totals.avg))}`, delta: null},
        ].map((kpi) => (
          <div key={kpi.label} className="p-5 border rounded-lg shadow-sm bg-white flex flex-col">
            <span className="text-sm text-gray-600">{kpi.label}</span>
            <span className="text-2xl font-extrabold mt-1">{kpi.value}</span>
            {kpi.delta ? (
              <span className={`text-xs mt-1 font-semibold ${kpi.delta.startsWith('+') ? 'text-green-600' : kpi.delta.startsWith('-') ? 'text-red-600' : 'text-gray-500'}`}>
                {kpi.delta} vs periode sebelumnya
              </span>
            ) : (
              <span className="text-xs mt-1 text-gray-500">{totals.qty} pcs terjual</span>
            )}
          </div>
        ))}
      </div>

      {/* ---- Grafik ---- */}
      <div className="border rounded-lg p-4 mb-6 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 className="font-semibold">
            Grafik omzet & profit — {GRANULARITY_LABEL[granularity].toLowerCase()} ({series.length} titik)
          </h3>
          <span className="text-xs text-gray-500">Batang = omzet, garis = profit</span>
        </div>
        {series.length === 0 || invalidRange ? (
          <p className="text-sm text-gray-500 py-8 text-center">Tidak ada data pada rentang ini.</p>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={series} margin={{top: 8, right: 8, bottom: 0, left: 0}}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{fontSize: 11}} interval="preserveStartEnd" minTickGap={24} />
                <YAxis tickFormatter={shortRp} tick={{fontSize: 11}} width={56} />
                <Tooltip
                  labelFormatter={(_, payload) => {
                    const first = payload?.[0]?.payload as Bucket | undefined;
                    return first?.fullLabel ?? '';
                  }}
                  formatter={(value, name) => {
                    const v = Number(value);
                    const label = name === 'total' ? 'Omzet' : name === 'profit' ? 'Profit' : String(name);
                    return [`Rp ${formatDecimal(v)}`, label];
                  }}
                />
                <Legend formatter={(v) => (v === 'total' ? 'Omzet' : v === 'profit' ? 'Profit' : v)} />
                <Bar dataKey="total" fill="#111827" radius={[4, 4, 0, 0]} maxBarSize={42} />
                <Line type="monotone" dataKey="profit" stroke="#16a34a" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* ---- Top produk ---- */}
        <div className="border rounded-lg p-4 bg-white">
          <h3 className="font-semibold mb-3">Produk terlaris (per omzet)</h3>
          {productRows.length === 0 ? (
            <p className="text-sm text-gray-500">Belum ada penjualan pada rentang ini.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600 border-b">
                    <th className="py-2 pr-2">Produk</th>
                    <th className="py-2 pr-2 text-right">Qty</th>
                    <th className="py-2 pr-2 text-right">Omzet</th>
                    <th className="py-2 text-right">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {productRows.slice(0, 10).map((r) => (
                    <tr key={r.name} className="border-b last:border-0">
                      <td className="py-2 pr-2 font-medium">{r.name}</td>
                      <td className="py-2 pr-2 text-right">{r.qty}</td>
                      <td className="py-2 pr-2 text-right">Rp {formatDecimal(r.omzet)}</td>
                      <td className="py-2 text-right text-green-700">Rp {formatDecimal(r.profit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ---- Rekap per periode ---- */}
        <div className="border rounded-lg p-4 bg-white">
          <h3 className="font-semibold mb-3">Rekap per {GRANULARITY_LABEL[granularity].toLowerCase()}</h3>
          {series.length === 0 ? (
            <p className="text-sm text-gray-500">Belum ada data.</p>
          ) : (
            <div className="overflow-x-auto max-h-72 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="text-left text-gray-600 border-b">
                    <th className="py-2 pr-2">Periode</th>
                    <th className="py-2 pr-2 text-right">Omzet</th>
                    <th className="py-2 pr-2 text-right">Profit</th>
                    <th className="py-2 text-right">Trx</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(series).reverse().map((b) => (
                    <tr key={b.key} className="border-b last:border-0">
                      <td className="py-2 pr-2">{b.fullLabel}</td>
                      <td className="py-2 pr-2 text-right">Rp {formatDecimal(b.total)}</td>
                      <td className="py-2 pr-2 text-right text-green-700">Rp {formatDecimal(b.profit)}</td>
                      <td className="py-2 text-right">{b.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ---- Export ---- */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() =>
            downloadCSV(`penjualan-${from}-${to}.csv`, ['ID', 'Tanggal', 'Produk', 'Qty', 'Harga', 'Modal', 'Total', 'Profit'], sortedTx.map((tx) => [tx.id, tx.date, tx.productName, tx.quantity, tx.unitPrice, tx.unitCost, tx.total, (tx.unitPrice - tx.unitCost) * tx.quantity]))
          }
          disabled={sortedTx.length === 0}
          className="border border-gray-400 rounded px-4 py-2 text-sm font-semibold hover:bg-gray-100 transition disabled:opacity-50"
        >
          Export transaksi CSV
        </button>
        <button
          onClick={() =>
            downloadCSV(
              `rekap-${granularity}-${from}-${to}.csv`,
              ['Periode', 'Omzet', 'Profit', 'Transaksi'],
              series.map((b) => [b.fullLabel, b.total, b.profit, b.count]),
            )
          }
          disabled={series.length === 0}
          className="border border-gray-400 rounded px-4 py-2 text-sm font-semibold hover:bg-gray-100 transition disabled:opacity-50"
        >
          Export rekap {GRANULARITY_LABEL[granularity].toLowerCase()} CSV
        </button>
        <button
          onClick={() =>
            downloadCSV(`produk-${from}-${to}.csv`, ['Produk', 'Qty', 'Omzet', 'Profit', 'Transaksi'], productRows.map((r) => [r.name, r.qty, r.omzet, r.profit, r.count]))
          }
          disabled={productRows.length === 0}
          className="border border-gray-400 rounded px-4 py-2 text-sm font-semibold hover:bg-gray-100 transition disabled:opacity-50"
        >
          Export produk CSV
        </button>
        <button onClick={() => window.print()} className="border border-gray-400 rounded px-4 py-2 text-sm font-semibold hover:bg-gray-100 transition">
          Print
        </button>
      </div>

      {/* ---- Detail transaksi ---- */}
      <div className="border rounded-lg p-4 bg-white">
        <h3 className="font-semibold mb-3">Detail transaksi ({sortedTx.length})</h3>
        {sortedTx.length === 0 ? (
          <p className="text-sm text-gray-500">Tidak ada transaksi pada rentang ini.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600 border-b">
                    <th className="py-2 pr-2">Tanggal</th>
                    <th className="py-2 pr-2">Produk</th>
                    <th className="py-2 pr-2 text-right">Qty</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleTx.map((tx) => (
                    <tr key={tx.id} className="border-b last:border-0">
                      <td className="py-2 pr-2 whitespace-nowrap">{prettyDate(tx.date)}</td>
                      <td className="py-2 pr-2">{tx.productName}</td>
                      <td className="py-2 pr-2 text-right">{tx.quantity}</td>
                      <td className="py-2 text-right">Rp {formatDecimal(tx.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {sortedTx.length > 50 && (
              <button onClick={() => setShowAllTx((v) => !v)} className="mt-3 text-sm font-semibold underline">
                {showAllTx ? 'Tampilkan lebih sedikit' : `Tampilkan semua (${sortedTx.length})`}
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
}
